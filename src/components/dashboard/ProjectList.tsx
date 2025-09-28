'use client';

export default function ProjectList() {
  const projects = [
    {
      name: 'Develop API Endpoints',
      icon: '⚡',
      iconBg: 'from-blue-400 to-blue-600',
      dueDate: 'Nov 26, 2024',
    },
    {
      name: 'Onboarding Flow',
      icon: '🌐',
      iconBg: 'from-emerald-400 to-emerald-600',
      dueDate: 'Nov 28, 2024',
    },
    {
      name: 'Build Dashboard',
      icon: '📊',
      iconBg: 'from-teal-400 to-teal-600',
      dueDate: 'Nov 30, 2024',
    },
    {
      name: 'Optimize Page Load',
      icon: '🍃',
      iconBg: 'from-orange-400 to-orange-600',
      dueDate: 'Dec 5, 2024',
    },
    {
      name: 'Cross-Browser Testing',
      icon: '🔄',
      iconBg: 'from-purple-400 to-purple-600',
      dueDate: 'Dec 6, 2024',
    },
  ];

  return (
    <div className="bg-white p-6 rounded-2xl transition-all duration-300 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-800">
          Project
        </h3>
        <button className="px-4 py-2 rounded-xl text-sm font-medium text-emerald-600 border border-emerald-200 hover:bg-emerald-50 transition-all duration-200 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          + New
        </button>
      </div>
      
      <div className="space-y-3">
        {projects.map((project, index) => (
          <div
            key={index}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-all duration-200 group"
          >
            {/* Project Icon */}
            <div className={`w-8 h-8 bg-gradient-to-br ${project.iconBg} rounded-lg flex items-center justify-center text-white text-sm group-hover:scale-110 transition-transform duration-200`}>
              {project.icon}
            </div>
            
            {/* Project Info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-slate-800 text-sm truncate">
                {project.name}
              </h4>
              <p className="text-xs text-slate-500">
                Due date: {project.dueDate}
              </p>
            </div>
            
            {/* Arrow Icon */}
            <div className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
