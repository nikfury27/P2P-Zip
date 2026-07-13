import type { RtcState } from "../types";

const STATE_CONFIG: Record<
  RtcState,
  { label: string; container: string; dot: string }
> = {
  idle: {
    label: "Idle",
    container: "bg-surface-container-highest/50 border border-white/10 text-on-surface-variant",
    dot: "bg-on-surface-variant",
  },
  waiting: {
    label: "Waiting",
    container: "bg-amber-500/10 border border-amber-500/25 text-amber-500",
    dot: "bg-amber-500 animate-pulse",
  },
  connecting: {
    label: "Connecting",
    container: "bg-primary/10 border border-primary/25 text-primary",
    dot: "bg-primary animate-pulse",
  },
  connected: {
    label: "Connected",
    container: "bg-emerald-500/10 border border-emerald-500/25 text-emerald-400",
    dot: "bg-emerald-400",
  },
  failed: {
    label: "Failed",
    container: "bg-error/10 border border-error/25 text-error",
    dot: "bg-error",
  },
  disconnected: {
    label: "Disconnected",
    container: "bg-error/10 border border-error/25 text-error",
    dot: "bg-error",
  },
  completed: {
    label: "Completed",
    container: "bg-emerald-500/10 border border-emerald-500/25 text-emerald-400",
    dot: "bg-emerald-400",
  },
};

export function StatusBadge({ state }: { state: RtcState }) {
  const cfg = STATE_CONFIG[state];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono-label text-[11px] uppercase tracking-wider ${cfg.container}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
