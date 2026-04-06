# LLM Context: NCAAM Bet Predictor

## Project Purpose

This project is a React + Vite app for projecting NCAA men's basketball games and comparing those projections against sportsbook lines.

The app supports:

- single-game prediction
- slate import from sportsbook paste text
- Money Line, Spread, and Total bet analysis
- importing live team stats from Barttorvik or KenPom
- importing VSiN betting splits as game-level sharp signals
- exporting predictions/results CSVs
- a results tracker for grading past picks
- a dedicated Model Eval tab for ROI review
- hook-based orchestration for predictor and results workflows
- local Vitest and Playwright test coverage
- GitHub Actions CI for tests and build

The most important user-facing screen is the predictor app in [NCAAPredictor.tsx](C:\projects\game_sims\ncaam-predictor\src\NCAAPredictor.tsx).

There is also now an operational runbook for using the app locally:

- [RUNNING_THE_NCAAM_MODEL.md](C:\projects\game_sims\ncaam-predictor\RUNNING_THE_NCAAM_MODEL.md)

## Important Current Note

The active app entry now runs through:

- [main.tsx](C:\projects\game_sims\ncaam-predictor\src\main.tsx)

`main.tsx` imports:

- [NCAAPredictor.tsx](C:\projects\game_sims\ncaam-predictor\src\NCAAPredictor.tsx)

[App.tsx](C:\projects\game_sims\ncaam-predictor\src\App.tsx) still appears to be an older leftover file and should not be assumed to be active.

## High-Level Architecture

The project was refactored from one very large component into smaller modules.

### Main app shell

- [NCAAPredictor.tsx](C:\projects\game_sims\ncaam-predictor\src\NCAAPredictor.tsx)
  - now mostly owns top-level tab state, refs, layout, and prop wiring
  - composes the extracted predictor, results, and model-eval workspaces

### Hook orchestration

- [usePredictorState.ts](C:\projects\game_sims\ncaam-predictor\src\hooks\usePredictorState.ts)
  - owns predictor-tab orchestration
  - manages stats import state, slate import/edit state, run-all-sims flow, single-game state, export helpers, and best-bets/sim-summary preparation

- [useResultsWorkspace.ts](C:\projects\game_sims\ncaam-predictor\src\hooks\useResultsWorkspace.ts)
  - owns results/model-eval orchestration
  - manages predictions/results CSV import state, grading summaries, threshold/calibration controls, and clear/reset flows

### Data

- [ncaaData.ts](C:\projects\game_sims\ncaam-predictor\src\data\ncaaData.ts)
  - team baseline data
  - conferences
  - alias/name maps used for parser resolution
  - core lookup support for sportsbook parsing and UI team selection

### Model logic

- [predictionEngine.ts](C:\projects\game_sims\ncaam-predictor\src\lib\predictionEngine.ts)
  - projected score and total logic
  - Money Line and spread probability logic
  - betting edge analysis
  - VSiN sharp-signal boosts for ML, spread, and total recommendations
  - CSV download helper

### Testing and CI

- [src/test](C:\projects\game_sims\ncaam-predictor\src\test)
  - Vitest component tests for the active UI
  - unit tests for prediction engine math and parser behavior
  - focused hook tests for predictor and results workspace orchestration

- [tests/e2e](C:\projects\game_sims\ncaam-predictor\tests\e2e)
  - Playwright browser smoke tests
  - predictor slate flow coverage
  - results tracker / model eval CSV import coverage

- [playwright.config.ts](C:\projects\game_sims\ncaam-predictor\playwright.config.ts)
  - local Playwright configuration

- [ci.yml](C:\projects\game_sims\ncaam-predictor\.github\workflows\ci.yml)
  - GitHub Actions workflow
  - split jobs for Vitest, production build, and Playwright E2E

### Parsing

- [statsParser.ts](C:\projects\game_sims\ncaam-predictor\src\lib\statsParser.ts)
  - parses Barttorvik and KenPom text/CSV imports

- [sportsbookParser.ts](C:\projects\game_sims\ncaam-predictor\src\lib\sportsbookParser.ts)
  - parses sportsbook paste formats
  - resolves team names through aliases and abbreviations
  - can now return unmatched-team diagnostics

- [sharpSignals.ts](C:\projects\game_sims\ncaam-predictor\src\lib\sharpSignals.ts)
  - parses VSiN betting-splits paste blocks
  - resolves two-row matchup input into game-level sharp signals
  - attaches handle-vs-bets data to the current slate

### Reusable UI

- [PredictorPanels.tsx](C:\projects\game_sims\ncaam-predictor\src\components\PredictorPanels.tsx)
  - extracted Predictor tab panels
  - includes stats import, slate controls/table, sim summary, best bets, and the single-game workspace

- [ResultsWorkspace.tsx](C:\projects\game_sims\ncaam-predictor\src\components\ResultsWorkspace.tsx)
  - extracted Results Tracker and Model Eval tab UIs

- [PredictorBits.tsx](C:\projects\game_sims\ncaam-predictor\src\components\PredictorBits.tsx)
  - shared display components such as stat bars/cards

### Shared types

- [types.ts](C:\projects\game_sims\ncaam-predictor\src\types.ts)
  - shared predictor, parser, and evaluation shapes
  - includes cross-module state like `EvalControlState`

## Prediction Model Summary

The current model does not use a full historical machine-learning training pipeline. It is a heuristic projection engine built from team efficiency ratings, four-factor stats, pace logic, and market comparisons.

### Score and total model

Core ideas:

- estimate possessions from a conservative blend of harmonic tempo, average tempo, and `pacePressure`
- estimate each team's points per possession from `adjO`, opponent `adjD`, and small four-factor adjustments
- apply home-court and game-type adjustments
- blend projected total toward the sportsbook total when odds are present, with extra restraint when the raw model lands well above market

Key outputs:

- projected home score
- projected away score
- projected total
- `totalStdDev`
- `marginStdDev`
- `totalConfidence`
- `sideConfidence`

Recent calibration direction:

- `totalStdDev` and `marginStdDev` were widened to make the model less aggressive when turning projection gaps into betting probabilities
- this was done after observing too many large edges across full slates
- the pace estimate was recently tuned down slightly so tempo-gap and four-factor pressure do not inflate possessions as aggressively
- totals now lean more heavily toward posted O/U numbers when the raw projection is materially higher than market, and a drift cap keeps displayed totals from running too far above consensus

### Money Line model

- projected margin is converted into win probability with a normal CDF
- the model compares projected home/away win probability to vig-adjusted Money Line implied probabilities
- edge threshold for recommendation is currently `2.5%`
- the single-game UI display now also de-vigs both Money Line sides before showing edge, so it matches the main betting engine

### Spread model

- projected margin and `marginStdDev` are used to estimate cover probability
- cover probability is compared to vig-adjusted spread price probabilities
- edge threshold for recommendation is currently `3.0%`

### Total model

- projected total is compared to sportsbook `overUnder`
- directional recommendation threshold is currently `2.0` points
- probabilities are calculated using `totalStdDev`

For a deeper human-readable explanation, see:

- [MODEL_PREDICTION_ALGORITHMS.md](C:\projects\game_sims\ncaam-predictor\MODEL_PREDICTION_ALGORITHMS.md)

## Recent Changes And Important History

These are the most relevant recent changes to understand before editing.

### Team coverage expansion

The app originally had only a subset of NCAA teams. Recent work added many more schools plus aliases so sportsbook imports match more games.

Examples of recently added or fixed coverage:

- Lehigh
- Prairie View A&M
- Navy
- Illinois State
- Utah Valley
- Murray State
- Illinois Chicago
- Siena
- McNeese
- Penn
- LIU
- Idaho
- Akron
- Wright State
- Tennessee State
- Hofstra
- Queens
- Furman

Also added many alias fixes for sportsbook text such as:

- `MIAMI OHIO`
- `ST. JOSEPHS`
- `VA COMMONWEALTH`
- `SAINT MARYS CA`
- `CENTRAL FLORIDA`
- `ST. JOHNS`
- `IDAHO U`

### Totals model changes

The totals model was recently upgraded and then tuned back to be more conservative.

Current behavior:

- uses blended pace rather than simple average only
- uses small additive four-factor adjustments instead of heavily multiplying offense again
- can partially blend toward market totals when odds are present
- now uses a stronger market pull and a soft cap when the raw total is much higher than the posted line
- computes `totalStdDev` and confidence values
- now uses wider total volatility assumptions than earlier revisions to reduce overstated O/U edges

### Spread and Money Line changes

The old fixed logistic/capped approach was replaced with:

- matchup-specific margin volatility
- normal-distribution style conversion from projected margin to win/cover probability
- shared distribution logic across side and ATS
- recent follow-up work widened margin volatility assumptions to reduce oversized ML and ATS edges across large slates

### VSiN sharp data workflow

The predictor now supports a dedicated `VSIN SHARP DATA` step in the main workflow.

Current behavior:

- VSiN data is imported as game-level input after stats import and before slate simulation
- the source panel includes a direct link to:
  - [https://data.vsin.com/betting-splits/?source=DK&sport=CBB](https://data.vsin.com/betting-splits/?source=DK&sport=CBB)
- successful VSiN import attaches sharp signals to matched slate games
- the sharp import panel now supports hide/show behavior and auto-collapses after a successful import
- sharp data does not change the core projected score from `predictGame(...)`
- sharp data does influence betting recommendations through modest ML, spread, and total edge boosts in `analyzeBetting(...)`
- sim summary cards now show sharp support as:
  - side
  - handle %
  - bets %
  - edge boost %
- exported prediction CSVs now include sharp columns for ML, spread, and total

### Edge display fix

Recent bug fix:

- the single-game Money Line edge display previously compared model win probability to raw implied odds
- it now compares against vig-adjusted market probabilities, matching the core betting engine

### Parser diagnostics

The sportsbook parser now exposes unmatched team names so UI can show which pasted names failed to resolve.

### Stats import improvements

The stats import flow is no longer only manual paste into a textbox.

Current options:

- paste raw text into the textarea
- import directly from clipboard
- import from file

This still does not fully auto-fetch Barttorvik from the web. Full one-click remote sync would likely need a backend or other automation layer.

### Slate loading workflow

The predictor slate can now be loaded from ESPN based on the selected `slateDate`, with sportsbook paste kept as the backup/manual override path.

Current behavior:

- primary slate source is ESPN scoreboard data for the selected date
- sportsbook paste remains available as a backup/manual override
- the existing `slateDate` state in [usePredictorState.ts](C:\projects\game_sims\ncaam-predictor\src\hooks\usePredictorState.ts) drives the ESPN fetch
- ESPN team-name normalization and internal alias matching are handled in [usePredictorState.ts](C:\projects\game_sims\ncaam-predictor\src\hooks\usePredictorState.ts)
- slate rows are populated with teams, game time, and neutral-site flags when available from ESPN

### Initial odds seeding

The app can now optionally seed initial odds onto an ESPN-loaded slate using The Odds API.

Current behavior:

- if `VITE_ODDS_API_KEY` is present, the app attempts to fetch `basketball_ncaab` odds from The Odds API for the selected date
- initial moneyline, spread, and total values are merged onto matching ESPN slate rows when a supported bookmaker has all required markets
- preferred bookmakers currently include DraftKings, FanDuel, BetMGM, Caesars, ESPN BET, BetRivers, and Bovada
- if no Odds API key is configured, the slate still loads from ESPN and simply skips initial odds seeding
- pasted sportsbook odds and manual row edits remain the override path after the initial seed

Important limitation:

- ESPN is used only for schedule/slate data
- sportsbook odds are not fetched from ESPN
- The Odds API key currently lives in the frontend Vite environment, so this setup is best treated as a local/personal workflow rather than a secure production secret

### Model Eval tab

There is now a dedicated Model Eval tab composed through:

- [NCAAPredictor.tsx](C:\projects\game_sims\ncaam-predictor\src\NCAAPredictor.tsx)
- [ResultsWorkspace.tsx](C:\projects\game_sims\ncaam-predictor\src\components\ResultsWorkspace.tsx)
- [useResultsWorkspace.ts](C:\projects\game_sims\ncaam-predictor\src\hooks\useResultsWorkspace.ts)

Current behavior:

- accepts predictions CSV by matching file button or open textarea paste
- accepts results CSV by matching file button or open textarea paste
- accepts cumulative spreadsheet-style prediction pastes with extra rows at the top, extra columns at the end, and tab-delimited clipboard content
- accepts results CSV with or without a header row
- reports per-market summaries for ML, spread, and O/U
- shows both all graded bets and "Actual" bets filtered by edge threshold and calibration
- now includes richer evaluation sections tailored to college basketball:
  - matched games / total bets / unmatched counts
  - ROI by market
  - edge-threshold buckets
  - ML calibration buckets
  - O/U calibration by recommendation direction
  - O/U edge buckets
- uses explicit exported edge fields:
  - `ML Rec`
  - `ML Edge`
  - `Spread Rec`
  - `Spread Edge`
  - `O/U Rec`
  - `O/U Edge`
  - `O/U Edge %`

Important nuance:

- `Actual Bets` in Model Eval currently means bets that pass the user-set threshold after calibration scaling
- it does not mean manually confirmed placed wagers from a bookmaker history feed
- ML and spread summaries are intended to count only explicit non-`PASS` recommendations; if a UI shows `Pending` counts for ML/spread with no recommendations, verify you are not looking at a different app's older `ModelEvaluation` component

### Cross-app UI confusion note

During recent debugging, a `Pending`-style market summary card was reported against the NCAAM app, but that exact renderer text was traced to a different predictor app in the broader workspace rather than this app's current [ResultsWorkspace.tsx](C:\projects\game_sims\ncaam-predictor\src\components\ResultsWorkspace.tsx).

Important takeaway:

- the active NCAAM evaluation UI lives in [ResultsWorkspace.tsx](C:\projects\game_sims\ncaam-predictor\src\components\ResultsWorkspace.tsx)
- older NBA/NHL-style `ModelEvaluation.tsx` components in sibling projects may show a different card format with `Pending` counts
- when debugging evaluation summaries, confirm the running app and component path before assuming the bug is in NCAAM

### Predictor layout changes

The Predictor tab is now slate-first.

Current layout:

- stats import at the top
- slate manager / run-all-sims / CSV export in the main visible flow
- single-game tools moved into a closed-by-default panel labeled `SINGLE-GAME TOOLS`

That panel now contains:

- conference filter
- team selectors
- team cards
- KenPom advanced stat comparison
- single-game simulation button
- manual betting lines
- single-game result details

## Known Quirks / Risks

### 1. CSV schema is evolving

Predictions CSV exports have changed during recent work, especially around evaluation fields.

Current evaluation-related columns include:

- `ML Rec`
- `ML Edge`
- `Spread Rec`
- `Recommended Spread Line`
- `Spread Edge`
- `O/U Rec`
- `Recommended Total Line`
- `O/U Edge`
- `O/U Edge %`

If Model Eval behavior looks wrong, first verify that the imported predictions CSV was generated after the latest schema changes.

### 2. Old files archive

There are many historical versions under:

- [old_app_files](C:\projects\game_sims\ncaam-predictor\src\old_app_files)

These are useful for reference but should not be assumed to be active.

### 3. Encoding artifacts

Some files contain mojibake-like characters such as `â†’`, `âœ“`, `Â·`, and similar text artifacts. These are cosmetic but can make exact patching or string matching more annoying.

### 4. Team alias quality strongly affects slate coverage

If a sportsbook paste only matches a few games, the problem is usually:

- missing team data
- missing aliases
- unusual sportsbook naming

Not usually the core parser structure itself.

### 5. Model is heuristic, not fully backtested

The projection engine is materially better than the original simple version, but it is still heuristic. The highest-value future improvement would be historical calibration/backtesting of:

- total coefficients
- margin variance
- bet edge thresholds

### 6. Current edge thresholds are heuristic

Current recommendation thresholds still exist, but they should not be treated as fully calibrated:

- Money Line edge threshold: `2.5%`
- Spread edge threshold: `3.0%`
- total directional threshold: `2.0` points

The current plan is to recalibrate after collecting more prediction/results CSV sets rather than tuning blindly.

### 7. Patch/editing can be sensitive around formatting quirks

Recent refactors are stable, but a few files still have enough formatting and encoding noise that smaller, surgical edits tend to be safer than large blind patches.

## Practical Editing Guidance

When modifying the project:

- if prediction logic changes, inspect [predictionEngine.ts](C:\projects\game_sims\ncaam-predictor\src\lib\predictionEngine.ts) first
- if import match rate is poor, inspect [ncaaData.ts](C:\projects\game_sims\ncaam-predictor\src\data\ncaaData.ts) and [sportsbookParser.ts](C:\projects\game_sims\ncaam-predictor\src\lib\sportsbookParser.ts)
- if Barttorvik or KenPom import fails, inspect [statsParser.ts](C:\projects\game_sims\ncaam-predictor\src\lib\statsParser.ts)
- if predictor behavior changes, check [usePredictorState.ts](C:\projects\game_sims\ncaam-predictor\src\hooks\usePredictorState.ts) before assuming it still lives in the screen component
- if results/model-eval behavior changes, check [useResultsWorkspace.ts](C:\projects\game_sims\ncaam-predictor\src\hooks\useResultsWorkspace.ts)
- if hook behavior changes, update the focused hook tests in [src/test](C:\projects\game_sims\ncaam-predictor\src\test) along with the implementation
- if React warnings mention `key` props or render lists, check the extracted render sections in [PredictorPanels.tsx](C:\projects\game_sims\ncaam-predictor\src\components\PredictorPanels.tsx) or [ResultsWorkspace.tsx](C:\projects\game_sims\ncaam-predictor\src\components\ResultsWorkspace.tsx)

## Typical Commands

- dev server: `npm run dev`
- production build: `npm run build`
- lint: `npm run lint`
- Vitest: `npm run test`
- Vitest UI: `npm run test:ui`
- Playwright E2E: `npm run test:e2e`

## Recommended First Reads For Future Work

1. [main.tsx](C:\projects\game_sims\ncaam-predictor\src\main.tsx)
2. [NCAAPredictor.tsx](C:\projects\game_sims\ncaam-predictor\src\NCAAPredictor.tsx)
3. [usePredictorState.ts](C:\projects\game_sims\ncaam-predictor\src\hooks\usePredictorState.ts)
4. [useResultsWorkspace.ts](C:\projects\game_sims\ncaam-predictor\src\hooks\useResultsWorkspace.ts)
5. [predictionEngine.ts](C:\projects\game_sims\ncaam-predictor\src\lib\predictionEngine.ts)
6. [ncaaData.ts](C:\projects\game_sims\ncaam-predictor\src\data\ncaaData.ts)
7. [sportsbookParser.ts](C:\projects\game_sims\ncaam-predictor\src\lib\sportsbookParser.ts)
8. [src/test](C:\projects\game_sims\ncaam-predictor\src\test)

If the task is operational rather than code-oriented, also read:

9. [RUNNING_THE_NCAAM_MODEL.md](C:\projects\game_sims\ncaam-predictor\RUNNING_THE_NCAAM_MODEL.md)

