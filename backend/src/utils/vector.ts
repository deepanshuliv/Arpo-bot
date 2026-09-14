import { PineconeStore } from "@langchain/pinecone";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";
import { Embeddings, type EmbeddingsParams } from "@langchain/core/embeddings";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface GeminiEmbeddingsConfig extends EmbeddingsParams {
  apiKey: string;
  modelName?: string;
  dimensions?: number;
}

class GeminiEmbeddings768 extends Embeddings {
  private client: GoogleGenerativeAI;
  private modelName: string;
  private dimensions: number;

  constructor(config: GeminiEmbeddingsConfig) {
    super(config);
    this.client = new GoogleGenerativeAI(config.apiKey);
    this.modelName = config.modelName || "gemini-embedding-001";
    this.dimensions = config.dimensions || 768;
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const model = this.client.getGenerativeModel({ model: this.modelName });

    const concurrency = 5;
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += concurrency) {
      const batch = texts.slice(i, i + concurrency);
      const results = await Promise.all(
        batch.map((text) =>
          model.embedContent({
            content: { role: "user" as const, parts: [{ text }] },
            outputDimensionality: this.dimensions,
          } as Parameters<typeof model.embedContent>[0]),
        ),
      );
      for (const result of results) {
        allEmbeddings.push(result.embedding.values);
      }
    }

    return allEmbeddings;
  }

  async embedQuery(text: string): Promise<number[]> {
    const model = this.client.getGenerativeModel({ model: this.modelName });
    const result = await model.embedContent({
      content: { role: "user" as const, parts: [{ text }] },
      outputDimensionality: this.dimensions,
    } as Parameters<typeof model.embedContent>[0]);
    return result.embedding.values;
  }
}

export const embeddings = new GeminiEmbeddings768({
  apiKey: process.env.GOOGLE_API_KEY!,
  modelName: "gemini-embedding-001",
  dimensions: 768,
});

const pinecone = new PineconeClient();
const pineconeIndex = pinecone.Index(
  process.env.PINECONE_INDEX!,
  process.env.PINECONE_HOST!,
);

export const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
  pineconeIndex,
  maxConcurrency: 5,
});
