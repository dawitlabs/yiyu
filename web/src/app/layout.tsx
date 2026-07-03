import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";
import { serverFetch } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getMyChannel } from "@/lib/my-channel";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "yiyu",
  description: "A video platform.",
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
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Nav
          user={user}
          channel={channel}
          unreadNotifications={unreadNotifications}
        />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
