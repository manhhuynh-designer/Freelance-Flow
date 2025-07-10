
"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "./ui/button";
import { Bot } from "lucide-react";
import ChatPage from "@/app/dashboard/chat/page";
import { useState } from "react";

export function QuickChat() {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="default"
          size="icon"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        >
          <Bot className="h-7 w-7" />
          <span className="sr-only">Open AI Chat</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        className="w-[440px] h-[600px] p-0 flex flex-col rounded-xl overflow-hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex-1 flex flex-col min-h-0 bg-background">
          <ChatPage isQuickChat={true} />
        </div>
      </PopoverContent>
    </Popover>
  );
}
