import { createReadStream } from "fs";
import { pipeline } from "stream/promises";
import mongoose from "mongoose";

/**
 * Original PDFs, kept in MongoDB (GridFS) so admins can view them later.
 * Stored in the database rather than on disk because Render's disk is wiped on
 * every deploy. One file per document name; saving again replaces it.
 */
function bucket() {
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database is not connected");
  return new mongoose.mongo.GridFSBucket(db, { bucketName: "documents" });
}

async function idsFor(fileName: string) {
  const files = await bucket().find({ filename: fileName }, { projection: { _id: 1 } }).toArray();
  return files.map((f) => f._id);
}

export async function saveOriginal(tempPath: string, fileName: string) {
  const old = await idsFor(fileName);
  await pipeline(
    createReadStream(tempPath),
    bucket().openUploadStream(fileName, { metadata: { contentType: "application/pdf" } }),
  );
  for (const id of old) await bucket().delete(id);
}

/** Names of every stored original, for marking documents in the list. */
export async function storedOriginals() {
  const files = await bucket().find({}, { projection: { filename: 1 } }).toArray();
  return new Set(files.map((f) => f.filename));
}

export async function hasOriginal(fileName: string) {
  return (await idsFor(fileName)).length > 0;
}

/** The newest stored copy, or null when the original was never kept. */
export async function openOriginal(fileName: string) {
  const [file] = await bucket()
    .find({ filename: fileName })
    .sort({ uploadDate: -1 })
    .limit(1)
    .toArray();
  if (!file) return null;
  return { length: file.length, stream: bucket().openDownloadStream(file._id) };
}

export async function removeOriginal(fileName: string) {
  for (const id of await idsFor(fileName)) await bucket().delete(id);
}
