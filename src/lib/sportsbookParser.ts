import { KENPOM_NAME_MAP, TEAMS } from "../data/ncaaData";
import type { Odds, SportsbookParseDiagnostics, SportsbookParsedGame, UnmatchedTeam } from "../types";

type TeamCode = string;

interface TeamRecord {
  name: string;
}

interface SportsbookBlock {
  name: string;
  time: string;
  spread: number;
  sprJuice: number;
  ouVal: number;
  ouJuice: number;
  ml: number | null;
}

const sbFix = (value: string): string =>
  value.replace(/\*/g, "").replace(/Â½/g, ".5").replace(/\s+\./g, ".").trim();

const teamEntries = Object.entries(TEAMS) as [TeamCode, TeamRecord][];

const normalizeLookupKey = (value: string): string =>
  value
    .toUpperCase()
    .replace(/&/g, " AND ")
    .replace(/[.'(),]/g, " ")
    .replace(/-/g, " ")
    .replace(/\bSAINT\b/g, "ST")
    .replace(/\bSTATE\b/g, "ST")
    .replace(/\bUNIVERSITY\b/g, " ")
    .replace(/\bCOLLEGE\b/g, " ")
    .replace(/\bOF\b/g, " ")
    .replace(/\bTHE\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const compactLookupKey = (value: string): string => normalizeLookupKey(value).replace(/\s+/g, "");

const SB_NAME_MAP: Record<string, TeamCode> = (() => {
  const lookup: Record<string, TeamCode> = {};
  const addLookup = (name: string, abbr: TeamCode) => {
    const upper = name.toUpperCase();
    const normalized = normalizeLookupKey(name);
    const compact = compactLookupKey(name);

    lookup[upper] = abbr;
    if (normalized) lookup[normalized] = abbr;
    if (compact) lookup[compact] = abbr;
  };

  teamEntries.forEach(([abbr, team]) => {
    addLookup(team.name, abbr);
    addLookup(abbr, abbr);
  });

  Object.entries(KENPOM_NAME_MAP).forEach(([name, abbr]) => {
    if (TEAMS[abbr]) addLookup(name, abbr);
  });

  const patches: Record<string, TeamCode> = {
    "FLORIDA STATE": "FSU",
    "FLORIDA ST": "FSU",
    CLEMSON: "CLEM",
    "NORTH CAROLINA": "UNC",
    "N CAROLINA": "UNC",
    "N. CAROLINA": "UNC",
    "NC STATE": "NCST",
    "NORTH CAROLINA STATE": "NCST",
    VIRGINIA: "VA",
    LOUISVILLE: "LOU",
    "WAKE FOREST": "WAKE",
    PITTSBURGH: "PITT",
    "MIAMI (FL)": "MIAMI",
    "MIAMI FL": "MIAMI",
    "NOTRE DAME": "NOTRE",
    "BOSTON COLLEGE": "BC",
    "GEORGIA TECH": "GT",
    "VIRGINIA TECH": "VT",
    STANFORD: "STAN",
    CALIFORNIA: "CAL",
    SYRACUSE: "SYRA",
    DUKE: "DUKE",
    KANSAS: "KU",
    KAN: "KU",
    OKLAHOMA: "OKLA",
    "OKLAHOMA STATE": "OSU",
    "OKLAHOMA ST": "OSU",
    "IOWA STATE": "IOWA",
    "IOWA ST": "IOWA",
    "WEST VIRGINIA": "WVU",
    HOUSTON: "HOU",
    TCU: "TCU",
    BYU: "BYU",
    "KANSAS STATE": "KSTATE",
    "K-STATE": "KSTATE",
    "KAN STATE": "KSTATE",
    ARIZONA: "AZ",
    "ARIZONA STATE": "ARIZST",
    "ARIZONA ST": "ARIZST",
    UTAH: "UTAH",
    COLORADO: "COLO",
    UCF: "UCF",
    CINCINNATI: "CIN",
    BAYLOR: "BAYLOR",
    "TEXAS TECH": "TTU",
    TEXAS: "TEXAS",
    CONNECTICUT: "UCONN",
    CONN: "UCONN",
    UCONN: "UCONN",
    MARQUETTE: "MARQ",
    CREIGHTON: "CRTN",
    GEORGETOWN: "GTOWN",
    "SETON HALL": "SETON",
    VILLANOVA: "VILLA",
    PROVIDENCE: "PROV",
    XAVIER: "XAVI",
    BUTLER: "BUTLER",
    "ST. JOHN'S": "STJ",
    "ST JOHNS": "STJ",
    DEPAUL: "DEPAUL",
    DUQUESNE: "DUQ",
    PURDUE: "PURDUE",
    MICHIGAN: "MICH",
    ILLINOIS: "ILL",
    "MICHIGAN STATE": "MSU",
    "MICHIGAN ST": "MSU",
    MARYLAND: "UMD",
    INDIANA: "IND",
    "OHIO STATE": "OSU2",
    "OHIO ST": "OSU2",
    NORTHWESTERN: "NW",
    WISCONSIN: "WISC",
    MINNESOTA: "MINN",
    "PENN STATE": "PSU",
    "PENN ST": "PSU",
    RUTGERS: "RUT",
    NEBRASKA: "NEBR",
    UCLA: "UCLA",
    USC: "USC",
    WASHINGTON: "UW",
    OREGON: "ORE",
    ALABAMA: "ALA",
    TENNESSEE: "TENN",
    ARKANSAS: "ARK",
    AUBURN: "AUBURN",
    KENTUCKY: "KY",
    LSU: "LSU",
    FLORIDA: "FLOR",
    "TEXAS A&M": "TAMU",
    "TEXAS A & M": "TAMU",
    MISSOURI: "MIZ",
    MISSISSIPPI: "MISS",
    "OLE MISS": "MISS",
    "MISSISSIPPI STATE": "MSST",
    "MISS STATE": "MSST",
    "MISS ST": "MSST",
    VANDERBILT: "VAND",
    "SOUTH CAROLINA": "SCAR",
    GEORGIA: "UGA",
    GONZAGA: "GONZ",
    "SAINT MARY'S": "SMC",
    "ST. BONAVENTURE": "SBU",
    DAYTON: "DAYT",
    "ST. LOUIS": "STLOU",
    "SAINT LOUIS": "STLOU",
    DRAKE: "DRAKE",
    "RHODE ISLAND": "URI",
    DAVIDSON: "DAV",
    "LOYOLA CHICAGO": "LUC",
    NEVADA: "UNEV",
    "SAN DIEGO STATE": "SDSU",
    "SAN DIEGO ST": "SDSU",
    "COLORADO STATE": "CSU",
    "COLORADO ST": "CSU",
    "NEW MEXICO": "UNM",
    "SAN JOSE STATE": "SJSU",
    "SAN JOSE ST": "SJSU",
    MEMPHIS: "MEMPH",
    "WICHITA STATE": "WICHST",
    "WICHITA ST": "WICHST",
    TULANE: "TUL",
    "CHARLOTTE U": "CHAR",
    CHARLOTTE: "CHAR",
    "MIDDLE TENN ST": "MTSU",
    "MIDDLE TENNESSEE": "MTSU",
    "MIDDLE TENN": "MTSU",
    "WESTERN KENTUCKY": "WKU",
    "W KENTUCKY": "WKU",
    "FLORIDA ATLANTIC": "FAU",
    "NORTH TEXAS": "UNT",
    BUFFALO: "BUFF",
    AKRON: "AKR",
    OHIO: "OHIO",
    "KENT STATE": "KENT",
    "GRAND CANYON": "GCU",
    "SOUTH CAROLINA STATE": "SCST",
    "S CAROLINA STATE": "SCST",
    "NORFOLK STATE": "NORF",
    "ARK PINE BLUFF": "UAPB",
    SOUTHERN: "SUNO",
    "MD EASTERN SHORE": "UMES",
    "NORTH CAROLINA CENTRAL": "NCCU",
    "S DAKOTA STATE": "SDST",
    "SOUTH DAKOTA STATE": "SDST",
    "LOUISIANA TECH": "LATECH",
    "LA TECH": "LATECH",
    "KENNESAW ST": "KENN",
    "KENNESAW STATE": "KENN",
    "SOUTHERN UTAH": "SUU",
    "UT ARLINGTON": "UTA",
    "TEXAS ARLINGTON": "UTA",
    "UC SAN DIEGO": "UCSD",
    "CS NORTHRIDGE": "CSUN",
    "CAL ST NORTHRIDGE": "CSUN",
    "ABILENE CHRISTIAN": "ACU",
    "UTAH TECH": "UTCH",
    "UC DAVIS": "UCD",
    "CS FULLERTON": "CSUF",
    "CAL ST FULLERTON": "CSUF",
  };

  Object.entries(patches).forEach(([name, abbr]) => {
    if (TEAMS[abbr]) addLookup(name, abbr);
  });

  return lookup;
})();

const resolveTeam = (name: string): TeamCode | null => {
  const upper = name.toUpperCase().trim();
  const normalized = normalizeLookupKey(name);
  const compact = compactLookupKey(name);
  if (TEAMS[upper]) return upper;
  if (SB_NAME_MAP[upper]) return SB_NAME_MAP[upper];
  if (SB_NAME_MAP[normalized]) return SB_NAME_MAP[normalized];
  if (SB_NAME_MAP[compact]) return SB_NAME_MAP[compact];

  const exactEntry = teamEntries.find(([, team]) => normalizeLookupKey(team.name) === normalized);
  if (exactEntry) return exactEntry[0];

  const partialEntry = teamEntries.find(
    ([, team]) => {
      const normalizedTeam = normalizeLookupKey(team.name);
      return normalizedTeam.startsWith(normalized) || normalized.startsWith(normalizedTeam);
    },
  );
  return partialEntry ? partialEntry[0] : null;
};

const summarizeUnmatched = (games: SportsbookParsedGame[]): UnmatchedTeam[] => {
  const counts = new Map<string, number>();

  games.forEach((game) => {
    if (!game.awayMatched && game.awayNameRaw) {
      counts.set(game.awayNameRaw, (counts.get(game.awayNameRaw) ?? 0) + 1);
    }
    if (!game.homeMatched && game.homeNameRaw) {
      counts.set(game.homeNameRaw, (counts.get(game.homeNameRaw) ?? 0) + 1);
    }
  });

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([name, count]) => ({ name, count }));
};

export const parseSbookWithDiagnostics = (raw: string): SportsbookParseDiagnostics => {
  const lines = raw
    .replace(/\u00A0/g, " ")
    .replace(/\u2009/g, " ")
    .split(/\r?\n/)
    .flatMap((line) => {
      const trimmed = line.trim();
      if (!trimmed) return [];

      const rotMatch = trimmed.match(/^([A-Za-z].+?)\s+(\d{3,7})\s*$/);
      if (rotMatch) return [rotMatch[1].trim(), rotMatch[2]];

      const starMatch = trimmed.match(/^\*\s*(.*)$/);
      if (starMatch) {
        const inner = sbFix(starMatch[1]);
        if (!inner) return [];

        const juiceSplit = inner.match(/^(.+?)\s+([+-]\s*1\d{2})\s*$/);
        if (juiceSplit) return [juiceSplit[1].trim(), juiceSplit[2].replace(/\s/g, "")];
        return [inner];
      }

      const netTime = trimmed.match(/^(.*\D)((?:1[0-2]|[1-9]):\d{2}\s*(?:AM|PM))$/i);
      if (netTime) return [netTime[2].trim()];

      const digitNet = trimmed.match(/^(?:FS|ESPN)(\d)((?:1[0-2]|[1-9]):\d{2}\s*(?:AM|PM))$/i);
      if (digitNet) return [digitNet[2].trim()];

      return [trimmed];
    });

  const atLines = lines.filter((line) => line.includes("@") && !/^\d/.test(line));
  if (atLines.length > 0) {
    const games: SportsbookParsedGame[] = atLines.flatMap((line) => {
      const match = line.match(/^([^@]+?)\s*@\s*([^,\n]+?)(?:[,\s]+(.+))?$/i);
      if (!match) return [];

      const awayNameRaw = match[1].trim();
      const homeNameRaw = match[2].trim();
      const awayAbbr = resolveTeam(awayNameRaw);
      const homeAbbr = resolveTeam(homeNameRaw);

      return [
        {
          homeAbbr,
          awayAbbr,
          gameTime: match[3]?.trim() || "TBD",
          homeNameRaw,
          awayNameRaw,
          homeMatched: Boolean(homeAbbr),
          awayMatched: Boolean(awayAbbr),
          odds: null,
        },
      ];
    });

    return { games, unmatchedTeams: summarizeUnmatched(games) };
  }

  const sbIsTime = (line: string): boolean =>
    /^\d{1,2}:\d{2}\s*(AM|PM|ET|CT|MT|PT|p|a)\b/i.test(line) || /^(noon|midnight)$/i.test(line);
  const sbIsRotNum = (line: string): boolean => /^\d{3,7}$/.test(line);
  const sbIsSpread = (line: string): boolean => /^[+-]\s*\d|^Pick$/i.test(line);
  const sbIsJuice = (line: string): boolean => /^[+-]\s*1\d{2}$/.test(line);
  const sbIsMoneyline = (line: string): boolean => /^[+-]\s*\d{3,4}$/.test(line);
  const sbIsOU = (line: string): boolean => /^[OoUu]\s+\d/.test(line);
  const sbIsMeta = (line: string): boolean =>
    sbIsTime(line) ||
    /^(ESPN|BTN|SEC\s|USA\s|CBS|FOX|ABC|PEACOCK|CBSSN|A ESPN|NETWORK|FS1|FS2|ACCN|SECN)/i.test(line);
  const sbIsTeam = (line: string): boolean =>
    !sbIsRotNum(line) &&
    !sbIsSpread(line) &&
    !sbIsJuice(line) &&
    !sbIsOU(line) &&
    !sbIsMeta(line) &&
    line.length > 1 &&
    /[A-Za-z]/.test(line);

  const sbParseHalf = (value: string): string => value.replace(/\s*Â½/g, ".5").replace(/\s+\./g, ".").trim();
  const sbParseNum = (value: string): number => {
    const normalized = sbParseHalf(value);
    const parsed = Number.parseFloat(normalized.replace(/[+-]\s*/, ""));
    return normalized.trimStart().startsWith("-") ? -parsed : parsed;
  };

  const blocks: SportsbookBlock[] = [];
  let index = 0;
  let pendingTime = "TBD";

  while (index < lines.length) {
    const line = lines[index];

    if (sbIsTime(line)) {
      pendingTime = line;
      index += 1;
      continue;
    }

    if (sbIsMeta(line) || sbIsRotNum(line) || sbIsJuice(line) || sbIsOU(line) || sbIsSpread(line)) {
      index += 1;
      continue;
    }

    if (sbIsTeam(line) && index + 5 < lines.length) {
      const next = lines[index + 1];
      const spreadLine = lines[index + 2];
      const firstJuice = lines[index + 3];
      const ouLine = lines[index + 4];
      const secondJuice = lines[index + 5];

      if (
        sbIsRotNum(next) &&
        (sbIsSpread(spreadLine) || /^Pick$/i.test(spreadLine)) &&
        sbIsJuice(firstJuice) &&
        sbIsOU(ouLine) &&
        sbIsJuice(secondJuice)
      ) {
        const spread = /^Pick$/i.test(spreadLine) ? 0 : sbParseNum(spreadLine);
        const sprJuice = sbParseNum(firstJuice);
        const ouVal = Number.parseFloat(sbParseHalf(ouLine.replace(/^[OoUu]\s*/, "")));
        const ouJuice = sbParseNum(secondJuice);
        let ml: number | null = null;

        if (index + 6 < lines.length) {
          const mlLine = lines[index + 6];
          if (sbIsJuice(mlLine) || sbIsMoneyline(mlLine)) {
            ml = sbParseNum(mlLine);
          }
        }

        blocks.push({ name: line, time: pendingTime, spread, sprJuice, ouVal, ouJuice, ml });
        index += ml !== null ? 7 : 6;
        continue;
      }
    }

    index += 1;
  }

  const spreadToML = (spread: number): number => {
    if (spread === 0) return -108;
    const absolute = Math.abs(spread);
    const rawMl = Math.round(absolute * 20 + 100);
    return spread < 0 ? -rawMl : rawMl;
  };

  const games: SportsbookParsedGame[] = [];
  for (let blockIndex = 0; blockIndex + 1 < blocks.length; blockIndex += 2) {
    const away = blocks[blockIndex];
    const home = blocks[blockIndex + 1];
    const awayAbbr = resolveTeam(away.name);
    const homeAbbr = resolveTeam(home.name);
    const homeSpread = -away.spread;
    const odds: Odds = {
      source: "sportsbook",
      homeMoneyline: home.ml ?? spreadToML(homeSpread),
      awayMoneyline: away.ml ?? spreadToML(away.spread),
      spread: homeSpread,
      spreadHomeOdds: home.sprJuice,
      spreadAwayOdds: away.sprJuice,
      overUnder: away.ouVal,
      overOdds: away.ouJuice,
      underOdds: home.ouJuice,
    };

    games.push({
      homeAbbr,
      awayAbbr,
      homeNameRaw: home.name,
      awayNameRaw: away.name,
      homeMatched: Boolean(homeAbbr),
      awayMatched: Boolean(awayAbbr),
      gameTime: away.time || "TBD",
      odds,
    });
  }

  return { games, unmatchedTeams: summarizeUnmatched(games) };
};

export const parseSbookFormat = (raw: string): SportsbookParsedGame[] => parseSbookWithDiagnostics(raw).games;
