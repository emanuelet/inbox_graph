import { defineConfig } from 'vite'
import devServer from '@hono/vite-dev-server'
import vue from '@vitejs/plugin-vue'

const sharedBuild = {
  target: 'ES2022' as const,
  cssTarget: 'es2020' as const,
  sourcemap: true,
}

export default defineConfig(({ command, isSsrBuild }) => {
  const isDev = command === 'serve'

  if (command === 'build' && !isSsrBuild) {
    return {
      build: {
        ...sharedBuild,
        outDir: 'dist/client',
        emptyOutDir: true,
        rollupOptions: {
          input: 'src/entry-client.ts',
          output: {
            entryFileNames: 'entry-client.js',
            chunkFileNames: 'chunks/[name]-[hash].js',
            assetFileNames: 'assets/[name]-[hash][extname]',
          },
        },
      },
      plugins: [vue()],
    }
  }

  return {
    build: {
      ...sharedBuild,
      emptyOutDir: !isSsrBuild,
      rollupOptions: {
        output: { format: 'esm' },
      },
    },
    server: { port: 3000 },
    clearScreen: false,
    plugins: [
      ...(isDev
        ? [
            devServer({
              entry: 'src/index.ts',
              exclude: [
                /.*\.vue($|\?)/,
                /^\/(public|assets|static)\/.+/,
                /.*\.(svg|png)($|\?)/,
              ],
            }),
          ]
        : []),
      vue(),
    ],
  }
})
