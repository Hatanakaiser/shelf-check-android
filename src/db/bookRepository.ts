import { db } from './schema';
import { Book, Series, BookStatus, BookshelfSeriesGroup } from '../types/book';
import { parseVolumeSortKey } from '../utils/volumeParser';

export interface ScanMatchResult {
  status: BookStatus;
  matchedBook?: Book;
  matchedSeries?: Series;
  message: string;
  detectedIsbn?: string;
  detectedText?: string;
  detectedVolume?: string;
}

/**
 * 照合検索処理 (ISBN・タイトル・巻数)
 */
export async function matchBookByScan(
  isbn?: string,
  rawTitle?: string,
  rawVolume?: string,
  isShoppingMode: boolean = true
): Promise<ScanMatchResult> {
  // 1. ISBNでの完全一致照合
  if (isbn) {
    const bookByIsbn = await db.books.where('isbn').equals(isbn).first();
    if (bookByIsbn) {
      return formatMatchResult(bookByIsbn);
    }
  }

  // 2. タイトル・巻数での照合
  if (rawTitle) {
    const cleanTitle = rawTitle.toLowerCase().trim();
    const allSeries = await db.series.toArray();
    
    const matchedSeries = allSeries.find(s => 
      cleanTitle.includes(s.title.toLowerCase()) || 
      (s.titleKana && cleanTitle.includes(s.titleKana.toLowerCase()))
    );

    if (matchedSeries) {
      const volStr = rawVolume || '1';
      const matchedBook = await db.books
        .where({ seriesId: String(matchedSeries.id), volume: volStr })
        .first();

      if (matchedBook) {
        return formatMatchResult(matchedBook, matchedSeries);
      } else {
        // 未登録巻
        return {
          status: 'unregistered',
          matchedSeries,
          detectedText: matchedSeries.title,
          detectedVolume: volStr,
          message: `🟦 未所持の本です: ${matchedSeries.title} (${volStr}巻)`
        };
      }
    }
  }

  return {
    status: 'unregistered',
    detectedIsbn: isbn,
    detectedText: rawTitle,
    detectedVolume: rawVolume,
    message: isbn 
      ? `🟦 未登録のISBNコード: ${isbn}`
      : `🟦 未登録の本です (${rawTitle || '未知の書籍'})`
  };
}

function formatMatchResult(book: Book, series?: Series): ScanMatchResult {
  const vol = book.volume ? `${book.volume}巻` : '';
  const titleText = `${book.title} ${vol}`.trim();

  switch (book.status) {
    case 'owned':
      return {
        status: 'owned',
        matchedBook: book,
        matchedSeries: series,
        message: `🟩 すでに所持しています (${titleText})`
      };
    case 'wanted':
      return {
        status: 'wanted',
        matchedBook: book,
        matchedSeries: series,
        message: `🟨 探していた本（買いたい本）です！ (${titleText})`
      };
    default:
      return {
        status: 'unregistered',
        matchedBook: book,
        matchedSeries: series,
        message: `🟦 未所持の本です (${titleText})`
      };
  }
}

/**
 * 書籍ステータスの更新 ＆ 買い出しリストとの自動連動
 */
export async function updateBookStatus(bookId: string | number, newStatus: BookStatus) {
  const now = new Date().toISOString().split('T')[0];
  await db.books.update(bookId, { status: newStatus, updatedAt: now });

  const book = await db.books.get(bookId);
  if (book && book.seriesId) {
    const sIdStr = String(book.seriesId);
    const items = await db.shoppingItems.where('seriesId').equals(sIdStr).toArray();
    
    if (newStatus === 'owned') {
      const targetItems = items.filter(i => i.volume === book.volume);
      for (const item of targetItems) {
        if (item.id) await db.shoppingItems.delete(item.id);
      }
    } else if (newStatus === 'wanted') {
      const exists = items.some(i => i.volume === book.volume);
      if (!exists) {
        await db.shoppingItems.add({
          seriesId: sIdStr,
          seriesTitle: book.title,
          volume: book.volume,
          priority: 'high',
          addedReason: 'missing_volume',
          createdAt: now
        });
      }
    }
  }
}

/**
 * 書籍の削除 ＆ 買い出しリストからの自動クリーンアップ
 */
export async function removeBook(seriesId: string, volumeStr: string, bookId?: string | number) {
  if (bookId) {
    await db.books.delete(bookId);
  } else {
    const sIdStr = String(seriesId);
    const books = await db.books.where('seriesId').equals(sIdStr).toArray();
    const targetBook = books.find(b => b.volume === volumeStr);
    if (targetBook && targetBook.id) {
      await db.books.delete(targetBook.id);
    }
  }

  const items = await db.shoppingItems.where('seriesId').equals(String(seriesId)).toArray();
  const targetItems = items.filter(i => i.volume === volumeStr);
  for (const item of targetItems) {
    if (item.id) await db.shoppingItems.delete(item.id);
  }
}

/**
 * 新規書籍の追加
 */
export async function addBook(bookData: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = new Date().toISOString().split('T')[0];
  const newId = await db.books.add({
    ...bookData,
    createdAt: now,
    updatedAt: now
  });

  if (bookData.status === 'wanted' && bookData.seriesId) {
    await db.shoppingItems.add({
      seriesId: String(bookData.seriesId),
      seriesTitle: bookData.title,
      volume: bookData.volume,
      priority: 'high',
      addedReason: 'manual',
      createdAt: now
    });
  }

  return newId;
}

export async function isSeriesRegistered(title: string): Promise<boolean> {
  if (!title) return false;
  const cleanTitle = title.trim().toLowerCase();
  const allSeries = await db.series.toArray();
  return allSeries.some(s => s.title.trim().toLowerCase() === cleanTitle);
}

export async function addSeries(
  seriesData: Omit<Series, 'id' | 'createdAt' | 'updatedAt'>,
  initialOwnedStart?: number,
  initialOwnedEnd?: number
): Promise<number> {
  const now = new Date().toISOString().split('T')[0];
  const cleanTitle = seriesData.title.trim().toLowerCase();

  // 重複チェック: 同一タイトルのシリーズが既に存在する場合は既存IDを返し、更新のみ行う
  const allSeries = await db.series.toArray();
  const existingSeries = allSeries.find(s => s.title.trim().toLowerCase() === cleanTitle);

  let sIdNum: number;
  if (existingSeries && existingSeries.id) {
    sIdNum = Number(existingSeries.id);
    // 既存シリーズの更新（巻数が増えた場合など）
    const updatedTotal = Math.max(existingSeries.totalVolumes || 0, seriesData.totalVolumes || 0);
    await db.series.update(sIdNum, {
      totalVolumes: updatedTotal,
      coverUrl: seriesData.coverUrl || existingSeries.coverUrl,
      updatedAt: now
    });
  } else {
    // 新規シリーズレコード挿入
    const newSeriesId = await db.series.add({
      ...seriesData,
      title: seriesData.title.trim(),
      createdAt: now,
      updatedAt: now
    });
    sIdNum = Number(newSeriesId);
  }

  const sIdStr = String(sIdNum);

  // 初期所持巻範囲がある場合はまとめて追加 (未追加の巻のみ)
  if (initialOwnedStart && initialOwnedEnd && initialOwnedStart <= initialOwnedEnd) {
    for (let i = initialOwnedStart; i <= initialOwnedEnd; i++) {
      const volStr = String(i);
      const existingBook = await db.books.where({ seriesId: sIdStr, volume: volStr }).first();
      if (!existingBook) {
        await db.books.add({
          seriesId: sIdStr,
          title: seriesData.title,
          volume: volStr,
          volumeSortKey: i,
          status: 'owned',
          isTemporary: false,
          createdAt: now,
          updatedAt: now
        });
      }
    }
  }

  return sIdNum;
}

export async function updateSeries(
  seriesId: string | number,
  seriesData: Partial<Omit<Series, 'id' | 'createdAt' | 'updatedAt'>>
) {
  const now = new Date().toISOString().split('T')[0];
  await db.series.update(seriesId, {
    ...seriesData,
    updatedAt: now
  });

  // シリーズ名が変更された場合、紐づくbookやshoppingItemのタイトルも更新
  if (seriesData.title) {
    const sIdStr = String(seriesId);
    const books = await db.books.where({ seriesId: sIdStr }).toArray();
    for (const b of books) {
      if (b.id) {
        await db.books.update(b.id, { title: seriesData.title, updatedAt: now });
      }
    }
    const items = await db.shoppingItems.where({ seriesId: sIdStr }).toArray();
    for (const item of items) {
      if (item.id) {
        await db.shoppingItems.update(item.id, { seriesTitle: seriesData.title });
      }
    }
  }
}

export async function deleteSeries(seriesId: string | number) {
  const sIdStr = String(seriesId);
  await db.series.delete(seriesId);
  await db.books.where({ seriesId: sIdStr }).delete();
  await db.shoppingItems.where({ seriesId: sIdStr }).delete();
}

export async function bulkSetVolumeStatus(
  seriesId: string | number,
  seriesTitle: string,
  startVol: number,
  endVol: number,
  newStatus: BookStatus
) {
  const sIdStr = String(seriesId);
  const now = new Date().toISOString().split('T')[0];

  for (let i = startVol; i <= endVol; i++) {
    const volStr = String(i);
    const existing = await db.books.where({ seriesId: sIdStr, volume: volStr }).first();

    if (existing && existing.id) {
      await updateBookStatus(existing.id, newStatus);
    } else if (newStatus !== 'unregistered') {
      await addBook({
        seriesId: sIdStr,
        title: seriesTitle,
        volume: volStr,
        volumeSortKey: i,
        status: newStatus,
        isTemporary: false
      });
    }
  }
}

/**
 * 📚 Kindleライブラリ風 シリーズ集約本棚データの取得
 */
export async function getBookshelfSeriesGroups(): Promise<BookshelfSeriesGroup[]> {
  const allSeries = await db.series.toArray();
  const allBooks = await db.books.toArray();

  return allSeries.map(s => {
    const sId = String(s.id);
    const seriesBooks = allBooks.filter(b => b.seriesId === sId);
    
    // 所持数カウント
    const ownedCount = seriesBooks.filter(b => b.status === 'owned').length;
    
    // 買い出し対象が含まれているか
    const hasWantedItem = seriesBooks.some(b => b.status === 'wanted');

    // 全巻数の算出（シリーズ最大指定または所持巻の最大値）
    const maxVol = Math.max(s.totalVolumes || 0, ...seriesBooks.map(b => b.volumeSortKey));
    const totalCount = maxVol > 0 ? maxVol : 15;

    return {
      series: s,
      ownedCount,
      totalCount,
      hasWantedItem,
      books: seriesBooks.sort((a, b) => a.volumeSortKey - b.volumeSortKey)
    };
  });
}

