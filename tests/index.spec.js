import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import fs from 'node:fs/promises'
import { Coralite } from 'coralite'
import { aggregation } from '../lib/index.js'

test('aggregation plugin integration', async (t) => {
  const fixturesDir = path.join(import.meta.dirname, 'fixtures')
  const pagesDir = path.join(fixturesDir, 'pages')
  const templatesDir = path.join(fixturesDir, 'templates')

  // Setup
  await fs.mkdir(pagesDir, { recursive: true })
  await fs.mkdir(templatesDir, { recursive: true })
  await fs.mkdir(path.join(pagesDir, 'blog'), { recursive: true })

  // 1. Create Templates
  await fs.writeFile(path.join(templatesDir, 'coralite-post.html'), `
<template id="coralite-post">
  <article><h2>{{ title }}</h2></article>
</template>

<script type="module">
  import { defineComponent } from 'coralite/plugins'

  export default defineComponent({
    properties: (context) => {
      return {
        // Read directly from the page metadata or flat properties
        title: context.page?.meta?.title || context.properties.title || 'Untitled'
      }
    }
  })
</script>
`)

  await fs.writeFile(path.join(templatesDir, 'blog-list.html'), `
<template id="blog-list">
  <div class="list">{{ content }}</div>
</template>

<script type="module">
  import { defineComponent, aggregation } from 'coralite/plugins'

  export default defineComponent({
    properties: async (context) => {
      // Execute the plugin method with the V1 flattened context

      const content = await aggregation({
        path: ['blog'],
        template: 'coralite-post',
        limit: 2,
        recursive: false,
        pagination: {
          segment: 'p',
          maxVisible: 3,
          ariaLabel: 'Blog Pagination',
          ellipsis: '---'
        }
      }, context)

      // Bridge the computed HTML nodes to the dumb template
      return {
        content
      }
    }
  })
</script>
`)

  // 2. Create Blog Posts
  for (let i = 1; i <= 5; i++) {
    await fs.writeFile(path.join(pagesDir, 'blog', `post-${i}.html`), `
<!DOCTYPE html><html><head><title>Post ${i}</title><meta name="title" content="Post ${i}"></head><body><p>Content</p></body></html>
`)
  }

  // 3. Create Scenarios

  // Scenario A: /index.html -> /p/2.html
  await fs.writeFile(path.join(pagesDir, 'index.html'), `<!DOCTYPE html><html><body><blog-list></blog-list></body></html>`)

  // Scenario B: /named.html -> /named/p/2.html
  await fs.writeFile(path.join(pagesDir, 'named.html'), `<!DOCTYPE html><html><body><blog-list></blog-list></body></html>`)

  // Scenario C: /subdir/index.html -> /subdir/p/2.html
  await fs.mkdir(path.join(pagesDir, 'subdir'), { recursive: true })
  await fs.writeFile(path.join(pagesDir, 'subdir', 'index.html'), `<!DOCTYPE html><html><body><blog-list></blog-list></body></html>`)

  const coralite = new Coralite({
    output: 'dist',
    components: templatesDir,
    pages: pagesDir,
    plugins: [aggregation]
  })

  await coralite.initialise()
  const results = await coralite.build()

  // Verify Scenario A (/index.html)
  const indexPage = results.find(r => r.path.filename === 'index.html' && r.path.dirname === pagesDir)
  assert.ok(indexPage, 'A: index.html built')
  assert.match(indexPage.content, /Post 1/, 'A: Page 1 content')
  assert.match(indexPage.content, /href="\/p\/2\.html"/, 'A: Link to page 2')
  assert.match(indexPage.content, /aria-label="Blog Pagination"/, 'A: Aria label')

  const indexP2 = results.find(r => r.path.pathname.endsWith(`${path.sep}p${path.sep}2.html`) && !r.path.pathname.includes('named') && !r.path.pathname.includes('subdir'))
  assert.ok(indexP2, 'A: Page 2 built')
  assert.match(indexP2.content, /Post 3/, 'A: Page 2 content')
  assert.match(indexP2.content, /href="\/index\.html"/, 'A: Page 2 link to Page 1')
  assert.match(indexP2.content, /href="\/p\/3\.html"/, 'A: Page 2 link to Page 3')

  // Verify Scenario B (/named.html)
  const namedPage = results.find(r => r.path.filename === 'named.html')
  assert.ok(namedPage, 'B: named.html built')
  assert.match(namedPage.content, /href="\/named\/p\/2\.html"/, 'B: Link to page 2')

  const namedP2 = results.find(r => r.path.pathname.endsWith(`${path.sep}named${path.sep}p${path.sep}2.html`))
  assert.ok(namedP2, 'B: Page 2 built')
  assert.match(namedP2.content, /href="\/named\.html"/, 'B: Page 2 link to Page 1')

  // Verify Scenario C (/subdir/index.html)
  const subdirPage = results.find(r => r.path.filename === 'index.html' && r.path.dirname.endsWith('subdir'))
  assert.ok(subdirPage, 'C: subdir/index.html built')
  assert.match(subdirPage.content, /href="\/subdir\/p\/2\.html"/, 'C: Link to page 2')

  const subdirP2 = results.find(r => r.path.pathname.includes(`${path.sep}subdir${path.sep}p${path.sep}2.html`))
  assert.ok(subdirP2, 'C: Page 2 built')
  assert.match(subdirP2.content, /href="\/subdir\/index\.html"/, 'C: Page 2 link to Page 1')

  // Cleanup
  await fs.rm(fixturesDir, {
    recursive: true,
    force: true
  })
})