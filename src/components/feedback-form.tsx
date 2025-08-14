"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { i18n } from "@/lib/i18n";
import { useForm, ValidationError } from "@formspree/react";

type Lang = "en" | "vi";

// Replace with your Formspree form ID
const FORMSPREE_FORM_ID = "xvgryyzp";

export function FeedbackForm({ language = "en", className }: { language?: Lang; className?: string }) {
  const T = i18n[language] as any;
  const [state, handleSubmit] = useForm(FORMSPREE_FORM_ID);

  if (state.succeeded) {
    return (
      <div className={className}>
        <div className="p-3 rounded border bg-muted/40 text-sm">
          {T.contactSuccessDesc || "Thanks for your feedback. We'll get back to you if necessary."}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name">{T.contactName || "Your Name (Optional)"}</Label>
          <Input id="name" name="name" placeholder={T.contactName || "Your Name (Optional)"} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">{T.contactEmail || "Your Email (Optional)"}</Label>
          <Input id="email" type="email" name="email" placeholder={T.contactEmail || "Your Email (Optional)"} />
          <ValidationError prefix="Email" field="email" errors={state.errors} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="message">{T.contactMessage || "Your Message"}</Label>
          <Textarea id="message" name="message" placeholder={T.contactMessage || "Your Message"} />
          <ValidationError prefix="Message" field="message" errors={state.errors} />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={state.submitting}>
            {state.submitting ? (T.contactSending || "Sending...") : (T.contactSend || "Send Message")}
          </Button>
        </div>
      </div>
    </form>
  );
}
