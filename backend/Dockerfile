FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8000

COPY backend/requirements.txt ./
RUN pip install --upgrade pip \
    && pip install -r requirements.txt

COPY backend/ .

# Generate model artifacts at build time so they exist in the image
RUN python train.py

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
