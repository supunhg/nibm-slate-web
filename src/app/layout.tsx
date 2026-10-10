import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { ThemeProvider } from "@/context/ThemeContext";
import { PWAProvider } from "@/context/PWAContext";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#080b12" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "SLATE | NIBM Instructor Roster & Task Allocation",
  description:
    "SLATE (Scheduling & Leave Allocation Tracking Engine) -- enterprise academic duty management and live roster system for NIBM instructors.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SLATE",
  },
  formatDetection: {
    telephone: false,
  },
};

const themeInitScript = `
  (function() {
    try {
      var stored = localStorage.getItem('slate_theme') || 'system';
      var isDark = stored === 'dark' || (stored === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.style.colorScheme = 'dark';
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link rel="apple-touch-icon" href="/apple-icon" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512.png" />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 dark:bg-[#080b12] dark:text-slate-100 transition-colors duration-200">
        <ThemeProvider>
          <PWAProvider>
            {children}
            <PWAInstallBanner />
          </PWAProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
