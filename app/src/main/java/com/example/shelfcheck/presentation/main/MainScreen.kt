package com.example.shelfcheck.presentation.main

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
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
import com.example.shelfcheck.data.local.SeriesEntity
import com.example.shelfcheck.domain.BookStatus
import com.example.shelfcheck.domain.BookshelfSeriesGroup
import com.example.shelfcheck.presentation.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(
    viewModel: MainViewModel
) {
    val uiState by viewModel.uiState.collectAsState()
    var selectedTab by remember { mutableIntStateOf(0) } // 0: 検索, 1: Kindle本棚, 2: 買い出し

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
                        selected = uiState.isShoppingMode,
                        onClick = { viewModel.toggleShoppingMode() },
                        label = {
                            Text(
                                if (uiState.isShoppingMode) "買い物モード ON" else "通常",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = Green950,
                            selectedLabelColor = Green500
                        )
                    )
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Slate800
                )
            )
        },
        bottomBar = {
            NavigationBar(
                containerColor = Slate800
            ) {
                NavigationBarItem(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    icon = { Icon(Icons.Default.Search, contentDescription = "検索") },
                    label = { Text("検索・照合", fontSize = 10.sp) }
                )
                NavigationBarItem(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    icon = { Icon(Icons.Default.Book, contentDescription = "本棚") },
                    label = { Text("本棚 (Kindle)", fontSize = 10.sp) }
                )
                NavigationBarItem(
                    selected = selectedTab == 2,
                    onClick = { selectedTab = 2 },
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
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when (selectedTab) {
                0 -> SearchTabContent(uiState, viewModel)
                1 -> KindleBookshelfTabContent(uiState, viewModel)
                2 -> ShoppingTabContent(uiState, viewModel)
            }
        }
    }
}

// --- Tab 1: 0.05秒インクリメンタルテキスト検索 ＆ 4色判定 ---
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
        OutlinedTextField(
            value = uiState.searchQuery,
            onValueChange = { viewModel.onSearchQueryChange(it) },
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("タイトル・ひらがな・著者名で爆速検索 (例: ゆゆ)") },
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

        // 4色照合アラートカード
        uiState.selectedMatchResult?.let { result ->
            val (bgColor, borderColor, titleText) = when (result.status) {
                BookStatus.OWNED -> Triple(Red900, Red500, "所持済み (重複警報)")
                BookStatus.WANTED -> Triple(Green950, Green500, "買い出し対象 (購入推奨)")
                BookStatus.SOLD -> Triple(Orange950, Orange500, "売却済み (再購入注意)")
                BookStatus.UNREGISTERED -> Triple(Slate800, Blue500, "未所持・未登録")
            }

            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = bgColor),
                shape = RoundedCornerShape(14.dp)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = titleText,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = borderColor,
                        modifier = Modifier
                            .background(borderColor.copy(alpha = 0.2f), RoundedCornerShape(8.dp))
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "${result.seriesTitle} (${result.volume}巻)",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = result.message,
                        fontSize = 13.sp,
                        color = Slate400
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (result.status != BookStatus.OWNED) {
                            Button(
                                onClick = { viewModel.markAsBought() },
                                colors = ButtonDefaults.buttonColors(containerColor = Green500),
                                modifier = Modifier.weight(1f)
                            ) {
                                Icon(Icons.Default.ShoppingBag, contentDescription = null, tint = Color.Black)
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("買った！（所持へ追加）", color = Color.Black, fontWeight = FontWeight.Bold)
                            }
                        }
                        OutlinedButton(
                            onClick = { viewModel.dismissMatchResult() }
                        ) {
                            Text("閉じる", color = Color.White)
                        }
                    }
                }
            }
        }

        // シリーズ ＆ 巻数マトリクス一覧
        LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            items(uiState.seriesList) { series ->
                SeriesMatrixCard(series, uiState, viewModel)
            }
        }
    }
}

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
            Text(series.title, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
            Text("${series.author ?: "著者未設定"} • 全 $totalVol 巻", fontSize = 12.sp, color = Slate400)

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
                        BookStatus.OWNED -> Red500
                        BookStatus.WANTED -> Green500
                        BookStatus.SOLD -> Orange500
                        BookStatus.UNREGISTERED -> Slate700
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
                            color = if (status == BookStatus.WANTED) Color.Black else Color.White,
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
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Text(
            text = "📚 Kindle本棚 (ライブラリ)",
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White
        )
        Text(
            text = "シリーズごとに集約されたビジュアル本棚",
            fontSize = 12.sp,
            color = Slate400
        )

        Spacer(modifier = Modifier.height(16.dp))

        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(uiState.bookshelfGroups) { group ->
                KindleSeriesCard(group, viewModel)
            }
        }
    }
}

@Composable
fun KindleSeriesCard(
    group: BookshelfSeriesGroup,
    viewModel: MainViewModel
) {
    var showSheet by remember { mutableStateOf(false) }

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
                Icon(Icons.Default.Book, contentDescription = null, tint = Slate400, modifier = Modifier.size(48.dp))

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
            title = { Text(group.series.title, color = Color.White) },
            text = {
                Column {
                    Text("所持数: ${group.ownedCount} / 全 ${group.totalCount} 巻", fontSize = 12.sp, color = Slate400)
                    Spacer(modifier = Modifier.height(12.dp))

                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        (1..group.totalCount).forEach { volNum ->
                            val volStr = volNum.toString()
                            val book = group.books.find { it.volume == volStr }
                            val status = book?.status ?: BookStatus.UNREGISTERED

                            val bgColor = when (status) {
                                BookStatus.OWNED -> Red500
                                BookStatus.WANTED -> Green500
                                BookStatus.SOLD -> Orange500
                                BookStatus.UNREGISTERED -> Slate700
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
                                Text(volStr, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }
                        }
                    }
                }
            },
            containerColor = Slate800
        )
    }
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
            Icon(Icons.Default.ShoppingCart, contentDescription = null, tint = Green500)
            Spacer(modifier = Modifier.width(8.dp))
            Text("買い出しリスト (抜け巻)", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Color.White)
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
                            Column {
                                Text("買い出し対象", fontSize = 10.sp, color = Green500, fontWeight = FontWeight.Bold)
                                Text("${item.seriesTitle} (${item.volume}巻)", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
                            }

                            Row {
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
