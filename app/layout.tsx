import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KD Website — Khowar Dataset",
  description: "Preserving Khowar. Building knowledge.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}