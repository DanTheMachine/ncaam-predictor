import { Fragment } from "react";
import type { ChangeEvent, ComponentType, RefObject } from "react";
import { CourtBar, TeamCard, StatBar } from "./PredictorBits";
import { TEAMS } from "../data/ncaaData";
import { americanToImplied, analyzeBetting, mlAmerican } from "../lib/predictionEngine";
import type { LiveStatsMap, Odds, PredictionResult, TeamData } from "../types";

interface StatsImportPanelProps {
  cardStyle: Record<string, string | number>;
  hasLive: boolean;
  statsSource: string;
  liveStatsCount: number;
  statsUpdated: string;
  kpStatus: string;
  kpError: string;
  showKP: boolean;
  kpPaste: string;
  statsFileRef: RefObject<HTMLInputElement | null>;
  setShowKP: (value: boolean | ((value: boolean) => boolean)) => void;
  setKpPaste: (value: string) => void;
  setKpError: (value: string) => void;
  handleStatsFile: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  handleClipboardImport: () => void | Promise<void>;
  handleKPImport: () => void;
  resetToEstimates: () => void;
}

export function StatsImportPanel({
  cardStyle,
  hasLive,
  statsSource,
  liveStatsCount,
  statsUpdated,
  kpStatus,
  kpError,
  showKP,
  kpPaste,
  statsFileRef,
  setShowKP,
  setKpPaste,
  setKpError,
  handleStatsFile,
  handleClipboardImport,
  handleKPImport,
  resetToEstimates,
}: StatsImportPanelProps) {
  return (
    <div style={{ ...cardStyle, border: `1px solid ${hasLive ? "rgba(245,197,24,0.3)" : "rgba(255,200,50,0.12)"}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: showKP ? 14 : 0 }}>
        <div>
          <div style={{ fontSize: 9, color: "#c8a060", letterSpacing: 3, marginBottom: 5 }}>
            STATS · IMPORT (BARTTORVIK OR KENPOM)
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: hasLive ? "#f5c518" : "#4b5563",
                boxShadow: hasLive ? "0 0 8px #f5c518" : "none",
              }}
            />
            <span style={{ fontSize: 11, color: hasLive ? "#f5c518" : "#b9925c" }}>
              {hasLive
                ? `✓ Live stats · ${statsSource} · ${liveStatsCount} teams · ${statsUpdated}`
                : "Paste Barttorvik or KenPom CSV — source auto-detected from headers"}
            </span>
          </div>
          {kpStatus && !kpError && <div style={{ fontSize: 10, color: "#4ade80", marginTop: 4 }}>{kpStatus}</div>}
          {kpError && <div style={{ fontSize: 10, color: "#f87171", marginTop: 4 }}>Warning: {kpError}</div>}
        </div>
        <button
          onClick={() => setShowKP((value: boolean) => !value)}
          style={{
            background: showKP ? "rgba(204,51,0,0.15)" : "linear-gradient(135deg,#8B0000,#cc3300)",
            border: showKP ? "1px solid rgba(204,51,0,0.4)" : "none",
            borderRadius: 4,
            padding: "8px 16px",
            color: showKP ? "#f5c518" : "#fff",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 2,
            fontFamily: "'Courier New',monospace",
            cursor: "pointer",
          }}
        >
          {showKP ? "▲ HIDE" : hasLive ? "↻ UPDATE" : "⬇ IMPORT"}
        </button>
      </div>

      {showKP && (
        <div style={{ animation: "fadeUp 0.2s ease" }}>
          <input ref={statsFileRef} type="file" accept=".csv,.tsv,.txt" onChange={handleStatsFile} style={{ display: "none" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div style={{ background: "rgba(74,222,128,0.04)", border: "1px solid rgba(74,222,128,0.18)", borderRadius: 6, padding: "12px 14px", fontSize: 11, lineHeight: 1.9, color: "#c8a060" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ fontSize: 9, color: "#4ade80", letterSpacing: 3, fontWeight: 700 }}>BARTTORVIK — FREE</div>
                <a href="https://barttorvik.com/trank.php" target="_blank" rel="noreferrer" style={{ fontSize: 9, color: "#4ade80", textDecoration: "none", border: "1px solid rgba(74,222,128,0.3)", borderRadius: 3, padding: "2px 7px", fontFamily: "monospace" }}>OPEN</a>
              </div>
              <div>1. Go to <strong style={{ color: "#f0e8d0" }}>barttorvik.com/trank.php</strong></div>
              <div>2. Set year and filters, then click <strong style={{ color: "#f0e8d0" }}>Export CSV</strong></div>
              <div>3. Open in a text editor or spreadsheet, then copy all rows.</div>
              <div>4. Paste below to import AdjOE, AdjDE, Tempo, and four factors.</div>
            </div>
            <div style={{ background: "rgba(255,200,50,0.03)", border: "1px solid rgba(255,200,50,0.1)", borderRadius: 6, padding: "12px 14px", fontSize: 11, lineHeight: 1.9, color: "#c8a060" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ fontSize: 9, color: "#f5c518", letterSpacing: 3, fontWeight: 700 }}>KENPOM — SUBSCRIPTION</div>
                <a href="https://kenpom.com" target="_blank" rel="noreferrer" style={{ fontSize: 9, color: "#f5c518", textDecoration: "none", border: "1px solid rgba(245,197,24,0.3)", borderRadius: 3, padding: "2px 7px", fontFamily: "monospace" }}>OPEN</a>
              </div>
              <div>1. Log in at <strong style={{ color: "#f0e8d0" }}>kenpom.com</strong></div>
              <div>2. Use Export or copy the main table.</div>
              <div>3. Include the header row with Team, Conf, AdjEM, AdjO, AdjD, and AdjT.</div>
              <div>4. Paste below to import AdjO, AdjD, AdjEM, and Tempo.</div>
            </div>
          </div>

          <textarea
            value={kpPaste}
            onChange={(event) => {
              setKpPaste(event.target.value);
              setKpError("");
            }}
            placeholder={
              "Paste Barttorvik CSV or KenPom table here — source auto-detected from column headers\n\nBarttorvik example:\nTeam,adjoe,adjde,adjtempo,efg%,...\nDuke,122.8,92.4,71.2,55.8,...\n\nKenPom example:\nTeam\tConf\tAdjEM\tAdjO\tAdjD\tAdjT\nDuke\tACC\t32.1\t124.2\t92.1\t71.4"
            }
            style={{
              width: "100%",
              height: 140,
              background: "#0a0600",
              border: "1px solid rgba(255,200,50,0.18)",
              borderRadius: 4,
              color: "#f0e8d0",
              fontSize: 11,
              fontFamily: "monospace",
              padding: 10,
              resize: "vertical",
              boxSizing: "border-box",
              outline: "none",
            }}
          />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8, marginTop: 8 }}>
            <button onClick={handleClipboardImport} style={{ padding: "8px 0", background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.22)", borderRadius: 4, color: "#86efac", fontSize: 10, fontWeight: 700, letterSpacing: 2, fontFamily: "'Courier New',monospace", cursor: "pointer" }}>
              IMPORT FROM CLIPBOARD
            </button>
            <button onClick={() => statsFileRef.current?.click()} style={{ padding: "8px 0", background: "rgba(255,200,50,0.05)", border: "1px solid rgba(255,200,50,0.16)", borderRadius: 4, color: "#f5c518", fontSize: 10, fontWeight: 700, letterSpacing: 2, fontFamily: "'Courier New',monospace", cursor: "pointer" }}>
              IMPORT FROM FILE
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginTop: 8 }}>
            <button
              onClick={handleKPImport}
              disabled={!kpPaste.trim()}
              style={{
                padding: "10px 0",
                background: kpPaste.trim() ? "linear-gradient(135deg,#8B0000,#cc3300)" : "rgba(255,200,50,0.04)",
                border: kpPaste.trim() ? "none" : "1px solid rgba(255,200,50,0.08)",
                borderRadius: 4,
                color: kpPaste.trim() ? "#fff" : "#9f7847",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 3,
                fontFamily: "'Courier New',monospace",
                cursor: kpPaste.trim() ? "pointer" : "not-allowed",
              }}
            >
              APPLY TO MODEL
            </button>
            <button onClick={() => { setKpPaste(""); setKpError(""); }} style={{ padding: "10px 14px", background: "transparent", border: "1px solid rgba(255,200,50,0.1)", borderRadius: 4, color: "#b28a57", fontSize: 10, fontFamily: "monospace", cursor: "pointer" }}>
              CLEAR
            </button>
          </div>

          {hasLive && (
            <button onClick={resetToEstimates} style={{ marginTop: 8, width: "100%", padding: "7px 0", background: "transparent", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 4, color: "#6b2424", fontSize: 10, fontFamily: "monospace", cursor: "pointer", letterSpacing: 2 }}>
              RESET TO ESTIMATES
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface UnmatchedTeam {
  name: string;
  count: number;
}

interface SlateControlsPanelProps {
  slateDate: string;
  slateGameType: string;
  slateNeutral: boolean;
  showBulkImport: boolean;
  espnLoading: boolean;
  bulkPaste: string;
  bulkStatus: string;
  bulkError: string;
  bulkUnmatched: UnmatchedTeam[];
  sharpPaste: string;
  sharpStatus: string;
  sharpError: string;
  showSharp: boolean;
  schedStatus: string;
  linesCount: number;
  hasSimResults: boolean;
  simsRunning: boolean;
  gameTypes: string[];
  onToggleBulkImport: () => void;
  onLoadEspnSlate: () => void | Promise<void>;
  onRunAllSims: () => void;
  onExportPredictions: () => void;
  onExportResults: () => void;
  onSlateDateChange: (value: string) => void;
  onSlateGameTypeChange: (value: string) => void;
  onToggleSlateNeutral: () => void;
  onApplySettingsToAllGames: () => void;
  onBulkPasteChange: (value: string) => void;
  onHandleBulkGames: () => void;
  onClearBulkImport: () => void;
  onSharpPasteChange: (value: string) => void;
  onHandleSharpImport: () => void;
  onClearSharpImport: () => void;
  onToggleSharpImport: () => void;
}

export function SlateControlsPanel({
  slateDate,
  slateGameType,
  slateNeutral,
  showBulkImport,
  espnLoading,
  bulkPaste,
  bulkStatus,
  bulkError,
  bulkUnmatched,
  sharpPaste,
  sharpStatus,
  sharpError,
  showSharp,
  schedStatus,
  linesCount,
  hasSimResults,
  simsRunning,
  gameTypes,
  onToggleBulkImport,
  onLoadEspnSlate,
  onRunAllSims,
  onExportPredictions,
  onExportResults,
  onSlateDateChange,
  onSlateGameTypeChange,
  onToggleSlateNeutral,
  onApplySettingsToAllGames,
  onBulkPasteChange,
  onHandleBulkGames,
  onClearBulkImport,
  onSharpPasteChange,
  onHandleSharpImport,
  onClearSharpImport,
  onToggleSharpImport,
}: SlateControlsPanelProps) {
  return (
    <>
      <div style={{ background: "rgba(96,165,250,0.03)", border: "1px solid rgba(96,165,250,0.14)", borderRadius: 6, padding: 14, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: showSharp ? 12 : 0 }}>
          <div>
            <div style={{ fontSize: 9, color: "#93c5fd", letterSpacing: 3, marginBottom: 5, fontWeight: 700 }}>VSIN SHARP DATA</div>
            <div style={{ fontSize: 10, color: sharpStatus && !sharpError ? "#4ade80" : "#93a9c9", lineHeight: 1.8 }}>
              {sharpStatus && !sharpError
                ? sharpStatus
                : "Step 2 after team stats: paste VSiN spread, total, and moneyline handle-vs-bets splits here."}
            </div>
            {sharpError && <div style={{ fontSize: 10, color: "#f87171", marginTop: 4 }}>Warning: {sharpError}</div>}
          </div>
          <button
            onClick={onToggleSharpImport}
            style={{
              background: showSharp ? "rgba(29,78,216,0.14)" : "linear-gradient(135deg,#1d4ed8,#2563eb)",
              border: showSharp ? "1px solid rgba(147,197,253,0.3)" : "none",
              borderRadius: 4,
              padding: "8px 16px",
              color: showSharp ? "#93c5fd" : "#fff",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 2,
              fontFamily: "'Courier New',monospace",
              cursor: "pointer",
            }}
          >
            {showSharp ? "HIDE" : sharpStatus && !sharpError ? "UPDATE" : "IMPORT"}
          </button>
        </div>
        {showSharp && (
          <div style={{ animation: "fadeUp 0.2s ease" }}>
            <div style={{ fontSize: 10, color: "#93a9c9", lineHeight: 1.9, marginBottom: 10 }}>
              <div>This is game-level input and supports the recommendation engine without changing the core score projection.</div>
              <a href="https://data.vsin.com/betting-splits/?source=DK&sport=CBB" target="_blank" rel="noreferrer" style={{ color: "#93c5fd", textDecoration: "none" }}>
                https://data.vsin.com/betting-splits/?source=DK&sport=CBB
              </a>
            </div>
        <textarea
          value={sharpPaste}
          onChange={(event) => onSharpPasteChange(event.target.value)}
          placeholder={"CBB - Monday, Apr 6\tSpread\tHandle\tBets\tTotal\tHandle\tBets\tMoney\tHandle\tBets\n↺\t(2) Connecticut\t+6.5\t30%\t36%\t145.5\t79%\t74%\t+230\t42%\t53%\n▼\n17\t(1) Michigan\t-6.5\t70%\t64%\t145.5\t21%\t26%\t-285\t58%\t47%\n▲"}
          style={{ width: "100%", height: 110, background: "#0a0600", border: "1px solid rgba(96,165,250,0.18)", borderRadius: 4, color: "#f0e8d0", fontSize: 11, fontFamily: "monospace", padding: 10, resize: "vertical", boxSizing: "border-box", outline: "none" }}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginTop: 8 }}>
          <button
            onClick={onHandleSharpImport}
            disabled={!sharpPaste.trim()}
            style={{
              padding: "9px 0",
              background: sharpPaste.trim() ? "linear-gradient(135deg,#1d4ed8,#2563eb)" : "rgba(96,165,250,0.04)",
              border: sharpPaste.trim() ? "none" : "1px solid rgba(96,165,250,0.08)",
              borderRadius: 4,
              color: sharpPaste.trim() ? "#fff" : "#6b86b1",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 3,
              fontFamily: "monospace",
              cursor: sharpPaste.trim() ? "pointer" : "not-allowed",
            }}
          >
            IMPORT VSIN DATA
          </button>
          <button onClick={onClearSharpImport} style={{ padding: "9px 14px", background: "transparent", border: "1px solid rgba(96,165,250,0.12)", borderRadius: 4, color: "#93c5fd", fontSize: 9, fontFamily: "monospace", cursor: "pointer" }}>
            CLEAR
          </button>
        </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: schedStatus ? 12 : 0 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#b28a57", letterSpacing: 3, marginBottom: 3 }}>
            TODAY'S SLATE & EXPORT
          </div>
          <div style={{ fontSize: 10, color: "#2a1a0a" }}>Enter games · add odds · run all sims · export CSV</div>
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          <button
            onClick={onLoadEspnSlate}
            disabled={espnLoading}
            style={{
              background: espnLoading ? "rgba(74,144,226,0.08)" : "linear-gradient(135deg,#0f3d64,#1d6fa5)",
              border: espnLoading ? "1px solid rgba(96,165,250,0.2)" : "none",
              borderRadius: 5,
              padding: "8px 14px",
              color: espnLoading ? "#93c5fd" : "#eff6ff",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 2,
              fontFamily: "monospace",
              cursor: espnLoading ? "not-allowed" : "pointer",
            }}
          >
            {espnLoading ? "LOADING ESPN..." : "LOAD ESPN SLATE"}
          </button>
          <button
            onClick={onToggleBulkImport}
            style={{
              background: showBulkImport ? "rgba(245,197,24,0.12)" : "#8B0000",
              border: showBulkImport ? "1px solid rgba(245,197,24,0.3)" : "none",
              borderRadius: 5,
              padding: "8px 14px",
              color: showBulkImport ? "#f5c518" : "#fff",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 2,
              fontFamily: "monospace",
              cursor: "pointer",
            }}
          >
            {showBulkImport ? "▲ HIDE" : linesCount ? "✎ EDIT SLATE" : "⬇ ENTER GAMES"}
          </button>
          {linesCount > 0 && (
            <button
              onClick={onRunAllSims}
              disabled={simsRunning}
              style={{
                background: simsRunning ? "#0a0700" : "#c8a020",
                border: "none",
                borderRadius: 5,
                padding: "8px 14px",
                color: simsRunning ? "#9f7847" : "#0a0700",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 2,
                fontFamily: "monospace",
                cursor: simsRunning ? "not-allowed" : "pointer",
              }}
            >
              {simsRunning ? "RUNNING…" : "▶ RUN ALL SIMS"}
            </button>
          )}
          {hasSimResults && (
            <button
              onClick={onExportPredictions}
              style={{
                background: "#4ade80",
                border: "none",
                borderRadius: 5,
                padding: "8px 14px",
                color: "#0a1207",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 2,
                fontFamily: "monospace",
                cursor: "pointer",
              }}
            >
              ⬇ PREDICTIONS CSV
            </button>
          )}
          <button
            onClick={onExportResults}
              style={{
                background: "rgba(74,144,226,0.15)",
                border: "1px solid rgba(74,144,226,0.4)",
                borderRadius: 5,
                padding: "8px 14px",
                color: "#60a5fa",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 2,
                fontFamily: "monospace",
                cursor: "pointer",
              }}
            >
              ⬇ RESULTS CSV
            </button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: schedStatus || showBulkImport ? 12 : 8, padding: "10px 12px", background: "rgba(255,200,50,0.02)", border: "1px solid rgba(255,200,50,0.1)", borderRadius: 6 }}>
        <div style={{ fontSize: 9, color: "#b28a57", letterSpacing: 2, marginRight: 4, whiteSpace: "nowrap" }}>SIM SETTINGS:</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 9, color: "#b28a57", whiteSpace: "nowrap" }}>GAME DATE</span>
          <input
            type="date"
            value={slateDate}
            onChange={(event) => onSlateDateChange(event.target.value)}
            style={{ background: "#0a0600", border: "1px solid rgba(255,200,50,0.2)", borderRadius: 3, color: "#c8a850", fontSize: 9, fontFamily: "monospace", padding: "4px 6px", cursor: "pointer" }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 9, color: "#b28a57", whiteSpace: "nowrap" }}>GAME TYPE</span>
          <select
            value={slateGameType}
            onChange={(event) => onSlateGameTypeChange(event.target.value)}
            style={{ background: "#0a0600", border: "1px solid rgba(255,200,50,0.2)", borderRadius: 3, color: "#c8a850", fontSize: 9, fontFamily: "monospace", padding: "4px 6px", cursor: "pointer" }}
          >
            {gameTypes.map((gameType) => (
              <option key={gameType} value={gameType}>
                {gameType}
              </option>
            ))}
          </select>
        </div>
        <div
          onClick={onToggleSlateNeutral}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            borderRadius: 3,
            border: `1px solid ${slateNeutral ? "rgba(245,197,24,0.35)" : "rgba(255,200,50,0.12)"}`,
            background: slateNeutral ? "rgba(245,197,24,0.07)" : "transparent",
            cursor: "pointer",
          }}
        >
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: slateNeutral ? "#f5c518" : "#2a1a0a", boxShadow: slateNeutral ? "0 0 6px #f5c518" : "none", transition: "all 0.2s" }} />
          <span style={{ fontSize: 9, color: slateNeutral ? "#f5c518" : "#b28a57", fontFamily: "monospace", letterSpacing: 1, whiteSpace: "nowrap" }}>
            NEUTRAL SITE {slateNeutral ? "ON" : "OFF"}
          </span>
        </div>
        {linesCount > 0 && (
          <button
            onClick={onApplySettingsToAllGames}
            style={{ marginLeft: "auto", background: "rgba(245,197,24,0.08)", border: "1px solid rgba(245,197,24,0.25)", borderRadius: 3, padding: "4px 10px", color: "#f5c518", fontSize: 8, fontWeight: 700, fontFamily: "monospace", cursor: "pointer", whiteSpace: "nowrap", letterSpacing: 1 }}
          >
            ↓ APPLY TO ALL GAMES
          </button>
        )}
      </div>

      {showBulkImport && (
        <div style={{ background: "rgba(255,200,50,0.02)", border: "1px solid rgba(255,200,50,0.12)", borderRadius: 6, padding: 14, marginBottom: 12, animation: "fadeUp 0.2s ease" }}>
          <div style={{ fontSize: 9, color: "#f5c518", letterSpacing: 3, marginBottom: 8, fontWeight: 700 }}>ENTER GAME SLATE</div>
          <div style={{ fontSize: 10, color: "#b9925c", lineHeight: 2, marginBottom: 10 }}>
            ESPN-by-date is the primary workflow. Use this paste area as a backup when ESPN misses a game or you want a manual slate.
            <br />
            Format: <span style={{ color: "#c8a850", fontFamily: "monospace" }}>AWAY_ABBR @ HOME_ABBR, TIME</span> - one game per line
            <br />
            Example: <span style={{ color: "#c8a850", fontFamily: "monospace" }}>KU @ DUKE, 7:00 PM ET</span>
            <br />
            <span style={{ fontSize: 9, color: "#9f7847" }}>Paste directly from a sportsbook, or use: AWAY @ HOME (e.g. KU @ DUKE)</span>
          </div>
          <textarea
            value={bulkPaste}
            onChange={(event) => onBulkPasteChange(event.target.value)}
            placeholder={"KU @ DUKE, 6:00 PM ET\nUNC @ KY, 8:00 PM ET\nGONZ @ PURDUE, 9:30 PM ET"}
            style={{ width: "100%", height: 140, background: "#0a0600", border: "1px solid rgba(255,200,50,0.15)", borderRadius: 4, color: "#f0e8d0", fontSize: 11, fontFamily: "monospace", padding: 10, resize: "vertical", boxSizing: "border-box", outline: "none" }}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginTop: 8 }}>
            <button
              onClick={onHandleBulkGames}
              disabled={!bulkPaste.trim()}
              style={{
                padding: "9px 0",
                background: bulkPaste.trim() ? "linear-gradient(135deg,#8B0000,#cc3300)" : "rgba(255,200,50,0.04)",
                border: bulkPaste.trim() ? "none" : "1px solid rgba(255,200,50,0.08)",
                borderRadius: 4,
                color: bulkPaste.trim() ? "#fff" : "#9f7847",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 3,
                fontFamily: "monospace",
                cursor: bulkPaste.trim() ? "pointer" : "not-allowed",
              }}
            >
              ⬆ LOAD SLATE
            </button>
            <button onClick={onClearBulkImport} style={{ padding: "9px 14px", background: "transparent", border: "1px solid rgba(255,200,50,0.1)", borderRadius: 4, color: "#b28a57", fontSize: 9, fontFamily: "monospace", cursor: "pointer" }}>
              CLEAR
            </button>
          </div>
          {bulkStatus && <div style={{ fontSize: 10, color: "#4ade80", marginTop: 6 }}>{bulkStatus}</div>}
          {bulkError && <div style={{ fontSize: 10, color: "#f87171", marginTop: 6 }}>Warning: {bulkError}</div>}
        </div>
      )}

      {false && <div style={{ background: "rgba(96,165,250,0.03)", border: "1px solid rgba(96,165,250,0.14)", borderRadius: 6, padding: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 9, color: "#93c5fd", letterSpacing: 3, marginBottom: 8, fontWeight: 700 }}>VSIN SHARP DATA</div>
        <div style={{ fontSize: 10, color: "#93a9c9", lineHeight: 1.9, marginBottom: 10 }}>
          Paste VSiN spread, total, and moneyline handle-vs-bets splits here. This is game-level input and will be applied to the current slate separately from team stats.
        </div>
        <textarea
          value={sharpPaste}
          onChange={(event) => onSharpPasteChange(event.target.value)}
          placeholder={"CBB - Monday, Apr 6\tSpread\tHandle\tBets\tTotal\tHandle\tBets\tMoney\tHandle\tBets\n↺\t(2) Connecticut\t+6.5\t30%\t36%\t145.5\t79%\t74%\t+230\t42%\t53%\n▼\n17\t(1) Michigan\t-6.5\t70%\t64%\t145.5\t21%\t26%\t-285\t58%\t47%\n▲"}
          style={{ width: "100%", height: 110, background: "#0a0600", border: "1px solid rgba(96,165,250,0.18)", borderRadius: 4, color: "#f0e8d0", fontSize: 11, fontFamily: "monospace", padding: 10, resize: "vertical", boxSizing: "border-box", outline: "none" }}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginTop: 8 }}>
          <button
            onClick={onHandleSharpImport}
            disabled={!sharpPaste.trim()}
            style={{
              padding: "9px 0",
              background: sharpPaste.trim() ? "linear-gradient(135deg,#1d4ed8,#2563eb)" : "rgba(96,165,250,0.04)",
              border: sharpPaste.trim() ? "none" : "1px solid rgba(96,165,250,0.08)",
              borderRadius: 4,
              color: sharpPaste.trim() ? "#fff" : "#6b86b1",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 3,
              fontFamily: "monospace",
              cursor: sharpPaste.trim() ? "pointer" : "not-allowed",
            }}
          >
            IMPORT VSIN DATA
          </button>
          <button onClick={onClearSharpImport} style={{ padding: "9px 14px", background: "transparent", border: "1px solid rgba(96,165,250,0.12)", borderRadius: 4, color: "#93c5fd", fontSize: 9, fontFamily: "monospace", cursor: "pointer" }}>
            CLEAR
          </button>
        </div>
        {sharpStatus && <div style={{ fontSize: 10, color: "#4ade80", marginTop: 6 }}>{sharpStatus}</div>}
        {sharpError && <div style={{ fontSize: 10, color: "#f87171", marginTop: 6 }}>Warning: {sharpError}</div>}
      </div>}

      {bulkUnmatched.length > 0 && (
        <div style={{ marginBottom: 12, padding: "10px 12px", background: "rgba(248,113,113,0.05)", border: "1px solid rgba(248,113,113,0.18)", borderRadius: 4 }}>
          <div style={{ fontSize: 9, color: "#fca5a5", fontWeight: 700, letterSpacing: 2, marginBottom: 6 }}>UNMATCHED TEAM NAMES</div>
          <div style={{ fontSize: 10, color: "#f0e8d0", lineHeight: 1.8, fontFamily: "monospace" }}>
            {bulkUnmatched.map((item, index) => (
              <span key={`${item.name}-${index}`}>
                {index > 0 ? <span style={{ color: "#c8a060" }}> | </span> : null}
                <span>
                  {item.name}
                  {item.count > 1 ? ` (${item.count})` : ""}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {schedStatus && <div style={{ fontSize: 10, color: "#b28a57", marginBottom: 12 }}>{schedStatus}</div>}
    </>
  );
}

interface SlateRowGame {
  homeAbbr: string;
  awayAbbr: string;
  gameTime: string;
}

interface SlateTableRow {
  game: SlateRowGame;
  gameType?: string;
  neutralSite?: boolean;
  homeB2B?: boolean;
  awayB2B?: boolean;
  editedOdds?: {
    homeMoneyline?: number;
    awayMoneyline?: number;
    spread?: number;
    spreadHomeOdds?: number;
    spreadAwayOdds?: number;
    overUnder?: number;
    overOdds?: number;
    underOdds?: number;
  } | null;
  simResult?: {
    hWinProb: number;
    aWinProb: number;
    hScore: string;
    aScore: string;
    total: string;
  } | null;
}

interface SlateTablePanelProps {
  showLines: boolean;
  linesRows: SlateTableRow[];
  gameTypes: string[];
  editingIdx: number | null;
  editFields: Record<string, string>;
  onTimeChange: (idx: number, value: string) => void;
  onGameTypeChange: (idx: number, value: string) => void;
  onToggleNeutral: (idx: number) => void;
  onToggleB2B: (idx: number, field: "homeB2B" | "awayB2B") => void;
  onRunSim: (idx: number) => void;
  onToggleEdit: (idx: number) => void;
  onEditFieldChange: (field: string, value: string) => void;
  onSaveEdit: (idx: number) => void;
  onCancelEdit: () => void;
  onResetEdit: (idx: number) => void;
}

export function SlateTablePanel({
  showLines,
  linesRows,
  gameTypes,
  editingIdx,
  editFields,
  onTimeChange,
  onGameTypeChange,
  onToggleNeutral,
  onToggleB2B,
  onRunSim,
  onToggleEdit,
  onEditFieldChange,
  onSaveEdit,
  onCancelEdit,
  onResetEdit,
}: SlateTablePanelProps) {
  if (!showLines || linesRows.length === 0) return null;

  return (
    <div style={{ overflowX: "auto", borderRadius: 5, border: "1px solid #1a1200", marginBottom: 16 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "monospace", fontSize: 10 }}>
        <thead>
          <tr style={{ background: "#080500" }}>
            {["Time", "Matchup", "Type", "Neut", "H ML", "A ML", "Spread", "O/U Line", "H Win%", "A Win%", "H Proj", "A Proj", "Total", "ML Edge", "Spr Edge", "O/U Edge", "B2B", "Sim", "Edit"].map((heading) => (
              <th key={heading} style={{ padding: "6px", textAlign: "left", fontSize: 8, color: "#b28a57", letterSpacing: 1, borderBottom: "1px solid #1a1200", whiteSpace: "nowrap" }}>
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linesRows.map((row, idx) => {
            const odds = row.editedOdds;
            const sim = row.simResult;
            const betting = odds && odds.homeMoneyline !== 0 && sim ? analyzeBetting(sim as never, odds as never) : null;
            const hasValue = betting && betting.mlValueSide !== "none";

            return (
              <Fragment key={`${row.game.homeAbbr}-${row.game.awayAbbr}-${idx}`}>
                <tr style={{ background: hasValue ? "rgba(74,222,128,0.04)" : idx % 2 === 0 ? "#0a0700" : "#080500" }}>
                  <td style={{ padding: "5px 6px", borderBottom: "1px solid #120e00", whiteSpace: "nowrap" }}>
                    <input
                      value={row.game.gameTime}
                      onChange={(event) => onTimeChange(idx, event.target.value)}
                      style={{ background: "transparent", border: "none", borderBottom: `1px solid ${row.game.gameTime === "TBD" ? "rgba(245,197,24,0.3)" : "rgba(255,200,50,0.1)"}`, color: row.game.gameTime === "TBD" ? "#b9925c" : "#b28a57", fontSize: 9, fontFamily: "monospace", width: 64, padding: "1px 2px", cursor: "text" }}
                      placeholder="TBD"
                    />
                  </td>
                  <td style={{ padding: "5px 6px", borderBottom: "1px solid #120e00", whiteSpace: "nowrap" }}>
                    <span style={{ fontWeight: 700, color: "#f0e8d0" }}>{row.game.homeAbbr}</span>
                    <span style={{ color: "#2a1a0a", margin: "0 4px" }}>vs</span>
                    <span style={{ fontWeight: 700, color: "#f0e8d0" }}>{row.game.awayAbbr}</span>
                  </td>
                  <td style={{ padding: "4px 6px", borderBottom: "1px solid #120e00" }}>
                    <select
                      value={row.gameType ?? "Regular Season"}
                      onChange={(event) => onGameTypeChange(idx, event.target.value)}
                      style={{ background: "#0a0600", border: "1px solid rgba(255,200,50,0.18)", borderRadius: 3, color: "#c8a850", fontSize: 8, fontFamily: "monospace", padding: "2px 4px", cursor: "pointer", maxWidth: 110 }}
                    >
                      {gameTypes.map((gameType) => (
                        <option key={gameType} value={gameType}>
                          {gameType}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: "4px 6px", borderBottom: "1px solid #120e00" }}>
                    <button
                      onClick={() => onToggleNeutral(idx)}
                      style={{ background: row.neutralSite ? "rgba(245,197,24,0.12)" : "transparent", border: `1px solid ${row.neutralSite ? "rgba(245,197,24,0.4)" : "rgba(255,200,50,0.15)"}`, borderRadius: 3, padding: "2px 8px", color: row.neutralSite ? "#f5c518" : "#9f7847", fontSize: 8, fontWeight: 700, fontFamily: "monospace", cursor: "pointer", whiteSpace: "nowrap" }}
                    >
                      {row.neutralSite ? "NEUT" : "HOME"}
                    </button>
                  </td>
                  <td style={{ padding: "5px 6px", borderBottom: "1px solid #120e00", color: odds?.homeMoneyline ? "#c8a850" : "#2a1a0a" }}>{odds?.homeMoneyline ? `${odds.homeMoneyline > 0 ? "+" : ""}${odds.homeMoneyline}` : "—"}</td>
                  <td style={{ padding: "5px 6px", borderBottom: "1px solid #120e00", color: odds?.awayMoneyline ? "#c8a850" : "#2a1a0a" }}>{odds?.awayMoneyline ? `${odds.awayMoneyline > 0 ? "+" : ""}${odds.awayMoneyline}` : "—"}</td>
                  <td style={{ padding: "5px 6px", borderBottom: "1px solid #120e00", color: odds?.spread != null ? "#c8a850" : "#2a1a0a" }}>{odds?.spread != null ? `H${odds.spread > 0 ? "+" : ""}${odds.spread}` : "—"}</td>
                  <td style={{ padding: "5px 6px", borderBottom: "1px solid #120e00", color: odds?.overUnder ? "#c8a850" : "#2a1a0a" }}>{odds?.overUnder?.toFixed(1) ?? "—"}</td>
                  <td style={{ padding: "5px 6px", borderBottom: "1px solid #120e00", color: sim ? "#4ade80" : "#2a1a0a", fontWeight: sim ? 700 : 400 }}>{sim ? `${(sim.hWinProb * 100).toFixed(1)}%` : "—"}</td>
                  <td style={{ padding: "5px 6px", borderBottom: "1px solid #120e00", color: sim ? "#4ade80" : "#2a1a0a", fontWeight: sim ? 700 : 400 }}>{sim ? `${(sim.aWinProb * 100).toFixed(1)}%` : "—"}</td>
                  <td style={{ padding: "5px 6px", borderBottom: "1px solid #120e00", color: sim ? "#f5c518" : "#2a1a0a" }}>{sim ? sim.hScore : "—"}</td>
                  <td style={{ padding: "5px 6px", borderBottom: "1px solid #120e00", color: sim ? "#f5c518" : "#2a1a0a" }}>{sim ? sim.aScore : "—"}</td>
                  <td style={{ padding: "5px 6px", borderBottom: "1px solid #120e00", color: sim ? "#cc3300" : "#2a1a0a" }}>{sim ? sim.total : "—"}</td>
                  <td style={{ padding: "5px 6px", borderBottom: "1px solid #120e00", whiteSpace: "nowrap" }}>
                    {betting ? <span style={{ color: hasValue ? "#4ade80" : "#2a1a0a", fontWeight: hasValue ? 700 : 400 }}>{hasValue ? `${betting.mlValueSide.toUpperCase()} +${betting.mlValuePct.toFixed(1)}%` : "PASS"}</span> : "—"}
                  </td>
                  <td style={{ padding: "5px 6px", borderBottom: "1px solid #120e00", color: betting && betting.spreadRec !== "pass" ? "#4ade80" : "#2a1a0a", fontWeight: betting && betting.spreadRec !== "pass" ? 700 : 400 }}>
                    {betting ? (betting.spreadRec === "pass" ? "PASS" : betting.spreadRec.toUpperCase()) : "—"}
                  </td>
                  <td style={{ padding: "5px 6px", borderBottom: "1px solid #120e00", color: betting && betting.ouRec !== "pass" ? "#4ade80" : "#2a1a0a", fontWeight: betting && betting.ouRec !== "pass" ? 700 : 400 }}>
                    {betting ? (betting.ouRec === "pass" ? "PASS" : betting.ouRec.toUpperCase()) : "—"}
                  </td>
                  <td style={{ padding: "5px 6px", borderBottom: "1px solid #120e00" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      {[
                        ["homeB2B", row.game.homeAbbr],
                        ["awayB2B", row.game.awayAbbr],
                      ].map(([field, abbr]) => {
                        const active = row[field as "homeB2B" | "awayB2B"];
                        return (
                          <button
                            key={field}
                            onClick={() => onToggleB2B(idx, field as "homeB2B" | "awayB2B")}
                            style={{ background: active ? "rgba(251,113,133,0.12)" : "transparent", border: `1px solid ${active ? "rgba(251,113,133,0.35)" : "#1a1200"}`, borderRadius: 3, padding: "2px 5px", color: active ? "#fda4af" : "#2a1a0a", fontSize: 8, fontWeight: 700, fontFamily: "monospace", cursor: "pointer", whiteSpace: "nowrap" }}
                          >
                            {abbr} B2B
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td style={{ padding: "5px 6px", borderBottom: "1px solid #120e00" }}>
                    <button onClick={() => onRunSim(idx)} style={{ background: sim ? "rgba(74,222,128,0.08)" : "rgba(245,197,24,0.08)", border: `1px solid ${sim ? "#4ade8040" : "#f5c51840"}`, borderRadius: 4, padding: "2px 8px", color: sim ? "#4ade80" : "#f5c518", fontSize: 9, fontWeight: 700, fontFamily: "monospace", cursor: "pointer" }}>
                      {sim ? "↻" : "▶"}
                    </button>
                  </td>
                  <td style={{ padding: "5px 6px", borderBottom: "1px solid #120e00" }}>
                    <button onClick={() => onToggleEdit(idx)} style={{ background: editingIdx === idx ? "rgba(245,197,24,0.15)" : "rgba(255,200,50,0.05)", border: `1px solid ${editingIdx === idx ? "rgba(245,197,24,0.4)" : "rgba(255,200,50,0.12)"}`, borderRadius: 4, padding: "2px 8px", color: editingIdx === idx ? "#f5c518" : "#c8a060", fontSize: 8, fontWeight: 700, fontFamily: "monospace", cursor: "pointer" }}>
                      {editingIdx === idx ? "✕" : "✎ ODDS"}
                    </button>
                  </td>
                </tr>
                {editingIdx === idx && (
                  <tr style={{ background: "#080500" }}>
                    <td colSpan={17} style={{ padding: "10px 8px", borderBottom: "1px solid #1a1200" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(8,1fr)", gap: 6, alignItems: "end" }}>
                        {[
                          ["H ML", "homeMoneyline"],
                          ["A ML", "awayMoneyline"],
                          ["Spread", "spread"],
                          ["Spr H", "spreadHomeOdds"],
                          ["Spr A", "spreadAwayOdds"],
                          ["O/U", "overUnder"],
                          ["Over", "overOdds"],
                          ["Under", "underOdds"],
                        ].map(([label, field]) => (
                          <div key={field}>
                            <div style={{ fontSize: 8, color: "#b28a57", letterSpacing: 1, marginBottom: 3 }}>{label}</div>
                            <input value={editFields[field] ?? ""} onChange={(event) => onEditFieldChange(field, event.target.value)} style={{ width: "100%", background: "#0a0600", border: "1px solid rgba(255,200,50,0.18)", borderRadius: 3, color: "#f0e8d0", fontFamily: "monospace", fontSize: 10, padding: "4px 6px", boxSizing: "border-box", outline: "none" }} />
                          </div>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                        <button onClick={() => onSaveEdit(idx)} style={{ background: "linear-gradient(135deg,#065f46,#047857)", border: "none", borderRadius: 4, padding: "5px 16px", color: "#d1fae5", fontSize: 9, fontWeight: 700, letterSpacing: 2, fontFamily: "monospace", cursor: "pointer" }}>✓ SAVE</button>
                        <button onClick={onCancelEdit} style={{ background: "transparent", border: "1px solid rgba(255,200,50,0.12)", borderRadius: 4, padding: "5px 14px", color: "#b9925c", fontSize: 9, fontFamily: "monospace", cursor: "pointer" }}>CANCEL</button>
                        <button onClick={() => onResetEdit(idx)} style={{ background: "transparent", border: "1px solid rgba(239,68,68,0.18)", borderRadius: 4, padding: "5px 14px", color: "#6b2424", fontSize: 9, fontFamily: "monospace", cursor: "pointer" }}>↺ RESET</button>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface SummaryTeamStats {
  adjEM: number;
}

interface SummaryBetting {
  mlValueSide: "home" | "away" | "none";
  mlValuePct: number;
  spreadRec: "home" | "away" | "pass";
  spreadEdge: number;
  ouRec: "over" | "under" | "pass";
  ouEdgePct: number;
  sharpMlSide: "home" | "away" | "none";
  sharpMlBoostPct: number;
  sharpMlHandlePct: number;
  sharpMlBetsPct: number;
  sharpSpreadSide: "home" | "away" | "none";
  sharpSpreadBoostPct: number;
  sharpSpreadHandlePct: number;
  sharpSpreadBetsPct: number;
  sharpTotalSide: "over" | "under" | "none";
  sharpTotalBoostPct: number;
  sharpTotalHandlePct: number;
  sharpTotalBetsPct: number;
}

interface SimSummaryRow {
  game: SlateRowGame;
  homeB2B?: boolean;
  awayB2B?: boolean;
  editedOdds?: {
    homeMoneyline?: number;
    overUnder?: number;
  } | null;
  simResult: {
    hWinProb: number;
    aWinProb: number;
    hScore: string;
    aScore: string;
    total: string;
  };
  betting: SummaryBetting | null;
  homeStats: SummaryTeamStats;
  awayStats: SummaryTeamStats;
}

interface SimSummaryPanelProps {
  rows: SimSummaryRow[];
}

export function SimSummaryPanel({ rows }: SimSummaryPanelProps) {
  if (!rows.length) return null;

  return (
    <div>
      <div style={{ fontSize: 8, fontWeight: 700, color: "#b28a57", letterSpacing: 3, marginBottom: 12 }}>
        ◈ SIM RESULTS SUMMARY
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 10 }}>
        {rows.map((row, index) => {
          const sim = row.simResult;
          const hasOdds = !!(row.editedOdds && row.editedOdds.homeMoneyline != null && row.editedOdds.overUnder != null);
          const betting = row.betting;
          const homeWinPct = sim.hWinProb * 100;
          const awayWinPct = sim.aWinProb * 100;
          const hasValue = !!(betting && (betting.mlValueSide !== "none" || betting.spreadRec !== "pass" || betting.ouRec !== "pass"));
          const emDiff = row.homeStats.adjEM - row.awayStats.adjEM;

          return (
            <div
              key={`${row.game.homeAbbr}-${row.game.awayAbbr}-${index}`}
              style={{ background: hasValue ? "rgba(74,222,128,0.04)" : "#0a0700", border: `1px solid ${hasValue ? "rgba(74,222,128,0.2)" : "#1a1200"}`, borderRadius: 7, padding: 13 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#f0e8d0", fontFamily: "'Bebas Neue',monospace", letterSpacing: 2 }}>
                  {row.game.homeAbbr} <span style={{ color: "#2a1a0a", fontWeight: 400 }}>vs</span> {row.game.awayAbbr}
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {row.homeB2B && <span style={{ fontSize: 7, background: "rgba(251,113,133,0.12)", border: "1px solid rgba(251,113,133,0.3)", borderRadius: 3, padding: "1px 5px", color: "#fda4af" }}>{row.game.homeAbbr} B2B</span>}
                  {row.awayB2B && <span style={{ fontSize: 7, background: "rgba(251,113,133,0.12)", border: "1px solid rgba(251,113,133,0.3)", borderRadius: 3, padding: "1px 5px", color: "#fda4af" }}>{row.game.awayAbbr} B2B</span>}
                  {hasValue && <span style={{ fontSize: 7, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 3, padding: "1px 5px", color: "#4ade80" }}>VALUE</span>}
                </div>
              </div>

              <div style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", borderRadius: 4, overflow: "hidden", height: 22 }}>
                  <div style={{ width: `${homeWinPct}%`, background: "linear-gradient(90deg,#8B0000,#cc3300)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>{homeWinPct.toFixed(1)}%</span>
                  </div>
                  <div style={{ flex: 1, background: "linear-gradient(90deg,#5a1200,#7a2200)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#fda4af" }}>{awayWinPct.toFixed(1)}%</span>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "#2a1a0a", marginTop: 2 }}>
                  <span>{row.game.homeAbbr} · {row.game.gameTime}</span>
                  <span>{row.game.awayAbbr} away</span>
                </div>
              </div>

              {!hasOdds && (
                <div style={{ background: "#080500", borderRadius: 5, padding: "8px 10px", border: "1px solid #120e00", marginBottom: 6, fontSize: 9, color: "#b28a57", textAlign: "center", letterSpacing: 1 }}>
                  NO ODDS — USE ✎ ODDS TO ADD LINES AND UNLOCK ANALYSIS
                </div>
              )}

              {hasOdds && betting && (
                <div style={{ background: "#080500", borderRadius: 5, padding: "9px 10px", border: "1px solid #120e00", marginBottom: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 8, color: "#b28a57", letterSpacing: 2, fontWeight: 700 }}>EDGE SUMMARY</span>
                    <span style={{ fontSize: 9, color: "#c8a850" }}>Proj: {sim.hScore}–{sim.aScore} ({sim.total})</span>
                  </div>
                  {[ 
                    { label: "ML", active: betting.mlValueSide !== "none", text: betting.mlValueSide !== "none" ? `${betting.mlValueSide.toUpperCase()} +${betting.mlValuePct.toFixed(1)}%` : "PASS" },
                    { label: "SPR", active: betting.spreadRec !== "pass", text: betting.spreadRec !== "pass" ? `+${betting.spreadEdge.toFixed(1)}%` : "PASS" },
                    { label: "O/U", active: betting.ouRec !== "pass", text: betting.ouRec !== "pass" ? `${betting.ouRec.toUpperCase()} +${betting.ouEdgePct.toFixed(1)}%` : "PASS" },
                  ].map((item) => (
                    <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", borderBottom: "1px solid rgba(255,200,50,0.04)" }}>
                      <span style={{ fontSize: 9, color: "#b28a57" }}>{item.label}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: item.active ? "#4ade80" : "#2a1a0a", fontFamily: "monospace" }}>{item.text}</span>
                    </div>
                  ))}
                  {(betting.sharpMlSide !== "none" || betting.sharpSpreadSide !== "none" || betting.sharpTotalSide !== "none") && (
                    <div style={{ marginTop: 7, paddingTop: 7, borderTop: "1px solid rgba(96,165,250,0.12)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: 8, color: "#93c5fd", letterSpacing: 2, fontWeight: 700 }}>SHARP SUPPORT</span>
                        <span style={{ fontSize: 8, color: "#6b86b1" }}>VSiN handle vs bets</span>
                      </div>
                      {[
                        {
                          label: "ML",
                          active: betting.sharpMlSide !== "none",
                          text:
                            betting.sharpMlSide !== "none"
                              ? `${betting.sharpMlSide.toUpperCase()} ${betting.sharpMlHandlePct.toFixed(0)}%/${betting.sharpMlBetsPct.toFixed(0)}% | Edge +${betting.sharpMlBoostPct.toFixed(1)}%`
                              : "NONE",
                        },
                        {
                          label: "SPR",
                          active: betting.sharpSpreadSide !== "none",
                          text:
                            betting.sharpSpreadSide !== "none"
                              ? `${betting.sharpSpreadSide.toUpperCase()} ${betting.sharpSpreadHandlePct.toFixed(0)}%/${betting.sharpSpreadBetsPct.toFixed(0)}% | Edge +${betting.sharpSpreadBoostPct.toFixed(1)}%`
                              : "NONE",
                        },
                        {
                          label: "O/U",
                          active: betting.sharpTotalSide !== "none",
                          text:
                            betting.sharpTotalSide !== "none"
                              ? `${betting.sharpTotalSide.toUpperCase()} ${betting.sharpTotalHandlePct.toFixed(0)}%/${betting.sharpTotalBetsPct.toFixed(0)}% | Edge +${betting.sharpTotalBoostPct.toFixed(1)}%`
                              : "NONE",
                        },
                      ].map((item) => (
                        <div key={`sharp-${item.label}`} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                          <span style={{ fontSize: 9, color: "#93a9c9" }}>{item.label}</span>
                          <span style={{ fontSize: 9, fontWeight: 700, color: item.active ? "#93c5fd" : "#334155", fontFamily: "monospace" }}>{item.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ background: "#080500", borderRadius: 5, padding: "7px 8px", border: "1px solid #120e00" }}>
                <div style={{ fontSize: 8, color: "#b28a57", marginBottom: 3 }}>ADJ. EM EDGE</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: emDiff > 0 ? "#f5c518" : "#f87171", fontFamily: "'Courier New',monospace" }}>
                  {emDiff > 0 ? "+" : ""}{emDiff.toFixed(1)}
                </div>
                <div style={{ fontSize: 8, color: "#2a1a0a", marginTop: 2 }}>
                  {row.game.homeAbbr} {row.homeStats.adjEM >= 0 ? "+" : ""}{row.homeStats.adjEM.toFixed(1)} / {row.game.awayAbbr} {row.awayStats.adjEM >= 0 ? "+" : ""}{row.awayStats.adjEM.toFixed(1)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface BestBet {
  type: "ML" | "SPR" | "O/U";
  edge: number;
  matchup: string;
  label: string;
  line: string;
  proj: string;
  edgeTxt: string;
}

interface BestBetsPanelProps {
  bets: BestBet[];
}

export function BestBetsPanel({ bets }: BestBetsPanelProps) {
  if (!bets.length) return null;

  const mlCount = bets.filter((bet) => bet.type === "ML").length;
  const spreadCount = bets.filter((bet) => bet.type === "SPR").length;
  const totalCount = bets.filter((bet) => bet.type === "O/U").length;
  const typeColors = { ML: "#60a5fa", SPR: "#f59e0b", "O/U": "#a78bfa" } as const;
  const typeBg = { ML: "rgba(96,165,250,0.08)", SPR: "rgba(245,158,11,0.08)", "O/U": "rgba(167,139,250,0.08)" } as const;
  const typeBorder = { ML: "rgba(96,165,250,0.2)", SPR: "rgba(245,158,11,0.2)", "O/U": "rgba(167,139,250,0.2)" } as const;

  return (
    <div style={{ background: "rgba(255,200,50,0.02)", border: "1px solid rgba(245,197,24,0.2)", borderRadius: 8, padding: 16, marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#f5c518", letterSpacing: 4, marginBottom: 2 }}>BEST BETS</div>
          <div style={{ fontSize: 8, color: "#b28a57", letterSpacing: 2 }}>{bets.length} ACTIONABLE BET{bets.length !== 1 ? "S" : ""} · RANKED BY EDGE</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {mlCount > 0 && <span style={{ fontSize: 8, padding: "2px 8px", borderRadius: 3, background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.25)", color: "#60a5fa", fontFamily: "monospace" }}>{mlCount} ML</span>}
          {spreadCount > 0 && <span style={{ fontSize: 8, padding: "2px 8px", borderRadius: 3, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", color: "#f59e0b", fontFamily: "monospace" }}>{spreadCount} SPR</span>}
          {totalCount > 0 && <span style={{ fontSize: 8, padding: "2px 8px", borderRadius: 3, background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.25)", color: "#a78bfa", fontFamily: "monospace" }}>{totalCount} O/U</span>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto 1fr 1fr auto", gap: "6px 10px", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 7, color: "#b28a57", letterSpacing: 2 }}>#</div>
        <div style={{ fontSize: 7, color: "#b28a57", letterSpacing: 2 }}>MATCHUP</div>
        <div style={{ fontSize: 7, color: "#b28a57", letterSpacing: 2 }}>BET</div>
        <div style={{ fontSize: 7, color: "#b28a57", letterSpacing: 2 }}>LINE</div>
        <div style={{ fontSize: 7, color: "#b28a57", letterSpacing: 2 }}>PROJECTION</div>
        <div style={{ fontSize: 7, color: "#b28a57", letterSpacing: 2, textAlign: "right" }}>EDGE</div>

        {bets.map((bet, index) => (
          <Fragment key={`${bet.type}-${bet.matchup}-${index}`}>
            <div style={{ fontSize: 12, color: index === 0 ? "#f5c518" : "#b28a57", fontFamily: "'Bebas Neue',monospace" }}>
              {index === 0 ? "★" : index + 1}
            </div>
            <div style={{ fontSize: 9, color: "#c8a850", fontFamily: "monospace" }}>{bet.matchup}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 8, padding: "1px 6px", borderRadius: 3, background: typeBg[bet.type], border: `1px solid ${typeBorder[bet.type]}`, color: typeColors[bet.type], fontFamily: "monospace", fontWeight: 700 }}>{bet.type}</span>
              <span style={{ fontSize: 9, color: "#f0e8d0", fontFamily: "monospace" }}>{bet.label}</span>
            </div>
            <div style={{ fontSize: 8, color: "#c8a060", fontFamily: "monospace" }}>{bet.line}</div>
            <div style={{ fontSize: 8, color: "#c8a060", fontFamily: "monospace" }}>{bet.proj}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: bet.edge > 8 ? "#4ade80" : bet.edge > 4 ? "#86efac" : "#a3e635", fontFamily: "'Bebas Neue',monospace", letterSpacing: 1, textAlign: "right" }}>{bet.edgeTxt}</div>
          </Fragment>
        ))}
      </div>

      <div style={{ marginTop: 10, fontSize: 8, color: "#2a1a0a", letterSpacing: 1 }}>
        Edge = model probability minus vig-adjusted implied probability. For entertainment only.
      </div>
    </div>
  );
}

interface DebugRow {
  matchup: string;
  mlModelPct: number;
  mlMarketPct: number;
  mlEdgePct: number;
  mlPick: string;
  spreadModelPct: number;
  spreadMarketPct: number;
  spreadEdgePct: number;
  spreadPoints: number;
  spreadPick: string;
  totalModel: number;
  totalMarket: number;
  totalPointsEdge: number;
  totalProbEdgePct: number;
  totalPick: string;
}

interface DebugPanelProps {
  rows: DebugRow[];
}

export function DebugPanel({ rows }: DebugPanelProps) {
  if (!rows.length) return null;

  return (
    <div style={{ background: "rgba(255,200,50,0.02)", border: "1px solid rgba(245,197,24,0.2)", borderRadius: 8, padding: 16, marginTop: 16 }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#f5c518", letterSpacing: 4, marginBottom: 2 }}>MODEL DEBUG</div>
        <div style={{ fontSize: 8, color: "#b28a57", letterSpacing: 2 }}>RAW MODEL VS MARKET INPUTS FOR EACH SIMMED GAME</div>
      </div>
      <div style={{ overflowX: "auto", borderRadius: 5, border: "1px solid #1a1200" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "monospace", fontSize: 10 }}>
          <thead>
            <tr style={{ background: "#080500" }}>
              {["Matchup", "ML Pick", "ML Model", "ML Mkt", "ML Edge", "SPR Pick", "SPR Model", "SPR Mkt", "SPR Edge", "SPR Pts", "O/U Pick", "Model Tot", "Vegas Tot", "Tot Pts", "Tot Edge"].map((heading) => (
                <th key={heading} style={{ padding: "6px", textAlign: "left", fontSize: 8, color: "#b28a57", letterSpacing: 1, borderBottom: "1px solid #1a1200", whiteSpace: "nowrap" }}>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.matchup}-${index}`} style={{ background: index % 2 === 0 ? "#0a0700" : "#080500" }}>
                <td style={{ padding: "5px 6px", borderBottom: "1px solid #120e00", color: "#f0e8d0", whiteSpace: "nowrap" }}>{row.matchup}</td>
                <td style={{ padding: "5px 6px", borderBottom: "1px solid #120e00", color: row.mlPick === "PASS" ? "#6b5232" : "#60a5fa" }}>{row.mlPick}</td>
                <td style={{ padding: "5px 6px", borderBottom: "1px solid #120e00", color: "#c8a850" }}>{row.mlModelPct.toFixed(1)}%</td>
                <td style={{ padding: "5px 6px", borderBottom: "1px solid #120e00", color: "#b28a57" }}>{row.mlMarketPct.toFixed(1)}%</td>
                <td style={{ padding: "5px 6px", borderBottom: "1px solid #120e00", color: row.mlEdgePct > 0 ? "#4ade80" : "#f87171" }}>{row.mlEdgePct > 0 ? "+" : ""}{row.mlEdgePct.toFixed(1)}%</td>
                <td style={{ padding: "5px 6px", borderBottom: "1px solid #120e00", color: row.spreadPick === "PASS" ? "#6b5232" : "#f59e0b" }}>{row.spreadPick}</td>
                <td style={{ padding: "5px 6px", borderBottom: "1px solid #120e00", color: "#c8a850" }}>{row.spreadModelPct.toFixed(1)}%</td>
                <td style={{ padding: "5px 6px", borderBottom: "1px solid #120e00", color: "#b28a57" }}>{row.spreadMarketPct.toFixed(1)}%</td>
                <td style={{ padding: "5px 6px", borderBottom: "1px solid #120e00", color: row.spreadEdgePct > 0 ? "#4ade80" : "#f87171" }}>{row.spreadEdgePct > 0 ? "+" : ""}{row.spreadEdgePct.toFixed(1)}%</td>
                <td style={{ padding: "5px 6px", borderBottom: "1px solid #120e00", color: row.spreadPoints > 0 ? "#4ade80" : "#f87171" }}>{row.spreadPoints > 0 ? "+" : ""}{row.spreadPoints.toFixed(1)}</td>
                <td style={{ padding: "5px 6px", borderBottom: "1px solid #120e00", color: row.totalPick === "PASS" ? "#6b5232" : "#a78bfa" }}>{row.totalPick}</td>
                <td style={{ padding: "5px 6px", borderBottom: "1px solid #120e00", color: "#c8a850" }}>{row.totalModel.toFixed(1)}</td>
                <td style={{ padding: "5px 6px", borderBottom: "1px solid #120e00", color: "#b28a57" }}>{row.totalMarket.toFixed(1)}</td>
                <td style={{ padding: "5px 6px", borderBottom: "1px solid #120e00", color: row.totalPointsEdge > 0 ? "#4ade80" : "#f87171" }}>{row.totalPointsEdge > 0 ? "+" : ""}{row.totalPointsEdge.toFixed(1)}</td>
                <td style={{ padding: "5px 6px", borderBottom: "1px solid #120e00", color: row.totalProbEdgePct > 0 ? "#4ade80" : "#f87171" }}>{row.totalProbEdgePct > 0 ? "+" : ""}{row.totalProbEdgePct.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface SingleGameWorkspaceProps {
  cardStyle: Record<string, string | number>;
  selectStyle: Record<string, string | number>;
  showSingleGameTools: boolean;
  setShowSingleGameTools: (updater: boolean | ((value: boolean) => boolean)) => void;
  confList: string[];
  confFilter: string;
  setConfFilter: (value: string) => void;
  TeamSelectComponent: ComponentType<{
    value: string;
    onChange: (value: string) => void;
    excludeKey: string;
    label: string;
  }>;
  homeTeam: string;
  awayTeam: string;
  setHomeTeam: (value: string) => void;
  setAwayTeam: (value: string) => void;
  liveStats: LiveStatsMap;
  gameTypes: string[];
  gameType: string;
  setGameType: (value: string) => void;
  neutralSite: boolean;
  setNeutralSite: (value: boolean) => void;
  homeB2B: boolean;
  awayB2B: boolean;
  setHomeB2B: (value: boolean) => void;
  setAwayB2B: (value: boolean) => void;
  setResult: (value: unknown) => void;
  hasLive: boolean;
  hColor: string;
  aColor: string;
  hTeam: TeamData;
  aTeam: TeamData;
  runSim: () => void;
  running: boolean;
  simCount: number;
  manualOdds: Record<string, string>;
  setManualOdds: (updater: Record<string, string> | ((value: Record<string, string>) => Record<string, string>)) => void;
  applyManualOdds: () => void;
  oddsSource: string;
  odds: Odds | null;
  result: PredictionResult | null;
  statsSource: string;
  statsUpdated: string;
}

export function SingleGameWorkspace({
  cardStyle,
  selectStyle,
  showSingleGameTools,
  setShowSingleGameTools,
  confList,
  confFilter,
  setConfFilter,
  TeamSelectComponent,
  homeTeam,
  awayTeam,
  setHomeTeam,
  setAwayTeam,
  liveStats,
  gameTypes,
  gameType,
  setGameType,
  neutralSite,
  setNeutralSite,
  homeB2B,
  awayB2B,
  setHomeB2B,
  setAwayB2B,
  setResult,
  hasLive,
  hColor,
  aColor,
  hTeam,
  aTeam,
  runSim,
  running,
  simCount,
  manualOdds,
  setManualOdds,
  applyManualOdds,
  oddsSource,
  odds,
  result,
  statsSource,
  statsUpdated,
}: SingleGameWorkspaceProps) {
  const TeamSelect = TeamSelectComponent;

  return (
    <div style={{ ...cardStyle, border: "1px solid rgba(255,200,50,0.12)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 9, color: "#c8a060", letterSpacing: 3, marginBottom: 4 }}>SINGLE-GAME TOOLS</div>
          <div style={{ fontSize: 10, color: "#b9925c" }}>Run one-off sims, compare advanced stats, and enter manual betting lines.</div>
        </div>
        <button
          onClick={() => setShowSingleGameTools((value: boolean) => !value)}
          style={{ background: showSingleGameTools ? "rgba(245,197,24,0.12)" : "rgba(255,200,50,0.06)", border: "1px solid rgba(255,200,50,0.18)", borderRadius: 5, padding: "8px 16px", color: showSingleGameTools ? "#f5c518" : "#c8a060", fontSize: 9, fontWeight: 700, letterSpacing: 2, fontFamily: "monospace", cursor: "pointer" }}
        >
          {showSingleGameTools ? "CLOSE SINGLE GAME" : "OPEN SINGLE GAME"}
        </button>
      </div>

      {showSingleGameTools && (
        <div style={{ marginTop: 16, animation: "fadeUp 0.2s ease" }}>
          <div style={cardStyle}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, color: "#c8a060", letterSpacing: 3, marginBottom: 6 }}>FILTER BY CONFERENCE</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {["ALL", ...confList].map((conference) => (
                  <button key={conference} onClick={() => setConfFilter(conference)} style={{ padding: "3px 8px", borderRadius: 3, fontSize: 9, fontFamily: "monospace", cursor: "pointer", letterSpacing: 1, background: confFilter === conference ? "#8B0000" : "rgba(255,200,50,0.04)", color: confFilter === conference ? "#fff" : "#b9925c", border: confFilter === conference ? "none" : "1px solid rgba(255,200,50,0.1)", fontWeight: confFilter === conference ? 700 : 400 }}>
                    {conference}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <TeamSelect value={homeTeam} onChange={setHomeTeam} excludeKey={awayTeam} label="HOME TEAM" />
              <TeamSelect value={awayTeam} onChange={setAwayTeam} excludeKey={homeTeam} label="AWAY TEAM" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <TeamCard abbr={homeTeam} side="HOME" liveStats={liveStats} />
              <TeamCard abbr={awayTeam} side="AWAY" liveStats={liveStats} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ fontSize: 9, color: "#c8a060", letterSpacing: 2, marginBottom: 4 }}>GAME TYPE</div>
                <select value={gameType} onChange={(event) => { setGameType(event.target.value); setResult(null); }} style={selectStyle}>
                  {gameTypes.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>

              <div onClick={() => { setNeutralSite(!neutralSite); setResult(null); }} style={{ background: neutralSite ? "rgba(245,197,24,0.06)" : "transparent", border: `1px solid ${neutralSite ? "rgba(245,197,24,0.25)" : "rgba(255,200,50,0.12)"}`, borderRadius: 4, padding: "9px 10px", cursor: "pointer" }}>
                <div style={{ fontSize: 9, color: "#c8a060", letterSpacing: 2, marginBottom: 5 }}>NEUTRAL SITE</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: neutralSite ? "#f5c518" : "#b9925c" }}>No HCA</span>
                  <span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 2, background: neutralSite ? "rgba(245,197,24,0.1)" : "rgba(255,200,50,0.05)", color: neutralSite ? "#f5c518" : "#9f7847" }}>{neutralSite ? "YES" : "NO"}</span>
                </div>
              </div>

              {[
                [homeTeam, homeB2B, setHomeB2B],
                [awayTeam, awayB2B, setAwayB2B],
              ].map(([abbr, active, setter]) => (
                <div key={String(abbr)} onClick={() => { (setter as (value: boolean) => void)(!active); setResult(null); }} style={{ background: active ? "rgba(251,113,133,0.06)" : "transparent", border: `1px solid ${active ? "rgba(251,113,133,0.2)" : "rgba(255,200,50,0.12)"}`, borderRadius: 4, padding: "9px 10px", cursor: "pointer" }}>
                  <div style={{ fontSize: 9, color: "#c8a060", letterSpacing: 2, marginBottom: 5 }}>BACK-TO-BACK</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: active ? "#fda4af" : "#b9925c" }}>{TEAMS[String(abbr)]?.name?.split(" ").pop()}</span>
                    <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 2, background: active ? "rgba(251,113,133,0.1)" : "rgba(255,200,50,0.04)", color: active ? "#fda4af" : "#9f7847" }}>{active ? "YES" : "NO"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ fontSize: 9, color: "#c8a060", letterSpacing: 3, marginBottom: 12 }}>
              KENPOM ADVANCED STAT COMPARISON
              {hasLive ? <span style={{ color: "#f5c518", marginLeft: 8 }}>· LIVE ✦</span> : <span style={{ color: "#4b5563", marginLeft: 8 }}>· ESTIMATES</span>}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: hColor, fontFamily: "'Bebas Neue',monospace", letterSpacing: 2 }}>{hTeam.name.toUpperCase()}</span>
              <span style={{ fontSize: 12, color: aColor, fontFamily: "'Bebas Neue',monospace", letterSpacing: 2 }}>{aTeam.name.toUpperCase()}</span>
            </div>
            <StatBar label="ADJUSTED OFFENSE" hVal={hTeam.adjO} aVal={aTeam.adjO} hColor={hColor} aColor={aColor} lo={105} hi={128} />
            <StatBar label="ADJUSTED DEFENSE" hVal={hTeam.adjD} aVal={aTeam.adjD} hColor={hColor} aColor={aColor} lo={85} hi={108} invert />
            <StatBar label="ADJ. EFF. MARGIN" hVal={hTeam.adjEM} aVal={aTeam.adjEM} hColor={hColor} aColor={aColor} lo={-5} hi={35} />
            <StatBar label="EFFECTIVE FG%" hVal={hTeam.efgPct} aVal={aTeam.efgPct} hColor={hColor} aColor={aColor} lo={47} hi={60} fmt="pct" />
            <StatBar label="TURNOVER %" hVal={hTeam.tovPct} aVal={aTeam.tovPct} hColor={hColor} aColor={aColor} lo={13} hi={20} fmt="pct" invert />
            <StatBar label="OFF. REBOUND %" hVal={hTeam.orbPct} aVal={aTeam.orbPct} hColor={hColor} aColor={aColor} lo={25} hi={42} fmt="pct" />
            <StatBar label="TEMPO (ADJ POSS)" hVal={hTeam.tempo} aVal={aTeam.tempo} hColor={hColor} aColor={aColor} lo={58} hi={76} />
            <StatBar label="FREE THROW RATE" hVal={hTeam.ftr} aVal={aTeam.ftr} hColor={hColor} aColor={aColor} lo={25} hi={50} fmt="pct" />
          </div>

          <button onClick={runSim} disabled={running} style={{ width: "100%", padding: 15, background: running ? "rgba(139,0,0,0.06)" : "linear-gradient(135deg,#8B0000,#cc3300)", border: running ? "1px solid rgba(204,51,0,0.15)" : "1px solid rgba(255,100,0,0.4)", borderRadius: 4, color: running ? "#5a2020" : "#fff", fontSize: 14, fontWeight: 700, letterSpacing: 6, fontFamily: "'Bebas Neue',sans-serif", cursor: running ? "not-allowed" : "pointer", marginBottom: 14, transition: "all 0.3s" }}>
            {running ? `SIMULATING  ${simCount.toLocaleString()} / 100,000` : "▶  RUN SIMULATION"}
          </button>

          <div style={{ ...cardStyle, border: `1px solid ${oddsSource === "manual" && odds ? "rgba(245,197,24,0.2)" : "rgba(255,200,50,0.12)"}` }}>
            <div style={{ fontSize: 9, color: "#c8a060", letterSpacing: 3, marginBottom: 12 }}>BETTING LINES (MANUAL)</div>
            <div style={{ fontSize: 10, color: "#b9925c", marginBottom: 10 }}>Note: Automated ESPN NCAA line fetching is not supported. Enter lines manually from your sportsbook.</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 10 }}>
              {[
                ["HOME ML", "homeMoneyline", "-350"],
                ["AWAY ML", "awayMoneyline", "+280"],
                ["H SPREAD", "homeSpread", "-8.5"],
                ["O/U LINE", "overUnder", "145.5"],
                ["SPR H ODDS", "spreadHomeOdds", "-110"],
                ["SPR A ODDS", "spreadAwayOdds", "-110"],
                ["OVER ODDS", "overOdds", "-110"],
                ["UNDER ODDS", "underOdds", "-110"],
              ].map(([label, key, placeholder]) => (
                <div key={key}>
                  <div style={{ fontSize: 9, color: "#6a5030", letterSpacing: 1, marginBottom: 3 }}>{label}</div>
                  <input value={manualOdds[key]} onChange={(event) => setManualOdds((prev) => ({ ...prev, [key]: event.target.value }))} placeholder={placeholder} style={{ background: "rgba(255,200,50,0.03)", border: "1px solid rgba(255,200,50,0.15)", borderRadius: 4, padding: "6px 8px", color: "#f0e8d0", fontFamily: "monospace", fontSize: 11, width: "100%", boxSizing: "border-box", outline: "none" }} />
                </div>
              ))}
            </div>
            <button onClick={applyManualOdds} style={{ width: "100%", padding: "9px", background: "linear-gradient(135deg,#065f46,#047857)", border: "none", borderRadius: 4, color: "#d1fae5", fontSize: 11, fontWeight: 700, letterSpacing: 3, fontFamily: "'Courier New',monospace", cursor: "pointer" }}>
              ✓ APPLY ODDS
            </button>
            {oddsSource === "manual" && odds && <div style={{ fontSize: 10, color: "#f5c518", marginTop: 6 }}>✓ Manual lines applied</div>}
          </div>

          {result && (
            <div style={{ animation: "fadeUp 0.4s ease" }}>
              {result.isTournament && <div style={{ background: "rgba(245,197,24,0.05)", border: "1px solid rgba(245,197,24,0.2)", borderRadius: 5, padding: "8px 14px", marginBottom: 12, fontSize: 9, color: "#f5c518", letterSpacing: 2 }}>🏀 TOURNAMENT MODE — Parity adjustment applied · efficiency margins compressed ~8%</div>}
              {result.neutralSite && <div style={{ background: "rgba(74,144,226,0.04)", border: "1px solid rgba(74,144,226,0.15)", borderRadius: 5, padding: "8px 14px", marginBottom: 12, fontSize: 9, color: "#60a5fa", letterSpacing: 2 }}>⚑ NEUTRAL SITE — Home court advantage removed</div>}

              <div style={cardStyle}>
                <div style={{ fontSize: 9, color: "#c8a060", letterSpacing: 3, marginBottom: 12 }}>WIN PROBABILITY</div>
                <CourtBar hProb={result.hWinProb} hColor={hColor} aColor={aColor} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 9 }}>
                  <span style={{ color: hColor, fontFamily: "'Bebas Neue',monospace", letterSpacing: 2 }}>{hTeam.name.toUpperCase()} (HOME)</span>
                  <span style={{ color: aColor, fontFamily: "'Bebas Neue',monospace", letterSpacing: 2 }}>{aTeam.name.toUpperCase()} (AWAY)</span>
                </div>
              </div>

              <div style={cardStyle}>
                <div style={{ fontSize: 9, color: "#c8a060", letterSpacing: 3, marginBottom: 14 }}>PROJECTED SCORE</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 14, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 9, color: hColor, letterSpacing: 2, marginBottom: 3 }}>{homeTeam}</div>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 72, lineHeight: 1, color: "#f0e8d0", fontWeight: 400 }}>{result.hScore}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: "#b9925c", letterSpacing: 2, marginBottom: 3 }}>TOTAL</div>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 36, color: "#f5c518", fontWeight: 400 }}>{result.total}</div>
                    <div style={{ fontSize: 9, color: "#6a5030", fontFamily: "monospace", marginTop: 2 }}>Pace {result.possessions} · Confidence {Math.round((result.totalConfidence || 0) * 100)}%</div>
                    {result.marketBlend > 0 && <div style={{ fontSize: 8, color: "#c8a060", fontFamily: "monospace", marginTop: 2 }}>Raw {result.rawTotal} · Market blend {Math.round(result.marketBlend * 100)}%</div>}
                    {odds && (() => {
                      const edge = parseFloat(result.total) - odds.overUnder;
                      const rec = edge > 2 ? "OVER" : edge < -2 ? "UNDER" : "PASS";
                      return (
                        <div style={{ marginTop: 6 }}>
                          <div style={{ fontSize: 9, color: "#4b5563" }}>VEGAS</div>
                          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, color: "#c8a850" }}>{odds.overUnder.toFixed(1)}</div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: rec === "OVER" ? "#38bdf8" : rec === "UNDER" ? "#f87171" : "#4b5563", fontFamily: "monospace", marginTop: 2 }}>{rec}{rec !== "PASS" ? ` (${edge > 0 ? "+" : ""}${edge.toFixed(1)})` : ""}</div>
                        </div>
                      );
                    })()}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 9, color: aColor, letterSpacing: 2, marginBottom: 3 }}>{awayTeam}</div>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 72, lineHeight: 1, color: "#f0e8d0", fontWeight: 400 }}>{result.aScore}</div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    { abbr: homeTeam, prob: result.hWinProb, color: hColor, vegaML: odds?.homeMoneyline },
                    { abbr: awayTeam, prob: result.aWinProb, color: aColor, vegaML: odds?.awayMoneyline },
                  ].map(({ abbr, prob, color, vegaML }) => {
                    const edge = vegaML && odds?.homeMoneyline != null && odds?.awayMoneyline != null
                      ? (() => {
                          const thisImplied = americanToImplied(vegaML);
                          const otherML = abbr === homeTeam ? odds.awayMoneyline : odds.homeMoneyline;
                          const otherImplied = americanToImplied(otherML);
                          const vig = thisImplied + otherImplied;
                          return vig > 0 ? (prob - (thisImplied / vig)) * 100 : null;
                        })()
                      : null;
                    return (
                      <div key={String(abbr)} style={{ background: "rgba(255,200,50,0.03)", border: `1px solid ${color}28`, borderRadius: 6, padding: "10px 12px" }}>
                        <div style={{ fontSize: 9, color: "#b9925c", letterSpacing: 2, marginBottom: 8 }}>{abbr} MONEYLINE</div>
                        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
                          <div>
                            <div style={{ fontSize: 8, color: "#4b5563", marginBottom: 2 }}>MODEL</div>
                            <div style={{ fontSize: 24, fontWeight: 700, color, fontFamily: "'Bebas Neue',sans-serif" }}>{mlAmerican(prob)}</div>
                            <div style={{ fontSize: 9, color: "#4b5563" }}>{(prob * 100).toFixed(1)}% win</div>
                          </div>
                          {vegaML && <>
                            <div style={{ color: "#2d2010", fontSize: 20, alignSelf: "center" }}>|</div>
                            <div>
                              <div style={{ fontSize: 8, color: "#4b5563", marginBottom: 2 }}>VEGAS</div>
                              <div style={{ fontSize: 24, fontWeight: 700, color: "#c8a850", fontFamily: "'Bebas Neue',sans-serif" }}>{vegaML > 0 ? "+" : ""}{vegaML}</div>
                              {edge !== null && <div style={{ fontSize: 10, fontWeight: 700, color: edge > 2 ? "#4ade80" : edge < -2 ? "#f87171" : "#b9925c" }}>{edge > 0 ? "+" : ""}{edge.toFixed(1)}% edge</div>}
                            </div>
                          </>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {odds && (() => {
                const betting = analyzeBetting(result, odds);
                return (
                  <div style={{ ...cardStyle, border: "1px solid rgba(74,222,128,0.18)" }}>
                    <div style={{ fontSize: 9, color: "#5aaa7a", letterSpacing: 3, marginBottom: 12 }}>BETTING ANALYSIS</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                      {[
                        { label: "MONEYLINE VALUE", rec: betting.mlValueSide === "none" ? "PASS" : `${betting.mlValueSide.toUpperCase()} ML`, good: betting.mlValueSide !== "none", detail: betting.mlValueSide !== "none" ? `+${betting.mlValuePct.toFixed(1)}% edge` : "—" },
                        { label: `SPREAD H${odds.spread > 0 ? "+" : ""}${odds.spread}`, rec: betting.spreadRec === "pass" ? "PASS" : betting.spreadRec.toUpperCase(), good: betting.spreadRec !== "pass", detail: betting.spreadRec !== "pass" ? `+${betting.spreadEdge.toFixed(1)}% edge` : `Proj diff: ${parseFloat(result.projDiff) > 0 ? "+" : ""}${result.projDiff} pts` },
                        { label: `O/U ${odds.overUnder}`, rec: betting.ouRec === "pass" ? "PASS" : betting.ouRec.toUpperCase(), good: betting.ouRec !== "pass", detail: `Model: ${result.total}` },
                      ].map((item) => (
                        <div key={item.label} style={{ background: "rgba(255,200,50,0.02)", border: `1px solid ${item.good ? "rgba(74,222,128,0.2)" : "rgba(255,200,50,0.1)"}`, borderRadius: 5, padding: "10px" }}>
                          <div style={{ fontSize: 8, color: "#5aaa7a", letterSpacing: 2, marginBottom: 7 }}>{item.label}</div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: item.good ? "#4ade80" : "#4b5563", fontFamily: "'Bebas Neue',sans-serif", letterSpacing: 2, marginBottom: 5 }}>{item.rec}</div>
                          <div style={{ fontSize: 9, color: item.good ? "#6abe88" : "#4b5563" }}>{item.detail}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 10, padding: "7px 10px", background: "rgba(245,197,24,0.02)", border: "1px solid rgba(245,197,24,0.08)", borderRadius: 4, fontSize: 9, color: "#6a5030" }}>
                      ⚠ For entertainment only. NCAA totals are significantly lower than NBA — verify O/U is correct. Edge assumes ~50% efficient market.
                    </div>
                  </div>
                );
              })()}

              <div style={cardStyle}>
                <div style={{ fontSize: 9, color: "#c8a060", letterSpacing: 3, marginBottom: 10 }}>MODEL INPUTS</div>
                {result.features.map((feature) => (
                  <div key={feature.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid rgba(255,200,50,0.05)" }}>
                    <span style={{ fontSize: 10, color: "#6a5030" }}>{feature.label}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ fontSize: 10, color: "#f0e8d0", fontFamily: "monospace" }}>{feature.detail}</span>
                      <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 2, background: feature.good ? "rgba(245,197,24,0.08)" : "rgba(100,100,100,0.1)", color: feature.good ? "#f5c518" : "#4b5563", border: `1px solid ${feature.good ? "rgba(245,197,24,0.15)" : "rgba(100,100,100,0.12)"}` }}>{feature.good ? "▲" : "▼"}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background: "rgba(255,200,50,0.02)", border: "1px solid rgba(255,200,50,0.06)", borderRadius: 4, padding: "10px 14px", fontSize: 9, color: "#b9925c", lineHeight: 2, marginBottom: 14 }}>
                <span style={{ color: "#f5c518" }}>MODEL: </span>
                KenPom Adjusted Efficiency is the strongest predictor — a 10-pt AdjEM gap ≈ ~4% win prob swing. Tournament parity compression ~8%. Home court ≈ +3.5 pts (0 at neutral site). Stats: {hasLive ? <span style={{ color: "#f5c518" }}>{statsSource} live · {statsUpdated}</span> : <span style={{ color: "#4b5563" }}>2024-25 estimates — import Barttorvik or KenPom data to update</span>}.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


