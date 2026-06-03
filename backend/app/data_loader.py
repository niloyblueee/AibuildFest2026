import json
import pandas as pd
from pathlib import Path
from typing import Iterable, List

from .config import DATA_PATH, SCRAPED_PATH, BACKUP_PATH
from .features import add_date_features, add_derived_features, normalize_bool_columns

_DATA_CACHE = None


def _list_scraped_files() -> List[Path]:
    p = Path(SCRAPED_PATH)
    if not p.exists():
        return []
    return sorted(p.glob("*.jsonl"))


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


def _backup_csv():
    bp = Path(BACKUP_PATH)
    bp.mkdir(parents=True, exist_ok=True)
    ts = pd.Timestamp.now().strftime("%Y%m%d_%H%M%S")
    target = bp / f"bd64_backup_{ts}.csv"
    Path(DATA_PATH).resolve().rename(target)
    return target


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
    """Load scraped JSONL files, aggregate simple news scores per district,
    update the in-memory dataset and optionally write an updated CSV with
    provenance fields. Returns a summary dict.
    """
    global _DATA_CACHE
    df = get_dataset()
    files = _list_scraped_files()
    if not files:
        return {"updated": 0, "files": 0}

    records = _load_scraped_records(files)
    if not records:
        return {"updated": 0, "files": len(files)}

    # Simple scoring: count articles per district by substring match (case-insensitive)
    districts = df["district"].dropna().unique().tolist()
    counts = {d: 0 for d in districts}
    sources = {d: set() for d in districts}
    latest_dt = None

    for rec in records:
        text = " ".join([str(rec.get(k, "")) for k in ("headline", "body", "location_text")]).lower()
        for d in districts:
            if d.lower() in text:
                counts[d] += 1
                sources[d].add(rec.get("source") or "unknown")
        try:
            dt = pd.to_datetime(rec.get("date"), utc=True, errors="coerce")
            if pd.isna(dt):
                continue
            # convert to tz-naive to avoid dtype conflicts when assigning into existing columns
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

    # Apply updates to dataframe
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

    for d, cnt in counts.items():
        if cnt == 0:
            continue
        mask = df["district"].str.lower() == d.lower()
        if not mask.any():
            continue
        # naive scaling: normalize by log(1+count)
        delta = float(pd.np.log1p(cnt)) if hasattr(pd, "np") else float(__import__("math").log(1 + cnt))
        df.loc[mask, "news_enriched_risk_score"] = df.loc[mask, "news_enriched_risk_score"].fillna(0) + delta
        df.loc[mask, "news_scrape_date"] = latest_dt
        df.loc[mask, "news_sources_count"] = len(sources[d])
        df.loc[mask, "news_score_delta"] = delta
        df.loc[mask, "news_sources_list"] = ",".join(sorted(sources[d]))
        updated += int(mask.sum())

    _DATA_CACHE = df

    summary = {"updated": updated, "files": len(files), "latest_date": str(latest_dt)}

    if write_csv:
        # backup current CSV then write
        try:
            bp = Path(BACKUP_PATH)
            bp.mkdir(parents=True, exist_ok=True)
            ts = pd.Timestamp.now().strftime("%Y%m%d_%H%M%S")
            backup_target = bp / f"bd64_backup_{ts}.csv"
            Path(DATA_PATH).resolve().replace(backup_target)
        except Exception:
            # if backup fails, continue but warn via summary
            summary["backup_failed"] = True

        try:
            df.to_csv(DATA_PATH, index=False)
            summary["wrote_csv"] = True
        except Exception:
            summary["wrote_csv"] = False

    return summary
