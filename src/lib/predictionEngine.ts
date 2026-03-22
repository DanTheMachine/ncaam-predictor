import { TEAMS } from "../data/ncaaData";
import type { BettingAnalysis, LiveStatsMap, Odds, PredictionResult, TeamData } from "../types";

const ML_EDGE_THRESHOLD = 0.065;
const SPREAD_EDGE_THRESHOLD = 0.055;
const TOTAL_EDGE_THRESHOLD = 0.055;
const ML_PROBABILITY_BUFFER = 0.02;
const SPREAD_POINT_BUFFER = 1.0;
const TOTAL_POINT_BUFFER = 3.0;

const LEAGUE_BASELINES = {
  adjO: 110,
  adjD: 100,
  tempo: 68.5,
  efgPct: 50.5,
  tovPct: 17.0,
  orbPct: 30.5,
  ftr: 33.0,
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

interface MatchupContext {
  gameType: string
  neutralSite: boolean
  homeB2B: boolean
  awayB2B: boolean
  odds?: Odds | null
}

interface MatchupProjection {
  isTournament: boolean
  hfa: number
  possessions: number
  rawTotal: number
  total: number
  marketTotal: number | null
  marketWeight: number
  totalConfidence: number
  totalStdDev: number
  marginStdDev: number
  sideConfidence: number
  hScore: number
  aScore: number
}

function projectMatchupTotal(home: TeamData, away: TeamData, { gameType, neutralSite, homeB2B, awayB2B, odds }: MatchupContext): MatchupProjection {
  const isTournament = gameType !== "Regular Season" && gameType !== "Conference Tournament";
  const isConfTourney = gameType === "Conference Tournament";
  const tourneyFactor = isTournament ? 0.965 : isConfTourney ? 0.985 : 1.0;
  const hfa = neutralSite ? 0 : 3.5;
  const hB2B = homeB2B ? -2.5 : 0;
  const aB2B = awayB2B ? -2.5 : 0;

  const avgTempo = (home.tempo + away.tempo) / 2;
  const harmonicTempo = (2 * home.tempo * away.tempo) / Math.max(home.tempo + away.tempo, 1);
  const tempoGap = Math.abs(home.tempo - away.tempo);
  const pacePressure =
    ((home.orbPct + away.orbPct) - (LEAGUE_BASELINES.orbPct * 2)) * 0.04 +
    ((LEAGUE_BASELINES.tovPct * 2) - (home.tovPct + away.tovPct)) * 0.09 +
    ((home.ftr + away.ftr) - (LEAGUE_BASELINES.ftr * 2)) * 0.025 +
    tempoGap * 0.04;
  const possessions = clamp((harmonicTempo * 0.7 + avgTempo * 0.3) + pacePressure, 60, 79);

  const matchupAdj = (team: TeamData) => {
    const efgAdj = clamp((team.efgPct - LEAGUE_BASELINES.efgPct) * 0.004, -0.9, 1.2);
    const tovAdj = clamp((LEAGUE_BASELINES.tovPct - team.tovPct) * 0.25, -0.8, 0.8);
    const orbAdj = clamp((team.orbPct - LEAGUE_BASELINES.orbPct) * 0.12, -0.6, 0.7);
    const ftrAdj = clamp((team.ftr - LEAGUE_BASELINES.ftr) * 0.06, -0.5, 0.7);
    return efgAdj + tovAdj + orbAdj + ftrAdj;
  };

  const homeBasePpp = (home.adjO * (away.adjD / 100)) / 100;
  const awayBasePpp = (away.adjO * (home.adjD / 100)) / 100;
  const homePpp = clamp(homeBasePpp + matchupAdj(home) / 100, 0.82, 1.28);
  const awayPpp = clamp(awayBasePpp + matchupAdj(away) / 100, 0.82, 1.28);

  const homeRaw = possessions * homePpp * tourneyFactor * (1 + hB2B / 100);
  const awayRaw = possessions * awayPpp * tourneyFactor * (1 + aB2B / 100);
  const homeScore = Math.max(52, homeRaw + hfa / 2);
  const awayScore = Math.max(52, awayRaw - hfa / 2);
  const rawTotal = homeScore + awayScore;

  const baseConfidence =
    (isTournament ? 0.48 : isConfTourney ? 0.54 : 0.60) -
    clamp(tempoGap / 100, 0, 0.08) -
    (homeB2B || awayB2B ? 0.04 : 0);
  const totalConfidence = clamp(baseConfidence, 0.38, 0.72);

  const marketTotal = odds?.overUnder != null ? Number(odds.overUnder) : null;
  const marketGap = marketTotal == null ? 0 : Math.abs(rawTotal - marketTotal);
  const marketWeight = marketTotal == null
    ? 0
    : clamp((0.18 + marketGap / 32) * (1.08 - totalConfidence), 0.18, 0.55);
  const total = marketTotal == null
    ? rawTotal
    : rawTotal * (1 - marketWeight) + marketTotal * marketWeight;
  const scoreShift = (total - rawTotal) / 2;

  const totalStdDev = clamp(
    13.8 +
    tempoGap * 0.22 +
    Math.abs((home.efgPct + away.efgPct) - (LEAGUE_BASELINES.efgPct * 2)) * 0.06 +
    (homeB2B || awayB2B ? 0.9 : 0),
    13.0,
    19.0
  );
  const marginStdDev = clamp(
    12.4 +
    possessions * 0.045 +
    tempoGap * 0.06 +
    (1 - totalConfidence) * 6.2 +
    (homeB2B || awayB2B ? 0.7 : 0),
    12.0,
    18.0
  );
  const sideConfidence = clamp(1 - ((marginStdDev - 11.5) / 8.5), 0.35, 0.82);

  return {
    isTournament,
    hfa,
    possessions,
    rawTotal,
    total,
    marketTotal,
    marketWeight,
    totalConfidence,
    totalStdDev,
    marginStdDev,
    sideConfidence,
    hScore: homeScore + scoreShift,
    aScore: awayScore + scoreShift,
  };
}

// ─── Prediction Engine ───────────────────────────────────────────────────────
interface PredictGameInput {
  homeTeam: string
  awayTeam: string
  gameType: string
  neutralSite: boolean
  awayB2B: boolean
  homeB2B: boolean
  liveStats?: LiveStatsMap
  odds?: Odds | null
}

export function predictGame({ homeTeam, awayTeam, gameType, neutralSite, awayB2B, homeB2B, liveStats, odds }: PredictGameInput): PredictionResult {
  const fb_h = TEAMS[homeTeam], fb_a = TEAMS[awayTeam];
  const h = liveStats?.[homeTeam] ? { ...fb_h, ...liveStats[homeTeam] } : { ...fb_h };
  const a = liveStats?.[awayTeam] ? { ...fb_a, ...liveStats[awayTeam] } : { ...fb_a };

  const projection = projectMatchupTotal(h, a, { gameType, neutralSite, homeB2B, awayB2B, odds });

  const hScore = projection.hScore;
  const aScore = projection.aScore;
  // KenPom formula: score = adjO * (oppAdjD/100) * (tempo/100)
  // adjO/adjD are per-100-possession ratings; multiplying by tempo/100 converts
  // to actual points per game. Average D1: adjO≈110, adjD≈100, tempo≈68 → ~74.8 PPG ✓
  // No additional scale factor needed — the raw formula already calibrates correctly.
  const diff   = hScore - aScore;
  const marginStdDev = projection.marginStdDev;
  const hWinProb = clamp(normCDF(diff / marginStdDev), 0.015, 0.985);

  return {
    hWinProb, aWinProb: 1 - hWinProb,
    hScore:   hScore.toFixed(1),
    aScore:   aScore.toFixed(1),
    total:    projection.total.toFixed(1),
    rawTotal: projection.rawTotal.toFixed(1),
    possessions: projection.possessions.toFixed(1),
    totalStdDev: projection.totalStdDev,
    totalConfidence: projection.totalConfidence,
    marginStdDev: projection.marginStdDev,
    sideConfidence: projection.sideConfidence,
    marketBlend: projection.marketWeight,
    marketTotal: projection.marketTotal,
    projDiff: diff.toFixed(1),
    isTournament: projection.isTournament,
    neutralSite,
    features: [
      { label:`${homeTeam} Adj. Offense`, good: h.adjO >= 116,  detail: h.adjO.toFixed(1) },
      { label:`${homeTeam} Adj. Defense`, good: h.adjD <= 94,   detail: h.adjD.toFixed(1) },
      { label:`${awayTeam} Adj. Offense`, good: a.adjO >= 116,  detail: a.adjO.toFixed(1) },
      { label:`${awayTeam} Adj. Defense`, good: a.adjD <= 94,   detail: a.adjD.toFixed(1) },
      { label:`${homeTeam} Adj. EM`,      good: h.adjEM >= 18,  detail: `${h.adjEM >= 0 ? "+" : ""}${h.adjEM.toFixed(1)}` },
      { label:`${awayTeam} Adj. EM`,      good: a.adjEM >= 18,  detail: `${a.adjEM >= 0 ? "+" : ""}${a.adjEM.toFixed(1)}` },
      { label:`${homeTeam} eFG%`,         good: h.efgPct >= 53, detail: `${h.efgPct.toFixed(1)}%` },
      { label:`${awayTeam} eFG%`,         good: a.efgPct >= 53, detail: `${a.efgPct.toFixed(1)}%` },
      { label:`${homeTeam} TOV%`,         good: h.tovPct <= 15, detail: `${h.tovPct.toFixed(1)}%` },
      { label:`${awayTeam} TOV%`,         good: a.tovPct <= 15, detail: `${a.tovPct.toFixed(1)}%` },
      { label:"Home Court",               good: !neutralSite,   detail: neutralSite ? "Neutral Site" : `+${projection.hfa} pts` },
      { label:"Game Type",                good: !projection.isTournament,  detail: gameType },
      { label:"Projected Pace",           good: projection.possessions >= 70, detail: `${projection.possessions.toFixed(1)} poss` },
      { label:"Total Confidence",         good: projection.totalConfidence >= 0.58, detail: `${Math.round(projection.totalConfidence * 100)}%` },
      { label:"Side Confidence",          good: projection.sideConfidence >= 0.58, detail: `${Math.round(projection.sideConfidence * 100)}%` },
    ],
  };
}

// ─── Betting Math ─────────────────────────────────────────────────────────────
export function americanToImplied(ml: number | null | undefined): number {
  if (!ml || isNaN(ml)) return 0.5;
  return ml < 0 ? (-ml) / (-ml + 100) : 100 / (ml + 100);
}
export function normCDF(z: number): number {
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const erf = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * erf);
}
export function mlAmerican(prob: number): string {
  if (prob <= 0 || prob >= 1) return "N/A";
  return prob >= 0.5 ? `-${Math.round(prob / (1 - prob) * 100)}` : `+${Math.round((1 - prob) / prob * 100)}`;
}
export function analyzeBetting(result: PredictionResult, odds: Odds): BettingAnalysis {
  const hI  = americanToImplied(odds.homeMoneyline);
  const aI  = americanToImplied(odds.awayMoneyline);
  const vig = hI + aI;
  const hIC = hI / vig, aIC = aI / vig;
  const hEdge = result.hWinProb - hIC;
  const aEdge = result.aWinProb - aIC;
  const homeMlQualifies =
    result.hWinProb >= 0.5 + ML_PROBABILITY_BUFFER &&
    hEdge > ML_EDGE_THRESHOLD;
  const awayMlQualifies =
    result.aWinProb >= 0.5 + ML_PROBABILITY_BUFFER &&
    aEdge > ML_EDGE_THRESHOLD;
  const mlSide = homeMlQualifies ? "home" : awayMlQualifies ? "away" : "none";
  const mlPct  = Math.max(hEdge, aEdge) * 100;

  const diff     = parseFloat(result.hScore) - parseFloat(result.aScore);
  const marginStd = result.marginStdDev || 10.8;
  const hCover   = clamp(normCDF((diff + (odds.spread ?? -4)) / marginStd), 0.015, 0.985);
  const aCover   = 1 - hCover;
  const spHI     = americanToImplied(odds.spreadHomeOdds || -110);
  const spAI     = americanToImplied(odds.spreadAwayOdds || -110);
  const spVig    = spHI + spAI;
  const spHEdge  = hCover - spHI / spVig;
  const spAEdge  = aCover - spAI / spVig;
  const homeSpreadProjection = diff + (odds.spread ?? -4);
  const awaySpreadProjection = -homeSpreadProjection;
  const homeSpreadQualifies =
    homeSpreadProjection >= SPREAD_POINT_BUFFER &&
    spHEdge > SPREAD_EDGE_THRESHOLD;
  const awaySpreadQualifies =
    awaySpreadProjection >= SPREAD_POINT_BUFFER &&
    spAEdge > SPREAD_EDGE_THRESHOLD;
  const spreadRec  = homeSpreadQualifies ? "home" : awaySpreadQualifies ? "away" : "pass";
  const spreadEdge = Math.max(spHEdge, spAEdge) * 100;

  const proj   = parseFloat(result.total);
  const ouEdge = proj - odds.overUnder;
  const totalStd = result.totalStdDev || 11.5;
  const pOver  = 1 - normCDF((odds.overUnder - proj) / totalStd);
  const pUnder = 1 - pOver;
  const ovI    = americanToImplied(odds.overOdds  || -110);
  const unI    = americanToImplied(odds.underOdds || -110);
  const ouVig  = ovI + unI;
  const ouOverEdge  = pOver  - ovI / ouVig;
  const ouUnderEdge = pUnder - unI / ouVig;
  const overQualifies =
    ouEdge >= TOTAL_POINT_BUFFER &&
    ouOverEdge > TOTAL_EDGE_THRESHOLD;
  const underQualifies =
    ouEdge <= -TOTAL_POINT_BUFFER &&
    ouUnderEdge > TOTAL_EDGE_THRESHOLD;
  const ouRec  = overQualifies ? "over" : underQualifies ? "under" : "pass";
  const ouEdgePct   = (ouRec === "over" ? ouOverEdge : ouRec === "under" ? ouUnderEdge : Math.max(ouOverEdge, ouUnderEdge)) * 100;
  const ovIC   = ovI / ouVig, unIC = unI / ouVig;
  const spHIC  = spHI / spVig, spAIC = spAI / spVig;
  const spreadSideIsHome = spreadRec !== "pass" && spreadRec === "home";
  const spreadSideIC     = spreadSideIsHome ? spHIC : spAIC;
  const kellySpread = spreadRec !== "pass" && spreadEdge > 0 ? (spreadEdge / 100) / (1 - spreadSideIC) * 0.25 : 0;
  const ouSideIC    = ouRec === "over" ? ovIC : unIC;
  const kellyOU     = ouRec !== "pass" && ouEdgePct > 0 ? (ouEdgePct / 100) / (1 - ouSideIC) * 0.25 : 0;

  return {
    homeImpliedProb: hIC, awayImpliedProb: aIC,
    homeEdge: hEdge, awayEdge: aEdge,
    mlValueSide: mlSide, mlValuePct: mlPct,
    spreadRec, spreadEdge, ouRec, ouEdge, ouEdgePct,
    homeCoverProb: hCover, awayCoverProb: aCover,
    spHIC, spAIC, ovIC, unIC, pOver, pUnder,
    kellyHome: hEdge > 0 ? (hEdge / (1 - hIC)) * 0.25 : 0,
    kellyAway: aEdge > 0 ? (aEdge / (1 - aIC)) * 0.25 : 0,
    kellySpread, kellyOU,
  };
}

export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type:"text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
