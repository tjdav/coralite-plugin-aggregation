import { test, expect } from '@playwright/test'

test('has aggregate content', async ({ page }) => {
  await page.goto('/blog/index.html')

  await expect(page.locator('body')).toMatchAriaSnapshot(`
    - text: Hello
    - banner: This is the mighty header
    - heading "Great Barrier Reef" [level=2]
    - text: Nemo
    - time: Wed, 8 Jan 25
    - img "Photo of a cat"
    - text: The Great Barrier Reef—largest, comprising over 2,900 individual reefs and 900 islands stretching for over 2,600 kilometers
    - banner: This is the mighty header
    - heading "Mesoamerican Barrier Reef System" [level=2]
    - text: Nemo
    - time: Thu, 9 Jan 25
    - img "Photo of a dog"
    - text: The Mesoamerican Barrier Reef System—second largest, stretching 1,000 kilometers
    - banner: This is the mighty header
    - text: world
  `)
})

test('has named slots within head', async ({ page }) => {
  await page.goto('/blog/index.html')

  const metaName = page.locator('meta[name="name"]')
  const metaDescription = page.locator('meta[name="description"]')
  const metaDefaultHello = page.locator('meta[name="default-hello"]')
  const metaDefaultWorld = page.locator('meta[name="default-world"]')

  // named slots
  await expect(metaName).toHaveAttribute('content', 'coralite')
  await expect(metaDescription).toHaveAttribute('content', 'look mum, no database!')
  // default slots
  await expect(metaDefaultHello).toHaveAttribute('content', 'hello')
  await expect(metaDefaultWorld).toHaveAttribute('content', 'world')
})
