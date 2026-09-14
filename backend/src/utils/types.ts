import z from "zod";

export const SignupSchema = z.object({
  name: z.string(),
  email: z.email(),
  password: z.string().min(6),
});
export const SigninSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});

export const MessageSchema = z.object({
  role: z.enum(["agent", "user", "developer"]),
  message: z.string().optional(),
  messageType: z.enum(["image", "text"]),
});

