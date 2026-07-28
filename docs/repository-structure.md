# リポジトリ構造定義書 (Android Native / Gradle Repository)

- **文書バージョン**: v1.0.0
- **作成日**: 2026-07-28
- **対象リポジトリ**: ShelfCheck for Android (`shelf-check-android/`)

---

## 1. ディレクトリ全体ツリー

```text
shelf-check-android/
├── docs/                             # 仕様書・設計ドキュメント群 (8点)
│   ├── system-specification.md       # システム仕様書
│   ├── ui-design-spec.md            # UI/UXデザイン仕様書
│   ├── functional-design-spec.md    # 機能設計書
│   ├── technical-specification.md   # 技術仕様書
│   ├── repository-structure.md      # 本定義書
│   ├── development-guidelines.md    # 開発ガイドライン
│   └── ubiquitous-language.md      # ユビキタス言語定義書
│
├── app/                              # メインモジュール
│   ├── build.gradle.kts              # アプリビルド設定
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/example/shelfcheck/
│   │   │   │   ├── data/             # データ層 (Room DB, Repositories, API)
│   │   │   │   │   ├── local/        # Room Database, Entities, DAOs
│   │   │   │   │   ├── remote/       # OpenBD Retrofit Service
│   │   │   │   │   └── repository/   # Repository Implementations
│   │   │   │   │
│   │   │   │   ├── domain/           # ドメイン層 (UseCases, Models)
│   │   │   │   │   ├── model/        # Domain Data Models
│   │   │   │   │   └── usecase/      # MatchBookUseCase, SearchSeriesUseCase
│   │   │   │   │
│   │   │   │   ├── presentation/     # プレゼンテーション層 (Jetpack Compose)
│   │   │   │   │   ├── main/         # メイン画面 (MainScreen, MainViewModel)
│   │   │   │   │   ├── shopping/     # 買い出しリスト画面
│   │   │   │   │   ├── collection/   # 蔵書一覧画面
│   │   │   │   │   ├── scanner/      # CameraX + ML Kit 照合画面
│   │   │   │   │   ├── components/   # 共通Compose (VolumeMatrix, SearchBar)
│   │   │   │   │   └── theme/        # Material 3 Color, Type, Shape
│   │   │   │   │
│   │   │   │   ├── di/               # Hilt Dependency Injection モジュール
│   │   │   │   ├── util/             # 巻数正規化, 音声, バイブサービス
│   │   │   │   ├── ShelfCheckApplication.kt
│   │   │   │   └── MainActivity.kt
│   │   │   │
│   │   │   ├── res/                  # Android リソース (mipmap, drawable, values)
│   │   │   └── AndroidManifest.xml
│   │   └── test/                     # Unit Tests
│   └── proguard-rules.pro
│
├── build.gradle.kts                  # ルートビルド設定
├── settings.gradle.kts               # モジュール設定
└── gradle.properties
```

---

## 2. 命名規則 (Android / Kotlin Conventions)

| 対象 | 命名規則 | 例 |
| :--- | :--- | :--- |
| **Package 名** | `com.example.shelfcheck` | lowercase のみ |
| **Kotlin ファイル / Class** | `PascalCase` | `MainViewModel.kt`, `BookEntity.kt` |
| **@Composable 関数** | `PascalCase` | `MainScreen()`, `VolumeMatrix()` |
| **Variable / Fun 名** | `camelCase` | `searchBooks()`, `isShoppingMode` |
| **Room Entity テーブル名** | `snake_case` | `tableName = "books"` |
| **Android XML / Asset** | `snake_case` | `ic_launcher.xml`, `bg_card.xml` |
