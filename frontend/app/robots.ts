import { MetadataRoute } from "next";

/**
 * Standard robots.txt configuration.
 * Next.js automatically executes this and exposes it at `/robots.txt` in production.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://improved-octo-computing-machine-61iun62si-bluepill02s-projects.vercel.app";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
