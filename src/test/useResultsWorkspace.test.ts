import { act, renderHook } from "@testing-library/react";
import { useResultsWorkspace } from "../hooks/useResultsWorkspace";

describe("useResultsWorkspace", () => {
  test("imports predictions and results, computes graded rows, and clears imports", () => {
    const { result } = renderHook(() => useResultsWorkspace());

    const predictionsCsv = [
      "Date,Home,Away,H Proj,A Proj,Model Total,Vegas O/U,Over Odds,Under Odds,O/U Rec,Recommended Total Line,O/U Edge,O/U Edge %,Vegas H ML,Vegas A ML,H ML (model),A ML (model),ML Rec,ML Edge,Vegas Spread,Spread Home Odds,Spread Away Odds,Spread Rec,Recommended Spread Line,Spread Edge,H Win%,A Win%",
      '2026-03-12,"DUKE Blue Devils","KU Jayhawks",78.0,71.0,149.0,145.5,-110,-110,OVER,145.5,3.5,5.2,-150,+130,-160,+140,HOME,4.1,-4.5,-110,-110,HOME,-4.5,3.4,61.0,39.0',
    ].join("\n");

    const resultsCsv = [
      "Date,Home,Away,Home Score,Away Score",
      "2026-03-12,DUKE,KU,80,70",
    ].join("\n");

    act(() => {
      result.current.setPredPaste(predictionsCsv);
    });
    act(() => {
      result.current.handleImportPredictions();
    });

    expect(result.current.predLogLength).toBe(1);
    expect(result.current.resultsStatus).toContain("Imported 1 predictions");

    act(() => {
      result.current.setResultsPaste(resultsCsv);
    });
    act(() => {
      result.current.handleImportResults();
    });

    expect(result.current.resultsLogLength).toBe(1);
    expect(result.current.gradedRows).toHaveLength(1);
    expect(result.current.gradedRows[0]).toMatchObject({
      graded: true,
      home: "DUKE",
      away: "KU",
      actualTotal: 150,
    });

    act(() => {
      result.current.setPredPaste(predictionsCsv);
    });
    act(() => {
      result.current.handleImportPredictions();
    });

    expect(result.current.predLogLength).toBe(1);

    act(() => {
      result.current.clearAllImports();
    });

    expect(result.current.predLogLength).toBe(0);
    expect(result.current.resultsLogLength).toBe(0);
    expect(result.current.resultsStatus).toBe("Cleared");
  });
});
