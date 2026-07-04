import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { serverFetch } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getMyChannel } from "@/lib/my-channel";

const roboto = Roboto({
  variable: "--font-roboto",
  weight: ["400", "500", "700"],
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
    <html lang="en" className={`${roboto.variable} h-full antialiased`}>
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
