# 開発ガイドライン (Android Native / Development Guidelines)

- **文書バージョン**: v1.0.0
- **作成日**: 2026-07-28
- **対象プロジェクト**: ShelfCheck for Android (`shelf-check-android/`)

---

## 1. 開発原則 (Core Principles)

1. **店舗特化の0.05秒レスポンス (Ultra-Fast Response)**
   - UIスレッド（Main Thread）を絶対にブロックせず、データベースクエリやカメラ画像照合は `Dispatchers.IO` または `Dispatchers.Default` で非同期実行する。

2. **Clean Architecture + MVVM**
   - ViewModelにビジネスロジックを直接埋め込まず、ドメイン層の `UseCase` に切り出す。
   - `StateFlow` を用いてUI状態を一元化し、単方向データフロー (Unidirectional Data Flow) を維持する。

3. **Material Design 3 規約**
   - カラーハードコードを禁止し、`MaterialTheme.colorScheme` トークンを使用する。
