import { GoogleGenAI } from "@google/genai";

const PROJECT = process.env.GCLOUD_PROJECT!;
const RAG_LOCATION = process.env.RAG_LOCATION!;
const RAG_CORPUS_NAME = process.env.RAG_CORPUS_NAME!;

const ai = new GoogleGenAI({ vertexai: true, project: PROJECT, location: RAG_LOCATION });

const SYSTEM_PROMPT = `You are a legal assistant for a law firm. Your role is to answer questions based strictly on the documents available in the knowledge base.

Guidelines:
- Answer ONLY using information from the retrieved documents
- Always indicate which document your answer comes from
- If the answer is not found in the documents, clearly state: "This information is not available in the current knowledge base"
- Use formal, professional language appropriate for a legal environment
- Be precise and factual — do not speculate beyond what the documents say
- If documents contain conflicting information, acknowledge it clearly
- Keep answers concise and well-structured

Always recommend consulting with a qualified attorney for advice on specific legal situations.`;

interface ChatMessage {
  role: "user" | "model";
  content: string;
}

export interface QueryResult {
  answer: string;
  sources: Array<{ name: string; excerpt: string }>;
}

export async function ragQuery(
  question: string,
  history: ChatMessage[] = []
): Promise<QueryResult> {
  const chat = ai.chats.create({
    model: "gemini-2.5-flash",
    config: {
      systemInstruction: SYSTEM_PROMPT,
      tools: [
        {
          retrieval: {
            vertexRagStore: {
              ragCorpora: [RAG_CORPUS_NAME],
              similarityTopK: 8,
            },
          },
        } as any,
      ],
    },
    history: history.map((m) => ({
      role: m.role,
      parts: [{ text: m.content }],
    })),
  });

  const response = await chat.sendMessage({ message: question });
  const answer = response.text ?? "";

  // Extract sources from grounding metadata
  const sources = extractSources(response);

  return { answer, sources };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractSources(response: any): Array<{ name: string; excerpt: string }> {
  const sources: Array<{ name: string; excerpt: string }> = [];
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];

  for (const chunk of chunks) {
    const ctx = chunk.retrievedContext;
    if (!ctx) continue;
    const name = ctx.title || ctx.uri?.split("/").pop() || ctx.uri || "Unknown";
    if (!sources.find((s) => s.name === name)) {
      sources.push({
        name,
        excerpt: (ctx.text ?? "").slice(0, 300).trim() + "...",
      });
    }
  }

  return sources;
}
