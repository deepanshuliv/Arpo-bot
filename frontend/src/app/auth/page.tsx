"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, WarningCircle } from "@phosphor-icons/react";
import PasswordInput from "@/components/PasswordInput";
import SiteHeader, { headerStyles } from "@/components/SiteHeader";
import { isStaffRole, signIn, signUp } from "@/lib/api";
import { FieldError, serverError, validate, type AuthField, type FieldErrors } from "./formErrors";
import TrailPanel from "./TrailPanel";
import styles from "./auth.module.css";

function AuthPageContent() {
  const t = useTranslations("auth");
  const th = useTranslations("header");
  const tp = useTranslations("password");
  const router = useRouter();
  const params = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  // Pre-filled after a password reset
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const switchMode = (signUpMode: boolean) => {
    setIsSignUp(signUpMode);
    setErrors({});
  };

  /** Editing a field clears its message */
  const clearError = (field: AuthField) =>
    setErrors((prev) => (prev[field] || prev.form ? { ...prev, [field]: undefined, form: undefined } : prev));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const found = validate({ name, email, password }, isSignUp ? "signUp" : "signIn");
    if (Object.keys(found).length > 0) {
      setErrors(found);
      document.getElementById(Object.keys(found)[0])?.focus();
      return;
    }

    setLoading(true);
    setErrors({});
    const res = isSignUp
      ? await signUp(name.trim(), email.trim(), password)
      : await signIn(email.trim(), password);
    setLoading(false);

    if (res.success && res.data?.token) {
      localStorage.setItem("arpo_token", res.data.token);
      localStorage.setItem("arpo_role", res.data.role || "user");
      if (res.data.name) localStorage.setItem("arpo_name", res.data.name);
      router.push(isStaffRole(res.data.role) ? "/admin" : "/chat");
      return;
    }

    const placed = serverError(res.code);
    setErrors(placed);
    const field = Object.keys(placed)[0];
    if (field !== "form") document.getElementById(field)?.focus();
  };

  const message = (field: AuthField) => {
    const key = errors[field];
    return key ? t(`errors.${key}`) : undefined;
  };

  // One-click way out of the two most common dead ends
  const emailAction =
    errors.email === "EMAIL_TAKEN" ? (
      <button type="button" className={styles.inlineAction} onClick={() => switchMode(false)}>
        {t("actions.signInInstead")}
      </button>
    ) : errors.email === "ACCOUNT_NOT_FOUND" ? (
      <button type="button" className={styles.inlineAction} onClick={() => switchMode(true)}>
        {t("actions.createInstead")}
      </button>
    ) : null;

  return (
    <div className={styles.page}>
      <SiteHeader
        action={
          <Link href="/admin/auth" className="btn-secondary">
            {th("leaderSignIn")}
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
              <h1>{isSignUp ? t("joinTitle") : t("welcomeTitle")}</h1>
              <p>{isSignUp ? t("joinSub") : t("welcomeSub")}</p>
            </header>

            <div className={styles.segmented} role="group" aria-label={t("tabSignIn")}>
              <button
                type="button"
                aria-pressed={!isSignUp}
                className={styles.segment}
                onClick={() => switchMode(false)}
              >
                {t("tabSignIn")}
              </button>
              <button
                type="button"
                aria-pressed={isSignUp}
                className={styles.segment}
                onClick={() => switchMode(true)}
              >
                {t("tabCreate")}
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.form} noValidate>
              {isSignUp && (
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="name">
                    {t("fullName")}
                  </label>
                  <input
                    id="name"
                    type="text"
                    autoComplete="name"
                    placeholder={t("namePlaceholder")}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      clearError("name");
                    }}
                    aria-invalid={Boolean(errors.name) || undefined}
                    aria-describedby={errors.name ? "name-error" : undefined}
                  />
                  <FieldError id="name-error" message={message("name")} />
                </div>
              )}

              <div className={styles.field}>
                <label className={styles.label} htmlFor="email">
                  {t("email")}
                </label>
                <input
                  id="email"
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
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
                <FieldError id="email-error" message={message("email")} action={emailAction} />
              </div>

              <div className={styles.field}>
                <div className={styles.labelRow}>
                  <label className={styles.label} htmlFor="password">
                    {t("password")}
                  </label>
                  {isSignUp ? (
                    <span className={styles.hint}>{t("passwordHint")}</span>
                  ) : (
                    <Link
                      href={`/auth/reset?email=${encodeURIComponent(email.trim())}`}
                      className={styles.forgot}
                    >
                      {t("forgot")}
                    </Link>
                  )}
                </div>
                <PasswordInput
                  id="password"
                  placeholder={isSignUp ? tp("newPlaceholder") : tp("placeholder")}
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearError("password");
                  }}
                  aria-invalid={Boolean(errors.password) || undefined}
                  aria-describedby={errors.password ? "password-error" : undefined}
                />
                <FieldError id="password-error" message={message("password")} />
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
                    {isSignUp ? t("creating") : t("signingIn")}
                  </>
                ) : (
                  <>
                    {isSignUp ? t("submitCreate") : t("submitSignIn")}
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

export default function AuthPage() {
  return (
    <Suspense>
      <AuthPageContent />
    </Suspense>
  );
}
