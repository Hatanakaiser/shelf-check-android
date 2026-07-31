import React, { useState } from 'react';
import { X, Plus, BookPlus, Search, Globe, Check, Loader2, AlertCircle } from 'lucide-react';
import { addSeries, isSeriesRegistered } from '../../db/bookRepository';
import { searchExternalBooks, ExternalBookSearchResult } from '../../services/bookApi';

interface AddSeriesModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const AddSeriesModal: React.FC<AddSeriesModalProps> = ({ onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState<'api' | 'manual'>('api');

  // API 検索ステート
  const [apiQuery, setApiQuery] = useState('');
  const [apiResults, setApiResults] = useState<ExternalBookSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedApiBook, setSelectedApiBook] = useState<ExternalBookSearchResult | null>(null);

  // 重複アラートステート
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // 手動 / 編集フォームステート
  const [title, setTitle] = useState('');
  const [titleKana, setTitleKana] = useState('');
  const [author, setAuthor] = useState('');
  const [publisher, setPublisher] = useState('');
  const [totalVolumes, setTotalVolumes] = useState<number>(10);
  const [isCompleted, setIsCompleted] = useState(false);
  const [coverUrl, setCoverUrl] = useState('/covers/yuyushiki1.jpg');
  const [tagInput, setTagInput] = useState('マンガ');

  const [initialOwnedStart, setInitialOwnedStart] = useState<number>(1);
  const [initialOwnedEnd, setInitialOwnedEnd] = useState<number>(5);
  const [isBulkOwned, setIsBulkOwned] = useState(false);

  // Web API 検索の実行
  const handleSearchApi = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!apiQuery.trim()) return;

    setIsSearching(true);
    setApiResults([]);
    try {
      const res = await searchExternalBooks(apiQuery);
      setApiResults(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  // API検索結果から選択してフォームへ反映（重複チェック含む）
  const handleSelectApiResult = async (item: ExternalBookSearchResult) => {
    setDuplicateWarning(null);
    const isReg = await isSeriesRegistered(item.title);
    if (isReg) {
      setDuplicateWarning(`「${item.title}」はすでに本棚に登録されています！`);
    }

    setSelectedApiBook(item);
    setTitle(item.title);
    setAuthor(item.author || '');
    setPublisher(item.publisher || '');
    if (item.coverUrl) {
      setCoverUrl(item.coverUrl);
    }
    if (item.volumeCount) {
      setTotalVolumes(item.volumeCount);
    }
    // 手動/詳細確認タブへ切り替え
    setActiveTab('manual');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('作品タイトルを入力してください');
      return;
    }

    const isReg = await isSeriesRegistered(title);
    if (isReg && !window.confirm(`「${title}」はすでに本棚に登録されています。情報を更新・上書き登録しますか？`)) {
      return;
    }

    const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean);

    await addSeries(
      {
        title: title.trim(),
        titleKana: titleKana.trim(),
        author: author.trim(),
        publisher: publisher.trim(),
        totalVolumes: Number(totalVolumes) || 1,
        isCompleted,
        coverUrl,
        tags
      },
      isBulkOwned ? initialOwnedStart : undefined,
      isBulkOwned ? initialOwnedEnd : undefined
    );

    onSuccess();
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#0f172a',
        border: '1px solid var(--color-border)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '520px',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
      }}>
        {/* モーダルヘッダー */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookPlus size={24} color="#3b82f6" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
              新規作品シリーズの追加
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'var(--color-bg-card-hover)',
              color: '#fff',
              borderRadius: '50%',
              padding: '6px',
              display: 'flex'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* タブ切り替え（API検索 vs 手動入力） */}
        <div style={{
          display: 'flex',
          backgroundColor: 'var(--color-bg-card)',
          padding: '4px',
          borderRadius: '10px',
          border: '1px solid var(--color-border)'
        }}>
          <button
            onClick={() => setActiveTab('api')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 800,
              backgroundColor: activeTab === 'api' ? '#3b82f6' : 'transparent',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Globe size={16} /> Web APIから自動検索
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 800,
              backgroundColor: activeTab === 'manual' ? '#3b82f6' : 'transparent',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            ✍️ 手動入力 / 詳細編集
          </button>
        </div>

        {/* 1. API検索タブ */}
        {activeTab === 'api' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <form onSubmit={handleSearchApi} style={{ display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} color="var(--color-text-sub)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="タイトル名・著者名・ISBNコード (例: 葬送のフリーレン)"
                  value={apiQuery}
                  onChange={e => setApiQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    color: '#fff',
                    fontSize: '0.88rem'
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#3b82f6',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {isSearching ? <Loader2 size={16} className="spin" /> : '検索'}
              </button>
            </form>

            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-sub)' }}>
              🌐 Google Books API ＆ OpenBD から作品・書誌情報を取得します
            </p>

            {/* 検索結果リスト */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '320px',
              overflowY: 'auto'
            }}>
              {apiResults.length === 0 && !isSearching && (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-sub)', fontSize: '0.85rem' }}>
                  検索窓にキーワードを入力して「検索」を押してください
                </div>
              )}

              {apiResults.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectApiResult(item)}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    backgroundColor: 'var(--color-bg-card)',
                    padding: '10px',
                    borderRadius: '10px',
                    border: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    alignItems: 'center'
                  }}
                >
                  <div style={{
                    width: '44px',
                    height: '60px',
                    borderRadius: '6px',
                    backgroundColor: '#1e293b',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}>
                    {item.coverUrl ? (
                      <img src={item.coverUrl} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#94a3b8' }}>No Cover</div>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.title}
                    </h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-sub)', marginTop: '2px' }}>
                      {item.author || '著者不明'} {item.publisher ? `• ${item.publisher}` : ''}
                    </p>
                    {item.isbn && (
                      <p style={{ fontSize: '0.68rem', color: '#3b82f6', marginTop: '2px' }}>
                        ISBN: {item.isbn}
                      </p>
                    )}
                  </div>

                  <button
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(59, 130, 246, 0.2)',
                      color: '#3b82f6',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
                      fontWeight: 800,
                      fontSize: '0.78rem'
                    }}
                  >
                    選択
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. 手動入力 / API連携後の調整フォーム */}
        {activeTab === 'manual' && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {duplicateWarning && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '0.82rem',
                color: '#ef4444',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <AlertCircle size={16} /> {duplicateWarning}
              </div>
            )}

            {selectedApiBook && !duplicateWarning && (
              <div style={{
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '0.78rem',
                color: '#22c55e',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Check size={14} /> Web APIから「{selectedApiBook.title}」の情報を読み込みました
              </div>
            )}

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--color-text-sub)', fontWeight: 700 }}>
                作品タイトル <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={async (e) => {
                  const val = e.target.value;
                  setTitle(val);
                  if (val.trim()) {
                    const isReg = await isSeriesRegistered(val.trim());
                    if (isReg) setDuplicateWarning(`「${val}」はすでに本棚に登録されています！`);
                    else setDuplicateWarning(null);
                  } else {
                    setDuplicateWarning(null);
                  }
                }}
                placeholder="例: 葬送のフリーレン"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--color-bg-card)',
                  border: duplicateWarning ? '1px solid #ef4444' : '1px solid var(--color-border)',
                  color: '#fff',
                  marginTop: '4px'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-sub)', fontWeight: 700 }}>
                  フリガナ
                </label>
                <input
                  type="text"
                  value={titleKana}
                  onChange={e => setTitleKana(e.target.value)}
                  placeholder="ソウソウノフリーレン"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    color: '#fff',
                    marginTop: '4px'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-sub)', fontWeight: 700 }}>
                  著者
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={e => setAuthor(e.target.value)}
                  placeholder="山田鐘人 / アベツカサ"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    color: '#fff',
                    marginTop: '4px'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-sub)', fontWeight: 700 }}>
                  全既刊数 (最新巻)
                </label>
                <input
                  type="number"
                  min="1"
                  value={totalVolumes}
                  onChange={e => setTotalVolumes(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    color: '#fff',
                    marginTop: '4px'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-sub)', fontWeight: 700 }}>
                  出版社
                </label>
                <input
                  type="text"
                  value={publisher}
                  onChange={e => setPublisher(e.target.value)}
                  placeholder="小学館"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    color: '#fff',
                    marginTop: '4px'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--color-text-sub)', fontWeight: 700 }}>
                表紙画像 (URL)
              </label>
              <input
                type="text"
                value={coverUrl}
                onChange={e => setCoverUrl(e.target.value)}
                placeholder="https://..."
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  color: '#fff',
                  marginTop: '4px'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--color-text-sub)', fontWeight: 700 }}>
                タグ (カンマ区切り)
              </label>
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                placeholder="ファンタジー, 少年マンガ"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  color: '#fff',
                  marginTop: '4px'
                }}
              />
            </div>

            {/* 初期所持巻のまとめて設定オプション */}
            <div style={{
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '10px',
              padding: '12px'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>
                <input
                  type="checkbox"
                  checked={isBulkOwned}
                  onChange={e => setIsBulkOwned(e.target.checked)}
                />
                初期所持巻数をまとめて登録する
              </label>

              {isBulkOwned && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                  <input
                    type="number"
                    min="1"
                    max={totalVolumes}
                    value={initialOwnedStart}
                    onChange={e => setInitialOwnedStart(Number(e.target.value))}
                    style={{ width: '65px', padding: '6px', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: '#fff' }}>巻 〜</span>
                  <input
                    type="number"
                    min="1"
                    max={totalVolumes}
                    value={initialOwnedEnd}
                    onChange={e => setInitialOwnedEnd(Number(e.target.value))}
                    style={{ width: '65px', padding: '6px', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: '#fff' }}>巻 を所持済みに設定</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--color-bg-card)',
                  color: '#fff',
                  fontWeight: 700,
                  border: '1px solid var(--color-border)'
                }}
              >
                キャンセル
              </button>
              <button
                type="submit"
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: duplicateWarning ? '#f97316' : '#3b82f6',
                  color: '#fff',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Plus size={18} /> {duplicateWarning ? '上書き・更新登録' : 'シリーズを登録'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
