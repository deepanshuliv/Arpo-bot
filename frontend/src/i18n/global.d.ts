import type en from "../../messages/en.json";
import type { locales } from "./config";

// Type-check every t("...") key against the English messages
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof locales)[number];
    Messages: typeof en;
  }
}
