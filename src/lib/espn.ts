export interface EspnTeamInfo {
  abbreviation?: string;
  shortDisplayName?: string;
  displayName?: string;
  location?: string;
  name?: string;
}

export interface EspnCompetitor {
  homeAway?: "home" | "away";
  score?: string;
  team?: EspnTeamInfo;
}

export interface EspnCompetition {
  competitors?: EspnCompetitor[];
  neutralSite?: boolean;
}

export interface EspnEvent {
  date?: string;
  shortName?: string;
  status?: { type?: { completed?: boolean } };
  competitions?: EspnCompetition[];
}

export interface EspnScoreboardResponse {
  events?: EspnEvent[];
}

export const formatEspnDateParam = (date: string): string => date.replace(/-/g, "");

export const fetchEspnScoreboard = async (date: string): Promise<EspnScoreboardResponse> => {
  const dateYMD = formatEspnDateParam(date);
  const resp = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?dates=${dateYMD}&limit=200`);
  if (!resp.ok) throw new Error(`ESPN ${resp.status}`);
  return resp.json() as Promise<EspnScoreboardResponse>;
};

