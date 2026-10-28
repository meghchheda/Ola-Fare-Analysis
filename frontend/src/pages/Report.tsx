import {
  BookOpen,
  Check,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileDown,
  FileText,
  Maximize2,
  Printer,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Callout, Loading, Panel, SectionTitle } from "../components/ui";
import { useApi } from "../lib/api";
import { useApp } from "../lib/app-context";
import { COLORS, fix, pct } from "../lib/format";
import { PROJECT } from "../project";

const STACK = [
  ["Frontend", "React, TypeScript, Tailwind CSS, Recharts, Lucide icons"],
  ["Backend", "Python, FastAPI, Pydantic"],
  [
    "Machine learning",
    "scikit-learn (pipelines, Logistic/Linear Regression, Random Forest, K-Means, Isolation Forest), Joblib",
  ],
  ["Data", "Pandas, NumPy, Parquet artefacts; source CSV loaded from a configured path"],
];

const GITHUB_RAW_DOCX =
  "https://raw.githubusercontent.com/meghchheda/Ola-Fare-Analysis/main/docs/DV%20PROJECT%20REPORT.docx";
const LOCAL_DOCX_URL = "/DV_PROJECT_REPORT.docx";

export default function Report() {
  const { config, dataset } = useApp();
  const perf = useApi("/api/models/performance");
  const [viewMode, setViewMode] = useState<"doc" | "office" | "google">("doc");
  const [copied, setCopied] = useState(false);

  if (!config) return <Loading />;
  const p = perf.data;

  const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
    GITHUB_RAW_DOCX
  )}`;
  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(
    GITHUB_RAW_DOCX
  )}&embedded=true`;

  const handleCopyReport = () => {
    const reportText = `OLA RIDE INSIGHTS – Project Report
Authors:
- Megh Chheda (I015)
- Anit Fadia (I020)
- Priya Gandhi (I022)
Mukesh Patel School of Technology Management & Engineering (MPSTME)

1. Introduction
Ride-hailing platforms generate large volumes of information about bookings, vehicle types, locations, customer activity, ride outcomes and recorded booking values. Analyzing this information helps describe usage patterns and operational challenges. Machine learning can also be used to test whether historical patterns provide useful signals for prediction.

OLA Ride Insights is an end-to-end academic machine learning project built using 103,024 OLA booking records dated 1–31 July 2024. The application combines five analytical modules: booking non-fulfilment prediction, booking-value estimation, customer segmentation, hourly demand forecasting and unusual-booking detection. The React and TypeScript dashboard communicates with a Python FastAPI backend, which reads the static dataset and saved machine-learning artifacts.`;
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const findings: string[] = [];
  if (dataset) {
    findings.push(
      `The dataset holds ${dataset.rows.toLocaleString("en-IN")} bookings over ${dataset.date_range.days} days (${dataset.date_range.start} to ${dataset.date_range.end}).`
    );
  }
  if (p?.cancellation)
    findings.push(
      `${pct(p.cancellation.base_rate)} of bookings did not result in a ride. Booking-time features (vehicle, route, hour, weekday) barely improve on that base rate: test PR-AUC ${fix(p.cancellation.results[p.cancellation.selected_model].test.pr_auc)} versus ${fix(p.cancellation.base_rate)} for a constant predictor.`
    );
  if (p?.fare)
    findings.push(
      `Booking value is essentially independent of distance (correlation ${fix(p.fare.distance_corr_with_value)}), so fare models score R² ≈ ${fix(p.fare.results[p.fare.selected_model].r2, 3)}: no better than predicting the mean.`
    );
  if (p?.segmentation)
    findings.push(
      `${p.segmentation.customers_clustered.toLocaleString("en-IN")} repeat customers (of ${p.segmentation.customers_total.toLocaleString("en-IN")}) form ${p.segmentation.n_clusters} segments with silhouette ${fix(p.segmentation.silhouette, 2)}, i.e. overlapping but distinguishable behaviours.`
    );
  if (p?.forecast)
    findings.push(
      `Hourly demand is close to flat; the Random Forest forecast (MAE ${fix(p.forecast.results["Random Forest (lags + calendar)"].mae, 2)}) is level with an overall-mean baseline (MAE ${fix(p.forecast.results["Baseline: overall hourly mean"].mae, 2)}).`
    );
  if (p?.anomaly)
    findings.push(
      `Isolation Forest flagged ${p.anomaly.flagged.toLocaleString("en-IN")} records (${p.anomaly.flagged_pct.toFixed(1)}%), dominated by unusually high booking values on very short rides. Flags are for review, not proof of misconduct.`
    );

  return (
    <div className="fade-in space-y-6">
      {/* Top Header Card */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8">
          <div className="eyebrow text-coral flex items-center gap-2">
            <BookOpen size={14} /> Final Project Documentation
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.05] mt-2">
            {PROJECT.title}
          </h1>
          <p className="text-sage mt-3 text-base leading-relaxed max-w-2xl">
            Complete academic project report document prepared for OLA Ride Insights, including problem formulation,
            methodology, empirical evaluations, findings, system architecture and future scope.
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
          <div className="eyebrow text-sage mb-2">Document Actions</div>
          <div className="flex flex-col gap-2.5">
            <a
              href={LOCAL_DOCX_URL}
              download="DV PROJECT REPORT.docx"
              className="btn-coral w-full text-xs font-semibold"
            >
              <Download size={15} /> Download Word Document (.docx)
            </a>
            <a
              href={`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(GITHUB_RAW_DOCX)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost w-full text-xs"
            >
              <ExternalLink size={14} /> Open in Office Online
            </a>
            <button onClick={() => window.print()} className="btn-ghost w-full text-xs">
              <Printer size={14} /> Print Document
            </button>
          </div>
        </Panel>
      </div>

      {/* Embedded Document Frame */}
      <Panel className="border border-line/80 shadow-2xl bg-teal-deep/90 overflow-hidden">
        {/* Word Document Top Ribbon / Toolbar */}
        <div className="bg-[#1e293b] border-b border-line/80 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#2b579a] flex items-center justify-center text-white font-bold text-sm shadow">
              W
            </div>
            <div>
              <div className="font-bold text-ivory text-sm flex items-center gap-2">
                DV PROJECT REPORT.docx
                <span className="text-[10px] bg-ink/70 px-1.5 py-0.5 rounded text-sage border border-line/40">
                  39.8 KB · Word Document
                </span>
              </div>
              <div className="text-[11px] text-sage">
                OLA Ride Insights — Academic Machine Learning Report
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="bg-ink/80 p-0.5 rounded border border-line/50 flex text-[11px]">
              <button
                onClick={() => setViewMode("doc")}
                className={`px-2.5 py-1 rounded transition-colors ${
                  viewMode === "doc"
                    ? "bg-lime text-ink font-semibold"
                    : "text-sage hover:text-ivory"
                }`}
              >
                Page View
              </button>
              <button
                onClick={() => setViewMode("office")}
                className={`px-2.5 py-1 rounded transition-colors ${
                  viewMode === "office"
                    ? "bg-lime text-ink font-semibold"
                    : "text-sage hover:text-ivory"
                }`}
              >
                Office Online Frame
              </button>
              <button
                onClick={() => setViewMode("google")}
                className={`px-2.5 py-1 rounded transition-colors ${
                  viewMode === "google"
                    ? "bg-lime text-ink font-semibold"
                    : "text-sage hover:text-ivory"
                }`}
              >
                Google Docs Frame
              </button>
            </div>

            <a
              href={LOCAL_DOCX_URL}
              download="DV PROJECT REPORT.docx"
              className="p-1.5 rounded bg-ink/60 border border-line/50 text-sage hover:text-lime hover:border-lime transition-colors"
              title="Download docx file"
            >
              <FileDown size={16} />
            </a>
          </div>
        </div>

        {/* View Mode 1: Authentic Word Document Sheet View */}
        {viewMode === "doc" && (
          <div className="bg-[#1a231f] p-4 sm:p-10 flex justify-center overflow-x-auto">
            {/* The A4 Document Sheet */}
            <div className="w-full max-w-[840px] bg-white text-[#242424] font-sans p-8 sm:p-14 shadow-2xl rounded-sm leading-relaxed text-[14px]">
              {/* Document Header */}
              <div className="border-b-2 border-[#1B4D3E] pb-4 mb-6">
                <div className="text-[11px] uppercase tracking-wider text-[#666] font-mono">
                  Academic Project Report — July 2024 Dataset
                </div>
                <h2 className="text-3xl font-extrabold text-[#1B4D3E] mt-1 tracking-tight">
                  OLA RIDE INSIGHTS
                </h2>
                <div className="text-xs text-[#555] mt-2 flex flex-wrap items-center gap-3">
                  <span>
                    <b>Authors:</b> Megh Chheda (I015), Anit Fadia (I020), Priya Gandhi (I022)
                  </span>
                  <span>•</span>
                  <span>Mukesh Patel School of Technology Management &amp; Engineering (MPSTME)</span>
                </div>
              </div>

              {/* Document Body */}
              <div className="space-y-6">
                {/* 1. Introduction */}
                <div>
                  <h3 className="text-base font-bold text-[#1B4D3E] mb-2 border-b border-gray-200 pb-1">
                    1. Introduction
                  </h3>
                  <p className="mb-2">
                    Ride-hailing platforms generate large volumes of information about bookings, vehicle types, locations,
                    customer activity, ride outcomes and recorded booking values. Analyzing this information helps describe
                    usage patterns and operational challenges. Machine learning can also be used to test whether historical
                    patterns provide useful signals for prediction.
                  </p>
                  <p>
                    <strong>OLA Ride Insights</strong> is an end-to-end academic machine learning project built using 103,024
                    OLA booking records dated 1–31 July 2024. The application combines five analytical modules: booking
                    non-fulfilment prediction, booking-value estimation, customer segmentation, hourly demand forecasting and
                    unusual-booking detection. The React and TypeScript dashboard communicates with a Python FastAPI backend,
                    which reads the static dataset and saved machine-learning artifacts.
                  </p>
                </div>

                {/* 2. Problem Statement */}
                <div>
                  <h3 className="text-base font-bold text-[#1B4D3E] mb-2 border-b border-gray-200 pb-1">
                    2. Problem Statement
                  </h3>
                  <p>
                    Historical ride-booking data often remains difficult to interpret without structured analysis. Booking
                    cancellations, changes in recorded booking values, varying ride demand, differences in customer behaviour
                    and unusual records require different analytical methods. The project aims to develop a web-based system
                    that cleans and explores OLA booking records, evaluates appropriate machine learning techniques against
                    simple baselines, and presents results and limitations clearly through an interactive interface.
                  </p>
                </div>

                {/* 3. Objectives */}
                <div>
                  <h3 className="text-base font-bold text-[#1B4D3E] mb-2 border-b border-gray-200 pb-1">
                    3. Objectives
                  </h3>
                  <ul className="list-disc list-inside space-y-1 pl-1">
                    <li>Prepare and explore historical ride-booking records.</li>
                    <li>Predict the probability of an unfulfilled booking using information available at booking time.</li>
                    <li>Estimate recorded booking values for completed rides.</li>
                    <li>Identify customer groups using unsupervised learning.</li>
                    <li>Forecast hourly booking volume and identify unusual booking records.</li>
                    <li>Compare results with relevant statistical baselines and present findings in a usable website.</li>
                  </ul>
                </div>

                {/* 4. Dataset Description and Preparation */}
                <div>
                  <h3 className="text-base font-bold text-[#1B4D3E] mb-2 border-b border-gray-200 pb-1">
                    4. Dataset Description and Preparation
                  </h3>
                  <p className="mb-2">
                    The supplied <code className="bg-gray-100 text-[#1B4D3E] px-1 py-0.5 rounded text-xs font-mono">Bookings-100000-Rows.csv</code> contains
                    103,024 rows and 20 original columns for July 2024. It includes booking status, vehicle type, pickup and
                    drop locations, payment method, booking value, ride distance, cancellation reasons and customer/driver
                    ratings. There are 94,544 distinct customers.
                  </p>
                  <p className="mb-3">
                    The data-processing pipeline removes the redundant Time and invalid Vehicle Images columns, parses dates,
                    checks booking identifiers and creates calendar and outcome-based variables. It retains missing values
                    when their absence is meaningful, for example where a cancelled ride has no payment method or rating. The
                    dataset remains at 103,024 records after preprocessing. Different models then use different appropriate
                    subsets and transformations.
                  </p>

                  <table className="w-full text-xs text-left border-collapse border border-gray-300 mt-2">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-300 font-semibold text-gray-700">
                        <th className="py-2 px-3 border-r border-gray-300">Booking result</th>
                        <th className="py-2 px-3 border-r border-gray-300">Bookings</th>
                        <th className="py-2 px-3">Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr>
                        <td className="py-1.5 px-3 border-r border-gray-200 font-medium">Successful</td>
                        <td className="py-1.5 px-3 border-r border-gray-200 font-mono">63,967</td>
                        <td className="py-1.5 px-3 font-mono">62.09%</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-3 border-r border-gray-200 font-medium">Cancelled by driver</td>
                        <td className="py-1.5 px-3 border-r border-gray-200 font-mono">18,434</td>
                        <td className="py-1.5 px-3 font-mono">17.89%</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-3 border-r border-gray-200 font-medium">Cancelled by customer</td>
                        <td className="py-1.5 px-3 border-r border-gray-200 font-mono">10,499</td>
                        <td className="py-1.5 px-3 font-mono">10.19%</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-3 border-r border-gray-200 font-medium">Driver not found</td>
                        <td className="py-1.5 px-3 border-r border-gray-200 font-mono">10,124</td>
                        <td className="py-1.5 px-3 font-mono">9.83%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 5. Methodology and Algorithms */}
                <div>
                  <h3 className="text-base font-bold text-[#1B4D3E] mb-2 border-b border-gray-200 pb-1">
                    5. Methodology and Algorithms
                  </h3>
                  <p className="mb-2">
                    <strong>Cancellation prediction</strong> uses Logistic Regression and Random Forest classification. Only features
                    known when a booking is requested are used, including vehicle, route and time; post-outcome values are excluded
                    to avoid data leakage. The target is an unfulfilled booking.
                  </p>
                  <p className="mb-2">
                    <strong>Fare estimation</strong> uses Linear Regression and Random Forest regression trained on 63,967 completed
                    rides. Ride distance is treated as an estimated pre-booking route distance for prediction; the target is recorded
                    Booking_Value. The values are experimental estimates rather than real-time fare quotations.
                  </p>
                  <p className="mb-2">
                    <strong>Customer segmentation</strong> uses K-Means clustering on aggregated behaviour for customers with at
                    least two bookings. <strong>Demand forecasting</strong> compares a Random Forest using historical lag and calendar
                    features with simple averages. <strong>Isolation Forest</strong> identifies statistically uncommon feature combinations
                    and flags them for possible review, without concluding that they are fraudulent.
                  </p>
                  <p>
                    The offline training pipeline generates saved model files, evaluation metrics and processed outputs. The FastAPI
                    application serves these to a React/TypeScript user interface. Training does not take place inside the deployed
                    web server.
                  </p>
                </div>

                {/* 6. Model Evaluation and Results */}
                <div>
                  <h3 className="text-base font-bold text-[#1B4D3E] mb-2 border-b border-gray-200 pb-1">
                    6. Model Evaluation and Results
                  </h3>
                  <p className="text-xs text-gray-600 mb-3">
                    The reported scores below come from the GitHub project evaluation summary. The models are assessed with metrics
                    suitable for their tasks, not a single universal accuracy percentage.
                  </p>

                  <h4 className="text-xs font-bold uppercase tracking-wide text-gray-700 mt-3 mb-1">
                    Cancellation Prediction
                  </h4>
                  <table className="w-full text-xs text-left border-collapse border border-gray-300 mb-1">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-300 font-semibold text-gray-700">
                        <th className="py-1.5 px-2 border-r border-gray-300">Method</th>
                        <th className="py-1.5 px-2 border-r border-gray-300">Precision</th>
                        <th className="py-1.5 px-2 border-r border-gray-300">Recall</th>
                        <th className="py-1.5 px-2 border-r border-gray-300">F1</th>
                        <th className="py-1.5 px-2">PR-AUC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 font-mono text-[11px]">
                      <tr>
                        <td className="py-1 px-2 border-r border-gray-200 font-sans">Base-rate baseline</td>
                        <td className="py-1 px-2 border-r border-gray-200">0.000</td>
                        <td className="py-1 px-2 border-r border-gray-200">0.000</td>
                        <td className="py-1 px-2 border-r border-gray-200">0.000</td>
                        <td className="py-1 px-2">0.379</td>
                      </tr>
                      <tr>
                        <td className="py-1 px-2 border-r border-gray-200 font-sans">Logistic Regression</td>
                        <td className="py-1 px-2 border-r border-gray-200">0.379</td>
                        <td className="py-1 px-2 border-r border-gray-200">1.000</td>
                        <td className="py-1 px-2 border-r border-gray-200">0.550</td>
                        <td className="py-1 px-2">0.380</td>
                      </tr>
                      <tr className="bg-gray-50 font-semibold">
                        <td className="py-1 px-2 border-r border-gray-200 font-sans">Random Forest (Selected)</td>
                        <td className="py-1 px-2 border-r border-gray-200">0.379</td>
                        <td className="py-1 px-2 border-r border-gray-200">0.999</td>
                        <td className="py-1 px-2 border-r border-gray-200">0.550</td>
                        <td className="py-1 px-2">0.381</td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="text-[11px] text-gray-500 italic mb-4">
                    Random Forest is the selected model, but PR-AUC improves only slightly over the base rate. The available
                    features have weak predictive power for cancellation.
                  </p>

                  <h4 className="text-xs font-bold uppercase tracking-wide text-gray-700 mb-1">
                    Fare Estimation
                  </h4>
                  <table className="w-full text-xs text-left border-collapse border border-gray-300 mb-1">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-300 font-semibold text-gray-700">
                        <th className="py-1.5 px-2 border-r border-gray-300">Method</th>
                        <th className="py-1.5 px-2 border-r border-gray-300">MAE (INR)</th>
                        <th className="py-1.5 px-2 border-r border-gray-300">RMSE (INR)</th>
                        <th className="py-1.5 px-2">R²</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 font-mono text-[11px]">
                      <tr>
                        <td className="py-1 px-2 border-r border-gray-200 font-sans">Global mean baseline</td>
                        <td className="py-1 px-2 border-r border-gray-200">350.8</td>
                        <td className="py-1 px-2 border-r border-gray-200">537.5</td>
                        <td className="py-1 px-2">−0.0000</td>
                      </tr>
                      <tr>
                        <td className="py-1 px-2 border-r border-gray-200 font-sans">Vehicle-type mean</td>
                        <td className="py-1 px-2 border-r border-gray-200">350.9</td>
                        <td className="py-1 px-2 border-r border-gray-200">537.6</td>
                        <td className="py-1 px-2">−0.0001</td>
                      </tr>
                      <tr className="bg-gray-50 font-semibold">
                        <td className="py-1 px-2 border-r border-gray-200 font-sans">Linear Regression (Selected)</td>
                        <td className="py-1 px-2 border-r border-gray-200">351.0</td>
                        <td className="py-1 px-2 border-r border-gray-200">538.4</td>
                        <td className="py-1 px-2">−0.0030</td>
                      </tr>
                      <tr>
                        <td className="py-1 px-2 border-r border-gray-200 font-sans">Random Forest</td>
                        <td className="py-1 px-2 border-r border-gray-200">351.7</td>
                        <td className="py-1 px-2 border-r border-gray-200">538.5</td>
                        <td className="py-1 px-2">−0.0037</td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="text-[11px] text-gray-500 italic mb-4">
                    Linear Regression is the selected machine learning model, but it does not outperform the global-mean baseline.
                    Booking value is almost uncorrelated with ride distance (r ≈ 0.002), indicating a significant dataset limitation
                    for fare estimation.
                  </p>

                  <h4 className="text-xs font-bold uppercase tracking-wide text-gray-700 mb-1">
                    Other Analytical Models
                  </h4>
                  <table className="w-full text-xs text-left border-collapse border border-gray-300 mb-1">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-300 font-semibold text-gray-700">
                        <th className="py-1.5 px-2 border-r border-gray-300">Task</th>
                        <th className="py-1.5 px-2 border-r border-gray-300">Method / Evaluation</th>
                        <th className="py-1.5 px-2">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-[11px]">
                      <tr>
                        <td className="py-1 px-2 border-r border-gray-200 font-medium">Customer segmentation</td>
                        <td className="py-1 px-2 border-r border-gray-200">K-Means, k=7</td>
                        <td className="py-1 px-2 font-mono">Silhouette score 0.310; 7,954 customers</td>
                      </tr>
                      <tr>
                        <td className="py-1 px-2 border-r border-gray-200 font-medium">Demand forecast</td>
                        <td className="py-1 px-2 border-r border-gray-200">Random Forest hourly forecast</td>
                        <td className="py-1 px-2 font-mono">MAE 10.05; RMSE 12.45</td>
                      </tr>
                      <tr>
                        <td className="py-1 px-2 border-r border-gray-200 font-medium">Demand baseline</td>
                        <td className="py-1 px-2 border-r border-gray-200">Overall hourly mean</td>
                        <td className="py-1 px-2 font-mono">MAE 9.97; RMSE 12.56</td>
                      </tr>
                      <tr>
                        <td className="py-1 px-2 border-r border-gray-200 font-medium">Anomaly detection</td>
                        <td className="py-1 px-2 border-r border-gray-200">Isolation Forest, 1% contamination</td>
                        <td className="py-1 px-2 font-mono">1,031 records flagged; stability 0.84</td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="text-[11px] text-gray-500 italic">
                    Customer clusters overlap; the hourly forecast offers mixed improvement compared with basic averages; and
                    anomaly scores cannot be evaluated using ordinary accuracy without verified anomaly labels.
                  </p>
                </div>

                {/* 7. Key Findings and Discussion */}
                <div>
                  <h3 className="text-base font-bold text-[#1B4D3E] mb-2 border-b border-gray-200 pb-1">
                    7. Key Findings and Discussion
                  </h3>
                  <ul className="list-disc list-inside space-y-1 pl-1">
                    <li>62.09% of recorded bookings were successful, while 37.91% were unfulfilled.</li>
                    <li>Driver cancellations accounted for 18,434 records, the largest category of unfulfilled bookings.</li>
                    <li>Cancellation prediction showed very limited improvement over a base-rate approach.</li>
                    <li>Booking value showed almost no relationship with recorded distance; fare-model R² values were negative.</li>
                    <li>K-Means separated repeat customers into seven descriptive groups, but the silhouette score indicated overlapping segments.</li>
                    <li>The anomaly model flagged 1,031 statistically unusual bookings for review, not confirmed fraud cases.</li>
                  </ul>
                </div>

                {/* 8. System Architecture */}
                <div>
                  <h3 className="text-base font-bold text-[#1B4D3E] mb-2 border-b border-gray-200 pb-1">
                    8. System Architecture
                  </h3>
                  <div className="bg-gray-50 border border-gray-200 p-3 rounded text-xs font-mono text-gray-700">
                    Data source (CSV) → Python/pandas preparation → feature engineering → model-specific training using
                    scikit-learn → evaluation and saved joblib/JSON/Parquet artifacts → FastAPI prediction and analytics
                    endpoints → React, TypeScript, Tailwind and Recharts dashboard → user-facing insights.
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1 italic">
                    The current deployment uses a static dataset and saved models rather than a live transaction database.
                  </p>
                </div>

                {/* 9. Conclusion */}
                <div>
                  <h3 className="text-base font-bold text-[#1B4D3E] mb-2 border-b border-gray-200 pb-1">
                    9. Conclusion
                  </h3>
                  <p>
                    OLA Ride Insights demonstrates an end-to-end implementation of machine learning for mobility data, spanning
                    cleaning, descriptive analysis, supervised prediction, unsupervised learning, model comparison and web
                    deployment. Its main contribution is the integration of several analytical techniques into one interface
                    with transparent evaluation. The experiments also demonstrate why weak predictive performance must be reported
                    instead of presenting every trained model as accurate or operationally reliable.
                  </p>
                </div>

                {/* 10. Future Scope */}
                <div>
                  <h3 className="text-base font-bold text-[#1B4D3E] mb-2 border-b border-gray-200 pb-1">
                    10. Future Scope
                  </h3>
                  <ol className="list-decimal list-inside space-y-1 pl-1">
                    <li><strong>Richer datasets:</strong> Collect verified trip-level pricing, traffic, weather, supply and demand information over multiple months.</li>
                    <li><strong>Improved prediction:</strong> Try feature engineering, calibration, cross-validation and alternative regression and classification approaches after strengthening the input data.</li>
                    <li><strong>Longer-horizon demand forecasting:</strong> Use larger historical windows to evaluate weekly, seasonal and event-related demand changes.</li>
                    <li><strong>Validated anomaly detection:</strong> Add manually reviewed anomalous and normal examples to measure precision and false positives.</li>
                    <li><strong>Real-time application support:</strong> Integrate live feeds and periodic model retraining, with privacy-aware monitoring and performance checks.</li>
                    <li><strong>Enhanced visualization:</strong> Add geographic analyses and clearer explanations of uncertainty in the dashboard.</li>
                  </ol>
                </div>

                {/* 11. References */}
                <div>
                  <h3 className="text-base font-bold text-[#1B4D3E] mb-2 border-b border-gray-200 pb-1">
                    11. References
                  </h3>
                  <ul className="space-y-1 text-xs">
                    <li><b>Project GitHub repository:</b> <a href="https://github.com/meghchheda/Ola-Fare-Analysis" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">https://github.com/meghchheda/Ola-Fare-Analysis</a></li>
                    <li><b>Dataset in project repository:</b> <a href="https://github.com/meghchheda/Ola-Fare-Analysis/tree/main/data" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">https://github.com/meghchheda/Ola-Fare-Analysis/tree/main/data</a></li>
                    <li><b>Model evaluation report:</b> <a href="https://github.com/meghchheda/Ola-Fare-Analysis/blob/main/docs/model_evaluation_summary.md" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">https://github.com/meghchheda/Ola-Fare-Analysis/blob/main/docs/model_evaluation_summary.md</a></li>
                    <li><b>Live frontend website:</b> <a href="https://ola-fare-analysis.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">https://ola-fare-analysis.vercel.app/</a></li>
                    <li><b>Backend API deployment:</b> <a href="https://ola-fare-analysis-1.onrender.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">https://ola-fare-analysis-1.onrender.com/</a></li>
                    <li><b>Original Kaggle upload:</b> <a href="https://www.kaggle.com/datasets/muhammadahmadmujahid/ola-dataset" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">https://www.kaggle.com/datasets/muhammadahmadmujahid/ola-dataset</a></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Mode 2: Office Online Viewer iframe */}
        {viewMode === "office" && (
          <div>
            <iframe
              src={officeViewerUrl}
              title="Microsoft Office Online Viewer"
              className="w-full h-[850px] bg-white border-0"
              allowFullScreen
            />
            <div className="p-3 bg-ink/70 text-xs text-sage border-t border-line/60 flex items-center justify-between">
              <span>Powered by Microsoft Office Online Viewer.</span>
              <a
                href={officeViewerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lime hover:underline inline-flex items-center gap-1"
              >
                Open in Full Window <ExternalLink size={12} />
              </a>
            </div>
          </div>
        )}

        {/* View Mode 3: Google Docs Viewer iframe */}
        {viewMode === "google" && (
          <div>
            <iframe
              src={googleViewerUrl}
              title="Google Docs Viewer"
              className="w-full h-[850px] bg-white border-0"
              allowFullScreen
            />
            <div className="p-3 bg-ink/70 text-xs text-sage border-t border-line/60 flex items-center justify-between">
              <span>Powered by Google Docs Viewer.</span>
              <a
                href={googleViewerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lime hover:underline inline-flex items-center gap-1"
              >
                Open in Full Window <ExternalLink size={12} />
              </a>
            </div>
          </div>
        )}
      </Panel>

      {/* Companion Cards: Technology stack & Dynamic Findings */}
      <div className="grid lg:grid-cols-12 gap-5">
        <Panel className="lg:col-span-7">
          <SectionTitle label="Live Dynamic Evaluation" title="Dataset Key Metrics" />
          {perf.loading ? (
            <Loading />
          ) : (
            <ul className="p-5 space-y-3 text-[14px] leading-relaxed">
              {findings.map((f, i) => (
                <li key={i} className="flex gap-3">
                  <span className="num text-coral">{String(i + 1).padStart(2, "0")}</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="px-5 pb-4 text-[11px] text-sage">Dynamically loaded from the live FastAPI backend.</p>
        </Panel>

        <div className="lg:col-span-5 space-y-5">
          <Panel>
            <SectionTitle label="Technology stack" />
            <dl className="p-5 space-y-3 text-sm">
              {STACK.map(([k, v]) => (
                <div key={k}>
                  <dt className="eyebrow">{k}</dt>
                  <dd className="mt-0.5">{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>
      </div>

      <Callout tone="coral" title="Honest academic evaluation">
        Several models do not outperform their baselines on this dataset. That is a documented finding about the data,
        and it is reported transparently throughout this application and final project report.
      </Callout>
    </div>
  );
}
