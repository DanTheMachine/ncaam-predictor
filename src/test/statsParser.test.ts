import { parseStatsCSV } from '../lib/statsParser'

describe('statsParser', () => {
  test('parses KenPom-style TSV input', () => {
    const raw = [
      'Team\tConf\tAdjEM\tAdjO\tAdjD\tAdjT',
      'Duke\tACC\t32.1\t124.2\t92.1\t71.4',
      'Kansas\tBig 12\t28.5\t121.1\t92.6\t69.9',
    ].join('\n')

    const parsed = parseStatsCSV(raw)

    expect(parsed.source).toBe('KenPom')
    expect(parsed.count).toBe(2)
    expect(parsed.stats.DUKE).toMatchObject({
      adjO: 124.2,
      adjD: 92.1,
      adjEM: 32.1,
      tempo: 71.4,
    })
    expect(parsed.stats.KU).toMatchObject({
      adjO: 121.1,
      adjD: 92.6,
      adjEM: 28.5,
      tempo: 69.9,
    })
  })

  test('parses Barttorvik CSV input and converts decimal percentages', () => {
    const raw = [
      'Team,adjoe,adjde,adjtempo,efg%,tov%,orb%,ftr',
      'Duke,122.8,92.4,71.2,0.558,0.152,0.338,0.364',
      'Kansas,121.4,93.2,70.6,0.552,0.156,0.342,0.378',
    ].join('\n')

    const parsed = parseStatsCSV(raw)

    expect(parsed.source).toBe('Barttorvik')
    expect(parsed.count).toBe(2)
    expect(parsed.stats.DUKE).toMatchObject({
      adjO: 122.8,
      adjD: 92.4,
      tempo: 71.2,
      efgPct: 55.8,
      tovPct: 15.2,
      orbPct: 33.8,
      ftr: 36.4,
    })
  })

  test('throws a helpful error for empty-ish input', () => {
    expect(() => parseStatsCSV('')).toThrow(/Paste appears empty|empty/i)
  })
})
