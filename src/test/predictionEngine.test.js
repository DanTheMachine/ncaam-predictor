import { analyzeBetting, americanToImplied, mlAmerican, normCDF, predictGame } from '../lib/predictionEngine'

describe('predictionEngine', () => {
  test('predictGame gives the home team a stronger outlook than the same matchup at a neutral site', () => {
    const homeCourt = predictGame({
      homeTeam: 'DUKE',
      awayTeam: 'KU',
      gameType: 'Regular Season',
      neutralSite: false,
      homeB2B: false,
      awayB2B: false,
      liveStats: {},
      odds: null,
    })

    const neutralCourt = predictGame({
      homeTeam: 'DUKE',
      awayTeam: 'KU',
      gameType: 'Regular Season',
      neutralSite: true,
      homeB2B: false,
      awayB2B: false,
      liveStats: {},
      odds: null,
    })

    expect(homeCourt.hWinProb).toBeGreaterThan(neutralCourt.hWinProb)
    expect(parseFloat(homeCourt.hScore)).toBeGreaterThan(parseFloat(neutralCourt.hScore))
    expect(homeCourt.features.find((feature) => feature.label === 'Home Court')?.detail).toContain('+3.5')
  })

  test('predictGame reflects live stats overrides', () => {
    const baseline = predictGame({
      homeTeam: 'DUKE',
      awayTeam: 'KU',
      gameType: 'Regular Season',
      neutralSite: false,
      homeB2B: false,
      awayB2B: false,
      liveStats: {},
      odds: null,
    })

    const withLiveStats = predictGame({
      homeTeam: 'DUKE',
      awayTeam: 'KU',
      gameType: 'Regular Season',
      neutralSite: false,
      homeB2B: false,
      awayB2B: false,
      liveStats: {
        DUKE: {
          adjO: 135,
          adjD: 88,
          adjEM: 47,
          tempo: 73,
          efgPct: 58,
          tovPct: 13,
          orbPct: 36,
          ftr: 39,
        },
      },
      odds: null,
    })

    expect(withLiveStats.hWinProb).toBeGreaterThan(baseline.hWinProb)
    expect(parseFloat(withLiveStats.hScore)).toBeGreaterThan(parseFloat(baseline.hScore))
  })

  test('analyzeBetting returns recommendations and positive edges when the model meaningfully differs from the market', () => {
    const result = {
      hWinProb: 0.68,
      aWinProb: 0.32,
      hScore: '80.0',
      aScore: '70.0',
      total: '150.0',
      marginStdDev: 10,
      totalStdDev: 11,
    }

    const odds = {
      homeMoneyline: -120,
      awayMoneyline: +105,
      spread: -4.5,
      spreadHomeOdds: -110,
      spreadAwayOdds: -110,
      overUnder: 144.5,
      overOdds: -110,
      underOdds: -110,
    }

    const analysis = analyzeBetting(result, odds)

    expect(analysis.mlValueSide).toBe('home')
    expect(analysis.spreadRec).toBe('home')
    expect(analysis.ouRec).toBe('over')
    expect(analysis.mlValuePct).toBeGreaterThan(0)
    expect(analysis.spreadEdge).toBeGreaterThan(0)
    expect(analysis.ouEdgePct).toBeGreaterThan(0)
  })

  test('moneyline helpers stay internally consistent', () => {
    expect(americanToImplied(-150)).toBeCloseTo(0.6, 3)
    expect(americanToImplied(+150)).toBeCloseTo(0.4, 3)
    expect(mlAmerican(0.6)).toBe('-150')
    expect(mlAmerican(0.4)).toBe('+150')
    expect(normCDF(0)).toBeCloseTo(0.5, 6)
  })
})
