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
            val maxVol = seriesBooks.maxOfOrNull { it.volumeSortKey.toInt() } ?: 15
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

    private fun getCurrentTimestamp(): String {
        val sdf = java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS", java.util.Locale.JAPAN)
        return sdf.format(java.util.Date())
    }

    suspend fun isSeriesRegistered(title: String): Boolean {
        return bookDao.getSeriesByTitle(title.trim()) != null
    }

    suspend fun addSeries(
        series: SeriesEntity,
        initialOwnedStart: Int? = null,
        initialOwnedEnd: Int? = null
    ): Long {
        val now = getCurrentTimestamp()
        val existing = bookDao.getSeriesByTitle(series.title.trim())
        val seriesId: Long

        if (existing != null) {
            seriesId = existing.id
            val updatedTotal = Math.max(existing.totalVolumes ?: 0, series.totalVolumes ?: 0)
            bookDao.updateSeries(
                existing.copy(
                    totalVolumes = updatedTotal,
                    coverUrl = series.coverUrl ?: existing.coverUrl,
                    updatedAt = now
                )
            )
        } else {
            seriesId = bookDao.insertSeries(series.copy(title = series.title.trim(), createdAt = now, updatedAt = now))
        }

        // 初期所持巻数の一括追加 (重複なし)
        if (initialOwnedStart != null && initialOwnedEnd != null && initialOwnedStart <= initialOwnedEnd) {
            for (i in initialOwnedStart..initialOwnedEnd) {
                val volStr = i.toString()
                val bookExists = bookDao.getBookBySeriesAndVolume(seriesId, volStr)
                if (bookExists == null) {
                    bookDao.insertBook(
                        BookEntity(
                            seriesId = seriesId,
                            title = series.title,
                            volume = volStr,
                            volumeSortKey = i.toDouble(),
                            status = BookStatus.OWNED,
                            isTemporary = false,
                            createdAt = now,
                            updatedAt = now
                        )
                    )
                }
            }
        }

        return seriesId
    }

    suspend fun updateSeries(series: SeriesEntity) {
        val now = getCurrentTimestamp()
        bookDao.updateSeries(series.copy(updatedAt = now))
        bookDao.updateBooksTitleBySeriesId(series.id, series.title, now)
    }

    suspend fun deleteSeries(seriesId: Long) {
        bookDao.deleteSeries(seriesId)
        bookDao.deleteBooksBySeriesId(seriesId)
        bookDao.deleteShoppingItemsBySeriesId(seriesId)
    }

    suspend fun bulkSetVolumeStatus(
        seriesId: Long,
        seriesTitle: String,
        startVol: Int,
        endVol: Int,
        status: BookStatus
    ) {
        val now = getCurrentTimestamp()
        for (i in startVol..endVol) {
            val volStr = i.toString()
            val existing = bookDao.getBookBySeriesAndVolume(seriesId, volStr)
            if (existing != null) {
                updateBookStatus(existing.id, status)
            } else if (status != BookStatus.UNREGISTERED) {
                insertBook(
                    BookEntity(
                        seriesId = seriesId,
                        title = seriesTitle,
                        volume = volStr,
                        volumeSortKey = i.toDouble(),
                        status = status,
                        isTemporary = false,
                        createdAt = now,
                        updatedAt = now
                    )
                )
            }
        }
        bookDao.updateSeriesUpdatedAt(seriesId, now)
    }

    suspend fun updateBookStatus(id: Long, status: BookStatus) {
        val now = getCurrentTimestamp()
        bookDao.updateBookStatus(id, status, now)
        val book = bookDao.getBookById(id)
        if (book != null && book.seriesId != null) {
            bookDao.updateSeriesUpdatedAt(book.seriesId, now)
            if (status == BookStatus.OWNED || status == BookStatus.UNREGISTERED) {
                bookDao.deleteShoppingItem(book.seriesId, book.volume)
            } else if (status == BookStatus.WANTED) {
                bookDao.insertShoppingItem(
                    ShoppingItemEntity(
                        seriesId = book.seriesId,
                        seriesTitle = book.title,
                        volume = book.volume,
                        priority = "high",
                        createdAt = now
                    )
                )
            }
        }
    }

    suspend fun deleteBook(id: Long) {
        val now = getCurrentTimestamp()
        val book = bookDao.getBookById(id)
        if (book != null && book.seriesId != null) {
            bookDao.deleteShoppingItem(book.seriesId, book.volume)
            bookDao.updateSeriesUpdatedAt(book.seriesId, now)
        }
        bookDao.deleteBookById(id)
    }

    suspend fun insertBook(book: BookEntity): Long {
        val now = getCurrentTimestamp()
        val id = bookDao.insertBook(book.copy(createdAt = now, updatedAt = now))
        if (book.seriesId != null) {
            bookDao.updateSeriesUpdatedAt(book.seriesId, now)
        }
        if (book.status == BookStatus.WANTED && book.seriesId != null) {
            bookDao.insertShoppingItem(
                ShoppingItemEntity(
                    seriesId = book.seriesId,
                    seriesTitle = book.title,
                    volume = book.volume,
                    priority = "high",
                    createdAt = now
                )
            )
        }
        return id
    }

    suspend fun deleteShoppingItemById(id: Long) {
        val now = getCurrentTimestamp()
        val shoppingItem = bookDao.getShoppingItemById(id)
        if (shoppingItem != null) {
            val existingBook = bookDao.getBookBySeriesAndVolume(shoppingItem.seriesId, shoppingItem.volume)
            if (existingBook != null && existingBook.status == BookStatus.WANTED) {
                bookDao.updateBookStatus(existingBook.id, BookStatus.UNREGISTERED, now)
                bookDao.updateSeriesUpdatedAt(shoppingItem.seriesId, now)
            }
        }
        bookDao.deleteShoppingItemById(id)
    }
}
