import { KENPOM_NAME_MAP, TEAMS } from "../data/ncaaData";
import type { ImportedTeamStats, ParsedStatsResult } from "../types";

function resolveImportedTeamAbbr(rawName: string): string | undefined {
  const normalized = rawName
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\*/g, "")
    .trim();

  const compactWhitespace = normalized.replace(/\s+/g, " ").trim();
  const noPeriods = compactWhitespace.replace(/\./g, "");
  const noApostrophes = compactWhitespace.replace(/'/g, "");
  const strippedPunctuation = compactWhitespace.replace(/[.,()]/g, "").trim();

  const candidates = new Set<string>([
    normalized,
    compactWhitespace,
    noPeriods,
    noPeriods.replace(/'/g, ""),
    noApostrophes,
    strippedPunctuation,
  ]);

  const compact = strippedPunctuation;
  if (/\bst\.?$/.test(compactWhitespace)) {
    candidates.add(compactWhitespace.replace(/\bst\.?$/, "state").trim());
    candidates.add(compact.replace(/\bst$/, "state").trim());
  }
  if (/^st\.?\s/.test(compactWhitespace)) {
    candidates.add(compactWhitespace.replace(/^st\.?\s/, "saint ").trim());
    candidates.add(compact.replace(/^st\s/, "saint ").trim());
  }
  if (compact.includes("&")) {
    candidates.add(compact.replace(/\s*&\s*/g, " and ").replace(/\s+/g, " ").trim());
  }
  if (compact.includes(" and ")) {
    candidates.add(compact.replace(/\sand\s/g, " & ").trim());
  }
  if (compact.includes(" nc ")) {
    candidates.add(compact.replace(/\bnc\b/g, "north carolina").trim());
  }
  if (compact.startsWith("nc ")) {
    candidates.add(compact.replace(/^nc\b/, "north carolina").trim());
  }

  for (const candidate of candidates) {
    const abbr = KENPOM_NAME_MAP[candidate];
    if (abbr) return abbr;
  }

  return undefined;
}

export function parseStatsCSV(raw: string): ParsedStatsResult {
  const now   = new Date().toLocaleString("en-US", { month:"short", day:"numeric", hour:"numeric", minute:"2-digit" });
  const rawLines = raw.trim().split(/\r?\n/).filter(l => l.trim() && !l.startsWith(",,"));
  const startIndex = rawLines.findIndex((line) =>
    /^team(?:\t|,)/i.test(line) ||
    /^rk\tteam(?:\t|$)/i.test(line) ||
    /^\d+\t[A-Za-z]/.test(line)
  );
  const lines = startIndex >= 0 ? rawLines.slice(startIndex) : rawLines;
  if (lines.length < 2) throw new Error("Paste appears empty — copy all rows including the header");

  // ── Detect new Barttorvik multi-line block format ──────────────────────────
  // New format has no header row — each team is a ~22-line block starting with
  // "RANK\tTeamName" followed by seed/conf line then alternating rank\tvalue rows.
  // Detect: first non-empty line matches /^\d+\t[A-Za-z]/ with no numeric suffix
  const firstDataLine = /^rk\t/i.test(lines[0] ?? "") ? (lines[1] ?? "") : (lines[0] ?? "");
  const isNewBart = /^\d+\t[A-Za-z]/.test(firstDataLine) && !firstDataLine.match(/^\d+\t\d/);
  if (isNewBart) {
    const result: Record<string, ImportedTeamStats> = {};
    const unmatched = new Map<string, number>();
    let updated  = 0;
    let i = 0;
    while (i < lines.length) {
      const m = lines[i].match(/^(\d+)\t(.+)$/);
      // Also handle repeated header rows Barttorvik inserts every 25 rows
      if (lines[i].match(/^Rk\t/)) { i++; continue; }
      if (m && /[A-Za-z]/.test(m[2]) && !/^\d/.test(m[2].trim())) {
        const rowParts = lines[i].split('\t');
        const hasInlineMeta = rowParts.length >= 5;
        const name = (hasInlineMeta ? rowParts[1] : m[2]).trim().toLowerCase()
          .replace(/\s*\n.*/,"")           // strip anything after newline
          .replace(/\*/g,"")               // strip asterisks
          .trim();
        const adjOOffset = hasInlineMeta ? 1 : 2;
        const blockSize = hasInlineMeta ? 21 : 22;
        // Each block: line offsets from block start
        // 0: rank\tname   1: seed\tconf\t...   2: AdjOE
        // 3: AdjOE_rank\tAdjDE   4: AdjDE_rank\tBarthag
        // 5: Barthag_rank\tEFG%  6: EFG%_rank\tEFGD%
        // 7: EFGD%_rank\tTOR     8: TOR_rank\tTORD
        // 9: TORD_rank\tORB     10: ORB_rank\tDRB
        // 11: DRB_rank\tFTR     12: FTR_rank\tFTRD
        // 19: 3PRD_rank\tAdjT   20: AdjT_rank\tWAB
        const val = (offset: number): number => {
          const l = lines[i + offset];
          if (!l) return NaN;
          const parts = l.split('\t');
          return parts.length > 1 ? parseFloat(parts[1]) : parseFloat(parts[0]);
        };
        const adjO  = parseFloat((lines[i + adjOOffset] || ""));
        const adjD  = val(adjOOffset + 1);
        const efg   = val(adjOOffset + 3);
        const tor   = val(adjOOffset + 5);
        const orb   = val(adjOOffset + 7);
        const ftr   = val(adjOOffset + 9);
        const tempo = val(adjOOffset + 17);
        const adjEM = +(adjO - adjD).toFixed(1);

        const abbr = resolveImportedTeamAbbr(name);
        if (abbr && TEAMS[abbr] && !isNaN(adjO) && !isNaN(adjD)) {
          const fb = TEAMS[abbr];
          result[abbr] = {
            adjO:   +adjO.toFixed(1),
            adjD:   +adjD.toFixed(1),
            adjEM,
            tempo:  isNaN(tempo) ? fb.tempo : +tempo.toFixed(1),
            efgPct: isNaN(efg)   ? fb.efgPct : +efg.toFixed(1),
            tovPct: isNaN(tor)   ? fb.tovPct : +tor.toFixed(1),
            orbPct: isNaN(orb)   ? fb.orbPct : +orb.toFixed(1),
            ftr:    isNaN(ftr)   ? fb.ftr    : +ftr.toFixed(1),
            lastUpdated: `Barttorvik · ${now}`,
          };
          updated++;
        } else if (!abbr || !TEAMS[abbr]) {
          unmatched.set(name, (unmatched.get(name) ?? 0) + 1);
        }
        i += blockSize;
        continue;
      }
      i++;
    }
    if (updated === 0) throw new Error("No teams matched in new Barttorvik format — check your paste");
    return {
      stats: result,
      count: updated,
      timestamp: now,
      source: "Barttorvik",
      unmatchedTeams: [...unmatched.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    };
  }

  // ── Original CSV / TSV format (Barttorvik old export or KenPom) ───────────
  const delim   = lines[0].includes("\t") ? "\t" : ",";
  const headers = lines[0].split(delim).map(h => h.trim().replace(/"/g,"").toLowerCase());

  const col = (...names: string[]): number => {
    for (const n of names) {
      const i = headers.findIndex(h => h === n.toLowerCase());
      if (i >= 0) return i;
    }
    return -1;
  };

  // Detect source: Barttorvik uses "adjoe"/"adjde", KenPom uses "adjo"/"adjd"
  const isBart = headers.some(h => h === "adjoe" || h === "adjde");
  const source = isBart ? "Barttorvik" : "KenPom";

  const iTeam = col("team");
  // Barttorvik columns
  const iAdjO_b = col("adjoe");
  const iAdjD_b = col("adjde");
  const iAdjT_b = col("adjtempo", "barthag pace", "tempo");
  const iEFG    = col("efg%", "efg_o", "efg pct", "efg%_o", "efgpct");
  const iTOV    = col("tov%", "to%", "tovpct", "tov_o");
  const iORB    = col("orb%", "or%", "orbpct", "orb");
  const iFTR    = col("ftr", "ft rate", "ftrate");
  // KenPom columns
  const iAdjO_k = col("adjo", "adj o", "adj_o");
  const iAdjD_k = col("adjd", "adj d", "adj_d");
  const iAdjEM  = col("adjem", "adj em", "adj_em");
  const iAdjT_k = col("adjt", "adj t", "adj_t");

  const iAdjO = isBart ? iAdjO_b : iAdjO_k;
  const iAdjD = isBart ? iAdjD_b : iAdjD_k;
  const iAdjT = isBart ? iAdjT_b : iAdjT_k;

  if (iTeam < 0) throw new Error("Could not find Team column — make sure you copied the header row");
  if (iAdjO < 0 && iAdjD < 0) throw new Error(
    `Could not find AdjO/AdjD columns (detected: ${source}). ` +
    `For Barttorvik use the T-Rank table; for KenPom use the summary table.`
  );

  const result: Record<string, ImportedTeamStats>  = {};
  const unmatched = new Map<string, number>();
  let updated   = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delim).map(c => c.trim().replace(/"/g,""));
    if (cols.length < 3) continue;
    const rawName = (cols[iTeam] ?? "").toLowerCase().replace(/\*/g,"").trim();
    const abbr    = resolveImportedTeamAbbr(rawName);
    if (!abbr || !TEAMS[abbr]) {
      unmatched.set(rawName, (unmatched.get(rawName) ?? 0) + 1);
      continue;
    }

    const p = (idx: number, fallback: number | null): number | null => {
      if (idx < 0 || !cols[idx] || cols[idx] === "") return fallback;
      const v = parseFloat(cols[idx]);
      return isNaN(v) ? fallback : v;
    };
    // Barttorvik eFG% is stored as a decimal (0.534) — convert if < 1
    const toPercent = (v: number | null, fb: number): number => v == null ? fb : v < 1 ? +(v * 100).toFixed(1) : +v.toFixed(1);

    const fb    = TEAMS[abbr];
    const adjO  = p(iAdjO, fb.adjO);
    const adjD  = p(iAdjD, fb.adjD);
    const adjEM = iAdjEM >= 0 ? (p(iAdjEM, null) ?? +(adjO - adjD).toFixed(1)) : +(adjO - adjD).toFixed(1);
    const tempo = p(iAdjT, fb.tempo);

    const efgRaw = isBart ? p(iEFG, null) : null;
    const tovRaw = isBart ? p(iTOV, null) : null;
    const orbRaw = isBart ? p(iORB, null) : null;
    const ftrRaw = isBart ? p(iFTR, null) : null;

    result[abbr] = {
      adjO:   +adjO.toFixed(1),
      adjD:   +adjD.toFixed(1),
      adjEM:  +adjEM.toFixed(1),
      tempo:  +tempo.toFixed(1),
      efgPct: efgRaw != null ? toPercent(efgRaw, fb.efgPct) : fb.efgPct,
      tovPct: tovRaw != null ? toPercent(tovRaw, fb.tovPct) : fb.tovPct,
      orbPct: orbRaw != null ? toPercent(orbRaw, fb.orbPct) : fb.orbPct,
      ftr:    ftrRaw != null ? toPercent(ftrRaw, fb.ftr)    : fb.ftr,
      lastUpdated: `${source} · ${now}`,
    };
    updated++;
  }

  if (updated === 0) throw new Error(
    `No teams matched (${source} format detected). Check that team names are spelled correctly in the first column.`
  );
  return {
    stats: result,
    count: updated,
    timestamp: now,
    source,
    unmatchedTeams: [...unmatched.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
  };
}
