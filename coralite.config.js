import aggregation from './lib/index.js'
import { defineConfig } from 'coralite'

export default defineConfig({
  output: './dist',
  pages: './tests/fixtures/pages',
  templates: './tests/fixtures/templates',
  plugins: [aggregation]
})
