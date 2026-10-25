import { Info, Loader2, ShieldAlert } from "lucide-react";
import { FormEvent, useState } from "react";
import { FactorBars, hourLabel } from "../components/shared";
import { Callout, DataTag, ErrorBox, Field, Loading, Metric, Panel, SectionTitle, Select, Unavailable } from "../components/ui";
import { post, useApi } from "../lib/api";
import { useApp } from "../lib/app-context";
import { COLORS, fix, pct } from "../lib/format";

export default function Cancellation() {
  const { models } = useApp();
  const opts = useApi("/api/options");
  const perf = useApi("/api/models/performance");
  const status = models?.models?.find((m: any) => m.key === "cancellation")?.status;
  const trained = status && status !== "Not yet trained";

  const [f, setF] = useState({ vehicle_type: "", pickup_location: "", drop_location: "", hour: "9", day_of_week: "0", day_of_month: "15" });
  const [res, setRes] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const valid = f.vehicle_type && f.pickup_location && f.drop_location;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      setRes(await post("/api/predict/cancellation", { vehicle_type: f.vehicle_type, pickup_location: f.pickup_location, drop_location: f.drop_location,
        hour: +f.hour, day_of_week: +f.day_of_week, day_of_month: +f.day_of_month }));
    } catch (x: any) { setErr(x.message); setRes(null); } finally { setBusy(false); }
  }

  const m = perf.data?.cancellation;
  const sel = m?.results?.[m?.selected_model]?.test;
  const riskColor = res ? (res.risk_category === "Elevated" ? COLORS.coral : res.risk_category === "Typical" ? COLORS.gold : COLORS.lime) : COLORS.coral;

  if (opts.loading) return <Loading />;
  if (opts.error) return <ErrorBox message={opts.error} onRetry={opts.reload} />;
  if (models && !trained) return <Unavailable title="The cancellation model" command="python -m backend.training.train_cancellation" />;

  return (
    <div className="fade-in space-y-6">
      <div>
        <div className="eyebrow text-coral">Model 01 · classification</div>
        <h2 className="text-4xl font-extrabold tracking-tight mt-2">Will this ride happen?</h2>
        <p className="text-sage mt-2">Estimate cancellation risk using historical booking patterns.</p>
      </div>

      <div className="grid lg:grid-cols-12 gap-5">
        <form onSubmit={submit} className="lg:col-span-5 panel">
          <SectionTitle label="Booking inputs" title="Describe the booking" />
          <div className="p-5 space-y-4">
            <Field label="Vehicle type"><Select value={f.vehicle_type} onChange={set("vehicle_type")} options={opts.data.vehicle_types} placeholder="Select a vehicle" /></Field>
            <Field label="Pickup location"><Select value={f.pickup_location} onChange={set("pickup_location")} options={opts.data.locations} placeholder="Select pickup" /></Field>
            <Field label="Drop-off location"><Select value={f.drop_location} onChange={set("drop_location")} options={opts.data.locations} placeholder="Select drop-off" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Booking hour"><select className="field" value={f.hour} onChange={(e) => set("hour")(e.target.value)}>{Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{hourLabel(i)}</option>)}</select></Field>
              <Field label="Day of week"><select className="field" value={f.day_of_week} onChange={(e) => set("day_of_week")(e.target.value)}>{opts.data.days.map((d: string, i: number) => <option key={d} value={i}>{d}</option>)}</select></Field>
            </div>
            <Field label="Day of month" hint="A calendar feature the model was trained with (1–31)."><input type="number" min={1} max={31} className="field" value={f.day_of_month} onChange={(e) => set("day_of_month")(e.target.value)} /></Field>
            <button className="btn-coral w-full" disabled={!valid || busy}>{busy && <Loader2 size={15} className="animate-spin" />} Assess Cancellation Risk</button>
            <p className="text-[11px] text-sage flex gap-2"><Info size={13} className="shrink-0 mt-0.5" />Only information known at booking time is used. Distance, ratings, reasons and payment are excluded to prevent leakage.</p>
          </div>
        </form>

        <div className="lg:col-span-7 space-y-5">
          {err && <ErrorBox message={err} />}
          <Panel>
            <SectionTitle label="Prediction" title="Result" aside={res ? <DataTag kind="model" /> : undefined} />
            {!res ? (
              <div className="p-10 text-center text-sage text-sm">Fill in the booking details and assess the risk. Nothing is shown until the trained model returns a result.</div>
            ) : (
              <div className="p-5 space-y-6">
                <div>
                  <div className="flex items-end justify-between mb-2">
                    <Metric label="Estimated cancellation probability" value={pct(res.probability)} color={riskColor} big />
                    <div className="text-right"><div className="eyebrow">Risk category</div><div className="font-bold text-lg" style={{ color: riskColor }}>{res.risk_category}</div></div>
                  </div>
                  <div className="relative h-4 bg-ink">
                    <div className="h-full transition-all duration-500" style={{ width: `${res.probability * 100}%`, background: `linear-gradient(90deg, ${COLORS.lime}, ${COLORS.gold} 55%, ${COLORS.coral})`, backgroundSize: `${100 / Math.max(res.probability, 0.05)}% 100%` }} />
                    <div className="absolute -top-1 -bottom-1 w-0.5 bg-ivory" style={{ left: `${res.threshold * 100}%` }} title="Decision threshold" />
                    <div className="absolute -top-1 -bottom-1 w-0.5 bg-sage/70" style={{ left: `${res.base_rate * 100}%` }} title="Overall rate" />
                  </div>
                  <div className="flex justify-between font-mono text-[10px] text-sage mt-1.5"><span>0%</span><span>▏overall rate {pct(res.base_rate)} · ▎threshold {pct(res.threshold)}</span><span>100%</span></div>
                </div>
                <div className="grid sm:grid-cols-3 gap-4 border-t border-line/70 pt-4">
                  <Metric label="Predicted class" value={<span className="text-base font-bold">{res.predicted_class}</span>} />
                  <Metric label="Model" value={<span className="text-base font-bold">{res.model}</span>} />
                  <Metric label="Version" value={<span className="text-base font-bold">{res.model_version}</span>} />
                </div>
                {res.beats_baseline === false && (
                  <Callout tone="gold" title="Weak signal in this dataset">
                    On held-out data this model does not meaningfully beat a "predict the overall rate" baseline, so differences between inputs are small. Treat the probability as an illustration of the pipeline, not a reliable forecast.
                  </Callout>
                )}
                <div>
                  <div className="eyebrow mb-3">What moved the estimate</div>
                  <FactorBars factors={res.factors} unit=" pts" accent={COLORS.coral} scale={100} />
                  <p className="text-[11px] text-sage mt-3">Each bar shows how much fixing that input at your value shifts the probability versus averaging it over all possible values (percentage points).</p>
                </div>
                <p className="text-[11px] text-sage flex gap-2 border-t border-line/70 pt-3"><ShieldAlert size={13} className="shrink-0 mt-0.5 text-gold" />{res.disclaimer}</p>
              </div>
            )}
          </Panel>

          {sel && (
            <Panel flat>
              <SectionTitle label="Held-out test performance" title={`${m.selected_model} vs baseline`} aside={<DataTag kind="model" />} />
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 p-5">
                <Metric label="Precision" value={fix(sel.precision)} />
                <Metric label="Recall" value={fix(sel.recall)} />
                <Metric label="F1-score" value={fix(sel.f1)} />
                <Metric label="PR-AUC" value={fix(sel.pr_auc)} color={COLORS.coral} sub={`baseline ${fix(m.base_rate)}`} />
                <Metric label="Threshold" value={fix(m.threshold, 2)} sub="from validation" />
              </div>
              {sel.recall > 0.9 && (
                <p className="px-5 pb-4 text-[11px] text-sage">Recall is near 1 and precision sits at the base rate because the validation-chosen threshold flags almost every booking: with so little signal, "flag everything" maximises F1. PR-AUC versus the baseline is the fairer yardstick.</p>
              )}
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
