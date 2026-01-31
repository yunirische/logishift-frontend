import React, { useState } from "react";
import { Calendar } from "lucide-react";

type TimeRangePreset = 7 | 30 | 90;

const Analytics: React.FC = () => {
  const [selectedDays, setSelectedDays] = useState<TimeRangePreset>(30);
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = async () => {
    setIsLoading(true);
    try {
      // Export logic (later task)
    } finally {
      setIsLoading(false);
    }
  };

  const getDateRangeDisplay = (days: TimeRangePreset): string => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    const formatDate = (d: Date) => d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  const timeRangePresets: TimeRangePreset[] = [7, 30, 90];

  return (
    <div className="analytics-dashboard">
      {/* Top Controls Bar - will be implemented in next task */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        {/* Time Range Selector - next task */}
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-indigo-600" />
          <div className="flex bg-slate-100 rounded-lg p-1">
            {timeRangePresets.map((days) => {
              const isActive = selectedDays === days;
              return (
                <button
                  key={days}
                  onClick={() => setSelectedDays(days)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    isActive
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {days} д
                </button>
              );
            })}
          </div>
          <span className="text-sm text-slate-500 hidden sm:inline">
            {getDateRangeDisplay(selectedDays)}
          </span>
        </div>

        {/* Export Button - next task */}
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg">
          Экспорт
        </button>
      </div>

      {/* Content Grid - will be implemented in later task */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl shadow-lg p-6 min-h-[200px]">
          <p className="text-slate-400">Placeholder</p>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
