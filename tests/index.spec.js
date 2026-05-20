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
})