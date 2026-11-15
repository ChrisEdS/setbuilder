"use client";

import { EnergyProgressBar } from "@/components/EnergyMeter";
import type { EnergyScan } from "@/lib/energy";
import { useI18n } from "@/lib/i18n/react";
import { playlistIdFromEnergyJobKey, type WorkJobSnapshot } from "@/lib/work-queue";

/** Running and waiting playlist energy jobs from the process-wide work queue. */
export function EnergyScanQueue({
  jobs,
  scan = null,
}: {
  jobs: readonly WorkJobSnapshot[];
  scan?: EnergyScan | null;
}) {
  const { t } = useI18n();
  if (!jobs.length) return null;
  return (
    <div className="energy-work-queue">
      <p className="energy-work-queue-title">{t("builder.work.energyQueue")}</p>
      <ol aria-label={t("builder.work.energyQueueAria")}>
        {jobs.map((job) => {
          const playlistId = playlistIdFromEnergyJobKey(job.key);
          const running = job.status === "running";
          const progress =
            running && scan && playlistId && scan.setId === playlistId ? scan : null;
          const name = job.target?.trim() || job.label;
          return (
            <li key={job.id} data-status={job.status}>
              <strong className="energy-work-queue-name">{name}</strong>
              <span className="energy-work-queue-state">
                {running
                  ? t("builder.work.energyQueueRunning")
                  : t("builder.work.energyQueueWaiting", { position: job.position })}
                {progress ? ` · ${progress.done}/${progress.total}` : ""}
              </span>
              <span className="energy-work-queue-action">{job.label}</span>
              {progress ? (
                <EnergyProgressBar
                  done={progress.done}
                  total={progress.total}
                  label={t("builder.energy.progressAria", {
                    done: progress.done,
                    total: progress.total,
                  })}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
