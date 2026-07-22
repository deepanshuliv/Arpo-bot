"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Books, ChatCircleText, UsersThree } from "@phosphor-icons/react";
import { useSession } from "@/lib/session";
import { shellStyles } from "./AppShell";

/** Sidebar navigation for the admin area; Team is shown to the main admin only. */
export default function AdminNav() {
  const t = useTranslations("header");
  const pathname = usePathname();
  const session = useSession();

  const items = [
    { href: "/chat", label: t("chat"), Icon: ChatCircleText },
    { href: "/admin", label: t("knowledgeBase"), Icon: Books },
    ...(session?.role === "admin"
      ? [{ href: "/admin/team", label: t("team"), Icon: UsersThree }]
      : []),
  ];

  return (
    <ul className={shellStyles.navList}>
      {items.map(({ href, label, Icon }) => (
        <li key={href}>
          <Link
            href={href}
            className={shellStyles.navItem}
            aria-current={pathname === href ? "page" : undefined}
            data-close-drawer
          >
            <Icon size={18} aria-hidden="true" />
            {label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
