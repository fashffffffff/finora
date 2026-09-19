import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  clearScreen: false,
  // относительные пути + всё в одном index.html — папку можно открыть
  // двойным кликом (file://), и Tauri работает как раньше
  base: './',
  plugins: [viteSingleFile()],
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  build: {
    target: 'es2022',
    minify: 'esbuild',
    sourcemap: false,
    assetsInlineLimit: 100_000_000,
  },
});
