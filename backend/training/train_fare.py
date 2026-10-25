"""Model 2 - Fare (booking value) estimation.

Target : Booking_Value (INR), fulfilled rides only.
Features (known before the ride): Vehicle_Type, Pickup_Location, Drop_Location,
         estimated Ride_Distance (route distance, which a booking app knows in advance),
         hour, dow, day_of_month.
Baseline: mean booking value per vehicle type (what a naive rate card would give) and the global mean.
Split  : 60/20/20 train / calibration / test. The calibration split is used only to estimate an
         empirical residual interval; test metrics are untouched by any tuning.

Run: python -m backend.training.train_fare
"""
from __future__ import annotations

import joblib
import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from backend.app import artifacts
from backend.app.config import ARTIFACT_DIR, RANDOM_STATE
from backend.app.data import load_clean

CAT = ["Vehicle_Type", "Pickup_Location", "Drop_Location"]
NUM = ["Ride_Distance", "hour", "dow", "day_of_month"]
FEATURES = CAT + NUM
VERSION = "fare-1.0"


def pipe(est) -> Pipeline:
    return Pipeline([("pre", ColumnTransformer([("cat", OneHotEncoder(handle_unknown="ignore"), CAT),
                                                ("num", "passthrough", NUM)])), ("reg", est)])


def metrics(y, p) -> dict:
    return {"mae": float(mean_absolute_error(y, p)), "rmse": float(np.sqrt(mean_squared_error(y, p))),
            "r2": float(r2_score(y, p))}


def main() -> None:
    df = load_clean()
    df = df[(df["is_success"] == 1) & (df["Ride_Distance"] > 0)]
    X, y = df[FEATURES], df["Booking_Value"].astype(float)
    X_tmp, X_te, y_tmp, y_te = train_test_split(X, y, test_size=0.2, random_state=RANDOM_STATE)
    X_tr, X_cal, y_tr, y_cal = train_test_split(X_tmp, y_tmp, test_size=0.25, random_state=RANDOM_STATE)

    # Baselines
    global_mean = float(y_tr.mean())
    veh_mean = y_tr.groupby(X_tr["Vehicle_Type"]).mean().to_dict()
    base_global = np.full(len(y_te), global_mean)
    base_vehicle = X_te["Vehicle_Type"].map(veh_mean).fillna(global_mean).to_numpy()
    results = {"Baseline: global mean": metrics(y_te, base_global),
               "Baseline: mean per vehicle type": metrics(y_te, base_vehicle)}

    models = {"Linear Regression": pipe(LinearRegression()),
              "Random Forest": pipe(RandomForestRegressor(n_estimators=200, min_samples_leaf=30, n_jobs=-1,
                                                          random_state=RANDOM_STATE))}
    for name, m in models.items():
        m.fit(X_tr, y_tr)
        results[name] = metrics(y_te, m.predict(X_te))
    for n, r in results.items():
        print(f"{n:35s} MAE={r['mae']:.1f} RMSE={r['rmse']:.1f} R2={r['r2']:.4f}")

    chosen = min(models, key=lambda n: mean_absolute_error(y_cal, models[n].predict(X_cal)))
    model = models[chosen]
    cal_resid = y_cal.to_numpy() - model.predict(X_cal)
    lo_q, hi_q = np.quantile(cal_resid, [0.10, 0.90])
    te_pred = model.predict(X_te)
    coverage = float(np.mean((y_te.to_numpy() >= te_pred + lo_q) & (y_te.to_numpy() <= te_pred + hi_q)))

    best_base_mae = results["Baseline: mean per vehicle type"]["mae"]
    improvement = 1 - results[chosen]["mae"] / best_base_mae
    reliable = bool(results[chosen]["r2"] >= 0.10 and improvement >= 0.05)

    joblib.dump({
        "pipeline": model, "version": VERSION, "model_name": chosen, "features": FEATURES,
        "categorical_choices": {c: sorted(df[c].unique().tolist()) for c in CAT},
        "distance_range": [int(df["Ride_Distance"].min()), int(df["Ride_Distance"].max())],
        "interval": {"lower": float(lo_q), "upper": float(hi_q), "level": 0.80,
                     "method": "empirical 10th-90th percentile of residuals on a held-out calibration split",
                     "test_coverage": coverage},
        "baseline_vehicle_mean": veh_mean, "baseline_global_mean": global_mean, "reliable": reliable,
        "partial_grid": {"hour": list(range(24)), "dow": list(range(7)), "day_of_month": list(range(1, 32)),
                         "Ride_Distance": list(range(1, 50))},
    }, artifacts.model_path("fare"))

    artifacts.save_metrics("fare", {
        "version": VERSION, "selected_model": chosen, "selection_rule": "lowest MAE on the calibration split",
        "split": {"train": len(X_tr), "calibration": len(X_cal), "test": len(X_te), "strategy": "random 60/20/20"},
        "rows_used": int(len(df)), "results": results, "improvement_over_vehicle_baseline": float(improvement),
        "interval_test_coverage": coverage, "defensible_estimate": reliable,
        "distance_corr_with_value": float(df["Ride_Distance"].corr(df["Booking_Value"])),
        "features": FEATURES, "target_stats": {"mean": float(y.mean()), "std": float(y.std())},
        "limitations": [
            "Booking value in this dataset is almost uncorrelated with distance, vehicle type and time "
            f"(distance correlation = {df['Ride_Distance'].corr(df['Booking_Value']):.3f}).",
            "When R-squared is near zero the model is no better than predicting the average; the output is "
            "an illustration of the pipeline, not a fare quote." if not reliable else
            "The model beats the baselines but remains an estimate, not a fare quote.",
            "Only fulfilled rides with a recorded distance are used for training.",
        ],
    })
    print(f"Selected {chosen}; improvement over vehicle baseline {improvement:.1%}; defensible={reliable}; "
          f"80% interval coverage on test {coverage:.2f}")


if __name__ == "__main__":
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    main()
