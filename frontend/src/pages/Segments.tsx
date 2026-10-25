import { useMemo, useState } from "react";
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { axisProps, Callout, DataTag, ErrorBox, Field, Loading, Metric, Panel, SectionTitle, Select, Unavailable } from "../components/ui";
import { useApi } from "../lib/api";
import { useApp } from "../lib/app-context";
import { COLORS, fix, inr, int, pct, SERIES } from "../lib/format";

const COLS: { key: string; label: string; fmt: (v: number) => string }[] = [
  { key: "customers", label: "Customers", fmt: int },
  { key: "avg_bookings", label: "Avg bookings", fmt: (v) => v.toFixed(2) },
  { key: "avg_value", label: "Avg successful value", fmt: (v) => inr(v) },
  { key: "avg_distance", label: "Avg distance (km)", fmt: (v) => v.toFixed(1) },
  { key: "unfulfilled_rate", label: "Unfulfilled rate", fmt: (v) => pct(v) },
  { key: "avg_hour", label: "Avg booking hour", fmt: (v) => v.toFixed(1) },
];

// Axes the scatter can show. Discrete fields get a small visual jitter so overlapping customers stay visible
// (positions shown in the tooltip are the true, un-jittered values).
const AXES: Record<string, { label: string; jitter?: number }> = {
  avg_distance: { label: "Avg distance (km)", jitter: 0.5 },
  avg_value: { label: "Avg successful booking value (₹)" },
  unfulfilled_rate: { label: "Unfulfilled rate", jitter: 0.05 },
  n_bookings: { label: "Number of bookings", jitter: 0.22 },
  pc1: { label: "PCA component 1 (scaled features)" },
  pc2: { label: "PCA component 2 (scaled features)" },
};

export default function Segments() {
  const { models } = useApp();
  const [cluster, setCluster] = useState("");
  const [minB, setMinB] = useState("2");
  const [vehicle, setVehicle] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const q = new URLSearchParams({ min_bookings: minB || "2" });
  if (cluster) q.set("cluster", cluster);
  if (vehicle) q.set("vehicle", vehicle);
  if (from) q.set("first_booking_from", from);
  if (to) q.set("first_booking_to", to);
  const { data, error, loading, reload } = useApi(`/api/segments?${q}`);
  const status = models?.models?.find((m: any) => m.key === "segmentation")?.status;

  const [xa, setXa] = useState("avg_distance");
  const [ya, setYa] = useState("avg_value");
  const groups = useMemo(() => {
    const g: Record<number, any[]> = {};
    const rnd = (i: number, k: number) => ((((i + 1) * 9301 + k * 49297) % 233280) / 233280) - 0.5; // deterministic jitter
    (data?.points ?? []).forEach((p: any, i: number) => {
      const X = p[xa] + rnd(i, 1) * 2 * (AXES[xa].jitter ?? 0);
      const Y = p[ya] + rnd(i, 2) * 2 * (AXES[ya].jitter ?? 0);
      (g[p.cluster] ||= []).push({ ...p, X, Y });
    });
    return g;
  }, [data, xa, ya]);
  const names: Record<number, string> = useMemo(() => Object.fromEntries((data?.profiles ?? []).map((p: any) => [p.cluster, p.segment])), [data]);
  const maxes = useMemo(() => Object.fromEntries(COLS.map((c) => [c.key, Math.max(...(data?.profiles ?? [{ [c.key]: 1 }]).map((p: any) => p[c.key]), 1e-9)])), [data]);

  if (models && (!status || status === "Not yet trained")) return <Unavailable title="Customer segmentation" command="python -m backend.training.train_segmentation" />;

  return (
    <div className="fade-in space-y-6">
      <div>
        <div className="eyebrow text-gold">Model 03 · clustering</div>
        <h2 className="text-4xl font-extrabold tracking-tight mt-2">Not every rider behaves the same.</h2>
        <p className="text-sage mt-2">Discover customer patterns hidden inside historical booking activity.</p>
      </div>

      <Panel>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 p-5">
          <Field label="Segment"><select className="field" value={cluster} onChange={(e) => setCluster(e.target.value)}><option value="">All segments</option>{(data?.profiles ?? []).map((p: any) => <option key={p.cluster} value={p.cluster}>{p.segment}</option>)}</select></Field>
          <Field label="Minimum bookings" hint="Model was trained on ≥ 2."><input type="number" min={2} max={20} className="field" value={minB} onChange={(e) => setMinB(e.target.value)} /></Field>
          <Field label="Most-used vehicle"><Select value={vehicle} onChange={setVehicle} options={data?.vehicles ?? []} placeholder="Any vehicle" /></Field>
          <Field label="First booking from"><input type="date" className="field" min="2024-07-01" max="2024-07-31" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="First booking to"><input type="date" className="field" min="2024-07-01" max="2024-07-31" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>
      </Panel>

      {loading && <Loading label="Loading segments…" />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && (
        <>
          <div className="grid lg:grid-cols-12 gap-5">
            <Panel className="lg:col-span-8">
              <SectionTitle label="Cluster map" title="Customers, coloured by segment" aside={<DataTag kind="model" />} />
              <div className="grid grid-cols-2 gap-4 px-5 pt-4">
                <Field label="X axis"><select className="field" value={xa} onChange={(e) => setXa(e.target.value)}>{Object.entries(AXES).map(([k, a]) => <option key={k} value={k}>{a.label}</option>)}</select></Field>
                <Field label="Y axis"><select className="field" value={ya} onChange={(e) => setYa(e.target.value)}>{Object.entries(AXES).map(([k, a]) => <option key={k} value={k}>{a.label}</option>)}</select></Field>
              </div>
              <div className="h-[400px] px-2 pt-4">
                <ResponsiveContainer>
                  <ScatterChart margin={{ left: 0, right: 16, bottom: 18 }}>
                    <CartesianGrid stroke={COLORS.line} strokeDasharray="2 6" />
                    <XAxis type="number" dataKey="X" name={AXES[xa].label} domain={["auto", "auto"]} {...axisProps} tickFormatter={(v) => (+v).toFixed(xa === "unfulfilled_rate" ? 1 : 0)} label={{ value: AXES[xa].label + (xa.startsWith("pc") ? ` (${pct(data.pca_explained_variance[+xa.slice(2) - 1], 0)} of variance)` : ""), position: "insideBottom", offset: -10, fill: "#A8BDB3", fontSize: 11 }} />
                    <YAxis type="number" dataKey="Y" name={AXES[ya].label} domain={["auto", "auto"]} {...axisProps} width={64} tickFormatter={(v) => (+v).toFixed(ya === "unfulfilled_rate" ? 1 : 0)} label={{ value: AXES[ya].label, angle: -90, position: "insideLeft", offset: -4, fill: "#A8BDB3", fontSize: 11 }} />
                    <ZAxis range={[26, 26]} />
                    <Tooltip cursor={{ strokeDasharray: "3 3", stroke: COLORS.sage }} content={({ payload }) => {
                      const p: any = payload?.[0]?.payload; if (!p) return null;
                      return <div className="bg-ink border border-line px-3 py-2 text-xs space-y-0.5"><b style={{ color: SERIES[p.cluster % SERIES.length] }}>{p.segment}</b>
                        <div>Bookings: <span className="num">{p.n_bookings}</span></div><div>Avg value: <span className="num">{inr(p.avg_value)}</span></div>
                        <div>Avg distance: <span className="num">{p.avg_distance.toFixed(1)} km</span></div><div>Unfulfilled: <span className="num">{pct(p.unfulfilled_rate, 0)}</span></div></div>;
                    }} />
                    {Object.entries(groups).map(([c, pts]) => <Scatter key={c} name={names[+c]} data={pts} fill={SERIES[+c % SERIES.length]} fillOpacity={0.6} />)}
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div className="px-5 pb-4 flex flex-wrap gap-x-5 gap-y-1.5">
                <span className="w-full text-[11px] text-sage">Discrete fields (bookings, unfulfilled rate) are jittered slightly so points don't stack; tooltips show true values. PCA axes are for visualisation only.</span>
                {(data.profiles as any[]).map((p) => <span key={p.cluster} className="text-xs flex items-center gap-1.5"><i className="w-2.5 h-2.5 inline-block rounded-full" style={{ background: SERIES[p.cluster % SERIES.length] }} />{p.segment}</span>)}
              </div>
            </Panel>
            <div className="lg:col-span-4 space-y-5">
              <Panel className="p-5 grid grid-cols-2 gap-5">
                <Metric label="Clusters (k)" value={data.k} color={COLORS.gold} sub="best silhouette, k=2–8" />
                <Metric label="Silhouette" value={fix(data.silhouette)} sub="0.31 ≈ overlapping groups" />
                <Metric label="In view" value={int(data.customers_in_view)} sub={`of ${int(data.customers_clustered)} clustered`} />
                <Metric label="All customers" value={int(data.customers_total)} sub="most book only once" />
              </Panel>
              <Panel>
                <SectionTitle label="Cluster sizes" />
                <ul className="p-5 space-y-3">{(data.profiles as any[]).map((p) => (
                  <li key={p.cluster} className="text-[13px]"><div className="flex justify-between mb-1"><span>{p.segment}</span><span className="num text-sage">{int(p.customers)}</span></div>
                    <div className="h-1.5 bg-ink"><div className="h-full" style={{ width: `${(p.customers / Math.max(...data.profiles.map((x: any) => x.customers))) * 100}%`, background: SERIES[p.cluster % SERIES.length] }} /></div></li>))}</ul>
              </Panel>
            </div>
          </div>

          <Panel>
            <SectionTitle label="Cluster profiles" title="How the segments differ" aside={<DataTag kind="model" />} />
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[760px]">
                <thead><tr className="eyebrow text-left"><th className="px-5 py-3">Segment</th>{COLS.map((c) => <th key={c.key} className="px-3">{c.label}</th>)}</tr></thead>
                <tbody>{(data.profiles as any[]).map((p) => (
                  <tr key={p.cluster} className="border-t border-line/60">
                    <td className="px-5 py-3 font-semibold whitespace-nowrap"><i className="inline-block w-2.5 h-2.5 mr-2 rounded-full" style={{ background: SERIES[p.cluster % SERIES.length] }} />{p.segment}</td>
                    {COLS.map((c) => <td key={c.key} className="px-3 py-2"><div className="num">{c.fmt(p[c.key])}</div><div className="h-1 bg-ink mt-1 w-24"><div className="h-full" style={{ width: `${(p[c.key] / maxes[c.key]) * 100}%`, background: SERIES[p.cluster % SERIES.length], opacity: 0.8 }} /></div></td>)}
                  </tr>))}</tbody>
              </table>
            </div>
          </Panel>
          <Callout tone="gold" title="How to read these segments">
            {(data.notes as string[]).map((n, i) => <div key={i}>• {n}</div>)}
            <div>• The date filter selects customers by their <b>first booking date</b>; it does not recompute the clusters.</div>
          </Callout>
        </>
      )}
    </div>
  );
}
