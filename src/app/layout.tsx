import type { Metadata, Viewport } from "next";
import { manrope, playfair } from "@/lib/fonts";
import { themeInitScript } from "@/lib/theme";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Leaf Star — Premium shirts and pants, wholesale",
    template: "%s · Leaf Star",
  },
  description: "Leaf Star manufactures premium shirts and pants in-house and supplies retailers in wholesale lots.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1C2B4A" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0B0D" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-theme is set before paint by the inline script; the server cannot know it in a static build.
    <html lang="en" data-theme="light" suppressHydrationWarning className={`${manrope.variable} ${playfair.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
