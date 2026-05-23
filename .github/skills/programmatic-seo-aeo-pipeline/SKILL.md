---
name: programmatic-seo-aeo-pipeline
description: "Programmatic SEO and AEO workflow for LLM benchmark pages: semantic chunking, entity/schema generation (FAQPage, dateModified), multi-provider API data pipelines, responsive dashboards, and CRO instrumentation (exit-intent, dynamic CTAs). Use when building or updating LLM benchmark/affiliate comparison pages."
argument-hint: "Provide page type, target LLM providers, data sources, and CTA variants."
---

# Programmatic SEO & AEO Benchmark Pipeline

## Outcomes
- React-ready semantic chunks optimized for AI Overviews, Perplexity, and other answer engines.
- Automated benchmark data across LLM providers (cost per 1k tokens, speed, context window).
- Responsive UI components that surface data for mobile-first traffic.
- CRO hooks for behavioral tracking, exit-intent, and dynamic CTA swaps.

## When to Use
- Creating or refreshing LLM benchmark pages and comparison dashboards.
- Building programmatic SEO pages that must be answer-engine friendly.
- Automating pricing/performance updates from multiple provider APIs.
- Adding CRO instrumentation to affiliate-focused technical content.

## Inputs
- Target page template and primary query intent (price, speed, context size).
- Provider list and API access details (handled securely; do not store secrets in files).
- Data freshness SLA (e.g., update every 24h) and fallback rules.
- CTA variants and mapping rules by query intent.
- Analytics/event schema (scroll depth, CTA click, exit-intent).

## Procedure
1. **Define page entities and intent**
   - Identify primary entities (model, vendor, pricing tier, context window).
   - Classify the query intent to drive CTA and summary language.

2. **Semantic chunking for AEO**
   - Break content into isolated React components (overview, comparisons, FAQs, pricing table, benchmarks).
   - Keep each chunk self-contained and answerable in isolation.

3. **Schema & entity extraction**
   - Generate `dateModified` dynamically based on the newest benchmark dataset.
   - Add `FAQPage` schema when at least 3 Q/A items exist.
   - Use structured entity names that align with provider and model naming.

4. **API data pipeline (Python automation)**
   - Execute comparative API calls across providers.
   - Normalize JSON responses into a common schema.
   - Calculate cost-per-1k tokens, inference speed, and context limits.
   - Apply retries and fallbacks; mark stale data when needed.

5. **Data aggregation & publishing**
   - Emit a single aggregated JSON payload for the UI layer.
   - Record `lastUpdated` and `sourceCount` metadata.

6. **Frontend integration**
   - Inject processed data into dynamic components (tables, cards, charts).
   - Enforce mobile-first layouts for tables and summary tiles.
   - Ensure accessibility: readable font sizes, table captions, keyboard focus.

7. **CRO instrumentation**
   - Track scroll depth and CTA click-through.
   - Trigger exit-intent popups after meaningful engagement thresholds.
   - Swap CTA text based on query intent and referrer taxonomy.

8. **QA & validation**
   - Validate schema with a structured data validator.
   - Confirm data accuracy across providers.
   - Check mobile layout at 320px width and avoid CLS regressions.
   - Verify analytics events and exit-intent logic in production preview.

## Decision Points
- **Schema choice:** Add `FAQPage` only when FAQ content is substantive; otherwise omit.
- **Freshness fallback:** If data is older than SLA, display stale badge and reduce CTA aggressiveness.
- **CTA selection:** Choose CTA variant based on intent (price vs. performance vs. context size).

## Quality Gates
- Schema validates without errors and `dateModified` matches latest dataset.
- Aggregated metrics are consistent across all providers.
- Mobile experience is readable without horizontal scrolling.
- Tracking events fire exactly once per user action.

## Outputs
- Componentized content map (React-friendly chunks).
- Aggregated benchmark JSON with `lastUpdated` metadata.
- Schema snippets for `FAQPage` and `dateModified`.
- CRO event map and CTA variant rules.
