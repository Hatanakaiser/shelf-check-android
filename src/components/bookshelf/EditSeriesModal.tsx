import React, { useState } from 'react';
import { X, Save, Trash2, Edit3 } from 'lucide-react';
import { Series } from '../../types/book';
import { updateSeries, deleteSeries } from '../../db/bookRepository';

interface EditSeriesModalProps {
  series: Series;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditSeriesModal: React.FC<EditSeriesModalProps> = ({ series, onClose, onSuccess }) => {
  const [title, setTitle] = useState(series.title);
  const [titleKana, setTitleKana] = useState(series.titleKana || '');
  const [author, setAuthor] = useState(series.author || '');
  const [publisher, setPublisher] = useState(series.publisher || '');
  const [totalVolumes, setTotalVolumes] = useState<number>(series.totalVolumes || 1);
  const [isCompleted, setIsCompleted] = useState(series.isCompleted || false);
  const [coverUrl, setCoverUrl] = useState(series.coverUrl || '/covers/yuyushiki1.jpg');
  const [tagInput, setTagInput] = useState((series.tags || []).join(', '));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!series.id) return;

    if (!title.trim()) {
      alert('作品タイトルを入力してください');
      return;
    }

    const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean);

    await updateSeries(series.id, {
      title: title.trim(),
      titleKana: titleKana.trim(),
      author: author.trim(),
      publisher: publisher.trim(),
      totalVolumes: Number(totalVolumes) || 1,
      isCompleted,
      coverUrl,
      tags
    });

    onSuccess();
    onClose();
  };

  const handleDelete = async () => {
    if (!series.id) return;
    if (window.confirm(`「${series.title}」と、このシリーズに登録されている全ての所持・買い物データを削除しますか？`)) {
      await deleteSeries(series.id);
      onSuccess();
      onClose();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      zIndex: 210,
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
        maxWidth: '480px',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {/* モーダルヘッダー */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Edit3 size={22} color="#3b82f6" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
              シリーズ情報の編集
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

        {/* フォーム */}
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--color-text-sub)', fontWeight: 700 }}>
              作品タイトル
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
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
                全既刊数 (最新巻数)
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
              タグ (カンマ区切り)
            </label>
            <input
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
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

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
            <button
              type="button"
              onClick={handleDelete}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                fontWeight: 700,
                border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Trash2 size={16} /> シリーズ削除
            </button>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--color-bg-card)',
                  color: '#fff',
                  fontWeight: 700,
                  border: '1px solid var(--color-border)'
                }}
              >
                閉じる
              </button>
              <button
                type="submit"
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#3b82f6',
                  color: '#fff',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Save size={16} /> 保存
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
