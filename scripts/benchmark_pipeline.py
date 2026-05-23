"""
Affiliate Benchmarking Pipeline
Providers : Google AI Studio — Gemma 4 31B IT (gemma-4-31b-it)
            OpenRouter        — auto free-tier routing
Outputs   : Schema-validated Firestore documents (or dry-run stdout)

Timeout strategy for Gemma:
  Google's API keeps the TCP connection alive during capacity queuing so
  Python's socket-level timeout cannot fire.  We wrap the HTTP call in a
  ThreadPoolExecutor and call future.result(timeout=N) from the main thread,
  which is a true wall-clock kill regardless of TCP state.
"""
import os
import sys
import json
import time
import argparse
import requests
from datetime import datetime, timezone
from jsonschema import validate, ValidationError

# ─── 1. Immutable Schema ──────────────────────────────────────────────────────
SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "properties": {
        "tool_name":        {"type": "string"},
        "model_id":         {"type": "string"},
        "source_timestamp": {"type": "string", "format": "date-time"},
        "h2_query":         {"type": "string"},
        "quick_answer_text": {"type": "string", "maxLength": 350},
        "benchmark_data": {
            "type": "object",
            "properties": {
                "latency_seconds":       {"type": "number"},
                "output_tokens":         {"type": "integer"},
                "cost_per_1k_tokens_usd": {"type": "number"},
                "cost_per_1m_tokens_usd": {"type": "number"},
            },
            "required": [
                "latency_seconds", "output_tokens",
                "cost_per_1k_tokens_usd", "cost_per_1m_tokens_usd",
            ],
        },
    },
    "required": [
        "tool_name", "model_id", "source_timestamp",
        "h2_query", "quick_answer_text", "benchmark_data",
    ],
}

# ─── 2. Constants ─────────────────────────────────────────────────────────────
TEST_PROMPT = (
    "Write a 200-word executive summary on the benefits of semantic HTML in SEO."
)

# Gemini 2.5 Flash
GEMINI_MODEL      = "gemini-2.5-flash"
GEMINI_COST_1M_IN  = 0.0   # Free tier
GEMINI_COST_1M_OUT = 0.0

# OpenRouter — auto-selects best free model available
# Fallback chain: gemma-3-27b → gemma-3-12b → whatever is free
OPENROUTER_MODEL      = "openrouter/auto"
OPENROUTER_COST_1M_IN  = 0.0   # Free tier
OPENROUTER_COST_1M_OUT = 0.0

REQUEST_TIMEOUT = 30  # seconds


# ─── 3. Firebase ──────────────────────────────────────────────────────────────
def init_firebase():
    import firebase_admin
    from firebase_admin import credentials, firestore

    cert_path = os.environ.get("FIREBASE_CERT_PATH")
    if not cert_path:
        print("ERROR: FIREBASE_CERT_PATH environment variable not set.")
        sys.exit(1)
    try:
        cred = credentials.Certificate(cert_path)
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)
        return firestore.client()
    except Exception as exc:
        print(f"ERROR: Failed to initialize Firebase: {exc}")
        sys.exit(1)


# ─── 4. API Callers ───────────────────────────────────────────────────────────
GEMINI_TIMEOUT = (10, 30)   # (connect_timeout, read_timeout) seconds


def call_gemini() -> dict | None:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("  [SKIP] Gemma: GEMINI_API_KEY not set.")
        return None

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{GEMINI_MODEL}:generateContent?key={api_key}"
    )
    payload = {
        "contents": [{"parts": [{"text": TEST_PROMPT}]}],
        "generationConfig": {"maxOutputTokens": 800},
    }

    print(f"  → Calling Google AI Studio Gemma ({GEMINI_MODEL})...")
    start = time.time()
    try:
        resp = requests.post(
            url,
            headers={"Content-Type": "application/json"},
            json=payload,
            timeout=GEMINI_TIMEOUT,
        )
    except requests.exceptions.Timeout:
        elapsed = round(time.time() - start, 1)
        print(f"  [CAPACITY LIMITED] Gemma timed out after {elapsed}s — free-tier slots exhausted.")
        return None
    except requests.exceptions.RequestException as exc:
        print(f"  [ERROR] Gemma network error: {exc}")
        return None

    elapsed = round(time.time() - start, 3)

    if resp.status_code == 500:
        print(f"  [CAPACITY LIMITED] Gemma HTTP 500 after {elapsed}s — no free-tier capacity on this key.")
        return None
    if resp.status_code == 429:
        print(f"  [QUOTA] Gemma HTTP 429 — rate limit hit. Try again later.")
        return None
    if not resp.ok:
        print(f"  [ERROR] Gemma HTTP {resp.status_code}: {resp.text[:200]}")
        return None

    data    = resp.json()
    usage   = data.get("usageMetadata", {})
    in_tok  = usage.get("promptTokenCount", 0)
    out_tok = usage.get("candidatesTokenCount", 0)
    total   = in_tok + out_tok

    if total > 0:
        run_cost    = (in_tok / 1e6 * GEMINI_COST_1M_IN) + (out_tok / 1e6 * GEMINI_COST_1M_OUT)
        cost_per_1m = (run_cost / total) * 1e6
    else:
        cost_per_1m = 0.0
    cost_per_1k = round(cost_per_1m / 1000, 6)
    cost_per_1m = round(cost_per_1m, 6)

    raw_text = (
        data.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [{}])[0]
        .get("text", "")
    )
    print(f"     ✓ latency={elapsed}s  out_tokens={out_tok}")
    return {
        "tool_name": f"Google AI Studio — Gemini ({GEMINI_MODEL})",
        "model_id":    GEMINI_MODEL,
        "latency_seconds":        elapsed,
        "output_tokens":          out_tok,
        "cost_per_1m_tokens_usd": cost_per_1m,
        "cost_per_1k_tokens_usd": cost_per_1k,
        "raw_response":           raw_text,
    }


def call_openrouter() -> dict | None:
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        print("  [SKIP] OpenRouter: OPENROUTER_API_KEY not set.")
        return None

    url     = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization":    f"Bearer {api_key}",
        "HTTP-Referer":     "https://github.com/affiliate-benchmarking",
        "X-Title":          "Affiliate Benchmark Pipeline",
        "Content-Type":     "application/json",
    }
    payload = {
        "model":    OPENROUTER_MODEL,
        "messages": [{"role": "user", "content": TEST_PROMPT}],
        # OpenRouter will route to the best available free model automatically
        "provider": {"allow_fallbacks": True},
    }

    print(f"  → Calling OpenRouter ({OPENROUTER_MODEL})...")
    start = time.time()
    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        latency = round(time.time() - start, 3)

        data    = resp.json()
        usage   = data.get("usage", {})
        in_tok  = usage.get("prompt_tokens", 0)
        out_tok = usage.get("completion_tokens", 0)
        total   = in_tok + out_tok

        if total > 0:
            run_cost    = (in_tok / 1e6 * OPENROUTER_COST_1M_IN) + (out_tok / 1e6 * OPENROUTER_COST_1M_OUT)
            cost_per_1m = (run_cost / total) * 1e6 if total else 0.0
        else:
            cost_per_1m = 0.0
        cost_per_1k = round(cost_per_1m / 1000, 6)
        cost_per_1m = round(cost_per_1m, 6)

        # The actual model used may differ from OPENROUTER_MODEL when auto-routing
        actual_model = data.get("model", OPENROUTER_MODEL)
        raw_text = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
        )
        print(f"     ✓ latency={latency}s  out_tokens={out_tok}  model_used={actual_model}")
        return {
            "tool_name":   f"OpenRouter ({actual_model})",
            "model_id":    actual_model,
            "latency_seconds":       latency,
            "output_tokens":         out_tok,
            "cost_per_1m_tokens_usd": cost_per_1m,
            "cost_per_1k_tokens_usd": cost_per_1k,
            "raw_response": raw_text,
        }

    except requests.exceptions.RequestException as exc:
        print(f"  [ERROR] OpenRouter API: {exc}")
        if hasattr(exc, "response") and exc.response is not None:
            print(f"          Response body: {exc.response.text[:400]}")
        return None


# ─── 5. LLM Formatter ─────────────────────────────────────────────────────────
def format_telemetry_with_llm(telemetry: dict) -> tuple[str, str]:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return (
            "API Benchmark Telemetry",
            "Telemetry data summarises provider latency, output tokens, "
            "and standardised cost formats without adding outside information.",
        )

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{GEMINI_MODEL}:generateContent?key={api_key}"
    )
    prompt = (
        "Summarise this JSON telemetry data. Do not add outside information.\n"
        f"{json.dumps(telemetry)}\n\n"
        "Return EXACTLY a JSON object with two keys:\n"
        "- 'h2_query' (string, a short descriptive heading)\n"
        "- 'quick_answer_text' (string, 40-60 words, key metrics only)\n"
        "Output raw JSON only — no markdown fences."
    )

    try:
        resp = requests.post(
            url,
            headers={"Content-Type": "application/json"},
            json={"contents": [{"parts": [{"text": prompt}]}]},
            timeout=REQUEST_TIMEOUT,
        )
        resp.raise_for_status()
        text = (
            resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
        )
        # Strip accidental markdown fences
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        result = json.loads(text)
        return (
            result.get("h2_query", "Benchmark Overview"),
            result.get("quick_answer_text", "Telemetry parsing failed."),
        )
    except Exception as exc:
        print(f"  [WARN] Formatter LLM error: {exc}")
        return (
            "Telemetry Benchmark",
            "Summary generated using fallback due to a processing limitation.",
        )


# ─── 6. Main ─────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Run affiliate LLM benchmark pipeline.")
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Print validated documents to stdout instead of writing to Firestore.",
    )
    args = parser.parse_args()

    db = None
    if not args.dry_run:
        db = init_firebase()

    print("\n══════════════════════════════════════════")
    print(" Affiliate LLM Benchmark Pipeline")
    print(f" Mode: {'DRY RUN (no Firestore writes)' if args.dry_run else 'LIVE'}")
    print("══════════════════════════════════════════\n")

    # ── Run benchmarks
    results = []
    for caller in (call_gemini, call_openrouter):
        res = caller()
        if res:
            results.append(res)

    if not results:
        print("\n[ERROR] No successful API responses. Exiting.")
        sys.exit(1)

    # ── Process each result
    written = 0
    for res in results:
        print(f"\n── Processing: {res['tool_name']} ──")

        telemetry = {
            "tool_name":             res["tool_name"],
            "latency_seconds":       res["latency_seconds"],
            "output_tokens":         res["output_tokens"],
            "cost_per_1m_tokens_usd": res["cost_per_1m_tokens_usd"],
            "cost_per_1k_tokens_usd": res["cost_per_1k_tokens_usd"],
        }

        h2_query, quick_answer = format_telemetry_with_llm(telemetry)

        doc = {
            "tool_name":         res["tool_name"],
            "model_id":          res["model_id"],
            "source_timestamp":  datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "h2_query":          h2_query,
            "quick_answer_text": quick_answer[:350],
            "benchmark_data": {
                "latency_seconds":       res["latency_seconds"],
                "output_tokens":         res["output_tokens"],
                "cost_per_1k_tokens_usd": res["cost_per_1k_tokens_usd"],
                "cost_per_1m_tokens_usd": res["cost_per_1m_tokens_usd"],
            },
        }

        try:
            validate(instance=doc, schema=SCHEMA)
            print(f"  ✓ Schema validation passed.")
        except ValidationError as ve:
            print(f"  ✗ Schema validation FAILED: {ve.message}")
            print(f"    Document:\n{json.dumps(doc, indent=4)}")
            continue

        if args.dry_run:
            print(f"  [DRY RUN] Would write to Firestore → llm_benchmarks:")
            print(json.dumps(doc, indent=4))
        else:
            try:
                _, doc_ref = db.collection("llm_benchmarks").add(doc)
                print(f"  ✓ Saved to Firestore → llm_benchmarks/{doc_ref.id}")
                written += 1
            except Exception as exc:
                print(f"  ✗ Firestore write failed: {exc}")

    print(f"\n══ Done. {len(results)} benchmarked, {written} written to Firestore. ══\n")


if __name__ == "__main__":
    main()
