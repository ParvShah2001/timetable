import React, { useState, useRef, useMemo } from 'react';
import type { DayOfWeek, TimetableEvent } from '../types';
import { snapToGrid, minutesToTime, formatTimeRange, computeDayEventLayouts } from '../utils';
import EventCard from './EventCard';

interface DayColumnProps {
  day: DayOfWeek;
  date: Date;
  events: TimetableEvent[];
  onEventEdit: (event: TimetableEvent) => void;
  onCreateEvent: (day: DayOfWeek, startTime: string, endTime: string) => void;
  gridInterval: number;
  isToday: boolean;
  slotHeight: number;
  headerHeight: number;
  startHour: number;
  endHour: number;
  onCardDragStart: (event: TimetableEvent, startX: number, startY: number, cardRect: DOMRect) => void;
  draggingEventId?: string | null;
}

export default function DayColumn({
  day,
  date,
  events,
  onEventEdit,
  onCreateEvent,
  gridInterval,
  isToday,
  slotHeight,
  headerHeight,
  startHour,
  endHour,
  onCardDragStart,
  draggingEventId,
}: DayColumnProps) {
  const [dragSelection, setDragSelection] = useState<{ startY: number; currentY: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const isPointerDownRef = useRef(false);

  const hoursCount = endHour - startHour;
  const totalHeight = hoursCount * slotHeight;
  const slotsPerHour = 60 / gridInterval;
  const subSlotHeight = slotHeight / slotsPerHour;
  const totalSubSlots = hoursCount * slotsPerHour;

  // Compute side-by-side layout for overlapping events
  const layouts = useMemo(() => computeDayEventLayouts(events), [events]);

  /* ── Pointer down on empty grid space ── */
  const handleGridPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || !gridRef.current) return;
    // Don't activate if clicking an event card or handle
    if ((e.target as HTMLElement).closest('.cursor-grab, [data-resize-handle], [data-edit-btn]')) return;

    const rect = gridRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;

    isPointerDownRef.current = true;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!isPointerDownRef.current || !gridRef.current) return;
      const currentY = moveEvent.clientY - gridRef.current.getBoundingClientRect().top;
      const dist = Math.abs(currentY - y);
      if (dist > 6) {
        setDragSelection({ startY: y, currentY });
      }
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      isPointerDownRef.current = false;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);

      if (!gridRef.current) return;
      const currentY = upEvent.clientY - gridRef.current.getBoundingClientRect().top;
      const dist = Math.abs(currentY - y);

      if (dist <= 6) {
        // Deliberate tap/click on empty slot: create a single slot event!
        const clickedMin = startHour * 60 + (y / slotHeight) * 60;
        const snappedStart = snapToGrid(clickedMin, gridInterval);
        const snappedEnd = Math.min(endHour * 60, snappedStart + gridInterval);
        onCreateEvent(day, minutesToTime(snappedStart), minutesToTime(snappedEnd));
      } else {
        // Dragged range
        const startMin = startHour * 60 + (Math.min(y, currentY) / slotHeight) * 60;
        const endMin = startHour * 60 + (Math.max(y, currentY) / slotHeight) * 60;
        const snappedStart = snapToGrid(startMin, gridInterval);
        const snappedEnd = Math.min(
          endHour * 60,
          Math.max(snappedStart + gridInterval, snapToGrid(endMin, gridInterval))
        );
        onCreateEvent(day, minutesToTime(snappedStart), minutesToTime(snappedEnd));
      }

      setDragSelection(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Live selection time preview
  const selectionTimes = useMemo(() => {
    if (!dragSelection) return null;
    const startMin = startHour * 60 + (Math.min(dragSelection.startY, dragSelection.currentY) / slotHeight) * 60;
    const endMin = startHour * 60 + (Math.max(dragSelection.startY, dragSelection.currentY) / slotHeight) * 60;
    const snappedStart = snapToGrid(startMin, gridInterval);
    const snappedEnd = Math.min(
      endHour * 60,
      Math.max(snappedStart + gridInterval, snapToGrid(endMin, gridInterval))
    );
    return {
      startTime: minutesToTime(snappedStart),
      endTime: minutesToTime(snappedEnd),
    };
  }, [dragSelection, startHour, endHour, slotHeight, gridInterval]);

  return (
    <div
      data-day-column={day}
      className="flex-1 min-w-[75px] sm:min-w-0 flex flex-col border-r border-gray-100 last:border-r-0 select-none relative group/day"
    >
      {/* Day header */}
      <div
        style={{ height: headerHeight }}
        className={`border-b border-gray-100 flex flex-col items-center justify-center bg-white flex-shrink-0 transition-colors ${
          isToday ? 'bg-blue-50/50' : ''
        }`}
      >
        <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider leading-none">
          {day.slice(0, 3)}
        </div>
        <div
          className={`mt-1 text-xs font-black flex items-center justify-center leading-none ${
            isToday
              ? 'w-6 h-6 rounded-full bg-blue-600 text-white shadow-sm'
              : 'text-gray-800'
          }`}
        >
          {date.getUTCDate()}
        </div>
      </div>

      {/* Grid area */}
      <div
        ref={gridRef}
        className="relative flex-1 touch-none cursor-cell"
        style={{ height: `${totalHeight}px` }}
        onPointerDown={handleGridPointerDown}
      >
        {/* Hour and sub-hour lines */}
        {Array.from({ length: totalSubSlots }).map((_, i) => {
          const isHourLine = i % slotsPerHour === 0;
          const isHalfHourLine = slotsPerHour === 4 && i % 2 === 0;
          return (
            <div
              key={i}
              className={`absolute left-0 right-0 pointer-events-none ${
                isHourLine
                  ? 'border-b border-gray-100'
                  : isHalfHourLine
                  ? 'border-b border-dashed border-gray-100/90'
                  : 'border-b border-dotted border-gray-100/60'
              }`}
              style={{ top: `${i * subSlotHeight}px`, height: `${subSlotHeight}px` }}
            />
          );
        })}

        {/* Event cards */}
        {events.map((event) => {
          const layout = layouts[event.id] || { colIndex: 0, totalCols: 1 };
          const isBeingDragged = event.id === draggingEventId;

          return (
            <div key={event.id}>
              <EventCard
                event={event}
                onEdit={onEventEdit}
                gridInterval={gridInterval}
                slotHeight={slotHeight}
                startHour={startHour}
                endHour={endHour}
                colIndex={layout.colIndex}
                totalCols={layout.totalCols}
                onDragStart={onCardDragStart}
                isDragging={isBeingDragged}
              />
            </div>
          );
        })}

        {/* Drag creation rubber-band selection */}
        {dragSelection && selectionTimes && (
          <div
            className="absolute left-[2px] right-[2px] bg-blue-500/20 border-2 border-dashed border-blue-600 rounded-lg pointer-events-none z-30 flex items-center justify-center shadow-md animate-in fade-in duration-100"
            style={{
              top: `${Math.min(dragSelection.startY, dragSelection.currentY)}px`,
              height: `${Math.max(
                (gridInterval / 60) * slotHeight,
                Math.abs(dragSelection.currentY - dragSelection.startY)
              )}px`,
            }}
          >
            <div className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
              {formatTimeRange(selectionTimes.startTime, selectionTimes.endTime)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
