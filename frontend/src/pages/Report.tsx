import { Download, ExternalLink, FileWarning, Users } from "lucide-react";
import { Callout, Loading, Panel, SectionTitle } from "../components/ui";
import { useApi } from "../lib/api";
import { useApp } from "../lib/app-context";
import { COLORS, fix, pct } from "../lib/format";
import { PROJECT } from "../project";

const STACK = [
  ["Frontend", "React, TypeScript, Tailwind CSS, Recharts, Lucide icons"],
  ["Backend", "Python, FastAPI, Pydantic"],
  ["Machine learning", "scikit-learn (pipelines, Logistic/Linear Regression, Random Forest, K-Means, Isolation Forest), Joblib"],
  ["Data", "Pandas, NumPy, Parquet artefacts; source CSV loaded from a configured path"],
];

export default function Report() {
  const { config, dataset } = useApp();
  const perf = useApi("/api/models/performance");
  if (!config) return <Loading />;
  const p = perf.data;
  const fileAvail = config.report_file_available;
  const isPdf = (config.report_file_name || "").toLowerCase().endsWith(".pdf");
  const anyReport = !!config.report_url || fileAvail;

  const findings: string[] = [];
  if (dataset) {
    findings.push(`The dataset holds ${dataset.rows.toLocaleString("en-IN")} bookings over ${dataset.date_range.days} days (${dataset.date_range.start} to ${dataset.date_range.end}).`);
  }
  if (p?.cancellation) findings.push(`${pct(p.cancellation.base_rate)} of bookings did not result in a ride. Booking-time features (vehicle, route, hour, weekday) barely improve on that base rate: test PR-AUC ${fix(p.cancellation.results[p.cancellation.selected_model].test.pr_auc)} versus ${fix(p.cancellation.base_rate)} for a constant predictor.`);
  if (p?.fare) findings.push(`Booking value is essentially independent of distance (correlation ${fix(p.fare.distance_corr_with_value)}), so fare models score R² ≈ ${fix(p.fare.results[p.fare.selected_model].r2, 3)}: no better than predicting the mean.`);
  if (p?.segmentation) findings.push(`${p.segmentation.customers_clustered.toLocaleString("en-IN")} repeat customers (of ${p.segmentation.customers_total.toLocaleString("en-IN")}) form ${p.segmentation.n_clusters} segments with silhouette ${fix(p.segmentation.silhouette, 2)}, i.e. overlapping but distinguishable behaviours.`);
  if (p?.forecast) findings.push(`Hourly demand is close to flat; the Random Forest forecast (MAE ${fix(p.forecast.results["Random Forest (lags + calendar)"].mae, 2)}) is level with an overall-mean baseline (MAE ${fix(p.forecast.results["Baseline: overall hourly mean"].mae, 2)}).`);
  if (p?.anomaly) findings.push(`Isolation Forest flagged ${p.anomaly.flagged.toLocaleString("en-IN")} records (${p.anomaly.flagged_pct.toFixed(1)}%), dominated by unusually high booking values on very short rides. Flags are for review, not proof of misconduct.`);

  return (
    <div className="fade-in space-y-6">
      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <div className="eyebrow text-coral">Final documentation</div>
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.05] mt-2">{PROJECT.title}</h2>
          <p className="text-sage mt-4 leading-relaxed max-w-2xl">
            <b className="text-ivory">Abstract.</b> OLA Ride Insights is a ride-analytics and machine-learning platform built on a month of OLA-style booking records. It combines descriptive analytics with five models:
            cancellation prediction, fare estimation, customer segmentation, demand forecasting and anomaly detection, all trained offline and served through a FastAPI backend to a React interface.
            The project places equal weight on honest evaluation: every model is compared with a baseline, leakage-prone fields are excluded, and weak results are reported as weak.
          </p>
        </div>
        <Panel className="lg:col-span-5 p-6 self-start" >
          <div className="eyebrow">Report access</div>
          {anyReport ? (
            <div className="flex flex-col gap-3 mt-4">
              <a className="btn-coral" target="_blank" rel="noopener noreferrer" href={config.report_url || "/api/report/file"}><ExternalLink size={16} /> View Project Report</a>
              {fileAvail && isPdf && <a className="btn-ghost" href="/api/report/file" download><Download size={16} /> Download PDF</a>}
              {fileAvail && !isPdf && <a className="btn-ghost" href="/api/report/file" download><Download size={16} /> Download Report</a>}
            </div>
          ) : (
            <div className="mt-4 flex gap-3 text-sm">
              <FileWarning className="text-gold shrink-0" />
              <div>
                <div className="font-semibold">The final report has not been uploaded yet.</div>
                <p className="text-sage mt-1">Set <code className="font-mono text-lime">REPORT_URL</code> to an online copy, or <code className="font-mono text-lime">REPORT_FILE_PATH</code> to a PDF/DOCX on the server, in <code className="font-mono">.env</code>. Buttons appear automatically once a real file or link exists.</p>
              </div>
            </div>
          )}
        </Panel>
      </div>

      <div className="grid lg:grid-cols-12 gap-5">
        <Panel className="lg:col-span-7">
          <SectionTitle label="Key analytical findings" title="What the data actually shows" />
          {perf.loading ? <Loading /> : <ul className="p-5 space-y-3 text-[14px] leading-relaxed">{findings.map((f, i) => <li key={i} className="flex gap-3"><span className="num text-coral">{String(i + 1).padStart(2, "0")}</span><span>{f}</span></li>)}</ul>}
          <p className="px-5 pb-4 text-[11px] text-sage">Generated from saved evaluation results, not typed in by hand.</p>
        </Panel>
        <div className="lg:col-span-5 space-y-5">
          <Panel>
            <SectionTitle label="Technology stack" />
            <dl className="p-5 space-y-3 text-sm">{STACK.map(([k, v]) => <div key={k}><dt className="eyebrow">{k}</dt><dd className="mt-0.5">{v}</dd></div>)}</dl>
          </Panel>
          <Panel>
            <SectionTitle label="Team" />
            <div className="p-5 text-sm">
              {PROJECT.team.length === 0 ? <div className="flex gap-2 text-sage"><Users size={16} className="shrink-0" /> Team details have not been provided yet. Add them in <code className="font-mono text-lime">frontend/src/project.ts</code>.</div> :
                <ul className="space-y-2">{PROJECT.team.map((t) => <li key={t.name}><b>{t.name}</b>{t.role && <span className="text-sage"> · {t.role}</span>}{t.roll && <span className="num text-sage"> · {t.roll}</span>}</li>)}</ul>}
              {PROJECT.guide && <div className="mt-3 text-sage">Guide: <span className="text-ivory">{PROJECT.guide}</span></div>}
            </div>
          </Panel>
        </div>
      </div>

      <Panel>
        <SectionTitle label="Models" title="Five models and their purposes" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-5">
          {[["Cancellation", "Predict whether a booking will not result in a ride.", COLORS.coral], ["Fare", "Estimate booking value before the ride.", COLORS.sky], ["Segmentation", "Group repeat riders by behaviour.", COLORS.gold], ["Forecast", "Project hourly booking volume.", COLORS.lime], ["Anomaly", "Surface unusual records for review.", COLORS.danger]].map(([n, d, c]) => (
            <div key={n} className="p-5 border-t sm:border-r border-line/60" style={{ borderTop: `3px solid ${c}` }}><div className="font-bold">{n}</div><p className="text-sm text-sage mt-1.5">{d}</p></div>))}
        </div>
      </Panel>

      <div className="grid lg:grid-cols-2 gap-5">
        <Panel><SectionTitle label="Dataset & methodology" /><div className="p-5 text-sm space-y-2 text-ivory/90">
          {dataset ? <>
            <p>{dataset.rows.toLocaleString("en-IN")} rows × {dataset.columns} columns, {dataset.date_range.start} to {dataset.date_range.end}.</p>
            <p>Splits: cancellation — {dataset.splits.cancellation}; forecast — {dataset.splits.forecast}.</p>
            <p>Post-outcome fields (distance, ratings, reasons, payment, turnaround times) are never used to predict the outcome they describe.</p></> : <Loading />}
        </div></Panel>
        <Panel><SectionTitle label="Limitations & future scope" /><ul className="p-5 text-sm space-y-2 text-ivory/90 list-disc list-inside">
          {(dataset?.limitations ?? []).map((l: string) => <li key={l}>{l}</li>)}
          <li>Future scope: multi-month data, real customer histories, surge and weather features, proper fraud labels for anomaly evaluation.</li>
        </ul></Panel>
      </div>
      <Callout tone="coral" title="Honest results">Several models do not outperform their baselines on this dataset. That is a finding about the data, and it is reported as such throughout the application.</Callout>
    </div>
  );
}
