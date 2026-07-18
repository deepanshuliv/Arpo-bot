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

