import type { ReactNode } from "react";
import type { Metadata } from "next";
import { DesktopFrame } from "@/components/DesktopFrame";
import { I18nProvider } from "@/lib/i18n/react";
import "./globals.css";
import "./ui-system.css";

export const metadata: Metadata = {
  title: "SETBUILDER — DJ Set Prep",
  description:
    "DJ set prep for rekordbox: load a stick or collection, shape the arc by slot and duration, check energy, key and BPM, export as rekordbox XML, PDF or M3U. / Set-Vorbereitung für rekordbox.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/logo.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="de"
      className="h-full antialiased"
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <DesktopFrame />
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
