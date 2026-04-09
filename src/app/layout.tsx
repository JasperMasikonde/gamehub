import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { SocketProvider } from "@/components/providers/SocketProvider";
import NextTopLoader from "nextjs-toploader";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: new URL("https://eshabiki.com"),
  title: {
    default: "Eshabiki — eFootball Account Marketplace Kenya",
    template: "%s | Eshabiki",
  },
  description:
    "Kenya's #1 platform to buy and sell eFootball accounts safely. Escrow-protected payments, wager-based match challenges, and tournaments. Powered by M-Pesa.",
  keywords: [
    "eFootball accounts Kenya",
    "buy eFootball account",
    "sell eFootball account",
    "eFootball marketplace",
    "eFootball challenges",
    "eFootball tournaments Kenya",
    "gaming accounts Kenya",
    "eshabiki",
  ],
  authors: [{ name: "Eshabiki" }],
  creator: "Eshabiki",
  openGraph: {
    type: "website",
    locale: "en_KE",
    url: "https://eshabiki.com",
    siteName: "Eshabiki",
    title: "Eshabiki — eFootball Account Marketplace Kenya",
    description:
      "Buy and sell eFootball accounts safely in Kenya. Escrow payments, match challenges, and tournaments.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Eshabiki — eFootball Account Marketplace Kenya",
    description:
      "Buy and sell eFootball accounts safely in Kenya. Escrow payments, match challenges, and tournaments.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/logo-icon.svg",
    shortcut: "/logo-icon.svg",
    apple: "/logo-icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-bg-primary text-text-primary antialiased">
        <NextTopLoader
          color="#00ff87"
          height={3}
          showSpinner={false}
          easing="ease"
          speed={200}
        />
        <SessionProvider>
          <SocketProvider>{children}</SocketProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
