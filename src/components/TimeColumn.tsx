import React from 'react';
import { formatTime } from '../utils';

interface TimeColumnProps {
  slotHeight: number;
  headerHeight: number;
  gridInterval: number;
  startHour: number;
  endHour: number;
}

export default function TimeColumn({
  slotHeight,
  headerHeight,
  gridInterval,
  startHour,
  endHour,
}: TimeColumnProps) {
  const hoursCount = endHour - startHour;
  const slotsPerHour = 60 / gridInterval;
  const subSlotHeight = slotHeight / slotsPerHour;

  return (
    <div className="w-14 sm:w-16 flex-shrink-0 bg-white border-r border-gray-100 select-none z-10">
      {/* Align with day headers */}
      <div style={{ height: headerHeight }} className="border-b border-gray-100 flex items-center justify-center">
        <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">TIME</span>
      </div>

      <div className="relative w-full">
        {Array.from({ length: hoursCount }, (_, hi) => {
          const hour = startHour + hi;
          const timeStr = `${hour.toString().padStart(2, '0')}:00`;

          return (
            <div key={hour} style={{ height: slotHeight }} className="relative">
              {/* 12-Hour Label */}
              <span className="absolute right-2 -top-[6px] text-[10px] text-gray-500 font-semibold leading-none tracking-tight">
                {formatTime(timeStr)}
              </span>

              {/* Sub-hour ticks for 15 / 30 min */}
              {slotsPerHour === 2 && (
                <div
                  className="absolute right-0 w-2.5 border-b border-gray-200"
                  style={{ top: `${subSlotHeight}px` }}
                />
              )}
              {slotsPerHour === 4 && (
                <>
                  <div
                    className="absolute right-0 w-1.5 border-b border-gray-200"
                    style={{ top: `${subSlotHeight}px` }}
                  />
                  <div
                    className="absolute right-0 w-2.5 border-b border-gray-300"
                    style={{ top: `${subSlotHeight * 2}px` }}
                  />
                  <div
                    className="absolute right-0 w-1.5 border-b border-gray-200"
                    style={{ top: `${subSlotHeight * 3}px` }}
                  />
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
