import React, { useState } from 'react';
import { useApp } from '../store';
import { useAuth } from '../context/AuthContext';
import { SUPABASE_SQL_SETUP, getStoredConfig } from '../lib/supabase';

interface SyncModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SyncModal({ open, onClose }: SyncModalProps) {
  const { syncStatus, syncError, refreshEvents } = useApp();
  const { user, isConfigured } = useAuth();
  const [copied, setCopied] = useState(false);
  const [retrying, setRetrying] = useState(false);

  if (!open) return null;

  const config = getStoredConfig();

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SETUP);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRetry = async () => {
    setRetrying(true);
    await refreshEvents();
    setRetrying(false);
  };

  // Determine specific guidance based on error message
  const isPermissionDenied = syncError?.toLowerCase().includes('permission denied');
  const isTableMissing = syncError?.toLowerCase().includes('relation') && syncError?.toLowerCase().includes('does not exist');
  const isColumnMissing = syncError?.toLowerCase().includes('column');
  const isAuthIssue = syncError?.toLowerCase().includes('jwt') || syncError?.toLowerCase().includes('policy');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              syncStatus === 'synced'
                ? 'bg-emerald-100 text-emerald-700'
                : syncStatus === 'error'
                ? 'bg-rose-100 text-rose-700'
                : 'bg-blue-100 text-blue-700'
            }`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Cloud Sync Diagnostics</h3>
              <p className="text-[11px] text-gray-500">Supabase Database Connection</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          {/* Status Box */}
          <div className={`p-3.5 rounded-xl border flex flex-col gap-1.5 ${
            syncStatus === 'error'
              ? 'bg-rose-50/70 border-rose-200 text-rose-900'
              : syncStatus === 'synced'
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : 'bg-blue-50/70 border-blue-200 text-blue-900'
          }`}>
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${
                  syncStatus === 'error' ? 'bg-rose-500' : syncStatus === 'synced' ? 'bg-emerald-500' : 'bg-blue-500 animate-ping'
                }`} />
                {syncStatus === 'error' ? 'Sync Error Detected' : syncStatus === 'synced' ? 'Cloud Synced Successfully' : 'Sync in progress...'}
              </span>
              <span className="text-[10px] uppercase tracking-wider font-semibold opacity-80">
                {isConfigured ? 'Supabase Configured' : 'Offline Mode'}
              </span>
            </div>

            {syncError && (
              <div className="mt-1 font-mono text-[11px] bg-white/80 p-2.5 rounded-lg border border-rose-200 text-rose-700 break-words select-all">
                {syncError}
              </div>
            )}
          </div>

          {/* Diagnostic Explanation */}
          {syncStatus === 'error' && (
            <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-2 text-amber-900">
              <div className="font-bold flex items-center gap-1.5 text-xs text-amber-800">
                <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {isPermissionDenied
                  ? 'Permission Denied: Run SQL Grants'
                  : isTableMissing
                  ? 'Table Not Found in Supabase'
                  : isColumnMissing
                  ? 'Table Schema Out of Date'
                  : isAuthIssue
                  ? 'Authentication or Security Policy Issue'
                  : 'Database Resolution Step'}
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800">
                {isPermissionDenied
                  ? 'PostgreSQL requires granting table access to the "authenticated" user role. Click "Copy SQL Fix Script" below and run it in your Supabase SQL editor to grant permissions instantly.'
                  : isTableMissing
                  ? 'Your Supabase project is connected, but the "timetable_events" table does not exist in your database yet.'
                  : isColumnMissing
                  ? 'Your database table exists but is missing one or more required columns.'
                  : 'To fix this in 30 seconds, run the complete SQL script in your Supabase SQL Editor.'}
              </p>
            </div>
          )}

          {/* Quick Action: Copy SQL & Open Supabase */}
          <div className="space-y-2 pt-1">
            <span className="block font-bold text-gray-700 uppercase tracking-wider text-[10px]">
              How to fix (1 Click):
            </span>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleCopySql}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-all text-xs"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                {copied ? '✓ SQL Copied!' : 'Copy SQL Fix Script'}
              </button>

              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition-all text-xs border border-gray-200"
              >
                <span>Open Supabase SQL Editor</span>
                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              Instructions: In Supabase, go to <strong>SQL Editor</strong> &gt; <strong>New query</strong> &gt; paste &gt; click <strong>Run</strong>.
            </p>
          </div>

          {/* Project Details */}
          <div className="pt-3 border-t border-gray-100 space-y-1 text-[11px] text-gray-500">
            <div className="flex justify-between">
              <span>Signed in user:</span>
              <span className="font-semibold text-gray-800">{user?.email || 'None'}</span>
            </div>
            <div className="flex justify-between">
              <span>Supabase URL:</span>
              <span className="font-mono text-gray-700 truncate max-w-[240px]">{config.url || 'Not configured'}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>

          <button
            type="button"
            disabled={retrying}
            onClick={handleRetry}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            <svg className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{retrying ? 'Testing...' : 'Test & Retry Sync'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
