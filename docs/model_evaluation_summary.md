# Model evaluation summary

_Generated from `artifacts/*_metrics.json` by `backend/training/summarize.py`. All numbers are on held-out data unless stated._

## 1. Cancellation prediction (classification)
Target: booking did not result in a ride (cancelled by customer/driver or no driver found). Base rate 0.379. Split: stratified 60/20/20. Threshold 0.436 (maximises F1 on the validation split).

| Model | Precision | Recall | F1 | PR-AUC |
|---|---|---|---|---|
| Baseline (always predicts the base rate) | 0.000 | 0.000 | 0.000 | 0.379 |
| Logistic Regression | 0.379 | 1.000 | 0.550 | 0.380 |
| Random Forest | 0.379 | 0.999 | 0.550 | 0.381 |

Selected: **Random Forest**. Clearly beats the baseline: **False**.

- Only booking-time features are used, so the model can only learn route, vehicle and time patterns.
- PR-AUC close to the base rate means those features carry little signal in this dataset; predicted probabilities should be read as weak estimates, not decisions.
- One month of data (July 2024): no seasonality or long-term behaviour can be learned.

## 2. Fare prediction (regression)
Rides used: 63,967. Split: random 60/20/20.

| Model | MAE (INR) | RMSE (INR) | R2 |
|---|---|---|---|
| Baseline: global mean | 350.8 | 537.5 | -0.0000 |
| Baseline: mean per vehicle type | 350.9 | 537.6 | -0.0001 |
| Linear Regression | 351.0 | 538.4 | -0.0030 |
| Random Forest | 351.7 | 538.5 | -0.0037 |

Selected: **Linear Regression**. Defensible fare estimate: **False**. 80% interval test coverage 0.80.

- Booking value in this dataset is almost uncorrelated with distance, vehicle type and time (distance correlation = 0.002).
- When R-squared is near zero the model is no better than predicting the average; the output is an illustration of the pipeline, not a fare quote.
- Only fulfilled rides with a recorded distance are used for training.

## 3. Customer segmentation (K-Means)
k = 7, silhouette = 0.310, 7,954 of 94,544 customers clustered (those with at least 2 bookings).

| Segment | Customers | Avg bookings | Avg value (INR) | Avg distance (km) | Unfulfilled rate |
|---|---|---|---|---|---|
| Short-distance riders | 1,597 | 2.00 | 420 | 14.7 | 0.18 |
| Cancellation-prone riders | 1,670 | 2.00 | 397 | 22.0 | 0.99 |
| Frequent riders | 497 | 3.06 | 530 | 23.0 | 0.40 |
| High-value riders | 453 | 2.00 | 1930 | 23.2 | 0.18 |
| Long-distance riders | 1,876 | 2.00 | 435 | 37.2 | 0.21 |
| Reliable completers | 1,708 | 2.00 | 428 | 14.3 | 0.19 |
| Occasional riders | 153 | 2.00 | 453 | 21.3 | 0.36 |

- Only customers with at least 2 bookings are clustered (7,954 of 94,544).
- Segment names are generated from each cluster's profile relative to the other clusters; review them before presenting.
- A low silhouette score indicates overlapping groups: treat segments as soft tendencies.
- The 2-D scatter uses PCA of the scaled features, for visualisation only.

## 4. Demand forecast (hourly)
Test period: 2024-07-25 to 2024-07-31 (168 h). rolling-origin, 24h recursive forecasts from midnight of each test day.

| Method | MAE | RMSE |
|---|---|---|
| Baseline: day-of-week x hour average | 11.69 | 14.48 |
| Random Forest (lags + calendar) | 10.05 | 12.45 |
| Baseline: overall hourly mean | 9.97 | 12.56 |

Random Forest beats all baselines by >2%: **False**.

- Only 31 days of history: weekly patterns have been seen four times, monthly or yearly seasonality never.
- Hourly counts are noisy; if the model does not beat the historical-average baseline, the calendar pattern is the most that can be claimed.
- Forecasts beyond 24-72 hours are recursive and accumulate error.

## 5. Anomaly detection (Isolation Forest)
Flagged 1,031 of 103,024 records (1.00%), contamination 0.01. Seed stability (Jaccard) 0.84. Manual review results: not available.

- No ground-truth labels exist, so accuracy cannot be computed. Flagged records have not been manually reviewed.
- Isolation Forest flags statistically rare combinations; a flag is not evidence of fraud or misconduct.
- Contamination (1%) is a chosen review budget, not an estimate of the true anomaly rate.
