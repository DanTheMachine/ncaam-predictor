import { act, renderHook } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { usePredictorState } from "../hooks/usePredictorState";

const VSIN_SAMPLE = [
  "CBB - Monday, Apr 6\tSpread\tHandle\tBets\tTotal\tHandle\tBets\tMoney\tHandle\tBets",
  "Kansas\t+6.5\t30%\t36%\t145.5\t79%\t74%\t+230\t42%\t53%",
  "Duke\t-6.5\t70%\t64%\t145.5\t21%\t26%\t-285\t58%\t47%",
].join("\n");

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

    const slatePaste = ["KU @ DUKE, 7:00 PM ET", "UNC @ KY, 9:00 PM ET"].join("\n");

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

  test("auto-detects VSiN sharp input pasted into the stats import box", () => {
    const { result } = renderHook(() => usePredictorState());
    act(() => {
      result.current.handleBulkPasteChange("KU @ DUKE, 7:00 PM ET");
    });

    act(() => {
      result.current.handleBulkGames();
    });

    expect(result.current.linesRows).toHaveLength(1);

    act(() => {
      result.current.setKpPaste(VSIN_SAMPLE);
    });

    act(() => {
      result.current.handleKPImport();
    });

    expect(result.current.kpError).toBe("");
    expect(result.current.kpStatus).toContain("VSiN data successfully imported for 1 game");
    expect(result.current.linesRows[0].sharpSignal).toMatchObject({
      matchup: "KU@DUKE",
      moneyline: {
        home: { handlePct: 58, betsPct: 47 },
      },
    });
  });

  test("hides the dedicated VSiN import box after a successful sharp import", async () => {
    const { result } = renderHook(() => usePredictorState());
    act(() => {
      result.current.handleBulkPasteChange("KU @ DUKE, 7:00 PM ET");
    });

    act(() => {
      result.current.handleBulkGames();
    });

    expect(result.current.linesRows).toHaveLength(1);

    act(() => {
      result.current.setShowSharp(true);
      result.current.setSharpPaste(VSIN_SAMPLE);
    });

    act(() => {
      result.current.handleSharpImport();
    });

    expect(result.current.sharpError).toBe("");
    expect(result.current.sharpStatus).toContain("VSiN data successfully imported for 1 game");
    expect(result.current.sharpPaste).toBe("");
    expect(result.current.showSharp).toBe(false);
  });

  test("exports prediction CSV rows with VSiN sharp columns populated", async () => {
    const { result } = renderHook(() => usePredictorState());
    const originalCreateElement = document.createElement.bind(document);
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const click = vi.fn();
    const createElement = vi.spyOn(document, "createElement").mockImplementation(((tagName: string) => {
      if (tagName.toLowerCase() === "a") {
        return {
          click,
          href: "",
          download: "",
        } as unknown as HTMLAnchorElement;
      }
      return originalCreateElement(tagName);
    }) as typeof document.createElement);

    act(() => {
      result.current.handleBulkPasteChange("KU @ DUKE, 7:00 PM ET");
    });

    act(() => {
      result.current.handleBulkGames();
    });

    expect(result.current.linesRows).toHaveLength(1);

    act(() => {
      result.current.toggleEditOdds(0);
    });

    act(() => {
      result.current.handleEditFieldChange("homeMoneyline", "-285");
      result.current.handleEditFieldChange("awayMoneyline", "+230");
      result.current.handleEditFieldChange("spread", "-6.5");
      result.current.handleEditFieldChange("spreadHomeOdds", "-110");
      result.current.handleEditFieldChange("spreadAwayOdds", "-110");
      result.current.handleEditFieldChange("overUnder", "145.5");
      result.current.handleEditFieldChange("overOdds", "-110");
      result.current.handleEditFieldChange("underOdds", "-110");
    });

    act(() => {
      result.current.saveEdit(0);
    });

    expect(result.current.linesRows[0].editedOdds).toMatchObject({
      homeMoneyline: -285,
      awayMoneyline: 230,
      spread: -6.5,
      overUnder: 145.5,
    });

    act(() => {
      result.current.setSharpPaste(VSIN_SAMPLE);
    });

    act(() => {
      result.current.handleSharpImport();
    });

    act(() => {
      result.current.runLineSim(0);
    });

    act(() => {
      result.current.handleExport();
    });

    expect(click).toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    const csv = await blob.text();
    expect(csv).toContain("Sharp ML Side");
    expect(csv).toContain("Sharp Spread Handle %");
    expect(csv).toContain("Sharp Total Edge %");
    expect(csv).toContain("HOME");
    expect(csv).toContain("58%");
    expect(csv).toContain("47%");

    createElement.mockRestore();
    createObjectURL.mockRestore();
    revokeObjectURL.mockRestore();
  });
});
