import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { mukta } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "ARPO — a field guide that answers back",
  description:
    "Ask about badges, camp safety, rules and field craft. ARPO answers from the Bharat Scouts & Guides manuals your team trusts.",
  openGraph: {
    title: "ARPO — a field guide that answers back",
    description:
      "Answers for Bharat Scouts & Guides, drawn from the manuals your team trusts.",
  },
};

export const viewport: Viewport = {
  themeColor: "#2b1d16",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const t = await getTranslations("common");

  return (
    <html lang={locale} className={mukta.variable}>
      <body>
        <NextIntlClientProvider>
          <a href="#main" className="skip-link">
            {t("skipToContent")}
          </a>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
