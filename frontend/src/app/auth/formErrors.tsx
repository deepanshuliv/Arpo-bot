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

