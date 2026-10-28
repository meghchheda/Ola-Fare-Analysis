"""Central configuration. Everything is read from environment variables (see .env.example)."""
from __future__ import annotations

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def _load_dotenv() -> None:
    env_file = ROOT / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_dotenv()


def _path(env_key: str, default: str) -> Path:
    p = Path(os.environ.get(env_key, default))
    return p if p.is_absolute() else (ROOT / p)


DATASET_PATH = _path("DATASET_PATH", "data/Bookings-100000-Rows.csv")
ARTIFACT_DIR = _path("MODEL_ARTIFACT_DIR", "artifacts")
DEFAULT_POWER_BI_URL = (
    "https://app.powerbi.com/view?r=eyJrIjoiNTc1YmYxOTctOWUwOC00Y2QwLTk2NWQtMzEwOTIwMGQxYTcwIiwidCI6ImQxZjE0MzQ4LWYxYjUtNGEwOS1hYzk5LTdlYmYyMTNjYmM4MSIsImMiOjEwfQ%3D%3D"
)
POWER_BI_URL = os.environ.get("POWER_BI_URL", DEFAULT_POWER_BI_URL).strip()
REPORT_URL = os.environ.get("REPORT_URL", "").strip()
REPORT_FILE_PATH = os.environ.get("REPORT_FILE_PATH", "docs/DV PROJECT REPORT.docx").strip()
default_cors = (
    "http://localhost:5173,"
    "http://127.0.0.1:5173,"
    "https://ola-fare-analysis.vercel.app,"
    "https://ola-fare-analysis-1.onrender.com"
)
raw_cors = os.environ.get("CORS_ORIGINS", default_cors)
if raw_cors.strip() == "*":
    CORS_ORIGINS = ["*"]
else:
    CORS_ORIGINS = [o.strip() for o in raw_cors.split(",") if o.strip()]
APP_VERSION = "1.0.0"
RANDOM_STATE = 42


from pathlib import Path

REPORT_PATH = Path(r"C:\Users\meghc\Documents\Megh MPSTME\3rd Semester\DV\DV PROJECT REPORT.docx")
POWERBI_PATH = Path(r"C:\Users\meghc\Documents\Megh MPSTME\3rd Semester\DV\Ola_Data_Visualization.pbix")