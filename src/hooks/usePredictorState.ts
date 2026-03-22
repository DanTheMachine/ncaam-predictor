import { useEffect, useRef, useState } from "react";
import { GAME_TYPES, KENPOM_NAME_MAP, TEAMS } from "../data/ncaaData";
import { analyzeBetting, downloadCSV, mlAmerican, predictGame } from "../lib/predictionEngine";
import { parseStatsCSV } from "../lib/statsParser";
import { parseSbookWithDiagnostics } from "../lib/sportsbookParser";
import type {
  EditOddsFields,
  LiveStatsMap,
  ManualOddsForm,
  Odds,
  PredictionResult,
  SlateTableRow,
  TeamData,
  UnmatchedTeam,
} from "../types";

interface EspnTeamInfo {
  abbreviation?: string;
  shortDisplayName?: string;
  displayName?: string;
  location?: string;
  name?: string;
}

interface EspnCompetitor {
  homeAway?: "home" | "away";
  score?: string;
  team?: EspnTeamInfo;
}

interface EspnEvent {
  status?: { type?: { completed?: boolean } };
  competitions?: Array<{ competitors?: EspnCompetitor[] }>;
}

interface EspnScoreboardResponse {
  events?: EspnEvent[];
}

interface BestBetRow {
  type: "ML" | "SPR" | "O/U";
  edge: number;
  matchup: string;
  label: string;
  line: string;
  proj: string;
  edgeTxt: string;
}

interface DebugRow {
  matchup: string;
  mlModelPct: number;
  mlMarketPct: number;
  mlEdgePct: number;
  mlPick: string;
  spreadModelPct: number;
  spreadMarketPct: number;
  spreadEdgePct: number;
  spreadPoints: number;
  spreadPick: string;
  totalModel: number;
  totalMarket: number;
  totalPointsEdge: number;
  totalProbEdgePct: number;
  totalPick: string;
}

const normalizeTeamKey = (value: unknown): string =>
  String(value ?? "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[(),]/g, " ")
    .replace(/[.'’]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const ESPN_TO_OURS: Record<string, string> = {
  WIS: "WISC",
  UVA: "VA",
  MIA: "MIAMI",
  "M-OH": "MIAOH",
  NEB: "NEBR",
  PUR: "PURDUE",
  SJU: "STJ",
  HALL: "SETON",
  OU: "OKLA",
  VAN: "VAND",
  CONN: "UCONN",
  GTWN: "GTOWN",
  CSN: "CSUN",
  UNM: "UNM",
  SDST: "SDSU",
  ARIZ: "AZ",
  LT: "LATECH",
  ILS: "ILLST",
  ILLST: "ILLST",
  MURR: "MURR",
};

const resolveEspnTeam = (team?: EspnTeamInfo): string | null => {
  const candidates = [
    team?.abbreviation,
    team?.shortDisplayName,
    team?.displayName,
    team?.location,
    team?.name,
    [team?.location, team?.name].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .map((value) => String(value).trim());

  for (const candidate of candidates) {
    const upper = candidate.toUpperCase();
    if (TEAMS[upper]) return upper;
    if (ESPN_TO_OURS[upper] && TEAMS[ESPN_TO_OURS[upper]]) return ESPN_TO_OURS[upper];
  }

  for (const candidate of candidates) {
    const raw = candidate.toLowerCase();
    if (KENPOM_NAME_MAP[raw] && TEAMS[KENPOM_NAME_MAP[raw]]) return KENPOM_NAME_MAP[raw];

    const normalized = normalizeTeamKey(candidate);
    if (KENPOM_NAME_MAP[normalized] && TEAMS[KENPOM_NAME_MAP[normalized]]) return KENPOM_NAME_MAP[normalized];
  }

  return null;
};

const localToday = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function usePredictorState() {
  const [homeTeam, setHomeTeam] = useState("DUKE");
  const [awayTeam, setAwayTeam] = useState("KU");
  const [gameType, setGameType] = useState("Regular Season");
  const [neutralSite, setNeutralSite] = useState(false);
  const [homeB2B, setHomeB2B] = useState(false);
  const [awayB2B, setAwayB2B] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [running, setRunning] = useState(false);
  const [simCount, setSimCount] = useState(0);
  const [confFilter, setConfFilter] = useState("ALL");
  const [liveStats, setLiveStats] = useState<LiveStatsMap>({});
  const [kpPaste, setKpPaste] = useState("");
  const [kpStatus, setKpStatus] = useState("");
  const [kpError, setKpError] = useState("");
  const [showKP, setShowKP] = useState(false);
  const [statsUpdated, setStatsUpdated] = useState("");
  const [statsSource, setStatsSource] = useState("");
  const [odds, setOdds] = useState<Odds | null>(null);
  const [oddsSource, setOddsSource] = useState("none");
  const [manualOdds, setManualOdds] = useState<ManualOddsForm>({
    homeMoneyline: "-350",
    awayMoneyline: "+280",
    homeSpread: "-8.5",
    spreadHomeOdds: "-110",
    spreadAwayOdds: "-110",
    overUnder: "145.5",
    overOdds: "-110",
    underOdds: "-110",
  });
  const [slateNeutral, setSlateNeutral] = useState(false);
  const [slateGameType, setSlateGameType] = useState("Regular Season");
  const [slateDate, setSlateDateState] = useState(localToday);
  const autoSlateDateRef = useRef(slateDate);
  const [linesRows, setLinesRows] = useState<SlateTableRow[]>([]);
  const [schedStatus, setSchedStatus] = useState("");
  const [simsRunning, setSimsRunning] = useState(false);
  const [showLines, setShowLines] = useState(false);
  const [showSingleGameTools, setShowSingleGameTools] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkPaste, setBulkPaste] = useState("");
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkError, setBulkError] = useState("");
  const [bulkUnmatched, setBulkUnmatched] = useState<UnmatchedTeam[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editFields, setEditFields] = useState<EditOddsFields>({
    homeMoneyline: "",
    awayMoneyline: "",
    spread: "",
    spreadHomeOdds: "",
    spreadAwayOdds: "",
    overUnder: "",
    overOdds: "",
    underOdds: "",
  });

  const hasLive = Object.keys(liveStats).length >= 20;
  const getColor = (abbr: string, which = "primary"): string =>
    which === "primary" ? (TEAMS[abbr]?.color ?? "#8B0000") : (TEAMS[abbr]?.alt ?? "#CCCCCC");
  const hColor = getColor(homeTeam);
  const aColor = getColor(awayTeam);
  const hTeam: TeamData = liveStats[homeTeam] ? { ...TEAMS[homeTeam], ...liveStats[homeTeam] } : TEAMS[homeTeam];
  const aTeam: TeamData = liveStats[awayTeam] ? { ...TEAMS[awayTeam], ...liveStats[awayTeam] } : TEAMS[awayTeam];

  useEffect(() => {
    const syncSlateDate = () => {
      const today = localToday();
      setSlateDateState((prev) => {
        const next = prev === autoSlateDateRef.current ? today : prev;
        autoSlateDateRef.current = today;
        return next;
      });
    };

    syncSlateDate();
    const intervalId = window.setInterval(syncSlateDate, 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const setSlateDate = (value: string) => {
    setSlateDateState(value);
  };

  const applyImportedStats = (raw: string) => {
    const { stats, count, timestamp, source } = parseStatsCSV(raw);
    setLiveStats((prev) => ({ ...prev, ...stats }));
    setStatsUpdated(timestamp);
    setStatsSource(source);
    setKpStatus(`✓ Updated ${count} teams from ${source} · ${timestamp}`);
    setKpPaste("");
    setShowKP(false);
    setResult(null);
  };

  const handleKPImport = () => {
    setKpError("");
    if (!kpPaste.trim()) {
      setKpError("Paste is empty");
      return;
    }
    try {
      applyImportedStats(kpPaste);
    } catch (error) {
      setKpError(error instanceof Error ? error.message : "Import failed");
    }
  };

  const handleClipboardImport = async () => {
    setKpError("");
    setKpStatus("");
    try {
      const raw = await navigator.clipboard.readText();
      if (!raw.trim()) throw new Error("Clipboard is empty");
      applyImportedStats(raw);
    } catch (error) {
      setKpError(error instanceof Error ? error.message : "Clipboard import failed");
    }
  };

  const handleStatsFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setKpError("");
    setKpStatus("");
    try {
      const raw = await file.text();
      if (!raw.trim()) throw new Error("Selected file is empty");
      applyImportedStats(raw);
    } catch (error) {
      setKpError(error instanceof Error ? error.message : "File import failed");
    }
  };

  const runSim = () => {
    setRunning(true);
    setSimCount(0);
    setResult(null);
    let c = 0;
    const iv = setInterval(() => {
      c += Math.floor(Math.random() * 3200 + 1500);
      setSimCount(Math.min(c, 100000));
      if (c >= 100000) {
        clearInterval(iv);
        setTimeout(() => {
          setResult(predictGame({ homeTeam, awayTeam, gameType, neutralSite, homeB2B, awayB2B, liveStats, odds }));
          setRunning(false);
        }, 80);
      }
    }, 38);
  };

  const applyManualOdds = () => {
    const nextOdds: Odds = {
      source: "manual",
      homeMoneyline: parseFloat(manualOdds.homeMoneyline),
      awayMoneyline: parseFloat(manualOdds.awayMoneyline),
      spread: parseFloat(manualOdds.homeSpread) || -4,
      spreadHomeOdds: parseFloat(manualOdds.spreadHomeOdds),
      spreadAwayOdds: parseFloat(manualOdds.spreadAwayOdds),
      overUnder: parseFloat(manualOdds.overUnder),
      overOdds: parseFloat(manualOdds.overOdds),
      underOdds: parseFloat(manualOdds.underOdds),
    };
    setOdds(nextOdds);
    setOddsSource("manual");
    setResult(predictGame({ homeTeam, awayTeam, gameType, neutralSite, homeB2B, awayB2B, liveStats, odds: nextOdds }));
  };

  const handleBulkGames = () => {
    setBulkError("");
    setBulkStatus("");
    setBulkUnmatched([]);
    if (!bulkPaste.trim()) {
      setBulkError("Paste is empty");
      return;
    }
    try {
      const { games, unmatchedTeams } = parseSbookWithDiagnostics(bulkPaste);
      if (!games.length) {
        throw new Error("v2 — No games parsed — use format: AWAY @ HOME (e.g. KU @ DUKE), or paste directly from a sportsbook");
      }
      const allRows: SlateTableRow[] = games.map((g) => ({
        game: { homeAbbr: g.homeAbbr || "DUKE", awayAbbr: g.awayAbbr || "KU", gameTime: g.gameTime },
        homeNameRaw: g.homeNameRaw,
        awayNameRaw: g.awayNameRaw,
        homeMatched: g.homeMatched,
        awayMatched: g.awayMatched,
        editedOdds: g.odds,
        simResult: null,
        homeB2B: false,
        awayB2B: false,
        gameType: slateGameType,
        neutralSite: slateNeutral,
      }));
      const rows = allRows.filter((r) => r.homeMatched && r.awayMatched);
      const skipped = allRows.length - rows.length;
      setLinesRows(rows);
      setShowLines(true);
      setBulkUnmatched(unmatchedTeams);
      setBulkStatus(`✓ Loaded ${rows.length} game${rows.length !== 1 ? "s" : ""}${skipped ? ` · ${skipped} game(s) skipped (team not recognized)` : ""}`);
      setBulkPaste("");
      setShowBulkImport(false);
    } catch (error) {
      setBulkError(error instanceof Error ? error.message : "Bulk import failed");
    }
  };

  const handleRunAllSims = () => {
    setSimsRunning(true);
    setTimeout(() => {
      setLinesRows((prev) =>
        prev.map((r) => ({
          ...r,
          simResult: predictGame({
            homeTeam: r.game.homeAbbr,
            awayTeam: r.game.awayAbbr,
            gameType: r.gameType ?? "Regular Season",
            neutralSite: r.neutralSite ?? false,
            homeB2B: r.homeB2B ?? false,
            awayB2B: r.awayB2B ?? false,
            liveStats,
            odds: r.editedOdds,
          }),
        })),
      );
      setSimsRunning(false);
      setSchedStatus("All simulations complete");
    }, 80);
  };

  const startEdit = (idx: number) => {
    const od: Partial<Odds> = linesRows[idx].editedOdds ?? {};
    setEditFields({
      homeMoneyline: od.homeMoneyline != null ? String(od.homeMoneyline) : "",
      awayMoneyline: od.awayMoneyline != null ? String(od.awayMoneyline) : "",
      spread: od.spread != null ? String(od.spread) : "",
      spreadHomeOdds: od.spreadHomeOdds != null ? String(od.spreadHomeOdds) : "-110",
      spreadAwayOdds: od.spreadAwayOdds != null ? String(od.spreadAwayOdds) : "-110",
      overUnder: od.overUnder != null ? String(od.overUnder) : "",
      overOdds: od.overOdds != null ? String(od.overOdds) : "-110",
      underOdds: od.underOdds != null ? String(od.underOdds) : "-110",
    });
    setEditingIdx(idx);
  };

  const saveEdit = (idx: number) => {
    const pf = (v: string, fb: number): number => {
      const n = parseFloat(String(v).replace(/\s/g, ""));
      return Number.isNaN(n) ? fb : n;
    };
    const updated: Odds = {
      source: "manual",
      homeMoneyline: pf(editFields.homeMoneyline, 0),
      awayMoneyline: pf(editFields.awayMoneyline, 0),
      spread: pf(editFields.spread, -4),
      spreadHomeOdds: pf(editFields.spreadHomeOdds, -110),
      spreadAwayOdds: pf(editFields.spreadAwayOdds, -110),
      overUnder: pf(editFields.overUnder, 145),
      overOdds: pf(editFields.overOdds, -110),
      underOdds: pf(editFields.underOdds, -110),
    };
    setLinesRows((prev) => prev.map((r, i) => (i === idx ? { ...r, editedOdds: updated, simResult: null } : r)));
    setEditingIdx(null);
  };

  const handleExport = () => {
    const today = slateDate;
    const esc = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
    const hdrs = [
      "Date", "Time", "Home", "Away",
      "H Win%", "A Win%", "H Proj", "A Proj", "Model Total",
      "Vegas H ML", "Vegas A ML", "H ML (model)", "A ML (model)", "ML Rec", "ML Edge",
      "Vegas Spread", "Spread Home Odds", "Spread Away Odds", "Spread Rec", "Recommended Spread Line", "Spread Edge",
      "Vegas O/U", "Over Odds", "Under Odds", "O/U Rec", "Recommended Total Line", "O/U Edge", "O/U Edge %",
      "H AdjEM", "A AdjEM", "H AdjO", "H AdjD", "A AdjO", "A AdjD",
      "Stats Source", "Odds Source", "LookupKey",
    ];
    const csvRows = linesRows.map((r) => {
      const sim =
        r.simResult ??
        predictGame({
          homeTeam: r.game.homeAbbr,
          awayTeam: r.game.awayAbbr,
          gameType: r.gameType ?? "Regular Season",
          neutralSite: r.neutralSite ?? false,
          homeB2B: r.homeB2B ?? false,
          awayB2B: r.awayB2B ?? false,
          liveStats,
          odds: r.editedOdds,
        });
      const od = r.editedOdds;
      const ba = od && od.homeMoneyline !== 0 ? analyzeBetting(sim, od) : null;
      const h = liveStats[r.game.homeAbbr] ? { ...TEAMS[r.game.homeAbbr], ...liveStats[r.game.homeAbbr] } : TEAMS[r.game.homeAbbr];
      const a = liveStats[r.game.awayAbbr] ? { ...TEAMS[r.game.awayAbbr], ...liveStats[r.game.awayAbbr] } : TEAMS[r.game.awayAbbr];
      const dateYMD = today.replace(/-/g, "");
      const recMlSide = ba?.mlValueSide === "none" || !ba ? "PASS" : ba.mlValueSide.toUpperCase();
      const recSpreadSide = ba ? (ba.spreadRec === "pass" ? "PASS" : ba.spreadRec.toUpperCase()) : "�";
      const recSpreadLine = ba && ba.spreadRec !== "pass" && od?.spread != null ? (ba.spreadRec === "home" ? od.spread : -od.spread) : null;
      const recTotalSide = ba?.ouRec ? ba.ouRec.toUpperCase() : "�";
      const recTotalLine = ba?.ouRec && ba.ouRec !== "pass" && od?.overUnder != null ? od.overUnder : null;
      return [
        today,
        r.game.gameTime,
        `${r.game.homeAbbr} ${h.name}`,
        `${r.game.awayAbbr} ${a.name}`,
        `${(sim.hWinProb * 100).toFixed(1)}%`,
        `${(sim.aWinProb * 100).toFixed(1)}%`,
        sim.hScore,
        sim.aScore,
        sim.total,
        od?.homeMoneyline != null ? `${od.homeMoneyline > 0 ? "+" : ""}${od.homeMoneyline}` : "�",
        od?.awayMoneyline != null ? `${od.awayMoneyline > 0 ? "+" : ""}${od.awayMoneyline}` : "�",
        mlAmerican(sim.hWinProb),
        mlAmerican(sim.aWinProb),
        recMlSide,
        ba && ba.mlValueSide !== "none" ? `${ba.mlValuePct > 0 ? "+" : ""}${ba.mlValuePct.toFixed(1)}%` : "",
        od?.spread != null ? `${od.spread > 0 ? "+" : ""}${od.spread}` : "�",
        od?.spreadHomeOdds != null ? `${od.spreadHomeOdds > 0 ? "+" : ""}${od.spreadHomeOdds}` : "�",
        od?.spreadAwayOdds != null ? `${od.spreadAwayOdds > 0 ? "+" : ""}${od.spreadAwayOdds}` : "�",
        recSpreadSide,
        recSpreadLine != null ? `${recSpreadLine > 0 ? "+" : ""}${recSpreadLine}` : "",
        ba && ba.spreadRec !== "pass" ? `${ba.spreadEdge > 0 ? "+" : ""}${ba.spreadEdge.toFixed(1)}%` : "",
        od?.overUnder?.toFixed(1) ?? "�",
        od?.overOdds != null ? `${od.overOdds > 0 ? "+" : ""}${od.overOdds}` : "�",
        od?.underOdds != null ? `${od.underOdds > 0 ? "+" : ""}${od.underOdds}` : "�",
        recTotalSide,
        recTotalLine != null ? recTotalLine.toFixed(1) : "",
        ba && ba.ouRec !== "pass" ? `${ba.ouEdge > 0 ? "+" : ""}${ba.ouEdge.toFixed(1)}` : "",
        ba && ba.ouRec !== "pass" ? `${ba.ouEdgePct > 0 ? "+" : ""}${ba.ouEdgePct.toFixed(1)}%` : "",
        `${h.adjEM >= 0 ? "+" : ""}${h.adjEM.toFixed(1)}`,
        `${a.adjEM >= 0 ? "+" : ""}${a.adjEM.toFixed(1)}`,
        h.adjO.toFixed(1),
        h.adjD.toFixed(1),
        a.adjO.toFixed(1),
        a.adjD.toFixed(1),
        hasLive ? `${statsSource} live` : "Estimates",
        od ? "Sportsbook" : "No odds",
        `${dateYMD}${r.game.homeAbbr}${r.game.awayAbbr}`,
      ];
    });
    downloadCSV([hdrs.map(esc).join(","), ...csvRows.map((r) => r.map(esc).join(","))].join("\n"), `ncaa-predictions-${today}.csv`);
    setSchedStatus(`? Exported ${csvRows.length} games to ncaa-predictions-${today}.csv`);
  };

  const handleExportResults = async () => {
    const dt = new Date(slateDate + "T12:00:00");
    dt.setDate(dt.getDate() - 1);
    const date = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    const dateYMD = date.replace(/-/g, "");

    setSchedStatus("⏳ Fetching yesterday's scores from ESPN…");

    try {
      const resp = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?dates=${dateYMD}&limit=200`);
      if (!resp.ok) throw new Error(`ESPN ${resp.status}`);
      const data: EspnScoreboardResponse = await resp.json();

      const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const hdrs = ["Date", "Home", "Away", "Home Score", "Away Score", "Winner", "Total", "LookupKey"];
      const csvRows: Array<Array<string | number>> = [];

      const completed = (data.events || []).filter((e) => e.status?.type?.completed);

      for (const event of completed) {
        const comps = event.competitions?.[0]?.competitors || [];
        const homeComp = comps.find((c) => c.homeAway === "home");
        const awayComp = comps.find((c) => c.homeAway === "away");
        if (!homeComp || !awayComp) continue;

        const homeAbbr = resolveEspnTeam(homeComp.team);
        const awayAbbr = resolveEspnTeam(awayComp.team);
        if (!homeAbbr || !awayAbbr) continue;
        if (!TEAMS[homeAbbr] || !TEAMS[awayAbbr]) continue;

        const hScore = parseInt(homeComp.score ?? "0", 10) || 0;
        const aScore = parseInt(awayComp.score ?? "0", 10) || 0;
        const winner = hScore > aScore ? homeAbbr : awayAbbr;

        csvRows.push([
          date,
          `${homeAbbr} ${TEAMS[homeAbbr].name}`,
          `${awayAbbr} ${TEAMS[awayAbbr].name}`,
          hScore,
          aScore,
          winner,
          hScore + aScore,
          `${dateYMD}${homeAbbr}${awayAbbr}`,
        ]);
      }

      if (!csvRows.length) throw new Error("No recognized games found");
      downloadCSV([hdrs.map(esc).join(","), ...csvRows.map((r) => r.map(esc).join(","))].join("\n"), `ncaa-results-${date}.csv`);
      setSchedStatus(`✓ Results CSV for ${date} — ${csvRows.length} games`);
    } catch (error) {
      setSchedStatus(`✗ Could not fetch results: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const resetToEstimates = () => {
    setLiveStats({});
    setStatsUpdated("");
    setStatsSource("");
    setKpStatus("");
    setKpError("");
    setShowKP(false);
    setResult(null);
  };

  const handleSlateGameTypeChange = (value: string) => {
    setSlateGameType(value);
    setSlateNeutral(value !== "Regular Season");
    setLinesRows((prev) => prev.map((r) => ({ ...r, simResult: null })));
  };

  const handleSlateNeutralToggle = () => {
    setSlateNeutral((n) => !n);
    setLinesRows((prev) => prev.map((r) => ({ ...r, simResult: null })));
  };

  const applySlateSettingsToAllGames = () => {
    setLinesRows((prev) =>
      prev.map((r) => ({
        ...r,
        gameType: slateGameType,
        neutralSite: slateGameType !== "Regular Season" ? true : slateNeutral,
        simResult: null,
      })),
    );
  };

  const handleBulkPasteChange = (value: string) => {
    setBulkPaste(value);
    setBulkError("");
    setBulkStatus("");
    setBulkUnmatched([]);
  };

  const clearBulkImport = () => {
    setBulkPaste("");
    setBulkError("");
    setBulkStatus("");
    setBulkUnmatched([]);
  };

  const updateLineTime = (idx: number, value: string) =>
    setLinesRows((prev) => prev.map((r, i) => (i === idx ? { ...r, game: { ...r.game, gameTime: value } } : r)));

  const updateLineGameType = (idx: number, value: string) =>
    setLinesRows((prev) =>
      prev.map((r, i) =>
        i === idx ? { ...r, gameType: value, neutralSite: value !== "Regular Season" ? true : (r.neutralSite ?? false), simResult: null } : r,
      ),
    );

  const toggleLineNeutral = (idx: number) =>
    setLinesRows((prev) => prev.map((r, i) => (i === idx ? { ...r, neutralSite: !(r.neutralSite ?? false), simResult: null } : r)));

  const toggleLineB2B = (idx: number, field: "homeB2B" | "awayB2B") =>
    setLinesRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: !(r[field] ?? false), simResult: null } : r)));

  const runLineSim = (idx: number) =>
    setLinesRows((prev) =>
      prev.map((r, i) =>
        i === idx
          ? {
              ...r,
              simResult: predictGame({
                homeTeam: r.game.homeAbbr,
                awayTeam: r.game.awayAbbr,
                gameType: r.gameType ?? "Regular Season",
                neutralSite: r.neutralSite ?? false,
                homeB2B: r.homeB2B ?? false,
                awayB2B: r.awayB2B ?? false,
                liveStats,
                odds: r.editedOdds,
              }),
            }
          : r,
      ),
    );

  const toggleEditOdds = (idx: number) => {
    if (editingIdx === idx) setEditingIdx(null);
    else startEdit(idx);
  };

  const handleEditFieldChange = (field: keyof EditOddsFields, value: string) =>
    setEditFields((p) => ({ ...p, [field]: value }));

  const cancelEditOdds = () => setEditingIdx(null);

  const resetEditedOdds = (idx: number) => {
    setLinesRows((prev) => prev.map((r, i) => (i === idx ? { ...r, editedOdds: null, simResult: null } : r)));
    setEditingIdx(null);
  };

  const simSummaryRows = linesRows
    .filter((r) => r.simResult)
    .map((r) => {
      const sim = r.simResult as PredictionResult;
      const od = r.editedOdds;
      const hasOdds = !!(od && od.homeMoneyline != null && od.overUnder != null);
      const homeStats = liveStats[r.game.homeAbbr] ? { ...TEAMS[r.game.homeAbbr], ...liveStats[r.game.homeAbbr] } : TEAMS[r.game.homeAbbr];
      const awayStats = liveStats[r.game.awayAbbr] ? { ...TEAMS[r.game.awayAbbr], ...liveStats[r.game.awayAbbr] } : TEAMS[r.game.awayAbbr];
      return {
        ...r,
        simResult: sim,
        betting: hasOdds ? analyzeBetting(sim, od) : null,
        homeStats,
        awayStats,
      };
    });

  const bestBets = (() => {
    const bets: BestBetRow[] = [];
    linesRows.forEach((row) => {
      if (!row.simResult) return;
      const sim = row.simResult;
      const od = row.editedOdds;
      if (!od || od.homeMoneyline == null || od.overUnder == null) return;
      const ba = analyzeBetting(sim, od);
      const matchup = `${row.game.awayAbbr} @ ${row.game.homeAbbr}`;

      if (ba.mlValueSide !== "none") {
        const side = ba.mlValueSide === "home" ? row.game.homeAbbr : row.game.awayAbbr;
        const vegaML = ba.mlValueSide === "home" ? od.homeMoneyline : od.awayMoneyline;
        const modelML =
          ba.mlValueSide === "home"
            ? sim.hWinProb >= 0.5
              ? `-${Math.round((sim.hWinProb / (1 - sim.hWinProb)) * 100)}`
              : `+${Math.round(((1 - sim.hWinProb) / sim.hWinProb) * 100)}`
            : sim.aWinProb >= 0.5
              ? `-${Math.round((sim.aWinProb / (1 - sim.aWinProb)) * 100)}`
              : `+${Math.round(((1 - sim.aWinProb) / sim.aWinProb) * 100)}`;
        bets.push({
          type: "ML",
          edge: ba.mlValuePct,
          matchup,
          label: `${side} ML`,
          line: `Vegas ${vegaML > 0 ? "+" : ""}${vegaML}`,
          proj: `Model ${modelML} (${((ba.mlValueSide === "home" ? sim.hWinProb : sim.aWinProb) * 100) | 0}%)`,
          edgeTxt: `+${ba.mlValuePct.toFixed(1)}%`,
        });
      }

      if (ba.spreadRec !== "pass") {
        const onHome = ba.spreadRec === "home";
        const side = onHome ? row.game.homeAbbr : row.game.awayAbbr;
        const vegaSpread = onHome ? od.spread : -od.spread;
        const projDiff = parseFloat(sim.projDiff);
        const projSpread = onHome ? projDiff : -projDiff;
        bets.push({
          type: "SPR",
          edge: ba.spreadEdge,
          matchup,
          label: `${side} ${vegaSpread > 0 ? "+" : ""}${vegaSpread}`,
          line: `Vegas ${vegaSpread > 0 ? "+" : ""}${vegaSpread} (${onHome ? od.spreadHomeOdds : od.spreadAwayOdds})`,
          proj: `Model diff ${projSpread > 0 ? "+" : ""}${projSpread.toFixed(1)}`,
          edgeTxt: `+${ba.spreadEdge.toFixed(1)}%`,
        });
      }

      if (ba.ouRec !== "pass") {
        const isOver = ba.ouRec === "over";
        bets.push({
          type: "O/U",
          edge: ba.ouEdgePct,
          matchup,
          label: `${isOver ? "OVER" : "UNDER"} ${od.overUnder}`,
          line: `Vegas ${od.overUnder} (${isOver ? od.overOdds : od.underOdds})`,
          proj: `Model total ${sim.total} (${isOver ? "+" : ""}${ba.ouEdge.toFixed(1)} pts)`,
          edgeTxt: `+${ba.ouEdgePct.toFixed(1)}%`,
        });
      }
    });

    bets.sort((a, b) => b.edge - a.edge);
    return bets;
  })();

  const debugRows = linesRows
    .filter((row) => row.simResult && row.editedOdds && row.editedOdds.homeMoneyline != null && row.editedOdds.overUnder != null)
    .map((row) => {
      const sim = row.simResult as PredictionResult;
      const od = row.editedOdds as Odds;
      const ba = analyzeBetting(sim, od);
      const mlIsHome = ba.mlValueSide === "home";
      const spreadIsHome = ba.spreadRec === "home";
      const spreadProjection = spreadIsHome
        ? parseFloat(sim.projDiff) + od.spread
        : -(parseFloat(sim.projDiff) + od.spread);
      const totalProbEdge = ba.ouRec === "over"
        ? (ba.pOver - ba.ovIC) * 100
        : ba.ouRec === "under"
          ? (ba.pUnder - ba.unIC) * 100
          : Math.max(ba.pOver - ba.ovIC, ba.pUnder - ba.unIC) * 100;

      return {
        matchup: `${row.game.awayAbbr} @ ${row.game.homeAbbr}`,
        mlModelPct: (mlIsHome ? sim.hWinProb : sim.aWinProb) * 100,
        mlMarketPct: (mlIsHome ? ba.homeImpliedProb : ba.awayImpliedProb) * 100,
        mlEdgePct: ba.mlValuePct,
        mlPick: ba.mlValueSide === "none" ? "PASS" : `${mlIsHome ? row.game.homeAbbr : row.game.awayAbbr} ML`,
        spreadModelPct: (spreadIsHome ? ba.homeCoverProb : ba.awayCoverProb) * 100,
        spreadMarketPct: (spreadIsHome ? ba.spHIC : ba.spAIC) * 100,
        spreadEdgePct: ba.spreadEdge,
        spreadPoints: spreadProjection,
        spreadPick: ba.spreadRec === "pass" ? "PASS" : `${spreadIsHome ? row.game.homeAbbr : row.game.awayAbbr} ${spreadIsHome ? od.spread : -od.spread}`,
        totalModel: parseFloat(sim.total),
        totalMarket: od.overUnder,
        totalPointsEdge: ba.ouEdge,
        totalProbEdgePct: totalProbEdge,
        totalPick: ba.ouRec === "pass" ? "PASS" : ba.ouRec.toUpperCase(),
      };
    })
    .sort((a, b) => Math.max(b.mlEdgePct, b.spreadEdgePct, Math.abs(b.totalProbEdgePct)) - Math.max(a.mlEdgePct, a.spreadEdgePct, Math.abs(a.totalProbEdgePct)));

  const confList = [...new Set(Object.values(TEAMS).map((t) => t.conf))].sort();

  return {
    GAME_TYPES,
    homeTeam,
    setHomeTeam,
    awayTeam,
    setAwayTeam,
    gameType,
    setGameType,
    neutralSite,
    setNeutralSite,
    homeB2B,
    setHomeB2B,
    awayB2B,
    setAwayB2B,
    result,
    setResult,
    running,
    simCount,
    confFilter,
    setConfFilter,
    liveStats,
    kpPaste,
    setKpPaste,
    kpStatus,
    kpError,
    setKpError,
    showKP,
    setShowKP,
    statsUpdated,
    statsSource,
    odds,
    oddsSource,
    manualOdds,
    setManualOdds,
    slateNeutral,
    slateGameType,
    slateDate,
    setSlateDate,
    linesRows,
    schedStatus,
    simsRunning,
    showLines,
    showSingleGameTools,
    setShowSingleGameTools,
    showBulkImport,
    setShowBulkImport,
    bulkPaste,
    bulkStatus,
    bulkError,
    bulkUnmatched,
    editingIdx,
    editFields,
    hasLive,
    hColor,
    aColor,
    hTeam,
    aTeam,
    handleKPImport,
    handleClipboardImport,
    handleStatsFile,
    runSim,
    applyManualOdds,
    handleBulkGames,
    handleRunAllSims,
    saveEdit,
    handleExport,
    handleExportResults,
    resetToEstimates,
    handleSlateGameTypeChange,
    handleSlateNeutralToggle,
    applySlateSettingsToAllGames,
    handleBulkPasteChange,
    clearBulkImport,
    updateLineTime,
    updateLineGameType,
    toggleLineNeutral,
    toggleLineB2B,
    runLineSim,
    toggleEditOdds,
    handleEditFieldChange,
    cancelEditOdds,
    resetEditedOdds,
    simSummaryRows,
    bestBets,
    debugRows,
    confList,
  };
}
