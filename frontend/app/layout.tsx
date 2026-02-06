import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CredGate",
  description: "Behaviour-driven credit protocol",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--color-bg)] text-white antialiased">
        {children}
      </body>
    </html>
  );
}