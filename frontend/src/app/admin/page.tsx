"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { uploadPdfs, type PdfUploadResult } from "@/lib/api";
import styles from "./admin.module.css";

interface UploadHistoryEntry {
  id: string;
  files: PdfUploadResult["files"];
  totalChunks: number;
  timestamp: Date;
}

export default function AdminPage() {
  const router = useRouter();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [history, setHistory] = useState<UploadHistoryEntry[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    const token = localStorage.getItem("arpo_token");
    if (!token) {
      router.replace("/admin/auth");
      return;
    }
    const role = localStorage.getItem("arpo_role");
    if (role !== "admin") {
      router.replace("/admin/auth");
    }
  }, [router]);

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

  const addFiles = useCallback((newFiles: File[]) => {
    const pdfs = newFiles.filter(
      (f) =>
        f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
    );
    if (pdfs.length === 0) {
      setError("Only PDF files are supported");
      setTimeout(() => setError(null), 3000);
      return;
    }
    setSelectedFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size));
      const unique = pdfs.filter((f) => !existing.has(f.name + f.size));
      return [...prev, ...unique];
    });
    setError(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      addFiles(files);
    },
    [addFiles],
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      addFiles(Array.from(files));
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearFiles = () => {
    setSelectedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(`Processing ${selectedFiles.length} file(s)...`);
    setError(null);

    try {
      const res = await uploadPdfs(selectedFiles);
      if (res.success && res.data) {
        setHistory((prev) => [
          {
            id: Date.now().toString(),
            files: res.data!.files,
            totalChunks: res.data!.totalChunks,
            timestamp: new Date(),
          },
          ...prev,
        ]);
        setSelectedFiles([]);
        setUploadProgress(null);
      } else {
        setError(res.message || "Upload failed");
        setUploadProgress(null);
      }
    } catch {
      setError("Network error — could not reach the server");
      setUploadProgress(null);
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div
      className={styles.page}
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
              <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="12" y2="12" />
              <line x1="15" y1="15" x2="12" y2="12" />
            </svg>
            <p className={styles.dragOverlayText}>Drop your PDFs here</p>
            <span className={styles.dragOverlaySub}>
              Multiple files supported
            </span>
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
