import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { defineConfig, type Plugin } from 'vite';
import { copyFileSync } from 'fs';

// Copies rnnoise-sync.js (WASM inlined) into public/ so it can be loaded
// by noise-worklet.js in the AudioWorklet isolated scope without Vite transforms.
const copyRNNoise: Plugin = {
  name: 'copy-rnnoise',
  buildStart() {
    copyFileSync(
      'node_modules/@jitsi/rnnoise-wasm/dist/rnnoise-sync.js',
      'public/rnnoise-sync.js',
    );
  },
};

export default defineConfig({
  plugins: [react(), svgr(), copyRNNoise],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
