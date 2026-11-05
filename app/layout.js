import { Geist, Instrument_Serif, Noto_Sans_Bengali } from "next/font/google";
import { PendingProvider } from "@/components/pending-provider";
import { SiteHeader } from "@/components/site-header";
import { BRAND } from "@/lib/config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
});

// Many ad names are written in Bangla.
const notoBengali = Noto_Sans_Bengali({
  variable: "--font-bengali",
  subsets: ["bengali"],
  preload: false,
});

export const metadata = {
  title: `${BRAND.name} · Meta Ads`,
  description: `Live Meta Ads performance for ${BRAND.name}.`,
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${instrumentSerif.variable} ${notoBengali.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PendingProvider>
          <SiteHeader />
          <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-24 pt-8 sm:px-8">
            {children}
          </main>
        </PendingProvider>
      </body>
    </html>
  );
}
