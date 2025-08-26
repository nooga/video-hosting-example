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
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case "failed":
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case "processing":
        return <CogIcon className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
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
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="h-5 w-5 bg-gray-200 rounded-full"></div>
                <div className="h-4 bg-gray-200 rounded flex-1"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
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
        <ClockIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-500">No processing jobs yet</p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Processing Status
            </h3>
            <div className="mt-1">
              <span className="text-sm text-gray-600">
                {getOverallStatus()}
              </span>
            </div>
          </div>
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((e) => !e)}
            className="inline-flex items-center text-sm text-gray-700 hover:text-gray-900"
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
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  {getJobIcon(job)}
                  <div>
                    <h4 className="font-medium text-gray-900">
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
                        ? "bg-green-100 text-green-800"
                        : job.status === "failed"
                        ? "bg-red-100 text-red-800"
                        : job.status === "processing"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-800"
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
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                  <p className="text-sm text-red-700">{job.error_message}</p>
                </div>
              )}

              <div className="mt-3 pt-2 border-t border-gray-100">
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
