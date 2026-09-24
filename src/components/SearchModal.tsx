import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../store';
import { formatTimeRange, formatWeekLabel } from '../utils';
import type { DayOfWeek } from '../types';

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SearchModal({ open, onClose }: SearchModalProps) {
  const { state, dispatch } = useApp();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const results = [];
  const q = query.toLowerCase().trim();

  if (q) {
    for (const [wKey, events] of Object.entries(state.events)) {
      const parts = wKey.split('-W');
      if (parts.length === 2) {
        const year = parseInt(parts[0], 10);
        const weekNumber = parseInt(parts[1], 10);

        for (const event of events) {
          if (
            event.title.toLowerCase().includes(q) ||
            event.description.toLowerCase().includes(q) ||
            event.location.toLowerCase().includes(q) ||
            event.category.toLowerCase().includes(q)
          ) {
            results.push({
              event,
              year,
              weekNumber,
            });
          }
        }
      }
    }
  }

  const handleSelect = (year: number, weekNumber: number, day: DayOfWeek) => {
    dispatch({ type: 'SET_WEEK', year, weekNumber });
    dispatch({ type: 'SET_SELECTED_DAY', day });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 bg-black/35 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col z-10 border border-gray-100 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-gray-100">
          <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none focus:outline-none text-gray-900 placeholder-gray-400 text-sm font-medium"
            placeholder="Search events by title, location, category..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-84 overflow-y-auto divide-y divide-gray-50">
          {!q ? (
            <div className="p-8 text-center text-xs text-gray-400">
              Type keywords above to find timetable items across all weeks
            </div>
          ) : results.length > 0 ? (
            results.map(({ event, year, weekNumber }, idx) => (
              <div
                key={`${event.id}-${idx}`}
                onClick={() => handleSelect(year, weekNumber, event.day)}
                className="p-3.5 hover:bg-gray-50 cursor-pointer transition-colors flex items-start gap-3"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                  style={{ backgroundColor: event.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="font-bold text-xs text-gray-900 break-words whitespace-normal leading-snug">
                      {event.title}
                    </span>
                    <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded shrink-0">
                      {formatWeekLabel(year, weekNumber)}
                    </span>
                  </div>

                  {/* 12-Hour formatted day and time */}
                  <div className="text-[11px] text-gray-500 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <span className="font-semibold text-blue-600">{event.day}</span>
                    <span className="font-medium text-gray-700">
                      {formatTimeRange(event.startTime, event.endTime)}
                    </span>
                    {event.location && (
                      <span className="flex items-center text-gray-400 text-[10px]">
                        <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        {event.location}
                      </span>
                    )}
                    {event.category && (
                      <span className="text-[9px] font-medium bg-gray-100 px-1.5 py-[1px] rounded text-gray-600">
                        {event.category}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-xs text-gray-400">
              No matching events found for "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
