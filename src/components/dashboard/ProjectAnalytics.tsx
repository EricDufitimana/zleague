'use client';

export default function ProjectAnalytics() {
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const data = [60, 80, 74, 65, 70, 75, 68]; // Heights in percentage
  
  return (
    <div className="bg-white p-6 rounded-2xl transition-all duration-300 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-800">
          Project Analytics
        </h3>
      </div>
      
      {/* Mini Bar Chart */}
      <div className="flex items-end justify-between h-32 gap-1">
        {days.map((day, index) => (
          <div key={index} className="flex flex-col items-center gap-2">
            {/* Bar */}
            <div className="relative w-8">
              <div 
                className={`w-full rounded-t-lg transition-all duration-500 ${
                  index === 1 || index === 2 
                    ? 'bg-emerald-500' 
                    : 'bg-gradient-to-t from-emerald-400/50 to-emerald-600/50'
                }`}
                style={{ height: `${data[index]}%` }}
              >
                {/* Percentage label for Tuesday */}
                {index === 2 && (
                                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium text-emerald-600">
                  74%
                </div>
                )}
              </div>
            </div>
            
            {/* Day label */}
            <span className="text-xs font-medium text-slate-600">
              {day}
            </span>
          </div>
        ))}
      </div>
      
      {/* Chart Legend */}
      <div className="mt-6 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
            <span className="text-slate-600">Active</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gradient-to-t from-emerald-400/50 to-emerald-600/50 rounded-full"></div>
            <span className="text-slate-600">Inactive</span>
          </div>
        </div>
      </div>
    </div>
  );
}
