import hashlib
import numpy as np


def clamp(value: float, min_value: float, max_value: float) -> float:
    return max(min_value, min(max_value, value))


def seed_from_parts(*parts) -> int:
    text = "|".join(str(part) for part in parts if part is not None)
    if not text:
        return 42
    digest = hashlib.md5(text.encode("utf-8")).hexdigest()
    return int(digest[:8], 16)


def build_daily_curve(
    total_cases: float,
    days: int = 7,
    growth_pct: float = 0.0,
    rt_estimate: float = 1.0,
    seed: int = 42,
) -> list[float]:
    if total_cases <= 0 or days <= 0:
        return [0.0] * max(days, 0)
    t = np.linspace(0, 1, days)
    skew = clamp((rt_estimate - 1.0) * 1.2 + (growth_pct / 100.0) * 0.8, -1.5, 1.5)
    weights = np.exp(skew * (t - 0.5) * 3.0)
    bump = 0.18 * np.exp(-((t - 0.5) ** 2) / 0.08)
    weights = weights * (1.0 + bump)
    rng = np.random.default_rng(seed)
    noise = rng.normal(0.0, 0.03, size=days)
    weights = weights * (1.0 + noise)
    weights = np.clip(weights, 0.01, None)
    weights = weights / weights.sum()
    return (weights * total_cases).tolist()


def build_hourly_curve(daily_cases: list[float], seed: int = 42) -> list[dict]:
    if not daily_cases:
        return []
    hours = np.arange(24)
    base = 0.25 + np.exp(-((hours - 13) ** 2) / 18.0) + 0.35 * np.exp(
        -((hours - 19) ** 2) / 12.0
    )
    rng = np.random.default_rng(seed)
    noise = rng.normal(0.0, 0.05, size=24)
    weights = base * (1.0 + noise)
    weights = np.clip(weights, 0.01, None)
    weights = weights / weights.sum()
    result = []
    for day_index, daily_total in enumerate(daily_cases, start=1):
        for hour, weight in enumerate(weights):
            result.append({"day": day_index, "hour": hour, "cases": daily_total * weight})
    return result
