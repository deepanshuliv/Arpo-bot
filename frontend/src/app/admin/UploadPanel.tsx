"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Check, Eye, FilePdf, Plus, UploadSimple, Warning, X } from "@phosphor-icons/react";
import SlideOver from "@/components/SlideOver";
import type { PdfUploadResult } from "@/lib/api";
import styles from "./admin.module.css";

export type UploadErrorKey = "notPdf" | "tooLarge" | "uploadFailed" | "network";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type UploadPanelProps = {
  open: boolean;
  onClose: () => void;
  files: File[];
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  onClear: () => void;
  onUpload: () => void;
  uploading: boolean;
  error: UploadErrorKey | null;
  lastUpload: PdfUploadResult | null;
  onView: (fileName: string) => void;
};

/** Slide-over for choosing PDFs, uploading them, and opening what was just added. */
export default function UploadPanel({
  open,
  onClose,
  files,
  onAddFiles,
  onRemoveFile,
  onClear,
  onUpload,
  uploading,
  error,
  lastUpload,
  onView,
}: UploadPanelProps) {
  const t = useTranslations("admin");
  const tp = useTranslations("admin.panel");
  const inputRef = useRef<HTMLInputElement>(null);
  const openPicker = () => inputRef.current?.click();

  return (
    <SlideOver open={open} onClose={onClose} title={tp("title")} subtitle={tp("sub")} closeLabel={tp("close")}>
      <div className={styles.panelBody}>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) onAddFiles(Array.from(e.target.files));
            e.target.value = "";
          }}
        />

        {files.length === 0 ? (
          <button type="button" className={styles.dropZone} onClick={openPicker}>
            <span className={styles.dropZoneIcon}>
              <UploadSimple size={22} weight="bold" aria-hidden="true" />
            </span>
            <span className={styles.dropZoneTitle}>
              {t.rich("dropTitle", { u: (chunks) => <u>{chunks}</u> })}
            </span>
            <span className={styles.dropZoneSub}>{t("dropSub")}</span>
          </button>
        ) : (
          <div className={styles.fileList}>
            <div className={styles.fileListHeader}>
              <span>{t("ready", { count: files.length })}</span>
              <button type="button" className={styles.linkBtn} onClick={openPicker} disabled={uploading}>
                <Plus size={14} weight="bold" aria-hidden="true" />
                {t("addMore")}
              </button>
            </div>
            <ul>
              {files.map((file, idx) => (
                <li key={`${file.name}-${idx}`} className={styles.fileItem}>
                  <FilePdf size={22} className={styles.fileIcon} aria-hidden="true" />
                  <span className={styles.fileName}>{file.name}</span>
                  <span className={styles.fileSize}>{formatFileSize(file.size)}</span>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    aria-label={t("remove", { name: file.name })}
                    onClick={() => onRemoveFile(idx)}
                    disabled={uploading}
                  >
                    <X size={14} weight="bold" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && (
          <p className={styles.errorBanner} role="alert">
            <Warning size={16} weight="fill" aria-hidden="true" />
            {t(`errors.${error}`)}
          </p>
        )}

        <div className={styles.panelActions}>
          {files.length > 0 && (
            <button type="button" className="btn-secondary" onClick={onClear} disabled={uploading}>
              {t("clearAll")}
            </button>
          )}
          <button
            type="button"
            className="btn-primary"
            onClick={onUpload}
            disabled={files.length === 0 || uploading}
          >
            {uploading ? (
              <>
                <span className={styles.spinner} aria-hidden="true" />
                {t("indexing", { count: files.length })}
              </>
            ) : (
              <>
                <UploadSimple size={16} weight="bold" aria-hidden="true" />
                {t("upload")}
              </>
            )}
          </button>
        </div>

        {lastUpload && lastUpload.files.length > 0 && (
          <section className={styles.results} aria-labelledby="results-title">
            <h3 id="results-title">{tp("results")}</h3>
            <ul>
              {lastUpload.files.map((f) => (
                <li key={f.fileName} className={styles.resultItem} data-status={f.status}>
                  {f.status === "success" ? (
                    <Check size={16} weight="bold" className={styles.resultOk} aria-hidden="true" />
                  ) : (
                    <Warning size={16} weight="fill" className={styles.resultFail} aria-hidden="true" />
                  )}
                  <span className={styles.resultBody}>
                    <span className={styles.fileName}>{f.fileName}</span>
                    <span className={styles.resultMeta}>
                      {f.status === "success"
                        ? [tp("indexed", { count: f.chunks }), f.replaced ? tp("replaced") : null]
                            .filter(Boolean)
                            .join(" · ")
                        : f.error || t("failedFile")}
                    </span>
                  </span>
                  {f.status === "success" && (
                    <button type="button" className={styles.rowBtn} onClick={() => onView(f.fileName)}>
                      <Eye size={15} aria-hidden="true" />
                      {t("view")}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </SlideOver>
  );
}
