// import tailwindcss from '@tailwindcss/vite';
// import react from '@vitejs/plugin-react';
// import path from 'path';
// import {defineConfig} from 'vite';

// export default defineConfig(() => {
//   return {
//     plugins: [react(), tailwindcss()],
//     resolve: {
//       alias: {
//         '@': path.resolve(__dirname, '.'),
//       },
//     },
//     server: {

//       allowedHosts: ['sketchitup-mridaos.onrender.com'],
//       // HMR is disabled in AI Studio via DISABLE_HMR env var.
//       // Do not modify—file watching is disabled to prevent flickering during agent edits.
//       hmr: process.env.DISABLE_HMR !== 'true',
//       // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
//       watch: process.env.DISABLE_HMR === 'true' ? null : {},
//     },
//   };
// });


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
    server: {
<<<<<<< HEAD
      allowedHosts: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
=======
      allowedHosts: ['sketchitup-mridaos.onrender.com'],
>>>>>>> 32e05785150a64c0a5c61f5850c0429d35d4b02c
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    preview: {
      allowedHosts: true,
    },
  };
});
```
