package com.example.shelfcheck.data.local

import androidx.room.*
import com.example.shelfcheck.domain.BookStatus
import kotlinx.coroutines.flow.Flow

@Dao
interface BookDao {

    // --- Books ---
    @Query("SELECT * FROM books WHERE isbn = :isbn LIMIT 1")
    suspend fun getBookByIsbn(isbn: String): BookEntity?

    @Query("SELECT * FROM books WHERE seriesId = :seriesId AND volume = :volume LIMIT 1")
    suspend fun getBookBySeriesAndVolume(seriesId: Long, volume: String): BookEntity?

    @Query("SELECT * FROM books")
    fun getAllBooks(): Flow<List<BookEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertBook(book: BookEntity): Long

    @Query("SELECT * FROM books WHERE id = :id LIMIT 1")
    suspend fun getBookById(id: Long): BookEntity?

    @Query("UPDATE books SET status = :status, updatedAt = :updatedAt WHERE id = :id")
    suspend fun updateBookStatus(id: Long, status: BookStatus, updatedAt: String)

    @Query("UPDATE books SET title = :title, updatedAt = :updatedAt WHERE seriesId = :seriesId")
    suspend fun updateBooksTitleBySeriesId(seriesId: Long, title: String, updatedAt: String)

    @Query("DELETE FROM books WHERE id = :id")
    suspend fun deleteBookById(id: Long)

    @Query("DELETE FROM books WHERE seriesId = :seriesId")
    suspend fun deleteBooksBySeriesId(seriesId: Long)

    // --- Series ---
    @Query("SELECT * FROM series")
    fun getAllSeries(): Flow<List<SeriesEntity>>

    @Query("SELECT * FROM series WHERE LOWER(title) = LOWER(:title) LIMIT 1")
    suspend fun getSeriesByTitle(title: String): SeriesEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSeries(series: SeriesEntity): Long

    @Update
    suspend fun updateSeries(series: SeriesEntity)

    @Query("DELETE FROM series WHERE id = :id")
    suspend fun deleteSeries(id: Long)

    @Query("UPDATE series SET updatedAt = :updatedAt WHERE id = :id")
    suspend fun updateSeriesUpdatedAt(id: Long, updatedAt: String)

    @Query("SELECT COUNT(*) FROM series")
    suspend fun getSeriesCount(): Int

    // --- ShoppingItems ---
    @Query("SELECT * FROM shopping_items")
    fun getAllShoppingItems(): Flow<List<ShoppingItemEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertShoppingItem(item: ShoppingItemEntity): Long

    @Query("DELETE FROM shopping_items WHERE seriesId = :seriesId AND volume = :volume")
    suspend fun deleteShoppingItem(seriesId: Long, volume: String)

    @Query("DELETE FROM shopping_items WHERE seriesId = :seriesId")
    suspend fun deleteShoppingItemsBySeriesId(seriesId: Long)

    @Query("SELECT * FROM shopping_items WHERE id = :id LIMIT 1")
    suspend fun getShoppingItemById(id: Long): ShoppingItemEntity?

    @Query("DELETE FROM shopping_items WHERE id = :id")
    suspend fun deleteShoppingItemById(id: Long)
}
