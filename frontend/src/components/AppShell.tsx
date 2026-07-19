"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { SidebarSimple, SignOut } from "@phosphor-icons/react";
import { clearSession } from "@/lib/api";
import Brand from "./Brand";
import LanguageToggle from "./LanguageToggle";
import s from "./AppShell.module.css";

type AppShellProps = {
  /** Page-specific sidebar sections (history, nav, usage…) */
  sidebar: React.ReactNode;
  /** Shown in the top bar */
  title: string;
  userName?: string;
  /** Where to go after signing out */
  signOutTo: string;
  children: React.ReactNode;
  /** Extra props for the main element (drag & drop, paste) */
  mainProps?: React.HTMLAttributes<HTMLElement>;
};

/**
 * Base camp app shell shared by chat and admin: a walnut sidebar that becomes a
 * drawer on small screens, and a top bar with the page title and language toggle.
 */
export default function AppShell({
  sidebar,
  title,
  userName,
  signOutTo,
  children,
  mainProps,
}: AppShellProps) {
  const t = useTranslations("header");
  const tc = useTranslations("common");
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Desktop only: hide the sidebar so the page runs full width
  const [collapsed, setCollapsed] = useState(false);

  const isSmallScreen = () => window.matchMedia("(max-width: 860px)").matches;

  const hideSidebar = () => (isSmallScreen() ? setDrawerOpen(false) : setCollapsed(true));
  const showSidebar = () => {
    setCollapsed(false);
    if (isSmallScreen()) setDrawerOpen(true);
  };

  const signOut = () => {
    clearSession();
    router.replace(signOutTo);
  };

  return (
    <div className={s.shell} data-collapsed={collapsed || undefined}>
      <aside
        className={s.sidebar}
        data-open={drawerOpen || undefined}
        aria-hidden={collapsed || undefined}
        inert={collapsed || undefined}
      >
        <div className={s.contours} aria-hidden="true" />

        <div className={s.sideTop}>
          <Link href="/" className={s.home} aria-label={tc("homeLabel")}>
            <Brand compact tone="light" />
          </Link>
          <button
            type="button"
            className={s.sideToggle}
            aria-label={t("collapseSidebar")}
            title={t("collapseSidebar")}
            onClick={hideSidebar}
          >
            <SidebarSimple size={20} />
          </button>
        </div>

        {/* Items marked data-close-drawer close the mobile drawer when chosen */}
        <div
          className={s.sideBody}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("[data-close-drawer]")) {
              setDrawerOpen(false);
            }
          }}
        >
          {sidebar}
        </div>

        <div className={s.sideFoot}>
          {userName && (
            <span className={s.user}>
              <span className={s.avatar} aria-hidden="true">
                {userName.trim().charAt(0).toUpperCase()}
              </span>
              <span className={s.userName}>{userName}</span>
            </span>
          )}
          <button type="button" className={s.signOut} onClick={signOut}>
            <SignOut size={16} aria-hidden="true" />
            {t("signOut")}
          </button>
        </div>
      </aside>

      {drawerOpen && (
        <div className={s.scrim} aria-hidden="true" onClick={() => setDrawerOpen(false)} />
      )}

      <main id="main" className={s.main} {...mainProps}>
        <header className={s.topBar}>
          <button
            type="button"
            className={s.menuBtn}
            aria-label={t("expandSidebar")}
            title={t("expandSidebar")}
            onClick={showSidebar}
          >
            <SidebarSimple size={20} />
          </button>
          <h1 className={s.title}>{title}</h1>
          <LanguageToggle />
        </header>
        {children}
      </main>
    </div>
  );
}

export { s as shellStyles };
