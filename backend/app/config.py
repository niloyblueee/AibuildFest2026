import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

ROOT_DIR = Path(__file__).resolve().parents[1]


def _parse_csv_env(name: str, default: list[str]) -> list[str]:
    raw = os.getenv(name)
    if not raw:
        return default
    return [item.strip() for item in raw.split(",") if item.strip()]


def _parse_bool_env(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _resolve_env_path(env_name: str, default_path: Path) -> Path:
    raw = os.getenv(env_name)
    if not raw:
        return default_path.resolve()
    normalized = raw.strip().strip('"').strip("'").replace("\\", "/")
    path = Path(normalized)
    if not path.is_absolute():
        path = ROOT_DIR / path
    return path.resolve()


DATA_PATH = _resolve_env_path(
    "DATA_PATH",
    ROOT_DIR / "data" / "bd64_measles_training_news_bootstrap_2026-05-27.csv",
)
MODEL_PATH = _resolve_env_path("MODEL_PATH", ROOT_DIR / "models" / "measles_model.joblib")
META_PATH = _resolve_env_path("META_PATH", ROOT_DIR / "models" / "measles_model_meta.json")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
CORS_ORIGINS = _parse_csv_env("CORS_ORIGINS", ["*"])
CORS_ALLOW_CREDENTIALS = _parse_bool_env("CORS_ALLOW_CREDENTIALS", False)

# Paths for scraper raw outputs and backups
SCRAPED_PATH = _resolve_env_path("SCRAPED_PATH", ROOT_DIR / "data" / "scraped")
BACKUP_PATH = _resolve_env_path("BACKUP_PATH", ROOT_DIR / "data" / "backups")
SCRAPER_LOG_PATH = _resolve_env_path("SCRAPER_LOG_PATH", ROOT_DIR / "data" / "scraper.log")

# Scraper schedule in hours (default: 24 hours)
SCRAPE_SCHEDULE_HOURS = int(os.getenv("SCRAPE_SCHEDULE_HOURS", "24"))
