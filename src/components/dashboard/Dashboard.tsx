'use client';

import StatCards from './StatCards';
import ProjectAnalytics from './ProjectAnalytics';
import RemindersCard from './RemindersCard';
import TeamCollaboration from './TeamCollaboration';
import ProjectProgress from './ProjectProgress';
import ProjectList from './ProjectList';
import TimeTracker from './TimeTracker';

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
     

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button className="px-6 py-3 rounded-2xl font-medium text-white bg-emerald-500 hover:bg-emerald-600 transition-all duration-200 flex items-center gap-2 shadow-sm">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Project
        </button>
        <button className="px-6 py-3 rounded-2xl font-medium text-emerald-600 border border-emerald-200 hover:bg-emerald-50 transition-all duration-200 flex items-center gap-2 shadow-sm">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
          Import Data
        </button>
      </div>

      {/* Stat Cards Row */}
      <StatCards />

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <ProjectAnalytics />
          <RemindersCard />
        </div>

        {/* Center Column */}
        <div className="space-y-6">
          <TeamCollaboration />
          <ProjectProgress />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <ProjectList />
          <TimeTracker />
        </div>
      </div>
    </div>
  );
}
