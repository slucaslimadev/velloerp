import type { Metadata } from "next";
import { Montserrat, Outfit, Work_Sans } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "VELLO | Sistema",
  description: "Painel de gestão de leads e clientes — Vello Inteligência Artificial",
  icons: { icon: "/logo.png", apple: "/logo.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${montserrat.variable} ${outfit.variable} ${workSans.variable} dark h-full`}
      style={
        {
          "--ff-brand": "var(--font-montserrat), 'Montserrat', sans-serif",
          "--ff-head": "var(--font-outfit), 'Outfit', sans-serif",
          "--ff-body": "var(--font-work-sans), 'Work Sans', sans-serif",
        } as React.CSSProperties
      }
    >
      <body className="min-h-full antialiased bg-[#16171C] text-white" suppressHydrationWarning>
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
