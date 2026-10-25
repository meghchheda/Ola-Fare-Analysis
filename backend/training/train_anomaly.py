"""Model 5 - Anomalous ride detection (Isolation Forest).

Features: Booking_Value, Ride_Distance, value_per_km (0 when distance is 0), value_vs_vehicle_median
          (booking value divided by the median for that vehicle type), hour.
Excluded: identifiers, ratings, cancellation reasons, payment method, outcome text.
Contamination: 1% (documented choice - roughly the share a reviewer could realistically inspect).
Evaluation: there are no ground-truth labels, so no accuracy is claimed. Instead we report the share
          flagged, the score distribution, which features drive the flags (robust z-scores), and
          how stable the flagged set is across random seeds (Jaccard overlap).
A flag means "statistically unusual", NOT "fraud".

Run: python -m backend.training.train_anomaly
"""
from __future__ import annotations

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from backend.app import artifacts
from backend.app.config import ARTIFACT_DIR, RANDOM_STATE
from backend.app.data import load_clean

CONTAMINATION = 0.01
FEATURES = ["Booking_Value", "Ride_Distance", "value_per_km", "value_vs_vehicle_median", "hour"]
LABELS = {"Booking_Value": "Booking value", "Ride_Distance": "Ride distance", "value_per_km": "Value per km",
          "value_vs_vehicle_median": "Value vs vehicle median", "hour": "Booking hour"}
VERSION = "anomaly-1.0"


def add_features(df: pd.DataFrame) -> pd.DataFrame:
    d = df.copy()
    dist = d["Ride_Distance"].replace(0, np.nan)
    d["value_per_km"] = (d["Booking_Value"] / dist).fillna(0.0)  # zero/missing distance handled explicitly
    med = d.groupby("Vehicle_Type")["Booking_Value"].transform("median")
    d["value_vs_vehicle_median"] = d["Booking_Value"] / med
    return d


def main() -> None:
    df = add_features(load_clean())
    scaler = StandardScaler().fit(df[FEATURES])
    X = scaler.transform(df[FEATURES])
    iso = IsolationForest(n_estimators=300, contamination=CONTAMINATION, random_state=RANDOM_STATE, n_jobs=-1).fit(X)
    df["anomaly_score"] = -iso.score_samples(X)  # higher = more unusual
    df["flagged"] = iso.predict(X) == -1

    # stability across seeds
    flagged_sets = [set(np.where(df["flagged"])[0])]
    for seed in (1, 2, 3):
        m = IsolationForest(n_estimators=300, contamination=CONTAMINATION, random_state=seed, n_jobs=-1).fit(X)
        flagged_sets.append(set(np.where(m.predict(X) == -1)[0]))
    jac = [len(flagged_sets[0] & s) / len(flagged_sets[0] | s) for s in flagged_sets[1:]]

    # which features look unusual for each record (robust z-score)
    med, mad = df[FEATURES].median(), (df[FEATURES] - df[FEATURES].median()).abs().median().replace(0, np.nan)
    z = ((df[FEATURES] - med) / (1.4826 * mad)).fillna(0)
    def reasons(i):
        r = z.loc[i]
        top = r[r.abs() > 3].abs().sort_values(ascending=False).index[:3]
        return "; ".join(f"{LABELS[f]} {'high' if r[f] > 0 else 'low'} ({df.at[i, f]:.4g})" for f in top)

    flagged = df[df["flagged"]].sort_values("anomaly_score", ascending=False).copy()
    flagged["unusual_values"] = [reasons(i) or "Unusual combination of values" for i in flagged.index]
    cols = ["Booking_ID", "Date", "Booking_Status", "Vehicle_Type", "Pickup_Location", "Drop_Location", "Booking_Value",
            "Ride_Distance", "value_per_km", "value_vs_vehicle_median", "hour", "anomaly_score", "unusual_values"]
    flagged[cols].assign(Date=lambda x: x["Date"].dt.strftime("%Y-%m-%d %H:%M")).to_parquet(
        ARTIFACT_DIR / "anomaly_flagged.parquet", index=False)

    normal = df[~df["flagged"]].sample(2500, random_state=RANDOM_STATE)
    pd.concat([normal.assign(flagged=False), flagged.assign(flagged=True)])[
        ["Booking_ID", "Booking_Value", "Ride_Distance", "value_per_km", "anomaly_score", "flagged", "Vehicle_Type"]
    ].to_parquet(ARTIFACT_DIR / "anomaly_scatter.parquet", index=False)

    hist, edges = np.histogram(df["anomaly_score"], bins=30)
    threshold = float(df.loc[df["flagged"], "anomaly_score"].min())
    joblib.dump({"scaler": scaler, "model": iso, "features": FEATURES, "version": VERSION, "threshold": threshold},
                artifacts.model_path("anomaly"))
    status_counts = flagged["Booking_Status"].value_counts().to_dict()
    artifacts.save_metrics("anomaly", {
        "version": VERSION, "records_analyzed": int(len(df)), "flagged": int(df["flagged"].sum()),
        "flagged_pct": float(df["flagged"].mean() * 100), "contamination": CONTAMINATION,
        "score_threshold": threshold, "features": FEATURES,
        "score_histogram": [{"bin": float((edges[i] + edges[i + 1]) / 2), "count": int(c)} for i, c in enumerate(hist)],
        "stability_jaccard_mean": float(np.mean(jac)), "flagged_by_status": status_counts,
        "review_results": None,
        "limitations": [
            "No ground-truth labels exist, so accuracy cannot be computed. Flagged records have not been manually reviewed.",
            "Isolation Forest flags statistically rare combinations; a flag is not evidence of fraud or misconduct.",
            "Contamination (1%) is a chosen review budget, not an estimate of the true anomaly rate.",
        ],
    })
    print(f"flagged {int(df['flagged'].sum())} / {len(df)}; seed stability (Jaccard) {np.mean(jac):.2f}")
    print(flagged[cols[:8] + ["unusual_values"]].head(5).to_string())


if __name__ == "__main__":
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    main()
