import itertools
from typing import Iterable

import pandas as pd
from fastapi import HTTPException

from .features import normalize_bool_columns
from .model import get_model
from .scenarios import apply_builtin_scenario, apply_coverage_scenario


DEFAULT_COVERAGE_OPTIONS = [60.0, 70.0, 80.0, 90.0, 95.0]
MAX_PLAN_COMBINATIONS = 625


def _build_feature_frame(row_dict: dict, feature_cols: list[str]) -> pd.DataFrame:
    data = {col: row_dict.get(col, pd.NA) for col in feature_cols}
    frame = pd.DataFrame([data])
    frame = normalize_bool_columns(frame)
    return frame


def _predict_from_row(row_dict: dict, feature_cols: list[str]) -> tuple[float, float, float, float]:
    model = get_model()
    frame = _build_feature_frame(row_dict, feature_cols)
    prediction = model.predict(frame)[0]
    return tuple(float(value) for value in prediction)


def _normalize_coverage_options(coverage_options: Iterable[float] | None) -> list[float]:
    if coverage_options is None:
        return DEFAULT_COVERAGE_OPTIONS
    cleaned = sorted({float(value) for value in coverage_options if value is not None})
    return cleaned or DEFAULT_COVERAGE_OPTIONS


def _normalize_allocation_options(allocation_options: Iterable[float] | None) -> list[float]:
    default_options = [0.0, 10.0, 20.0, 30.0, 40.0, 50.0, 60.0, 70.0, 80.0, 90.0, 100.0]
    if allocation_options is None:
        return default_options
    cleaned = sorted({float(value) for value in allocation_options if value is not None})
    return cleaned or default_options


def _get_target_population(row: dict) -> float:
    children = row.get("children_6_59m")
    if pd.notna(children) and children is not None and float(children) > 0:
        return float(children)
    population = row.get("population")
    return float(population or 0.0)


def _coverage_for_budget_share(row: dict, total_budget: float, allocation_pct: float) -> float:
    target_population = _get_target_population(row)
    if target_population <= 0 or total_budget <= 0:
        return float(allocation_pct)
    doses = total_budget * (float(allocation_pct) / 100.0)
    return min(100.0, (doses / target_population) * 100.0)


def _sum_target_demand(rows: list[dict]) -> float:
    return sum(_get_target_population(row) for row in rows)


def _enumerate_budget_plans(selected_districts: list[str], allocation_options: list[float]) -> list[dict]:
    plans: list[dict] = []
    allocation_options = sorted(set(allocation_options))

    def recurse(index: int, current: dict[str, float], remaining: float) -> None:
        if index == len(selected_districts):
            if abs(remaining) < 1e-9:
                plans.append(dict(current))
            return

        district = selected_districts[index]
        if index == len(selected_districts) - 1:
            if remaining in allocation_options:
                current[district] = float(remaining)
                plans.append(dict(current))
                current.pop(district, None)
            return

        for allocation_pct in allocation_options:
            if allocation_pct > remaining:
                break
            current[district] = float(allocation_pct)
            recurse(index + 1, current, remaining - allocation_pct)
            current.pop(district, None)

    recurse(0, {}, 100.0)
    return plans


def _resolve_baseline_rows(
    df: pd.DataFrame,
    district_names: list[str],
    scenario_name: str,
) -> list[dict]:
    if "district" not in df.columns:
        raise HTTPException(status_code=500, detail="Dataset missing district column")

    rows = []
    for district in district_names:
        district_value = district.strip()
        if not district_value:
            raise HTTPException(status_code=400, detail="District names must not be empty")

        subset = df[df["district"].str.lower() == district_value.lower()]
        if subset.empty:
            raise HTTPException(status_code=404, detail=f"District not found: {district}")

        if "scenario_name" in subset.columns:
            candidate = subset[subset["scenario_name"] == scenario_name]
        else:
            candidate = subset

        if candidate.empty:
            fallback_row = subset.sort_values("date_ordinal", ascending=True).iloc[-1].to_dict()
            rows.append(apply_builtin_scenario(fallback_row, scenario_name))
            continue

        baseline_row = candidate.sort_values("date_ordinal", ascending=True).iloc[-1].to_dict()
        rows.append(baseline_row)

    return rows


def _enumerate_plans(selected_districts: list[str], coverage_options: list[float]) -> list[dict]:
    plans = []
    for option_tuple in itertools.product(coverage_options, repeat=len(selected_districts)):
        plans.append(
            {
                district: float(coverage_pct)
                for district, coverage_pct in zip(selected_districts, option_tuple)
            }
        )
    return plans


def _score_plan(metrics: dict[str, float]) -> float:
    return (
        metrics["cases_7d"]
        + metrics["cases_14d"]
        + metrics["deaths_7d"] * 100.0
    )


def suggest_best_interventions(
    df: pd.DataFrame,
    selected_districts: list[str],
    scenario_name: str,
    feature_cols: list[str],
    coverage_options: Iterable[float] | None = None,
    num_suggestions: int = 3,
    total_vaccine_budget: float | None = None,
    allocation_options: Iterable[float] | None = None,
) -> list[dict]:
    selected_districts = [district.strip() for district in selected_districts if district and district.strip()]
    if not selected_districts:
        raise HTTPException(status_code=400, detail="At least one district must be selected")

    coverage_options = _normalize_coverage_options(coverage_options)
    baseline_rows = _resolve_baseline_rows(df, selected_districts, scenario_name)

    if total_vaccine_budget is not None:
        total_vaccine_budget = float(total_vaccine_budget)
        target_demand = _sum_target_demand(baseline_rows)
        if total_vaccine_budget > target_demand:
            total_vaccine_budget = target_demand
    else:
        plan_count = len(coverage_options) ** len(selected_districts)
        if plan_count > MAX_PLAN_COMBINATIONS:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Too many coverage combinations ({plan_count}). "
                    f"Use at most {int(MAX_PLAN_COMBINATIONS ** (1 / len(selected_districts)))} coverage options "
                    "or fewer districts."
                ),
            )
    model = get_model()

    baseline_totals = {
        "cases_7d": 0.0,
        "cases_14d": 0.0,
        "confirmed_7d": 0.0,
        "deaths_7d": 0.0,
    }

    for row in baseline_rows:
        cases_7d, cases_14d, confirmed_7d, deaths_7d = _predict_from_row(row, feature_cols)
        baseline_totals["cases_7d"] += cases_7d
        baseline_totals["cases_14d"] += cases_14d
        baseline_totals["confirmed_7d"] += confirmed_7d
        baseline_totals["deaths_7d"] += deaths_7d

    if total_vaccine_budget is not None:
        allocation_options = _normalize_allocation_options(allocation_options)
        plans = _enumerate_budget_plans(selected_districts, allocation_options)
        if not plans:
            raise HTTPException(
                status_code=400,
                detail="Unable to generate allocation proposals that sum to 100%. Check the allocation option set."
            )
    else:
        plans = _enumerate_plans(selected_districts, coverage_options)

    suggestions = []

    for plan in plans:
        totals = {"cases_7d": 0.0, "cases_14d": 0.0, "confirmed_7d": 0.0, "deaths_7d": 0.0}
        allocation_plan = []
        coverage_plan = []
        for district_index, district_name in enumerate(selected_districts):
            baseline_row = baseline_rows[district_index]
            coverage = plan[district_name]
            allocated_doses = None

            if total_vaccine_budget is not None:
                coverage = _coverage_for_budget_share(
                    baseline_row,
                    float(total_vaccine_budget),
                    plan[district_name],
                )
                allocated_doses = float(total_vaccine_budget) * (plan[district_name] / 100.0)

            scenario_row = apply_coverage_scenario(
                dict(baseline_row),
                coverage_children_pct=coverage,
                coverage_population_pct=coverage,
            )
            cases_7d, cases_14d, confirmed_7d, deaths_7d = _predict_from_row(scenario_row, feature_cols)
            totals["cases_7d"] += cases_7d
            totals["cases_14d"] += cases_14d
            totals["confirmed_7d"] += confirmed_7d
            totals["deaths_7d"] += deaths_7d

            coverage_plan.append(
                {
                    "district": district_name,
                    "coverage_children_pct": coverage,
                    "coverage_population_pct": coverage,
                }
            )
            allocation_plan.append(
                {
                    "district": district_name,
                    "allocation_pct": plan[district_name],
                    "allocated_doses": allocated_doses,
                    "coverage_children_pct": coverage,
                    "coverage_population_pct": coverage,
                }
            )

        risk_score = _score_plan(totals)
        suggestion = {
            "totals": {
                "cases_7d": totals["cases_7d"],
                "cases_14d": totals["cases_14d"],
                "confirmed_7d": totals["confirmed_7d"],
                "deaths_7d": totals["deaths_7d"],
            },
            "risk_score": risk_score,
            "cases_averted_7d": baseline_totals["cases_7d"] - totals["cases_7d"],
            "cases_averted_14d": baseline_totals["cases_14d"] - totals["cases_14d"],
            "baseline_totals": baseline_totals,
            "coverage_plan": coverage_plan,
        }

        if total_vaccine_budget is not None:
            suggestion["allocation_plan"] = allocation_plan
            suggestion["effective_vaccine_budget"] = total_vaccine_budget
        suggestions.append(suggestion)

    suggestions.sort(key=lambda item: item["risk_score"])
    return suggestions[:max(1, min(num_suggestions, len(suggestions)))]
