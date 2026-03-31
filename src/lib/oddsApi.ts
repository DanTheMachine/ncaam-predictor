import type { Odds } from "../types";

interface OddsApiOutcome {
  name: string;
  price: number;
  point?: number;
}

interface OddsApiMarket {
  key: "h2h" | "spreads" | "totals" | string;
  outcomes?: OddsApiOutcome[];
}

interface OddsApiBookmaker {
  key: string;
  title: string;
  markets?: OddsApiMarket[];
}

export interface OddsApiEvent {
  id: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers?: OddsApiBookmaker[];
}

const SPORT_KEY = "basketball_ncaab";
const PREFERRED_BOOKMAKERS = [
  "draftkings",
  "fanduel",
  "betmgm",
  "caesars",
  "espnbet",
  "betrivers",
  "bovada",
];

const getOddsApiKey = (): string => import.meta.env.VITE_ODDS_API_KEY?.trim?.() || "";

const buildDateRange = (date: string): { from: string; to: string } => {
  const from = new Date(`${date}T00:00:00`);
  const to = new Date(`${date}T23:59:59`);
  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
};

export const hasOddsApiKey = (): boolean => Boolean(getOddsApiKey());

export const fetchOddsApiEvents = async (date: string): Promise<OddsApiEvent[]> => {
  const apiKey = getOddsApiKey();
  if (!apiKey) return [];

  const { from, to } = buildDateRange(date);
  const params = new URLSearchParams({
    apiKey,
    regions: "us",
    markets: "h2h,spreads,totals",
    oddsFormat: "american",
    dateFormat: "iso",
    commenceTimeFrom: from,
    commenceTimeTo: to,
  });

  const resp = await fetch(`https://api.the-odds-api.com/v4/sports/${SPORT_KEY}/odds/?${params.toString()}`);
  if (!resp.ok) throw new Error(`Odds API ${resp.status}`);
  return resp.json() as Promise<OddsApiEvent[]>;
};

const bookmakerRank = (bookmaker: OddsApiBookmaker): number => {
  const index = PREFERRED_BOOKMAKERS.indexOf(bookmaker.key);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
};

const getSortedBookmakers = (event: OddsApiEvent): OddsApiBookmaker[] =>
  [...(event.bookmakers || [])].sort((left, right) => bookmakerRank(left) - bookmakerRank(right));

const findOutcome = (market: OddsApiMarket | undefined, name: string): OddsApiOutcome | undefined =>
  market?.outcomes?.find((outcome) => outcome.name === name);

const findTotalOutcome = (market: OddsApiMarket | undefined, name: "Over" | "Under"): OddsApiOutcome | undefined =>
  market?.outcomes?.find((outcome) => outcome.name === name);

export const extractInitialOdds = (event: OddsApiEvent): Odds | null => {
  for (const bookmaker of getSortedBookmakers(event)) {
    const markets = bookmaker.markets || [];
    const h2h = markets.find((market) => market.key === "h2h");
    const spreads = markets.find((market) => market.key === "spreads");
    const totals = markets.find((market) => market.key === "totals");

    const homeMl = findOutcome(h2h, event.home_team);
    const awayMl = findOutcome(h2h, event.away_team);
    const homeSpread = findOutcome(spreads, event.home_team);
    const awaySpread = findOutcome(spreads, event.away_team);
    const over = findTotalOutcome(totals, "Over");
    const under = findTotalOutcome(totals, "Under");

    if (!homeMl || !awayMl || !homeSpread || !awaySpread || !over || !under || homeSpread.point == null || over.point == null) {
      continue;
    }

    return {
      source: `odds-api:${bookmaker.key}`,
      homeMoneyline: homeMl.price,
      awayMoneyline: awayMl.price,
      spread: homeSpread.point,
      spreadHomeOdds: homeSpread.price,
      spreadAwayOdds: awaySpread.price,
      overUnder: over.point,
      overOdds: over.price,
      underOdds: under.price,
    };
  }

  return null;
};

