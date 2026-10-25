import { AlertTriangle, Database, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { ReactNode } from "react";
import { COLORS } from "../lib/format";

export function Panel({ children, className = "", flat = false }: { children: ReactNode; className?: string; flat?: boolean }) {
  return <section className={`${flat ? "panel-flat" : "panel"} ${className}`}>{children}</section>;
}

export function SectionTitle({ label, title, aside }: { label: string; title?: string; aside?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 px-5 pt-4 pb-3 border-b border-line/70">
      <div>
        <div className="eyebrow">{label}</div>
        {title && <h3 className="text-[17px] font-bold mt-0.5 leading-tight">{title}</h3>}
      </div>
      {aside}
    </div>
  );
}

/** Marks whether a visual contains real dataset values, model output, or illustrative content. */
export function DataTag({ kind = "real" }: { kind?: "real" | "model" | "illustrative" }) {
  const map = {
    real: { t: "Real data", c: COLORS.lime },
    model: { t: "Model output", c: COLORS.sky },
    illustrative: { t: "Illustrative", c: COLORS.gold },
  }[kind];
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider" style={{ color: map.c }}>
      <Database size={11} /> {map.t}
    </span>
  );
}

export function Loading({ label = "Loading…", className = "" }: { label?: string; className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-2.5 text-sage text-sm py-16 ${className}`}>
      <Loader2 size={16} className="animate-spin text-lime" /> {label}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="border border-danger/60 bg-danger/10 text-ivory px-4 py-3 text-sm flex items-start gap-3" role="alert">
      <AlertTriangle size={16} className="text-danger mt-0.5 shrink-0" />
      <div className="flex-1">{message}</div>
      {onRetry && (
        <button onClick={onRetry} className="text-sage hover:text-ivory inline-flex items-center gap-1 text-xs">
          <RefreshCw size={12} /> Retry
        </button>
      )}
    </div>
  );
}

export function Unavailable({ title, command }: { title: string; command: string }) {
  return (
    <Panel className="p-6">
      <div className="eyebrow text-gold">Model unavailable</div>
      <h3 className="text-lg font-bold mt-1">{title} has not been trained yet</h3>
      <p className="text-sage text-sm mt-2">Prediction controls stay disabled until the trained artifact exists. Run:</p>
      <pre className="mt-3 bg-ink px-3 py-2 font-mono text-xs text-lime overflow-x-auto">{command}</pre>
    </Panel>
  );
}

export function Callout({ tone = "gold", title, children }: { tone?: "gold" | "coral" | "sky" | "lime"; title?: string; children: ReactNode }) {
  const c = COLORS[tone];
  return (
    <div className="px-4 py-3 text-[13px] leading-relaxed" style={{ borderLeft: `3px solid ${c}`, background: `${c}14` }}>
      {title && (
        <div className="font-semibold mb-0.5 flex items-center gap-1.5" style={{ color: c }}>
          <Sparkles size={13} /> {title}
        </div>
      )}
      <div className="text-ivory/90">{children}</div>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="eyebrow block mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-sage/80 mt-1">{hint}</span>}
    </label>
  );
}

export function Select({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) {
  return (
    <select className="field" value={value} onChange={(e) => onChange(e.target.value)}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

export function Metric({ label, value, sub, color = COLORS.ivory, big = false }: { label: string; value: ReactNode; sub?: ReactNode; color?: string; big?: boolean }) {
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div className={`num font-bold leading-none mt-1.5 ${big ? "text-4xl" : "text-2xl"}`} style={{ color }}>{value}</div>
      {sub && <div className="text-xs text-sage mt-1.5">{sub}</div>}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const color = status === "Trained and evaluated" ? COLORS.lime : status === "Trained but not evaluated" ? COLORS.gold : status === "Unavailable" ? COLORS.danger : COLORS.sage;
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider px-2 py-1 border" style={{ color, borderColor: `${color}66` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} /> {status}
    </span>
  );
}

export const chartTooltip = {
  contentStyle: { background: "#0B211C", border: "1px solid #34564B", borderRadius: 0, fontSize: 12, color: "#F5F2E9" },
  labelStyle: { color: "#A8BDB3", fontFamily: "JetBrains Mono, monospace", fontSize: 11 },
  itemStyle: { color: "#F5F2E9" },
  cursor: { fill: "rgba(199,244,100,0.06)" },
};
export const axisProps = { stroke: "#A8BDB3", tick: { fill: "#A8BDB3", fontSize: 11 }, tickLine: false, axisLine: { stroke: "#34564B" } };
