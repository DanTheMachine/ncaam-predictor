import { KENPOM_NAME_MAP, TEAMS } from "../data/ncaaData";

const sbFix = s => s.replace(/\*/g,"").replace(/½/g,".5").replace(/\s+\./g,".").trim();

// Build a lookup: full team name (upper) → abbr, plus some common sportsbook variants
const SB_NAME_MAP = (() => {
  const m = {};
  // From our TEAMS data
  Object.entries(TEAMS).forEach(([abbr, t]) => {
    m[t.name.toUpperCase()]         = abbr;
    m[abbr]                         = abbr; // "DUKE" → "DUKE"
  });
  Object.entries(KENPOM_NAME_MAP).forEach(([name, abbr]) => {
    if (TEAMS[abbr]) m[name.toUpperCase()] = abbr;
  });
  // Patch common sportsbook spellings that differ from our names
  const patches = {
    // ACC
    "FLORIDA STATE":"FSU",   "FLORIDA ST":"FSU",
    "CLEMSON":"CLEM",        "NORTH CAROLINA":"UNC",  "N CAROLINA":"UNC",   "N. CAROLINA":"UNC",
    "NC STATE":"NCST",       "NORTH CAROLINA STATE":"NCST",
    "VIRGINIA":"VA",         "LOUISVILLE":"LOU",      "WAKE FOREST":"WAKE",
    "PITTSBURGH":"PITT",     "MIAMI (FL)":"MIAMI",    "MIAMI FL":"MIAMI",
    "NOTRE DAME":"NOTRE",    "BOSTON COLLEGE":"BC",   "GEORGIA TECH":"GT",
    "VIRGINIA TECH":"VT",    "STANFORD":"STAN",       "CALIFORNIA":"CAL",
    "SYRACUSE":"SYRA",       "DUKE":"DUKE",
    // Big 12
    "KANSAS":"KU",           "KAN":"KU",
    "OKLAHOMA":"OKLA",       "OKLAHOMA STATE":"OSU",  "OKLAHOMA ST":"OSU",
    "IOWA STATE":"IOWA",     "IOWA ST":"IOWA",
    "WEST VIRGINIA":"WVU",   "HOUSTON":"HOU",         "TCU":"TCU",
    "BYU":"BYU",             "KANSAS STATE":"KSTATE", "K-STATE":"KSTATE",   "KAN STATE":"KSTATE",
    "ARIZONA":"AZ",          "ARIZONA STATE":"ARIZST","ARIZONA ST":"ARIZST",
    "UTAH":"UTAH",           "COLORADO":"COLO",       "UCF":"UCF",
    "CINCINNATI":"CIN",      "BAYLOR":"BAYLOR",       "TEXAS TECH":"TTU",   "TEXAS":"TEXAS",
    // Big East
    "CONNECTICUT":"UCONN",   "CONN":"UCONN",          "UCONN":"UCONN",
    "MARQUETTE":"MARQ",      "CREIGHTON":"CRTN",      "GEORGETOWN":"GTOWN",
    "SETON HALL":"SETON",    "VILLANOVA":"VILLA",     "PROVIDENCE":"PROV",
    "XAVIER":"XAVI",         "BUTLER":"BUTLER",
    "ST. JOHN'S":"STJ",      "ST JOHNS":"STJ",        "DEPAUL":"DEPAUL",
    "DUQUESNE":"DUQ",
    // Big Ten
    "PURDUE":"PURDUE",       "MICHIGAN":"MICH",       "ILLINOIS":"ILL",
    "MICHIGAN STATE":"MSU",  "MICHIGAN ST":"MSU",     "MARYLAND":"UMD",
    "INDIANA":"IND",
    "OHIO STATE":"OSU2",     "OHIO ST":"OSU2",
    "NORTHWESTERN":"NW",     "WISCONSIN":"WISC",      "MINNESOTA":"MINN",
    "PENN STATE":"PSU",      "PENN ST":"PSU",         "RUTGERS":"RUT",      "NEBRASKA":"NEBR",
    // Pac-12/independent
    "UCLA":"UCLA",           "USC":"USC",              "WASHINGTON":"UW",    "OREGON":"ORE",
    // SEC
    "ALABAMA":"ALA",         "TENNESSEE":"TENN",      "ARKANSAS":"ARK",     "AUBURN":"AUBURN",
    "KENTUCKY":"KY",         "LSU":"LSU",             "FLORIDA":"FLOR",
    "TEXAS A&M":"TAMU",      "TEXAS A & M":"TAMU",
    "MISSOURI":"MIZ",        "MISSISSIPPI":"MISS",    "OLE MISS":"MISS",
    "MISSISSIPPI STATE":"MSST","MISS STATE":"MSST",   "MISS ST":"MSST",
    "VANDERBILT":"VAND",     "SOUTH CAROLINA":"SCAR", "GEORGIA":"UGA",
    // WCC
    "GONZAGA":"GONZ",        "SAINT MARY'S":"SMC",    "ST. BONAVENTURE":"SBU",
    // A-10
    "DAYTON":"DAYT",         "ST. LOUIS":"STLOU",     "SAINT LOUIS":"STLOU",
    "DRAKE":"DRAKE",
    "RHODE ISLAND":"URI",    "DAVIDSON":"DAV",        "LOYOLA CHICAGO":"LUC",
    // Mountain West
    "NEVADA":"UNEV",         "SAN DIEGO STATE":"SDSU","SAN DIEGO ST":"SDSU",
    "COLORADO STATE":"CSU",  "COLORADO ST":"CSU",
    "NEW MEXICO":"UNM",      "SAN JOSE STATE":"SJSU", "SAN JOSE ST":"SJSU",
    // American / CUSA / MAC / Sun Belt
    "MEMPHIS":"MEMPH",       "WICHITA STATE":"WICHST","WICHITA ST":"WICHST",
    "TULANE":"TUL",          "CHARLOTTE U":"CHAR",    "CHARLOTTE":"CHAR",
    "MIDDLE TENN ST":"MTSU", "MIDDLE TENNESSEE":"MTSU","MIDDLE TENN":"MTSU",
    "WESTERN KENTUCKY":"WKU","W KENTUCKY":"WKU",
    "FLORIDA ATLANTIC":"FAU","NORTH TEXAS":"UNT",
    "BUFFALO":"BUFF",        "AKRON":"AKR",           "OHIO":"OHIO",        "KENT STATE":"KENT",
    "GRAND CANYON":"GCU",
    // HBCUs
    "SOUTH CAROLINA STATE":"SCST","S CAROLINA STATE":"SCST",
    "NORFOLK STATE":"NORF",
    "ARK PINE BLUFF":"UAPB",
    "SOUTHERN":"SUNO",
    "MD EASTERN SHORE":"UMES",
    "NORTH CAROLINA CENTRAL":"NCCU",
    // Summit/others
    "S DAKOTA STATE":"SDST", "SOUTH DAKOTA STATE":"SDST",
    // CUSA / WAC / Big West / ASUN
    "LOUISIANA TECH":"LATECH", "LA TECH":"LATECH",
    "KENNESAW ST":"KENN",    "KENNESAW STATE":"KENN",
    "SOUTHERN UTAH":"SUU",
    "UT ARLINGTON":"UTA",    "TEXAS ARLINGTON":"UTA",
    "UC SAN DIEGO":"UCSD",
    "CS NORTHRIDGE":"CSUN",  "CAL ST NORTHRIDGE":"CSUN",
    "ABILENE CHRISTIAN":"ACU",
    "UTAH TECH":"UTCH",
    "UC DAVIS":"UCD",
    "CS FULLERTON":"CSUF",   "CAL ST FULLERTON":"CSUF",
  };
  Object.entries(patches).forEach(([k,v]) => { if (TEAMS[v]) m[k] = v; });
  return m;
})();

const resolveTeam = name => {
  const u = name.toUpperCase().trim();
  // 1. Direct abbr hit
  if (TEAMS[u]) return u;
  // 2. Name map
  if (SB_NAME_MAP[u]) return SB_NAME_MAP[u];
  // 3. Fuzzy: exact match on stored team name
  const entry = Object.entries(TEAMS).find(([,t]) => t.name.toUpperCase() === u);
  if (entry) return entry[0];
  // 4. Partial match (startsWith)
  const partial = Object.entries(TEAMS).find(([,t]) => t.name.toUpperCase().startsWith(u) || u.startsWith(t.name.toUpperCase()));
  if (partial) return partial[0];
  return null;
};

const summarizeUnmatched = games => {
  const counts = new Map();
  games.forEach(game => {
    if (!game.awayMatched && game.awayNameRaw) {
      counts.set(game.awayNameRaw, (counts.get(game.awayNameRaw) ?? 0) + 1);
    }
    if (!game.homeMatched && game.homeNameRaw) {
      counts.set(game.homeNameRaw, (counts.get(game.homeNameRaw) ?? 0) + 1);
    }
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, count]) => ({ name, count }));
};

export const parseSbookWithDiagnostics = (raw) => {
  // Pre-process: normalize and expand each line so the classifier sees one value per line.
  // Input lines can be:
  //   "RHODE ISLAND 717"   → ["RHODE ISLAND", "717"]
  //   "* + 1 - 108"        → ["+ 1", "-108"]
  //   "* O 139 - 108"      → ["O 139", "-108"]
  //   "* - 103"            → ["-103"]  (ML only)
  //   "* "                 → []         (empty ML — skip)
  const lines = raw.replace(/\u00A0/g,' ').replace(/\u2009/g,' ').split(/\r?\n/).flatMap(line => {
    const t = line.trim();
    if (!t) return [];
    // "TEAM NAME 717" → ["TEAM NAME", "717"]
    const rot = t.match(/^([A-Za-z].+?)\s+(\d{3,7})\s*$/);
    if (rot) return [rot[1].trim(), rot[2]];
    // "* ..." → expand asterisk lines
    const star = t.match(/^\*\s*(.*)$/);
    if (star) {
      const inner = star[1].replace(/½/g,'.5').trim();
      if (!inner) return [];
      // Split "VALUE -108" or "VALUE +108" → ["VALUE", "-108"]
      const juiceSplit = inner.match(/^(.+?)\s+([+\-]\s*1\d{2})\s*$/);
      if (juiceSplit) return [juiceSplit[1].trim(), juiceSplit[2].replace(/\s/,'')];
      return [inner];
    }
    // "CBSSN6:00 PM" / "ESPN+6:30 PM" / "FS16:30 PM" → extract just the time
    // Step 1: non-digit immediately before valid 12-hour time (handles most channels)
    const netTime = t.match(/^(.*\D)((?:1[0-2]|[1-9]):\d{2}\s*(?:AM|PM))$/i);
    if (netTime) return [netTime[2].trim()];
    // Step 2: channels ending in a single digit (FS1, ESPN2) — digit is part of channel name
    const digitNet = t.match(/^(?:FS|ESPN)(\d)((?:1[0-2]|[1-9]):\d{2}\s*(?:AM|PM))$/i);
    if (digitNet) return [digitNet[2].trim()];
    return [t];
  });

  // ── FORMAT B: simple "AWAY @ HOME" lines ──────────────────────────────
  const atLines = lines.filter(l => l.includes('@') && !/^\d/.test(l));
  if (atLines.length > 0) {
    const games = [];
    for (const line of atLines) {
      const m = line.match(/^([^@]+?)\s*@\s*([^,\n]+?)(?:[,\s]+(.+))?$/i);
      if (!m) continue;
      const awayAbbr = resolveTeam(m[1].trim());
      const homeAbbr = resolveTeam(m[2].trim());
      games.push({
        homeAbbr: homeAbbr || null, awayAbbr: awayAbbr || null, gameTime: m[3]?.trim()||"TBD",
        homeNameRaw: m[2].trim(), awayNameRaw: m[1].trim(),
        homeMatched: !!homeAbbr, awayMatched: !!awayAbbr, odds: null
      });
    }
    return { games, unmatchedTeams: summarizeUnmatched(games) };
  }

  // ── FORMAT A: rotation-number-anchored sportsbook paste ───────────────
  // After pre-processing each block is:
  //   TEAM NAME   ← sbIsTeam
  //   717         ← sbIsRotNum
  //   + 1         ← sbIsSpread (or "Pick")
  //   -108        ← sbIsJuice
  //   O 139       ← sbIsOU
  //   -108        ← sbIsJuice
  //   -103        ← ML (optional, also sbIsJuice or +/- 3-4 digits)

  const sbIsTime   = l => /^\d{1,2}:\d{2}\s*(AM|PM|ET|CT|MT|PT|p|a)\b/i.test(l) || /^(noon|midnight)$/i.test(l);
  const sbIsRotNum = l => /^\d{3,7}$/.test(l);
  const sbIsSpread = l => /^[+\-]\s*\d|^Pick$/i.test(l);
  const sbIsJuice  = l => /^[+\-]\s*1\d{2}$/.test(l);
  const sbIsOU     = l => /^[OoUu]\s+\d/.test(l);
  const sbIsMeta   = l => sbIsTime(l) ||
                          /^(ESPN|BTN|SEC\s|USA\s|CBS|FOX|ABC|PEACOCK|CBSSN|A ESPN|NETWORK|FS1|FS2|ACCN|SECN)/i.test(l);
  const sbIsTeam   = l => !sbIsRotNum(l) && !sbIsSpread(l) && !sbIsJuice(l) &&
                          !sbIsOU(l) && !sbIsMeta(l) && l.length > 1 && /[A-Za-z]/.test(l);

  const sbParseHalf = s => s.replace(/\s*½/g,'.5').replace(/\s+\./g,'.').trim();
  const sbParseNum  = s => {
    const h = sbParseHalf(s);
    const n = parseFloat(h.replace(/[+\-]\s*/,''));
    return h.trimStart().startsWith('-') ? -n : n;
  };

  const blocks = [];
  let i = 0;
  let pendingTime = "TBD";
  while (i < lines.length) {
    const l = lines[i];
    if (sbIsTime(l)) { pendingTime = l; i++; continue; }
    if (sbIsMeta(l)||sbIsRotNum(l)||sbIsJuice(l)||sbIsOU(l)||sbIsSpread(l)) { i++; continue; }
    if (sbIsTeam(l) && i+5 < lines.length) {
      const next=lines[i+1], sprLine=lines[i+2], j1=lines[i+3], ouLine=lines[i+4], j2=lines[i+5];
      if (sbIsRotNum(next) &&
          (sbIsSpread(sprLine) || /^Pick$/i.test(sprLine)) &&
          sbIsJuice(j1) && sbIsOU(ouLine) && sbIsJuice(j2)) {
        const spread   = /^Pick$/i.test(sprLine) ? 0 : sbParseNum(sprLine);
        const sprJuice = sbParseNum(j1);
        const ouVal    = parseFloat(sbParseHalf(ouLine.replace(/^[OoUu]\s*/,'')));
        const ouJuice  = sbParseNum(j2);
        let ml = null;
        if (i+6 < lines.length) {
          const mlLine = lines[i+6];
          if (sbIsJuice(mlLine) || /^[+\-]\d{3,4}$/.test(mlLine)) ml = sbParseNum(mlLine);
        }
        blocks.push({ name: l, time: pendingTime, spread, sprJuice, ouVal, ouJuice, ml });
        i += (ml !== null ? 7 : 6);
        continue;
      }
    }
    i++;
  }

  const spreadToML = spd => {
    if (spd === 0) return -108;
    const abs = Math.abs(spd);
    const raw = Math.round(abs * 20 + 100);
    return spd < 0 ? -raw : raw;
  };

  const games = [];
  for (let j = 0; j+1 < blocks.length; j += 2) {
    const away = blocks[j], home = blocks[j+1];
    const awayAbbr = resolveTeam(away.name);
    const homeAbbr = resolveTeam(home.name);
    const homeSpr  = -away.spread;
    games.push({
      homeAbbr: homeAbbr || null,
      awayAbbr: awayAbbr || null,
      homeNameRaw: home.name,
      awayNameRaw: away.name,
      homeMatched: !!homeAbbr,
      awayMatched: !!awayAbbr,
      gameTime: away.time ?? "TBD",
      odds: {
        source: "sportsbook",
        homeMoneyline: home.ml ?? spreadToML(homeSpr),
        awayMoneyline: away.ml ?? spreadToML(away.spread),
        spread: homeSpr,
        spreadHomeOdds: home.sprJuice,
        spreadAwayOdds: away.sprJuice,
        overUnder: away.ouVal,
        overOdds:  away.ouJuice,
        underOdds: home.ouJuice,
      }
    });
  }
  return { games, unmatchedTeams: summarizeUnmatched(games) };
};

export const parseSbookFormat = raw => parseSbookWithDiagnostics(raw).games;


