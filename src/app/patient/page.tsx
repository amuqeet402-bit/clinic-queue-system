'use client';

import React, { useEffect, useState, useRef } from 'react';
import { getSocket } from '@/lib/socketClient';
import { QueueState, Token, CallAlertPayload } from '@/types/queue';
import { 
  Ticket, 
  Clock, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Volume2, 
  RefreshCw, 
  ChevronRight,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

export default function PatientPage() {
  const [queueState, setQueueState] = useState<QueueState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [myToken, setMyToken] = useState<Token | null>(null);
  const [patientName, setPatientName] = useState('');
  const [isPriority, setIsPriority] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [isCalledNotice, setIsCalledNotice] = useState(false);

  const socketRef = useRef(getSocket());

  // Load saved token from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('clinic_patient_token');
      if (saved) {
        setMyToken(JSON.parse(saved));
      }
    } catch {
      // Ignore JSON error
    }
  }, []);

  // Sync socket events
  useEffect(() => {
    const socket = socketRef.current;

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    const onQueueState = (state: QueueState) => {
      setQueueState(state);

      // If user holds a token, refresh its status from latest state
      setMyToken((prev) => {
        if (!prev) return null;
        
        // Check if currently serving
        if (state.nowServing && state.nowServing.id === prev.id) {
          if (prev.status !== 'serving') {
            triggerTurnAlert(state.nowServing);
          }
          const updated = { ...state.nowServing };
          localStorage.setItem('clinic_patient_token', JSON.stringify(updated));
          return updated;
        }

        // Check if in waiting list
        const waitingMatch = state.waitingList.find((t) => t.id === prev.id);
        if (waitingMatch) {
          const updated = { ...waitingMatch };
          localStorage.setItem('clinic_patient_token', JSON.stringify(updated));
          return updated;
        }

        // Check if in recently called or completed
        const recentMatch = state.recentlyCalled.find((t) => t.id === prev.id);
        if (recentMatch) {
          const updated = { ...recentMatch };
          localStorage.setItem('clinic_patient_token', JSON.stringify(updated));
          return updated;
        }

        return prev;
      });
    };

    const onTokenCalled = (payload: CallAlertPayload) => {
      setMyToken((prev) => {
        if (prev && prev.id === payload.token.id) {
          triggerTurnAlert(payload.token);
          return payload.token;
        }
        return prev;
      });
    };

    if (socket.connected) {
      setIsConnected(true);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('queue:state', onQueueState);
    socket.on('token:called', onTokenCalled);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('queue:state', onQueueState);
      socket.off('token:called', onTokenCalled);
    };
  }, []);

  const triggerTurnAlert = (token: Token) => {
    setIsCalledNotice(true);
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200, 100, 400]);
      } catch {
        // Ignore vibration error
      }
    }
  };

  const handleGenerateToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (queueState?.config.isPaused) {
      setNotification('Queue intake is currently paused by clinic staff.');
      return;
    }

    setLoading(true);
    setNotification(null);

    socketRef.current.emit(
      'patient:generate_token',
      { patientName, priority: isPriority ? 1 : 0 },
      (res: { success: boolean; token?: Token; queuePosition?: number; estimatedWaitMinutes?: number; error?: string }) => {
        setLoading(false);
        if (res.success && res.token) {
          setMyToken(res.token);
          localStorage.setItem('clinic_patient_token', JSON.stringify(res.token));
          setPatientName('');
          setIsPriority(false);
        } else {
          setNotification(res.error || 'Failed to generate token');
        }
      }
    );
  };

  const handleResetToken = () => {
    localStorage.removeItem('clinic_patient_token');
    setMyToken(null);
    setIsCalledNotice(false);
  };

  // Compute position and estimated wait time
  let queuePosition = 0;
  let estimatedWaitMins = 0;
  if (myToken && queueState) {
    if (myToken.status === 'serving') {
      queuePosition = 0;
      estimatedWaitMins = 0;
    } else if (myToken.status === 'waiting') {
      const idx = queueState.waitingList.findIndex((t) => t.id === myToken.id);
      queuePosition = idx !== -1 ? idx + 1 : 1;
      estimatedWaitMins = queuePosition * (queueState.config.avgConsultMinutes || 5);
    }
  }

  const isServingMe = myToken?.status === 'serving' || isCalledNotice;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-start p-4 sm:p-6 pb-20">
      {/* Header Bar */}
      <header className="w-full max-w-md flex items-center justify-between py-3 mb-4 border-b border-slate-200">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Home Hub
        </Link>
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isConnected ? 'bg-emerald-500 shadow-sm shadow-emerald-400' : 'bg-rose-500'
            }`}
          />
          <span className="text-xs font-medium text-slate-500">
            {isConnected ? 'Live Connected' : 'Connecting...'}
          </span>
        </div>
      </header>

      {/* Main Clinic Card */}
      <main className="w-full max-w-md">
        {/* Clinic Identity */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 mb-3">
            <Ticket className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {queueState?.config.clinicName || 'Apex Health Clinic'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Doctor: <span className="font-semibold text-slate-700">{queueState?.config.doctorName || 'Dr. Mitchell'}</span> ({queueState?.config.roomNumber || 'Room 101'})
          </p>
        </div>

        {/* Queue Pause Banner */}
        {queueState?.config.isPaused && (
          <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-amber-800 text-sm">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="font-semibold">Queue intake is temporarily paused</p>
              <p className="text-xs text-amber-700">Please wait while the doctor attends to scheduled rounds.</p>
            </div>
          </div>
        )}

        {/* Global Live Clinic Pulse (Now Serving) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-bold text-slate-400">Now Serving</p>
              <p className="text-2xl font-extrabold text-slate-900 leading-none mt-0.5">
                {queueState?.nowServing ? (
                  <span className="text-emerald-600">Token #{queueState.nowServing.tokenNumber}</span>
                ) : (
                  <span className="text-slate-400 font-medium text-lg">No active call</span>
                )}
              </p>
            </div>
          </div>
          <div className="text-right border-l pl-4 border-slate-100">
            <p className="text-xs uppercase tracking-wider font-bold text-slate-400">In Line</p>
            <p className="text-xl font-bold text-slate-800 leading-none mt-0.5">
              {queueState?.totalWaiting ?? 0} <span className="text-xs font-normal text-slate-500">waiting</span>
            </p>
          </div>
        </div>

        {/* IF USER ALREADY HAS A TOKEN */}
        {myToken ? (
          <div className="space-y-4">
            {/* CALL ALERT MODAL / BANNER IF IT IS THEIR TURN */}
            {isServingMe && (
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-5 text-white shadow-xl glow-active">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 animate-bounce">
                    <Volume2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-wide">It&apos;s Your Turn!</h3>
                    <p className="text-sm text-emerald-50 mt-0.5">
                      Please proceed to <span className="font-bold underline text-white">{myToken.doctorRoom || queueState?.config.roomNumber || 'Room 101'}</span>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* My Token Details Card */}
            <div className={`bg-white rounded-3xl p-6 border shadow-lg transition-all ${
              isServingMe 
                ? 'border-emerald-500 ring-4 ring-emerald-500/20' 
                : 'border-slate-200'
            }`}>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Your Clinic Pass
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                  myToken.status === 'serving'
                    ? 'bg-emerald-100 text-emerald-800'
                    : myToken.status === 'completed'
                    ? 'bg-blue-100 text-blue-800'
                    : myToken.status === 'skipped' || myToken.status === 'no_show'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {myToken.status === 'serving' && '🎯 Currently Serving'}
                  {myToken.status === 'waiting' && '⏳ Waiting in Line'}
                  {myToken.status === 'completed' && '✅ Consultation Done'}
                  {(myToken.status === 'skipped' || myToken.status === 'no_show') && '⚠️ Skipped / No Show'}
                </span>
              </div>

              {/* Big Token Number Display */}
              <div className="py-6 text-center">
                <p className="text-xs uppercase tracking-widest font-bold text-slate-400">Your Token Number</p>
                <div className="my-2">
                  <span className="text-7xl font-black tracking-tight text-emerald-600 inline-block">
                    {myToken.tokenNumber}
                  </span>
                </div>
                {myToken.patientName && (
                  <p className="text-sm font-semibold text-slate-700">
                    Patient: {myToken.patientName}
                  </p>
                )}
                {myToken.priority > 0 && (
                  <span className="inline-block mt-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                    Priority / Express Patient
                  </span>
                )}
              </div>

              {/* Status Metrics if waiting */}
              {myToken.status === 'waiting' && (
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                  <div className="bg-slate-50 p-3 rounded-xl text-center">
                    <p className="text-xs text-slate-500 font-medium">Position Ahead</p>
                    <p className="text-xl font-bold text-slate-800 mt-0.5">
                      {queuePosition > 1 ? `${queuePosition - 1} patients` : 'You are next!'}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl text-center">
                    <p className="text-xs text-slate-500 font-medium">Estimated Wait</p>
                    <p className="text-xl font-bold text-emerald-600 mt-0.5">
                      ~{estimatedWaitMins} mins
                    </p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => socketRef.current.emit('queue:state')}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh
                </button>
                <button
                  onClick={handleResetToken}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold underline"
                >
                  Generate New Token
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* NO TOKEN YET: GENERATE TOKEN FORM */
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-lg">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Check In & Get Token</h2>
              <p className="text-xs text-slate-500 mt-1">
                Tap below to instantly claim your sequential queue number.
              </p>
            </div>

            {notification && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">
                {notification}
              </div>
            )}

            <form onSubmit={handleGenerateToken} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Patient Name <span className="font-normal text-slate-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>

              {/* Priority Checkbox */}
              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={isPriority}
                  onChange={(e) => setIsPriority(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <span className="text-xs text-slate-600 font-medium">
                  Priority check-in (Elderly, Pediatric, or Urgent need)
                </span>
              </label>

              {/* Action Button */}
              <button
                type="submit"
                disabled={loading || Boolean(queueState?.config.isPaused)}
                className={`w-full py-4 px-6 rounded-2xl font-bold text-base shadow-lg transition-all flex items-center justify-center gap-2 ${
                  queueState?.config.isPaused
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 active:scale-[0.98]'
                }`}
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Assigning Token...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate Token
                  </>
                )}
              </button>
            </form>

            {/* Estimated Wait Preview */}
            <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-around text-center text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>Avg wait: ~{queueState?.config.avgConsultMinutes || 5} min/patient</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" />
                <span>{queueState?.totalWaiting ?? 0} currently ahead</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer Info */}
      <footer className="mt-8 text-center text-xs text-slate-400">
        <p>Apex Clinic Queue System • Sequential Integer Mode</p>
      </footer>
    </div>
  );
}
