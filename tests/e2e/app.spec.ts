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

test('imports predictions and results in results tracker and model eval', async ({ page }) => {
  const predictionsCsv = [
    'Date,Home,Away,H Proj,A Proj,Model Total,Vegas O/U,Over Odds,Under Odds,O/U Rec,Recommended Total Line,O/U Edge,O/U Edge %,Vegas H ML,Vegas A ML,H ML (model),A ML (model),ML Rec,ML Edge,Vegas Spread,Spread Home Odds,Spread Away Odds,Spread Rec,Recommended Spread Line,Spread Edge,H Win%,A Win%',
    '"2026-03-12","DUKE Blue Devils","KU Jayhawks",78.0,71.0,149.0,145.5,-110,-110,OVER,145.5,3.5,5.2,-150,+130,-160,+140,HOME,4.1,-4.5,-110,-110,HOME,-4.5,3.4,61.0,39.0',
  ].join('\n')

  const resultsCsv = [
    'Date,Home,Away,Home Score,Away Score',
    '2026-03-12,DUKE,KU,80,70',
  ].join('\n')

  await page.goto('/')

  await page.getByRole('button', { name: /RESULTS TRACKER/i }).click()
  await page.getByRole('button', { name: /Paste Predictions CSV/i }).click()
  await page.locator('textarea').nth(0).fill(predictionsCsv)
  await page.getByRole('button', { name: /^Import$/i }).click()
  await expect(page.getByText(/Imported 1 predictions/i)).toBeVisible()

  await page.getByRole('button', { name: /Paste Results CSV/i }).click()
  await page.locator('textarea').nth(0).fill(resultsCsv)
  await page.getByRole('button', { name: /^Import$/i }).click()
  await expect(page.getByText(/Imported 1 results/i)).toBeVisible()
  await expect(page.getByText(/Game Log \| 1 predictions \| 1 graded/i)).toBeVisible()
  await expect(page.getByText(/80-70/)).toBeVisible()

  await page.getByRole('button', { name: /MODEL EVAL/i }).click()
  await expect(page.getByText(/THRESHOLDS & CALIBRATION/i)).toBeVisible()
  await expect(page.getByText(/EVALUATED BETS \| 1 matched games/i)).toBeVisible()
  await expect(page.getByText(/HOME ML|No actionable bets/i)).toBeVisible()
})
