import fs from "fs/promises";
import { existsSync, mkdirSync } from "fs";
import path from "path";

/** Original PDFs, kept so admins can view them later. Not committed to git. */
const DOCS_DIR = path.join(process.cwd(), "storage", "documents");
mkdirSync(DOCS_DIR, { recursive: true });

