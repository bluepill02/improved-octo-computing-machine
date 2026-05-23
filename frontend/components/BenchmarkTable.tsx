import type { BenchmarkDocument } from "@/types/benchmark";

interface BenchmarkTableProps {
  doc: BenchmarkDocument;
}

/**
 * AEO BenchmarkTable component.
 *
 * Renders the benchmark_data object as a structured HTML table.
 * REQUIRED: cost_per_1k_tokens_usd and cost_per_1m_tokens_usd MUST appear
 *           as adjacent columns — architectural constraint.
 *
 * No filler text. No hallucinated metrics. Renders only what's in the document.
 */
export default function BenchmarkTable({ doc }: BenchmarkTableProps) {
  const { benchmark_data } = doc;

  const rows: { metric: string; value: string; unit: string }[] = [
    {
      metric: "Latency",
      value: benchmark_data.latency_seconds.toFixed(3),
      unit: "seconds",
    },
    {
      metric: "Output Tokens",
      value: benchmark_data.output_tokens.toLocaleString("en-US"),
      unit: "tokens",
    },
  ];

  return (
    <section
      className="benchmark-table-section"
      aria-label={`Benchmark data for ${doc.tool_name}`}
    >
      <h3 className="benchmark-table-heading">
        Empirical Benchmark Data
      </h3>

      <div className="table-scroll-wrapper">
        <table className="benchmark-table" role="table">
          <caption className="benchmark-caption">
            Raw telemetry captured during inference run on{" "}
            <time dateTime={doc.source_timestamp}>
              {new Date(doc.source_timestamp).toLocaleDateString("en-GB", {
                dateStyle: "long",
                timeZone: "UTC",
              })}
            </time>
            . Provider: <strong>{doc.tool_name}</strong>.
          </caption>

          <thead>
            <tr>
              <th scope="col" className="th-metric">Metric</th>
              <th scope="col" className="th-value">Value</th>
              <th scope="col" className="th-unit">Unit</th>
            </tr>
          </thead>

          <tbody>
            {/* Latency + Output Tokens */}
            {rows.map((row) => (
              <tr key={row.metric}>
                <td className="td-metric">{row.metric}</td>
                <td className="td-value">{row.value}</td>
                <td className="td-unit">{row.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Cost table: cost_per_1k and cost_per_1m side-by-side (architectural requirement) ── */}
      <div className="cost-table-wrapper">
        <h4 className="cost-table-heading">Cost Analysis (USD)</h4>
        <div className="table-scroll-wrapper">
          <table className="benchmark-table cost-table" role="table">
            <caption className="sr-only">
              Token cost breakdown per 1 000 and per 1 000 000 tokens for{" "}
              {doc.tool_name}
            </caption>

            <thead>
              <tr>
                <th scope="col" className="th-metric">Metric</th>
                {/* Required side-by-side cost columns */}
                <th scope="col" className="th-cost">Cost / 1K Tokens (USD)</th>
                <th scope="col" className="th-cost">Cost / 1M Tokens (USD)</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td className="td-metric">Token Cost</td>
                <td className="td-cost">
                  {benchmark_data.cost_per_1k_tokens_usd === 0
                    ? "$0.000000 (Free Tier)"
                    : `$${benchmark_data.cost_per_1k_tokens_usd.toFixed(6)}`}
                </td>
                <td className="td-cost">
                  {benchmark_data.cost_per_1m_tokens_usd === 0
                    ? "$0.000000 (Free Tier)"
                    : `$${benchmark_data.cost_per_1m_tokens_usd.toFixed(6)}`}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p className="data-integrity-note">
        <span className="integrity-icon" aria-hidden="true">🔒</span>
        Data integrity enforced via JSON Schema validation before Firestore write.
        No fields added or modified post-capture.
      </p>
    </section>
  );
}
