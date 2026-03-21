import { useState, Fragment, useRef, useEffect } from "react";
import { CourtBar, TeamCard, StatBar } from "./components/PredictorBits";
import { GAME_TYPES, KENPOM_NAME_MAP, TEAMS } from "./data/ncaaData";
import { americanToImplied, analyzeBetting, downloadCSV, mlAmerican, predictGame } from "./lib/predictionEngine";
import { parseStatsCSV } from "./lib/statsParser";
import { parseSbookWithDiagnostics } from "./lib/sportsbookParser";

const normalizeTeamKey = value => String(value ?? "")
  .toLowerCase()
  .replace(/&/g, "and")
  .replace(/[(),]/g, " ")
  .replace(/[.'’]/g, "")
  .replace(/\s+/g, " ")
  .trim();

const ESPN_TO_OURS = {
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

const resolveEspnTeam = team => {
  const candidates = [
    team?.abbreviation,
    team?.shortDisplayName,
    team?.displayName,
    team?.location,
    team?.name,
    [team?.location, team?.name].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .map(v => String(v).trim());

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

export default function NCAAPredictor() {
  const statsFileRef = useRef(null);
  const evalPredFileRef = useRef(null);
  const evalResultsFileRef = useRef(null);
  const [homeTeam, setHomeTeam] = useState("DUKE");
  const [awayTeam, setAwayTeam] = useState("KU");
  const [gameType,    setGameType]    = useState("Regular Season");
  const [neutralSite, setNeutralSite] = useState(false);
  const [homeB2B,     setHomeB2B]     = useState(false);
  const [awayB2B,     setAwayB2B]     = useState(false);
  const [result,      setResult]      = useState(null);
  const [running,     setRunning]     = useState(false);
  const [simCount,    setSimCount]    = useState(0);
  const [confFilter,  setConfFilter]  = useState("ALL");
  const [activeTab,   setActiveTab]   = useState("predictor");

  // Stats import (Barttorvik + KenPom)
  const [liveStats,    setLiveStats]    = useState({});
  const [kpPaste,      setKpPaste]      = useState("");
  const [kpStatus,     setKpStatus]     = useState("");
  const [kpError,      setKpError]      = useState("");
  const [showKP,       setShowKP]       = useState(false);
  const [statsUpdated, setStatsUpdated] = useState("");
  const [statsSource,  setStatsSource]  = useState("");

  // Odds
  const [odds,       setOdds]       = useState(null);
  const [oddsSource, setOddsSource] = useState("none");
  const [manualOdds, setManualOdds] = useState({
    homeMoneyline:"-350", awayMoneyline:"+280",
    homeSpread:"-8.5", spreadHomeOdds:"-110", spreadAwayOdds:"-110",
    overUnder:"145.5", overOdds:"-110", underOdds:"-110",
  });

  // Slate sim settings
  const [slateNeutral,  setSlateNeutral]  = useState(false);
  const [slateGameType, setSlateGameType] = useState("Regular Season");
  const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
  const [slateDate, setSlateDate] = useState(localToday);

  // Schedule / export
  const [linesRows,    setLinesRows]    = useState([]);
  const [schedStatus,  setSchedStatus]  = useState("");
  const [schedLoading, setSchedLoading] = useState(false);
  const [simsRunning,  setSimsRunning]  = useState(false);
  const [showLines,    setShowLines]    = useState(false);
  const [showSingleGameTools, setShowSingleGameTools] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkPaste,      setBulkPaste]      = useState("");
  const [bulkStatus,     setBulkStatus]     = useState("");
  const [bulkError,      setBulkError]      = useState("");
  const [bulkUnmatched,  setBulkUnmatched]  = useState([]);
  const [editingIdx,   setEditingIdx]   = useState(null);
  const [editFields,   setEditFields]   = useState({});

  // Results tracker
  const [resultsPaste,    setResultsPaste]    = useState("");
  const [resultsLog,      setResultsLog]      = useState([]);
  const [resultsStatus,   setResultsStatus]   = useState("");
  const [resultsError,    setResultsError]    = useState("");
  const [showResultsPaste,setShowResultsPaste]= useState(false);
  const [predPaste,       setPredPaste]       = useState("");
  const [predLog,         setPredLog]         = useState([]);
  const [showPredPaste,   setShowPredPaste]   = useState(false);
  const [fetchingResults, setFetchingResults] = useState(false);
  const [evalThresholds, setEvalThresholds] = useState({ ml: 0, spr: 0, ou: 0 });
  const [evalCalibration, setEvalCalibration] = useState({ ml: 100, spr: 100, ou: 100 });

  const hasLive = Object.keys(liveStats).length >= 20;

  const getColor = (abbr, which="primary") => {
    return which === "primary" ? (TEAMS[abbr]?.color ?? "#8B0000") : (TEAMS[abbr]?.alt ?? "#CCCCCC");
  };
  const hColor = getColor(homeTeam);
  const aColor = getColor(awayTeam);
  const hTeam  = liveStats[homeTeam] ? { ...TEAMS[homeTeam], ...liveStats[homeTeam] } : TEAMS[homeTeam];
  const aTeam  = liveStats[awayTeam] ? { ...TEAMS[awayTeam], ...liveStats[awayTeam] } : TEAMS[awayTeam];

  // Stats import handler (Barttorvik or KenPom — auto-detected)
  const applyImportedStats = raw => {
    const { stats, count, timestamp, source } = parseStatsCSV(raw);
    setLiveStats(prev => ({ ...prev, ...stats }));
    setStatsUpdated(timestamp);
    setStatsSource(source);
    setKpStatus(`✓ Updated ${count} teams from ${source} · ${timestamp}`);
    setKpPaste("");
    setShowKP(false);
    setResult(null);
  };

  const handleKPImport = () => {
    setKpError("");
    if (!kpPaste.trim()) { setKpError("Paste is empty"); return; }
    try {
      applyImportedStats(kpPaste);
    } catch(e) { setKpError(e.message); }
  };

  const handleClipboardImport = async () => {
    setKpError("");
    setKpStatus("");
    try {
      const raw = await navigator.clipboard.readText();
      if (!raw.trim()) throw new Error("Clipboard is empty");
      applyImportedStats(raw);
    } catch (e) {
      setKpError(e?.message || "Clipboard import failed");
    }
  };

  const handleStatsFile = async e => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setKpError("");
    setKpStatus("");
    try {
      const raw = await file.text();
      if (!raw.trim()) throw new Error("Selected file is empty");
      applyImportedStats(raw);
    } catch (err) {
      setKpError(err?.message || "File import failed");
    }
  };

  const runSim = () => {
    setRunning(true); setSimCount(0); setResult(null);
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
    const nextOdds = {
      source:"manual",
      homeMoneyline:  parseFloat(manualOdds.homeMoneyline),
      awayMoneyline:  parseFloat(manualOdds.awayMoneyline),
      spread:         parseFloat(manualOdds.homeSpread) || -4,
      spreadHomeOdds: parseFloat(manualOdds.spreadHomeOdds),
      spreadAwayOdds: parseFloat(manualOdds.spreadAwayOdds),
      overUnder:      parseFloat(manualOdds.overUnder),
      overOdds:       parseFloat(manualOdds.overOdds),
      underOdds:      parseFloat(manualOdds.underOdds),
    };
    setOdds(nextOdds);
    setOddsSource("manual");
    setResult(predictGame({ homeTeam, awayTeam, gameType, neutralSite, homeB2B, awayB2B, liveStats, odds: nextOdds }));
  };

  // ── Schedule stub (ESPN college basketball) ──────────────────────────────
  const handleLoadSchedule = () => {
    setSchedStatus("NCAA schedule: paste matchups below using the Bulk Game Entry panel, or enter odds manually per game.");
    setLinesRows([]);
    setShowLines(false);
  };

  // ── Sportsbook paste parser ──────────────────────────────────────────────────
  // Handles the real sportsbook format where each field is on its own line,
  // with a rotation number as the anchor. Teams are listed in pairs: away first,
  // home second. Network/time lines are skipped automatically.
  //
  // Example block (one team):
  //   BUFFALO 709
  //   * + 13 - 113
  //   * O 157 ½ - 108
  //   * + 627
  //
  // Also handles simple FORMAT B:  AWAY @ HOME, TIME
  //   e.g. KU @ DUKE, 9:00 PM ET


  const handleBulkGames = () => {
    setBulkError(""); setBulkStatus(""); setBulkUnmatched([]);
    if (!bulkPaste.trim()) { setBulkError("Paste is empty"); return; }
    try {
      const { games, unmatchedTeams } = parseSbookWithDiagnostics(bulkPaste);
      if (!games.length) throw new Error("v2 — No games parsed — use format: AWAY @ HOME (e.g. KU @ DUKE), or paste directly from a sportsbook");
      const allRows = games.map(g => ({
        game:        { homeAbbr: g.homeAbbr || "DUKE", awayAbbr: g.awayAbbr || "KU", gameTime: g.gameTime },
        homeNameRaw: g.homeNameRaw,
        awayNameRaw: g.awayNameRaw,
        homeMatched: g.homeMatched,
        awayMatched: g.awayMatched,
        editedOdds:  g.odds,
        simResult:   null,
        homeB2B:     false,
        awayB2B:     false,
        gameType:    slateGameType,
        neutralSite: slateNeutral,
      }));
      // Only keep rows where both teams resolved
      const rows = allRows.filter(r => r.homeMatched && r.awayMatched);
      const skipped = allRows.length - rows.length;
      setLinesRows(rows);
      setShowLines(true);
      setBulkUnmatched(unmatchedTeams);
      setBulkStatus(`✓ Loaded ${rows.length} game${rows.length!==1?"s":""}${skipped ? ` · ${skipped} game(s) skipped (team not recognized)` : ""}`);
      setBulkPaste("");
      setShowBulkImport(false);
    } catch(e) { setBulkError(e.message); }
  };

  const handleRunAllSims = () => {
    setSimsRunning(true);
    setTimeout(() => {
      setLinesRows(prev => prev.map(r => ({ ...r, simResult: predictGame({ homeTeam:r.game.homeAbbr, awayTeam:r.game.awayAbbr, gameType:r.gameType??"Regular Season", neutralSite:r.neutralSite??false, homeB2B:r.homeB2B, awayB2B:r.awayB2B, liveStats, odds:r.editedOdds }) })));
      setSimsRunning(false);
      setSchedStatus("All simulations complete");
    }, 80);
  };

  // Inline edit helpers
  const startEdit = (idx) => {
    const od = linesRows[idx].editedOdds ?? {};
    setEditFields({
      homeMoneyline: od.homeMoneyline != null ? String(od.homeMoneyline) : "",
      awayMoneyline: od.awayMoneyline != null ? String(od.awayMoneyline) : "",
      spread:        od.spread        != null ? String(od.spread)        : "",
      spreadHomeOdds: od.spreadHomeOdds != null ? String(od.spreadHomeOdds) : "-110",
      spreadAwayOdds: od.spreadAwayOdds != null ? String(od.spreadAwayOdds) : "-110",
      overUnder:     od.overUnder     != null ? String(od.overUnder)     : "",
      overOdds:      od.overOdds      != null ? String(od.overOdds)      : "-110",
      underOdds:     od.underOdds     != null ? String(od.underOdds)     : "-110",
    });
    setEditingIdx(idx);
  };
  const saveEdit = (idx) => {
    const pf = (v, fb=null) => { const n = parseFloat(String(v).replace(/\s/g,"")); return isNaN(n) ? fb : n; };
    const updated = {
      source:"manual",
      homeMoneyline:  pf(editFields.homeMoneyline, 0),
      awayMoneyline:  pf(editFields.awayMoneyline, 0),
      spread:         pf(editFields.spread, -4),
      spreadHomeOdds: pf(editFields.spreadHomeOdds, -110),
      spreadAwayOdds: pf(editFields.spreadAwayOdds, -110),
      overUnder:      pf(editFields.overUnder, 145),
      overOdds:       pf(editFields.overOdds, -110),
      underOdds:      pf(editFields.underOdds, -110),
    };
    setLinesRows(prev => prev.map((r,i) => i===idx ? { ...r, editedOdds:updated, simResult:null } : r));
    setEditingIdx(null);
  };

  const handleExport = () => {
    const today = slateDate;
    const esc = v => `"${String(v).replace(/"/g,'""')}"`;
    const hdrs = [
      "Date","Time","Home","Away",
      "H Win%","A Win%","H Proj","A Proj","Model Total",
      "Vegas H ML","Vegas A ML","H ML (model)","A ML (model)","ML Rec","ML Edge",
      "Vegas Spread","Spread Home Odds","Spread Away Odds","Spread Rec","Recommended Spread Line","Spread Edge",
      "Vegas O/U","Over Odds","Under Odds","O/U Rec","Recommended Total Line","O/U Edge","O/U Edge %",
      "H AdjEM","A AdjEM","H AdjO","H AdjD","A AdjO","A AdjD",
      "Stats Source","Odds Source","LookupKey"
    ];
    const csvRows = linesRows.map(r => {
      const sim = r.simResult ?? predictGame({ homeTeam:r.game.homeAbbr, awayTeam:r.game.awayAbbr, gameType:r.gameType??"Regular Season", neutralSite:r.neutralSite??false, homeB2B:r.homeB2B, awayB2B:r.awayB2B, liveStats, odds:r.editedOdds });
      const od  = r.editedOdds;
      const ba  = od && od.homeMoneyline !== 0 ? analyzeBetting(sim, od) : null;
      const h   = liveStats[r.game.homeAbbr] ? { ...TEAMS[r.game.homeAbbr], ...liveStats[r.game.homeAbbr] } : TEAMS[r.game.homeAbbr];
      const a   = liveStats[r.game.awayAbbr] ? { ...TEAMS[r.game.awayAbbr], ...liveStats[r.game.awayAbbr] } : TEAMS[r.game.awayAbbr];
      const dateYMD = today.replace(/-/g,"");
      const recMlSide = ba?.mlValueSide === "none" || !ba ? "PASS" : ba.mlValueSide.toUpperCase();
      const recSpreadSide = ba ? (ba.spreadRec === "pass" ? "PASS" : ba.spreadRec.toUpperCase()) : "�";
      const recSpreadLine = ba && ba.spreadRec !== "pass" && od?.spread != null ? (ba.spreadRec === "home" ? od.spread : -od.spread) : null;
      const recTotalSide = ba?.ouRec ? ba.ouRec.toUpperCase() : "�";
      const recTotalLine = ba?.ouRec && ba.ouRec !== "pass" && od?.overUnder != null ? od.overUnder : null;
      return [
        today, r.game.gameTime,
        `${r.game.homeAbbr} ${h.name}`, `${r.game.awayAbbr} ${a.name}`,
        (sim.hWinProb*100).toFixed(1)+"%", (sim.aWinProb*100).toFixed(1)+"%",
        sim.hScore, sim.aScore, sim.total,
        od?.homeMoneyline != null ? (od.homeMoneyline>0?"+":"")+od.homeMoneyline : "�",
        od?.awayMoneyline != null ? (od.awayMoneyline>0?"+":"")+od.awayMoneyline : "�",
        mlAmerican(sim.hWinProb), mlAmerican(sim.aWinProb),
        recMlSide,
        ba && ba.mlValueSide !== "none" ? `${ba.mlValuePct>0?"+":""}${ba.mlValuePct.toFixed(1)}%` : "",
        od?.spread != null ? (od.spread>0?"+":"")+od.spread : "�",
        od?.spreadHomeOdds != null ? (od.spreadHomeOdds>0?"+":"")+od.spreadHomeOdds : "�",
        od?.spreadAwayOdds != null ? (od.spreadAwayOdds>0?"+":"")+od.spreadAwayOdds : "�",
        recSpreadSide,
        recSpreadLine != null ? `${recSpreadLine>0?"+":""}${recSpreadLine}` : "",
        ba && ba.spreadRec !== "pass" ? `${ba.spreadEdge>0?"+":""}${ba.spreadEdge.toFixed(1)}%` : "",
        od?.overUnder?.toFixed(1) ?? "�",
        od?.overOdds != null ? (od.overOdds>0?"+":"")+od.overOdds : "�",
        od?.underOdds != null ? (od.underOdds>0?"+":"")+od.underOdds : "�",
        recTotalSide,
        recTotalLine != null ? recTotalLine.toFixed(1) : "",
        ba && ba.ouRec !== "pass" ? `${ba.ouEdge>0?"+":""}${ba.ouEdge.toFixed(1)}` : "",
        ba && ba.ouRec !== "pass" ? `${ba.ouEdgePct>0?"+":""}${ba.ouEdgePct.toFixed(1)}%` : "",
        (h.adjEM>=0?"+":"")+h.adjEM.toFixed(1), (a.adjEM>=0?"+":"")+a.adjEM.toFixed(1),
        h.adjO.toFixed(1), h.adjD.toFixed(1), a.adjO.toFixed(1), a.adjD.toFixed(1),
        hasLive?`${statsSource} live`:"Estimates",
        od?"Sportsbook":"No odds",
        `${dateYMD}${r.game.homeAbbr}${r.game.awayAbbr}`
      ];
    });
    downloadCSV([hdrs.map(esc).join(","), ...csvRows.map(r => r.map(esc).join(","))].join("\n"), `ncaa-predictions-${today}.csv`);
    setSchedStatus(`? Exported ${csvRows.length} games to ncaa-predictions-${today}.csv`);
  };

  const handleExportResults = async () => {
    const dt = new Date(slateDate + "T12:00:00");
    dt.setDate(dt.getDate() - 1);
    const date = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
    const dateYMD = date.replace(/-/g,"");

    setSchedStatus("⏳ Fetching yesterday's scores from ESPN…");

    try {
      const resp = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?dates=${dateYMD}&limit=200`);
      if (!resp.ok) throw new Error(`ESPN ${resp.status}`);
      const data = await resp.json();

      const esc = v => `"${String(v ?? "").replace(/"/g,'""')}"`;
      const hdrs = ["Date","Home","Away","Home Score","Away Score","Winner","Total","LookupKey"];
      const csvRows = [];

      const completed = (data.events || []).filter(e => e.status?.type?.completed);

      for (const event of completed) {
        const comps = event.competitions?.[0]?.competitors || [];
        const homeComp = comps.find(c => c.homeAway === "home");
        const awayComp = comps.find(c => c.homeAway === "away");
        if (!homeComp || !awayComp) continue;

        const homeAbbr = resolveEspnTeam(homeComp.team);
        const awayAbbr = resolveEspnTeam(awayComp.team);

        if (!TEAMS[homeAbbr] || !TEAMS[awayAbbr]) continue;

        const hScore = parseInt(homeComp.score) || 0;
        const aScore = parseInt(awayComp.score) || 0;
        const winner = hScore > aScore ? homeAbbr : awayAbbr;

        csvRows.push([
          date,
          `${homeAbbr} ${TEAMS[homeAbbr].name}`,
          `${awayAbbr} ${TEAMS[awayAbbr].name}`,
          hScore, aScore, winner, hScore + aScore,
          `${dateYMD}${homeAbbr}${awayAbbr}`,
        ]);
      }

      if (!csvRows.length) throw new Error("No recognized games found");
      downloadCSV([hdrs.map(esc).join(","), ...csvRows.map(r => r.map(esc).join(","))].join("\n"), `ncaa-results-${date}.csv`);
      setSchedStatus(`✓ Results CSV for ${date} — ${csvRows.length} games`);
    } catch(e) {
      setSchedStatus(`✗ Could not fetch results: ${e.message}`);
    }
  };

  // Results management
  const parseResultsCSVText = raw => {
    const rows = raw.trim().split(/\r?\n/).map(r => r.split(",").map(s => s.replace(/^"|"$/g,"").trim()));
    if (rows.length < 2) throw new Error("Need header + at least 1 result row");
    const hdr = rows[0].map(h => h.toLowerCase());
    const idx = {
      date: hdr.indexOf("date"),
      home: hdr.indexOf("home"),
      away: hdr.indexOf("away"),
      hs: hdr.indexOf("home score"),
      as: hdr.indexOf("away score"),
    };
    if (Object.values(idx).some(v => v < 0)) throw new Error("Results CSV must include: Date, Home, Away, Home Score, Away Score");
    return rows.slice(1).map(r => ({
      date:r[idx.date],
      home:r[idx.home]?.toUpperCase(),
      away:r[idx.away]?.toUpperCase(),
      hScore:parseInt(r[idx.hs]),
      aScore:parseInt(r[idx.as]),
    })).filter(r => r.date && r.home && r.away && !isNaN(r.hScore) && !isNaN(r.aScore));
  };

  const parsePredictionsCSVText = raw => {
    const lines = raw.trim().split(/\r?\n/);
    if (lines.length < 2) throw new Error("Need header + at least 1 prediction row");
    const rows = lines.map(l => {
      const out = []; let cur = ""; let q = false;
      for (let i=0;i<l.length;i++) {
        const ch = l[i];
        if (ch === '"') q = !q;
        else if (ch === "," && !q) { out.push(cur); cur = ""; }
        else cur += ch;
      }
      out.push(cur);
      return out.map(s => s.replace(/^"|"$/g,"").trim());
    });
    const hdr = rows[0];
    const idx = {
      date: hdr.indexOf("Date"), home: hdr.indexOf("Home"), away: hdr.indexOf("Away"),
      hProj: hdr.indexOf("H Proj"), aProj: hdr.indexOf("A Proj"), total: hdr.indexOf("Model Total"),
      vegaOU: hdr.indexOf("Vegas O/U"), overOdds: hdr.indexOf("Over Odds"), underOdds: hdr.indexOf("Under Odds"),
      ouRec: hdr.indexOf("O/U Rec"), recTotalLine: hdr.indexOf("Recommended Total Line"),
      mlRec: hdr.indexOf("ML Rec"), mlEdge: hdr.indexOf("ML Edge"),
      hML: hdr.indexOf("H ML (model)"), aML: hdr.indexOf("A ML (model)"),
      vegaHML: hdr.indexOf("Vegas H ML"), vegaAML: hdr.indexOf("Vegas A ML"),
      vegaSpread: hdr.indexOf("Vegas Spread"), spreadHomeOdds: hdr.indexOf("Spread Home Odds"), spreadAwayOdds: hdr.indexOf("Spread Away Odds"),
      sprRec: hdr.indexOf("Spread Rec"), recSpreadLine: hdr.indexOf("Recommended Spread Line"),
      hWin: hdr.indexOf("H Win%"), aWin: hdr.indexOf("A Win%"),
    };
    const get = (row, i) => i >= 0 ? row[i] : "";
    return rows.slice(1).map(r => {
      const homeRaw = get(r, idx.home);
      const awayRaw = get(r, idx.away);
      return {
        date:get(r, idx.date), home:homeRaw.split(" ")[0], away:awayRaw.split(" ")[0],
        hProj:parseFloat(get(r, idx.hProj))||null, aProj:parseFloat(get(r, idx.aProj))||null,
        modelTotal:parseFloat(get(r, idx.total))||null,
        vegaOU:parseFloat(get(r, idx.vegaOU))||null, overOdds:parseInt(get(r, idx.overOdds))||null, underOdds:parseInt(get(r, idx.underOdds))||null,
        ouRec:get(r, idx.ouRec), recTotalLine:parseFloat(get(r, idx.recTotalLine))||null,
        ouEdge:parseFloat((get(r, hdr.indexOf("O/U Edge"))||"").replace(/[%+]/g,""))||0,
        ouEdgePct:parseFloat((get(r, hdr.indexOf("O/U Edge %"))||"").replace(/[%+]/g,""))||0,
        hMLmodel:get(r, idx.hML), aMLmodel:get(r, idx.aML),
        vegaHML:get(r, idx.vegaHML), vegaAML:get(r, idx.vegaAML), mlRec:get(r, idx.mlRec), mlEdge:parseFloat((get(r, idx.mlEdge)||"").replace(/[%+]/g,""))||0,
        vegaSpread:parseFloat(get(r, idx.vegaSpread))||null, spreadHomeOdds:parseInt(get(r, idx.spreadHomeOdds))||null, spreadAwayOdds:parseInt(get(r, idx.spreadAwayOdds))||null,
        sprRec:get(r, idx.sprRec), recSpreadLine:parseFloat(get(r, idx.recSpreadLine))||null,
        spreadEdge:parseFloat((get(r, hdr.indexOf("Spread Edge"))||"").replace(/[%+]/g,""))||0,
        hWinPct:parseFloat(get(r, idx.hWin))||null, aWinPct:parseFloat(get(r, idx.aWin))||null,
      };
    }).filter(r => r.date && r.home && r.away);
  };

  const mergeUniqueRows = (current, incoming) => {
    const existing = new Set(current.map(r => r.date+"_"+r.home+"_"+r.away));
    return [...current, ...incoming.filter(r => r.date && r.home && r.away && !existing.has(r.date+"_"+r.home+"_"+r.away))].sort((a,b) => b.date.localeCompare(a.date));
  };

  const handleImportResults = () => {
    setResultsError("");
    try {
      const parsed = parseResultsCSVText(resultsPaste);
      if (!parsed.length) throw new Error("No valid rows found");
      setResultsLog(prev => mergeUniqueRows(prev, parsed));
      setResultsStatus(`Imported ${parsed.length} results`);
      setResultsPaste(""); setShowResultsPaste(false);
    } catch(e) { setResultsError(e.message); }
  };

  const handleImportPredictions = () => {
    setResultsError("");
    try {
      const parsed = parsePredictionsCSVText(predPaste);
      if (!parsed.length) throw new Error("No valid rows found");
      setPredLog(prev => mergeUniqueRows(prev, parsed));
      setResultsStatus(`Imported ${parsed.length} predictions`);
      setPredPaste(""); setShowPredPaste(false);
    } catch(e) { setResultsError(e.message); }
  };

  const handleResultsFileImport = async e => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setResultsError("");
    try {
      const parsed = parseResultsCSVText(await file.text());
      if (!parsed.length) throw new Error("No valid rows found");
      setResultsLog(prev => mergeUniqueRows(prev, parsed));
      setResultsStatus(`Imported ${parsed.length} results from ${file.name}`);
      setShowResultsPaste(false);
    } catch(e2) { setResultsError(e2.message); }
  };

  const handlePredictionsFileImport = async e => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setResultsError("");
    try {
      const parsed = parsePredictionsCSVText(await file.text());
      if (!parsed.length) throw new Error("No valid rows found");
      setPredLog(prev => mergeUniqueRows(prev, parsed));
      setResultsStatus(`Imported ${parsed.length} predictions from ${file.name}`);
      setShowPredPaste(false);
    } catch(e2) { setResultsError(e2.message); }
  };

  const gradedRows = predLog.map(p => {
    const res = resultsLog.find(r => r.home===p.home && r.away===p.away && r.date===p.date);
    if (!res) return { ...p, res:null, graded:false };
    const actualTotal = res.hScore + res.aScore;
    const actualDiff  = res.hScore - res.aScore;
    const payoutForAmerican = odds => odds == null || isNaN(odds) ? null : (odds >= 0 ? odds/100 : 100/Math.abs(odds));

    const mlRecRaw = (p.mlRec || "").toLowerCase();
    const mlRec = mlRecRaw === "home" || mlRecRaw === "away" ? mlRecRaw : (p.hWinPct > 50 ? "home" : "away");
    const mlWin = (mlRec==="home" && res.hScore > res.aScore) || (mlRec==="away" && res.aScore > res.hScore);
    const mlOdds = mlRec==="home" ? parseInt(p.vegaHML||p.hMLmodel||0) : parseInt(p.vegaAML||p.aMLmodel||0);
    const mlPayout = payoutForAmerican(mlOdds);
    const mlROI = mlPayout == null ? null : (mlWin ? mlPayout : -1);

    let sprWin = null, sprROI = null;
    const sprRecL = ((p.sprRec || "")).toLowerCase();
    if (sprRecL && sprRecL !== "pass" && sprRecL !== "�") {
      const isHomeSpr = sprRecL.startsWith("home");
      const spreadNum = p.recSpreadLine ?? parseFloat((p.sprRec||"").match(/[-+]?[\d.]+/)?.[0] ?? 0);
      const coverDiff = isHomeSpr ? actualDiff + spreadNum : (-actualDiff) + spreadNum;
      const sprOdds = isHomeSpr ? p.spreadHomeOdds : p.spreadAwayOdds;
      const sprPayout = payoutForAmerican(sprOdds ?? -110);
      sprWin = coverDiff > 0 ? true : coverDiff < 0 ? false : null;
      sprROI = coverDiff === 0 ? 0 : (sprPayout == null || sprWin === null ? null : (sprWin ? sprPayout : -1));
    }

    let ouWin = null, ouROI = null;
    const ouRecL = ((p.ouRec || "")).toLowerCase();
    if (ouRecL && ouRecL !== "pass" && ouRecL !== "�") {
      const totalLine = p.recTotalLine ?? p.vegaOU;
      const ouOdds = ouRecL === "over" ? p.overOdds : p.underOdds;
      const ouPayout = payoutForAmerican(ouOdds ?? -110);
      ouWin = ouRecL === "over"
        ? (actualTotal > totalLine ? true : actualTotal < totalLine ? false : null)
        : (actualTotal < totalLine ? true : actualTotal > totalLine ? false : null);
      ouROI = actualTotal === totalLine ? 0 : (ouPayout == null || ouWin === null ? null : (ouWin ? ouPayout : -1));
    }
    return { ...p, res, graded:true, actualTotal, actualDiff, mlWin, mlROI, sprWin, sprROI, ouWin, ouROI };
  });

  const marketStats = (arr, key) => {
    const wins = arr.filter(r => r[key]===true).length;
    const losses = arr.filter(r => r[key]===false).length;
    const pushes = arr.filter(r => r[key]===null).length;
    const units = arr.reduce((s,r) => s + (r[key+"ROI"] ?? 0), 0);
    const bets = arr.length;
    return {
      bets,
      wins,
      losses,
      pushes,
      units,
      roiPct: bets ? (units / bets) * 100 : 0,
      hitRate: bets ? (wins / bets) * 100 : 0,
    };
  };

  const qualifiesActual = (row, market) => {
    const threshold = Number(evalThresholds[market] || 0);
    const calibration = Number(evalCalibration[market] || 100) / 100;
    if (market === "ml") {
      const edge = Math.abs(Number(row.mlEdge || 0)) * calibration;
      return row.mlROI !== null && edge >= threshold;
    }
    if (market === "spr") {
      const edge = Math.abs(Number(row.spreadEdge || 0)) * calibration;
      return row.sprROI !== null && edge >= threshold;
    }
    const edge = Math.abs(Number(row.ouEdgePct || 0)) * calibration;
    return row.ouROI !== null && edge >= threshold;
  };

  const summarizeMarket = (graded, market) => {
    const rows = graded.filter(r => r.graded);
    const keys = {
      ml: { win: "mlWin", roi: "mlROI" },
      spr: { win: "sprWin", roi: "sprROI" },
      ou: { win: "ouWin", roi: "ouROI" },
    }[market];
    const betRows = rows.filter(r => r[keys.roi] !== null);
    const actualRows = betRows.filter(r => qualifiesActual(r, market));
    return {
      all: marketStats(betRows, keys.win),
      actual: marketStats(actualRows, keys.win),
    };
  };

  const evalSummary = {
    ml: summarizeMarket(gradedRows, "ml"),
    spr: summarizeMarket(gradedRows, "spr"),
    ou: summarizeMarket(gradedRows, "ou"),
  };

  const agg = graded => {
    const g = graded.filter(r => r.graded);
    const mlRows = g.filter(r=>r.mlROI!==null);
    const sprRows = g.filter(r=>r.sprROI!==null);
    const ouRows = g.filter(r=>r.ouROI!==null);
    const all = [
      ...mlRows.map(r => ({ roi:true, roiROI:r.mlROI })),
      ...sprRows.map(r => ({ roi:true, roiROI:r.sprROI })),
      ...ouRows.map(r => ({ roi:true, roiROI:r.ouROI })),
    ];
    return {
      ml: marketStats(mlRows, "mlWin"),
      spr: marketStats(sprRows, "sprWin"),
      ou: marketStats(ouRows, "ouWin"),
      overall: marketStats(all, "roi"),
    };
  };
  const stats = agg(gradedRows);

  const filteredTeams =
 (excl) => Object.entries(TEAMS).filter(([k]) => k !== excl && (confFilter==="ALL" || TEAMS[k].conf===confFilter));

  const ss = { background:"rgba(255,200,50,0.04)", border:"1px solid rgba(255,200,50,0.18)", color:"#f0e8d0", padding:"8px 10px", borderRadius:4, fontFamily:"'Courier New',monospace", fontSize:12, width:"100%", cursor:"pointer" };
  const card = { background:"rgba(255,200,50,0.025)", border:"1px solid rgba(255,200,50,0.12)", borderRadius:8, padding:16, marginBottom:12 };

  const confList = [...new Set(Object.values(TEAMS).map(t => t.conf))].sort();

  const TeamSelect = ({ value, onChange, excludeKey, label }) => (
    <div>
      <div style={{ fontSize:9, color:"#c8a060", letterSpacing:3, marginBottom:4, fontFamily:"'Courier New',monospace" }}>{label}</div>
      <select value={value} onChange={e=>{ onChange(e.target.value); setResult(null); }} style={ss}>
        {confList.map(conf => {
          const opts = filteredTeams(excludeKey).filter(([k]) => TEAMS[k].conf===conf);
          return opts.length ? <optgroup key={conf} label={conf} style={{ background:"#0f0a00" }}>{opts.map(([k,v]) => <option key={k} value={k}>{k} — {v.name}</option>)}</optgroup> : null;
        })}
      </select>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(170deg,#0a0600 0%,#120900 50%,#0a0600 100%)", color:"#f0e8d0", fontFamily:"'Courier New',monospace", padding:"22px 18px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.15} }
        @keyframes shimmer{ 0%,100%{opacity:0.8} 50%{opacity:1} }
        select option, select optgroup { background:#0f0a00; color:#f0e8d0; }
      `}</style>
      <div style={{ position:"fixed", top:0, left:0, right:0, height:3, zIndex:100, background:"linear-gradient(90deg,#8B0000,#cc3300,#ff6600,#cc3300,#8B0000)", animation:"shimmer 4s ease infinite" }} />

      <div style={{ maxWidth:1100, margin:"0 auto" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom:22, paddingTop:6 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:"#f5c518", boxShadow:"0 0 12px #f5c518", animation:"pulse 2.5s infinite" }} />
            <span style={{ fontSize:9, color:"#f5c518", letterSpacing:5, fontFamily:"'Courier New',monospace" }}>NCAA MBB · ANALYTICS ENGINE · KENPOM ADJ. EFFICIENCY MODEL</span>
          </div>
          <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(28px,6vw,64px)", fontWeight:400, margin:"4px 0 2px", lineHeight:1, letterSpacing:4, color:"#f0e8d0" }}>
            BRACKET <span style={{ color:"#cc3300" }}>BUSTER</span>
          </h1>
          <p style={{ fontSize:9, color:"#b08952", letterSpacing:3, margin:0 }}>ADJ. OFFENSE · ADJ. DEFENSE · TEMPO · KENPOM EM · 100K SIMULATIONS</p>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display:"flex", gap:0, marginBottom:20, borderBottom:"1px solid rgba(255,200,50,0.12)" }}>
          {[["predictor","PREDICTOR"],["results","RESULTS TRACKER"],["modeleval","MODEL EVAL"]].map(([id,label]) => (
            <button key={id} onClick={()=>setActiveTab(id)} style={{ background:"transparent", border:"none", borderBottom:activeTab===id?"2px solid #cc3300":"2px solid transparent", padding:"10px 22px", color:activeTab===id?"#cc3300":"#b28a57", fontSize:10, fontWeight:700, letterSpacing:3, fontFamily:"'Bebas Neue',monospace", cursor:"pointer", transition:"all 0.2s", marginBottom:-1 }}>
              {label}
            </button>
          ))}
        </div>

        {activeTab === "predictor" && <>

        {/* ── Stats Import (Barttorvik + KenPom) ── */}
        <div style={{ ...card, border:`1px solid ${hasLive?"rgba(245,197,24,0.3)":"rgba(255,200,50,0.12)"}` }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10, marginBottom:showKP?14:0 }}>
            <div>
              <div style={{ fontSize:9, color:"#c8a060", letterSpacing:3, marginBottom:5 }}>STATS · IMPORT (BARTTORVIK OR KENPOM)</div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:hasLive?"#f5c518":"#4b5563", boxShadow:hasLive?"0 0 8px #f5c518":"none" }} />
                <span style={{ fontSize:11, color:hasLive?"#f5c518":"#b9925c" }}>
                  {hasLive
                    ? `✓ Live stats · ${statsSource} · ${Object.keys(liveStats).length} teams · ${statsUpdated}`
                    : "Paste Barttorvik or KenPom CSV — source auto-detected from headers"}
                </span>
              </div>
              {kpStatus && !kpError && <div style={{ fontSize:10, color:"#4ade80", marginTop:4 }}>{kpStatus}</div>}
              {kpError  && <div style={{ fontSize:10, color:"#f87171", marginTop:4 }}>⚠ {kpError}</div>}
            </div>
            <button onClick={()=>setShowKP(!showKP)} style={{ background:showKP?"rgba(204,51,0,0.15)":"linear-gradient(135deg,#8B0000,#cc3300)", border:showKP?"1px solid rgba(204,51,0,0.4)":"none", borderRadius:4, padding:"8px 16px", color:showKP?"#f5c518":"#fff", fontSize:10, fontWeight:700, letterSpacing:2, fontFamily:"'Courier New',monospace", cursor:"pointer" }}>
              {showKP ? "▲ HIDE" : hasLive ? "↻ UPDATE" : "⬇ IMPORT"}
            </button>
          </div>

          {showKP && (
            <div style={{ animation:"fadeUp 0.2s ease" }}>
              <input
                ref={statsFileRef}
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={handleStatsFile}
                style={{ display:"none" }}
              />
              {/* Source cards */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
                {/* Barttorvik */}
                <div style={{ background:"rgba(74,222,128,0.04)", border:"1px solid rgba(74,222,128,0.18)", borderRadius:6, padding:"12px 14px", fontSize:11, lineHeight:1.9, color:"#c8a060" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                    <div style={{ fontSize:9, color:"#4ade80", letterSpacing:3, fontWeight:700 }}>BARTTORVIK — FREE ✓</div>
                    <a href="https://barttorvik.com/trank.php" target="_blank" rel="noreferrer" style={{ fontSize:9, color:"#4ade80", textDecoration:"none", border:"1px solid rgba(74,222,128,0.3)", borderRadius:3, padding:"2px 7px", fontFamily:"monospace" }}>OPEN ↗</a>
                  </div>
                  <div>1. Go to <strong style={{ color:"#f0e8d0" }}>barttorvik.com/trank.php</strong></div>
                  <div>2. Set year &amp; filters, then click <strong style={{ color:"#f0e8d0" }}>Export CSV</strong></div>
                  <div>3. Open in a text editor or spreadsheet, copy all rows</div>
                  <div>4. Paste below — imports AdjOE · AdjDE · Tempo + 4 factors</div>
                </div>
                {/* KenPom */}
                <div style={{ background:"rgba(255,200,50,0.03)", border:"1px solid rgba(255,200,50,0.1)", borderRadius:6, padding:"12px 14px", fontSize:11, lineHeight:1.9, color:"#c8a060" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                    <div style={{ fontSize:9, color:"#f5c518", letterSpacing:3, fontWeight:700 }}>KENPOM — SUBSCRIPTION</div>
                    <a href="https://kenpom.com" target="_blank" rel="noreferrer" style={{ fontSize:9, color:"#f5c518", textDecoration:"none", border:"1px solid rgba(245,197,24,0.3)", borderRadius:3, padding:"2px 7px", fontFamily:"monospace" }}>OPEN ↗</a>
                  </div>
                  <div>1. Log in at <strong style={{ color:"#f0e8d0" }}>kenpom.com</strong></div>
                  <div>2. Main page → <strong style={{ color:"#f0e8d0" }}>Export</strong> or copy table</div>
                  <div>3. Include header row (Team, Conf, AdjEM, AdjO, AdjD, AdjT…)</div>
                  <div>4. Paste below — imports AdjO · AdjD · AdjEM · Tempo</div>
                </div>
              </div>
              <textarea
                value={kpPaste}
                onChange={e=>{ setKpPaste(e.target.value); setKpError(""); }}
                placeholder={"Paste Barttorvik CSV or KenPom table here — source auto-detected from column headers\n\nBarttorvik example:\nTeam,adjoe,adjde,adjtempo,efg%,...\nDuke,122.8,92.4,71.2,55.8,...\n\nKenPom example:\nTeam\tConf\tAdjEM\tAdjO\tAdjD\tAdjT\nDuke\tACC\t32.1\t124.2\t92.1\t71.4"}
                style={{ width:"100%", height:140, background:"#0a0600", border:"1px solid rgba(255,200,50,0.18)", borderRadius:4, color:"#f0e8d0", fontSize:11, fontFamily:"monospace", padding:10, resize:"vertical", boxSizing:"border-box", outline:"none" }}
              />
              <div style={{ display:"grid", gridTemplateColumns:"repeat(2,minmax(0,1fr))", gap:8, marginTop:8 }}>
                <button onClick={handleClipboardImport} style={{ padding:"8px 0", background:"rgba(74,222,128,0.08)", border:"1px solid rgba(74,222,128,0.22)", borderRadius:4, color:"#86efac", fontSize:10, fontWeight:700, letterSpacing:2, fontFamily:"'Courier New',monospace", cursor:"pointer" }}>
                  IMPORT FROM CLIPBOARD
                </button>
                <button onClick={()=>statsFileRef.current?.click()} style={{ padding:"8px 0", background:"rgba(255,200,50,0.05)", border:"1px solid rgba(255,200,50,0.16)", borderRadius:4, color:"#f5c518", fontSize:10, fontWeight:700, letterSpacing:2, fontFamily:"'Courier New',monospace", cursor:"pointer" }}>
                  IMPORT FROM FILE
                </button>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:8, marginTop:8 }}>
                <button onClick={handleKPImport} disabled={!kpPaste.trim()} style={{ padding:"10px 0", background:kpPaste.trim()?"linear-gradient(135deg,#8B0000,#cc3300)":"rgba(255,200,50,0.04)", border:kpPaste.trim()?"none":"1px solid rgba(255,200,50,0.08)", borderRadius:4, color:kpPaste.trim()?"#fff":"#9f7847", fontSize:11, fontWeight:700, letterSpacing:3, fontFamily:"'Courier New',monospace", cursor:kpPaste.trim()?"pointer":"not-allowed" }}>
                  ⬆ APPLY TO MODEL
                </button>
                <button onClick={()=>{ setKpPaste(""); setKpError(""); }} style={{ padding:"10px 14px", background:"transparent", border:"1px solid rgba(255,200,50,0.1)", borderRadius:4, color:"#b28a57", fontSize:10, fontFamily:"monospace", cursor:"pointer" }}>CLEAR</button>
              </div>
              {hasLive && (
                <button onClick={()=>{ setLiveStats({}); setStatsUpdated(""); setStatsSource(""); setKpStatus(""); setKpError(""); setShowKP(false); setResult(null); }} style={{ marginTop:8, width:"100%", padding:"7px 0", background:"transparent", border:"1px solid rgba(239,68,68,0.2)", borderRadius:4, color:"#6b2424", fontSize:10, fontFamily:"monospace", cursor:"pointer", letterSpacing:2 }}>✕ RESET TO ESTIMATES</button>
              )}
            </div>
          )}
        </div>

        {/* ── Slate Manager ── */}
        <div style={{ background:"#0a0700", border:"1px solid #1a1200", borderRadius:8, padding:16 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10, marginBottom:schedStatus?12:0 }}>
            <div>
              <div style={{ fontSize:9, fontWeight:700, color:"#b28a57", letterSpacing:3, marginBottom:3 }}>TODAY'S SLATE & EXPORT</div>
              <div style={{ fontSize:10, color:"#2a1a0a" }}>Enter games · add odds · run all sims · export CSV</div>
            </div>
            <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
              <button onClick={()=>setShowBulkImport(!showBulkImport)} style={{ background:showBulkImport?"rgba(245,197,24,0.12)":"#8B0000", border:showBulkImport?"1px solid rgba(245,197,24,0.3)":"none", borderRadius:5, padding:"8px 14px", color:showBulkImport?"#f5c518":"#fff", fontSize:9, fontWeight:700, letterSpacing:2, fontFamily:"monospace", cursor:"pointer" }}>
                {showBulkImport ? "▲ HIDE" : linesRows.length ? "✎ EDIT SLATE" : "⬇ ENTER GAMES"}
              </button>
              {linesRows.length > 0 && (
                <button onClick={handleRunAllSims} disabled={simsRunning} style={{ background:simsRunning?"#0a0700":"#c8a020", border:"none", borderRadius:5, padding:"8px 14px", color:simsRunning?"#9f7847":"#0a0700", fontSize:9, fontWeight:700, letterSpacing:2, fontFamily:"monospace", cursor:simsRunning?"not-allowed":"pointer" }}>
                  {simsRunning?"RUNNING…":"▶ RUN ALL SIMS"}
                </button>
              )}
              {linesRows.some(r=>r.simResult) && (
                <button onClick={handleExport} style={{ background:"#4ade80", border:"none", borderRadius:5, padding:"8px 14px", color:"#0a1207", fontSize:9, fontWeight:700, letterSpacing:2, fontFamily:"monospace", cursor:"pointer" }}>
                  ⬇ PREDICTIONS CSV
                </button>
              )}
              {linesRows.length > 0 && (
                <button onClick={handleExportResults} style={{ background:"rgba(74,144,226,0.15)", border:"1px solid rgba(74,144,226,0.4)", borderRadius:5, padding:"8px 14px", color:"#60a5fa", fontSize:9, fontWeight:700, letterSpacing:2, fontFamily:"monospace", cursor:"pointer" }}>
                  ⬇ RESULTS CSV
                </button>
              )}
            </div>
          </div>

          {/* ── Slate sim settings ── */}
          <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", marginBottom:schedStatus||showBulkImport?12:8, padding:"10px 12px", background:"rgba(255,200,50,0.02)", border:"1px solid rgba(255,200,50,0.1)", borderRadius:6 }}>
            <div style={{ fontSize:9, color:"#b28a57", letterSpacing:2, marginRight:4, whiteSpace:"nowrap" }}>SIM SETTINGS:</div>

            {/* Date picker */}
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:9, color:"#b28a57", whiteSpace:"nowrap" }}>GAME DATE</span>
              <input type="date" value={slateDate} onChange={e=>setSlateDate(e.target.value)}
                style={{ background:"#0a0600", border:"1px solid rgba(255,200,50,0.2)", borderRadius:3, color:"#c8a850", fontSize:9, fontFamily:"monospace", padding:"4px 6px", cursor:"pointer" }} />
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:9, color:"#b28a57", whiteSpace:"nowrap" }}>GAME TYPE</span>
              <select value={slateGameType} onChange={e=>{ 
                const t = e.target.value;
                setSlateGameType(t); 
                if (t !== "Regular Season") setSlateNeutral(true);
                else setSlateNeutral(false);
                setLinesRows(prev=>prev.map(r=>({...r,simResult:null}))); 
              }}
                style={{ background:"#0a0600", border:"1px solid rgba(255,200,50,0.2)", borderRadius:3, color:"#c8a850", fontSize:9, fontFamily:"monospace", padding:"4px 6px", cursor:"pointer" }}>
                {GAME_TYPES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div onClick={()=>{ setSlateNeutral(n=>!n); setLinesRows(prev=>prev.map(r=>({...r,simResult:null}))); }}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 10px", borderRadius:3, border:`1px solid ${slateNeutral?"rgba(245,197,24,0.35)":"rgba(255,200,50,0.12)"}`, background:slateNeutral?"rgba(245,197,24,0.07)":"transparent", cursor:"pointer" }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:slateNeutral?"#f5c518":"#2a1a0a", boxShadow:slateNeutral?"0 0 6px #f5c518":"none", transition:"all 0.2s" }} />
              <span style={{ fontSize:9, color:slateNeutral?"#f5c518":"#b28a57", fontFamily:"monospace", letterSpacing:1, whiteSpace:"nowrap" }}>
                NEUTRAL SITE {slateNeutral?"ON":"OFF"}
              </span>
            </div>
            {linesRows.length > 0 && (
              <button onClick={()=>setLinesRows(prev=>prev.map(r=>({...r,gameType:slateGameType,neutralSite:slateGameType!=="Regular Season"?true:slateNeutral,simResult:null})))}
                style={{ marginLeft:"auto", background:"rgba(245,197,24,0.08)", border:"1px solid rgba(245,197,24,0.25)", borderRadius:3, padding:"4px 10px", color:"#f5c518", fontSize:8, fontWeight:700, fontFamily:"monospace", cursor:"pointer", whiteSpace:"nowrap", letterSpacing:1 }}>
                ↓ APPLY TO ALL GAMES
              </button>
            )}
          </div>

          {showBulkImport && (
            <div style={{ background:"rgba(255,200,50,0.02)", border:"1px solid rgba(255,200,50,0.12)", borderRadius:6, padding:14, marginBottom:12, animation:"fadeUp 0.2s ease" }}>
              <div style={{ fontSize:9, color:"#f5c518", letterSpacing:3, marginBottom:8, fontWeight:700 }}>ENTER GAME SLATE</div>
              <div style={{ fontSize:10, color:"#b9925c", lineHeight:2, marginBottom:10 }}>
                Format: <span style={{ color:"#c8a850", fontFamily:"monospace" }}>AWAY_ABBR @ HOME_ABBR, TIME</span> — one game per line<br/>
                Example: <span style={{ color:"#c8a850", fontFamily:"monospace" }}>KU @ DUKE, 7:00 PM ET</span><br/>
                <span style={{ fontSize:9, color:"#9f7847" }}>Paste directly from a sportsbook, or use: AWAY @ HOME (e.g. KU @ DUKE)</span>
              </div>
              <textarea value={bulkPaste} onChange={e=>{ setBulkPaste(e.target.value); setBulkError(""); setBulkStatus(""); setBulkUnmatched([]); }} placeholder={"KU @ DUKE, 6:00 PM ET\nUNC @ KY, 8:00 PM ET\nGONZ @ PURDUE, 9:30 PM ET"} style={{ width:"100%", height:140, background:"#0a0600", border:"1px solid rgba(255,200,50,0.15)", borderRadius:4, color:"#f0e8d0", fontSize:11, fontFamily:"monospace", padding:10, resize:"vertical", boxSizing:"border-box", outline:"none" }} />
              <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:8, marginTop:8 }}>
                <button onClick={handleBulkGames} disabled={!bulkPaste.trim()} style={{ padding:"9px 0", background:bulkPaste.trim()?"linear-gradient(135deg,#8B0000,#cc3300)":"rgba(255,200,50,0.04)", border:bulkPaste.trim()?"none":"1px solid rgba(255,200,50,0.08)", borderRadius:4, color:bulkPaste.trim()?"#fff":"#9f7847", fontSize:10, fontWeight:700, letterSpacing:3, fontFamily:"monospace", cursor:bulkPaste.trim()?"pointer":"not-allowed" }}>
                  ⬆ LOAD SLATE
                </button>
                <button onClick={()=>{ setBulkPaste(""); setBulkError(""); setBulkStatus(""); setBulkUnmatched([]); }} style={{ padding:"9px 14px", background:"transparent", border:"1px solid rgba(255,200,50,0.1)", borderRadius:4, color:"#b28a57", fontSize:9, fontFamily:"monospace", cursor:"pointer" }}>CLEAR</button>
              </div>
              {bulkStatus && <div style={{ fontSize:10, color:"#4ade80", marginTop:6 }}>{bulkStatus}</div>}
              {bulkError  && <div style={{ fontSize:10, color:"#f87171", marginTop:6 }}>⚠ {bulkError}</div>}
            </div>
          )}

          {bulkUnmatched.length > 0 && (
            <div style={{ marginBottom:12, padding:"10px 12px", background:"rgba(248,113,113,0.05)", border:"1px solid rgba(248,113,113,0.18)", borderRadius:4 }}>
              <div style={{ fontSize:9, color:"#fca5a5", fontWeight:700, letterSpacing:2, marginBottom:6 }}>UNMATCHED TEAM NAMES</div>
              <div style={{ fontSize:10, color:"#f0e8d0", lineHeight:1.8, fontFamily:"monospace" }}>
                {bulkUnmatched.map((item, idx) => (
                  <Fragment key={`${item.name}-${idx}`}>
                    {idx > 0 ? <span style={{ color:"#c8a060" }}> • </span> : null}
                    <span>{item.name}{item.count > 1 ? ` (${item.count})` : ""}</span>
                  </Fragment>
                ))}
              </div>
            </div>
          )}
          {schedStatus && <div style={{ fontSize:10, color:"#b28a57", marginBottom:12 }}>{schedStatus}</div>}

          {showLines && linesRows.length > 0 && (
            <div style={{ overflowX:"auto", borderRadius:5, border:"1px solid #1a1200", marginBottom:16 }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:"monospace", fontSize:10 }}>
                <thead>
                  <tr style={{ background:"#080500" }}>
                    {["Time","Matchup","Type","Neut","H ML","A ML","Spread","O/U Line","H Win%","A Win%","H Proj","A Proj","Total","ML Edge","Spr Edge","O/U Edge","B2B","Sim","Edit"].map(h => (
                      <th key={h} style={{ padding:"6px", textAlign:"left", fontSize:8, color:"#b28a57", letterSpacing:1, borderBottom:"1px solid #1a1200", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {linesRows.map((row, idx) => {
                    const od  = row.editedOdds;
                    const sim = row.simResult;
                    const ba  = od && od.homeMoneyline !== 0 && sim ? analyzeBetting(sim, od) : null;
                    const hasVal = ba && ba.mlValueSide !== "none";
                    return (<Fragment key={idx}>
                      <tr style={{ background:hasVal?"rgba(74,222,128,0.04)":idx%2===0?"#0a0700":"#080500" }}>
                        <td style={{ padding:"5px 6px", borderBottom:"1px solid #120e00", whiteSpace:"nowrap" }}>
                          <input
                            value={row.game.gameTime}
                            onChange={e=>setLinesRows(prev=>prev.map((r,i)=>i===idx?{...r,game:{...r.game,gameTime:e.target.value}}:r))}
                            style={{ background:"transparent", border:"none", borderBottom:`1px solid ${row.game.gameTime==="TBD"?"rgba(245,197,24,0.3)":"rgba(255,200,50,0.1)"}`, color:row.game.gameTime==="TBD"?"#b9925c":"#b28a57", fontSize:9, fontFamily:"monospace", width:64, padding:"1px 2px", cursor:"text" }}
                            placeholder="TBD"
                          />
                        </td>
                        <td style={{ padding:"5px 6px", borderBottom:"1px solid #120e00", whiteSpace:"nowrap" }}>
                          <span style={{ fontWeight:700, color:"#f0e8d0" }}>{row.game.homeAbbr}</span>
                          <span style={{ color:"#2a1a0a", margin:"0 4px" }}>vs</span>
                          <span style={{ fontWeight:700, color:"#f0e8d0" }}>{row.game.awayAbbr}</span>
                        </td>
                        <td style={{ padding:"4px 6px", borderBottom:"1px solid #120e00" }}>
                          <select value={row.gameType??"Regular Season"}
                            onChange={e=>{
                              const t = e.target.value;
                              setLinesRows(prev=>prev.map((r,i)=>i===idx?{...r,gameType:t,neutralSite:t!=="Regular Season"?true:(r.neutralSite??false),simResult:null}:r));
                            }}
                            style={{ background:"#0a0600", border:"1px solid rgba(255,200,50,0.18)", borderRadius:3, color:"#c8a850", fontSize:8, fontFamily:"monospace", padding:"2px 4px", cursor:"pointer", maxWidth:110 }}>
                            {GAME_TYPES.map(g=><option key={g} value={g}>{g}</option>)}
                          </select>
                        </td>
                        <td style={{ padding:"4px 6px", borderBottom:"1px solid #120e00" }}>
                          <button onClick={()=>setLinesRows(prev=>prev.map((r,i)=>i===idx?{...r,neutralSite:!(r.neutralSite??false),simResult:null}:r))}
                            style={{ background:(row.neutralSite??false)?"rgba(245,197,24,0.12)":"transparent", border:`1px solid ${(row.neutralSite??false)?"rgba(245,197,24,0.4)":"rgba(255,200,50,0.15)"}`, borderRadius:3, padding:"2px 8px", color:(row.neutralSite??false)?"#f5c518":"#9f7847", fontSize:8, fontWeight:700, fontFamily:"monospace", cursor:"pointer", whiteSpace:"nowrap" }}>
                            {(row.neutralSite??false)?"NEUT":"HOME"}
                          </button>
                        </td>
                        <td style={{ padding:"5px 6px", borderBottom:"1px solid #120e00", color:od?.homeMoneyline?"#c8a850":"#2a1a0a" }}>{od?.homeMoneyline?(od.homeMoneyline>0?"+":"")+od.homeMoneyline:"—"}</td>
                        <td style={{ padding:"5px 6px", borderBottom:"1px solid #120e00", color:od?.awayMoneyline?"#c8a850":"#2a1a0a" }}>{od?.awayMoneyline?(od.awayMoneyline>0?"+":"")+od.awayMoneyline:"—"}</td>
                        <td style={{ padding:"5px 6px", borderBottom:"1px solid #120e00", color:od?.spread!=null?"#c8a850":"#2a1a0a" }}>{od?.spread!=null?`H${od.spread>0?"+":""}${od.spread}`:"—"}</td>
                        <td style={{ padding:"5px 6px", borderBottom:"1px solid #120e00", color:od?.overUnder?"#c8a850":"#2a1a0a" }}>{od?.overUnder?.toFixed(1)??"—"}</td>
                        <td style={{ padding:"5px 6px", borderBottom:"1px solid #120e00", color:sim?"#4ade80":"#2a1a0a", fontWeight:sim?700:400 }}>{sim?(sim.hWinProb*100).toFixed(1)+"%":"—"}</td>
                        <td style={{ padding:"5px 6px", borderBottom:"1px solid #120e00", color:sim?"#4ade80":"#2a1a0a", fontWeight:sim?700:400 }}>{sim?(sim.aWinProb*100).toFixed(1)+"%":"—"}</td>
                        <td style={{ padding:"5px 6px", borderBottom:"1px solid #120e00", color:sim?"#f5c518":"#2a1a0a" }}>{sim?sim.hScore:"—"}</td>
                        <td style={{ padding:"5px 6px", borderBottom:"1px solid #120e00", color:sim?"#f5c518":"#2a1a0a" }}>{sim?sim.aScore:"—"}</td>
                        <td style={{ padding:"5px 6px", borderBottom:"1px solid #120e00", color:sim?"#cc3300":"#2a1a0a" }}>{sim?sim.total:"—"}</td>
                        <td style={{ padding:"5px 6px", borderBottom:"1px solid #120e00", whiteSpace:"nowrap" }}>
                          {ba?<span style={{ color:hasVal?"#4ade80":"#2a1a0a", fontWeight:hasVal?700:400 }}>{hasVal?`${ba.mlValueSide.toUpperCase()} +${ba.mlValuePct.toFixed(1)}%`:"PASS"}</span>:"—"}
                        </td>
                        <td style={{ padding:"5px 6px", borderBottom:"1px solid #120e00", color:ba&&ba.spreadRec!=="pass"?"#4ade80":"#2a1a0a", fontWeight:ba&&ba.spreadRec!=="pass"?700:400 }}>
                          {ba?(ba.spreadRec==="pass"?"PASS":ba.spreadRec.toUpperCase()):"—"}
                        </td>
                        <td style={{ padding:"5px 6px", borderBottom:"1px solid #120e00", color:ba&&ba.ouRec!=="pass"?"#4ade80":"#2a1a0a", fontWeight:ba&&ba.ouRec!=="pass"?700:400 }}>
                          {ba?(ba.ouRec==="pass"?"PASS":ba.ouRec.toUpperCase()):"—"}
                        </td>
                        <td style={{ padding:"5px 6px", borderBottom:"1px solid #120e00" }}>
                          <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                            {[["homeB2B",row.game.homeAbbr],["awayB2B",row.game.awayAbbr]].map(([field,abbr]) => (
                              <button key={field} onClick={()=>setLinesRows(prev=>prev.map((r,i)=>i===idx?{...r,[field]:!r[field],simResult:null}:r))} style={{ background:row[field]?"rgba(251,113,133,0.12)":"transparent", border:`1px solid ${row[field]?"rgba(251,113,133,0.35)":"#1a1200"}`, borderRadius:3, padding:"2px 5px", color:row[field]?"#fda4af":"#2a1a0a", fontSize:8, fontWeight:700, fontFamily:"monospace", cursor:"pointer", whiteSpace:"nowrap" }}>
                                {abbr} B2B
                              </button>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding:"5px 6px", borderBottom:"1px solid #120e00" }}>
                          <button onClick={()=>setLinesRows(prev=>prev.map((r,i)=>i===idx?{...r,simResult:predictGame({homeTeam:r.game.homeAbbr,awayTeam:r.game.awayAbbr,gameType:r.gameType??"Regular Season",neutralSite:r.neutralSite??false,homeB2B:r.homeB2B,awayB2B:r.awayB2B,liveStats,odds:r.editedOdds})}:r))} style={{ background:sim?"rgba(74,222,128,0.08)":"rgba(245,197,24,0.08)", border:`1px solid ${sim?"#4ade8040":"#f5c51840"}`, borderRadius:4, padding:"2px 8px", color:sim?"#4ade80":"#f5c518", fontSize:9, fontWeight:700, fontFamily:"monospace", cursor:"pointer" }}>
                            {sim?"↻":"▶"}
                          </button>
                        </td>
                        <td style={{ padding:"5px 6px", borderBottom:"1px solid #120e00" }}>
                          <button onClick={()=>{ editingIdx===idx ? setEditingIdx(null) : startEdit(idx); }} style={{ background:editingIdx===idx?"rgba(245,197,24,0.15)":"rgba(255,200,50,0.05)", border:`1px solid ${editingIdx===idx?"rgba(245,197,24,0.4)":"rgba(255,200,50,0.12)"}`, borderRadius:4, padding:"2px 8px", color:editingIdx===idx?"#f5c518":"#c8a060", fontSize:8, fontWeight:700, fontFamily:"monospace", cursor:"pointer" }}>
                            {editingIdx===idx?"✕":"✎ ODDS"}
                          </button>
                        </td>
                      </tr>
                      {editingIdx === idx && (
                        <tr style={{ background:"#080500" }}>
                          <td colSpan={17} style={{ padding:"10px 8px", borderBottom:"1px solid #1a1200" }}>
                            <div style={{ display:"grid", gridTemplateColumns:"repeat(8,1fr)", gap:6, alignItems:"end" }}>
                              {[["H ML","homeMoneyline"],["A ML","awayMoneyline"],["Spread","spread"],["Spr H","spreadHomeOdds"],["Spr A","spreadAwayOdds"],["O/U","overUnder"],["Over","overOdds"],["Under","underOdds"]].map(([label,field]) => (
                                <div key={field}>
                                  <div style={{ fontSize:8, color:"#b28a57", letterSpacing:1, marginBottom:3 }}>{label}</div>
                                  <input value={editFields[field]??""} onChange={e=>setEditFields(p=>({...p,[field]:e.target.value}))} style={{ width:"100%", background:"#0a0600", border:"1px solid rgba(255,200,50,0.18)", borderRadius:3, color:"#f0e8d0", fontFamily:"monospace", fontSize:10, padding:"4px 6px", boxSizing:"border-box", outline:"none" }} />
                                </div>
                              ))}
                            </div>
                            <div style={{ display:"flex", gap:6, marginTop:8 }}>
                              <button onClick={()=>saveEdit(idx)} style={{ background:"linear-gradient(135deg,#065f46,#047857)", border:"none", borderRadius:4, padding:"5px 16px", color:"#d1fae5", fontSize:9, fontWeight:700, letterSpacing:2, fontFamily:"monospace", cursor:"pointer" }}>✓ SAVE</button>
                              <button onClick={()=>setEditingIdx(null)} style={{ background:"transparent", border:"1px solid rgba(255,200,50,0.12)", borderRadius:4, padding:"5px 14px", color:"#b9925c", fontSize:9, fontFamily:"monospace", cursor:"pointer" }}>CANCEL</button>
                              <button onClick={()=>{ setLinesRows(prev=>prev.map((r,i)=>i===idx?{...r,editedOdds:null,simResult:null}:r)); setEditingIdx(null); }} style={{ background:"transparent", border:"1px solid rgba(239,68,68,0.18)", borderRadius:4, padding:"5px 14px", color:"#6b2424", fontSize:9, fontFamily:"monospace", cursor:"pointer" }}>↺ RESET</button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>);
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Sim summary cards */}
          {linesRows.some(r=>r.simResult) && (() => {
            const simmed = linesRows.filter(r=>r.simResult);
            return (
              <div>
                <div style={{ fontSize:8, fontWeight:700, color:"#b28a57", letterSpacing:3, marginBottom:12 }}>◈ SIM RESULTS SUMMARY</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:10 }}>
                  {simmed.map((row,i) => {
                    const sim = row.simResult;
                    const od  = row.editedOdds;
                    const hasOdds = !!(od && od.homeMoneyline != null && od.overUnder != null);
                    const ba  = hasOdds ? analyzeBetting(sim, od) : null;
                    const hP  = sim.hWinProb*100, aP = sim.aWinProb*100;
                    const hasV = ba && (ba.mlValueSide!=="none"||ba.spreadRec!=="pass"||ba.ouRec!=="pass");
                    const h = liveStats[row.game.homeAbbr] ? { ...TEAMS[row.game.homeAbbr], ...liveStats[row.game.homeAbbr] } : TEAMS[row.game.homeAbbr];
                    const a = liveStats[row.game.awayAbbr] ? { ...TEAMS[row.game.awayAbbr], ...liveStats[row.game.awayAbbr] } : TEAMS[row.game.awayAbbr];
                    const emD = h.adjEM - a.adjEM;
                    return (
                      <div key={i} style={{ background:hasV?"rgba(74,222,128,0.04)":"#0a0700", border:`1px solid ${hasV?"rgba(74,222,128,0.2)":"#1a1200"}`, borderRadius:7, padding:13 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                          <div style={{ fontSize:14, fontWeight:700, color:"#f0e8d0", fontFamily:"'Bebas Neue',monospace", letterSpacing:2 }}>
                            {row.game.homeAbbr} <span style={{ color:"#2a1a0a", fontWeight:400 }}>vs</span> {row.game.awayAbbr}
                          </div>
                          <div style={{ display:"flex", gap:4 }}>
                            {row.homeB2B && <span style={{ fontSize:7, background:"rgba(251,113,133,0.12)", border:"1px solid rgba(251,113,133,0.3)", borderRadius:3, padding:"1px 5px", color:"#fda4af" }}>{row.game.homeAbbr} B2B</span>}
                            {row.awayB2B && <span style={{ fontSize:7, background:"rgba(251,113,133,0.12)", border:"1px solid rgba(251,113,133,0.3)", borderRadius:3, padding:"1px 5px", color:"#fda4af" }}>{row.game.awayAbbr} B2B</span>}
                            {hasV && <span style={{ fontSize:7, background:"rgba(74,222,128,0.1)", border:"1px solid rgba(74,222,128,0.25)", borderRadius:3, padding:"1px 5px", color:"#4ade80" }}>VALUE</span>}
                          </div>
                        </div>
                        <div style={{ marginBottom:10 }}>
                          <div style={{ display:"flex", borderRadius:4, overflow:"hidden", height:22 }}>
                            <div style={{ width:`${hP}%`, background:"linear-gradient(90deg,#8B0000,#cc3300)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                              <span style={{ fontSize:10, fontWeight:700, color:"#fff" }}>{hP.toFixed(1)}%</span>
                            </div>
                            <div style={{ flex:1, background:"linear-gradient(90deg,#5a1200,#7a2200)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                              <span style={{ fontSize:10, fontWeight:700, color:"#fda4af" }}>{aP.toFixed(1)}%</span>
                            </div>
                          </div>
                          <div style={{ display:"flex", justifyContent:"space-between", fontSize:8, color:"#2a1a0a", marginTop:2 }}>
                            <span>{row.game.homeAbbr} · {row.game.gameTime}</span>
                            <span>{row.game.awayAbbr} away</span>
                          </div>
                        </div>
                        {!hasOdds && (
                          <div style={{ background:"#080500", borderRadius:5, padding:"8px 10px", border:"1px solid #120e00", marginBottom:6, fontSize:9, color:"#b28a57", textAlign:"center", letterSpacing:1 }}>
                            NO ODDS — USE ✎ ODDS TO ADD LINES AND UNLOCK ANALYSIS
                          </div>
                        )}
                        {hasOdds && ba && (() => {
                          const rows2 = [
                            { l:"ML",   v:ba.mlValueSide!=="none", txt:ba.mlValueSide!=="none"?`${ba.mlValueSide.toUpperCase()} +${ba.mlValuePct.toFixed(1)}%`:"PASS" },
                            { l:"SPR",  v:ba.spreadRec!=="pass",   txt:ba.spreadRec!=="pass"?`+${ba.spreadEdge.toFixed(1)}%`:"PASS" },
                            { l:"O/U",  v:ba.ouRec!=="pass",       txt:ba.ouRec!=="pass"?`${ba.ouRec.toUpperCase()} +${ba.ouEdgePct.toFixed(1)}%`:"PASS" },
                          ];
                          return (
                            <div style={{ background:"#080500", borderRadius:5, padding:"9px 10px", border:"1px solid #120e00", marginBottom:6 }}>
                              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                                <span style={{ fontSize:8, color:"#b28a57", letterSpacing:2, fontWeight:700 }}>EDGE SUMMARY</span>
                                <span style={{ fontSize:9, color:"#c8a850" }}>Proj: {sim.hScore}–{sim.aScore} ({sim.total})</span>
                              </div>
                              {rows2.map(r2 => (
                                <div key={r2.l} style={{ display:"flex", justifyContent:"space-between", padding:"2px 0", borderBottom:"1px solid rgba(255,200,50,0.04)" }}>
                                  <span style={{ fontSize:9, color:"#b28a57" }}>{r2.l}</span>
                                  <span style={{ fontSize:9, fontWeight:700, color:r2.v?"#4ade80":"#2a1a0a", fontFamily:"monospace" }}>{r2.txt}</span>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                        <div style={{ background:"#080500", borderRadius:5, padding:"7px 8px", border:"1px solid #120e00" }}>
                          <div style={{ fontSize:8, color:"#b28a57", marginBottom:3 }}>ADJ. EM EDGE</div>
                          <div style={{ fontSize:15, fontWeight:700, color:emD>0?"#f5c518":"#f87171", fontFamily:"'Courier New',monospace" }}>{emD>0?"+":""}{emD.toFixed(1)}</div>
                          <div style={{ fontSize:8, color:"#2a1a0a", marginTop:2 }}>{row.game.homeAbbr} {h.adjEM>=0?"+":""}{h.adjEM.toFixed(1)} / {row.game.awayAbbr} {a.adjEM>=0?"+":""}{a.adjEM.toFixed(1)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>


        <div style={{ ...card, border:"1px solid rgba(255,200,50,0.12)" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, flexWrap:"wrap" }}>
            <div>
              <div style={{ fontSize:9, color:"#c8a060", letterSpacing:3, marginBottom:4 }}>SINGLE-GAME TOOLS</div>
              <div style={{ fontSize:10, color:"#b9925c" }}>Run one-off sims, compare advanced stats, and enter manual betting lines.</div>
            </div>
            <button onClick={()=>setShowSingleGameTools(v=>!v)} style={{ background:showSingleGameTools?"rgba(245,197,24,0.12)":"rgba(255,200,50,0.06)", border:"1px solid rgba(255,200,50,0.18)", borderRadius:5, padding:"8px 16px", color:showSingleGameTools?"#f5c518":"#c8a060", fontSize:9, fontWeight:700, letterSpacing:2, fontFamily:"monospace", cursor:"pointer" }}>
              {showSingleGameTools ? "CLOSE SINGLE GAME" : "OPEN SINGLE GAME"}
            </button>
          </div>

          {showSingleGameTools && (
            <div style={{ marginTop:16, animation:"fadeUp 0.2s ease" }}>
        {/* ── Team Selection ── */}
        <div style={card}>
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:9, color:"#c8a060", letterSpacing:3, marginBottom:6 }}>FILTER BY CONFERENCE</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
              {["ALL",...confList].map(c => (
                <button key={c} onClick={()=>setConfFilter(c)} style={{ padding:"3px 8px", borderRadius:3, fontSize:9, fontFamily:"monospace", cursor:"pointer", letterSpacing:1, background:confFilter===c?"#8B0000":"rgba(255,200,50,0.04)", color:confFilter===c?"#fff":"#b9925c", border:confFilter===c?"none":"1px solid rgba(255,200,50,0.1)", fontWeight:confFilter===c?700:400 }}>{c}</button>
              ))}
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
            <TeamSelect value={homeTeam} onChange={setHomeTeam} excludeKey={awayTeam} label="HOME TEAM" />
            <TeamSelect value={awayTeam} onChange={setAwayTeam} excludeKey={homeTeam} label="AWAY TEAM" />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
            <TeamCard abbr={homeTeam} side="HOME" liveStats={liveStats} />
            <TeamCard abbr={awayTeam} side="AWAY" liveStats={liveStats} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:10 }}>
            <div>
              <div style={{ fontSize:9, color:"#c8a060", letterSpacing:2, marginBottom:4 }}>GAME TYPE</div>
              <select value={gameType} onChange={e=>{ setGameType(e.target.value); setResult(null); }} style={ss}>
                {GAME_TYPES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div onClick={()=>{ setNeutralSite(!neutralSite); setResult(null); }} style={{ background:neutralSite?"rgba(245,197,24,0.06)":"transparent", border:`1px solid ${neutralSite?"rgba(245,197,24,0.25)":"rgba(255,200,50,0.12)"}`, borderRadius:4, padding:"9px 10px", cursor:"pointer" }}>
              <div style={{ fontSize:9, color:"#c8a060", letterSpacing:2, marginBottom:5 }}>NEUTRAL SITE</div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:11, color:neutralSite?"#f5c518":"#b9925c" }}>No HCA</span>
                <span style={{ fontSize:9, padding:"1px 7px", borderRadius:2, background:neutralSite?"rgba(245,197,24,0.1)":"rgba(255,200,50,0.05)", color:neutralSite?"#f5c518":"#9f7847" }}>{neutralSite?"YES":"NO"}</span>
              </div>
            </div>
            {[[homeTeam,"homeB2B",homeB2B,setHomeB2B],[awayTeam,"awayB2B",awayB2B,setAwayB2B]].map(([abbr,key,val,setter]) => (
              <div key={key} onClick={()=>{ setter(!val); setResult(null); }} style={{ background:val?"rgba(251,113,133,0.06)":"transparent", border:`1px solid ${val?"rgba(251,113,133,0.2)":"rgba(255,200,50,0.12)"}`, borderRadius:4, padding:"9px 10px", cursor:"pointer" }}>
                <div style={{ fontSize:9, color:"#c8a060", letterSpacing:2, marginBottom:5 }}>BACK-TO-BACK</div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:10, color:val?"#fda4af":"#b9925c" }}>{TEAMS[abbr].name.split(" ").pop()}</span>
                  <span style={{ fontSize:9, padding:"1px 6px", borderRadius:2, background:val?"rgba(251,113,133,0.1)":"rgba(255,200,50,0.04)", color:val?"#fda4af":"#9f7847" }}>{val?"YES":"NO"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Stat Comparison ── */}
        <div style={card}>
          <div style={{ fontSize:9, color:"#c8a060", letterSpacing:3, marginBottom:12 }}>
            KENPOM ADVANCED STAT COMPARISON
            {hasLive ? <span style={{ color:"#f5c518", marginLeft:8 }}>· LIVE ✦</span> : <span style={{ color:"#4b5563", marginLeft:8 }}>· ESTIMATES</span>}
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
            <span style={{ fontSize:12, color:hColor, fontFamily:"'Bebas Neue',monospace", letterSpacing:2 }}>{hTeam.name.toUpperCase()}</span>
            <span style={{ fontSize:12, color:aColor, fontFamily:"'Bebas Neue',monospace", letterSpacing:2 }}>{aTeam.name.toUpperCase()}</span>
          </div>
          <StatBar label="ADJUSTED OFFENSE"  hVal={hTeam.adjO}    aVal={aTeam.adjO}    hColor={hColor} aColor={aColor} lo={105} hi={128} />
          <StatBar label="ADJUSTED DEFENSE"  hVal={hTeam.adjD}    aVal={aTeam.adjD}    hColor={hColor} aColor={aColor} lo={85}  hi={108} invert />
          <StatBar label="ADJ. EFF. MARGIN"  hVal={hTeam.adjEM}   aVal={aTeam.adjEM}   hColor={hColor} aColor={aColor} lo={-5}  hi={35} />
          <StatBar label="EFFECTIVE FG%"     hVal={hTeam.efgPct}  aVal={aTeam.efgPct}  hColor={hColor} aColor={aColor} lo={47}  hi={60}  fmt="pct" />
          <StatBar label="TURNOVER %"        hVal={hTeam.tovPct}  aVal={aTeam.tovPct}  hColor={hColor} aColor={aColor} lo={13}  hi={20}  fmt="pct" invert />
          <StatBar label="OFF. REBOUND %"    hVal={hTeam.orbPct}  aVal={aTeam.orbPct}  hColor={hColor} aColor={aColor} lo={25}  hi={42}  fmt="pct" />
          <StatBar label="TEMPO (ADJ POSS)"  hVal={hTeam.tempo}   aVal={aTeam.tempo}   hColor={hColor} aColor={aColor} lo={58}  hi={76} />
          <StatBar label="FREE THROW RATE"   hVal={hTeam.ftr}     aVal={aTeam.ftr}     hColor={hColor} aColor={aColor} lo={25}  hi={50}  fmt="pct" />
        </div>

        {/* ── Run Button ── */}
        <button onClick={runSim} disabled={running} style={{ width:"100%", padding:15, background:running?"rgba(139,0,0,0.06)":"linear-gradient(135deg,#8B0000,#cc3300)", border:running?"1px solid rgba(204,51,0,0.15)":"1px solid rgba(255,100,0,0.4)", borderRadius:4, color:running?"#5a2020":"#fff", fontSize:14, fontWeight:700, letterSpacing:6, fontFamily:"'Bebas Neue',sans-serif", cursor:running?"not-allowed":"pointer", marginBottom:14, transition:"all 0.3s" }}>
          {running ? `SIMULATING  ${simCount.toLocaleString()} / 100,000` : "▶  RUN SIMULATION"}
        </button>

        {/* ── Manual Odds Panel ── */}
        <div style={{ ...card, border:`1px solid ${oddsSource==="manual"&&odds?"rgba(245,197,24,0.2)":"rgba(255,200,50,0.12)"}` }}>
          <div style={{ fontSize:9, color:"#c8a060", letterSpacing:3, marginBottom:12 }}>BETTING LINES (MANUAL)</div>
          <div style={{ fontSize:10, color:"#b9925c", marginBottom:10 }}>Note: Automated ESPN NCAA line fetching is not supported. Enter lines manually from your sportsbook.</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:10 }}>
            {[["HOME ML","homeMoneyline","-350"],["AWAY ML","awayMoneyline","+280"],["H SPREAD","homeSpread","-8.5"],["O/U LINE","overUnder","145.5"],
              ["SPR H ODDS","spreadHomeOdds","-110"],["SPR A ODDS","spreadAwayOdds","-110"],["OVER ODDS","overOdds","-110"],["UNDER ODDS","underOdds","-110"]
            ].map(([label,key,ph]) => (
              <div key={key}>
                <div style={{ fontSize:9, color:"#6a5030", letterSpacing:1, marginBottom:3 }}>{label}</div>
                <input value={manualOdds[key]} onChange={e=>setManualOdds(p=>({...p,[key]:e.target.value}))} placeholder={ph} style={{ background:"rgba(255,200,50,0.03)", border:"1px solid rgba(255,200,50,0.15)", borderRadius:4, padding:"6px 8px", color:"#f0e8d0", fontFamily:"monospace", fontSize:11, width:"100%", boxSizing:"border-box", outline:"none" }} />
              </div>
            ))}
          </div>
          <button onClick={applyManualOdds} style={{ width:"100%", padding:"9px", background:"linear-gradient(135deg,#065f46,#047857)", border:"none", borderRadius:4, color:"#d1fae5", fontSize:11, fontWeight:700, letterSpacing:3, fontFamily:"'Courier New',monospace", cursor:"pointer" }}>
            ✓ APPLY ODDS
          </button>
          {oddsSource==="manual"&&odds&&<div style={{ fontSize:10, color:"#f5c518", marginTop:6 }}>✓ Manual lines applied</div>}
        </div>

        {/* ── Results ── */}
        {result && (
          <div style={{ animation:"fadeUp 0.4s ease" }}>
            {result.isTournament && (
              <div style={{ background:"rgba(245,197,24,0.05)", border:"1px solid rgba(245,197,24,0.2)", borderRadius:5, padding:"8px 14px", marginBottom:12, fontSize:9, color:"#f5c518", letterSpacing:2 }}>
                🏀 TOURNAMENT MODE — Parity adjustment applied · efficiency margins compressed ~8%
              </div>
            )}
            {result.neutralSite && (
              <div style={{ background:"rgba(74,144,226,0.04)", border:"1px solid rgba(74,144,226,0.15)", borderRadius:5, padding:"8px 14px", marginBottom:12, fontSize:9, color:"#60a5fa", letterSpacing:2 }}>
                ⚑ NEUTRAL SITE — Home court advantage removed
              </div>
            )}

            <div style={card}>
              <div style={{ fontSize:9, color:"#c8a060", letterSpacing:3, marginBottom:12 }}>WIN PROBABILITY</div>
              <CourtBar hProb={result.hWinProb} hColor={hColor} aColor={aColor} />
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:6, fontSize:9 }}>
                <span style={{ color:hColor, fontFamily:"'Bebas Neue',monospace", letterSpacing:2 }}>{hTeam.name.toUpperCase()} (HOME)</span>
                <span style={{ color:aColor, fontFamily:"'Bebas Neue',monospace", letterSpacing:2 }}>{aTeam.name.toUpperCase()} (AWAY)</span>
              </div>
            </div>

            <div style={card}>
              <div style={{ fontSize:9, color:"#c8a060", letterSpacing:3, marginBottom:14 }}>PROJECTED SCORE</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", alignItems:"center", gap:14, marginBottom:14 }}>
                <div>
                  <div style={{ fontSize:9, color:hColor, letterSpacing:2, marginBottom:3 }}>{homeTeam}</div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:72, lineHeight:1, color:"#f0e8d0", fontWeight:400 }}>{result.hScore}</div>
                </div>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:9, color:"#b9925c", letterSpacing:2, marginBottom:3 }}>TOTAL</div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:36, color:"#f5c518", fontWeight:400 }}>{result.total}</div>
                  <div style={{ fontSize:9, color:"#6a5030", fontFamily:"monospace", marginTop:2 }}>
                    Pace {result.possessions} · Confidence {Math.round((result.totalConfidence || 0) * 100)}%
                  </div>
                  {result.marketBlend > 0 && (
                    <div style={{ fontSize:8, color:"#c8a060", fontFamily:"monospace", marginTop:2 }}>
                      Raw {result.rawTotal} · Market blend {Math.round(result.marketBlend * 100)}%
                    </div>
                  )}
                  {odds && (() => {
                    const edge = parseFloat(result.total) - odds.overUnder;
                    const rec  = edge > 2 ? "OVER" : edge < -2 ? "UNDER" : "PASS";
                    return (
                      <div style={{ marginTop:6 }}>
                        <div style={{ fontSize:9, color:"#4b5563" }}>VEGAS</div>
                        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, color:"#c8a850" }}>{odds.overUnder.toFixed(1)}</div>
                        <div style={{ fontSize:11, fontWeight:700, color:rec==="OVER"?"#38bdf8":rec==="UNDER"?"#f87171":"#4b5563", fontFamily:"monospace", marginTop:2 }}>{rec}{rec!=="PASS"?` (${edge>0?"+":""}${edge.toFixed(1)})`:""}</div>
                      </div>
                    );
                  })()}
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:9, color:aColor, letterSpacing:2, marginBottom:3 }}>{awayTeam}</div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:72, lineHeight:1, color:"#f0e8d0", fontWeight:400 }}>{result.aScore}</div>
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {[[homeTeam,result.hWinProb,hColor,odds?.homeMoneyline],[awayTeam,result.aWinProb,aColor,odds?.awayMoneyline]].map(([abbr,prob,col,vegaML]) => {
                  const edge = vegaML ? (prob - americanToImplied(vegaML)) * 100 : null;
                  return (
                    <div key={abbr} style={{ background:"rgba(255,200,50,0.03)", border:`1px solid ${col}28`, borderRadius:6, padding:"10px 12px" }}>
                      <div style={{ fontSize:9, color:"#b9925c", letterSpacing:2, marginBottom:8 }}>{abbr} MONEYLINE</div>
                      <div style={{ display:"flex", gap:10, alignItems:"flex-end", flexWrap:"wrap" }}>
                        <div>
                          <div style={{ fontSize:8, color:"#4b5563", marginBottom:2 }}>MODEL</div>
                          <div style={{ fontSize:24, fontWeight:700, color:col, fontFamily:"'Bebas Neue',sans-serif" }}>{mlAmerican(prob)}</div>
                          <div style={{ fontSize:9, color:"#4b5563" }}>{(prob*100).toFixed(1)}% win</div>
                        </div>
                        {vegaML && <>
                          <div style={{ color:"#2d2010", fontSize:20, alignSelf:"center" }}>|</div>
                          <div>
                            <div style={{ fontSize:8, color:"#4b5563", marginBottom:2 }}>VEGAS</div>
                            <div style={{ fontSize:24, fontWeight:700, color:"#c8a850", fontFamily:"'Bebas Neue',sans-serif" }}>{vegaML>0?"+":""}{vegaML}</div>
                            {edge!==null && <div style={{ fontSize:10, fontWeight:700, color:edge>2?"#4ade80":edge<-2?"#f87171":"#b9925c" }}>{edge>0?"+":""}{edge.toFixed(1)}% edge</div>}
                          </div>
                        </>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {odds && (() => {
              const ba = analyzeBetting(result, odds);
              return (
                <div style={{ ...card, border:"1px solid rgba(74,222,128,0.18)" }}>
                  <div style={{ fontSize:9, color:"#5aaa7a", letterSpacing:3, marginBottom:12 }}>BETTING ANALYSIS</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                    {[
                      { label:"MONEYLINE VALUE", rec:ba.mlValueSide==="none"?"PASS":`${ba.mlValueSide.toUpperCase()} ML`, good:ba.mlValueSide!=="none", detail:ba.mlValueSide!=="none"?`+${ba.mlValuePct.toFixed(1)}% edge`:"—" },
                      { label:`SPREAD H${odds.spread>0?"+":""}${odds.spread}`, rec:ba.spreadRec==="pass"?"PASS":ba.spreadRec.toUpperCase(), good:ba.spreadRec!=="pass", detail:ba.spreadRec!=="pass"?`+${ba.spreadEdge.toFixed(1)}% edge`:`Proj diff: ${parseFloat(result.projDiff)>0?"+":""}${result.projDiff} pts` },
                      { label:`O/U ${odds.overUnder}`, rec:ba.ouRec==="pass"?"PASS":ba.ouRec.toUpperCase(), good:ba.ouRec!=="pass", detail:`Model: ${result.total}` },
                    ].map(({label,rec,good,detail}) => (
                      <div key={label} style={{ background:"rgba(255,200,50,0.02)", border:`1px solid ${good?"rgba(74,222,128,0.2)":"rgba(255,200,50,0.1)"}`, borderRadius:5, padding:"10px" }}>
                        <div style={{ fontSize:8, color:"#5aaa7a", letterSpacing:2, marginBottom:7 }}>{label}</div>
                        <div style={{ fontSize:15, fontWeight:700, color:good?"#4ade80":"#4b5563", fontFamily:"'Bebas Neue',sans-serif", letterSpacing:2, marginBottom:5 }}>{rec}</div>
                        <div style={{ fontSize:9, color:good?"#6abe88":"#4b5563" }}>{detail}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop:10, padding:"7px 10px", background:"rgba(245,197,24,0.02)", border:"1px solid rgba(245,197,24,0.08)", borderRadius:4, fontSize:9, color:"#6a5030" }}>
                    ⚠ For entertainment only. NCAA totals are significantly lower than NBA — verify O/U is correct. Edge assumes ~50% efficient market.
                  </div>
                </div>
              );
            })()}

            <div style={card}>
              <div style={{ fontSize:9, color:"#c8a060", letterSpacing:3, marginBottom:10 }}>MODEL INPUTS</div>
              {result.features.map(f => (
                <div key={f.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0", borderBottom:"1px solid rgba(255,200,50,0.05)" }}>
                  <span style={{ fontSize:10, color:"#6a5030" }}>{f.label}</span>
                  <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                    <span style={{ fontSize:10, color:"#f0e8d0", fontFamily:"monospace" }}>{f.detail}</span>
                    <span style={{ fontSize:9, padding:"1px 5px", borderRadius:2, background:f.good?"rgba(245,197,24,0.08)":"rgba(100,100,100,0.1)", color:f.good?"#f5c518":"#4b5563", border:`1px solid ${f.good?"rgba(245,197,24,0.15)":"rgba(100,100,100,0.12)"}` }}>{f.good?"▲":"▼"}</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background:"rgba(255,200,50,0.02)", border:"1px solid rgba(255,200,50,0.06)", borderRadius:4, padding:"10px 14px", fontSize:9, color:"#b9925c", lineHeight:2, marginBottom:14 }}>
              <span style={{ color:"#f5c518" }}>MODEL: </span>
              KenPom Adjusted Efficiency is the strongest predictor — a 10-pt AdjEM gap ≈ ~4% win prob swing. Tournament parity compression ~8%. Home court ≈ +3.5 pts (0 at neutral site). Stats: {hasLive ? <span style={{ color:"#f5c518" }}>{statsSource} live · {statsUpdated}</span> : <span style={{ color:"#4b5563" }}>2024-25 estimates — import Barttorvik or KenPom data to update</span>}.
            </div>
          </div>
        )}


            </div>
          )}
        </div>

          {/* ── Best Bets Summary Card ── */}
          {linesRows.some(r=>r.simResult) && (() => {
            const bets = [];
            linesRows.forEach(row => {
              if (!row.simResult) return;
              const sim = row.simResult;
              const od  = row.editedOdds;
              if (!od || od.homeMoneyline == null || od.overUnder == null) return;
              const ba  = analyzeBetting(sim, od);
              const matchup = `${row.game.awayAbbr} @ ${row.game.homeAbbr}`;

              if (ba.mlValueSide !== "none") {
                const side   = ba.mlValueSide === "home" ? row.game.homeAbbr : row.game.awayAbbr;
                const vegaML = ba.mlValueSide === "home" ? od.homeMoneyline : od.awayMoneyline;
                const modelML = ba.mlValueSide === "home"
                  ? (sim.hWinProb >= 0.5 ? `-${Math.round(sim.hWinProb/(1-sim.hWinProb)*100)}` : `+${Math.round((1-sim.hWinProb)/sim.hWinProb*100)}`)
                  : (sim.aWinProb >= 0.5 ? `-${Math.round(sim.aWinProb/(1-sim.aWinProb)*100)}` : `+${Math.round((1-sim.aWinProb)/sim.aWinProb*100)}`);
                bets.push({
                  type:"ML", edge: ba.mlValuePct, matchup,
                  label: `${side} ML`,
                  line:  `Vegas ${vegaML > 0 ? "+" : ""}${vegaML}`,
                  proj:  `Model ${modelML} (${(ba.mlValueSide==="home"?sim.hWinProb:sim.aWinProb)*100|0}%)`,
                  edgeTxt: `+${ba.mlValuePct.toFixed(1)}%`,
                  color: "#60a5fa",
                });
              }

              if (ba.spreadRec !== "pass") {
                const onHome = ba.spreadRec === "home";
                const side   = onHome ? row.game.homeAbbr : row.game.awayAbbr;
                const vegspr = onHome ? od.spread : -od.spread;
                const projDiff = parseFloat(sim.projDiff);
                const projSpr  = onHome ? projDiff : -projDiff;
                bets.push({
                  type:"SPR", edge: ba.spreadEdge, matchup,
                  label: `${side} ${vegspr > 0 ? "+" : ""}${vegspr}`,
                  line:  `Vegas ${vegspr > 0 ? "+" : ""}${vegspr} (${onHome ? od.spreadHomeOdds : od.spreadAwayOdds})`,
                  proj:  `Model diff ${projSpr > 0 ? "+" : ""}${projSpr.toFixed(1)}`,
                  edgeTxt: `+${ba.spreadEdge.toFixed(1)}%`,
                  color: "#f59e0b",
                });
              }

              if (ba.ouRec !== "pass") {
                const isOver = ba.ouRec === "over";
                bets.push({
                  type:"O/U", edge: ba.ouEdgePct, matchup,
                  label: `${isOver ? "OVER" : "UNDER"} ${od.overUnder}`,
                  line:  `Vegas ${od.overUnder} (${isOver ? od.overOdds : od.underOdds})`,
                  proj:  `Model total ${sim.total} (${isOver ? "+" : ""}${ba.ouEdge.toFixed(1)} pts)`,
                  edgeTxt: `+${ba.ouEdgePct.toFixed(1)}%`,
                  color: "#a78bfa",
                });
              }
            });

            bets.sort((a,b) => b.edge - a.edge);
            if (!bets.length) return null;

            const mlCount  = bets.filter(b=>b.type==="ML").length;
            const sprCount = bets.filter(b=>b.type==="SPR").length;
            const ouCount  = bets.filter(b=>b.type==="O/U").length;
            const typeColors = { ML:"#60a5fa", SPR:"#f59e0b", "O/U":"#a78bfa" };
            const typeBg     = { ML:"rgba(96,165,250,0.08)", SPR:"rgba(245,158,11,0.08)", "O/U":"rgba(167,139,250,0.08)" };
            const typeBorder = { ML:"rgba(96,165,250,0.2)",  SPR:"rgba(245,158,11,0.2)",  "O/U":"rgba(167,139,250,0.2)" };

            return (
              <div style={{ background:"rgba(255,200,50,0.02)", border:"1px solid rgba(245,197,24,0.2)", borderRadius:8, padding:16, marginTop:16 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8, marginBottom:14 }}>
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color:"#f5c518", letterSpacing:4, marginBottom:2 }}>⚡ BEST BETS</div>
                    <div style={{ fontSize:8, color:"#b28a57", letterSpacing:2 }}>{bets.length} ACTIONABLE BET{bets.length!==1?"S":""} · RANKED BY EDGE</div>
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    {mlCount  > 0 && <span style={{ fontSize:8, padding:"2px 8px", borderRadius:3, background:"rgba(96,165,250,0.1)", border:"1px solid rgba(96,165,250,0.25)", color:"#60a5fa", fontFamily:"monospace" }}>{mlCount} ML</span>}
                    {sprCount > 0 && <span style={{ fontSize:8, padding:"2px 8px", borderRadius:3, background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.25)", color:"#f59e0b", fontFamily:"monospace" }}>{sprCount} SPR</span>}
                    {ouCount  > 0 && <span style={{ fontSize:8, padding:"2px 8px", borderRadius:3, background:"rgba(167,139,250,0.1)", border:"1px solid rgba(167,139,250,0.25)", color:"#a78bfa", fontFamily:"monospace" }}>{ouCount} O/U</span>}
                  </div>
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"auto 1fr auto 1fr 1fr auto", gap:"6px 10px", alignItems:"center", marginBottom:10 }}>
                  <div style={{ fontSize:7, color:"#b28a57", letterSpacing:2 }}>#</div>
                  <div style={{ fontSize:7, color:"#b28a57", letterSpacing:2 }}>MATCHUP</div>
                  <div style={{ fontSize:7, color:"#b28a57", letterSpacing:2 }}>BET</div>
                  <div style={{ fontSize:7, color:"#b28a57", letterSpacing:2 }}>LINE</div>
                  <div style={{ fontSize:7, color:"#b28a57", letterSpacing:2 }}>PROJECTION</div>
                  <div style={{ fontSize:7, color:"#b28a57", letterSpacing:2, textAlign:"right" }}>EDGE</div>

                  {bets.map((bet, i) => (
                    <Fragment key={`${bet.type}-${bet.matchup}-${i}`}>
                      <div style={{ fontSize:12, color: i===0?"#f5c518":"#b28a57", fontFamily:"'Bebas Neue',monospace" }}>
                        {i===0?"★":i+1}
                      </div>
                      <div style={{ fontSize:9, color:"#c8a850", fontFamily:"monospace" }}>{bet.matchup}</div>
                      <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                        <span style={{ fontSize:8, padding:"1px 6px", borderRadius:3, background:typeBg[bet.type], border:`1px solid ${typeBorder[bet.type]}`, color:typeColors[bet.type], fontFamily:"monospace", fontWeight:700 }}>{bet.type}</span>
                        <span style={{ fontSize:9, color:"#f0e8d0", fontFamily:"monospace" }}>{bet.label}</span>
                      </div>
                      <div style={{ fontSize:8, color:"#c8a060", fontFamily:"monospace" }}>{bet.line}</div>
                      <div style={{ fontSize:8, color:"#c8a060", fontFamily:"monospace" }}>{bet.proj}</div>
                      <div style={{ fontSize:13, fontWeight:700, color: bet.edge > 8 ? "#4ade80" : bet.edge > 4 ? "#86efac" : "#a3e635", fontFamily:"'Bebas Neue',monospace", letterSpacing:1, textAlign:"right" }}>
                        {bet.edgeTxt}
                      </div>
                    </Fragment>
                  ))}
                </div>

                <div style={{ marginTop:10, fontSize:8, color:"#2a1a0a", letterSpacing:1 }}>
                  ⚠ Edge = model probability minus vig-adjusted implied probability. For entertainment only.
                </div>
              </div>
            );
          })()}

        </> /* end predictor tab */}

        {/* ══════════ RESULTS TRACKER TAB ══════════ */}
        {activeTab === "results" && (
          <div style={{ animation:"fadeUp 0.2s ease" }}>
            {resultsStatus && <div style={{ fontSize:10, color:"#4ade80", marginBottom:10, fontFamily:"monospace" }}>✓ {resultsStatus}</div>}
            {resultsError  && <div style={{ fontSize:10, color:"#f87171", marginBottom:10, fontFamily:"monospace" }}>⚠ {resultsError}</div>}

            {gradedRows.some(r=>r.graded) && (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:16 }}>
                {[{label:"MONEYLINE",s:stats.ml},{label:"SPREAD ATS",s:stats.spr},{label:"OVER / UNDER",s:stats.ou}].map(({label,s}) => (
                  <div key={label} style={{ background:"rgba(255,200,50,0.02)", border:"1px solid rgba(255,200,50,0.12)", borderRadius:8, padding:"14px 16px" }}>
                    <div style={{ fontSize:8, color:"#c8a060", letterSpacing:3, marginBottom:8 }}>{label}</div>
                    <div style={{ fontSize:30, fontWeight:400, color:"#f0e8d0", fontFamily:"'Bebas Neue',monospace", lineHeight:1 }}>{s.wins}-{s.losses}</div>
                    <div style={{ fontSize:10, color:"#c8a060", marginTop:4 }}>{s.winPct.toFixed(1)}% � ROI {s.units>=0?"+":""}{s.units.toFixed(2)}u</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 }}>
              <button onClick={()=>setShowResultsPaste(v=>!v)} style={{ background:showResultsPaste?"rgba(245,197,24,0.12)":"rgba(255,200,50,0.06)", border:"1px solid rgba(255,200,50,0.18)", borderRadius:5, padding:"8px 16px", color:showResultsPaste?"#f5c518":"#c8a060", fontSize:9, fontWeight:700, letterSpacing:2, fontFamily:"monospace", cursor:"pointer" }}>
                {showResultsPaste?"▲ HIDE":"✎ PASTE RESULTS CSV"}
              </button>
              <button onClick={()=>setShowPredPaste(v=>!v)} style={{ background:showPredPaste?"rgba(245,197,24,0.12)":"rgba(255,200,50,0.06)", border:"1px solid rgba(255,200,50,0.18)", borderRadius:5, padding:"8px 16px", color:showPredPaste?"#f5c518":"#c8a060", fontSize:9, fontWeight:700, letterSpacing:2, fontFamily:"monospace", cursor:"pointer" }}>
                {showPredPaste?"▲ HIDE":"✎ PASTE PREDICTIONS CSV"}
              </button>
              {(resultsLog.length>0||predLog.length>0) && (
                <button onClick={()=>{ setResultsLog([]); setPredLog([]); setResultsStatus("Cleared"); }} style={{ background:"rgba(239,68,68,0.07)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:5, padding:"8px 16px", color:"#f87171", fontSize:9, fontWeight:700, letterSpacing:2, fontFamily:"monospace", cursor:"pointer" }}>✕ CLEAR ALL</button>
              )}
            </div>

            {showResultsPaste && (
              <div style={{ background:"rgba(255,200,50,0.02)", border:"1px solid rgba(255,200,50,0.12)", borderRadius:6, padding:14, marginBottom:12, animation:"fadeUp 0.2s ease" }}>
                <div style={{ fontSize:8, color:"#c8a060", letterSpacing:3, marginBottom:8 }}>PASTE RESULTS CSV · columns: Date, Home, Away, Home Score, Away Score</div>
                <textarea value={resultsPaste} onChange={e=>setResultsPaste(e.target.value)} rows={5} style={{ width:"100%", background:"rgba(0,0,0,0.4)", border:"1px solid rgba(255,200,50,0.15)", borderRadius:4, padding:"8px 10px", color:"#f0e8d0", fontFamily:"monospace", fontSize:10, resize:"vertical", boxSizing:"border-box" }} placeholder={"Date,Home,Away,Home Score,Away Score\n2026-03-12,DUKE,KU,78,71"} />
                <div style={{ display:"flex", gap:8, marginTop:8 }}>
                  <button onClick={handleImportResults} style={{ background:"linear-gradient(135deg,#8B0000,#cc3300)", border:"none", borderRadius:4, padding:"7px 16px", color:"#fff", fontSize:9, fontWeight:700, letterSpacing:2, fontFamily:"monospace", cursor:"pointer" }}>⬆ IMPORT</button>
                  <button onClick={()=>{ setResultsPaste(""); setShowResultsPaste(false); }} style={{ background:"transparent", border:"1px solid rgba(255,200,50,0.12)", borderRadius:4, padding:"7px 14px", color:"#b9925c", fontSize:9, fontFamily:"monospace", cursor:"pointer" }}>CANCEL</button>
                </div>
              </div>
            )}

            {showPredPaste && (
              <div style={{ background:"rgba(255,200,50,0.02)", border:"1px solid rgba(255,200,50,0.12)", borderRadius:6, padding:14, marginBottom:12, animation:"fadeUp 0.2s ease" }}>
                <div style={{ fontSize:8, color:"#c8a060", letterSpacing:3, marginBottom:8 }}>PASTE PREDICTIONS CSV · export from the Predictor tab</div>
                <textarea value={predPaste} onChange={e=>setPredPaste(e.target.value)} rows={5} style={{ width:"100%", background:"rgba(0,0,0,0.4)", border:"1px solid rgba(255,200,50,0.15)", borderRadius:4, padding:"8px 10px", color:"#f0e8d0", fontFamily:"monospace", fontSize:10, resize:"vertical", boxSizing:"border-box" }} placeholder="Paste the full ncaa-predictions-YYYY-MM-DD.csv content here…" />
                <div style={{ display:"flex", gap:8, marginTop:8 }}>
                  <button onClick={handleImportPredictions} style={{ background:"linear-gradient(135deg,#8B0000,#cc3300)", border:"none", borderRadius:4, padding:"7px 16px", color:"#fff", fontSize:9, fontWeight:700, letterSpacing:2, fontFamily:"monospace", cursor:"pointer" }}>⬆ IMPORT</button>
                  <button onClick={()=>{ setPredPaste(""); setShowPredPaste(false); }} style={{ background:"transparent", border:"1px solid rgba(255,200,50,0.12)", borderRadius:4, padding:"7px 14px", color:"#b9925c", fontSize:9, fontFamily:"monospace", cursor:"pointer" }}>CANCEL</button>
                </div>
              </div>
            )}

            {predLog.length > 0 ? (
              <div style={{ background:"#0a0700", border:"1px solid #1a1200", borderRadius:8, padding:16 }}>
                <div style={{ fontSize:8, fontWeight:700, color:"#b28a57", letterSpacing:3, marginBottom:12 }}>◈ GAME LOG · {predLog.length} predictions · {gradedRows.filter(r=>r.graded).length} graded</div>
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:"monospace", fontSize:10, minWidth:850 }}>
                    <thead>
                      <tr style={{ borderBottom:"1px solid rgba(255,200,50,0.15)" }}>
                        {["DATE","MATCHUP","PROJ","ACTUAL","TOTAL","V.OU","O/U REC","ML REC","ML","SPR REC","SPR","RESULT"].map(h => (
                          <th key={h} style={{ padding:"6px 8px", textAlign:"left", fontSize:7, color:"#b28a57", letterSpacing:2, fontWeight:700, whiteSpace:"nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {gradedRows.map((row,i) => {
                        const has = row.graded;
                        const wC = v => v===true?"#4ade80":v===false?"#f87171":"#b28a57";
                        return (
                          <tr key={i} style={{ borderBottom:"1px solid rgba(255,200,50,0.04)", background:i%2===0?"transparent":"rgba(255,200,50,0.01)" }}>
                            <td style={{ padding:"6px 8px", color:"#6a5030", whiteSpace:"nowrap" }}>{row.date}</td>
                            <td style={{ padding:"6px 8px", color:"#f0e8d0", fontWeight:700, whiteSpace:"nowrap" }}>{row.home} vs {row.away}</td>
                            <td style={{ padding:"6px 8px", color:"#c8a060", whiteSpace:"nowrap" }}>{row.hProj&&row.aProj?`${row.hProj}–${row.aProj}`:"—"}</td>
                            <td style={{ padding:"6px 8px", color:has?"#f0e8d0":"#2a1a0a", fontWeight:has?700:400, whiteSpace:"nowrap" }}>{has?`${row.res.hScore}–${row.res.aScore}`:"pending"}</td>
                            <td style={{ padding:"6px 8px", color:has?wC(row.ouWin):"#b28a57", whiteSpace:"nowrap" }}>{has?row.actualTotal:"—"}{row.modelTotal?` (m${row.modelTotal})`:""}</td>
                            <td style={{ padding:"6px 8px", color:"#6a5030" }}>{row.vegaOU??"—"}</td>
                            <td style={{ padding:"6px 8px", whiteSpace:"nowrap" }}>
                              <span style={{ color:has?wC(row.ouWin):"#2a1a0a", fontWeight:700 }}>{row.ouRec&&row.ouRec!=="—"?row.ouRec:"PASS"}</span>
                              {has&&row.ouWin!==null&&<span style={{ fontSize:8, marginLeft:4, color:wC(row.ouWin) }}>{row.ouWin?"✓":"✗"}</span>}
                            </td>
                            <td style={{ padding:"6px 8px", color:"#c8a060", whiteSpace:"nowrap" }}>
                              {row.hWinPct?(row.hWinPct>50?`${row.home} ${row.hWinPct}%`:`${row.away} ${row.aWinPct}%`):"—"}
                            </td>
                            <td style={{ padding:"6px 8px", whiteSpace:"nowrap" }}>
                              <span style={{ color:has&&row.mlWin!==null?wC(row.mlWin):"#2a1a0a", fontWeight:700 }}>{has&&row.mlWin!==null?(row.mlWin?"WIN":"LOSS"):"—"}</span>
                              {has&&row.mlWin!==null&&<span style={{ fontSize:8, marginLeft:4, color:wC(row.mlWin) }}>{row.mlROI>=0?"+":""}{row.mlROI.toFixed(2)}u</span>}
                            </td>
                            <td style={{ padding:"6px 8px", color:"#c8a060", whiteSpace:"nowrap", fontSize:9 }}>{row.sprRec&&row.sprRec!=="—"&&row.sprRec!=="PASS"?row.sprRec:"PASS"}</td>
                            <td style={{ padding:"6px 8px", whiteSpace:"nowrap" }}>
                              <span style={{ color:has&&row.sprWin!==null?wC(row.sprWin):"#2a1a0a", fontWeight:700 }}>{has&&row.sprWin!==null?(row.sprWin?"WIN":"LOSS"):"—"}</span>
                              {has&&row.sprWin!==null&&<span style={{ fontSize:8, marginLeft:4, color:wC(row.sprWin) }}>{row.sprROI>=0?"+":""}{row.sprROI.toFixed(2)}u</span>}
                            </td>
                            <td style={{ padding:"6px 8px", whiteSpace:"nowrap" }}>
                              {has?(
                                <span style={{ fontSize:8, padding:"2px 6px", borderRadius:3, background:row.res.hScore>row.res.aScore?"rgba(245,197,24,0.1)":"rgba(255,100,100,0.08)", color:row.res.hScore>row.res.aScore?"#f5c518":"#f87171", border:`1px solid ${row.res.hScore>row.res.aScore?"rgba(245,197,24,0.2)":"rgba(255,100,100,0.2)"}` }}>
                                  {row.res.hScore>row.res.aScore?row.home:row.away} +{Math.abs(row.res.hScore-row.res.aScore)}
                                </span>
                              ):<span style={{ color:"#2a1a0a" }}>—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div style={{ background:"rgba(255,200,50,0.01)", border:"1px solid rgba(255,200,50,0.07)", borderRadius:8, padding:48, textAlign:"center" }}>
                <div style={{ fontSize:36, marginBottom:14, opacity:0.25 }}>🏀</div>
                <div style={{ fontSize:12, color:"#b28a57", letterSpacing:3, fontFamily:"'Bebas Neue',monospace" }}>NO DATA YET</div>
                <div style={{ fontSize:9, color:"#2a1a0a", marginTop:10, lineHeight:2.2 }}>
                  1. Enter games in Predictor → run sims → ⬇ EXPORT CSV<br/>
                  2. Come back here → ✎ PASTE PREDICTIONS CSV<br/>
                  3. After games finish → ✎ PASTE RESULTS CSV manually<br/>
                  4. Model grades itself automatically
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "modeleval" && (
          <div style={{ animation:"fadeUp 0.2s ease" }}>
            {resultsStatus && <div style={{ fontSize:10, color:"#4ade80", marginBottom:10, fontFamily:"monospace" }}>{resultsStatus}</div>}
            {resultsError  && <div style={{ fontSize:10, color:"#f87171", marginBottom:10, fontFamily:"monospace" }}>Warning: {resultsError}</div>}

            <input ref={evalResultsFileRef} type="file" accept=".csv,.txt" onChange={handleResultsFileImport} style={{ display:"none" }} />
            <input ref={evalPredFileRef} type="file" accept=".csv,.txt" onChange={handlePredictionsFileImport} style={{ display:"none" }} />

            <div style={{ display:"grid", gridTemplateColumns:"repeat(2,minmax(0,1fr))", gap:12, marginBottom:16 }}>
              <div style={{ background:"rgba(255,200,50,0.02)", border:"1px solid rgba(255,200,50,0.12)", borderRadius:6, padding:14 }}>
                <div style={{ fontSize:8, color:"#c8a060", letterSpacing:3, marginBottom:8 }}>PREDICTIONS CSV</div>
                <textarea value={predPaste} onChange={e=>setPredPaste(e.target.value)} rows={7} style={{ width:"100%", background:"rgba(0,0,0,0.4)", border:"1px solid rgba(255,200,50,0.15)", borderRadius:4, padding:"8px 10px", color:"#f0e8d0", fontFamily:"monospace", fontSize:10, resize:"vertical", boxSizing:"border-box" }} placeholder="Paste the full predictions CSV content here..." />
                <div style={{ display:"flex", gap:8, marginTop:8 }}>
                  <button onClick={handleImportPredictions} style={{ background:"linear-gradient(135deg,#8B0000,#cc3300)", border:"none", borderRadius:4, padding:"7px 16px", color:"#fff", fontSize:9, fontWeight:700, letterSpacing:2, fontFamily:"monospace", cursor:"pointer" }}>IMPORT PREDICTIONS</button>
                  <button onClick={()=>evalPredFileRef.current?.click()} style={{ background:"rgba(96,165,250,0.08)", border:"1px solid rgba(96,165,250,0.22)", borderRadius:4, padding:"7px 16px", color:"#93c5fd", fontSize:9, fontWeight:700, letterSpacing:2, fontFamily:"monospace", cursor:"pointer" }}>PREDICTIONS CSV</button>
                  <button onClick={()=>setPredPaste("")} style={{ background:"transparent", border:"1px solid rgba(255,200,50,0.12)", borderRadius:4, padding:"7px 14px", color:"#b9925c", fontSize:9, fontFamily:"monospace", cursor:"pointer" }}>CLEAR</button>
                </div>
              </div>

              <div style={{ background:"rgba(255,200,50,0.02)", border:"1px solid rgba(255,200,50,0.12)", borderRadius:6, padding:14 }}>
                <div style={{ fontSize:8, color:"#c8a060", letterSpacing:3, marginBottom:8 }}>RESULTS CSV</div>
                <textarea value={resultsPaste} onChange={e=>setResultsPaste(e.target.value)} rows={7} style={{ width:"100%", background:"rgba(0,0,0,0.4)", border:"1px solid rgba(255,200,50,0.15)", borderRadius:4, padding:"8px 10px", color:"#f0e8d0", fontFamily:"monospace", fontSize:10, resize:"vertical", boxSizing:"border-box" }} placeholder={"Date,Home,Away,Home Score,Away Score\n2026-03-12,DUKE,KU,78,71"} />
                <div style={{ display:"flex", gap:8, marginTop:8 }}>
                  <button onClick={handleImportResults} style={{ background:"linear-gradient(135deg,#8B0000,#cc3300)", border:"none", borderRadius:4, padding:"7px 16px", color:"#fff", fontSize:9, fontWeight:700, letterSpacing:2, fontFamily:"monospace", cursor:"pointer" }}>IMPORT RESULTS</button>
                  <button onClick={()=>evalResultsFileRef.current?.click()} style={{ background:"rgba(74,222,128,0.08)", border:"1px solid rgba(74,222,128,0.22)", borderRadius:4, padding:"7px 16px", color:"#86efac", fontSize:9, fontWeight:700, letterSpacing:2, fontFamily:"monospace", cursor:"pointer" }}>RESULTS CSV</button>
                  <button onClick={()=>setResultsPaste("")} style={{ background:"transparent", border:"1px solid rgba(255,200,50,0.12)", borderRadius:4, padding:"7px 14px", color:"#b9925c", fontSize:9, fontFamily:"monospace", cursor:"pointer" }}>CLEAR</button>
                </div>
              </div>
            </div>

            <div style={{ background:"rgba(255,200,50,0.02)", border:"1px solid rgba(255,200,50,0.12)", borderRadius:8, padding:16, marginBottom:16 }}>
              <div style={{ fontSize:10, color:"#f5c518", letterSpacing:4, marginBottom:12 }}>THRESHOLDS & CALIBRATION</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,minmax(0,1fr))", gap:12 }}>
                {[
                  { key:"ml", label:"MONEYLINE", thresholdLabel:"Edge %", calibrationLabel:"Calibration %" },
                  { key:"spr", label:"SPREAD", thresholdLabel:"Edge %", calibrationLabel:"Calibration %" },
                  { key:"ou", label:"TOTALS", thresholdLabel:"Edge %", calibrationLabel:"Calibration %" },
                ].map(cfg => (
                  <div key={cfg.key} style={{ background:"rgba(0,0,0,0.28)", border:"1px solid rgba(255,200,50,0.08)", borderRadius:6, padding:12 }}>
                    <div style={{ fontSize:8, color:"#c8a060", letterSpacing:3, marginBottom:8 }}>{cfg.label}</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                      <div>
                        <div style={{ fontSize:8, color:"#b28a57", marginBottom:4 }}>{cfg.thresholdLabel}</div>
                        <input value={evalThresholds[cfg.key]} onChange={e=>setEvalThresholds(prev=>({...prev,[cfg.key]:e.target.value}))} style={{ width:"100%", background:"#0a0600", border:"1px solid rgba(255,200,50,0.18)", borderRadius:4, color:"#f0e8d0", fontFamily:"monospace", fontSize:10, padding:"6px 8px", boxSizing:"border-box" }} />
                      </div>
                      <div>
                        <div style={{ fontSize:8, color:"#b28a57", marginBottom:4 }}>{cfg.calibrationLabel}</div>
                        <input value={evalCalibration[cfg.key]} onChange={e=>setEvalCalibration(prev=>({...prev,[cfg.key]:e.target.value}))} style={{ width:"100%", background:"#0a0600", border:"1px solid rgba(255,200,50,0.18)", borderRadius:4, color:"#f0e8d0", fontFamily:"monospace", fontSize:10, padding:"6px 8px", boxSizing:"border-box" }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,minmax(0,1fr))", gap:10, marginBottom:16 }}>
              {[
                { key:"ml", label:"MONEY LINE", color:"#93c5fd" },
                { key:"spr", label:"SPREAD", color:"#f59e0b" },
                { key:"ou", label:"O/U", color:"#a78bfa" },
              ].map(({ key, label, color }) => {
                const s = evalSummary[key];
                const record = `${s.all.wins}-${s.all.losses}-${s.all.pushes}`;
                const actualRecord = `${s.actual.wins}-${s.actual.losses}-${s.actual.pushes}`;
                return (
                  <div key={key} style={{ background:"rgba(255,200,50,0.02)", border:"1px solid rgba(255,200,50,0.12)", borderRadius:8, padding:"14px 16px" }}>
                    <div style={{ fontSize:9, color:color, letterSpacing:3, marginBottom:10 }}>{label}</div>
                    <div style={{ fontSize:24, color:color, fontFamily:"'Bebas Neue',monospace", marginBottom:10 }}>{s.all.units>=0?'+':''}{s.all.units.toFixed(2)}u</div>
                    {[
                      ['Bets', s.all.bets],
                      ['Record', record],
                      ['Hit rate', `${s.all.hitRate.toFixed(1)}%`],
                      ['Units', `${s.all.units>=0?'+':''}${s.all.units.toFixed(2)}u`],
                      ['ROI', `${s.all.roiPct>=0?'+':''}${s.all.roiPct.toFixed(1)}%`],
                      ['Actual Bets', s.actual.bets],
                      ['Actual Record', actualRecord],
                      ['Actual Hit rate', `${s.actual.hitRate.toFixed(1)}%`],
                      ['Actual Units', `${s.actual.units>=0?'+':''}${s.actual.units.toFixed(2)}u`],
                      ['Actual ROI', `${s.actual.roiPct>=0?'+':''}${s.actual.roiPct.toFixed(1)}%`],
                    ].map(([k,v]) => (
                      <div key={k} style={{ display:"flex", justifyContent:"space-between", gap:10, padding:"3px 0", borderBottom:"1px solid rgba(255,200,50,0.05)" }}>
                        <span style={{ fontSize:9, color:"#b28a57" }}>{k}</span>
                        <span style={{ fontSize:9, color:"#f0e8d0", fontFamily:"monospace" }}>{v}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            {gradedRows.filter(r => r.graded).length > 0 ? (
              <div style={{ background:"#0a0700", border:"1px solid #1a1200", borderRadius:8, padding:16 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, flexWrap:"wrap", marginBottom:12 }}>
                  <div style={{ fontSize:8, fontWeight:700, color:"#b28a57", letterSpacing:3 }}>EVALUATED BETS � {gradedRows.filter(r=>r.graded).length} matched games � {stats.overall.bets} total wagers</div>
                  <button onClick={()=>{ setResultsLog([]); setPredLog([]); setResultsStatus("Cleared"); }} style={{ background:"rgba(239,68,68,0.07)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:5, padding:"7px 14px", color:"#f87171", fontSize:9, fontWeight:700, letterSpacing:2, fontFamily:"monospace", cursor:"pointer" }}>CLEAR IMPORTS</button>
                </div>
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:"monospace", fontSize:10, minWidth:980 }}>
                    <thead>
                      <tr style={{ borderBottom:"1px solid rgba(255,200,50,0.15)" }}>
                        {["DATE","MATCHUP","ACTUAL","ML ROI","SPR ROI","OU ROI","MODEL TOTAL","VEGAS O/U","RECS"].map(h => (
                          <th key={h} style={{ padding:"6px 8px", textAlign:"left", fontSize:7, color:"#b28a57", letterSpacing:2, fontWeight:700, whiteSpace:"nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {gradedRows.filter(r=>r.graded).map((row,i) => {
                        const colorFor = v => v == null ? "#b28a57" : v > 0 ? "#4ade80" : v < 0 ? "#f87171" : "#f5c518";
                        return (
                          <tr key={`${row.date}-${row.home}-${row.away}-${i}`} style={{ borderBottom:"1px solid rgba(255,200,50,0.04)", background:i%2===0?"transparent":"rgba(255,200,50,0.01)" }}>
                            <td style={{ padding:"6px 8px", color:"#6a5030", whiteSpace:"nowrap" }}>{row.date}</td>
                            <td style={{ padding:"6px 8px", color:"#f0e8d0", fontWeight:700, whiteSpace:"nowrap" }}>{row.away} @ {row.home}</td>
                            <td style={{ padding:"6px 8px", color:"#f0e8d0", whiteSpace:"nowrap" }}>{row.res.hScore}-{row.res.aScore}</td>
                            <td style={{ padding:"6px 8px", color:colorFor(row.mlROI), whiteSpace:"nowrap" }}>{row.mlROI==null?"PASS":`${row.mlROI>=0?'+':''}${row.mlROI.toFixed(2)}u`}</td>
                            <td style={{ padding:"6px 8px", color:colorFor(row.sprROI), whiteSpace:"nowrap" }}>{row.sprROI==null?"PASS":`${row.sprROI>=0?'+':''}${row.sprROI.toFixed(2)}u`}</td>
                            <td style={{ padding:"6px 8px", color:colorFor(row.ouROI), whiteSpace:"nowrap" }}>{row.ouROI==null?"PASS":`${row.ouROI>=0?'+':''}${row.ouROI.toFixed(2)}u`}</td>
                            <td style={{ padding:"6px 8px", color:"#c8a060", whiteSpace:"nowrap" }}>{row.modelTotal ?? "�"}</td>
                            <td style={{ padding:"6px 8px", color:"#c8a060", whiteSpace:"nowrap" }}>{row.vegaOU ?? "�"}</td>
                            <td style={{ padding:"6px 8px", color:"#c8a060", whiteSpace:"nowrap" }}>{[row.mlRec&&row.mlRec!=="PASS"&&`${row.mlRec.toUpperCase()} ML`, row.sprRec&&row.sprRec!=="PASS"&&`${row.sprRec.toUpperCase()} SPR`, row.ouRec&&row.ouRec!=="PASS"&&`${row.ouRec.toUpperCase()} ${row.recTotalLine ?? row.vegaOU}`].filter(Boolean).join(" � ") || "No actionable bets"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div style={{ background:"rgba(255,200,50,0.01)", border:"1px solid rgba(255,200,50,0.07)", borderRadius:8, padding:48, textAlign:"center" }}>
                <div style={{ fontSize:36, marginBottom:14, opacity:0.25 }}>ROI</div>
                <div style={{ fontSize:12, color:"#b28a57", letterSpacing:3, fontFamily:"'Bebas Neue',monospace" }}>WAITING FOR FILES</div>
                <div style={{ fontSize:9, color:"#2a1a0a", marginTop:10, lineHeight:2.2 }}>
                  1. Import the predictions CSV exported by this app.<br/>
                  2. Import the matching results CSV after games finish.<br/>
                  3. The tab calculates realized ROI automatically from the model recommendations.
                </div>
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
}





