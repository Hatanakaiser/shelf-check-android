package com.example.shelfcheck.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "shopping_items")
data class ShoppingItemEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val seriesId: Long,
    val seriesTitle: String,
    val volume: String,
    val priority: String = "HIGH",
    val createdAt: String
)
