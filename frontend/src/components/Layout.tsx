import {
  Activity, BarChart3, BookOpenText, CircleSlash, Database, FileText, Gauge, LayoutDashboard, LineChart, Menu, Radar, Receipt, ScanSearch, Users, X,
} from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useApp } from "../lib/app-context";
import { Wordmark } from "./Logo";

const NAV = [
  { group: "ANALYTICS", items: [
    { to: "/", label: "Overview", icon: LayoutDashboard },
    { to: "/cancellation", label: "Cancellation Predictor", icon: CircleSlash },
    { to: "/fare", label: "Fare Estimator", icon: Receipt },
    { to: "/segments", label: "Customer Segments", icon: Users },
    { to: "/forecast", label: "Demand Forecast", icon: LineChart },
    { to: "/anomalies", label: "Anomaly Explorer", icon: ScanSearch },
  ] },
  { group: "PROJECT RESOURCES", items: [
    { to: "/power-bi", label: "Power BI Dashboard", icon: BarChart3 },
    { to: "/report", label: "Project Report", icon: FileText },
  ] },
  { group: "SYSTEM", items: [
    { to: "/performance", label: "Model Performance", icon: Gauge },
    { to: "/dataset", label: "Dataset & Methodology", icon: Database },
  ] },
];

const PAGES: Record<string, { title: string; sub: string }> = {
  "/": { title: "Overview", sub: "Booking patterns across the whole dataset" },
  "/cancellation": { title: "Cancellation Predictor", sub: "Model 1 · supervised classification" },
  "/fare": { title: "Fare Estimator", sub: "Model 2 · supervised regression" },
  "/segments": { title: "Customer Segments", sub: "Model 3 · K-Means clustering" },
  "/forecast": { title: "Demand Forecast", sub: "Model 4 · time-series forecasting" },
  "/anomalies": { title: "Anomaly Explorer", sub: "Model 5 · Isolation Forest" },
  "/power-bi": { title: "Power BI Dashboard", sub: "Published operational report" },
  "/report": { title: "Project Report", sub: "Final project documentation" },
  "/performance": { title: "Model Performance", sub: "Evaluation results saved by the training scripts" },
  "/dataset": { title: "Dataset & Methodology", sub: "Provenance, cleaning, features and splits" },
};

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { health, healthError, models, dataset, config } = useApp();
  const apiOk = health?.status === "ok";
  const dot = healthError ? "#FF6B6B" : health ? (apiOk ? "#C7F464" : "#FFC857") : "#A8BDB3";
  const label = healthError ? "API unreachable" : health ? (apiOk ? "API & dataset checked" : "API degraded") : "Checking API…";
  return (
    <div className="h-full flex flex-col bg-ink border-r border-line">
      <div className="px-5 pt-5 pb-6"><Wordmark /></div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Main">
        {NAV.map((g) => (
          <div key={g.group} className="mb-5">
            <div className="eyebrow px-3 mb-2 text-sage/70">{g.group}</div>
            {g.items.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === "/"} onClick={onNavigate}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 px-3 py-2.5 text-[13.5px] font-medium transition-colors ${
                    isActive ? "bg-teal text-ivory" : "text-sage hover:text-ivory hover:bg-teal/50"}`}>
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-lime" />}
                    <Icon size={16} className={isActive ? "text-lime" : ""} />
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="border-t border-line px-5 py-4 space-y-2 font-mono text-[11px] text-sage">
        <div className="flex justify-between"><span>DATASET</span><span className="text-ivory">{dataset ? `${(dataset.rows / 1000).toFixed(0)}k rows` : "—"}</span></div>
        <div className="flex justify-between"><span>MODELS</span><span className="text-ivory">{models ? `${models.trained} / ${models.models.length} trained` : "—"}</span></div>
        <div className="flex justify-between"><span>VERSION</span><span className="text-ivory">v{config?.version ?? "—"}</span></div>
        <div className="flex items-center gap-2 pt-1"><span className={`w-2 h-2 rounded-full ${health ? "" : "pulse-dot"}`} style={{ background: dot }} />{label}</div>
      </div>
    </div>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { dataset, filter, setFilter, healthError } = useApp();
  const [open, setOpen] = useState(false);
  const page = PAGES[pathname] ?? PAGES["/"];
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [pathname]);
  const range = dataset?.date_range;

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 z-30"><Sidebar /></aside>
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="w-72 max-w-[85%]"><Sidebar onNavigate={() => setOpen(false)} /></div>
          <button aria-label="Close menu" className="flex-1 bg-black/60" onClick={() => setOpen(false)}><X className="m-4 ml-auto" /></button>
        </div>
      )}
      <header className="sticky top-0 z-20 bg-forest/95 backdrop-blur border-b border-line">
        <div className="flex items-center gap-3 px-4 sm:px-8 py-3.5">
          <button className="lg:hidden btn-ghost !p-2" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={18} /></button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight leading-tight truncate">{page.title}</h1>
            <p className="text-xs text-sage truncate">{page.sub}</p>
          </div>
          {pathname === "/" && range && (
            <div className="hidden md:flex items-end gap-2">
              <label className="block"><span className="eyebrow block mb-1">From</span>
                <input type="date" className="field !py-1.5 !text-xs w-[138px]" min={range.start} max={filter.end || range.end}
                  value={filter.start} onChange={(e) => setFilter({ ...filter, start: e.target.value })} /></label>
              <label className="block"><span className="eyebrow block mb-1">To</span>
                <input type="date" className="field !py-1.5 !text-xs w-[138px]" min={filter.start || range.start} max={range.end}
                  value={filter.end} onChange={(e) => setFilter({ ...filter, end: e.target.value })} /></label>
              {(filter.start || filter.end) && <button className="btn-ghost !py-1.5 !text-xs" onClick={() => setFilter({ start: "", end: "" })}>Reset</button>}
            </div>
          )}
          <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] text-sage border border-line px-2.5 py-1.5">
            <Database size={12} className={healthError ? "text-danger" : "text-lime"} />
            {range ? `${range.start} → ${range.end}` : "dataset…"}
          </div>
          <div className="hidden xl:flex items-center gap-2 px-2.5 py-1.5 bg-lime text-ink text-[11px] font-bold tracking-wide">
            <Activity size={12} /> COLLEGE MINI-PROJECT
          </div>
        </div>
      </header>
      <main className="px-4 sm:px-8 py-6 sm:py-8 max-w-[1400px]">{children}</main>
    </div>
  );
}
