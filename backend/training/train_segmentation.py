"""Model 3 - Customer segmentation (K-Means).

Unit    : customer. Only customers with >= MIN_BOOKINGS bookings are clustered, because 91% of
          customer IDs appear once and a one-booking "profile" carries no behavioural information.
Features: n_bookings, active_days, unfulfilled_rate, avg_value (successful rides),
          avg_distance (successful rides), avg_hour. Customer_ID is never a feature.
Missing : customers with no successful ride get the population median for avg_value / avg_distance
          (flagged in the output with has_success = False).
Scaling : StandardScaler (n_bookings is log-transformed first because it is heavily skewed).
K       : chosen by best silhouette score over k = 2..8.
Note    : this is a descriptive, whole-month segmentation. It is not used to predict future behaviour,
          so no train/test split is needed; the cluster profile is the result.

Run: python -m backend.training.train_segmentation
"""
from __future__ import annotations

import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler

from backend.app import artifacts
from backend.app.config import ARTIFACT_DIR, RANDOM_STATE
from backend.app.data import load_clean

MIN_BOOKINGS = 2
FEATURES = ["n_bookings_log", "unfulfilled_rate", "avg_value", "avg_distance", "avg_hour", "active_days"]
VERSION = "segmentation-1.0"


def build_customers(df: pd.DataFrame) -> pd.DataFrame:
    succ = df[df["is_success"] == 1]
    g = df.groupby("Customer_ID")
    cust = pd.DataFrame({
        "n_bookings": g.size(), "active_days": g["day"].nunique(),
        "unfulfilled_rate": g["is_unfulfilled"].mean(), "avg_hour": g["hour"].mean(),
        "first_booking": g["Date"].min().dt.strftime("%Y-%m-%d"),
        "top_vehicle": g["Vehicle_Type"].agg(lambda s: s.value_counts().index[0]),
    })
    s = succ.groupby("Customer_ID").agg(avg_value=("Booking_Value", "mean"), avg_distance=("Ride_Distance", "mean"),
                                        total_value=("Booking_Value", "sum"))
    cust = cust.join(s)
    cust["has_success"] = cust["avg_value"].notna()
    cust["total_value"] = cust["total_value"].fillna(0)
    return cust[cust["n_bookings"] >= MIN_BOOKINGS].copy()


def name_clusters(profile: pd.DataFrame) -> dict[int, str]:
    """Names are derived from each learned cluster's profile relative to all clustered customers."""
    z = (profile[["n_bookings", "unfulfilled_rate", "avg_value", "avg_distance"]] -
         profile[["n_bookings", "unfulfilled_rate", "avg_value", "avg_distance"]].mean()) / \
        profile[["n_bookings", "unfulfilled_rate", "avg_value", "avg_distance"]].std(ddof=0).replace(0, 1)
    names, used = {}, set()
    for cid in profile.index:
        row = z.loc[cid]
        order = row.abs().sort_values(ascending=False).index.tolist()
        label = None
        for f in order:
            hi = row[f] > 0
            cand = {"n_bookings": "Frequent riders" if hi else "Occasional riders",
                    "unfulfilled_rate": "Cancellation-prone riders" if hi else "Reliable completers",
                    "avg_value": "High-value riders" if hi else "Low-value riders",
                    "avg_distance": "Long-distance riders" if hi else "Short-distance riders"}[f]
            if cand not in used:
                label = cand
                break
        label = label or f"Segment {cid + 1}"
        used.add(label)
        names[int(cid)] = label
    return names


def main() -> None:
    df = load_clean()
    cust = build_customers(df)
    med_v, med_d = cust["avg_value"].median(), cust["avg_distance"].median()
    cust["avg_value"] = cust["avg_value"].fillna(med_v)
    cust["avg_distance"] = cust["avg_distance"].fillna(med_d)
    cust["n_bookings_log"] = np.log1p(cust["n_bookings"])

    scaler = StandardScaler()
    Xs = scaler.fit_transform(cust[FEATURES])

    sil = {}
    for k in range(2, 9):
        km = KMeans(n_clusters=k, n_init=10, random_state=RANDOM_STATE).fit(Xs)
        sil[k] = float(silhouette_score(Xs, km.labels_, sample_size=min(6000, len(Xs)), random_state=RANDOM_STATE))
    best_k = max(sil, key=sil.get)
    km = KMeans(n_clusters=best_k, n_init=20, random_state=RANDOM_STATE).fit(Xs)
    cust["cluster"] = km.labels_
    final_sil = float(silhouette_score(Xs, km.labels_))

    pca = PCA(n_components=2, random_state=RANDOM_STATE).fit(Xs)
    xy = pca.transform(Xs)
    cust["pc1"], cust["pc2"] = xy[:, 0], xy[:, 1]

    profile = cust.groupby("cluster").agg(
        customers=("n_bookings", "size"), n_bookings=("n_bookings", "mean"), avg_value=("avg_value", "mean"),
        avg_distance=("avg_distance", "mean"), unfulfilled_rate=("unfulfilled_rate", "mean"),
        avg_hour=("avg_hour", "mean"), total_value=("total_value", "mean"), active_days=("active_days", "mean"))
    names = name_clusters(profile)
    cust["segment"] = cust["cluster"].map(names)

    out = cust.reset_index(drop=True)  # drops Customer_ID: identifiers are not published
    out = out[["cluster", "segment", "n_bookings", "active_days", "unfulfilled_rate", "avg_value", "avg_distance",
               "avg_hour", "total_value", "top_vehicle", "first_booking", "has_success", "pc1", "pc2"]]
    out.to_parquet(ARTIFACT_DIR / "segmentation_customers.parquet", index=False)

    joblib.dump({"scaler": scaler, "kmeans": km, "pca": pca, "features": FEATURES, "version": VERSION,
                 "names": names}, artifacts.model_path("segmentation"))

    prof = profile.reset_index().to_dict(orient="records")
    for r in prof:
        r["name"] = names[int(r["cluster"])]
        r["cluster"] = int(r["cluster"])
        r["customers"] = int(r["customers"])
    artifacts.save_metrics("segmentation", {
        "version": VERSION, "n_clusters": int(best_k), "silhouette": final_sil, "silhouette_by_k": sil,
        "selection_rule": "highest silhouette over k=2..8 (sampled)", "min_bookings": MIN_BOOKINGS,
        "customers_total": int(df["Customer_ID"].nunique()), "customers_clustered": int(len(out)),
        "cluster_sizes": {names[int(c)]: int(n) for c, n in profile["customers"].items()},
        "profiles": prof, "features": FEATURES,
        "pca_explained_variance": [float(v) for v in pca.explained_variance_ratio_],
        "interpretability_notes": [
            f"Only customers with at least {MIN_BOOKINGS} bookings are clustered "
            f"({len(out):,} of {df['Customer_ID'].nunique():,}).",
            "Segment names are generated from each cluster's profile relative to the other clusters; "
            "review them before presenting.",
            "A low silhouette score indicates overlapping groups: treat segments as soft tendencies.",
            "The 2-D scatter uses PCA of the scaled features, for visualisation only.",
        ],
    })
    print(f"k={best_k} silhouette={final_sil:.3f} clustered={len(out)}")
    print(pd.DataFrame(prof)[["name", "customers", "n_bookings", "avg_value", "avg_distance", "unfulfilled_rate"]].round(2))


if __name__ == "__main__":
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    main()
