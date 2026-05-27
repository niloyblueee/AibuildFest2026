import json
import joblib
from .config import MODEL_PATH, META_PATH

_MODEL_CACHE = None
_META_CACHE = None


def get_model():
    global _MODEL_CACHE
    if _MODEL_CACHE is None:
        _MODEL_CACHE = joblib.load(MODEL_PATH)
    return _MODEL_CACHE


def get_meta() -> dict:
    global _META_CACHE
    if _META_CACHE is None:
        with open(META_PATH, "r", encoding="utf-8") as file_handle:
            _META_CACHE = json.load(file_handle)
    return _META_CACHE
