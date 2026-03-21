# LLM Context: NCAAM Bet Predictor

## Project Purpose

This project is a React + Vite app for projecting NCAA men's basketball games and comparing those projections against sportsbook lines.

The app supports:

- single-game prediction
- slate import from sportsbook paste text
- Money Line, Spread, and Total bet analysis
- importing live team stats from Barttorvik or KenPom
- exporting predictions/results CSVs
- a results tracker for grading past picks
- a dedicated Model Eval tab for ROI review

The most important user-facing screen is the predictor app in [NCAAPredictor.jsx](C:\projects\game_sims\ncaam-predictor\src\NCAAPredictor.jsx).

## Important Current Note

The active app entry now runs through:

- [main.jsx](C:\projects\game_sims\ncaam-predictor\src\main.jsx)

`main.jsx` imports:

- [NCAAPredictor.jsx](C:\projects\game_sims\ncaam-predictor\src\NCAAPredictor.jsx)

[App.jsx](C:\projects\game_sims\ncaam-predictor\src\App.jsx) still appears to be an older leftover file and should not be assumed to be active.

## High-Level Architecture

The project was refactored from one very large component into smaller modules.

### Main app shell

- [NCAAPredictor.jsx](C:\projects\game_sims\ncaam-predictor\src\NCAAPredictor.jsx)
  - owns most UI state
  - wires prediction engine to controls and displays
  - handles bulk import, stats import, CSV export, results tracking, and Model Eval UI

### Data

- [ncaaData.js](C:\projects\game_sims\ncaam-predictor\src\data\ncaaData.js)
  - team baseline data
  - conferences
  - alias/name maps used for parser resolution

### Model logic

- [predictionEngine.js](C:\projects\game_sims\ncaam-predictor\src\lib\predictionEngine.js)
  - projected score and total logic
  - Money Line and spread probability logic
  - betting edge analysis
  - CSV download helper

### Parsing

- [statsParser.js](C:\projects\game_sims\ncaam-predictor\src\lib\statsParser.js)
  - parses Barttorvik and KenPom text/CSV imports

- [sportsbookParser.js](C:\projects\game_sims\ncaam-predictor\src\lib\sportsbookParser.js)
  - parses sportsbook paste formats
  - resolves team names through aliases and abbreviations
  - can now return unmatched-team diagnostics

### Reusable UI

- [PredictorBits.jsx](C:\projects\game_sims\ncaam-predictor\src\components\PredictorBits.jsx)
  - shared display components such as stat bars/cards

## Prediction Model Summary

The current model does not use a full historical machine-learning training pipeline. It is a heuristic projection engine built from team efficiency ratings, four-factor stats, pace logic, and market comparisons.

### Score and total model

Core ideas:

- estimate possessions from blended tempo and `pacePressure`
- estimate each team's points per possession from `adjO`, opponent `adjD`, and small four-factor adjustments
- apply home-court and game-type adjustments
- optionally blend projected total toward the sportsbook total

Key outputs:

- projected home score
- projected away score
- projected total
- `totalStdDev`
- `marginStdDev`
- `totalConfidence`
- `sideConfidence`

### Money Line model

- projected margin is converted into win probability with a normal CDF
- the model compares projected home/away win probability to vig-adjusted Money Line implied probabilities
- edge threshold for recommendation is currently `2.5%`

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
- computes `totalStdDev` and confidence values

### Spread and Money Line changes

The old fixed logistic/capped approach was replaced with:

- matchup-specific margin volatility
- normal-distribution style conversion from projected margin to win/cover probability
- shared distribution logic across side and ATS

### Parser diagnostics

The sportsbook parser now exposes unmatched team names so UI can show which pasted names failed to resolve.

### Stats import improvements

The stats import flow is no longer only manual paste into a textbox.

Current options:

- paste raw text into the textarea
- import directly from clipboard
- import from file

This still does not fully auto-fetch Barttorvik from the web. Full one-click remote sync would likely need a backend or other automation layer.

### Model Eval tab

There is now a dedicated Model Eval tab in:

- [NCAAPredictor.jsx](C:\projects\game_sims\ncaam-predictor\src\NCAAPredictor.jsx)

Current behavior:

- accepts predictions CSV by matching file button or open textarea paste
- accepts results CSV by matching file button or open textarea paste
- reports per-market summaries for ML, spread, and O/U
- shows both all graded bets and "Actual" bets filtered by edge threshold and calibration
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

## Practical Editing Guidance

When modifying the project:

- if prediction logic changes, inspect [predictionEngine.js](C:\projects\game_sims\ncaam-predictor\src\lib\predictionEngine.js) first
- if import match rate is poor, inspect [ncaaData.js](C:\projects\game_sims\ncaam-predictor\src\data\ncaaData.js) and [sportsbookParser.js](C:\projects\game_sims\ncaam-predictor\src\lib\sportsbookParser.js)
- if Barttorvik or KenPom import fails, inspect [statsParser.js](C:\projects\game_sims\ncaam-predictor\src\lib\statsParser.js)
- if React warnings mention `key` props or render lists, check the large render sections in [NCAAPredictor.jsx](C:\projects\game_sims\ncaam-predictor\src\NCAAPredictor.jsx)

## Typical Commands

- dev server: `npm run dev`
- production build: `npm run build`

## Recommended First Reads For Future Work

1. [main.jsx](C:\projects\game_sims\ncaam-predictor\src\main.jsx)
2. [NCAAPredictor.jsx](C:\projects\game_sims\ncaam-predictor\src\NCAAPredictor.jsx)
3. [predictionEngine.js](C:\projects\game_sims\ncaam-predictor\src\lib\predictionEngine.js)
4. [ncaaData.js](C:\projects\game_sims\ncaam-predictor\src\data\ncaaData.js)
5. [sportsbookParser.js](C:\projects\game_sims\ncaam-predictor\src\lib\sportsbookParser.js)
