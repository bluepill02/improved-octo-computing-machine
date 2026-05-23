---
description: "Generate a Markdown comparison table and JSON mapping from normalized LLM benchmark data."
name: "benchmark-table-from-normalized"
argument-hint: "Provide normalized JSON array (or excerpt), columns to include, and sort/filters."
agent: "agent"
---

Produce **two outputs** from the provided normalized benchmark data:

1) A **Markdown table** suitable for a comparison page
2) A **JSON array** matching the same columns and row order

Requirements:
- Ask for filters if more than 20 rows are provided.
- Default columns if none provided: Provider, Model, Output Tokens, Input $/1k, Output $/1k, Input $/1M, Output $/1M, P50 ms, P95 ms.
- If $/1M columns are not provided in the input, derive them from $/1k (multiply by 1000).
- If costs or output tokens are missing, show `—` and include a note below the table.
- Round costs to 4 decimals; latency to whole milliseconds; output tokens as whole numbers.
- Sort by a user-provided rule; if none provided, keep input order.

Inputs to expect:
- Normalized JSON array (provider/model/pricing/output_tokens/latency_ms)
- Column list (optional)
- Sort rule (optional)
- Filters (optional)
