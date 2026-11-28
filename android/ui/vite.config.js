import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// يبني واجهة Vue كملف واحد عادي (IIFE) داخل src/ui ليُحمَّل من index.html بدون أي خادم.
export default defineConfig({
  root: 'ui',
  plugins: [vue()],
  define: { 'process.env.NODE_ENV': '"production"' },
  build: {
    outDir: '../src/ui',
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: { entry: 'src/main.js', name: 'AmanUIBundle', formats: ['iife'], fileName: () => 'aman-ui.js', cssFileName: 'aman-ui' }
  }
});
