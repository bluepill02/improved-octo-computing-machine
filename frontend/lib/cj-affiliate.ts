/**
 * Server-only helper to interact with the CJ Affiliate GraphQL API.
 * Used exclusively in Next.js Server Components and Route Handlers.
 */

function cleanEnvValue(val: string | undefined): string | undefined {
  if (!val) return val;
  return val
    .replace(/^\ufeff/, "")       // Strip Byte Order Mark (BOM)
    .replace(/^"+|"+$/g, "")      // Strip surrounding double quotes
    .replace(/\\r/g, "")          // Strip literal \r
    .replace(/\r/g, "")           // Strip actual carriage returns
    .replace(/\n/g, "")           // Strip actual newlines
    .trim();
}

/**
 * Maps our internal intent/slug keys to relevant search terms for Commission Junction (CJ) advertisers.
 */
const INTENT_SEARCH_MAP: Record<string, string> = {
  "ai-writer": "writer",
  "code-assistant": "code",
  "chatbot": "chat",
  "seo-tool": "seo",
  "image-gen": "design",
  "summariser": "summary",
  "data-analyst": "analytics",
};

/**
 * Dynamic CJ Affiliate Link Resolver.
 * Queries the Commission Junction GraphQL API securely on the server-side
 * and returns the freshest active advertiser clickUrl.
 */
export async function fetchCJAffiliateLink(intent: string): Promise<string> {
  const token = cleanEnvValue(process.env.CJ_AFFILIATE_ACCESS_TOKEN);
  const fallbackUrl = "https://example.com/affiliate-redirect";

  if (!token || token === "YOUR_CJ_ACCESS_TOKEN_HERE") {
    console.warn("[CJ Affiliate] Developer access token is missing or default. Using fallback redirect.");
    return fallbackUrl;
  }

  // CJ GraphQL API endpoint
  const url = "https://ads.api.cj.com/query";
  const searchTerm = INTENT_SEARCH_MAP[intent.toLowerCase()] || intent || "ai";

  // GraphQL query structure looking up active links on publisher account matching search criteria
  const query = `
    query SearchPublisherLinks($searchText: String!) {
      links(searchText: $searchText, limit: 5) {
        results {
          clickUrl
          advertiserName
          linkName
          linkType
        }
      }
    }
  `;

  try {
    console.log(`[CJ Affiliate] Security query triggered. Searching advertiser links for "${searchTerm}"...`);
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        query,
        variables: { searchText: searchTerm },
      }),
      // Add a caching boundary or timeout to prevent request hanging
      next: { revalidate: 3600 }, 
    });

    if (!resp.ok) {
      console.error(`[CJ Affiliate] API Error (HTTP ${resp.status}): ${await resp.text()}`);
      return fallbackUrl;
    }

    const json = await resp.json();
    const results = json.data?.links?.results;

    if (results && results.length > 0) {
      // Pick the first available active link that has a valid clickUrl
      const activeMatch = results.find((r: any) => r.clickUrl);
      if (activeMatch) {
        console.log(`[CJ Affiliate] Successfully resolved active link: ${activeMatch.clickUrl} (${activeMatch.advertiserName})`);
        return activeMatch.clickUrl;
      }
    }
    
    console.log(`[CJ Affiliate] No active links found matching "${searchTerm}". Falling back.`);
  } catch (err) {
    console.error("[CJ Affiliate] Failed to query Commission Junction API:", err);
  }

  return fallbackUrl;
}
