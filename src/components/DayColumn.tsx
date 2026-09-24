import React, { useRef, useMemo } from 'react';
import type { DayOfWeek, TimetableEvent } from '../types';
import { computeDayEventLayouts } from '../utils';
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
  headerHeight?: number;
  startHour: number;
  endHour: number;
  onCardDragStart: (event: TimetableEvent, startX: number, startY: number, cardRect: DOMRect) => void;
  draggingEventId?: string | null;
}

export default function DayColumn({
  day,
  events,
  onEventEdit,
  gridInterval,
  slotHeight,
  startHour,
  endHour,
  onCardDragStart,
  draggingEventId,
}: DayColumnProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  const hoursCount = endHour - startHour;
  const totalHeight = hoursCount * slotHeight;
  const slotsPerHour = 60 / gridInterval;
  const subSlotHeight = slotHeight / slotsPerHour;
  const totalSubSlots = hoursCount * slotsPerHour;

  // Compute side-by-side layout for overlapping events
  const layouts = useMemo(() => computeDayEventLayouts(events), [events]);

  return (
    <div
      data-day-column={day}
      style={{ height: `${totalHeight}px`, minHeight: `${totalHeight}px` }}
      className="flex-1 min-w-0 relative border-r border-gray-100 last:border-r-0 select-none group/day"
    >
      {/* Grid area: Full explicit height so all hours and events are 100% visible */}
      <div
        ref={gridRef}
        style={{ height: `${totalHeight}px`, minHeight: `${totalHeight}px` }}
        className="relative w-full"
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
            <EventCard
              key={event.id}
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
          );
        })}

        {/* Bottom border line for endHour */}
        <div
          className="absolute left-0 right-0 border-b border-gray-200 pointer-events-none"
          style={{ top: `${totalHeight}px` }}
        />
      </div>
    </div>
  );
}
