export interface TeamData {
  name: string
  conf: string
  color: string
  alt: string
  adjO: number
  adjD: number
  adjEM: number
  tempo: number
  efgPct: number
  tovPct: number
  orbPct: number
  ftr: number
  arena: string
  capacity: number
  lastUpdated?: string
}

export type TeamMap = Record<string, TeamData>

export interface ImportedTeamStats {
  adjO: number
  adjD: number
  adjEM: number
  tempo: number
  efgPct: number
  tovPct: number
  orbPct: number
  ftr: number
  lastUpdated?: string
}

export type LiveStatsMap = Record<string, Partial<ImportedTeamStats>>

export interface Odds {
  source?: string
  homeMoneyline: number
  awayMoneyline: number
  spread: number
  spreadHomeOdds: number
  spreadAwayOdds: number
  overUnder: number
  overOdds: number
  underOdds: number
}

export interface UnmatchedTeam {
  name: string
  count: number
}

export interface SportsbookParsedGame {
  homeAbbr: string | null
  awayAbbr: string | null
  gameTime: string
  homeNameRaw: string
  awayNameRaw: string
  homeMatched: boolean
  awayMatched: boolean
  odds: Odds | null
}

export interface SportsbookParseDiagnostics {
  games: SportsbookParsedGame[]
  unmatchedTeams: UnmatchedTeam[]
}

export interface SlateRowGame {
  homeAbbr: string
  awayAbbr: string
  gameTime: string
}

export interface SlateTableRow {
  game: SlateRowGame
  homeNameRaw?: string
  awayNameRaw?: string
  homeMatched?: boolean
  awayMatched?: boolean
  gameType?: string
  neutralSite?: boolean
  homeB2B?: boolean
  awayB2B?: boolean
  editedOdds?: Odds | null
  simResult?: PredictionResult | null
}

export interface ManualOddsForm {
  [key: string]: string
  homeMoneyline: string
  awayMoneyline: string
  homeSpread: string
  spreadHomeOdds: string
  spreadAwayOdds: string
  overUnder: string
  overOdds: string
  underOdds: string
}

export interface EditOddsFields {
  [key: string]: string
  homeMoneyline: string
  awayMoneyline: string
  spread: string
  spreadHomeOdds: string
  spreadAwayOdds: string
  overUnder: string
  overOdds: string
  underOdds: string
}

export interface PredictionFeature {
  label: string
  good: boolean
  detail: string
}

export interface PredictionResult {
  hWinProb: number
  aWinProb: number
  hScore: string
  aScore: string
  total: string
  rawTotal: string
  possessions: string
  totalStdDev: number
  totalConfidence: number
  marginStdDev: number
  sideConfidence: number
  marketBlend: number
  marketTotal: number | null
  projDiff: string
  isTournament: boolean
  neutralSite: boolean
  features: PredictionFeature[]
}

export interface BettingAnalysis {
  homeImpliedProb: number
  awayImpliedProb: number
  homeEdge: number
  awayEdge: number
  mlValueSide: 'home' | 'away' | 'none'
  mlValuePct: number
  spreadRec: 'home' | 'away' | 'pass'
  spreadEdge: number
  ouRec: 'over' | 'under' | 'pass'
  ouEdge: number
  ouEdgePct: number
  homeCoverProb: number
  awayCoverProb: number
  spHIC: number
  spAIC: number
  ovIC: number
  unIC: number
  pOver: number
  pUnder: number
  kellyHome: number
  kellyAway: number
  kellySpread: number
  kellyOU: number
}

export interface ParsedStatsResult {
  stats: Record<string, ImportedTeamStats>
  count: number
  timestamp: string
  source: string
}

export interface ResultRow {
  date: string
  home: string
  away: string
  hScore: number
  aScore: number
}

export interface PredictionCsvRow {
  date: string
  home: string
  away: string
  hProj: number | null
  aProj: number | null
  modelTotal: number | null
  vegaOU: number | null
  overOdds: number | null
  underOdds: number | null
  ouRec: string
  recTotalLine: number | null
  ouEdge: number
  ouEdgePct: number
  hMLmodel: string
  aMLmodel: string
  vegaHML: string
  vegaAML: string
  mlRec: string
  mlEdge: number
  vegaSpread: number | null
  spreadHomeOdds: number | null
  spreadAwayOdds: number | null
  sprRec: string
  recSpreadLine: number | null
  spreadEdge: number
  hWinPct: number | null
  aWinPct: number | null
}

export interface GradedPredictionRow extends PredictionCsvRow {
  res: ResultRow | null
  graded: boolean
  actualTotal?: number
  actualDiff?: number
  mlWin: boolean | null
  mlROI: number | null
  sprWin: boolean | null
  sprROI: number | null
  ouWin: boolean | null
  ouROI: number | null
}

export interface MarketStats {
  bets: number
  wins: number
  losses: number
  pushes: number
  units: number
  roiPct: number
  hitRate: number
  winPct: number
}

export interface EvalMarketSummary {
  all: MarketStats
  actual: MarketStats
}

export interface EvalSummary {
  ml: EvalMarketSummary
  spr: EvalMarketSummary
  ou: EvalMarketSummary
}

export interface AggregateStats {
  ml: MarketStats
  spr: MarketStats
  ou: MarketStats
  overall: MarketStats
}

export interface EvalControlState {
  ml: number | string
  spr: number | string
  ou: number | string
}
