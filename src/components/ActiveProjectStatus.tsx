import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, CircleDashed } from "lucide-react";

type ProjectState = "green" | "watch" | "blocked";

const stateMap: Record<ProjectState, { label: string; tone: string; Icon: typeof CheckCircle2 }> = {
  green: {
    label: "ON TRACK",
    tone: "text-emerald-300 border-emerald-400/40 bg-emerald-950/30",
    Icon: CheckCircle2,
  },
  watch: {
    label: "WATCH",
    tone: "text-amber-300 border-amber-400/40 bg-amber-950/20",
    Icon: CircleDashed,
  },
  blocked: {
    label: "BLOCKED",
    tone: "text-rose-300 border-rose-400/40 bg-rose-950/20",
    Icon: AlertTriangle,
  },
};

const updates = {
  green: "Draft and deployment checkpoints are aligned for tonight's push.",
  watch: "APIs are stable, but image optimization throughput needs tuning.",
  blocked: "Waiting on dependency migration validation before publishing.",
};

export default function ActiveProjectStatus() {
  const [state, setState] = useState<ProjectState>("watch");
  const descriptor = useMemo(() => stateMap[state], [state]);
  const Icon = descriptor.Icon;

  return (
    <div data-theme="dark" className="blueprint-border rounded-md border border-cyan-400/35 bg-black/45 p-3">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-tech text-xs uppercase tracking-[0.18em] text-cyan-300/80">Active Project</p>
        <span
          className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-semibold tracking-[0.14em] ${descriptor.tone}`}
        >
          <Icon size={12} />
          {descriptor.label}
        </span>
      </div>

      <p className="text-sm text-slate-200/90">{updates[state]}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setState("green")}
          className="rounded border border-cyan-400/30 px-2 py-1 text-xs text-cyan-100 transition hover:bg-cyan-500/10"
        >
          Green
        </button>
        <button
          type="button"
          onClick={() => setState("watch")}
          className="rounded border border-cyan-400/30 px-2 py-1 text-xs text-cyan-100 transition hover:bg-cyan-500/10"
        >
          Watch
        </button>
        <button
          type="button"
          onClick={() => setState("blocked")}
          className="rounded border border-cyan-400/30 px-2 py-1 text-xs text-cyan-100 transition hover:bg-cyan-500/10"
        >
          Blocked
        </button>
      </div>
    </div>
  );
}
