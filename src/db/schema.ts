import Dexie, { Table } from 'dexie';
import { Book, Series, ShoppingItem } from '../types/book';

export class ShelfCheckDB extends Dexie {
  books!: Table<Book>;
  series!: Table<Series>;
  shoppingItems!: Table<ShoppingItem>;

  constructor() {
    super('ShelfCheckAndroidDB');
    this.version(1).stores({
      books: '++id, isbn, seriesId, title, status, isTemporary, volumeSortKey',
      series: '++id, title, titleKana',
      shoppingItems: '++id, seriesId, volume'
    });
  }
}

export const db = new ShelfCheckDB();

export async function seedSampleDataIfNeeded() {
  const seriesCount = await db.series.count();
  if (seriesCount > 0) return;

  const now = new Date().toISOString().split('T')[0];

  // 1. ゆゆ式 シリーズ
  const seriesYuyushikiId = await db.series.add({
    title: 'ゆゆ式',
    titleKana: 'ユユシキ',
    author: '三上小又',
    publisher: '芳文社',
    totalVolumes: 15,
    isCompleted: false,
    coverUrl: '/covers/yuyushiki1.jpg',
    tags: ['きらら', '日常', 'コメディ'],
    createdAt: now,
    updatedAt: now
  });

  // 2. 呪術廻戦 シリーズ
  const seriesJujutsuId = await db.series.add({
    title: '呪術廻戦',
    titleKana: 'ジュジュツカイセン',
    author: '芥見下々',
    publisher: '集英社',
    totalVolumes: 26,
    isCompleted: false,
    coverUrl: '/covers/yuyushiki1.jpg',
    tags: ['少年マンガ', 'ジャンプ'],
    createdAt: now,
    updatedAt: now
  });

  // 3. SPY×FAMILY シリーズ
  const seriesSpyId = await db.series.add({
    title: 'SPY×FAMILY',
    titleKana: 'スパイファミリー',
    author: '遠藤達哉',
    publisher: '集英社',
    totalVolumes: 13,
    isCompleted: false,
    coverUrl: '/covers/yuyushiki15.jpg',
    tags: ['少年マンガ', 'コメディ'],
    createdAt: now,
    updatedAt: now
  });

  // --- ゆゆ式 蔵書データ ---
  // 1巻 (所持済み)
  await db.books.add({
    isbn: '9784832277946',
    seriesId: String(seriesYuyushikiId),
    title: 'ゆゆ式',
    volume: '1',
    volumeSortKey: 1,
    status: 'owned',
    coverUrl: '/covers/yuyushiki1.jpg',
    purchaseDate: '2025-08-01',
    isTemporary: false,
    createdAt: now,
    updatedAt: now
  });

  // 2〜5巻 (所持済み)
  for (let i = 2; i <= 5; i++) {
    await db.books.add({
      seriesId: String(seriesYuyushikiId),
      title: 'ゆゆ式',
      volume: String(i),
      volumeSortKey: i,
      status: 'owned',
      coverUrl: '/covers/yuyushiki1.jpg',
      isTemporary: false,
      createdAt: now,
      updatedAt: now
    });
  }

  // 15巻 (買い出し対象)
  await db.books.add({
    isbn: '9784832295322',
    seriesId: String(seriesYuyushikiId),
    title: 'ゆゆ式',
    volume: '15',
    volumeSortKey: 15,
    status: 'wanted',
    coverUrl: '/covers/yuyushiki15.jpg',
    isTemporary: false,
    createdAt: now,
    updatedAt: now
  });

  // --- 呪術廻戦 蔵書データ ---
  for (let i = 1; i <= 5; i++) {
    await db.books.add({
      seriesId: String(seriesJujutsuId),
      title: '呪術廻戦',
      volume: String(i),
      volumeSortKey: i,
      status: 'owned',
      isTemporary: false,
      createdAt: now,
      updatedAt: now
    });
  }

  await db.books.add({
    seriesId: String(seriesJujutsuId),
    title: '呪術廻戦',
    volume: '7',
    volumeSortKey: 7,
    status: 'wanted',
    isTemporary: false,
    createdAt: now,
    updatedAt: now
  });

  // --- 買い出し初期リスト ---
  await db.shoppingItems.add({
    seriesId: String(seriesYuyushikiId),
    seriesTitle: 'ゆゆ式',
    volume: '15',
    priority: 'high',
    addedReason: 'missing_volume',
    createdAt: now
  });

  await db.shoppingItems.add({
    seriesId: String(seriesJujutsuId),
    seriesTitle: '呪術廻戦',
    volume: '7',
    priority: 'medium',
    addedReason: 'missing_volume',
    createdAt: now
  });
}
