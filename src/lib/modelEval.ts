import type {
  AggregateStats,
  DetailedEvalSummary,
  DirectionalCalibrationSummary,
  EdgeThresholdSummary,
  EvalSummary,
  GradedPredictionRow,
  MarketStats,
  ProbabilityCalibrationBucket,
  PredictionCsvRow,
  ResultRow,
} from '../types'

function parseCsvRows(raw: string): string[][] {
  return raw
    .replace(/^\uFEFF/, '')
    .trim()
    .split(/\r?\n/)
    .map((line) => {
      if (line.includes('\t') && (!line.includes(',') || line.split('\t').length > line.split(',').length)) {
        return line.split('\t').map((cell) => cell.trim())
      }

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
}

function normalizeTeamIdentifier(value: string): string {
  const trimmed = (value || '').trim().toUpperCase()
  if (!trimmed) return ''

  const firstToken = trimmed.split(/\s+/)[0]
  if (/^[A-Z0-9]{2,10}$/.test(firstToken)) return firstToken

  return trimmed.replace(/\s+/g, ' ')
}

function findHeaderIndex(header: string[], ...candidates: string[]): number {
  for (const candidate of candidates) {
    const index = header.indexOf(candidate)
    if (index >= 0) return index
  }
  return -1
}

export function parseResultsCSVText(raw: string): ResultRow[] {
  const rows = parseCsvRows(raw)

  if (rows.length < 2) {
    throw new Error('Need header + at least 1 result row')
  }

  const header = rows[0].map((value) => value.toLowerCase())
  const index = {
    date: findHeaderIndex(header, 'date'),
    home: findHeaderIndex(header, 'home'),
    away: findHeaderIndex(header, 'away'),
    hs: findHeaderIndex(header, 'home score', 'homescore', 'h score', 'hscore'),
    as: findHeaderIndex(header, 'away score', 'awayscore', 'a score', 'ascore'),
    lookupKey: findHeaderIndex(header, 'lookupkey', 'lookup key'),
  }

  const hasHeader = index.date >= 0 && index.home >= 0 && index.away >= 0 && index.hs >= 0 && index.as >= 0

  const rowIndexes = hasHeader
    ? index
    : {
        date: 0,
        home: 1,
        away: 2,
        hs: 3,
        as: 4,
        lookupKey: 7,
      }

  const dataRows = hasHeader ? rows.slice(1) : rows

  if (!dataRows.length) {
    throw new Error('Results CSV must include at least 1 data row')
  }

  return dataRows
    .map((row) => ({
      date: row[rowIndexes.date],
      home: normalizeTeamIdentifier(row[rowIndexes.home]),
      away: normalizeTeamIdentifier(row[rowIndexes.away]),
      hScore: parseInt(row[rowIndexes.hs], 10),
      aScore: parseInt(row[rowIndexes.as], 10),
      lookupKey: rowIndexes.lookupKey >= 0 ? row[rowIndexes.lookupKey] : '',
    }))
    .filter((row) => row.date && row.home && row.away && !Number.isNaN(row.hScore) && !Number.isNaN(row.aScore))
}

export function parsePredictionsCSVText(raw: string): PredictionCsvRow[] {
  const rows = parseCsvRows(raw)
  if (rows.length < 2) {
    throw new Error('Need header + at least 1 prediction row')
  }

  const headerRowIndex = rows.findIndex((row) => {
    const lowered = row.map((value) => value.toLowerCase())
    return (
      lowered.includes('date') &&
      lowered.includes('home') &&
      lowered.includes('away') &&
      (lowered.includes('lookupkey') || lowered.includes('h win%') || lowered.includes('model total'))
    )
  })

  if (headerRowIndex < 0) {
    throw new Error('Predictions CSV header row not found')
  }

  const header = rows[headerRowIndex]
  const loweredHeader = header.map((value) => value.toLowerCase())
  const index = {
    date: findHeaderIndex(loweredHeader, 'date'),
    home: findHeaderIndex(loweredHeader, 'home'),
    away: findHeaderIndex(loweredHeader, 'away'),
    hProj: findHeaderIndex(loweredHeader, 'h proj'),
    aProj: findHeaderIndex(loweredHeader, 'a proj'),
    total: findHeaderIndex(loweredHeader, 'model total'),
    vegaOU: findHeaderIndex(loweredHeader, 'vegas o/u'),
    overOdds: findHeaderIndex(loweredHeader, 'over odds'),
    underOdds: findHeaderIndex(loweredHeader, 'under odds'),
    ouRec: findHeaderIndex(loweredHeader, 'o/u rec'),
    recTotalLine: findHeaderIndex(loweredHeader, 'recommended total line', 'rec total line'),
    mlRec: findHeaderIndex(loweredHeader, 'ml rec'),
    mlEdge: findHeaderIndex(loweredHeader, 'ml edge'),
    hML: findHeaderIndex(loweredHeader, 'h ml (model)'),
    aML: findHeaderIndex(loweredHeader, 'a ml (model)'),
    vegaHML: findHeaderIndex(loweredHeader, 'vegas h ml'),
    vegaAML: findHeaderIndex(loweredHeader, 'vegas a ml'),
    vegaSpread: findHeaderIndex(loweredHeader, 'vegas spread'),
    spreadHomeOdds: findHeaderIndex(loweredHeader, 'spread home odds'),
    spreadAwayOdds: findHeaderIndex(loweredHeader, 'spread away odds'),
    sprRec: findHeaderIndex(loweredHeader, 'spread rec'),
    recSpreadLine: findHeaderIndex(loweredHeader, 'recommended spread line', 'rec spread line'),
    hWin: findHeaderIndex(loweredHeader, 'h win%'),
    aWin: findHeaderIndex(loweredHeader, 'a win%'),
    lookupKey: findHeaderIndex(loweredHeader, 'lookupkey', 'lookup key'),
    ouEdge: findHeaderIndex(loweredHeader, 'o/u edge'),
    ouEdgePct: findHeaderIndex(loweredHeader, 'o/u edge %'),
    spreadEdge: findHeaderIndex(loweredHeader, 'spread edge'),
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
    .slice(headerRowIndex + 1)
    .map((row) => {
      const homeRaw = get(row, index.home)
      const awayRaw = get(row, index.away)
      return {
        date: get(row, index.date),
        home: normalizeTeamIdentifier(homeRaw),
        away: normalizeTeamIdentifier(awayRaw),
        lookupKey: get(row, index.lookupKey),
        hProj: parseNumber(get(row, index.hProj)),
        aProj: parseNumber(get(row, index.aProj)),
        modelTotal: parseNumber(get(row, index.total)),
        vegaOU: parseNumber(get(row, index.vegaOU)),
        overOdds: parseInteger(get(row, index.overOdds)),
        underOdds: parseInteger(get(row, index.underOdds)),
        ouRec: get(row, index.ouRec),
        recTotalLine: parseNumber(get(row, index.recTotalLine)),
        ouEdge: parseEdge(get(row, index.ouEdge)),
        ouEdgePct: parseEdge(get(row, index.ouEdgePct)),
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
        spreadEdge: parseEdge(get(row, index.spreadEdge)),
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

function hasExplicitMoneylineBet(row: Pick<PredictionCsvRow, 'mlRec'>): boolean {
  const rec = (row.mlRec || '').trim().toLowerCase()
  return rec === 'home' || rec === 'away'
}

function hasExplicitSpreadBet(row: Pick<PredictionCsvRow, 'sprRec'>): boolean {
  const rec = (row.sprRec || '').trim().toLowerCase()
  return Boolean(rec) && rec !== 'pass' && rec !== '—' && rec !== 'â€”'
}

function hasExplicitTotalBet(row: Pick<PredictionCsvRow, 'ouRec'>): boolean {
  const rec = (row.ouRec || '').trim().toLowerCase()
  return Boolean(rec) && rec !== 'pass' && rec !== '—' && rec !== 'â€”'
}

export function buildGradedRows(predictions: PredictionCsvRow[], results: ResultRow[]): GradedPredictionRow[] {
  return predictions.map((prediction) => {
    const result = results.find(
      (row) =>
        row.date === prediction.date &&
        (
          (prediction.lookupKey && row.lookupKey && row.lookupKey === prediction.lookupKey) ||
          (row.home === prediction.home && row.away === prediction.away)
        ),
    )

    if (!result) {
      return { ...prediction, res: null, graded: false, mlWin: null, mlROI: null, sprWin: null, sprROI: null, ouWin: null, ouROI: null }
    }

    const actualTotal = result.hScore + result.aScore
    const actualDiff = result.hScore - result.aScore

    const mlRec = hasExplicitMoneylineBet(prediction) ? prediction.mlRec.trim().toLowerCase() : null

    const mlWin =
      mlRec === 'home'
        ? result.hScore > result.aScore
        : mlRec === 'away'
          ? result.aScore > result.hScore
          : null

    const mlOdds =
      mlRec === 'home'
        ? parseInt(prediction.vegaHML || prediction.hMLmodel || '0', 10)
        : mlRec === 'away'
          ? parseInt(prediction.vegaAML || prediction.aMLmodel || '0', 10)
          : Number.NaN

    const mlPayout = payoutForAmerican(Number.isNaN(mlOdds) ? null : mlOdds)
    const mlROI = mlRec == null || mlPayout == null || mlWin == null ? null : (mlWin ? mlPayout : -1)

    let sprWin: boolean | null = null
    let sprROI: number | null = null
    const sprRec = hasExplicitSpreadBet(prediction) ? prediction.sprRec.trim().toLowerCase() : ''
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
    const ouRec = hasExplicitTotalBet(prediction) ? prediction.ouRec.trim().toLowerCase() : ''
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
    const betRows = graded.filter((row) => {
      if (market === 'ml') return hasExplicitMoneylineBet(row) && row[roi] !== null
      if (market === 'spr') return hasExplicitSpreadBet(row) && row[roi] !== null
      return hasExplicitTotalBet(row) && row[roi] !== null
    })
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
  const mlRows = graded.filter((row) => hasExplicitMoneylineBet(row) && row.mlROI !== null)
  const sprRows = graded.filter((row) => hasExplicitSpreadBet(row) && row.sprROI !== null)
  const ouRows = graded.filter((row) => hasExplicitTotalBet(row) && row.ouROI !== null)
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

function summarizeDirectionalRows(
  label: string,
  rows: GradedPredictionRow[],
  roiKey: 'ouROI',
  winKey: 'ouWin',
  tracked = true,
): DirectionalCalibrationSummary {
  const bets = tracked ? rows.filter((row) => row[roiKey] !== null) : []
  const wins = bets.filter((row) => row[winKey] === true).length
  const losses = bets.filter((row) => row[winKey] === false).length
  const pushes = bets.filter((row) => row[winKey] === null).length
  const units = bets.reduce((sum, row) => sum + (row[roiKey] ?? 0), 0)
  const avgEdge = rows.length
    ? rows.reduce((sum, row) => sum + Math.abs(Number(row.ouEdgePct || 0)), 0) / rows.length
    : 0

  return {
    label,
    games: rows.length,
    avgEdge,
    wins,
    losses,
    pushes,
    hitRate: bets.length ? (wins / (wins + losses)) * 100 : 0,
    units,
    roiPct: bets.length ? (units / bets.length) * 100 : 0,
    tracked,
  }
}

export function buildDetailedEvalSummary(
  predictions: PredictionCsvRow[],
  results: ResultRow[],
  gradedRows: GradedPredictionRow[],
): DetailedEvalSummary {
  const matchedGames = gradedRows.filter((row) => row.graded)
  const matchedLookupKeys = new Set(
    matchedGames
      .map((row) => row.lookupKey || row.res?.lookupKey || `${row.date}_${row.home}_${row.away}`)
      .filter(Boolean),
  )
  const totalBets =
    matchedGames.filter((row) => hasExplicitMoneylineBet(row) && row.mlROI !== null).length +
    matchedGames.filter((row) => hasExplicitSpreadBet(row) && row.sprROI !== null).length +
    matchedGames.filter((row) => hasExplicitTotalBet(row) && row.ouROI !== null).length

  const edgeThresholds: EdgeThresholdSummary[] = [2, 4, 6, 8].map((threshold) => {
    const rows = matchedGames.filter((row) => {
      const ml = hasExplicitMoneylineBet(row) && row.mlROI !== null ? Math.abs(Number(row.mlEdge || 0)) : 0
      const spr = hasExplicitSpreadBet(row) && row.sprROI !== null ? Math.abs(Number(row.spreadEdge || 0)) : 0
      const ou = hasExplicitTotalBet(row) && row.ouROI !== null ? Math.abs(Number(row.ouEdgePct || 0)) : 0
      return Math.max(ml, spr, ou) >= threshold
    })

    const bets = [
      ...rows.filter((row) => hasExplicitMoneylineBet(row) && row.mlROI !== null).map((row) => ({ win: row.mlWin, roi: row.mlROI ?? 0 })),
      ...rows.filter((row) => hasExplicitSpreadBet(row) && row.sprROI !== null).map((row) => ({ win: row.sprWin, roi: row.sprROI ?? 0 })),
      ...rows.filter((row) => hasExplicitTotalBet(row) && row.ouROI !== null).map((row) => ({ win: row.ouWin, roi: row.ouROI ?? 0 })),
    ]

    const wins = bets.filter((row) => row.win === true).length
    const losses = bets.filter((row) => row.win === false).length
    const pushes = bets.filter((row) => row.win === null).length
    const units = bets.reduce((sum, row) => sum + row.roi, 0)

    return {
      label: `Edge ${threshold}%+`,
      bets: bets.length,
      wins,
      losses,
      pushes,
      hitRate: wins + losses ? (wins / (wins + losses)) * 100 : 0,
      roiPct: bets.length ? (units / bets.length) * 100 : 0,
    }
  })

  const mlCalibrationRanges = [
    { label: '50-55%', min: 50, max: 55 },
    { label: '55-60%', min: 55, max: 60 },
    { label: '60-65%', min: 60, max: 65 },
    { label: '65-70%', min: 65, max: 70 },
    { label: '70%+', min: 70, max: Infinity },
  ]

  const mlCalibration: ProbabilityCalibrationBucket[] = mlCalibrationRanges.map(({ label, min, max }) => {
    const rows = matchedGames.filter((row) => {
      const prob = Math.max(Number(row.hWinPct || 0), Number(row.aWinPct || 0))
      return prob >= min && prob < max
    })

    const correct = rows.filter((row) => row.mlWin === true).length
    const avgPredicted = rows.length
      ? rows.reduce((sum, row) => sum + Math.max(Number(row.hWinPct || 0), Number(row.aWinPct || 0)), 0) / rows.length
      : 0

    return {
      label,
      games: rows.length,
      accuracy: rows.length ? (correct / rows.length) * 100 : 0,
      avgPredicted,
    }
  })

  const overRows = matchedGames.filter((row) => hasExplicitTotalBet(row) && row.ouRec?.toLowerCase() === 'over' && row.ouROI !== null)
  const underRows = matchedGames.filter((row) => hasExplicitTotalBet(row) && row.ouRec?.toLowerCase() === 'under' && row.ouROI !== null)
  const passRows = matchedGames.filter((row) => !hasExplicitTotalBet(row) || row.ouROI === null)
  const ouCalibration: DirectionalCalibrationSummary[] = [
    summarizeDirectionalRows('OVER', overRows, 'ouROI', 'ouWin'),
    summarizeDirectionalRows('UNDER', underRows, 'ouROI', 'ouWin'),
    summarizeDirectionalRows('PASS', passRows, 'ouROI', 'ouWin', false),
  ]

  const ouEdgeBucketsConfig = [
    { label: '0-5%', min: 0, max: 5 },
    { label: '5-10%', min: 5, max: 10 },
    { label: '10%+', min: 10, max: Infinity },
  ]
  const ouEdgeBets = matchedGames.filter((row) => hasExplicitTotalBet(row) && row.ouROI !== null)
  const ouEdgeBuckets = ouEdgeBucketsConfig.map(({ label, min, max }) => {
    const rows = ouEdgeBets.filter((row) => {
      const edge = Math.abs(Number(row.ouEdgePct || 0))
      return edge >= min && edge < max
    })
    return summarizeDirectionalRows(label, rows, 'ouROI', 'ouWin')
  })

  return {
    counts: {
      matchedGames: matchedGames.length,
      totalBets,
      unmatchedPredictions: predictions.filter((row) => !matchedGames.some((graded) => graded.date === row.date && graded.home === row.home && graded.away === row.away)).length,
      unmatchedResults: results.filter((row) => {
        const key = row.lookupKey || `${row.date}_${row.home}_${row.away}`
        return !matchedLookupKeys.has(key)
      }).length,
    },
    edgeThresholds,
    mlCalibration,
    ouCalibration,
    ouEdgeBuckets,
  }
}
