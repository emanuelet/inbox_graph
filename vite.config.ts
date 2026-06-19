import { defineConfig } from 'vite'
import devServer from '@hono/vite-dev-server'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ isSsrBuild }) => ({
  build: {
    target: 'ES2022',
    sourcemap: true,
    emptyOutDir: !isSsrBuild,
    rollupOptions: {
      output: {
        format: 'esm',
      },
    },
  },
  server: {
    port: 3000,
  },
  clearScreen: false,
  plugins: [
    devServer({
      entry: 'src/index.ts',
      exclude: [
        /.*\.vue($|\?)/,
        /^\/(public|assets|static)\/.+/,
        /.*\.(svg|png)($|\?)/,
      ],
    }),
    vue(),
  ],
}))
