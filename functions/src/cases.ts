import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { StorageObjectData } from "firebase-functions/v2/storage";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

const MAX_TEXT_LENGTH = 800_000;

async function extractText(buffer: Buffer, contentType: string, filePath: string): Promise<string> {
  if (contentType === "application/pdf") {
    const data = await pdfParse(buffer);
    return data.text.slice(0, MAX_TEXT_LENGTH);
  }
  if (
    contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    filePath.endsWith(".docx")
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.slice(0, MAX_TEXT_LENGTH);
  }
  return "";
}

export async function ingestCaseFileFromStorage(object: StorageObjectData): Promise<void> {
  const db = admin.firestore();
  const { name: filePath, contentType, bucket: bucketName } = object;
  if (!filePath || !contentType) return;

  // path: users/{uid}/cases/{caseId}/{filename}
  const match = filePath.match(/^users\/([^/]+)\/cases\/([^/]+)\/(.+)$/);
  if (!match) return;
  const [, uid, caseId, fileName] = match;

  const isPDF = contentType === "application/pdf";
  const isWord =
    contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    filePath.endsWith(".docx");
  if (!isPDF && !isWord) return;

  const existing = await db
    .collection(`users/${uid}/cases/${caseId}/documents`)
    .where("source", "==", filePath)
    .limit(1)
    .get();
  if (!existing.empty) return;

  const bucket = admin.storage().bucket(bucketName);
  const [buffer] = await bucket.file(filePath).download();
  const text = await extractText(buffer, contentType, filePath);
  if (!text.trim()) {
    console.warn("No text extracted from:", filePath);
    return;
  }

  await db.collection(`users/${uid}/cases/${caseId}/documents`).add({
    name: fileName,
    source: filePath,
    text,
    size: buffer.length,
    createdAt: FieldValue.serverTimestamp(),
  });

  console.log(`Ingested case document: ${fileName} for user ${uid}, case ${caseId}`);
}

export async function createUserCase(uid: string, name: string): Promise<{ id: string; name: string }> {
  const db = admin.firestore();
  const ref = await db.collection(`users/${uid}/cases`).add({
    name,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { id: ref.id, name };
}

export async function listUserCases(uid: string): Promise<Array<{ id: string; name: string }>> {
  const db = admin.firestore();
  const snapshot = await db.collection(`users/${uid}/cases`).orderBy("createdAt", "desc").get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));
}

export async function listUserCaseDocuments(
  uid: string,
  caseId: string
): Promise<Array<{ id: string; name: string; size: number }>> {
  const db = admin.firestore();
  const snapshot = await db
    .collection(`users/${uid}/cases/${caseId}/documents`)
    .orderBy("createdAt", "desc")
    .get();
  return snapshot.docs.map((doc) => {
    const { text, ...rest } = doc.data();
    return { id: doc.id, ...rest } as any;
  });
}

export async function removeCaseDocument(uid: string, caseId: string, docId: string): Promise<void> {
  const db = admin.firestore();
  const docRef = db.collection(`users/${uid}/cases/${caseId}/documents`).doc(docId);
  const doc = await docRef.get();
  if (!doc.exists) throw new Error("Document not found");
  const data = doc.data()!;
  if (data.source) {
    try {
      await admin.storage().bucket().file(data.source).delete();
    } catch {}
  }
  await docRef.delete();
}

export async function removeUserCase(uid: string, caseId: string): Promise<void> {
  const db = admin.firestore();
  const docs = await db.collection(`users/${uid}/cases/${caseId}/documents`).get();
  const batch = db.batch();
  for (const doc of docs.docs) {
    const data = doc.data();
    if (data.source) {
      try {
        await admin.storage().bucket().file(data.source).delete();
      } catch {}
    }
    batch.delete(doc.ref);
  }
  await batch.commit();
  await db.collection(`users/${uid}/cases`).doc(caseId).delete();
}

export async function getCaseDocumentsText(uid: string, caseId: string): Promise<string> {
  const db = admin.firestore();
  const snapshot = await db.collection(`users/${uid}/cases/${caseId}/documents`).get();
  if (snapshot.empty) return "";
  return snapshot.docs
    .map((doc) => {
      const data = doc.data();
      return `[Document: ${data.name}]\n${data.text}`;
    })
    .join("\n\n---\n\n");
}
