import mongoose from "mongoose";

export async function connectToDb() {
  try {
    await mongoose.connect(process.env.MONGO_DB_API_KEY!);
    console.log("Mongo DB is Connected");
  } catch (error) {
    console.log(
      "Mongo DB is NOT Connected:",
      error instanceof Error ? error.message : error,
    );
  }
}
