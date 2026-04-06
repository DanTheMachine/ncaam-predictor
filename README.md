# NCAAM Predictor

[![CI](https://github.com/DanTheMachine/ncaam-predictor/actions/workflows/ci.yml/badge.svg)](https://github.com/DanTheMachine/ncaam-predictor/actions/workflows/ci.yml)

React + Vite app for projecting NCAA men's basketball games, comparing those projections against sportsbook lines, and reviewing model performance over time.

Runbook:

- [Running The NCAAM Predictor](C:\projects\game_sims\ncaam-predictor\RUNNING_THE_NCAAM_MODEL.md)

## Features

- Single-game prediction with market comparison
- Bulk slate import from sportsbook-style paste text
- Moneyline, spread, and total recommendation analysis
- Barttorvik and KenPom stats import
- VSiN sharp-data import for game-level betting-splits signals
- Prediction and results CSV export
- Results Tracker and Model Eval workflows
- Model Eval supports richer ROI review including market summaries, edge-threshold buckets, ML calibration, and O/U calibration
- Model Eval imports are tolerant of cumulative prediction sheets, extra top rows, extra trailing columns, TSV spreadsheet pastes, and results files with or without headers

## Scripts

- `npm run dev`: start the local Vite app
- `npm run test`: run Vitest unit and component tests
- `npm run test:ui`: open the Vitest UI
- `npm run test:e2e`: run Playwright E2E tests
- `npm run build`: create a production build

## Sharp Data Workflow

- Import team stats first from Barttorvik or KenPom.
- Import VSiN sharp data next from:
  - [https://data.vsin.com/betting-splits/?source=DK&sport=CBB](https://data.vsin.com/betting-splits/?source=DK&sport=CBB)
- Then load or edit the slate and run simulations.

Important behavior:

- VSiN data is game-level input, not team-stats input.
- It does not change projected scores.
- It does adjust the betting recommendation layer with modest ML, spread, and total edge boosts.
- Prediction CSV exports now include the sharp side, handle %, bets %, and sharp edge % for ML, spread, and total when available.

## Optional Odds Setup

For initial odds seeding on ESPN-loaded slates, create `.env.local` from [.env.example](C:\projects\game_sims\ncaam-predictor\.env.example) and set:

- `VITE_ODDS_API_KEY`

## Testing

The project now includes:

- Vitest component tests for the active `NCAAPredictor` UI
- Unit tests for prediction math and parser behavior
- Playwright browser smoke coverage for the main user flow

GitHub Actions runs Vitest, Playwright, and the production build on every push and pull request.

## Model Eval Notes

- The active NCAAM evaluation UI is implemented in [ResultsWorkspace.tsx](C:\projects\game_sims\ncaam-predictor\src\components\ResultsWorkspace.tsx).
- If you see an older `Pending`-style market summary card format, double-check that you are running the NCAAM app and not a sibling predictor app with a different `ModelEvaluation` component.

