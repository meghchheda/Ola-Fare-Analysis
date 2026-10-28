import {
  BookOpen,
  Download,
  ExternalLink,
  FileText,
  Maximize2,
  Printer,
  Users,
} from "lucide-react";
import { Callout, Loading, Panel, SectionTitle } from "../components/ui";
import { useApi } from "../lib/api";
import { useApp } from "../lib/app-context";
import { fix, pct } from "../lib/format";
import { PROJECT } from "../project";

const PDF_URL = "/report.pdf";

export default function Report() {
  const { config, dataset } = useApp();
  const perf = useApi("/api/models/performance");

  if (!config) return <Loading />;
  const p = perf.data;

  const findings: string[] = [];
  if (dataset) {
    findings.push(
      `The dataset holds ${dataset.rows.toLocaleString("en-IN")} bookings over ${dataset.date_range.days} days (${dataset.date_range.start} to ${dataset.date_range.end}).`
    );
  }
  if (p?.cancellation)
    findings.push(
      `${pct(p.cancellation.base_rate)} of bookings did not result in a ride. Test PR-AUC is ${fix(p.cancellation.results[p.cancellation.selected_model].test.pr_auc)} vs ${fix(p.cancellation.base_rate)} base rate.`
    );
  if (p?.fare)
    findings.push(
      `Booking value is essentially independent of distance (correlation ${fix(p.fare.distance_corr_with_value)}), so fare model R² is ≈ ${fix(p.fare.results[p.fare.selected_model].r2, 3)}.`
    );
  if (p?.segmentation)
    findings.push(
      `${p.segmentation.customers_clustered.toLocaleString("en-IN")} repeat customers form ${p.segmentation.n_clusters} segments with silhouette ${fix(p.segmentation.silhouette, 2)}.`
    );

  return (
    <div className="fade-in space-y-6">
      {/* Top Header Card */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8">
          <div className="eyebrow text-coral flex items-center gap-2">
            <BookOpen size={14} /> Project Documentation
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.05] mt-2">
            {PROJECT.title}
          </h1>
          <p className="text-sage mt-3 text-base leading-relaxed max-w-2xl">
            Official academic project report for OLA Ride Insights covering dataset exploration, methodology,
            empirical evaluation of the 5 machine learning models, findings, and architecture.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-5 text-sm text-ivory/80">
            <div className="flex items-center gap-1.5 text-lime">
              <Users size={16} />
              <span>
                {PROJECT.team.map((t) => `${t.name} (${t.roll})`).join(" · ")}
              </span>
            </div>
            {PROJECT.institution && (
              <span className="text-sage border-l border-line/70 pl-4">
                {PROJECT.institution}
              </span>
            )}
          </div>
        </div>

        {/* Action Panel */}
        <Panel className="lg:col-span-4 p-5">
          <div className="eyebrow text-sage mb-2">PDF Document</div>
          <div className="flex flex-col gap-2.5">
            <a
              href={PDF_URL}
              download="I015-I020-I022_DV_Report.pdf"
              className="btn-coral w-full text-xs font-semibold"
            >
              <Download size={15} /> Download PDF
            </a>
            <a
              href={PDF_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost w-full text-xs"
            >
              <ExternalLink size={14} /> Open in New Tab
            </a>
            <button
              onClick={() => {
                const w = window.open(PDF_URL);
                w?.print();
              }}
              className="btn-ghost w-full text-xs"
            >
              <Printer size={14} /> Print PDF
            </button>
          </div>
        </Panel>
      </div>

      {/* Embedded Native PDF Viewer */}
      <Panel className="border border-line/80 shadow-2xl bg-ink overflow-hidden p-0">
        <div className="bg-[#1e293b] border-b border-line/70 px-4 py-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5 text-ivory">
            <div className="w-6 h-6 rounded bg-danger flex items-center justify-center text-white font-bold text-xs shadow">
              PDF
            </div>
            <span className="font-semibold text-sm">I015-I020-I022_DV_Report.pdf</span>
            <span className="text-[10px] text-sage bg-ink/70 px-1.5 py-0.5 rounded border border-line/40">
              4 Pages · Official Report
            </span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={PDF_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost text-xs py-1 px-2.5 h-auto"
              title="Open full PDF"
            >
              <Maximize2 size={13} /> Fullscreen
            </a>
            <a
              href={PDF_URL}
              download="I015-I020-I022_DV_Report.pdf"
              className="btn-lime text-xs py-1 px-2.5 h-auto text-ink"
              title="Download PDF"
            >
              <Download size={13} /> Download
            </a>
          </div>
        </div>

        {/* The Native PDF Embed */}
        <div className="w-full h-[1000px] bg-[#525659]">
          <object
            data={`${PDF_URL}#view=FitH`}
            type="application/pdf"
            className="w-full h-full"
          >
            <iframe
              src={`${PDF_URL}#view=FitH`}
              title="OLA Ride Insights Academic Project Report (PDF)"
              className="w-full h-full border-0"
            >
              <div className="p-8 text-center text-ivory">
                <p className="text-base mb-3">Your browser does not support inline PDF viewing.</p>
                <a
                  href={PDF_URL}
                  download="I015-I020-I022_DV_Report.pdf"
                  className="btn-coral inline-flex items-center gap-2"
                >
                  <Download size={16} /> Click here to Download the PDF
                </a>
              </div>
            </iframe>
          </object>
        </div>
      </Panel>

      {/* Dataset Findings Summary */}
      <div className="grid lg:grid-cols-12 gap-5">
        <Panel className="lg:col-span-12">
          <SectionTitle label="Live Dynamic Evaluation" title="Dataset Key Findings from Server" />
          {perf.loading ? (
            <Loading />
          ) : (
            <ul className="p-5 space-y-2.5 text-[14px] leading-relaxed grid sm:grid-cols-2 gap-4">
              {findings.map((f, i) => (
                <li key={i} className="flex gap-3 bg-ink/40 p-3 rounded border border-line/40">
                  <span className="num text-coral font-bold">{String(i + 1).padStart(2, "0")}</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Callout tone="coral" title="Honest academic evaluation">
        Several models do not outperform their baselines on this dataset. That is a documented finding about the data,
        and it is reported transparently throughout this application and the embedded final project report.
      </Callout>
    </div>
  );
}
