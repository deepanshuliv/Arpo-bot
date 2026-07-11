import Link from "next/link";
import { useTranslations } from "next-intl";
import Brand from "./Brand";
import LanguageToggle from "./LanguageToggle";
import s from "./SiteHeader.module.css";

type SiteHeaderProps = {
  /** Text links, styled with `headerStyles.link` */
  children?: React.ReactNode;
  /** The main button (Sign in / Sign out), placed after the language toggle */
  action?: React.ReactNode;
};

