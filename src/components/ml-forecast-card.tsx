import { TrendingUp } from "lucide-react";
import { ProgressBar } from "@/components/ui";
import type { MlPrediction } from "@/lib/ml/predict";

function formatSigned(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
}

/**
 * Renders the Phase 5 ML forecast. Server component: prediction happens
 * during render via pure math, no client JavaScript or API call involved.
 */
export function MlForecastCard({ prediction }: { prediction: MlPrediction }) {
  const riskTone =
    prediction.riskProbability >= 0.5 ? "rose" : prediction.riskProbability >= 0.15 ? "amber" : "emerald";

  return (
    <section className="rounded-2xl border border-brand-border bg-brand-navy shadow-sm shadow-slate-900/[0.03]">
      <div className="border-b border-brand-border px-5 py-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-brand-text">
          <TrendingUp className="h-4 w-4 text-sky-500" /> Next-term forecast
        </h2>
        <p className="mt-0.5 text-xs text-brand-muted">
          Statistical model estimate trained on the platform&apos;s historical data
        </p>
      </div>

      <div className="px-5 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-brand-muted">
              Predicted average
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-brand-text">
              {prediction.predictedAverage.toFixed(1)}%
            </p>
            <p className="text-xs text-brand-muted">± {prediction.band.toFixed(1)} typical error</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-brand-muted">
              At-risk probability
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-brand-text">
              {(prediction.riskProbability * 100).toFixed(0)}%
            </p>
            <div className="mt-2">
              <ProgressBar value={prediction.riskProbability * 100} tone={riskTone} />
            </div>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-muted">
            Why this prediction
          </p>
          <ul className="mt-1.5 space-y-1">
            {prediction.contributions.slice(0, 4).map((item) => (
              <li key={item.feature} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-brand-muted" title={`${item.label}: ${item.value.toFixed(1)}`}>
                  {item.label}
                  <span className="ml-1 text-brand-muted">
                    ({item.value.toFixed(1)})
                  </span>
                </span>
                <span
                  className={
                    item.contribution >= 0
                      ? "shrink-0 font-medium text-emerald-400"
                      : "shrink-0 font-medium text-rose-400"
                  }
                >
                  {formatSigned(item.contribution)} pts
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-4 border-t border-brand-border pt-3 text-[11px] text-brand-muted">
          Linear model (ridge + logistic), trained {prediction.trainedAt} · typical error ±
          {prediction.metrics.cvMae.toFixed(1)} pts (cross-validated) · risk AUC{" "}
          {prediction.metrics.auc.toFixed(2)} · Estimate only — the rule-based indicator remains the
          platform&apos;s source of truth.
        </p>
      </div>
    </section>
  );
}