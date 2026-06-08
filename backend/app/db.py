from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from urllib.parse import quote_plus

import pandas as pd
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import Engine

from .config import DATA_PATH

DATA_TABLE_NAME = "measles_observations"
SCRAPED_TABLE_NAME = "scraped_articles"


def _build_database_url() -> str | None:
    raw_url = (
        os.getenv("DATABASE_URL")
        or os.getenv("MYSQL_URL")
        or os.getenv("MYSQLDATABASE_URL")
    )
    if raw_url:
        raw_url = raw_url.strip()
        if raw_url.startswith("mysql://"):
            return raw_url.replace("mysql://", "mysql+pymysql://", 1)
        return raw_url

    host = os.getenv("MYSQLHOST") or os.getenv("MYSQL_HOST")
    database = os.getenv("MYSQLDATABASE") or os.getenv("MYSQL_DATABASE")
    user = os.getenv("MYSQLUSER") or os.getenv("MYSQL_USER")
    password = os.getenv("MYSQLPASSWORD") or os.getenv("MYSQL_PASSWORD")
    port = os.getenv("MYSQLPORT") or os.getenv("MYSQL_PORT") or "3306"

    if not all([host, database, user, password]):
        return None

    return (
        "mysql+pymysql://"
        f"{quote_plus(user)}:{quote_plus(password)}@{host}:{port}/{database}?charset=utf8mb4"
    )


@lru_cache(maxsize=1)
def get_engine() -> Engine | None:
    database_url = _build_database_url()
    if not database_url:
        return None
    return create_engine(database_url, pool_pre_ping=True, pool_recycle=3600, future=True)


def is_configured() -> bool:
    return get_engine() is not None


def ensure_seed_data() -> bool:
    engine = get_engine()
    if engine is None:
        return False

    csv_path = Path(DATA_PATH)
    if not csv_path.exists():
        return False

    inspector = inspect(engine)
    if inspector.has_table(DATA_TABLE_NAME):
        with engine.connect() as connection:
            row_count = connection.execute(
                text(f"SELECT COUNT(*) FROM {DATA_TABLE_NAME}")
            ).scalar_one()
            if row_count and row_count > 0:
                return True

    df = pd.read_csv(csv_path)
    df.to_sql(
        DATA_TABLE_NAME,
        engine,
        if_exists="replace",
        index=False,
        chunksize=1000,
        method="multi",
    )
    return True


def load_dataset_from_store() -> pd.DataFrame | None:
    engine = get_engine()
    if engine is None:
        return None

    try:
        ensure_seed_data()
        return pd.read_sql_query(text(f"SELECT * FROM {DATA_TABLE_NAME}"), engine)
    except Exception:
        return None


def persist_dataset(df: pd.DataFrame) -> bool:
    engine = get_engine()
    if engine is None:
        return False

    df.to_sql(
        DATA_TABLE_NAME,
        engine,
        if_exists="replace",
        index=False,
        chunksize=1000,
        method="multi",
    )
    return True


def store_scraped_records(records: list[dict]) -> int:
    engine = get_engine()
    if engine is None or not records:
        return 0

    frame = pd.DataFrame([dict(record) for record in records])
    if "date" in frame.columns:
        frame["date"] = pd.to_datetime(frame["date"], errors="coerce", utc=True)

    frame.to_sql(
        SCRAPED_TABLE_NAME,
        engine,
        if_exists="append",
        index=False,
        chunksize=1000,
        method="multi",
    )
    return len(frame)