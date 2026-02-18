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
  // Use {{ meta_title }} because metadata plugin extracts <meta name="title"> to meta_title
  await fs.writeFile(path.join(templatesDir, 'coralite-post.html'), `
<template id="coralite-post">
  <article><h2>{{ meta_title }}</h2></article>
</template>
`)

  await fs.writeFile(path.join(templatesDir, 'blog-list.html'), `
<template id="blog-list">
  <div class="list">{{ content }}</div>
</template>
<script type="module">
  import { defineComponent } from 'coralite'
  import { aggregation } from 'coralite/plugins'
  export default defineComponent({
    tokens: {
      content: async () => {
        return await aggregation({
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
        })
      }
    }
  })
</script>
`)

  // 2. Create Blog Posts
  // Add <meta name="title">
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
    templates: templatesDir,
    pages: pagesDir,
    plugins: [aggregation]
  })

  await coralite.initialise()
  const results = await coralite.build()

  // Verify Scenario A (/index.html)
  const indexPage = results.find(r => r.path.filename === 'index.html' && r.path.dirname === pagesDir)
  assert.ok(indexPage, 'A: index.html built')
  assert.match(indexPage.html, /Post 1/, 'A: Page 1 content')
  // Check pagination link structure in index.html. Should point to /p/2.html (or base url relative)
  assert.match(indexPage.html, /href="\/p\/2.html"/, 'A: Link to page 2')
  assert.match(indexPage.html, /aria-label="Blog Pagination"/, 'A: Aria label')

  const indexP2 = results.find(r => r.path.pathname.endsWith(`${path.sep}p${path.sep}2.html`) && !r.path.pathname.includes('named') && !r.path.pathname.includes('subdir'))
  assert.ok(indexP2, 'A: Page 2 built')
  assert.match(indexP2.html, /Post 3/, 'A: Page 2 content')
  // Check Page 2 pagination links. Should point to /p/3.html and /index.html (Page 1)
  assert.match(indexP2.html, /href="\/index.html"/, 'A: Page 2 link to Page 1') // baseUrl is /index.html
  assert.match(indexP2.html, /href="\/p\/3.html"/, 'A: Page 2 link to Page 3')

  // Verify Scenario B (/named.html)
  const namedPage = results.find(r => r.path.filename === 'named.html')
  assert.ok(namedPage, 'B: named.html built')
  // Pagination link should be /named/p/2.html
  assert.match(namedPage.html, /href="\/named\/p\/2.html"/, 'B: Link to page 2')

  const namedP2 = results.find(r => r.path.pathname.endsWith(`${path.sep}named${path.sep}p${path.sep}2.html`))
  assert.ok(namedP2, 'B: Page 2 built')
  // Page 2 link to Page 1 (/named.html)
  assert.match(namedP2.html, /href="\/named.html"/, 'B: Page 2 link to Page 1')

  // Verify Scenario C (/subdir/index.html)
  const subdirPage = results.find(r => r.path.filename === 'index.html' && r.path.dirname.endsWith('subdir'))
  assert.ok(subdirPage, 'C: subdir/index.html built')
  // Link to /subdir/p/2.html
  assert.match(subdirPage.html, /href="\/subdir\/p\/2.html"/, 'C: Link to page 2')

  const subdirP2 = results.find(r => r.path.pathname.includes(`${path.sep}subdir${path.sep}p${path.sep}2.html`))
  assert.ok(subdirP2, 'C: Page 2 built')
  assert.match(subdirP2.html, /href="\/subdir\/index.html"/, 'C: Page 2 link to Page 1')

  // Cleanup
  await fs.rm(fixturesDir, {
    recursive: true,
    force: true
  })
})
