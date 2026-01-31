import React, { useState } from "react";

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

  return (
    <div className="analytics-dashboard">
      {/* Top Controls Bar - will be implemented in next task */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        {/* Time Range Selector - next task */}
        <div>Time range selector placeholder</div>

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
