import "./globals.css";
import { WalletProvider } from "../context/WalletContext";
import { CallProvider } from "../context/CallContext";
import { AuthProvider } from "../context/AuthContext";
import { NotificationProvider } from "../context/NotificationContext";
import { Toaster } from "react-hot-toast";
import { Metadata, Viewport } from "next";
import { SmartInstallBanner } from "../components/SmartInstallBanner";
import { PwaInstallPrompt } from "../components/PwaInstallPrompt";
import { ServiceWorkerRegister } from "../components/ServiceWorkerRegister";

export const metadata: Metadata = {
  openGraph: {
    title: "HorPal — Make Friends, Go Live & Earn | horpal.com",
    description: "HorPal",
    url: "https://horpal.com",
    siteName: "HorPal"
  },
  twitter: {
    title: "HorPal — Make Friends, Go Live & Earn | horpal.com",
    description: "HorPal"
  },
  title: "HorPal — Make Friends, Go Live & Earn | horpal.com",
  description: "HorPal",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HorPal — Make Friends, Go Live & Earn | horpal.com",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="cinematic-bg" />
        <AuthProvider>
          <NotificationProvider>
            <WalletProvider>
              <CallProvider>
              {children}
              <Toaster position="top-right" />
              <SmartInstallBanner />
              <PwaInstallPrompt />
              <ServiceWorkerRegister />
            </CallProvider>
            </WalletProvider>
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
