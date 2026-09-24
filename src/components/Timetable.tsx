import React, { useState, useRef, useLayoutEffect, useCallback, useMemo } from 'react';
import type { DayOfWeek, TimetableEvent } from '../types';
import { DAYS, WEEKDAYS } from '../types';
import { useApp } from '../store';
import {
  getWeekDates,
  dayIndex,
  timeToMinutes,
  minutesToTime,
  snapToGrid,
  formatTimeRange,
} from '../utils';
import TimeColumn from './TimeColumn';
import DayColumn from './DayColumn';
import CurrentTimeLine from './CurrentTimeLine';

const DAY_HEADER_H = 44;

interface TimetableProps {
  onEventEdit: (event: TimetableEvent) => void;
  onCreateEvent: (day: DayOfWeek, startTime: string, endTime: string) => void;
}

interface DraggingCardState {
  event: TimetableEvent;
  grabOffsetY: number;
  targetDay: DayOfWeek;
  targetStartTime: string;
  targetEndTime: string;
}

export default function Timetable({ onEventEdit, onCreateEvent }: TimetableProps) {
  const { state, dispatch, currentWeekKey, currentEvents } = useApp();
  const containerRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [slotHeight, setSlotHeight] = useState(40);
  const [activeDrag, setActiveDrag] = useState<DraggingCardState | null>(null);

  const { startHour, endHour, gridInterval } = state.settings;
  const hoursCount = endHour - startHour;

  /* ── Dynamic single-screen fit calculation ── */
  const recalcSlotHeight = useCallback(() => {
    if (!containerRef.current) return;
    const h = containerRef.current.clientHeight;
    const availableGridH = h - DAY_HEADER_H;
    const fitH = availableGridH / hoursCount;
    setSlotHeight(Math.max(26, fitH));
  }, [hoursCount]);

  useLayoutEffect(() => {
    recalcSlotHeight();
    const ro = new ResizeObserver(recalcSlotHeight);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [recalcSlotHeight]);

  /* ── Determine visible days according to viewMode ── */
  const allDays = state.settings.showWeekends ? DAYS : WEEKDAYS;
  const dates = useMemo(
    () => getWeekDates(state.currentWeek.year, state.currentWeek.weekNumber),
    [state.currentWeek.year, state.currentWeek.weekNumber]
  );

  const visibleDays: DayOfWeek[] = useMemo(() => {
    if (state.viewMode === 'day') {
      return [state.selectedDay];
    }
    if (state.viewMode === '3day') {
      const idx = allDays.indexOf(state.selectedDay);
      const safeIdx = Math.max(0, Math.min(allDays.length - 3, idx === -1 ? 0 : idx));
      return allDays.slice(safeIdx, safeIdx + 3);
    }
    return allDays;
  }, [state.viewMode, state.selectedDay, allDays]);

  const today = new Date();

  /* ── Drag controller: dashed card follows mouse across grid ── */
  const handleCardDragStart = useCallback(
    (event: TimetableEvent, startX: number, startY: number, cardRect: DOMRect) => {
      const startMins = timeToMinutes(event.startTime);
      const endMins = timeToMinutes(event.endTime);
      const duration = endMins - startMins;

      const grabOffsetY = startY - cardRect.top;

      setActiveDrag({
        event,
        grabOffsetY,
        targetDay: event.day,
        targetStartTime: event.startTime,
        targetEndTime: event.endTime,
      });

      const handlePointerMove = (e: PointerEvent) => {
        if (!gridContainerRef.current) return;

        const gridRect = gridContainerRef.current.getBoundingClientRect();
        const cursorX = e.clientX;
        const cursorY = e.clientY - gridRect.top;

        // Detect which day column the cursor is currently over
        const dayCols = gridContainerRef.current.querySelectorAll('[data-day-column]');
        let detectedDay = event.day;

        dayCols.forEach((col) => {
          const r = col.getBoundingClientRect();
          if (cursorX >= r.left && cursorX <= r.right) {
            const attr = col.getAttribute('data-day-column');
            if (attr) detectedDay = attr as DayOfWeek;
          }
        });

        // Compute snapped start time from cursor Y
        const rawMins = startHour * 60 + ((cursorY - grabOffsetY) / slotHeight) * 60;
        const snappedStart = snapToGrid(rawMins, gridInterval);
        const clampedStart = Math.max(
          startHour * 60,
          Math.min(endHour * 60 - duration, snappedStart)
        );
        const clampedEnd = clampedStart + duration;

        setActiveDrag((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            targetDay: detectedDay,
            targetStartTime: minutesToTime(clampedStart),
            targetEndTime: minutesToTime(clampedEnd),
          };
        });
      };

      const handlePointerUp = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);

        setActiveDrag((finalState) => {
          if (finalState) {
            // Commit move if day or time changed
            if (
              finalState.targetDay !== event.day ||
              finalState.targetStartTime !== event.startTime
            ) {
              dispatch({
                type: 'MOVE_EVENT',
                weekKey: currentWeekKey,
                eventId: event.id,
                newDay: finalState.targetDay,
                newStartTime: finalState.targetStartTime,
                newEndTime: finalState.targetEndTime,
              });
            }
          }
          return null;
        });
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    },
    [dispatch, currentWeekKey, slotHeight, gridInterval, startHour, endHour]
  );

  /* ── Drop target slot preview coordinates on the grid ── */
  const dropTargetSlotStyle = useMemo(() => {
    if (!activeDrag || !gridContainerRef.current) return null;
    const startMins = timeToMinutes(activeDrag.targetStartTime);
    const endMins = timeToMinutes(activeDrag.targetEndTime);
    const top = ((startMins - startHour * 60) / 60) * slotHeight;
    const height = ((endMins - startMins) / 60) * slotHeight;

    const colIdx = visibleDays.indexOf(activeDrag.targetDay);
    if (colIdx === -1) return null;

    const widthPercent = 100 / visibleDays.length;
    const leftPercent = colIdx * widthPercent;

    return {
      top: `${top}px`,
      height: `${Math.max((gridInterval / 60) * slotHeight, height)}px`,
      left: `calc(${leftPercent}% + 2px)`,
      width: `calc(${widthPercent}% - 4px)`,
    };
  }, [activeDrag, visibleDays, startHour, slotHeight, gridInterval]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-white rounded-xl shadow-sm border border-gray-200/90 flex flex-col overflow-hidden relative select-none"
    >
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sticky 12-Hour Time Column */}
        <TimeColumn
          slotHeight={slotHeight}
          headerHeight={DAY_HEADER_H}
          gridInterval={gridInterval}
          startHour={startHour}
          endHour={endHour}
        />

        {/* Days Columns */}
        <div ref={gridContainerRef} className="flex flex-1 relative min-w-0 overflow-x-auto">
          <CurrentTimeLine
            slotHeight={slotHeight}
            headerHeight={DAY_HEADER_H}
            startHour={startHour}
            endHour={endHour}
          />

          {visibleDays.map((day) => {
            const date = dates[dayIndex(day)];
            const dayEvents = currentEvents.filter((e) => e.day === day);
            const isToday =
              date.getUTCFullYear() === today.getFullYear() &&
              date.getUTCMonth() === today.getMonth() &&
              date.getUTCDate() === today.getDate();

            return (
              <DayColumn
                key={day}
                day={day}
                date={date}
                events={dayEvents}
                onEventEdit={onEventEdit}
                onCreateEvent={onCreateEvent}
                gridInterval={gridInterval}
                isToday={isToday}
                slotHeight={slotHeight}
                headerHeight={DAY_HEADER_H}
                startHour={startHour}
                endHour={endHour}
                onCardDragStart={handleCardDragStart}
                draggingEventId={activeDrag?.event.id}
              />
            );
          })}

          {/* Dashed Card following the mouse on the grid */}
          {activeDrag && dropTargetSlotStyle && (
            <div
              style={{
                position: 'absolute',
                top: `calc(${dropTargetSlotStyle.top} + ${DAY_HEADER_H}px)`,
                height: dropTargetSlotStyle.height,
                left: dropTargetSlotStyle.left,
                width: dropTargetSlotStyle.width,
                borderLeftWidth: '4px',
                borderLeftColor: activeDrag.event.color,
                borderLeftStyle: 'solid',
                backgroundColor: `${activeDrag.event.color}25`,
                zIndex: 40,
              }}
              className="rounded-lg border-2 border-dashed border-blue-600 pointer-events-none p-2 flex flex-col justify-between shadow-md transition-all duration-75 select-none"
            >
              <div className="flex items-start justify-between gap-1">
                <span className="font-bold text-xs text-gray-900 break-words whitespace-normal leading-snug">
                  {activeDrag.event.title}
                </span>
                <span className="bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap shrink-0">
                  {activeDrag.targetDay.slice(0, 3)} • {formatTimeRange(activeDrag.targetStartTime, activeDrag.targetEndTime)}
                </span>
              </div>
              {activeDrag.event.location && (
                <div className="text-[9px] text-gray-600 truncate flex items-center font-medium mt-0.5">
                  <svg className="w-2.5 h-2.5 mr-1 shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  {activeDrag.event.location}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
