// PASTE THIS ENTIRE CODE BLOCK INTO: app/layout.tsx

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react"; //  <-- IMPORT ADDED
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BotScanner",
  description: "Analyze robots.txt files for AI blocking rules",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Analytics /> {/* <-- COMPONENT ADDED */}
      </body>
    </html>
  );
}