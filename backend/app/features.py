import numpy as np
import pandas as pd

BOOLEAN_TRUE = {"true", "1", "yes"}
BOOLEAN_FALSE = {"false", "0", "no"}


def add_date_features(df: pd.DataFrame) -> pd.DataFrame:
    if "date" not in df.columns:
        return df
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df["date_ordinal"] = df["date"].map(
        lambda value: value.toordinal() if pd.notna(value) else np.nan
    )
    df["month"] = df["date"].dt.month
    df["day_of_year"] = df["date"].dt.dayofyear
    return df


def add_derived_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    if "suspected_cases_today_sim" in df.columns and "population" in df.columns:
        df["cases_per_100k"] = (
            df["suspected_cases_today_sim"] / df["population"]
        ) * 100000
    if "current_campaign_coverage_scenario" in df.columns:
        df["coverage_gap"] = 0.95 - df["current_campaign_coverage_scenario"]
    return df


def normalize_bool_columns(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    for col in df.columns:
        if df[col].dtype != object:
            continue
        series = df[col].dropna().astype(str).str.lower()
        if series.empty:
            continue
        if series.isin(BOOLEAN_TRUE | BOOLEAN_FALSE).all():
            df[col] = (
                df[col]
                .astype(str)
                .str.lower()
                .map(lambda value: 1 if value in BOOLEAN_TRUE else 0)
                .astype("Int64")
            )
    return df


def apply_feature_overrides(row: dict, overrides: dict | None) -> dict:
    if not overrides:
        return row
    updated = dict(row)
    for key, value in overrides.items():
        updated[key] = value
    return updated
