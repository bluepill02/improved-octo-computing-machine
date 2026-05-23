/**
 * Firebase Admin SDK — server-only singleton.
 * Used exclusively in Next.js Server Components and Route Handlers.
 *
 * The service account credentials are read from FIREBASE_CERT_PATH (absolute
 * path to firebase-admin-sdk.json) or from individual env vars set by Vercel.
 */
import { App, cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import path from "path";

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

function cleanPrivateKey(val: string | undefined): string | undefined {
  if (!val) return val;
  // Clean surrounding quotes and carriage returns
  const cleaned = val
    .replace(/^\ufeff/, "")
    .replace(/^"+|"+$/g, "")
    .replace(/\\r/g, "")
    .replace(/\r/g, "")
    .trim();
  // Replace literal \n with actual newlines for service credentials
  return cleaned.replace(/\\n/g, "\n");
}

function resolveServiceAccount() {
  // Prefer an explicit cert file path (local dev)
  const certPath = process.env.FIREBASE_CERT_PATH;
  if (certPath) {
    const resolved = path.isAbsolute(certPath)
      ? certPath
      : path.resolve(process.cwd(), certPath);
    // Use readFileSync — avoids dynamic require() which Turbopack cannot analyse
    const raw = readFileSync(resolved, "utf-8");
    return cert(JSON.parse(raw));
  }

  // Vercel / CI: individual env vars
  const projectId = cleanEnvValue(process.env.FIREBASE_PROJECT_ID);
  const clientEmail = cleanEnvValue(process.env.FIREBASE_CLIENT_EMAIL);
  const privateKey = cleanPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase credentials missing. Set FIREBASE_CERT_PATH (local) " +
        "or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY (Vercel)."
    );
  }

  return cert({ projectId, clientEmail, privateKey });
}

function getAdminApp(): App {
  if (getApps().length > 0) return getApp();
  return initializeApp({ credential: resolveServiceAccount() });
}

/** Server-side Firestore client (Admin SDK). */
export const adminDb = getFirestore(getAdminApp());
