import {
  APEX_WHATSAPP_SUPPORT,
  SETUP_APPROVAL_WAIT_MINUTES,
} from "@/lib/signup-payment";

export function SignupApprovalNotice() {
  return (
    <div className="rounded-xl border border-primary/15 bg-slate-50/80 p-4 text-left text-sm leading-relaxed text-muted-foreground">
      <p className="font-medium text-foreground">After you submit</p>
      <p className="mt-1 text-pretty">
        Wait about {SETUP_APPROVAL_WAIT_MINUTES} minutes for Apex to approve your setup fee.
        Sign-in stays disabled until then. You can return to this page anytime to check status.
      </p>
      <p className="mt-2 text-pretty">
        Support on WhatsApp:{" "}
        {APEX_WHATSAPP_SUPPORT.map((line, index) => (
          <span key={line.waMe}>
            {index > 0 ? " or " : null}
            <a
              href={`https://wa.me/${line.waMe}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {line.e164}
            </a>
          </span>
        ))}
        .
      </p>
    </div>
  );
}
