# Running The NCAAM Predictor

This guide explains how to run the NCAAM predictor locally, from starting the app to using the main workflow inside the browser.

## 1. Project Location

Workspace:

- `C:\projects\game_sims\ncaam-predictor`

Main app file:

- [NCAAPredictor.tsx](C:\projects\game_sims\ncaam-predictor\src\NCAAPredictor.tsx)

App entry:

- [main.tsx](C:\projects\game_sims\ncaam-predictor\src\main.tsx)

Model logic:

- [predictionEngine.ts](C:\projects\game_sims\ncaam-predictor\src\lib\predictionEngine.ts)

Predictor orchestration hook:

- [usePredictorState.ts](C:\projects\game_sims\ncaam-predictor\src\hooks\usePredictorState.ts)

Results/model-eval orchestration hook:

- [useResultsWorkspace.ts](C:\projects\game_sims\ncaam-predictor\src\hooks\useResultsWorkspace.ts)

## 2. What You Need Running

The NCAAM predictor only needs one local process:

1. the Vite React app

Why that is enough:

- the React app serves the browser UI
- there is no local proxy server requirement in this repo
- slate entry, stats import, simulations, and CSV evaluation all run directly in the frontend

Important note:

- some optional in-app fetches, like the built-in results export from ESPN, still depend on browser network access, but they do not require a separate local backend process

## 2.1 Current Code Structure

The app is no longer one giant screen component.

Current split:

- [NCAAPredictor.tsx](C:\projects\game_sims\ncaam-predictor\src\NCAAPredictor.tsx)
  - top-level shell, refs, tabs, and wiring
- [usePredictorState.ts](C:\projects\game_sims\ncaam-predictor\src\hooks\usePredictorState.ts)
  - predictor-tab orchestration
- [useResultsWorkspace.ts](C:\projects\game_sims\ncaam-predictor\src\hooks\useResultsWorkspace.ts)
  - results and model-eval orchestration
- [PredictorPanels.tsx](C:\projects\game_sims\ncaam-predictor\src\components\PredictorPanels.tsx)
  - predictor UI sections
- [ResultsWorkspace.tsx](C:\projects\game_sims\ncaam-predictor\src\components\ResultsWorkspace.tsx)
  - results/model-eval UI sections

## 3. First-Time Setup

Open a terminal in:

- `C:\projects\game_sims\ncaam-predictor`

Install dependencies if needed:

```powershell
npm install
```

If `node_modules` already exists, you usually do not need to run this again.

## 4. Start The React App

Open a terminal in:

- `C:\projects\game_sims\ncaam-predictor`

Run:

```powershell
npm run dev
```

Vite will start a local dev server, usually at:

- `http://localhost:5173`

Keep this terminal running while you use the app.

## 5. Open The Browser App

Open your browser and go to:

- [http://localhost:5173](http://localhost:5173)

If Vite chooses a different port, use the URL shown in the terminal output.

## 6. Recommended Daily Workflow

This is the most common end-to-end pipeline for using the NCAAM model.

### 6.1 Import live advanced stats

Click:

- `IMPORT`

or, if stats were already loaded:

- `UPDATE`

What it does:

- opens the Barttorvik / KenPom import panel
- lets you paste raw text or CSV/TSV data
- supports clipboard import and file import
- updates the model inputs for all matched teams when parsed successfully

Typical success state:

- live stats indicator turns active
- status text shows how many teams were updated and from which source

Important note:

- if you do not import live stats, the app uses the built-in baseline values in [ncaaData.ts](C:\projects\game_sims\ncaam-predictor\src\data\ncaaData.ts)

### 6.2 Load today's slate from ESPN

Click:

- `LOAD ESPN SLATE`

What it does:

- fetches the selected day's NCAA slate from ESPN
- maps ESPN team names into the app's internal team abbreviations
- populates slate rows with teams, time, and neutral-site flags when available
- if `VITE_ODDS_API_KEY` is configured, also attempts to seed initial moneyline, spread, and total values from The Odds API

Typical success message:

- `Loaded X games from ESPN`

Important note:

- this still runs directly in the frontend with browser network access
- if The Odds API key is not configured, the app still loads the slate and simply skips seeded odds

### 6.3 If ESPN misses a game or you want to override the slate

Use either:

- sportsbook-style bulk paste in the backup slate panel
- inline row editing with `EDIT ODDS`

For sportsbook bulk paste:

1. click `PASTE SLATE`
2. paste sportsbook text or `AWAY @ HOME` lines
3. click `LOAD SLATE`

What it does:

- parses team names and times
- tries to resolve aliases
- attaches odds when those are available in the pasted format
- reports unmatched team names when resolution fails

### 6.4 If sportsbook lines need manual updates

Use either:

- sportsbook-style bulk paste in the backup slate panel
- inline row editing with `EDIT ODDS`

Important note:

- pasted sportsbook odds and manual edits remain the source of truth after the initial ESPN/Odds API seed

### 6.5 Adjust game settings if needed

Each game row supports:

- game type changes
- neutral-site toggle
- home back-to-back toggle
- away back-to-back toggle

Use these if:

- you are modeling a tournament or neutral-site game
- you want to test a fatigue scenario
- a sportsbook paste did not capture the exact game context you want

### 6.6 Run all simulations

Click:

- `RUN ALL SIMS`

What it does:

- runs `predictGame(...)` for every loaded matchup
- fills the table with:
  - projected scores
  - projected total
  - win probabilities
  - betting recommendations
  - edge summaries

Typical success message:

- `All simulations complete`

### 6.7 Export predictions

Click:

- `PREDICTIONS CSV`

What it does:

- builds a CSV from the current slate
- includes projections, market fields, recommendations, edge columns, and lookup keys for later grading

Typical success message:

- exported `ncaa-predictions-YYYY-MM-DD.csv`

### 6.8 Export results later

After games finish, click:

- `RESULTS CSV`

What it does:

- attempts to fetch the prior day's final scores from ESPN
- exports a results CSV for grading

Typical success message:

- results CSV created for the requested date

Important note:

- this depends on ESPN access from the browser environment
- if that fetch fails, you can still paste your own results CSV manually in the evaluation screens

### 6.9 Evaluate model performance

Switch to the:

- `MODEL EVAL` tab

What it does:

- imports predictions and results from separate side-by-side input boxes
- accepts normal exports plus cumulative spreadsheet-style prediction pastes
- tolerates extra summary rows at the top of pasted predictions
- tolerates extra trailing grading columns in predictions
- accepts comma-delimited CSV and tab-delimited spreadsheet pastes
- accepts results with or without header rows
- shows per-market ROI plus richer breakdowns like edge thresholds, ML calibration, and O/U calibration

Important note:

- the current NCAAM evaluation screen is the one in [ResultsWorkspace.tsx](C:\projects\game_sims\ncaam-predictor\src\components\ResultsWorkspace.tsx)
- if you see an older `Pending`-style summary card layout, verify you are actually running the NCAAM app and not another predictor project in the workspace

- `RESULTS TRACKER` tab
- `MODEL EVAL` tab

What it does:

- lets you paste or import both predictions and results CSV content
- matches games by date and teams
- grades Money Line, spread, and over/under outcomes
- shows market-level summaries and ROI

What is different between the two tabs:

- `RESULTS TRACKER` is the built-in tracker flow for prediction/result logs and graded game history
- `MODEL EVAL` is the dedicated evaluation screen for importing full Predictions CSV and Results CSV files and reviewing per-market ROI summaries

Recommended workflow:

1. export `PREDICTIONS CSV`
2. export `RESULTS CSV` after the games finish, or prepare a manual results sheet
3. switch to the `RESULTS TRACKER` tab
4. click `PASTE PREDICTIONS CSV`
5. click `PASTE RESULTS CSV`
6. import both

Alternative workflow:

1. export `PREDICTIONS CSV`
2. export or prepare `RESULTS CSV`
3. switch to the `MODEL EVAL` tab
4. paste the full predictions CSV
5. paste the full results CSV
6. import both

What to look at:

- `MONEY LINE`
- `SPREAD`
- `O/U`
- all graded bets
- actual bets after threshold and calibration filters
- ROI and units by market

## 7. Single-Game Workflow

The app also supports one-off matchup analysis.

The single-game tools live behind a closed-by-default panel labeled:

- `SINGLE-GAME TOOLS`

Typical flow:

1. open the `SINGLE-GAME TOOLS` panel
2. choose home team
3. choose away team
4. set game type
5. set neutral-site or back-to-back flags if needed
6. import Barttorvik or KenPom stats if desired
7. enter manual betting lines if needed
8. click `RUN SIMULATION`

This is useful for:

- testing one game quickly
- comparing baseline versus imported live stats
- checking how odds changes affect the recommendation

## 8. Full Workflow Pipeline Summary

Use this sequence for most days:

1. start `npm run dev`
2. open `http://localhost:5173`
3. click `IMPORT` and paste Barttorvik or KenPom data if desired
4. click `LOAD ESPN SLATE`
5. paste or edit sportsbook odds if needed
6. adjust neutral-site or B2B flags if needed
7. click `RUN ALL SIMS`
8. click `PREDICTIONS CSV`
9. after games finish, click `RESULTS CSV` or prepare a manual results file
10. switch to `RESULTS TRACKER` or `MODEL EVAL`
11. import both CSVs to grade performance

## 9. Common Problems

### App not loading

Symptoms:

- browser page does not open
- `localhost:5173` does not respond

Fix:

```powershell
npm run dev
```

### Stats import does not update teams

Symptoms:

- import fails
- zero teams updated
- model stays on baseline estimates

Fixes:

- paste the full source data including the header row when using standard CSV/TSV format
- for Barttorvik, use the export/table format the parser expects
- for KenPom, include the main summary columns such as team, AdjEM, AdjO, AdjD, and AdjT
- confirm team names match supported aliases in [ncaaData.js](C:\projects\game_sims\ncaam-predictor\src\data\ncaaData.ts)

### Slate parser matches too few games

Symptoms:

- bulk paste loads too few rows
- some teams are skipped
- unmatched names appear in the warning panel

Fixes:

- use `AWAY @ HOME` format when possible
- check for unusual sportsbook naming
- review alias coverage in [sportsbookParser.ts](C:\projects\game_sims\ncaam-predictor\src\lib\sportsbookParser.ts)
- add missing team aliases if the parser is otherwise behaving correctly

### Edges look too large across many games

Symptoms:

- lots of matchups show strong ML, spread, or total value at once

Fixes:

- confirm you are using the latest version of the prediction engine
- confirm the imported stats are sane and up to date
- review current volatility and edge settings in [predictionEngine.ts](C:\projects\game_sims\ncaam-predictor\src\lib\predictionEngine.ts)
- compare exported predictions against later results before recalibrating thresholds

### Results grading is incomplete

Symptoms:

- some games stay ungraded
- only part of the sheet evaluates correctly

Fixes:

- make sure predictions were exported from the current app format
- make sure results and predictions refer to the same date and team abbreviations
- confirm both CSVs were imported into the same workflow cycle

### Results CSV export fails

Symptoms:

- ESPN fetch fails
- no results file is created

Fixes:

- retry with working network access in the browser
- if needed, use a manually prepared results CSV in the evaluation tabs

### ESPN slate loads but odds are blank

Symptoms:

- games appear but betting lines are empty

Fixes:

- confirm `.env.local` contains `VITE_ODDS_API_KEY`
- restart `npm run dev` after changing env vars
- remember that The Odds API may not have all markets for every game/bookmaker
- if needed, paste sportsbook odds or edit the row manually

## 10. Running Checks

The repo currently has build, lint, unit/component tests, and browser tests available from the command line.

### 10.1 Production build

Run:

```powershell
npm run build
```

What this does:

- builds the Vite production bundle
- catches JSX and compile-time issues

### 10.2 Lint

Run:

```powershell
npm run lint
```

What this covers:

- ESLint checks across the React codebase

## 11. Testing

The repo now includes both component-level and browser-level tests.

### 11.1 Vitest unit and component tests

Run:

```powershell
npm run test
```

Vitest UI:

```powershell
npm run test:ui
```

What this covers:

- component rendering and interaction tests
- prediction engine behavior
- parser behavior for stats and sportsbook imports

### 11.2 Playwright UI tests

Run:

```powershell
npm run test:e2e
```

What this covers:

- end-to-end browser smoke coverage
- tab navigation
- slate loading
- run-all-sims workflow

First-time note:

- Playwright may require browser installation before the first run
- if needed, run `npx playwright install chromium`

## 12. Notes For Local Runs

- Keep the Vite terminal open while using the app.
- The app can run entirely on baseline estimates if live stats are not imported.
- Barttorvik and KenPom imports materially affect model outputs, so note which source you used before comparing performance.
- Results grading works best when predictions and results are exported from the same workflow cycle.
- Some files in the repo contain encoding artifacts, so exact text matching during maintenance can occasionally be annoying even when the app behavior is fine.


