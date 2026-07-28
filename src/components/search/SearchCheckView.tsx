import React, { useState, useEffect } from 'react';
import { Search, Mic, AlertTriangle, CheckCircle, HelpCircle, ShoppingBag, BookOpen } from 'lucide-react';
import { db } from '../../db/schema';
import { Book, Series, BookStatus } from '../../types/book';
import { matchBookByScan, updateBookStatus, addBook } from '../../db/bookRepository';
import { parseVolumeSortKey } from '../../utils/volumeParser';
import { playAlertSound, triggerVibration } from '../../utils/audio';

interface SearchCheckViewProps {
  isShoppingMode: boolean;
  onRefreshData?: () => void;
}

export const SearchCheckView: React.FC<SearchCheckViewProps> = ({ isShoppingMode, onRefreshData }) => {
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

  const loadData = async () => {
    const s = await db.series.toArray();
    const b = await db.books.toArray();
    setSeriesList(s);
    setBooks(b);
  };

  useEffect(() => {
    loadData();
  }, []);

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

  // あいまい検索フィルタリング
  const filteredSeries = seriesList.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      s.title.toLowerCase().includes(q) ||
      (s.titleKana && s.titleKana.toLowerCase().includes(q)) ||
      (s.author && s.author.toLowerCase().includes(q))
    );
  });

  // 巻数タップ時の4色照合アラート
  const handleSelectVolume = async (series: Series, volumeStr: string) => {
    const sId = String(series.id);
    const existingBook = books.find(b => b.seriesId === sId && b.volume === volumeStr);

    let status: BookStatus = 'unregistered';
    let message = `🟦 未所持の本です (${series.title} ${volumeStr}巻)`;

    if (existingBook) {
      status = existingBook.status;
      if (status === 'owned') {
        message = `⚠️ すでに所持しています！ (${series.title} ${volumeStr}巻)`;
      } else if (status === 'wanted') {
        message = `✅ 探していた買い出し対象の本です！ (${series.title} ${volumeStr}巻)`;
      } else if (status === 'sold') {
        message = `⚠️ 過去に売却済みの本です (${series.title} ${volumeStr}巻)`;
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

  // ステータストグル
  const handleToggleStatus = async (seriesId: string, seriesTitle: string, volumeStr: string) => {
    const existing = books.find(b => b.seriesId === seriesId && b.volume === volumeStr);

    if (existing && existing.id) {
      let nextStatus: BookStatus = 'owned';
      if (existing.status === 'owned') nextStatus = 'sold';
      else if (existing.status === 'sold') nextStatus = 'wanted';
      else nextStatus = 'owned';

      await updateBookStatus(existing.id, nextStatus);
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
        return { bg: 'var(--color-status-owned-bg)', border: 'var(--color-status-owned)', text: '所持済み (重複警報)' };
      case 'wanted':
        return { bg: 'var(--color-status-wanted-bg)', border: 'var(--color-status-wanted)', text: '買い出し対象 (購入推奨)' };
      case 'sold':
        return { bg: 'var(--color-status-sold-bg)', border: 'var(--color-status-sold)', text: '売却済み (再購入注意)' };
      default:
        return { bg: 'var(--color-status-unregistered-bg)', border: 'var(--color-status-unregistered)', text: '未所持・未登録' };
    }
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* 🔍 爆速インクリメンタル検索バー ＆ 🎙️ 音声入力 */}
      <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} color="var(--color-text-sub)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="タイトル・ひらがな・著者名で爆速検索 (例: ゆゆ, 呪術)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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

      {/* 4色照合アラート判定ポップアップ */}
      {selectedBookResult && (
        <div style={{
          backgroundColor: getStatusTheme(selectedBookResult.status).bg,
          border: `2px solid ${getStatusTheme(selectedBookResult.status).border}`,
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '10px'
        }}>
          {selectedBookResult.status === 'owned' && <AlertTriangle size={44} color="var(--color-status-owned)" />}
          {selectedBookResult.status === 'wanted' && <CheckCircle size={44} color="var(--color-status-wanted)" />}
          {selectedBookResult.status === 'sold' && <AlertTriangle size={44} color="var(--color-status-sold)" />}
          {selectedBookResult.status === 'unregistered' && <HelpCircle size={44} color="var(--color-status-unregistered)" />}

          <div>
            <div style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '10px',
              display: 'inline-block',
              marginBottom: '4px',
              backgroundColor: getStatusTheme(selectedBookResult.status).border,
              color: '#000'
            }}>
              {getStatusTheme(selectedBookResult.status).text}
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>
              {selectedBookResult.seriesTitle} (第{selectedBookResult.volume}巻)
            </h3>
          </div>

          <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: '4px' }}>
            {selectedBookResult.status !== 'owned' && (
              <button
                onClick={handleMarkAsBought}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '6px',
                  backgroundColor: '#22c55e',
                  color: '#000',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <ShoppingBag size={16} /> 買った！（所持へ追加）
              </button>
            )}
            <button
              onClick={() => setSelectedBookResult(null)}
              style={{
                padding: '10px 14px',
                borderRadius: '6px',
                backgroundColor: 'var(--color-bg-card-hover)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* 作品カード ＆ 巻数マトリクス */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredSeries.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '30px 16px',
            backgroundColor: 'var(--color-bg-card)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-sub)'
          }}>
            「{searchQuery}」に一致する作品は見つかりませんでした。
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
                      textColor = '#fff';
                    } else if (status === 'wanted') {
                      bgColor = 'var(--color-status-wanted)';
                      textColor = '#000';
                    } else if (status === 'sold') {
                      bgColor = 'var(--color-status-sold)';
                      textColor = '#fff';
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
                          boxShadow: status === 'owned' ? '0 2px 6px rgba(239, 68, 68, 0.4)' : 'none'
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

    </div>
  );
};
