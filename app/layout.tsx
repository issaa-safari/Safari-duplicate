import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Readex_Pro, IBM_Plex_Sans, IBM_Plex_Sans_Arabic, Cairo, Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import PwaRegister from "@/components/pwa-register";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const readexPro = Readex_Pro({
  subsets: ["latin", "arabic"],
  variable: "--font-display",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"],
  display: "swap",
});

const ibmPlexSansAr = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-body-ar",
  weight: ["400", "500", "600"],
  display: "swap",
});

// Arabic/RTL type: one family for headings + body across the public site and
// client output. Applied via the [dir="rtl"] variable swap in globals.css.
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-arabic",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Admin-only fonts, consumed by the .admin-theme scope in globals.css
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-admin-sans",
  display: "swap",
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-admin-display",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://safariadventureriders.com"),
  title: {
    default: "Safari Adventure Riders — Expert East Africa Safaris",
    template: "%s | Safari Adventure Riders",
  },
  description:
    "Book expert-led safaris in Kenya, Tanzania & East Africa. Custom itineraries, luxury lodges, and 15+ years of experience guiding unforgettable wildlife adventures.",
  keywords: [
    "East Africa safari",
    "Kenya safari",
    "Tanzania safari",
    "luxury safari tours",
    "wildlife tours",
    "Masai Mara",
    "Serengeti",
    "Great Migration",
  ],
  openGraph: {
    type: "website",
    siteName: "Safari Adventure Riders",
    title: "Safari Adventure Riders — Expert East Africa Safaris",
    description:
      "Expert-led safaris in Kenya, Tanzania & East Africa. Custom itineraries, luxury lodges, and 15+ years of experience.",
    url: "https://safariadventureriders.com",
    locale: "en",
  },
  twitter: {
    card: "summary_large_image",
    title: "Safari Adventure Riders — Expert East Africa Safaris",
    description:
      "Expert-led safaris in Kenya, Tanzania & East Africa. Custom itineraries, luxury lodges, and 15+ years of experience.",
  },
  applicationName: "Safari Adventure Riders",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Safari Riders",
  },
  // Icons come from the app/ file conventions (favicon.ico, icon.png,
  // apple-icon.png) and the social image from app/opengraph-image.png —
  // all generated from public/logo-safari-riders.png.
};

export const viewport: Viewport = {
  themeColor: "#7A9A4A",
  // Extend under the notch / home indicator so `env(safe-area-inset-*)` returns
  // real values; the sticky bottom nav and floating CTAs pad against them.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${readexPro.variable} ${ibmPlexSans.variable} ${ibmPlexSansAr.variable} ${cairo.variable} ${inter.variable} ${playfairDisplay.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" style={{ fontFamily: "var(--font-body, 'IBM Plex Sans', sans-serif)" }}>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
