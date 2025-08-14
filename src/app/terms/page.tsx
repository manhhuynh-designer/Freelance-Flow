"use client";

import React from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { i18n } from "@/lib/i18n";
import { useEffect, useState } from "react";
import type { AppSettings } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeedbackForm } from "@/components/feedback-form";

export default function TermsPage() {
  const [language, setLanguage] = useState<"en" | "vi">("en");

  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem("freelance-flow-settings");
      if (storedSettings) {
        const parsed: AppSettings = JSON.parse(storedSettings);
        if (parsed.language) setLanguage(parsed.language);
      }
    } catch {}
  }, []);

  const T = i18n[language] as any;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header language={language} onLanguageChange={setLanguage} />
      <main className="container flex-1 px-4 md:px-6 py-10">
        <div className="max-w-3xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold font-headline">{T.termsTitle || "Terms of Service"}</h1>
            <p className="text-muted-foreground mt-2">{T.termsUpdated || "Last updated"}: {new Date().toISOString().split("T")[0]}</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{T.termsOverview || "Overview"}</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert">
              <p>{T.termsIntro || "By using Freelance Flow, you agree to these terms. This app is provided as-is, stores data locally in your browser, and only sends data to AI providers when you explicitly use AI features with your own API key."}</p>
              <h3>{T.termsPrivacy || "Privacy"}</h3>
              <p>{T.termsPrivacyDesc || "Your task data stays in your browser's storage. Backups you export are your responsibility to store safely. We do not host or collect your data."}</p>
              <h3>{T.termsAi || "AI Features"}</h3>
              <p>{T.termsAiDesc || "AI features require your API key. Requests are sent to the provider you configured (e.g., Google AI) only when you use those features."}</p>
              <h3>{T.termsWarranty || "No Warranty"}</h3>
              <p>{T.termsWarrantyDesc || "The software is provided 'as is' without warranties of any kind. Use at your own risk."}</p>
              <h3>{T.termsLiability || "Limitation of Liability"}</h3>
              <p>{T.termsLiabilityDesc || "In no event shall the authors be liable for any claim, damages, or other liability arising from the use of the software."}</p>
              <h3>{T.termsChanges || "Changes to Terms"}</h3>
              <p>{T.termsChangesDesc || "We may update these terms from time to time. Continued use of the app after changes constitutes acceptance."}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{T.contactTitle || "Get in Touch"}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{T.contactDesc || "Have feedback or a feature request? We'd love to hear from you."}</p>
              <FeedbackForm language={language} />
            </CardContent>
          </Card>

          <div className="text-sm text-muted-foreground">
            <Link className="hover:underline" href="/">{T.backToHome || "Back to Home"}</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
