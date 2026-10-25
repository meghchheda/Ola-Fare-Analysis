import { ArrowRight, ArrowUpRight, TrendingDown, TrendingUp } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import RouteArt from "../components/RouteArt";
import { axisProps, chartTooltip, DataTag, ErrorBox, Loading, Panel, SectionTitle, StatusBadge } from "../components/ui";
import { useApi } from "../lib/api";
import { useApp } from "../lib/app-context";
import { COLORS, compact, inr, int, pct, SERIES, STATUS_COLORS } from "../lib/format";

const MODELS = [
  { key: "cancellation", to: "/cancellation", name: "Cancellation Predictor", q: "Will this ride happen?", color: COLORS.coral, kind: "Classification", span: "lg:col-span-7" },
  { key: "fare", to: "/fare", name: "Fare Estimator", q: "What should it cost?", color: COLORS.sky, kind: "Regression", span: "lg:col-span-5" },
  { key: "segmentation", to: "/segments", name: "Customer Segments", q: "Who rides how?", color: COLORS.gold, kind: "Clustering", span: "lg:col-span-4" },
  { key: "forecast", to: "/forecast", name: "Demand Forecast", q: "What comes next?", color: COLORS.lime, kind: "Time series", span: "lg:col-span-4" },
  { key: "anomaly", to: "/anomalies", name: "Anomaly Explorer", q: "What stands out?", color: COLORS.danger, kind: "Anomaly detection", span: "lg:col-span-4" },
];
const BLURB: Record<string, string> = {
  cancellation: "Estimate how likely a booking is to be cancelled or left without a driver, from booking-time signals only.",
  fare: "Explore how distance, route and time relate to booking value, benchmarked against simple baselines.",
  segmentation: "K-Means groups of repeat riders by frequency, value, distance and reliability.",
  forecast: "Hourly booking volume with a chronological test and a historical-average baseline.",
  anomaly: "Isolation Forest flags unusual records for review. A flag is not proof of misconduct.",
};

function Kpi({ label, value, sub, trend }: { label: string; value: string; sub?: string; trend?: number | null }) {
  return (
    <div className="px-5 py-4 border-r border-line/70 last:border-r-0 min-w-[170px]">
      <div className="eyebrow">{label}</div>
      <div className="num text-[28px] font-bold leading-none mt-2">{value}</div>
      <div className="flex items-center gap-2 mt-2 text-xs text-sage">
        {trend != null && (
          <span className={`inline-flex items-center gap-0.5 num ${trend >= 0 ? "text-lime" : "text-coral"}`}>
            {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {pct(Math.abs(trend))}
          </span>
        )}
        {sub}
      </div>
    </div>
  );
}

function BarList({ rows, color }: { rows: { name: string; count: number }[]; color: string }) {
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <ul className="px-5 py-4 space-y-2.5">
      {rows.map((r) => (
        <li key={r.name} className="text-[13px]">
          <div className="flex justify-between mb-1"><span className="truncate pr-2">{r.name}</span><span className="num text-sage">{int(r.count)}</span></div>
          <div className="h-1.5 bg-ink"><div className="h-full" style={{ width: `${(r.count / max) * 100}%`, background: color }} /></div>
        </li>
      ))}
    </ul>
  );
}

export default function Overview() {
  const nav = useNavigate();
  const { filter, config, models } = useApp();
  const q = new URLSearchParams();
  if (filter.start) q.set("start", filter.start);
  if (filter.end) q.set("end", filter.end);
  const { data, error, loading, reload } = useApi(`/api/overview${q.toString() ? "?" + q : ""}`);

  const openBI = () => (config?.power_bi_url ? window.open(config.power_bi_url, "_blank", "noopener") : nav("/power-bi"));
  const statusOf = (k: string) => models?.models?.find((m: any) => m.key === k)?.status ?? "Checking…";

  return (
    <div className="space-y-8 fade-in">
      <section className="grid lg:grid-cols-12 gap-0 border border-line bg-ink/60 overflow-hidden">
        <div className="lg:col-span-6 p-7 sm:p-10 flex flex-col justify-center">
          <div className="eyebrow text-lime">Ride analytics & machine learning</div>
          <h2 className="text-4xl sm:text-5xl xl:text-[56px] font-extrabold tracking-tight leading-[1.02] mt-4">Every ride tells a story.</h2>
          <p className="text-sage text-[15px] leading-relaxed mt-5 max-w-md">
            Explore booking patterns, understand cancellations, estimate fares, and uncover the signals behind urban mobility.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <button className="btn-lime" onClick={() => document.getElementById("models")?.scrollIntoView({ behavior: "smooth" })}>Explore ML Models <ArrowRight size={16} /></button>
            <button className="btn-ghost" onClick={openBI}>Open Power BI Dashboard <ArrowUpRight size={16} /></button>
          </div>
        </div>
        <div className="lg:col-span-6 min-h-[260px] border-t lg:border-t-0 lg:border-l border-line"><RouteArt /></div>
      </section>

      {loading && <Loading label="Computing metrics from the dataset…" />}
      {error && <ErrorBox message={error} onRetry={reload} />}

      {data && (
        <>
          <Panel className="overflow-x-auto">
            <div className="flex min-w-max sm:min-w-0 sm:grid sm:grid-cols-5">
              <Kpi label="Total bookings" value={int(data.kpis.total_bookings)} trend={data.trend?.total_bookings} sub={data.trend ? "vs prior period" : `${data.range.start} → ${data.range.end}`} />
              <Kpi label="Successful rides" value={int(data.kpis.successful_rides)} trend={data.trend?.successful_rides} sub={pct(data.kpis.successful_rides / data.kpis.total_bookings) + " of bookings"} />
              <Kpi label="Cancellation rate" value={pct(data.kpis.cancellation_rate)} trend={data.trend?.cancellation_rate} sub={`${pct(data.kpis.unfulfilled_rate)} incl. no driver`} />
              <Kpi label="Successful booking value" value={"₹" + compact(data.kpis.successful_booking_value)} trend={data.trend?.successful_booking_value} sub={inr(data.kpis.successful_booking_value)} />
              <Kpi label="Avg ride distance" value={`${data.kpis.avg_ride_distance.toFixed(1)} km`} trend={data.trend?.avg_ride_distance} sub="successful rides" />
            </div>
          </Panel>
          {!data.trend && <p className="-mt-5 text-[11px] text-sage font-mono">No trend arrows: no equally long earlier period exists in this dataset for the selected range.</p>}

          <div className="grid lg:grid-cols-12 gap-5">
            <Panel className="lg:col-span-8">
              <SectionTitle label="Booking volume" title="Bookings per day" aside={<DataTag />} />
              <div className="h-[290px] px-2 pt-4 pb-2">
                <ResponsiveContainer>
                  <AreaChart data={data.daily} margin={{ left: 0, right: 16 }}>
                    <defs>
                      <linearGradient id="gb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COLORS.sky} stopOpacity={0.45} /><stop offset="100%" stopColor={COLORS.sky} stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid stroke={COLORS.line} strokeDasharray="2 6" vertical={false} />
                    <XAxis dataKey="day" {...axisProps} tickFormatter={(d) => d.slice(8)} interval={2} />
                    <YAxis {...axisProps} width={44} domain={[0, "auto"]} />
                    <Tooltip {...chartTooltip} />
                    <Area type="monotone" dataKey="bookings" name="All bookings" stroke={COLORS.sky} strokeWidth={2} fill="url(#gb)" />
                    <Area type="monotone" dataKey="successful" name="Successful" stroke={COLORS.lime} strokeWidth={2} fill="none" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel className="lg:col-span-4">
              <SectionTitle label="Outcome" title="Booking status" aside={<DataTag />} />
              <div className="px-5 py-5 space-y-4">
                <div className="flex h-5 overflow-hidden">
                  {data.status.map((s: any) => <div key={s.name} title={s.name} style={{ width: `${(s.count / data.kpis.total_bookings) * 100}%`, background: STATUS_COLORS[s.name] ?? COLORS.sage }} />)}
                </div>
                {data.status.map((s: any) => (
                  <div key={s.name} className="flex items-center justify-between text-[13px]">
                    <span className="flex items-center gap-2"><i className="w-2.5 h-2.5 inline-block" style={{ background: STATUS_COLORS[s.name] ?? COLORS.sage }} />{s.name}</span>
                    <span className="num text-sage">{int(s.count)} · {pct(s.count / data.kpis.total_bookings)}</span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel className="lg:col-span-5">
              <SectionTitle label="Fleet" title="Bookings by vehicle category" aside={<DataTag />} />
              <div className="h-[260px] px-2 pt-4 pb-2">
                <ResponsiveContainer>
                  <BarChart data={data.vehicles} layout="vertical" margin={{ left: 8, right: 20 }}>
                    <CartesianGrid stroke={COLORS.line} strokeDasharray="2 6" horizontal={false} />
                    <XAxis type="number" {...axisProps} />
                    <YAxis type="category" dataKey="name" {...axisProps} width={84} />
                    <Tooltip {...chartTooltip} />
                    <Bar dataKey="count" name="Bookings" radius={0}>{data.vehicles.map((_: any, i: number) => <Cell key={i} fill={SERIES[i % SERIES.length]} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel className="lg:col-span-4">
              <SectionTitle label="Payments" title="Payment method" aside={<DataTag />} />
              <div className="px-5 pt-3 text-[11px] text-sage">Successful rides only — payment is not recorded otherwise.</div>
              <div className="h-[225px] px-2 pb-2">
                <ResponsiveContainer>
                  <BarChart data={data.payments} margin={{ left: 0, right: 12, top: 12 }}>
                    <CartesianGrid stroke={COLORS.line} strokeDasharray="2 6" vertical={false} />
                    <XAxis dataKey="name" {...axisProps} />
                    <YAxis {...axisProps} width={44} />
                    <Tooltip {...chartTooltip} />
                    <Bar dataKey="count" name="Rides" fill={COLORS.gold}>{data.payments.map((_: any, i: number) => <Cell key={i} fill={[COLORS.lime, COLORS.sky, COLORS.gold, COLORS.coral][i % 4]} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel className="lg:col-span-3">
              <SectionTitle label="Rhythm" title="By hour of day" aside={<DataTag />} />
              <div className="h-[260px] px-1 pt-4">
                <ResponsiveContainer>
                  <BarChart data={data.hourly} margin={{ left: 0, right: 8 }}>
                    <XAxis dataKey="hour" {...axisProps} interval={5} />
                    <Tooltip {...chartTooltip} labelFormatter={(h) => `${h}:00`} />
                    <Bar dataKey="bookings" fill={COLORS.coral} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel className="lg:col-span-6">
              <SectionTitle label="Geography" title="Top pickup areas" aside={<DataTag />} />
              <BarList rows={data.top_pickups} color={COLORS.lime} />
            </Panel>
            <Panel className="lg:col-span-6">
              <SectionTitle label="Geography" title="Top drop-off areas" aside={<DataTag />} />
              <BarList rows={data.top_drops} color={COLORS.sky} />
            </Panel>
          </div>
        </>
      )}

      <section id="models" className="scroll-mt-24">
        <div className="eyebrow">Machine learning</div>
        <h2 className="text-2xl font-extrabold tracking-tight mt-1 mb-4">Five models, one dataset</h2>
        <div className="grid lg:grid-cols-12 gap-4">
          {MODELS.map((m, i) => (
            <Link key={m.key} to={m.to} className={`${m.span} group panel p-5 flex flex-col justify-between hover:bg-teal-deep transition-colors`} style={{ borderLeft: `4px solid ${m.color}` }}>
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px]" style={{ color: m.color }}>MODEL {String(i + 1).padStart(2, "0")} · {m.kind.toUpperCase()}</span>
                  <StatusBadge status={statusOf(m.key)} />
                </div>
                <div className={`font-extrabold mt-3 ${i === 0 ? "text-3xl" : "text-xl"}`}>{m.q}</div>
                <div className="text-sm text-sage mt-1">{m.name}</div>
                <p className="text-[13px] text-ivory/80 mt-3 max-w-md">{BLURB[m.key]}</p>
              </div>
              <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold group-hover:gap-3 transition-all" style={{ color: m.color }}>Open Model <ArrowRight size={15} /></div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
