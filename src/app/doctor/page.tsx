'use client';

import React, { useEffect, useState, useRef } from 'react';
import { getSocket } from '@/lib/socketClient';
import { QueueState, Token } from '@/types/queue';
import { 
  Play, 
  RotateCcw, 
  UserX, 
  Pause, 
  Users, 
  CheckCircle, 
  Clock, 
  Settings, 
  AlertTriangle, 
  Volume2, 
  ArrowLeft,
  Sparkles,
  RefreshCw,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import Link from 'next/link';

export default function DoctorDashboard() {
  const [queueState, setQueueState] = useState<QueueState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [consultationSeconds, setConsultationSeconds] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Settings Modal / Panel State
  const [showSettings, setShowSettings] = useState(false);
  const [doctorNameInput, setDoctorNameInput] = useState('');
  const [roomNumberInput, setRoomNumberInput] = useState('');
  const [avgTimeInput, setAvgTimeInput] = useState(5);

  const socketRef = useRef(getSocket());

  useEffect(() => {
    const socket = socketRef.current;

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    const onQueueState = (state: QueueState) => {
      setQueueState(state);
      setDoctorNameInput(state.config.doctorName);
      setRoomNumberInput(state.config.roomNumber);
      setAvgTimeInput(state.config.avgConsultMinutes);
    };

    if (socket.connected) {
      setIsConnected(true);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('queue:state', onQueueState);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('queue:state', onQueueState);
    };
  }, []);

  // Active consultation timer
  useEffect(() => {
    if (!queueState?.nowServing?.calledAt) {
      setConsultationSeconds(0);
      return;
    }

    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - (queueState.nowServing?.calledAt || Date.now())) / 1000);
      setConsultationSeconds(Math.max(0, elapsed));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [queueState?.nowServing?.calledAt]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCallNext = () => {
    setActionLoading(true);
    socketRef.current.emit('doctor:call_next', { roomNumber: queueState?.config.roomNumber }, (res: { success: boolean; token?: Token }) => {
      setActionLoading(false);
      if (res.token) {
        setStatusMessage(`Called Token #${res.token.tokenNumber}`);
      } else {
        setStatusMessage('No more patients waiting in queue.');
      }
      setTimeout(() => setStatusMessage(null), 4000);
    });
  };

  const handleRecall = () => {
    if (!queueState?.nowServing) return;
    setActionLoading(true);
    socketRef.current.emit('doctor:recall', {}, () => {
      setActionLoading(false);
      setStatusMessage(`Re-announced Token #${queueState.nowServing?.tokenNumber} on TV`);
      setTimeout(() => setStatusMessage(null), 3000);
    });
  };

  const handleSkip = (reason: 'skipped' | 'no_show' = 'no_show') => {
    if (!queueState?.nowServing) return;
    setActionLoading(true);
    socketRef.current.emit('doctor:skip', { reason }, () => {
      setActionLoading(false);
      setStatusMessage(`Marked Token #${queueState.nowServing?.tokenNumber} as ${reason === 'no_show' ? 'No-Show' : 'Skipped'}`);
      setTimeout(() => setStatusMessage(null), 3000);
    });
  };

  const handleTogglePause = () => {
    setActionLoading(true);
    socketRef.current.emit('doctor:toggle_pause', {}, () => {
      setActionLoading(false);
    });
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    socketRef.current.emit(
      'doctor:update_config',
      {
        doctorName: doctorNameInput,
        roomNumber: roomNumberInput,
        avgConsultMinutes: Number(avgTimeInput) || 5,
      },
      () => {
        setShowSettings(false);
        setStatusMessage('Clinic configuration updated.');
        setTimeout(() => setStatusMessage(null), 3000);
      }
    );
  };

  const handleSimulatePatients = (count: number = 10) => {
    socketRef.current.emit('admin:simulate_patients', { count }, (res: { success: boolean; added?: number }) => {
      if (res.success) {
        setStatusMessage(`Added ${res.added} demo patients to queue.`);
        setTimeout(() => setStatusMessage(null), 3000);
      }
    });
  };

  const handleResetQueue = () => {
    if (confirm('Are you sure you want to reset the entire queue and reset token numbers to 1?')) {
      socketRef.current.emit('doctor:reset_queue', {}, () => {
        setStatusMessage('Queue reset successfully.');
        setTimeout(() => setStatusMessage(null), 3000);
      });
    }
  };

  const isPaused = queueState?.config.isPaused;
  const nowServing = queueState?.nowServing;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
              title="Return to Hub"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 leading-tight">
                  Doctor Command Center
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  {queueState?.config.doctorName || 'Dr. Mitchell'} • {queueState?.config.roomNumber || 'Room 101'}
                </p>
              </div>
            </div>
          </div>

          {/* Right Status Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200">
              <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span className="text-xs font-semibold text-slate-600">
                {isConnected ? 'Real-Time Active' : 'Connecting'}
              </span>
            </div>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Settings</span>
            </button>
          </div>
        </div>
      </header>

      {/* Status Notice Toast */}
      {statusMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-sm animate-fade-in">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Main Grid Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* PAUSE BANNER */}
        {isPaused && (
          <div className="mb-6 p-4 bg-amber-500 text-white rounded-2xl shadow-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Pause className="w-6 h-6 animate-pulse" />
              <div>
                <h4 className="font-bold text-base">QUEUE IS CURRENTLY PAUSED</h4>
                <p className="text-xs text-amber-100">Patients will see a pause banner and cannot intake new tokens.</p>
              </div>
            </div>
            <button
              onClick={handleTogglePause}
              className="px-4 py-2 bg-white text-amber-900 rounded-xl font-bold text-xs hover:bg-amber-50 transition shadow"
            >
              Resume Intake
            </button>
          </div>
        )}

        {/* METRIC STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Waiting</span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-3xl font-black text-slate-800">
              {queueState?.totalWaiting ?? 0}
            </p>
            <p className="text-xs text-slate-500 mt-1">Patients in queue</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Completed</span>
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-3xl font-black text-emerald-600">
              {queueState?.totalServedToday ?? 0}
            </p>
            <p className="text-xs text-slate-500 mt-1">Patients treated today</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">No-Shows</span>
              <UserX className="w-4 h-4 text-rose-500" />
            </div>
            <p className="text-3xl font-black text-rose-600">
              {queueState?.totalSkippedToday ?? 0}
            </p>
            <p className="text-xs text-slate-500 mt-1">Skipped or absent</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Est. Wait</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-3xl font-black text-slate-800">
              {queueState?.currentEstimatedWaitMinutes ?? 0}<span className="text-sm font-semibold text-slate-400">m</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">For incoming patient</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT 7 COLS: ACTIVE PATIENT & CONTROL PANEL */}
          <div className="lg:col-span-7 space-y-6">
            {/* CURRENT SERVING PATIENT CARD */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Current In-Consultation
                </span>
                {nowServing && (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>Serving Now</span>
                  </div>
                )}
              </div>

              {nowServing ? (
                <div className="py-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Token</p>
                      <h2 className="text-6xl sm:text-7xl font-black text-slate-900 tracking-tight mt-1">
                        Token #{nowServing.tokenNumber}
                      </h2>
                      {nowServing.patientName && (
                        <p className="text-lg font-bold text-slate-700 mt-1">
                          Patient: {nowServing.patientName}
                        </p>
                      )}
                      {nowServing.priority > 0 && (
                        <span className="inline-block mt-2 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold">
                          ⚡ Priority / Urgent Case
                        </span>
                      )}
                    </div>

                    {/* Consultation Stopwatch Timer */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center sm:text-right min-w-[150px]">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                        Duration
                      </span>
                      <span className="text-3xl font-mono font-bold text-slate-800">
                        {formatTimer(consultationSeconds)}
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">Time with patient</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400">
                  <Users className="w-12 h-12 mx-auto mb-3 text-slate-300 stroke-[1.5]" />
                  <p className="text-lg font-bold text-slate-600">No Patient Currently Serving</p>
                  <p className="text-xs text-slate-400 mt-1">Click &quot;Call Next Token&quot; below to summon the next patient in line.</p>
                </div>
              )}

              {/* PRIMARY ACTION BUTTONS (Large & Distinct) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-6 border-t border-slate-100">
                {/* 1. CALL NEXT TOKEN */}
                <button
                  onClick={handleCallNext}
                  disabled={actionLoading || queueState?.waitingList.length === 0}
                  className={`sm:col-span-2 py-4 px-6 rounded-2xl font-black text-lg text-white shadow-xl transition-all flex items-center justify-center gap-3 ${
                    queueState?.waitingList.length === 0
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                      : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] shadow-emerald-600/30'
                  }`}
                >
                  <Play className="w-6 h-6 fill-current" />
                  <span>CALL NEXT TOKEN</span>
                  {queueState && queueState.waitingList.length > 0 && (
                    <span className="text-xs font-bold bg-white/20 px-2.5 py-1 rounded-full">
                      Next: #{queueState.waitingList[0].tokenNumber}
                    </span>
                  )}
                </button>

                {/* 2. RECALL CURRENT */}
                <button
                  onClick={handleRecall}
                  disabled={actionLoading || !nowServing}
                  className={`py-3.5 px-4 rounded-xl font-bold text-sm border shadow-sm transition flex items-center justify-center gap-2 ${
                    !nowServing
                      ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                      : 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-amber-500/20'
                  }`}
                >
                  <Volume2 className="w-5 h-5" />
                  <span>Recall Current on TV</span>
                </button>

                {/* 3. MARK NO-SHOW / SKIP */}
                <button
                  onClick={() => handleSkip('no_show')}
                  disabled={actionLoading || !nowServing}
                  className={`py-3.5 px-4 rounded-xl font-bold text-sm border shadow-sm transition flex items-center justify-center gap-2 ${
                    !nowServing
                      ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                      : 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700 shadow-rose-600/20'
                  }`}
                >
                  <UserX className="w-5 h-5" />
                  <span>Mark No-Show / Skip</span>
                </button>
              </div>

              {/* SECONDARY ROW: PAUSE / RESUME */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={handleTogglePause}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition border ${
                    isPaused
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {isPaused ? (
                    <>
                      <Play className="w-4 h-4 text-emerald-600" />
                      Resume Queue Intake
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4 text-amber-600" />
                      Pause Queue
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSimulatePatients(10)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition"
                    title="Simulate 10 new patients to test high capacity"
                  >
                    + Add 10 Demo Patients
                  </button>
                  <button
                    onClick={handleResetQueue}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Clear queue for new session"
                  >
                    Reset Queue
                  </button>
                </div>
              </div>
            </div>

            {/* SETTINGS DRAWER / COLLAPSIBLE */}
            {showSettings && (
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <Settings className="w-4 h-4 text-slate-500" />
                    Clinic & Doctor Settings
                  </h3>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Close
                  </button>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-4 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                        Doctor Name
                      </label>
                      <input
                        type="text"
                        value={doctorNameInput}
                        onChange={(e) => setDoctorNameInput(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                        Room Designation
                      </label>
                      <input
                        type="text"
                        value={roomNumberInput}
                        onChange={(e) => setRoomNumberInput(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                      Avg Consultation Time (Minutes for ETA calculation)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={avgTimeInput}
                      onChange={(e) => setAvgTimeInput(Number(e.target.value))}
                      className="w-full px-3 py-2 border rounded-xl text-slate-800"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 shadow"
                    >
                      Save Configuration
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* RIGHT 5 COLS: WAITING QUEUE LIST */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-slate-800 text-base">Next in Line</h3>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                  {queueState?.waitingList.length ?? 0} waiting
                </span>
              </div>

              {/* Waiting Tokens Scrollable List */}
              <div className="mt-4 space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {queueState && queueState.waitingList.length > 0 ? (
                  queueState.waitingList.map((token, index) => (
                    <div
                      key={token.id}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between transition ${
                        index === 0
                          ? 'border-emerald-300 bg-emerald-50/60 ring-1 ring-emerald-400/30'
                          : 'border-slate-100 bg-slate-50/50 hover:bg-slate-100/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                          index === 0 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">
                            Token #{token.tokenNumber}
                          </p>
                          <p className="text-xs text-slate-500">
                            {token.patientName || 'Anonymous'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {token.priority > 0 && (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                            Priority
                          </span>
                        )}
                        <span className="text-xs font-medium text-slate-400">
                          ~{(index + 1) * (queueState.config.avgConsultMinutes || 5)}m
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-slate-400">
                    <p className="text-sm font-semibold">Queue is empty</p>
                    <p className="text-xs text-slate-400 mt-1">No patients currently waiting.</p>
                  </div>
                )}
              </div>
            </div>

            {/* RECENTLY COMPLETED / SKIPPED */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Recently Called Tokens
              </h4>
              <div className="space-y-2">
                {queueState && queueState.recentlyCalled.length > 0 ? (
                  queueState.recentlyCalled.slice(0, 4).map((token) => (
                    <div
                      key={token.id}
                      className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-slate-50 border border-slate-100"
                    >
                      <span className="font-bold text-slate-800">
                        Token #{token.tokenNumber}
                      </span>
                      <span className={`font-semibold capitalize ${
                        token.status === 'serving'
                          ? 'text-emerald-600'
                          : token.status === 'completed'
                          ? 'text-blue-600'
                          : 'text-rose-500'
                      }`}>
                        {token.status === 'serving' ? 'Active' : token.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">No tokens called yet today.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
