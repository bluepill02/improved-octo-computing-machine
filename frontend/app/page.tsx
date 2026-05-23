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

  return (
    <main className="page-main" id="main-content">
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
