import React from 'react';
import { Database, Download, Upload, RotateCcw } from 'lucide-react';
import { db, seedSampleDataIfNeeded } from '../../db/schema';

interface SettingsViewProps {
  onRefreshData?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onRefreshData }) => {

  const handleResetSeedData = async () => {
    if (window.confirm('データリセットを行いますか？（初期サンプルデータが再挿入されます）')) {
      await db.books.clear();
      await db.series.clear();
      await db.shoppingItems.clear();
      await seedSampleDataIfNeeded();
      alert('シードデータを再ロードしました。');
      if (onRefreshData) onRefreshData();
    }
  };

  const handleExportJson = async () => {
    const books = await db.books.toArray();
    const series = await db.series.toArray();
    const data = JSON.stringify({ books, series }, null, 2);

    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shelfcheck-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={22} color="#3b82f6" />
          <span>設定 ＆ データ管理</span>
        </h2>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-sub)' }}>
          バックアップ・シードリセット
        </p>
      </div>

      <div style={{
        backgroundColor: 'var(--color-bg-card)',
        borderRadius: 'var(--radius-md)',
        padding: '16px',
        border: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>データのバックアップと復元</h3>

        <button
          onClick={handleExportJson}
          style={{
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: '#3b82f6',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <Download size={18} /> JSONバックアップを保存
        </button>

        <button
          onClick={handleResetSeedData}
          style={{
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: 'var(--color-bg-card-hover)',
            color: '#ef4444',
            border: '1px solid #ef4444',
            fontWeight: 700,
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <RotateCcw size={18} /> 初期シードデータに再リセット
        </button>
      </div>
    </div>
  );
};
