import { Info, Loader2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { FactorBars, hourLabel } from "../components/shared";
import { Callout, DataTag, ErrorBox, Field, Loading, Metric, Panel, SectionTitle, Select, Unavailable } from "../components/ui";
import { post, useApi } from "../lib/api";
import { useApp } from "../lib/app-context";
import { COLORS, fix, inr } from "../lib/format";

export default function Fare() {
  const { models } = useApp();
  const opts = useApi("/api/options");
  const perf = useApi("/api/models/performance");
  const status = models?.models?.find((m: any) => m.key === "fare")?.status;
  const [f, setF] = useState({ vehicle_type: "", pickup_location: "", drop_location: "", distance_km: "12", hour: "9", day_of_week: "0", day_of_month: "15" });
  const [res, setRes] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const valid = f.vehicle_type && f.pickup_location && f.drop_location && +f.distance_km >= 1;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      setRes(await post("/api/predict/fare", { vehicle_type: f.vehicle_type, pickup_location: f.pickup_location, drop_location: f.drop_location,
        distance_km: +f.distance_km, hour: +f.hour, day_of_week: +f.day_of_week, day_of_month: +f.day_of_month }));
    } catch (x: any) { setErr(x.message); setRes(null); } finally { setBusy(false); }
  }

  const m = perf.data?.fare;
  if (opts.loading) return <Loading />;
  if (opts.error) return <ErrorBox message={opts.error} onRetry={opts.reload} />;
  if (models && (!status || status === "Not yet trained")) return <Unavailable title="The fare model" command="python -m backend.training.train_fare" />;
  const [dmin, dmax] = opts.data.distance_range;

  return (
    <div className="fade-in space-y-6">
      <div>
        <div className="eyebrow text-sky">Model 02 · regression</div>
        <h2 className="text-4xl font-extrabold tracking-tight mt-2">Estimate the ride before it starts.</h2>
        <p className="text-sage mt-2">Explore how ride characteristics relate to booking value.</p>
      </div>

      {m && m.defensible_estimate === false && (
        <Callout tone="gold" title="Read this before using the estimate">
          In this dataset booking value is almost unrelated to distance (correlation {fix(m.distance_corr_with_value)}), vehicle type or time. The trained models do not beat a simple average
          (R² ≈ {fix(m.results[m.selected_model].r2)}). The figure below is therefore <b>not a defensible fare quote</b>; it demonstrates the full pipeline and shows what the data can and cannot support.
        </Callout>
      )}

      <div className="grid lg:grid-cols-12 gap-5">
        <form onSubmit={submit} className="lg:col-span-5 panel">
          <SectionTitle label="Ride inputs" title="Describe the trip" />
          <div className="p-5 space-y-4">
            <Field label="Vehicle category"><Select value={f.vehicle_type} onChange={set("vehicle_type")} options={opts.data.vehicle_types} placeholder="Select a vehicle" /></Field>
            <Field label="Pickup location"><Select value={f.pickup_location} onChange={set("pickup_location")} options={opts.data.locations} placeholder="Select pickup" /></Field>
            <Field label="Drop-off location"><Select value={f.drop_location} onChange={set("drop_location")} options={opts.data.locations} placeholder="Select drop-off" /></Field>
            <Field label={`Estimated distance: ${f.distance_km} km`} hint="Route distance known at booking time.">
              <input type="range" min={dmin} max={dmax} value={f.distance_km} onChange={(e) => set("distance_km")(e.target.value)} className="w-full accent-lime" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Booking time"><select className="field" value={f.hour} onChange={(e) => set("hour")(e.target.value)}>{Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{hourLabel(i)}</option>)}</select></Field>
              <Field label="Day of week"><select className="field" value={f.day_of_week} onChange={(e) => set("day_of_week")(e.target.value)}>{opts.data.days.map((d: string, i: number) => <option key={d} value={i}>{d}</option>)}</select></Field>
            </div>
            <Field label="Day of month"><input type="number" min={1} max={31} className="field" value={f.day_of_month} onChange={(e) => set("day_of_month")(e.target.value)} /></Field>
            <button className="btn-lime w-full" disabled={!valid || busy}>{busy && <Loader2 size={15} className="animate-spin" />} Estimate Booking Value</button>
            <p className="text-[11px] text-sage flex gap-2"><Info size={13} className="shrink-0 mt-0.5" />Trained on completed rides. Cancelled bookings have no distance, so they are excluded.</p>
          </div>
        </form>

        <div className="lg:col-span-7 space-y-5">
          {err && <ErrorBox message={err} />}
          <Panel>
            <SectionTitle label="Estimate" title="Predicted booking value" aside={res ? <DataTag kind="model" /> : undefined} />
            {!res ? <div className="p-10 text-center text-sage text-sm">Enter ride details to request an estimate from the trained model.</div> : (
              <div className="p-5 space-y-6">
                <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
                  <div>
                    <div className="eyebrow">Model estimate</div>
                    <div className="num text-6xl font-extrabold text-lime leading-none mt-2">{inr(res.predicted_fare)}</div>
                  </div>
                  <div className="pb-1">
                    <div className="eyebrow">{Math.round(res.interval.level * 100)}% empirical range</div>
                    <div className="num text-xl font-bold mt-1">{inr(res.interval.low)} – {inr(res.interval.high)}</div>
                    <div className="text-[11px] text-sage mt-1 max-w-xs">{res.interval.method}. Covered {Math.round(res.interval.test_coverage * 100)}% of held-out rides.</div>
                  </div>
                </div>
                {res.warning && <Callout tone="coral" title="Not a fare quote">{res.warning}</Callout>}
                <div className="grid sm:grid-cols-3 gap-4 border-t border-line/70 pt-4">
                  <Metric label="Baseline (vehicle avg)" value={inr(res.baseline_fare)} sub={`model − baseline: ${inr(res.predicted_fare - res.baseline_fare)}`} />
                  <Metric label="Model" value={<span className="text-base font-bold">{res.model}</span>} />
                  <Metric label="Version" value={<span className="text-base font-bold">{res.model_version}</span>} />
                </div>
                <div>
                  <div className="eyebrow mb-3">Feature breakdown</div>
                  <FactorBars factors={res.factors} unit="" accent={COLORS.sky} digits={0} />
                  <p className="text-[11px] text-sage mt-3">₹ shift versus averaging that input over all its values. Small bars mean the input barely matters to the model.</p>
                </div>
              </div>
            )}
          </Panel>

          {m && (
            <Panel flat>
              <SectionTitle label="Held-out test metrics" title="Models vs baselines" aside={<DataTag kind="model" />} />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="eyebrow text-left"><th className="px-5 py-2.5">Model</th><th className="px-3">MAE (₹)</th><th className="px-3">RMSE (₹)</th><th className="px-5">R²</th></tr></thead>
                  <tbody>{Object.entries(m.results).map(([name, r]: any) => (
                    <tr key={name} className={`border-t border-line/60 ${name === m.selected_model ? "text-lime" : ""}`}>
                      <td className="px-5 py-2.5">{name}{name === m.selected_model && " ★"}</td><td className="num px-3">{r.mae.toFixed(1)}</td><td className="num px-3">{r.rmse.toFixed(1)}</td><td className="num px-5">{r.r2.toFixed(4)}</td>
                    </tr>))}</tbody>
                </table>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
