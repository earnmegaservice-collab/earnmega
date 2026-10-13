import "./globals.css";
import { WalletProvider } from "../context/WalletContext";
import { AuthProvider } from "../context/AuthContext";
import { Toaster } from "react-hot-toast";
import { Metadata, Viewport } from "next";
import { SmartInstallBanner } from "../components/SmartInstallBanner";

export const metadata: Metadata = {
  title: "EarnMega",
  description: "EarnMega",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "EarnMega",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Script
          id="register-sw"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js')
                  .then(reg => console.log('Service Worker registered', reg))
                  .catch(err => console.error('Service Worker registration failed', err));
              }
            `,
          }}
        />
        <div className="cinematic-bg" />
        <AuthProvider>
          <WalletProvider>
            {children}
            <Toaster position="top-right" />
            <SmartInstallBanner />
          </WalletProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
