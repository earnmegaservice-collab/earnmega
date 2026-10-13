import "./globals.css";
import { WalletProvider } from "../context/WalletContext";
import { AuthProvider } from "../context/AuthContext";
import { Toaster } from "react-hot-toast";
import { Metadata, Viewport } from "next";
import { SmartInstallBanner } from "../components/SmartInstallBanner";
import PremiumGiftOverlay from "../components/chat/PremiumGiftOverlay";

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="cinematic-bg" />
        <AuthProvider>
          <WalletProvider>
            {children}
            <Toaster position="top-right" />
            <SmartInstallBanner />
            <PremiumGiftOverlay />
          </WalletProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
