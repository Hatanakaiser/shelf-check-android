package com.example.shelfcheck.data.repository

import com.example.shelfcheck.data.local.BookDao
import com.example.shelfcheck.data.local.BookEntity
import com.example.shelfcheck.data.local.SeriesEntity
import com.example.shelfcheck.data.local.ShoppingItemEntity
import com.example.shelfcheck.domain.BookStatus
import com.example.shelfcheck.domain.BookshelfSeriesGroup
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class BookRepository @Inject constructor(
    private val bookDao: BookDao
) {
    val allBooks: Flow<List<BookEntity>> = bookDao.getAllBooks()
    val allSeries: Flow<List<SeriesEntity>> = bookDao.getAllSeries()
    val allShoppingItems: Flow<List<ShoppingItemEntity>> = bookDao.getAllShoppingItems()

    // Kindleライブラリ風 シリーズ集約本棚のストリーム
    val bookshelfGroups: Flow<List<BookshelfSeriesGroup>> = combine(
        allSeries,
        allBooks
    ) { seriesList, booksList ->
        seriesList.map { series ->
            val seriesBooks = booksList.filter { it.seriesId == series.id }
            val ownedCount = seriesBooks.count { it.status == BookStatus.OWNED }
            val hasWantedItem = seriesBooks.any { it.status == BookStatus.WANTED }
            val maxVol = seriesBooks.maxOfOrNull { it.volumeSortKey }?.toInt() ?: 15
            val totalCount = if (series.totalVolumes != null && series.totalVolumes > 0) series.totalVolumes else maxVol

            BookshelfSeriesGroup(
                series = series,
                ownedCount = ownedCount,
                totalCount = totalCount,
                hasWantedItem = hasWantedItem,
                books = seriesBooks.sortedBy { it.volumeSortKey }
            )
        }
    }

    suspend fun updateBookStatus(id: Long, status: BookStatus) {
        val now = "2026-07-28"
        bookDao.updateBookStatus(id, status, now)
    }

    suspend fun insertBook(book: BookEntity): Long {
        return bookDao.insertBook(book)
    }

    suspend fun deleteShoppingItemById(id: Long) {
        bookDao.deleteShoppingItemById(id)
    }
}
