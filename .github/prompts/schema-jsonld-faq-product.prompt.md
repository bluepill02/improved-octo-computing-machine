---
description: "Generate FAQPage and Product/SoftwareApplication JSON-LD with dateModified for LLM benchmark pages."
name: "schema-jsonld-faq-product"
argument-hint: "Provide page URL, product/app name, brand, description, offers, FAQ Q/A (>=3), dateModified."
agent: "agent"
---

Generate two JSON-LD blocks for the provided page details:

1) **FAQPage**
2) **Product** or **SoftwareApplication** (choose the most accurate type based on the input; prefer SoftwareApplication for SaaS or LLM services)

Requirements:
- Use the provided `dateModified` as an ISO 8601 string in both JSON-LD blocks.
- Include `@id` and `url` values that share the same base URL.
- Include brand and offer details when provided.
- Output exactly two `<script type="application/ld+json">` blocks, in order: FAQPage then Product/SoftwareApplication.
- If fewer than 3 FAQ items are supplied, ask for more FAQs before generating.

Inputs to expect:
- Page URL
- Product/app name and brand
- Short description
- Offers or price range (if any)
- FAQ list (question + answer)
- dateModified
