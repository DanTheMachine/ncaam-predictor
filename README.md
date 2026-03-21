# NCAAM Predictor

[![CI](https://github.com/DanTheMachine/ncaam-predictor/actions/workflows/ci.yml/badge.svg)](https://github.com/DanTheMachine/ncaam-predictor/actions/workflows/ci.yml)

React + Vite app for projecting NCAA men's basketball games, comparing those projections against sportsbook lines, and reviewing model performance over time.

## Features

- Single-game prediction with market comparison
- Bulk slate import from sportsbook-style paste text
- Moneyline, spread, and total recommendation analysis
- Barttorvik and KenPom stats import
- Prediction and results CSV export
- Results Tracker and Model Eval workflows

## Scripts

- `npm run dev`: start the local Vite app
- `npm run test`: run Vitest unit and component tests
- `npm run test:ui`: open the Vitest UI
- `npm run test:e2e`: run Playwright E2E tests
- `npm run build`: create a production build

## Testing

The project now includes:

- Vitest component tests for the active `NCAAPredictor` UI
- Unit tests for prediction math and parser behavior
- Playwright browser smoke coverage for the main user flow

GitHub Actions runs Vitest, Playwright, and the production build on every push and pull request.
