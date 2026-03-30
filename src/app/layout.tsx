import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FixYourSound",
  description: "Master the art of sound, empowered by AI",
  icons: {
    icon: "/pictures/logo.png", // Path to your custom icon
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <Header />
          <main className="pt-32">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
