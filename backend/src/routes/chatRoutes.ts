import { Router, type Request, type Response } from "express";
import mongoose from "mongoose";
import { MessageSchema } from "../utils/types";
import { Messages, Threads, Users } from "../models/db_models";
import { vectorStore } from "../utils/vector";
import { AiBusyError, callLlm, describeImage } from "../utils/openai";
import upload, { deleteFile } from "../utils/multer";
import { authMiddleware, isStaff } from "../utils/middleware";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

const USER_HOURLY_LIMIT = 5;

async function currentRole(userId: string | undefined) {
  if (!userId) return undefined;
  const user = await Users.findById(userId).select("role");
  return user?.role ?? undefined;
}

// Error codes let the frontend show the message in the user's language.
type ErrorCode =
  | "UNAUTHORIZED"
  | "INVALID_INPUT"
  | "RATE_LIMITED"
  | "IMAGE_FAILED"
  | "NO_ANSWER"
  | "NOT_FOUND"
  | "AI_UNAVAILABLE"
  | "AI_BUSY"
  | "SERVER_ERROR";

function fail(res: Response, status: number, code: ErrorCode, message: string) {
  return res.status(status).json({ success: false, code, message });
}

const chatLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: USER_HOURLY_LIMIT,
  // Admins and sub-admins have no question limit (live role, so removed access applies at once)
  skip: async (req: any) => isStaff(await currentRole(req.userId)),
  keyGenerator: (req: any) => req.userId || ipKeyGenerator(req.ip),
  handler: (req: any, res: Response) => {
    const resetTime = req.rateLimit.resetTime;
    const minutesLeft = Math.ceil(
      (new Date(resetTime).getTime() - Date.now()) / 60000,
    );

    res.status(429).json({
      success: false,
      code: "RATE_LIMITED",
      message: `You have reached your limit of ${USER_HOURLY_LIMIT} questions per hour.`,
      limit: USER_HOURLY_LIMIT,
      remaining: 0,
      refillIn: minutesLeft,
      resetTime,
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

function toThreadSummary(thread: any) {
  return {
    _id: thread._id,
    title: thread.title,
    updatedAt: thread.updatedAt,
    createdAt: thread.createdAt,
  };
}

function toClientMessage(m: any) {
  return {
    _id: m._id,
    role: m.role,
    message_description: m.message_description,
    sources: m.sources ?? [],
    createdAt: m.createdAt,
  };
}

/** A thread the user is an author of, or null. */
async function findUserThread(userId: string, threadId: string) {
  if (!mongoose.isValidObjectId(threadId)) return null;
  return Threads.findOne({ _id: threadId, authors: userId });
}

function titleFrom(message: string | undefined, isImage: boolean) {
  const text = (message ?? "").replace(/\s+/g, " ").trim();
  if (!text) return isImage ? "Image question" : "New conversation";
  return text.length > 60 ? `${text.slice(0, 57)}…` : text;
}

async function createThread(userId: string, title: string) {
  const thread = await Threads.create({
    title,
    messages: [],
    authors: [userId],
  });
  await Users.findByIdAndUpdate(userId, { $push: { thread_id: thread._id } });
  return thread;
}

/* ───────────── Conversations ───────────── */

chatRouter.get("/threads", authMiddleware, async (req: Request, res: Response) => {
  try {
    const threads = await Threads.find({ authors: req.userId })
      .sort({ updatedAt: -1 })
      .limit(100);

    return res.status(200).json({
      success: true,
      data: { threads: threads.map(toThreadSummary) },
    });
  } catch (error) {
    console.log("[ERROR]", error);
    return fail(res, 500, "SERVER_ERROR", "Internal server error");
  }
});

chatRouter.get(
  "/threads/:threadId/messages",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const thread = await findUserThread(req.userId!, String(req.params.threadId));
      if (!thread) return fail(res, 404, "NOT_FOUND", "Conversation not found");

      const messages = await Messages.find({ thread_id: thread._id }).sort({
        createdAt: 1,
      });

      return res.status(200).json({
        success: true,
        data: {
          thread: toThreadSummary(thread),
          messages: messages.map(toClientMessage),
        },
      });
    } catch (error) {
      console.log("[ERROR]", error);
      return fail(res, 500, "SERVER_ERROR", "Internal server error");
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
