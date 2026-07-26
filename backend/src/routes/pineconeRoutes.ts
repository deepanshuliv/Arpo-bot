import { Router, type Request, type Response } from "express";
import { authMiddleware, adminMiddleware } from "../utils/middleware";
import upload, { deleteFile } from "../utils/multer";
import { processPdf } from "../utils/pdfloader";
import { pineconeIndex, vectorStore } from "../utils/vector";
import { hasOriginal, originalPath, removeOriginal, saveOriginal } from "../utils/documentStore";

const pineConeRouter = Router();

pineConeRouter.post(
  "/pdf",
  authMiddleware,
  adminMiddleware,
  upload.array("pdfFiles"),
  async (req: Request, res: Response) => {
    const files = (req.files as Express.Multer.File[]) ?? [];
    try {
      if (files.length === 0) {
        return res.status(400).json({
          success: false,
          code: "INVALID_INPUT",
          message: "No files provided",
        });
      }

      console.log(`[INFO] Processing ${files.length} PDF files...`);

      // Re-uploading a file replaces its old passages instead of duplicating them
      const existing = new Map((await listIndexedDocuments()).map((d) => [d.fileName, d.ids]));

      const results = [];
      let totalChunks = 0;

      for (const file of files) {
        try {
          const docs = await processPdf(file.path, file.originalname);
          await vectorStore.addDocuments(docs);

          const oldIds = existing.get(file.originalname) ?? [];
          for (let i = 0; i < oldIds.length; i += 1000) {
            await pineconeIndex.deleteMany(oldIds.slice(i, i + 1000));
          }
          await saveOriginal(file.path, file.originalname);

          totalChunks += docs.length;
          results.push({
            fileName: file.originalname,
            chunks: docs.length,
            status: "success",
            replaced: oldIds.length > 0,
          });
        } catch (err: any) {
          console.error(`[ERROR] Failed to process ${file.originalname}:`, err);
          results.push({
            fileName: file.originalname,
            chunks: 0,
            status: "failed",
            error: err.message || "Failed to index",
          });
        } finally {
          deleteFile(file.path);
        }
      }

      return res.status(200).json({
        success: true,
        message: "PDF indexing complete",
        data: { totalChunks, files: results },
      });
    } catch (error) {
      for (const file of files) deleteFile(file.path);
      console.log("[ERROR]", error);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Internal server error during PDF upload",
      });
    }
  },
);

/* ───────────── Indexed documents ───────────── */

interface IndexedDocument {
  fileName: string;
  passages: number;
  pages: number | null;
  uploadedAt: string | null;
  ids: string[];
}

/**
 * Groups every stored passage by its source file. Reads the index directly,
 * so the list is always accurate; fine at MVP scale (hundreds of passages).
 */
async function listIndexedDocuments() {
  const ids: string[] = [];
  let paginationToken: string | undefined;
  do {
    const page = await pineconeIndex.listPaginated({ limit: 100, paginationToken });
    ids.push(...(page.vectors ?? []).map((v) => v.id!).filter(Boolean));
    paginationToken = page.pagination?.next;
  } while (paginationToken);

  const byFile = new Map<string, IndexedDocument>();
  for (let i = 0; i < ids.length; i += 100) {
    const batch = await pineconeIndex.fetch(ids.slice(i, i + 100));
    for (const [id, record] of Object.entries(batch.records ?? {})) {
      const meta = (record.metadata ?? {}) as Record<string, any>;
      const fileName = String(meta.sourceFile ?? "Unknown source");
      const entry: IndexedDocument = byFile.get(fileName) ?? {
        fileName,
        passages: 0,
        pages: meta["pdf.totalPages"] ?? null,
        uploadedAt: meta.uploadedAt ?? null,
        ids: [],
      };
      entry.passages += 1;
      entry.ids.push(id);
      if (meta.uploadedAt && (!entry.uploadedAt || meta.uploadedAt > entry.uploadedAt)) {
        entry.uploadedAt = meta.uploadedAt;
      }
      byFile.set(fileName, entry);
    }
  }

  return [...byFile.values()].sort((a, b) =>
    (b.uploadedAt ?? "").localeCompare(a.uploadedAt ?? ""),
  );
}

pineConeRouter.get(
  "/documents",
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response) => {
    try {
      const documents = await listIndexedDocuments();
      return res.status(200).json({
        success: true,
        data: {
          documents: documents.map(({ ids, ...doc }) => ({
            ...doc,
            hasFile: hasOriginal(doc.fileName),
          })),
          totalPassages: documents.reduce((sum, d) => sum + d.passages, 0),
        },
      });
    } catch (error) {
      console.log("[ERROR]", error);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Could not list documents",
      });
    }
  },
);

pineConeRouter.delete(
  "/documents",
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response) => {
    try {
      const fileName = String(req.query.fileName ?? "");
      if (!fileName) {
        return res.status(400).json({
          success: false,
          code: "INVALID_INPUT",
          message: "fileName is required",
        });
      }

      const doc = (await listIndexedDocuments()).find((d) => d.fileName === fileName);
      if (!doc) {
        return res.status(404).json({
          success: false,
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      for (let i = 0; i < doc.ids.length; i += 1000) {
        await pineconeIndex.deleteMany(doc.ids.slice(i, i + 1000));
      }

      await removeOriginal(fileName);
      console.log(`[INFO] Deleted ${doc.ids.length} passages of ${fileName}`);
      return res.status(200).json({
        success: true,
        data: { fileName, passagesDeleted: doc.ids.length },
      });
    } catch (error) {
      console.log("[ERROR]", error);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Could not delete the document",
      });
    }
  },
);

/** The original PDF, shown inline in the admin viewer. */
pineConeRouter.get(
  "/documents/file",
  authMiddleware,
  adminMiddleware,
  (req: Request, res: Response) => {
    const fileName = String(req.query.fileName ?? "");
    const file = fileName ? originalPath(fileName) : null;
    if (!file) {
      return res.status(404).json({
        success: false,
        code: "FILE_NOT_STORED",
        message: "The original file isn't stored. Upload it again to view it.",
      });
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    );
    return res.sendFile(file);
  },
);

/** The text ARPO answers from, page by page (works for every document). */
pineConeRouter.get(
  "/documents/passages",
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response) => {
    try {
      const fileName = String(req.query.fileName ?? "");
      const doc = (await listIndexedDocuments()).find((d) => d.fileName === fileName);
      if (!doc) {
        return res.status(404).json({ success: false, code: "NOT_FOUND", message: "Document not found" });
      }

      const passages: { page: number | null; chunk: number | null; text: string }[] = [];
      for (let i = 0; i < doc.ids.length; i += 100) {
        const batch = await pineconeIndex.fetch(doc.ids.slice(i, i + 100));
        for (const record of Object.values(batch.records ?? {})) {
          const meta = (record.metadata ?? {}) as Record<string, any>;
          passages.push({
            page: meta.pageNumber ?? meta["loc.pageNumber"] ?? null,
            chunk: meta.chunkIndex ?? null,
            text: String(meta.text ?? ""),
          });
        }
      }
      passages.sort((a, b) => (a.page ?? 0) - (b.page ?? 0) || (a.chunk ?? 0) - (b.chunk ?? 0));

      return res.status(200).json({
        success: true,
        data: { fileName, passages, hasFile: hasOriginal(fileName) },
      });
    } catch (error) {
      console.log("[ERROR]", error);
      return res.status(500).json({ success: false, code: "SERVER_ERROR", message: "Could not load passages" });
    }
  },
);

export default pineConeRouter;
