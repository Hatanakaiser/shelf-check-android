package com.example.shelfcheck.domain

enum class BookStatus {
    OWNED,        // 🟥 所持済み (重複警報)
    WANTED,       // 🟩 買い出し対象 (購入推奨)
    SOLD,         // 🟧 売却済み (再購入注意)
    UNREGISTERED  // ⬜ 未所持
}
