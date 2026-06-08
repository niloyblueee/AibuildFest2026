# Backend (Hackathon Demo)

This backend trains a simple tabular ML model on the synthetic dataset and serves predictions via FastAPI.

It now prefers a Railway MySQL database as the main persistent store. The CSV in `data/` is only used as a seed when the database is empty or unavailable locally.

## Quick start

Teammate Run Steps (after clone)
Backend

cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

(copy paste .env in backend) line 33 :)


python train.py
uvicorn app.main:app --reload --port 8000 #do cd backend first




Frontend

cd frontend
npm install

(also .env for frontend-> only 1 line-> VITE_API_BASE=http://localhost:8000)

npm run dev

## Environment variables

Set these in your shell or in a .env file:

- DATABASE_URL=mysql+pymysql://USER:PASSWORD@HOST:PORT/DATABASE?charset=utf8mb4
- or the Railway MySQL variables: MYSQLHOST, MYSQLPORT, MYSQLDATABASE, MYSQLUSER, MYSQLPASSWORD
- DATA_PATH=data\bd64_measles_training_news_bootstrap_2026-05-27.csv
- MODEL_PATH=models\measles_model.joblib
- META_PATH=models\measles_model_meta.json
- OPENAI_API_KEY=your_key_here

On first startup with MySQL configured, the app copies the CSV seed into a table named `measles_observations`. Each scrape run appends raw articles to `scraped_articles` and updates the main dataset table so the latest signals stay in MySQL.

Quick DB checks (after you set Railway env vars and redeploy):

- Health endpoint: `GET /health`
- DB status endpoint: `GET /db/status` — returns `{configured, connected, tables, measles_rows, scraped_rows}` when reachable.
- One-off migration script (run inside `backend` with env vars present):

```bash
./.venv/bin/python scripts/migrate_seed_to_db.py
```

This script will copy the CSV into the DB (if not already present) and archive the CSV under `data/backups/` as a gzipped file.

## Example request

POST http://localhost:8000/predict

{
  "district": "Dhaka",
  "coverage_children_pct": 85,
  "coverage_population_pct": 75,
  "include_daily": true,
  "include_hourly": true
}

## Notes
- Hourly outputs are derived using a diurnal curve, not trained.
- This is a demo for hackathon presentation and stakeholder storytelling.
