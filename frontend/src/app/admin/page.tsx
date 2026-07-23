"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import {
  Check,
  FilePdf,
  Plus,
  Trash,
  UploadSimple,
  Warning,
  X,
} from "@phosphor-icons/react";
import AppShell from "@/components/AppShell";
import AdminNav from "@/components/AdminNav";
import {
  deleteDocument,
  getDocuments,
  isStaffRole,
  uploadPdfs,
  type IndexedDocument,
  type PdfUploadResult,
} from "@/lib/api";
import { useSession } from "@/lib/session";
import styles from "./admin.module.css";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

type ErrorKey =
  | "notPdf"
  | "tooLarge"
  | "uploadFailed"
  | "listFailed"
  | "deleteFailed"
  | "network";

function readableFile(name: string) {
  return name
    .replace(/\.pdf$/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminPage() {
  const t = useTranslations("admin");
  const format = useFormatter();
  const router = useRouter();

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [lastUpload, setLastUpload] = useState<PdfUploadResult | null>(null);
  const [documents, setDocuments] = useState<IndexedDocument[] | null>(null);
  const [totalPassages, setTotalPassages] = useState(0);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<ErrorKey | null>(null);
  const session = useSession();
  const userName = session?.name ?? "";
  const isAdminSession = isStaffRole(session?.role);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const applyDocuments = useCallback(
    (res: Awaited<ReturnType<typeof getDocuments>>) => {
      if (res.success && res.data) {
        setDocuments(res.data.documents);
        setTotalPassages(res.data.totalPassages);
      } else {
        if (res.code === "UNAUTHORIZED") router.replace("/admin/auth");
        setDocuments([]);
        setError(res.code === "NETWORK" ? "network" : "listFailed");
      }
    },
    [router],
  );

  const loadDocuments = useCallback(() => {
    getDocuments().then(applyDocuments);
  }, [applyDocuments]);

  useEffect(() => {
    if (session === undefined) return;
    if (!isAdminSession) {
      router.replace("/admin/auth");
      return;
    }
    getDocuments().then(applyDocuments);
  }, [session, isAdminSession, router, applyDocuments]);

  /* ───── Choosing files ───── */

  const addFiles = useCallback((newFiles: File[]) => {
    const pdfs = newFiles.filter(
      (f) =>
        f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
    );
    if (pdfs.length === 0) {
      setError("notPdf");
      return;
    }
    const valid = pdfs.filter((f) => f.size <= MAX_FILE_SIZE);
    setError(valid.length < pdfs.length ? "tooLarge" : null);
    setSelectedFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size));
      return [...prev, ...valid.filter((f) => !existing.has(f.name + f.size))];
    });
  }, []);

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
      addFiles(Array.from(e.dataTransfer.files));
    },
  };

  const openPicker = () => fileInputRef.current?.click();

  /* ───── Upload & delete ───── */

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);
    setError(null);

    const res = await uploadPdfs(selectedFiles);
    setUploading(false);

    if (res.success && res.data) {
      setLastUpload(res.data);
      setSelectedFiles([]);
      loadDocuments();
    } else {
      setError(res.code === "NETWORK" ? "network" : "uploadFailed");
    }
  };

  const handleDelete = async (fileName: string) => {
    setConfirming(null);
    setDeleting(fileName);
    const res = await deleteDocument(fileName);
    setDeleting(null);
    if (res.success) {
      loadDocuments();
    } else {
      setError(res.code === "NETWORK" ? "network" : "deleteFailed");
    }
  };

  const justAdded = new Set(
    lastUpload?.files
      .filter((f) => f.status === "success")
      .map((f) => f.fileName) ?? [],
  );

  /* ───── Sidebar ───── */

  const sidebar = <AdminNav />;

  return (
    <AppShell
      sidebar={sidebar}
      title={t("title")}
      userName={userName}
      signOutTo="/admin/auth"
      mainProps={dragHandlers}
    >
      {isDragging && (
        <div className={styles.dragOverlay} aria-hidden="true">
          <div className={styles.dragOverlayContent}>
            <FilePdf size={40} weight="light" />
            <p>{t("dropOverlay")}</p>
            <span>{t("dropOverlaySub")}</span>
          </div>
        </div>
      )}

      <div className={styles.container}>
        {}
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <h1 className={styles.title}>Knowledge Base Admin</h1>
          <p className={styles.subtitle}>
            Upload manuals, guides, or rulebooks to the Pinecone vector
            database. Drag &amp; drop or click to add PDFs.
          </p>
        </div>

        {}
        <div
          className={`${styles.dropZone} ${selectedFiles.length > 0 ? styles.dropZoneActive : ""}`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            multiple
            onChange={handleFileSelect}
            hidden
          />

          {selectedFiles.length === 0 ? (
            <div className={styles.dropZoneEmpty}>
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className={styles.dropZoneTitle}>
                Drag &amp; drop PDF files here
              </p>
              <span className={styles.dropZoneSub}>
                or click to browse · Max 10MB per file
              </span>
            </div>
          ) : (
            <div
              className={styles.fileList}
              onClick={(e) => e.stopPropagation()}
            >
              {selectedFiles.map((file, idx) => (
                <div key={`${file.name}-${idx}`} className={styles.fileItem}>
                  <div className={styles.fileIcon}>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div className={styles.fileInfo}>
                    <span className={styles.fileName}>{file.name}</span>
                    <span className={styles.fileSize}>
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                  <button
                    className={styles.fileRemove}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(idx);
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                className={styles.addMoreBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add more files
              </button>
            </div>
          )}
        </div>

        {}
        <div className={styles.actions}>
          {selectedFiles.length > 0 && (
            <button
              className={styles.clearBtn}
              onClick={clearFiles}
              disabled={uploading}
            >
              Clear all
            </button>
          )}
          <button
            className={styles.uploadBtn}
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || uploading}
          >
            {uploading ? (
              <span className={styles.uploadingState}>
                <span className={styles.spinner} />
                {uploadProgress || "Indexing..."}
              </span>
            ) : (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Upload to Pinecone
                {selectedFiles.length > 0 && ` (${selectedFiles.length})`}
              </>
            )}
          </button>
        </div>

        {}
        {error && (
          <div className={styles.errorBanner}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        {}
        {history.length > 0 && (
          <div className={styles.historySection}>
            <h3 className={styles.historyTitle}>Recent Uploads</h3>
            <div className={styles.historyList}>
              {history.map((entry) => (
                <div key={entry.id} className={styles.historyCard}>
                  <div className={styles.historyHeader}>
                    <span className={styles.historyTime}>
                      {formatTime(entry.timestamp)}
                    </span>
                    <span className={styles.historyChunks}>
                      {entry.totalChunks} chunks indexed
                    </span>
                  </div>
                  <div className={styles.historyFiles}>
                    {entry.files.map((f, idx) => (
                      <div key={idx} className={styles.historyFile}>
                        <span
                          className={`${styles.historyDot} ${
                            f.status === "success"
                              ? styles.dotSuccess
                              : styles.dotFailed
                          }`}
                        />
                        <span className={styles.historyFileName}>
                          {f.fileName}
                        </span>
                        <span className={styles.historyFileMeta}>
                          {f.status === "success"
                            ? `${f.chunks} chunks`
                            : f.error || "failed"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {}
        <button className={styles.backBtn} onClick={() => router.push("/chat")}>
          ← Back to Chat
        </button>
      </div>
    </div>
  );
}
