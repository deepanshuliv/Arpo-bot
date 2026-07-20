"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import {
  ArrowUp,
  ArrowUpRight,
  BookOpenText,
  Books,
  FirstAidKit,
  ImageSquare,
  Medal,
  NotePencil,
  Paperclip,
  Lasso,
  Trash,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import AppShell, { shellStyles } from "@/components/AppShell";
import AnswerText from "@/components/AnswerText";
import Logo from "@/components/Logo";
import {
  deleteThread,
  getLimitStatus,
  getThreadMessages,
  getThreads,
  isStaffRole,
  sendMessage,
  type ErrorCode,
  type Language,
  type LimitStatus,
  type SourceDoc,
  type ThreadSummary,
} from "@/lib/api";
import { useSession } from "@/lib/session";
import styles from "./chat.module.css";

interface Message {
  id: string;
  role: "user" | "agent";
  content: string;
  sources?: SourceDoc[];
  imagePreview?: string;
  timestamp: Date;
}

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showSources, setShowSources] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [usage, setUsage] = useState<any>({ remaining: 5, limit: 5 });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    const token = localStorage.getItem("arpo_token");
    if (!token) {
      router.replace("/auth");
      return;
    }
    const role = localStorage.getItem("arpo_role");
    setIsAdmin(role === "admin");

    async function loadChatHistory() {
      try {
        const res = await getMessages();
        if (res.success && res.data?.messages?.length > 0) {
          const history: Message[] = res.data.messages.map(
            (m: {
              _id: string;
              role: string;
              message_description: string;
              createdAt: string;
            }) => ({
              id: m._id,
              role: m.role as "user" | "agent",
              content: m.message_description || "",
              timestamp: new Date(m.createdAt),
            }),
          );
          setMessages(history);
        }
      } catch (err) {
        console.error("Failed to load chat history:", err);
      } finally {
        setLoadingHistory(false);
      }
    }

    async function loadLimit() {
      try {
        const res = await getLimitStatus();
        if (res.success) {
          setUsage(res.data);
        }
      } catch (err) {
        console.error("Failed to load limit status:", err);
      }
    }

    loadChatHistory();
    loadLimit();
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.type.startsWith("image/")) {
          handleFile(file);
        }
      }
    },
    [handleFile],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) handleFile(file);
          break;
        }
      }
    },
    [handleFile],
  );

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !imageFile) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      imagePreview: imagePreview || undefined,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    const currentInput = input;
    const currentImage = imageFile;
    setInput("");
    removeImage();
    setLoading(true);

    try {
      const res = await sendMessage(
        currentInput,
        "user",
        currentImage || undefined,
      );

      const agentMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "agent",
        content: res.data?.response || res.message || "No response received.",
        sources: res.data?.sources,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, agentMsg]);

      const limitRes = await getLimitStatus();
      if (limitRes.success) setUsage(limitRes.data);
    } catch (err: any) {

      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "agent",
        content:
          err?.message ||
          "Failed to connect. You might have reached your limit.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("arpo_token");
    localStorage.removeItem("arpo_role");
    localStorage.removeItem("arpo_name");
    router.replace("/auth");
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div
      className={styles.layout}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {}
      {isDragging && (
        <div className={styles.dragOverlay}>
          <div className={styles.dragOverlayContent}>
            <svg
              width="56"
              height="56"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="M21 15l-3.086-3.086a2 2 0 00-2.828 0L6 21" />
            </svg>
            <p className={styles.dragOverlayText}>Drop your image here</p>
            <span className={styles.dragOverlaySub}>
              PNG, JPG, GIF, WebP supported
            </span>
          </div>
        </div>
      )}

      {}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logoRow}>
            <div className={styles.logoIcon}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className={styles.logoTitle}>ARPO</span>
          </div>
        </div>

        <button className={styles.newChatBtn} onClick={() => setMessages([])}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Chat
        </button>

        {isAdmin && (
          <button
            className={styles.newChatBtn}
            onClick={() => router.push("/admin")}
            style={{ marginTop: "6px" }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Admin Panel
          </button>
        )}

        {}
        <div className={styles.usageTracker}>
          <div className={styles.usageHeader}>
            <span className={styles.usageTitle}>Monthly Usage</span>
            <span className={styles.usageValues}>
              {usage.remaining === "Unlimited" ? "∞" : usage.remaining} /{" "}
              {usage.limit === "Unlimited" ? "∞" : usage.limit}
            </span>
          </div>
          <div className={styles.usageBarBg}>
            <div
              className={styles.usageBarFill}
              style={{
                width:
                  usage.limit === "Unlimited"
                    ? "100%"
                    : `${(Math.max(0, parseInt(usage.remaining || "0")) / 5) * 100}%`,
              }}
            />
          </div>
          <p className={styles.usageNote}>
            {isAdmin
              ? "Admin Account: Unlimited access"
              : `Your limits refill every hour`}
          </p>
        </div>

        <div className={styles.sidebarFooter}>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {}
      <main className={styles.main} onPaste={handlePaste}>
        {}
        <div className={styles.messagesContainer}>
          {loadingHistory ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon} style={{ opacity: 0.5 }}>
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ animation: "spin 1s linear infinite" }}
                >
                  <path d="M21 12a9 9 0 11-6.219-8.56" />
                </svg>
              </div>
              <p className={styles.emptyDesc}>Loading chat history...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <h2 className={styles.emptyTitle}>Scout Master AI</h2>
              <p className={styles.emptyDesc}>
                Ask me anything about scouting, or drag &amp; drop an image for
                analysis.
              </p>
              <div className={styles.suggestions}>
                {[
                  "What are the requirements for the Eagle Scout badge?",
                  "Explain camping safety principles",
                  "What knots should every scout know?",
                ].map((s, i) => (
                  <button
                    key={i}
                    className={styles.suggestion}
                    onClick={() => setInput(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.messagesList}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`${styles.message} ${
                    msg.role === "user" ? styles.userMsg : styles.agentMsg
                  }`}
                >
                  <div className={styles.messageAvatar}>
                    {msg.role === "user" ? (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    ) : (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                      </svg>
                    )}
                  </div>
                  <div className={styles.messageBody}>
                    <div className={styles.messageHeader}>
                      <span className={styles.messageSender}>
                        {msg.role === "user" ? "You" : "ARPO"}
                      </span>
                      <span className={styles.messageTime}>
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                    {msg.imagePreview && (
                      <img
                        src={msg.imagePreview}
                        alt="Uploaded"
                        className={styles.messageImage}
                      />
                    )}
                    <p className={styles.messageText}>{msg.content}</p>

                    {}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className={styles.sourcesSection}>
                        <button
                          className={styles.sourcesToggle}
                          onClick={() =>
                            setShowSources(
                              showSources === msg.id ? null : msg.id,
                            )
                          }
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M14 2H6a2 2 0 00-2 2v16c0 1.1.9 2 2 2h12a2 2 0 002-2V8l-6-6z" />
                            <path d="M14 2v6h6" />
                          </svg>
                          {msg.sources.length} source
                          {msg.sources.length > 1 ? "s" : ""} referenced
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            style={{
                              transform:
                                showSources === msg.id
                                  ? "rotate(180deg)"
                                  : "rotate(0)",
                              transition: "transform 0.2s",
                            }}
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>

                        {showSources === msg.id && (
                          <div className={styles.sourcesList}>
                            {msg.sources.map((source, i) => (
                              <div key={i} className={styles.sourceCard}>
                                <div className={styles.sourceHeader}>
                                  <div className={styles.sourceFileInfo}>
                                    <svg
                                      width="12"
                                      height="12"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                    >
                                      <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
                                      <polyline points="14 2 14 8 20 8" />
                                    </svg>
                                    <span className={styles.sourceFileName}>
                                      {source.sourceFile || `Document ${i + 1}`}
                                    </span>
                                    {source.pageNumber && (
                                      <span className={styles.sourcePageBadge}>
                                        Page {source.pageNumber}
                                      </span>
                                    )}
                                  </div>
                                  <span
                                    className={styles.sourceScore}
                                    style={{
                                      color:
                                        parseFloat(source.confidenceScore) > 0.7
                                          ? "var(--success)"
                                          : "var(--text-muted)",
                                    }}
                                  >
                                    {(
                                      parseFloat(source.confidenceScore) * 100
                                    ).toFixed(0)}
                                    % match
                                  </span>
                                </div>
                                <p className={styles.sourceContent}>
                                  {source.content.slice(0, 300)}
                                  {source.content.length > 300 ? "..." : ""}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <div className={`${styles.message} ${styles.agentMsg}`}>
                  <div className={styles.messageAvatar}>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5" />
                      <path d="M2 12l10 5 10-5" />
                    </svg>
                  </div>
                  <div className={styles.messageBody}>
                    <div className={styles.typingIndicator}>
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {}
        <div className={styles.inputArea}>
          {imagePreview && (
            <div className={styles.imagePreviewBar}>
              <img
                src={imagePreview}
                alt="Preview"
                className={styles.previewThumb}
              />
              <span className={styles.previewName}>{imageFile?.name}</span>
              <button className={styles.removeImage} onClick={removeImage}>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.inputForm}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              hidden
            />

            <button
              type="button"
              className={styles.attachBtn}
              onClick={() => fileInputRef.current?.click()}
              title="Upload image"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="M21 15l-3.086-3.086a2 2 0 00-2.828 0L6 21" />
              </svg>
            </button>

            <textarea
              ref={textareaRef}
              className={styles.textInput}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask ARPO anything... (or drop an image)"
              rows={1}
              disabled={loading}
            />

            <button
              type="submit"
              className={styles.sendBtn}
              disabled={loading || (!input.trim() && !imageFile)}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
