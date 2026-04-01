import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { SocketProvider } from "@/components/providers/SocketProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Eshabiki | eFootball Account Marketplace",
  description:
    "Buy and sell eFootball gaming accounts securely with our escrow-protected marketplace.",
  keywords: "eFootball, gaming accounts, buy sell, marketplace, escrow",
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
        <SessionProvider>
          <SocketProvider>{children}</SocketProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
