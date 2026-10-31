import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Arabic } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-noto-arabic",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: {
    default: "AlHusainia Business Services | Integrated Business Solutions",
    template: "%s | AlHusainia",
  },
  description:
    "Comprehensive ERP platform for sales, inventory, accounting, HR, and procurement management. Trusted since 2018.",
  keywords: [
    "ERP",
    "business management",
    "sales",
    "inventory",
    "accounting",
    "HR",
    "procurement",
    "Saudi Arabia",
  ],
  authors: [{ name: "AlHusainia Business Services" }],
  creator: "AlHusainia Business Services",
  publisher: "AlHusainia Business Services",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://alhusseiniya.com"),
  openGraph: {
    type: "website",
    locale: "ar_SA",
    url: "https://alhusseiniya.com",
    siteName: "AlHusainia Business Services",
    title: "AlHusainia Business Services | Integrated Business Solutions",
    description:
      "Comprehensive ERP platform for sales, inventory, accounting, HR, and procurement management.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "AlHusainia Business Services",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AlHusainia Business Services",
    description: "Integrated Business Solutions — Since 2018",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${inter.variable} ${notoSansArabic.variable}`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
      </head>
      <body className="font-sans antialiased bg-neutral-50 text-neutral-900">
        {children}
      </body>
    </html>
  );
}
