---
name: llm-benchmark-data-pipeline
description: "Scripted Python data pipeline for LLM benchmark pages: API calls, normalization, aggregation, and publishable JSON for dashboards. Use when building or updating multi-provider benchmark/affiliate datasets."
argument-hint: "Provide providers, endpoints, metrics, output path, freshness SLA."
---

# LLM Benchmark Data Pipeline (Python Templates)

## When to Use
- Building or refreshing LLM benchmark pages with provider APIs.
- Normalizing mixed pricing/latency/context data into a single schema.
- Publishing JSON datasets for frontend tables, cards, and charts.

## Inputs
- Provider list and API endpoints.
- Metric targets (cost per 1k tokens, latency percentiles, output token volume).
- Output paths for raw, normalized, and aggregated JSON.
- Freshness SLA and stale-data rules (default 24h, prefer source timestamps).

## Dependencies
- Python `jsonschema` (see [requirements.txt](./requirements.txt)).

## Procedure
1. **Configure providers**
   - Update the provider list in [fetch_provider_data.py](./scripts/fetch_provider_data.py) with endpoints and auth env vars.

2. **Fetch raw data**
   - Run the fetch script to save per-provider raw JSON files.

3. **Normalize to a canonical schema**
   - Use [normalize_benchmark_data.py](./scripts/normalize_benchmark_data.py) to map provider responses into a consistent shape.

4. **Aggregate for publishing**
   - Use [aggregate_benchmark_data.py](./scripts/aggregate_benchmark_data.py) to add metadata and emit a single publishable JSON (uses newest source timestamp for `lastUpdated`).

5. **Validate against the canonical schema**
   - Validate the aggregated payload using [canonical-schema.json](./assets/canonical-schema.json).
   - Enforced via `jsonschema` in [aggregate_benchmark_data.py](./scripts/aggregate_benchmark_data.py).

6. **Wire into the frontend**
   - Load the aggregated JSON in UI components (tables, summary cards, charts).

7. **QA and verification**
   - Validate cost units and currency.
   - Check output token volume and latency percentiles.
   - Confirm `lastUpdated` matches the newest source timestamp.
   - Run [check_data_freshness.py](./scripts/check_data_freshness.py) to flag stale datasets.

## Decision Points
- **Unit normalization:** Convert to cost per 1k tokens even when providers quote per-token or per-million.
- **Schema scope:** Keep the canonical schema minimal for v1 (speed, cost, output tokens).
- **Staleness behavior:** If data exceeds SLA, mark as stale and reduce CTA aggressiveness.
- **Granularity:** Choose model-level vs. tier-level records based on UI complexity.

## Quality Gates
- All records include provider, model, pricing, output token volume, and latency fields.
- Costs are normalized to per 1k tokens with a currency.
- Aggregated dataset contains `lastUpdated`, `sourceCount`, and `itemCount`.
- No missing or duplicate model identifiers per provider.

## Outputs
- Raw provider JSON files (per provider).
- Normalized dataset with canonical fields.
- Aggregated JSON for dashboards and tables.
- Canonical schema reference for validation.
- Freshness guard results (pass/fail and timestamp).
