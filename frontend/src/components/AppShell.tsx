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

