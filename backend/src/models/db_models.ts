import mongoose from "mongoose";

const { Schema, model } = mongoose;

// "admin" manages the team; "subadmin" manages the knowledge base but cannot add admins.
export const STAFF_ROLES = ["admin", "subadmin"] as const;

const userSchema = new Schema(
  {
    name: { type: String },
    email: { type: String, unique: true },
    password: { type: String },
    role: { type: String, enum: ["user", "subadmin", "admin"], default: "user" },
    thread_id: [{ type: Schema.Types.ObjectId, ref: "Threads" }],
    // Who granted staff access (for sub-admins)
    addedBy: { type: Schema.Types.ObjectId, ref: "Users", default: undefined },
  },
  { timestamps: true },
);
const threadSchema = new Schema(
  {
    title: { type: String },
    messages: [{ type: Schema.Types.ObjectId, ref: "Messages" }],
    authors: [{ type: Schema.Types.ObjectId, ref: "Users" }],
  },
  { timestamps: true },
);

const messageSchema = new Schema(
  {
    message_description: { type: String },
    role: { type: String, enum: ["agent", "user", "developer"] },
    thread_id: { type: Schema.Types.ObjectId, ref: "Threads" },
    // Retrieved passages an agent answer was based on, kept for reload
    sources: { type: [Schema.Types.Mixed], default: undefined },
  },
  { timestamps: true },
);

export const Users = model("users", userSchema);
export const Threads = model("threads", threadSchema);
export const Messages = model("messages", messageSchema);
