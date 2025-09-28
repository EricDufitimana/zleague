'use client';

import { useState, useEffect } from 'react';

export default function TimeTracker() {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning) {
      interval = setInterval(() => {
        setTime(prevTime => prevTime + 1);
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRunning]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePause = () => {
    setIsRunning(!isRunning);
  };

  const handleStop = () => {
    setIsRunning(false);
    setTime(0);
  };

  return (
    <div className="bg-white p-6 rounded-2xl transition-all duration-300 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-800">
          Time Tracker
        </h3>
      </div>
      
      {/* Timer Display */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-6 text-center relative overflow-hidden mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-transparent"></div>
        <div className="relative z-10">
          <div className="text-4xl font-bold text-white mb-2 font-mono">
            {formatTime(time)}
          </div>
          <p className="text-emerald-100 text-sm">
            {isRunning ? 'Tracking time...' : 'Paused'}
          </p>
        </div>
      </div>
      
      {/* Control Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handlePause}
          className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 rounded-xl py-3 px-4 text-white font-medium transition-all duration-200 flex items-center justify-center gap-2 group"
        >
          {isRunning ? (
            <>
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Pause
            </>
          ) : (
            <>
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Resume
            </>
          )}
        </button>
        
        <button
          onClick={handleStop}
          className="flex-1 bg-red-500/20 hover:bg-red-500/30 backdrop-blur-sm border border-red-400/30 rounded-xl py-3 px-4 text-red-200 font-medium transition-all duration-200 flex items-center justify-center gap-2 group"
        >
          <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
          </svg>
          Stop
        </button>
      </div>
    </div>
  );
}
