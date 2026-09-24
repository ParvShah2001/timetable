import React, { createContext, useContext, useReducer, useEffect, useState, type ReactNode } from 'react';
import type { AppState, TimetableEvent, WeekKey, Settings, DayOfWeek, ViewMode } from './types';
import { DAYS } from './types';
import {
  getISOWeek,
  weekKey,
  generateId,
  wouldOverlap,
  formatTime,
  DEFAULT_START_HOUR,
  DEFAULT_END_HOUR,
} from './utils';
import { useAuth } from './context/AuthContext';
import {
  fetchUserEvents,
  upsertEvent,
  deleteEvent,
  clearWeekEvents,
} from './lib/supabase';

/* ── Actions ── */

type Action =
  | { type: 'LOAD_USER_EVENTS'; events: Record<WeekKey, TimetableEvent[]> }
  | { type: 'RESET_STATE' }
  | { type: 'ADD_EVENT'; weekKey: WeekKey; event: TimetableEvent }
  | { type: 'UPDATE_EVENT'; weekKey: WeekKey; event: TimetableEvent }
  | { type: 'DELETE_EVENT'; weekKey: WeekKey; eventId: string }
  | { type: 'DUPLICATE_EVENT'; weekKey: WeekKey; eventId: string }
  | { type: 'MOVE_EVENT'; weekKey: WeekKey; eventId: string; newDay: DayOfWeek; newStartTime: string; newEndTime: string }
  | { type: 'RESIZE_EVENT'; weekKey: WeekKey; eventId: string; newStartTime: string; newEndTime: string }
  | { type: 'CLEAR_WEEK'; weekKey: WeekKey }
  | { type: 'DUPLICATE_WEEK'; sourceWeekKey: WeekKey; targetWeekKey: WeekKey }
  | { type: 'IMPORT_EVENTS'; events: Record<WeekKey, TimetableEvent[]> }
  | { type: 'UNDO' }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<Settings> }
  | { type: 'SET_WEEK'; year: number; weekNumber: number }
  | { type: 'SET_VIEW_MODE'; viewMode: ViewMode }
  | { type: 'SET_SELECTED_DAY'; day: DayOfWeek }
  | { type: 'SET_TOAST'; message: string | null };

/* ── Persistence ── */

const BASE_STORAGE_KEY = 'timetable-user-data';
const MAX_UNDO = 20;

function getUserStorageKey(userId?: string | null): string {
  return userId ? `${BASE_STORAGE_KEY}-${userId}` : `${BASE_STORAGE_KEY}-guest`;
}

function loadUserState(userId?: string | null): AppState | null {
  try {
    const raw = localStorage.getItem(getUserStorageKey(userId));
    if (raw) return JSON.parse(raw) as AppState;
  } catch { /* ignore corrupt data */ }
  return null;
}

function saveUserState(state: AppState, userId?: string | null): void {
  try {
    const { undoStack: _, toastMessage: __, ...rest } = state;
    localStorage.setItem(getUserStorageKey(userId), JSON.stringify({ ...rest, undoStack: [], toastMessage: null }));
  } catch { /* quota exceeded, silently fail */ }
}

/* ── Initial state ── */

function createInitialState(): AppState {
  const now = new Date();
  const todayDay = DAYS[(now.getDay() + 6) % 7];
  const { year, weekNumber } = getISOWeek(now);

  const defaultSettings: Settings = {
    gridInterval: 30,
    showWeekends: true,
    allowOverlap: true,
    timeRangePreset: 'active',
    startHour: DEFAULT_START_HOUR,
    endHour: DEFAULT_END_HOUR,
  };

  return {
    events: {},
    currentWeek: { year, weekNumber },
    selectedDay: todayDay,
    viewMode: 'week',
    settings: defaultSettings,
    undoStack: [],
    toastMessage: null,
  };
}

/* ── Reducer ── */

function pushUndo(state: AppState): AppState['undoStack'] {
  const snapshot = JSON.parse(JSON.stringify(state.events));
  const stack = [snapshot, ...state.undoStack];
  return stack.slice(0, MAX_UNDO);
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD_USER_EVENTS':
      return {
        ...state,
        events: action.events,
        undoStack: [],
      };

    case 'RESET_STATE':
      return createInitialState();

    case 'SET_WEEK':
      return { ...state, currentWeek: { year: action.year, weekNumber: action.weekNumber } };

    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.viewMode };

    case 'SET_SELECTED_DAY':
      return { ...state, selectedDay: action.day };

    case 'SET_TOAST':
      return { ...state, toastMessage: action.message };

    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.settings } };

    case 'ADD_EVENT': {
      const wk = action.weekKey;
      const existing = state.events[wk] || [];
      if (!state.settings.allowOverlap && wouldOverlap(action.event, existing)) {
        return { ...state, toastMessage: 'Cannot add: overlaps with another event' };
      }
      return {
        ...state,
        undoStack: pushUndo(state),
        events: { ...state.events, [wk]: [...existing, action.event] },
        toastMessage: `Created "${action.event.title}" at ${formatTime(action.event.startTime)}`,
      };
    }

    case 'UPDATE_EVENT': {
      const wk = action.weekKey;
      const existing = state.events[wk] || [];
      const others = existing.filter((e) => e.id !== action.event.id);
      if (!state.settings.allowOverlap && wouldOverlap(action.event, others)) {
        return { ...state, toastMessage: 'Cannot update: overlaps with another event' };
      }
      return {
        ...state,
        undoStack: pushUndo(state),
        events: { ...state.events, [wk]: [...others, action.event] },
        toastMessage: `Updated "${action.event.title}"`,
      };
    }

    case 'DELETE_EVENT': {
      const wk = action.weekKey;
      const existing = state.events[wk] || [];
      const target = existing.find((e) => e.id === action.eventId);
      return {
        ...state,
        undoStack: pushUndo(state),
        events: { ...state.events, [wk]: existing.filter((e) => e.id !== action.eventId) },
        toastMessage: target ? `Deleted "${target.title}"` : 'Event deleted',
      };
    }

    case 'DUPLICATE_EVENT': {
      const wk = action.weekKey;
      const existing = state.events[wk] || [];
      const original = existing.find((e) => e.id === action.eventId);
      if (!original) return state;
      const dup = { ...original, id: generateId(), title: `${original.title} (Copy)` };
      return {
        ...state,
        undoStack: pushUndo(state),
        events: { ...state.events, [wk]: [...existing, dup] },
        toastMessage: `Duplicated "${original.title}"`,
      };
    }

    case 'MOVE_EVENT': {
      const wk = action.weekKey;
      const existing = state.events[wk] || [];
      const event = existing.find((e) => e.id === action.eventId);
      if (!event) return state;
      const moved = {
        ...event,
        day: action.newDay,
        startTime: action.newStartTime,
        endTime: action.newEndTime,
      };
      const others = existing.filter((e) => e.id !== action.eventId);
      if (!state.settings.allowOverlap && wouldOverlap(moved, others)) {
        return { ...state, toastMessage: 'Move prevented: overlaps with an event' };
      }
      return {
        ...state,
        undoStack: pushUndo(state),
        events: { ...state.events, [wk]: [...others, moved] },
        toastMessage: `Moved to ${action.newDay} ${formatTime(action.newStartTime)}`,
      };
    }

    case 'RESIZE_EVENT': {
      const wk = action.weekKey;
      const existing = state.events[wk] || [];
      const event = existing.find((e) => e.id === action.eventId);
      if (!event) return state;
      const resized = { ...event, startTime: action.newStartTime, endTime: action.newEndTime };
      const others = existing.filter((e) => e.id !== action.eventId);
      if (!state.settings.allowOverlap && wouldOverlap(resized, others)) {
        return { ...state, toastMessage: 'Resize prevented: overlaps with an event' };
      }
      return {
        ...state,
        undoStack: pushUndo(state),
        events: { ...state.events, [wk]: [...others, resized] },
        toastMessage: `Time updated: ${formatTime(action.newStartTime)} – ${formatTime(action.newEndTime)}`,
      };
    }

    case 'CLEAR_WEEK': {
      return {
        ...state,
        undoStack: pushUndo(state),
        events: { ...state.events, [action.weekKey]: [] },
        toastMessage: 'Cleared all events for this week',
      };
    }

    case 'DUPLICATE_WEEK': {
      const source = state.events[action.sourceWeekKey] || [];
      const copied = source.map((e) => ({ ...e, id: generateId() }));
      return {
        ...state,
        undoStack: pushUndo(state),
        events: { ...state.events, [action.targetWeekKey]: copied },
        toastMessage: 'Week duplicated successfully',
      };
    }

    case 'IMPORT_EVENTS': {
      return {
        ...state,
        undoStack: pushUndo(state),
        events: { ...state.events, ...action.events },
        toastMessage: 'Timetable imported successfully',
      };
    }

    case 'UNDO': {
      if (state.undoStack.length === 0) return state;
      const [previous, ...rest] = state.undoStack;
      return {
        ...state,
        events: previous,
        undoStack: rest,
        toastMessage: 'Action undone',
      };
    }

    default:
      return state;
  }
}

/* ── Context ── */

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  currentWeekKey: WeekKey;
  currentEvents: TimetableEvent[];
  isLoadingEvents: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

  const cwk = weekKey(state.currentWeek.year, state.currentWeek.weekNumber);
  const currentEvents = state.events[cwk] || [];

  // When user logs in or changes, fetch their individual timetable from Supabase
  useEffect(() => {
    if (!user) {
      dispatch({ type: 'RESET_STATE' });
      return;
    }

    let isMounted = true;
    setIsLoadingEvents(true);

    // 1. First check local user backup for instant offline render
    const cached = loadUserState(user.id);
    if (cached?.events) {
      dispatch({ type: 'LOAD_USER_EVENTS', events: cached.events });
    }

    // 2. Fetch fresh user events from Supabase
    fetchUserEvents(user.id).then((cloudEvents) => {
      if (!isMounted) return;
      if (cloudEvents && Object.keys(cloudEvents).length > 0) {
        dispatch({ type: 'LOAD_USER_EVENTS', events: cloudEvents });
      }
      setIsLoadingEvents(false);
    }).catch(() => {
      if (isMounted) setIsLoadingEvents(false);
    });

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Persist state locally per-user
  useEffect(() => {
    if (user) {
      saveUserState(state, user.id);
    }
  }, [state, user]);

  // Auto-dismiss toast after 2.5s
  useEffect(() => {
    if (state.toastMessage) {
      const timer = setTimeout(() => {
        dispatch({ type: 'SET_TOAST', message: null });
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [state.toastMessage]);

  // Wrapper around dispatch to sync database operations in the background
  const dbDispatch: React.Dispatch<Action> = (action: Action) => {
    // Apply state transition immediately for zero latency
    dispatch(action);

    // If user is authenticated, sync with Supabase
    if (user) {
      if (action.type === 'ADD_EVENT' || action.type === 'UPDATE_EVENT') {
        upsertEvent(action.event, user.id, action.weekKey);
      } else if (action.type === 'MOVE_EVENT') {
        const existing = state.events[action.weekKey] || [];
        const found = existing.find((e) => e.id === action.eventId);
        if (found) {
          const moved = { ...found, day: action.newDay, startTime: action.newStartTime, endTime: action.newEndTime };
          upsertEvent(moved, user.id, action.weekKey);
        }
      } else if (action.type === 'RESIZE_EVENT') {
        const existing = state.events[action.weekKey] || [];
        const found = existing.find((e) => e.id === action.eventId);
        if (found) {
          const resized = { ...found, startTime: action.newStartTime, endTime: action.newEndTime };
          upsertEvent(resized, user.id, action.weekKey);
        }
      } else if (action.type === 'DELETE_EVENT') {
        deleteEvent(action.eventId, user.id);
      } else if (action.type === 'CLEAR_WEEK') {
        clearWeekEvents(action.weekKey, user.id);
      }
    }
  };

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch: dbDispatch,
        currentWeekKey: cwk,
        currentEvents,
        isLoadingEvents,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export type { Action };
