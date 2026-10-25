import { COLORS } from "../lib/format";

export type Factor = { label: string; value: string | number; effect: number };

/** Diverging bars: how much each input moved the estimate relative to averaging that input over all values. */
export function FactorBars({ factors, unit, accent, digits = 1, scale = 1 }: { factors: Factor[]; unit: string; accent: string; digits?: number; scale?: number }) {
  const max = Math.max(...factors.map((f) => Math.abs(f.effect * scale)), 1e-9);
  return (
    <ul className="space-y-3">
      {factors.map((f) => {
        const v = f.effect * scale;
        const up = v >= 0;
        return (
          <li key={f.label} className="text-[13px]">
            <div className="flex justify-between mb-1">
              <span>{f.label} <span className="text-sage">· {String(f.value)}</span></span>
              <span className="num" style={{ color: up ? accent : COLORS.sage }}>{up ? "+" : "−"}{Math.abs(v).toFixed(digits)}{unit}</span>
            </div>
            <div className="relative h-1.5 bg-ink">
              <div className="absolute top-0 bottom-0 left-1/2 w-px bg-line" />
              <div className="absolute top-0 bottom-0" style={{ background: up ? accent : COLORS.sage, width: `${(Math.abs(v) / max) * 50}%`, [up ? "left" : "right"]: "50%" } as any} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export const HOURS = Array.from({ length: 24 }, (_, i) => String(i));
export const hourLabel = (h: number) => `${String(h).padStart(2, "0")}:00`;
