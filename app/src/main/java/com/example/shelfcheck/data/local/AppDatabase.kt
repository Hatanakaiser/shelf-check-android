package com.example.shelfcheck.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.sqlite.db.SupportSQLiteDatabase
import com.example.shelfcheck.domain.BookStatus
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

@Database(
    entities = [BookEntity::class, SeriesEntity::class, ShoppingItemEntity::class],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {

    abstract fun bookDao(): BookDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context, scope: CoroutineScope): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "shelf_check_database"
                )
                .addCallback(AppDatabaseCallback(scope))
                .build()
                INSTANCE = instance
                instance
            }
        }
    }

    private class AppDatabaseCallback(
        private val scope: CoroutineScope
    ) : RoomDatabase.Callback() {

        override fun onCreate(db: SupportSQLiteDatabase) {
            super.onCreate(db)
            INSTANCE?.let { database ->
                scope.launch(Dispatchers.IO) {
                    populateDatabase(database.bookDao())
                }
            }
        }

        suspend fun populateDatabase(dao: BookDao) {
            val now = "2026-07-28"

            // 1. ゆゆ式 シリーズ
            val yuyushikiId = dao.insertSeries(
                SeriesEntity(
                    title = "ゆゆ式",
                    titleKana = "ユユシキ",
                    author = "三上小又",
                    publisher = "芳文社",
                    totalVolumes = 15,
                    isCompleted = false,
                    coverUrl = "covers/yuyushiki1.jpg",
                    createdAt = now,
                    updatedAt = now
                )
            )

            // 2. 呪術廻戦 シリーズ
            val jujutsuId = dao.insertSeries(
                SeriesEntity(
                    title = "呪術廻戦",
                    titleKana = "ジュジュツカイセン",
                    author = "芥見下々",
                    publisher = "集英社",
                    totalVolumes = 26,
                    isCompleted = false,
                    coverUrl = "covers/jujutsu.jpg",
                    createdAt = now,
                    updatedAt = now
                )
            )

            // ゆゆ式 1巻 (所持済み)
            dao.insertBook(
                BookEntity(
                    isbn = "9784832277946",
                    seriesId = yuyushikiId,
                    title = "ゆゆ式",
                    volume = "1",
                    volumeSortKey = 1.0,
                    status = BookStatus.OWNED,
                    coverUrl = "covers/yuyushiki1.jpg",
                    createdAt = now,
                    updatedAt = now
                )
            )

            // ゆゆ式 2〜5巻 (所持済み)
            for (i in 2..5) {
                dao.insertBook(
                    BookEntity(
                        seriesId = yuyushikiId,
                        title = "ゆゆ式",
                        volume = i.toString(),
                        volumeSortKey = i.toDouble(),
                        status = BookStatus.OWNED,
                        createdAt = now,
                        updatedAt = now
                    )
                )
            }

            // ゆゆ式 15巻 (買い出し対象)
            dao.insertBook(
                BookEntity(
                    isbn = "9784832295322",
                    seriesId = yuyushikiId,
                    title = "ゆゆ式",
                    volume = "15",
                    volumeSortKey = 15.0,
                    status = BookStatus.WANTED,
                    coverUrl = "covers/yuyushiki15.jpg",
                    createdAt = now,
                    updatedAt = now
                )
            )

            // 呪術廻戦 1〜5巻 (所持済み)
            for (i in 1..5) {
                dao.insertBook(
                    BookEntity(
                        seriesId = jujutsuId,
                        title = "呪術廻戦",
                        volume = i.toString(),
                        volumeSortKey = i.toDouble(),
                        status = BookStatus.OWNED,
                        createdAt = now,
                        updatedAt = now
                    )
                )
            }

            // 呪術廻戦 7巻 (買い出し対象)
            dao.insertBook(
                BookEntity(
                    seriesId = jujutsuId,
                    title = "呪術廻戦",
                    volume = "7",
                    volumeSortKey = 7.0,
                    status = BookStatus.WANTED,
                    createdAt = now,
                    updatedAt = now
                )
            )

            // 買い出し初期アイテム
            dao.insertShoppingItem(
                ShoppingItemEntity(
                    seriesId = yuyushikiId,
                    seriesTitle = "ゆゆ式",
                    volume = "15",
                    createdAt = now
                )
            )

            dao.insertShoppingItem(
                ShoppingItemEntity(
                    seriesId = jujutsuId,
                    seriesTitle = "呪術廻戦",
                    volume = "7",
                    createdAt = now
                )
            )
        }
    }
}
