import type { Metadata, Viewport } from "next";
import { Geist_Mono, IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { InstallPrompt } from "@/components/InstallPrompt";

const ACCENT = "#15803d";

export const viewport: Viewport = {
  themeColor: ACCENT,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-arabic",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PhytoScan",
  description:
    "صوّر نبتة لتحديد نوعها وتقييم صحّتها والحصول على إرشادات العناية المناسبة — رفيق صحة نباتاتك.",
  manifest: "/manifest.webmanifest",
  applicationName: "PhytoScan",
  appleWebApp: {
    capable: true,
    title: "PhytoScan",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${plexArabic.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          {children}
          <InstallPrompt />
        </ThemeProvider>
      </body>
    </html>
  );
}
