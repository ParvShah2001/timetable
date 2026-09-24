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

const DAY_HEADER_H = 38;
const BOTTOM_BUFFER_H = 14;

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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [slotHeight, setSlotHeight] = useState(40);
  const [activeDrag, setActiveDrag] = useState<DraggingCardState | null>(null);

  const { startHour, gridInterval } = state.settings;

  // Dynamically ensure the timetable includes any event that extends past settings.endHour
  const maxEventEndHour = useMemo(() => {
    let maxHour = state.settings.endHour;
    currentEvents.forEach((ev) => {
      const endMins = timeToMinutes(ev.endTime);
      const endH = Math.ceil(endMins / 60);
      if (endH > maxHour) maxHour = endH;
    });
    return Math.min(24, Math.max(state.settings.endHour, maxHour));
  }, [currentEvents, state.settings.endHour]);

  const effectiveEndHour = maxEventEndHour;
  const hoursCount = effectiveEndHour - startHour;
  const totalGridHeight = hoursCount * slotHeight;

  /* ── Dynamic single-screen fit calculation (with phone landscape vertical scrolling) ── */
  const recalcSlotHeight = useCallback(() => {
    if (!containerRef.current) return;
    const h = containerRef.current.clientHeight;
    const availableGridH = Math.max(100, h - DAY_HEADER_H - BOTTOM_BUFFER_H);
    const fitH = availableGridH / hoursCount;

    // Detect if viewport is in phone landscape or severely height-constrained (< 600px)
    const isLandscape = window.innerWidth > window.innerHeight;
    const isLandscapePhone = isLandscape && window.innerHeight < 600;

    if (isLandscapePhone || fitH < 26) {
      // In phone landscape, enforce comfortable slot height so hours never overlap or get cut,
      // enabling smooth vertical scrolling while day headers stay permanently visible at the top!
      setSlotHeight(46);
    } else {
      // In portrait / tablet / desktop, fit 100% on the single screen with zero scrolling
      setSlotHeight(Math.max(20, fitH));
    }
  }, [hoursCount]);

  useLayoutEffect(() => {
    recalcSlotHeight();
    const ro = new ResizeObserver(recalcSlotHeight);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', recalcSlotHeight);
    window.addEventListener('orientationchange', recalcSlotHeight);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', recalcSlotHeight);
      window.removeEventListener('orientationchange', recalcSlotHeight);
    };
  }, [recalcSlotHeight]);

  /* ── Dynamic visible days based on Show Weekends toggle ── */
  const visibleDays: DayOfWeek[] = useMemo(
    () => (state.settings.showWeekends ? DAYS : WEEKDAYS),
    [state.settings.showWeekends]
  );
  const dates = useMemo(
    () => getWeekDates(state.currentWeek.year, state.currentWeek.weekNumber),
    [state.currentWeek.year, state.currentWeek.weekNumber]
  );

  const today = new Date();

  /* ── Drag controller: dashed card follows mouse/touch with auto-scroll ── */
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

      let lastPointer: { clientX: number; clientY: number } | null = { clientX: startX, clientY: startY };
      let animFrameId: number | null = null;

      const updateDragPosition = (clientX: number, clientY: number) => {
        if (!gridContainerRef.current || !scrollContainerRef.current) return;

        const gridRect = gridContainerRef.current.getBoundingClientRect();
        const scrollTop = scrollContainerRef.current.scrollTop;

        // Detect which day column the cursor is currently over
        const dayCols = gridContainerRef.current.querySelectorAll('[data-day-column]');
        let detectedDay = event.day;

        dayCols.forEach((col) => {
          const r = col.getBoundingClientRect();
          if (clientX >= r.left && clientX <= r.right) {
            const attr = col.getAttribute('data-day-column');
            if (attr) detectedDay = attr as DayOfWeek;
          }
        });

        // Compute content Y relative to scrolled timetable
        const contentY = (clientY - gridRect.top) + scrollTop;
        const rawMins = startHour * 60 + ((contentY - grabOffsetY) / slotHeight) * 60;
        const snappedStart = snapToGrid(rawMins, gridInterval);
        const clampedStart = Math.max(
          startHour * 60,
          Math.min(effectiveEndHour * 60 - duration, snappedStart)
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

      // Auto-scroll loop when dragging near top/bottom edges of the scrollable grid
      const autoScrollLoop = () => {
        if (!scrollContainerRef.current || !lastPointer) {
          animFrameId = requestAnimationFrame(autoScrollLoop);
          return;
        }

        const containerRect = scrollContainerRef.current.getBoundingClientRect();
        const topThreshold = containerRect.top + 50;
        const bottomThreshold = containerRect.bottom - 50;

        let scrolled = false;
        if (lastPointer.clientY < topThreshold) {
          const intensity = Math.min(1, Math.max(0.1, (topThreshold - lastPointer.clientY) / 50));
          const speed = Math.max(3, Math.round(intensity * 14));
          const oldScroll = scrollContainerRef.current.scrollTop;
          scrollContainerRef.current.scrollTop -= speed;
          if (scrollContainerRef.current.scrollTop !== oldScroll) {
            scrolled = true;
          }
        } else if (lastPointer.clientY > bottomThreshold) {
          const intensity = Math.min(1, Math.max(0.1, (lastPointer.clientY - bottomThreshold) / 50));
          const speed = Math.max(3, Math.round(intensity * 14));
          const oldScroll = scrollContainerRef.current.scrollTop;
          scrollContainerRef.current.scrollTop += speed;
          if (scrollContainerRef.current.scrollTop !== oldScroll) {
            scrolled = true;
          }
        }

        if (scrolled) {
          updateDragPosition(lastPointer.clientX, lastPointer.clientY);
        }

        animFrameId = requestAnimationFrame(autoScrollLoop);
      };

      animFrameId = requestAnimationFrame(autoScrollLoop);

      const handlePointerMove = (e: PointerEvent) => {
        lastPointer = { clientX: e.clientX, clientY: e.clientY };
        updateDragPosition(e.clientX, e.clientY);
      };

      const handlePointerUp = () => {
        if (animFrameId !== null) {
          cancelAnimationFrame(animFrameId);
        }
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
    [dispatch, currentWeekKey, slotHeight, gridInterval, startHour, effectiveEndHour]
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
      className="w-full h-full bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200/90 flex flex-col overflow-hidden relative select-none"
    >
      {/* ── Fixed Unified Header Row: Permanently stays at the top, NEVER vanishes ── */}
      <div
        style={{ height: `${DAY_HEADER_H}px` }}
        className="flex flex-shrink-0 border-b border-gray-200 bg-white z-20 shadow-2xs"
      >
        {/* Corner TIME header cell */}
        <div className="w-10 sm:w-14 md:w-16 flex-shrink-0 border-r border-gray-100 flex items-center justify-center bg-white">
          <span className="text-[8px] sm:text-[9px] font-bold text-gray-400 uppercase tracking-wider">
            TIME
          </span>
        </div>

        {/* Day Header Columns */}
        <div className="flex flex-1 min-w-0">
          {visibleDays.map((day) => {
            const date = dates[dayIndex(day)];
            const isToday =
              date.getUTCFullYear() === today.getFullYear() &&
              date.getUTCMonth() === today.getMonth() &&
              date.getUTCDate() === today.getDate();

            return (
              <div
                key={day}
                className={`flex-1 min-w-0 border-r border-gray-100 last:border-r-0 flex flex-col items-center justify-center transition-colors ${
                  isToday ? 'bg-blue-50/60' : 'bg-white'
                }`}
              >
                <div className="text-[9px] sm:text-[10px] text-gray-500 uppercase font-bold tracking-wider leading-none">
                  <span className="sm:hidden">{day.slice(0, 1)}</span>
                  <span className="hidden sm:inline">{day.slice(0, 3)}</span>
                </div>
                <div
                  className={`mt-0.5 sm:mt-1 text-[11px] sm:text-xs font-black flex items-center justify-center leading-none ${
                    isToday
                      ? 'w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-600 text-white shadow-sm'
                      : 'text-gray-800'
                  }`}
                >
                  {date.getUTCDate()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Scrollable grid area (scrolls smoothly in landscape mode) ── */}
      <div
        ref={scrollContainerRef}
        className="flex flex-1 overflow-y-auto overflow-x-hidden relative touch-pan-y"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* 12-Hour Time Column */}
        <TimeColumn
          slotHeight={slotHeight}
          gridInterval={gridInterval}
          startHour={startHour}
          endHour={effectiveEndHour}
        />

        {/* Days Columns: Pure flex-1, 100% width, zero horizontal scrolling */}
        <div
          ref={gridContainerRef}
          style={{ height: `${totalGridHeight}px`, minHeight: `${totalGridHeight}px` }}
          className="flex flex-1 relative min-w-0"
        >
          <CurrentTimeLine
            slotHeight={slotHeight}
            startHour={startHour}
            endHour={effectiveEndHour}
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
                startHour={startHour}
                endHour={effectiveEndHour}
                onCardDragStart={handleCardDragStart}
                draggingEventId={activeDrag?.event.id}
              />
            );
          })}

          {/* Dashed Card following the mouse/touch on the grid */}
          {activeDrag && dropTargetSlotStyle && (
            <div
              style={{
                position: 'absolute',
                top: dropTargetSlotStyle.top,
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
