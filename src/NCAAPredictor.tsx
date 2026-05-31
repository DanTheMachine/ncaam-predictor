import { useRef, useState } from "react";
import { BestBetsPanel, DebugPanel, SimSummaryPanel, SingleGameWorkspace, SlateControlsPanel, SlateTablePanel, StatsImportPanel } from "./components/PredictorPanels";
import { ModelEvalTab, ResultsTrackerTab } from "./components/ResultsWorkspace";
import { TEAMS } from "./data/ncaaData";
import { usePredictorState } from "./hooks/usePredictorState";
import { useResultsWorkspace } from "./hooks/useResultsWorkspace";

interface TeamSelectProps {
  value: string;
  onChange: (value: string) => void;
  excludeKey: string;
  label: string;
}

export default function NCAAPredictor() {
  const statsFileRef = useRef<HTMLInputElement | null>(null);
  const evalPredFileRef = useRef<HTMLInputElement | null>(null);
  const evalResultsFileRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState("predictor");

  const {
    GAME_TYPES,
    homeTeam,
    setHomeTeam,
    awayTeam,
    setAwayTeam,
    gameType,
    setGameType,
    neutralSite,
    setNeutralSite,
    homeB2B,
    setHomeB2B,
    awayB2B,
    setAwayB2B,
    result,
    setResult,
    running,
    simCount,
    confFilter,
    setConfFilter,
    liveStats,
    kpPaste,
    setKpPaste,
    kpStatus,
    kpError,
    setKpError,
    sharpPaste,
    setSharpPaste,
    sharpStatus,
    sharpError,
    showKP,
    showSharp,
    setShowKP,
    setShowSharp,
    statsUpdated,
    statsSource,
    odds,
    oddsSource,
    manualOdds,
    setManualOdds,
    slateNeutral,
    slateGameType,
    slateDate,
    setSlateDate,
    linesRows,
    schedStatus,
    simsRunning,
    showLines,
    showSingleGameTools,
    setShowSingleGameTools,
    showBulkImport,
    setShowBulkImport,
    espnLoading,
    bulkPaste,
    bulkStatus,
    bulkError,
    bulkUnmatched,
    editingIdx,
    editFields,
    hasLive,
    hColor,
    aColor,
    hTeam,
    aTeam,
    handleKPImport,
    handleClipboardImport,
    handleStatsFile,
    handleSharpImport,
    runSim,
    applyManualOdds,
    handleBulkGames,
    handleLoadEspnSlate,
    handleRunAllSims,
    saveEdit,
    handleExport,
    handleExportResults,
    resetToEstimates,
    handleSlateGameTypeChange,
    handleSlateNeutralToggle,
    applySlateSettingsToAllGames,
    handleBulkPasteChange,
    clearBulkImport,
    updateLineTime,
    updateLineGameType,
    toggleLineNeutral,
    toggleLineB2B,
    runLineSim,
    toggleEditOdds,
    handleEditFieldChange,
    cancelEditOdds,
    resetEditedOdds,
    simSummaryRows,
    bestBets,
    debugRows,
    confList,
  } = usePredictorState();

  const {
    resultsPaste,
    setResultsPaste,
    resultsStatus,
    resultsError,
    showResultsPaste,
    setShowResultsPaste,
    predPaste,
    setPredPaste,
    showPredPaste,
    setShowPredPaste,
    evalThresholds,
    setEvalThresholds,
    evalCalibration,
    setEvalCalibration,
    gradedRows,
    evalSummary,
    detailedEval,
    stats,
    resultsLogLength,
    predLogLength,
    handleImportResults,
    handleImportPredictions,
    handleResultsFileImport,
    handlePredictionsFileImport,
    clearAllImports,
  } = useResultsWorkspace();

  const filteredTeams = (excludeKey: string) =>
    Object.entries(TEAMS).filter(([key]) => key !== excludeKey && (confFilter === "ALL" || TEAMS[key].conf === confFilter));

  const ss = {
    background: "rgba(255,200,50,0.04)",
    border: "1px solid rgba(255,200,50,0.18)",
    color: "#f0e8d0",
    padding: "8px 10px",
    borderRadius: 4,
    fontFamily: "'Courier New',monospace",
    fontSize: 12,
    width: "100%",
    cursor: "pointer",
  } as const;

  const card = {
    background: "rgba(255,200,50,0.025)",
    border: "1px solid rgba(255,200,50,0.12)",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  } as const;

  const TeamSelect = ({ value, onChange, excludeKey, label }: TeamSelectProps) => (
    <div>
      <div style={{ fontSize: 9, color: "#c8a060", letterSpacing: 3, marginBottom: 4, fontFamily: "'Courier New',monospace" }}>{label}</div>
      <select
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setResult(null);
        }}
        style={ss}
      >
        {confList.map((conf) => {
          const options = filteredTeams(excludeKey).filter(([key]) => TEAMS[key].conf === conf);
          return options.length ? (
            <optgroup key={conf} label={conf} style={{ background: "#0f0a00" }}>
              {options.map(([key, value]) => (
                <option key={key} value={key}>
                  {key} — {value.name}
                </option>
              ))}
            </optgroup>
          ) : null;
        })}
      </select>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(170deg,#0a0600 0%,#120900 50%,#0a0600 100%)", color: "#f0e8d0", fontFamily: "'Courier New',monospace", padding: "22px 18px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.15} }
        @keyframes shimmer{ 0%,100%{opacity:0.8} 50%{opacity:1} }
        select option, select optgroup { background:#0f0a00; color:#f0e8d0; }
      `}</style>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 3, zIndex: 100, background: "linear-gradient(90deg,#8B0000,#cc3300,#ff6600,#cc3300,#8B0000)", animation: "shimmer 4s ease infinite" }} />

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: 22, paddingTop: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f5c518", boxShadow: "0 0 12px #f5c518", animation: "pulse 2.5s infinite" }} />
            <span style={{ fontSize: 9, color: "#f5c518", letterSpacing: 5, fontFamily: "'Courier New',monospace" }}>NCAA MBB · ANALYTICS ENGINE · KENPOM ADJ. EFFICIENCY MODEL</span>
          </div>
          <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(28px,6vw,64px)", fontWeight: 400, margin: "4px 0 2px", lineHeight: 1, letterSpacing: 4, color: "#f0e8d0" }}>
            BRACKET <span style={{ color: "#cc3300" }}>BUSTER</span>
          </h1>
          <p style={{ fontSize: 9, color: "#b08952", letterSpacing: 3, margin: 0 }}>ADJ. OFFENSE · ADJ. DEFENSE · TEMPO · KENPOM EM</p>
        </div>

        <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "1px solid rgba(255,200,50,0.12)" }}>
          {[["predictor", "PREDICTOR"], ["results", "RESULTS TRACKER"], ["modeleval", "MODEL EVAL"]].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{ background: "transparent", border: "none", borderBottom: activeTab === id ? "2px solid #cc3300" : "2px solid transparent", padding: "10px 22px", color: activeTab === id ? "#cc3300" : "#b28a57", fontSize: 10, fontWeight: 700, letterSpacing: 3, fontFamily: "'Bebas Neue',monospace", cursor: "pointer", transition: "all 0.2s", marginBottom: -1 }}>
              {label}
            </button>
          ))}
        </div>

        {activeTab === "predictor" && (
          <>
            <StatsImportPanel
              cardStyle={card}
              hasLive={hasLive}
              statsSource={statsSource}
              liveStatsCount={Object.keys(liveStats).length}
              statsUpdated={statsUpdated}
              kpStatus={kpStatus}
              kpError={kpError}
              showKP={showKP}
              kpPaste={kpPaste}
              statsFileRef={statsFileRef}
              setShowKP={setShowKP}
              setKpPaste={setKpPaste}
              setKpError={setKpError}
              handleStatsFile={handleStatsFile}
              handleClipboardImport={handleClipboardImport}
              handleKPImport={handleKPImport}
              resetToEstimates={resetToEstimates}
            />

            <div style={{ background: "#0a0700", border: "1px solid #1a1200", borderRadius: 8, padding: 16 }}>
              <SlateControlsPanel
                slateDate={slateDate}
                slateGameType={slateGameType}
                slateNeutral={slateNeutral}
                showBulkImport={showBulkImport}
                espnLoading={espnLoading}
                bulkPaste={bulkPaste}
                bulkStatus={bulkStatus}
                bulkError={bulkError}
                bulkUnmatched={bulkUnmatched}
                sharpPaste={sharpPaste}
                sharpStatus={sharpStatus}
                sharpError={sharpError}
                showSharp={showSharp}
                schedStatus={schedStatus}
                linesCount={linesRows.length}
                hasSimResults={linesRows.some((r) => r.simResult)}
                simsRunning={simsRunning}
                gameTypes={GAME_TYPES}
                onToggleBulkImport={() => setShowBulkImport(!showBulkImport)}
                onLoadEspnSlate={handleLoadEspnSlate}
                onRunAllSims={handleRunAllSims}
                onExportPredictions={handleExport}
                onExportResults={handleExportResults}
                onSlateDateChange={setSlateDate}
                onSlateGameTypeChange={handleSlateGameTypeChange}
                onToggleSlateNeutral={handleSlateNeutralToggle}
                onApplySettingsToAllGames={applySlateSettingsToAllGames}
                onBulkPasteChange={handleBulkPasteChange}
                onHandleBulkGames={handleBulkGames}
                onClearBulkImport={clearBulkImport}
                onSharpPasteChange={setSharpPaste}
                onHandleSharpImport={handleSharpImport}
                onClearSharpImport={() => setSharpPaste("")}
                onToggleSharpImport={() => setShowSharp(!showSharp)}
              />
              <SlateTablePanel
                showLines={showLines}
                linesRows={linesRows}
                gameTypes={GAME_TYPES}
                editingIdx={editingIdx}
                editFields={editFields}
                onTimeChange={updateLineTime}
                onGameTypeChange={updateLineGameType}
                onToggleNeutral={toggleLineNeutral}
                onToggleB2B={toggleLineB2B}
                onRunSim={runLineSim}
                onToggleEdit={toggleEditOdds}
                onEditFieldChange={handleEditFieldChange}
                onSaveEdit={saveEdit}
                onCancelEdit={cancelEditOdds}
                onResetEdit={resetEditedOdds}
              />
              <SimSummaryPanel rows={simSummaryRows} />
            </div>

            <SingleGameWorkspace
              cardStyle={card}
              selectStyle={ss}
              showSingleGameTools={showSingleGameTools}
              setShowSingleGameTools={setShowSingleGameTools}
              confList={confList}
              confFilter={confFilter}
              setConfFilter={setConfFilter}
              TeamSelectComponent={TeamSelect}
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              setHomeTeam={setHomeTeam}
              setAwayTeam={setAwayTeam}
              liveStats={liveStats}
              gameTypes={GAME_TYPES}
              gameType={gameType}
              setGameType={setGameType}
              neutralSite={neutralSite}
              setNeutralSite={setNeutralSite}
              homeB2B={homeB2B}
              awayB2B={awayB2B}
              setHomeB2B={setHomeB2B}
              setAwayB2B={setAwayB2B}
              setResult={setResult}
              hasLive={hasLive}
              hColor={hColor}
              aColor={aColor}
              hTeam={hTeam}
              aTeam={aTeam}
              runSim={runSim}
              running={running}
              simCount={simCount}
              manualOdds={manualOdds}
              setManualOdds={setManualOdds}
              applyManualOdds={applyManualOdds}
              oddsSource={oddsSource}
              odds={odds}
              result={result}
              statsSource={statsSource}
              statsUpdated={statsUpdated}
            />
            <BestBetsPanel bets={bestBets} />
            <DebugPanel rows={debugRows} />
          </>
        )}

        {activeTab === "results" && (
          <ResultsTrackerTab
            resultsStatus={resultsStatus}
            resultsError={resultsError}
            gradedRows={gradedRows}
            stats={stats}
            showResultsPaste={showResultsPaste}
            showPredPaste={showPredPaste}
            resultsLogLength={resultsLogLength}
            predLogLength={predLogLength}
            resultsPaste={resultsPaste}
            predPaste={predPaste}
            setShowResultsPaste={setShowResultsPaste}
            setShowPredPaste={setShowPredPaste}
            setResultsPaste={setResultsPaste}
            setPredPaste={setPredPaste}
            handleImportResults={handleImportResults}
            handleImportPredictions={handleImportPredictions}
            clearAllImports={clearAllImports}
          />
        )}

        {activeTab === "modeleval" && (
          <ModelEvalTab
            resultsStatus={resultsStatus}
            resultsError={resultsError}
            predPaste={predPaste}
            resultsPaste={resultsPaste}
            evalThresholds={evalThresholds}
            evalCalibration={evalCalibration}
            evalSummary={evalSummary}
            detailedEval={detailedEval}
            gradedRows={gradedRows}
            stats={stats}
            evalResultsFileRef={evalResultsFileRef}
            evalPredFileRef={evalPredFileRef}
            setPredPaste={setPredPaste}
            setResultsPaste={setResultsPaste}
            setEvalThresholds={setEvalThresholds}
            setEvalCalibration={setEvalCalibration}
            handleImportPredictions={handleImportPredictions}
            handleImportResults={handleImportResults}
            handleResultsFileImport={handleResultsFileImport}
            handlePredictionsFileImport={handlePredictionsFileImport}
            clearAllImports={clearAllImports}
          />
        )}
      </div>
    </div>
  );
}
