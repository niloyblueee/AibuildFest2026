import json
import os
from datetime import datetime
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error
from sklearn.multioutput import MultiOutputRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from dotenv import load_dotenv
from app.data_loader import get_dataset

ROOT_DIR = Path(__file__).resolve().parent
load_dotenv()


def _resolve_env_path(env_name: str, default_path: Path) -> Path:
    raw = os.getenv(env_name)
    if not raw:
        return default_path.resolve()
    path = Path(raw)
    if not path.is_absolute():
        path = ROOT_DIR / path
    return path.resolve()


DATA_PATH = _resolve_env_path(
    "DATA_PATH",
    ROOT_DIR / "data" / "bd64_measles_training_news_bootstrap_2026-05-27.csv",
)
MODEL_PATH = _resolve_env_path("MODEL_PATH", ROOT_DIR / "models" / "measles_model.joblib")
META_PATH = _resolve_env_path("META_PATH", ROOT_DIR / "models" / "measles_model_meta.json")

TARGET_COLS = [
    "forecast_cases_next_7d",
    "forecast_cases_next_14d",
    "forecast_confirmed_next_7d",
    "forecast_deaths_next_7d",
]
DROP_PREFIXES = ("forecast_", "scenario_", "predicted_")
DROP_COLS = {
    "record_id",
    "date",
    "source_ids",
    "synthetic_data_flag",
    "district_estimate_disclaimer",
    "evidence_level",
}


def is_leakage_column(col_name: str) -> bool:
    if col_name in TARGET_COLS:
        return False
    return col_name.startswith(DROP_PREFIXES)


def select_feature_columns(df: pd.DataFrame) -> list[str]:
    cols = []
    for col in df.columns:
        if col in TARGET_COLS:
            continue
        if col in DROP_COLS:
            continue
        if is_leakage_column(col):
            continue
        cols.append(col)
    return cols


def main():
    df = get_dataset()

    df = df.dropna(subset=TARGET_COLS)
    df["date_ordinal"] = df["date_ordinal"].fillna(0)

    feature_cols = select_feature_columns(df)
    X = df[feature_cols]
    y = df[TARGET_COLS]

    df_sorted = df.sort_values("date_ordinal").reset_index(drop=True)
    split_index = int(len(df_sorted) * 0.8)
    train_df = df_sorted.iloc[:split_index]
    test_df = df_sorted.iloc[split_index:]

    X_train = train_df[feature_cols]
    y_train = train_df[TARGET_COLS]
    X_test = test_df[feature_cols]
    y_test = test_df[TARGET_COLS]

    categorical_cols = X_train.select_dtypes(include=["object"]).columns.tolist()
    numeric_cols = [col for col in feature_cols if col not in categorical_cols]

    numeric_transformer = Pipeline(
        steps=[("imputer", SimpleImputer(strategy="median"))]
    )
    categorical_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
        ]
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_transformer, numeric_cols),
            ("cat", categorical_transformer, categorical_cols),
        ]
    )

    base_model = HistGradientBoostingRegressor(
        max_depth=8,
        learning_rate=0.05,
        max_iter=400,
        random_state=42,
    )
    model = MultiOutputRegressor(base_model)

    pipeline = Pipeline(steps=[("preprocess", preprocessor), ("model", model)])
    pipeline.fit(X_train, y_train)

    predictions = pipeline.predict(X_test)
    mae_cases_7d = mean_absolute_error(y_test[TARGET_COLS[0]], predictions[:, 0])
    mae_cases_14d = mean_absolute_error(y_test[TARGET_COLS[1]], predictions[:, 1])
    mae_confirmed_7d = mean_absolute_error(y_test[TARGET_COLS[2]], predictions[:, 2])
    mae_deaths_7d = mean_absolute_error(y_test[TARGET_COLS[3]], predictions[:, 3])

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH)

    meta = {
        "trained_at": datetime.utcnow().isoformat() + "Z",
        "target_cols": TARGET_COLS,
        "feature_cols": feature_cols,
        "categorical_cols": categorical_cols,
        "numeric_cols": numeric_cols,
        "drop_cols": sorted(DROP_COLS),
        "drop_prefixes": list(DROP_PREFIXES),
        "train_rows": int(len(train_df)),
        "test_rows": int(len(test_df)),
        "mae": {
            "cases_7d": float(mae_cases_7d),
            "cases_14d": float(mae_cases_14d),
            "confirmed_7d": float(mae_confirmed_7d),
            "deaths_7d": float(mae_deaths_7d),
        },
    }

    with open(META_PATH, "w", encoding="utf-8") as file_handle:
        json.dump(meta, file_handle, indent=2)

    print("Training complete")
    print(f"MAE cases 7d: {mae_cases_7d:.2f}")
    print(f"MAE cases 14d: {mae_cases_14d:.2f}")
    print(f"MAE confirmed 7d: {mae_confirmed_7d:.2f}")
    print(f"MAE deaths 7d: {mae_deaths_7d:.2f}")
    print(f"Model saved to: {MODEL_PATH}")
    print(f"Meta saved to: {META_PATH}")


if __name__ == "__main__":
    main()
