import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";

import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { SessionProvider } from "@/components/providers/SessionProvider";
import {
  ThemeProvider,
  themeBootScript,
} from "@/components/providers/ThemeProvider";
import { InteractiveBackground } from "@/components/global/InteractiveBackground";
import { Cursor } from "@/components/global/Cursor";
import { ToastProvider } from "@/components/toast/ToastProvider";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["700", "900"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PawMatch — Find the Perfect Match for Your Pet",
  description:
    "Responsible pet breeding matchmaking. Connect with verified owners and breeders to find compatible, healthy matches for your dog or cat.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${inter.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        {/* Inline theme boot — runs synchronously before paint to prevent
            a flash of the wrong theme. */}
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-cream text-dark antialiased">
        <ThemeProvider>
          {/* Global ambient layer — every route gets the canvas + cursor */}
          <InteractiveBackground />
          <Cursor />

          <ToastProvider>
            <SessionProvider>
              <QueryProvider>{children}</QueryProvider>
            </SessionProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
