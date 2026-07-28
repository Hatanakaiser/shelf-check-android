import React from 'react';
import { BookMarked, ShoppingBag } from 'lucide-react';

interface HeaderProps {
  isShoppingMode: boolean;
  onToggleShoppingMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isShoppingMode, onToggleShoppingMode }) => {
  return (
    <header style={{
      height: '56px',
      backgroundColor: 'var(--color-bg-card)',
      borderBottom: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      position: 'sticky',
      top: 0,
      zIndex: 40
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          backgroundColor: '#3b82f6',
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff'
        }}>
          <BookMarked size={20} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.1 }}>
            ShelfCheck
          </h1>
          <span style={{ fontSize: '0.65rem', color: 'var(--color-text-sub)' }}>
            for Android
          </span>
        </div>
      </div>

      {/* 買い物モードトグルスイッチ */}
      <button
        onClick={onToggleShoppingMode}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '20px',
          backgroundColor: isShoppingMode ? 'rgba(34, 197, 94, 0.15)' : 'var(--color-bg-card-hover)',
          border: isShoppingMode ? '1px solid #22c55e' : '1px solid var(--color-border)',
          color: isShoppingMode ? '#22c55e' : 'var(--color-text-sub)',
          fontSize: '0.78rem',
          fontWeight: 700,
          transition: 'all 0.2s ease'
        }}
      >
        <ShoppingBag size={14} />
        <span>{isShoppingMode ? '買い物モード ON' : '通常モード'}</span>
      </button>
    </header>
  );
};
