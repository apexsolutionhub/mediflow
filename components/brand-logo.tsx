import Image from "next/image";

import { cn } from "@/lib/utils";

/** Full MediFlow lockup (mark + wordmark + tagline). Use on light backgrounds. */
export function LogoLockup({
  className,
  width = 240,
  priority = false,
}: {
  className?: string;
  width?: number;
  priority?: boolean;
}) {
  return (
    <Image
      src="/assets/mediflow-logo.png"
      alt="MediFlow — Clinic Management System"
      width={800}
      height={255}
      priority={priority}
      sizes={`${width}px`}
      style={{ width, height: "auto" }}
      className={cn("select-none", className)}
    />
  );
}

/**
 * The MediFlow cross-and-pulse mark. Its navy half disappears on dark surfaces,
 * so `plate` sets it on a white rounded tile (use that on the sidebar / dark panels).
 */
export function LogoMark({
  size = 40,
  plate = false,
  className,
}: {
  size?: number;
  plate?: boolean;
  className?: string;
}) {
  const image = (
    <Image
      src="/assets/mediflow-mark.png"
      alt="MediFlow"
      width={384}
      height={384}
      sizes={`${size}px`}
      style={{ width: plate ? size * 0.74 : size, height: plate ? size * 0.74 : size }}
      className="select-none"
    />
  );
  if (!plate) return <span className={cn("inline-flex shrink-0", className)}>{image}</span>;
  return (
    <span
      style={{ width: size, height: size }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[28%] bg-white shadow-lg shadow-black/20 ring-1 ring-white/60",
        className,
      )}
    >
      {image}
    </span>
  );
}
