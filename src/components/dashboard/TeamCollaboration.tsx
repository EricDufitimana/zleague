'use client';

export default function TeamCollaboration() {
  const teamMembers = [
    {
      name: 'Alexandra Deff',
      avatar: '👩‍💼',
      task: 'Working on Github Project Repository',
      status: 'Completed',
      statusColor: 'bg-emerald-500 text-white',
    },
    {
      name: 'Edwin Adenike',
      avatar: '👨‍💻',
      task: 'Working on Integrate User Authentication System',
      status: 'In Progress',
      statusColor: 'bg-yellow-500 text-slate-800',
    },
    {
      name: 'Isaac Oluwatemilorun',
      avatar: '👨‍🔬',
      task: 'Working on Develop Search and Filter Functionality',
      status: 'Pending',
      statusColor: 'bg-pink-500 text-white',
    },
    {
      name: 'David Oshodi',
      avatar: '👨‍🎨',
      task: 'Working on Responsive Layout for Homepage',
      status: 'In Progress',
      statusColor: 'bg-yellow-500 text-slate-800',
    },
  ];

  return (
    <div className="bg-white p-6 rounded-2xl transition-all duration-300 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-800">
          Team Collaboration
        </h3>
        <button className="px-4 py-2 rounded-xl text-sm font-medium text-emerald-600 border border-emerald-200 hover:bg-emerald-50 transition-all duration-200 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          + Add Member
        </button>
      </div>
      
      <div className="space-y-4">
        {teamMembers.map((member, index) => (
          <div key={index} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-all duration-200">
            {/* Avatar */}
            <div className="w-10 h-10 bg-gradient-to-br from-slate-400 to-slate-600 rounded-full flex items-center justify-center text-lg">
              {member.avatar}
            </div>
            
            {/* Member Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-medium text-slate-800 text-sm">
                  {member.name}
                </h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${member.statusColor}`}>
                  {member.status}
                </span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                {member.task}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
