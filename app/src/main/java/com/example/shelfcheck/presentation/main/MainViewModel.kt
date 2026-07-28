package com.example.shelfcheck.presentation.main

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.shelfcheck.data.local.BookEntity
import com.example.shelfcheck.data.local.SeriesEntity
import com.example.shelfcheck.data.local.ShoppingItemEntity
import com.example.shelfcheck.data.repository.BookRepository
import com.example.shelfcheck.domain.BookStatus
import com.example.shelfcheck.domain.BookshelfSeriesGroup
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch
import javax.inject.Inject

data class MainUiState(
    val searchQuery: String = "",
    val seriesList: List<SeriesEntity> = emptyList(),
    val booksList: List<BookEntity> = emptyList(),
    val bookshelfGroups: List<BookshelfSeriesGroup> = emptyList(),
    val shoppingItems: List<ShoppingItemEntity> = emptyList(),
    val selectedMatchResult: MatchResult? = null,
    val isShoppingMode: Boolean = true
)

data class MatchResult(
    val book: BookEntity?,
    val seriesTitle: String,
    val volume: String,
    val status: BookStatus,
    val message: String
)

private data class DataTuple(
    val series: List<SeriesEntity>,
    val books: List<BookEntity>,
    val groups: List<BookshelfSeriesGroup>,
    val shopping: List<ShoppingItemEntity>
)

@HiltViewModel
class MainViewModel @Inject constructor(
    private val repository: BookRepository
) : ViewModel() {

    private val _searchQuery = MutableStateFlow("")
    private val _isShoppingMode = MutableStateFlow(true)
    private val _selectedMatchResult = MutableStateFlow<MatchResult?>(null)

    private val _uiState = MutableStateFlow(MainUiState())
    val uiState: StateFlow<MainUiState> = _uiState

    init {
        viewModelScope.launch {
            val uiStateFlow = combine(
                _searchQuery,
                _isShoppingMode,
                _selectedMatchResult
            ) { query, shoppingMode, matchResult ->
                Triple(query, shoppingMode, matchResult)
            }

            val dataFlow = combine(
                repository.allSeries,
                repository.allBooks,
                repository.bookshelfGroups,
                repository.allShoppingItems
            ) { series, books, groups, shopping ->
                DataTuple(series, books, groups, shopping)
            }

            combine(uiStateFlow, dataFlow) { (query, shoppingMode, matchResult), data ->
                val filteredSeries = if (query.isBlank()) {
                    data.series
                } else {
                    val q = query.lowercase().trim()
                    data.series.filter {
                        it.title.lowercase().contains(q) ||
                        (it.titleKana != null && it.titleKana.lowercase().contains(q)) ||
                        (it.author != null && it.author.lowercase().contains(q))
                    }
                }

                MainUiState(
                    searchQuery = query,
                    seriesList = filteredSeries,
                    booksList = data.books,
                    bookshelfGroups = data.groups,
                    shoppingItems = data.shopping,
                    selectedMatchResult = matchResult,
                    isShoppingMode = shoppingMode
                )
            }.collect { state ->
                _uiState.value = state
            }
        }
    }

    fun onSearchQueryChange(query: String) {
        _searchQuery.value = query
    }

    fun toggleShoppingMode() {
        _isShoppingMode.value = !_isShoppingMode.value
    }

    fun selectVolume(series: SeriesEntity, volumeStr: String) {
        val existingBook = _uiState.value.booksList.find { it.seriesId == series.id && it.volume == volumeStr }
        val status = existingBook?.status ?: BookStatus.UNREGISTERED

        val message = when (status) {
            BookStatus.OWNED -> "⚠️ すでに所持しています！ (${series.title} ${volumeStr}巻)"
            BookStatus.WANTED -> "✅ 探していた買い出し対象の本です！ (${series.title} ${volumeStr}巻)"
            BookStatus.SOLD -> "⚠️ 過去に売却済みの本です (${series.title} ${volumeStr}巻)"
            BookStatus.UNREGISTERED -> "🟦 未所持の本です (${series.title} ${volumeStr}巻)"
        }

        _selectedMatchResult.value = MatchResult(
            book = existingBook,
            seriesTitle = series.title,
            volume = volumeStr,
            status = status,
            message = message
        )
    }

    fun dismissMatchResult() {
        _selectedMatchResult.value = null
    }

    fun markAsBought() {
        val current = _selectedMatchResult.value ?: return
        viewModelScope.launch {
            if (current.book != null) {
                repository.updateBookStatus(current.book.id, BookStatus.OWNED)
            } else {
                val series = _uiState.value.seriesList.find { it.title == current.seriesTitle }
                val newBook = BookEntity(
                    seriesId = series?.id,
                    title = current.seriesTitle,
                    volume = current.volume,
                    volumeSortKey = current.volume.toDoubleOrNull() ?: 1.0,
                    status = BookStatus.OWNED,
                    createdAt = "2026-07-28",
                    updatedAt = "2026-07-28"
                )
                repository.insertBook(newBook)
            }

            _selectedMatchResult.value = current.copy(
                status = BookStatus.OWNED,
                message = "🎉 所持済みに追加しました！ (${current.seriesTitle} ${current.volume}巻)"
            )
        }
    }

    fun toggleVolumeStatus(seriesId: Long, seriesTitle: String, volumeStr: String) {
        viewModelScope.launch {
            val existing = _uiState.value.booksList.find { it.seriesId == seriesId && it.volume == volumeStr }
            if (existing != null) {
                val nextStatus = when (existing.status) {
                    BookStatus.OWNED -> BookStatus.SOLD
                    BookStatus.SOLD -> BookStatus.WANTED
                    BookStatus.WANTED -> BookStatus.OWNED
                    BookStatus.UNREGISTERED -> BookStatus.OWNED
                }
                repository.updateBookStatus(existing.id, nextStatus)
            } else {
                val newBook = BookEntity(
                    seriesId = seriesId,
                    title = seriesTitle,
                    volume = volumeStr,
                    volumeSortKey = volumeStr.toDoubleOrNull() ?: 1.0,
                    status = BookStatus.OWNED,
                    createdAt = "2026-07-28",
                    updatedAt = "2026-07-28"
                )
                repository.insertBook(newBook)
            }
        }
    }

    fun deleteShoppingItem(id: Long) {
        viewModelScope.launch {
            repository.deleteShoppingItemById(id)
        }
    }
}
