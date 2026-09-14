import { Router, type Request, type Response } from "express";
import { MessageSchema } from "../utils/types";
import { Messages, Threads, Users } from "../models/db_models";
import { vectorStore } from "../utils/vector";
import { callLlm, describeImage } from "../utils/openai";
import upload, { deleteFile } from "../utils/multer";
import { authMiddleware } from "../utils/middleware";
import rateLimit from "express-rate-limit";

const chatLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, 
  limit: (req: any) => {

    if (req.userRole === "admin") return 1000;
    return 5;
  },

  keyGenerator: (req: any) => req.userId || req.ip,
  handler: (req: any, res: Response) => {
    const resetTime = req.rateLimit.resetTime;
    const minutesLeft = Math.ceil(
      (new Date(resetTime).getTime() - Date.now()) / 60000,
    );

    res.status(429).json({
      success: false,
      message: `You have reached your limit of 5 questions per hour.`,
      limit: 5,
      remaining: 0,
      refillIn: `${minutesLeft} minutes`,
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const chatRouter = Router();

export interface RetrivedDocs {
  confidenceScore: string;
  content: string;
  metaData: string;
  sourceFile: string;
  pageNumber: number | null;
  chunkIndex: number | null;
}

async function getOrCreateThread(userId: string) {

  const user = await Users.findById(userId);
  if (user?.thread_id && user.thread_id.length > 0) {
    const thread = await Threads.findById(user.thread_id[0]);
    if (thread) return thread;
  }

  const thread = await Threads.create({
    title: "Default Chat",
    messages: [],
    authors: [userId],
  });

  await Users.findByIdAndUpdate(userId, {
    $push: { thread_id: thread._id },
  });

  return thread;
}

chatRouter.get(
  "/chats",
  authMiddleware,

  async (req: Request, res: Response) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const thread = await getOrCreateThread(userId);

      const messages = await Messages.find({ thread_id: thread._id }).sort({
        createdAt: 1,
      });

      return res.status(200).json({
        success: true,
        message: "Messages fetched successfully",
        data: {
          messages: messages.map((m) => ({
            _id: m._id,
            role: m.role,
            message_description: m.message_description,
            createdAt: (m as any).createdAt,
          })),
          threadId: thread._id,
        },
      });
    } catch (error) {
      console.log("[ERROR]", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  },
);

chatRouter.get("/limit-status", authMiddleware, (req: any, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      role: req.userRole,

      limit: req.userRole === "admin" ? "Unlimited" : 5,
      remaining:
        req.userRole === "admin"
          ? "Unlimited"
          : req.headers["x-ratelimit-remaining"] || "Check headers",
    },
  });
});

chatRouter.post(
  "/chats",
  authMiddleware, 
  chatLimiter, 
  upload.single("image"),
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const { success, data } = MessageSchema.safeParse(req.body);
      if (!success) {
        return res.status(401).json({
          success: false,
          message: "Please provide all fields",
        });
      }

      const { messageType, message, role } = data;
      const imagePath = req.file?.path;

      const thread = await getOrCreateThread(userId);

      const saveUserMessage = await Messages.create({
        role,
        message_description: message,
        thread_id: thread._id,
      });

      await Threads.findByIdAndUpdate(thread._id, {
        $push: { messages: saveUserMessage._id },
      });

      let searchQuery: string;

      if (messageType === "image" && imagePath) {

        const imageDescription = await describeImage(imagePath);
        if (!imageDescription) {
          return res.status(500).json({
            success: false,
            message: "Failed to analyze the image",
          });
        }

        searchQuery = message
          ? `${message} ${imageDescription}`
          : imageDescription;

        console.log("[Image Search Query]:", searchQuery);
      } else {

        if (!message) {
          return res.status(400).json({
            success: false,
            message: "Message is required for text queries",
          });
        }
        searchQuery = message;
      }

      const retrivedDocs: RetrivedDocs[] = [];
      const similaritySearchWithScoreResults =
        await vectorStore.similaritySearchWithScore(searchQuery, 8);

      for (const [doc, score] of similaritySearchWithScoreResults) {
        console.log(
          `* [SIM=${score.toFixed(3)}] ${doc.pageContent.slice(0, 80)}... [${doc.metadata?.sourceFile || "unknown"}]`,
        );
        retrivedDocs.push({
          confidenceScore: score.toFixed(3),
          content: doc.pageContent,
          metaData: JSON.stringify(doc.metadata),
          sourceFile: doc.metadata?.sourceFile || "Unknown source",
          pageNumber: doc.metadata?.pageNumber ?? null,
          chunkIndex: doc.metadata?.chunkIndex ?? null,
        });
      }

      const previousMessages = await Messages.find({ thread_id: thread._id })
        .sort({ createdAt: -1 })
        .skip(1) 
        .limit(6);

      const history = previousMessages.reverse().map((m) => ({
        role: (m.role === "agent" ? "assistant" : "user") as
          | "assistant"
          | "user",
        content: m.message_description || "",
      }));

      // Step 5: Call the LLM with retrieved context + history + user query
      const llmResponse = await callLlm({
        retrivedDocs,
        query: message || searchQuery,
        role: "user",
        history,
        ...(messageType === "image" && imagePath && { imageUrl: imagePath }),
      });

      if (!llmResponse) {
        return res.status(500).json({
          success: false,
          message: "Failed to generate a response",
        });
      }

      const saveAgentMessage = await Messages.create({
        role: "agent",
        message_description: llmResponse,
        thread_id: thread._id,
      });

      await Threads.findByIdAndUpdate(thread._id, {
        $push: { messages: saveAgentMessage._id },
      });

      if (imagePath) {
        deleteFile(imagePath);
      }

      return res.status(200).json({
        success: true,
        data: {
          userMessage: saveUserMessage,
          agentMessage: saveAgentMessage,
          response: llmResponse,
          sources: retrivedDocs,
        },
      });
    } catch (error) {

      if (req.file?.path) {
        deleteFile(req.file.path);
      }
      console.log("[ERROR]", error);
      res.status(500).json({
        success: false,
        message: "internal server error",
      });
    }
  },
);

export default chatRouter;
