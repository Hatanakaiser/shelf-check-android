import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'covers/*.jpg'],
      manifest: {
        name: 'ShelfCheck for Android - 古本重複購入防止',
        short_name: 'ShelfCheck',
        description: '0.05秒テキスト照合 ＆ Kindleライブラリ風シリーズ本棚',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    host: true,
    port: 3000
  }
});
