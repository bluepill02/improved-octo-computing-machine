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
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

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
