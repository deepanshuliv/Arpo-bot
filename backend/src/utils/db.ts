import mongoose from "mongoose";

const PLACEHOLDER = "PASTE_YOUR";

/** Production uses PROD_MONGO_DB_URI once it's filled in; otherwise MONGO_DB_API_KEY. */
function databaseUri() {
  const prod = process.env.PROD_MONGO_DB_URI;
  if (process.env.NODE_ENV === "production" && prod && !prod.startsWith(PLACEHOLDER)) {
    return prod;
  }
  return process.env.MONGO_DB_API_KEY!;
}

export async function connectToDb() {
  try {
    await mongoose.connect(databaseUri());
    console.log("Mongo DB is Connected");
  } catch (error) {
    console.log(
      "Mongo DB is NOT Connected:",
      error instanceof Error ? error.message : error,
    );
  }
}
