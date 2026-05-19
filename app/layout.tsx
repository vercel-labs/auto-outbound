import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, Settings } from 'lucide-react';
import { QueryClientProvider } from '@/components/query-client-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import './globals.css';

export const metadata: Metadata = {
  title: 'Email Agent',
  description: 'AI-powered email generation with research context',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryClientProvider>
            <div className="flex min-h-screen">
              <nav className="w-56 border-r bg-card p-4 flex flex-col gap-1">
                <div className="flex items-center justify-between mb-4 px-2">
                  <Link href="/campaigns" className="text-lg font-semibold">
                    Email Agent
                  </Link>
                  <ThemeToggle />
                </div>
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
              <main className="flex-1 p-6"><div className="mx-auto max-w-5xl">{children}</div></main>
            </div>
          </QueryClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
