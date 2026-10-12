import "./globals.css";
import { WalletProvider } from "../context/WalletContext";
import { AuthProvider } from "../context/AuthContext";
import { Toaster } from "react-hot-toast";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="cinematic-bg" />
        <AuthProvider>
          <WalletProvider>
            {children}
            <Toaster position="top-right" />
          </WalletProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
