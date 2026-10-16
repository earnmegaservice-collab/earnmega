import "./globals.css";
import { WalletProvider } from "../context/WalletContext";
import { AuthProvider } from "../context/AuthContext";
import { Toaster } from "react-hot-toast";
import { Metadata, Viewport } from "next";
import { SmartInstallBanner } from "../components/SmartInstallBanner";
import { PwaInstallPrompt } from "../components/PwaInstallPrompt";

export const metadata: Metadata = {
  title: "EarnMega",
  description: "EarnMega",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "EarnMega",
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
          <WalletProvider>
            {children}
            <Toaster position="top-right" />
            <SmartInstallBanner />
            <PwaInstallPrompt />
          </WalletProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
