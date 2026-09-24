import React from 'react';
import { formatTime } from '../utils';

interface TimeColumnProps {
  slotHeight: number;
  gridInterval: number;
  startHour: number;
  endHour: number;
  headerHeight?: number;
}

export default function TimeColumn({
  slotHeight,
  gridInterval,
  startHour,
  endHour,
}: TimeColumnProps) {
  const hoursCount = endHour - startHour;
  const totalHeight = hoursCount * slotHeight;
  const slotsPerHour = 60 / gridInterval;
  const subSlotHeight = slotHeight / slotsPerHour;

  return (
    <div
      style={{ height: `${totalHeight}px`, minHeight: `${totalHeight}px` }}
      className="w-10 sm:w-14 md:w-16 flex-shrink-0 bg-white border-r border-gray-100 select-none z-10"
    >
      <div className="relative w-full" style={{ height: `${totalHeight}px` }}>
        {Array.from({ length: hoursCount }, (_, hi) => {
          const hour = startHour + hi;
          const timeStr = `${hour.toString().padStart(2, '0')}:00`;

          return (
            <div key={hour} style={{ height: `${slotHeight}px` }} className="relative">
              {/* 12-Hour Label: First hour does not get cut off; intermediate hours centered on line */}
              <span
                className={`absolute right-1 sm:right-2 text-[8px] sm:text-[10px] text-gray-500 font-bold sm:font-semibold leading-none tracking-tight ${
                  hi === 0 ? 'top-1 sm:top-1.5' : '-top-[6px]'
                }`}
              >
                <span className="sm:hidden">{formatTime(timeStr).replace(':00', '')}</span>
                <span className="hidden sm:inline">{formatTime(timeStr)}</span>
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

        {/* End Time Label at the bottom edge */}
        <div
          className="absolute right-1 sm:right-2 text-[8px] sm:text-[10px] text-gray-500 font-bold sm:font-semibold leading-none tracking-tight -bottom-[6px]"
        >
          <span className="sm:hidden">{formatTime(`${endHour}:00`).replace(':00', '')}</span>
          <span className="hidden sm:inline">{formatTime(`${endHour}:00`)}</span>
        </div>
      </div>
    </div>
  );
}
