# Backend (Hackathon Demo)

This backend trains a simple tabular ML model on the synthetic dataset and serves predictions via FastAPI.

## Quick start

Teammate Run Steps (after clone)
Backend

cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

(copy paste .env in backend)

python train.py
uvicorn app.main:app --reload --port 8000




Frontend

cd frontend
npm install

(Optional) set API base:
setx VITE_API_BASE http://127.0.0.1:8000

npm run dev

## Environment variables

Set these in your shell or in a .env file:

- DATA_PATH=data\bd64_measles_training_news_bootstrap_2026-05-27.csv
- MODEL_PATH=models\measles_model.joblib
- META_PATH=models\measles_model_meta.json
- OPENAI_API_KEY=your_key_here

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
