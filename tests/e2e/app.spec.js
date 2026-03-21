import { expect, test } from '@playwright/test'

test('navigates core tabs and loads a slate', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByText('BRACKET')).toBeVisible()
  await expect(page.getByRole('button', { name: /PREDICTOR/i })).toBeVisible()

  await page.getByRole('button', { name: /MODEL EVAL/i }).click()
  await expect(page.getByText('THRESHOLDS & CALIBRATION')).toBeVisible()

  await page.getByRole('button', { name: /PREDICTOR/i }).click()
  await page.getByRole('button', { name: /ENTER GAMES|EDIT SLATE/i }).click()
  await page.getByPlaceholder('KU @ DUKE, 6:00 PM ET\nUNC @ KY, 8:00 PM ET\nGONZ @ PURDUE, 9:30 PM ET').fill('KU @ DUKE, 7:00 PM ET')
  await page.getByRole('button', { name: /LOAD SLATE/i }).click()

  await expect(page.getByRole('button', { name: /RUN ALL SIMS/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /EDIT/i }).first()).toBeVisible()
  await page.getByRole('button', { name: /RUN ALL SIMS/i }).click()
  await expect(page.getByText(/All simulations complete/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /PREDICTIONS CSV/i })).toBeVisible()
})

