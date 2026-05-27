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
from app.features import add_date_features, normalize_bool_columns

ROOT_DIR = Path(__file__).resolve().parent
load_dotenv()
DATA_PATH = Path(
    os.getenv(
        "DATA_PATH",
        ROOT_DIR / ".." / "frontend" / "src" / "data" / "zerodose_mission_control_synthetic_dataset.csv",
    )
).resolve()
MODEL_PATH = Path(
    os.getenv("MODEL_PATH", ROOT_DIR / "models" / "measles_model.joblib")
).resolve()
META_PATH = Path(
    os.getenv("META_PATH", ROOT_DIR / "models" / "measles_model_meta.json")
).resolve()

TARGET_COLS = ["forecast_cases_next_7d", "forecast_cases_next_14d"]
DROP_PREFIXES = ("forecast_", "scenario_", "predicted_")
DROP_COLS = {
    "record_id",
    "date",
    "route_plan_text",
    "community_notes",
    "ai_generated_field_brief",
    "public_message_template_bn",
    "alert_flags_json",
    "model_recommended_action",
    "dominant_rumor_topic",
    "suggested_reallocation_from_facility",
    "suggested_reallocation_to_facility",
    "nearest_health_facility",
    "nearest_hospital_name",
    "facility_id",
    "nearest_hospital_id",
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
    df = pd.read_csv(DATA_PATH)
    df = add_date_features(df)
    df = normalize_bool_columns(df)

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
            ("onehot", OneHotEncoder(handle_unknown="ignore")),
        ]
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_transformer, numeric_cols),
            ("cat", categorical_transformer, categorical_cols),
        ]
    )

    base_model = HistGradientBoostingRegressor(
        max_depth=6,
        learning_rate=0.05,
        max_iter=200,
        random_state=42,
    )
    model = MultiOutputRegressor(base_model)

    pipeline = Pipeline(steps=[("preprocess", preprocessor), ("model", model)])
    pipeline.fit(X_train, y_train)

    predictions = pipeline.predict(X_test)
    mae_7d = mean_absolute_error(y_test[TARGET_COLS[0]], predictions[:, 0])
    mae_14d = mean_absolute_error(y_test[TARGET_COLS[1]], predictions[:, 1])

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
        "mae": {"cases_7d": float(mae_7d), "cases_14d": float(mae_14d)},
    }

    with open(META_PATH, "w", encoding="utf-8") as file_handle:
        json.dump(meta, file_handle, indent=2)

    print("Training complete")
    print(f"MAE 7d: {mae_7d:.2f}")
    print(f"MAE 14d: {mae_14d:.2f}")
    print(f"Model saved to: {MODEL_PATH}")
    print(f"Meta saved to: {META_PATH}")


if __name__ == "__main__":
    main()
