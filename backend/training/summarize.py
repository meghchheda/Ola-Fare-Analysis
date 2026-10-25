"""Generate docs/model_evaluation_summary.md from the saved metrics files (never typed by hand)."""
from __future__ import annotations

from backend.app import artifacts as art
from backend.app.config import ROOT


def f(x, d=3):
    return "-" if x is None else f"{x:.{d}f}"


def main() -> None:
    L = ["# Model evaluation summary", "", "_Generated from `artifacts/*_metrics.json` by `backend/training/summarize.py`. "
         "All numbers are on held-out data unless stated._", ""]
    c = art.load_metrics("cancellation")
    if c:
        L += ["## 1. Cancellation prediction (classification)",
              f"Target: booking did not result in a ride (cancelled by customer/driver or no driver found). Base rate {f(c['base_rate'])}. "
              f"Split: {c['split']['strategy']}. Threshold {f(c['threshold'])} ({c['threshold_rule']}).", "",
              "| Model | Precision | Recall | F1 | PR-AUC |", "|---|---|---|---|---|"]
        L += [f"| {k} | {f(r['test']['precision'])} | {f(r['test']['recall'])} | {f(r['test']['f1'])} | {f(r['test']['pr_auc'])} |" for k, r in c["results"].items()]
        L += ["", f"Selected: **{c['selected_model']}**. Clearly beats the baseline: **{c['beats_baseline']}**.", ""] + [f"- {x}" for x in c["limitations"]] + [""]
    m = art.load_metrics("fare")
    if m:
        L += ["## 2. Fare prediction (regression)", f"Rides used: {m['rows_used']:,}. Split: {m['split']['strategy']}.", "",
              "| Model | MAE (INR) | RMSE (INR) | R2 |", "|---|---|---|---|"]
        L += [f"| {k} | {r['mae']:.1f} | {r['rmse']:.1f} | {r['r2']:.4f} |" for k, r in m["results"].items()]
        L += ["", f"Selected: **{m['selected_model']}**. Defensible fare estimate: **{m['defensible_estimate']}**. "
              f"80% interval test coverage {f(m['interval_test_coverage'], 2)}.", ""] + [f"- {x}" for x in m["limitations"]] + [""]
    s = art.load_metrics("segmentation")
    if s:
        L += ["## 3. Customer segmentation (K-Means)", f"k = {s['n_clusters']}, silhouette = {f(s['silhouette'])}, "
              f"{s['customers_clustered']:,} of {s['customers_total']:,} customers clustered (those with at least {s['min_bookings']} bookings).", "",
              "| Segment | Customers | Avg bookings | Avg value (INR) | Avg distance (km) | Unfulfilled rate |", "|---|---|---|---|---|---|"]
        L += [f"| {p['name']} | {p['customers']:,} | {p['n_bookings']:.2f} | {p['avg_value']:.0f} | {p['avg_distance']:.1f} | {p['unfulfilled_rate']:.2f} |" for p in s["profiles"]]
        L += [""] + [f"- {x}" for x in s["interpretability_notes"]] + [""]
    t = art.load_metrics("forecast")
    if t:
        L += ["## 4. Demand forecast (hourly)", f"Test period: {t['split']['test_start'][:10]} to {t['split']['test_end'][:10]} ({t['split']['test_hours']} h). {t['evaluation']}.", "",
              "| Method | MAE | RMSE |", "|---|---|---|"]
        L += [f"| {k} | {r['mae']:.2f} | {r['rmse']:.2f} |" for k, r in t["results"].items()]
        L += ["", f"Random Forest beats all baselines by >2%: **{t['beats_all_baselines']}**.", ""] + [f"- {x}" for x in t["limitations"]] + [""]
    a = art.load_metrics("anomaly")
    if a:
        L += ["## 5. Anomaly detection (Isolation Forest)", f"Flagged {a['flagged']:,} of {a['records_analyzed']:,} records ({a['flagged_pct']:.2f}%), "
              f"contamination {a['contamination']}. Seed stability (Jaccard) {f(a['stability_jaccard_mean'], 2)}. Manual review results: {a['review_results'] or 'not available'}.", ""]
        L += [f"- {x}" for x in a["limitations"]] + [""]
    out = ROOT / "docs" / "model_evaluation_summary.md"
    out.parent.mkdir(exist_ok=True)
    out.write_text("\n".join(L))
    print("Wrote", out)


if __name__ == "__main__":
    main()
