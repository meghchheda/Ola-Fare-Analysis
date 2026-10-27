"""FastAPI application. Run from the project root: uvicorn backend.app.main:app --reload"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Literal

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from . import artifacts as art
from .config import (APP_VERSION, ARTIFACT_DIR, CORS_ORIGINS, DATASET_PATH, POWER_BI_URL, REPORT_FILE_PATH, REPORT_URL, ROOT)
from .data import COLUMN_DESCRIPTIONS, DAY_NAMES, cleaning_log, date_range, load_clean, load_raw

app = FastAPI(title="OLA Ride Insights API", version=APP_VERSION)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _dataset_df() -> pd.DataFrame:
    if not DATASET_PATH.exists():
        raise HTTPException(503, f"Dataset not found at the configured DATASET_PATH ({DATASET_PATH.name}). See README.")
    return load_clean()


def _need_model(name: str):
    m = art.load_model(name)
    if m is None:
        raise HTTPException(503, f"The {art.MODELS[name]['title']} model has not been trained yet. "
                                 f"Run: python -m backend.training.train_{name if name != 'anomaly' else 'anomaly'}")
    return m


# --------------------------------------------------------------------------- health / config / file downloads
@app.get("/api/health")
def health():
    checks = {
        "dataset_file": DATASET_PATH.exists(),
        "artifact_dir": ARTIFACT_DIR.exists(),
        **{f"model_{k}": art.model_path(k).exists() for k in art.MODELS},
    }
    return {"status": "ok" if checks["dataset_file"] else "degraded", "version": APP_VERSION, "checks": checks}


def _report_file() -> str | None:
    if not REPORT_FILE_PATH:
        return None
    p = (ROOT / REPORT_FILE_PATH) if not os.path.isabs(REPORT_FILE_PATH) else None
    p = p or Path(REPORT_FILE_PATH)
    return str(p) if p.exists() and p.is_file() else None


def _powerbi_file() -> str | None:
    """Resolves the local Power BI .pbix file from docs folder or direct path."""
    candidates = [
        ROOT / "docs" / "Ola_Data_Visualization.pbix",
        ROOT / "Ola_Data_Visualization.pbix",
        Path(r"C:\Users\meghc\Documents\Megh MPSTME\3rd Semester\DV\Ola_Data_Visualization.pbix"),
    ]
    for p in candidates:
        if p.exists() and p.is_file():
            return str(p)
    return None


@app.get("/api/config")
def config():
    rf = _report_file()
    pf = _powerbi_file()
    return {
        "power_bi_url": POWER_BI_URL or None,
        "powerbi_file_available": pf is not None,
        "powerbi_file_name": os.path.basename(pf) if pf else None,
        "report_url": REPORT_URL or None,
        "report_file_available": rf is not None,
        "report_file_name": os.path.basename(rf) if rf else None,
        "version": APP_VERSION,
    }


@app.get("/api/report/file")
def report_file():
    rf = _report_file()
    if not rf:
        raise HTTPException(404, "No report file has been configured. Set REPORT_FILE_PATH in .env or place it in docs/.")
    return FileResponse(
        rf, 
        filename=os.path.basename(rf), 
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )


@app.get("/api/powerbi/file")
def powerbi_file():
    pf = _powerbi_file()
    if not pf:
        raise HTTPException(404, "Power BI file (Ola_Data_Visualization.pbix) not found in project docs/ or specified directory.")
    return FileResponse(
        pf, 
        filename=os.path.basename(pf), 
        media_type="application/octet-stream"
    )


# --------------------------------------------------------------------------- overview
def _slice(df: pd.DataFrame, start: str | None, end: str | None) -> pd.DataFrame:
    if start:
        df = df[df["Date"] >= pd.Timestamp(start)]
    if end:
        df = df[df["Date"] < pd.Timestamp(end) + pd.Timedelta(days=1)]
    return df


def _kpis(d: pd.DataFrame) -> dict:
    s = d[d["is_success"] == 1]
    n = len(d)
    return {"total_bookings": int(n), "successful_rides": int(len(s)),
            "cancellation_rate": float(d["Booking_Status"].isin(["Canceled by Customer", "Canceled by Driver"]).mean()) if n else 0.0,
            "unfulfilled_rate": float(d["is_unfulfilled"].mean()) if n else 0.0,
            "successful_booking_value": float(s["Booking_Value"].sum()),
            "avg_ride_distance": float(s["Ride_Distance"].mean()) if len(s) else 0.0}


@app.get("/api/overview")
def overview(start: str | None = None, end: str | None = None):
    df = _dataset_df()
    try:
        d = _slice(df, start, end)
    except Exception:
        raise HTTPException(422, "start and end must be dates in YYYY-MM-DD format.")
    if d.empty:
        raise HTTPException(404, "No bookings fall in the selected date range.")
    kpis = _kpis(d)

    # trend only when an equally long preceding period exists inside the dataset
    trend = None
    lo, hi = d["Date"].min().normalize(), d["Date"].max().normalize()
    days = (hi - lo).days + 1
    prev_lo, prev_hi = lo - pd.Timedelta(days=days), lo - pd.Timedelta(days=1)
    if prev_lo >= df["Date"].min().normalize():
        prev = _kpis(_slice(df, str(prev_lo.date()), str(prev_hi.date())))
        trend = {"period": f"{prev_lo.date()} to {prev_hi.date()}",
                 **{k: (kpis[k] - prev[k]) / prev[k] if prev[k] else None for k in kpis}}

    daily = d.groupby("day").agg(bookings=("Booking_ID", "size"), successful=("is_success", "sum")).reset_index()
    daily["day"] = daily["day"].dt.strftime("%Y-%m-%d")
    top = lambda col, n=8: (d[col].value_counts().head(n).rename_axis("name").reset_index(name="count").to_dict("records"))
    s = d[d["is_success"] == 1]
    return {
        "range": {"start": str(d["Date"].min().date()), "end": str(d["Date"].max().date())},
        "kpis": kpis, "trend": trend, "daily": daily.to_dict("records"),
        "status": top("Booking_Status"), "vehicles": top("Vehicle_Type"),
        "payments": s["Payment_Method"].fillna("Unknown").value_counts().rename_axis("name").reset_index(name="count").to_dict("records"),
        "top_pickups": top("Pickup_Location"), "top_drops": top("Drop_Location"),
        "hourly": d.groupby("hour").size().rename("bookings").reset_index().to_dict("records"),
        "source": "real dataset",
    }


# --------------------------------------------------------------------------- model status / performance
@app.get("/api/models/status")
def models_status():
    out = []
    for k, meta in art.MODELS.items():
        out.append({"key": k, **meta, "status": art.status(k),
                    "version": (art.load_metrics(k) or {}).get("version")})
    return {"models": out, "trained": sum(1 for m in out if m["status"] == "Trained and evaluated")}


@app.get("/api/models/performance")
def models_performance():
    return {k: art.load_metrics(k) for k in art.MODELS}


# --------------------------------------------------------------------------- cancellation
class CancellationIn(BaseModel):
    vehicle_type: str
    pickup_location: str
    drop_location: str
    hour: int = Field(ge=0, le=23)
    day_of_week: int = Field(ge=0, le=6, description="0 = Monday")
    day_of_month: int = Field(default=15, ge=1, le=31)


def _check_choice(value: str, choices: list[str], label: str):
    if value not in choices:
        raise HTTPException(422, f"Unknown {label}: '{value}'.")


@app.get("/api/options")
def options():
    c = art.load_model("cancellation") or art.load_model("fare")
    if c:
        ch = c["categorical_choices"]
    else:
        d = _dataset_df()
        ch = {k: sorted(d[k].unique().tolist()) for k in ["Vehicle_Type", "Pickup_Location", "Drop_Location"]}
    return {"vehicle_types": ch["Vehicle_Type"], "locations": ch["Pickup_Location"], "days": DAY_NAMES,
            "distance_range": (art.load_model("fare") or {}).get("distance_range", [1, 49])}


def _explain(pipe, row: dict, grid: dict, cat_choices: dict, p: float) -> list[dict]:
    """Model-agnostic explanation: how much does fixing each input at the user's value move the
    probability relative to averaging that input over all its possible values (partial-dependence style)."""
    out = []
    feats = {"Vehicle_Type": cat_choices["Vehicle_Type"], "Pickup_Location": cat_choices["Pickup_Location"],
             "Drop_Location": cat_choices["Drop_Location"], **{k: v for k, v in grid.items()}}
    for f, values in feats.items():
        frames = pd.DataFrame([{**row, f: v} for v in values])
        if "same_area" in frames:
            frames["same_area"] = (frames["Pickup_Location"] == frames["Drop_Location"]).astype(int)
        avg = float(pipe.predict(frames).mean() if not hasattr(pipe, "predict_proba") else pipe.predict_proba(frames)[:, 1].mean())
        out.append({"feature": f, "value": row[f], "effect": p - avg})
    return sorted(out, key=lambda x: -abs(x["effect"]))


@app.post("/api/predict/cancellation")
def predict_cancellation(body: CancellationIn):
    bundle = _need_model("cancellation")
    ch = bundle["categorical_choices"]
    _check_choice(body.vehicle_type, ch["Vehicle_Type"], "vehicle type")
    _check_choice(body.pickup_location, ch["Pickup_Location"], "pickup location")
    _check_choice(body.drop_location, ch["Drop_Location"], "drop location")
    row = {"Vehicle_Type": body.vehicle_type, "Pickup_Location": body.pickup_location, "Drop_Location": body.drop_location,
           "hour": body.hour, "dow": body.day_of_week, "day_of_month": body.day_of_month,
           "same_area": int(body.pickup_location == body.drop_location)}
    pipe = bundle["pipeline"]
    p = float(pipe.predict_proba(pd.DataFrame([row])[bundle["features"]])[:, 1][0])
    thr, base = bundle["threshold"], bundle["base_rate"]
    risk = "Elevated" if p >= thr else ("Typical" if p >= base * 0.9 else "Lower than typical")
    metrics = art.load_metrics("cancellation") or {}
    contrib = _explain(pipe, row, bundle["partial_grid"], ch, p)
    for c in contrib:
        c["label"] = {"hour": "Booking hour", "dow": "Day of week", "day_of_month": "Day of month",
                      "Vehicle_Type": "Vehicle type", "Pickup_Location": "Pickup", "Drop_Location": "Drop-off"}.get(c["feature"], c["feature"])
        if c["feature"] == "dow":
            c["value"] = DAY_NAMES[int(c["value"])]
    return {"probability": p, "predicted_class": "Likely not to happen" if p >= thr else "Not flagged as likely to cancel",
            "flagged": p >= thr, "threshold": thr, "base_rate": base, "risk_category": risk,
            "model": bundle["model_name"], "model_version": bundle["version"],
            "factors": contrib[:6], "beats_baseline": metrics.get("beats_baseline"),
            "disclaimer": "Model estimate based on historical patterns, not a guarantee. Outcome: ride cancelled or no driver found."}


# --------------------------------------------------------------------------- fare
class FareIn(BaseModel):
    vehicle_type: str
    pickup_location: str
    drop_location: str
    distance_km: int = Field(ge=1, le=49)
    hour: int = Field(ge=0, le=23)
    day_of_week: int = Field(ge=0, le=6)
    day_of_month: int = Field(default=15, ge=1, le=31)


@app.post("/api/predict/fare")
def predict_fare(body: FareIn):
    b = _need_model("fare")
    ch = b["categorical_choices"]
    _check_choice(body.vehicle_type, ch["Vehicle_Type"], "vehicle type")
    _check_choice(body.pickup_location, ch["Pickup_Location"], "pickup location")
    _check_choice(body.drop_location, ch["Drop_Location"], "drop location")
    row = {"Vehicle_Type": body.vehicle_type, "Pickup_Location": body.pickup_location, "Drop_Location": body.drop_location,
           "Ride_Distance": body.distance_km, "hour": body.hour, "dow": body.day_of_week, "day_of_month": body.day_of_month}
    pipe = b["pipeline"]
    pred = float(pipe.predict(pd.DataFrame([row])[b["features"]])[0])
    iv = b["interval"]
    base = float(b["baseline_vehicle_mean"].get(body.vehicle_type, b["baseline_global_mean"]))
    contrib = _explain(pipe, row, b["partial_grid"], ch, pred)
    for c in contrib:
        c["label"] = {"hour": "Booking hour", "dow": "Day of week", "day_of_month": "Day of month", "Ride_Distance": "Distance",
                      "Vehicle_Type": "Vehicle type", "Drop_Location": "Drop-off"}.get(c["feature"], c["feature"])
        if c["feature"] == "dow":
            c["value"] = DAY_NAMES[int(c["value"])]
    m = art.load_metrics("fare") or {}
    return {"predicted_fare": max(pred, 0), "interval": {"low": max(pred + iv["lower"], 0), "high": pred + iv["upper"],
                                                          "level": iv["level"], "method": iv["method"], "test_coverage": iv["test_coverage"]},
            "baseline_fare": base, "model": b["model_name"], "model_version": b["version"], "factors": contrib[:6],
            "defensible": b["reliable"], "metrics": (m.get("results") or {}).get(b["model_name"]),
            "warning": None if b["reliable"] else
            "In this dataset booking value does not depend measurably on distance, vehicle or time (R² ≈ 0). "
            "This number is effectively the historical average and must not be read as a fare quote."}


# --------------------------------------------------------------------------- segments
@app.get("/api/segments")
def segments(cluster: int | None = None, min_bookings: int = Query(2, ge=1, le=50), vehicle: str | None = None,
             first_booking_from: str | None = None, first_booking_to: str | None = None, max_points: int = Query(2500, le=8000)):
    _need_model("segmentation")
    metrics = art.load_metrics("segmentation")
    p = ARTIFACT_DIR / "segmentation_customers.parquet"
    if not p.exists() or not metrics:
        raise HTTPException(503, "Segmentation results are missing. Run the segmentation training script.")
    c = pd.read_parquet(p)
    c = c[c["n_bookings"] >= min_bookings]
    if cluster is not None:
        c = c[c["cluster"] == cluster]
    if vehicle:
        c = c[c["top_vehicle"] == vehicle]
    if first_booking_from:
        c = c[c["first_booking"] >= first_booking_from]
    if first_booking_to:
        c = c[c["first_booking"] <= first_booking_to]
    prof = (c.groupby(["cluster", "segment"]).agg(
        customers=("n_bookings", "size"), avg_bookings=("n_bookings", "mean"), avg_value=("avg_value", "mean"),
        avg_distance=("avg_distance", "mean"), unfulfilled_rate=("unfulfilled_rate", "mean"), avg_hour=("avg_hour", "mean"),
        total_value=("total_value", "mean")).reset_index().round(3).to_dict("records"))
    pts = c.sample(min(len(c), max_points), random_state=1) if len(c) else c
    return {"k": metrics["n_clusters"], "silhouette": metrics["silhouette"], "customers_in_view": int(len(c)),
            "customers_clustered": metrics["customers_clustered"], "customers_total": metrics["customers_total"],
            "min_bookings_trained": metrics["min_bookings"], "profiles": prof,
            "points": pts[["pc1", "pc2", "cluster", "segment", "n_bookings", "avg_value", "avg_distance", "unfulfilled_rate"]].round(3).to_dict("records"),
            "pca_explained_variance": metrics["pca_explained_variance"], "notes": metrics["interpretability_notes"],
            "vehicles": sorted(pd.read_parquet(p)["top_vehicle"].unique().tolist())}


# --------------------------------------------------------------------------- forecast
@app.get("/api/forecast")
def forecast(horizon: int = Query(24), agg: Literal["hourly", "daily"] = "hourly",
             history_days: int = Query(7, ge=1, le=31)):
    from backend.training.train_forecast import baseline_predict, recursive_forecast
    if horizon not in (24, 48, 72):
        raise HTTPException(422, "horizon must be 24, 48 or 72 hours.")
    b = _need_model("forecast")
    metrics = art.load_metrics("forecast")
    hp = ARTIFACT_DIR / "forecast_history.parquet"
    if not hp.exists() or not metrics:
        raise HTTPException(503, "Forecast history is missing. Run the forecast training script.")
    hist = pd.read_parquet(hp)["bookings"]
    if b["use_random_forest"]:
        fc = recursive_forecast(b["model"], hist, horizon)
    else:
        idx = pd.date_range(hist.index[-1] + pd.Timedelta(hours=1), periods=horizon, freq="h")
        fc = pd.Series(baseline_predict(b["baseline_table"], idx), index=idx)
    lo_q, hi_q = b["interval"]
    h = hist[hist.index >= hist.index[-1] - pd.Timedelta(days=history_days) + pd.Timedelta(hours=1)]
    if agg == "daily":
        hd = h.resample("D").sum()
        fd = fc.resample("D").sum()
        hist_pts = [{"t": str(i.date()), "actual": float(v)} for i, v in hd.items()]
        fc_pts = [{"t": str(i.date()), "predicted": float(v)} for i, v in fd.items()]
        note = "Daily totals; forecast days may be partial. Intervals are only estimated for hourly values."
    else:
        hist_pts = [{"t": i.strftime("%Y-%m-%d %H:%M"), "actual": float(v)} for i, v in h.items()]
        fc_pts = [{"t": i.strftime("%Y-%m-%d %H:%M"), "predicted": float(v), "low": max(float(v) + lo_q, 0), "high": float(v) + hi_q}
                  for i, v in fc.items()]
        note = None
    peak = fc.idxmax()
    return {"agg": agg, "horizon_hours": horizon, "history": hist_pts, "forecast": fc_pts,
            "forecast_starts": (hist.index[-1] + pd.Timedelta(hours=1)).strftime("%Y-%m-%d %H:%M"),
            "summary": {"total": float(fc.sum()), "average_per_hour": float(fc.mean()),
                        "peak_interval": peak.strftime("%a %d %b, %H:00"), "peak_value": float(fc.max())},
            "metrics": {"selected": metrics["selected"], "results": metrics["results"], "beats_all_baselines": metrics.get("beats_all_baselines")},
            "interval": metrics["interval"], "history_range": metrics["history"], "note": note,
            "mean_hourly_bookings": metrics["mean_hourly_bookings"]}


# --------------------------------------------------------------------------- anomalies
@app.get("/api/anomalies")
def anomalies(status: str | None = None, vehicle: str | None = None, min_score: float | None = None,
              sort: Literal["score", "value", "distance"] = "score", limit: int = Query(50, le=500), offset: int = Query(0, ge=0)):
    _need_model("anomaly")
    metrics = art.load_metrics("anomaly")
    fp, sp = ARTIFACT_DIR / "anomaly_flagged.parquet", ARTIFACT_DIR / "anomaly_scatter.parquet"
    if not fp.exists() or not sp.exists() or not metrics:
        raise HTTPException(503, "Anomaly results are missing. Run the anomaly training script.")
    f = pd.read_parquet(fp)
    all_status, all_veh = sorted(f["Booking_Status"].unique().tolist()), sorted(f["Vehicle_Type"].unique().tolist())
    if status:
        f = f[f["Booking_Status"] == status]
    if vehicle:
        f = f[f["Vehicle_Type"] == vehicle]
    if min_score is not None:
        f = f[f["anomaly_score"] >= min_score]
    key = {"score": "anomaly_score", "value": "Booking_Value", "distance": "Ride_Distance"}[sort]
    f = f.sort_values(key, ascending=False)
    sc = pd.read_parquet(sp)
    return {"records_analyzed": metrics["records_analyzed"], "flagged": metrics["flagged"], "flagged_pct": metrics["flagged_pct"],
            "matching": int(len(f)), "records": f.iloc[offset: offset + limit].round(4).to_dict("records"),
            "histogram": metrics["score_histogram"], "threshold": metrics["score_threshold"],
            "scatter": sc.round(3).to_dict("records"), "statuses": all_status, "vehicles": all_veh,
            "contamination": metrics["contamination"], "stability": metrics["stability_jaccard_mean"],
            "disclaimer": "Flagged records are statistically unusual, not confirmed fraud or misconduct."}


@app.get("/api/anomalies/{booking_id}")
def anomaly_detail(booking_id: str):
    df = _dataset_df()
    r = df[df["Booking_ID"] == booking_id]
    if r.empty:
        raise HTTPException(404, "Booking not found.")
    rec = r.iloc[0].drop(labels=["Customer_ID", "day", "is_success", "is_unfulfilled"], errors="ignore")
    attrs = {k: (None if pd.isna(v) else (v.strftime("%Y-%m-%d %H:%M") if hasattr(v, "strftime") else (v.item() if hasattr(v, "item") else v)))
             for k, v in rec.items()}
    fp = ARTIFACT_DIR / "anomaly_flagged.parquet"
    extra = {}
    if fp.exists():
        f = pd.read_parquet(fp)
        m = f[f["Booking_ID"] == booking_id]
        if not m.empty:
            extra = {"anomaly_score": float(m.iloc[0]["anomaly_score"]), "unusual_values": m.iloc[0]["unusual_values"]}
    return {"booking_id": booking_id, "attributes": attrs, **extra}


# --------------------------------------------------------------------------- dataset & methodology
@app.get("/api/dataset")
def dataset_info():
    raw, clean = load_raw(), _dataset_df()
    start, end = date_range()
    missing = [{"column": c, "missing": int(raw[c].isna().sum()), "pct": float(raw[c].isna().mean() * 100)} for c in raw.columns]
    dictionary = [{"column": c, "dtype": str(raw[c].dtype), "description": COLUMN_DESCRIPTIONS.get(c, ""),
                   "missing_pct": float(raw[c].isna().mean() * 100), "distinct": int(raw[c].nunique())} for c in raw.columns]
    return {"file": DATASET_PATH.name, "provenance": "OLA bookings export supplied with the project (Bangalore areas, July 2024). "
            "The original collection process is not documented in the file; the data appears synthetic or heavily anonymised.",
            "rows": int(len(raw)), "columns": int(raw.shape[1]), "rows_after_cleaning": int(len(clean)),
            "date_range": {"start": start, "end": end, "days": int((pd.Timestamp(end) - pd.Timestamp(start)).days + 1)},
            "missing": missing, "dictionary": dictionary, "cleaning": cleaning_log(),
            "model_features": {k: (art.load_metrics(k) or {}).get("features") for k in art.MODELS},
            "targets": {"cancellation": "is_unfulfilled (Canceled by Customer / Canceled by Driver / Driver Not Found)",
                        "fare": "Booking_Value (INR), fulfilled rides with distance",
                        "segmentation": "none (unsupervised)", "forecast": "bookings per hour", "anomaly": "none (unsupervised)"},
            "splits": {"cancellation": "stratified random 60/20/20 (threshold chosen on validation)",
                       "fare": "random 60/20/20 (calibration split for the interval)",
                       "segmentation": "none: descriptive whole-month clustering",
                       "forecast": "chronological: days 1-24 train, days 25-31 test, rolling-origin 24h",
                       "anomaly": "none: unsupervised; stability checked across seeds"},
            "limitations": ["Single month: no seasonality, trend or holiday effects can be learned.",
                            "Most features show no statistical relationship with the targets, so models cannot beat simple baselines.",
                            "Customer IDs are mostly unique (94,544 of 103,024 bookings), so customer history is very thin.",
                            "Ride distance, ratings, payment and turnaround times exist only after a ride happens and are excluded from pre-booking predictions."]}


@app.get("/")
def read_root():
    return {"status": "online", "message": "Ola Ride Insights API is running"}