
"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Switch } from "@/components/ui/switch"
import { Label } from "./ui/label"
import { i18n } from "@/lib/i18n"
import type { AppSettings } from "@/lib/types"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [language, setLanguage] = React.useState<'en' | 'vi'>('en');

  React.useEffect(() => {
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

  const T = i18n[language];

  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="space-y-0.5">
            <Label className="text-sm">{theme === 'dark' ? T.themeDark : T.themeLight}</Label>
            <p className="text-xs text-muted-foreground">{T.themeDesc}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Sun className="h-5 w-5" />
          <Switch
            checked={theme === "dark"}
            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            aria-label="Toggle theme"
          />
          <Moon className="h-5 w-5" />
        </div>
    </div>
  )
}
