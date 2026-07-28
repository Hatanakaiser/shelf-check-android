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
        message: `⚠️ すでに所持しています！ (${titleText})`
      };
    case 'wanted':
      return {
        status: 'wanted',
        matchedBook: book,
        matchedSeries: series,
        message: `✅ 探していた本（買い出し対象）です！ (${titleText})`
      };
    case 'sold':
      return {
        status: 'sold',
        matchedBook: book,
        matchedSeries: series,
        message: `⚠️ 過去に売却済みの本です (${titleText})`
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
    if (newStatus === 'owned') {
      await db.shoppingItems.where({ seriesId: String(book.seriesId), volume: book.volume }).delete();
    } else if (newStatus === 'wanted') {
      const exists = await db.shoppingItems.where({ seriesId: String(book.seriesId), volume: book.volume }).count();
      if (exists === 0) {
        await db.shoppingItems.add({
          seriesId: String(book.seriesId),
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
