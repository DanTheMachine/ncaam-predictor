import { fireEvent, render, screen } from '@testing-library/react'
import NCAAPredictor from '../NCAAPredictor'
import { samplePredictionsCsv } from './fixtures'

const findButton = (label: string) =>
  screen.getAllByRole('button', { name: (_, element) => element?.textContent?.includes(label) ?? false })[0]

describe('NCAAPredictor', () => {
  test('renders the active app shell and navigation tabs', () => {
    render(<NCAAPredictor />)

    expect(screen.getByText('BRACKET')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /PREDICTOR/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /RESULTS TRACKER/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /MODEL EVAL/i })).toBeInTheDocument()
  })

  test('loads a game slate from the bulk entry panel', async () => {
    render(<NCAAPredictor />)

    fireEvent.click(findButton('ENTER GAMES'))
    fireEvent.change(
      screen.getByPlaceholderText(/KU @ DUKE, 6:00 PM ET/i),
      { target: { value: 'KU @ DUKE, 7:00 PM ET' } },
    )
    fireEvent.click(findButton('LOAD SLATE'))

    expect(await screen.findByRole('button', { name: (_, element) => element?.textContent?.includes('RUN ALL SIMS') ?? false })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /EDIT/i }).length).toBeGreaterThan(0)
  })

  test('imports predictions into model eval', async () => {
    render(<NCAAPredictor />)

    fireEvent.click(screen.getByRole('button', { name: /MODEL EVAL/i }))

    const predictionsBox = screen.getByPlaceholderText(/Paste the full predictions CSV content here/i)
    expect(screen.getByPlaceholderText(/Date,Home,Away,Home Score,Away Score/i)).toBeInTheDocument()

    fireEvent.change(predictionsBox, { target: { value: samplePredictionsCsv } })
    fireEvent.click(screen.getByRole('button', { name: /IMPORT PREDICTIONS/i }))

    expect(await screen.findByText(/Imported 1 predictions/i)).toBeInTheDocument()
  })
})
