import type { Metadata } from "next";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { GlobalPalette } from "./global-palette";
import "./globals.css";
import { MotionProvider } from "@/ui/motion/motion-provider";
import { ToastProvider } from "@/ui/toast";

export const metadata: Metadata = {
  title: "Origin MS",
  description: "Origin FGL HRMS/CRM — Approval Inbox",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <NuqsAdapter>
          <MotionProvider>
            <ToastProvider>
              {children}
              <GlobalPalette />
            </ToastProvider>
          </MotionProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
