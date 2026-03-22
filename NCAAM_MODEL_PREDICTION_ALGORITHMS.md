# NCAAM Bet Predictor Model Algorithms

This document explains how the current model in [predictionEngine.js](C:\projects\game_sims\ncaam-predictor\src\lib\predictionEngine.ts) produces:

- projected scores
- projected game total
- Money Line probabilities
- Spread cover probabilities
- betting recommendations versus sportsbook terms

## 1. Inputs

For each matchup, the engine starts with team-level ratings.

- `adjO`: adjusted offensive efficiency, or points scored per 100 possessions after opponent/schedule adjustment
- `adjD`: adjusted defensive efficiency, or points allowed per 100 possessions after opponent/schedule adjustment
- `adjEM`: adjusted efficiency margin, usually `adjO - adjD`
- `tempo`: estimated possessions per game
- `efgPct`: effective field goal percentage, a shooting metric that gives extra weight to 3-point shots
- `tovPct`: turnover percentage, or how often a team gives the ball away
- `orbPct`: offensive rebound percentage, or how often a team grabs its own misses
- `ftr`: free throw rate, a measure of how often a team gets to the line relative to shot attempts

These come from:

- baseline team estimates in [ncaaData.js](C:\projects\game_sims\ncaam-predictor\src\data\ncaaData.ts)
- optionally overwritten by imported Barttorvik or KenPom data

The model also uses game context.

- `gameType`: regular season, conference tournament, NCAA tournament rounds, etc.
- `neutralSite`: whether the game removes home-court advantage
- `homeB2B`: whether the home team is on a back-to-back
- `awayB2B`: whether the away team is on a back-to-back
- `odds`: sportsbook terms such as Money Line, spread, and total

There is a full glossary in the Definitions section at the end.

## 2. Score And Total Projection

The main total/score engine lives in `projectMatchupTotal(...)`.

### 2.1 Tournament and location adjustments

- Home court advantage is `+3.5` points to the home team unless the game is at a neutral site.
- Back-to-back flags apply a small offensive penalty.
- Tournament games reduce scoring slightly with a `tourneyFactor`:
  - NCAA Tournament: `0.965`
  - Conference Tournament: `0.985`
  - Regular Season: `1.0`

### 2.2 Possession estimate

The model estimates possessions using a blend of:

- average tempo: the simple midpoint of the two teams' tempos
- harmonic tempo: a more conservative blended pace that reduces the impact of one extremely fast team
- a `pacePressure` adjustment: a style-based modifier that pushes expected pace up or down based on rebounding, turnovers, free throws, and tempo mismatch

`pacePressure` increases or decreases the pace estimate based on:

- offensive rebounding versus league average
- turnover rates versus league average
- free throw rate versus league average
- tempo gap between the two teams

Quick definitions:

- average tempo: the plain arithmetic average of home and away tempo
- harmonic tempo: a blended average that gives less weight to extreme pace values
- `pacePressure`: the model's custom pace adjustment based on how the matchup is likely to create extra possessions or slow the game down

Full definitions:

- average tempo:
  - formula: `(home tempo + away tempo) / 2`
  - purpose: gives a straightforward center point between the two teams' normal pace profiles
- harmonic tempo:
  - formula: `(2 * home tempo * away tempo) / (home tempo + away tempo)`
  - purpose: prevents one very fast or very slow team from dominating the possession estimate too aggressively
- `pacePressure`:
  - formula: a sum of rebounding, turnover, free-throw, and tempo-gap adjustments
  - purpose: shifts the possession estimate up when the matchup should create more extra chances, or down when the matchup looks more stable and half-court oriented

The final possessions estimate is bounded between `60` and `79`.

### 2.3 Points per possession

Each team gets a baseline PPP:

- `homeBasePpp = home.adjO * (away.adjD / 100) / 100`
- `awayBasePpp = away.adjO * (home.adjD / 100) / 100`

Then the model adds a small four-factor matchup adjustment:

- shooting adjustment from `efgPct`
- ball security adjustment from `tovPct`
- second-chance adjustment from `orbPct`
- foul pressure adjustment from `ftr`

That adjustment is additive and intentionally small. Final PPP is bounded between `0.82` and `1.28`.

### 2.4 Raw scores and raw total

Raw team scores are:

- `rawScore = possessions * ppp * tourneyFactor * b2bAdjustment`

Then home court is split between the two teams:

- home gets `+hfa / 2`
- away gets `-hfa / 2`

Each team score also has a floor of `52`.

This produces:

- `homeRawScore`
- `awayRawScore`
- `rawTotal`

### 2.5 Market blend for totals

If a sportsbook total is available, the model does not use its raw total blindly.

It computes:

- `marketGap = |rawTotal - sportsbookTotal|`
- `marketWeight` based on:
  - how far the model is from market
  - total confidence

The final total is:

- `finalTotal = rawTotal * (1 - marketWeight) + sportsbookTotal * marketWeight`

Then the difference between `finalTotal` and `rawTotal` is split evenly across both teams so the total changes without distorting the projected margin too much.

## 3. Confidence And Variance

The model explicitly estimates uncertainty.

### 3.1 Total confidence

`totalConfidence` starts from a base level and is reduced by:

- tournament settings
- large tempo mismatch
- back-to-back flags

It is bounded between `0.38` and `0.72`.

### 3.2 Total standard deviation

`totalStdDev` is based on:

- a base volatility
- tempo gap
- shooting deviation from league average
- back-to-back flags

The current implementation intentionally uses a wider range than earlier versions so totals do not produce oversized probability edges from modest projection gaps.

It is bounded between `11.5` and `17.5`.

### 3.3 Margin standard deviation

`marginStdDev` is based on:

- base side volatility
- possessions
- tempo gap
- model confidence
- back-to-back flags

The current implementation intentionally uses a wider range than earlier versions so Money Line and spread edges are less aggressive.

It is bounded between `10.5` and `16.5`.

The model also derives `sideConfidence` from margin volatility.

## 4. Money Line Prediction

After projected home and away scores are produced:

- `diff = homeScore - awayScore`

The model converts projected margin into win probability using a normal CDF:

- `homeWinProb = normCDF(diff / marginStdDev)`
- `awayWinProb = 1 - homeWinProb`

This means:

- bigger projected margin increases win probability
- higher matchup volatility lowers confidence in that margin

The probability is bounded between `1.5%` and `98.5%`.

The model can also convert these win probabilities into fair American odds:

- favorite: negative price
- underdog: positive price

## 5. Spread Prediction

The spread model uses the same projected margin distribution as the Money Line model.

For the home side cover probability:

- `homeCoverProb = normCDF((projectedMargin + homeSpread) / marginStdDev)`

Where:

- `projectedMargin = homeScore - awayScore`
- `homeSpread` is the sportsbook spread from the home team perspective

Examples:

- if the home team is `-4.5`, the model asks how often projected margin exceeds `4.5`
- if the home team is `+4.5`, the model asks how often projected margin exceeds `-4.5`

Away cover probability is simply:

- `awayCoverProb = 1 - homeCoverProb`

## 6. Total Bet Prediction

For totals, the model compares:

- `projectedTotal`
- sportsbook `overUnder`

The point difference is:

- `ouEdge = projectedTotal - overUnder`

Recommendation rule:

- `over` if `ouEdge > 2`
- `under` if `ouEdge < -2`
- `pass` otherwise

The model also estimates:

- `pOver = 1 - normCDF((overUnder - projectedTotal) / totalStdDev)`
- `pUnder = 1 - pOver`

So it uses both:

- a point-gap rule for the recommendation
- a probability model for edge sizing

## 7. Converting Sportsbook Terms Into Fair Probabilities

Before the model compares itself to sportsbook prices, it removes vig.

### 7.1 American odds to implied probability

For a Money Line:

- negative odds: `-150 -> 150 / (150 + 100)`
- positive odds: `+130 -> 100 / (130 + 100)`

This is handled by `americanToImplied(...)`.

### 7.2 Vig removal

For a two-way market:

1. convert each side to implied probability
2. add them together
3. divide each side by the total

That creates vig-adjusted probabilities for:

- home vs away Money Line
- home vs away spread price
- over vs under price

## 8. Money Line Bet Recommendation

The model compares:

- model home win probability vs vig-adjusted home implied probability
- model away win probability vs vig-adjusted away implied probability

Edges:

- `homeEdge = modelHomeProb - marketHomeProb`
- `awayEdge = modelAwayProb - marketAwayProb`

Recommendation rule:

- bet `home` if `homeEdge > 2.5%`
- bet `away` if `awayEdge > 2.5%`
- otherwise `none`

Displayed edge:

- `mlValuePct = max(homeEdge, awayEdge) * 100`

Important display note:

- the app now de-vigs both Money Line sides before showing edge in the single-game view
- this keeps the single-game display aligned with the main betting engine and avoids overstating edge by comparing against raw implied odds

## 9. Spread Bet Recommendation

The model compares:

- `homeCoverProb` vs vig-adjusted home spread implied probability
- `awayCoverProb` vs vig-adjusted away spread implied probability

Edges:

- `spreadHomeEdge = homeCoverProb - marketHomeCoverProb`
- `spreadAwayEdge = awayCoverProb - marketAwayCoverProb`

Recommendation rule:

- bet `home` if `spreadHomeEdge > 3.0%`
- bet `away` if `spreadAwayEdge > 3.0%`
- otherwise `pass`

Displayed edge:

- `spreadEdge = max(spreadHomeEdge, spreadAwayEdge) * 100`

## 10. Total Bet Recommendation

There are two related total outputs.

### 10.1 Directional recommendation

Based on projected points difference versus the sportsbook total:

- `over` if model total is more than `2.0` points above market
- `under` if model total is more than `2.0` points below market
- otherwise `pass`

### 10.2 Probability edge

The model also computes:

- `overEdgeProb = pOver - vigAdjustedOverProb`
- `underEdgeProb = pUnder - vigAdjustedUnderProb`

Then it reports `ouEdgePct` using the selected side if there is a recommendation.

## 11. Worked Example

This example uses rounded values to show the full flow. It is meant to explain the model logic, not reproduce an exact live output.

### 11.1 Example inputs

Home team:

- `adjO = 116.0`
- `adjD = 97.0`
- `tempo = 70.0`
- `efgPct = 53.0`
- `tovPct = 15.5`
- `orbPct = 32.0`
- `ftr = 35.0`

Away team:

- `adjO = 111.0`
- `adjD = 101.0`
- `tempo = 67.0`
- `efgPct = 51.0`
- `tovPct = 17.5`
- `orbPct = 30.0`
- `ftr = 32.0`

Game context:

- regular season
- not neutral
- no back-to-back penalty

Sportsbook terms:

- home Money Line `-165`
- away Money Line `+145`
- home spread `-3.5`
- spread odds `-110 / -110`
- total `145.5`
- over `-110`
- under `-110`

### 11.2 Step 1: Estimate possessions

Average tempo:

- Home team tempo: `70.0`
- Away team tempo: `67.0`
- Formula: `(home_tempo + away_tempo) / 2 = average_tempo`
- Substitution: `(70.0 + 67.0) / 2`
- Result: `68.5`

Harmonic tempo:

- Home team tempo: `70.0`
- Away team tempo: `67.0`
- Formula: `(2 * home_tempo * away_tempo) / (home_tempo + away_tempo) = harmonic_tempo`
- Substitution: `(2 * 70.0 * 67.0) / (70.0 + 67.0)`
- Result: `68.47`

Tempo gap:

- Home team tempo: `70.0`
- Away team tempo: `67.0`
- Formula: `|home_tempo - away_tempo| = tempo_gap`
- Substitution: `|70.0 - 67.0|`
- Result: `3.0`

Pace pressure:

- offensive rebounding term:
  - home team `orbPct`: `32.0`
  - away team `orbPct`: `30.0`
  - league baseline total: `30.5 + 30.5 = 61.0`
  - formula: `((home_orbPct + away_orbPct) - league_orb_total) * 0.04`
  - substitution: `((32.0 + 30.0) - 61.0) * 0.04`
  - result: `0.04`
- turnover term:
  - home team `tovPct`: `15.5`
  - away team `tovPct`: `17.5`
  - league baseline total: `17.0 + 17.0 = 34.0`
  - formula: `(league_tov_total - (home_tovPct + away_tovPct)) * 0.09`
  - substitution: `(34.0 - (15.5 + 17.5)) * 0.09`
  - result: `0.09`
- free throw term:
  - home team `ftr`: `35.0`
  - away team `ftr`: `32.0`
  - league baseline total: `33.0 + 33.0 = 66.0`
  - formula: `((home_ftr + away_ftr) - league_ftr_total) * 0.025`
  - substitution: `((35.0 + 32.0) - 66.0) * 0.025`
  - result: `0.025`
- tempo gap term:
  - tempo gap: `3.0`
  - formula: `tempo_gap * 0.04`
  - substitution: `3.0 * 0.04`
  - result: `0.12`

Total pace pressure:

- Formula: `orb_term + tov_term + ftr_term + tempo_gap_term = pacePressure`
- Substitution: `0.04 + 0.09 + 0.025 + 0.12`
- Result: `0.275`

Possessions:

- Harmonic tempo: `68.47`
- Average tempo: `68.5`
- Pace pressure: `0.275`
- Formula: `(harmonic_tempo * 0.7 + average_tempo * 0.3) + pacePressure = possessions`
- Substitution: `(68.47 * 0.7 + 68.5 * 0.3) + 0.275`
- Result: `68.75`

### 11.3 Step 2: Estimate matchup-adjusted PPP

Home baseline PPP:

- Home team `adjO`: `116.0`
- Away team `adjD`: `101.0`
- Formula: `home_adjO * (away_adjD / 100) / 100 = homeBasePpp`
- Substitution: `116.0 * (101.0 / 100) / 100`
- Result: `1.1716`

Away baseline PPP:

- Away team `adjO`: `111.0`
- Home team `adjD`: `97.0`
- Formula: `away_adjO * (home_adjD / 100) / 100 = awayBasePpp`
- Substitution: `111.0 * (97.0 / 100) / 100`
- Result: `1.0767`

Home matchup adjustment:

- shooting:
  - `(53.0 - 50.5) * 0.004 = 0.010`
- turnovers:
  - `(17.0 - 15.5) * 0.25 = 0.375`
- offensive rebounds:
  - `(32.0 - 30.5) * 0.12 = 0.180`
- free throw rate:
  - `(35.0 - 33.0) * 0.06 = 0.120`

Total home adjustment:

- Formula: `shooting_adj + turnover_adj + orb_adj + ftr_adj = home_matchup_adjustment`
- Substitution: `0.010 + 0.375 + 0.180 + 0.120`
- Result: `0.685`

Home PPP:

- Home baseline PPP: `1.1716`
- Home matchup adjustment: `0.685`
- Formula: `homeBasePpp + home_matchup_adjustment / 100 = homePpp`
- Substitution: `1.1716 + 0.685 / 100`
- Result: `1.1785`

Away matchup adjustment:

- shooting:
  - `(51.0 - 50.5) * 0.004 = 0.002`
- turnovers:
  - `(17.0 - 17.5) * 0.25 = -0.125`
- offensive rebounds:
  - `(30.0 - 30.5) * 0.12 = -0.060`
- free throw rate:
  - `(32.0 - 33.0) * 0.06 = -0.060`

Total away adjustment:

- Formula: `shooting_adj + turnover_adj + orb_adj + ftr_adj = away_matchup_adjustment`
- Substitution: `0.002 - 0.125 - 0.060 - 0.060`
- Result: `-0.243`

Away PPP:

- Away baseline PPP: `1.0767`
- Away matchup adjustment: `-0.243`
- Formula: `awayBasePpp + away_matchup_adjustment / 100 = awayPpp`
- Substitution: `1.0767 - 0.243 / 100`
- Result: `1.0743`

### 11.4 Step 3: Convert possessions and PPP into projected score

Raw home points:

- Possessions: `68.75`
- Home PPP: `1.1785`
- Formula: `possessions * homePpp = home_raw_points`
- Substitution: `68.75 * 1.1785`
- Result: `81.0`

Raw away points:

- Possessions: `68.75`
- Away PPP: `1.0743`
- Formula: `possessions * awayPpp = away_raw_points`
- Substitution: `68.75 * 1.0743`
- Result: `73.9`

Apply home court:

- home gets `+1.75`
- away gets `-1.75`

Projected scores before any market total blend:

- home `82.8`
- away `72.2`

Raw total:

- Formula: `home_score + away_score = rawTotal`
- Substitution: `82.8 + 72.2`
- Result: `155.0`

Projected margin:

- Formula: `home_score - away_score = projected_margin`
- Substitution: `82.8 - 72.2`
- Result: `10.6`

### 11.5 Step 4: Blend toward sportsbook total if needed

Assume the sportsbook total is `145.5`.

Market gap:

- Raw total: `155.0`
- Sportsbook total: `145.5`
- Formula: `|rawTotal - sportsbookTotal| = marketGap`
- Substitution: `|155.0 - 145.5|`
- Result: `9.5`

With a moderate confidence score, assume market weight comes out around `0.28`.

Blended total:

- Raw total: `155.0`
- Market total: `145.5`
- Market weight: `0.28`
- Formula: `rawTotal * (1 - marketWeight) + marketTotal * marketWeight = finalTotal`
- Substitution: `155.0 * 0.72 + 145.5 * 0.28`
- Result: `152.3`

Score shift:

- Final total: `152.3`
- Raw total: `155.0`
- Formula: `(finalTotal - rawTotal) / 2 = scoreShift`
- Substitution: `(152.3 - 155.0) / 2`
- Result: `-1.35`

Final projected score:

- home `82.8 - 1.35 = 81.5`
- away `72.2 - 1.35 = 70.9`

Final projected total:

- `152.3`

Final projected margin:

- `81.5 - 70.9 = 10.6`

### 11.6 Step 5: Convert projected margin into Money Line win probability

Assume `marginStdDev = 13.2`.

Z-score:

- Projected margin: `10.6`
- Margin standard deviation: `13.2`
- Formula: `projected_margin / marginStdDev = z_score`
- Substitution: `10.6 / 13.2`
- Result: `0.80`

Home win probability:

- `normCDF(0.80) ≈ 0.788`

Away win probability:

- `1 - 0.788 = 0.212`

So the model says:

- home wins about `78.8%`
- away wins about `21.2%`

### 11.7 Step 6: Compare Money Line probability to sportsbook terms

Convert Money Lines to implied probabilities:

- home `-165 -> 165 / 265 = 0.623`
- away `+145 -> 100 / 245 = 0.408`

Total implied probability with vig:

- Home implied probability: `0.623`
- Away implied probability: `0.408`
- Formula: `home_implied + away_implied = vig_total`
- Substitution: `0.623 + 0.408`
- Result: `1.031`

Vig-adjusted probabilities:

- home `0.623 / 1.031 = 0.604`
- away `0.408 / 1.031 = 0.396`

Model edges:

- home edge `0.788 - 0.604 = 0.184`
- away edge `0.212 - 0.396 = -0.184`

Decision:

- home Money Line is positive by `18.4%`
- threshold is only `2.5%`
- recommendation: `home ML`

### 11.8 Step 7: Compare projected margin to the spread

Sportsbook spread:

- home `-3.5`

Home cover probability:

- Projected margin: `10.6`
- Home spread: `-3.5`
- Margin standard deviation: `13.2`
- Formula: `normCDF((projected_margin + home_spread) / marginStdDev) = homeCoverProb`
- Substitution: `normCDF((10.6 - 3.5) / 13.2)`
- Intermediate step: `normCDF(7.1 / 13.2)`
- Z-score: `normCDF(0.538)`
- Result: `0.705`

Away cover probability:

- `1 - 0.705 = 0.295`

Spread odds `-110 / -110`:

- each side implied probability `110 / 210 = 0.5238`
- combined vig `1.0476`
- vig-adjusted probability on each side `0.500`

Spread edges:

- home spread edge `0.705 - 0.500 = 0.205`
- away spread edge `0.295 - 0.500 = -0.205`

Decision:

- home ATS edge is `20.5%`
- threshold is `3.0%`
- recommendation: `home -3.5`

### 11.9 Step 8: Compare projected total to the total bet

Projected total:

- `152.3`

Sportsbook total:

- `145.5`

Point edge:

- Projected total: `152.3`
- Sportsbook total: `145.5`
- Formula: `projectedTotal - sportsbookTotal = ouEdge`
- Substitution: `152.3 - 145.5`
- Result: `6.8`

Decision from point-gap rule:

- since `6.8 > 2.0`
- recommendation: `over`

Now convert to probability using total volatility.

Assume `totalStdDev = 13.4`.

Over probability:

- Sportsbook total: `145.5`
- Projected total: `152.3`
- Total standard deviation: `13.4`
- Formula: `1 - normCDF((sportsbookTotal - projectedTotal) / totalStdDev) = pOver`
- Substitution: `1 - normCDF((145.5 - 152.3) / 13.4)`
- Intermediate step: `1 - normCDF(-0.507)`
- Intermediate step: `1 - 0.306`
- Result: `0.694`

Under probability:

- `1 - 0.694 = 0.306`

With `-110 / -110`, vig-adjusted over probability is about `0.500`.

Total edge:

- `0.694 - 0.500 = 0.194`

Decision:

- recommendation: `over 145.5`
- probability edge: `19.4%`

### 11.10 Example summary

Using this worked example, the model would likely produce:

- projected score: home `81.5`, away `70.9`
- projected total: `152.3`
- home win probability: `78.8%`
- Money Line recommendation: `home`
- spread recommendation: `home -3.5`
- total recommendation: `over 145.5`

## 12. Kelly Sizing

The engine also calculates fractional Kelly-style sizing suggestions:

- `kellyHome`
- `kellyAway`
- `kellySpread`
- `kellyOU`

These are not pure full-Kelly stakes. The model scales them down to roughly 25% Kelly to be more conservative.

## 13. Summary Of Decision Rules

### Money Line

- Project score margin
- Convert margin to win probability with matchup-specific volatility
- Remove vig from sportsbook Money Line
- Bet side only if model edge exceeds `2.5%`

### Spread

- Use projected margin and `marginStdDev`
- Compute cover probability for both sides
- Remove vig from spread pricing
- Bet side only if model edge exceeds `3.0%`

### Total

- Project total from possessions, PPP, game context, and optional market blend
- Compare projected total to sportsbook O/U
- Recommend over/under only if the gap exceeds `2.0` points
- Also compute probability edge using `totalStdDev`

## 14. Important Notes

- Totals are partially market-calibrated when an O/U line is available.
- Money Line and spread are not directly market-blended; they come from the projected scoring distribution.
- The current version uses wider margin and total volatility assumptions than earlier versions to reduce overstated edges across full slates.
- Imported Barttorvik or KenPom data can materially change projections versus the built-in team baselines.
- Team coverage and alias matching matter. If a team is not in the base dataset or does not resolve from sportsbook text, no prediction is generated for that game.

## 15. Definitions

### `adjO`

Adjusted offensive efficiency. Estimated points a team would score per 100 possessions against an average defense after opponent/schedule adjustment.

### `adjD`

Adjusted defensive efficiency. Estimated points a team would allow per 100 possessions against an average offense after opponent/schedule adjustment. Lower is better.

### `adjEM`

Adjusted efficiency margin. Usually `adjO - adjD`. Higher means a stronger team overall.

### `tempo`

Estimated possessions per game. Faster teams create more possessions and usually higher totals.

### `efgPct`

Effective field goal percentage. Unlike normal FG%, it gives extra credit for 3-pointers because they are worth more than 2-pointers.

Formula concept:

- `eFG% = (FGM + 0.5 * 3PM) / FGA`

### `tovPct`

Turnover percentage. Share of possessions that end in a turnover. Lower is better on offense.

### `orbPct`

Offensive rebound percentage. Share of available offensive rebounds a team collects. Higher means more second-chance opportunities.

### `ftr`

Free throw rate. A measure of how often a team gets to the foul line relative to shot attempts. Higher usually helps efficiency and can raise totals.

### `PPP`

Points per possession. How many points a team is expected to score on each possession.

### `possessions`

Estimated number of team possessions in the game. This is one of the biggest total drivers.

### `rawTotal`

The total before any market blend toward the sportsbook number.

### `marketWeight`

How much the model pulls its raw total toward the sportsbook total. Higher weight means more trust in the market number for that game.

### `totalStdDev`

Estimated standard deviation of the game total. Used to convert total projection gaps into probabilities.

### `marginStdDev`

Estimated standard deviation of scoring margin. Used to convert projected margin into Money Line and spread cover probabilities.

### `normCDF`

Normal cumulative distribution function. Converts a z-score into a probability under a bell-curve assumption.

### Vig

The sportsbook's built-in margin or commission. Raw implied probabilities from both sides usually add up to more than 100% because of vig.

### Vig-adjusted implied probability

The sportsbook probability after normalizing both sides so they sum to 100%. This is the market probability the model compares itself against.

### `homeEdge`, `awayEdge`, `spreadEdge`, `ouEdgePct`

Measures of model advantage versus market after vig is removed.

### Kelly sizing

A bankroll sizing method based on edge and payout. This model uses a fractional Kelly style, not full Kelly.

## 16. Main Source Files

- [predictionEngine.js](C:\projects\game_sims\ncaam-predictor\src\lib\predictionEngine.ts)
- [statsParser.js](C:\projects\game_sims\ncaam-predictor\src\lib\statsParser.ts)
- [sportsbookParser.js](C:\projects\game_sims\ncaam-predictor\src\lib\sportsbookParser.ts)
- [ncaaData.js](C:\projects\game_sims\ncaam-predictor\src\data\ncaaData.ts)

