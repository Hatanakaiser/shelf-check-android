# 機能設計書 (Android Native / Clean Architecture)

- **文書バージョン**: v1.1.0 (Kindle風本棚機能追加版)
- **更新日**: 2026-07-28
- **対象システム**: ShelfCheck for Android

---

## 1. データモデル設計 (`BookshelfSeriesGroup`)

Kindleライブラリ表示用のシリーズ集約モデル。

```kotlin
data class BookshelfSeriesGroup(
    val series: SeriesEntity,
    val ownedCount: Int,         // 所持巻数 (例: 5)
    val totalCount: Int,         // 全巻数 (例: 26)
    val hasWantedItem: Boolean,  // 買い出し対象の巻があるか
    val books: List<BookEntity>  // 所属する全書籍リスト
)
```

---

## 2. Room DAO 集約クエリ設計

```kotlin
@Dao
interface SeriesDao {
    @Transaction
    @Query("SELECT * FROM series ORDER BY titleKana ASC")
    fun getBookshelfSeriesGroups(): Flow<List<SeriesWithBooks>>
}

data class SeriesWithBooks(
    @Embedded val series: SeriesEntity,
    @Relation(
        parentColumn = "id",
        entityColumn = "seriesId"
    )
    val books: List<BookEntity>
)
```
