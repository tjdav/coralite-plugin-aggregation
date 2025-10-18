import { test, expect } from '@playwright/test'

test('it displays aggregated content excluding it\'s self', async ({ page }) => {
  await page.goto('/blog/index.html')

  await expect(page.getByText('Paginated blog posts Great')).toMatchAriaSnapshot(`- heading "Paginated blog posts" [level=2]
- link "Great Barrier Reef":
  - /url: ""
  - heading "Great Barrier Reef" [level=3]
- text: Nemo
- time: Wed, 8 Jan 25
- text: The Great Barrier Reef—largest, comprising over 2,900 individual reefs and 900 islands stretching for over 2,600 kilometers
- list:
  - listitem: Previous
  - listitem:
    - link "1":
      - /url: /blog/index.html
  - listitem:
    - link "2":
      - /url: /blog/page/2.html
  - listitem:
    - link "3":
      - /url: /blog/page/3.html
  - listitem: ...
  - listitem:
    - link "5":
      - /url: /blog/page/5.html
  - listitem:
    - link "Next":
      - /url: /blog/page/2.html`)
})
