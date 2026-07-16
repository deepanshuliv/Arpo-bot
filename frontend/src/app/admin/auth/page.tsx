"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, LockKey, WarningCircle } from "@phosphor-icons/react";
import PasswordInput from "@/components/PasswordInput";
import SiteHeader, { headerStyles } from "@/components/SiteHeader";
import { adminSignIn } from "@/lib/api";
import {
  FieldError,
  serverError,
  validate,
  type AuthField,
  type FieldErrors,
} from "../../auth/formErrors";
import TrailPanel from "../../auth/TrailPanel";
import styles from "../../auth/auth.module.css";

const INPUT_IDS: Partial<Record<AuthField, string>> = {
  email: "admin-email",
  password: "admin-password",
};

function AdminAuthContent() {
  const t = useTranslations("auth");
  const ta = useTranslations("adminAuth");
  const th = useTranslations("header");
  const tp = useTranslations("password");
  const router = useRouter();
  const params = useSearchParams();
  // Pre-filled after a password reset
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const clearError = (field: AuthField) =>
    setErrors((prev) => (prev[field] || prev.form ? { ...prev, [field]: undefined, form: undefined } : prev));

  const focusFirst = (found: FieldErrors) => {
    const field = Object.keys(found)[0] as AuthField;
    const id = INPUT_IDS[field];
    if (id) document.getElementById(id)?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const found = validate({ email, password }, "signIn");
    if (Object.keys(found).length > 0) {
      setErrors(found);
      focusFirst(found);
      return;
    }

    setLoading(true);
    setErrors({});
    const res = await adminSignIn(email.trim(), password);
    setLoading(false);

    if (res.success && res.data?.token) {
      localStorage.setItem("arpo_token", res.data.token);
      localStorage.setItem("arpo_role", res.data.role || "subadmin");
      if (res.data.name) localStorage.setItem("arpo_name", res.data.name);
      router.push("/admin");
      return;
    }

    const placed = serverError(res.code);
    setErrors(placed);
    focusFirst(placed);
  };

  const message = (field: AuthField) => {
    const key = errors[field];
    return key ? t(`errors.${key}`) : undefined;
  };

  return (
    <div className={styles.page}>
      <SiteHeader
        action={
          <Link href="/auth" className="btn-secondary">
            {th("scoutSignIn")}
          </Link>
        }
      >
        <Link href="/" className={`${headerStyles.link} ${headerStyles.hideSm}`}>
          {th("home")}
        </Link>
      </SiteHeader>

      <div className={styles.container}>
        <TrailPanel />

        <main id="main" className={styles.formSide}>
          <div className={styles.formInner}>
            <header className={styles.heading}>
              <h1>{ta("title")}</h1>
              <p>{ta("sub")}</p>
            </header>

            <p className={styles.notice}>
              <LockKey size={18} weight="duotone" aria-hidden="true" />
              {ta("notice")}
            </p>

            <form onSubmit={handleSubmit} className={`${styles.form} ${styles.formSpaced}`} noValidate>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="admin-email">
                  {ta("email")}
                </label>
                <input
                  id="admin-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder={ta("emailPlaceholder")}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearError("email");
                  }}
                  aria-invalid={Boolean(errors.email) || undefined}
                  aria-describedby={errors.email ? "admin-email-error" : undefined}
                />
                <FieldError id="admin-email-error" message={message("email")} />
              </div>

              <div className={styles.field}>
                <div className={styles.labelRow}>
                  <label className={styles.label} htmlFor="admin-password">
                    {t("password")}
                  </label>
                  <Link
                    href={`/auth/reset?from=leader&email=${encodeURIComponent(email.trim())}`}
                    className={styles.forgot}
                  >
                    {t("forgot")}
                  </Link>
                </div>
                <PasswordInput
                  id="admin-password"
                  placeholder={tp("placeholder")}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearError("password");
                  }}
                  aria-invalid={Boolean(errors.password) || undefined}
                  aria-describedby={errors.password ? "admin-password-error" : undefined}
                />
                <FieldError id="admin-password-error" message={message("password")} />
              </div>

              {errors.form && (
                <p className={styles.error} role="alert">
                  <WarningCircle size={18} weight="fill" aria-hidden="true" />
                  <span>
                    {message("form")}
                    {errors.form === "FORBIDDEN" && (
                      <>
                        {" "}
                        <Link href="/auth" className={styles.inlineAction}>
                          {t("actions.useScoutSignIn")}
                        </Link>
                      </>
                    )}
                  </span>
                </p>
              )}

              <button type="submit" className={`${styles.submitBtn} btn-primary`} disabled={loading}>
                {loading ? (
                  <>
                    <span className={styles.spinner} aria-hidden="true" />
                    {t("signingIn")}
                  </>
                ) : (
                  <>
                    {t("submitSignIn")}
                    <ArrowRight size={16} weight="bold" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AdminAuthPage() {
  return (
    <Suspense>
      <AdminAuthContent />
    </Suspense>
  );
}
