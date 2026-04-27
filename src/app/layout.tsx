import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeInitializer } from "@/components/layout/theme-initializer";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { AuthInitializer } from "@/components/auth/auth-initializer";
import "./globals.css";

const inter = localFont({
  src: "./fonts/inter-variable.woff2",
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = localFont({
  src: "./fonts/jetbrains-mono-variable.woff2",
  variable: "--font-mono",
  display: "swap",
});

const instrumentSerif = localFont({
  src: "./fonts/instrument-serif-italic.woff2",
  variable: "--font-logo",
  style: "italic",
  display: "swap",
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "GreatClaw",
  description: "AI-first knowledge base and startup OS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans">
        <Script id="greatclaw-desktop-class" strategy="beforeInteractive">
          {`if(window.GreatClawDesktop)document.documentElement.classList.add("electron-desktop")`}
        </Script>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <LocaleProvider>
            <ThemeInitializer />
            <AuthInitializer />
            {children}
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
