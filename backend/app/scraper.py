"""Simple scraping helpers and runner.

This module provides a minimal framework for running per-source adapters,
normalizing results, and writing raw JSONL output into the configured
`SCRAPED_PATH`. Adapters should return dicts with at least:
  - headline, body, date, location_text, source, url

This is intentionally lightweight and defensive; add site-specific parsers
as small adapter classes or functions here.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, List

import requests
from bs4 import BeautifulSoup

from .config import SCRAPED_PATH


SCRAPED_PATH = Path(SCRAPED_PATH)
SCRAPED_PATH.mkdir(parents=True, exist_ok=True)


@dataclass
class ScrapeRecord:
    headline: str
    body: str
    date: datetime
    location_text: str | None
    source: str
    url: str

    def to_dict(self) -> dict:
        return {
            "headline": self.headline,
            "body": self.body,
            "date": self.date.isoformat(),
            "location_text": self.location_text,
            "source": self.source,
            "url": self.url,
        }


class BaseAdapter:
    """Base adapter for scraping a single site or endpoint.

    Subclass and implement `fetch_records()` which yields `ScrapeRecord`.
    """

    def __init__(self, name: str):
        self.name = name

    def fetch(self) -> Iterable[ScrapeRecord]:
        raise NotImplementedError()


class SimpleNewsAdapter(BaseAdapter):
    """A tiny HTML adapter example that scrapes headlines from a simple
    news listing page. This is a template — real sites need tailored parsing.
    """

    def __init__(self, name: str, list_url: str, selector: str):
        super().__init__(name)
        self.list_url = list_url
        self.selector = selector

    def _normalize_url(self, base: str, href: str) -> str:
        if href.startswith("http"):
            return href
        return requests.compat.urljoin(base, href)

    def _extract_article(self, url: str, headers: dict) -> tuple[str, str, datetime]:
        try:
            art = requests.get(url, headers=headers, timeout=15)
            art.raise_for_status()
            art_soup = BeautifulSoup(art.text, "html.parser")
            title = (
                (art_soup.find("meta", property="og:title") or {}).get("content")
                or (art_soup.find("title").get_text() if art_soup.find("title") else "")
                or (art_soup.find("h1").get_text() if art_soup.find("h1") else "")
            )
            paragraphs = [p.get_text().strip() for p in art_soup.find_all("p")]
            body = "\n\n".join([p for p in paragraphs if p])
            # best-effort date
            date_meta = art_soup.find("meta", property="article:published_time") or art_soup.find("time")
            date = datetime.now(timezone.utc)
            if date_meta and date_meta.has_attr("content"):
                try:
                    date = datetime.fromisoformat(date_meta["content"].replace("Z", "+00:00"))
                except Exception:
                    pass
            return title, body, date
        except Exception:
            return "", "", datetime.now(timezone.utc)

    def fetch(self) -> Iterable[ScrapeRecord]:
        headers = {"User-Agent": "AibuildFestScraper/1.0 (+https://example)"}
        try:
            resp = requests.get(self.list_url, headers=headers, timeout=15)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")
        except Exception:
            return []

        for el in soup.select(self.selector):
            a = el if getattr(el, 'name', None) == 'a' else el.find("a")
            if a is None:
                continue
            href = a.get("href", "")
            url = self._normalize_url(self.list_url, href)
            headline, body, date = self._extract_article(url, headers)
            yield ScrapeRecord(
                headline=headline.strip() if headline else (a.get_text() or "").strip(),
                body=body,
                date=date,
                location_text=None,
                source=self.name,
                url=url,
            )


class TheDailyStarAdapter(SimpleNewsAdapter):
    def __init__(self):
        super().__init__("TheDailyStar", "https://www.thedailystar.net/health", "article a")


class BdNews24Adapter(SimpleNewsAdapter):
    def __init__(self):
        super().__init__("bdnews24", "https://bdnews24.com/health", "a")


class WHOAdapter(BaseAdapter):
    def __init__(self):
        super().__init__("WHO")
        self.list_url = "https://www.who.int/countries/bgd/news"

    def fetch(self) -> Iterable[ScrapeRecord]:
        headers = {"User-Agent": "AibuildFestScraper/1.0 (+https://example)"}
        try:
            resp = requests.get(self.list_url, headers=headers, timeout=15)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")
        except Exception:
            return []

        # WHO lists links to news items; find anchor tags in the list
        for a in soup.select("a[href*='/news/item']"):
            href = a.get("href")
            if not href:
                continue
            url = requests.compat.urljoin(self.list_url, href)
            # fetch article page
            try:
                art = requests.get(url, headers=headers, timeout=15)
                art.raise_for_status()
                art_soup = BeautifulSoup(art.text, "html.parser")
                title = art_soup.find("h1")
                title_text = title.get_text().strip() if title else ""
                paragraphs = [p.get_text().strip() for p in art_soup.select(".sf-detail-body-wrapper p")]
                body = "\n\n".join(paragraphs)
                date_el = art_soup.find("time")
                date = datetime.now(timezone.utc)
                if date_el and date_el.has_attr("datetime"):
                    try:
                        date = datetime.fromisoformat(date_el["datetime"].replace("Z", "+00:00"))
                    except Exception:
                        pass
                yield ScrapeRecord(
                    headline=title_text,
                    body=body,
                    date=date,
                    location_text="Bangladesh",
                    source=self.name,
                    url=url,
                )
            except Exception:
                continue


def write_jsonl(records: Iterable[ScrapeRecord], *, prefix: str | None = None) -> Path:
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    fname = f"scrape_{ts}.jsonl" if prefix is None else f"{prefix}_{ts}.jsonl"
    out = SCRAPED_PATH / fname
    with out.open("w", encoding="utf-8") as fh:
        for rec in records:
            json.dump(rec.to_dict(), fh, ensure_ascii=False)
            fh.write("\n")
    return out


def run_adapters(adapters: List[BaseAdapter]) -> List[Path]:
    """Run a list of adapters and write their combined output to a JSONL file."""
    all_records: List[ScrapeRecord] = []
    for adapter in adapters:
        try:
            for rec in adapter.fetch():
                all_records.append(rec)
        except Exception:
            # adapters should be resilient; swallow and continue
            continue

    if not all_records:
        return []

    path = write_jsonl(all_records)
    return [path]


# Simple manual-run utility when invoked as a script
if __name__ == "__main__":
    # Example usage: add adapters here for quick local testing
    adapters = [TheDailyStarAdapter(), BdNews24Adapter(), WHOAdapter()]
    written = run_adapters(adapters)
    print("Wrote:", written)
