import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tarpaulin",
  description: "Project sign-off tracking for requirements, evidence, and reviews.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
