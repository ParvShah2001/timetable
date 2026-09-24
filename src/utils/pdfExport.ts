import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { AppState, TimetableEvent, DayOfWeek } from '../types';
import { DAYS, WEEKDAYS } from '../types';
import {
  getWeekDates,
  dayIndex,
  timeToMinutes,
  formatTime,
  computeDayEventLayouts,
  weekKey,
} from '../utils';

export async function exportTimetableToPDF(state: AppState): Promise<void> {
  const { year, weekNumber } = state.currentWeek;
  const { startHour, showWeekends } = state.settings;
  const activeDays: DayOfWeek[] = showWeekends ? DAYS : WEEKDAYS;
  const weekDates = getWeekDates(year, weekNumber);

  const currentKey = weekKey(year, weekNumber);
  const weekEvents: TimetableEvent[] = state.events[currentKey] || [];

  // Automatically accommodate any event that extends past settings.endHour
  let maxEventHour = state.settings.endHour;
  weekEvents.forEach((ev) => {
    const endH = Math.ceil(timeToMinutes(ev.endTime) / 60);
    if (endH > maxEventHour) maxEventHour = endH;
  });
  const effectiveEndHour = Math.min(24, maxEventHour);
  const hoursCount = effectiveEndHour - startHour;

  const HOUR_HEIGHT = 46; // px per hour for PDF rendering
  const TIME_COL_WIDTH = 72; // px: plenty of room for "11:00 PM"
  const HEADER_ROW_HEIGHT = 54; // px: generous height so day dates never get cut or overlap
  const BOTTOM_BUFFER = 28; // px: generous bottom safety margin so bottom time is completely clear and never cut off
  const GRID_WIDTH = 1300; // total px width of timetable
  const gridHeight = hoursCount * HOUR_HEIGHT + BOTTOM_BUFFER;

  // Format month and date range string
  const firstDate = weekDates[0];
  const lastDate = weekDates[showWeekends ? 6 : 4];
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const dateRangeStr = `${monthNames[firstDate.getUTCMonth()]} ${firstDate.getUTCDate()} – ${
    monthNames[lastDate.getUTCMonth()]
  } ${lastDate.getUTCDate()}, ${year}`;

  // Create temporary container
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = `${GRID_WIDTH}px`;
  container.style.backgroundColor = '#ffffff';
  container.style.fontFamily =
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  container.style.color = '#111827';
  container.style.padding = '20px 24px 28px 24px';
  container.style.boxSizing = 'border-box';
  container.style.zIndex = '-9999';

  // Build HTML string
  let html = `
    <div style="margin-bottom: 14px; border-bottom: 2px solid #2563eb; padding-bottom: 8px;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #1e3a8a; letter-spacing: -0.5px;">TIMETABLE</h1>
      <div style="font-size: 13px; font-weight: 600; color: #4b5563; margin-top: 3px;">
        Week ${weekNumber}, ${year} &nbsp;•&nbsp; ${dateRangeStr}
      </div>
    </div>

    <!-- Timetable Grid -->
    <div style="border: 1px solid #d1d5db; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
      <!-- Day Headers Row: 54px generous height so dates never cut or overlap -->
      <div style="display: flex; background-color: #f8fafc; border-bottom: 1.5px solid #cbd5e1; height: ${HEADER_ROW_HEIGHT}px;">
        <div style="width: ${TIME_COL_WIDTH}px; flex-shrink: 0; border-right: 1px solid #e2e8f0; height: ${HEADER_ROW_HEIGHT}px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; color: #64748b; letter-spacing: 0.5px;">
          TIME
        </div>
        <div style="display: flex; flex: 1;">
  `;

  activeDays.forEach((day, index) => {
    const d = weekDates[dayIndex(day)];
    const isLast = index === activeDays.length - 1;
    html += `
      <div style="flex: 1; border-right: ${isLast ? 'none' : '1px solid #e2e8f0'}; height: ${HEADER_ROW_HEIGHT}px; display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: #f8fafc; box-sizing: border-box; padding: 4px 0;">
        <div style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2;">${day}</div>
        <div style="font-size: 14px; font-weight: 800; color: #1e293b; margin-top: 3px; line-height: 1.2;">${monthNames[d.getUTCMonth()]} ${d.getUTCDate()}</div>
      </div>
    `;
  });

  html += `
        </div>
      </div>

      <!-- Grid Body -->
      <div style="display: flex; position: relative; height: ${gridHeight}px;">
        <!-- Time column -->
        <div style="width: ${TIME_COL_WIDTH}px; flex-shrink: 0; border-right: 1px solid #e2e8f0; background-color: #ffffff; position: relative; height: ${gridHeight}px;">
  `;

  for (let hi = 0; hi < hoursCount; hi++) {
    const hour = startHour + hi;
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    const formatted = formatTime(timeStr);
    const isFirst = hi === 0;

    html += `
      <div style="position: absolute; top: ${isFirst ? 4 : hi * HOUR_HEIGHT - 7}px; right: 8px; font-size: 10px; font-weight: 700; color: #64748b; line-height: 14px; height: 14px;">
        ${formatted}
      </div>
      <div style="position: absolute; top: ${hi * HOUR_HEIGHT}px; left: 0; right: 0; border-bottom: 1px solid #f1f5f9;"></div>
    `;
  }

  // End time label at the bottom with plenty of buffer and NO negative translateY transform clipping
  html += `
      <div style="position: absolute; top: ${hoursCount * HOUR_HEIGHT - 7}px; right: 8px; font-size: 10px; font-weight: 700; color: #64748b; line-height: 14px; height: 14px;">
        ${formatTime(`${effectiveEndHour}:00`)}
      </div>
      <div style="position: absolute; top: ${hoursCount * HOUR_HEIGHT}px; left: 0; right: 0; border-bottom: 1.5px solid #cbd5e1;"></div>
  `;

  html += `
        </div>

        <!-- Days content columns -->
        <div style="display: flex; flex: 1; position: relative; height: ${gridHeight}px;">
  `;

  // Draw horizontal hour lines across all days
  for (let hi = 0; hi < hoursCount; hi++) {
    html += `
      <div style="position: absolute; top: ${hi * HOUR_HEIGHT}px; left: 0; right: 0; border-bottom: 1px solid #e2e8f0; pointer-events: none; z-index: 1;"></div>
      <div style="position: absolute; top: ${hi * HOUR_HEIGHT + HOUR_HEIGHT / 2}px; left: 0; right: 0; border-bottom: 1px dashed #f1f5f9; pointer-events: none; z-index: 1;"></div>
    `;
  }

  // Bottom boundary line for the final hour across all days
  html += `
    <div style="position: absolute; top: ${hoursCount * HOUR_HEIGHT}px; left: 0; right: 0; border-bottom: 1.5px solid #cbd5e1; pointer-events: none; z-index: 2;"></div>
  `;

  // Render day columns and events
  activeDays.forEach((day, dayColIndex) => {
    const isLast = dayColIndex === activeDays.length - 1;
    const dayEvents = weekEvents.filter((ev) => ev.day === day);
    const layouts = computeDayEventLayouts(dayEvents);

    html += `
      <div style="flex: 1; position: relative; border-right: ${isLast ? 'none' : '1px solid #e2e8f0'}; height: ${gridHeight}px;">
    `;

    dayEvents.forEach((ev) => {
      const startMins = timeToMinutes(ev.startTime);
      const endMins = timeToMinutes(ev.endTime);
      const top = ((startMins - startHour * 60) / 60) * HOUR_HEIGHT;
      const height = Math.max(24, ((endMins - startMins) / 60) * HOUR_HEIGHT - 2);

      const layout = layouts[ev.id] || { colIndex: 0, totalCols: 1 };
      const widthPct = 100 / layout.totalCols;
      const leftPct = layout.colIndex * widthPct;

      html += `
        <div style="position: absolute; top: ${top}px; height: ${height}px; left: calc(${leftPct}% + 2px); width: calc(${widthPct}% - 4px); background-color: ${ev.color}18; border: 1px solid ${ev.color}60; border-left: 4px solid ${ev.color}; border-radius: 6px; padding: 4px 6px; box-sizing: border-box; overflow: hidden; z-index: 5;">
          <div style="font-size: 11px; font-weight: 800; color: #0f172a; line-height: 1.25; word-break: break-word;">${ev.title}</div>
          <div style="font-size: 9.5px; font-weight: 700; color: #334155; margin-top: 2px; line-height: 1.2;">
            ${formatTime(ev.startTime)} – ${formatTime(ev.endTime)}
          </div>
          ${ev.location ? `<div style="font-size: 9px; color: #475569; margin-top: 1.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">📍 ${ev.location}</div>` : ''}
          ${ev.description ? `<div style="font-size: 8.5px; color: #64748b; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">📝 ${ev.description}</div>` : ''}
        </div>
      `;
    });

    html += `
      </div>
    `;
  });

  html += `
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: GRID_WIDTH,
    });

    // Create PDF in A4 Landscape (297mm x 210mm)
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = 297;
    const pageHeight = 210;
    const margin = 10;
    const availableWidth = pageWidth - margin * 2;
    const availableHeight = pageHeight - margin * 2;

    // Scale proportionally so both width and height fit comfortably on the page without clipping
    const scale = Math.min(availableWidth / canvas.width, availableHeight / canvas.height);
    const finalWidth = canvas.width * scale;
    const finalHeight = canvas.height * scale;

    const xPos = margin + (availableWidth - finalWidth) / 2;
    const yPos = margin + (availableHeight - finalHeight) / 2;

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    pdf.addImage(imgData, 'JPEG', xPos, yPos, finalWidth, finalHeight);

    pdf.save(`Timetable-Week-${weekNumber}-${year}.pdf`);
  } finally {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}
