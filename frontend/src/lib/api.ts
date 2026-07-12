const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export type Language = "en" | "hi";

/** Codes the backend returns so errors can be shown in the reader's language. */
export type ErrorCode =
  | "UNAUTHORIZED"
  | "INVALID_INPUT"
  | "RATE_LIMITED"
  | "IMAGE_FAILED"
  | "NO_ANSWER"
  | "NOT_FOUND"
  | "AI_UNAVAILABLE"
  | "AI_BUSY"
  | "FORBIDDEN"
  | "EMAIL_TAKEN"
  | "ALREADY_STAFF"
  | "NAME_REQUIRED"
  | "INVALID_EMAIL"
  | "PASSWORD_TOO_SHORT"
  | "ACCOUNT_NOT_FOUND"
  | "WRONG_PASSWORD"
  | "PASSWORDS_DONT_MATCH"
  | "RESET_DISABLED"
  | "TOO_MANY_ATTEMPTS"
  | "SERVER_ERROR"
  | "NETWORK";

export type Role = "user" | "subadmin" | "admin";

/** Admins and sub-admins: knowledge-base access and no question limit. */
export function isStaffRole(role: string | undefined | null) {
  return role === "admin" || role === "subadmin";
}

export interface ApiResponse<T> {
  success: boolean;
  code?: ErrorCode;
  message?: string;
  refillIn?: number;
  data?: T;
}

export interface SourceDoc {
  confidenceScore: string;
  content: string;
  sourceFile: string;
  pageNumber: number | null;
  chunkIndex: number | null;
}

export interface ThreadSummary {
  _id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
}

export interface ApiMessage {
  _id: string;
  role: "user" | "agent";
  message_description: string;
  sources?: SourceDoc[];
  createdAt: string;
}

export interface LimitStatus {
  role: string;
  limit: number | "Unlimited";
  remaining: number | "Unlimited";
  resetTime?: string | null;
}

export interface IndexedDocument {
  fileName: string;
  passages: number;
  pages: number | null;
  uploadedAt: string | null;
}

export interface PdfUploadResult {
  totalChunks: number;
  files: Array<{
    fileName: string;
    chunks: number;
    status: "success" | "failed";
    error?: string;
  }>;
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("arpo_token");
  return token ? { Authorization: "Bearer " + token } : {};
}

/** fetch + JSON that never throws: network failures become code NETWORK. */
async function request<T>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(API_BASE + path, init);
    const body = (await res.json().catch(() => ({}))) as ApiResponse<T>;
    if (!res.ok && body.success !== false) {
      return { success: false, code: "SERVER_ERROR", message: res.statusText };
    }
    return body;
  } catch {
    return { success: false, code: "NETWORK" };
  }
}

function jsonPost(body: unknown): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  };
}

/* ───── Accounts ───── */

interface AuthData {
  token: string;
  role?: string;
  name?: string;
}

export function signUp(name: string, email: string, password: string) {
  return request<AuthData>("/api/v1/signup", jsonPost({ name, email, password }));
}

export function signIn(email: string, password: string) {
  return request<AuthData>("/api/v1/signin", jsonPost({ email, password }));
}

export function adminSignIn(email: string, password: string) {
  return request<AuthData>("/api/v1/admin/signin", jsonPost({ email, password }));
}

/** Local-only reset (no email). Off unless the backend enables it. */
export function getResetStatus() {
  return request<{ enabled: boolean }>("/api/v1/password/reset");
}

export function resetPassword(email: string, password: string, confirmPassword: string) {
  return request<void>(
    "/api/v1/password/reset",
    jsonPost({ email, password, confirmPassword }),
  );
}

/* ───── Conversations ───── */

export function getThreads() {
  return request<{ threads: ThreadSummary[] }>("/api/v1/threads", {
    headers: authHeaders(),
  });
}

export function getThreadMessages(threadId: string) {
  return request<{ thread: ThreadSummary; messages: ApiMessage[] }>(
    `/api/v1/threads/${threadId}/messages`,
    { headers: authHeaders() },
  );
}

export function deleteThread(threadId: string) {
  return request<void>(`/api/v1/threads/${threadId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}

interface AskData {
  thread: ThreadSummary;
  response: string;
  sources: SourceDoc[];
}

/** Ask a question; omit threadId to start a new conversation. */
export function sendMessage({
  message,
  imageFile,
  threadId,
  language,
}: {
  message: string;
  imageFile?: File;
  threadId?: string | null;
  language: Language;
}) {
  if (imageFile) {
    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("message", message);
    formData.append("messageType", "image");
    formData.append("role", role);

    const res = await fetch(API_BASE + "/api/v1/chats", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,

      },
      body: formData,
    });
    return res.json();
  }

  const res = await fetch(API_BASE + "/api/v1/chats", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({ message, messageType: "text", role }),
  });
  return res.json();
}

export async function getMessages() {
  const token = localStorage.getItem("arpo_token");

  const res = await fetch(API_BASE + "/api/v1/chats", {
    method: "GET",
    headers: {
      Authorization: "Bearer " + token,
    },
  });
  return res.json();
}

export async function getLimitStatus() {
  const token = localStorage.getItem("arpo_token");

  const res = await fetch(API_BASE + "/api/v1/limit-status", {
    method: "GET",
    headers: {
      Authorization: "Bearer " + token,
    },
  });
  return res.json();
}

export async function uploadPdfs(files: File[]) {
  const token = localStorage.getItem("arpo_token");
  const formData = new FormData();
  for (const file of files) {
    formData.append("pdfFiles", file);
  }

  const res = await fetch(API_BASE + "/api/v1/pinecone/pdf", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,

    },
    body: formData,
  });
  return res.json();
}
