import React, { useState } from 'react';
import { useApp } from '../store';
import { formatWeekLabel, offsetWeek, weekKey, getWeekDates, dayIndex } from '../utils';
import type { DayOfWeek } from '../types';
import { DAYS, WEEKDAYS } from '../types';

interface WeekNavigatorProps {
  onClearWeek: () => void;
}

export default function WeekNavigator({ onClearWeek }: WeekNavigatorProps) {
  const { state, dispatch } = useApp();
  const { year, weekNumber } = state.currentWeek;
  const [menuOpen, setMenuOpen] = useState(false);

  const handlePrevWeek = () => {
    const prev = offsetWeek(year, weekNumber, -1);
    dispatch({ type: 'SET_WEEK', year: prev.year, weekNumber: prev.weekNumber });
  };

  const handleNextWeek = () => {
    const next = offsetWeek(year, weekNumber, 1);
    dispatch({ type: 'SET_WEEK', year: next.year, weekNumber: next.weekNumber });
  };

  const handleDaySelect = (day: DayOfWeek) => {
    dispatch({ type: 'SET_SELECTED_DAY', day });
  };

  const handleDuplicateWeek = () => {
    setMenuOpen(false);
    const targetOffset = 1; // next week
    const target = offsetWeek(year, weekNumber, targetOffset);
    const sourceKey = weekKey(year, weekNumber);
    const targetKey = weekKey(target.year, target.weekNumber);
    dispatch({ type: 'DUPLICATE_WEEK', sourceWeekKey: sourceKey, targetWeekKey: targetKey });
  };

  const handleClear = () => {
    setMenuOpen(false);
    onClearWeek();
  };

  const dates = getWeekDates(year, weekNumber);
  const activeDays = state.settings.showWeekends ? DAYS : WEEKDAYS;
  const today = new Date();

  return (
    <div className="bg-white border-b border-gray-100 flex flex-col shrink-0 select-none">
      {/* Top Nav Row */}
      <div className="flex items-center justify-between h-11 px-3 sm:px-5">
        {/* Previous / Next buttons & Week Label */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={handlePrevWeek}
            className="p-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            title="Previous Week"
            aria-label="Previous Week"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <span className="text-xs sm:text-sm font-bold text-gray-800">
            {formatWeekLabel(year, weekNumber)}
          </span>

          <button
            onClick={handleNextWeek}
            className="p-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            title="Next Week"
            aria-label="Next Week"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* More options menu (Duplicate / Clear) */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Week Actions"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-100 rounded-xl shadow-xl z-40 py-1 text-xs">
                <button
                  onClick={handleDuplicateWeek}
                  className="w-full text-left px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy to Next Week
                </button>
                <button
                  onClick={handleClear}
                  className="w-full text-left px-4 py-2 font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Clear Entire Week
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Quick Day Selector Strip (shown on mobile or when in Day/3-Day view) */}
      {(state.viewMode === 'day' || state.viewMode === '3day') && (
        <div className="flex items-center justify-between px-3 py-1 bg-gray-50/70 border-t border-gray-100 overflow-x-auto gap-1">
          {activeDays.map((day: DayOfWeek) => {
            const d = dates[dayIndex(day)];
            const isSelected = state.selectedDay === day;
            const isToday =
              d.getUTCFullYear() === today.getFullYear() &&
              d.getUTCMonth() === today.getMonth() &&
              d.getUTCDate() === today.getDate();

            return (
              <button
                key={day}
                type="button"
                onClick={() => handleDaySelect(day)}
                className={`flex-1 py-1 px-1 rounded-lg flex flex-col items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm font-bold'
                    : 'text-gray-600 hover:bg-gray-200/60'
                }`}
              >
                <span className="text-[9px] uppercase tracking-wider leading-none">
                  {day.slice(0, 3)}
                </span>
                <span
                  className={`text-xs mt-0.5 leading-none ${
                    isToday && !isSelected
                      ? 'w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold'
                      : ''
                  }`}
                >
                  {d.getUTCDate()}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
