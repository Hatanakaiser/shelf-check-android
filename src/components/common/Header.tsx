import React from 'react';
import { BookMarked, Sparkles } from 'lucide-react';

interface HeaderProps {
  isMangaOnly: boolean;
  onToggleMangaOnly: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isMangaOnly, onToggleMangaOnly }) => {
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

      {/* 🎨 漫画のみ絞り込みトグルボタン */}
      <button
        onClick={onToggleMangaOnly}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '20px',
          backgroundColor: isMangaOnly ? 'rgba(59, 130, 246, 0.15)' : 'var(--color-bg-card-hover)',
          border: isMangaOnly ? '1px solid #3b82f6' : '1px solid var(--color-border)',
          color: isMangaOnly ? '#3b82f6' : 'var(--color-text-sub)',
          fontSize: '0.78rem',
          fontWeight: 800,
          transition: 'all 0.2s ease'
        }}
      >
        <Sparkles size={14} color={isMangaOnly ? '#3b82f6' : 'var(--color-text-sub)'} />
        <span>{isMangaOnly ? '🎨 漫画のみ' : '📚 全書籍'}</span>
      </button>
    </header>
  );
};
