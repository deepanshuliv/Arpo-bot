"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { LOCALE_COOKIE, type Locale } from "@/i18n/config";
import s from "./LanguageToggle.module.css";

