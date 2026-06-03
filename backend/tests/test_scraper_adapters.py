import json
from datetime import datetime
from pathlib import Path

import pandas as pd
import pytest

from app import scraper, data_loader


class _FakeResponse:
    def __init__(self, text: str, status_code: int = 200):
        self.text = text
        self.status_code = status_code

    def raise_for_status(self):
        if not (200 <= self.status_code < 300):
            raise Exception(f"HTTP {self.status_code}")


def test_thedailystar_adapter_parses_article(monkeypatch):
    list_html = """
    <html><body>
      <article><a href="https://example.com/article1">Headline One</a></article>
    </body></html>
    """

    article_html = """
    <html><head><meta property="article:published_time" content="2026-06-01T12:00:00Z"/></head>
      <body><h1>Article Title</h1><p>Paragraph1</p><p>Paragraph2</p></body></html>
    """

    def fake_get(url, headers=None, timeout=None):
        if url == "https://www.thedailystar.net/health":
            return _FakeResponse(list_html)
        return _FakeResponse(article_html)

    monkeypatch.setattr(scraper.requests, "get", fake_get)

    adapter = scraper.TheDailyStarAdapter()
    recs = list(adapter.fetch())
    assert recs, "No records parsed"
    r = recs[0]
    assert "Headline One" in (r.headline or "") or "Article Title" in (r.headline or "")
    assert isinstance(r.date, datetime)


def test_who_adapter_parses(monkeypatch):
    list_html = '<html><body><a href="/news/item/1">WHO Item</a></body></html>'
    article_html = '<html><body><h1>WHO Title</h1><div class="sf-detail-body-wrapper"><p>WHO para</p></div><time datetime="2026-06-02T08:00:00Z"></time></body></html>'

    def fake_get(url, headers=None, timeout=None):
        if url.startswith("https://www.who.int/countries/bgd/news"):
            return _FakeResponse(list_html)
        return _FakeResponse(article_html)

    monkeypatch.setattr(scraper.requests, "get", fake_get)

    adapter = scraper.WHOAdapter()
    recs = list(adapter.fetch())
    assert recs, "WHO adapter returned no records"
    r = recs[0]
    assert "WHO Title" in (r.headline or "")
    assert "WHO para" in (r.body or "")


def test_apply_scrape_updates_aggregates(tmp_path, monkeypatch):
    # Create a fake scraped JSONL file with a record mentioning 'Dhaka'
    rec = {
        "headline": "Measles outbreak in Dhaka",
        "body": "Cases rising in Dhaka district",
        "date": "2026-06-03T00:00:00Z",
        "location_text": "Dhaka",
        "source": "test",
        "url": "http://example.test/article",
    }
    scraped_dir = tmp_path / "scraped"
    scraped_dir.mkdir()
    f = scraped_dir / "test.jsonl"
    f.write_text(json.dumps(rec) + "\n", encoding="utf-8")

    # Monkeypatch the data_loader to use our scraped dir and a small dataset
    monkeypatch.setattr(data_loader, "SCRAPED_PATH", str(scraped_dir))

    df = pd.DataFrame(
        {
            "district": ["Dhaka", "Other"],
            "news_enriched_risk_score": [0.0, 0.0],
        }
    )

    monkeypatch.setattr(data_loader, "get_dataset", lambda: df)

    summary = data_loader.apply_scrape_updates(write_csv=False)
    assert summary.get("files", 0) >= 1
    assert summary.get("updated", 0) > 0
