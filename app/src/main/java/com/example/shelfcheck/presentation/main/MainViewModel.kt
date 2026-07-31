package com.example.shelfcheck.presentation.main

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.shelfcheck.data.local.BookEntity
import com.example.shelfcheck.data.local.SeriesEntity
import com.example.shelfcheck.data.local.ShoppingItemEntity
import com.example.shelfcheck.data.remote.BookApiService
import com.example.shelfcheck.data.remote.ExternalBookResult
import com.example.shelfcheck.data.repository.BookRepository
import com.example.shelfcheck.data.repository.UserPreferencesRepository
import com.example.shelfcheck.domain.BookStatus
import com.example.shelfcheck.domain.BookshelfSeriesGroup
import com.example.shelfcheck.domain.BookshelfSortOption
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class MainUiState(
    val searchQuery: String = "",
    val seriesList: List<SeriesEntity> = emptyList(),
    val booksList: List<BookEntity> = emptyList(),
    val bookshelfGroups: List<BookshelfSeriesGroup> = emptyList(),
    val shoppingItems: List<ShoppingItemEntity> = emptyList(),
    val selectedMatchResult: MatchResult? = null,
    val isMangaOnly: Boolean = true,
    val isSearchingApi: Boolean = false,
    val apiSearchResults: List<ExternalBookResult> = emptyList(),
    val hasSearchedApi: Boolean = false,
    val sortOption: BookshelfSortOption = BookshelfSortOption.CREATED_AT,
    val isSortAscending: Boolean = false
)

data class MatchResult(
    val book: BookEntity?,
    val seriesTitle: String,
    val volume: String,
    val status: BookStatus,
    val message: String
)

private data class RepositoryData(
    val series: List<SeriesEntity>,
    val books: List<BookEntity>,
    val groups: List<BookshelfSeriesGroup>,
    val shopping: List<ShoppingItemEntity>
)

@HiltViewModel
class MainViewModel @Inject constructor(
    private val repository: BookRepository,
    private val apiService: BookApiService,
    private val userPreferencesRepository: UserPreferencesRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(MainUiState())
    val uiState: StateFlow<MainUiState> = _uiState.asStateFlow()

    private val searchQueryFlow = MutableStateFlow("")
    private val isMangaOnlyFlow = MutableStateFlow(true)

    init {
        viewModelScope.launch {
            val repositoryDataFlow = combine(
                repository.allSeries,
                repository.allBooks,
                repository.bookshelfGroups,
                repository.allShoppingItems
            ) { series, books, groups, shopping ->
                RepositoryData(series, books, groups, shopping)
            }

            combine(
                repositoryDataFlow,
                userPreferencesRepository.sortOption,
                userPreferencesRepository.isSortAscending,
                searchQueryFlow,
                isMangaOnlyFlow
            ) { repoData, sortOpt, isAsc, query, isMangaOnly ->
                val cleanQuery = query.lowercase().trim()
                val nonMangaKeywords = listOf("小説", "ノベル", "文庫", "新書", "ファンブック", "ガイドブック", "画集", "アンソロジー", "レシピ")
                
                val filteredSeries = repoData.series.filter { s ->
                    if (isMangaOnly && nonMangaKeywords.any { s.title.contains(it) }) {
                        return@filter false
                    }
                    if (cleanQuery.isBlank()) true
                    else {
                        s.title.lowercase().contains(cleanQuery) ||
                        (s.titleKana != null && s.titleKana.lowercase().contains(cleanQuery)) ||
                        (s.author != null && s.author.lowercase().contains(cleanQuery))
                    }
                }

                val sortedGroups = sortBookshelfGroups(repoData.groups, sortOpt, isAsc)

                _uiState.update { state ->
                    state.copy(
                        searchQuery = query,
                        isMangaOnly = isMangaOnly,
                        seriesList = filteredSeries,
                        booksList = repoData.books,
                        bookshelfGroups = sortedGroups,
                        shoppingItems = repoData.shopping,
                        sortOption = sortOpt,
                        isSortAscending = isAsc
                    )
                }
            }.collect {}
        }
    }

    private fun sortBookshelfGroups(
        groups: List<BookshelfSeriesGroup>,
        sortOption: BookshelfSortOption,
        isAscending: Boolean
    ): List<BookshelfSeriesGroup> {
        val sorted = when (sortOption) {
            BookshelfSortOption.CREATED_AT -> groups.sortedBy { it.series.createdAt }
            BookshelfSortOption.UPDATED_AT -> groups.sortedBy { group ->
                val latestBookUpdate = group.books.maxOfOrNull { it.updatedAt } ?: ""
                val seriesUpdate = group.series.updatedAt
                if (latestBookUpdate > seriesUpdate) latestBookUpdate else seriesUpdate
            }
            BookshelfSortOption.WANTED_FIRST -> groups.sortedBy { if (it.hasWantedItem) 0 else 1 }
            BookshelfSortOption.OWNED_COUNT -> groups.sortedBy { it.ownedCount }
            BookshelfSortOption.COMPLETION_RATE -> groups.sortedBy {
                if (it.totalCount > 0) it.ownedCount.toDouble() / it.totalCount.toDouble() else 0.0
            }
        }
        return if (isAscending) sorted else sorted.reversed()
    }

    fun setSortOption(option: BookshelfSortOption) {
        userPreferencesRepository.setSortOption(option)
    }

    fun toggleSortAscending() {
        userPreferencesRepository.setSortAscending(!_uiState.value.isSortAscending)
    }

    fun onSearchQueryChange(query: String) {
        searchQueryFlow.value = query
        _uiState.update { it.copy(hasSearchedApi = false) }
    }

    fun searchExternalApi(query: String = _uiState.value.searchQuery) {
        if (query.isBlank()) return
        viewModelScope.launch {
            _uiState.update { it.copy(isSearchingApi = true, hasSearchedApi = true) }
            val results = apiService.searchExternalBooks(query, _uiState.value.isMangaOnly)
            _uiState.update { it.copy(isSearchingApi = false, apiSearchResults = results) }
        }
    }

    private fun getCurrentTimestamp(): String {
        val sdf = java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS", java.util.Locale.JAPAN)
        return sdf.format(java.util.Date())
    }

    fun importApiBook(item: ExternalBookResult) {
        viewModelScope.launch {
            val now = getCurrentTimestamp()
            val series = SeriesEntity(
                title = item.title,
                author = item.author,
                publisher = item.publisher,
                totalVolumes = item.volumeCount ?: 10,
                isCompleted = false,
                coverUrl = item.coverUrl,
                createdAt = now,
                updatedAt = now
            )
            repository.addSeries(series)
        }
    }

    fun toggleMangaOnly() {
        isMangaOnlyFlow.value = !isMangaOnlyFlow.value
    }

    fun addSeries(
        series: SeriesEntity,
        initialOwnedStart: Int? = null,
        initialOwnedEnd: Int? = null
    ) {
        viewModelScope.launch {
            repository.addSeries(series, initialOwnedStart, initialOwnedEnd)
        }
    }

    fun updateSeries(series: SeriesEntity) {
        viewModelScope.launch {
            repository.updateSeries(series)
        }
    }

    fun deleteSeries(seriesId: Long) {
        viewModelScope.launch {
            repository.deleteSeries(seriesId)
        }
    }

    fun bulkSetVolumeStatus(
        seriesId: Long,
        seriesTitle: String,
        startVol: Int,
        endVol: Int,
        status: BookStatus
    ) {
        viewModelScope.launch {
            repository.bulkSetVolumeStatus(seriesId, seriesTitle, startVol, endVol, status)
        }
    }

    fun selectVolume(series: SeriesEntity, volumeStr: String) {
        val existingBook = _uiState.value.booksList.find { it.seriesId == series.id && it.volume == volumeStr }
        val status = existingBook?.status ?: BookStatus.UNREGISTERED

        val message = when (status) {
            BookStatus.OWNED -> "🟩 すでに所持しています (${series.title} ${volumeStr}巻)"
            BookStatus.WANTED -> "🟨 買いたい本（買い物リスト対象）です！ (${series.title} ${volumeStr}巻)"
            BookStatus.SOLD -> "🟦 未所持の本です (${series.title} ${volumeStr}巻)"
            BookStatus.UNREGISTERED -> "🟦 未所持の本です (${series.title} ${volumeStr}巻)"
        }

        _uiState.update {
            it.copy(
                selectedMatchResult = MatchResult(
                    book = existingBook,
                    seriesTitle = series.title,
                    volume = volumeStr,
                    status = status,
                    message = message
                )
            )
        }
    }

    fun dismissMatchResult() {
        _uiState.update { it.copy(selectedMatchResult = null) }
    }

    fun markAsBought() {
        val current = _uiState.value.selectedMatchResult ?: return
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

            _uiState.update {
                it.copy(
                    selectedMatchResult = current.copy(
                        status = BookStatus.OWNED,
                        message = "🎉 所持済みに追加しました！ (${current.seriesTitle} ${current.volume}巻)"
                    )
                )
            }
        }
    }

    fun toggleVolumeStatus(seriesId: Long, seriesTitle: String, volumeStr: String) {
        viewModelScope.launch {
            val existing = _uiState.value.booksList.find { it.seriesId == seriesId && it.volume == volumeStr }
            if (existing != null) {
                if (existing.status == BookStatus.OWNED) {
                    repository.updateBookStatus(existing.id, BookStatus.WANTED)
                } else {
                    repository.deleteBook(existing.id)
                }
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

    fun markShoppingItemAsBought(item: ShoppingItemEntity) {
        viewModelScope.launch {
            val existingBook = _uiState.value.booksList.find { it.seriesId == item.seriesId && it.volume == item.volume }
            if (existingBook != null) {
                repository.updateBookStatus(existingBook.id, BookStatus.OWNED)
            } else {
                repository.insertBook(
                    BookEntity(
                        seriesId = item.seriesId,
                        title = item.seriesTitle,
                        volume = item.volume,
                        volumeSortKey = item.volume.toDoubleOrNull() ?: 1.0,
                        status = BookStatus.OWNED,
                        createdAt = "2026-07-28",
                        updatedAt = "2026-07-28"
                    )
                )
                repository.deleteShoppingItemById(item.id)
            }
        }
    }

    fun deleteShoppingItem(id: Long) {
        viewModelScope.launch {
            repository.deleteShoppingItemById(id)
        }
    }
}
