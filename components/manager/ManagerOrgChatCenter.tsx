"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { Building2, ImagePlus, MessagesSquare, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
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
import { isCloudinaryConfigured, uploadImageToCloudinary } from "@/lib/cloudinary";
import {
  fetchOrgChatPeers,
  fetchOrgChatThread,
  fetchOrgChatUnread,
  sendOrgChatMessage,
  type OrgChatMessage,
  type OrgChatPeer,
} from "@/lib/org-chat-api";
import { useBrowserOnline } from "@/lib/use-browser-online";
import { cn } from "@/lib/utils";

const IMAGE_ACCEPT = "image/png,image/jpeg,image/jpg,image/webp,image/jfif";
const UNREAD_POLL_MS = 45_000;
const THREAD_POLL_MS = 20_000;

function formatMessageTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function MessageBubble({ message }: { message: OrgChatMessage }) {
  return (
    <div className={cn("flex", message.mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] space-y-2 rounded-2xl px-3.5 py-2.5 text-sm leading-6 shadow-sm",
          message.mine
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md border border-border bg-muted/50 text-foreground",
        )}
      >
        {!message.mine ? (
          <p className="text-[10px] font-medium text-muted-foreground">
            {message.sender_username || message.sender_tin}
          </p>
        ) : null}
        {message.image_url ? (
          <a
            href={message.image_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block overflow-hidden rounded-lg"
          >
            <Image
              src={message.image_url}
              alt="Chat attachment"
              width={280}
              height={200}
              className="max-h-48 w-auto object-contain"
              unoptimized
            />
          </a>
        ) : null}
        {message.body ? <p className="whitespace-pre-wrap">{message.body}</p> : null}
        <p
          className={cn(
            "text-[10px]",
            message.mine ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          {formatMessageTime(message.created_at)}
        </p>
      </div>
    </div>
  );
}

export function ManagerOrgChatCenter({ onNavigate }: { onNavigate?: () => void }) {
  const online = useBrowserOnline();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [peers, setPeers] = useState<OrgChatPeer[]>([]);
  const [peerTin, setPeerTin] = useState("");
  const [messages, setMessages] = useState<OrgChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const peerTinRef = useRef(peerTin);
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    peerTinRef.current = peerTin;
  }, [peerTin]);

  const selectedPeer = useMemo(
    () => peers.find((p) => p.clinic_tin === peerTin) || null,
    [peers, peerTin],
  );

  const refreshUnread = useCallback(async () => {
    try {
      setUnread(await fetchOrgChatUnread());
    } catch {
      setUnread(0);
    }
  }, []);

  const loadPeers = useCallback(async () => {
    try {
      const data = await fetchOrgChatPeers();
      setPeers(data.peers);
      setPeerTin((current) => {
        if (current && data.peers.some((p) => p.clinic_tin === current)) return current;
        return data.peers[0]?.clinic_tin || "";
      });
    } catch {
      setPeers([]);
    }
  }, []);

  const loadThread = useCallback(async (tin: string, opts?: { silent?: boolean }) => {
    if (!tin) {
      setMessages([]);
      return;
    }
    if (!opts?.silent) setLoading(true);
    try {
      const data = await fetchOrgChatThread(tin);
      if (peerTinRef.current !== tin) return;
      setMessages(data.messages);
      if (!opts?.silent) void refreshUnread();
    } catch {
      if (!opts?.silent) {
        setMessages([]);
        toast.error("Could not load chat");
      }
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [refreshUnread]);

  useEffect(() => {
    void refreshUnread();
    const id = window.setInterval(() => void refreshUnread(), UNREAD_POLL_MS);
    return () => window.clearInterval(id);
  }, [refreshUnread]);

  useEffect(() => {
    if (!open) return;
    void loadPeers();
  }, [open, loadPeers]);

  useEffect(() => {
    if (!open || !peerTin) return;
    void loadThread(peerTin);
    const id = window.setInterval(() => void loadThread(peerTin, { silent: true }), THREAD_POLL_MS);
    return () => window.clearInterval(id);
  }, [open, peerTin, loadThread]);

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async (imageUrl = "") => {
    if (!peerTin || (!body.trim() && !imageUrl)) return;
    setBusy(true);
    stickToBottomRef.current = true;
    try {
      const message = await sendOrgChatMessage(peerTin, body.trim(), imageUrl);
      setMessages((prev) => [...prev, message]);
      setBody("");
      void refreshUnread();
      void loadPeers();
    } catch {
      toast.error("Could not send message");
    } finally {
      setBusy(false);
    }
  };

  const onPickImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!isCloudinaryConfigured()) {
      toast.error("Image upload is not configured");
      return;
    }
    setBusy(true);
    try {
      const url = await uploadImageToCloudinary(file, { folder: "mediflow-org-chat" });
      await send(url);
    } catch {
      toast.error("Could not upload image");
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) onNavigate?.();
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="relative"
              aria-label="Branch manager chat"
            >
              <MessagesSquare className="size-4" />
              {unread > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-cta px-1 text-[10px] font-semibold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              ) : null}
            </Button>
          </SheetTrigger>
        </TooltipTrigger>
        <TooltipContent>Chat with other branch managers</TooltipContent>
      </Tooltip>

      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border/70 px-4 py-4 text-left">
          <SheetTitle>Branch managers</SheetTitle>
          <SheetDescription>
            Message other managers in your organization. Billing stays per branch.
          </SheetDescription>
        </SheetHeader>

        <div className="border-b border-border/60 bg-muted/20 px-4 py-3">
          <p className="mb-1.5 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            Conversation
          </p>
          {peers.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/70 bg-background/60 px-3 py-3 text-xs text-muted-foreground">
              No other branch managers yet.
            </p>
          ) : (
            <Combobox
              value={peerTin || undefined}
              onValueChange={setPeerTin}
              placeholder="Select a branch manager"
              searchPlaceholder="Search branches…"
              className="h-12 rounded-xl border-border/70 bg-background/90"
              options={peers.map((peer) => ({
                value: peer.clinic_tin,
                label: peer.branch_name || peer.username,
                keywords: peer.username,
                content: (
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-(--role) to-(--role-2) text-white shadow-md shadow-(--role)/25">
                      <Building2 className="size-3.5" />
                    </span>
                    <span className="min-w-0 text-left">
                      <span className="block truncate font-medium text-foreground">{peer.branch_name || peer.username}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        @{peer.username}
                        {peer.unread_count > 0 ? ` · ${peer.unread_count} new` : ""}
                      </span>
                    </span>
                  </span>
                ),
              }))}
            />
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div
            className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4"
            onScroll={(event) => {
              const el = event.currentTarget;
              stickToBottomRef.current =
                el.scrollHeight - el.scrollTop - el.clientHeight < 80;
            }}
          >
            {loading && messages.length === 0 ? (
              <div className="flex justify-center py-10">
                <Spinner />
              </div>
            ) : !selectedPeer ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Select a branch manager to start chatting.
              </p>
            ) : messages.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No messages yet with {selectedPeer.branch_name}.
              </p>
            ) : (
              messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-border/70 p-3">
            <div className="flex items-end gap-2">
              <input
                ref={fileRef}
                type="file"
                accept={IMAGE_ACCEPT}
                className="hidden"
                onChange={(e) => void onPickImage(e)}
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="shrink-0"
                disabled={busy || !online || !peerTin}
                onClick={() => fileRef.current?.click()}
              >
                <ImagePlus className="size-4" />
              </Button>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={
                  selectedPeer
                    ? `Message ${selectedPeer.branch_name}…`
                    : "Select a peer first"
                }
                className="min-h-[44px] max-h-28 resize-none"
                disabled={busy || !peerTin}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              <Button
                type="button"
                size="icon"
                className="shrink-0"
                disabled={busy || !online || !peerTin || !body.trim()}
                onClick={() => void send()}
              >
                {busy ? <Spinner /> : <Send className="size-4" />}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
