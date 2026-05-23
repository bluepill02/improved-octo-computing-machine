from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional


def parse_iso(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def newest_source_timestamp(items: List[Dict[str, Any]]) -> Optional[datetime]:
    timestamps = []
    for item in items:
        source = item.get("source", {})
        fetched_at = parse_iso(source.get("fetchedAt"))
        if fetched_at:
            timestamps.append(fetched_at)
    if not timestamps:
        return None
    return max(timestamps)


def main() -> int:
    dataset_path = os.getenv("AGGREGATED_OUTPUT_FILE", "./data/benchmarks.json")
    sla_hours = int(os.getenv("FRESHNESS_SLA_HOURS", "24"))
    strategy = os.getenv("FRESHNESS_STRATEGY", "source").lower()

    if not os.path.exists(dataset_path):
        print(f"Dataset not found: {dataset_path}")
        return 2

    with open(dataset_path, "r", encoding="utf-8") as handle:
        payload = json.load(handle)

    now = datetime.now(timezone.utc)
    last_updated = parse_iso(payload.get("lastUpdated"))
    items = payload.get("items", [])
    newest_source = newest_source_timestamp(items)

    if strategy == "source" and newest_source:
        reference_time = newest_source
    else:
        reference_time = last_updated or newest_source

    if not reference_time:
        print("No valid timestamp found to assess freshness.")
        return 3

    age = now - reference_time
    max_age = timedelta(hours=sla_hours)

    if age > max_age:
        print(
            "STALE DATASET: age is "
            f"{age} (limit {max_age}). Reference timestamp: {reference_time.isoformat()}"
        )
        return 1

    print(
        "Dataset is fresh: age is "
        f"{age} (limit {max_age}). Reference timestamp: {reference_time.isoformat()}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
