import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import * as admin from "firebase-admin";
import { ingestFileFromStorage, ingestUrl, removeDocument } from "./ingest";
import { ragQuery } from "./query";

admin.initializeApp();

const REGION = "europe-west1";

// Automatically process files uploaded to Storage under /documents/
export const processDocument = onObjectFinalized(
  { region: REGION, memory: "512MiB", timeoutSeconds: 120 },
  async (event) => {
    const object = event.data;
    if (!object.name?.startsWith("documents/")) return;
    await ingestFileFromStorage(object);
  }
);

// Scrape and ingest a website URL
export const addWebsite = onCall(
  { region: REGION, memory: "256MiB", timeoutSeconds: 120 },
  async (request) => {
    const { url } = request.data as { url: string };
    if (!url) throw new HttpsError("invalid-argument", "URL is required");
    return await ingestUrl(url);
  }
);

// RAG chat endpoint
export const chat = onCall(
  { region: REGION, memory: "256MiB", timeoutSeconds: 60 },
  async (request) => {
    const { message, history } = request.data as {
      message: string;
      history: Array<{ role: "user" | "model"; content: string }>;
    };
    if (!message) throw new HttpsError("invalid-argument", "Message is required");
    return await ragQuery(message, history || []);
  }
);

// List all documents in the knowledge base
export const listDocuments = onCall({ region: REGION }, async () => {
  const db = admin.firestore();
  const snapshot = await db.collection("documents").orderBy("createdAt", "desc").get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
});

// Delete a document from the RAG corpus and Firestore
export const deleteDocument = onCall({ region: REGION }, async (request) => {
  const { documentId } = request.data as { documentId: string };
  if (!documentId) throw new HttpsError("invalid-argument", "documentId is required");
  await removeDocument(documentId);
  return { success: true };
});
