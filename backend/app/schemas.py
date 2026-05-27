from typing import Any, Dict, List
from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    district: str
    scenario_name: str = "observed_baseline"
    coverage_pct: float | None = Field(default=None, ge=0, le=100)
    division: str | None = None
    date: str | None = None
    week_index: int | None = None
    day_index: int | None = None
    coverage_children_pct: float | None = Field(default=None, ge=0, le=100)
    coverage_population_pct: float | None = Field(default=None, ge=0, le=100)
    include_daily: bool = True
    include_hourly: bool = True
    feature_overrides: Dict[str, Any] | None = None


class BatchPredictRequest(BaseModel):
    requests: List[PredictRequest]


class InsightRequest(BaseModel):
    prediction: Dict[str, Any]
