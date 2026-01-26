import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.includes('-')
        }
      },
      customElement: true
    })
  ],
  base: './',
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    // (optionnel) certaines libs lisent aussi directement process.env
    'process.env': JSON.stringify({ NODE_ENV: 'production' }),
  },
  build: {
    lib: {
      entry: './src/main.ts',
      name: 'RoomBuilder',
      formats: ['es', 'cjs', 'umd', 'iife'],
      fileName: () => 'room-builder.webcomponent.js'
    },
    emptyOutDir: true,
    outDir: './dist',
  }
})
