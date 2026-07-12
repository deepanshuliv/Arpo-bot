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
  metaData: string;
  sourceFile: string;
  pageNumber: number | null;
  chunkIndex: number | null;
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

export async function signUp(name: string, email: string, password: string) {
  const res = await fetch(API_BASE + "/api/v1/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  return res.json();
}

export async function signIn(email: string, password: string) {
  const res = await fetch(API_BASE + "/api/v1/signin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function adminSignIn(email: string, password: string) {
  const res = await fetch(API_BASE + "/api/v1/admin/signin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function sendMessage(
  message: string,
  role: string = "user",
  imageFile?: File,
) {
  const token = localStorage.getItem("arpo_token");

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
