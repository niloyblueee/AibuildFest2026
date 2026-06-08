"""Migrate seed CSV into the configured MySQL database and archive the CSV.

Usage:
  python scripts/migrate_seed_to_db.py

This will call the backend `ensure_seed_data()` logic (which loads the CSV into
`measles_observations`) and then move the CSV to `data/backups/seed_backup_<ts>.csv.gz`.

Run this locally or via Railway one-off with the same env vars set.
"""
from pathlib import Path
import gzip
import shutil
import sys
from datetime import datetime

# Add the backend directory to sys.path so we can import 'app'
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import ensure_seed_data
from app.config import DATA_PATH, BACKUP_PATH


def main():
    print("Starting seed migration to DB...")
    ok = ensure_seed_data()
    if not ok:
        print("Database not configured or seeding failed. Check env vars and connection.")
        sys.exit(2)

    # archive the CSV safely
    csv = Path(DATA_PATH)
    if not csv.exists():
        print(f"No CSV at {csv}, nothing to archive.")
        return

    backup_dir = Path(BACKUP_PATH)
    backup_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    target = backup_dir / f"seed_backup_{ts}.csv.gz"

    print(f"Archiving {csv} to {target}...")
    with csv.open("rb") as f_in, gzip.open(target, "wb") as f_out:
        shutil.copyfileobj(f_in, f_out)

    print("Migration complete. CSV archived to:", target)


if __name__ == "__main__":
    main()
