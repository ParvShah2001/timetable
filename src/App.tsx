import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './store';
import type { DayOfWeek, TimetableEvent } from './types';
import Header from './components/Header';
import WeekNavigator from './components/WeekNavigator';
import Timetable from './components/Timetable';
import EventModal from './components/EventModal';
import SettingsPanel from './components/SettingsPanel';
import SearchModal from './components/SearchModal';
import ConfirmDialog from './components/ConfirmDialog';
import LoginPage from './components/LoginPage';

function AppContent() {
  const { state, dispatch, currentWeekKey } = useApp();

  // Modal states
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<TimetableEvent | null>(null);
  const [defaultDay, setDefaultDay] = useState<DayOfWeek | undefined>();
  const [defaultStartTime, setDefaultStartTime] = useState<string | undefined>();
  const [defaultEndTime, setDefaultEndTime] = useState<string | undefined>();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Keyboard shortcut: Ctrl+Z / Cmd+Z for undo
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        dispatch({ type: 'UNDO' });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dispatch]);

  const handleEditEvent = (event: TimetableEvent) => {
    setEditEvent(event);
    setDefaultDay(undefined);
    setDefaultStartTime(undefined);
    setDefaultEndTime(undefined);
    setEventModalOpen(true);
  };

  const handleCreateEvent = (day: DayOfWeek, startTime: string, endTime: string) => {
    setEditEvent(null);
    setDefaultDay(day);
    setDefaultStartTime(startTime);
    setDefaultEndTime(endTime);
    setEventModalOpen(true);
  };

  const handleCloseEventModal = () => {
    setEventModalOpen(false);
    setEditEvent(null);
  };

  const handleClearWeek = () => {
    setConfirmOpen(true);
  };

  const handleConfirmClear = () => {
    dispatch({ type: 'CLEAR_WEEK', weekKey: currentWeekKey });
    setConfirmOpen(false);
  };

  const handleFloatingAdd = () => {
    handleCreateEvent(state.selectedDay || 'Monday', '09:00', '10:00');
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50 overflow-hidden font-sans">
      <Header
        onOpenSearch={() => setSearchOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onNewEvent={handleFloatingAdd}
      />

      <WeekNavigator onClearWeek={handleClearWeek} />

      {/* Main Timetable Fill-Screen Workspace */}
      <main className="flex-1 overflow-hidden p-1 sm:p-2.5 relative flex flex-col">
        <Timetable
          onEventEdit={handleEditEvent}
          onCreateEvent={handleCreateEvent}
        />
      </main>

      {/* Floating Add Event Button */}
      <button
        onClick={handleFloatingAdd}
        className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 w-12 h-12 sm:w-13 sm:h-13 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-xl hover:shadow-2xl transition-all flex items-center justify-center z-30 active:scale-95"
        title="Add Event"
        aria-label="Add Event"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Reassuring Feedback Toast Message */}
      {state.toastMessage && (
        <div className="fixed bottom-5 left-5 z-50 bg-gray-900/95 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <span>{state.toastMessage}</span>
          {state.undoStack.length > 0 && (
            <button
              onClick={() => dispatch({ type: 'UNDO' })}
              className="px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded text-[11px] font-bold text-blue-300 transition-colors"
            >
              Undo
            </button>
          )}
        </div>
      )}

      {/* Modals */}
      <EventModal
        open={eventModalOpen}
        onClose={handleCloseEventModal}
        editEvent={editEvent}
        defaultDay={defaultDay}
        defaultStartTime={defaultStartTime}
        defaultEndTime={defaultEndTime}
      />

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Clear Entire Week"
        message="Are you sure you want to remove all events from this week? You can always undo this action with Ctrl+Z."
        onConfirm={handleConfirmClear}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

function AppShell() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-50 select-none">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs font-bold text-gray-500">Loading your timetable...</span>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <AppContent />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </AuthProvider>
  );
}
