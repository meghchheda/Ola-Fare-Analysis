"""Model 4 - Hourly ride-demand forecast.

Data    : bookings per hour (744 hours, 1-31 July 2024 - only one month exists).
Split   : chronological. Train = first 24 days, test = last 7 days. No shuffling.
Baseline: historical average per (day-of-week, hour) learned from the training days.
Model   : Random Forest on lagged counts (1, 2, 3, 24, 48 h) + calendar features, forecasting
          RECURSIVELY (its own predictions feed the lags).
Evaluation: rolling-origin. For each test day, forecast the next 24 h from midnight using only data
          before midnight (recursive), and score on the actuals. MAE and RMSE are averaged over all test hours.
Interval: empirical 10th-90th percentile of recursive test residuals (approximate, not a formal guarantee).
Final model is refit on all 31 days for the live forecast beyond 31 July.

Run: python -m backend.training.train_forecast
"""
from __future__ import annotations

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

from backend.app import artifacts
from backend.app.config import ARTIFACT_DIR, RANDOM_STATE
from backend.app.data import load_clean

LAGS = [1, 2, 3, 24, 48]
VERSION = "forecast-1.0"
FEAT = [f"lag_{l}" for l in LAGS] + ["hour", "dow", "is_weekend"]


def hourly_series(df: pd.DataFrame) -> pd.Series:
    s = df.set_index("Date").resample("h").size().astype(float)
    full = pd.date_range(s.index.min().normalize(), s.index.max().normalize() + pd.Timedelta(hours=23), freq="h")
    return s.reindex(full, fill_value=0.0)


def cal(idx: pd.DatetimeIndex) -> pd.DataFrame:
    return pd.DataFrame({"hour": idx.hour, "dow": idx.dayofweek, "is_weekend": (idx.dayofweek >= 5).astype(int)}, index=idx)


def supervised(s: pd.Series) -> pd.DataFrame:
    d = pd.DataFrame({f"lag_{l}": s.shift(l) for l in LAGS}, index=s.index).join(cal(s.index))
    d["y"] = s
    return d.dropna()


def recursive_forecast(model, history: pd.Series, steps: int) -> pd.Series:
    hist = history.copy()
    idx = pd.date_range(hist.index[-1] + pd.Timedelta(hours=1), periods=steps, freq="h")
    preds = []
    for ts in idx:
        row = {f"lag_{l}": hist.iloc[-l] for l in LAGS}
        c = cal(pd.DatetimeIndex([ts])).iloc[0].to_dict()
        x = pd.DataFrame([{**row, **c}])[FEAT]
        p = max(float(model.predict(x)[0]), 0.0)
        preds.append(p)
        hist.loc[ts] = p
    return pd.Series(preds, index=idx)


def baseline_table(train: pd.Series) -> pd.Series:
    d = pd.DataFrame({"y": train, "dow": train.index.dayofweek, "hour": train.index.hour})
    return d.groupby(["dow", "hour"])["y"].mean()


def baseline_predict(table: pd.Series, idx: pd.DatetimeIndex) -> np.ndarray:
    fallback = table.mean()
    return np.array([table.get((t.dayofweek, t.hour), fallback) for t in idx])


def main() -> None:
    s = hourly_series(load_clean())
    split = s.index[0] + pd.Timedelta(days=24)
    train, test = s[s.index < split], s[s.index >= split]

    sup = supervised(train)
    model = RandomForestRegressor(n_estimators=300, min_samples_leaf=5, n_jobs=-1, random_state=RANDOM_STATE)
    model.fit(sup[FEAT], sup["y"])
    table = baseline_table(train)

    rf_pred, bl_pred, actual, tidx = [], [], [], []
    for day_start in pd.date_range(split, s.index[-1].normalize(), freq="D"):
        hist = s[s.index < day_start]
        fc = recursive_forecast(model, hist, 24)
        act = s.loc[fc.index]
        rf_pred += fc.tolist()
        bl_pred += baseline_predict(table, fc.index).tolist()
        actual += act.tolist()
        tidx += fc.index.tolist()
    actual, rf_pred, bl_pred = map(np.array, (actual, rf_pred, bl_pred))

    def m(p):
        return {"mae": float(mean_absolute_error(actual, p)), "rmse": float(np.sqrt(mean_squared_error(actual, p)))}
    res = {"Baseline: day-of-week x hour average": m(bl_pred), "Random Forest (lags + calendar)": m(rf_pred)}
    naive = m(np.full_like(actual, train.mean()))
    res["Baseline: overall hourly mean"] = naive
    for k, v in res.items():
        print(f"{k:40s} MAE={v['mae']:.2f} RMSE={v['rmse']:.2f}")

    chosen = min(["Baseline: day-of-week x hour average", "Random Forest (lags + calendar)"], key=lambda k: res[k]["mae"])
    use_rf = chosen.startswith("Random")
    chosen_pred = rf_pred if use_rf else bl_pred
    lo_q, hi_q = np.quantile(actual - chosen_pred, [0.10, 0.90])

    # Final model on all data for the live forecast
    sup_all = supervised(s)
    final = RandomForestRegressor(n_estimators=300, min_samples_leaf=5, n_jobs=-1, random_state=RANDOM_STATE)
    final.fit(sup_all[FEAT], sup_all["y"])
    table_all = baseline_table(s)

    joblib.dump({"model": final, "baseline_table": table_all, "use_random_forest": use_rf, "lags": LAGS,
                 "features": FEAT, "interval": [float(lo_q), float(hi_q)], "version": VERSION,
                 "history_end": s.index[-1].isoformat()}, artifacts.model_path("forecast"))
    s.rename("bookings").to_frame().to_parquet(ARTIFACT_DIR / "forecast_history.parquet")

    artifacts.save_metrics("forecast", {
        "version": VERSION, "selected": chosen, "results": res,
        "beats_all_baselines": bool(res["Random Forest (lags + calendar)"]["mae"] < 0.98 * min(
            res["Baseline: day-of-week x hour average"]["mae"], res["Baseline: overall hourly mean"]["mae"])),
        "rf_vs_baseline_mae_change": float(res["Random Forest (lags + calendar)"]["mae"] /
                                           res["Baseline: day-of-week x hour average"]["mae"] - 1),
        "history": {"start": s.index[0].isoformat(), "end": s.index[-1].isoformat(), "hours": int(len(s)), "days": 31},
        "split": {"train_end": split.isoformat(), "test_start": split.isoformat(), "test_end": s.index[-1].isoformat(),
                  "test_hours": int(len(actual)), "strategy": "chronological: first 24 days train, last 7 days test"},
        "evaluation": "rolling-origin, 24h recursive forecasts from midnight of each test day",
        "interval": {"lower": float(lo_q), "upper": float(hi_q), "level": 0.80,
                     "method": "empirical residual quantiles on test (approximate)"},
        "mean_hourly_bookings": float(s.mean()), "features": FEAT,
        "limitations": [
            "Only 31 days of history: weekly patterns have been seen four times, monthly or yearly seasonality never.",
            "Hourly counts are noisy; if the model does not beat the historical-average baseline, the "
            "calendar pattern is the most that can be claimed.",
            "Forecasts beyond 24-72 hours are recursive and accumulate error.",
        ],
    })
    print("Selected:", chosen)


if __name__ == "__main__":
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    main()
