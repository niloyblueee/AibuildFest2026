import json
import math
from pathlib import Path
from typing import Iterable, List

import pandas as pd

from .config import BACKUP_PATH, DATA_PATH, SCRAPED_PATH
from .features import add_date_features, add_derived_features, normalize_bool_columns

_DATA_CACHE = None


def _list_scraped_files() -> List[Path]:
    path = Path(SCRAPED_PATH)
    if not path.exists():
        return []
    return sorted(path.glob("*.jsonl"))


def _load_scraped_records(paths: Iterable[Path]) -> List[dict]:
    records = []
    for path in paths:
        try:
            with path.open("r", encoding="utf-8") as fh:
                for line in fh:
                    try:
                        records.append(json.loads(line))
                    except Exception:
                        continue
        except Exception:
            continue
    return records


def get_dataset() -> pd.DataFrame:
    global _DATA_CACHE
    if _DATA_CACHE is None:
        df = pd.read_csv(DATA_PATH)
        df = add_date_features(df)
        df = add_derived_features(df)
        df = normalize_bool_columns(df)
        _DATA_CACHE = df
    return _DATA_CACHE


def apply_scrape_updates(write_csv: bool = True) -> dict:
    """Apply scraped news signals to the dataset and optionally write CSV."""
    global _DATA_CACHE
    df = get_dataset()
    files = _list_scraped_files()
    if not files:
        return {"updated": 0, "files": 0}

    records = _load_scraped_records(files)
    if not records:
        return {"updated": 0, "files": len(files)}

    districts = df["district"].dropna().unique().tolist()
    counts = {district: 0 for district in districts}
    sources = {district: set() for district in districts}
    latest_dt = None

    for rec in records:
        text = " ".join(
            [str(rec.get(k, "")) for k in ("headline", "body", "location_text")]
        ).lower()
        for district in districts:
            if district.lower() in text:
                counts[district] += 1
                sources[district].add(rec.get("source") or "unknown")
        try:
            dt = pd.to_datetime(rec.get("date"), utc=True, errors="coerce")
            if pd.isna(dt):
                continue
            if getattr(dt, "tzinfo", None) is not None or getattr(dt, "tz", None) is not None:
                try:
                    dt = dt.tz_convert(None)
                except Exception:
                    try:
                        dt = dt.tz_localize(None)
                    except Exception:
                        dt = pd.to_datetime(str(dt)).tz_localize(None)
            if latest_dt is None or dt > latest_dt:
                latest_dt = dt
        except Exception:
            continue

    updated = 0
    df = df.copy()
    if "news_scrape_date" not in df.columns:
        df["news_scrape_date"] = pd.NaT
    if "news_sources_count" not in df.columns:
        df["news_sources_count"] = 0
    if "news_score_delta" not in df.columns:
        df["news_score_delta"] = 0.0
    if "news_sources_list" not in df.columns:
        df["news_sources_list"] = ""
    if "news_enriched_risk_score" not in df.columns:
        df["news_enriched_risk_score"] = 0.0

    for district, cnt in counts.items():
        if cnt == 0:
            continue
        mask = df["district"].str.lower() == district.lower()
        if not mask.any():
            continue
        delta = float(math.log1p(cnt))
        df.loc[mask, "news_enriched_risk_score"] = df.loc[mask, "news_enriched_risk_score"].fillna(0) + delta
        df.loc[mask, "news_scrape_date"] = latest_dt
        df.loc[mask, "news_sources_count"] = len(sources[district])
        df.loc[mask, "news_score_delta"] = delta
        df.loc[mask, "news_sources_list"] = ",".join(sorted(sources[district]))
        updated += int(mask.sum())

    _DATA_CACHE = df

    summary = {"updated": updated, "files": len(files), "latest_date": str(latest_dt)}

    if write_csv:
        try:
            backup_path = Path(BACKUP_PATH)
            backup_path.mkdir(parents=True, exist_ok=True)
            ts = pd.Timestamp.now().strftime("%Y%m%d_%H%M%S")
            backup_target = backup_path / f"bd64_backup_{ts}.csv"
            Path(DATA_PATH).resolve().replace(backup_target)
        except Exception:
            summary["backup_failed"] = True

        try:
            df.to_csv(DATA_PATH, index=False)
            summary["wrote_csv"] = True
        except Exception:
            summary["wrote_csv"] = False

    return summary
