
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { i18n } from '@/lib/i18n';
import Image from 'next/image';

type HeaderProps = {
    language: 'en' | 'vi';
    onLanguageChange: (lang: 'en' | 'vi') => void;
}

export function Header({ language, onLanguageChange }: HeaderProps) {
    const T = i18n[language];

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center">
                <div className="mr-4 flex items-center">
                    <Link href="/" className="flex items-center gap-2">
                         <Image src="/icons/logo.png" alt="Freelance Flow Logo" width={24} height={24} className="h-6 w-6" />
                        <span className="font-bold">Freelance Flow</span>
                    </Link>
                </div>
                <nav className="flex items-center gap-4 text-sm lg:gap-6">
                    <Link href="/#features" className="text-muted-foreground transition-colors hover:text-foreground">
                        {T.headerFeatures}
                    </Link>
                    <Link href="/#faq" className="text-muted-foreground transition-colors hover:text-foreground">
                        {T.headerFAQ}
                    </Link>
                    <Link href="/about" className="text-muted-foreground transition-colors hover:text-foreground">
                        {T.headerAbout}
                    </Link>
                </nav>
                <div className="flex flex-1 items-center justify-end gap-2">
                     <div className="flex items-center gap-1 rounded-md border bg-secondary/50 p-1">
                        <Button 
                            variant={language === 'en' ? 'secondary' : 'ghost'} 
                            size="sm" 
                            className="h-7 px-2" 
                            onClick={() => onLanguageChange('en')}
                        >
                            EN
                        </Button>
                        <Button 
                            variant={language === 'vi' ? 'secondary' : 'ghost'} 
                            size="sm" 
                            className="h-7 px-2" 
                            onClick={() => onLanguageChange('vi')}
                        >
                            VI
                        </Button>
                    </div>
                    <Button asChild variant="outline">
                        <Link href="/dashboard">{T.goToDashboard}</Link>
                    </Button>
                </div>
            </div>
        </header>
    );
}
