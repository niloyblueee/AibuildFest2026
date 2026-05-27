# Backend (Hackathon Demo)

This backend trains a simple tabular ML model on the synthetic dataset and serves predictions via FastAPI.

## Quick start

1) Create and activate a virtual environment

- Windows PowerShell:
  - cd F:\AibuildFest2026\backend
  - python -m venv .venv
  - .\.venv\Scripts\Activate.ps1

2) Install dependencies

- pip install -r requirements.txt

3) Train the model

- python train.py

4) Run the API

- uvicorn app.main:app --reload --port 8000

## Environment variables

Set these in your shell or in a .env file:

- DATA_PATH=..\frontend\src\data\zerodose_mission_control_synthetic_dataset.csv
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
