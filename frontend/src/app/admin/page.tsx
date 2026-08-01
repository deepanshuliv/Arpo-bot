"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { Eye, FilePdf, Trash, UploadSimple, Warning } from "@phosphor-icons/react";
import AdminNav from "@/components/AdminNav";
import AppShell from "@/components/AppShell";
import {
  deleteDocument,
  getDocuments,
  isStaffRole,
  uploadPdfs,
  type IndexedDocument,
  type PdfUploadResult,
} from "@/lib/api";
import { useSession } from "@/lib/session";
import DocumentViewer from "./DocumentViewer";
import UploadPanel, { type UploadErrorKey } from "./UploadPanel";
import styles from "./admin.module.css";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function readableFile(name: string) {
  return name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim();
}

export default function AdminPage() {
  const t = useTranslations("admin");
  const format = useFormatter();
  const router = useRouter();
  const session = useSession();
  const isAdminSession = isStaffRole(session?.role);

  const [documents, setDocuments] = useState<IndexedDocument[] | null>(null);
  const [totalPassages, setTotalPassages] = useState(0);
  const [listError, setListError] = useState<"listFailed" | "deleteFailed" | "network" | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);

  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<UploadErrorKey | null>(null);
  const [lastUpload, setLastUpload] = useState<PdfUploadResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  const applyDocuments = useCallback((res: Awaited<ReturnType<typeof getDocuments>>) => {
    if (res.success && res.data) {
      setDocuments(res.data.documents);
      setTotalPassages(res.data.totalPassages);
      setListError(null);
    } else {
      setDocuments((prev) => prev ?? []);
      setListError(res.code === "NETWORK" ? "network" : "listFailed");
    }
  }, []);

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

  /* ───── Choosing & uploading ───── */

  const addFiles = useCallback((newFiles: File[]) => {
    const pdfs = newFiles.filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
    );
    if (pdfs.length === 0) {
      setUploadError("notPdf");
      return;
    }
    const valid = pdfs.filter((f) => f.size <= MAX_FILE_SIZE);
    setUploadError(valid.length < pdfs.length ? "tooLarge" : null);
    setSelectedFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size));
      return [...prev, ...valid.filter((f) => !existing.has(f.name + f.size))];
    });
  }, []);

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);
    setUploadError(null);
    const res = await uploadPdfs(selectedFiles);
    setUploading(false);

    if (res.success && res.data) {
      setLastUpload(res.data);
      setSelectedFiles([]);
      loadDocuments();
    } else {
      setUploadError(res.code === "NETWORK" ? "network" : "uploadFailed");
    }
  };

  // Dropping PDFs anywhere on the page opens the upload panel with them
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
      setPanelOpen(true);
    },
  };

  /* ───── Deleting ───── */

  const handleDelete = async (fileName: string) => {
    setConfirming(null);
    setDeleting(fileName);
    const res = await deleteDocument(fileName);
    setDeleting(null);
    if (res.success) loadDocuments();
    else setListError(res.code === "NETWORK" ? "network" : "deleteFailed");
  };

  const justAdded = new Set(
    lastUpload?.files.filter((f) => f.status === "success").map((f) => f.fileName) ?? [],
  );
  const totalPages = documents?.reduce((sum, d) => sum + (d.pages ?? 0), 0) ?? 0;
  const viewingDoc = documents?.find((d) => d.fileName === viewing) ?? null;

  return (
    <AppShell
      sidebar={<AdminNav />}
      title={t("title")}
      userName={session?.name ?? ""}
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

      <div className={styles.dashboard}>
        <header className={styles.dashHead}>
          <div>
            <h2 className={styles.heading}>{t("title")}</h2>
            <p className={styles.subtitle}>{t("subtitle")}</p>
          </div>
          <button type="button" className={`btn-primary ${styles.uploadBtn}`} onClick={() => setPanelOpen(true)}>
            <UploadSimple size={17} weight="bold" aria-hidden="true" />
            {t("uploadButton")}
          </button>
        </header>

        <dl className={styles.stats}>
          <div>
            <dt>{t("stats.documents")}</dt>
            <dd>{documents ? documents.length : "–"}</dd>
          </div>
          <div>
            <dt>{t("stats.passages")}</dt>
            <dd>{documents ? totalPassages : "–"}</dd>
          </div>
          <div>
            <dt>{t("stats.pages")}</dt>
            <dd>{documents ? totalPages : "–"}</dd>
          </div>
        </dl>

        {listError && (
          <p className={styles.errorBanner} role="alert">
            <Warning size={16} weight="fill" aria-hidden="true" />
            {t(`errors.${listError}`)}
          </p>
        )}

        <section className={styles.library} aria-label={t("library")}>
          {documents === null ? (
            <div className={styles.skeleton} aria-busy="true" aria-label={t("libraryLoading")}>
              <span />
              <span />
              <span />
            </div>
          ) : documents.length === 0 ? (
            <p className={styles.libraryEmpty}>{t("libraryEmpty")}</p>
          ) : (
            <ul className={styles.docList}>
              {documents.map((doc) => (
                <li
                  key={doc.fileName}
                  className={styles.doc}
                  data-new={justAdded.has(doc.fileName) || undefined}
                >
                  <span className={styles.docSpine} aria-hidden="true">
                    <FilePdf size={20} weight="duotone" />
                  </span>
                  <div className={styles.docBody}>
                    <span className={styles.docName} title={doc.fileName}>
                      {readableFile(doc.fileName)}
                    </span>
                    <span className={styles.docMeta}>
                      {t("passages", { count: doc.passages })}
                      {doc.pages != null &&
                        ` · ${t("pages", { count: doc.pages })}`}
                      {" · "}
                      {justAdded.has(doc.fileName)
                        ? t("justAdded")
                        : doc.uploadedAt &&
                          t("added", {
                            date: format.dateTime(new Date(doc.uploadedAt), {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }),
                          })}
                    </span>
                  </div>

                  {deleting === doc.fileName ? (
                    <span className={styles.docStatus}>
                      <span className={styles.spinnerDark} aria-hidden="true" />
                      {t("deleting")}
                    </span>
                  ) : confirming === doc.fileName ? (
                    <div className={styles.confirm}>
                      <span>{t("confirmDelete")}</span>
                      <button
                        type="button"
                        className={styles.confirmYes}
                        onClick={() => handleDelete(doc.fileName)}
                      >
                        {t("confirmYes")}
                      </button>
                      <button
                        type="button"
                        className={styles.linkBtn}
                        onClick={() => setConfirming(null)}
                      >
                        {t("confirmNo")}
                      </button>
                    </div>
                  ) : justAdded.has(doc.fileName) ? (
                    <span className={styles.docNew}>
                      <Check size={14} weight="bold" aria-hidden="true" />
                    </span>
                  ) : (
                    <button
                      type="button"
                      className={styles.iconBtn}
                      aria-label={`${t("delete")}: ${doc.fileName}`}
                      title={t("delete")}
                      onClick={() => setConfirming(doc.fileName)}
                    >
                      <Trash size={16} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
