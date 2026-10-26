import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";
import { LanguageProvider } from "../components/language-provider";

export const metadata: Metadata = {
  title: "WishLive",
  description: "Agent Native Marketplace for live show creation"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider><Providers>{children}</Providers></LanguageProvider>
      </body>
    </html>
  );
}
