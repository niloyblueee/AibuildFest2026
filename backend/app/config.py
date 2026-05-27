import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

ROOT_DIR = Path(__file__).resolve().parents[1]
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
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
