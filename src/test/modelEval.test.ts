import { describe, expect, test } from "vitest";
import { buildDetailedEvalSummary, buildGradedRows, parsePredictionsCSVText, parseResultsCSVText } from "../lib/modelEval";

describe("modelEval", () => {
  test("grades exported predictions against exported results using lookup keys", () => {
    const predictionsCsv = [
      '"Date","Time","Home","Away","H Win%","A Win%","H Proj","A Proj","Model Total","Vegas H ML","Vegas A ML","H ML (model)","A ML (model)","ML Rec","ML Edge","Vegas Spread","Spread Home Odds","Spread Away Odds","Spread Rec","Recommended Spread Line","Spread Edge","Vegas O/U","Over Odds","Under Odds","O/U Rec","Recommended Total Line","O/U Edge","O/U Edge %","H AdjEM","A AdjEM","H AdjO","H AdjD","A AdjO","A AdjD","Stats Source","Odds Source","LookupKey"',
      '"2026-03-28","3:09 PM","ILL Fighting Illini","IOWA Cyclones","53.9%","46.1%","72.2","70.4","142.6","-343","+262","-117","+117","PASS","","-7","-108","-108","AWAY","+7","+11.4%","138.0","-113","-103","OVER","138.0","+4.6","+11.4%","+22.6","+20.6","117.8","95.2","116.8","96.2","Barttorvik live","Sportsbook","20260328ILLIOWA"',
      '"2026-03-28","5:49 PM","AZ Wildcats","PURDUE Boilermakers","47.7%","52.3%","77.6","78.6","156.2","-243","+207","+110","-110","AWAY","+20.8%","-5","-108","-108","AWAY","+5","+13.1%","153.0","-103","-113","OVER","153.0","+3.2","+9.5%","+23.2","+24.6","118.6","95.4","119.4","94.8","Barttorvik live","Sportsbook","20260328AZPURDUE"',
    ].join("\n");

    const resultsCsv = [
      '"Date","Home","Away","Home Score","Away Score","Winner","Total","LookupKey"',
      '"2026-03-28","AZ Wildcats","PURDUE Boilermakers","79","64","AZ","143","20260328AZPURDUE"',
      '"2026-03-28","ILL Fighting Illini","IOWA Cyclones","71","59","ILL","130","20260328ILLIOWA"',
    ].join("\n");

    const predictions = parsePredictionsCSVText(predictionsCsv);
    const results = parseResultsCSVText(resultsCsv);
    const graded = buildGradedRows(predictions, results);

    expect(graded).toHaveLength(2);
    expect(graded.every((row) => row.graded)).toBe(true);
    expect(graded[0]).toMatchObject({
      home: "ILL",
      away: "IOWA",
      actualTotal: 130,
    });
    expect(graded[1]).toMatchObject({
      home: "AZ",
      away: "PURDUE",
      actualTotal: 143,
    });
  });

  test("parses results csv without headers", () => {
    const resultsCsv = [
      '"2026-03-28","AZ Wildcats","PURDUE Boilermakers","79","64","AZ","143","20260328AZPURDUE"',
      '"2026-03-28","ILL Fighting Illini","IOWA Cyclones","71","59","ILL","130","20260328ILLIOWA"',
    ].join("\n");

    const results = parseResultsCSVText(resultsCsv);

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      date: "2026-03-28",
      home: "AZ",
      away: "PURDUE",
      hScore: 79,
      aScore: 64,
      lookupKey: "20260328AZPURDUE",
    });
  });

  test("parses cumulative predictions csv with extra rows and extra columns", () => {
    const cumulativePredictionsCsv = [
      '\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t76\t-4 Units\t-2 Units\t0 Units',
      '\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t6-10\t13-12\t11-11\t0-0',
      'Date,Time,Home,Away,H Win%,A Win%,H Proj,A Proj,Model Total,Vegas H ML,Vegas A ML,H ML (model),A ML (model),ML Rec,ML Edge,Vegas Spread,Spread Home Odds,Spread Away Odds,Spread Rec,Rec Spread Line,Spread Edge,Vegas O/U,Over Odds,Under Odds,O/U Rec,Rec Total Line,O/U Edge,O/U Edge %,H AdjEM,A AdjEM,H AdjO,H AdjD,A AdjO,A AdjD,Stats Source,Odds Source,LookupKey,Actual Home Score,Actual Away Score,Actual Winner,Actual Total,ML Hit,O/U Hit,Spread Hit,Bet ML,Bet O/U,Bet Spread',
      '2026-03-28,3:09 PM,ILL Fighting Illini,IOWA Cyclones,53.9%,46.1%,72.2,70.4,142.6,-343,+262,-117,+117,PASS,,-7,-108,-108,AWAY,+7,+11.4%,138.0,-113,-103,OVER,138.0,+4.6,+11.4%,+22.6,+20.6,117.8,95.2,116.8,96.2,Barttorvik live,Sportsbook,20260328ILLIOWA,71,59,ILL,130,,0,0,,,',
      '2026-03-28,5:49 PM,AZ Wildcats,PURDUE Boilermakers,47.7%,52.3%,77.6,78.6,156.2,-243,+207,+110,-110,AWAY,+20.8%,-5,-108,-108,AWAY,+5,+13.1%,153.0,-103,-113,OVER,153.0,+3.2,+9.5%,+23.2,+24.6,118.6,95.4,119.4,94.8,Barttorvik live,Sportsbook,20260328AZPURDUE,79,64,AZ,143,0,0,0,,1,',
    ].join("\n");

    const predictions = parsePredictionsCSVText(cumulativePredictionsCsv);

    expect(predictions).toHaveLength(2);
    expect(predictions[0]).toMatchObject({
      date: "2026-03-28",
      home: "ILL",
      away: "IOWA",
      lookupKey: "20260328ILLIOWA",
      recSpreadLine: 7,
      recTotalLine: 138,
    });
    expect(predictions[1]).toMatchObject({
      date: "2026-03-28",
      home: "AZ",
      away: "PURDUE",
      lookupKey: "20260328AZPURDUE",
      mlRec: "AWAY",
    });
  });

  test("parses tab-delimited cumulative predictions pasted from a spreadsheet", () => {
    const cumulativePredictionsTsv = [
      '\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t76\t-4 Units\t-2 Units\t0 Units',
      '\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t6-10\t13-12\t11-11\t0-0',
      'Date\tTime\tHome\tAway\tH Win%\tA Win%\tH Proj\tA Proj\tModel Total\tVegas H ML\tVegas A ML\tH ML (model)\tA ML (model)\tML Rec\tML Edge\tVegas Spread\tSpread Home Odds\tSpread Away Odds\tSpread Rec\tRec Spread Line\tSpread Edge\tVegas O/U\tOver Odds\tUnder Odds\tO/U Rec\tRec Total Line\tO/U Edge\tO/U Edge %\tH AdjEM\tA AdjEM\tH AdjO\tH AdjD\tA AdjO\tA AdjD\tStats Source\tOdds Source\tLookupKey\tActual Home Score\tActual Away Score\tActual Winner\tActual Total\tML Hit\tO/U Hit\tSpread Hit\tBet ML\tBet O/U\tBet Spread',
      '2026-03-28\t3:09 PM\tILL Fighting Illini\tIOWA Cyclones\t53.9%\t46.1%\t72.2\t70.4\t142.6\t-343\t+262\t-117\t+117\tPASS\t\t-7\t-108\t-108\tAWAY\t+7\t+11.4%\t138.0\t-113\t-103\tOVER\t138.0\t+4.6\t+11.4%\t+22.6\t+20.6\t117.8\t95.2\t116.8\t96.2\tBarttorvik live\tSportsbook\t20260328ILLIOWA\t71\t59\tILL\t130\t\t0\t0\t\t\t',
      '2026-03-28\t5:49 PM\tAZ Wildcats\tPURDUE Boilermakers\t47.7%\t52.3%\t77.6\t78.6\t156.2\t-243\t+207\t+110\t-110\tAWAY\t+20.8%\t-5\t-108\t-108\tAWAY\t+5\t+13.1%\t153.0\t-103\t-113\tOVER\t153.0\t+3.2\t+9.5%\t+23.2\t+24.6\t118.6\t95.4\t119.4\t94.8\tBarttorvik live\tSportsbook\t20260328AZPURDUE\t79\t64\tAZ\t143\t0\t0\t0\t\t1\t',
    ].join("\n");

    const predictions = parsePredictionsCSVText(cumulativePredictionsTsv);

    expect(predictions).toHaveLength(2);
    expect(predictions[0]).toMatchObject({
      date: "2026-03-28",
      home: "ILL",
      away: "IOWA",
      lookupKey: "20260328ILLIOWA",
    });
    expect(predictions[1]).toMatchObject({
      date: "2026-03-28",
      home: "AZ",
      away: "PURDUE",
      lookupKey: "20260328AZPURDUE",
    });
  });

  test("builds detailed evaluation summary metrics", () => {
    const predictionsCsv = [
      '"Date","Time","Home","Away","H Win%","A Win%","H Proj","A Proj","Model Total","Vegas H ML","Vegas A ML","H ML (model)","A ML (model)","ML Rec","ML Edge","Vegas Spread","Spread Home Odds","Spread Away Odds","Spread Rec","Recommended Spread Line","Spread Edge","Vegas O/U","Over Odds","Under Odds","O/U Rec","Recommended Total Line","O/U Edge","O/U Edge %","LookupKey"',
      '"2026-03-28","3:09 PM","ILL Fighting Illini","IOWA Cyclones","53.9%","46.1%","72.2","70.4","142.6","-343","+262","-117","+117","PASS","","-7","-108","-108","AWAY","+7","+11.4%","138.0","-113","-103","OVER","138.0","+4.6","+11.4%","20260328ILLIOWA"',
      '"2026-03-28","5:49 PM","AZ Wildcats","PURDUE Boilermakers","47.7%","52.3%","77.6","78.6","156.2","-243","+207","+110","-110","AWAY","+20.8%","-5","-108","-108","AWAY","+5","+13.1%","153.0","-103","-113","OVER","153.0","+3.2","+9.5%","20260328AZPURDUE"',
      '"2026-03-29","2:05 PM","DUKE Blue Devils","UCONN Huskies","56.0%","44.0%","71.3","68.6","139.9","-213","+187","-127","+127","PASS","","-5","-108","-108","PASS","","","134.0","-108","-108","OVER","134.0","+5.9","+15.3%","20260329DUKEUCONN"',
    ].join("\n");
    const resultsCsv = [
      '"Date","Home","Away","Home Score","Away Score","LookupKey"',
      '"2026-03-28","ILL Fighting Illini","IOWA Cyclones","71","59","20260328ILLIOWA"',
      '"2026-03-28","AZ Wildcats","PURDUE Boilermakers","79","64","20260328AZPURDUE"',
    ].join("\n");

    const predictions = parsePredictionsCSVText(predictionsCsv);
    const results = parseResultsCSVText(resultsCsv);
    const graded = buildGradedRows(predictions, results);
    const detailed = buildDetailedEvalSummary(predictions, results, graded);

    expect(detailed.counts).toMatchObject({
      matchedGames: 2,
      unmatchedPredictions: 1,
      unmatchedResults: 0,
      totalBets: 5,
    });
    expect(detailed.edgeThresholds[0].label).toBe("Edge 2%+");
    expect(detailed.mlCalibration.some((bucket) => bucket.label === "50-55%")).toBe(true);
    expect(detailed.ouCalibration.map((bucket) => bucket.label)).toEqual(["OVER", "UNDER", "PASS"]);
    expect(detailed.ouEdgeBuckets.map((bucket) => bucket.label)).toEqual(["0-5%", "5-10%", "10%+"]);
  });

  test("does not count PASS moneyline rows as ML bets", () => {
    const predictionsCsv = [
      'Date,Home,Away,H Win%,A Win%,Vegas H ML,Vegas A ML,H ML (model),A ML (model),ML Rec,ML Edge,Vegas O/U,Over Odds,Under Odds,O/U Rec,Recommended Total Line,O/U Edge,O/U Edge %,Vegas Spread,Spread Home Odds,Spread Away Odds,Spread Rec,Recommended Spread Line,Spread Edge',
      '2026-03-28,ILL Fighting Illini,IOWA Cyclones,53.9%,46.1%,-343,+262,-117,+117,PASS,,138,-110,-110,OVER,138,+4.6,+11.4%,-7,-108,-108,AWAY,+7,+11.4%',
    ].join("\n");
    const resultsCsv = [
      "Date,Home,Away,Home Score,Away Score",
      "2026-03-28,ILL,IOWA,71,59",
    ].join("\n");

    const predictions = parsePredictionsCSVText(predictionsCsv);
    const results = parseResultsCSVText(resultsCsv);
    const graded = buildGradedRows(predictions, results);

    expect(graded[0]).toMatchObject({
      graded: true,
      mlWin: null,
      mlROI: null,
      ouWin: false,
      sprWin: false,
    });
  });
});
