# System Architecture & Technical Design

This document details the architecture, design choices, state model, and key algorithms behind the **Timetable** application.

---

## 1. High-Level Architecture

The application is structured into decoupled layers:

```
┌────────────────────────────────────────────────────────┐
│                   React UI Layer                       │
│  (Header, WeekNavigator, Timetable, EventCard, Modals) │
└──────────────▲──────────────────────────▲──────────────┘
               │                          │
┌──────────────┴──────────┐    ┌──────────┴──────────────┐
│       AppProvider       │    │       AuthProvider      │
│  (useReducer + Actions) │    │   (Supabase Auth state) │
└──────────────▲──────────┘    └──────────▲──────────────┘
               │                          │
┌──────────────┴──────────────────────────┴──────────────┐
│                   Storage & Sync Engine                │
│  - Supabase PostgreSQL (Remote Sync via Realtime)       │
│  - LocalStorage (Offline / Guest Fallback)              │
└────────────────────────────────────────────────────────┘
```

---

## 2. State Management (`src/store.tsx`)

Global application state is managed using React's `useReducer` and exposed via `useApp()`:

- **State Model (`AppState`)**:
  - `events`: Map of ISO `WeekKey` (e.g. `"2026-W41"`) to array of `TimetableEvent` objects.
  - `currentWeek`: Selected ISO year and week number.
  - `selectedDay`: Active day for single-day operations.
  - `settings`: Grid interval (15, 30, 60 mins), weekend visibility, overlap allowance, time range preset.
  - `undoStack`: History of snapshot arrays enabling `Ctrl+Z` undo functionality.
  - `toastMessage`: Ephemeral notification feedback.

- **Persistence Layer**:
  - State is keyed per authenticated user (`timetable-user-data-${userId}`) in `localStorage`.
  - When Supabase credentials are configured, changes trigger debounced cloud synchronization (`upsertEvent`, `deleteEvent`, `clearWeekEvents`).
  - An active WebSocket subscription (`postgres_changes`) reconciles remote updates in real-time.

---

## 3. Key Algorithms

### 3.1 Side-by-Side Overlap Layout (`src/utils.ts` -> `computeDayEventLayouts`)

When multiple events overlap in time and "Side-by-side Overlaps" is enabled, the timetable partitions colliding events into sub-columns:

1. **Sorting**: Events are sorted by start time ascending, then by duration descending.
2. **Clustering**: Overlapping events are grouped into connected collision components.
3. **Greedy Column Assignment**: For each event in a cluster, it is placed into the first available column where it does not collide with already assigned events.
4. **Width Calculation**: Each event in the cluster receives:
   - `width = 100% / totalColumns`
   - `left = columnIndex * (100% / totalColumns)`

This guarantees optimal screen utilization with zero visual collisions.

### 3.2 Viewport Fitting & Responsive Grid (`src/components/Timetable.tsx`)

```ts
const recalcSlotHeight = () => {
  const h = containerRef.current.clientHeight;
  const availableGridH = Math.max(100, h - DAY_HEADER_H - BOTTOM_BUFFER_H);
  const fitH = availableGridH / hoursCount;

  const isLandscape = window.innerWidth > window.innerHeight;
  const isLandscapePhone = isLandscape && window.innerHeight < 600;

  if (isLandscapePhone || fitH < 26) {
    setSlotHeight(46); // Enables comfortable vertical scrolling with sticky header
  } else {
    setSlotHeight(Math.max(20, fitH)); // 100% fit on a single screen with zero scroll
  }
};
```

- **Desktop & Mobile Portrait**: Dynamically stretches or contracts hour slots so the entire day fits on the screen without horizontal or vertical scrollbars.
- **Mobile Landscape**: Switches to a fixed slot height (`46px`), enabling smooth touch scrolling while keeping the day header permanently pinned at the top.

### 3.3 Dragging with Edge Auto-Scrolling

Dragging events across days or hours utilizes pointer capture with an animation frame loop:
- As the cursor nears the top or bottom screen boundary (< 50px), `requestAnimationFrame` automatically increments/decrements `scrollTop`.
- The target time is continuously re-calculated relative to the updated scroll position: `(clientY - gridRect.top) + scrollTop`.
- Snaps to the configured grid interval (15, 30, or 60 minutes) using `snapToGrid()`.

### 3.4 Vector & Canvas PDF Generation Pipeline (`src/utils/pdfExport.ts`)

To generate crisp, printable schedules:
1. Renders an off-screen high-resolution container (`1300px` width) with custom typography, day header metrics, and exact hour lines.
2. `html2canvas` captures the element at `scale: 2` (equivalent to 2600px width).
3. `jsPDF` calculates the optimal aspect ratio scaling to fit cleanly on standard **A4 Landscape** (`297mm x 210mm`) with 10mm margins, leaving safety buffers on all four borders.
