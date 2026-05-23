import type { BenchmarkDocument } from "@/types/benchmark";

interface QuickAnswerProps {
  doc: BenchmarkDocument;
}

/**
 * AEO-optimised QuickAnswer block.
 *
 * Renders exactly what is in the Firestore document:
 *  - h2_query   → <h2>
 *  - quick_answer_text → <p>
 *  - source_timestamp  → visible verification badge
 *
 * No filler text. No hallucinated content.
 */
export default function QuickAnswer({ doc }: QuickAnswerProps) {
  const formattedTimestamp = new Date(doc.source_timestamp).toLocaleString(
    "en-GB",
    {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "UTC",
    }
  );

  return (
    <article
      className="quick-answer-block"
      aria-label={`Quick answer for: ${doc.h2_query}`}
    >
      {/* AEO: isolated answerable heading */}
      <h2 className="quick-answer-heading">{doc.h2_query}</h2>

      {/* AEO: 40-60 word empirical summary — constrained generation only */}
      <p className="quick-answer-body">{doc.quick_answer_text}</p>

      {/* E-E-A-T: machine-verifiable timestamp */}
      <div className="verification-badge" role="note">
        <span className="verification-icon" aria-hidden="true">✦</span>
        <span>
          <span className="verification-label">Empirical Data Last Verified: </span>
          <time dateTime={doc.source_timestamp} className="verification-time">
            {formattedTimestamp} UTC
          </time>
        </span>
      </div>

      {/* AEO: model provenance for E-E-A-T */}
      <div className="model-provenance">
        <span className="provenance-label">Benchmark Provider: </span>
        <span className="provenance-value">{doc.tool_name}</span>
        <span className="provenance-sep">·</span>
        <span className="provenance-label">Model ID: </span>
        <code className="provenance-model">{doc.model_id}</code>
      </div>
    </article>
  );
}
