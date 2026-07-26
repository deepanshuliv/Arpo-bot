import fs from "fs/promises";
import { existsSync, mkdirSync } from "fs";
import path from "path";

/** Original PDFs, kept so admins can view them later. Not committed to git. */
const DOCS_DIR = path.join(process.cwd(), "storage", "documents");
mkdirSync(DOCS_DIR, { recursive: true });

/** Flattens a file name to one safe path segment (no folders, no "..") */
function storedPath(fileName: string) {
  const safe = path
    .basename(fileName)
    .replace(/[^\w.\- ()ऀ-ॿ]/g, "_")
    .replace(/^\.+/, "_");
  return path.join(DOCS_DIR, safe || "document.pdf");
}

