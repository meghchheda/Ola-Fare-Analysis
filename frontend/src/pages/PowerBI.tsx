import { ExternalLink, LayoutPanelTop, Settings2 } from "lucide-react";
import { useState } from "react";
import { Callout, Loading, Panel, SectionTitle } from "../components/ui";
import { useApp } from "../lib/app-context";

export default function PowerBI() {
  const { config } = useApp();
  const [imgOk, setImgOk] = useState(true);
  const [embed, setEmbed] = useState(false);
  if (!config) return <Loading />;
  const url: string | null = config.power_bi_url;

  return (
    <div className="fade-in space-y-6">
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5">
          <div className="eyebrow text-lime">Project resource</div>
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.05] mt-2">The full operational picture.</h2>
          <p className="text-sage mt-4 leading-relaxed">
            The Power BI report is the interactive, slice-and-dice companion to this application. It covers the descriptive side of the OLA bookings data (volumes, outcomes, vehicle mix, payments and locations),
            while this site adds the predictive models.
          </p>
          <div className="flex flex-wrap gap-3 mt-7">
            {url ? (
              <>
                <a href={url} target="_blank" rel="noopener noreferrer" className="btn-lime"><ExternalLink size={16} /> Open Interactive Power BI Dashboard</a>
                <a href={url} target="_blank" rel="noopener noreferrer" className="btn-ghost">Open in new tab</a>
              </>
            ) : (
              <button className="btn-lime" disabled><ExternalLink size={16} /> Open Interactive Power BI Dashboard</button>
            )}
          </div>
          {url && <button className="mt-4 text-xs text-sage underline underline-offset-4 hover:text-ivory" onClick={() => setEmbed((e) => !e)}>{embed ? "Hide embedded view" : "Try embedding it below"} (works only if the report's sharing settings allow it)</button>}
        </div>

        <Panel className="lg:col-span-7 overflow-hidden">
          <SectionTitle label="Dashboard preview" />
          {imgOk ? (
            <img src="/powerbi-preview.png" alt="Screenshot of the published Power BI dashboard" className="w-full block" onError={() => setImgOk(false)} />
          ) : (
            <div className="aspect-[16/9] flex flex-col items-center justify-center text-center p-8 bg-ink/50">
              <LayoutPanelTop size={34} className="text-sage" />
              <div className="font-semibold mt-3">No preview image added</div>
              <p className="text-sage text-sm mt-1 max-w-sm">Save a screenshot of your report as <code className="font-mono text-lime">frontend/public/powerbi-preview.png</code> and it will appear here.</p>
            </div>
          )}
        </Panel>
      </div>

      {!url && (
        <Panel className="p-6">
          <div className="flex items-start gap-4">
            <Settings2 className="text-gold shrink-0 mt-1" />
            <div className="min-w-0">
              <h3 className="font-bold text-lg">Power BI link not configured yet</h3>
              <p className="text-sage text-sm mt-1">Nothing is connected, so the button above is disabled. The rest of the application works normally. To connect your published report:</p>
              <ol className="list-decimal list-inside text-sm space-y-1.5 mt-4 text-ivory/90">
                <li>In Power BI Service open your report → <b>File → Embed report → Publish to web</b> (or copy the shared report link).</li>
                <li>Paste the link into <code className="font-mono text-lime">.env</code> in the project root:</li>
              </ol>
              <pre className="mt-3 bg-ink px-4 py-3 font-mono text-xs text-lime overflow-x-auto">POWER_BI_URL=https://app.powerbi.com/view?r=YOUR_REPORT_TOKEN</pre>
              <p className="text-sage text-sm mt-3">Restart the backend (<code className="font-mono">uvicorn backend.app.main:app</code>) and reload this page.</p>
            </div>
          </div>
        </Panel>
      )}

      {url && embed && (
        <Panel>
          <SectionTitle label="Embedded report" title="Power BI" />
          <iframe title="Power BI dashboard" src={url} className="w-full h-[640px] bg-ink" allowFullScreen />
          <p className="text-[11px] text-sage p-3">If this area is blank, the report's sharing settings block embedding — use the buttons above instead.</p>
        </Panel>
      )}
      <Callout tone="sky" title="What the report is for">Use it to explore booking history interactively. For predictions, forecasts, segments and anomaly review, use the ML pages in the sidebar.</Callout>
    </div>
  );
}
