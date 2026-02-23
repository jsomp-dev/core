/// <reference types="vitest" />
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  // Only apply playground root when running the dev server
  root: process.env.VITEST ? '.' : 'playground',
  server: {
    port: 3000,
    open: true,
  },
  resolve: {
    alias: {
      '@jsomp/core/react': path.resolve(__dirname, './src/renderer/react/index.ts'),
      '@jsomp/core/plugins': path.resolve(__dirname, './src/engine/compiler/plugins/index.ts'),
      '@jsomp/core': path.resolve(__dirname, './src/index.ts'),
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['test/**/*.{test,spec}.{ts,tsx}'],
    alias: {
      '@jsomp/core/react': path.resolve(__dirname, './src/renderer/react/index.ts'),
      '@jsomp/core/plugins': path.resolve(__dirname, './src/engine/compiler/plugins/index.ts'),
      '@jsomp/core': path.resolve(__dirname, './src/index.ts'),
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
    }
  },
});
