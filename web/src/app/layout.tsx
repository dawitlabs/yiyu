import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { serverFetch } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getMyChannel } from "@/lib/my-channel";

const archivo = Archivo({
  variable: "--font-archivo",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#141414",
};

export const metadata: Metadata = {
  title: { default: "yiyu", template: "%s" },
  description: "A video platform for African creators.",
  openGraph: {
    siteName: "yiyu",
    type: "website",
  },
  twitter: {
    card: "summary",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  const channel = user ? await getMyChannel() : null;

  let unreadNotifications = 0;
  if (user) {
    const res = await serverFetch("/notifications/unread-count");
    if (res.ok) {
      const data: { count: number } = await res.json();
      unreadNotifications = data.count;
    }
  }

  return (
    <html lang="en" className={`${archivo.variable} dark h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <AppShell
          user={user}
          channel={channel}
          unreadNotifications={unreadNotifications}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
