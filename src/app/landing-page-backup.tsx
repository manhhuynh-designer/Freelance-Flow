
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { browserLocal } from '@/lib/browser';
import type { AppSettings } from '@/lib/types';
import { i18n } from '@/lib/i18n';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Header } from '@/components/header';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export default function HomePage() {
  const [language, setLanguage] = useState<'en' | 'vi'>('en');
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    try {
      const storedSettings = browserLocal.getItem('freelance-flow-settings');
      if (storedSettings) {
          const parsedSettings: AppSettings = JSON.parse(storedSettings);
          if (parsedSettings.language) setLanguage(parsedSettings.language);
      }
    } catch(e) { console.error("Failed to parse settings from localStorage", e); }
  }, []);
  
  const T = i18n[language];

  if (loading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  const faqItems = [
    { id: "item-1", q: T.faq1Question, a: T.faq1Answer },
    { id: "item-2", q: T.faq2Question, a: T.faq2Answer },
    { id: "item-3", q: T.faq3Question, a: T.faq3Answer },
    { id: "item-4", q: T.faq4Question, a: T.faq4Answer },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
  <Header language={language} onLanguageChange={setLanguage} />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-20 md:py-32 lg:py-40 bg-secondary/40">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 xl:gap-16">
              <div className="flex flex-col justify-center space-y-4">
                <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none font-headline">
                  {T.heroTitle}
                </h1>
                <p className="max-w-[600px] text-muted-foreground md:text-xl">
                  {T.heroDesc}
                </p>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                   <Button asChild size="lg">
                    <Link href="/auth">
                      {T.heroCTA}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                </div>
              </div>
              <Image
                src="https://placehold.co/600x400.png"
                alt="Dashboard Screenshot"
                width={600}
                height={400}
                className="mx-auto aspect-video overflow-hidden rounded-xl object-cover"
                data-ai-hint="dashboard project management"
                priority
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">{T.featuresTitle}</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  {T.featuresDesc}
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-12 py-12 lg:grid-cols-3">
              <div className="grid gap-1">
                <h3 className="text-lg font-bold">{T.feature1Title}</h3>
                <p className="text-sm text-muted-foreground">{T.feature1Desc}</p>
              </div>
              <div className="grid gap-1">
                <h3 className="text-lg font-bold">{T.feature2Title}</h3>
                <p className="text-sm text-muted-foreground">{T.feature2Desc}</p>
              </div>
              <div className="grid gap-1">
                <h3 className="text-lg font-bold">{T.feature3Title}</h3>
                <p className="text-sm text-muted-foreground">{T.feature3Desc}</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="w-full py-12 md:py-24 lg:py-32 bg-secondary/40">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">{T.faqTitle}</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  {T.faqDesc}
                </p>
              </div>
            </div>
            <div className="mx-auto max-w-3xl py-12">
              <Accordion type="single" collapsible className="w-full">
                {faqItems.map((item) => (
                    <AccordionItem value={item.id} key={item.id}>
                        <AccordionTrigger>{item.q}</AccordionTrigger>
                        <AccordionContent>{item.a}</AccordionContent>
                    </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
            <div className="space-y-3">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight font-headline">{T.ctaTitle}</h2>
              <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                {T.ctaDesc}
              </p>
            </div>
            <div className="mx-auto w-full max-w-sm space-y-2">
              <Button asChild size="lg" className="w-full">
                <Link href="/auth">{T.ctaButton}</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Freelance Flow. {T.footerRights}</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link href="/about" className="text-xs hover:underline underline-offset-4">
            {T.headerAbout}
          </Link>
        </nav>
      </footer>
    </div>
  );
}
