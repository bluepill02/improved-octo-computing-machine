"use client";

import { useSearchParams } from "next/navigation";
import {
  AFFILIATE_URL,
  INTENT_CTA_MAP,
  DEFAULT_CTA_TEXT,
} from "@/constants/affiliate";

interface DynamicCTAProps {
  /** Override the resolved intent text externally (e.g. from a modal). */
  overrideText?: string;
  /** Additional CSS class names. */
  className?: string;
  /** Where to render the button — inline on the page, or inside the modal. */
  variant?: "page" | "modal";
  /** Analytics label attached as a data attribute for tracking. */
  analyticsLabel?: string;
}

/**
 * DynamicCTA
 *
 * Reads ?intent= from the URL and maps it to a personalised CTA string.
 * Falls back to DEFAULT_CTA_TEXT when no recognised intent is present.
 * Always routes to AFFILIATE_URL on click — the single hardcoded destination.
 */
export default function DynamicCTA({
  overrideText,
  className = "",
  variant = "page",
  analyticsLabel,
}: DynamicCTAProps) {
  const searchParams = useSearchParams();
  const intentParam  = searchParams.get("intent") ?? "";
  const ctaText      = overrideText
    ?? INTENT_CTA_MAP[intentParam.toLowerCase()]
    ?? DEFAULT_CTA_TEXT;

  const label = analyticsLabel ?? `cta-${variant}-${intentParam || "default"}`;

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    // Allow middle-click / cmd+click to open in new tab natively
    if (e.metaKey || e.ctrlKey || e.button === 1) return;
    // All other clicks: track & navigate
    try {
      // Emit a simple custom event that any analytics layer can listen to
      window.dispatchEvent(
        new CustomEvent("affiliate_cta_click", {
          detail: { label, intent: intentParam, url: AFFILIATE_URL },
        })
      );
    } catch {
      // non-critical
    }
  }

  return (
    <a
      href={AFFILIATE_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      id={label}
      data-intent={intentParam || "none"}
      data-analytics-label={label}
      className={`dynamic-cta ${variant === "modal" ? "cta-modal" : "cta-page"} ${className}`}
      aria-label={`${ctaText} (opens affiliate page in new tab)`}
    >
      <span className="cta-text">{ctaText}</span>
      <span className="cta-arrow" aria-hidden="true">→</span>
    </a>
  );
}
