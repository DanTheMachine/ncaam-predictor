import { KENPOM_NAME_MAP, TEAMS } from "../data/ncaaData";
import type { SharpGameSignal } from "../types";

const parsePct = (value: string): number => {
  const cleaned = value.replace(/%/g, "").trim();
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseSignedNumber = (value: string): number | null => {
  const cleaned = value.replace(/[^\d+.-]/g, "").trim();
  if (!cleaned) return null;
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeTeamName = (value: string): string =>
  value
    .replace(/^\(\d+\)\s*/, "")
    .replace(/\s+/g, " ")
    .trim();

const resolveTeamAbbr = (value: string): string | null => {
  const raw = normalizeTeamName(value);
  const lower = raw.toLowerCase();
  const candidates = [
    lower,
    lower.replace(/\./g, ""),
    lower.replace(/[.’']/g, ""),
    lower.replace(/\./g, "").replace(/[’']/g, ""),
    lower.replace(/\bst\.?$/, "state"),
    lower.replace(/^st\.?\s/, "saint "),
  ];

  for (const candidate of candidates) {
    const abbr = KENPOM_NAME_MAP[candidate];
    if (abbr && TEAMS[abbr]) return abbr;
  }

  return null;
};

const isDirectionRow = (line: string): boolean => /^[▲▼↺]$/.test(line.trim());

const isHeaderRow = (line: string): boolean =>
  line.toLowerCase().includes("spread") &&
  line.toLowerCase().includes("handle") &&
  line.toLowerCase().includes("bets") &&
  line.toLowerCase().includes("money");

const extractTeamRow = (cols: string[]) => {
  for (let teamIndex = 0; teamIndex <= 1 && teamIndex < cols.length; teamIndex++) {
    const abbr = resolveTeamAbbr(cols[teamIndex]);
    if (abbr && cols.length >= teamIndex + 10) {
      return { abbr, baseIndex: teamIndex };
    }
  }
  return null;
};

export function parseSharpSignals(raw: string): SharpGameSignal[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const teamRows = lines.filter((line) => !isHeaderRow(line) && !isDirectionRow(line));
  const signals: SharpGameSignal[] = [];

  for (let i = 0; i + 1 < teamRows.length; i += 2) {
    const awayCols = teamRows[i].split("\t").map((part) => part.trim());
    const homeCols = teamRows[i + 1].split("\t").map((part) => part.trim());
    if (awayCols.length < 10 || homeCols.length < 10) continue;

    const awayRow = extractTeamRow(awayCols);
    const homeRow = extractTeamRow(homeCols);
    if (!awayRow || !homeRow) continue;

    signals.push({
      source: "VSiN",
      matchup: `${awayRow.abbr}@${homeRow.abbr}`,
      spread: {
        away: { handlePct: parsePct(awayCols[awayRow.baseIndex + 2]), betsPct: parsePct(awayCols[awayRow.baseIndex + 3]) },
        home: { handlePct: parsePct(homeCols[homeRow.baseIndex + 2]), betsPct: parsePct(homeCols[homeRow.baseIndex + 3]) },
      },
      total: {
        line: parseSignedNumber(awayCols[awayRow.baseIndex + 4]),
        over: { handlePct: parsePct(awayCols[awayRow.baseIndex + 5]), betsPct: parsePct(awayCols[awayRow.baseIndex + 6]) },
        under: { handlePct: parsePct(homeCols[homeRow.baseIndex + 5]), betsPct: parsePct(homeCols[homeRow.baseIndex + 6]) },
      },
      moneyline: {
        away: {
          odds: parseSignedNumber(awayCols[awayRow.baseIndex + 7]),
          handlePct: parsePct(awayCols[awayRow.baseIndex + 8]),
          betsPct: parsePct(awayCols[awayRow.baseIndex + 9]),
        },
        home: {
          odds: parseSignedNumber(homeCols[homeRow.baseIndex + 7]),
          handlePct: parsePct(homeCols[homeRow.baseIndex + 8]),
          betsPct: parsePct(homeCols[homeRow.baseIndex + 9]),
        },
      },
    });
  }

  if (!signals.length) {
    throw new Error("No VSiN sharp games matched. Paste the two-row game blocks with spread/total/money percentages.");
  }

  return signals;
}
