"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowSquareOut, FilePdf, UploadSimple } from "@phosphor-icons/react";
import Modal from "@/components/Modal";
import { attachDocumentFile, getDocumentFileUrl, type IndexedDocument } from "@/lib/api";
import styles from "./admin.module.css";

function readableFile(name: string) {
  return name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim();
}

/**
 * Shows the original uploaded PDF in a centred modal. Documents indexed before
 * originals were kept can have their PDF attached here, without re-indexing.
 * Mount with key={fileName} so each opens fresh.
 */
export default function DocumentViewer({
  doc,
  onClose,
  onAttached,
}: {
  doc: IndexedDocument;
  onClose: () => void;
  onAttached: () => void;
}) {
  const t = useTranslations("admin");
  const tv = useTranslations("admin.viewer");
  const [hasFile, setHasFile] = useState(doc.hasFile);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [attachError, setAttachError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // The PDF is fetched with the admin's sign-in, then shown from a local URL
  useEffect(() => {
    if (!hasFile) return;
    let url: string | null = null;
    let cancelled = false;
    getDocumentFileUrl(doc.fileName).then((res) => {
      if (cancelled) {
        if ("url" in res) URL.revokeObjectURL(res.url);
        return;
      }
      if ("url" in res) {
        url = res.url;
        setPdfUrl(res.url);
      } else if (res.code === "FILE_NOT_STORED") {
        setHasFile(false);
      } else {
        setFailed(true);
      }
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [doc.fileName, hasFile]);

  const attach = async (file: File | undefined) => {
    if (!file) return;
    setAttaching(true);
    setAttachError(false);
    const res = await attachDocumentFile(doc.fileName, file);
    setAttaching(false);
    if (res.success) {
      setHasFile(true);
      onAttached();
    } else {
      setAttachError(true);
    }
  };

  const meta = [
    doc.pages != null ? t("pages", { count: doc.pages }) : null,
    t("passages", { count: doc.passages }),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Modal
      onClose={onClose}
      title={readableFile(doc.fileName)}
      subtitle={meta}
      closeLabel={tv("close")}
      actions={
        pdfUrl ? (
          <a href={pdfUrl} target="_blank" rel="noreferrer" className={styles.viewerLink}>
            <ArrowSquareOut size={16} aria-hidden="true" />
            {tv("openNewTab")}
          </a>
        ) : null
      }
    >
      {!hasFile ? (
        <div className={styles.viewerEmpty}>
          <FilePdf size={40} weight="duotone" aria-hidden="true" />
          <b>{tv("noPdfTitle")}</b>
          <p>{tv("noPdf", { file: doc.fileName })}</p>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            hidden
            onChange={(e) => {
              attach(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className="btn-primary"
            disabled={attaching}
            onClick={() => inputRef.current?.click()}
          >
            {attaching ? (
              <span className={styles.spinner} aria-hidden="true" />
            ) : (
              <UploadSimple size={16} aria-hidden="true" />
            )}
            {attaching ? tv("attaching") : tv("attach")}
          </button>
          {attachError && (
            <p className={styles.viewerError} role="alert">
              {tv("attachFailed")}
            </p>
          )}
        </div>
      ) : failed ? (
        <p className={styles.viewerStatus} role="alert">
          {tv("failed")}
        </p>
      ) : pdfUrl ? (
        <iframe className={styles.pdfFrame} src={pdfUrl} title={doc.fileName} />
      ) : (
        <p className={styles.viewerStatus}>
          <span className={styles.spinnerDark} aria-hidden="true" />
          {tv("loadingPdf")}
        </p>
      )}
    </Modal>
  );
}
