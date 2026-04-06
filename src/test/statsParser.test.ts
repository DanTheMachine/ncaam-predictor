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

  test('parses Barttorvik multi-line block input with an Rk header', () => {
    const raw = [
      'Rk\tTeam\tConf\tG\tRec\tAdjOE\tAdjDE\tBarthag\tEFG%\tEFGD%\tTOR\tTORD\tORB\tDRB\tFTR\tFTRD\t2P%\t2P%D\t3P%\t3P%D\t3PR\t3PRD\tAdj T.\tWAB',
      '1\tMichigan',
      '   1 seed, ✅\tB10\t38\t35-3',
      '129.3',
      '4\t92.1',
      '3\t.9802',
      '1\t58.8',
      '6\t44.9',
      '1\t16.3',
      '155\t15.0',
      '285\t34.9',
      '48\t27.3',
      '44\t38.1',
      '100\t25.9',
      '13\t61.3',
      '2\t44.3',
      '3\t36.9',
      '30\t30.4',
      '15\t41.9',
      '135\t42.7',
      '286\t71.0',
      '21\t+14.0',
      '1',
      '2\tArizona',
      '   1 seed, ✅\tB12\t38\t36-2',
      '128.1',
      '7\t91.6',
      '1\t.9792',
      '2\t55.1',
      '35\t45.0',
      '2\t15.0',
      '62\t16.3',
      '198\t38.4',
      '4\t26.8',
      '28\t44.3',
      '7\t27.2',
      '25\t55.2',
      '52\t44.1',
      '2\t36.7',
      '36\t31.0',
      '34\t26.4',
      '363\t37.5',
      '112\t69.9',
      '51\t+13.7',
      '2',
    ].join('\n')

    const parsed = parseStatsCSV(raw)

    expect(parsed.source).toBe('Barttorvik')
    expect(parsed.count).toBe(2)
    expect(parsed.stats.MICH).toMatchObject({
      adjO: 129.3,
      adjD: 92.1,
      adjEM: 37.2,
      tempo: 71.0,
      efgPct: 58.8,
      tovPct: 16.3,
      orbPct: 34.9,
      ftr: 38.1,
    })
    expect(parsed.stats.AZ).toMatchObject({
      adjO: 128.1,
      adjD: 91.6,
      adjEM: 36.5,
      tempo: 69.9,
      efgPct: 55.1,
      tovPct: 15.0,
      orbPct: 38.4,
      ftr: 44.3,
    })
  })

  test('normalizes Barttorvik short-form team names', () => {
    const raw = [
      'Rk\tTeam\tConf\tG\tRec\tAdjOE\tAdjDE\tBarthag\tEFG%\tEFGD%\tTOR\tTORD\tORB\tDRB\tFTR\tFTRD\t2P%\t2P%D\t3P%\t3P%D\t3PR\t3PRD\tAdj T.\tWAB',
      '1\tIowa St.',
      '   2 seed, ❌\tB12\t37\t29-8',
      '123.8',
      '23\t93.1',
      '5\t.9634',
      '7\t56.2',
      '19\t49.8',
      '90\t14.9',
      '58\t22.6',
      '4\t35.2',
      '43\t28.6',
      '85\t34.5',
      '194\t28.1',
      '33\t55.4',
      '50\t51.1',
      '146\t38.3',
      '11\t32.0',
      '61\t38.8',
      '193\t42.6',
      '281\t67.3',
      '186\t+7.5',
      '13',
      '2\tN.C. State',
      '   11 seed, ❌\tACC\t34\t20-14',
      '122.9',
      '28\t104.7',
      '86\t.8639',
      '43\t55.0',
      '37\t52.7',
      '250\t13.1',
      '8\t18.2',
      '87\t28.2',
      '256\t30.5',
      '180\t35.1',
      '172\t36.9',
      '233\t52.6',
      '144\t52.2',
      '203\t38.8',
      '6\t35.5',
      '276\t43.4',
      '104\t44.9',
      '332\t69.1',
      '89\t+0.16',
      '45',
    ].join('\n')

    const parsed = parseStatsCSV(raw)

    expect(parsed.count).toBe(2)
    expect(parsed.stats.IOWA).toMatchObject({
      adjO: 123.8,
      adjD: 93.1,
      tempo: 67.3,
    })
    expect(parsed.stats.NCST).toMatchObject({
      adjO: 122.9,
      adjD: 104.7,
      tempo: 69.1,
    })
  })

  test('parses Barttorvik compact blocks where conf and record are on the first line', () => {
    const raw = [
      'Rk\tTeam\tConf\tG\tRec\tAdjOE\tAdjDE\tBarthag\tEFG%\tEFGD%\tTOR\tTORD\tORB\tDRB\tFTR\tFTRD\t2P%\t2P%D\t3P%\t3P%D\t3PR\t3PRD\tAdj T.\tWAB',
      '30\tCincinnati\tB12\t33\t18-15',
      '112.5',
      '112\t94.2',
      '10\t.8860',
      '30\t50.5',
      '212\t47.3',
      '25\t17.0',
      '201\t18.2',
      '87\t30.6',
      '175\t27.3',
      '44\t29.4',
      '322\t30.0',
      '58\t50.2',
      '248\t47.9',
      '41\t33.9',
      '176\t31.0',
      '34\t43.8',
      '92\t39.9',
      '198\t67.7',
      '166\t-2.0',
      '70',
    ].join('\n')

    const parsed = parseStatsCSV(raw)

    expect(parsed.count).toBe(1)
    expect(parsed.stats.CIN).toMatchObject({
      adjO: 112.5,
      adjD: 94.2,
      adjEM: 18.3,
      tempo: 67.7,
      efgPct: 50.5,
      tovPct: 17.0,
      orbPct: 30.6,
      ftr: 29.4,
    })
  })

  test('reports unmatched team names for Barttorvik blocks', () => {
    const raw = [
      'Rk\tTeam\tConf\tG\tRec\tAdjOE\tAdjDE\tBarthag\tEFG%\tEFGD%\tTOR\tTORD\tORB\tDRB\tFTR\tFTRD\t2P%\t2P%D\t3P%\t3P%D\t3PR\t3PRD\tAdj T.\tWAB',
      '1\tMade Up Tech',
      '   1 seed, ✅\tB12\t37\t29-8',
      '123.8',
      '23\t93.1',
      '5\t.9634',
      '7\t56.2',
      '19\t49.8',
      '90\t14.9',
      '58\t22.6',
      '4\t35.2',
      '43\t28.6',
      '85\t34.5',
      '194\t28.1',
      '33\t55.4',
      '50\t51.1',
      '146\t38.3',
      '11\t32.0',
      '61\t38.8',
      '193\t42.6',
      '281\t67.3',
      '186\t+7.5',
      '13',
      '2\tArizona',
      '   1 seed, ✅\tB12\t38\t36-2',
      '128.1',
      '7\t91.6',
      '1\t.9792',
      '2\t55.1',
      '35\t45.0',
      '2\t15.0',
      '62\t16.3',
      '198\t38.4',
      '4\t26.8',
      '28\t44.3',
      '7\t27.2',
      '25\t55.2',
      '52\t44.1',
      '2\t36.7',
      '36\t31.0',
      '34\t26.4',
      '363\t37.5',
      '112\t69.9',
      '51\t+13.7',
      '2',
    ].join('\n')

    const parsed = parseStatsCSV(raw)

    expect(parsed.count).toBe(1)
    expect(parsed.unmatchedTeams).toEqual([
      { name: 'made up tech', count: 1 },
    ])
  })
})
