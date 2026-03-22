import type { ChangeEvent, RefObject } from "react";
import type { AggregateStats, EvalControlState, EvalSummary, GradedPredictionRow } from "../types";

interface ResultsTrackerTabProps {
  resultsStatus: string;
  resultsError: string;
  gradedRows: GradedPredictionRow[];
  stats: AggregateStats;
  showResultsPaste: boolean;
  showPredPaste: boolean;
  resultsLogLength: number;
  predLogLength: number;
  resultsPaste: string;
  predPaste: string;
  setShowResultsPaste: (updater: boolean | ((value: boolean) => boolean)) => void;
  setShowPredPaste: (updater: boolean | ((value: boolean) => boolean)) => void;
  setResultsPaste: (value: string) => void;
  setPredPaste: (value: string) => void;
  handleImportResults: () => void;
  handleImportPredictions: () => void;
  clearAllImports: () => void;
}

interface ModelEvalTabProps {
  resultsStatus: string;
  resultsError: string;
  predPaste: string;
  resultsPaste: string;
  evalThresholds: EvalControlState;
  evalCalibration: EvalControlState;
  evalSummary: EvalSummary;
  gradedRows: GradedPredictionRow[];
  stats: AggregateStats;
  evalResultsFileRef: RefObject<HTMLInputElement | null>;
  evalPredFileRef: RefObject<HTMLInputElement | null>;
  setPredPaste: (value: string) => void;
  setResultsPaste: (value: string) => void;
  setEvalThresholds: (
    updater: EvalControlState | ((value: EvalControlState) => EvalControlState),
  ) => void;
  setEvalCalibration: (
    updater: EvalControlState | ((value: EvalControlState) => EvalControlState),
  ) => void;
  handleImportPredictions: () => void;
  handleImportResults: () => void;
  handleResultsFileImport: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  handlePredictionsFileImport: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  clearAllImports: () => void;
}

const actionButtonStyle = {
  background: "linear-gradient(135deg,#8B0000,#cc3300)",
  border: "none",
  borderRadius: 4,
  padding: "7px 16px",
  color: "#fff",
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: 2,
  fontFamily: "monospace",
  cursor: "pointer",
} as const;

const secondaryBlueButtonStyle = {
  background: "rgba(96,165,250,0.08)",
  border: "1px solid rgba(96,165,250,0.22)",
  borderRadius: 4,
  padding: "7px 16px",
  color: "#93c5fd",
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: 2,
  fontFamily: "monospace",
  cursor: "pointer",
} as const;

const secondaryGreenButtonStyle = {
  background: "rgba(74,222,128,0.08)",
  border: "1px solid rgba(74,222,128,0.22)",
  borderRadius: 4,
  padding: "7px 16px",
  color: "#86efac",
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: 2,
  fontFamily: "monospace",
  cursor: "pointer",
} as const;

const clearButtonStyle = {
  background: "transparent",
  border: "1px solid rgba(255,200,50,0.12)",
  borderRadius: 4,
  padding: "7px 14px",
  color: "#b9925c",
  fontSize: 9,
  fontFamily: "monospace",
  cursor: "pointer",
} as const;

const dangerButtonStyle = {
  background: "rgba(239,68,68,0.07)",
  border: "1px solid rgba(239,68,68,0.2)",
  borderRadius: 5,
  padding: "7px 14px",
  color: "#f87171",
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: 2,
  fontFamily: "monospace",
  cursor: "pointer",
} as const;

const textInputStyle = {
  width: "100%",
  background: "#0a0600",
  border: "1px solid rgba(255,200,50,0.18)",
  borderRadius: 4,
  color: "#f0e8d0",
  fontFamily: "monospace",
  fontSize: 10,
  padding: "6px 8px",
  boxSizing: "border-box",
} as const;

function summaryCard(label: string, wins: number, losses: number, winPct: number, units: number) {
  return (
    <div
      key={label}
      style={{
        background: "rgba(255,200,50,0.02)",
        border: "1px solid rgba(255,200,50,0.12)",
        borderRadius: 8,
        padding: "14px 16px",
      }}
    >
      <div style={{ fontSize: 8, color: "#c8a060", letterSpacing: 3, marginBottom: 8 }}>{label}</div>
      <div
        style={{
          fontSize: 30,
          fontWeight: 400,
          color: "#f0e8d0",
          fontFamily: "'Bebas Neue',monospace",
          lineHeight: 1,
        }}
      >
        {wins}-{losses}
      </div>
      <div style={{ fontSize: 10, color: "#c8a060", marginTop: 4 }}>
        {winPct.toFixed(1)}% | ROI {units >= 0 ? "+" : ""}
        {units.toFixed(2)}u
      </div>
    </div>
  );
}

export function ResultsTrackerTab({
  resultsStatus,
  resultsError,
  gradedRows,
  stats,
  showResultsPaste,
  showPredPaste,
  resultsLogLength,
  predLogLength,
  resultsPaste,
  predPaste,
  setShowResultsPaste,
  setShowPredPaste,
  setResultsPaste,
  setPredPaste,
  handleImportResults,
  handleImportPredictions,
  clearAllImports,
}: ResultsTrackerTabProps) {
  return (
    <div style={{ animation: "fadeUp 0.2s ease" }}>
      {resultsStatus && (
        <div style={{ fontSize: 10, color: "#4ade80", marginBottom: 10, fontFamily: "monospace" }}>
          ✓ {resultsStatus}
        </div>
      )}
      {resultsError && (
        <div style={{ fontSize: 10, color: "#f87171", marginBottom: 10, fontFamily: "monospace" }}>
          Warning: {resultsError}
        </div>
      )}

      {gradedRows.some((row) => row.graded) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
          {[
            { label: "MONEYLINE", summary: stats.ml },
            { label: "SPREAD ATS", summary: stats.spr },
            { label: "OVER / UNDER", summary: stats.ou },
          ].map(({ label, summary }) =>
            summaryCard(label, summary.wins, summary.losses, summary.winPct, summary.units),
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <button
          onClick={() => setShowResultsPaste((value: boolean) => !value)}
          style={{
            background: showResultsPaste ? "rgba(245,197,24,0.12)" : "rgba(255,200,50,0.06)",
            border: "1px solid rgba(255,200,50,0.18)",
            borderRadius: 5,
            padding: "8px 16px",
            color: showResultsPaste ? "#f5c518" : "#c8a060",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 2,
            fontFamily: "monospace",
            cursor: "pointer",
          }}
        >
          {showResultsPaste ? "Hide Results CSV" : "Paste Results CSV"}
        </button>
        <button
          onClick={() => setShowPredPaste((value: boolean) => !value)}
          style={{
            background: showPredPaste ? "rgba(245,197,24,0.12)" : "rgba(255,200,50,0.06)",
            border: "1px solid rgba(255,200,50,0.18)",
            borderRadius: 5,
            padding: "8px 16px",
            color: showPredPaste ? "#f5c518" : "#c8a060",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 2,
            fontFamily: "monospace",
            cursor: "pointer",
          }}
        >
          {showPredPaste ? "Hide Predictions CSV" : "Paste Predictions CSV"}
        </button>
        {(resultsLogLength > 0 || predLogLength > 0) && (
          <button onClick={clearAllImports} style={dangerButtonStyle}>
            Clear All
          </button>
        )}
      </div>

      {showResultsPaste && (
        <div
          style={{
            background: "rgba(255,200,50,0.02)",
            border: "1px solid rgba(255,200,50,0.12)",
            borderRadius: 6,
            padding: 14,
            marginBottom: 12,
            animation: "fadeUp 0.2s ease",
          }}
        >
          <div style={{ fontSize: 8, color: "#c8a060", letterSpacing: 3, marginBottom: 8 }}>
            Paste results CSV: Date, Home, Away, Home Score, Away Score
          </div>
          <textarea
            value={resultsPaste}
            onChange={(event) => setResultsPaste(event.target.value)}
            rows={5}
            style={{
              width: "100%",
              background: "rgba(0,0,0,0.4)",
              border: "1px solid rgba(255,200,50,0.15)",
              borderRadius: 4,
              padding: "8px 10px",
              color: "#f0e8d0",
              fontFamily: "monospace",
              fontSize: 10,
              resize: "vertical",
              boxSizing: "border-box",
            }}
            placeholder={"Date,Home,Away,Home Score,Away Score\n2026-03-12,DUKE,KU,78,71"}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={handleImportResults} style={actionButtonStyle}>
              Import
            </button>
            <button
              onClick={() => {
                setResultsPaste("");
                setShowResultsPaste(false);
              }}
              style={clearButtonStyle}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showPredPaste && (
        <div
          style={{
            background: "rgba(255,200,50,0.02)",
            border: "1px solid rgba(255,200,50,0.12)",
            borderRadius: 6,
            padding: 14,
            marginBottom: 12,
            animation: "fadeUp 0.2s ease",
          }}
        >
          <div style={{ fontSize: 8, color: "#c8a060", letterSpacing: 3, marginBottom: 8 }}>
            Paste predictions CSV exported from the Predictor tab
          </div>
          <textarea
            value={predPaste}
            onChange={(event) => setPredPaste(event.target.value)}
            rows={5}
            style={{
              width: "100%",
              background: "rgba(0,0,0,0.4)",
              border: "1px solid rgba(255,200,50,0.15)",
              borderRadius: 4,
              padding: "8px 10px",
              color: "#f0e8d0",
              fontFamily: "monospace",
              fontSize: 10,
              resize: "vertical",
              boxSizing: "border-box",
            }}
            placeholder="Paste the full ncaa-predictions-YYYY-MM-DD.csv content here..."
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={handleImportPredictions} style={actionButtonStyle}>
              Import
            </button>
            <button
              onClick={() => {
                setPredPaste("");
                setShowPredPaste(false);
              }}
              style={clearButtonStyle}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {predLogLength > 0 ? (
        <div style={{ background: "#0a0700", border: "1px solid #1a1200", borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 8, fontWeight: 700, color: "#b28a57", letterSpacing: 3, marginBottom: 12 }}>
            Game Log | {predLogLength} predictions | {gradedRows.filter((row) => row.graded).length} graded
          </div>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{ width: "100%", borderCollapse: "collapse", fontFamily: "monospace", fontSize: 10, minWidth: 850 }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,200,50,0.15)" }}>
                  {["DATE", "MATCHUP", "PROJ", "ACTUAL", "TOTAL", "V.OU", "O/U REC", "ML REC", "ML", "SPR REC", "SPR", "RESULT"].map((heading) => (
                    <th
                      key={heading}
                      style={{ padding: "6px 8px", textAlign: "left", fontSize: 7, color: "#b28a57", letterSpacing: 2, fontWeight: 700, whiteSpace: "nowrap" }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gradedRows.map((row, index) => {
                  const hasResult = row.graded;
                  const statusColor = (value: boolean | null) =>
                    value === true ? "#4ade80" : value === false ? "#f87171" : "#b28a57";

                  return (
                    <tr
                      key={`${row.date}-${row.home}-${row.away}-${index}`}
                      style={{
                        borderBottom: "1px solid rgba(255,200,50,0.04)",
                        background: index % 2 === 0 ? "transparent" : "rgba(255,200,50,0.01)",
                      }}
                    >
                      <td style={{ padding: "6px 8px", color: "#6a5030", whiteSpace: "nowrap" }}>{row.date}</td>
                      <td style={{ padding: "6px 8px", color: "#f0e8d0", fontWeight: 700, whiteSpace: "nowrap" }}>
                        {row.home} vs {row.away}
                      </td>
                      <td style={{ padding: "6px 8px", color: "#c8a060", whiteSpace: "nowrap" }}>
                        {row.hProj && row.aProj ? `${row.hProj}-${row.aProj}` : "-"}
                      </td>
                      <td
                        style={{
                          padding: "6px 8px",
                          color: hasResult ? "#f0e8d0" : "#2a1a0a",
                          fontWeight: hasResult ? 700 : 400,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {hasResult && row.res ? `${row.res.hScore}-${row.res.aScore}` : "pending"}
                      </td>
                      <td style={{ padding: "6px 8px", color: hasResult ? statusColor(row.ouWin) : "#b28a57", whiteSpace: "nowrap" }}>
                        {hasResult ? row.actualTotal : "-"}
                        {row.modelTotal ? ` (m${row.modelTotal})` : ""}
                      </td>
                      <td style={{ padding: "6px 8px", color: "#6a5030" }}>{row.vegaOU ?? "-"}</td>
                      <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>
                        <span style={{ color: hasResult ? statusColor(row.ouWin) : "#2a1a0a", fontWeight: 700 }}>
                          {row.ouRec && row.ouRec !== "—" ? row.ouRec : "PASS"}
                        </span>
                        {hasResult && row.ouWin !== null && (
                          <span style={{ fontSize: 8, marginLeft: 4, color: statusColor(row.ouWin) }}>
                            {row.ouWin ? "W" : "L"}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "6px 8px", color: "#c8a060", whiteSpace: "nowrap" }}>
                        {row.hWinPct ? (row.hWinPct > 50 ? `${row.home} ${row.hWinPct}%` : `${row.away} ${row.aWinPct}%`) : "-"}
                      </td>
                      <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>
                        <span style={{ color: hasResult && row.mlWin !== null ? statusColor(row.mlWin) : "#2a1a0a", fontWeight: 700 }}>
                          {hasResult && row.mlWin !== null ? (row.mlWin ? "WIN" : "LOSS") : "-"}
                        </span>
                        {hasResult && row.mlWin !== null && row.mlROI !== null && (
                          <span style={{ fontSize: 8, marginLeft: 4, color: statusColor(row.mlWin) }}>
                            {row.mlROI >= 0 ? "+" : ""}
                            {row.mlROI.toFixed(2)}u
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "6px 8px", color: "#c8a060", whiteSpace: "nowrap", fontSize: 9 }}>
                        {row.sprRec && row.sprRec !== "—" && row.sprRec !== "PASS" ? row.sprRec : "PASS"}
                      </td>
                      <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>
                        <span style={{ color: hasResult && row.sprWin !== null ? statusColor(row.sprWin) : "#2a1a0a", fontWeight: 700 }}>
                          {hasResult && row.sprWin !== null ? (row.sprWin ? "WIN" : "LOSS") : "-"}
                        </span>
                        {hasResult && row.sprWin !== null && row.sprROI !== null && (
                          <span style={{ fontSize: 8, marginLeft: 4, color: statusColor(row.sprWin) }}>
                            {row.sprROI >= 0 ? "+" : ""}
                            {row.sprROI.toFixed(2)}u
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>
                        {hasResult && row.res ? (
                          <span
                            style={{
                              fontSize: 8,
                              padding: "2px 6px",
                              borderRadius: 3,
                              background:
                                row.res.hScore > row.res.aScore ? "rgba(245,197,24,0.1)" : "rgba(255,100,100,0.08)",
                              color: row.res.hScore > row.res.aScore ? "#f5c518" : "#f87171",
                              border: `1px solid ${
                                row.res.hScore > row.res.aScore
                                  ? "rgba(245,197,24,0.2)"
                                  : "rgba(255,100,100,0.2)"
                              }`,
                            }}
                          >
                            {row.res.hScore > row.res.aScore ? row.home : row.away} +{Math.abs(row.res.hScore - row.res.aScore)}
                          </span>
                        ) : (
                          <span style={{ color: "#2a1a0a" }}>-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div
          style={{
            background: "rgba(255,200,50,0.01)",
            border: "1px solid rgba(255,200,50,0.07)",
            borderRadius: 8,
            padding: 48,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 14, opacity: 0.25 }}>Scoreboard</div>
          <div style={{ fontSize: 12, color: "#b28a57", letterSpacing: 3, fontFamily: "'Bebas Neue',monospace" }}>
            NO DATA YET
          </div>
          <div style={{ fontSize: 9, color: "#2a1a0a", marginTop: 10, lineHeight: 2.2 }}>
            1. Enter games in Predictor, run sims, and export the CSV.
            <br />
            2. Come back here and import the predictions CSV.
            <br />
            3. After games finish, import the results CSV.
            <br />
            4. The model grades itself automatically.
          </div>
        </div>
      )}
    </div>
  );
}

export function ModelEvalTab({
  resultsStatus,
  resultsError,
  predPaste,
  resultsPaste,
  evalThresholds,
  evalCalibration,
  evalSummary,
  gradedRows,
  stats,
  evalResultsFileRef,
  evalPredFileRef,
  setPredPaste,
  setResultsPaste,
  setEvalThresholds,
  setEvalCalibration,
  handleImportPredictions,
  handleImportResults,
  handleResultsFileImport,
  handlePredictionsFileImport,
  clearAllImports,
}: ModelEvalTabProps) {
  return (
    <div style={{ animation: "fadeUp 0.2s ease" }}>
      {resultsStatus && (
        <div style={{ fontSize: 10, color: "#4ade80", marginBottom: 10, fontFamily: "monospace" }}>
          {resultsStatus}
        </div>
      )}
      {resultsError && (
        <div style={{ fontSize: 10, color: "#f87171", marginBottom: 10, fontFamily: "monospace" }}>
          Warning: {resultsError}
        </div>
      )}

      <input ref={evalResultsFileRef} type="file" accept=".csv,.txt" onChange={handleResultsFileImport} style={{ display: "none" }} />
      <input ref={evalPredFileRef} type="file" accept=".csv,.txt" onChange={handlePredictionsFileImport} style={{ display: "none" }} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12, marginBottom: 16 }}>
        <div style={{ background: "rgba(255,200,50,0.02)", border: "1px solid rgba(255,200,50,0.12)", borderRadius: 6, padding: 14 }}>
          <div style={{ fontSize: 8, color: "#c8a060", letterSpacing: 3, marginBottom: 8 }}>PREDICTIONS CSV</div>
          <textarea
            value={predPaste}
            onChange={(event) => setPredPaste(event.target.value)}
            rows={7}
            style={{
              width: "100%",
              background: "rgba(0,0,0,0.4)",
              border: "1px solid rgba(255,200,50,0.15)",
              borderRadius: 4,
              padding: "8px 10px",
              color: "#f0e8d0",
              fontFamily: "monospace",
              fontSize: 10,
              resize: "vertical",
              boxSizing: "border-box",
            }}
            placeholder="Paste the full predictions CSV content here..."
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={handleImportPredictions} style={actionButtonStyle}>IMPORT PREDICTIONS</button>
            <button onClick={() => evalPredFileRef.current?.click()} style={secondaryBlueButtonStyle}>PREDICTIONS CSV</button>
            <button onClick={() => setPredPaste("")} style={clearButtonStyle}>CLEAR</button>
          </div>
        </div>

        <div style={{ background: "rgba(255,200,50,0.02)", border: "1px solid rgba(255,200,50,0.12)", borderRadius: 6, padding: 14 }}>
          <div style={{ fontSize: 8, color: "#c8a060", letterSpacing: 3, marginBottom: 8 }}>RESULTS CSV</div>
          <textarea
            value={resultsPaste}
            onChange={(event) => setResultsPaste(event.target.value)}
            rows={7}
            style={{
              width: "100%",
              background: "rgba(0,0,0,0.4)",
              border: "1px solid rgba(255,200,50,0.15)",
              borderRadius: 4,
              padding: "8px 10px",
              color: "#f0e8d0",
              fontFamily: "monospace",
              fontSize: 10,
              resize: "vertical",
              boxSizing: "border-box",
            }}
            placeholder={"Date,Home,Away,Home Score,Away Score\n2026-03-12,DUKE,KU,78,71"}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={handleImportResults} style={actionButtonStyle}>IMPORT RESULTS</button>
            <button onClick={() => evalResultsFileRef.current?.click()} style={secondaryGreenButtonStyle}>RESULTS CSV</button>
            <button onClick={() => setResultsPaste("")} style={clearButtonStyle}>CLEAR</button>
          </div>
        </div>
      </div>

      <div style={{ background: "rgba(255,200,50,0.02)", border: "1px solid rgba(255,200,50,0.12)", borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: "#f5c518", letterSpacing: 4, marginBottom: 12 }}>THRESHOLDS & CALIBRATION</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12 }}>
          {[
            { key: "ml" as const, label: "MONEYLINE", thresholdLabel: "Edge %", calibrationLabel: "Calibration %" },
            { key: "spr" as const, label: "SPREAD", thresholdLabel: "Edge %", calibrationLabel: "Calibration %" },
            { key: "ou" as const, label: "TOTALS", thresholdLabel: "Edge %", calibrationLabel: "Calibration %" },
          ].map((config) => (
            <div key={config.key} style={{ background: "rgba(0,0,0,0.28)", border: "1px solid rgba(255,200,50,0.08)", borderRadius: 6, padding: 12 }}>
              <div style={{ fontSize: 8, color: "#c8a060", letterSpacing: 3, marginBottom: 8 }}>{config.label}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 8, color: "#b28a57", marginBottom: 4 }}>{config.thresholdLabel}</div>
                  <input
                    value={evalThresholds[config.key]}
                    onChange={(event) =>
                      setEvalThresholds((prev) => ({ ...prev, [config.key]: event.target.value }))
                    }
                    style={textInputStyle}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 8, color: "#b28a57", marginBottom: 4 }}>{config.calibrationLabel}</div>
                  <input
                    value={evalCalibration[config.key]}
                    onChange={(event) =>
                      setEvalCalibration((prev) => ({ ...prev, [config.key]: event.target.value }))
                    }
                    style={textInputStyle}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10, marginBottom: 16 }}>
        {[
          { key: "ml" as const, label: "MONEY LINE", color: "#93c5fd" },
          { key: "spr" as const, label: "SPREAD", color: "#f59e0b" },
          { key: "ou" as const, label: "O/U", color: "#a78bfa" },
        ].map(({ key, label, color }) => {
          const summary = evalSummary[key];
          const record = `${summary.all.wins}-${summary.all.losses}-${summary.all.pushes}`;
          const actualRecord = `${summary.actual.wins}-${summary.actual.losses}-${summary.actual.pushes}`;
          return (
            <div key={key} style={{ background: "rgba(255,200,50,0.02)", border: "1px solid rgba(255,200,50,0.12)", borderRadius: 8, padding: "14px 16px" }}>
              <div style={{ fontSize: 9, color, letterSpacing: 3, marginBottom: 10 }}>{label}</div>
              <div style={{ fontSize: 24, color, fontFamily: "'Bebas Neue',monospace", marginBottom: 10 }}>
                {summary.all.units >= 0 ? "+" : ""}
                {summary.all.units.toFixed(2)}u
              </div>
              {[
                ["Bets", summary.all.bets],
                ["Record", record],
                ["Hit rate", `${summary.all.hitRate.toFixed(1)}%`],
                ["Units", `${summary.all.units >= 0 ? "+" : ""}${summary.all.units.toFixed(2)}u`],
                ["ROI", `${summary.all.roiPct >= 0 ? "+" : ""}${summary.all.roiPct.toFixed(1)}%`],
                ["Actual Bets", summary.actual.bets],
                ["Actual Record", actualRecord],
                ["Actual Hit rate", `${summary.actual.hitRate.toFixed(1)}%`],
                ["Actual Units", `${summary.actual.units >= 0 ? "+" : ""}${summary.actual.units.toFixed(2)}u`],
                ["Actual ROI", `${summary.actual.roiPct >= 0 ? "+" : ""}${summary.actual.roiPct.toFixed(1)}%`],
              ].map(([itemKey, value]) => (
                <div key={itemKey} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "3px 0", borderBottom: "1px solid rgba(255,200,50,0.05)" }}>
                  <span style={{ fontSize: 9, color: "#b28a57" }}>{itemKey}</span>
                  <span style={{ fontSize: 9, color: "#f0e8d0", fontFamily: "monospace" }}>{value}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {gradedRows.filter((row) => row.graded).length > 0 ? (
        <div style={{ background: "#0a0700", border: "1px solid #1a1200", borderRadius: 8, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <div style={{ fontSize: 8, fontWeight: 700, color: "#b28a57", letterSpacing: 3 }}>
              EVALUATED BETS | {gradedRows.filter((row) => row.graded).length} matched games | {stats.overall.bets} total wagers
            </div>
            <button onClick={clearAllImports} style={dangerButtonStyle}>CLEAR IMPORTS</button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "monospace", fontSize: 10, minWidth: 980 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,200,50,0.15)" }}>
                  {["DATE", "MATCHUP", "ACTUAL", "ML ROI", "SPR ROI", "OU ROI", "MODEL TOTAL", "VEGAS O/U", "RECS"].map((heading) => (
                    <th key={heading} style={{ padding: "6px 8px", textAlign: "left", fontSize: 7, color: "#b28a57", letterSpacing: 2, fontWeight: 700, whiteSpace: "nowrap" }}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gradedRows.filter((row) => row.graded).map((row, index) => {
                  const colorFor = (value: number | null) =>
                    value == null ? "#b28a57" : value > 0 ? "#4ade80" : value < 0 ? "#f87171" : "#f5c518";
                  return (
                    <tr key={`${row.date}-${row.home}-${row.away}-${index}`} style={{ borderBottom: "1px solid rgba(255,200,50,0.04)", background: index % 2 === 0 ? "transparent" : "rgba(255,200,50,0.01)" }}>
                      <td style={{ padding: "6px 8px", color: "#6a5030", whiteSpace: "nowrap" }}>{row.date}</td>
                      <td style={{ padding: "6px 8px", color: "#f0e8d0", fontWeight: 700, whiteSpace: "nowrap" }}>{row.away} @ {row.home}</td>
                      <td style={{ padding: "6px 8px", color: "#f0e8d0", whiteSpace: "nowrap" }}>{row.res?.hScore}-{row.res?.aScore}</td>
                      <td style={{ padding: "6px 8px", color: colorFor(row.mlROI), whiteSpace: "nowrap" }}>{row.mlROI == null ? "PASS" : `${row.mlROI >= 0 ? "+" : ""}${row.mlROI.toFixed(2)}u`}</td>
                      <td style={{ padding: "6px 8px", color: colorFor(row.sprROI), whiteSpace: "nowrap" }}>{row.sprROI == null ? "PASS" : `${row.sprROI >= 0 ? "+" : ""}${row.sprROI.toFixed(2)}u`}</td>
                      <td style={{ padding: "6px 8px", color: colorFor(row.ouROI), whiteSpace: "nowrap" }}>{row.ouROI == null ? "PASS" : `${row.ouROI >= 0 ? "+" : ""}${row.ouROI.toFixed(2)}u`}</td>
                      <td style={{ padding: "6px 8px", color: "#c8a060", whiteSpace: "nowrap" }}>{row.modelTotal ?? "-"}</td>
                      <td style={{ padding: "6px 8px", color: "#c8a060", whiteSpace: "nowrap" }}>{row.vegaOU ?? "-"}</td>
                      <td style={{ padding: "6px 8px", color: "#c8a060", whiteSpace: "nowrap" }}>
                        {[
                          row.mlRec && row.mlRec !== "PASS" && `${row.mlRec.toUpperCase()} ML`,
                          row.sprRec && row.sprRec !== "PASS" && `${row.sprRec.toUpperCase()} SPR`,
                          row.ouRec && row.ouRec !== "PASS" && `${row.ouRec.toUpperCase()} ${row.recTotalLine ?? row.vegaOU}`,
                        ]
                          .filter(Boolean)
                          .join(" | ") || "No actionable bets"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ background: "rgba(255,200,50,0.01)", border: "1px solid rgba(255,200,50,0.07)", borderRadius: 8, padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 14, opacity: 0.25 }}>ROI</div>
          <div style={{ fontSize: 12, color: "#b28a57", letterSpacing: 3, fontFamily: "'Bebas Neue',monospace" }}>WAITING FOR FILES</div>
          <div style={{ fontSize: 9, color: "#2a1a0a", marginTop: 10, lineHeight: 2.2 }}>
            1. Import the predictions CSV exported by this app.
            <br />
            2. Import the matching results CSV after games finish.
            <br />
            3. The tab calculates realized ROI automatically from the model recommendations.
          </div>
        </div>
      )}
    </div>
  );
}
