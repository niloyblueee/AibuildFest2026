# Judge Talk + Model Explanation

## 30-second judge talk (script)
We built a decision-support dashboard for measles response that looks like a live system, but is safe for a hackathon demo. A trained tabular ML model predicts district-level measles cases for the next 7 and 14 days using coverage, risk, access, and population signals. We then derive daily and hourly curves to show how those totals translate into operational schedules. The API also runs vaccination coverage scenarios to estimate cases averted. This is a vision for how government data pipelines could power proactive immunization planning at scale.

## What we are trying to give with this system
- A realistic, end-to-end view of how public health data becomes action: data -> ML forecast -> operational decisions.
- A dashboard that demonstrates accountability: where cases rise, how vaccines reduce them, and how capacity is affected.
- A demo that is safe and deterministic now, but designed to plug into real surveillance data later.

## What the AI model is
- A gradient-boosted tree ensemble (HistGradientBoosting) trained on structured tabular data.
- It predicts two numeric targets at once (multi-output regression):
  - forecast_cases_next_7d
  - forecast_cases_next_14d

## Why this model (and why not others)
- Tree ensembles are strong for tabular data with mixed numeric + categorical features.
- They learn non-linear relationships without heavy feature engineering.
- They train fast and remain stable for a demo.
- Deep learning or LSTM models require more data and tuning and are not ideal for this format.

## Why 7-day and 14-day horizons
- 7 days supports immediate, tactical decisions (stocks, routes, staffing).
- 14 days supports near-term campaign planning (shipments, outreach cadence).
- These horizons are actionable and align with real public health planning cycles.

## What the model predicts
- Total expected measles cases per district for the next 7 days and 14 days.
- We do not predict each hour directly because the dataset is daily.
- Hourly output is derived from the daily totals using a realistic diurnal curve.

## How training works (behind the scenes)
1) Load CSV data into pandas.
2) Select targets (7d and 14d forecasts).
3) Drop leakage columns (forecast_ and scenario_ fields) and long free-text notes.
4) Preprocess features:
   - Numeric columns: missing values -> median.
   - Categorical columns: missing -> most common, then one-hot encoding.
5) Train a multi-output regressor (one model predicting both targets).
6) Validate with a time-aware split.
7) Save the trained model to disk.

## What happens during prediction
1) The API finds the latest row for a selected district.
2) If the user sets vaccine coverage, the input row is adjusted.
3) The model predicts 7d and 14d totals.
4) Daily curve is generated from totals using growth signals.
5) Hourly curve is generated from daily totals using a diurnal profile.
6) The API returns totals, curves, and cases averted.

## Data format and storage
- Data is a structured CSV file (no database needed for demo).
- Each row represents a district snapshot with population, coverage, risk, access, and recent case signals.
- Model artifacts are saved locally and loaded at runtime.

## What this demo proves
- We can ingest public health features and generate proactive forecasts.
- We can quantify the effect of vaccination coverage.
- We can render forecasts in operational time granularity (daily and hourly).

## Limitations (honest framing)
- The dataset is synthetic and for demonstration.
- Hourly outputs are derived, not directly trained.
- Real deployments require live data pipelines and periodic retraining.

## Future-ready path
- Swap CSV for real surveillance feeds.
- Add continuous retraining and model monitoring.
- Incorporate more robust forecasting and calibration per region.
