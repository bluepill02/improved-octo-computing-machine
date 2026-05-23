---
description: "Create CRO rules mapping intent to CTA variants and analytics event names for benchmark/affiliate pages."
name: "cro-intent-cta-rules"
argument-hint: "Provide intents, audience, offers, event prefix, and trigger rules (scroll depth, exit-intent)."
agent: "agent"
---

Create a CRO ruleset that maps user intent to CTA copy variants and analytics event names.

Requirements:
- Produce a concise rules table with columns: Intent, Primary CTA, Secondary CTA, Trigger, Event Names, Notes.
- Provide a JSON mapping for implementation with `intent`, `ctaVariants`, `eventNames`, and `triggers`.
- Use the supplied event prefix for all event names; if none is provided, use `affiliate`.
- Ensure CTA copy is aligned to intent (price vs. performance vs. context vs. enterprise).

Inputs to expect:
- Intent list (e.g., price, speed, context, enterprise)
- Audience profile
- Offer list or destination URLs
- Event prefix (optional)
- Trigger rules (scroll depth %, exit-intent delay, engagement depth)
