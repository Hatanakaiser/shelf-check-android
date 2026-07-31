import React, { useState, useEffect } from 'react';
import { Search, Mic, AlertTriangle, CheckCircle, HelpCircle, ShoppingBag, BookOpen, Globe, Plus, Loader2, Check } from 'lucide-react';
import { db } from '../../db/schema';
import { Book, Series, BookStatus } from '../../types/book';
import { matchBookByScan, updateBookStatus, addBook, removeBook, addSeries } from '../../db/bookRepository';
import { parseVolumeSortKey } from '../../utils/volumeParser';
import { playAlertSound, triggerVibration } from '../../utils/audio';
import { searchExternalBooks, ExternalBookSearchResult } from '../../services/bookApi';

interface SearchCheckViewProps {
  isMangaOnly?: boolean;
  onToggleMangaOnly?: () => void;
  onRefreshData?: () => void;
}

export const SearchCheckView: React.FC<SearchCheckViewProps> = ({
  isMangaOnly = true,
  onToggleMangaOnly,
  onRefreshData
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBookResult, setSelectedBookResult] = useState<{
    book?: Book;
    seriesTitle: string;
    volume: string;
    status: BookStatus;
    message: string;
  } | null>(null);

  const [isListening, setIsListening] = useState(false);

  // Web API 外部検索ステート
  const [apiResults, setApiResults] = useState<ExternalBookSearchResult[]>([]);
  const [isSearchingApi, setIsSearchingApi] = useState(false);
  const [hasSearchedApi, setHasSearchedApi] = useState(false);

  const loadData = async () => {
    const s = await db.series.toArray();
    const b = await db.books.toArray();
    setSeriesList(s);
    setBooks(b);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Web API 検索実行
  const handleSearchExternalApi = async () => {
    if (!searchQuery.trim()) return;
    setIsSearchingApi(true);
    setHasSearchedApi(true);
    try {
      const results = await searchExternalBooks(searchQuery, isMangaOnly);
      setApiResults(results);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearchingApi(false);
    }
  };

  // 外部API結果からローカル本棚に新規シリーズとして登録（重複チェック付き）
  const handleImportApiBook = async (item: ExternalBookSearchResult) => {
    const cleanItemTitle = item.title.trim().toLowerCase();
    const exists = seriesList.some(s => s.title.trim().toLowerCase() === cleanItemTitle);

    if (exists) {
      alert(`「${item.title}」はすでに本棚に登録されています！`);
      return;
    }

    await addSeries({
      title: item.title,
      author: item.author || '',
      publisher: item.publisher || '',
      totalVolumes: item.volumeCount || 10,
      isCompleted: false,
      coverUrl: item.coverUrl || '/covers/yuyushiki1.jpg',
      tags: ['API取得']
    });

    await loadData();
    if (onRefreshData) onRefreshData();
    alert(`🎉 「${item.title}」を本棚に登録しました！`);
  };

  // 音声入力検索
  const startVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('お使いの環境は音声入力に対応していません。テキスト入力をご利用ください。');
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'ja-JP';
      recognition.interimResults = false;

      setIsListening(true);
      recognition.start();

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
    } catch (e) {
      setIsListening(false);
    }
  };

  // あいまい検索 ＆ 漫画のみフィルタリング
  const nonMangaKeywords = ['小説', 'ノベル', '文庫', '新書', 'ファンブック', 'ガイドブック', '画集', '原画集', 'アンソロジー', 'イラスト集', 'レシピ'];
  const filteredSeries = seriesList.filter(s => {
    if (!searchQuery.trim()) {
      if (isMangaOnly) {
        return !nonMangaKeywords.some(kw => s.title.includes(kw));
      }
      return true;
    }
    const q = searchQuery.toLowerCase().trim();
    const matches = (
      s.title.toLowerCase().includes(q) ||
      (s.titleKana && s.titleKana.toLowerCase().includes(q)) ||
      (s.author && s.author.toLowerCase().includes(q))
    );
    if (!matches) return false;

    if (isMangaOnly && !nonMangaKeywords.some(kw => q.includes(kw))) {
      return !nonMangaKeywords.some(kw => s.title.includes(kw));
    }
    return true;
  });

  // 巻数タップ時の3色照合アラート
  const handleSelectVolume = async (series: Series, volumeStr: string) => {
    const sId = String(series.id);
    const existingBook = books.find(b => b.seriesId === sId && b.volume === volumeStr);

    let status: BookStatus = 'unregistered';
    let message = `🟦 未所持の本です (${series.title} ${volumeStr}巻)`;

    if (existingBook) {
      status = existingBook.status;
      if (status === 'owned') {
        message = `🟩 すでに所持しています (${series.title} ${volumeStr}巻)`;
      } else if (status === 'wanted') {
        message = `🟨 買いたい本（買い物リスト対象）です！ (${series.title} ${volumeStr}巻)`;
      }
    }

    setSelectedBookResult({
      book: existingBook,
      seriesTitle: series.title,
      volume: volumeStr,
      status,
      message
    });

    playAlertSound(status);
    if (status === 'owned') triggerVibration([200, 100, 200]);
    else if (status === 'wanted') triggerVibration(150);
  };

  // ステータストグル (未登録 -> 所持[緑] -> 買いたい[黄] -> 未登録)
  const handleToggleStatus = async (seriesId: string, seriesTitle: string, volumeStr: string) => {
    const existing = books.find(b => b.seriesId === seriesId && b.volume === volumeStr);

    try {
      if (existing && existing.id) {
        if (existing.status === 'owned') {
          await updateBookStatus(existing.id, 'wanted');
        } else {
          await removeBook(seriesId, volumeStr, existing.id);
        }
      } else {
        await addBook({
          seriesId,
          title: seriesTitle,
          volume: volumeStr,
          volumeSortKey: parseVolumeSortKey(volumeStr),
          status: 'owned',
          isTemporary: false
        });
      }
    } catch (e) {
      console.error('Failed to toggle status:', e);
    }

    await loadData();
    if (onRefreshData) onRefreshData();
  };

  // 「買った！」アクション
  const handleMarkAsBought = async () => {
    if (!selectedBookResult) return;

    if (selectedBookResult.book && selectedBookResult.book.id) {
      await updateBookStatus(selectedBookResult.book.id, 'owned');
    } else {
      const series = seriesList.find(s => s.title === selectedBookResult.seriesTitle);
      await addBook({
        seriesId: series ? String(series.id) : undefined,
        title: selectedBookResult.seriesTitle,
        volume: selectedBookResult.volume,
        volumeSortKey: parseVolumeSortKey(selectedBookResult.volume),
        status: 'owned',
        isTemporary: false
      });
    }

    setSelectedBookResult(prev => prev ? {
      ...prev,
      status: 'owned',
      message: `🎉 所持済みに追加しました！ (${prev.seriesTitle} ${prev.volume}巻)`
    } : null);

    playAlertSound('wanted');
    await loadData();
    if (onRefreshData) onRefreshData();
  };

  const getStatusTheme = (status: string) => {
    switch (status) {
      case 'owned':
        return { bg: 'var(--color-status-owned-bg)', border: 'var(--color-status-owned)', text: '所持済み (緑)' };
      case 'wanted':
        return { bg: 'var(--color-status-wanted-bg)', border: 'var(--color-status-wanted)', text: '買いたい本 (黄)' };
      default:
        return { bg: 'var(--color-status-unregistered-bg)', border: 'var(--color-status-unregistered)', text: '未所持・未登録' };
    }
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '90px' }}>
      
      {/* 🔍 爆速インクリメンタル検索バー ＆ 🎙️ 音声入力 */}
      <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} color="var(--color-text-sub)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="タイトル・ひらがな・著者名で爆速検索 (例: ゆゆ, 呪術)"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setHasSearchedApi(false);
            }}
            style={{
              width: '100%',
              padding: '12px 14px 12px 42px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-bg-card)',
              border: searchQuery ? '2px solid #3b82f6' : '1px solid var(--color-border)',
              color: '#fff',
              fontSize: '0.92rem',
              outline: 'none',
              boxShadow: searchQuery ? '0 0 12px rgba(59, 130, 246, 0.3)' : 'none'
            }}
          />
        </div>

        <button
          onClick={startVoiceSearch}
          title="音声で検索"
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: isListening ? '#ef4444' : 'var(--color-bg-card)',
            color: '#fff',
            border: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Mic size={20} className={isListening ? 'spin' : ''} />
        </button>
      </div>

      {isListening && (
        <div style={{
          backgroundColor: '#450a0a',
          color: '#ef4444',
          padding: '8px 14px',
          borderRadius: '8px',
          fontSize: '0.8rem',
          fontWeight: 700,
          textAlign: 'center'
        }}>
          🎙️ 音声を聞き取り中... 「ゆゆ式」や「呪術 7巻」とお話しください
        </div>
      )}

      {/* 3色照合アラート判定モーダル（画面中央に固定表示） */}
      {selectedBookResult && (
        <div
          onClick={() => setSelectedBookResult(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '380px',
              backgroundColor: getStatusTheme(selectedBookResult.status).bg,
              border: `2px solid ${getStatusTheme(selectedBookResult.status).border}`,
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '12px',
              boxShadow: '0 20px 30px rgba(0, 0, 0, 0.6)'
            }}
          >
            {selectedBookResult.status === 'owned' && <CheckCircle size={48} color="var(--color-status-owned)" />}
            {selectedBookResult.status === 'wanted' && <ShoppingBag size={48} color="var(--color-status-wanted)" />}
            {selectedBookResult.status === 'unregistered' && <HelpCircle size={48} color="var(--color-status-unregistered)" />}

            <div>
              <div style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                padding: '3px 10px',
                borderRadius: '12px',
                display: 'inline-block',
                marginBottom: '6px',
                backgroundColor: getStatusTheme(selectedBookResult.status).border,
                color: '#000'
              }}>
                {getStatusTheme(selectedBookResult.status).text}
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
                {selectedBookResult.seriesTitle} (第{selectedBookResult.volume}巻)
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#e2e8f0', marginTop: '6px' }}>
                {selectedBookResult.message}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: '6px' }}>
              {selectedBookResult.status !== 'owned' && (
                <button
                  onClick={handleMarkAsBought}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: '#22c55e',
                    color: '#000',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <ShoppingBag size={18} /> 買った！（所持へ追加）
                </button>
              )}
              <button
                onClick={() => setSelectedBookResult(null)}
                style={{
                  padding: '12px 18px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--color-bg-card-hover)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.88rem'
                }}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ローカル本棚でのヒット作品 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredSeries.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '24px 16px',
            backgroundColor: 'var(--color-bg-card)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-sub)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}>
            <p>登録済み本棚に「{searchQuery}」に一致する作品はありません</p>
            {searchQuery.trim() && (
              <button
                onClick={handleSearchExternalApi}
                disabled={isSearchingApi}
                style={{
                  padding: '10px 18px',
                  borderRadius: '20px',
                  backgroundColor: '#3b82f6',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {isSearchingApi ? <Loader2 size={16} className="spin" /> : <Globe size={16} />}
                Web API (Google / OpenBD) で検索する
              </button>
            )}
          </div>
        ) : (
          filteredSeries.map((series) => {
            const sId = String(series.id);
            const seriesBooks = books.filter(b => b.seriesId === sId);

            const maxVol = Math.max(series.totalVolumes || 15, ...seriesBooks.map(b => b.volumeSortKey));
            const volArray = Array.from({ length: Math.min(maxVol, 30) }, (_, i) => String(i + 1));

            return (
              <div
                key={series.id}
                style={{
                  backgroundColor: 'var(--color-bg-card)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px',
                  border: '1px solid var(--color-border)'
                }}
              >
                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'center' }}>
                  <div style={{
                    width: '48px',
                    height: '66px',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    backgroundColor: 'var(--color-bg-main)',
                    flexShrink: 0,
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {series.coverUrl ? (
                      <img src={series.coverUrl} alt={series.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <BookOpen size={20} color="var(--color-text-sub)" />
                    )}
                  </div>

                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>{series.title}</h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--color-text-sub)', marginTop: '2px' }}>
                      {series.author || '著者未設定'} • 全 {series.totalVolumes || '?'} 巻
                    </p>
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(42px, 1fr))',
                  gap: '6px'
                }}>
                  {volArray.map((volStr) => {
                    const book = seriesBooks.find(b => b.volume === volStr);
                    const status = book ? book.status : 'unregistered';

                    let bgColor = 'var(--color-bg-card-hover)';
                    let textColor = 'var(--color-text-sub)';

                    if (status === 'owned') {
                      bgColor = 'var(--color-status-owned)';
                      textColor = '#000';
                    } else if (status === 'wanted') {
                      bgColor = 'var(--color-status-wanted)';
                      textColor = '#000';
                    }

                    return (
                      <button
                        key={volStr}
                        onClick={() => handleSelectVolume(series, volStr)}
                        onDoubleClick={() => handleToggleStatus(sId, series.title, volStr)}
                        style={{
                          height: '38px',
                          borderRadius: '6px',
                          backgroundColor: bgColor,
                          color: textColor,
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'transform 0.1s ease',
                          boxShadow: status === 'owned' ? '0 2px 6px rgba(34, 197, 94, 0.4)' : status === 'wanted' ? '0 2px 6px rgba(234, 179, 8, 0.4)' : 'none'
                        }}
                      >
                        {volStr}
                      </button>
                    );
                  })}
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Web API 外部検索結果表示エリア */}
      {hasSearchedApi && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Globe size={18} /> Web API 検索結果 ({apiResults.length}件)
          </h3>

          {apiResults.map((item, idx) => {
            const isAlreadyRegistered = seriesList.some(s => 
              s.title.trim().toLowerCase() === item.title.trim().toLowerCase()
            );

            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  gap: '12px',
                  backgroundColor: 'var(--color-bg-card)',
                  padding: '12px',
                  borderRadius: '10px',
                  border: isAlreadyRegistered ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid var(--color-border)',
                  alignItems: 'center'
                }}
              >
                <div style={{ width: '48px', height: '66px', borderRadius: '6px', backgroundColor: '#1e293b', overflow: 'hidden', flexShrink: 0 }}>
                  {item.coverUrl ? (
                    <img src={item.coverUrl} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#94a3b8' }}>No Image</div>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.title}
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-text-sub)', marginTop: '2px' }}>
                    {item.author || '著者不明'} {item.publisher ? `• ${item.publisher}` : ''}
                  </p>
                  {isAlreadyRegistered && (
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      color: '#22c55e',
                      backgroundColor: 'rgba(34, 197, 94, 0.15)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      marginTop: '4px',
                      display: 'inline-block'
                    }}>
                      ✓ すでに本棚に登録済み
                    </span>
                  )}
                </div>

                {isAlreadyRegistered ? (
                  <button
                    disabled
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(34, 197, 94, 0.2)',
                      color: '#22c55e',
                      border: '1px solid rgba(34, 197, 94, 0.4)',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'not-allowed'
                    }}
                  >
                    <Check size={14} /> 登録済み
                  </button>
                ) : (
                  <button
                    onClick={() => handleImportApiBook(item)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      backgroundColor: '#3b82f6',
                      color: '#fff',
                      border: 'none',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Plus size={14} /> 本棚に追加
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
