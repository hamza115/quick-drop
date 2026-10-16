import type { Metadata, Viewport } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import { Suspense } from "react";
import { NavigationProgress } from "@/components/app/navigation-progress";
import { SPLASH_SEEN_KEY, SplashScreen } from "@/components/app/splash-screen";
import "./globals.css";

// The design's typeface. To switch, import Work_Sans or Open_Sans instead; the variable name stays.
const sans = Schibsted_Grotesk({
  variable: "--font-app",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "QuickDrop",
    template: "%s · QuickDrop",
  },
  description: "Your personal space for files between devices",
  applicationName: "QuickDrop",
  // Added to a phone's home screen, it opens full-screen like an app.
  appleWebApp: { capable: true, title: "QuickDrop", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9f9f9" },
    { media: "(prefers-color-scheme: dark)", color: "#101111" },
  ],
  // Lets the layout use the full screen on notched phones; safe-area padding keeps content clear.
  viewportFit: "cover",
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} h-full antialiased`}>
      <head>
        {/* Runs before the first paint: marks repeat visits in this tab so the mobile splash is skipped. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(sessionStorage.getItem("${SPLASH_SEEN_KEY}"))document.documentElement.dataset.splash="seen"}catch(e){}`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col">
        <SplashScreen />
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
