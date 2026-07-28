package com.example.shelfcheck.domain

import com.example.shelfcheck.data.local.BookEntity
import com.example.shelfcheck.data.local.SeriesEntity

data class BookshelfSeriesGroup(
    val series: SeriesEntity,
    val ownedCount: Int,
    val totalCount: Int,
    val hasWantedItem: Boolean,
    val books: List<BookEntity>
)
