"use client";

import { Combobox } from "@/components/ui/combobox";

export type SalesAgentOption = {
  id: number;
  displayName: string;
  phone?: string | null;
  city?: string | null;
};

const NONE = "none";

export function SalesAgentSelector({
  value,
  onChange,
  agents,
  loading,
  disabled,
}: {
  value: number | null;
  onChange: (next: number | null) => void;
  agents: SalesAgentOption[];
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <Combobox
      value={value != null ? String(value) : NONE}
      onValueChange={(next) => {
        if (next === NONE) onChange(null);
        else onChange(Number(next));
      }}
      disabled={disabled || Boolean(loading)}
      placeholder={loading ? "Loading sales agents…" : "No sales agent"}
      searchPlaceholder="Search sales agents…"
      className="h-11"
      options={[
        { value: NONE, label: "No sales agent" },
        ...agents.map((agent) => ({
          value: String(agent.id),
          label: `${agent.displayName}${agent.city ? ` · ${agent.city}` : ""}`,
        })),
      ]}
    />
  );
}
