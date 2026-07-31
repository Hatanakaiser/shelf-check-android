package com.example.shelfcheck.data.repository

import android.content.SharedPreferences
import com.example.shelfcheck.domain.BookshelfSortOption
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class UserPreferencesRepository @Inject constructor(
    private val prefs: SharedPreferences
) {
    private val keySortOption = "bookshelf_sort_option"
    private val keySortAscending = "bookshelf_sort_ascending"

    private val _sortOption = MutableStateFlow(getSavedSortOption())
    val sortOption: StateFlow<BookshelfSortOption> = _sortOption.asStateFlow()

    private val _isSortAscending = MutableStateFlow(getSavedIsSortAscending())
    val isSortAscending: StateFlow<Boolean> = _isSortAscending.asStateFlow()

    private fun getSavedSortOption(): BookshelfSortOption {
        val saved = prefs.getString(keySortOption, BookshelfSortOption.CREATED_AT.name)
        return try {
            BookshelfSortOption.valueOf(saved ?: BookshelfSortOption.CREATED_AT.name)
        } catch (e: Exception) {
            BookshelfSortOption.CREATED_AT
        }
    }

    private fun getSavedIsSortAscending(): Boolean {
        return prefs.getBoolean(keySortAscending, false)
    }

    fun setSortOption(option: BookshelfSortOption) {
        prefs.edit().putString(keySortOption, option.name).apply()
        _sortOption.value = option
    }

    fun setSortAscending(isAscending: Boolean) {
        prefs.edit().putBoolean(keySortAscending, isAscending).apply()
        _isSortAscending.value = isAscending
    }
}
