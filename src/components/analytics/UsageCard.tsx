import React from "react";
import { ResourceUsage } from "../../types";

interface UsageCardProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  usage: ResourceUsage;
}

// Helper to determine progress bar color with optional pulse animation
const getUtilizationColor = (percent: number | null, limit: number): { bg: string; pulse: boolean } => {
  // Unlimited resources
  if (limit === -1 || percent === null) {
    return { bg: "bg-slate-200", pulse: false };
  }

  // Color coding: green < 70%, yellow 70-90%, red > 90%
  // Pulse animation for red (>90%) as per context decision
  if (percent < 70) return { bg: "bg-emerald-500", pulse: false };
  if (percent < 90) return { bg: "bg-amber-500", pulse: false };
  return { bg: "bg-red-500", pulse: true };
};

const getTextColor = (percent: number | null, limit: number): string => {
  if (limit === -1 || percent === null) return "text-slate-600";
  if (percent < 70) return "text-emerald-600";
  if (percent < 90) return "text-amber-600";
  return "text-red-600";
};

export const UsageCard: React.FC<UsageCardProps> = ({ title, icon: Icon, usage }) => {
  const { current, limit, utilization_percent: percent } = usage;
  const isUnlimited = limit === -1;
  const { bg: colorClass, pulse: shouldPulse } = getUtilizationColor(percent, limit);

  return (
    <div className="bg-white rounded-3xl shadow-lg p-6">
      {/* Header with icon and title */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-indigo-50 rounded-xl">
          <Icon className="w-5 h-5 text-indigo-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
      </div>

      {/* Current / Limit display */}
      <div className="mb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-slate-900">{current}</span>
          <span className="text-slate-400">/</span>
          <span className="text-xl font-medium text-slate-600">
            {isUnlimited ? (
              // Infinity symbol with 60% opacity per context decision
              <span className="text-2xl opacity-60">&infin;</span>
            ) : (
              limit
            )}
          </span>
        </div>

        {/* Percentage display (not shown for unlimited) */}
        {!isUnlimited && percent !== null && (
          <p className={`text-sm font-medium mt-1 ${getTextColor(percent, limit)}`}>
            {percent}% использовано
          </p>
        )}
      </div>

      {/* Progress bar (only for limited resources) */}
      {!isUnlimited && percent !== null && (
        <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${colorClass} ${
              shouldPulse ? "animate-pulse" : ""
            }`}
            style={{ width: `${Math.min(percent, 100)}%` }}
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      )}

      {/* Unlimited indicator */}
      {isUnlimited && (
        <div className="h-2 bg-slate-200 rounded-full mt-3" />
      )}
    </div>
  );
};
