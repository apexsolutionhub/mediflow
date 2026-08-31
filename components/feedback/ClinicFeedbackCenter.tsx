"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  fetchClinicFeedbackThread,
  fetchClinicFeedbackUnread,
  sendClinicFeedbackMessage,
  type ClinicFeedbackMessage,
} from "@/lib/feedback-api";
import { useBrowserOnline } from "@/lib/use-browser-online";
import { cn } from "@/lib/utils";

function formatDateLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatMessageTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function ClinicFeedbackCenter({
  clinicName,
  className,
  onNavigate,
}: {
  clinicName?: string;
  className?: string;
  onNavigate?: () => void;
}) {
  const cloudOnline = useBrowserOnline();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [threadStatus, setThreadStatus] = useState("open");
  const [messages, setMessages] = useState<ClinicFeedbackMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const refreshUnread = useCallback(async () => {
    try {
      const count = await fetchClinicFeedbackUnread();
      setUnreadCount(count);
    } catch {
      /* ignore polling errors */
    }
  }, []);

  const loadThread = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchClinicFeedbackThread();
      setThreadStatus(data.thread.status);
      setMessages(data.messages);
      setUnreadCount(data.unread_count);
    } catch {
      toast.error("Could not load chat messages");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!cloudOnline) {
      setUnreadCount(0);
      return;
    }
    void refreshUnread();
    const id = window.setInterval(() => {
      if (!open) void refreshUnread();
    }, 30000);
    return () => window.clearInterval(id);
  }, [cloudOnline, open, refreshUnread]);

  useEffect(() => {
    if (!open) return;
    onNavigate?.();
    void loadThread();
    const id = window.setInterval(() => void loadThread(), 15000);
    return () => window.clearInterval(id);
  }, [loadThread, onNavigate, open]);

  useEffect(() => {
    if (!open || !scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, open]);

  const messagesWithDividers = useMemo(() => {
    if (!messages.length) return [];
    let lastDate = "";
    return messages.map((message) => {
      const dateLabel = formatDateLabel(message.created_at);
      const showDivider = dateLabel !== lastDate;
      lastDate = dateLabel;
      return { message, showDivider, dateLabel };
    });
  }, [messages]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await sendClinicFeedbackMessage(text);
      setDraft("");
      await loadThread();
      await refreshUnread();
    } catch {
      toast.error("Could not send message");
    } finally {
      setSending(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (next && !cloudOnline) {
      toast.error("Apex chat requires an internet connection to the cloud");
      return;
    }
    setOpen(next);
    if (!next) {
      setDraft("");
      void refreshUnread();
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={!cloudOnline}
              className={cn(
                "relative size-9 shrink-0 cursor-pointer border-white/15 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white",
                !cloudOnline && "cursor-not-allowed opacity-45 hover:bg-white/5",
                className,
              )}
              aria-label={
                !cloudOnline
                  ? "Apex chat unavailable offline"
                  : unreadCount > 0
                    ? `Chat with Apex (${unreadCount} unread)`
                    : "Chat with Apex"
              }
            >
              <MessageCircle className="size-4" />
              {cloudOnline && unreadCount > 0 ? (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-cta px-1 text-[10px] font-bold text-apex-navy">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
            </Button>
          </SheetTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {cloudOnline
            ? "Chat with Apex support"
            : "Apex chat requires internet (cloud only)"}
        </TooltipContent>
      </Tooltip>

      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-5 py-4 text-left">
          <SheetTitle className="flex items-center gap-2">
            <MessageCircle className="size-4 text-primary" />
            Clinic chat
          </SheetTitle>
          <SheetDescription>
            {clinicName ? `${clinicName} · ` : ""}
            Message the MediFlow Apex team
            {threadStatus === "closed" ? " (thread reopened when you reply)" : ""}
          </SheetDescription>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {loading && messages.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Spinner className="size-5" />
            </div>
          ) : null}

          {!loading && messages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
              No messages yet. Send a note to Apex about billing, setup, or anything else.
            </div>
          ) : null}

          {messagesWithDividers.map(({ message, showDivider, dateLabel }) => {
            const fromApex = message.sender_side === "apex";
            return (
              <div key={message.id}>
                {showDivider ? (
                  <div className="my-3 flex items-center gap-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                      {dateLabel}
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                ) : null}
                <div className={cn("flex", fromApex ? "justify-start" : "justify-end")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 shadow-sm",
                      fromApex
                        ? "rounded-bl-md border border-border bg-muted/50 text-foreground"
                        : "rounded-br-md bg-primary text-primary-foreground",
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.body}</p>
                    <p
                      className={cn(
                        "mt-1 text-[10px]",
                        fromApex ? "text-muted-foreground" : "text-primary-foreground/70",
                      )}
                    >
                      {fromApex ? "Apex" : "You"} · {formatMessageTime(message.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-border bg-background p-4">
          <div className="flex items-end gap-2">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Write to Apex…"
              rows={2}
              className="min-h-10 resize-none"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSend();
                }
              }}
            />
            <Button
              type="button"
              size="icon"
              className="shrink-0"
              disabled={!draft.trim() || sending}
              onClick={() => void handleSend()}
              aria-label="Send message"
            >
              {sending ? <Spinner className="size-4" /> : <Send className="size-4" />}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
