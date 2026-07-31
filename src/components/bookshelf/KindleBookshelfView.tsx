import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Settings, X, ShoppingBag, CheckCircle, Sliders, Edit3 } from 'lucide-react';
import { getBookshelfSeriesGroups, updateBookStatus, addBook, removeBook, bulkSetVolumeStatus } from '../../db/bookRepository';
import { BookshelfSeriesGroup, BookStatus, Series } from '../../types/book';
import { parseVolumeSortKey } from '../../utils/volumeParser';
import { playAlertSound, triggerVibration } from '../../utils/audio';
import { AddSeriesModal } from './AddSeriesModal';
import { EditSeriesModal } from './EditSeriesModal';

interface KindleBookshelfViewProps {
  onRefreshData?: () => void;
}

export const KindleBookshelfView: React.FC<KindleBookshelfViewProps> = ({ onRefreshData }) => {
  const [seriesGroups, setSeriesGroups] = useState<BookshelfSeriesGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<BookshelfSeriesGroup | null>(null);
  const [filterTag, setFilterTag] = useState<'all' | 'wanted'>('all');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSeries, setEditingSeries] = useState<Series | null>(null);

  // 一括変更UI
  const [showBulkMode, setShowBulkMode] = useState(false);
  const [bulkStart, setBulkStart] = useState<number>(1);
  const [bulkEnd, setBulkEnd] = useState<number>(10);
  const [bulkTargetStatus, setBulkTargetStatus] = useState<BookStatus>('owned');

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

    try {
      if (existingBook && existingBook.id) {
        if (existingBook.status === 'owned') {
          // 所持 (緑) -> 買いたい本 (黄)
          await updateBookStatus(existingBook.id, 'wanted');
        } else {
          // 買いたい本 (黄) -> 未所持 (削除)
          await removeBook(sId, volStr, existingBook.id);
        }
      } else {
        // 未所持 -> 所持 (緑)
        await addBook({
          seriesId: sId,
          title: group.series.title,
          volume: volStr,
          volumeSortKey: parseVolumeSortKey(volStr),
          status: 'owned',
          isTemporary: false
        });
      }
    } catch (e) {
      console.error('Failed to toggle volume status:', e);
    }

    playAlertSound('owned');
    triggerVibration(100);

    await refreshAll(sId);
  };

  const handleApplyBulkVolume = async (group: BookshelfSeriesGroup) => {
    if (!group.series.id) return;
    await bulkSetVolumeStatus(
      group.series.id,
      group.series.title,
      bulkStart,
      bulkEnd,
      bulkTargetStatus
    );
    setShowBulkMode(false);
    await refreshAll(String(group.series.id));
  };

  const refreshAll = async (currentSeriesId?: string) => {
    await loadBookshelfData();
    const updatedGroups = await getBookshelfSeriesGroups();
    setSeriesGroups(updatedGroups);

    if (currentSeriesId) {
      const currentUpdated = updatedGroups.find(g => String(g.series.id) === currentSeriesId);
      setSelectedGroup(currentUpdated || null);
    }

    if (onRefreshData) onRefreshData();
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '90px' }}>
      
      {/* ヘッダー ＆ フィルターチップ ＆ 追加ボタン */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
            📚 Kindle本棚 (ライブラリ)
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-sub)' }}>
            全 {seriesGroups.length} シリーズを管理・集約表示
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setIsAddModalOpen(true)}
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '0.78rem',
              fontWeight: 800,
              backgroundColor: '#3b82f6',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)'
            }}
          >
            <Plus size={16} /> 作品追加
          </button>
        </div>
      </div>

      {/* フィルタータグ */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          onClick={() => setFilterTag('all')}
          style={{
            padding: '6px 12px',
            borderRadius: '16px',
            fontSize: '0.75rem',
            fontWeight: 700,
            backgroundColor: filterTag === 'all' ? 'var(--color-bg-card-hover)' : 'var(--color-bg-card)',
            color: filterTag === 'all' ? '#fff' : 'var(--color-text-sub)',
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
            backgroundColor: filterTag === 'wanted' ? '#eab308' : 'var(--color-bg-card)',
            color: filterTag === 'wanted' ? '#000' : 'var(--color-text-sub)',
            border: '1px solid var(--color-border)'
          }}
        >
          買いたい本あり
        </button>
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
              onClick={() => {
                setSelectedGroup(group);
                setBulkStart(1);
                setBulkEnd(total);
                setShowBulkMode(false);
              }}
              style={{
                backgroundColor: 'var(--color-bg-card)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                border: '1px solid var(--color-border)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: group.hasWantedItem ? '0 0 12px rgba(234, 179, 8, 0.35)' : 'none',
                position: 'relative'
              }}
            >
              {/* 3:4 アルバムカバー画像 */}
              <div style={{
                position: 'relative',
                width: '100%',
                paddingTop: '133.33%',
                backgroundColor: '#1e293b'
              }}>
                {(group.books.find(b => b.volume === '1')?.coverUrl || group.series.coverUrl) ? (
                  <img
                    src={group.books.find(b => b.volume === '1')?.coverUrl || group.series.coverUrl}
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
                    backgroundColor: '#eab308',
                    color: '#000',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <ShoppingBag size={12} /> 買いたい本あり
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
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
                  {(selectedGroup.books.find(b => b.volume === '1')?.coverUrl || selectedGroup.series.coverUrl) && (
                    <img src={selectedGroup.books.find(b => b.volume === '1')?.coverUrl || selectedGroup.series.coverUrl} alt={selectedGroup.series.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => setEditingSeries(selectedGroup.series)}
                  style={{
                    backgroundColor: 'var(--color-bg-card)',
                    color: '#fff',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Edit3 size={14} /> 編集
                </button>
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
            </div>

            {/* アクションボタンバー (一括設定切り替え) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {/* 凡例ガイド */}
              <div style={{ display: 'flex', gap: '10px', fontSize: '0.7rem', color: 'var(--color-text-sub)', flexWrap: 'wrap' }}>
                <span style={{ color: '#22c55e', fontWeight: 700 }}>■ 🟩 所持</span>
                <span style={{ color: '#eab308', fontWeight: 700 }}>■ 🟨 買いたい本</span>
                <span>■ ⬜ 未所持</span>
              </div>

              <button
                onClick={() => setShowBulkMode(!showBulkMode)}
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#3b82f6',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Sliders size={14} /> {showBulkMode ? '個別操作に戻る' : '一括ステータス変更'}
              </button>
            </div>

            {/* 一括変更フォーム */}
            {showBulkMode && (
              <div style={{
                backgroundColor: 'rgba(30, 41, 59, 0.9)',
                border: '1px solid #334155',
                borderRadius: '10px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>
                  ⚡ 巻数をまとめてステータス変更
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <input
                    type="number"
                    min="1"
                    max={selectedGroup.totalCount}
                    value={bulkStart}
                    onChange={e => setBulkStart(Number(e.target.value))}
                    style={{ width: '60px', padding: '6px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: '#fff' }}>巻 〜</span>
                  <input
                    type="number"
                    min="1"
                    max={selectedGroup.totalCount}
                    value={bulkEnd}
                    onChange={e => setBulkEnd(Number(e.target.value))}
                    style={{ width: '60px', padding: '6px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: '#fff' }}>巻 を</span>

                  <select
                    value={bulkTargetStatus}
                    onChange={e => setBulkTargetStatus(e.target.value as BookStatus)}
                    style={{ padding: '6px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '0.8rem' }}
                  >
                    <option value="owned">🟩 所持済み</option>
                    <option value="wanted">🟨 買いたい本</option>
                    <option value="unregistered">⬜ 未所持</option>
                  </select>

                  <button
                    onClick={() => handleApplyBulkVolume(selectedGroup)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      backgroundColor: '#3b82f6',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: '0.8rem'
                    }}
                  >
                    一括反映
                  </button>
                </div>
              </div>
            )}

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
                  textColor = '#000';
                } else if (status === 'wanted') {
                  bgColor = 'var(--color-status-wanted)';
                  textColor = '#000';
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
                      boxShadow: status === 'owned' ? '0 2px 6px rgba(34, 197, 94, 0.4)' : status === 'wanted' ? '0 2px 6px rgba(234, 179, 8, 0.4)' : 'none'
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
                backgroundColor: 'var(--color-bg-card-hover)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.9rem',
                marginTop: '8px',
                border: '1px solid var(--color-border)'
              }}
            >
              本棚を閉じる
            </button>
          </div>
        </div>
      )}

      {/* ＋ 新規シリーズ追加モーダル */}
      {isAddModalOpen && (
        <AddSeriesModal
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => refreshAll()}
        />
      )}

      {/* ⚙️ シリーズ編集モーダル */}
      {editingSeries && (
        <EditSeriesModal
          series={editingSeries}
          onClose={() => setEditingSeries(null)}
          onSuccess={() => refreshAll()}
        />
      )}

    </div>
  );
};
