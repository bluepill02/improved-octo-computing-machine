from __future__ import annotations

import json
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional


@dataclass
class CanonicalPricing:
    input_per_1k: Decimal
    output_per_1k: Decimal
    currency: str


def per_1k(amount: Decimal, unit: str) -> Decimal:
    unit = unit.lower()
    if unit == "per_1k":
        return amount
    if unit == "per_token":
        return amount * Decimal("1000")
    if unit == "per_1m":
        return amount / Decimal("1000")
    return amount


def coerce_int(value: Any) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def canonical_record(
    provider: str,
    model: str,
    pricing: CanonicalPricing,
    output_tokens: Optional[int],
    latency_ms_p50: Optional[int],
    latency_ms_p95: Optional[int],
    source_url: Optional[str],
    fetched_at: Optional[str],
) -> Dict[str, Any]:
    return {
        "provider": provider,
        "model": model,
        "pricing": {
            "input_per_1k": float(pricing.input_per_1k),
            "output_per_1k": float(pricing.output_per_1k),
            "currency": pricing.currency,
        },
        "output_tokens": output_tokens,
        "latency_ms": {
            "p50": latency_ms_p50,
            "p95": latency_ms_p95,
        },
        "source": {
            "url": source_url,
            "fetchedAt": fetched_at,
        },
    }


def normalize_example_provider(raw: Dict[str, Any]) -> List[Dict[str, Any]]:
    normalized: List[Dict[str, Any]] = []
    fetched_at = datetime.now(timezone.utc).isoformat()
    currency = "USD"

    for model_entry in raw.get("models", []):
        model_name = model_entry.get("name", "")
        input_cost = per_1k(Decimal(str(model_entry.get("input_cost", "0"))), "per_1m")
        output_cost = per_1k(Decimal(str(model_entry.get("output_cost", "0"))), "per_1m")
        output_tokens = model_entry.get("output_tokens")
        if output_tokens is None:
            output_tokens = model_entry.get("output_token_volume")
        output_tokens = coerce_int(output_tokens)

        normalized.append(
            canonical_record(
                provider="example-provider",
                model=model_name,
                pricing=CanonicalPricing(
                    input_per_1k=input_cost,
                    output_per_1k=output_cost,
                    currency=currency,
                ),
                output_tokens=output_tokens,
                latency_ms_p50=coerce_int(model_entry.get("latency_p50_ms")),
                latency_ms_p95=coerce_int(model_entry.get("latency_p95_ms")),
                source_url=model_entry.get("source_url"),
                fetched_at=fetched_at,
            )
        )

    return normalized


def normalize_provider(provider_name: str, raw: Dict[str, Any]) -> List[Dict[str, Any]]:
    if provider_name == "example-provider":
        return normalize_example_provider(raw)
    return []


def load_raw_files(raw_dir: str) -> Dict[str, Dict[str, Any]]:
    data: Dict[str, Dict[str, Any]] = {}
    for filename in os.listdir(raw_dir):
        if not filename.endswith(".json"):
            continue
        provider_name = filename.replace(".json", "")
        with open(os.path.join(raw_dir, filename), "r", encoding="utf-8") as handle:
            data[provider_name] = json.load(handle)
    return data


def main() -> None:
    raw_dir = os.getenv("RAW_OUTPUT_DIR", "./data/raw")
    normalized_path = os.getenv("NORMALIZED_OUTPUT_FILE", "./data/normalized/benchmarks.json")

    raw_data = load_raw_files(raw_dir)
    normalized_records: List[Dict[str, Any]] = []

    for provider_name, payload in raw_data.items():
        normalized_records.extend(normalize_provider(provider_name, payload))

    os.makedirs(os.path.dirname(normalized_path), exist_ok=True)
    with open(normalized_path, "w", encoding="utf-8") as handle:
        json.dump(normalized_records, handle, ensure_ascii=False, indent=2)

    print(f"Normalized {len(normalized_records)} records to {normalized_path}")


if __name__ == "__main__":
    main()
