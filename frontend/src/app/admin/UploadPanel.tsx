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

