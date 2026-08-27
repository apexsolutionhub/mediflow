import type { Metadata } from "next";
import { Geist_Mono, Outfit, Work_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const heading = Outfit({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["400", "500", "600", "700"],
});

const sans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MediFlow",
  description:
    "MediFlow is a platform for managing clinic visits, payments, and care teams.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "h-full antialiased font-sans",
        heading.variable,
        sans.variable,
        geistMono.variable,
      )}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
