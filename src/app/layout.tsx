import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HIOBuy Package Tracking Demo",
  description: "Track an international HIOBuy shipment and review its latest logistics events.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
