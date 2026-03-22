import type {
  AggregateStats,
  EvalSummary,
  GradedPredictionRow,
  MarketStats,
  PredictionCsvRow,
  ResultRow,
} from '../types'

export function parseResultsCSVText(raw: string): ResultRow[] {
  const rows = raw
    .trim()
    .split(/\r?\n/)
    .map((row) => row.split(',').map((cell) => cell.replace(/^"|"$/g, '').trim()))

  if (rows.length < 2) {
    throw new Error('Need header + at least 1 result row')
  }

  const header = rows[0].map((value) => value.toLowerCase())
  const index = {
    date: header.indexOf('date'),
    home: header.indexOf('home'),
    away: header.indexOf('away'),
    hs: header.indexOf('home score'),
    as: header.indexOf('away score'),
  }

  if (Object.values(index).some((value) => value < 0)) {
    throw new Error('Results CSV must include: Date, Home, Away, Home Score, Away Score')
  }

  return rows
    .slice(1)
    .map((row) => ({
      date: row[index.date],
      home: row[index.home]?.toUpperCase(),
      away: row[index.away]?.toUpperCase(),
      hScore: parseInt(row[index.hs], 10),
      aScore: parseInt(row[index.as], 10),
    }))
    .filter((row) => row.date && row.home && row.away && !Number.isNaN(row.hScore) && !Number.isNaN(row.aScore))
}

export function parsePredictionsCSVText(raw: string): PredictionCsvRow[] {
  const lines = raw.trim().split(/\r?\n/)
  if (lines.length < 2) {
    throw new Error('Need header + at least 1 prediction row')
  }

  const rows = lines.map((line) => {
    const out: string[] = []
    let current = ''
    let quoted = false

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index]
      if (char === '"') quoted = !quoted
      else if (char === ',' && !quoted) {
        out.push(current)
        current = ''
      } else current += char
    }

    out.push(current)
    return out.map((cell) => cell.replace(/^"|"$/g, '').trim())
  })

  const header = rows[0]
  const index = {
    date: header.indexOf('Date'),
    home: header.indexOf('Home'),
    away: header.indexOf('Away'),
    hProj: header.indexOf('H Proj'),
    aProj: header.indexOf('A Proj'),
    total: header.indexOf('Model Total'),
    vegaOU: header.indexOf('Vegas O/U'),
    overOdds: header.indexOf('Over Odds'),
    underOdds: header.indexOf('Under Odds'),
    ouRec: header.indexOf('O/U Rec'),
    recTotalLine: header.indexOf('Recommended Total Line'),
    mlRec: header.indexOf('ML Rec'),
    mlEdge: header.indexOf('ML Edge'),
    hML: header.indexOf('H ML (model)'),
    aML: header.indexOf('A ML (model)'),
    vegaHML: header.indexOf('Vegas H ML'),
    vegaAML: header.indexOf('Vegas A ML'),
    vegaSpread: header.indexOf('Vegas Spread'),
    spreadHomeOdds: header.indexOf('Spread Home Odds'),
    spreadAwayOdds: header.indexOf('Spread Away Odds'),
    sprRec: header.indexOf('Spread Rec'),
    recSpreadLine: header.indexOf('Recommended Spread Line'),
    hWin: header.indexOf('H Win%'),
    aWin: header.indexOf('A Win%'),
  }

  const get = (row: string[], valueIndex: number) => (valueIndex >= 0 ? row[valueIndex] : '')
  const parseNumber = (value: string) => {
    const parsed = parseFloat(value)
    return Number.isNaN(parsed) ? null : parsed
  }
  const parseInteger = (value: string) => {
    const parsed = parseInt(value, 10)
    return Number.isNaN(parsed) ? null : parsed
  }
  const parseEdge = (value: string) => parseFloat((value || '').replace(/[%+]/g, '')) || 0

  return rows
    .slice(1)
    .map((row) => {
      const homeRaw = get(row, index.home)
      const awayRaw = get(row, index.away)
      return {
        date: get(row, index.date),
        home: homeRaw.split(' ')[0],
        away: awayRaw.split(' ')[0],
        hProj: parseNumber(get(row, index.hProj)),
        aProj: parseNumber(get(row, index.aProj)),
        modelTotal: parseNumber(get(row, index.total)),
        vegaOU: parseNumber(get(row, index.vegaOU)),
        overOdds: parseInteger(get(row, index.overOdds)),
        underOdds: parseInteger(get(row, index.underOdds)),
        ouRec: get(row, index.ouRec),
        recTotalLine: parseNumber(get(row, index.recTotalLine)),
        ouEdge: parseEdge(get(row, header.indexOf('O/U Edge'))),
        ouEdgePct: parseEdge(get(row, header.indexOf('O/U Edge %'))),
        hMLmodel: get(row, index.hML),
        aMLmodel: get(row, index.aML),
        vegaHML: get(row, index.vegaHML),
        vegaAML: get(row, index.vegaAML),
        mlRec: get(row, index.mlRec),
        mlEdge: parseEdge(get(row, index.mlEdge)),
        vegaSpread: parseNumber(get(row, index.vegaSpread)),
        spreadHomeOdds: parseInteger(get(row, index.spreadHomeOdds)),
        spreadAwayOdds: parseInteger(get(row, index.spreadAwayOdds)),
        sprRec: get(row, index.sprRec),
        recSpreadLine: parseNumber(get(row, index.recSpreadLine)),
        spreadEdge: parseEdge(get(row, header.indexOf('Spread Edge'))),
        hWinPct: parseNumber(get(row, index.hWin)),
        aWinPct: parseNumber(get(row, index.aWin)),
      }
    })
    .filter((row) => row.date && row.home && row.away)
}

export function mergeUniqueRows<T extends { date: string; home: string; away: string }>(current: T[], incoming: T[]): T[] {
  const existing = new Set(current.map((row) => `${row.date}_${row.home}_${row.away}`))
  return [
    ...current,
    ...incoming.filter(
      (row) => row.date && row.home && row.away && !existing.has(`${row.date}_${row.home}_${row.away}`),
    ),
  ].sort((a, b) => b.date.localeCompare(a.date))
}

function payoutForAmerican(odds: number | null): number | null {
  if (odds == null || Number.isNaN(odds)) return null
  return odds >= 0 ? odds / 100 : 100 / Math.abs(odds)
}

export function buildGradedRows(predictions: PredictionCsvRow[], results: ResultRow[]): GradedPredictionRow[] {
  return predictions.map((prediction) => {
    const result = results.find(
      (row) => row.home === prediction.home && row.away === prediction.away && row.date === prediction.date,
    )

    if (!result) {
      return { ...prediction, res: null, graded: false, mlWin: null, mlROI: null, sprWin: null, sprROI: null, ouWin: null, ouROI: null }
    }

    const actualTotal = result.hScore + result.aScore
    const actualDiff = result.hScore - result.aScore

    const mlRecRaw = (prediction.mlRec || '').toLowerCase()
    const mlRec =
      mlRecRaw === 'home' || mlRecRaw === 'away'
        ? mlRecRaw
        : (prediction.hWinPct ?? 0) > 50
          ? 'home'
          : 'away'

    const mlWin =
      (mlRec === 'home' && result.hScore > result.aScore) ||
      (mlRec === 'away' && result.aScore > result.hScore)

    const mlOdds = mlRec === 'home'
      ? parseInt(prediction.vegaHML || prediction.hMLmodel || '0', 10)
      : parseInt(prediction.vegaAML || prediction.aMLmodel || '0', 10)

    const mlPayout = payoutForAmerican(Number.isNaN(mlOdds) ? null : mlOdds)
    const mlROI = mlPayout == null ? null : (mlWin ? mlPayout : -1)

    let sprWin: boolean | null = null
    let sprROI: number | null = null
    const sprRec = (prediction.sprRec || '').toLowerCase()
    if (sprRec && sprRec !== 'pass' && sprRec !== '—') {
      const isHomeSpread = sprRec.startsWith('home')
      const parsedSpread = parseFloat((prediction.sprRec || '').match(/[-+]?[\d.]+/)?.[0] ?? '0')
      const spreadNum = prediction.recSpreadLine ?? parsedSpread
      const coverDiff = isHomeSpread ? actualDiff + spreadNum : -actualDiff + spreadNum
      const sprOdds = isHomeSpread ? prediction.spreadHomeOdds : prediction.spreadAwayOdds
      const spreadPayout = payoutForAmerican(sprOdds ?? -110)
      sprWin = coverDiff > 0 ? true : coverDiff < 0 ? false : null
      sprROI = coverDiff === 0 ? 0 : (spreadPayout == null || sprWin == null ? null : (sprWin ? spreadPayout : -1))
    }

    let ouWin: boolean | null = null
    let ouROI: number | null = null
    const ouRec = (prediction.ouRec || '').toLowerCase()
    if (ouRec && ouRec !== 'pass' && ouRec !== '—') {
      const totalLine = prediction.recTotalLine ?? prediction.vegaOU ?? 0
      const ouOdds = ouRec === 'over' ? prediction.overOdds : prediction.underOdds
      const ouPayout = payoutForAmerican(ouOdds ?? -110)
      ouWin =
        ouRec === 'over'
          ? actualTotal > totalLine
            ? true
            : actualTotal < totalLine
              ? false
              : null
          : actualTotal < totalLine
            ? true
            : actualTotal > totalLine
              ? false
              : null
      ouROI = actualTotal === totalLine ? 0 : (ouPayout == null || ouWin == null ? null : (ouWin ? ouPayout : -1))
    }

    return {
      ...prediction,
      res: result,
      graded: true,
      actualTotal,
      actualDiff,
      mlWin,
      mlROI,
      sprWin,
      sprROI,
      ouWin,
      ouROI,
    }
  })
}

export function marketStats<T extends object>(rows: T[], winKey: keyof T, roiKey?: keyof T): MarketStats {
  const wins = rows.filter((row) => row[winKey] === true).length
  const losses = rows.filter((row) => row[winKey] === false).length
  const pushes = rows.filter((row) => row[winKey] === null).length
  const units = rows.reduce((sum, row) => {
    const value = row[roiKey ?? (`${String(winKey)}ROI` as keyof T)]
    return sum + (Number(value ?? 0) || 0)
  }, 0)
  const bets = rows.length
  const hitRate = bets ? (wins / bets) * 100 : 0

  return {
    bets,
    wins,
    losses,
    pushes,
    units,
    roiPct: bets ? (units / bets) * 100 : 0,
    hitRate,
    winPct: hitRate,
  }
}

export function qualifiesActual(
  row: GradedPredictionRow,
  market: 'ml' | 'spr' | 'ou',
  thresholds: { ml: number | string; spr: number | string; ou: number | string },
  calibration: { ml: number | string; spr: number | string; ou: number | string },
): boolean {
  const threshold = Number(thresholds[market] || 0)
  const calibrationScale = Number(calibration[market] || 100) / 100

  if (market === 'ml') {
    return row.mlROI !== null && Math.abs(Number(row.mlEdge || 0)) * calibrationScale >= threshold
  }
  if (market === 'spr') {
    return row.sprROI !== null && Math.abs(Number(row.spreadEdge || 0)) * calibrationScale >= threshold
  }
  return row.ouROI !== null && Math.abs(Number(row.ouEdgePct || 0)) * calibrationScale >= threshold
}

export function buildEvalSummary(
  gradedRows: GradedPredictionRow[],
  thresholds: { ml: number | string; spr: number | string; ou: number | string },
  calibration: { ml: number | string; spr: number | string; ou: number | string },
): EvalSummary {
  const summarize = (market: 'ml' | 'spr' | 'ou', win: 'mlWin' | 'sprWin' | 'ouWin', roi: 'mlROI' | 'sprROI' | 'ouROI') => {
    const graded = gradedRows.filter((row) => row.graded)
    const betRows = graded.filter((row) => row[roi] !== null)
    const actualRows = betRows.filter((row) => qualifiesActual(row, market, thresholds, calibration))
    return {
      all: marketStats(betRows, win, roi),
      actual: marketStats(actualRows, win, roi),
    }
  }

  return {
    ml: summarize('ml', 'mlWin', 'mlROI'),
    spr: summarize('spr', 'sprWin', 'sprROI'),
    ou: summarize('ou', 'ouWin', 'ouROI'),
  }
}

export function buildAggregateStats(gradedRows: GradedPredictionRow[]): AggregateStats {
  const graded = gradedRows.filter((row) => row.graded)
  const mlRows = graded.filter((row) => row.mlROI !== null)
  const sprRows = graded.filter((row) => row.sprROI !== null)
  const ouRows = graded.filter((row) => row.ouROI !== null)
  const overallRows = [
    ...mlRows.map((row) => ({ roi: true, roiROI: row.mlROI })),
    ...sprRows.map((row) => ({ roi: true, roiROI: row.sprROI })),
    ...ouRows.map((row) => ({ roi: true, roiROI: row.ouROI })),
  ]

  return {
    ml: marketStats(mlRows, 'mlWin', 'mlROI'),
    spr: marketStats(sprRows, 'sprWin', 'sprROI'),
    ou: marketStats(ouRows, 'ouWin', 'ouROI'),
    overall: marketStats(overallRows, 'roi', 'roiROI'),
  }
}
