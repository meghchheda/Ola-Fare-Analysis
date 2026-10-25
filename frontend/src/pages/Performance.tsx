import { ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { axisProps, Callout, chartTooltip, ErrorBox, Loading, Metric, Panel, StatusBadge } from "../components/ui";
import { useApi } from "../lib/api";
import { useApp } from "../lib/app-context";
import { COLORS, fix, int } from "../lib/format";

function Section({ n, title, color, status, children }: { n: number; title: string; color: string; status: string; children: ReactNode }) {
  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-line/70" style={{ borderLeft: `4px solid ${color}` }}>
        <div><div className="font-mono text-[11px]" style={{ color }}>MODEL {String(n).padStart(2, "0")}</div><h3 className="text-lg font-bold">{title}</h3></div>
        <StatusBadge status={status} />
      </div>
      <div className="p-5">{children}</div>
    </Panel>
  );
}
const Table = ({ head, rows, hi }: { head: string[]; rows: (string | number)[][]; hi?: string }) => (
  <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="eyebrow text-left">{head.map((h) => <th key={h} className="py-2 pr-4">{h}</th>)}</tr></thead>
    <tbody>{rows.map((r) => <tr key={r[0]} className={`border-t border-line/60 ${r[0] === hi ? "text-lime" : ""}`}>{r.map((c, i) => <td key={i} className={`py-2 pr-4 ${i ? "num" : ""}`}>{c}</td>)}</tr>)}</tbody></table></div>
);
const Notes = ({ items }: { items: string[] }) => <ul className="mt-4 text-[12px] text-sage space-y-1 list-disc list-inside">{items.map((i) => <li key={i}>{i}</li>)}</ul>;

export default function Performance() {
  const { data, error, loading, reload } = useApi("/api/models/performance");
  const { models } = useApp();
  const st = (k: string) => models?.models?.find((m: any) => m.key === k)?.status ?? "Unavailable";
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const c = data.cancellation, f = data.fare, s = data.segmentation, fc = data.forecast, a = data.anomaly;

  return (
    <div className="fade-in space-y-6">
      <p className="text-sage max-w-3xl">Every number below is read from the evaluation files written by the training scripts. A model with no saved results shows as not trained instead of showing placeholder metrics.</p>

      <Section n={1} title="Cancellation prediction" color={COLORS.coral} status={st("cancellation")}>
        {c ? <>
          <Table head={["Model", "Precision", "Recall", "F1", "PR-AUC"]} hi={c.selected_model}
            rows={Object.entries(c.results).map(([k, r]: any) => [k, fix(r.test.precision), fix(r.test.recall), fix(r.test.f1), fix(r.test.pr_auc)])} />
          <div className="grid sm:grid-cols-2 gap-6 mt-5">
            <div><div className="eyebrow mb-2">Confusion matrix · {c.selected_model} (test)</div>
              <div className="grid grid-cols-2 gap-1 max-w-[260px] text-center">{[["TN", c.results[c.selected_model].test.confusion_matrix.tn], ["FP", c.results[c.selected_model].test.confusion_matrix.fp], ["FN", c.results[c.selected_model].test.confusion_matrix.fn], ["TP", c.results[c.selected_model].test.confusion_matrix.tp]].map(([l, v]: any) => (
                <div key={l} className="bg-ink py-3"><div className="eyebrow">{l}</div><div className="num font-bold text-lg">{int(v)}</div></div>))}</div></div>
            <Metric label="Base rate (constant predictor PR-AUC)" value={fix(c.base_rate)} color={COLORS.coral} sub={c.beats_baseline ? "model clearly above baseline" : "model is NOT meaningfully above baseline"} />
          </div>
          <Notes items={[`Split: ${c.split.strategy} (${int(c.split.train)} / ${int(c.split.validation)} / ${int(c.split.test)}). Threshold ${fix(c.threshold, 3)} chosen on validation by maximum F1.`, "F1 near 0.55 comes from flagging almost every booking, which a base rate of 38% rewards. PR-AUC is the fairer measure.", ...c.limitations]} />
        </> : <p className="text-sage text-sm">Not yet trained.</p>}
      </Section>

      <Section n={2} title="Fare prediction" color={COLORS.sky} status={st("fare")}>
        {f ? <>
          <Table head={["Model", "MAE (₹)", "RMSE (₹)", "R²"]} hi={f.selected_model} rows={Object.entries(f.results).map(([k, r]: any) => [k, r.mae.toFixed(1), r.rmse.toFixed(1), r.r2.toFixed(4)])} />
          <Notes items={[`Split: ${f.split.strategy} (${int(f.split.train)} / ${int(f.split.calibration)} / ${int(f.split.test)}); ${int(f.rows_used)} fulfilled rides used.`, `Improvement over vehicle-average baseline: ${(f.improvement_over_vehicle_baseline * 100).toFixed(2)}%. 80% interval covered ${(f.interval_test_coverage * 100).toFixed(0)}% of test rides.`, ...f.limitations]} />
        </> : <p className="text-sage text-sm">Not yet trained.</p>}
      </Section>

      <Section n={3} title="Customer segmentation" color={COLORS.gold} status={st("segmentation")}>
        {s ? <>
          <div className="grid sm:grid-cols-3 gap-5"><Metric label="Clusters" value={s.n_clusters} color={COLORS.gold} /><Metric label="Silhouette" value={fix(s.silhouette)} /><Metric label="Customers clustered" value={int(s.customers_clustered)} sub={`of ${int(s.customers_total)}`} /></div>
          <div className="h-[200px] mt-5"><ResponsiveContainer><BarChart data={Object.entries(s.cluster_sizes).map(([name, v]) => ({ name, v }))} margin={{ left: 0 }}><CartesianGrid stroke={COLORS.line} strokeDasharray="2 6" vertical={false} /><XAxis dataKey="name" {...axisProps} interval={0} tick={{ fill: "#A8BDB3", fontSize: 10 }} /><YAxis {...axisProps} width={40} /><Tooltip {...chartTooltip} /><Bar dataKey="v" name="Customers" fill={COLORS.gold} /></BarChart></ResponsiveContainer></div>
          <Notes items={s.interpretability_notes} />
        </> : <p className="text-sage text-sm">Not yet trained.</p>}
      </Section>

      <Section n={4} title="Demand forecasting" color={COLORS.lime} status={st("forecast")}>
        {fc ? <>
          <Table head={["Method", "MAE", "RMSE"]} hi="Random Forest (lags + calendar)" rows={Object.entries(fc.results).map(([k, r]: any) => [k, r.mae.toFixed(2), r.rmse.toFixed(2)])} />
          <Notes items={[`Evaluation period: ${fc.split.test_start.slice(0, 10)} to ${fc.split.test_end.slice(0, 10)} (${fc.split.test_hours} hours), ${fc.evaluation}.`, `Random Forest vs day-of-week×hour baseline: MAE ${(fc.rf_vs_baseline_mae_change * 100).toFixed(1)}%.`, ...fc.limitations]} />
        </> : <p className="text-sage text-sm">Not yet trained.</p>}
      </Section>

      <Section n={5} title="Anomaly detection" color={COLORS.danger} status={st("anomaly")}>
        {a ? <>
          <div className="grid sm:grid-cols-3 gap-5"><Metric label="Flagged" value={int(a.flagged)} color={COLORS.coral} sub={`${a.flagged_pct.toFixed(2)}% of ${int(a.records_analyzed)}`} /><Metric label="Seed stability (Jaccard)" value={fix(a.stability_jaccard_mean, 2)} /><Metric label="Review results" value={<span className="text-base">{a.review_results ?? "None available"}</span>} sub="no ground truth, no manual review" /></div>
          <div className="h-[160px] mt-5"><ResponsiveContainer><BarChart data={a.score_histogram}><XAxis dataKey="bin" {...axisProps} tickFormatter={(v) => (+v).toFixed(2)} interval={4} /><Tooltip {...chartTooltip} /><Bar dataKey="count" name="Records" fill={COLORS.gold} /></BarChart></ResponsiveContainer></div>
          <Notes items={a.limitations} />
        </> : <p className="text-sage text-sm">Not yet trained.</p>}
      </Section>
      <Callout tone="sky" title="Why report weak results?">A model that only matches its baseline is still a valid, publishable finding for a dataset like this. Hiding it would be the real failure.</Callout>
    </div>
  );
}
