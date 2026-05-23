/**
 * Home page — Next.js App Router Server Component.
 *
 * Fetches validated benchmark documents from Firestore and renders
 * QuickAnswer + BenchmarkTable for each. No client-side JS required.
 */
import { fetchBenchmarks } from "@/lib/fetchBenchmarks";
import QuickAnswer from "@/components/QuickAnswer";
import BenchmarkTable from "@/components/BenchmarkTable";
import DynamicCTA from "@/components/DynamicCTA";
import ExitIntentModal from "@/components/ExitIntentModal";
import { Suspense } from "react";
import type { BenchmarkDocument } from "@/types/benchmark";

// ISR: revalidate every 24 hours — matches the pipeline's freshness SLA
export const revalidate = 86400;

export default async function HomePage() {
  let benchmarks: BenchmarkDocument[] = [];
  let fetchError: string | null = null;

  try {
    benchmarks = await fetchBenchmarks(20);
  } catch (err) {
    console.error("[Firestore] Failed to fetch benchmarks:", err);
    fetchError =
      err instanceof Error ? err.message : "Unknown error fetching data.";
    benchmarks = [];
  }

  // Find the latest verification timestamp to act as the schema's dateModified (AEO/SEO compliance)
  const newestTimestamp = benchmarks.length > 0
    ? benchmarks.reduce((latest, current) =>
        new Date(current.source_timestamp) > new Date(latest)
          ? current.source_timestamp
          : latest,
        benchmarks[0].source_timestamp
      )
    : "2026-05-23T07:58:31+00:00";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "LLM Benchmark Dashboard — Empirical API Telemetry",
    "description": "Schema-validated benchmark data captured directly from Google AI Studio and OpenRouter APIs. Real latency, token counts, and cost metrics — no estimates, no hallucinations.",
    "datePublished": "2026-05-23T07:58:31+00:00",
    "dateModified": newestTimestamp,
    "author": {
      "@type": "Organization",
      "name": "Empirical AI Affiliate Niche"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Empirical AI Affiliate Niche",
      "logo": {
        "@type": "ImageObject",
        "url": "https://example.com/favicon.ico"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "https://example.com"
    }
  };

  return (
    <main className="page-main" id="main-content">
      {/* ── Global JSON-LD Article Schema for AEO/SEO ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── Page Header ── */}
      <header className="page-header">
        <div className="header-inner">
          <div className="header-eyebrow">
            <span className="eyebrow-dot" aria-hidden="true" />
            Empirical · Schema-Validated · Anti-Hallucination
          </div>
          <h1 className="page-h1">LLM Benchmark Dashboard</h1>
          <p className="page-subtitle">
            Real API telemetry captured directly from provider endpoints.
            Every metric is schema-validated before storage. No filler.
            No estimates.
          </p>
          <div className="header-cta-container">
            <Suspense fallback={<div className="cta-fallback">Loading recommendation...</div>}>
              <DynamicCTA variant="page" />
            </Suspense>
          </div>
        </div>
      </header>

      {/* ── Error State ── */}
      {fetchError && (
        <div className="error-banner" role="alert">
          <strong>Data fetch failed:</strong> {fetchError}
        </div>
      )}

      {/* ── Empty State ── */}
      {!fetchError && benchmarks.length === 0 && (
        <div className="empty-state">
          <p>
            No benchmark documents found in Firestore. Run the Python pipeline
            to populate data.
          </p>
          <code className="empty-state-cmd">
            python scripts/benchmark_pipeline.py
          </code>
        </div>
      )}

      {/* ── Benchmark Cards ── */}
      {benchmarks.length > 0 && (
        <div className="benchmarks-grid">
          {benchmarks.map((doc) => (
            <article key={doc.id} className="benchmark-card">
              {/* AEO QuickAnswer block */}
              <QuickAnswer doc={doc} />

              {/* Divider */}
              <div className="card-divider" aria-hidden="true" />

              {/* Empirical data table */}
              <BenchmarkTable doc={doc} />
            </article>
          ))}
        </div>
      )}

      {/* ── Footer ── */}
      <footer className="page-footer">
        <p>
          Data sourced directly from provider APIs via authenticated calls.
          Pipeline: Python → Firebase Firestore → Next.js ISR.
          Schema enforced at every write.
        </p>
        <p className="footer-doc-count">
          {benchmarks.length} document{benchmarks.length !== 1 ? "s" : ""}{" "}
          loaded from <code>llm_benchmarks</code> collection.
        </p>
      </footer>

      {/* ── Exit Intent Behavioral Trigger ── */}
      <Suspense fallback={null}>
        <ExitIntentModal />
      </Suspense>
    </main>
  );
}
