"""Train all five models in sequence, then write docs/model_evaluation_summary.md.
Run from the project root:  python -m backend.training.train_all
Training is deliberately separate from the web server: the API never trains on request."""
from __future__ import annotations

from backend.training import (summarize, train_anomaly, train_cancellation, train_fare, train_forecast,
                              train_segmentation)

if __name__ == "__main__":
    for name, mod in [("cancellation", train_cancellation), ("fare", train_fare), ("segmentation", train_segmentation),
                      ("forecast", train_forecast), ("anomaly", train_anomaly)]:
        print(f"\n=== Training {name} ===")
        mod.main()
    summarize.main()
