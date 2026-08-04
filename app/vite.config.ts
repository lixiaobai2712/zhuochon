import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'

// 说明：
// - vite-plugin-electron/simple 会把 node 内置模块自动外部化，并输出 CJS（package.json 无 type:module）
// - 不配置 renderer: {}，渲染进程由本 vite 配置正常构建即可
export default defineConfig({
  base: './',
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main.ts',
      },
      preload: {
        input: path.join(__dirname, 'electron/preload.ts'),
      },
    }),
  ],
  build: { outDir: 'dist' },
})
