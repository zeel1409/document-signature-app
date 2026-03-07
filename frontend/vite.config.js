// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'
// import tailwindcss from '@tailwindcss/vite'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react(), tailwindcss()],
//   // Force Vite to use PostCSS instead of lightningcss so we don't need
//   // native lightningcss binaries on Vercel's Linux build machines.
//   css: {
//     transformer: 'postcss',
//   },
// })

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})