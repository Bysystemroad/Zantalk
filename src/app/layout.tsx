import type { Metadata, Viewport } from "next";
import "@/app/globals.css";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: "Zantalk",
  description: "Voice-to-task AI assistant for clean, structured reminders.",
  applicationName: "Zantalk",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Zantalk",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#05070c",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
