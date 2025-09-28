'use client';

export default function ProjectProgress() {
  const progress = 41; // 41%
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="bg-white p-6 rounded-2xl transition-all duration-300 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-800">
          Project Progress
        </h3>
      </div>
      
      {/* Semi-Circular Progress Chart */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative w-32 h-16 mb-4">
          {/* Background Circle */}
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 50">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="rgba(34, 197, 94, 0.2)"
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={0}
            />
            {/* Progress Circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="url(#progressGradient)"
              strokeWidth="8"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
            {/* Gradient Definition */}
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
            </defs>
          </svg>
          
          {/* Progress Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-slate-800">
              {progress}%
            </span>
            <span className="text-xs text-slate-600">
              Project Ended
            </span>
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
            <span className="text-slate-600">Completed</span>
          </div>
          <span className="font-medium text-slate-800">41%</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-700 rounded-full"></div>
            <span className="text-slate-600">In Progress</span>
          </div>
          <span className="font-medium text-slate-800">35%</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gradient-to-r from-emerald-400/50 to-emerald-600/50 rounded-full"></div>
            <span className="text-slate-600">Pending</span>
          </div>
          <span className="font-medium text-slate-800">24%</span>
        </div>
      </div>
    </div>
  );
}
