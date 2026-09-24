import React, { useState } from 'react';
import { useApp } from '../store';
import { useAuth } from '../context/AuthContext';
import { getISOWeek } from '../utils';
import { DAYS } from '../types';

interface HeaderProps {
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onNewEvent?: () => void;
}

export default function Header({ onOpenSearch, onOpenSettings, onNewEvent }: HeaderProps) {
  const { state, dispatch, syncStatus, syncError, refreshEvents } = useApp();
  const { user, signOut } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleUndo = () => {
    if (state.undoStack.length > 0) {
      dispatch({ type: 'UNDO' });
    }
  };

  const handleToday = () => {
    const today = new Date();
    const week = getISOWeek(today);
    const todayDay = DAYS[(today.getDay() + 6) % 7];
    dispatch({ type: 'SET_WEEK', year: week.year, weekNumber: week.weekNumber });
    dispatch({ type: 'SET_SELECTED_DAY', day: todayDay });
  };

  const canUndo = state.undoStack.length > 0;
  const userInitial = user?.email ? user.email[0].toUpperCase() : 'U';

  return (
    <header className="flex items-center justify-between h-11 max-h-[500px]:h-9 sm:h-12 px-3 sm:px-5 border-b border-gray-100 bg-white select-none shrink-0 gap-2">
      {/* Brand & Today */}
      <div className="flex items-center gap-2 sm:gap-3">
        <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
          Timetable
        </h1>

        <button
          onClick={handleToday}
          className="px-2.5 py-1 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-md transition-colors"
        >
          Today
        </button>

        {/* Cloud Sync Status & Instant Refresh */}
        <button
          type="button"
          onClick={() => refreshEvents()}
          className={`inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-xs font-semibold transition-all border ${
            syncStatus === 'syncing'
              ? 'bg-blue-50 text-blue-700 border-blue-200 cursor-wait'
              : syncStatus === 'error'
              ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 cursor-pointer shadow-sm animate-pulse'
              : syncStatus === 'synced'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              : 'bg-gray-100 text-gray-500 border-gray-200'
          }`}
          title={
            syncStatus === 'syncing'
              ? 'Syncing with Supabase...'
              : syncStatus === 'error'
              ? `Sync error: ${syncError || 'Click to retry'}`
              : 'All tasks synced with cloud • Click to refresh'
          }
        >
          {syncStatus === 'syncing' ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden sm:inline text-[11px]">Syncing</span>
            </>
          ) : syncStatus === 'error' ? (
            <>
              <svg className="w-3.5 h-3.5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="hidden sm:inline text-[11px]">Sync Error</span>
            </>
          ) : syncStatus === 'synced' ? (
            <>
              <svg className="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline text-[11px]">Cloud Synced</span>
            </>
          ) : (
            <span className="text-[11px]">Offline</span>
          )}
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-1 sm:space-x-1.5">

        {/* Search */}
        <button
          onClick={onOpenSearch}
          className="p-1.5 sm:p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Search events"
          aria-label="Search"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>

        {/* Undo */}
        <button
          onClick={handleUndo}
          disabled={!canUndo}
          className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
            canUndo
              ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              : 'text-gray-300 opacity-40 cursor-not-allowed'
          }`}
          title={canUndo ? 'Undo (Ctrl+Z)' : 'Nothing to undo'}
          aria-label="Undo"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>

        {/* Add Task Button (Beside Settings on left) */}
        {onNewEvent && (
          <button
            onClick={onNewEvent}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95"
            title="Add Task"
            aria-label="Add Task"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Add Task</span>
          </button>
        )}

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 sm:p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Settings"
          aria-label="Settings"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        {/* User Profile Avatar & Menu */}
        {user && (
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center hover:ring-2 hover:ring-blue-500/50 transition-all shadow-sm"
              title={user.email || 'User Account'}
            >
              {userInitial}
            </button>

            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 p-3 animate-in fade-in zoom-in-95 duration-100">
                  <div className="pb-2.5 border-b border-gray-100">
                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Signed in as
                    </span>
                    <span className="text-xs font-bold text-gray-900 truncate block mt-0.5" title={user.email}>
                      {user.email}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-gray-100">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        signOut();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
