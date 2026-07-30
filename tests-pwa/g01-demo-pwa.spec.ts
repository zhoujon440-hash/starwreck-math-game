import { expect, test } from '@playwright/test'

const DEMO_URL = 'http://127.0.0.1:4174/starwreck-math-game/'

test('production demo installs its worker and survives an offline refresh', async ({
  context,
  page,
  request,
}) => {
  const consoleErrors: string[] = []
  const failedResources: string[] = []

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text())
    }
  })
  page.on('pageerror', (error) => consoleErrors.push(error.message))
  page.on('response', (response) => {
    if (response.status() >= 400) {
      failedResources.push(`${response.status()} ${response.url()}`)
    }
  })

  const manifestResponse = await request.get(`${DEMO_URL}manifest.webmanifest`)
  expect(manifestResponse.ok()).toBe(true)
  const manifest = await manifestResponse.json()
  expect(manifest.start_url).toBe('/starwreck-math-game/')
  expect(manifest.scope).toBe('/starwreck-math-game/')
  expect(manifest.icons).toHaveLength(3)
  for (const icon of manifest.icons) {
    expect(icon.src).toMatch(/^\/starwreck-math-game\/assets\//)
  }

  await page.goto(DEMO_URL, { waitUntil: 'networkidle' })
  await expect(page.locator('#app')).toContainText('星骸拾荒者')
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    'href',
    /\/starwreck-math-game\/manifest\.webmanifest$/,
  )

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.reload({ waitUntil: 'networkidle' })
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true)
  await expect
    .poll(
      () => page.evaluate(async () => (await caches.keys()).length),
      { timeout: 15_000 },
    )
    .toBeGreaterThan(0)

  const cacheState = await page.evaluate(async () => {
    const keys = await caches.keys()
    const requests = (await Promise.all(
      keys.map(async (key) => {
        const cache = await caches.open(key)
        return cache.keys()
      }),
    )).flat()
    return {
      keys,
      urls: requests.map((entry) => entry.url),
    }
  })
  expect(cacheState.urls.some((url) => url.startsWith(DEMO_URL))).toBe(true)
  expect(
    cacheState.urls.some((url) =>
      url.includes('/starwreck-math-game/assets/g01/pr-c/'),
    ),
  ).toBe(true)

  const renderedAssets = await page
    .locator('img')
    .evaluateAll((images) =>
      images.map((image) => ({
        complete: image.complete,
        height: image.naturalHeight,
        src: image.src,
        width: image.naturalWidth,
      })),
    )
  for (const asset of renderedAssets) {
    expect(asset.src).toContain('/starwreck-math-game/assets/')
    expect(asset.complete).toBe(true)
    expect(asset.width).toBeGreaterThan(0)
    expect(asset.height).toBeGreaterThan(0)
  }

  await context.setOffline(true)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('#app')).toContainText('星骸拾荒者')
  await expect(page.locator('body')).not.toContainText('404')
  await context.setOffline(false)

  expect(failedResources).toEqual([])
  expect(consoleErrors).toEqual([])
})
