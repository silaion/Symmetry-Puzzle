import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/symmetry-Puzzle/',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist/symmetry-Puzzle',
    emptyOutDir: true,
  },
});
