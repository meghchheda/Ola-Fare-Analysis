import {
  ArrowDown,
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
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

const SECTIONS = [
  { id: "sec-1", title: "1. Introduction" },
  { id: "sec-2", title: "2. Problem Statement" },
  { id: "sec-3", title: "3. Objectives" },
  { id: "sec-4", title: "4. Dataset & Preparation" },
  { id: "sec-5", title: "5. Methodology" },
  { id: "sec-6", title: "6. Model Evaluation" },
  { id: "sec-7", title: "7. Key Findings" },
  { id: "sec-8", title: "8. System Architecture" },
  { id: "sec-9", title: "9. Conclusion" },
  { id: "sec-10", title: "10. Future Scope" },
  { id: "sec-11", title: "11. References" },
];

export default function Report() {
  const { config, dataset } = useApp();
  const perf = useApi("/api/models/performance");
  const [copied, setCopied] = useState(false);

  if (!config) return <Loading />;
  const p = perf.data;

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

  const handlePrint = () => {
    window.print();
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
    <div className="fade-in space-y-8">
      {/* Top Banner */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8">
          <div className="eyebrow text-coral flex items-center gap-2">
            <BookOpen size={14} /> Academic Documentation &amp; Research Report
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.05] mt-2">
            {PROJECT.title}
          </h1>
          <p className="text-sage mt-3 text-base leading-relaxed max-w-3xl">
            An end-to-end academic machine learning &amp; mobility analytics platform evaluating 103,024 OLA bookings
            with five specialized analytical models, rigorous baseline comparisons, and transparent evaluation.
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

        <Panel className="lg:col-span-4 p-5">
          <div className="eyebrow text-sage mb-2">Report Actions</div>
          <div className="flex flex-col gap-2.5">
            <button onClick={handlePrint} className="btn-coral w-full text-xs">
              <Printer size={15} /> Print / Save as PDF
            </button>
            <a href="#sec-1" className="btn-ghost w-full text-xs">
              <ArrowDown size={15} /> Jump to Embedded Report
            </a>
            <button onClick={handleCopyReport} className="btn-ghost w-full text-xs">
              {copied ? (
                <>
                  <Check size={15} className="text-lime" /> Copied Text
                </>
              ) : (
                <>
                  <Copy size={15} /> Copy Report Text
                </>
              )}
            </button>
          </div>
        </Panel>
      </div>

      {/* Quick Jump TOC */}
      <div className="bg-teal-deep/50 border border-line/60 p-3.5 rounded-sm flex items-center gap-2 overflow-x-auto text-xs">
        <span className="eyebrow text-sage shrink-0 mr-1">Jump to:</span>
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="shrink-0 px-2.5 py-1 rounded bg-ink/60 border border-line/50 text-sage hover:text-lime hover:border-lime transition-colors"
          >
            {s.title}
          </a>
        ))}
      </div>

      {/* Embedded Academic Report Document Container */}
      <Panel className="border border-line/80 shadow-2xl bg-teal/95 overflow-hidden">
        {/* Document Header */}
        <div className="border-b border-line/80 bg-ink/40 p-6 sm:p-8">
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div>
              <div className="eyebrow text-coral tracking-widest">
                Academic Project Report · July 2024 Dataset
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-1 text-ivory">
                OLA RIDE INSIGHTS
              </h2>
              <div className="text-sm text-sage mt-2">
                Predictive Analytics, Customer Segmentation, Demand Forecasting &amp; Anomaly Detection on Mobility Data
              </div>
            </div>
            <div className="text-right text-xs space-y-1">
              <div className="font-semibold text-lime">Mukesh Patel School of Technology Management &amp; Engineering</div>
              <div className="text-sage">Data Visualization &amp; Machine Learning Project</div>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-line/50 grid sm:grid-cols-3 gap-3">
            {PROJECT.team.map((t) => (
              <div key={t.roll} className="bg-ink/50 border border-line/40 px-3.5 py-2.5 rounded-sm">
                <div className="text-xs text-sage font-mono">Student Author</div>
                <div className="font-bold text-sm text-ivory">{t.name}</div>
                <div className="text-xs text-coral font-mono">{t.roll}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Document Content */}
        <div className="p-6 sm:p-10 space-y-10 text-[15px] leading-relaxed text-ivory/90">
          {/* Section 1 */}
          <section id="sec-1" className="space-y-3.5 scroll-mt-20">
            <div className="flex items-center gap-2.5 border-b border-line/60 pb-2">
              <span className="num font-bold text-coral text-lg">01</span>
              <h3 className="text-xl font-bold text-ivory">Introduction</h3>
            </div>
            <p>
              Ride-hailing platforms generate large volumes of information about bookings, vehicle types, locations,
              customer activity, ride outcomes and recorded booking values. Analyzing this information helps describe
              usage patterns and operational challenges. Machine learning can also be used to test whether historical
              patterns provide useful signals for prediction.
            </p>
            <p>
              <strong className="text-ivory">OLA Ride Insights</strong> is an end-to-end academic machine learning
              project built using 103,024 OLA booking records dated 1–31 July 2024. The application combines five
              analytical modules: booking non-fulfilment prediction, booking-value estimation, customer segmentation,
              hourly demand forecasting and unusual-booking detection. The React and TypeScript dashboard communicates
              with a Python FastAPI backend, which reads the static dataset and saved machine-learning artifacts.
            </p>
          </section>

          {/* Section 2 */}
          <section id="sec-2" className="space-y-3.5 scroll-mt-20">
            <div className="flex items-center gap-2.5 border-b border-line/60 pb-2">
              <span className="num font-bold text-coral text-lg">02</span>
              <h3 className="text-xl font-bold text-ivory">Problem Statement</h3>
            </div>
            <p>
              Historical ride-booking data often remains difficult to interpret without structured analysis. Booking
              cancellations, changes in recorded booking values, varying ride demand, differences in customer behaviour
              and unusual records require different analytical methods. The project aims to develop a web-based system
              that cleans and explores OLA booking records, evaluates appropriate machine learning techniques against
              simple baselines, and presents results and limitations clearly through an interactive interface.
            </p>
          </section>

          {/* Section 3 */}
          <section id="sec-3" className="space-y-3.5 scroll-mt-20">
            <div className="flex items-center gap-2.5 border-b border-line/60 pb-2">
              <span className="num font-bold text-coral text-lg">03</span>
              <h3 className="text-xl font-bold text-ivory">Objectives</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 mt-2">
              {[
                "Prepare and explore historical ride-booking records.",
                "Predict the probability of an unfulfilled booking using information available at booking time.",
                "Estimate recorded booking values for completed rides.",
                "Identify customer groups using unsupervised learning.",
                "Forecast hourly booking volume and identify unusual booking records.",
                "Compare results with relevant statistical baselines and present findings in a usable website.",
              ].map((obj, i) => (
                <div
                  key={i}
                  className="bg-ink/40 border border-line/50 p-3.5 rounded-sm flex items-start gap-3"
                >
                  <CheckCircle2 size={16} className="text-lime shrink-0 mt-0.5" />
                  <span className="text-sm leading-normal">{obj}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Section 4 */}
          <section id="sec-4" className="space-y-4 scroll-mt-20">
            <div className="flex items-center gap-2.5 border-b border-line/60 pb-2">
              <span className="num font-bold text-coral text-lg">04</span>
              <h3 className="text-xl font-bold text-ivory">Dataset Description and Preparation</h3>
            </div>
            <p>
              The supplied <code className="font-mono text-lime bg-ink px-1.5 py-0.5 rounded">Bookings-100000-Rows.csv</code> contains
              103,024 rows and 20 original columns for July 2024. It includes booking status, vehicle type, pickup and
              drop locations, payment method, booking value, ride distance, cancellation reasons and customer/driver
              ratings. There are 94,544 distinct customers.
            </p>
            <p>
              The data-processing pipeline removes the redundant Time and invalid Vehicle Images columns, parses dates,
              checks booking identifiers and creates calendar and outcome-based variables. It retains missing values
              when their absence is meaningful, for example where a cancelled ride has no payment method or rating. The
              dataset remains at 103,024 records after preprocessing. Different models then use different appropriate
              subsets and transformations.
            </p>

            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left text-sm border-collapse border border-line/60">
                <thead>
                  <tr className="bg-ink/70 border-b border-line/60 text-sage uppercase font-mono text-xs">
                    <th className="py-2.5 px-4 border-r border-line/50">Booking Result</th>
                    <th className="py-2.5 px-4 border-r border-line/50">Bookings Count</th>
                    <th className="py-2.5 px-4">Share (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/40">
                  <tr className="bg-ink/20 hover:bg-ink/40">
                    <td className="py-2.5 px-4 border-r border-line/40 font-medium text-lime">Successful</td>
                    <td className="py-2.5 px-4 border-r border-line/40 font-mono num">63,967</td>
                    <td className="py-2.5 px-4 font-mono num">62.09%</td>
                  </tr>
                  <tr className="bg-ink/20 hover:bg-ink/40">
                    <td className="py-2.5 px-4 border-r border-line/40 font-medium text-coral">Cancelled by driver</td>
                    <td className="py-2.5 px-4 border-r border-line/40 font-mono num">18,434</td>
                    <td className="py-2.5 px-4 font-mono num">17.89%</td>
                  </tr>
                  <tr className="bg-ink/20 hover:bg-ink/40">
                    <td className="py-2.5 px-4 border-r border-line/40 font-medium text-gold">Cancelled by customer</td>
                    <td className="py-2.5 px-4 border-r border-line/40 font-mono num">10,499</td>
                    <td className="py-2.5 px-4 font-mono num">10.19%</td>
                  </tr>
                  <tr className="bg-ink/20 hover:bg-ink/40">
                    <td className="py-2.5 px-4 border-r border-line/40 font-medium text-danger">Driver not found</td>
                    <td className="py-2.5 px-4 border-r border-line/40 font-mono num">10,124</td>
                    <td className="py-2.5 px-4 font-mono num">9.83%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 5 */}
          <section id="sec-5" className="space-y-4 scroll-mt-20">
            <div className="flex items-center gap-2.5 border-b border-line/60 pb-2">
              <span className="num font-bold text-coral text-lg">05</span>
              <h3 className="text-xl font-bold text-ivory">Methodology and Algorithms</h3>
            </div>
            <ul className="space-y-3 list-none pl-0">
              <li className="bg-ink/30 border border-line/50 p-4 rounded-sm">
                <b className="text-coral">Cancellation Prediction:</b> Uses Logistic Regression and Random Forest
                classification. Only features known when a booking is requested are used, including vehicle, route and
                time; post-outcome values are excluded to avoid data leakage. The target is an unfulfilled booking.
              </li>
              <li className="bg-ink/30 border border-line/50 p-4 rounded-sm">
                <b className="text-sky">Fare Estimation:</b> Uses Linear Regression and Random Forest regression trained
                on 63,967 completed rides. Ride distance is treated as an estimated pre-booking route distance for
                prediction; the target is recorded Booking_Value. The values are experimental estimates rather than
                real-time fare quotations.
              </li>
              <li className="bg-ink/30 border border-line/50 p-4 rounded-sm">
                <b className="text-gold">Customer Segmentation:</b> Uses K-Means clustering on aggregated behaviour for
                customers with at least two bookings.
              </li>
              <li className="bg-ink/30 border border-line/50 p-4 rounded-sm">
                <b className="text-lime">Demand Forecasting:</b> Compares a Random Forest using historical lag and calendar
                features with simple historical averages.
              </li>
              <li className="bg-ink/30 border border-line/50 p-4 rounded-sm">
                <b className="text-danger">Anomaly Detection:</b> Uses Isolation Forest to identify statistically
                uncommon feature combinations and flags them for possible review, without concluding that they are fraudulent.
              </li>
            </ul>
            <p className="text-sm text-sage">
              The offline training pipeline generates saved model files, evaluation metrics and processed outputs.
              The FastAPI application serves these to a React/TypeScript user interface. Training does not take place
              inside the deployed web server.
            </p>
          </section>

          {/* Section 6 */}
          <section id="sec-6" className="space-y-5 scroll-mt-20">
            <div className="flex items-center gap-2.5 border-b border-line/60 pb-2">
              <span className="num font-bold text-coral text-lg">06</span>
              <h3 className="text-xl font-bold text-ivory">Model Evaluation and Results</h3>
            </div>
            <p>
              The reported scores below come from the project evaluation summary. The models are assessed with metrics
              suitable for their tasks, not a single universal accuracy percentage.
            </p>

            {/* Subsection 6.1 */}
            <div className="space-y-2 mt-4">
              <h4 className="font-bold text-coral text-base">Cancellation Prediction Evaluation</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse border border-line/60">
                  <thead>
                    <tr className="bg-ink/70 border-b border-line/60 text-sage uppercase font-mono text-xs">
                      <th className="py-2.5 px-3 border-r border-line/50">Method</th>
                      <th className="py-2.5 px-3 border-r border-line/50">Precision</th>
                      <th className="py-2.5 px-3 border-r border-line/50">Recall</th>
                      <th className="py-2.5 px-3 border-r border-line/50">F1</th>
                      <th className="py-2.5 px-3">PR-AUC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/40 font-mono text-xs">
                    <tr className="bg-ink/20">
                      <td className="py-2 px-3 border-r border-line/40 text-sage font-sans">Base-rate baseline</td>
                      <td className="py-2 px-3 border-r border-line/40 num">0.000</td>
                      <td className="py-2 px-3 border-r border-line/40 num">0.000</td>
                      <td className="py-2 px-3 border-r border-line/40 num">0.000</td>
                      <td className="py-2 px-3 num text-gold">0.379</td>
                    </tr>
                    <tr className="bg-ink/20">
                      <td className="py-2 px-3 border-r border-line/40 text-ivory font-sans">Logistic Regression</td>
                      <td className="py-2 px-3 border-r border-line/40 num">0.379</td>
                      <td className="py-2 px-3 border-r border-line/40 num">1.000</td>
                      <td className="py-2 px-3 border-r border-line/40 num">0.550</td>
                      <td className="py-2 px-3 num">0.380</td>
                    </tr>
                    <tr className="bg-coral/10 font-bold">
                      <td className="py-2 px-3 border-r border-line/40 text-coral font-sans">Random Forest (Selected)</td>
                      <td className="py-2 px-3 border-r border-line/40 num">0.379</td>
                      <td className="py-2 px-3 border-r border-line/40 num">0.999</td>
                      <td className="py-2 px-3 border-r border-line/40 num">0.550</td>
                      <td className="py-2 px-3 num text-lime">0.381</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-sage italic">
                Random Forest is the selected model, but PR-AUC improves only slightly over the base rate. The available
                features have weak predictive power for cancellation.
              </p>
            </div>

            {/* Subsection 6.2 */}
            <div className="space-y-2 mt-5">
              <h4 className="font-bold text-sky text-base">Fare Estimation Evaluation</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse border border-line/60">
                  <thead>
                    <tr className="bg-ink/70 border-b border-line/60 text-sage uppercase font-mono text-xs">
                      <th className="py-2.5 px-3 border-r border-line/50">Method</th>
                      <th className="py-2.5 px-3 border-r border-line/50">MAE (INR)</th>
                      <th className="py-2.5 px-3 border-r border-line/50">RMSE (INR)</th>
                      <th className="py-2.5 px-3">R²</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/40 font-mono text-xs">
                    <tr className="bg-ink/20">
                      <td className="py-2 px-3 border-r border-line/40 text-sage font-sans">Global mean baseline</td>
                      <td className="py-2 px-3 border-r border-line/40 num">350.8</td>
                      <td className="py-2 px-3 border-r border-line/40 num">537.5</td>
                      <td className="py-2 px-3 num">−0.0000</td>
                    </tr>
                    <tr className="bg-ink/20">
                      <td className="py-2 px-3 border-r border-line/40 text-sage font-sans">Vehicle-type mean</td>
                      <td className="py-2 px-3 border-r border-line/40 num">350.9</td>
                      <td className="py-2 px-3 border-r border-line/40 num">537.6</td>
                      <td className="py-2 px-3 num">−0.0001</td>
                    </tr>
                    <tr className="bg-sky/10 font-bold">
                      <td className="py-2 px-3 border-r border-line/40 text-sky font-sans">Linear Regression (Selected)</td>
                      <td className="py-2 px-3 border-r border-line/40 num">351.0</td>
                      <td className="py-2 px-3 border-r border-line/40 num">538.4</td>
                      <td className="py-2 px-3 num text-coral">−0.0030</td>
                    </tr>
                    <tr className="bg-ink/20">
                      <td className="py-2 px-3 border-r border-line/40 text-ivory font-sans">Random Forest</td>
                      <td className="py-2 px-3 border-r border-line/40 num">351.7</td>
                      <td className="py-2 px-3 border-r border-line/40 num">538.5</td>
                      <td className="py-2 px-3 num text-coral">−0.0037</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-sage italic">
                Linear Regression is the selected machine learning model, but it does not outperform the global-mean
                baseline. Booking value is almost uncorrelated with ride distance (r ≈ 0.002), indicating a significant
                dataset limitation for fare estimation.
              </p>
            </div>

            {/* Subsection 6.3 */}
            <div className="space-y-2 mt-5">
              <h4 className="font-bold text-lime text-base">Other Analytical Models</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse border border-line/60">
                  <thead>
                    <tr className="bg-ink/70 border-b border-line/60 text-sage uppercase font-mono text-xs">
                      <th className="py-2.5 px-3 border-r border-line/50">Task</th>
                      <th className="py-2.5 px-3 border-r border-line/50">Method / Evaluation</th>
                      <th className="py-2.5 px-3">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/40 text-xs">
                    <tr className="bg-ink/20">
                      <td className="py-2 px-3 border-r border-line/40 font-bold text-gold">Customer Segmentation</td>
                      <td className="py-2 px-3 border-r border-line/40">K-Means, k=7</td>
                      <td className="py-2 px-3 font-mono">Silhouette score 0.310; 7,954 customers</td>
                    </tr>
                    <tr className="bg-ink/20">
                      <td className="py-2 px-3 border-r border-line/40 font-bold text-lime">Demand Forecast</td>
                      <td className="py-2 px-3 border-r border-line/40">Random Forest hourly forecast</td>
                      <td className="py-2 px-3 font-mono">MAE 10.05; RMSE 12.45</td>
                    </tr>
                    <tr className="bg-ink/20">
                      <td className="py-2 px-3 border-r border-line/40 font-bold text-sage">Demand Baseline</td>
                      <td className="py-2 px-3 border-r border-line/40">Overall hourly mean</td>
                      <td className="py-2 px-3 font-mono">MAE 9.97; RMSE 12.56</td>
                    </tr>
                    <tr className="bg-ink/20">
                      <td className="py-2 px-3 border-r border-line/40 font-bold text-danger">Anomaly Detection</td>
                      <td className="py-2 px-3 border-r border-line/40">Isolation Forest, 1% contamination</td>
                      <td className="py-2 px-3 font-mono">1,031 records flagged; stability 0.84</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-sage italic">
                Customer clusters overlap; the hourly forecast offers mixed improvement compared with basic averages;
                and anomaly scores cannot be evaluated using ordinary accuracy without verified anomaly labels.
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section id="sec-7" className="space-y-4 scroll-mt-20">
            <div className="flex items-center gap-2.5 border-b border-line/60 pb-2">
              <span className="num font-bold text-coral text-lg">07</span>
              <h3 className="text-xl font-bold text-ivory">Key Findings and Discussion</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-3.5">
              {[
                {
                  label: "Completion Ratio",
                  text: "62.09% of recorded bookings were successful, while 37.91% were unfulfilled.",
                  color: COLORS.lime,
                },
                {
                  label: "Driver Cancellations",
                  text: "Driver cancellations accounted for 18,434 records, the largest single category of unfulfilled bookings.",
                  color: COLORS.coral,
                },
                {
                  label: "Cancellation Signal",
                  text: "Cancellation prediction showed very limited improvement over a base-rate approach (PR-AUC 0.381 vs 0.379).",
                  color: COLORS.gold,
                },
                {
                  label: "Distance vs Value",
                  text: "Booking value showed almost no relationship with recorded distance (r ≈ 0.002); fare-model R² values were negative.",
                  color: COLORS.danger,
                },
                {
                  label: "Customer Clusters",
                  text: "K-Means separated repeat customers into seven descriptive groups, but the silhouette score indicated overlapping segments.",
                  color: COLORS.sky,
                },
                {
                  label: "Flagged Anomalies",
                  text: "The anomaly model flagged 1,031 statistically unusual bookings for review, not confirmed fraud cases.",
                  color: COLORS.gold,
                },
              ].map((kf, i) => (
                <div
                  key={i}
                  className="bg-ink/40 border border-line/60 p-4 rounded-sm flex flex-col justify-between"
                  style={{ borderLeft: `3px solid ${kf.color}` }}
                >
                  <div className="eyebrow text-xs mb-1" style={{ color: kf.color }}>
                    {kf.label}
                  </div>
                  <p className="text-sm leading-relaxed">{kf.text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Section 8 */}
          <section id="sec-8" className="space-y-4 scroll-mt-20">
            <div className="flex items-center gap-2.5 border-b border-line/60 pb-2">
              <span className="num font-bold text-coral text-lg">08</span>
              <h3 className="text-xl font-bold text-ivory">System Architecture</h3>
            </div>
            <p>
              Data source (CSV) → Python/pandas preparation → feature engineering → model-specific training using
              scikit-learn → evaluation and saved joblib/JSON/Parquet artifacts → FastAPI prediction and analytics
              endpoints → React, TypeScript, Tailwind and Recharts dashboard → user-facing insights.
            </p>

            <div className="bg-ink/60 border border-line/70 p-5 rounded-sm">
              <div className="grid grid-cols-1 md:grid-cols-7 gap-2 text-center text-xs">
                <div className="bg-teal-deep p-3 border border-line/60 rounded">
                  <div className="eyebrow text-coral">Data Source</div>
                  <div className="font-bold mt-1 text-ivory">CSV Dataset</div>
                  <div className="text-[10px] text-sage">103k rows</div>
                </div>
                <div className="hidden md:flex items-center justify-center text-sage">→</div>
                <div className="bg-teal-deep p-3 border border-line/60 rounded">
                  <div className="eyebrow text-sky">Prep &amp; FE</div>
                  <div className="font-bold mt-1 text-ivory">Pandas / NumPy</div>
                  <div className="text-[10px] text-sage">Clean &amp; encode</div>
                </div>
                <div className="hidden md:flex items-center justify-center text-sage">→</div>
                <div className="bg-teal-deep p-3 border border-line/60 rounded">
                  <div className="eyebrow text-gold">Modeling</div>
                  <div className="font-bold mt-1 text-ivory">scikit-learn</div>
                  <div className="text-[10px] text-sage">5 offline models</div>
                </div>
                <div className="hidden md:flex items-center justify-center text-sage">→</div>
                <div className="bg-teal-deep p-3 border border-line/60 rounded">
                  <div className="eyebrow text-lime">Artifacts</div>
                  <div className="font-bold mt-1 text-ivory">Joblib / Parquet</div>
                  <div className="text-[10px] text-sage">Saved weights</div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 text-center text-xs">
                <div className="bg-teal-deep/80 p-3 border border-line/60 rounded">
                  <div className="eyebrow text-lime">Backend API</div>
                  <div className="font-bold mt-1 text-ivory">FastAPI (Render)</div>
                  <div className="text-[10px] text-sage">REST endpoints</div>
                </div>
                <div className="hidden md:flex items-center justify-center text-sage">⇄</div>
                <div className="bg-teal-deep/80 p-3 border border-line/60 rounded">
                  <div className="eyebrow text-coral">Frontend Dashboard</div>
                  <div className="font-bold mt-1 text-ivory">React + Vite (Vercel)</div>
                  <div className="text-[10px] text-sage">Interactive UI</div>
                </div>
              </div>
              <p className="text-center text-xs text-sage mt-3 italic">
                The current deployment uses a static dataset and saved models rather than a live transaction database.
              </p>
            </div>
          </section>

          {/* Section 9 */}
          <section id="sec-9" className="space-y-3.5 scroll-mt-20">
            <div className="flex items-center gap-2.5 border-b border-line/60 pb-2">
              <span className="num font-bold text-coral text-lg">09</span>
              <h3 className="text-xl font-bold text-ivory">Conclusion</h3>
            </div>
            <p>
              <strong className="text-ivory">OLA Ride Insights</strong> demonstrates an end-to-end implementation of
              machine learning for mobility data, spanning cleaning, descriptive analysis, supervised prediction,
              unsupervised learning, model comparison and web deployment.
            </p>
            <p>
              Its main contribution is the integration of several analytical techniques into one interface with
              transparent evaluation. The experiments also demonstrate why weak predictive performance must be reported
              honestly instead of presenting every trained model as accurate or operationally reliable.
            </p>
          </section>

          {/* Section 10 */}
          <section id="sec-10" className="space-y-4 scroll-mt-20">
            <div className="flex items-center gap-2.5 border-b border-line/60 pb-2">
              <span className="num font-bold text-coral text-lg">10</span>
              <h3 className="text-xl font-bold text-ivory">Future Scope</h3>
            </div>
            <div className="space-y-2.5">
              {[
                {
                  title: "Richer datasets",
                  desc: "Collect verified trip-level pricing, traffic, weather, supply and demand information over multiple months.",
                },
                {
                  title: "Improved prediction",
                  desc: "Try feature engineering, calibration, cross-validation and alternative regression and classification approaches after strengthening the input data.",
                },
                {
                  title: "Longer-horizon demand forecasting",
                  desc: "Use larger historical windows to evaluate weekly, seasonal and event-related demand changes.",
                },
                {
                  title: "Validated anomaly detection",
                  desc: "Add manually reviewed anomalous and normal examples to measure precision and false positives.",
                },
                {
                  title: "Real-time application support",
                  desc: "Integrate live feeds and periodic model retraining, with privacy-aware monitoring and performance checks.",
                },
                {
                  title: "Enhanced visualization",
                  desc: "Add geographic analyses and clearer explanations of uncertainty in the dashboard.",
                },
              ].map((fs, idx) => (
                <div key={idx} className="flex gap-3 bg-ink/30 border border-line/40 p-3 rounded-sm">
                  <span className="num text-coral font-bold shrink-0">{idx + 1}.</span>
                  <div>
                    <strong className="text-ivory">{fs.title}:</strong>{" "}
                    <span className="text-sage text-sm">{fs.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 11 */}
          <section id="sec-11" className="space-y-4 scroll-mt-20">
            <div className="flex items-center gap-2.5 border-b border-line/60 pb-2">
              <span className="num font-bold text-coral text-lg">11</span>
              <h3 className="text-xl font-bold text-ivory">References</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                {
                  label: "Project GitHub repository",
                  url: "https://github.com/meghchheda/Ola-Fare-Analysis",
                },
                {
                  label: "Dataset in project repository",
                  url: "https://github.com/meghchheda/Ola-Fare-Analysis/tree/main/data",
                },
                {
                  label: "Model evaluation report",
                  url: "https://github.com/meghchheda/Ola-Fare-Analysis/blob/main/docs/model_evaluation_summary.md",
                },
                {
                  label: "Live frontend website",
                  url: "https://ola-fare-analysis.vercel.app/",
                },
                {
                  label: "Backend API deployment",
                  url: "https://ola-fare-analysis-1.onrender.com/",
                },
                {
                  label: "Original Kaggle dataset",
                  url: "https://www.kaggle.com/datasets/muhammadahmadmujahid/ola-dataset",
                },
              ].map((ref, idx) => (
                <a
                  key={idx}
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 p-3 bg-ink/50 border border-line/60 rounded hover:border-lime hover:bg-ink/80 transition-colors text-sm"
                >
                  <div className="truncate">
                    <div className="font-semibold text-ivory">{ref.label}</div>
                    <div className="text-xs text-lime font-mono truncate">{ref.url}</div>
                  </div>
                  <ExternalLink size={16} className="text-sage shrink-0" />
                </a>
              ))}
            </div>
          </section>
        </div>
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
