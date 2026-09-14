"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signUp } from "@/lib/api";
import styles from "./auth.module.css";

export default function AuthPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = isSignUp
        ? await signUp(name, email, password)
        : await signIn(email, password);

      if (res.success && res.data?.token) {
        localStorage.setItem("arpo_token", res.data.token);
        localStorage.setItem("arpo_role", res.data.role || "user");
        if (res.data.name) {
          localStorage.setItem("arpo_name", res.data.name);
        }

        if (res.data.role === "admin") {
          router.push("/admin");
        } else {
          router.push("/chat");
        }
      } else {
        setError(res.message || "Authentication failed");
      }
    } catch {
      setError("Connection failed. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {}
      <div className={styles.gridBg} />

      <div className={styles.card}>
        {}
        <div className={styles.logoSection}>
          <div className={styles.logoIcon}>
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className={styles.logoText}>ARPO</h1>
          <p className={styles.logoSub}>Scout Master AI</p>
        </div>

        {}
        <div className={styles.tabBar}>
          <button
            className={`${styles.tab} ${!isSignUp ? styles.tabActive : ""}`}
            onClick={() => {
              setIsSignUp(false);
              setError("");
            }}
          >
            Sign In
          </button>
          <button
            className={`${styles.tab} ${isSignUp ? styles.tabActive : ""}`}
            onClick={() => {
              setIsSignUp(true);
              setError("");
            }}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          {isSignUp && (
            <div className={styles.field}>
              <label className={styles.label}>Name</label>
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: "100%", marginTop: "8px" }}
          >
            {loading ? (
              <span className={styles.spinner} />
            ) : isSignUp ? (
              "Create Account"
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <p className={styles.footer}>
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            className={styles.switchLink}
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
            }}
          >
            {isSignUp ? "Sign In" : "Sign Up"}
          </button>
        </p>
      </div>
    </div>
  );
}
