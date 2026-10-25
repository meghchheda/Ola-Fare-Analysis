import { Eye, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { axisProps, Callout, chartTooltip, DataTag, ErrorBox, Field, Loading, Metric, Panel, SectionTitle, Select, Unavailable } from "../components/ui";
import { api, useApi } from "../lib/api";
import { useApp } from "../lib/app-context";
import { COLORS, inr, int } from "../lib/format";

export default function Anomalies() {
  const { models } = useApp();
  const [status, setStatus] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [sort, setSort] = useState("score");
  const [limit, setLimit] = useState(25);
  const [detail, setDetail] = useState<any>(null);
  const [dErr, setDErr] = useState<string | null>(null);
  const [dLoad, setDLoad] = useState(false);
  const q = new URLSearchParams({ sort, limit: String(limit) });
  if (status) q.set("status", status);
  if (vehicle) q.set("vehicle", vehicle);
  const { data, error, loading, reload } = useApi(`/api/anomalies?${q}`);
  const st = models?.models?.find((m: any) => m.key === "anomaly")?.status;

  const scatter = useMemo(() => ({ flagged: (data?.scatter ?? []).filter((p: any) => p.flagged), normal: (data?.scatter ?? []).filter((p: any) => !p.flagged) }), [data]);

  async function inspect(id: string) {
    setDLoad(true); setDErr(null); setDetail({ booking_id: id });
    try { setDetail(await api(`/api/anomalies/${id}`)); } catch (e: any) { setDErr(e.message); } finally { setDLoad(false); }
  }

  if (models && (!st || st === "Not yet trained")) return <Unavailable title="The anomaly model" command="python -m backend.training.train_anomaly" />;

  return (
    <div className="fade-in space-y-6">
      <div>
        <div className="eyebrow text-danger">Model 05 · anomaly detection</div>
        <h2 className="text-4xl font-extrabold tracking-tight mt-2">Find the rides that stand out.</h2>
        <p className="text-sage mt-2">Explore records that differ from common booking patterns.</p>
      </div>
      {loading && !data && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && (
        <>
          <Callout tone="gold" title="A flag is not an accusation">{data.disclaimer} Isolation Forest, 1% contamination (a review budget, not an estimated fraud rate). Seed stability of the flagged set: Jaccard {data.stability.toFixed(2)}.</Callout>
          <div className="grid lg:grid-cols-12 gap-5">
            <Panel className="lg:col-span-4 p-5 grid grid-cols-1 gap-5 content-start">
              <Metric label="Records analysed" value={int(data.records_analyzed)} />
              <Metric label="Flagged as unusual" value={int(data.flagged)} color={COLORS.coral} sub={`${data.flagged_pct.toFixed(2)}% of records`} />
              <div>
                <div className="eyebrow mb-2">Anomaly score distribution</div>
                <div className="h-[130px]">
                  <ResponsiveContainer><BarChart data={data.histogram}><XAxis dataKey="bin" {...axisProps} tickFormatter={(v) => (+v).toFixed(2)} interval={5} /><Tooltip {...chartTooltip} labelFormatter={(v) => `score ≈ ${(+v).toFixed(3)}`} />
                    <ReferenceLine x={data.histogram.reduce((a: any, b: any) => (Math.abs(b.bin - data.threshold) < Math.abs(a.bin - data.threshold) ? b : a)).bin} stroke={COLORS.coral} />
                    <Bar dataKey="count" fill={COLORS.gold} /></BarChart></ResponsiveContainer>
                </div>
                <div className="text-[11px] text-sage mt-1">Red line: flag threshold. Higher score = more unusual.</div>
              </div>
            </Panel>
            <Panel className="lg:col-span-8">
              <SectionTitle label="Scatter" title="Booking value vs ride distance" aside={<DataTag />} />
              <div className="h-[330px] px-2 pt-4 pb-2">
                <ResponsiveContainer>
                  <ScatterChart margin={{ left: 0, right: 16, bottom: 14 }}>
                    <CartesianGrid stroke={COLORS.line} strokeDasharray="2 6" />
                    <XAxis type="number" dataKey="Ride_Distance" name="Distance" unit=" km" {...axisProps} />
                    <YAxis type="number" dataKey="Booking_Value" name="Value" {...axisProps} width={48} tickFormatter={(v) => "₹" + v} />
                    <ZAxis range={[22, 22]} />
                    <Tooltip {...chartTooltip} cursor={{ strokeDasharray: "3 3" }} />
                    <Scatter name="Typical (sample)" data={scatter.normal} fill={COLORS.sage} fillOpacity={0.28} />
                    <Scatter name="Flagged" data={scatter.flagged} fill={COLORS.coral} fillOpacity={0.9} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <p className="px-5 pb-3 text-[11px] text-sage">Grey: random sample of 2,500 unflagged records. Coral: all flagged records. Zero-distance (unfulfilled) bookings sit at 0 km.</p>
            </Panel>
          </div>

          <Panel>
            <SectionTitle label="Flagged records" title={`${int(data.matching)} matching`} aside={<DataTag kind="model" />} />
            <div className="grid sm:grid-cols-3 gap-4 p-5 border-b border-line/60">
              <Field label="Booking status"><Select value={status} onChange={setStatus} options={data.statuses} placeholder="All statuses" /></Field>
              <Field label="Vehicle"><Select value={vehicle} onChange={setVehicle} options={data.vehicles} placeholder="All vehicles" /></Field>
              <Field label="Sort by"><select className="field" value={sort} onChange={(e) => setSort(e.target.value)}><option value="score">Anomaly score</option><option value="value">Booking value</option><option value="distance">Ride distance</option></select></Field>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] min-w-[900px]">
                <thead><tr className="eyebrow text-left"><th className="px-5 py-3">Booking</th><th className="px-3">Value</th><th className="px-3">Distance</th><th className="px-3">Vehicle</th><th className="px-3">Status</th><th className="px-3">Score</th><th className="px-3">Why unusual</th><th className="px-5" /></tr></thead>
                <tbody>{data.records.map((r: any) => (
                  <tr key={r.Booking_ID} className="border-t border-line/60 hover:bg-ink/40">
                    <td className="px-5 py-2.5 font-mono text-xs">{r.Booking_ID}</td><td className="num px-3">{inr(r.Booking_Value)}</td><td className="num px-3">{r.Ride_Distance} km</td>
                    <td className="px-3">{r.Vehicle_Type}</td><td className="px-3">{r.Booking_Status}</td><td className="num px-3 text-coral">{r.anomaly_score.toFixed(3)}</td>
                    <td className="px-3 text-sage max-w-[300px]">{r.unusual_values}</td>
                    <td className="px-5"><button className="btn-ghost !py-1 !px-2.5 !text-xs" onClick={() => inspect(r.Booking_ID)}><Eye size={12} /> Inspect</button></td>
                  </tr>))}
                  {data.records.length === 0 && <tr><td colSpan={8} className="px-5 py-10 text-center text-sage">No flagged records match these filters.</td></tr>}
                </tbody>
              </table>
            </div>
            {data.records.length < data.matching && <div className="p-4 text-center border-t border-line/60"><button className="btn-ghost" onClick={() => setLimit(limit + 25)}>Show 25 more</button></div>}
          </Panel>
        </>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-label="Record details">
          <button className="flex-1 bg-black/60" aria-label="Close details" onClick={() => setDetail(null)} />
          <aside className="w-full max-w-md bg-ink border-l border-line overflow-y-auto fade-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line"><div><div className="eyebrow">Record details</div><div className="font-mono text-sm mt-0.5">{detail.booking_id}</div></div><button onClick={() => setDetail(null)} aria-label="Close"><X size={18} /></button></div>
            {dLoad && <Loading />}{dErr && <div className="p-5"><ErrorBox message={dErr} /></div>}
            {detail.attributes && (
              <div className="p-5 space-y-4">
                {detail.unusual_values && <Callout tone="coral" title={`Anomaly score ${detail.anomaly_score.toFixed(3)}`}>{detail.unusual_values}</Callout>}
                <dl className="text-[13px]">{Object.entries(detail.attributes).map(([k, v]: any) => (
                  <div key={k} className="flex justify-between gap-4 py-2 border-b border-line/50"><dt className="text-sage">{k.replace(/_/g, " ")}</dt><dd className="num text-right">{v == null ? <span className="text-sage/60">— not recorded</span> : String(v)}</dd></div>))}</dl>
                <p className="text-[11px] text-sage">Customer identifiers are not displayed. Blank values are fields that are only recorded for rides that happened.</p>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
