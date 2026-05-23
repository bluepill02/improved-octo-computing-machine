import { NextRequest, NextResponse } from "next/server";
import { fetchCJAffiliateLink } from "@/lib/cj-affiliate";

/**
 * Next.js server-side route handler to securely resolve and redirect users 
 * to active CJ Affiliate advertiser links.
 * Exposes endpoint `/api/affiliate?intent=...`
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const intent = searchParams.get("intent") || "";

  // Call the server-side Commission Junction resolver
  const redirectUrl = await fetchCJAffiliateLink(intent);

  // Return a 302 redirect to the resolved CJ link
  return NextResponse.redirect(redirectUrl, { status: 302 });
}
