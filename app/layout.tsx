import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, Settings } from 'lucide-react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Auto Outbound',
  description: 'AI-powered outbound email generation with research context',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background antialiased">
        <div className="flex min-h-screen">
          <nav className="w-56 border-r bg-card p-4 flex flex-col gap-1">
            <Link
              href="/campaigns"
              className="text-lg font-semibold mb-4 px-2"
            >
              Auto Outbound
            </Link>
            <Link
              href="/campaigns"
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
            >
              <Mail className="h-4 w-4" />
              Campaigns
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </nav>
          <main className="flex-1 p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
