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
import { ImagePlus, MessageCircle, Send, X } from "lucide-react";
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
import { isCloudinaryConfigured, uploadImageToCloudinary } from "@/lib/cloudinary";
import {
  fetchClinicFeedbackThread,
  fetchClinicFeedbackUnread,
  sendClinicFeedbackMessage,
  type ClinicFeedbackMessage,
} from "@/lib/feedback-api";
import { useBrowserOnline } from "@/lib/use-browser-online";
import { cn } from "@/lib/utils";

const FEEDBACK_IMAGE_ACCEPT =
  "image/png,image/jpeg,image/jpg,image/webp,image/jfif";
const FEEDBACK_MAX_IMAGES = 5;

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

function MessageBubble({ message }: { message: ClinicFeedbackMessage }) {
  const fromApex = message.sender_side === "apex";

  return (
    <div className={cn("flex", fromApex ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[85%] space-y-2 rounded-2xl px-3.5 py-2.5 text-sm leading-6 shadow-sm",
          fromApex
            ? "rounded-bl-md border border-border bg-muted/50 text-foreground"
            : "rounded-br-md bg-primary text-primary-foreground",
        )}
      >
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
            fromApex ? "text-muted-foreground" : "text-primary-foreground/70",
          )}
        >
          {fromApex ? "Apex" : "You"} · {formatMessageTime(message.created_at)}
        </p>
      </div>
    </div>
  );
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [pendingImageUrls, setPendingImageUrls] = useState<string[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [threadStatus, setThreadStatus] = useState("open");
  const [messages, setMessages] = useState<ClinicFeedbackMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickingFileRef = useRef(false);

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
  }, [messages.length, open, pendingImageUrls.length]);

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

  const canSend =
    Boolean(draft.trim() || pendingImageUrls.length) && !sending && !uploadingImage;
  const atImageLimit = pendingImageUrls.length >= FEEDBACK_MAX_IMAGES;

  const handleSend = async () => {
    const text = draft.trim();
    const images = pendingImageUrls.map((url) => url.trim()).filter(Boolean);
    if ((!text && images.length === 0) || sending || uploadingImage) return;

    setSending(true);
    try {
      if (images.length === 0) {
        await sendClinicFeedbackMessage(text);
      } else {
        for (let i = 0; i < images.length; i++) {
          await sendClinicFeedbackMessage(i === 0 ? text : "", images[i]);
        }
      }
      setDraft("");
      setPendingImageUrls([]);
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
    if (!next && (uploadingImage || pickingFileRef.current)) return;
    setOpen(next);
    if (!next) {
      setDraft("");
      setPendingImageUrls([]);
      void refreshUnread();
    }
  };

  const handlePickImage = () => {
    if (sending || uploadingImage || atImageLimit) return;
    pickingFileRef.current = true;
    const onWindowFocus = () => {
      window.setTimeout(() => {
        pickingFileRef.current = false;
      }, 0);
    };
    window.addEventListener("focus", onWindowFocus, { once: true });
    fileInputRef.current?.click();
  };

  const removePendingImage = (index: number) => {
    setPendingImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImageFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    pickingFileRef.current = false;
    if (files.length === 0) return;

    const slotsLeft = FEEDBACK_MAX_IMAGES - pendingImageUrls.length;
    if (slotsLeft <= 0) {
      toast.error(`You can attach up to ${FEEDBACK_MAX_IMAGES} images at a time.`);
      return;
    }

    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      toast.error("Please choose image files (PNG, JPEG, or WebP).");
      return;
    }
    if (imageFiles.length < files.length) {
      toast.error("Some files were skipped because they are not images.");
    }

    const toUpload = imageFiles.slice(0, slotsLeft);
    if (imageFiles.length > slotsLeft) {
      toast.info(
        `Only ${slotsLeft} more image${slotsLeft === 1 ? "" : "s"} added (max ${FEEDBACK_MAX_IMAGES}).`,
      );
    }

    setUploadingImage(true);
    const uploaded: string[] = [];
    try {
      for (let i = 0; i < toUpload.length; i++) {
        setUploadProgress(`Uploading ${i + 1}/${toUpload.length}…`);
        const url = await uploadImageToCloudinary(toUpload[i], {
          folder: "mediflow-feedback",
        });
        uploaded.push(url);
      }
      setPendingImageUrls((prev) =>
        [...prev, ...uploaded].slice(0, FEEDBACK_MAX_IMAGES),
      );
    } catch (error) {
      if (uploaded.length > 0) {
        setPendingImageUrls((prev) =>
          [...prev, ...uploaded].slice(0, FEEDBACK_MAX_IMAGES),
        );
      }
      toast.error(
        error instanceof Error ? error.message : "Image upload failed. Try again.",
      );
    } finally {
      setUploadingImage(false);
      setUploadProgress(null);
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
            Message the MediFlow Apex team. Attach up to {FEEDBACK_MAX_IMAGES} screenshots
            when helpful.
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

          {messagesWithDividers.map(({ message, showDivider, dateLabel }) => (
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
              <MessageBubble message={message} />
            </div>
          ))}
        </div>

        <div className="space-y-3 border-t border-border bg-background p-4">
          {pendingImageUrls.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {pendingImageUrls.map((url, index) => (
                <div key={`${url}-${index}`} className="relative inline-block">
                  <Image
                    src={url}
                    alt={`Attachment preview ${index + 1}`}
                    width={80}
                    height={80}
                    className="size-20 rounded-lg border object-cover"
                    unoptimized
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute -top-2 -right-2 size-6 rounded-full shadow-sm"
                    aria-label={`Remove image ${index + 1}`}
                    disabled={sending || uploadingImage}
                    onClick={() => removePendingImage(index)}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : null}

          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Write to Apex…"
            rows={3}
            maxLength={4000}
            disabled={sending || uploadingImage}
            className="min-h-10 resize-none"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
          />

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept={FEEDBACK_IMAGE_ACCEPT}
                multiple
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={(event) => void handleImageFileChange(event)}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8 shrink-0"
                disabled={sending || uploadingImage || atImageLimit}
                aria-label="Attach images"
                title={
                  !isCloudinaryConfigured()
                    ? "Image upload not configured"
                    : atImageLimit
                      ? `Maximum ${FEEDBACK_MAX_IMAGES} images`
                      : `Attach images (up to ${FEEDBACK_MAX_IMAGES})`
                }
                onClick={() => {
                  if (!isCloudinaryConfigured()) {
                    toast.error(
                      "Image upload is not configured. Add NEXT_PUBLIC_CLOUDINARY_PRESET_NAME and NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME.",
                    );
                    return;
                  }
                  handlePickImage();
                }}
              >
                {uploadingImage ? (
                  <Spinner className="size-4" />
                ) : (
                  <ImagePlus className="size-4" />
                )}
              </Button>
              <p className="hidden text-[11px] text-muted-foreground sm:block">
                {uploadProgress ??
                  (atImageLimit
                    ? `${FEEDBACK_MAX_IMAGES}/${FEEDBACK_MAX_IMAGES} images · Enter to send`
                    : `Up to ${FEEDBACK_MAX_IMAGES} images · Enter to send`)}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              className="shrink-0"
              disabled={!canSend}
              onClick={() => void handleSend()}
            >
              {sending ? (
                <Spinner className="size-4" />
              ) : (
                <>
                  <Send className="mr-1.5 size-4" />
                  Send
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
