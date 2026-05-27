from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import pandas as pd
from .config import OPENAI_API_KEY
from .curves import build_daily_curve, build_hourly_curve, seed_from_parts
from .data_loader import get_dataset
from .features import apply_feature_overrides, normalize_bool_columns
from .model import get_meta, get_model
from .scenarios import apply_coverage_scenario
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
) -> tuple[float, float]:
    model = get_model()
    frame = _build_feature_frame(row_dict, feature_cols)
    prediction = model.predict(frame)[0]
    return float(prediction[0]), float(prediction[1])


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

    base_7d, base_14d = _predict_from_row(baseline_dict, feature_cols)

    response = {
        "district": baseline_dict.get("district"),
        "division": baseline_dict.get("division"),
        "selected_date": str(baseline_dict.get("date")),
        "week_index": int(baseline_dict.get("week_index", 0) or 0),
        "day_index": int(baseline_dict.get("day_index", 0) or 0),
        "baseline": {
            "cases_7d": base_7d,
            "cases_14d": base_14d,
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
        scenario_7d, scenario_14d = _predict_from_row(scenario_dict, feature_cols)
        cases_averted_7d = base_7d - scenario_7d
        cases_averted_14d = base_14d - scenario_14d
        effectiveness_7d = (cases_averted_7d / base_7d * 100) if base_7d else 0.0
        effectiveness_14d = (cases_averted_14d / base_14d * 100) if base_14d else 0.0

        response["scenario"] = {
            "coverage_children_pct": request.coverage_children_pct,
            "coverage_population_pct": request.coverage_population_pct,
            "cases_7d": scenario_7d,
            "cases_14d": scenario_14d,
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
        results.append(predict(item))
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
