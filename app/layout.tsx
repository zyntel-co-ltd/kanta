import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kanta — Operational Intelligence",
  description:
    "Medical equipment tracking and operational intelligence for East African hospitals.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
