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
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
CORS_ORIGINS = _parse_csv_env("CORS_ORIGINS", ["*"])
CORS_ALLOW_CREDENTIALS = _parse_bool_env("CORS_ALLOW_CREDENTIALS", False)
