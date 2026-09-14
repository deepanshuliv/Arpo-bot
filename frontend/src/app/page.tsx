"use client";

import Link from "next/link";
import s from "./landing.module.css";

export default function LandingPage() {
  return (
    <div className={s.page}>
      {}
      <div className={s.ambientGlow} />
      <div className={s.gridPattern} />

      {}
      <nav className={s.nav}>
        <div className={s.navInner}>
          <div className={s.navBrand}>
            <div className={s.navLogo}>
              <img src="/logo.png" alt="ARPO Logo" className={s.logoImage} />
            </div>
            <span className={s.navTitle}>ARPO</span>
          </div>

          <div className={s.navActions}>
            <Link href="/admin" className={s.navLink}>
              Admin
            </Link>
            <Link href="/auth" className={s.navBtnPrimary}>
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {}
      <section className={s.hero}>
        {}
        <div className={s.heroBadge}>
          <span className={s.heroBadgeDot} />
          <span className={s.heroBadgeText}>AI Scout Assistant</span>
        </div>

        {}
        <h1 className={s.heroTitle}>
          <span className={s.heroGradientText}>
            Master the Art of
            <br />
            Modern Scouting
          </span>
        </h1>

        {}
        <p className={s.heroDesc}>
          Your intelligent companion for the{" "}
          <strong>Bharat Scouts &amp; Guides</strong>. Instant access to
          verified protocols, badge requirements, and field guides.
        </p>

        {}
        <div className={s.heroButtons}>
          <Link href="/auth" className={s.heroBtnLaunch}>
            <span className={s.heroBtnIcon}>
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
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </span>
            Launch Assistant
          </Link>
          <Link href="/admin" className={s.heroBtnAdmin}>
            Admin Panel
          </Link>
        </div>

        {}
        <p className={s.heroTrust}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity: 0.5 }}
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Powered by RAG • Grounded in official BSG documents
        </p>
      </section>

      {}
      <section className={s.features}>
        <div className={s.featuresGrid}>
          {}
          <div className={s.featureCard}>
            <div className={s.featureIconOrange}>01</div>
            <h3 className={s.featureTitle}>Verified Knowledge</h3>
            <p className={s.featureDesc}>
              Direct access to official APRO rules and BSG guidelines. Every
              response is grounded in real documents — no hallucinations.
            </p>
          </div>

          {}
          <div className={s.featureCard}>
            <div className={s.featureIconWhite}>02</div>
            <h3 className={s.featureTitle}>Badge Tracker</h3>
            <p className={s.featureDesc}>
              Complete requirements for every proficiency badge from Pratham
              Sopan to Rajya Puraskar, organized step by step.
            </p>
          </div>

          {}
          <div className={s.featureCard}>
            <div className={s.featureIconGreen}>03</div>
            <h3 className={s.featureTitle}>Field Ready</h3>
            <p className={s.featureDesc}>
              Optimized for low-bandwidth environments. Access camping
              protocols, first-aid guides, and knot references anywhere.
            </p>
          </div>
        </div>
      </section>

      {}
      <footer className={s.footer}>
        <p className={s.footerText}>
          © 2024 ARPO Bot • Built for Bharat Scouts &amp; Guides
        </p>
      </footer>
    </div>
  );
}
