import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Tree-shake lucide-react by resolving icons/* to individual ESM files
      'lucide-react/icons': fileURLToPath(
        new URL('./node_modules/lucide-react/dist/esm/icons', import.meta.url),
      ),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
    rollupOptions: {
      output: {
        manualChunks: {
          // react and core dependencies
          vendor: ['react', 'react-dom', 'react/jsx-runtime'],

          // tauri plugins chunk
          tauri: [
            '@tauri-apps/api',
            '@tauri-apps/plugin-sql',
            '@tauri-apps/plugin-updater',
            '@tauri-apps/plugin-process',
            '@tauri-apps/plugin-notification',
            '@tauri-apps/plugin-log',
            '@tauri-apps/plugin-opener',
            '@tauri-apps/plugin-os',
          ],

          // state management and queries
          state: ['zustand', '@tanstack/react-query'],

          // dnd for sorting, drag'n'drop and ordering
          dnd: ['@dnd-kit/core', '@dnd-kit/sortable'],

          // date utilities
          date: ['date-fns'],
        },
      },
    },
  },
});
