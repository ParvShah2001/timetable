import React, { useRef, useEffect } from 'react';
import { useApp } from '../store';
import { useAuth } from '../context/AuthContext';
import type { GridInterval, TimeRangePreset } from '../types';
import { exportToJSON, importFromJSON } from '../utils';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { state, dispatch } = useApp();
  const { user, isConfigured, signOut, resetConfig } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const handleGridInterval = (interval: GridInterval) => {
    dispatch({ type: 'UPDATE_SETTINGS', settings: { gridInterval: interval } });
  };

  const handleTimeRange = (preset: TimeRangePreset) => {
    let startHour = 7;
    let endHour = 22;
    if (preset === 'work') {
      startHour = 8;
      endHour = 18;
    } else if (preset === 'full') {
      startHour = 6;
      endHour = 23;
    }
    dispatch({
      type: 'UPDATE_SETTINGS',
      settings: { timeRangePreset: preset, startHour, endHour },
    });
  };

  const handleToggleWeekends = () => {
    dispatch({
      type: 'UPDATE_SETTINGS',
      settings: { showWeekends: !state.settings.showWeekends },
    });
  };

  const handleToggleOverlap = () => {
    dispatch({
      type: 'UPDATE_SETTINGS',
      settings: { allowOverlap: !state.settings.allowOverlap },
    });
  };

  const handleExport = () => {
    const jsonStr = exportToJSON(state.events);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timetable-${state.currentWeek.year}-W${state.currentWeek.weekNumber}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const text = await file.text();
        const events = importFromJSON(text);
        if (events) {
          dispatch({ type: 'IMPORT_EVENTS', events });
        } else {
          alert('Invalid JSON file format.');
        }
      } catch {
        alert('Error reading file.');
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 overflow-hidden transition-all ${
        open ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
    >
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div
        className={`fixed inset-y-0 right-0 w-full sm:w-88 max-w-sm bg-white shadow-2xl transition-transform duration-200 ease-out flex flex-col z-10 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h2 className="text-base font-bold text-gray-900">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-5 space-y-6 overflow-y-auto flex-1">
          {/* Account & Database */}
          <section className="p-3.5 bg-gray-50/90 rounded-xl border border-gray-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Account & Database</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                {isConfigured ? 'Supabase Sync Active' : 'Offline Mode'}
              </span>
            </div>
            
            <div className="text-xs">
              <div className="text-gray-400 text-[10px] uppercase font-semibold">Signed in as</div>
              <div className="font-semibold text-gray-800 truncate" title={user?.email || ''}>
                {user?.email || 'Guest User'}
              </div>
            </div>

            <div className="pt-2 border-t border-gray-200/60 flex flex-col gap-1.5">
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between px-2.5 py-1.5 text-[11px] font-medium text-gray-700 hover:text-emerald-700 hover:bg-emerald-50/60 rounded-lg transition-colors border border-gray-200/60 bg-white"
              >
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21.362 9.354H12V.396a.396.396 0 0 0-.716-.233L2.2 12.604A.396.396 0 0 0 2.518 13.2h9.362v8.958a.396.396 0 0 0 .716.233l9.084-12.441a.396.396 0 0 0-.318-.596z" />
                  </svg>
                  Supabase Dashboard (Manage Users & Data)
                </span>
                <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Disconnect Supabase credentials and clear saved API keys on this browser?')) {
                      resetConfig();
                      onClose();
                    }
                  }}
                  className="flex-1 text-[11px] font-semibold text-gray-600 hover:text-gray-900 py-1.5 px-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Change Keys
                </button>
                <button
                  type="button"
                  onClick={() => {
                    signOut();
                    onClose();
                  }}
                  className="flex-1 text-[11px] font-semibold text-red-600 hover:text-red-700 py-1.5 px-2 bg-red-50 hover:bg-red-100/80 rounded-lg border border-red-200 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </section>

          {/* Grid Snap Interval */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Grid Snap Interval
              </label>
              <span className="text-xs font-semibold text-blue-600">
                {state.settings.gridInterval === 60 ? '1 hour' : `${state.settings.gridInterval} mins`}
              </span>
            </div>
            <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
              {([15, 30, 60] as GridInterval[]).map((interval) => {
                const isSelected = state.settings.gridInterval === interval;
                return (
                  <button
                    key={interval}
                    type="button"
                    onClick={() => handleGridInterval(interval)}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                      isSelected
                        ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    {interval === 60 ? '1 Hour' : `${interval} Min`}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">
              Determines time slot lines and where cards magnetically snap when dragged or resized.
            </p>
          </section>

          {/* Visible Hours Range */}
          <section>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Daily Time Range
            </label>
            <div className="space-y-1.5">
              {[
                {
                  id: 'active',
                  title: 'Active Day (7:00 AM – 10:00 PM)',
                  desc: 'Recommended: Fits 100% of day on single screen without scrolling.',
                },
                {
                  id: 'work',
                  title: 'Work Hours (8:00 AM – 6:00 PM)',
                  desc: 'Spacious slots, best for office & business schedules.',
                },
                {
                  id: 'full',
                  title: 'Full Day (6:00 AM – 11:00 PM)',
                  desc: 'All 17 hours shown from early morning to late evening.',
                },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleTimeRange(opt.id as TimeRangePreset)}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                    state.settings.timeRangePreset === opt.id
                      ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500/20'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-bold text-gray-800">{opt.title}</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Toggles */}
          <section className="space-y-4 pt-2 border-t border-gray-100">
            {/* Allow Overlap */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-gray-800">Side-by-side Overlaps</div>
                <div className="text-[11px] text-gray-500">
                  Allow multiple events at the same time and display them side-by-side.
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleOverlap}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  state.settings.allowOverlap ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    state.settings.allowOverlap ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Show Weekends */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-gray-800">Show Weekends</div>
                <div className="text-[11px] text-gray-500">
                  Include Saturday and Sunday in the weekly timetable.
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleWeekends}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  state.settings.showWeekends ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    state.settings.showWeekends ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </section>

          {/* Backup & Data */}
          <section className="pt-2 border-t border-gray-100 space-y-2.5">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              Backup & Data
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExport}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export JSON
              </button>

              <input
                type="file"
                accept=".json"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={handleImportClick}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Import JSON
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
