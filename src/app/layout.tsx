import type {Metadata} from 'next';
import { Toaster } from 'sonner';
import AuthSessionProvider from '@/components/auth/session-provider';
import { DebugConsole } from '@/components/debug-console';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sylla Vacations',
  description: 'Manage team vacations and time off seamlessly.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased bg-background">
        <AuthSessionProvider>
          {children}
          <Toaster position="top-center" />
          <DebugConsole />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
