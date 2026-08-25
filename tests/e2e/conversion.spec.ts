import { expect, test } from '@playwright/test'

const fixturePath = Bun.fileURLToPath(new URL('./fixtures/checker.png', import.meta.url))

test('converts a PNG to JPEG in the browser', async ({ page }) => {
  await page.goto('/')
  await page.locator('input[type="file"]').setInputFiles(fixturePath)

  await expect(page.locator('.image-info')).toBeVisible()
  await page.getByRole('button', { name: 'jpeg' }).click()
  await page.getByRole('button', { name: 'shift', exact: true }).click()

  await expect(page.locator('.done')).toBeVisible({ timeout: 60000 })
  await expect(page.getByRole('button', { name: 'take' })).toBeVisible()
})
