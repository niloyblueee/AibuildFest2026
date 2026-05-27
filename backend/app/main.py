from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import pandas as pd
from .config import OPENAI_API_KEY
from .curves import build_daily_curve, build_hourly_curve, seed_from_parts
from .data_loader import get_dataset
from .features import apply_feature_overrides, normalize_bool_columns
from .model import get_meta, get_model
from .scenarios import apply_builtin_scenario, apply_coverage_scenario
from .schemas import BatchPredictRequest, InsightRequest, PredictRequest

app = FastAPI(title="Measles Forecast API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok"}


def _select_baseline_row(df: pd.DataFrame, request: PredictRequest) -> pd.Series:
    if "district" not in df.columns:
        raise HTTPException(status_code=500, detail="Dataset missing district column")

    district = request.district.strip()
    if not district:
        raise HTTPException(status_code=400, detail="district is required")

    subset = df[df["district"].str.lower() == district.lower()]

    if "scenario_name" in subset.columns:
        subset = subset[subset["scenario_name"] == request.scenario_name]

    if request.division:
        subset = subset[subset["division"].str.lower() == request.division.lower()]

    if request.week_index is not None:
        subset = subset[subset["week_index"] == request.week_index]

    if request.day_index is not None:
        subset = subset[subset["day_index"] == request.day_index]

    if request.date:
        target_date = pd.to_datetime(request.date, errors="coerce")
        subset = subset[subset["date"] == target_date]

    if subset.empty:
        # fall back to observed baseline and apply built-in scenario if needed
        fallback = df[df["district"].str.lower() == district.lower()]
        if not fallback.empty:
            fallback = fallback.sort_values("date_ordinal", ascending=True).iloc[-1]
            row = fallback.to_dict()
            row = apply_builtin_scenario(row, request.scenario_name)
            if request.division and str(row.get("division", "")).lower() != request.division.lower():
                raise HTTPException(
                    status_code=404,
                    detail="No matching rows for the provided district filters",
                )
            return pd.Series(row)

        raise HTTPException(
            status_code=404,
            detail="No matching rows for the provided district filters",
        )

    subset = subset.sort_values("date_ordinal", ascending=True)
    return subset.iloc[-1]


def _build_feature_frame(row_dict: dict, feature_cols: list[str]) -> pd.DataFrame:
    data = {col: row_dict.get(col, np.nan) for col in feature_cols}
    frame = pd.DataFrame([data])
    frame = normalize_bool_columns(frame)
    return frame


def _pack_daily(values: list[float]) -> list[dict]:
    return [
        {"day": index + 1, "cases": float(value)} for index, value in enumerate(values)
    ]


def _build_curves(
    total_7d: float,
    total_14d: float,
    growth_pct: float,
    rt_estimate: float,
    seed_key: str,
    include_daily: bool,
    include_hourly: bool,
) -> dict:
    curves = {}
    daily_7d = None

    if include_daily:
        seed = seed_from_parts(seed_key, "daily_7d")
        daily_7d = build_daily_curve(
            total_7d,
            days=7,
            growth_pct=growth_pct,
            rt_estimate=rt_estimate,
            seed=seed,
        )
        daily_14d = build_daily_curve(
            total_14d,
            days=14,
            growth_pct=growth_pct,
            rt_estimate=rt_estimate,
            seed=seed + 1,
        )
        curves["daily_7d"] = _pack_daily(daily_7d)
        curves["daily_14d"] = _pack_daily(daily_14d)

    if include_hourly:
        if daily_7d is None:
            seed = seed_from_parts(seed_key, "daily_7d")
            daily_7d = build_daily_curve(
                total_7d,
                days=7,
                growth_pct=growth_pct,
                rt_estimate=rt_estimate,
                seed=seed,
            )
        hourly = build_hourly_curve(daily_7d, seed=seed_from_parts(seed_key, "hourly"))
        curves["hourly_7d"] = hourly

    return curves


def _predict_from_row(
    row_dict: dict,
    feature_cols: list[str],
) -> tuple[float, float, float, float]:
    model = get_model()
    frame = _build_feature_frame(row_dict, feature_cols)
    prediction = model.predict(frame)[0]
    return float(prediction[0]), float(prediction[1]), float(prediction[2]), float(prediction[3])


@app.get("/districts")
def get_districts():
    df = get_dataset()
    if df.empty:
        return {"districts": []}
    
    baseline = df[df["scenario_name"] == "observed_baseline"] if "scenario_name" in df.columns else df
    if not baseline.empty and "date" in baseline.columns:
        latest_date = baseline["date"].max()
        latest_data = baseline[baseline["date"] == latest_date]
    else:
        latest_data = baseline
    
    districts = []
    # Using drop_duplicates on district to ensure unique entries
    for _, row in latest_data.drop_duplicates(subset=["district"]).iterrows():
        districts.append({
            "name": row.get("district"),
            "division": row.get("division"),
            "population": int(row.get("population", 0)) if pd.notna(row.get("population")) else 0,
            "risk_class": row.get("risk_class", "unknown"),
            "news_enriched_risk_score": float(row.get("news_enriched_risk_score", 0)) if pd.notna(row.get("news_enriched_risk_score")) else 0,
        })
    return {"districts": sorted(districts, key=lambda x: x["name"])}

@app.get("/scenarios")
def get_scenarios():
    df = get_dataset()
    if "scenario_name" in df.columns:
        scenarios = df["scenario_name"].dropna().unique().tolist()
        return {"scenarios": sorted(scenarios)}
    return {"scenarios": ["observed_baseline"]}

@app.post("/predict")
def predict(request: PredictRequest):
    df = get_dataset()
    meta = get_meta()
    feature_cols = meta.get("feature_cols", [])

    baseline_row = _select_baseline_row(df, request)
    baseline_dict = baseline_row.to_dict()
    baseline_dict = apply_feature_overrides(baseline_dict, request.feature_overrides)

    growth_pct = float(baseline_dict.get("case_growth_7d_pct", 0) or 0)
    rt_estimate = float(baseline_dict.get("rt_estimate", 1) or 1)

    signals = {
        "rt_estimate": float(baseline_dict.get("rt_estimate", 0) or 0),
        "test_positivity_rate": float(
            baseline_dict.get("test_positivity_rate", 0) or 0
        ),
        "zero_dose_risk_score": float(
            baseline_dict.get("zero_dose_risk_score", 0) or 0
        ),
        "stockout_risk_score": float(
            baseline_dict.get("stockout_risk_score", 0) or 0
        ),
        "outbreak_priority_score": float(
            baseline_dict.get("outbreak_priority_score", 0) or 0
        ),
        "attack_rate_per_10000": float(
            baseline_dict.get("attack_rate_per_10000", 0) or 0
        ),
        "case_growth_7d_pct": float(
            baseline_dict.get("case_growth_7d_pct", 0) or 0
        ),
    }

    if request.coverage_pct is not None and request.coverage_children_pct is None and request.coverage_population_pct is None:
        request = PredictRequest(**{**request.model_dump(), "coverage_children_pct": request.coverage_pct, "coverage_population_pct": request.coverage_pct})

    base_7d, base_14d, base_conf_7d, base_death_7d = _predict_from_row(baseline_dict, feature_cols)

    response = {
        "district": baseline_dict.get("district"),
        "division": baseline_dict.get("division"),
        "selected_date": str(baseline_dict.get("date")),
        "scenario_name": request.scenario_name,
        "week_index": int(baseline_dict.get("week_index", 0) or 0),
        "day_index": int(baseline_dict.get("day_index", 0) or 0),
        "signals": signals,
        "baseline": {
            "cases_7d": base_7d,
            "cases_14d": base_14d,
            "confirmed_7d": base_conf_7d,
            "deaths_7d": base_death_7d,
        },
    }

    response["baseline"]["curves"] = _build_curves(
        base_7d,
        base_14d,
        growth_pct,
        rt_estimate,
        f"{baseline_dict.get('district')}-baseline",
        request.include_daily,
        request.include_hourly,
    )

    if request.coverage_children_pct is not None or request.coverage_population_pct is not None:
        scenario_dict = apply_coverage_scenario(
            baseline_dict,
            coverage_children_pct=request.coverage_children_pct,
            coverage_population_pct=request.coverage_population_pct,
        )
        scenario_7d, scenario_14d, scenario_conf_7d, scenario_death_7d = _predict_from_row(scenario_dict, feature_cols)
        cases_averted_7d = base_7d - scenario_7d
        cases_averted_14d = base_14d - scenario_14d
        effectiveness_7d = (cases_averted_7d / base_7d * 100) if base_7d else 0.0
        effectiveness_14d = (cases_averted_14d / base_14d * 100) if base_14d else 0.0

        response["scenario"] = {
            "coverage_children_pct": request.coverage_children_pct,
            "coverage_population_pct": request.coverage_population_pct,
            "cases_7d": scenario_7d,
            "cases_14d": scenario_14d,
            "confirmed_7d": scenario_conf_7d,
            "deaths_7d": scenario_death_7d,
            "cases_averted_7d": cases_averted_7d,
            "cases_averted_14d": cases_averted_14d,
            "effectiveness_pct_7d": effectiveness_7d,
            "effectiveness_pct_14d": effectiveness_14d,
            "curves": _build_curves(
                scenario_7d,
                scenario_14d,
                growth_pct,
                rt_estimate,
                f"{baseline_dict.get('district')}-scenario",
                request.include_daily,
                request.include_hourly,
            ),
        }

    return response


@app.post("/batch-predict")
def batch_predict(request: BatchPredictRequest):
    results = []
    for item in request.requests:
        try:
            results.append({"status": "ok", **predict(item)})
        except HTTPException as exc:
            results.append(
                {
                    "status": "error",
                    "district": item.district,
                    "scenario_name": item.scenario_name,
                    "error": exc.detail,
                }
            )
    return {"results": results}


@app.post("/insight")
def insight(request: InsightRequest):
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=501, detail="OPENAI_API_KEY not configured")

    try:
        from openai import OpenAI
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    client = OpenAI(api_key=OPENAI_API_KEY)
    prompt = (
        "Write a short, clinical summary (3-5 sentences) of this measles forecast. "
        "Mention the 7-day and 14-day totals, and if present, the vaccine scenario impact. "
        "Keep it concise and operational.\n\n"
        f"Prediction: {request.prediction}"
    )

    response = client.responses.create(
        model="gpt-4.1-mini",
        input=prompt,
    )

    return {"summary": response.output_text}
