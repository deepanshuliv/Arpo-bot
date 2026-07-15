import { WarningCircle } from "@phosphor-icons/react";
import type { ErrorCode } from "@/lib/api";
import styles from "./auth.module.css";

export type AuthErrorKey =
  | "NAME_REQUIRED"
  | "EMAIL_REQUIRED"
  | "INVALID_EMAIL"
  | "PASSWORD_REQUIRED"
  | "PASSWORD_TOO_SHORT"
  | "EMAIL_TAKEN"
  | "ACCOUNT_NOT_FOUND"
  | "WRONG_PASSWORD"
  | "FORBIDDEN"
  | "CONFIRM_REQUIRED"
  | "PASSWORDS_DONT_MATCH"
  | "RESET_DISABLED"
  | "TOO_MANY_ATTEMPTS"
  | "NETWORK"
  | "SERVER_ERROR";

export type AuthField = "name" | "email" | "password" | "confirm" | "form";
export type FieldErrors = Partial<Record<AuthField, AuthErrorKey>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Checks the form before it is sent; returns an error per invalid field. */
export function validate(
  values: { name?: string; email: string; password: string; confirm?: string },
  mode: "signIn" | "signUp" | "reset",
): FieldErrors {
  const errors: FieldErrors = {};
  if (mode === "signUp" && !values.name?.trim()) errors.name = "NAME_REQUIRED";

  const email = values.email.trim();
  if (!email) errors.email = "EMAIL_REQUIRED";
  else if (!EMAIL_PATTERN.test(email)) errors.email = "INVALID_EMAIL";

  if (!values.password) errors.password = "PASSWORD_REQUIRED";
  else if (mode !== "signIn" && values.password.length < 6) errors.password = "PASSWORD_TOO_SHORT";

  if (mode === "reset") {
    if (!values.confirm) errors.confirm = "CONFIRM_REQUIRED";
    else if (values.confirm !== values.password) errors.confirm = "PASSWORDS_DONT_MATCH";
  }

  return errors;
}

/** Places a server error code on the field it belongs to. */
export function serverError(code: ErrorCode | undefined): FieldErrors {
  switch (code) {
    case "NAME_REQUIRED":
      return { name: code };
    case "INVALID_EMAIL":
    case "EMAIL_TAKEN":
    case "ACCOUNT_NOT_FOUND":
      return { email: code };
    case "PASSWORD_TOO_SHORT":
    case "WRONG_PASSWORD":
      return { password: code };
    case "PASSWORDS_DONT_MATCH":
      return { confirm: code };
    case "FORBIDDEN":
    case "RESET_DISABLED":
    case "TOO_MANY_ATTEMPTS":
    case "NETWORK":
      return { form: code };
    default:
      return { form: "SERVER_ERROR" };
  }
}

