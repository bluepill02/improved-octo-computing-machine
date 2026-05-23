import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LLM Benchmark Dashboard — Empirical API Telemetry",
  description:
    "Schema-validated benchmark data captured directly from Google AI Studio and OpenRouter APIs. Real latency, token counts, and cost metrics — no estimates, no hallucinations.",
  openGraph: {
    title: "LLM Benchmark Dashboard — Empirical API Telemetry",
    description:
      "Real API telemetry from Google AI Studio and OpenRouter. Every metric schema-validated before storage.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
