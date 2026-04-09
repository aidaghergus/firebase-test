import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { StorageObjectData } from "firebase-functions/v2/storage";

const RAG_LOCATION = process.env.RAG_LOCATION!;
const RAG_CORPUS_NAME = process.env.RAG_CORPUS_NAME!;

async function getAccessToken(): Promise<string> {
  const res = await fetch(
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
    { headers: { "Metadata-Flavor": "Google" } }
  );
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

async function importGcsFileToCorpus(gcsUri: string, displayName: string): Promise<void> {
  const token = await getAccessToken();
  const url = `https://${RAG_LOCATION}-aiplatform.googleapis.com/v1beta1/${RAG_CORPUS_NAME}/ragFiles:import`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      importRagFilesConfig: {
        gcsSource: { uris: [gcsUri] },
        ragFileChunkingConfig: {
          fixedLengthChunking: { chunkSize: 1024, chunkOverlap: 200 },
        },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`RAG import failed: ${res.status} ${err}`);
  }

  // The import is a long-running operation — we fire and forget
  const op = await res.json();
  console.log("RAG import operation started:", op.name);
}

async function findAndDeleteRagFile(sourceUri: string): Promise<void> {
  const token = await getAccessToken();
  const listUrl = `https://${RAG_LOCATION}-aiplatform.googleapis.com/v1beta1/${RAG_CORPUS_NAME}/ragFiles?pageSize=100`;

  const listRes = await fetch(listUrl, {
    headers: { "Authorization": `Bearer ${token}` },
  });

  if (!listRes.ok) return;

  const data = await listRes.json() as {
    ragFiles?: Array<{ name: string; gcsSource?: { uris: string[] } }>;
  };

  const matches = (data.ragFiles || []).filter((f) =>
    f.gcsSource?.uris?.some((u) => u === sourceUri)
  );

  for (const file of matches) {
    const deleteUrl = `https://${RAG_LOCATION}-aiplatform.googleapis.com/v1beta1/${file.name}`;
    await fetch(deleteUrl, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` },
    });
    console.log("Deleted RAG file:", file.name);
  }
}

export async function ingestFileFromStorage(object: StorageObjectData): Promise<void> {
  const db = admin.firestore();
  const { name: filePath, contentType, bucket: bucketName } = object;

  if (!filePath || !contentType) return;

  const isPDF = contentType === "application/pdf";
  const isWord =
    contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    filePath.endsWith(".docx");

  if (!isPDF && !isWord) return;

  const existing = await db.collection("documents").where("source", "==", filePath).limit(1).get();
  if (!existing.empty) return;

  const fileName = filePath.split("/").pop() || filePath;
  const gcsUri = `gs://${bucketName}/${filePath}`;

  console.log("Importing to RAG corpus:", fileName);
  await importGcsFileToCorpus(gcsUri, fileName);

  await db.collection("documents").add({
    name: fileName,
    type: "file",
    source: filePath,
    gcsUri,
    status: "importing",
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function ingestUrl(url: string): Promise<{ success: boolean }> {
  const db = admin.firestore();

  const existing = await db.collection("documents").where("source", "==", url).limit(1).get();
  if (!existing.empty) throw new Error("URL already ingested.");

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    },
  });
  if (!response.ok) {
    if (response.status === 403) {
      throw new Error(`The website blocked access (403 Forbidden). This site does not allow automated access. Try downloading the page as a PDF and uploading it instead.`);
    }
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const title = extractTitle(html) || new URL(url).hostname;
  const text = extractTextFromHtml(html);

  if (!text.trim()) throw new Error("No readable content found at URL.");

  // Upload text to Firebase Storage, then import from GCS
  const bucket = admin.storage().bucket();
  const safeName = title.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 60);
  const gcsPath = `documents/web_${Date.now()}_${safeName}.txt`;
  await bucket.file(gcsPath).save(text, { contentType: "text/plain; charset=utf-8" });

  const gcsUri = `gs://${bucket.name}/${gcsPath}`;
  await importGcsFileToCorpus(gcsUri, title);

  await db.collection("documents").add({
    name: title,
    type: "website",
    source: url,
    gcsUri,
    gcsPath,
    status: "importing",
    createdAt: FieldValue.serverTimestamp(),
  });

  return { success: true };
}

export async function removeDocument(documentId: string): Promise<void> {
  const db = admin.firestore();
  const docRef = db.collection("documents").doc(documentId);
  const doc = await docRef.get();
  if (!doc.exists) throw new Error("Document not found");

  const data = doc.data()!;

  // Remove from RAG corpus
  if (data.gcsUri) {
    await findAndDeleteRagFile(data.gcsUri);
  }

  // Remove GCS text file for websites
  if (data.gcsPath) {
    try {
      await admin.storage().bucket().file(data.gcsPath).delete();
    } catch {
      // File might already be gone
    }
  }

  await docRef.delete();
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : "";
}

function extractTextFromHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
