package com.example.shelfcheck.presentation.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val DarkColorScheme = darkColorScheme(
    primary = Blue500,
    secondary = Green500,
    background = Slate900,
    surface = Slate800,
    onPrimary = Slate50,
    onBackground = Slate50,
    onSurface = Slate50
)

@Composable
fun ShelfCheckTheme(
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        content = content
    )
}
