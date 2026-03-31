import { act, renderHook } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { usePredictorState } from "../hooks/usePredictorState";

describe("usePredictorState", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  test("keeps the slate date aligned to the current day when the app stays open overnight", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 21, 23, 58, 0));

    const { result } = renderHook(() => usePredictorState());

    expect(result.current.slateDate).toBe("2026-03-21");

    act(() => {
      vi.setSystemTime(new Date(2026, 2, 22, 0, 1, 0));
      vi.advanceTimersByTime(60_000);
    });

    expect(result.current.slateDate).toBe("2026-03-22");

    vi.useRealTimers();
  });

  test("loads a bulk slate and can apply manual odds to single-game state", () => {
    const { result } = renderHook(() => usePredictorState());

    const slatePaste = [
      "KU @ DUKE, 7:00 PM ET",
      "UNC @ KY, 9:00 PM ET",
    ].join("\n");

    act(() => {
      result.current.handleBulkPasteChange(slatePaste);
    });

    act(() => {
      result.current.handleBulkGames();
    });

    expect(result.current.linesRows).toHaveLength(2);
    expect(result.current.showLines).toBe(true);
    expect(result.current.bulkStatus).toContain("Loaded 2 games");
    expect(result.current.linesRows[0]).toMatchObject({
      game: {
        awayAbbr: "KU",
        homeAbbr: "DUKE",
        gameTime: "7:00 PM ET",
      },
    });

    act(() => {
      result.current.setManualOdds((prev) => ({
        ...prev,
        homeMoneyline: "-145",
        awayMoneyline: "+125",
        homeSpread: "-2.5",
        overUnder: "151.5",
      }));
    });

    act(() => {
      result.current.applyManualOdds();
    });

    expect(result.current.oddsSource).toBe("manual");
    expect(result.current.odds).toMatchObject({
      source: "manual",
      homeMoneyline: -145,
      awayMoneyline: 125,
      spread: -2.5,
      overUnder: 151.5,
    });
    expect(result.current.result).not.toBeNull();
    expect(result.current.result?.hWinProb).toBeGreaterThan(0);
    expect(result.current.result?.aWinProb).toBeGreaterThan(0);
  });

  test("loads an ESPN slate for the selected date", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        events: [
          {
            date: "2026-03-30T19:00Z",
            competitions: [
              {
                neutralSite: false,
                competitors: [
                  { homeAway: "away", team: { abbreviation: "KU", displayName: "Kansas Jayhawks" } },
                  { homeAway: "home", team: { abbreviation: "DUKE", displayName: "Duke Blue Devils" } },
                ],
              },
            ],
          },
          {
            date: "2026-03-30T21:00Z",
            competitions: [
              {
                neutralSite: true,
                competitors: [
                  { homeAway: "away", team: { shortDisplayName: "Texas A&M", displayName: "Aggies", location: "Texas A&M" } },
                  { homeAway: "home", team: { abbreviation: "UCONN", shortDisplayName: "UConn", displayName: "Huskies", location: "Connecticut" } },
                ],
              },
            ],
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => usePredictorState());

    act(() => {
      result.current.setSlateDate("2026-03-30");
    });

    await act(async () => {
      await result.current.handleLoadEspnSlate();
    });

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("dates=20260330"));
    expect(result.current.linesRows).toHaveLength(2);
    expect(result.current.showLines).toBe(true);
    expect(result.current.linesRows[0]).toMatchObject({
      game: {
        awayAbbr: "KU",
        homeAbbr: "DUKE",
      },
      neutralSite: false,
    });
    expect(result.current.linesRows[1]).toMatchObject({
      game: {
        awayAbbr: "TAMU",
        homeAbbr: "UCONN",
      },
      neutralSite: true,
    });
    expect(result.current.schedStatus).toContain("Loaded 2 games from ESPN");
  });

  test("seeds initial odds from The Odds API when a key is configured", async () => {
    vi.stubEnv("VITE_ODDS_API_KEY", "test-key");

    const fetchMock = vi.fn((input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("site.api.espn.com")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            events: [
              {
                date: "2026-03-30T19:00Z",
                competitions: [
                  {
                    neutralSite: false,
                    competitors: [
                      { homeAway: "away", team: { abbreviation: "KU", displayName: "Kansas Jayhawks" } },
                      { homeAway: "home", team: { abbreviation: "DUKE", displayName: "Duke Blue Devils" } },
                    ],
                  },
                ],
              },
            ],
          }),
        });
      }

      if (url.includes("api.the-odds-api.com")) {
        return Promise.resolve({
          ok: true,
          json: async () => ([
            {
              id: "evt1",
              commence_time: "2026-03-30T19:00:00Z",
              home_team: "Duke Blue Devils",
              away_team: "Kansas Jayhawks",
              bookmakers: [
                {
                  key: "draftkings",
                  title: "DraftKings",
                  markets: [
                    {
                      key: "h2h",
                      outcomes: [
                        { name: "Duke Blue Devils", price: -155 },
                        { name: "Kansas Jayhawks", price: 130 },
                      ],
                    },
                    {
                      key: "spreads",
                      outcomes: [
                        { name: "Duke Blue Devils", price: -110, point: -3.5 },
                        { name: "Kansas Jayhawks", price: -110, point: 3.5 },
                      ],
                    },
                    {
                      key: "totals",
                      outcomes: [
                        { name: "Over", price: -108, point: 148.5 },
                        { name: "Under", price: -112, point: 148.5 },
                      ],
                    },
                  ],
                },
              ],
            },
          ]),
        });
      }

      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });

    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => usePredictorState());

    await act(async () => {
      await result.current.handleLoadEspnSlate();
    });

    expect(result.current.linesRows).toHaveLength(1);
    expect(result.current.linesRows[0].editedOdds).toMatchObject({
      source: "odds-api:draftkings",
      homeMoneyline: -155,
      awayMoneyline: 130,
      spread: -3.5,
      overUnder: 148.5,
    });
    expect(result.current.schedStatus).toContain("seeded odds for 1");
  });
});
