/**
 * Hardcoded affiliate destination — single source of truth for all CTA routing.
 * Change this one constant to update every button, modal, and link site-wide.
 */
export const AFFILIATE_URL = "https://example.com/affiliate-redirect";

/**
 * Maps URL ?intent= values to human-readable CTA button text.
 * Add new intents here as affiliate campaigns grow.
 */
export const INTENT_CTA_MAP: Record<string, string> = {
  "ai-writer":        "Get the Fastest AI Writer",
  "code-assistant":   "Get the Best Code Assistant",
  "chatbot":          "Get the Smartest Chatbot",
  "image-gen":        "Get the Best Image Generator",
  "seo-tool":         "Get the Top SEO AI Tool",
  "summariser":       "Get the Best AI Summariser",
  "data-analyst":     "Get the Best AI Data Analyst",
};

export const DEFAULT_CTA_TEXT = "View Recommended Platform";

/** sessionStorage key — prevents exit-intent modal from firing more than once per session */
export const EXIT_INTENT_SESSION_KEY = "exit_intent_shown";
