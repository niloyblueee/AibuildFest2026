# Backend Step-by-Step Plan (Hackathon Demo)

Purpose
- Deliver a Python backend that trains a tabular ML model on the synthetic dataset.
- Serve predictions for measles spread (7-day and 14-day totals) plus derived daily and hourly curves.
- Provide vaccine-coverage scenario outputs (cases averted, effectiveness percent).
- Optionally produce a short OpenAI narrative summary of the numeric forecast.
- Keep it simple, deterministic, and demo-friendly for a hackathon showcase.

Scope and assumptions
- This is a prototype for a vision demo, not a production clinical system.
- Hourly outputs are derived (not trained) using realistic curves, not straight lines.
- The dataset is synthetic and already contains forecast targets, so we treat them as labels.
- No backend database is required for the demo.

Step 1 - Environment setup
1) Create a Python environment in the backend folder.
   - Windows PowerShell:
     - cd F:\AibuildFest2026\backend
     - python -m venv .venv
     - .\.venv\Scripts\Activate.ps1
2) Install dependencies from requirements.txt.
   - pip install -r requirements.txt
3) Create a .env file (optional) for local settings.
   - Example variables:
   - DATA_PATH=data\bd64_measles_training_news_bootstrap_2026-05-27.csv
     - MODEL_PATH=models\measles_model.joblib
     - META_PATH=models\measles_model_meta.json
     - OPENAI_API_KEY=your_key_here

Step 2 - Data loading and schema rules
1) Load the CSV using pandas.
2) Targets (labels):
   - forecast_cases_next_7d
   - forecast_cases_next_14d
3) Drop leakage columns and long text fields:
   - Any column starting with forecast_ or scenario_ (except the targets)
   - Any column starting with predicted_
   - Route text, narrative text, and free-form notes
4) Keep structured features such as geography, population, coverage, access, case signals, and logistics.

Step 3 - Feature preprocessing
1) Numeric features:
   - Impute missing values using median.
2) Categorical features:
   - Impute missing values using most-frequent.
   - One-hot encode with handle_unknown=ignore.
3) Boolean-like flags:
   - Convert True/False strings to 1/0 where detected.

Step 4 - Model training
1) Use a time-aware split:
   - Sort by date and hold out the newest 20 percent for validation.
2) Train a multi-output regressor (7d and 14d in one model).
   - Baseline choice: HistGradientBoostingRegressor wrapped by MultiOutputRegressor.
3) Evaluate using MAE for both outputs.
4) Save:
   - model artifact to models/measles_model.joblib
   - metadata JSON with feature columns and metrics

Step 5 - Prediction logic (single district)
1) Pick a baseline row for the district:
   - Use the latest available date for that district.
   - Optional: allow week_index or day_index filters.
2) Build feature row:
   - Apply the same feature columns used in training.
   - Fill any missing columns with NaN.
3) Predict 7-day and 14-day totals.

Step 6 - Vaccine coverage scenario logic
1) Accept inputs:
   - coverage_children_pct (0-100)
   - coverage_population_pct (0-100)
2) Adjust coverage-related fields in the baseline row:
   - current_campaign_coverage
   - mr1_coverage_baseline
   - mr2_coverage_baseline
   - historical_epi_coverage
   - estimated_zero_dose_children
   - estimated_under_vaccinated_children
3) Run predictions for baseline and scenario.
4) Compute effectiveness:
   - cases_averted_7d = baseline_7d - scenario_7d
   - cases_averted_14d = baseline_14d - scenario_14d
   - effectiveness_pct_7d = cases_averted_7d / baseline_7d * 100

Step 7 - Derived daily and hourly curves
1) Daily curve (7 days):
   - Build a non-linear weight curve using growth signals:
     - case_growth_7d_pct
     - rt_estimate
   - Skew earlier when growth is negative, later when growth is positive.
   - Normalize and scale to match the 7-day total.
2) Daily curve (14 days):
   - Same approach, scaled to 14-day total.
3) Hourly curve:
   - Apply a diurnal profile for each day (low overnight, mid-day peak).
   - Add deterministic jitter using a seeded RNG (district + week).

Step 8 - API design
1) POST /predict
   - Input: district, optional date/week/day filter, coverage percentages.
   - Output:
     - baseline prediction (7d, 14d)
     - scenario prediction (if coverage provided)
     - daily curves (7 and 14)
     - hourly curve (7 days)
     - effectiveness metrics
2) POST /batch-predict
   - Input: list of /predict requests.
   - Output: list of prediction responses.
3) POST /insight (optional)
   - Input: prediction output.
   - Output: short narrative using OpenAI.

Step 9 - Run instructions for demo
1) Train the model:
   - python train.py
2) Start the API:
   - uvicorn app.main:app --reload --port 8000
3) Smoke test:
   - POST http://localhost:8000/predict with district and coverage fields.

Step 10 - Frontend integration (later)
- The frontend currently uses a local simulation hook.
- Replace or augment that logic by calling /predict.
- Map the API outputs to existing UI cards and charts.

Limitations (for hackathon messaging)
- Synthetic dataset and deterministic curves.
- Derived hourly values (not trained).
- Designed for vision demo and stakeholder storytelling.

Planned outputs for presentation
- District-level measles spread forecast (7-day and 14-day).
- Vaccine-coverage scenario impact with averted cases.
- Hourly and daily curves for operational planning.
- Short AI-generated brief (optional).
