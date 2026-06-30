import z from "zod";

const email = z.string().trim().toLowerCase().pipe(z.email());

export const SignupSchema = z.object({
  name: z.string().trim().min(1),
  email,
  password: z.string().min(6),
});
export const SigninSchema = z.object({
  email,
  password: z.string().min(1),
});

export const ResetPasswordSchema = z.object({
  email,
  password: z.string().min(6),
  confirmPassword: z.string(),
});

/** The first invalid field of a sign-up / sign-in body, as an error code. */
export function fieldErrorCode(error: z.ZodError) {
  const field = error.issues[0]?.path[0];
  if (field === "name") return "NAME_REQUIRED" as const;
  if (field === "email") return "INVALID_EMAIL" as const;
  if (field === "password") return "PASSWORD_TOO_SHORT" as const;
  return "INVALID_INPUT" as const;
}

export const LanguageSchema = z.enum(["en", "hi"]);
export type Language = z.infer<typeof LanguageSchema>;

export const MessageSchema = z.object({
  role: z.enum(["agent", "user", "developer"]),
  message: z.string().optional(),
  messageType: z.enum(["image", "text"]),
});

