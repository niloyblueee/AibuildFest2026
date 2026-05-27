import pandas as pd


def clamp(value: float, min_value: float, max_value: float) -> float:
    return max(min_value, min(max_value, value))


def apply_coverage_scenario(
    row: dict,
    coverage_children_pct: float | None = None,
    coverage_population_pct: float | None = None,
) -> dict:
    updated = dict(row)

    if coverage_children_pct is not None:
        child_frac = clamp(coverage_children_pct / 100.0, 0.0, 1.0)
        updated["current_campaign_coverage_scenario"] = child_frac
        updated["mr1_coverage_baseline"] = child_frac
        updated["mr2_coverage_baseline"] = child_frac
        updated["coverage_gap"] = max(0.0, 0.95 - child_frac)

        children = updated.get("children_6_59m")
        if children is not None and not pd.isna(children):
            children_value = float(children)
            updated["estimated_zero_dose_children"] = max(
                0.0, (1.0 - child_frac) * children_value
            )
            updated["estimated_under_vaccinated_children"] = max(
                0.0, (1.0 - min(1.0, child_frac * 0.9)) * children_value
            )

    if coverage_population_pct is not None:
        pass

    return updated


def apply_builtin_scenario(row: dict, scenario_name: str | None) -> dict:
    """Apply one of the built-in scenario presets from the 30-column dataset."""
    updated = dict(row)
    scenario = (scenario_name or "").strip()
    if not scenario or scenario == "observed_baseline":
        return updated

    if scenario == "coverage_90pct":
        return apply_coverage_scenario(updated, coverage_children_pct=90)
    if scenario == "coverage_95pct":
        return apply_coverage_scenario(updated, coverage_children_pct=95)
    if scenario == "low_coverage":
        return apply_coverage_scenario(updated, coverage_children_pct=70)
    if scenario == "status_quo_eid_bump":
        updated["eid_travel_bump_flag"] = 1
        return updated

    return updated
