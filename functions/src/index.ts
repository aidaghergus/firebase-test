import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import * as admin from "firebase-admin";
import { ingestFileFromStorage, ingestUrl, removeDocument } from "./ingest";
import { ragQuery } from "./query";
import {
  ingestCaseFileFromStorage,
  createUserCase,
  listUserCases,
  listUserCaseDocuments,
  removeCaseDocument,
  removeUserCase,
  getCaseDocumentsText,
} from "./cases";

admin.initializeApp();

const REGION = "europe-west1";

// ── Global knowledge base ──────────────────────────────────────────────────

export const processDocument = onObjectFinalized(
  { region: REGION, memory: "512MiB", timeoutSeconds: 120 },
  async (event) => {
    const object = event.data;
    if (!object.name?.startsWith("documents/")) return;
    await ingestFileFromStorage(object);
  }
);

export const processCaseDocument = onObjectFinalized(
  { region: REGION, memory: "512MiB", timeoutSeconds: 120 },
  async (event) => {
    const object = event.data;
    if (!object.name?.startsWith("users/")) return;
    await ingestCaseFileFromStorage(object);
  }
);

export const addWebsite = onCall(
  { region: REGION, memory: "256MiB", timeoutSeconds: 120 },
  async (request) => {
    const { url } = request.data as { url: string };
    if (!url) throw new HttpsError("invalid-argument", "URL is required");
    return await ingestUrl(url);
  }
);

export const chat = onCall(
  { region: REGION, memory: "256MiB", timeoutSeconds: 60 },
  async (request) => {
    const { message, history, caseId } = request.data as {
      message: string;
      history: Array<{ role: "user" | "model"; content: string }>;
      caseId?: string;
    };
    if (!message) throw new HttpsError("invalid-argument", "Message is required");

    let caseContext: string | undefined;
    if (caseId && request.auth?.uid) {
      caseContext = await getCaseDocumentsText(request.auth.uid, caseId);
    }

    return await ragQuery(message, history || [], caseContext || undefined);
  }
);

export const listDocuments = onCall({ region: REGION }, async () => {
  const db = admin.firestore();
  const snapshot = await db.collection("documents").orderBy("createdAt", "desc").get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
});

export const deleteDocument = onCall({ region: REGION }, async (request) => {
  const { documentId } = request.data as { documentId: string };
  if (!documentId) throw new HttpsError("invalid-argument", "documentId is required");
  await removeDocument(documentId);
  return { success: true };
});

// ── Personal cases ─────────────────────────────────────────────────────────

export const createCase = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required");
  const { name } = request.data as { name: string };
  if (!name?.trim()) throw new HttpsError("invalid-argument", "Case name is required");
  return await createUserCase(request.auth.uid, name.trim());
});

export const deleteCase = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required");
  const { caseId } = request.data as { caseId: string };
  if (!caseId) throw new HttpsError("invalid-argument", "caseId is required");
  await removeUserCase(request.auth.uid, caseId);
  return { success: true };
});

export const listCases = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required");
  return await listUserCases(request.auth.uid);
});

export const listCaseDocuments = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required");
  const { caseId } = request.data as { caseId: string };
  if (!caseId) throw new HttpsError("invalid-argument", "caseId is required");
  return await listUserCaseDocuments(request.auth.uid, caseId);
});

export const deleteCaseDocument = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required");
  const { caseId, docId } = request.data as { caseId: string; docId: string };
  if (!caseId || !docId) throw new HttpsError("invalid-argument", "caseId and docId are required");
  await removeCaseDocument(request.auth.uid, caseId, docId);
  return { success: true };
});