import { describe, expect, test } from "vitest";
import { extractInitialOdds, type OddsApiEvent } from "../lib/oddsApi";

describe("oddsApi", () => {
  test("prefers configured bookmakers when extracting initial odds", () => {
    const event: OddsApiEvent = {
      id: "evt1",
      commence_time: "2026-03-30T19:00:00Z",
      home_team: "Duke Blue Devils",
      away_team: "Kansas Jayhawks",
      bookmakers: [
        {
          key: "bovada",
          title: "Bovada",
          markets: [
            {
              key: "h2h",
              outcomes: [
                { name: "Duke Blue Devils", price: -150 },
                { name: "Kansas Jayhawks", price: 125 },
              ],
            },
            {
              key: "spreads",
              outcomes: [
                { name: "Duke Blue Devils", price: -108, point: -3 },
                { name: "Kansas Jayhawks", price: -112, point: 3 },
              ],
            },
            {
              key: "totals",
              outcomes: [
                { name: "Over", price: -110, point: 149.5 },
                { name: "Under", price: -110, point: 149.5 },
              ],
            },
          ],
        },
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
    };

    expect(extractInitialOdds(event)).toMatchObject({
      source: "odds-api:draftkings",
      homeMoneyline: -155,
      awayMoneyline: 130,
      spread: -3.5,
      overUnder: 148.5,
    });
  });

  test("returns null when no bookmaker has all required markets", () => {
    const event: OddsApiEvent = {
      id: "evt2",
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
          ],
        },
      ],
    };

    expect(extractInitialOdds(event)).toBeNull();
  });
});
