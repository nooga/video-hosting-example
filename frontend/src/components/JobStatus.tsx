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
        return <CheckCircleIcon className="h-5 w-5 text-green-400" />;
      case "failed":
        return <XCircleIcon className="h-5 w-5 text-red-400" />;
      case "processing":
        return <CogIcon className="h-5 w-5 text-blue-400 animate-spin" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getJobTypeLabel = (type: string): string => {
    switch (type) {
      case "transcode":
        return "Video Transcoding";
      case "thumbnail":
        return "Thumbnail Generation";
      default:
        return type;
    }
  };

  const getOverallProgress = (): number => {
    if (jobs.length === 0) return 0;
    const totalProgress = jobs.reduce((sum, job) => sum + job.progress, 0);
    return Math.round(totalProgress / jobs.length);
  };

  const getOverallStatus = (): string => {
    if (jobs.length === 0) return "No jobs";

    const hasProcessing = jobs.some((job) => job.status === "processing");
    const hasCompleted = jobs.every((job) => job.status === "completed");
    const hasFailed = jobs.some((job) => job.status === "failed");

    if (hasFailed) return "Some jobs failed";
    if (hasCompleted) return "All jobs completed";
    if (hasProcessing) return "Processing...";
    return "Waiting to start";
  };

  if (loading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-800 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="h-5 w-5 bg-gray-800 rounded-full"></div>
                <div className="h-4 bg-gray-800 rounded flex-1"></div>
                <div className="h-4 bg-gray-800 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="card p-6 text-center">
        <ClockIcon className="h-8 w-8 text-gray-600 mx-auto mb-2" />
        <p className="text-gray-500">No processing jobs yet</p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-100">
              Processing Status
            </h3>
            <div className="mt-1">
              <span className="text-sm text-gray-400">
                {getOverallStatus()}
              </span>
            </div>
          </div>
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((e) => !e)}
            className="inline-flex items-center text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            {expanded ? (
              <>
                <ChevronDownIcon className="h-4 w-4 mr-1" />
                Hide details
              </>
            ) : (
              <>
                <ChevronRightIcon className="h-4 w-4 mr-1" />
                Show details
              </>
            )}
          </button>
        </div>
        <div className="mt-3">
          <ProgressBar
            progress={getOverallProgress()}
            color="bg-blue-500"
            showText={true}
          />
        </div>
      </div>

      {expanded && (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  {getJobIcon(job)}
                  <div>
                    <h4 className="font-medium text-gray-200">
                      {getJobTypeLabel(job.type)}
                    </h4>
                    {job.payload?.quality && (
                      <span className="text-sm text-gray-500">
                        Quality: {job.payload.quality}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      job.status === "completed"
                        ? "bg-green-900/60 text-green-300 border border-green-700/50"
                        : job.status === "failed"
                        ? "bg-red-900/60 text-red-300 border border-red-700/50"
                        : job.status === "processing"
                        ? "bg-blue-900/60 text-blue-300 border border-blue-700/50"
                        : "bg-gray-800 text-gray-400 border border-gray-700"
                    }`}
                  >
                    {job.status}
                  </span>
                </div>
              </div>

              {job.status === "processing" && (
                <div className="mt-2">
                  <ProgressBar
                    progress={job.progress}
                    color="bg-blue-500"
                    height="h-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {job.progress}% complete
                  </p>
                </div>
              )}

              {job.error_message && (
                <div className="mt-2 p-2 bg-red-900/30 border border-red-800 rounded">
                  <p className="text-sm text-red-400">{job.error_message}</p>
                </div>
              )}

              <div className="mt-3 pt-2 border-t border-gray-700">
                <div className="grid grid-cols-1 gap-1 text-xs text-gray-500">
                  <div>
                    <span className="font-medium">Created:</span>{" "}
                    {new Date(job.created_at).toLocaleString()}
                  </div>
                  {job.completed_at && (
                    <div>
                      <span className="font-medium">Completed:</span>{" "}
                      {new Date(job.completed_at).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default JobStatus;
