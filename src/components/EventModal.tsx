import React, { useState, useEffect } from 'react';
import type { DayOfWeek, TimetableEvent } from '../types';
import { DAYS, EVENT_COLORS } from '../types';
import { useApp } from '../store';
import {
  generateId,
  timeToMinutes,
  minutesToTime,
  formatDuration,
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
  const [color, setColor] = useState<string>(EVENT_COLORS[0]);

  useEffect(() => {
    if (open) {
      if (editEvent) {
        setTitle(editEvent.title);
        setDay(editEvent.day);
        setStartTime(editEvent.startTime);
        setEndTime(editEvent.endTime);
        setDescription(editEvent.description || '');
        setColor(editEvent.color || EVENT_COLORS[0]);
      } else {
        setTitle('');
        setDay(defaultDay || state.selectedDay || 'Monday');
        setStartTime(defaultStartTime || '09:00');
        setEndTime(defaultEndTime || '10:00');
        setDescription('');
        setColor(EVENT_COLORS[0]);
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
      location: editEvent?.location || '',
      category: editEvent?.category || 'Work',
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
      const dup: TimetableEvent = {
        ...editEvent,
        id: generateId(),
        title: `${editEvent.title} (Copy)`,
      };
      dispatch({ type: 'ADD_EVENT', weekKey: currentWeekKey, event: dup });
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
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Day</span>
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

            {/* Start Time Full Row */}
            <div className="pt-2.5 border-t border-gray-200/60 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Start Time
              </span>
              <div className="flex items-center gap-1.5">
                <select
                  value={start12.hour12}
                  onChange={(e) => updateStartTime(Number(e.target.value), start12.minute, start12.period)}
                  className="w-14 h-9 text-center bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
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
                  className="w-14 h-9 text-center bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
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
                  className="h-9 px-3 bg-white border border-gray-200 rounded-lg text-xs font-bold text-blue-600 hover:bg-gray-50 active:bg-gray-100 shadow-2xs"
                >
                  {start12.period}
                </button>
              </div>
            </div>

            {/* End Time Full Row */}
            <div className="pt-2.5 border-t border-gray-200/60 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                End Time
              </span>
              <div className="flex items-center gap-1.5">
                <select
                  value={end12.hour12}
                  onChange={(e) => updateEndTime(Number(e.target.value), end12.minute, end12.period)}
                  className="w-14 h-9 text-center bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
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
                  className="w-14 h-9 text-center bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
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
                  className="h-9 px-3 bg-white border border-gray-200 rounded-lg text-xs font-bold text-blue-600 hover:bg-gray-50 active:bg-gray-100 shadow-2xs"
                >
                  {end12.period}
                </button>
              </div>
            </div>

            {/* Duration Line (clean, without recommended preset pills) */}
            <div className="pt-2.5 border-t border-gray-200/60 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Duration</span>
              <span className="text-xs font-bold text-gray-800 bg-white px-2.5 py-1 rounded-md border border-gray-200 shadow-2xs">
                {formatDuration(durationMins)}
              </span>
            </div>
          </div>

          {/* Color Selection Palette */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
              Color
            </label>
            <div className="flex items-center gap-2.5 flex-wrap">
              {EVENT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform active:scale-90 ${
                    color === c ? 'ring-2 ring-offset-2 ring-gray-900 scale-110 shadow-sm' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details, links, or notes..."
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none transition-colors"
            />
          </div>

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
