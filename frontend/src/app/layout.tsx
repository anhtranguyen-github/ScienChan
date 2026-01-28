import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LangGraph Chatbot",
  description: "AI Agent with Reasoning Capabilities",
};

import { ErrorProvider } from "@/context/error-context";
import { SearchProvider } from "@/context/search-context";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${outfit.variable} antialiased`}
      >
        <ErrorProvider>
          <SearchProvider>
            {children}
          </SearchProvider>
        </ErrorProvider>
      </body>
    </html>
  );
}
