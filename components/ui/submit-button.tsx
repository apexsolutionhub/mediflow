"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type LoadingButtonProps = React.ComponentProps<typeof Button> & {
  loading?: boolean;
  loadingLabel?: string;
};

function LoadingContent({
  loading,
  loadingLabel = "Submitting…",
  children,
}: {
  loading: boolean;
  loadingLabel?: string;
  children: React.ReactNode;
}) {
  if (!loading) return children;
  return (
    <>
      <Spinner className="size-4" />
      {loadingLabel}
    </>
  );
}

export function SubmitButton({
  loading = false,
  loadingLabel = "Submitting…",
  disabled,
  children,
  className,
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      type="submit"
      disabled={disabled || loading}
      className={cn(className)}
      {...props}
    >
      <LoadingContent loading={loading} loadingLabel={loadingLabel}>
        {children}
      </LoadingContent>
    </Button>
  );
}

export function LoadingButton({
  loading = false,
  loadingLabel = "Working…",
  disabled,
  children,
  className,
  type = "button",
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      type={type}
      disabled={disabled || loading}
      className={cn(className)}
      {...props}
    >
      <LoadingContent loading={loading} loadingLabel={loadingLabel}>
        {children}
      </LoadingContent>
    </Button>
  );
}
