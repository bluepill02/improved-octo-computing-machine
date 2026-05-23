import { MetadataRoute } from "next";
import { fetchBenchmarks } from "@/lib/fetchBenchmarks";

/**
 * Programmatic sitemap generator.
 * Next.js automatically executes this and exposes it at `/sitemap.xml` in production.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://improved-octo-computing-machine-61iun62si-bluepill02s-projects.vercel.app";

  let dynamicRoutes: MetadataRoute.Sitemap = [];

  try {
    const benchmarks = await fetchBenchmarks(100);
    // De-duplicate slugs to ensure we present clean, unique URLs with their latest timestamps
    const slugMap = new Map<string, string>();
    benchmarks.forEach((doc) => {
      if (doc.slug) {
        const existingTimestamp = slugMap.get(doc.slug);
        if (
          !existingTimestamp ||
          new Date(doc.source_timestamp) > new Date(existingTimestamp)
        ) {
          slugMap.set(doc.slug, doc.source_timestamp);
        }
      }
    });

    dynamicRoutes = Array.from(slugMap.entries()).map(([slug, timestamp]) => ({
      url: `${baseUrl}/compare/${slug}`,
      lastModified: new Date(timestamp),
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));
  } catch (err) {
    console.error("[Sitemap] Failed to construct dynamic routes:", err);
  }

  // The landing dashboard is our primary static entrypoint
  const staticRoutes = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1.0,
    },
  ];

  return [...staticRoutes, ...dynamicRoutes];
}
