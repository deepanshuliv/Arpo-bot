"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminSignIn } from "@/lib/api";
import styles from "./adminAuth.module.css";

export default function AdminAuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await adminSignIn(email, password);

      if (res.success && res.data?.token) {
        localStorage.setItem("arpo_token", res.data.token);
        localStorage.setItem("arpo_role", "admin");
        if (res.data.name) {
          localStorage.setItem("arpo_name", res.data.name);
        }
        router.push("/admin");
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
        <div className={styles.adminBadge}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Admin Only
        </div>

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
          <p className={styles.logoSub}>Admin Panel</p>
        </div>

        {}
        <div className={styles.infoBar}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>
            This is a restricted area. Only authorized administrators can sign
            in.
          </span>
        </div>

        {}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Admin Email</label>
            <input
              type="email"
              placeholder="admin@arpo.com"
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

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? (
              <span className={styles.spinner} />
            ) : (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Sign In as Admin
              </>
            )}
          </button>
        </form>

        {}
        <p className={styles.footer}>
          Not an admin?{" "}
          <button
            className={styles.switchLink}
            onClick={() => router.push("/auth")}
          >
            Go to User Sign In
          </button>
        </p>
      </div>
    </div>
  );
}
