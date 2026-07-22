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
  error?: { code: ErrorCode; refillIn?: number };
}

type HistoryGroup = "today" | "yesterday" | "week" | "earlier";

function groupOf(date: Date): HistoryGroup {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const day = 24 * 60 * 60 * 1000;
  const t = date.getTime();
  if (t >= startOfToday.getTime()) return "today";
  if (t >= startOfToday.getTime() - day) return "yesterday";
  if (t >= startOfToday.getTime() - 7 * day) return "week";
  return "earlier";
}

/** One stamp per source file, with the pages it cited. */
function groupSources(sources: SourceDoc[]) {
  const byFile = new Map<
    string,
    { file: string; pages: number[]; passages: SourceDoc[] }
  >();
  for (const src of sources) {
    const entry = byFile.get(src.sourceFile) ?? {
      file: src.sourceFile,
      pages: [],
      passages: [],
    };
    if (src.pageNumber != null && !entry.pages.includes(src.pageNumber)) {
      entry.pages.push(src.pageNumber);
    }
    entry.passages.push(src);
    byFile.set(src.sourceFile, entry);
  }
  return [...byFile.values()].map((e) => ({
    ...e,
    pages: e.pages.sort((a, b) => a - b),
  }));
}

const CHAT_ERRORS = [
  "RATE_LIMITED",
  "AI_UNAVAILABLE",
  "AI_BUSY",
  "IMAGE_FAILED",
  "NO_ANSWER",
  "NOT_FOUND",
  "INVALID_INPUT",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NETWORK",
] as const;

/** Codes the chat has a message for; anything else reads as a general error. */
function chatErrorKey(code: ErrorCode) {
  return (CHAT_ERRORS as readonly string[]).includes(code)
    ? (code as (typeof CHAT_ERRORS)[number])
    : "SERVER_ERROR";
}

function readableFile(name: string) {
  return name
    .replace(/\.pdf$/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
}

export default function ChatPage() {
  const t = useTranslations("chat");
  const th = useTranslations("header");
  const format = useFormatter();
  const locale = useLocale() as Language;
  const router = useRouter();

  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [openSources, setOpenSources] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const session = useSession();
  const isAdmin = isStaffRole(session?.role);
  const userName = session?.name ?? "";
  const [usage, setUsage] = useState<LimitStatus | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dragCounterRef = useRef(0);

  const refreshUsage = useCallback(() => {
    getLimitStatus().then((res) => {
      if (res.success && res.data) setUsage(res.data);
    });
  }, []);

  const token = session?.token;

  useEffect(() => {
    if (session === null) router.replace("/auth");
  }, [session, router]);

  useEffect(() => {
    if (!token) return;
    getThreads().then((res) => {
      if (res.code === "UNAUTHORIZED") router.replace("/auth");
      if (res.success && res.data) setThreads(res.data.threads);
    });
    getLimitStatus().then((res) => {
      if (res.success && res.data) setUsage(res.data);
    });
  }, [token, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  }, [input]);

  /* ───── Conversations ───── */

  const startNewQuestion = () => {
    setActiveThreadId(null);
    setMessages([]);
    setOpenSources(null);
    textareaRef.current?.focus();
  };

  const openThread = async (threadId: string) => {
    if (threadId === activeThreadId) return;
    setActiveThreadId(threadId);
    setMessages([]);
    setOpenSources(null);
    setLoadingThread(true);

    const res = await getThreadMessages(threadId);
    setLoadingThread(false);
    if (!res.success || !res.data) {
      setMessages([
        {
          id: "error",
          role: "agent",
          content: "",
          timestamp: new Date(),
          error: { code: res.code ?? "SERVER_ERROR" },
        },
      ]);
      return;
    }

    setMessages(
      res.data.messages.map((m) => ({
        id: m._id,
        role: m.role,
        content: m.message_description || "",
        sources: m.sources,
        timestamp: new Date(m.createdAt),
      })),
    );
  };

  const removeThread = async (threadId: string) => {
    setConfirmingDelete(null);
    const res = await deleteThread(threadId);
    if (!res.success) return;
    setThreads((prev) => prev.filter((th) => th._id !== threadId));
    if (threadId === activeThreadId) startNewQuestion();
  };

  const groupedThreads = useMemo(() => {
    const order: HistoryGroup[] = ["today", "yesterday", "week", "earlier"];
    const groups = new Map<HistoryGroup, ThreadSummary[]>();
    for (const thread of threads) {
      const g = groupOf(new Date(thread.updatedAt));
      groups.set(g, [...(groups.get(g) ?? []), thread]);
    }
    return order
      .filter((g) => groups.has(g))
      .map((g) => ({ group: g, items: groups.get(g)! }));
  }, [threads]);

  /* ───── Images ───── */

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const dragHandlers = {
    onDragEnter: (e: React.DragEvent) => {
      e.preventDefault();
      dragCounterRef.current += 1;
      if (e.dataTransfer.types.includes("Files")) setIsDragging(true);
    },
    onDragLeave: (e: React.DragEvent) => {
      e.preventDefault();
      dragCounterRef.current -= 1;
      if (dragCounterRef.current === 0) setIsDragging(false);
    },
    onDragOver: (e: React.DragEvent) => e.preventDefault(),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    onPaste: (e: React.ClipboardEvent) => {
      for (const item of e.clipboardData?.items ?? []) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) handleFile(file);
          break;
        }
      }
    },
  };

  /* ───── Asking ───── */

  const ask = async (question: string) => {
    const text = question.trim();
    if ((!text && !imageFile) || loading) return;

    setMessages((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        role: "user",
        content: text,
        imagePreview: imagePreview || undefined,
        timestamp: new Date(),
      },
    ]);
    const image = imageFile;
    setInput("");
    removeImage();
    setLoading(true);

    const res = await sendMessage({
      message: text,
      imageFile: image || undefined,
      threadId: activeThreadId,
      language: locale,
    });

    if (res.success && res.data) {
      const { thread, response, sources } = res.data;
      setActiveThreadId(thread._id);
      setThreads((prev) => [
        thread,
        ...prev.filter((th) => th._id !== thread._id),
      ]);
      setMessages((prev) => [
        ...prev,
        {
          id: `agent-${Date.now()}`,
          role: "agent",
          content: response,
          sources,
          timestamp: new Date(),
        },
      ]);
    } else {
      if (res.code === "UNAUTHORIZED") router.replace("/auth");
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "agent",
          content: "",
          timestamp: new Date(),
          error: { code: res.code ?? "SERVER_ERROR", refillIn: res.refillIn },
        },
      ]);
    }

    setLoading(false);
    refreshUsage();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    ask(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ask(input);
    }
  };

  /* ───── Derived ───── */

  const activeTitle =
    threads.find((th) => th._id === activeThreadId)?.title ??
    t("newConversationTitle");
  const lastMessage = messages[messages.length - 1];
  const showFollowUps =
    !loading &&
    lastMessage?.role === "agent" &&
    !lastMessage.error &&
    lastMessage.content;

  const numericLimit = typeof usage?.limit === "number" ? usage.limit : null;
  const remaining =
    typeof usage?.remaining === "number" ? usage.remaining : null;

  /* ───── Sidebar ───── */

  const sidebar = (
    <>
      <button
        type="button"
        className={shellStyles.primaryAction}
        onClick={startNewQuestion}
        data-close-drawer
      >
        <NotePencil size={18} weight="bold" aria-hidden="true" />
        {t("newQuestion")}
      </button>

      {isAdmin && (
        <ul className={shellStyles.navList}>
          <li>
            <Link
              href="/admin"
              className={shellStyles.navItem}
              data-close-drawer
            >
              <Books size={18} aria-hidden="true" />
              {th("knowledgeBase")}
            </Link>
          </li>
        </ul>
      )}

      <nav className={styles.history} aria-label={t("history")}>
        {threads.length === 0 ? (
          <p className={styles.noHistory}>{t("noHistory")}</p>
        ) : (
          groupedThreads.map(({ group, items }) => (
            <div key={group}>
              <p className={shellStyles.groupLabel}>{t(`groups.${group}`)}</p>
              <ul className={shellStyles.navList}>
                {items.map((thread) => (
                  <li key={thread._id} className={styles.historyRow}>
                    {confirmingDelete === thread._id ? (
                      <div className={styles.confirmRow}>
                        <span>{thread.title}</span>
                        <button
                          type="button"
                          onClick={() => removeThread(thread._id)}
                        >
                          {t("confirmDelete")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingDelete(null)}
                        >
                          {t("keep")}
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          className={shellStyles.navItem}
                          aria-current={
                            thread._id === activeThreadId ? "true" : undefined
                          }
                          onClick={() => openThread(thread._id)}
                          data-close-drawer
                        >
                          <span className={styles.historyTitle}>
                            {thread.title}
                          </span>
                        </button>
                        <button
                          type="button"
                          className={styles.historyDelete}
                          aria-label={t("deleteConversation")}
                          title={t("deleteConversation")}
                          onClick={() => setConfirmingDelete(thread._id)}
                        >
                          <Trash size={15} />
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </nav>

      <div className={styles.usage}>
        <p className={styles.usageTitle}>{t("usage.title")}</p>
        {isAdmin || usage?.limit === "Unlimited" ? (
          <p className={styles.usageNote}>{t("usage.unlimited")}</p>
        ) : numericLimit && remaining !== null ? (
          <>
            <ol
              className={styles.waypoints}
              aria-label={t("usage.remaining", {
                remaining,
                limit: numericLimit,
              })}
            >
              {Array.from({ length: numericLimit }, (_, i) => (
                <li
                  key={i}
                  data-used={i < numericLimit - remaining || undefined}
                />
              ))}
            </ol>
            <p className={styles.usageNote}>
              <strong>
                {t("usage.remaining", { remaining, limit: numericLimit })}
              </strong>
              {usage?.resetTime && remaining < numericLimit
                ? ` · ${t("usage.refillsAt", {
                    time: format.dateTime(new Date(usage.resetTime), {
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                  })}`
                : ` · ${t("usage.full")}`}
            </p>
          </>
        ) : null}
      </div>
    </>
  );

  /* ───── Main ───── */

  return (
    <AppShell
      sidebar={sidebar}
      title={activeTitle}
      userName={userName}
      signOutTo="/auth"
      mainProps={dragHandlers}
    >
      {isDragging && (
        <div className={styles.dragOverlay} aria-hidden="true">
          <div className={styles.dragOverlayContent}>
            <ImageSquare size={40} weight="light" />
            <p>{t("drop.title")}</p>
            <span>{t("drop.sub")}</span>
          </div>
        </div>
      )}

      <div className={styles.scroll}>
        {loadingThread ? (
          <div
            className={styles.skeletonList}
            aria-busy="true"
            aria-label={t("loadingHistory")}
          >
            <span className={`${styles.skeleton} ${styles.skeletonUser}`} />
            <span className={`${styles.skeleton} ${styles.skeletonCard}`} />
          </div>
        ) : messages.length === 0 ? (
          <div className={styles.emptyState}>
            <p className="eyebrow">
              {userName
                ? t("empty.greeting", { name: userName.split(" ")[0] })
                : t("empty.greetingAnon")}
            </p>
            <h2 className={styles.emptyTitle}>{t("empty.title")}</h2>
            <p className={styles.emptyDesc}>{t("empty.desc")}</p>
            <ul className={styles.suggestions}>
              {(
                [
                  ["badge", Medal],
                  ["knot", Lasso],
                  ["firstAid", FirstAidKit],
                ] as const
              ).map(([key, Icon]) => (
                <li key={key}>
                  <button
                    type="button"
                    className={styles.suggestion}
                    onClick={() => ask(t(`empty.suggestions.${key}`))}
                  >
                    <span className={styles.suggestionIcon}>
                      <Icon size={18} weight="duotone" aria-hidden="true" />
                    </span>
                    <span>{t(`empty.suggestions.${key}`)}</span>
                    <ArrowUpRight
                      size={16}
                      className={styles.suggestionArrow}
                      aria-hidden="true"
                    />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className={styles.thread} aria-live="polite">
            {messages.map((msg) =>
              msg.role === "user" ? (
                <div key={msg.id} className={styles.question}>
                  {msg.imagePreview && (
                    <Image
                      src={msg.imagePreview}
                      alt={t("message.imageAlt")}
                      width={260}
                      height={180}
                      unoptimized
                      className={styles.questionImage}
                    />
                  )}
                  {msg.content && <p>{msg.content}</p>}
                  <time className={styles.questionTime}>
                    {format.dateTime(msg.timestamp, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
              ) : msg.error ? (
                <div key={msg.id} className={styles.errorCard} role="alert">
                  <WarningCircle size={20} weight="fill" aria-hidden="true" />
                  <p>
                    {t(`errors.${chatErrorKey(msg.error.code)}`, {
                      minutes: msg.error.refillIn ?? 60,
                    })}
                  </p>
                </div>
              ) : (
                <article key={msg.id} className={styles.answer}>
                  <header className={styles.answerHead}>
                    <Logo size={24} />
                    <b>{t("message.arpo")}</b>
                    {msg.sources && msg.sources.length > 0 && (
                      <span>
                        {t("message.fromPassages", {
                          count: msg.sources.length,
                        })}
                      </span>
                    )}
                    <time>
                      {format.dateTime(msg.timestamp, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </header>

                  <AnswerText text={msg.content} />

                  {msg.sources && msg.sources.length > 0 && (
                    <footer className={styles.stamps}>
                      {groupSources(msg.sources).map((src) => {
                        const key = `${msg.id}:${src.file}`;
                        const open = openSources === key;
                        return (
                          <div key={key} className={styles.stampWrap}>
                            <button
                              type="button"
                              className={styles.stamp}
                              aria-expanded={open}
                              onClick={() => setOpenSources(open ? null : key)}
                            >
                              <BookOpenText size={14} aria-hidden="true" />
                              <span className={styles.stampFile}>
                                {readableFile(src.file)}
                              </span>
                              {src.pages.length > 0 && (
                                <span className={styles.stampPages}>
                                  {t("message.page", {
                                    page: src.pages.slice(0, 3).join(", "),
                                  })}
                                </span>
                              )}
                            </button>
                            {open && (
                              <ol
                                className={styles.passages}
                                aria-label={t("message.passages")}
                              >
                                {src.passages.slice(0, 4).map((p, i) => (
                                  <li key={i}>
                                    <span className={styles.passageMeta}>
                                      {p.pageNumber != null &&
                                        t("message.page", {
                                          page: p.pageNumber,
                                        })}
                                      {" · "}
                                      {t("message.match", {
                                        score: Math.round(
                                          parseFloat(p.confidenceScore) * 100,
                                        ),
                                      })}
                                    </span>
                                    <p>
                                      {p.content.slice(0, 280)}
                                      {p.content.length > 280 ? "…" : ""}
                                    </p>
                                  </li>
                                ))}
                              </ol>
                            )}
                          </div>
                        );
                      })}
                    </footer>
                  )}
                </article>
              ),
            )}

            {loading && (
              <div className={styles.thinking} aria-label={t("loading")}>
                <Logo size={24} />
                <span>{t("loading")}</span>
                <span className={styles.dots}>
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className={styles.composerArea}>
        {showFollowUps && (
          <div className={styles.followUps}>
            {(["checklist", "simpler", "more"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => ask(t(`followUps.${key}`))}
              >
                {t(`followUps.${key}`)}
              </button>
            ))}
          </div>
        )}

        {imagePreview && (
          <div className={styles.imagePreviewBar}>
            <Image
              src={imagePreview}
              alt=""
              width={40}
              height={40}
              unoptimized
              className={styles.previewThumb}
            />
            <span className={styles.previewName}>{imageFile?.name}</span>
            <button
              type="button"
              className={styles.removeImage}
              onClick={removeImage}
              aria-label={t("composer.removeImage")}
            >
              <X size={14} weight="bold" />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.composer}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) =>
              e.target.files?.[0] && handleFile(e.target.files[0])
            }
            hidden
          />
          <button
            type="button"
            className={styles.attachBtn}
            onClick={() => fileInputRef.current?.click()}
            aria-label={t("composer.attach")}
            title={t("composer.attach")}
          >
            <Paperclip size={19} />
          </button>
          <textarea
            ref={textareaRef}
            className={styles.textInput}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              messages.length > 0
                ? t("composer.followUp")
                : t("composer.placeholder")
            }
            aria-label={t("composer.label")}
            rows={1}
            disabled={loading}
          />
          <button
            type="submit"
            className={styles.sendBtn}
            disabled={loading || (!input.trim() && !imageFile)}
            aria-label={t("composer.send")}
          >
            <ArrowUp size={17} weight="bold" />
          </button>
        </form>
        <p className={styles.hint}>{t("composer.hint")}</p>
      </div>
    </AppShell>
  );
}
