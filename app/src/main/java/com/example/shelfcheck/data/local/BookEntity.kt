package com.example.shelfcheck.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.example.shelfcheck.domain.BookStatus

@Entity(tableName = "books")
data class BookEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val isbn: String? = null,
    val seriesId: Long? = null,
    val title: String,
    val author: String? = null,
    val publisher: String? = null,
    val volume: String,
    val volumeSortKey: Double,
    val status: BookStatus,
    val coverUrl: String? = null,
    val purchaseDate: String? = null,
    val isTemporary: Boolean = false,
    val createdAt: String,
    val updatedAt: String
)
