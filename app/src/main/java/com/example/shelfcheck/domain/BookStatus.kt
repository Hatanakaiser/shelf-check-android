package com.example.shelfcheck.domain

enum class BookStatus {
    OWNED,        // 🟩 所持済み (緑)
    WANTED,       // 🟨 買いたい本 (黄)
    SOLD,         // 過去互換用
    UNREGISTERED  // ⬜ 未所持
}
