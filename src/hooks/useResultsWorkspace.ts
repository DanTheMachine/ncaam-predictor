import { useState } from "react";
import {
  buildAggregateStats,
  buildEvalSummary,
  buildGradedRows,
  mergeUniqueRows,
  parsePredictionsCSVText,
  parseResultsCSVText,
} from "../lib/modelEval";
import type { EvalControlState } from "../types";

export function useResultsWorkspace() {
  const [resultsPaste, setResultsPaste] = useState("");
  const [resultsLog, setResultsLog] = useState<ReturnType<typeof parseResultsCSVText>>([]);
  const [resultsStatus, setResultsStatus] = useState("");
  const [resultsError, setResultsError] = useState("");
  const [showResultsPaste, setShowResultsPaste] = useState(false);
  const [predPaste, setPredPaste] = useState("");
  const [predLog, setPredLog] = useState<ReturnType<typeof parsePredictionsCSVText>>([]);
  const [showPredPaste, setShowPredPaste] = useState(false);
  const [evalThresholds, setEvalThresholds] = useState<EvalControlState>({ ml: 0, spr: 0, ou: 0 });
  const [evalCalibration, setEvalCalibration] = useState<EvalControlState>({ ml: 100, spr: 100, ou: 100 });

  const handleImportResults = () => {
    setResultsError("");
    try {
      const parsed = parseResultsCSVText(resultsPaste);
      if (!parsed.length) throw new Error("No valid rows found");
      setResultsLog((prev) => mergeUniqueRows(prev, parsed));
      setResultsStatus(`Imported ${parsed.length} results`);
      setResultsPaste("");
      setShowResultsPaste(false);
    } catch (error) {
      setResultsError(error instanceof Error ? error.message : "Results import failed");
    }
  };

  const handleImportPredictions = () => {
    setResultsError("");
    try {
      const parsed = parsePredictionsCSVText(predPaste);
      if (!parsed.length) throw new Error("No valid rows found");
      setPredLog((prev) => mergeUniqueRows(prev, parsed));
      setResultsStatus(`Imported ${parsed.length} predictions`);
      setPredPaste("");
      setShowPredPaste(false);
    } catch (error) {
      setResultsError(error instanceof Error ? error.message : "Predictions import failed");
    }
  };

  const handleResultsFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setResultsError("");
    try {
      const parsed = parseResultsCSVText(await file.text());
      if (!parsed.length) throw new Error("No valid rows found");
      setResultsLog((prev) => mergeUniqueRows(prev, parsed));
      setResultsStatus(`Imported ${parsed.length} results from ${file.name}`);
      setShowResultsPaste(false);
    } catch (error) {
      setResultsError(error instanceof Error ? error.message : "Results file import failed");
    }
  };

  const handlePredictionsFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setResultsError("");
    try {
      const parsed = parsePredictionsCSVText(await file.text());
      if (!parsed.length) throw new Error("No valid rows found");
      setPredLog((prev) => mergeUniqueRows(prev, parsed));
      setResultsStatus(`Imported ${parsed.length} predictions from ${file.name}`);
      setShowPredPaste(false);
    } catch (error) {
      setResultsError(error instanceof Error ? error.message : "Predictions file import failed");
    }
  };

  const gradedRows = buildGradedRows(predLog, resultsLog);
  const evalSummary = buildEvalSummary(gradedRows, evalThresholds, evalCalibration);
  const stats = buildAggregateStats(gradedRows);

  const clearAllImports = () => {
    setResultsLog([]);
    setPredLog([]);
    setResultsStatus("Cleared");
  };

  return {
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
    stats,
    resultsLogLength: resultsLog.length,
    predLogLength: predLog.length,
    handleImportResults,
    handleImportPredictions,
    handleResultsFileImport,
    handlePredictionsFileImport,
    clearAllImports,
  };
}
