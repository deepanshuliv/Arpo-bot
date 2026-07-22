"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Books, ChatCircleText, UsersThree } from "@phosphor-icons/react";
import { useSession } from "@/lib/session";
import { shellStyles } from "./AppShell";

