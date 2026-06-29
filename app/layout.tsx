import type { Metadata } from "next";
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
