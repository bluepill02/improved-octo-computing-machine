import { fetchBenchmarksBySlug } from "@/lib/fetchBenchmarks";
import QuickAnswer from "@/components/QuickAnswer";
import BenchmarkTable from "@/components/BenchmarkTable";
import DynamicCTA from "@/components/DynamicCTA";
import ExitIntentModal from "@/components/ExitIntentModal";
import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import type { BenchmarkDocument } from "@/types/benchmark";

// ISR: revalidate dynamic pages every 24 hours
export const revalidate = 86400;

// Enable static pre-rendering of all 4 configured use cases at build time!
export async function generateStaticParams() {
  return [
    { slug: "ai-writer" },
    { slug: "code-assistant" },
    { slug: "seo-tool" },
    { slug: "chatbot" },
  ];
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const readableTitle = slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return {
    title: `Empirical LLM Benchmarks for ${readableTitle} | AI Affiliate Hub`,
    description: `Factual, schema-validated speed, token count, and USD cost comparison dashboard for ${readableTitle} use cases using raw provider APIs.`,
    openGraph: {
      title: `Empirical LLM Benchmarks for ${readableTitle} | AI Affiliate Hub`,
      description: `Factual, schema-validated speed, token count, and USD cost comparison dashboard for ${readableTitle} use cases.`,
    },
  };
}

export default async function ComparePage({ params }: PageProps) {
  const { slug } = await params;
  
  const readableTitle = slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  let benchmarks: BenchmarkDocument[] = [];
  let fetchError: string | null = null;

  try {
    benchmarks = await fetchBenchmarksBySlug(slug);
  } catch (err) {
    console.error(`[Firestore] Failed to fetch benchmarks for slug ${slug}:`, err);
    fetchError = err instanceof Error ? err.message : "Unknown error fetching data.";
  }

  // If no benchmarks exist for this slug and it's not a temporary error, show 404
  if (!fetchError && benchmarks.length === 0) {
    notFound();
  }

  // Find the latest verification timestamp to act as the schema's dateModified
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
    "headline": `Empirical LLM Benchmarks for ${readableTitle} | AI Affiliate Hub`,
    "description": `Factual speed, token counts, and cost comparisons for ${readableTitle} use cases.`,
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
      "@id": `https://example.com/compare/${slug}`
    }
  };

  return (
    <main className="page-main" id="main-content">
      {/* ── Global JSON-LD Article Schema for AEO/SEO ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── Navigation / Back to Home ── */}
      <nav className="page-nav" aria-label="Breadcrumb">
        <Link href="/" className="nav-back-link">
          ← Back to Global Dashboard
        </Link>
      </nav>

      {/* ── Page Header ── */}
      <header className="page-header">
        <div className="header-inner">
          <div className="header-eyebrow">
            <span className="eyebrow-dot" aria-hidden="true" />
            Use-Case Benchmark: {readableTitle}
          </div>
          <h1 className="page-h1">{readableTitle} Speed & Cost Analysis</h1>
          <p className="page-subtitle">
            Real API telemetry captured during active {readableTitle} workflow tests.
            Every metric is schema-validated before storage. No assumptions, no estimates.
          </p>
          <div className="header-cta-container">
            <Suspense fallback={<div className="cta-fallback">Loading recommendation...</div>}>
              {/* Dynamic CTA component automatically maps to ?intent= from URL or uses the route slug */}
              <DynamicCTA variant="page" fallbackIntent={slug} analyticsLabel={`cta-page-seo-${slug}`} />
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

      {/* ── CTA Strip ── */}
      <section className="page-cta-strip" aria-label="Recommendation">
        <span className="page-cta-label">Enterprise Recommendation</span>
        <h3 className="page-cta-heading">
          Looking for the highest-performing platform optimized for {readableTitle} workloads?
        </h3>
        <Suspense fallback={<div className="cta-fallback">Loading recommendation...</div>}>
          <DynamicCTA variant="page" fallbackIntent={slug} analyticsLabel={`cta-strip-seo-${slug}`} />
        </Suspense>
      </section>

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
        <ExitIntentModal fallbackIntent={slug} />
      </Suspense>
    </main>
  );
}
