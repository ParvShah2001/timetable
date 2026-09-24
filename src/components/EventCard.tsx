import React, { useState, useRef } from 'react';
import type { TimetableEvent } from '../types';
import { timeToMinutes, minutesToTime, snapToGrid, formatTime, formatTimeRange, formatDuration } from '../utils';
import { useApp } from '../store';

interface EventCardProps {
  event: TimetableEvent;
  onEdit: (event: TimetableEvent) => void;
  gridInterval: number;
  slotHeight: number;
  startHour: number;
  endHour: number;
  colIndex?: number;
  totalCols?: number;
  onDragStart?: (event: TimetableEvent, startX: number, startY: number, cardRect: DOMRect) => void;
  isDragging?: boolean;
}

export default function EventCard({
  event,
  onEdit,
  gridInterval,
  slotHeight,
  startHour,
  endHour,
  colIndex = 0,
  totalCols = 1,
  onDragStart,
  isDragging = false,
}: EventCardProps) {
  const { dispatch, currentWeekKey } = useApp();
  const cardRef = useRef<HTMLDivElement>(null);

  const [isResizing, setIsResizing] = useState(false);
  const [resizePreview, setResizePreview] = useState<{ startTime: string; endTime: string } | null>(null);

  const resizeTypeRef = useRef<'top' | 'bottom'>('bottom');
  const startYRef = useRef(0);
  const isPointerDownRef = useRef(false);

  const baseStart = timeToMinutes(event.startTime);
  const baseEnd = timeToMinutes(event.endTime);

  const displayStart = resizePreview ? timeToMinutes(resizePreview.startTime) : baseStart;
  const displayEnd = resizePreview ? timeToMinutes(resizePreview.endTime) : baseEnd;

  const top = ((displayStart - startHour * 60) / 60) * slotHeight;
  const height = ((displayEnd - displayStart) / 60) * slotHeight;
  const minH = Math.max(20, (gridInterval / 60) * slotHeight);
  const cardPx = Math.max(minH, height);

  // Side-by-side columns for overlapping events
  const widthPercent = 100 / totalCols;
  const leftPercent = colIndex * widthPercent;

  /* ── Resize handler ── */
  const handleResizePointerDown = (e: React.PointerEvent, type: 'top' | 'bottom') => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    resizeTypeRef.current = type;
    setIsResizing(true);
    startYRef.current = e.clientY;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaY = moveEvent.clientY - startYRef.current;
      const deltaMins = (deltaY / slotHeight) * 60;

      if (type === 'bottom') {
        const rawEnd = baseEnd + deltaMins;
        const snappedEnd = snapToGrid(rawEnd, gridInterval);
        const clampedEnd = Math.min(
          endHour * 60,
          Math.max(baseStart + gridInterval, snappedEnd)
        );
        setResizePreview({
          startTime: event.startTime,
          endTime: minutesToTime(clampedEnd),
        });
      } else {
        const rawStart = baseStart + deltaMins;
        const snappedStart = snapToGrid(rawStart, gridInterval);
        const clampedStart = Math.max(
          startHour * 60,
          Math.min(baseEnd - gridInterval, snappedStart)
        );
        setResizePreview({
          startTime: minutesToTime(clampedStart),
          endTime: event.endTime,
        });
      }
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      try {
        (e.target as HTMLElement).releasePointerCapture(upEvent.pointerId);
      } catch { /* ignore */ }

      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);

      setResizePreview((latest) => {
        if (latest && (latest.startTime !== event.startTime || latest.endTime !== event.endTime)) {
          dispatch({
            type: 'RESIZE_EVENT',
            weekKey: currentWeekKey,
            eventId: event.id,
            newStartTime: latest.startTime,
            newEndTime: latest.endTime,
          });
        }
        return null;
      });
      setIsResizing(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  /* ── Card pointer down: tap to open edit modal, or drag to move ── */
  const handleCardPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || isResizing) return;
    // If user clicked resize handle, don't initiate drag or tap-edit
    if ((e.target as HTMLElement).closest('[data-resize-handle]')) return;

    isPointerDownRef.current = true;
    const startX = e.clientX;
    const startY = e.clientY;

    const handleMove = (moveEvent: PointerEvent) => {
      if (!isPointerDownRef.current) return;
      const dist = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
      if (dist > 5) {
        // Initiated drag!
        isPointerDownRef.current = false;
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);

        if (onDragStart && cardRef.current) {
          const rect = cardRef.current.getBoundingClientRect();
          onDragStart(event, startX, startY, rect);
        }
      }
    };

    const handleUp = () => {
      if (isPointerDownRef.current) {
        onEdit(event);
      }
      isPointerDownRef.current = false;
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  const isVerySmall = cardPx < 26;
  const isSmall = cardPx >= 26 && cardPx < 42;

  return (
    <div
      ref={cardRef}
      style={{
        position: 'absolute',
        top: `${Math.max(0, top)}px`,
        height: `${cardPx}px`,
        left: `calc(${leftPercent}% + 1px)`,
        width: `calc(${widthPercent}% - 2px)`,
        borderLeftWidth: '4px',
        borderLeftColor: event.color,
        borderLeftStyle: 'solid',
        backgroundColor: `${event.color}18`,
        zIndex: isResizing ? 30 : 10,
        opacity: isDragging ? 0.3 : 1,
      }}
      className={`group rounded-lg shadow-sm border border-gray-200/70 overflow-hidden flex flex-col select-none touch-none cursor-pointer active:cursor-grabbing transition-shadow hover:shadow-md ${
        isResizing ? 'ring-2 ring-blue-500 shadow-lg' : ''
      }`}
      onPointerDown={handleCardPointerDown}
    >
      {/* Top resize handle */}
      <div
        data-resize-handle="top"
        className="absolute top-0 left-0 right-0 h-3 cursor-ns-resize z-20 flex justify-center items-start pt-[1px] opacity-0 group-hover:opacity-100 sm:opacity-0 active:opacity-100 transition-opacity touch-none"
        onPointerDown={(e) => handleResizePointerDown(e, 'top')}
        title="Drag to change start time"
      >
        <div className="h-[2.5px] w-6 rounded-full bg-gray-400 hover:bg-blue-600 transition-colors" />
      </div>

      {/* Resize live tooltip */}
      {isResizing && resizePreview && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-40 bg-gray-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap">
          {formatTime(resizePreview.startTime)} – {formatTime(resizePreview.endTime)} ({formatDuration(timeToMinutes(resizePreview.endTime) - timeToMinutes(resizePreview.startTime))})
        </div>
      )}

      {/* Card Header & Content (Tap to edit) */}
      <div className="flex-1 p-1 sm:p-1.5 overflow-hidden flex flex-col justify-start leading-tight">
        {/* Title: ALWAYS fully readable, never truncated with ... */}
        <div
          className={`font-bold text-gray-900 break-words whitespace-normal leading-snug ${
            isVerySmall ? 'text-[9px]' : isSmall ? 'text-[10px]' : 'text-xs'
          }`}
          title={event.title}
        >
          {event.title}
        </div>

        {/* 12-Hour Time: Full time string, wrapped if needed, never truncated with ellipsis */}
        <div
          className={`font-semibold text-gray-600 mt-0.5 leading-snug break-words ${
            isVerySmall ? 'text-[8px]' : isSmall ? 'text-[9px]' : 'text-[10px]'
          }`}
        >
          {formatTime(resizePreview?.startTime || event.startTime)} – {formatTime(resizePreview?.endTime || event.endTime)}
        </div>
      </div>

      {/* Bottom resize handle */}
      <div
        data-resize-handle="bottom"
        className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize z-20 flex justify-center items-end pb-[1px] opacity-0 group-hover:opacity-100 sm:opacity-0 active:opacity-100 transition-opacity touch-none"
        onPointerDown={(e) => handleResizePointerDown(e, 'bottom')}
        title="Drag to change end time"
      >
        <div className="h-[2.5px] w-6 rounded-full bg-gray-400 hover:bg-blue-600 transition-colors" />
      </div>
    </div>
  );
}
