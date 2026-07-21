import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/components/tg/auth-provider";
import { LicenseProvider } from "@/lib/license-context";
import { SubscriptionProvider } from "@/lib/subscription-context";

export const metadata: Metadata = {
  title: "Apna Cricket — Fantasy Team Generator",
  description:
    "Apna Cricket is India's best fantasy cricket team generator. Create Grand League winning teams for Dream11, My11Circle with AI-powered Rank 1 team generation.",
  manifest: "/manifest.json",
  applicationName: "Apna Cricket",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Apna Cricket",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#050816",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          <LicenseProvider>
            <SubscriptionProvider>{children}</SubscriptionProvider>
          </LicenseProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
