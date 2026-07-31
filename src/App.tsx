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
  const [isMangaOnly, setIsMangaOnly] = useState<boolean>(true);
  const [shoppingBadgeCount, setShoppingBadgeCount] = useState<number>(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const tabs: TabType[] = ['search', 'bookshelf', 'shopping', 'settings'];

  const refreshData = async () => {
    await seedSampleDataIfNeeded();
    const count = await db.shoppingItems.count();
    setShoppingBadgeCount(count);
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchStartX - touchEndX;

    // 50px 以上の移動でスワイプと判定
    if (Math.abs(diffX) > 50) {
      const currentIndex = tabs.indexOf(activeTab);
      if (diffX > 0 && currentIndex < tabs.length - 1) {
        // 次のタブへスライド
        setActiveTab(tabs[currentIndex + 1]);
      } else if (diffX < 0 && currentIndex > 0) {
        // 前のタブへスライド
        setActiveTab(tabs[currentIndex - 1]);
      }
    }
    setTouchStartX(null);
  };

  return (
    <div className="app-container">
      {/* M3 Header */}
      <Header
        isMangaOnly={isMangaOnly}
        onToggleMangaOnly={() => setIsMangaOnly(!isMangaOnly)}
      />

      {/* メインコンテンツ切り替え (横スライド対応) */}
      <main
        className="main-content"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {activeTab === 'search' && (
          <SearchCheckView
            isMangaOnly={isMangaOnly}
            onToggleMangaOnly={() => setIsMangaOnly(!isMangaOnly)}
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
