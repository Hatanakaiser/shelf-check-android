package com.example.shelfcheck.presentation.main

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items as gridItems
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.layout.ContentScale
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.runtime.rememberCoroutineScope
import kotlinx.coroutines.launch
import coil.compose.AsyncImage
import com.example.shelfcheck.data.local.SeriesEntity
import com.example.shelfcheck.data.remote.ExternalBookResult
import com.example.shelfcheck.domain.BookStatus
import com.example.shelfcheck.domain.BookshelfSeriesGroup
import com.example.shelfcheck.domain.BookshelfSortOption
import com.example.shelfcheck.presentation.theme.*

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun MainScreen(
    viewModel: MainViewModel
) {
    val uiState by viewModel.uiState.collectAsState()
    val coroutineScope = rememberCoroutineScope()
    val pagerState = rememberPagerState(pageCount = { 3 })
    var showAddDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Book,
                            contentDescription = null,
                            tint = Blue500,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "ShelfCheck for Android",
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        )
                    }
                },
                actions = {
                    FilterChip(
                        selected = uiState.isMangaOnly,
                        onClick = { viewModel.toggleMangaOnly() },
                        label = {
                            Text(
                                if (uiState.isMangaOnly) "🎨 漫画のみ" else "📚 全書籍",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = Blue500.copy(alpha = 0.2f),
                            selectedLabelColor = Blue500
                        )
                    )
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Slate800
                )
            )
        },
        floatingActionButton = {
            if (pagerState.currentPage == 1) {
                ExtendedFloatingActionButton(
                    onClick = { showAddDialog = true },
                    icon = { Icon(Icons.Default.Add, contentDescription = "作品追加") },
                    text = { Text("作品追加", fontWeight = FontWeight.Bold) },
                    containerColor = Blue500,
                    contentColor = Color.White
                )
            }
        },
        bottomBar = {
            NavigationBar(
                containerColor = Slate800
            ) {
                NavigationBarItem(
                    selected = pagerState.currentPage == 0,
                    onClick = {
                        coroutineScope.launch {
                            pagerState.animateScrollToPage(0)
                        }
                    },
                    icon = { Icon(Icons.Default.Search, contentDescription = "検索") },
                    label = { Text("検索・照合", fontSize = 10.sp) }
                )
                NavigationBarItem(
                    selected = pagerState.currentPage == 1,
                    onClick = {
                        coroutineScope.launch {
                            pagerState.animateScrollToPage(1)
                        }
                    },
                    icon = { Icon(Icons.Default.Book, contentDescription = "本棚") },
                    label = { Text("本棚 (Kindle)", fontSize = 10.sp) }
                )
                NavigationBarItem(
                    selected = pagerState.currentPage == 2,
                    onClick = {
                        coroutineScope.launch {
                            pagerState.animateScrollToPage(2)
                        }
                    },
                    icon = {
                        BadgedBox(
                            badge = {
                                if (uiState.shoppingItems.isNotEmpty()) {
                                    Badge { Text(uiState.shoppingItems.size.toString()) }
                                }
                            }
                        ) {
                            Icon(Icons.Default.ShoppingCart, contentDescription = "買い出し")
                        }
                    },
                    label = { Text("買い出し", fontSize = 10.sp) }
                )
            }
        },
        containerColor = Slate900
    ) { paddingValues ->
        HorizontalPager(
            state = pagerState,
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) { page ->
            when (page) {
                0 -> SearchTabContent(uiState, viewModel)
                1 -> KindleBookshelfTabContent(uiState, viewModel)
                2 -> ShoppingTabContent(uiState, viewModel)
            }
        }

        if (showAddDialog) {
            AddSeriesDialog(
                onDismiss = { showAddDialog = false },
                onAdd = { series, start, end ->
                    viewModel.addSeries(series, start, end)
                    showAddDialog = false
                },
                seriesList = uiState.seriesList,
                viewModel = viewModel
            )
        }
    }
}

// --- Tab 1: 0.05秒インクリメンタルテキスト検索 ＆ 4色判定 ＆ Web API 外部検索 ---
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun SearchTabContent(
    uiState: MainUiState,
    viewModel: MainViewModel
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = uiState.searchQuery,
                onValueChange = { viewModel.onSearchQueryChange(it) },
                modifier = Modifier.weight(1f),
                placeholder = { Text("タイトル・ひらがな・著者名 (例: フリーレン)") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = Slate800,
                    unfocusedContainerColor = Slate800,
                    focusedBorderColor = Blue500,
                    unfocusedBorderColor = Slate700,
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White
                ),
                shape = RoundedCornerShape(12.dp)
            )

            Button(
                onClick = { viewModel.searchExternalApi() },
                enabled = uiState.searchQuery.isNotBlank() && !uiState.isSearchingApi,
                colors = ButtonDefaults.buttonColors(containerColor = Blue500),
                modifier = Modifier.height(56.dp),
                shape = RoundedCornerShape(12.dp)
            ) {
                if (uiState.isSearchingApi) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                } else {
                    Icon(Icons.Default.Language, contentDescription = "Web API検索")
                }
            }
        }

        // 3色照合アラート判定ダイアログ (画面中央固定)
        uiState.selectedMatchResult?.let { result ->
            val (bgColor, borderColor, statusLabel) = when (result.status) {
                BookStatus.OWNED -> Triple(Green950, Green500, "所持済み (緑)")
                BookStatus.WANTED -> Triple(Yellow950, Yellow500, "買いたい本 (黄)")
                else -> Triple(Slate800, Blue500, "未所持・未登録")
            }

            AlertDialog(
                onDismissRequest = { viewModel.dismissMatchResult() },
                containerColor = bgColor,
                title = {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                        Surface(
                            color = borderColor.copy(alpha = 0.2f),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text(
                                text = statusLabel,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = borderColor,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "${result.seriesTitle} (${result.volume}巻)",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }
                },
                text = {
                    Text(
                        text = result.message,
                        fontSize = 14.sp,
                        color = Color.White,
                        modifier = Modifier.fillMaxWidth()
                    )
                },
                confirmButton = {
                    if (result.status != BookStatus.OWNED) {
                        Button(
                            onClick = { viewModel.markAsBought() },
                            colors = ButtonDefaults.buttonColors(containerColor = Green500)
                        ) {
                            Icon(Icons.Default.ShoppingBag, contentDescription = null, tint = Color.Black)
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("買った！（所持へ追加）", color = Color.Black, fontWeight = FontWeight.Bold)
                        }
                    }
                },
                dismissButton = {
                    OutlinedButton(
                        onClick = { viewModel.dismissMatchResult() }
                    ) {
                        Text("閉じる", color = Color.White)
                    }
                }
            )
        }

        // ローカルヒット or Web API 検索トリガー
        LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            if (uiState.seriesList.isEmpty()) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Slate800)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Text(
                                text = "本棚に「${uiState.searchQuery}」に一致する作品はありません",
                                color = Slate400,
                                fontSize = 13.sp
                            )

                            if (uiState.searchQuery.isNotBlank()) {
                                Button(
                                    onClick = { viewModel.searchExternalApi() },
                                    enabled = !uiState.isSearchingApi,
                                    colors = ButtonDefaults.buttonColors(containerColor = Blue500)
                                ) {
                                    if (uiState.isSearchingApi) {
                                        CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text("検索中...")
                                    } else {
                                        Icon(Icons.Default.Language, contentDescription = null)
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text("Web API (Google / OpenBD) で検索する", fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                items(uiState.seriesList) { series ->
                    SeriesMatrixCard(series, uiState, viewModel)
                }
            }

            // Web API 外部検索結果一覧
            if (uiState.hasSearchedApi) {
                item {
                    Text(
                        text = "🌐 Web API 検索結果 (${uiState.apiSearchResults.size}件)",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = Blue500,
                        modifier = Modifier.padding(top = 8.dp)
                    )
                }

                items(uiState.apiSearchResults) { item ->
                    val isAlreadyReg = uiState.seriesList.any { s -> s.title.trim().equals(item.title.trim(), ignoreCase = true) }

                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Slate800)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(item.title, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                Text("${item.author ?: "著者不明"} ${item.publisher?.let { "• $it" } ?: ""}", fontSize = 11.sp, color = Slate400)
                                if (isAlreadyReg) {
                                    Text("✓ 本棚に登録済み", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Green500)
                                }
                            }

                            if (isAlreadyReg) {
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = Green950
                                ) {
                                    Text("登録済み", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Green500, modifier = Modifier.padding(8.dp))
                                }
                            } else {
                                Button(
                                    onClick = { viewModel.importApiBook(item) },
                                    colors = ButtonDefaults.buttonColors(containerColor = Blue500)
                                ) {
                                    Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("本棚に追加", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun SeriesMatrixCard(
    series: SeriesEntity,
    uiState: MainUiState,
    viewModel: MainViewModel
) {
    val seriesBooks = uiState.booksList.filter { it.seriesId == series.id }
    val totalVol = series.totalVolumes ?: 15

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Slate800),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(series.title, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    Text("${series.author ?: "著者未設定"} • 全 $totalVol 巻", fontSize = 12.sp, color = Slate400)
                }

                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Green950
                ) {
                    Text(
                        text = "✓ 本棚に登録済み",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = Green500,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // 巻数ブロックマトリクス [1][2][3]
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                (1..totalVol).forEach { volNum ->
                    val volStr = volNum.toString()
                    val book = seriesBooks.find { it.volume == volStr }
                    val status = book?.status ?: BookStatus.UNREGISTERED

                    val bgColor = when (status) {
                        BookStatus.OWNED -> Green500
                        BookStatus.WANTED -> Yellow500
                        else -> Slate700
                    }

                    val textColor = when (status) {
                        BookStatus.OWNED, BookStatus.WANTED -> Color.Black
                        else -> Color.White
                    }

                    Box(
                        modifier = Modifier
                            .size(width = 44.dp, height = 38.dp)
                            .clip(RoundedCornerShape(6.dp))
                            .background(bgColor)
                            .clickable { viewModel.selectVolume(series, volStr) },
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = volStr,
                            color = textColor,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                    }
                }
            }
        }
    }
}

// --- Tab 2: Kindleライブラリ風 シリーズ集約本棚 ---
@Composable
fun KindleBookshelfTabContent(
    uiState: MainUiState,
    viewModel: MainViewModel
) {
    var editingSeries by remember { mutableStateOf<SeriesEntity?>(null) }
    var sortMenuExpanded by remember { mutableStateOf(false) }
    val gridState = androidx.compose.foundation.lazy.grid.rememberLazyGridState()

    LaunchedEffect(uiState.sortOption, uiState.isSortAscending) {
        gridState.scrollToItem(0)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "📚 Kindle本棚 (ライブラリ)",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Text(
                    text = "全 ${uiState.bookshelfGroups.size} シリーズを集約・管理",
                    fontSize = 12.sp,
                    color = Slate400
                )
            }

            // ソートコントロール (案A: チップ Dropdown + 昇降順トグル)
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Box {
                    FilterChip(
                        selected = true,
                        onClick = { sortMenuExpanded = true },
                        label = {
                            Text(
                                uiState.sortOption.label,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                        },
                        trailingIcon = {
                            Icon(
                                Icons.Default.ArrowDropDown,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp)
                            )
                        },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = Slate800,
                            selectedLabelColor = Blue500
                        )
                    )

                    DropdownMenu(
                        expanded = sortMenuExpanded,
                        onDismissRequest = { sortMenuExpanded = false },
                        modifier = Modifier.background(Slate800)
                    ) {
                        BookshelfSortOption.values().forEach { option ->
                            DropdownMenuItem(
                                text = {
                                    Text(
                                        option.label,
                                        color = if (uiState.sortOption == option) Blue500 else Color.White,
                                        fontWeight = if (uiState.sortOption == option) FontWeight.Bold else FontWeight.Normal,
                                        fontSize = 13.sp
                                    )
                                },
                                onClick = {
                                    viewModel.setSortOption(option)
                                    sortMenuExpanded = false
                                }
                            )
                        }
                    }
                }

                IconButton(
                    onClick = { viewModel.toggleSortAscending() },
                    modifier = Modifier
                        .size(32.dp)
                        .background(Slate800, RoundedCornerShape(8.dp))
                ) {
                    Icon(
                        imageVector = if (uiState.isSortAscending) Icons.Default.ArrowUpward else Icons.Default.ArrowDownward,
                        contentDescription = if (uiState.isSortAscending) "昇順" else "降順",
                        tint = Blue500,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        LazyVerticalGrid(
            state = gridState,
            columns = GridCells.Fixed(2),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            gridItems(uiState.bookshelfGroups, key = { it.series.id }) { group ->
                KindleSeriesCard(group, viewModel, onEdit = { editingSeries = it })
            }
        }

        editingSeries?.let { series ->
            EditSeriesDialog(
                series = series,
                onDismiss = { editingSeries = null },
                onSave = { updated ->
                    viewModel.updateSeries(updated)
                    editingSeries = null
                },
                onDelete = { seriesId ->
                    viewModel.deleteSeries(seriesId)
                    editingSeries = null
                }
            )
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun KindleSeriesCard(
    group: BookshelfSeriesGroup,
    viewModel: MainViewModel,
    onEdit: (SeriesEntity) -> Unit
) {
    var showSheet by remember { mutableStateOf(false) }
    var showBulkMode by remember { mutableStateOf(false) }

    val rawCoverUrl = sequenceOf(
        group.series.coverUrl,
        group.books.find { it.volume == "1" }?.coverUrl,
        group.books.firstOrNull { !it.coverUrl.isNullOrBlank() }?.coverUrl
    ).firstOrNull { !it.isNullOrBlank() }

    val displayCoverUrl = when {
        rawCoverUrl.isNullOrBlank() -> null
        rawCoverUrl.startsWith("http://") -> rawCoverUrl.replace("http://", "https://")
        rawCoverUrl.startsWith("https://") -> rawCoverUrl
        else -> null
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { showSheet = true },
        colors = CardDefaults.cardColors(containerColor = Slate800),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(0.75f)
                    .clip(RoundedCornerShape(8.dp))
                    .background(Slate700),
                contentAlignment = Alignment.Center
            ) {
                if (!displayCoverUrl.isNullOrBlank()) {
                    AsyncImage(
                        model = displayCoverUrl,
                        contentDescription = group.series.title,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                } else {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center,
                        modifier = Modifier.padding(8.dp)
                    ) {
                        Icon(Icons.Default.Book, contentDescription = null, tint = Blue500, modifier = Modifier.size(36.dp))
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = group.series.title,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                // 右上: 所持数バッジ
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(6.dp)
                        .background(Color.Black.copy(alpha = 0.8f), RoundedCornerShape(10.dp))
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = "${group.ownedCount} / ${group.totalCount} 巻",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = group.series.title,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = group.series.author ?: "著者未設定",
                fontSize = 11.sp,
                color = Slate400
            )
        }
    }

    // シリーズ全巻展開モーダル
    if (showSheet) {
        AlertDialog(
            onDismissRequest = { showSheet = false },
            confirmButton = {
                TextButton(onClick = { showSheet = false }) {
                    Text("閉じる", color = Blue500)
                }
            },
            dismissButton = {
                TextButton(onClick = {
                    showSheet = false
                    onEdit(group.series)
                }) {
                    Icon(Icons.Default.Edit, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("編集")
                }
            },
            title = {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(group.series.title, color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                    IconButton(onClick = { showBulkMode = !showBulkMode }) {
                        Icon(Icons.Default.Tune, contentDescription = "一括設定", tint = Blue500)
                    }
                }
            },
            text = {
                Column {
                    Text("所持数: ${group.ownedCount} / 全 ${group.totalCount} 巻", fontSize = 12.sp, color = Slate400)
                    Spacer(modifier = Modifier.height(12.dp))

                    if (showBulkMode) {
                        BulkModeControl(
                            totalCount = group.totalCount,
                            onApplyBulk = { start, end, status ->
                                viewModel.bulkSetVolumeStatus(group.series.id, group.series.title, start, end, status)
                                showBulkMode = false
                            }
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                    }

                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        (1..group.totalCount).forEach { volNum ->
                            val volStr = volNum.toString()
                            val book = group.books.find { it.volume == volStr }
                            val status = book?.status ?: BookStatus.UNREGISTERED

                            val bgColor = when (status) {
                                BookStatus.OWNED -> Green500
                                BookStatus.WANTED -> Yellow500
                                else -> Slate700
                            }

                            val textColor = when (status) {
                                BookStatus.OWNED, BookStatus.WANTED -> Color.Black
                                else -> Color.White
                            }

                            Box(
                                modifier = Modifier
                                    .size(40.dp)
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(bgColor)
                                    .clickable {
                                        viewModel.toggleVolumeStatus(group.series.id, group.series.title, volStr)
                                    },
                                contentAlignment = Alignment.Center
                            ) {
                                Text(volStr, color = textColor, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }
                        }
                    }
                }
            },
            containerColor = Slate800
        )
    }
}

@Composable
fun BulkModeControl(
    totalCount: Int,
    onApplyBulk: (start: Int, end: Int, status: BookStatus) -> Unit
) {
    var startText by remember { mutableStateOf("1") }
    var endText by remember { mutableStateOf(totalCount.toString()) }
    var selectedStatus by remember { mutableStateOf(BookStatus.OWNED) }

    Card(
        colors = CardDefaults.cardColors(containerColor = Slate900),
        shape = RoundedCornerShape(8.dp)
    ) {
        Column(modifier = Modifier.padding(10.dp)) {
            Text("⚡ 一括ステータス変更", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
            Spacer(modifier = Modifier.height(6.dp))
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                OutlinedTextField(
                    value = startText,
                    onValueChange = { startText = it },
                    modifier = Modifier.width(50.dp),
                    singleLine = true
                )
                Text("〜", color = Color.White)
                OutlinedTextField(
                    value = endText,
                    onValueChange = { endText = it },
                    modifier = Modifier.width(50.dp),
                    singleLine = true
                )
                Text("巻", color = Color.White, fontSize = 12.sp)

                Button(
                    onClick = {
                        val s = startText.toIntOrNull() ?: 1
                        val e = endText.toIntOrNull() ?: totalCount
                        onApplyBulk(s, e, selectedStatus)
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Blue500),
                    modifier = Modifier.height(38.dp)
                ) {
                    Text("反映", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

// --- 新規作品追加ダイアログ (API検索タブ ＆ 重複チェック付き) ---
@Composable
fun AddSeriesDialog(
    onDismiss: () -> Unit,
    onAdd: (SeriesEntity, initialStart: Int?, initialEnd: Int?) -> Unit,
    seriesList: List<SeriesEntity>,
    viewModel: MainViewModel
) {
    var activeTab by remember { mutableIntStateOf(0) } // 0: Web API検索, 1: 手動入力
    var apiQueryText by remember { mutableStateOf("") }

    var title by remember { mutableStateOf("") }
    var author by remember { mutableStateOf("") }
    var publisher by remember { mutableStateOf("") }
    var coverUrl by remember { mutableStateOf<String?>(null) }
    var totalVolumesText by remember { mutableStateOf("10") }
    var isBulkOwned by remember { mutableStateOf(false) }
    var startVolText by remember { mutableStateOf("1") }
    var endVolText by remember { mutableStateOf("5") }

    val isDuplicate = seriesList.any { it.title.trim().equals(title.trim(), ignoreCase = true) }
    val uiState by viewModel.uiState.collectAsState()

    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            if (activeTab == 1) {
                Button(
                    onClick = {
                        val total = totalVolumesText.toIntOrNull() ?: 10
                        val s = if (isBulkOwned) startVolText.toIntOrNull() else null
                        val e = if (isBulkOwned) endVolText.toIntOrNull() else null
                        val now = java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS", java.util.Locale.JAPAN).format(java.util.Date())

                        onAdd(
                            SeriesEntity(
                                title = title.trim(),
                                author = author.trim().ifEmpty { null },
                                publisher = publisher.trim().ifEmpty { null },
                                totalVolumes = total,
                                isCompleted = false,
                                coverUrl = coverUrl,
                                createdAt = now,
                                updatedAt = now
                            ),
                            s, e
                        )
                    },
                    enabled = title.isNotBlank(),
                    colors = ButtonDefaults.buttonColors(containerColor = if (isDuplicate) Orange500 else Blue500)
                ) {
                    Text(if (isDuplicate) "上書き・更新登録" else "シリーズ登録", fontWeight = FontWeight.Bold)
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("キャンセル") }
        },
        title = { Text("新規作品シリーズの追加", color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                // Tab Switcher
                TabRow(selectedTabIndex = activeTab, containerColor = Slate900, contentColor = Blue500) {
                    Tab(selected = activeTab == 0, onClick = { activeTab = 0 }) {
                        Text("🌐 Web API検索", modifier = Modifier.padding(8.dp), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                    Tab(selected = activeTab == 1, onClick = { activeTab = 1 }) {
                        Text("✍️ 手動入力", modifier = Modifier.padding(8.dp), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }

                if (activeTab == 0) {
                    // API 検索タブ
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        OutlinedTextField(
                            value = apiQueryText,
                            onValueChange = { apiQueryText = it },
                            placeholder = { Text("作品名・著者名 (例: 葬送のフリーレン)") },
                            modifier = Modifier.weight(1f),
                            singleLine = true
                        )
                        Button(
                            onClick = { viewModel.searchExternalApi(apiQueryText) },
                            colors = ButtonDefaults.buttonColors(containerColor = Blue500)
                        ) {
                            Text("検索")
                        }
                    }

                    LazyColumn(
                        modifier = Modifier.heightIn(max = 240.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        items(uiState.apiSearchResults) { item ->
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        title = item.title
                                        author = item.author ?: ""
                                        publisher = item.publisher ?: ""
                                        coverUrl = item.coverUrl
                                        totalVolumesText = (item.volumeCount ?: 10).toString()
                                        activeTab = 1
                                    },
                                colors = CardDefaults.cardColors(containerColor = Slate900)
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(8.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(
                                        modifier = Modifier.weight(1f),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        if (!item.coverUrl.isNullOrBlank()) {
                                            AsyncImage(
                                                model = item.coverUrl,
                                                contentDescription = item.title,
                                                contentScale = ContentScale.Crop,
                                                modifier = Modifier
                                                    .size(width = 32.dp, height = 44.dp)
                                                    .clip(RoundedCornerShape(4.dp))
                                            )
                                        }
                                        Column {
                                            Text(item.title, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                            Text("${item.author ?: "著者不明"} ${item.publisher?.let { "• $it" } ?: ""}", fontSize = 10.sp, color = Slate400)
                                        }
                                    }
                                    Text("選択", fontSize = 11.sp, color = Blue500, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                } else {
                    // 手動入力タブ
                    if (isDuplicate) {
                        Surface(
                            color = Red900,
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = "⚠️ 「$title」はすでに本棚に登録されています！",
                                color = Color.White,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(8.dp)
                            )
                        }
                    }

                    OutlinedTextField(
                        value = title,
                        onValueChange = { title = it },
                        label = { Text("作品タイトル *") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = author,
                        onValueChange = { author = it },
                        label = { Text("著者名") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = totalVolumesText,
                            onValueChange = { totalVolumesText = it },
                            label = { Text("全既刊数") },
                            modifier = Modifier.weight(1f),
                            singleLine = true
                        )
                        OutlinedTextField(
                            value = publisher,
                            onValueChange = { publisher = it },
                            label = { Text("出版社") },
                            modifier = Modifier.weight(1f),
                            singleLine = true
                        )
                    }

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(checked = isBulkOwned, onCheckedChange = { isBulkOwned = it })
                        Text("初期所持巻数をまとめて登録する", fontSize = 12.sp, color = Color.White)
                    }

                    if (isBulkOwned) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            OutlinedTextField(value = startVolText, onValueChange = { startVolText = it }, modifier = Modifier.width(50.dp))
                            Text("巻 〜", color = Color.White, fontSize = 12.sp)
                            OutlinedTextField(value = endVolText, onValueChange = { endVolText = it }, modifier = Modifier.width(50.dp))
                            Text("巻を所持登録", color = Color.White, fontSize = 12.sp)
                        }
                    }
                }
            }
        },
        containerColor = Slate800
    )
}

// --- シリーズ編集ダイアログ ---
@Composable
fun EditSeriesDialog(
    series: SeriesEntity,
    onDismiss: () -> Unit,
    onSave: (SeriesEntity) -> Unit,
    onDelete: (Long) -> Unit
) {
    var title by remember { mutableStateOf(series.title) }
    var author by remember { mutableStateOf(series.author ?: "") }
    var publisher by remember { mutableStateOf(series.publisher ?: "") }
    var totalVolText by remember { mutableStateOf((series.totalVolumes ?: 10).toString()) }

    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            Button(
                onClick = {
                    onSave(
                        series.copy(
                            title = title.trim(),
                            author = author.trim().ifEmpty { null },
                            publisher = publisher.trim().ifEmpty { null },
                            totalVolumes = totalVolText.toIntOrNull() ?: series.totalVolumes
                        )
                    )
                },
                colors = ButtonDefaults.buttonColors(containerColor = Blue500)
            ) {
                Text("保存", fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = { onDelete(series.id) }) {
                Text("削除", color = Red500, fontWeight = FontWeight.Bold)
            }
        },
        title = { Text("シリーズ情報の編集", color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(value = title, onValueChange = { title = it }, label = { Text("タイトル") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = author, onValueChange = { author = it }, label = { Text("著者") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = totalVolText, onValueChange = { totalVolText = it }, label = { Text("全既刊数 (最新巻数)") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = publisher, onValueChange = { publisher = it }, label = { Text("出版社") }, modifier = Modifier.fillMaxWidth())
            }
        },
        containerColor = Slate800
    )
}

// --- Tab 3: 買い出しリスト ---
@Composable
fun ShoppingTabContent(
    uiState: MainUiState,
    viewModel: MainViewModel
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.ShoppingCart, contentDescription = null, tint = Yellow500)
            Spacer(modifier = Modifier.width(8.dp))
            Text("買い出しリスト (買いたい本)", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Color.White)
        }

        Spacer(modifier = Modifier.height(16.dp))

        if (uiState.shoppingItems.isEmpty()) {
            Text("🛒 買い出しリストに登録された本はありません。", color = Slate400)
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(uiState.shoppingItems) { item ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Slate800)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(
                                modifier = Modifier
                                    .weight(1f)
                                    .padding(end = 8.dp)
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text("買いたい本", fontSize = 10.sp, color = Yellow500, fontWeight = FontWeight.Bold)
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Surface(
                                        color = Yellow500.copy(alpha = 0.2f),
                                        shape = RoundedCornerShape(4.dp)
                                    ) {
                                        Text(
                                            text = "${item.volume}巻",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Yellow500,
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 1.dp)
                                        )
                                    }
                                }
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = item.seriesTitle,
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            }

                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Button(
                                    onClick = { viewModel.markShoppingItemAsBought(item) },
                                    colors = ButtonDefaults.buttonColors(containerColor = Green500),
                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                                ) {
                                    Icon(Icons.Default.Check, contentDescription = null, tint = Color.Black, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("買った！", color = Color.Black, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                }
                                IconButton(onClick = { viewModel.deleteShoppingItem(item.id) }) {
                                    Icon(Icons.Default.Delete, contentDescription = "削除", tint = Slate400)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
