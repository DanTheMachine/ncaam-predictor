import { parseSbookFormat, parseSbookWithDiagnostics } from '../lib/sportsbookParser'

describe('sportsbookParser', () => {
  test('parses simple away-at-home slate lines and reports unmatched teams', () => {
    const raw = [
      'MIAMI OHIO @ DUKE, 7:00 PM ET',
      'Unknown Tech @ Kansas, 9:00 PM ET',
    ].join('\n')

    const { games, unmatchedTeams } = parseSbookWithDiagnostics(raw)

    expect(games).toHaveLength(2)
    expect(games[0]).toMatchObject({
      awayAbbr: 'MIAOH',
      homeAbbr: 'DUKE',
      gameTime: '7:00 PM ET',
      awayMatched: true,
      homeMatched: true,
    })
    expect(games[1].homeAbbr).toBe('KU')
    expect(games[1].awayMatched).toBe(false)
    expect(unmatchedTeams).toContainEqual({ name: 'Unknown Tech', count: 1 })
  })

  test('matches normalized sportsbook name variants for teams already in the dataset', () => {
    const raw = [
      "Saint Mary's (CA) @ Duke, 7:00 PM ET",
      'Texas A and M @ Duke, 9:00 PM ET',
    ].join('\n')

    const { games, unmatchedTeams } = parseSbookWithDiagnostics(raw)

    expect(games).toHaveLength(2)
    expect(games[0]).toMatchObject({
      awayAbbr: 'SMC',
      homeAbbr: 'DUKE',
      awayMatched: true,
      homeMatched: true,
    })
    expect(games[1]).toMatchObject({
      awayAbbr: 'TAMU',
      homeAbbr: 'DUKE',
      awayMatched: true,
      homeMatched: true,
    })
    expect(unmatchedTeams).toEqual([])
  })

  test('parses sportsbook rotation blocks into a single game with odds', () => {
    const raw = [
      'Kansas 701',
      '* + 4.5 -110',
      '* O 145.5 -108',
      '* +165',
      'Duke 702',
      '* - 4.5 -112',
      '* U 145.5 -112',
      '* -200',
    ].join('\n')

    const games = parseSbookFormat(raw)

    expect(games).toHaveLength(1)
    expect(games[0]).toMatchObject({
      awayAbbr: 'KU',
      homeAbbr: 'DUKE',
      awayMatched: true,
      homeMatched: true,
    })
    expect(games[0].odds).toMatchObject({
      source: 'sportsbook',
      awayMoneyline: 165,
      homeMoneyline: -200,
      spread: -4.5,
      overUnder: 145.5,
      overOdds: -108,
      underOdds: -112,
    })
  })

  test('preserves pasted moneylines that include spaces after the sign', () => {
    const raw = [
      'CBS9:10 AM',
      'MIAMI FLORIDA',
      '817',
      '+ 8',
      '- 108',
      'O 147.5',
      '- 108',
      '+ 257',
      'PURDUE',
      '818',
      '- 8',
      '- 108',
      'U 147.5',
      '- 108',
      '- 338',
    ].join('\n')

    const games = parseSbookFormat(raw)

    expect(games).toHaveLength(1)
    expect(games[0].odds).toMatchObject({
      awayMoneyline: 257,
      homeMoneyline: -338,
      spread: -8,
      spreadAwayOdds: -108,
      spreadHomeOdds: -108,
    })
  })
})
