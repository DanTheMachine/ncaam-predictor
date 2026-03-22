import { act, renderHook } from "@testing-library/react";
import { usePredictorState } from "../hooks/usePredictorState";

describe("usePredictorState", () => {
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
});
