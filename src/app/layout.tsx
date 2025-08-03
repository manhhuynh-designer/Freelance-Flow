
"use client";

import './globals.css';
import { Inter } from 'next/font/google';
import { Toaster } from "@/components/ui/toaster";
import "@/styles/tiptap-content.css";
import { ThemeProvider } from '@/components/theme-provider';
import type { AppSettings } from '@/lib/types';
import { useEffect, useState } from 'react';

const inter = Inter({ subsets: ['latin'], variable: '--font-body' });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    const storedSettings = localStorage.getItem('freelance-flow-settings');
    if (storedSettings) {
        try {
            const parsedSettings: AppSettings = JSON.parse(storedSettings);
            if (parsedSettings.language) {
                setLanguage(parsedSettings.language);
            }
        } catch(e) {
            console.error("Failed to parse settings from localStorage", e);
        }
    }
  }, []);
  
  return (
    <html lang={language} suppressHydrationWarning>
      <head>
          <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192x192.png" />
          <title>Freelance Flow</title>
          <meta name="description" content="The ultimate dashboard to manage your freelance tasks, clients, and quotes with ease." />
          <link rel="icon" href="/icons/fav-icon.png" type="image/png" />
          <link rel="manifest" href="/manifest.json" />
          <meta name="theme-color" content="#FFFFFF" media="(prefers-color-scheme: light)" />
          <meta name="theme-color" content="#111827" media="(prefers-color-scheme: dark)" />
      </head>
      <body className={`${inter.variable} font-body antialiased`} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
