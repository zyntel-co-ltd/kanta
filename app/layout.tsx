import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DM_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { OfflineSyncProvider } from "@/components/OfflineSyncProvider";
import SwrProvider from "@/components/providers/SwrProvider";
import { SyncQueueProvider } from "@/lib/SyncQueueContext";
import { PostHogProvider } from "@/components/PostHogProvider";
import { AuthProvider } from "@/lib/AuthContext";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const APP_NAME = "Kanta";
const APP_DESCRIPTION =
  "QR-first medical equipment tracking and operational intelligence for East African hospitals. Offline-capable PWA.";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: "Kanta — Hospital Asset Intelligence",
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: "Kanta — Hospital Asset Intelligence",
    description: APP_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#065f46",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body className={dmSans.className}>
        <PostHogProvider>
          <AuthProvider>
            <SyncQueueProvider>
              <SwrProvider>
                <OfflineSyncProvider>{children}</OfflineSyncProvider>
              </SwrProvider>
            </SyncQueueProvider>
          </AuthProvider>
          <Analytics />
        </PostHogProvider>
      </body>
    </html>
  );
}
