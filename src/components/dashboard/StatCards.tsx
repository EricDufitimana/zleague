'use client';

export default function StatCards() {
  const stats = [
    {
      title: 'Total Projects',
      count: '24',
      change: '5 Increased from last month',
      icon: 'arrow-up-right',
      bgColor: 'from-emerald-500 to-emerald-600',
      textColor: 'text-white',
      iconColor: 'text-white',
      changeColor: 'text-emerald-100',
      isPositive: true,
    },
    {
      title: 'Ended Projects',
      count: '10',
      change: '6 Increased from last month',
      icon: 'arrow-up-right',
      bgColor: 'from-white to-white',
      textColor: 'text-slate-800',
      iconColor: 'text-slate-600',
      changeColor: 'text-emerald-600',
      isPositive: true,
    },
    {
      title: 'Running Projects',
      count: '12',
      change: '2 Increased from last month',
      icon: 'arrow-up-right',
      bgColor: 'from-white to-white',
      textColor: 'text-slate-800',
      iconColor: 'text-slate-600',
      changeColor: 'text-emerald-600',
      isPositive: true,
    },
    {
      title: 'Pending Project',
      count: '2',
      change: 'On Discuss',
      icon: 'arrow-up-right',
      bgColor: 'from-white to-white',
      textColor: 'text-slate-800',
      iconColor: 'text-slate-600',
      changeColor: 'text-slate-500',
      isPositive: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <div
          key={index}
          className={`p-6 rounded-2xl transition-all duration-300 shadow-sm ${
            stat.bgColor.includes('emerald') ? 'bg-gradient-to-br ' + stat.bgColor : 'bg-white'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-sm font-medium ${stat.textColor}`}>{stat.title}</h3>
            <div className={`w-8 h-8 rounded-full bg-white/20 flex items-center justify-center ${stat.iconColor}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
              </svg>
            </div>
          </div>
          
          <div className="space-y-2">
            <p className={`text-3xl font-bold ${stat.textColor}`}>{stat.count}</p>
            <div className="flex items-center gap-2">
              {stat.isPositive && (
                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              )}
              <span className={`text-sm ${stat.changeColor}`}>{stat.change}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
