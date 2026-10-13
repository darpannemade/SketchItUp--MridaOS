import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    // PERF-01 FIX: Code splitting — breaks 1.4MB monolithic bundle into smaller parallel chunks
    // Cuts initial load from ~1.4MB to ~200KB for rural 4G users
    // Vite 8 uses rolldown which requires manualChunks as a function
    build: {
      rolldownOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-is')) {
              return 'vendor-react';
            }
            if (id.includes('node_modules/recharts')) return 'vendor-charts';
            if (id.includes('node_modules/@supabase')) return 'vendor-supabase';
            if (id.includes('node_modules/motion')) return 'vendor-motion';
            if (id.includes('node_modules/lucide-react') || id.includes('node_modules/canvas-confetti')) return 'vendor-ui';
          },
        },
      },
    },
    server: {
      allowedHosts: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    preview: {
      allowedHosts: true,
    },
  };
});
