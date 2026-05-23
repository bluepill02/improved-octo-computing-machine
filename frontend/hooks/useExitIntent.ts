"use client";

import { useEffect, useRef, useCallback } from "react";
import { EXIT_INTENT_SESSION_KEY } from "@/constants/affiliate";

interface UseExitIntentOptions {
  /**
   * Y-coordinate threshold in px from the top of the viewport.
   * When the cursor crosses above this line it qualifies as "heading for chrome".
   * Default: 20
   */
  topThreshold?: number;
  /**
   * Minimum mouse velocity (px/ms) required to count as a rapid upward move.
   * Filters out accidental slow drifts toward the top.
   * Default: 1.0
   */
  velocityThreshold?: number;
  /** Callback invoked the first time exit intent is detected this session. */
  onExitIntent: () => void;
}

/**
 * useExitIntent
 *
 * Tracks mouse velocity on every `mousemove` event.
 * Triggers `onExitIntent` when ALL three conditions are met simultaneously:
 *   1. Cursor is within `topThreshold` px of the viewport top (heading for chrome)
 *   2. The upward velocity exceeds `velocityThreshold` px/ms
 *   3. The modal hasn't already fired this session (sessionStorage guard)
 *
 * The hook removes itself after the first trigger to prevent duplicate fires.
 */
export function useExitIntent({
  topThreshold = 20,
  velocityThreshold = 1.0,
  onExitIntent,
}: UseExitIntentOptions): void {
  const lastPosition = useRef<{ x: number; y: number; t: number } | null>(null);
  const triggered    = useRef(false);
  // Stable callback ref so we can safely remove the exact same listener
  const onExitIntentRef = useRef(onExitIntent);
  useEffect(() => { onExitIntentRef.current = onExitIntent; }, [onExitIntent]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (triggered.current) return;

      const now = performance.now();
      const cur = { x: e.clientX, y: e.clientY, t: now };

      if (lastPosition.current) {
        const prev = lastPosition.current;
        const dt   = cur.t - prev.t;

        if (dt > 0) {
          const dy       = cur.y - prev.y;          // negative = moving up
          const distance = Math.sqrt((cur.x - prev.x) ** 2 + dy ** 2);
          const velocity = distance / dt;            // px/ms

          const movingUp         = dy < 0;
          const nearTop          = cur.y <= topThreshold;
          const fastEnough       = velocity >= velocityThreshold;

          if (movingUp && nearTop && fastEnough) {
            // Check session guard before firing
            try {
              if (sessionStorage.getItem(EXIT_INTENT_SESSION_KEY)) return;
              sessionStorage.setItem(EXIT_INTENT_SESSION_KEY, "1");
            } catch {
              // sessionStorage may be unavailable in some contexts — still fire once
            }

            triggered.current = true;
            document.removeEventListener("mousemove", handleMouseMove);
            onExitIntentRef.current();
          }
        }
      }

      lastPosition.current = cur;
    },
    [topThreshold, velocityThreshold]
  );

  useEffect(() => {
    // Don't attach if already fired this session
    try {
      if (sessionStorage.getItem(EXIT_INTENT_SESSION_KEY)) return;
    } catch {
      // continue
    }

    document.addEventListener("mousemove", handleMouseMove);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [handleMouseMove]);
}
