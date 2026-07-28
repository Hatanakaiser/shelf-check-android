import React from 'react';
import { Search, Library, ShoppingCart, Settings } from 'lucide-react';

export type TabType = 'search' | 'bookshelf' | 'shopping' | 'settings';

interface BottomNavProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  shoppingBadgeCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onSelectTab, shoppingBadgeCount = 0 }) => {
  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'search', label: '検索・照合', icon: <Search size={22} /> },
    { id: 'bookshelf', label: '本棚 (Kindle)', icon: <Library size={22} /> },
    { id: 'shopping', label: '買い出し', icon: <ShoppingCart size={22} /> },
    { id: 'settings', label: '設定', icon: <Settings size={22} /> }
  ];

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: '480px',
      height: '68px',
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      backdropFilter: 'blur(12px)',
      borderTop: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      zIndex: 50,
      paddingBottom: 'env(safe-area-inset-bottom)'
    }}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              flex: 1,
              height: '100%',
              backgroundColor: 'transparent',
              color: isActive ? '#3b82f6' : 'var(--color-text-sub)',
              position: 'relative',
              transition: 'color 0.2s ease'
            }}
          >
            {tab.icon}
            <span style={{ fontSize: '0.68rem', fontWeight: isActive ? 700 : 500 }}>
              {tab.label}
            </span>

            {tab.id === 'shopping' && shoppingBadgeCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '8px',
                right: 'calc(50% - 18px)',
                backgroundColor: '#22c55e',
                color: '#000',
                fontSize: '0.65rem',
                fontWeight: 800,
                borderRadius: '10px',
                padding: '1px 5px',
                minWidth: '16px',
                textAlign: 'center'
              }}>
                {shoppingBadgeCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
