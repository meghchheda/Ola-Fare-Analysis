"""Consistent loading of trained artifacts and evaluation results from MODEL_ARTIFACT_DIR."""
from __future__ import annotations

import json
from functools import lru_cache
from typing import Any

import joblib

from .config import ARTIFACT_DIR

MODELS = {
    "cancellation": {"title": "Ride Cancellation Prediction", "kind": "Supervised classification"},
    "fare": {"title": "Fare Prediction", "kind": "Supervised regression"},
    "segmentation": {"title": "Customer Segmentation", "kind": "Unsupervised clustering"},
    "forecast": {"title": "Ride Demand Forecasting", "kind": "Supervised time-series forecasting"},
    "anomaly": {"title": "Anomalous Ride Detection", "kind": "Unsupervised anomaly detection"},
}


def model_path(name: str):
    return ARTIFACT_DIR / f"{name}_model.joblib"


def metrics_path(name: str):
    return ARTIFACT_DIR / f"{name}_metrics.json"


@lru_cache(maxsize=None)
def load_model(name: str) -> Any | None:
    p = model_path(name)
    if not p.exists():
        return None
    # Artifacts are generated locally by backend/training/*.py and are trusted.
    return joblib.load(p)


@lru_cache(maxsize=None)
def load_metrics(name: str) -> dict | None:
    p = metrics_path(name)
    if not p.exists():
        return None
    return json.loads(p.read_text())


def save_metrics(name: str, payload: dict) -> None:
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    metrics_path(name).write_text(json.dumps(payload, indent=2, default=float))


def status(name: str) -> str:
    has_model = model_path(name).exists()
    has_metrics = metrics_path(name).exists()
    if has_model and has_metrics:
        return "Trained and evaluated"
    if has_model:
        return "Trained but not evaluated"
    return "Not yet trained"


def clear_cache() -> None:
    load_model.cache_clear()
    load_metrics.cache_clear()
