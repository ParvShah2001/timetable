import React, { useEffect, useState } from 'react';
import { formatTime, minutesToTime } from '../utils';

interface CurrentTimeLineProps {
  slotHeight: number;
  headerHeight?: number;
  startHour: number;
  endHour: number;
}

export default function CurrentTimeLine({
  slotHeight,
  headerHeight = 0,
  startHour,
  endHour,
}: CurrentTimeLineProps) {
  const [currentMinutes, setCurrentMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentMinutes(now.getHours() * 60 + now.getMinutes());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  if (currentMinutes < startHour * 60 || currentMinutes > endHour * 60) {
    return null;
  }

  const top = ((currentMinutes - startHour * 60) / 60) * slotHeight + headerHeight;
  const timeString = formatTime(minutesToTime(currentMinutes));

  return (
    <div
      className="absolute left-0 right-0 z-20 pointer-events-none"
      style={{ top: `${top}px` }}
    >
      <div className="relative w-full h-[2px] bg-red-500 shadow-sm">
        {/* Left circular indicator with 12-hour time badge */}
        <div className="absolute -left-1 -top-[4px] flex items-center">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white shadow" />
          <span className="hidden sm:inline-block ml-1 px-1 py-[1px] bg-red-500 text-white text-[9px] font-bold rounded shadow leading-none">
            {timeString}
          </span>
        </div>
      </div>
    </div>
  );
}
