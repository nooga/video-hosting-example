import React, { useState } from "react";
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CogIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { Job } from "../types/video";
import ProgressBar from "./ProgressBar";

interface JobStatusProps {
  jobs: Job[];
  loading?: boolean;
}

const JobStatus: React.FC<JobStatusProps> = ({ jobs, loading = false }) => {
  const [expanded, setExpanded] = useState(false);

  const getJobIcon = (job: Job) => {
    switch (job.status) {
      case "completed":
        return <CheckCircleIcon className="h-5 w-5 text-emerald-400" />;
      case "failed":
        return <XCircleIcon className="h-5 w-5 text-red-400" />;
      case "processing":
        return <CogIcon className="h-5 w-5 text-accent animate-spin" />;
      default:
        return <ClockIcon className="h-5 w-5 text-ink-faint" />;
    }
  };

  const getJobTypeLabel = (type: string): string => {
    switch (type) {
      case "transcode":
        return "Transcoding";
      case "thumbnail":
        return "Thumbnails";
      default:
        return type;
    }
  };

  const getOverallProgress = (): number => {
    if (jobs.length === 0) return 0;
    return Math.round(
      jobs.reduce((sum, job) => sum + job.progress, 0) / jobs.length
    );
  };

  const getOverallStatus = (): string => {
    if (jobs.length === 0) return "No jobs";
    if (jobs.some((j) => j.status === "failed")) return "Some jobs failed";
    if (jobs.every((j) => j.status === "completed")) return "All complete";
    if (jobs.some((j) => j.status === "processing")) return "Processing…";
    return "Queued";
  };

  if (loading) {
    return (
      <div className="card-glass p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-white/10 rounded w-1/3" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-white/5 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="card-glass p-6 text-center">
        <ClockIcon className="h-8 w-8 text-ink-faint mx-auto mb-2" />
        <p className="text-sm text-ink-muted">No processing jobs yet</p>
      </div>
    );
  }

  return (
    <div className="card-glass p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold text-ink">Processing</h3>
          <p className="text-sm text-ink-muted mt-0.5">{getOverallStatus()}</p>
        </div>
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((e) => !e)}
          className="btn-ghost text-xs"
        >
          {expanded ? (
            <>
              <ChevronDownIcon className="h-4 w-4" />
              Hide
            </>
          ) : (
            <>
              <ChevronRightIcon className="h-4 w-4" />
              Details
            </>
          )}
        </button>
      </div>

      <ProgressBar progress={getOverallProgress()} showText />

      {expanded && (
        <div className="mt-5 space-y-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  {getJobIcon(job)}
                  <div>
                    <h4 className="text-sm font-medium text-ink">
                      {getJobTypeLabel(job.type)}
                    </h4>
                    {job.payload?.quality && (
                      <span className="text-xs text-ink-faint">
                        {job.payload.quality}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className={
                    job.status === "completed"
                      ? "badge-ready"
                      : job.status === "failed"
                      ? "badge-failed"
                      : job.status === "processing"
                      ? "badge-processing"
                      : "badge-default"
                  }
                >
                  {job.status}
                </span>
              </div>

              {job.status === "processing" && (
                <div className="mt-2">
                  <ProgressBar progress={job.progress} height="h-1.5" />
                </div>
              )}

              {job.error_message && (
                <p className="mt-2 text-xs text-red-400">{job.error_message}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default JobStatus;
