import pandas as pd
from .config import DATA_PATH
from .features import add_date_features, add_derived_features, normalize_bool_columns

_DATA_CACHE = None


def get_dataset() -> pd.DataFrame:
    global _DATA_CACHE
    if _DATA_CACHE is None:
        df = pd.read_csv(DATA_PATH)
        df = add_date_features(df)
        df = add_derived_features(df)
        df = normalize_bool_columns(df)
        _DATA_CACHE = df
    return _DATA_CACHE
