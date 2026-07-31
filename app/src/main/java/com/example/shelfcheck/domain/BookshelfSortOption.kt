package com.example.shelfcheck.domain

enum class BookshelfSortOption(val label: String) {
    CREATED_AT("📅 登録日時順"),
    UPDATED_AT("🔄 最終更新順"),
    WANTED_FIRST("🛒 買いたい本優先"),
    OWNED_COUNT("📚 所持冊数順"),
    COMPLETION_RATE("🏁 コンプリート度順")
}
