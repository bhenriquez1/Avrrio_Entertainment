import type { Metadata } from "next";
import { AuthProvider } from "@/lib/firebase/AuthProvider";
import { AuthGate } from "@/components/auth/AuthGate";
import { StudioHeader } from "@/components/studio/StudioHeader";
import { DevModeBanner } from "@/components/layout/DevModeBanner";
import { GuestModeBanner } from "@/components/layout/GuestModeBanner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Avrrio Entertainment",
  description: "AI-powered serialized animation production studio.",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        <AuthProvider>
          <DevModeBanner />
          <GuestModeBanner />
          <AuthGate>
            <StudioHeader />
            {children}
          </AuthGate>
        </AuthProvider>
      </body>
    </html>
  );
}
