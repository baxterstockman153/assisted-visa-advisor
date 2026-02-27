import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "O-1 Visa Evidence Advisor",
  description: "Map your evidence to USCIS O-1 visa criteria (POC — not legal advice)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
