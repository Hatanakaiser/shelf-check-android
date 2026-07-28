import React, { useState, useEffect } from 'react';
import { Header } from './components/common/Header';
import { BottomNav, TabType } from './components/common/BottomNav';
import { SearchCheckView } from './components/search/SearchCheckView';
import { KindleBookshelfView } from './components/bookshelf/KindleBookshelfView';
import { ShoppingListView } from './components/shopping/ShoppingListView';
import { SettingsView } from './components/settings/SettingsView';
import { db, seedSampleDataIfNeeded } from './db/schema';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('search');
  const [isShoppingMode, setIsShoppingMode] = useState<boolean>(true);
  const [shoppingBadgeCount, setShoppingBadgeCount] = useState<number>(0);

  const refreshData = async () => {
    await seedSampleDataIfNeeded();
    const count = await db.shoppingItems.count();
    setShoppingBadgeCount(count);
  };

  useEffect(() => {
    refreshData();
  }, []);

  return (
    <div className="app-container">
      {/* M3 Header */}
      <Header
        isShoppingMode={isShoppingMode}
        onToggleShoppingMode={() => setIsShoppingMode(!isShoppingMode)}
      />

      {/* メインコンテンツ切り替え */}
      <main className="main-content">
        {activeTab === 'search' && (
          <SearchCheckView
            isShoppingMode={isShoppingMode}
            onRefreshData={refreshData}
          />
        )}
        {activeTab === 'bookshelf' && (
          <KindleBookshelfView
            onRefreshData={refreshData}
          />
        )}
        {activeTab === 'shopping' && (
          <ShoppingListView
            onRefreshData={refreshData}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsView
            onRefreshData={refreshData}
          />
        )}
      </main>

      {/* M3 NavigationBar */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        shoppingBadgeCount={shoppingBadgeCount}
      />
    </div>
  );
};

export default App;
