import React, { useState, useEffect } from 'react';
import { BookOpen, CheckCircle, AlertTriangle, X, ShoppingBag, Filter } from 'lucide-react';
import { getBookshelfSeriesGroups, updateBookStatus, addBook } from '../../db/bookRepository';
import { BookshelfSeriesGroup, BookStatus, Book } from '../../types/book';
import { parseVolumeSortKey } from '../../utils/volumeParser';
import { playAlertSound, triggerVibration } from '../../utils/audio';

interface KindleBookshelfViewProps {
  onRefreshData?: () => void;
}

export const KindleBookshelfView: React.FC<KindleBookshelfViewProps> = ({ onRefreshData }) => {
  const [seriesGroups, setSeriesGroups] = useState<BookshelfSeriesGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<BookshelfSeriesGroup | null>(null);
  const [filterTag, setFilterTag] = useState<'all' | 'wanted'>('all');

  const loadBookshelfData = async () => {
    const data = await getBookshelfSeriesGroups();
    setSeriesGroups(data);
  };

  useEffect(() => {
    loadBookshelfData();
  }, []);

  const filteredGroups = seriesGroups.filter(g => {
    if (filterTag === 'wanted') return g.hasWantedItem;
    return true;
  });

  const handleToggleVolumeInModal = async (group: BookshelfSeriesGroup, volStr: string) => {
    const sId = String(group.series.id);
    const existingBook = group.books.find(b => b.volume === volStr);

    if (existingBook && existingBook.id) {
      let nextStatus: BookStatus = 'owned';
      if (existingBook.status === 'owned') nextStatus = 'sold';
      else if (existingBook.status === 'sold') nextStatus = 'wanted';
      else nextStatus = 'owned';

      await updateBookStatus(existingBook.id, nextStatus);
    } else {
      await addBook({
        seriesId: sId,
        title: group.series.title,
        volume: volStr,
        volumeSortKey: parseVolumeSortKey(volStr),
        status: 'owned',
        isTemporary: false
      });
    }

    playAlertSound('owned');
    triggerVibration(100);

    await loadBookshelfData();
    const updatedGroups = await getBookshelfSeriesGroups();
    const currentUpdated = updatedGroups.find(g => String(g.series.id) === sId);
    if (currentUpdated) {
      setSelectedGroup(currentUpdated);
    }
    if (onRefreshData) onRefreshData();
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* ヘッダー ＆ フィルターチップ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
            📚 Kindle本棚 (ライブラリ)
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-sub)' }}>
            シリーズごとに集約管理されるビジュアル本棚
          </p>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setFilterTag('all')}
            style={{
              padding: '6px 12px',
              borderRadius: '16px',
              fontSize: '0.75rem',
              fontWeight: 700,
              backgroundColor: filterTag === 'all' ? '#3b82f6' : 'var(--color-bg-card)',
              color: '#fff',
              border: '1px solid var(--color-border)'
            }}
          >
            すべて ({seriesGroups.length})
          </button>
          <button
            onClick={() => setFilterTag('wanted')}
            style={{
              padding: '6px 12px',
              borderRadius: '16px',
              fontSize: '0.75rem',
              fontWeight: 700,
              backgroundColor: filterTag === 'wanted' ? '#22c55e' : 'var(--color-bg-card)',
              color: filterTag === 'wanted' ? '#000' : 'var(--color-text-sub)',
              border: '1px solid var(--color-border)'
            }}
          >
            買い出し対象あり
          </button>
        </div>
      </div>

      {/* 📚 Kindleライブラリ風 シリーズカバーグリッド (3:4 アスペクト比) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '14px'
      }}>
        {filteredGroups.map(group => {
          const owned = Number(group.ownedCount);
          const total = group.totalCount;
          const percent = Math.round((owned / Math.max(total, 1)) * 100);

          return (
            <div
              key={group.series.id}
              onClick={() => setSelectedGroup(group)}
              style={{
                backgroundColor: 'var(--color-bg-card)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                border: '1px solid var(--color-border)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: group.hasWantedItem ? '0 0 12px rgba(34, 197, 94, 0.25)' : 'none',
                position: 'relative',
                transition: 'transform 0.15s ease'
              }}
            >
              {/* 3:4 アルバムカバー画像 */}
              <div style={{
                position: 'relative',
                width: '100%',
                paddingTop: '133.33%', // 3:4 aspect ratio
                backgroundColor: '#1e293b'
              }}>
                {group.series.coverUrl ? (
                  <img
                    src={group.series.coverUrl}
                    alt={group.series.title}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <BookOpen size={40} color="var(--color-text-sub)" />
                  </div>
                )}

                {/* 右上: 所持数バッジ */}
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  backgroundColor: 'rgba(15, 23, 42, 0.85)',
                  backdropFilter: 'blur(4px)',
                  color: '#fff',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}>
                  {owned} / {total} 巻
                </div>

                {/* 買い出し対象アイコン */}
                {group.hasWantedItem && (
                  <div style={{
                    position: 'absolute',
                    bottom: '8px',
                    left: '8px',
                    backgroundColor: '#22c55e',
                    color: '#000',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <ShoppingBag size={12} /> 探している巻あり
                  </div>
                )}
              </div>

              {/* カード下部: タイトル ＋ プログレスバー */}
              <div style={{ padding: '10px 12px' }}>
                <h3 style={{
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  color: '#fff',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {group.series.title}
                </h3>
                <p style={{ fontSize: '0.72rem', color: 'var(--color-text-sub)', marginTop: '2px' }}>
                  {group.series.author || '著者未設定'}
                </p>

                {/* Kindle風 所持率プログレスバー */}
                <div style={{
                  marginTop: '8px',
                  width: '100%',
                  height: '4px',
                  backgroundColor: '#334155',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${percent}%`,
                    height: '100%',
                    backgroundColor: percent === 100 ? '#22c55e' : '#3b82f6',
                    borderRadius: '2px'
                  }} />
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* 📖 Kindle風 シリーズ全巻展開モーダル (BottomSheet) */}
      {selectedGroup && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end'
        }}>
          <div style={{
            backgroundColor: '#0f172a',
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            padding: '20px',
            maxHeight: '85vh',
            overflowY: 'auto',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {/* モーダルヘッダー */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ width: '44px', height: '60px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#1e293b' }}>
                  {selectedGroup.series.coverUrl && (
                    <img src={selectedGroup.series.coverUrl} alt={selectedGroup.series.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
                    {selectedGroup.series.title}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-sub)' }}>
                    {selectedGroup.series.author || '著者未設定'} • 所持: {Number(selectedGroup.ownedCount)} / 全 {selectedGroup.totalCount} 巻
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedGroup(null)}
                style={{
                  backgroundColor: 'var(--color-bg-card-hover)',
                  color: '#fff',
                  borderRadius: '50%',
                  padding: '8px',
                  display: 'flex'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* 凡例ガイド */}
            <div style={{ display: 'flex', gap: '12px', fontSize: '0.72rem', color: 'var(--color-text-sub)' }}>
              <span style={{ color: '#ef4444', fontWeight: 700 }}>■ 🟥 所持済み</span>
              <span style={{ color: '#22c55e', fontWeight: 700 }}>■ 🟩 買い出し対象</span>
              <span style={{ color: '#f97316', fontWeight: 700 }}>■ 🟧 売却済み</span>
              <span>■ ⬜ 未所持</span>
            </div>

            {/* 全巻グリッドブロック */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(50px, 1fr))',
              gap: '8px'
            }}>
              {Array.from({ length: selectedGroup.totalCount }, (_, i) => String(i + 1)).map(volStr => {
                const book = selectedGroup.books.find(b => b.volume === volStr);
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
                    onClick={() => handleToggleVolumeInModal(selectedGroup, volStr)}
                    style={{
                      height: '46px',
                      borderRadius: '8px',
                      backgroundColor: bgColor,
                      color: textColor,
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: status === 'owned' ? '0 2px 6px rgba(239, 68, 68, 0.4)' : 'none'
                    }}
                  >
                    {volStr}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setSelectedGroup(null)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: '#3b82f6',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.9rem',
                marginTop: '8px'
              }}
            >
              本棚を閉じる
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
