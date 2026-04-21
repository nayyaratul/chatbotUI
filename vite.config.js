import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const nexusRoot = path.resolve(__dirname, '../nexus-design-system/src')

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@nexus/atoms': path.resolve(nexusRoot, 'atoms/index.js'),
      '@nexus/molecules': path.resolve(nexusRoot, 'molecules/index.js'),
      '@nexus/tokens': path.resolve(nexusRoot, 'styles/tokens.scss'),
      '@nexus/base': path.resolve(nexusRoot, 'styles/base.css'),
    },
  },
})
