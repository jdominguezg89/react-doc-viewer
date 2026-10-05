import "@jdominguezg89/react-doc-viewer/dist/index.css";
import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "./Nav";

export const metadata: Metadata = {
  title: "react-doc-viewer in Next.js App Router",
  description:
    "A small App Router project that views PDFs, images, tables, text and HTML with react-doc-viewer.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <h1 className="topbar__name">react-doc-viewer</h1>
          <p className="topbar__note">Next.js App Router example</p>
          <Nav />
        </header>
        {children}
      </body>
    </html>
  );
}
