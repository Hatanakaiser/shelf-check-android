# 技術仕様書 (Android Native / Technical Specification)

- **文書バージョン**: v1.0.0
- **作成日**: 2026-07-28
- **対象プラットフォーム**: Android (API Level 26+)
- **対象アプリ**: ShelfCheck for Android

---

## 1. 技術スタック & Gradle 依存関係

### 1.1 コアライブラリ構成 (`build.gradle.kts`)

```kotlin
dependencies {
    // AndroidX & Compose
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.4")
    implementation("androidx.activity:activity-compose:1.9.1")
    implementation(platform("androidx.compose:compose-bom:2024.06.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")

    // Navigation & ViewModel
    implementation("androidx.navigation:navigation-compose:2.7.7")
    implementation("androidx.hilt:hilt-navigation-compose:1.2.0")

    // Room Database
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    ksp("androidx.room:room-compiler:2.6.1")

    // Dependency Injection (Hilt)
    implementation("com.google.dagger:hilt-android:2.51.1")
    ksp("com.google.dagger:hilt-android-compiler:2.51.1")

    // CameraX & ML Kit Barcode Scanning
    implementation("androidx.camera:camera-camera2:1.3.4")
    implementation("androidx.camera:camera-lifecycle:1.3.4")
    implementation("androidx.camera:camera-view:1.3.4")
    implementation("com.google.mlkit:barcode-scanning:17.2.0")

    // Coil (Image Loading)
    implementation("io.coil-kt:coil-compose:2.7.0")

    // Retrofit & OkHttp (OpenBD API)
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-gson:2.11.0")
}
```

---

## 2. パーミッション & AndroidManifest.xml

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- パーミッション定義 -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />

    <uses-feature android:name="android.hardware.camera" android:required="false" />

    <application
        android:name=".ShelfCheckApplication"
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:theme="@style/Theme.ShelfCheck">
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

---

## 3. ハプティクス (振動) 制御モジュール仕様

```kotlin
class HapticFeedbackService @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val manager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
        manager.defaultVibrator
    } else {
        @Suppress("DEPRECATION")
        context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
    }

    fun triggerStatusVibration(status: BookStatus) {
        if (!vibrator.hasVibrator()) return
        when (status) {
            BookStatus.OWNED -> {
                // 🟥 重複警告: 2回短いパルス
                val effect = VibrationEffect.createWaveform(longArrayOf(0, 150, 100, 150), -1)
                vibrator.vibrate(effect)
            }
            BookStatus.WANTED -> {
                // 🟩 買い出し成功: 1回確かな振動
                val effect = VibrationEffect.createOneShot(200, VibrationEffect.DEFAULT_AMPLITUDE)
                vibrator.vibrate(effect)
            }
            else -> {}
        }
    }
}
```
