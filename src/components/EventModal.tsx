import React, { useState, useEffect, useMemo } from 'react';
import type { DayOfWeek, Category, TimetableEvent } from '../types';
import { DAYS, DEFAULT_CATEGORIES, EVENT_COLORS } from '../types';
import { useApp } from '../store';
import {
  generateId,
  timeToMinutes,
  minutesToTime,
  formatTime,
  formatDuration,
  formatTimeRange,
} from '../utils';

/* ── 12-Hour Converter Helpers ── */

function parseTo12h(time24: string): { hour12: number; minute: number; period: 'AM' | 'PM' } {
  if (!time24) return { hour12: 9, minute: 0, period: 'AM' };
  const [h, m] = time24.split(':').map(Number);
  const safeH = isNaN(h) ? 9 : h;
  const safeM = isNaN(m) ? 0 : m;
  const period: 'AM' | 'PM' = safeH >= 12 ? 'PM' : 'AM';
  const hour12 = safeH === 0 ? 12 : safeH > 12 ? safeH - 12 : safeH;
  return { hour12, minute: safeM, period };
}

function convertTo24h(hour12: number, minute: number, period: 'AM' | 'PM'): string {
  let h = hour12;
  if (period === 'AM' && h === 12) h = 0;
  if (period === 'PM' && h !== 12) h += 12;
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

const CATEGORY_COLORS: Record<Category, string> = {
  Work: '#3b82f6',     // blue
  Study: '#8b5cf6',    // violet
  Personal: '#10b981', // emerald
  Exercise: '#f97316', // orange
  Meeting: '#f59e0b',  // amber
  Other: '#64748b',    // slate
};

interface EventModalProps {
  open: boolean;
  onClose: () => void;
  editEvent?: TimetableEvent | null;
  defaultDay?: DayOfWeek;
  defaultStartTime?: string;
  defaultEndTime?: string;
}

export default function EventModal({
  open,
  onClose,
  editEvent,
  defaultDay,
  defaultStartTime,
  defaultEndTime,
}: EventModalProps) {
  const { state, dispatch, currentWeekKey } = useApp();

  const [title, setTitle] = useState('');
  const [day, setDay] = useState<DayOfWeek>('Monday');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState<Category>('Work');
  const [color, setColor] = useState<string>(EVENT_COLORS[0]);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (open) {
      if (editEvent) {
        setTitle(editEvent.title);
        setDay(editEvent.day);
        setStartTime(editEvent.startTime);
        setEndTime(editEvent.endTime);
        setDescription(editEvent.description || '');
        setLocation(editEvent.location || '');
        setCategory(editEvent.category);
        setColor(editEvent.color);
        setShowDetails(Boolean(editEvent.location || editEvent.description));
      } else {
        setTitle('');
        setDay(defaultDay || state.selectedDay || 'Monday');
        setStartTime(defaultStartTime || '09:00');
        setEndTime(defaultEndTime || '10:00');
        setDescription('');
        setLocation('');
        setCategory('Work');
        setColor(CATEGORY_COLORS.Work);
        setShowDetails(false);
      }
    }
  }, [open, editEvent, defaultDay, defaultStartTime, defaultEndTime, state.selectedDay]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const durationMins = Math.max(0, timeToMinutes(endTime) - timeToMinutes(startTime));

  const applyDuration = (mins: number) => {
    const startMins = timeToMinutes(startTime);
    const newEnd = startMins + mins;
    setEndTime(minutesToTime(newEnd));
  };

  const handleCategorySelect = (cat: Category) => {
    setCategory(cat);
    setColor(CATEGORY_COLORS[cat] || EVENT_COLORS[0]);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const eventData: TimetableEvent = {
      id: editEvent ? editEvent.id : generateId(),
      title: title.trim(),
      day,
      startTime,
      endTime,
      description: description.trim(),
      location: location.trim(),
      category,
      color,
    };

    if (editEvent) {
      dispatch({ type: 'UPDATE_EVENT', weekKey: currentWeekKey, event: eventData });
    } else {
      dispatch({ type: 'ADD_EVENT', weekKey: currentWeekKey, event: eventData });
    }
    onClose();
  };

  const handleDelete = () => {
    if (editEvent) {
      dispatch({ type: 'DELETE_EVENT', weekKey: currentWeekKey, eventId: editEvent.id });
      onClose();
    }
  };

  const handleDuplicate = () => {
    if (editEvent) {
      dispatch({ type: 'DUPLICATE_EVENT', weekKey: currentWeekKey, eventId: editEvent.id });
      onClose();
    }
  };

  /* Time breakdown for start & end */
  const start12 = parseTo12h(startTime);
  const end12 = parseTo12h(endTime);

  const updateStartTime = (h: number, m: number, p: 'AM' | 'PM') => {
    const newStart24 = convertTo24h(h, m, p);
    setStartTime(newStart24);
    // If end is before or equal to start, push end forward
    if (timeToMinutes(newStart24) >= timeToMinutes(endTime)) {
      setEndTime(minutesToTime(timeToMinutes(newStart24) + (durationMins || 60)));
    }
  };

  const updateEndTime = (h: number, m: number, p: 'AM' | 'PM') => {
    const newEnd24 = convertTo24h(h, m, p);
    setEndTime(newEnd24);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Clean, un-clustered Modal Card */}
      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10 border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 pt-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className="w-3.5 h-3.5 rounded-full ring-2 ring-offset-2 ring-transparent transition-all shadow-sm"
              style={{ backgroundColor: color }}
            />
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">
              {editEvent ? 'Edit Event' : 'New Event'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="px-6 py-3 space-y-4 overflow-y-auto max-h-[80vh]">
          {/* Title Input */}
          <div>
            <input
              type="text"
              required
              autoFocus={!editEvent}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What are you scheduling?"
              className="w-full px-3.5 py-2.5 text-base font-semibold text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-gray-400 placeholder:font-normal"
            />
          </div>

          {/* Day & Time Card */}
          <div className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-200/80 space-y-3">
            {/* Day Selector */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Day</span>
              <select
                value={day}
                onChange={(e) => setDay(e.target.value as DayOfWeek)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-2xs"
              >
                {DAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* 12-Hour Time Selectors */}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-200/60">
              {/* Start Time */}
              <div>
                <span className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Start
                </span>
                <div className="flex items-center gap-1">
                  <select
                    value={start12.hour12}
                    onChange={(e) => updateStartTime(Number(e.target.value), start12.minute, start12.period)}
                    className="w-12 h-9 text-center bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <span className="font-bold text-gray-400">:</span>
                  <select
                    value={start12.minute}
                    onChange={(e) => updateStartTime(start12.hour12, Number(e.target.value), start12.period)}
                    className="w-12 h-9 text-center bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                  >
                    {[0, 15, 30, 45].map((m) => (
                      <option key={m} value={m}>
                        {String(m).padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => updateStartTime(start12.hour12, start12.minute, start12.period === 'AM' ? 'PM' : 'AM')}
                    className="h-9 px-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-blue-600 hover:bg-gray-50 active:bg-gray-100 shadow-2xs"
                  >
                    {start12.period}
                  </button>
                </div>
              </div>

              {/* End Time */}
              <div>
                <span className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  End
                </span>
                <div className="flex items-center gap-1">
                  <select
                    value={end12.hour12}
                    onChange={(e) => updateEndTime(Number(e.target.value), end12.minute, end12.period)}
                    className="w-12 h-9 text-center bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <span className="font-bold text-gray-400">:</span>
                  <select
                    value={end12.minute}
                    onChange={(e) => updateEndTime(end12.hour12, Number(e.target.value), end12.period)}
                    className="w-12 h-9 text-center bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                  >
                    {[0, 15, 30, 45].map((m) => (
                      <option key={m} value={m}>
                        {String(m).padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => updateEndTime(end12.hour12, end12.minute, end12.period === 'AM' ? 'PM' : 'AM')}
                    className="h-9 px-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-blue-600 hover:bg-gray-50 active:bg-gray-100 shadow-2xs"
                  >
                    {end12.period}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Duration Preset Pills */}
            <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between gap-1 flex-wrap">
              <span className="text-[11px] font-semibold text-gray-500">
                Duration: <strong className="text-gray-800">{formatDuration(durationMins)}</strong>
              </span>
              <div className="flex items-center gap-1">
                {[
                  { label: '30m', mins: 30 },
                  { label: '45m', mins: 45 },
                  { label: '1h', mins: 60 },
                  { label: '1.5h', mins: 90 },
                  { label: '2h', mins: 120 },
                ].map((p) => (
                  <button
                    key={p.mins}
                    type="button"
                    onClick={() => applyDuration(p.mins)}
                    className={`px-2 py-0.5 text-[11px] font-bold rounded-md border transition-all ${
                      durationMins === p.mins
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Category Chips */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
              Category
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {DEFAULT_CATEGORIES.map((cat) => {
                const isSelected = category === cat;
                const catColor = CATEGORY_COLORS[cat];
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategorySelect(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                      isSelected
                        ? 'bg-gray-900 text-white shadow-sm ring-2 ring-gray-900/20'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200/80 hover:text-gray-900'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: catColor }}
                    />
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Details (Collapsible so it's never clustered!) */}
          {!showDetails ? (
            <button
              type="button"
              onClick={() => setShowDetails(true)}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 pt-1 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Add location, notes, or custom color
            </button>
          ) : (
            <div className="space-y-3 pt-2 border-t border-gray-100 animate-in fade-in duration-100">
              {/* Location */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Room 204, Office, Google Meet"
                  className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add meeting agenda, links, notes..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none transition-colors"
                />
              </div>

              {/* Custom Color Dot Palette */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  Custom Color
                </label>
                <div className="flex items-center gap-2">
                  {EVENT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full transition-transform active:scale-90 ${
                        color === c ? 'ring-2 ring-offset-2 ring-gray-800 scale-110 shadow-sm' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-gray-100 flex items-center gap-2">
            {editEvent ? (
              <>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 active:bg-red-200 rounded-xl transition-colors mr-auto"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={handleDuplicate}
                  className="px-3 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-xl transition-colors"
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-md transition-all"
                >
                  Save Changes
                </button>
              </>
            ) : (
              <div className="flex items-center justify-end w-full gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-md hover:shadow-lg transition-all"
                >
                  Create Event
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
