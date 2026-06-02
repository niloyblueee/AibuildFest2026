# Project Context (AibuildFest2026)

Last updated: 2026-06-02

## Overview
This repo is a measles forecasting demo with:
- A Python FastAPI backend that trains and serves a tabular ML model.
- A Vite + React frontend that visualizes predictions on a map and analytics panels.

## Full Project Structure
.
|-- .git/
|-- .gitignore
|-- .venv/ (local Python venv, not committed)
|-- backend/
|   |-- .gitignore
|   |-- Dockerfile
|   |-- README.md
|   |-- requirements.txt
|   |-- rewrite_sim.py
|   |-- technical_breakdown.md
|   |-- train.py
|   |-- data/
|   |   `-- bd64_measles_training_news_bootstrap_2026-05-27.csv
|   `-- app/
|       |-- __init__.py
|       |-- config.py
|       |-- curves.py
|       |-- data_loader.py
|       |-- features.py
|       |-- main.py
|       |-- model.py
|       |-- scenarios.py
|       `-- schemas.py
|-- frontend/
|   |-- .env (local)
|   |-- .gitignore
|   |-- dist/ (build output)
|   |-- node_modules/ (installed deps)
|   |-- Dockerfile
|   |-- README.md
|   |-- eslint.config.js
|   |-- index.html
|   |-- package.json
|   |-- package-lock.json
|   |-- vite.config.js
|   |-- public/
|   |   |-- favicon.svg
|   |   `-- icons.svg
|   |-- src/
|   |   |-- App.css
|   |   |-- App.jsx
|   |   |-- index.css
|   |   |-- main.jsx
|   |   |-- lib/
|   |   |   `-- apiBase.js
|   |   |-- hooks/
|   |   |   `-- useSimulation.js
|   |   |-- data/
|   |   |   |-- bangladeshDistricts.json
|   |   |   |-- bd64_measles_training_news_bootstrap_2026-05-27.csv
|   |   |   `-- districtData.js
|   |   |-- assets/
|   |   |   |-- hero.png
|   |   |   |-- react.svg
|   |   |   `-- vite.svg
|   |   `-- components/
|   |       |-- shared/
|   |       |   |-- AnimatedCounter.jsx
|   |       |   `-- Header.jsx
|   |       |-- Map/
|   |       |   |-- DistrictLayer.jsx
|   |       |   |-- DistrictSearch.jsx
|   |       |   |-- InfectionMarkers.jsx
|   |       |   |-- MapControls.jsx
|   |       |   |-- MapPanel.css
|   |       |   |-- MapPanel.jsx
|   |       |   `-- TimelineScrubber.jsx
|   |       `-- Analytics/
|   |           |-- AIInsights.jsx
|   |           |-- AnalyticsPanel.css
|   |           |-- AnalyticsPanel.jsx
|   |           |-- PredictionCards.jsx
|   |           |-- ScenarioSelector.jsx
|   |           |-- StatCharts.jsx
|   |           `-- VaccineSliders.jsx
|   `-- vite.config.js
|-- backend_step_by_step.md
|-- implementation_plan.md
|-- judge_talk.md
|-- project_context.md
`-- README.md

## Dataset
Path: backend/data/bd64_measles_training_news_bootstrap_2026-05-27.csv
Shape: 134400 rows, 30 columns.
Key columns:
- record_id, date, division, district, scenario_name, bootstrap_id
- population, children_6_59m, population_density_per_km2
- mr1_coverage_baseline, mr2_coverage_baseline, current_campaign_coverage_scenario
- local_media_signal_score, news_enriched_risk_score, risk_class, evidence_level
- eid_travel_bump_flag
- suspected_cumulative_est_at_2026_05_26, confirmed_cumulative_est_at_2026_05_26, deaths_cumulative_est_at_2026_05_26
- suspected_cases_today_sim, confirmed_cases_today_sim, deaths_today_sim
- forecast_cases_next_7d, forecast_cases_next_14d, forecast_confirmed_next_7d, forecast_deaths_next_7d
- source_ids, synthetic_data_flag, district_estimate_disclaimer

Known scenario_name values:
- observed_baseline
- coverage_90pct
- coverage_95pct
- low_coverage
- status_quo_eid_bump

Frontend also contains a CSV copy in frontend/src/data for reference (the app does not read it at runtime).

## Model Training
File: backend/train.py
Targets (multi-output):
- forecast_cases_next_7d
- forecast_cases_next_14d
- forecast_confirmed_next_7d
- forecast_deaths_next_7d

Features:
- All non-target columns except drop list and leakage prefixes.
- Derived features:
  - cases_per_100k (from suspected_cases_today_sim / population)
  - coverage_gap (0.95 - current_campaign_coverage_scenario)

Model:
- HistGradientBoostingRegressor wrapped by MultiOutputRegressor.

Artifacts:
- backend/models/measles_model.joblib
- backend/models/measles_model_meta.json

## Backend API (FastAPI)
Endpoints:
- GET /health
- GET /districts
  - Returns district list with name, division, population, children_6_59m, risk_class, news_enriched_risk_score.
- GET /scenarios
  - Returns distinct scenario_name values from dataset.
- POST /predict
  - Request fields: district, scenario_name, coverage_pct, coverage_children_pct, coverage_population_pct, include_daily, include_hourly.
  - Response includes baseline + optional scenario results with cases_7d, cases_14d, confirmed_7d, deaths_7d, signals, and curves.
- POST /batch-predict
  - Accepts { requests: [PredictRequest, ...] }
  - Returns per-item status: { status: "ok", ... } or { status: "error", error: "..." }
- POST /insight
  - Uses OpenAI when OPENAI_API_KEY is provided.

Scenario handling:
- If a requested scenario_name is missing in the dataset for a district, the API falls back to observed_baseline and applies a built-in scenario transform.
- coverage_pct acts as an alias: it fills coverage_children_pct and coverage_population_pct if those are not provided.

Curves:
- Daily and hourly curves are generated in backend/app/curves.py and are not direct model outputs.

## Language Model (LM) Usage
This project uses OpenAI for optional narrative summaries:
- Endpoint: POST /insight in backend/app/main.py.
- Library: openai Python package (Responses API).
- Model: gpt-4.1-mini.
- Prompt: short clinical summary (3-5 sentences) referencing 7-day and 14-day totals and scenario impact.
- Behavior: if OPENAI_API_KEY is missing, /insight returns 501; the frontend falls back to local narrative text.

## Frontend Data Flow
File: frontend/src/hooks/useSimulation.js
- Loads district list from GET /districts.
- Maintains a total vaccine stock (totalVaccineInStore).
- Per-district allocations are absolute dose counts.
- Coverage is computed as:
  coverage_pct = allocation / children_6_59m * 100
  (fallback to population if children_6_59m is missing).
- Sends coverage_pct to /batch-predict.
- Model results are the single source of truth for cases and outcomes, then projected into weekly curves.

Map + Analytics:
- Map uses Leaflet with preferCanvas enabled for performance.
- DistrictLayer colors by risk_class when available.
- VaccineSliders allows allocating doses per district and shows remaining stock.
- PredictionCards display derived metrics from useSimulation.

District naming:
- Multiple aliases exist between frontend districts and backend dataset. useSimulation normalizes names and applies API overrides.

## Main Page Metrics and Calculations
These metrics live in frontend/src/hooks/useSimulation.js and feed PredictionCards and StatCharts.

Weekly case series:
- Base inputs: model scenario cases_7d and cases_14d per district.
- If cases_7d is 0, the weekly series is all zeros.
- Otherwise, a synthetic weekly curve is generated using a logistic scale, a bounded weekly growth factor, and seeded jitter.
- The dashboard "current week" pulls values from this series.

Per-district derived values:
- Vaccination ramp: 0% week 1, 50% week 2, 100% from week 3 onward.
- effectiveVaccineShare = clamp(vaccines / childPopulation, 0, 1) * efficacyFactor.
- vaccineShield = 0.18 + effectiveVaccineShare * 0.62.
- adjustedRate = baseInfectionRate * (1 - vaccineShield).
- activeCases = cases * 0.25 * (4.8 / 7).
- capacity = population * healthcareCapacity * 0.00005.
- hospitalLoad = clamp((activeCases / capacity) * 100, 0, 100).
- riskIndex = clamp(hospitalLoad * 0.6 + adjustedRate * 1200 + (1 - healthcareCapacity) * 20, 0, 100).
- intensity (map dots) = clamp(cases / (population * 0.085), 0.1, 1).

Prediction cards (totals):
- Predicted Cases: sum of current-week cases across selected districts.
- Confirmed Cases (7d): sum of confirmed_7d scaled by ratio = currentWeekCases / scenarioCases_7d.
- Deaths Forecast (7d): sum of deaths_7d scaled by the same ratio.
- Infection Growth Rate: (totalCases - previousWeekCases) / previousWeekCases * 100.
- Vaccine Efficiency:
  - If baselineTotal > 0: (1 - scenarioTotal / baselineTotal) * 100.
  - Else: (1 - adjustedRateSum / baseRateSum) * 100.
- Mortality Reduction: clamp(vaccineEfficiency * 0.65 + (100 - hospitalLoad) * 0.12, 0, 100).
- Hospital Load: average of district hospitalLoad.
- Risk Index: average of district riskIndex.

Chart data:
- Infection Trend: infectionData[week].cases is the sum of weekly cases; also computes growth and acceleration.
- Vaccine Efficiency: per district (1 - scenarioCases_7d / baselineCases_7d) * 100.
- District Comparison: per district current-week cases plus vaccine allocations.
- Spread Acceleration: infectionData[week].acceleration.

Signals (currently not displayed):
- Averaged from backend signals: rt_estimate, test_positivity_rate, zero_dose_risk_score, stockout_risk_score.
- Adjusted by growth and vaccine share:
  - rtEstimate = baseRt * (1 + growthRate / 100)
  - testPositivityRate = baseTp * (1 + growthRate / 100)
  - zeroDoseRiskScore = baseZd * (1 - avgVaccineShare * 0.8)
  - stockoutRiskScore = baseSr * (0.5 + 0.5 * allocatedRatio)

Map dot density:
- For each district, the number of rendered points is reduced as vaccine share rises.

## Environment Variables
Backend:
- DATA_PATH=data/bd64_measles_training_news_bootstrap_2026-05-27.csv
- MODEL_PATH=models/measles_model.joblib
- META_PATH=models/measles_model_meta.json
- OPENAI_API_KEY=optional

Frontend:
- VITE_API_BASE=http://127.0.0.1:8000

## Local Commands
Backend:
- python -m venv .venv
- .\.venv\Scripts\Activate.ps1
- pip install -r requirements.txt
- python train.py
- python -m uvicorn app.main:app --reload --port 8000

Frontend:
- npm install
- npm run dev
- npm run build

## Deployment Notes
- Deploy backend and frontend as separate services.
- Set frontend VITE_API_BASE to the backend URL.
- Backend start command on Railway:
  python -m uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT

## Known Pitfalls / Notes
- Port 8000 may be occupied on Windows. Kill the old python/uvicorn process or use a new port.
- ScenarioSelector currently fetches /scenarios but returns an empty fragment (no UI).
- AIInsights calls `${VITE_API_BASE}insight` without inserting a slash. Ensure the env var includes a trailing slash or adjust the code to use `${baseUrl}/insight`.
- Frontend metrics combine model outputs with heuristic calculations (hospital load, risk index, growth), not all are directly predicted by the ML model.
