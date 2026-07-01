import { Router, type Request, type Response } from "express";
import { authMiddleware, adminMiddleware } from "../utils/middleware";
import upload, { deleteFile } from "../utils/multer";
import { processPdf } from "../utils/pdfloader";
import { pineconeIndex, vectorStore } from "../utils/vector";

const pineConeRouter = Router();

pineConeRouter.post(
  "/pdf",
  authMiddleware,
  adminMiddleware,
  upload.array("pdfFiles"),
  async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No files provided",
        });
      }

      console.log(`[INFO] Processing ${files.length} PDF files...`);

      const results = [];
      let totalChunks = 0;

      for (const file of files) {
        try {

          const docs = await processPdf(file.path, file.originalname);

          await vectorStore.addDocuments(docs);

          totalChunks += docs.length;
          results.push({
            fileName: file.originalname,
            chunks: docs.length,
            status: "success",
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
        data: {
          totalChunks,
          files: results,
        },
      });
    } catch (error) {
      console.log("[ERROR]", error);
      res.status(500).json({
        success: false,
        message: "Internal server error during PDF upload",
      });
    }
  },
);

export default pineConeRouter;
