import aggregation from './lib/index.js'
import { defineConfig } from 'coralite'

export default defineConfig({
  output: './dist',
  pages: './tests/fixtures/pages',
  components: './tests/fixtures/templates',
  plugins: [aggregation]
})
