export type BookStatus = 'owned' | 'wanted' | 'sold' | 'unregistered';

export interface Book {
  id?: string | number;
  isbn?: string;
  seriesId?: string;
  title: string;
  author?: string;
  publisher?: string;
  volume: string;
  volumeSortKey: number;
  status: BookStatus;
  coverUrl?: string;
  purchaseDate?: string;
  purchaseLocation?: string;
  notes?: string;
  isTemporary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Series {
  id?: string | number;
  title: string;
  titleKana?: string;
  author?: string;
  publisher?: string;
  totalVolumes?: number;
  isCompleted: boolean;
  coverUrl?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Kindleライブラリ風 本棚シリーズ集約モデル
 */
export interface BookshelfSeriesGroup {
  series: Series;
  ownedCount: Int16Array | number;
  totalCount: number;
  hasWantedItem: boolean;
  books: Book[];
}

export interface ShoppingItem {
  id?: string | number;
  seriesId: string;
  seriesTitle: string;
  volume: string;
  priority: 'high' | 'medium' | 'low';
  addedReason: 'missing_volume' | 'manual';
  createdAt: string;
}
