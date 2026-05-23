from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

try:
    from jsonschema import Draft202012Validator, FormatChecker
except ImportError:  # pragma: no cover - handled with explicit error message
    Draft202012Validator = None
    FormatChecker = None


def load_normalized(path: str) -> List[Dict[str, Any]]:
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


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


def load_schema(schema_path: str) -> Dict[str, Any]:
    with open(schema_path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def validate_payload(payload: Dict[str, Any], schema_path: str) -> None:
    if Draft202012Validator is None or FormatChecker is None:
        raise SystemExit(
            "jsonschema is required for validation. Install it with "
            "'pip install -r .github/skills/llm-benchmark-data-pipeline/requirements.txt'."
        )

    schema = load_schema(schema_path)
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    errors = sorted(validator.iter_errors(payload), key=lambda error: list(error.path))

    if errors:
        print("Schema validation failed. The payload will not be written.")
        for error in errors[:20]:
            path = ".".join(str(segment) for segment in error.path) or "<root>"
            print(f"- {path}: {error.message}")
        raise SystemExit(1)


def aggregate(items: List[Dict[str, Any]]) -> Dict[str, Any]:
    providers = {item.get("provider") for item in items if item.get("provider")}
    newest_source = newest_source_timestamp(items)
    last_updated = (newest_source or datetime.now(timezone.utc)).isoformat()
    return {
        "lastUpdated": last_updated,
        "sourceCount": len(providers),
        "itemCount": len(items),
        "items": items,
    }


def main() -> None:
    normalized_path = os.getenv("NORMALIZED_OUTPUT_FILE", "./data/normalized/benchmarks.json")
    aggregated_path = os.getenv("AGGREGATED_OUTPUT_FILE", "./data/benchmarks.json")
    default_schema_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "assets", "canonical-schema.json")
    )
    schema_path = os.getenv("CANONICAL_SCHEMA_FILE", default_schema_path)

    items = load_normalized(normalized_path)
    payload = aggregate(items)
    validate_payload(payload, schema_path)

    os.makedirs(os.path.dirname(aggregated_path), exist_ok=True)
    with open(aggregated_path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)

    print(f"Aggregated {payload['itemCount']} records to {aggregated_path}")


if __name__ == "__main__":
    main()
