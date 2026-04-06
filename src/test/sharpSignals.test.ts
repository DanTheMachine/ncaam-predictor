import { describe, expect, test } from "vitest";
import { parseSharpSignals } from "../lib/sharpSignals";

describe("sharpSignals", () => {
  test("parses a VSiN two-row game block", () => {
    const raw = [
      "CBB - Monday, Apr 6\tSpread\tHandle\tBets\tTotal\tHandle\tBets\tMoney\tHandle\tBets",
      "↺\t(2) Connecticut\t+6.5\t30%\t36%\t145.5\t79%\t74%\t+230\t42%\t53%",
      "▼",
      "17\t(1) Michigan\t-6.5\t70%\t64%\t145.5\t21%\t26%\t-285\t58%\t47%",
      "▲",
    ].join("\n");

    const parsed = parseSharpSignals(raw);

    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      matchup: "UConn@MICH",
      spread: {
        away: { handlePct: 30, betsPct: 36 },
        home: { handlePct: 70, betsPct: 64 },
      },
      total: {
        line: 145.5,
        over: { handlePct: 79, betsPct: 74 },
        under: { handlePct: 21, betsPct: 26 },
      },
      moneyline: {
        away: { odds: 230, handlePct: 42, betsPct: 53 },
        home: { odds: -285, handlePct: 58, betsPct: 47 },
      },
    });
  });
});
