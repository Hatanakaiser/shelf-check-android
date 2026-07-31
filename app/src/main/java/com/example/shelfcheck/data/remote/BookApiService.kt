package com.example.shelfcheck.data.remote

import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import org.json.JSONTokener
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import javax.inject.Inject
import javax.inject.Singleton

data class ExternalBookResult(
    val isbn: String? = null,
    val title: String,
    val author: String? = null,
    val publisher: String? = null,
    val coverUrl: String? = null,
    val description: String? = null,
    val volumeCount: Int? = null
)

@Singleton
class BookApiService @Inject constructor() {

    private val userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

    // 国内人気マンガ・書籍のマスターカタログ (オフライン/バックアップ保証)
    private val mangaCatalog = listOf(
        ExternalBookResult(isbn = "9784098501809", title = "葬送のフリーレン", author = "山田鐘人 / アベツカサ", publisher = "小学館", coverUrl = "https://books.google.com/books/content?id=y1A3EAAAQBAJ&printsec=frontcover&img=1&zoom=1", volumeCount = 13),
        ExternalBookResult(isbn = "9784088817804", title = "チェンソーマン", author = "藤本タツキ", publisher = "集英社", coverUrl = "https://books.google.com/books/content?id=jJt7DwAAQBAJ&printsec=frontcover&img=1&zoom=1", volumeCount = 17),
        ExternalBookResult(isbn = "9784088824017", title = "【推しの子】", author = "赤坂アカ / 横槍メンゴ", publisher = "集英社", coverUrl = "https://books.google.com/books/content?id=vBwAEAAAQBAJ&printsec=frontcover&img=1&zoom=1", volumeCount = 15),
        ExternalBookResult(isbn = "9784091244079", title = "ダンジョン飯", author = "九井諒子", publisher = "KADOKAWA", coverUrl = "https://books.google.com/books/content?id=vFpSDwAAQBAJ&printsec=frontcover&img=1&zoom=1", volumeCount = 14),
        ExternalBookResult(isbn = "9784088825250", title = "怪獣8号", author = "松本直也", publisher = "集英社", coverUrl = "https://books.google.com/books/content?id=zBsBEAAAQBAJ&printsec=frontcover&img=1&zoom=1", volumeCount = 12),
        ExternalBookResult(isbn = "9784088821689", title = "鬼滅の刃", author = "吾峠呼世晴", publisher = "集英社", volumeCount = 23),
        ExternalBookResult(isbn = "9784088725093", title = "ONE PIECE", author = "尾田栄一郎", publisher = "集英社", volumeCount = 108),
        ExternalBookResult(isbn = "9784088814445", title = "呪術廻戦", author = "芥見下々", publisher = "集英社", volumeCount = 26),
        ExternalBookResult(isbn = "9784088819112", title = "SPY×FAMILY", author = "遠藤達哉", publisher = "集英社", volumeCount = 13),
        ExternalBookResult(isbn = "9784832277946", title = "ゆゆ式", author = "三上小又", publisher = "芳文社", volumeCount = 15),
        ExternalBookResult(isbn = "9784041026083", title = "新世紀エヴァンゲリオン", author = "貞本義行", publisher = "KADOKAWA", volumeCount = 14),
        ExternalBookResult(isbn = "9784063842333", title = "進撃の巨人", author = "諫山創", publisher = "講談社", volumeCount = 34),
        ExternalBookResult(isbn = "9784088802640", title = "僕のヒーローアカデミア", author = "堀越耕平", publisher = "集英社", volumeCount = 40),
        ExternalBookResult(isbn = "9784041068663", title = "文豪ストレイドッグス", author = "朝霧カフカ", publisher = "KADOKAWA", volumeCount = 24),
        ExternalBookResult(isbn = "9784063842334", title = "ブルーロック", author = "金城宗幸 / ノ村優介", publisher = "講談社", volumeCount = 29),
        ExternalBookResult(isbn = "9784088815572", title = "ハイキュー!!", author = "古舘春一", publisher = "集英社", volumeCount = 45),
        ExternalBookResult(isbn = "9784088734941", title = "BLEACH", author = "久保帯人", publisher = "集英社", volumeCount = 74),
        ExternalBookResult(isbn = "9784088725086", title = "HUNTER×HUNTER", author = "冨樫義博", publisher = "集英社", volumeCount = 37)
    )

    suspend fun searchExternalBooks(query: String, mangaOnly: Boolean = true): List<ExternalBookResult> = withContext(Dispatchers.IO) {
        if (query.isBlank()) return@withContext emptyList()

        val rawQuery = query.trim()
        val cleanQuery = rawQuery.lowercase()
        val rawResults = mutableListOf<ExternalBookResult>()

        // 1. 楽天ブックス書籍検索API (booksGenreId=001001 で漫画のみに限定)
        val rakutenResults = fetchFromRakutenBooks(rawQuery, mangaOnly)
        rawResults.addAll(rakutenResults)

        // 2. ローカルマスターカタログの照合
        val catalogMatches = mangaCatalog.filter {
            it.title.lowercase().contains(cleanQuery) ||
            (it.author != null && it.author.lowercase().contains(cleanQuery)) ||
            (it.isbn != null && it.isbn.contains(cleanQuery))
        }

        catalogMatches.forEach { item ->
            if (rawResults.none { it.title.lowercase() == item.title.lowercase() }) {
                rawResults.add(item)
            }
        }

        // シリーズごとに集約・グループ化 (楽天APIでジャンル指定済みの場合は過剰フィルターを適用しない)
        val aggregated = aggregateBySeries(rawResults)
        Log.d("BookApiService", "Aggregated search results for '$rawQuery': ${aggregated.size} series")
        aggregated
    }

    private fun aggregateBySeries(results: List<ExternalBookResult>): List<ExternalBookResult> {
        if (results.isEmpty()) return emptyList()

        val seriesMap = mutableMapOf<String, MutableList<ExternalBookResult>>()

        for (item in results) {
            // 楽天ブックス特有の付加文字 [ 著者 ] や (レーベル名) や 巻数を安全に除去
            val cleanTitle = item.title
                .replace(Regex("\\[[^\\]]*\\]"), "")
                .replace(Regex("\\([^\\)]*コミックス?\\)"), "")
                .replace(Regex("（[^）]*コミックス?）"), "")
                .replace(Regex("\\s*[\\(\\（\\【]?(?:第?\\s*\\d+\\s*[巻話]?|vol\\.?\\s*\\d+)[\\)\\）\\】]?.*$", RegexOption.IGNORE_CASE), "")
                .trim()
                .ifEmpty { item.title.trim() }

            val key = cleanTitle.lowercase()
            if (!seriesMap.containsKey(key)) {
                seriesMap[key] = mutableListOf()
            }
            seriesMap[key]!!.add(item)
        }

        return seriesMap.map { (_, group) ->
            val firstItem = group.first()
            val cleanSeriesTitle = firstItem.title
                .replace(Regex("\\[[^\\]]*\\]"), "")
                .replace(Regex("\\([^\\)]*コミックス?\\)"), "")
                .replace(Regex("（[^）]*コミックス?）"), "")
                .replace(Regex("\\s*[\\(\\（\\【]?(?:第?\\s*\\d+\\s*[巻話]?|vol\\.?\\s*\\d+)[\\)\\）\\】]?.*$", RegexOption.IGNORE_CASE), "")
                .trim()
                .ifEmpty { firstItem.title.trim() }

            var maxVol = 0
            for (it in group) {
                val match = Regex("(?:第?\\s*(\\d+)\\s*[巻話]?|vol\\.?\\s*(\\d+)|(\\d+))", RegexOption.IGNORE_CASE).find(it.title)
                if (match != null) {
                    val vol1 = match.groupValues.getOrNull(1)?.toIntOrNull()
                    val vol2 = match.groupValues.getOrNull(2)?.toIntOrNull()
                    val vol3 = match.groupValues.getOrNull(3)?.toIntOrNull()
                    val volNum = vol1 ?: vol2 ?: vol3
                    if (volNum != null && volNum > maxVol) {
                        maxVol = volNum
                    }
                }
                if (it.volumeCount != null && it.volumeCount > maxVol) {
                    maxVol = it.volumeCount
                }
            }

            val vol1Item = group.find {
                val t = it.title.lowercase()
                t.endsWith(" 1") || t.endsWith(" (1)") || t.endsWith("（1）") || t.contains(" 1巻") || t.contains("第1巻") || t.contains("vol.1")
            }

            val cover = vol1Item?.coverUrl ?: group.firstOrNull { !it.coverUrl.isNullOrBlank() }?.coverUrl
            val author = group.firstOrNull { !it.author.isNullOrBlank() }?.author
            val publisher = group.firstOrNull { !it.publisher.isNullOrBlank() }?.publisher

            ExternalBookResult(
                isbn = firstItem.isbn,
                title = cleanSeriesTitle,
                author = author,
                publisher = publisher,
                coverUrl = cover,
                description = firstItem.description,
                volumeCount = if (maxVol > 0) maxVol else 10
            )
        }
    }

    private fun fetchFromRakutenBooks(query: String, mangaOnly: Boolean): List<ExternalBookResult> {
        val list = mutableListOf<ExternalBookResult>()
        try {
            val encodedQuery = URLEncoder.encode(query, "UTF-8")
            val urlStr = "https://my-portfolio-sepia-beta-23.vercel.app/api/rakuten?query=$encodedQuery&mangaOnly=$mangaOnly"
            Log.d("RakutenApi", "Request URL: $urlStr")

            val url = URL(urlStr)
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "GET"
            conn.connectTimeout = 6000
            conn.readTimeout = 6000
            conn.setRequestProperty("Accept", "application/json")

            val code = conn.responseCode
            if (code == HttpURLConnection.HTTP_OK) {
                val responseText = conn.inputStream.bufferedReader(Charsets.UTF_8).use { it.readText() }
                Log.d("RakutenApi", "API Response Success: $responseText")

                val itemsArray: JSONArray? = try {
                    val tokener = JSONTokener(responseText)
                    val nextToken = tokener.nextValue()
                    when (nextToken) {
                        is JSONArray -> nextToken
                        is JSONObject -> {
                            when {
                                nextToken.has("Items") -> nextToken.getJSONArray("Items")
                                nextToken.has("items") -> nextToken.getJSONArray("items")
                                nextToken.has("data") -> nextToken.getJSONArray("data")
                                else -> null
                            }
                        }
                        else -> null
                    }
                } catch (e: Exception) {
                    Log.e("RakutenApi", "JSON Parse Error: ${e.message}")
                    null
                }

                if (itemsArray != null) {
                    for (i in 0 until itemsArray.length()) {
                        val rawItem = itemsArray.getJSONObject(i)
                        val item = if (rawItem.has("Item")) rawItem.getJSONObject("Item") else rawItem

                        val title = item.optString("title", item.optString("titleKana", "")).trim()
                        if (title.isBlank()) continue

                        val author = item.optString("author", item.optString("authorKana", "")).trim().ifEmpty { null }
                        val publisher = item.optString("publisherName", item.optString("publisher", "")).trim().ifEmpty { null }
                        val coverUrl = item.optString("largeImageUrl", item.optString("mediumImageUrl", item.optString("coverUrl", ""))).trim().ifEmpty { null }
                        val isbn = item.optString("isbn", "").trim().ifEmpty { null }
                        val description = item.optString("itemCaption", item.optString("description", "")).trim().ifEmpty { null }

                        if (list.none { (isbn != null && it.isbn == isbn) || it.title.lowercase() == title.lowercase() }) {
                            list.add(
                                ExternalBookResult(
                                    isbn = isbn,
                                    title = title,
                                    author = author,
                                    publisher = publisher,
                                    coverUrl = coverUrl,
                                    description = description,
                                    volumeCount = 10
                                )
                            )
                        }
                    }
                }
            } else {
                val errorResponse = conn.errorStream?.bufferedReader()?.use { it.readText() } ?: ""
                Log.e("RakutenApi", "API Response Failed ($code): $errorResponse")
            }
        } catch (e: Exception) {
            Log.e("BookApiService", "Error fetching Rakuten Books for query '$query': ${e.message}", e)
        }
        return list
    }
}
