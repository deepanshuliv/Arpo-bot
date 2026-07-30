"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowSquareOut, FilePdf, Info, TextAlignLeft } from "@phosphor-icons/react";
import SlideOver from "@/components/SlideOver";
import {
  getDocumentFileUrl,
  getDocumentPassages,
  type DocumentPassage,
  type IndexedDocument,
} from "@/lib/api";
import styles from "./admin.module.css";

type Tab = "pdf" | "text";

function readableFile(name: string) {
  return name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim();
}

/**
 * Shows an uploaded document: the original PDF (when stored) or the text ARPO
 * answers from, page by page. Mount with key={fileName} so each opens fresh.
 */
export default function DocumentViewer({
  doc,
  onClose,
}: {
  doc: IndexedDocument;
  onClose: () => void;
}) {
  const t = useTranslations("admin");
  const tv = useTranslations("admin.viewer");
  const [tab, setTab] = useState<Tab>(doc.hasFile ? "pdf" : "text");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFailed, setPdfFailed] = useState(false);
  const [passages, setPassages] = useState<DocumentPassage[] | null>(null);
  const [textFailed, setTextFailed] = useState(false);

  // The PDF is fetched with the admin's sign-in, then shown from a local URL
  useEffect(() => {
    if (!doc.hasFile) return;
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
      } else {
        setPdfFailed(true);
      }
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [doc.fileName, doc.hasFile]);

  useEffect(() => {
    if (tab !== "text" || passages !== null) return;
    getDocumentPassages(doc.fileName).then((res) => {
      if (res.success && res.data) setPassages(res.data.passages);
      else setTextFailed(true);
    });
  }, [tab, passages, doc.fileName]);

  const byPage = useMemo(() => {
    const groups = new Map<number | null, string[]>();
    for (const p of passages ?? []) {
      groups.set(p.page, [...(groups.get(p.page) ?? []), p.text]);
    }
    return [...groups.entries()];
  }, [passages]);

  const meta = [
    doc.pages != null ? t("pages", { count: doc.pages }) : null,
    t("passages", { count: doc.passages }),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <SlideOver
      open
      onClose={onClose}
      title={readableFile(doc.fileName)}
      subtitle={meta}
      closeLabel={tv("close")}
      size="wide"
      actions={
        pdfUrl && tab === "pdf" ? (
          <a href={pdfUrl} target="_blank" rel="noreferrer" className={styles.viewerLink}>
            <ArrowSquareOut size={16} aria-hidden="true" />
            {tv("openNewTab")}
          </a>
        ) : null
      }
    >
      <div className={styles.viewerTabs} role="tablist" aria-label={doc.fileName}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "pdf"}
          className={styles.viewerTab}
          onClick={() => setTab("pdf")}
        >
          <FilePdf size={16} aria-hidden="true" />
          {tv("tabPdf")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "text"}
          className={styles.viewerTab}
          onClick={() => setTab("text")}
        >
          <TextAlignLeft size={16} aria-hidden="true" />
          {tv("tabText")}
        </button>
      </div>

      {tab === "pdf" ? (
        !doc.hasFile ? (
          <div className={styles.viewerNotice}>
            <Info size={22} weight="duotone" aria-hidden="true" />
            <div>
              <b>{tv("noPdfTitle")}</b>
              <p>{tv("noPdf")}</p>
              <button type="button" className="btn-secondary" onClick={() => setTab("text")}>
                <TextAlignLeft size={16} aria-hidden="true" />
                {tv("tabText")}
              </button>
            </div>
          </div>
        ) : pdfFailed ? (
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
        )
      ) : textFailed ? (
        <p className={styles.viewerStatus} role="alert">
          {tv("failed")}
        </p>
      ) : passages === null ? (
        <p className={styles.viewerStatus}>
          <span className={styles.spinnerDark} aria-hidden="true" />
          {tv("loadingText")}
        </p>
      ) : (
        <div className={styles.pages}>
          {byPage.map(([page, texts]) => (
            <section key={String(page)} className={styles.page}>
              <h3>{page != null ? tv("page", { page }) : tv("noPage")}</h3>
              {texts.map((text, i) => (
                <p key={i}>{text}</p>
              ))}
            </section>
          ))}
        </div>
      )}
    </SlideOver>
  );
}
