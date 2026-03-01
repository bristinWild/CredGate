import "./globals.css";
import type { Metadata } from "next";
import Providers from "@/app/providers";

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
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}