import type { Metadata } from "next";
import "@fontsource/lexend/500.css";
import "@fontsource/lexend/600.css";
import "@fontsource/lexend/700.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/jetbrains-mono/400.css";
import "./globals.css";
import Providers from "./providers";
import Sidebar from "@/components/Sidebar";


export const metadata: Metadata = {
  title: "DocDuty",
  description: "AI-powered compliance and document automation for Nigerian businesses.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script src="https://accounts.google.com/gsi/client" async defer></script>
      </head>
      <body className="min-h-full">
        <Providers>
          <div className="flex">
            <Sidebar />
            <div className="flex-1 min-w-0">{children}</div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
