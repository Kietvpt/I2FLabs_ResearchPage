import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replace(/\\/g, '/');
          if (normalized.includes('/node_modules/')) {
            // Split CodeMirror, Lezer, and UIW to keep editor chunks under 500 kB
            if (normalized.includes('/@lezer/')) {
              return 'vendor-lezer';
            }
            if (normalized.includes('/@codemirror/')) {
              return 'vendor-codemirror';
            }
            if (normalized.includes('/@uiw/')) {
              return 'vendor-editor';
            }
            // Supabase client
            if (normalized.includes('/@supabase/')) {
              return 'vendor-supabase';
            }
            // Core React runtime, routing & cache state
            if (
              normalized.includes('/react/') ||
              normalized.includes('/react-dom/') ||
              normalized.includes('/react-router-dom/') ||
              normalized.includes('/@tanstack/react-query/')
            ) {
              return 'vendor-react';
            }
            // Markdown and KaTeX math pipeline
            if (
              normalized.includes('/react-markdown/') ||
              normalized.includes('/remark-') ||
              normalized.includes('/rehype-') ||
              normalized.includes('/katex/')
            ) {
              return 'vendor-markdown';
            }
          }
        },
      },
    },
  },
});
