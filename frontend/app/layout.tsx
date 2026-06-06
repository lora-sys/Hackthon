import type { Metadata } from "next";
import { ConciergeFloat } from "../components/concierge/concierge-float";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "WishLive",
  description: "Agent Native Marketplace for live show creation"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
          <ConciergeFloat />
        </Providers>
      </body>
    </html>
  );
}
