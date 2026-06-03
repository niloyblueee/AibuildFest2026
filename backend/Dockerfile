FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8000

COPY backend/requirements.txt ./
RUN pip install --upgrade pip \
    && pip install -r requirements.txt

COPY backend/ .

# Ensure data folders for scraper outputs and backups exist and are writable
RUN mkdir -p /app/data/scraped /app/data/backups \
    && chmod -R 755 /app/data

# Expose scraped/backups as mountable volumes so host can persist data
VOLUME ["/app/data/scraped", "/app/data/backups"]

# Generate model artifacts at build time so they exist in the image
RUN python train.py || true

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
