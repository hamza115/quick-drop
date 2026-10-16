import { Callout, SettingsGroup } from "@/components/settings/settings-ui";
import type { CloudinaryUsage, UsageMetric } from "@/lib/cloudinary/usage";
import { formatBytes } from "@/lib/files/format";
import { cn } from "@/lib/cn";

function percentOf(metric: UsageMetric): number | null {
  if (metric.usedPercent !== null) return metric.usedPercent;
  if (metric.limit) return (metric.usage / metric.limit) * 100;
  return null;
}

function Meter({ label, percent }: { label: string; percent: number }) {
  const shown = Math.min(100, Math.max(0, Math.round(percent)));
  const fill = shown >= 95 ? "bg-danger-solid" : shown >= 80 ? "bg-warning" : "bg-primary";
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={shown}
      aria-valuetext={`${shown}% used`}
      className="h-2 overflow-hidden rounded-full bg-surface-highest"
    >
      <div className={cn("h-full rounded-full", fill)} style={{ width: `${Math.max(shown, 2)}%` }} />
    </div>
  );
}

function credits(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: string | null }) {
  return (
    <div className="min-w-0 rounded-lg bg-surface-container px-3 py-2.5">
      <p className="text-caption text-muted">{label}</p>
      <p className="mt-0.5 truncate text-item text-foreground">{value}</p>
      {detail ? <p className="truncate text-caption text-muted">{detail}</p> : null}
    </div>
  );
}

function limitDetail(metric: UsageMetric, format: (value: number) => string): string | null {
  if (metric.credits !== null) return `${credits(metric.credits)} credits`;
  if (metric.limit) return `of ${format(metric.limit)}`;
  return null;
}

/**
 * Shown to every signed-in user: the whole Cloudinary account: credits, storage, bandwidth and transformations,
 * for every QuickDrop user together. Figures come from Cloudinary's usage report.
 */
export function CloudinaryUsageGroup({ id, usage }: { id: string; usage: CloudinaryUsage | null }) {
  if (!usage) {
    return (
      <SettingsGroup id={id} icon="trendUp" title="Cloudinary account" description="Usage across every account on this QuickDrop.">
        <div className="px-4 py-4 sm:px-5">
          <Callout tone="warning">Cloudinary usage couldn&apos;t be loaded. Check the Cloudinary settings, then reload this page.</Callout>
        </div>
      </SettingsGroup>
    );
  }

  const creditPercent = usage.credits ? percentOf(usage.credits) : null;
  const storagePercent = percentOf(usage.storage);
  const updated = usage.lastUpdated
    ? new Date(usage.lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    : null;

  return (
    <SettingsGroup
      id={id}
      icon="trendUp"
      title="Cloudinary account"
      description={`Usage across every account on this QuickDrop. ${usage.plan} plan.`}
    >
      <div className="flex flex-col gap-4 px-4 py-5 sm:px-5">
        {usage.credits ? (
          <section aria-labelledby={`${id}-credits`} className="space-y-3">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h3 id={`${id}-credits`} className="text-xs font-medium text-muted">
                  Credits used this month
                </h3>
                <p className="mt-0.5 text-2xl font-bold tracking-tight text-foreground">
                  {credits(usage.credits.usage)}
                  {usage.credits.limit ? (
                    <span className="text-base font-semibold text-muted"> of {credits(usage.credits.limit)}</span>
                  ) : null}
                </p>
              </div>
              {usage.credits.limit ? (
                <p className="text-sm text-muted">
                  {credits(Math.max(0, usage.credits.limit - usage.credits.usage))} left
                </p>
              ) : null}
            </div>
            {creditPercent !== null ? <Meter label="Cloudinary credits used" percent={creditPercent} /> : null}
          </section>
        ) : storagePercent !== null ? (
          <section aria-labelledby={`${id}-storage`} className="space-y-3">
            <h3 id={`${id}-storage`} className="text-xs font-medium text-muted">
              Storage used
            </h3>
            <Meter label="Cloudinary storage used" percent={storagePercent} />
          </section>
        ) : null}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Storage" value={formatBytes(usage.storage.usage)} detail={limitDetail(usage.storage, formatBytes)} />
          <Stat label="Bandwidth" value={formatBytes(usage.bandwidth.usage)} detail={limitDetail(usage.bandwidth, formatBytes)} />
          <Stat
            label="Transformations"
            value={usage.transformations.usage.toLocaleString("en-US")}
            detail={limitDetail(usage.transformations, (value) => value.toLocaleString("en-US"))}
          />
          <Stat label="Files" value={usage.files.toLocaleString("en-US")} />
        </div>

        <p className="text-caption text-muted">
          {usage.credits ? "1 credit is about 1 GB of storage, 1 GB of bandwidth or 1,000 transformations. " : null}
          Cloudinary updates these figures a few times a day{updated ? `; last updated ${updated}` : ""}.
        </p>
      </div>
    </SettingsGroup>
  );
}
