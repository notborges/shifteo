import { test, expect } from '@playwright/test'
import path from 'node:path'

const fixturePath = path.resolve(__dirname, 'fixtures/checker.png')

test.describe('image conversion flow', () => {
  test('converts a PNG to JPEG and exposes status updates', async ({ page }) => {
    await page.goto('/images')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(fixturePath)

    const queueRow = page.locator('.file-item').first()
    await expect(queueRow).toBeVisible()

    await page.getByRole('button', { name: /^JPEG/ }).click()

    const convertButton = page.getByRole('button', { name: 'Shift to JPEG' })
    await convertButton.click()

    await expect(convertButton).toHaveText('Shifting…')
    await expect(convertButton).toHaveText('Shift to JPEG', { timeout: 60000 })

    await expect(queueRow.locator('.file-row__format-badge')).toHaveText('PNG → JPEG', { timeout: 60000 })
    await expect(queueRow.getByTitle('Download')).toBeVisible()
  })
})
