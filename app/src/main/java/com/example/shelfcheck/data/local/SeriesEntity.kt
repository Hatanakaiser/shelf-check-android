package com.example.shelfcheck.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "series")
data class SeriesEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String,
    val titleKana: String? = null,
    val author: String? = null,
    val publisher: String? = null,
    val totalVolumes: Int? = null,
    val isCompleted: Boolean = false,
    val coverUrl: String? = null,
    val createdAt: String,
    val updatedAt: String
)
