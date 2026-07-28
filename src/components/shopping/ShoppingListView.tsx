import React, { useState, useEffect } from 'react';
import { ShoppingCart, Check, Trash2, Plus } from 'lucide-react';
import { db } from '../../db/schema';
import { ShoppingItem } from '../../types/book';
import { updateBookStatus } from '../../db/bookRepository';
import { playAlertSound, triggerVibration } from '../../utils/audio';

interface ShoppingListViewProps {
  onRefreshData?: () => void;
}

export const ShoppingListView: React.FC<ShoppingListViewProps> = ({ onRefreshData }) => {
  const [items, setItems] = useState<ShoppingItem[]>([]);

  const loadItems = async () => {
    const data = await db.shoppingItems.toArray();
    setItems(data);
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleMarkAsBought = async (item: ShoppingItem) => {
    // 買い出し対象の本を探す
    const book = await db.books
      .where({ seriesId: item.seriesId, volume: item.volume })
      .first();

    if (book && book.id) {
      await updateBookStatus(book.id, 'owned');
    }

    await db.shoppingItems.delete(item.id!);
    playAlertSound('wanted');
    triggerVibration(150);

    await loadItems();
    if (onRefreshData) onRefreshData();
  };

  const handleDeleteItem = async (id: string | number) => {
    await db.shoppingItems.delete(id);
    await loadItems();
    if (onRefreshData) onRefreshData();
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShoppingCart color="#22c55e" size={24} />
          <span>買い出しリスト (抜け巻)</span>
        </h2>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-sub)' }}>
          店頭で探す本・購入予定の抜け巻一覧
        </p>
      </div>

      {items.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px 16px',
          backgroundColor: 'var(--color-bg-card)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--color-text-sub)'
        }}>
          🛒 現在買い出しリストに登録されている本はありません。
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {items.map(item => (
            <div
              key={item.id}
              style={{
                backgroundColor: 'var(--color-bg-card)',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                border: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              <div>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '10px',
                  backgroundColor: '#22c55e',
                  color: '#000',
                  display: 'inline-block',
                  marginBottom: '4px'
                }}>
                  買い出し推奨
                </span>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                  {item.seriesTitle} (第{item.volume}巻)
                </h3>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleMarkAsBought(item)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#22c55e',
                    color: '#000',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Check size={16} /> 買った！
                </button>
                <button
                  onClick={() => handleDeleteItem(item.id!)}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--color-bg-card-hover)',
                    color: 'var(--color-text-sub)'
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
