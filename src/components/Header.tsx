import React, { useState } from 'react';
import { useApp } from '../store';
import { useAuth } from '../context/AuthContext';
import { getISOWeek } from '../utils';
import { DAYS } from '../types';
import type { ViewMode } from '../types';

interface HeaderProps {
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onNewEvent: () => void;
}

export default function Header({ onOpenSearch, onOpenSettings, onNewEvent }: HeaderProps) {
  const { state, dispatch, isLoadingEvents } = useApp();
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

  const handleViewModeChange = (mode: ViewMode) => {
    dispatch({ type: 'SET_VIEW_MODE', viewMode: mode });
  };

  const canUndo = state.undoStack.length > 0;
  const userInitial = user?.email ? user.email[0].toUpperCase() : 'U';

  return (
    <header className="flex items-center justify-between h-13 sm:h-14 px-3 sm:px-5 border-b border-gray-100 bg-white select-none shrink-0 gap-2">
      {/* Brand & Today */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-sm">
            T
          </div>
          <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight hidden xs:block">
            Timetable
          </h1>
        </div>

        <button
          onClick={handleToday}
          className="px-2.5 py-1 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-md transition-colors"
        >
          Today
        </button>

        {isLoadingEvents && (
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
            Syncing...
          </span>
        )}
      </div>

      {/* View Mode Segment Switcher (Day / 3 Days / Week) */}
      <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200/60">
        {(
          [
            { id: 'day', label: 'Day' },
            { id: '3day', label: '3 Days' },
            { id: 'week', label: 'Week' },
          ] as const
        ).map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => handleViewModeChange(mode.id)}
            className={`px-2 sm:px-3 py-1 text-xs font-bold rounded-md transition-all ${
              state.viewMode === mode.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-1 sm:space-x-1.5">
        {/* Quick New Event Button */}
        <button
          onClick={onNewEvent}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-sm transition-all mr-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          <span>New</span>
        </button>

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
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mt-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Supabase Database Connected
                    </span>
                  </div>

                  <div className="py-2 space-y-1">
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noreferrer"
                      className="w-full text-left px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 rounded-lg flex items-center justify-between transition-colors"
                    >
                      <span>Manage Users in Supabase</span>
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
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
