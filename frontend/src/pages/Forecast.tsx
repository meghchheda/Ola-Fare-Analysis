import { useMemo, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { axisProps, Callout, chartTooltip, DataTag, ErrorBox, Field, Loading, Metric, Panel, SectionTitle, Unavailable } from "../components/ui";
import { useApi } from "../lib/api";
import { useApp } from "../lib/app-context";
import { COLORS, int } from "../lib/format";

export default function Forecast() {
  const { models } = useApp();
  const [horizon, setHorizon] = useState("24");
  const [agg, setAgg] = useState("hourly");
  const [days, setDays] = useState("7");
  const { data, error, loading, reload } = useApi(`/api/forecast?horizon=${horizon}&agg=${agg}&history_days=${days}`);
  const status = models?.models?.find((m: any) => m.key === "forecast")?.status;

  const rows = useMemo(() => {
    if (!data) return [];
    return [
      ...data.history.map((h: any) => ({ t: h.t, actual: h.actual })),
      ...data.forecast.map((f: any) => ({ t: f.t, predicted: f.predicted, range: f.low != null ? [f.low, f.high] : undefined })),
    ];
  }, [data]);

  if (models && (!status || status === "Not yet trained")) return <Unavailable title="The forecast model" command="python -m backend.training.train_forecast" />;
  const res = data?.metrics?.results;
  const firstFc = data?.forecast?.[0]?.t;

  return (
    <div className="fade-in space-y-6">
      <div>
        <div className="eyebrow text-sky">Model 04 · time series</div>
        <h2 className="text-4xl font-extrabold tracking-tight mt-2">See demand before it arrives.</h2>
        <p className="text-sage mt-2">Forecast booking volume and explore historical demand patterns.</p>
      </div>

      <Panel>
        <div className="grid sm:grid-cols-3 gap-4 p-5">
          <Field label="Forecast horizon"><select className="field" value={horizon} onChange={(e) => setHorizon(e.target.value)}><option value="24">Next 24 hours</option><option value="48">Next 48 hours</option><option value="72">Next 72 hours</option></select></Field>
          <Field label="Aggregation"><select className="field" value={agg} onChange={(e) => setAgg(e.target.value)}><option value="hourly">Hourly</option><option value="daily">Daily</option></select></Field>
          <Field label="Historical range"><select className="field" value={days} onChange={(e) => setDays(e.target.value)}>{[3, 7, 14, 31].map((d) => <option key={d} value={d}>Last {d} days</option>)}</select></Field>
        </div>
      </Panel>

      {loading && <Loading label="Running the forecast…" />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && (
        <>
          {data.metrics.beats_all_baselines === false && (
            <Callout tone="gold" title="Demand in this data is close to flat">
              The Random Forest does not meaningfully beat simple historical averages on the final 7 days (see table below). Hourly counts fluctuate randomly around {Math.round(data.mean_hourly_bookings)} bookings per hour with no strong daily or weekly pattern, so the forecast is essentially the typical level.
            </Callout>
          )}
          <Panel>
            <SectionTitle label="Forecast chart" title="Actual bookings and forecast" aside={<div className="flex gap-3"><DataTag /><DataTag kind="model" /></div>} />
            <div className="h-[400px] px-2 pt-5 pb-2" style={{ background: COLORS.deep }}>
              <ResponsiveContainer>
                <ComposedChart data={rows} margin={{ left: 0, right: 16 }}>
                  <CartesianGrid stroke={COLORS.line} strokeDasharray="2 6" vertical={false} />
                  <XAxis dataKey="t" {...axisProps} tickFormatter={(t: string) => (agg === "daily" ? t.slice(5) : t.slice(5, 10) + " " + t.slice(11, 13) + "h")} minTickGap={42} />
                  <YAxis {...axisProps} width={48} domain={agg === "daily" ? [0, "auto"] : [0, "auto"]} />
                  <Tooltip {...chartTooltip} formatter={(v: any, n: string) => (Array.isArray(v) ? [`${int(v[0])} – ${int(v[1])}`, "80% range"] : [int(v), n])} />
                  <Legend wrapperStyle={{ fontSize: 12, color: COLORS.sage }} />
                  <Area dataKey="range" name="80% range (empirical)" stroke="none" fill={COLORS.lime} fillOpacity={0.14} connectNulls={false} />
                  <Line dataKey="actual" name="Actual" stroke={COLORS.sky} strokeWidth={2} dot={false} connectNulls={false} />
                  <Line dataKey="predicted" name="Forecast" stroke={COLORS.lime} strokeWidth={2.5} strokeDasharray="5 4" dot={false} connectNulls={false} />
                  {firstFc && <ReferenceLine x={firstFc} stroke={COLORS.gold} strokeDasharray="3 3" label={{ value: "forecast starts", fill: COLORS.gold, fontSize: 11, position: "insideTopRight" }} />}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            {data.note && <p className="px-5 py-3 text-[11px] text-sage">{data.note}</p>}
          </Panel>

          <div className="grid lg:grid-cols-12 gap-5">
            <Panel className="lg:col-span-5 p-5 grid grid-cols-2 gap-5">
              <Metric label="Predicted bookings" value={int(data.summary.total)} color={COLORS.lime} sub={`next ${data.horizon_hours} h`} />
              <Metric label="Avg per hour" value={data.summary.average_per_hour.toFixed(0)} />
              <Metric label="Expected peak" value={<span className="text-lg">{data.summary.peak_interval}</span>} sub={`≈ ${data.summary.peak_value.toFixed(0)} bookings`} />
              <Metric label="History available" value={`${data.history_range.days} days`} color={COLORS.sky} sub="1–31 July 2024 only" />
            </Panel>
            <Panel className="lg:col-span-7">
              <SectionTitle label="Chronological test · last 7 days" title="Model vs baselines" aside={<DataTag kind="model" />} />
              <table className="w-full text-sm">
                <thead><tr className="eyebrow text-left"><th className="px-5 py-2.5">Method</th><th className="px-3">MAE</th><th className="px-5">RMSE</th></tr></thead>
                <tbody>{Object.entries(res).map(([k, r]: any) => (
                  <tr key={k} className={`border-t border-line/60 ${k.startsWith("Random") ? "text-lime" : ""}`}><td className="px-5 py-2.5">{k}</td><td className="num px-3">{r.mae.toFixed(2)}</td><td className="num px-5">{r.rmse.toFixed(2)}</td></tr>))}</tbody>
              </table>
              <p className="px-5 py-3 text-[11px] text-sage border-t border-line/60">Trained on days 1–24, tested on days 25–31 with rolling 24-hour recursive forecasts. Lower is better. The shaded range is an approximate empirical interval, not a formal guarantee.</p>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
