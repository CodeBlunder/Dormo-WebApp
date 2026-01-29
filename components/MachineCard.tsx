// MachineCard.tsx
import React, { useState, useEffect } from 'react';
import { Machine, MachineStatus, User } from '../types';

interface MachineCardProps {
  machine: Machine;
  onStart: (id: number, duration: number) => void;
  onCollect: (id: number) => void;
  currentUser: User | null;
}

const MachineCard: React.FC<MachineCardProps> = ({ machine, onStart, onCollect, currentUser }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [durationInput, setDurationInput] = useState<string>('45');
  const [inputError, setInputError] = useState<boolean>(false);
  const [minutesLeft, setMinutesLeft] = useState<number>(0);
  const [estimatedEndTime, setEstimatedEndTime] = useState<string>('');

  // Helper function to format end time
  const formatEndTime = (timestamp: number | null | undefined): string => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Update time calculations
  useEffect(() => {
    let interval: number;
    
    if (machine.status === MachineStatus.RUNNING && machine.endTime) {
      const update = () => {
        const now = Date.now();
        const remainingSeconds = Math.max(0, Math.floor((machine.endTime! - now) / 1000));
        const remainingMinutes = Math.ceil(remainingSeconds / 60);
        
        setTimeLeft(remainingSeconds);
        setMinutesLeft(remainingMinutes);
        setEstimatedEndTime(formatEndTime(machine.endTime));
      };
      
      update();
      interval = window.setInterval(update, 1000);
    } else {
      setTimeLeft(0);
      setMinutesLeft(0);
      setEstimatedEndTime('');
    }
    
    return () => clearInterval(interval);
  }, [machine.status, machine.endTime]);

  const parseInputToMinutes = (input: string): number | null => {
    const trimmed = input.trim();
    if (!trimmed) return null;

    if (trimmed.includes(':')) {
      const parts = trimmed.split(':');
      if (parts.length !== 2) return null;
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      if (isNaN(hours) || isNaN(minutes) || minutes >= 60 || minutes < 0 || hours < 0) return null;
      return hours * 60 + minutes;
    }

    const totalMinutes = parseInt(trimmed, 10);
    if (isNaN(totalMinutes) || totalMinutes <= 0) return null;
    return totalMinutes;
  };

  const handleStart = () => {
    const parsedMinutes = parseInputToMinutes(durationInput);
    if (parsedMinutes !== null && parsedMinutes > 0) {
      onStart(machine.id, parsedMinutes);
      setInputError(false);
      
      // Show immediate feedback
      const endTime = Date.now() + parsedMinutes * 60 * 1000;
      setEstimatedEndTime(formatEndTime(endTime));
    } else {
      setInputError(true);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getStatusColor = () => {
    switch (machine.status) {
      case MachineStatus.FREE: 
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800';
      case MachineStatus.RUNNING: 
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800';
      case MachineStatus.FINISHED: 
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800';
      default: 
        return 'bg-gray-50 dark:bg-slate-900';
    }
  };

  const getIconColor = () => {
    switch (machine.status) {
      case MachineStatus.FREE: return 'text-emerald-500 dark:text-emerald-400';
      case MachineStatus.RUNNING: return 'text-blue-500 dark:text-blue-400';
      case MachineStatus.FINISHED: return 'text-amber-500 dark:text-amber-400';
    }
  };

  const isOwner = machine.currentUser?.name === currentUser?.name && 
                  machine.currentUser?.room === currentUser?.room;

  return (
    <div className={`relative p-6 rounded-2xl border transition-all duration-300 flex flex-col h-full ${getStatusColor()} ${machine.status === MachineStatus.RUNNING ? 'shadow-lg shadow-blue-100 dark:shadow-none' : 'hover:shadow-md'}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-500">Machine</h3>
          <p className="text-3xl font-bold dark:text-slate-100">#{machine.id}</p>
        </div>
        <div className={`w-12 h-12 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-sm border border-transparent dark:border-slate-700`}>
          <svg className={`w-6 h-6 ${getIconColor()} ${machine.status === MachineStatus.RUNNING ? 'animate-spin-slow' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 12m-3 0a3 3 0 106 0 3 3 0 10-6 0" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 7v5l2 2" />
          </svg>
        </div>
      </div>

      <div className="flex-grow space-y-2">
        <p className="text-sm font-medium">
          Status: <span className="font-bold">{machine.status}</span>
        </p>
        
        {machine.status === MachineStatus.RUNNING && (
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1">
              <span className="dark:text-slate-400">Progress</span>
              <span className="dark:text-slate-300 font-medium">{formatTime(timeLeft)} left</span>
            </div>
            <div className="w-full bg-blue-200 dark:bg-slate-700 rounded-full h-2">
              <div 
                className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-1000" 
                style={{ width: `${Math.min(100, (1 - (timeLeft / ((machine.totalDuration || 45) * 60))) * 100)}%` }}
              ></div>
            </div>
            
            {/* NEW: Time Estimation Display */}
            {estimatedEndTime && (
              <div className="mt-2 text-center">
                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                  Finishes in {minutesLeft} min ({estimatedEndTime})
                </p>
              </div>
            )}
          </div>
        )}

        {machine.currentUser && (
          <p className="text-xs italic mt-2 opacity-80 dark:text-slate-400">
            User: {machine.currentUser.name} (R: {machine.currentUser.room})
          </p>
        )}
      </div>

      <div className="mt-6 space-y-3">
        {machine.status === MachineStatus.FREE && (
          <>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-emerald-600/70 dark:text-emerald-400/70 tracking-tighter">
                Duration (e.g. 1:25 or 45)
              </label>
              <input 
                type="text"
                value={durationInput}
                onChange={(e) => {
                  setDurationInput(e.target.value);
                  if (inputError) setInputError(false);
                }}
                placeholder="HH:MM or MM"
                className={`w-full bg-white dark:bg-slate-800 border ${inputError ? 'border-red-400 focus:ring-red-500' : 'border-emerald-200 dark:border-emerald-900 focus:ring-emerald-500'} text-sm dark:text-slate-100 rounded-lg p-2 outline-none focus:ring-2 transition-all`}
              />
              {inputError && (
                <p className="text-[10px] text-red-500 font-medium">Invalid time format</p>
              )}
              
              {/* NEW: Show estimated end time before starting */}
              {durationInput && !inputError && (
                (() => {
                  const parsedMinutes = parseInputToMinutes(durationInput);
                  if (parsedMinutes && parsedMinutes > 0) {
                    const endTime = Date.now() + parsedMinutes * 60 * 1000;
                    return (
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                        Will finish around {formatEndTime(endTime)}
                      </p>
                    );
                  }
                  return null;
                })()
              )}
            </div>
            <button 
              onClick={handleStart}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white rounded-xl font-semibold transition-colors shadow-sm"
            >
              Start Wash
            </button>
          </>
        )}
        {machine.status === MachineStatus.RUNNING && (
          <button 
            disabled
            className="w-full py-2.5 px-4 bg-gray-200 dark:bg-slate-800 text-gray-400 dark:text-slate-600 cursor-not-allowed rounded-xl font-semibold transition-colors"
          >
            In Use
          </button>
        )}
        {machine.status === MachineStatus.FINISHED && (
          <button 
            onClick={() => onCollect(machine.id)}
            className={`w-full py-2.5 px-4 rounded-xl font-semibold transition-colors shadow-sm ${
              isOwner 
                ? 'bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 text-white' 
                : 'bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-slate-400'
            }`}
          >
            {isOwner ? 'Collect Laundry' : 'Mark as Free'}
          </button>
        )}
      </div>
    </div>
  );
};

export default MachineCard;