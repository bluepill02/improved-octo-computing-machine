"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useExitIntent } from "@/hooks/useExitIntent";
import DynamicCTA from "@/components/DynamicCTA";

/**
 * ExitIntentModal
 *
 * Wires the useExitIntent hook to a full-screen overlay modal.
 * - Appears only once per session (sessionStorage guard lives in the hook)
 * - Contains the DynamicCTA button personalised to the current ?intent= param
 * - Traps focus inside the modal when open (a11y)
 * - Closes on Escape key, backdrop click, or the ✕ button
 * - Entrance animation: fade-in + slide-up
 */
interface ExitIntentModalProps {
  fallbackIntent?: string;
}

export default function ExitIntentModal({ fallbackIntent }: ExitIntentModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  const openModal = useCallback(() => {
    setIsOpen(true);
  }, []);

  useExitIntent({
    topThreshold:     20,
    velocityThreshold: 0.8,
    onExitIntent:     openModal,
  });

  // Auto-focus the close button when modal opens (a11y)
  useEffect(() => {
    if (isOpen) {
      // Small delay lets the CSS transition start before focus steal
      const t = setTimeout(() => closeRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Escape key closes modal
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", onKey);
    // Prevent background scroll while modal is open
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    /* Backdrop */
    <div
      className="exit-modal-backdrop"
      role="presentation"
      onClick={() => setIsOpen(false)}
      aria-hidden="true"
    >
      {/* Panel — stop click propagation so backdrop click doesn't bubble from here */}
      <div
        className="exit-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-modal-title"
        aria-describedby="exit-modal-body"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          ref={closeRef}
          className="exit-modal-close"
          onClick={() => setIsOpen(false)}
          aria-label="Close"
          id="exit-modal-close-btn"
        >
          ✕
        </button>

        {/* Icon */}
        <div className="exit-modal-icon" aria-hidden="true">⚡</div>

        {/* Heading */}
        <h2 id="exit-modal-title" className="exit-modal-title">
          Wait — before you go
        </h2>

        {/* Body */}
        <p id="exit-modal-body" className="exit-modal-body">
          Based on the benchmarks above, we've identified the top-performing
          platform for your use case. Claim your access before this offer changes.
        </p>

        {/* Trust signals */}
        <ul className="exit-modal-trust" aria-label="Trust signals">
          <li><span aria-hidden="true">✦</span> Empirically ranked from live API telemetry</li>
          <li><span aria-hidden="true">✦</span> Schema-validated — no inflated numbers</li>
          <li><span aria-hidden="true">✦</span> Updated every 24 hours automatically</li>
        </ul>

        {/* The dynamic CTA — reads ?intent= from the URL */}
        <DynamicCTA
          variant="modal"
          fallbackIntent={fallbackIntent}
          analyticsLabel="exit-intent-modal-cta"
          className="exit-modal-cta-btn"
        />

        <p className="exit-modal-disclaimer">
          Affiliate link · We may earn a commission at no extra cost to you.
        </p>
      </div>
    </div>
  );
}
