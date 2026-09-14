import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import fs from "fs/promises";
import path from "path";
import type { RetrivedDocs } from "../routes/chatRoutes";

const openai = new OpenAI({
  apiKey: process.env.GOOGLE_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 2000,
): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      if (
        error?.status === 429 ||
        error?.status === 503 ||
        error?.status === 504
      ) {
        const delay = baseDelay * Math.pow(2, i);
        console.warn(
          `[WARN] Gemini Rate Limit hit (429). Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".bmp": "image/bmp",
  };
  return mimeMap[ext] || "image/jpeg";
}

async function encodeImage(imagePath: string) {
  try {
    const imageBuffer = await fs.readFile(imagePath);
    return imageBuffer.toString("base64");
  } catch (error) {
    console.error("Error encoding image:", error);
    return null;
  }
}

interface CallLlmInterface {
  retrivedDocs: RetrivedDocs[];
  imageUrl?: string;
  role: "agent" | "user";
  query: string;
  history?: { role: "user" | "assistant" | "system"; content: string }[];
}

function formatContext(docs: RetrivedDocs[]): string {
  if (docs.length === 0) return "No relevant context found in uploaded books.";

  return docs
    .map(
      (doc, i) =>
        `[Document ${i + 1}] (confidence: ${doc.confidenceScore})\n` +
        `Source File: ${doc.sourceFile}\n` +
        `Page: ${doc.pageNumber ?? "N/A"}\n` +
        `Content: ${doc.content}`,
    )
    .join("\n\n");
}

const SYSTEM_PROMPT_TEMPLATE = `You are ARPO, the official Scout & Guide AI assistant for Bharat Scouts and Guides (BSG India). You ONLY answer based on the uploaded documents.

⚠️ LANGUAGE RULE ⚠️
- ALWAYS respond in HINGLISH ONLY (English script, but conversational Hindi/English mix).
- No Devanagari script. No dual translations.
- ONLY use pure Hindi if explicitly requested.

═══ CORE IDENTITY ═══
- Authoritative reference for BSG India rules, awards, and syllabus.
- Solve disputes by citing exact clauses/pages from context.
- If info is missing from context, say: "I could not find this in the uploaded books. Please upload relevant APRO book."

═══ OPERATIONAL RULES ═══
1. CITE SOURCES: Every factual statement must end with [Source: filename, Page X].
2. SYLLABUS: For requirements, provide ordered checklists with  for pending and  for completed.
3. VISUALS: If an image is provided, identify it using context and list its requirements.
4. NO OUTSIDE KNOWLEDGE: Only use the provided context below.`;

export async function callLlm({
  imageUrl,
  retrivedDocs,
  role,
  query,
  history,
}: CallLlmInterface) {
  const context = formatContext(retrivedDocs);

  const systemContent =
    SYSTEM_PROMPT_TEMPLATE +
    `\n\n═══ RETRIEVED CONTEXT FROM UPLOADED BOOKS ═══\n${context}\n═══ END OF CONTEXT ═══`;

  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: systemContent,
    },
  ];

  if (history && history.length > 0) {
    history.forEach((msg) => {
      messages.push({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content,
      });
    });
  }

  if (imageUrl) {
    const base64Image = await encodeImage(imageUrl);
    const mimeType = getMimeType(imageUrl);
    messages.push({
      role: "user",
      content: [
        {
          type: "text" as const,
          text:
            query ||
            "Please identify this badge/image and provide relevant information from the uploaded APRO documents.",
        },
        {
          type: "image_url" as const,
          image_url: {
            url: `data:${mimeType};base64,${base64Image}`,
          },
        },
      ],
    });
  } else {
    messages.push({
      role: "user",
      content: query,
    });
  }

  try {
    const reply = await withRetry(async () => {
      const response = await openai.chat.completions.create({
        model: "gemini-2.0-flash",
        messages,
      });
      return response.choices[0]?.message?.content ?? "";
    });

    console.log("LLM Response:", reply.slice(0, 200) + "...");
    return reply;
  } catch (error: any) {
    if (error?.status === 429) {
      console.error("Gemini API Rate Limit exceeded after retries.");
      return "Rate limit exceeded. Please try again in 1 minute.";
    }
    console.error("Error calling Gemini API:", error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// IMAGE DESCRIPTION — Optimized for Badge / Patch Identification
// This description is used as a Pinecone search query, so it
// must generate text that will match badge-related content.
// ═══════════════════════════════════════════════════════════════

export async function describeImage(imagePath: string): Promise<string | null> {
  const base64Image = await encodeImage(imagePath);
  if (!base64Image) return null;

  try {
    const description = await withRetry(async () => {
      const response = await openai.chat.completions.create({
        model: "gemini-2.0-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text" as const,
                text: `Analyze this BSG (Scout/Guide) badge or document. Describe its visual elements (colors, symbols, text) concisely for a vector search. Focus on identifying the exact name or category of the badge.`,
              },
              {
                type: "image_url" as const,
                image_url: {
                  url: `data:${getMimeType(imagePath)};base64,${base64Image}`,
                },
              },
            ],
          },
        ],
      });
      return response.choices[0]?.message?.content ?? null;
    });

    console.log("Image Description:", description);
    return description;
  } catch (error) {
    console.error("Error describing image:", error);
    return null;
  }
}

