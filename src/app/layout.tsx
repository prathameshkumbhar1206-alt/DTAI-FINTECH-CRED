import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { FamilyProvider } from "@/components/FamilyContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CRED Legacy - Household OS",
  description: "AI-powered household financial operating system",
};

// The app is dark throughout. Declaring it here makes native UI — scrollbars,
// the category dropdown, overscroll — render dark too, instead of flashing
// white against the interface.
export const viewport: Viewport = {
  themeColor: "#09090b",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-[#09090b] text-zinc-100`}
      >
        <FamilyProvider>
          {children}
        </FamilyProvider>
      </body>
    </html>
  );
}
