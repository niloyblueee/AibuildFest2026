### 1. SYSTEM INTERFACE & DATA SCHEMA

- **API Routes/Endpoints:**
  - **GET `/health`** -> `{"status":"ok"}` (health check).
    [backend/app/main.py](backend/app/main.py#L16-L35)
  - **GET `/districts`** -> `{"districts":[{name, division, population, risk_class, news_enriched_risk_score}, ...]}`. Returns the latest available row per district (observed baseline if present).
    [backend/app/main.py](backend/app/main.py#L92-L132)
  - **GET `/scenarios`** -> `{"scenarios":[...]}` (unique `scenario_name` values, or `observed_baseline` fallback).
    [backend/app/main.py](backend/app/main.py#L134-L141)
  - **POST `/predict`**
    **Request body (Pydantic):**
    `district` (str), `scenario_name` (str, default `observed_baseline`),
    `coverage_pct` (float 0-100, optional), `division` (str, optional),
    `date` (str, optional), `week_index` (int, optional), `day_index` (int, optional),
    `coverage_children_pct` (float 0-100, optional), `coverage_population_pct` (float 0-100, optional),
    `include_daily` (bool), `include_hourly` (bool), `feature_overrides` (dict, optional).
    [backend/app/schemas.py](backend/app/schemas.py#L1-L20)
    **Response shape:**
    ```json
    {
      "district": "...",
      "division": "...",
      "selected_date": "...",
      "scenario_name": "...",
      "week_index": 0,
      "day_index": 0,
      "signals": {
        "rt_estimate": 0,
        "test_positivity_rate": 0,
        "zero_dose_risk_score": 0,
        "stockout_risk_score": 0,
        "outbreak_priority_score": 0,
        "attack_rate_per_10000": 0,
        "case_growth_7d_pct": 0
      },
      "baseline": {
        "cases_7d": 0,
        "cases_14d": 0,
        "confirmed_7d": 0,
        "deaths_7d": 0,
        "curves": {"daily_7d": [], "daily_14d": [], "hourly_7d": []}
      },
      "scenario": {
        "coverage_children_pct": 0,
        "coverage_population_pct": 0,
        "cases_7d": 0,
        "cases_14d": 0,
        "confirmed_7d": 0,
        "deaths_7d": 0,
        "cases_averted_7d": 0,
        "cases_averted_14d": 0,
        "effectiveness_pct_7d": 0,
        "effectiveness_pct_14d": 0,
        "curves": {"daily_7d": [], "daily_14d": [], "hourly_7d": []}
      }
    }
    ```
    [backend/app/main.py](backend/app/main.py#L143-L242)
  - **POST `/batch-predict`**
    **Request:** `{ "requests": [PredictRequest, ...] }`
    **Response:** `{ "results": [ {"status": "ok", ...predictResponse}, {"status": "error", "district": "...", "scenario_name": "...", "error": "..."}, ... ] }`
    [backend/app/main.py](backend/app/main.py#L245-L266), [backend/app/schemas.py](backend/app/schemas.py#L22-L25)
  - **POST `/insight`**
    **Request:** `{ "prediction": {...} }`
    **Response:** `{ "summary": "..." }` (LLM-generated forecast summary; requires `OPENAI_API_KEY`).
    [backend/app/main.py](backend/app/main.py#L269-L306), [backend/app/schemas.py](backend/app/schemas.py#L28-L30)

- **Data Models:**
  - **Districts (64 districts payload layout)** returned by `/districts`:
    ```json
    {
      "name": "...",
      "division": "...",
      "population": 0,
      "risk_class": "...",
      "news_enriched_risk_score": 0
    }
    ```
    [backend/app/main.py](backend/app/main.py#L92-L132)
  - **Simulation parameters / features (used by the model):**
    Feature columns are stored in metadata and include (subset):
    `division`, `district`, `population`, `children_6_59m`, `population_density_per_km2`,
    `mr1_coverage_baseline`, `mr2_coverage_baseline`, `current_campaign_coverage_scenario`,
    `local_media_signal_score`, `news_enriched_risk_score`, `risk_class`, `eid_travel_bump_flag`,
    `suspected_cases_today_sim`, `confirmed_cases_today_sim`, `deaths_today_sim`,
    `date_ordinal`, `month`, `day_of_year`, `cases_per_100k`, `coverage_gap`, etc.
    [backend/models/measles_model_meta.json](backend/models/measles_model_meta.json#L1-L69)
  - **Historical/synthetic vaccine coverage arrays:**
    Not stored as arrays; coverage is scalar per row (`current_campaign_coverage_scenario`, `mr1_coverage_baseline`, `mr2_coverage_baseline`). Scenario overrides mutate these scalars and derived fields (`coverage_gap`, `estimated_zero_dose_children`, `estimated_under_vaccinated_children`).
    [backend/app/scenarios.py](backend/app/scenarios.py#L1-L41), [backend/app/features.py](backend/app/features.py#L1-L36)

### 2. THE MATHEMATICAL ENGINE & ALGORITHMS

- **SEIR/Epidemiological Implementation:**
  There is no SEIR or differential-equation simulator in the backend. Forecasts come from a trained scikit-learn regression model, and time-series curves are synthetic distributions built from heuristics and random noise.
  [backend/app/main.py](backend/app/main.py#L143-L242), [backend/app/curves.py](backend/app/curves.py#L1-L53)

- **Exact formulas / differential updates used:**
  **Daily curve weights** (7d/14d curve generation):
  $$t = \text{linspace}(0,1,\text{days})$$
  $$\text{skew} = \text{clamp}((r_t-1)\cdot1.2 + (\text{growth\_pct}/100)\cdot0.8, -1.5, 1.5)$$
  $$w = \exp(\text{skew}\cdot(t-0.5)\cdot3.0)$$
  $$\text{bump} = 0.18\cdot\exp\Big(-\frac{(t-0.5)^2}{0.08}\Big)$$
  $$w = w\cdot(1+\text{bump})$$
  $$w = w\cdot(1+\epsilon),\ \epsilon \sim \mathcal{N}(0, 0.03)$$
  $$w = \max(w, 0.01),\ w = \frac{w}{\sum w}$$
  $$\text{daily\_cases} = w \cdot \text{total\_cases}$$
  [backend/app/curves.py](backend/app/curves.py#L10-L39)

  **Hourly curve weights** (diurnal profile applied to each day):
  $$\text{base}(h) = 0.25 + \exp\Big(-\frac{(h-13)^2}{18}\Big) + 0.35\cdot\exp\Big(-\frac{(h-19)^2}{12}\Big)$$
  $$\text{base} = \text{base}\cdot(1+\epsilon),\ \epsilon \sim \mathcal{N}(0, 0.05)$$
  $$\text{base} = \max(\text{base}, 0.01),\ \text{base}=\frac{\text{base}}{\sum \text{base}}$$
  $$\text{hourly\_cases}_{d,h} = \text{daily\_cases}_d \cdot \text{base}(h)$$
  [backend/app/curves.py](backend/app/curves.py#L42-L53)

- **Spatial Connectivity & Network Coupling:**
  Not implemented in backend code. No gravity model, travel matrix, or inter-district coupling logic present. Forecasts are per-row model predictions plus synthetic curve shaping.
  [backend/app/main.py](backend/app/main.py#L143-L242)

- **Vaccine Allocation Optimization:**
  No optimization algorithm present. The backend supports scenario overrides that set coverage percentages and recompute derived fields; it does not solve a distribution optimization problem.
  [backend/app/scenarios.py](backend/app/scenarios.py#L1-L41), [backend/app/main.py](backend/app/main.py#L192-L241)

### 3. THE AI/ML COMPONENT (IF APPLICABLE)

- **Model Architecture:**
  - **Pipeline:** `ColumnTransformer` (numeric median imputer, categorical most-frequent imputer + one-hot) -> `MultiOutputRegressor(HistGradientBoostingRegressor)`
  - **Targets:** `forecast_cases_next_7d`, `forecast_cases_next_14d`, `forecast_confirmed_next_7d`, `forecast_deaths_next_7d`
  - **Hyperparameters:** `max_depth=8`, `learning_rate=0.05`, `max_iter=400`, `random_state=42`
  [backend/train.py](backend/train.py#L1-L155), [backend/models/measles_model_meta.json](backend/models/measles_model_meta.json#L1-L69)

- **Input-to-output mapping:**
  Features are all columns not in targets, not in drop list, and not in `forecast_`, `scenario_`, `predicted_` prefixed columns. Outputs are the 4 forecast targets above, returned in `baseline` and `scenario` blocks of `/predict`.
  [backend/train.py](backend/train.py#L28-L78), [backend/app/main.py](backend/app/main.py#L143-L242)

- **Synthetic Data Generation:**
  No synthetic data generator is implemented in code. The CSV is treated as prebuilt input; synthetic behavior is limited to daily/hourly curve shaping via noise as described above.
  [backend/app/curves.py](backend/app/curves.py#L10-L53), [backend/app/data_loader.py](backend/app/data_loader.py#L1-L15)
