import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Callout, ErrorBox, Loading, Metric, Panel, SectionTitle } from "../components/ui";
import { useApi } from "../lib/api";
import { COLORS, int } from "../lib/format";

const MODEL_NAMES: Record<string, string> = { cancellation: "Cancellation", fare: "Fare", segmentation: "Segmentation", forecast: "Forecast", anomaly: "Anomaly" };

export default function DatasetPage() {
  const { data: d, error, loading, reload } = useApi("/api/dataset");
  const [q, setQ] = useState("");
  const rows = useMemo(() => (d?.dictionary ?? []).filter((r: any) => (r.column + r.description + r.dtype).toLowerCase().includes(q.toLowerCase())), [d, q]);
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  return (
    <div className="fade-in space-y-6">
      <Panel className="p-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Metric label="Rows" value={int(d.rows)} />
        <Metric label="Columns" value={d.columns} />
        <Metric label="Date range" value={<span className="text-lg">{d.date_range.start} → {d.date_range.end}</span>} sub={`${d.date_range.days} days`} color={COLORS.sky} />
        <Metric label="Source file" value={<span className="text-sm break-all">{d.file}</span>} />
        <p className="sm:col-span-2 lg:col-span-4 text-sm text-sage border-t border-line/60 pt-4"><b className="text-ivory">Provenance.</b> {d.provenance}</p>
      </Panel>

      <div className="grid lg:grid-cols-2 gap-5">
        <Panel><SectionTitle label="Cleaning decisions" /><ul className="p-5 space-y-2.5 text-[13px] list-disc list-inside">{d.cleaning.map((c: string) => <li key={c}>{c}</li>)}</ul></Panel>
        <Panel><SectionTitle label="Limitations & assumptions" /><ul className="p-5 space-y-2.5 text-[13px] list-disc list-inside">{d.limitations.map((c: string) => <li key={c}>{c}</li>)}</ul></Panel>
      </div>

      <Panel>
        <SectionTitle label="Data dictionary" title="Columns" aside={<div className="relative"><Search size={14} className="absolute left-2.5 top-3 text-sage" /><input className="field !pl-8 !py-2 w-56" placeholder="Search columns…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search data dictionary" /></div>} />
        <div className="overflow-x-auto"><table className="w-full text-[13px] min-w-[760px]">
          <thead><tr className="eyebrow text-left"><th className="px-5 py-3">Column</th><th className="px-3">Type</th><th className="px-3">Distinct</th><th className="px-3">Missing</th><th className="px-3">Description</th></tr></thead>
          <tbody>{rows.map((r: any) => <tr key={r.column} className="border-t border-line/60 align-top"><td className="px-5 py-2.5 font-mono text-xs text-lime whitespace-nowrap">{r.column}</td><td className="px-3 num text-sage">{r.dtype}</td><td className="px-3 num">{int(r.distinct)}</td>
            <td className="px-3 num" style={{ color: r.missing_pct > 0 ? COLORS.gold : COLORS.sage }}>{r.missing_pct.toFixed(1)}%</td><td className="px-3 text-sage">{r.description}</td></tr>)}
            {rows.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-sage">No columns match “{q}”.</td></tr>}</tbody></table></div>
        <p className="px-5 py-3 text-[11px] text-sage border-t border-line/60">Most missing values are structural (a rating cannot exist for a ride that never happened). Customer IDs are used only to aggregate and are never displayed.</p>
      </Panel>

      <Panel>
        <SectionTitle label="Model inputs" title="Features, targets and splits" />
        <div className="overflow-x-auto"><table className="w-full text-[13px] min-w-[760px]">
          <thead><tr className="eyebrow text-left"><th className="px-5 py-3">Model</th><th className="px-3">Target</th><th className="px-3">Input features</th><th className="px-3">Split</th></tr></thead>
          <tbody>{Object.keys(MODEL_NAMES).map((k) => <tr key={k} className="border-t border-line/60 align-top">
            <td className="px-5 py-3 font-semibold">{MODEL_NAMES[k]}</td><td className="px-3 text-sage">{d.targets[k]}</td>
            <td className="px-3">{d.model_features[k] ? <span className="font-mono text-xs text-sky">{d.model_features[k].join(", ")}</span> : <span className="text-sage">not trained</span>}</td><td className="px-3 text-sage">{d.splits[k]}</td></tr>)}</tbody></table></div>
      </Panel>

      <Panel>
        <SectionTitle label="Missing values" title="Per column (raw file)" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3 p-5">{d.missing.filter((m: any) => m.missing > 0).map((m: any) => (
          <div key={m.column} className="text-[13px]"><div className="flex justify-between"><span className="font-mono text-xs">{m.column}</span><span className="num text-sage">{int(m.missing)} · {m.pct.toFixed(1)}%</span></div><div className="h-1 bg-ink mt-1"><div className="h-full bg-gold" style={{ width: `${m.pct}%` }} /></div></div>))}</div>
      </Panel>
      <Callout tone="lime" title="Evaluation methods">Classification: precision, recall, F1, PR-AUC, confusion matrix. Regression: MAE, RMSE, R². Clustering: silhouette. Forecasting: MAE and RMSE on a chronological test. Anomaly detection: flag rate and seed stability, since no labels exist.</Callout>
    </div>
  );
}
