import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/firebase/AuthProvider";
import { AuthGate } from "@/components/auth/AuthGate";
import { AppHeader } from "@/components/layout/AppHeader";
import { DevModeBanner } from "@/components/layout/DevModeBanner";
import { GuestModeBanner } from "@/components/layout/GuestModeBanner";
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
  title: "Purpose Pen",
  description: "Application management platform for dental, medical, and graduate applicants.",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
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
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <DevModeBanner />
          <GuestModeBanner />
          <AuthGate>
            <AppHeader />
            {children}
          </AuthGate>
        </AuthProvider>
      </body>
    </html>
  );
}
