/**
 * Server-side data fetcher for the llm_benchmarks Firestore collection.
 * Called only from Server Components — never shipped to the browser.
 */
import { adminDb } from "@/lib/firebase-admin";
import type { BenchmarkDocument } from "@/types/benchmark";
import type { QueryDocumentSnapshot, DocumentData } from "firebase-admin/firestore";

function mapDoc(
  snap: QueryDocumentSnapshot<DocumentData>
): BenchmarkDocument | null {
  const d = snap.data();
  if (
    typeof d.tool_name !== "string" ||
    typeof d.model_id !== "string" ||
    typeof d.source_timestamp !== "string" ||
    typeof d.h2_query !== "string" ||
    typeof d.quick_answer_text !== "string" ||
    typeof d.benchmark_data !== "object"
  ) {
    return null; // malformed document — skip rather than hallucinate
  }

  return {
    id: snap.id,
    tool_name: d.tool_name,
    model_id: d.model_id,
    source_timestamp: d.source_timestamp,
    h2_query: d.h2_query,
    quick_answer_text: d.quick_answer_text,
    benchmark_data: {
      latency_seconds: Number(d.benchmark_data.latency_seconds ?? 0),
      output_tokens: Number(d.benchmark_data.output_tokens ?? 0),
      cost_per_1k_tokens_usd: Number(d.benchmark_data.cost_per_1k_tokens_usd ?? 0),
      cost_per_1m_tokens_usd: Number(d.benchmark_data.cost_per_1m_tokens_usd ?? 0),
    },
  };
}

/**
 * Fetch the N most recent benchmark documents, ordered by source_timestamp desc.
 * @param limit  Max documents to return (default 20)
 */
export async function fetchBenchmarks(limit = 20): Promise<BenchmarkDocument[]> {
  const snapshot = await adminDb
    .collection("llm_benchmarks")
    .orderBy("source_timestamp", "desc")
    .limit(limit)
    .get();

  return snapshot.docs
    .map(mapDoc)
    .filter((d): d is BenchmarkDocument => d !== null);
}
