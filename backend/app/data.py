"""Reusable data loading and cleaning. Used by every training script and by the API."""
from __future__ import annotations

from functools import lru_cache

import numpy as np
import pandas as pd

from .config import DATASET_PATH

STATUS_SUCCESS = "Success"
# Rides that did not happen. "Driver Not Found" is included because, from the rider's
# point of view, the booking was not fulfilled.
UNFULFILLED = ["Canceled by Customer", "Canceled by Driver", "Driver Not Found"]
DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

COLUMN_DESCRIPTIONS = {
    "Date": "Booking timestamp (date and time, one-minute resolution).",
    "Time": "Booking time as 12-hour text; redundant with Date and dropped.",
    "Booking_ID": "Unique booking identifier.",
    "Booking_Status": "Outcome: Success, Canceled by Customer, Canceled by Driver, Driver Not Found.",
    "Customer_ID": "Pseudonymous customer identifier (used only for aggregation, never displayed).",
    "Vehicle_Type": "Vehicle category requested (7 categories).",
    "Pickup_Location": "Pickup area (50 areas).",
    "Drop_Location": "Drop-off area (50 areas).",
    "V_TAT": "Vehicle turnaround time. Only recorded for rides that happened (post-outcome).",
    "C_TAT": "Customer turnaround time. Only recorded for rides that happened (post-outcome).",
    "Canceled_Rides_by_Customer": "Customer cancellation reason (post-outcome, never a model input).",
    "Canceled_Rides_by_Driver": "Driver cancellation reason (post-outcome, never a model input).",
    "Incomplete_Rides": "Whether a started ride was left incomplete (post-outcome).",
    "Incomplete_Rides_Reason": "Reason for incomplete ride (post-outcome).",
    "Booking_Value": "Booking value in INR. Present for every row, including cancelled bookings.",
    "Payment_Method": "Payment method. Only recorded for rides that happened.",
    "Ride_Distance": "Distance in km. Recorded as 0 for every unfulfilled booking (post-outcome).",
    "Driver_Ratings": "Rating given to the driver (post-outcome).",
    "Customer_Rating": "Rating given to the customer (post-outcome).",
    "Vehicle Images": "Spreadsheet export artefact ('#NAME?'); dropped.",
}


@lru_cache(maxsize=1)
def load_raw() -> pd.DataFrame:
    return pd.read_csv(DATASET_PATH)


@lru_cache(maxsize=1)
def load_clean() -> pd.DataFrame:
    """Clean dataset with derived calendar columns. Cleaning decisions are documented in
    `cleaning_log()` and surfaced on the Dataset & Methodology page."""
    df = load_raw().copy()
    df = df.drop(columns=["Vehicle Images", "Time"], errors="ignore")
    df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
    df = df.dropna(subset=["Date"]).drop_duplicates(subset="Booking_ID")
    df["day"] = df["Date"].dt.normalize()
    df["hour"] = df["Date"].dt.hour
    df["dow"] = df["Date"].dt.dayofweek
    df["day_of_month"] = df["Date"].dt.day
    df["is_success"] = (df["Booking_Status"] == STATUS_SUCCESS).astype(int)
    df["is_unfulfilled"] = df["Booking_Status"].isin(UNFULFILLED).astype(int)
    for c in ["Vehicle_Type", "Pickup_Location", "Drop_Location", "Booking_Status"]:
        df[c] = df[c].astype(str).str.strip()
    return df.reset_index(drop=True)


def cleaning_log() -> list[str]:
    raw = load_raw()
    clean = load_clean()
    return [
        f"Dropped 'Vehicle Images' (every value is the spreadsheet error '#NAME?') and 'Time' (redundant with Date).",
        f"Parsed 'Date' as a timestamp; {len(raw) - len(clean)} rows removed for unparseable dates or duplicate Booking_IDs.",
        "Blank cells in outcome columns (ratings, payment method, turnaround times, cancellation reasons) are structural: "
        "they are only recorded when the corresponding event happened. They were NOT imputed with fabricated values.",
        "Ride_Distance is 0 for every unfulfilled booking, so it is treated as post-outcome and never used to predict cancellation.",
        "Fare modelling uses fulfilled rides only, because only they have a real, recorded ride distance.",
        "No outliers were removed; extreme values are instead surfaced by the anomaly model.",
    ]


def date_range() -> tuple[str, str]:
    df = load_clean()
    return df["Date"].min().strftime("%Y-%m-%d"), df["Date"].max().strftime("%Y-%m-%d")
