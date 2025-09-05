import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "漫画レビューサイト",
  description: "注目のマンガやレビューを紹介",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#fafafa" }}
      >
        <Header />
        <main style={{ flex: 1, maxWidth: "1200px", margin: "0 auto", padding: "1.5rem 1rem" }}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}