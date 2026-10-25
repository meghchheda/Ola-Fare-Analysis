"""Model 1 - Ride cancellation (non-fulfilment) prediction.

Target : is_unfulfilled = 1 when Booking_Status is Canceled by Customer, Canceled by Driver
         or Driver Not Found (i.e. the ride did not happen).
Features (all known at booking time): Vehicle_Type, Pickup_Location, Drop_Location,
         hour, dow, day_of_month, same_area (pickup == drop).
NOT used (post-outcome / leakage): Ride_Distance (0 for every unfulfilled booking), V_TAT, C_TAT,
         cancellation reasons, incomplete-ride fields, payment method, ratings, Booking_Value.
Customer history is NOT used: 94,544 distinct customers across 103,024 bookings means almost
         no customer has a usable prior history.
Split  : stratified 60/20/20 train / validation / test. The decision threshold is chosen on
         validation (max F1); all reported metrics are on the untouched test set.

Run: python -m backend.training.train_cancellation   (from the project root)
"""
from __future__ import annotations

import joblib
import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (average_precision_score, confusion_matrix, f1_score,
                             precision_recall_curve, precision_score, recall_score, roc_auc_score)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from backend.app import artifacts
from backend.app.config import ARTIFACT_DIR, RANDOM_STATE
from backend.app.data import load_clean

CAT = ["Vehicle_Type", "Pickup_Location", "Drop_Location"]
NUM = ["hour", "dow", "day_of_month", "same_area"]
FEATURES = CAT + NUM
VERSION = "cancellation-1.0"


def make_pipeline(estimator) -> Pipeline:
    pre = ColumnTransformer(
        [("cat", OneHotEncoder(handle_unknown="ignore"), CAT), ("num", "passthrough", NUM)])
    return Pipeline([("pre", pre), ("clf", estimator)])


def evaluate(y, proba, thr) -> dict:
    pred = (proba >= thr).astype(int)
    tn, fp, fn, tp = confusion_matrix(y, pred, labels=[0, 1]).ravel()
    return {
        "threshold": float(thr),
        "precision": float(precision_score(y, pred, zero_division=0)),
        "recall": float(recall_score(y, pred, zero_division=0)),
        "f1": float(f1_score(y, pred, zero_division=0)),
        "pr_auc": float(average_precision_score(y, proba)),
        "roc_auc": float(roc_auc_score(y, proba)),
        "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
    }


def best_f1_threshold(y, proba) -> float:
    p, r, t = precision_recall_curve(y, proba)
    f1 = 2 * p[:-1] * r[:-1] / np.clip(p[:-1] + r[:-1], 1e-9, None)
    return float(t[int(np.nanargmax(f1))])


def main() -> None:
    df = load_clean()
    df["same_area"] = (df["Pickup_Location"] == df["Drop_Location"]).astype(int)
    X, y = df[FEATURES], df["is_unfulfilled"]
    X_tmp, X_test, y_tmp, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=RANDOM_STATE)
    X_tr, X_val, y_tr, y_val = train_test_split(X_tmp, y_tmp, test_size=0.25, stratify=y_tmp, random_state=RANDOM_STATE)

    candidates = {
        "Baseline (always predicts the base rate)": DummyClassifier(strategy="prior"),
        "Logistic Regression": LogisticRegression(max_iter=1000, class_weight="balanced"),
        "Random Forest": RandomForestClassifier(n_estimators=200, min_samples_leaf=20, class_weight="balanced_subsample",
                                                n_jobs=-1, random_state=RANDOM_STATE),
    }
    results, fitted = {}, {}
    for name, est in candidates.items():
        pipe = make_pipeline(est).fit(X_tr, y_tr)
        val_p = pipe.predict_proba(X_val)[:, 1]
        # baseline has constant probability: a threshold of 0.5 flags nobody, which is the honest outcome.
        thr = best_f1_threshold(y_val, val_p) if name != next(iter(candidates)) else 0.5
        results[name] = {"validation": evaluate(y_val, val_p, thr),
                         "test": evaluate(y_test, pipe.predict_proba(X_test)[:, 1], thr)}
        fitted[name] = (pipe, thr)
        print(f"{name:45s} val PR-AUC={results[name]['validation']['pr_auc']:.4f}  "
              f"test PR-AUC={results[name]['test']['pr_auc']:.4f}  test F1={results[name]['test']['f1']:.4f}")

    real = [n for n in results if not n.startswith("Baseline")]
    chosen = max(real, key=lambda n: results[n]["validation"]["pr_auc"])
    pipe, thr = fitted[chosen]
    base_rate = float(y.mean())
    t = results[chosen]["test"]["pr_auc"]
    beats_baseline = t > base_rate * 1.05

    # Risk categories relative to the base rate and the validation-selected threshold.
    choices = {c: sorted(df[c].unique().tolist()) for c in CAT}
    joblib.dump({
        "pipeline": pipe, "threshold": thr, "version": VERSION, "model_name": chosen,
        "features": FEATURES, "categorical_choices": choices, "base_rate": base_rate,
        "partial_grid": {"hour": list(range(24)), "dow": list(range(7)), "day_of_month": list(range(1, 32))},
    }, artifacts.model_path("cancellation"))

    artifacts.save_metrics("cancellation", {
        "version": VERSION, "selected_model": chosen, "selection_rule": "highest validation PR-AUC",
        "threshold": thr, "threshold_rule": "maximises F1 on the validation split",
        "base_rate": base_rate, "test_positive_rate": float(y_test.mean()),
        "split": {"train": len(X_tr), "validation": len(X_val), "test": len(X_test), "strategy": "stratified 60/20/20"},
        "results": results, "features": FEATURES,
        "beats_baseline": bool(beats_baseline),
        "limitations": [
            "Only booking-time features are used, so the model can only learn route, vehicle and time patterns.",
            "PR-AUC close to the base rate means those features carry little signal in this dataset; "
            "predicted probabilities should be read as weak estimates, not decisions.",
            "One month of data (July 2024): no seasonality or long-term behaviour can be learned.",
        ],
    })
    print(f"Selected: {chosen} | base rate {base_rate:.3f} | test PR-AUC {t:.3f} | beats baseline: {beats_baseline}")


if __name__ == "__main__":
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    main()
