import "@cyntler/react-doc-viewer/dist/index.css";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "react-doc-viewer + Next.js App Router",
  description: "Minimal example consuming the published package",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
