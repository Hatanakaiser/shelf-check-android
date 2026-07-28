package com.example.shelfcheck

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import com.example.shelfcheck.presentation.main.MainScreen
import com.example.shelfcheck.presentation.main.MainViewModel
import com.example.shelfcheck.presentation.theme.ShelfCheckTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    private val viewModel: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            ShelfCheckTheme {
                MainScreen(viewModel = viewModel)
            }
        }
    }
}
