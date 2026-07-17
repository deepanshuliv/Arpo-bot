"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, CheckCircle, LockKey, WarningCircle } from "@phosphor-icons/react";
import PasswordInput from "@/components/PasswordInput";
import SiteHeader, { headerStyles } from "@/components/SiteHeader";
import { getResetStatus, resetPassword } from "@/lib/api";
import { FieldError, serverError, validate, type AuthField, type FieldErrors } from "../formErrors";
import TrailPanel from "../TrailPanel";
import styles from "../auth.module.css";

function ResetForm() {
  const t = useTranslations("auth");
  const tr = useTranslations("auth.reset");
  const tp = useTranslations("password");
  const params = useSearchParams();
  // Leaders come back to the leader sign-in page
  const signInHref = params.get("from") === "leader" ? "/admin/auth" : "/auth";

  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    getResetStatus().then((res) => setEnabled(res.success ? Boolean(res.data?.enabled) : true));
  }, []);

  const clearError = (field: AuthField) =>
    setErrors((prev) => (prev[field] || prev.form ? { ...prev, [field]: undefined, form: undefined } : prev));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const found = validate({ email, password, confirm }, "reset");
    if (Object.keys(found).length > 0) {
      setErrors(found);
      document.getElementById(`reset-${Object.keys(found)[0]}`)?.focus();
      return;
    }

    setLoading(true);
    setErrors({});
    const res = await resetPassword(email.trim(), password, confirm);
    setLoading(false);

    if (res.success) {
      setDone(true);
      return;
    }
    const placed = serverError(res.code);
    setErrors(placed);
    const field = Object.keys(placed)[0];
    if (field !== "form") document.getElementById(`reset-${field}`)?.focus();
  };

  const message = (field: AuthField) => {
    const key = errors[field];
    return key ? t(`errors.${key}`) : undefined;
  };

  if (enabled === false) {
    return (
      <div className={styles.resultCard}>
        <span className={styles.resultIcon} data-tone="muted" aria-hidden="true">
          <LockKey size={26} weight="duotone" />
        </span>
        <h1>{tr("disabledTitle")}</h1>
        <p>{tr("disabledSub")}</p>
        <Link href={signInHref} className="btn-secondary">
          <ArrowLeft size={16} weight="bold" aria-hidden="true" />
          {tr("backToSignIn")}
        </Link>
      </div>
    );
  }

  if (done) {
    const back = `${signInHref}?email=${encodeURIComponent(email.trim())}`;
    return (
      <div className={styles.resultCard} role="status">
        <span className={styles.resultIcon} aria-hidden="true">
          <CheckCircle size={28} weight="fill" />
        </span>
        <h1>{tr("doneTitle")}</h1>
        <p>{tr("doneSub")}</p>
        <Link href={back} className="btn-primary">
          {tr("signInNow")}
          <ArrowRight size={16} weight="bold" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  return (
    <>
      <Link href={signInHref} className={styles.backLink}>
        <ArrowLeft size={14} weight="bold" aria-hidden="true" />
        {tr("backToSignIn")}
      </Link>

      <header className={styles.heading}>
        <h1>{tr("title")}</h1>
        <p>{tr("sub")}</p>
      </header>

      <form onSubmit={handleSubmit} className={`${styles.form} ${styles.formSpaced}`} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="reset-email">
            {tr("email")}
          </label>
          <input
            id="reset-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearError("email");
            }}
            aria-invalid={Boolean(errors.email) || undefined}
            aria-describedby={errors.email ? "reset-email-error" : undefined}
          />
          <FieldError id="reset-email-error" message={message("email")} />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="reset-password">
            {tr("newPassword")}
            <span className={styles.hint}>{t("passwordHint")}</span>
          </label>
          <PasswordInput
            id="reset-password"
            autoComplete="new-password"
            placeholder={tp("newPlaceholder")}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearError("password");
            }}
            aria-invalid={Boolean(errors.password) || undefined}
            aria-describedby={errors.password ? "reset-password-error" : undefined}
          />
          <FieldError id="reset-password-error" message={message("password")} />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="reset-confirm">
            {tr("confirmPassword")}
          </label>
          <PasswordInput
            id="reset-confirm"
            autoComplete="new-password"
            placeholder={tr("confirmPlaceholder")}
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              clearError("confirm");
            }}
            aria-invalid={Boolean(errors.confirm) || undefined}
            aria-describedby={errors.confirm ? "reset-confirm-error" : undefined}
          />
          <FieldError id="reset-confirm-error" message={message("confirm")} />
        </div>

        {errors.form && (
          <p className={styles.error} role="alert">
            <WarningCircle size={18} weight="fill" aria-hidden="true" />
            {message("form")}
          </p>
        )}

        <button type="submit" className={`${styles.submitBtn} btn-primary`} disabled={loading}>
          {loading ? (
            <>
              <span className={styles.spinner} aria-hidden="true" />
              {tr("resetting")}
            </>
          ) : (
            <>
              {tr("submit")}
              <ArrowRight size={16} weight="bold" aria-hidden="true" />
            </>
          )}
        </button>
      </form>
    </>
  );
}

