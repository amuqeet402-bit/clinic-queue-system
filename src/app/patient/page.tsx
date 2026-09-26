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
  Sparkles,
  ArrowLeft,
  Phone,
  User,
  Building2,
  XCircle,
  ShieldAlert,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';

const DEPARTMENTS = [
  'General Consultation',
  'General Physician',
  'Routine Checkup',
  'Pediatric Care',
  'Emergency / Urgent'
];

export default function PatientPage() {
  const [queueState, setQueueState] = useState<QueueState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [myToken, setMyToken] = useState<Token | null>(null);

  // Form Fields
  const [patientName, setPatientName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [department, setDepartment] = useState('General Consultation');
  const [isPriority, setIsPriority] = useState(false);

  // UI States
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [isCalledNotice, setIsCalledNotice] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

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

      // Refresh patient token status if one is held
      setMyToken((prev) => {
        if (!prev) return null;
        
        // 1. Check if currently serving
        if (state.nowServing && state.nowServing.id === prev.id) {
          if (prev.status !== 'serving') {
            triggerTurnAlert(state.nowServing);
          }
          const updated = { ...state.nowServing };
          localStorage.setItem('clinic_patient_token', JSON.stringify(updated));
          return updated;
        }

        // 2. Check if in waiting list
        const waitingMatch = state.waitingList.find((t) => t.id === prev.id);
        if (waitingMatch) {
          const updated = { ...waitingMatch };
          localStorage.setItem('clinic_patient_token', JSON.stringify(updated));
          return updated;
        }

        // 3. Check if in recently called / completed / skipped
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

  // Generate Token with Device Check and Strict Validation
  const handleGenerateToken = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setNotification(null);

    // 1. Device Restriction Check: Only 1 active token per device
    if (myToken && (myToken.status === 'waiting' || myToken.status === 'serving')) {
      setValidationError('You already have an active token on this device. Each device can only hold one token at a time.');
      return;
    }

    // 2. Name validation
    const cleanName = patientName.trim();
    if (!cleanName || cleanName.length < 2) {
      setValidationError('Please enter a valid Patient Name (at least 2 letters).');
      return;
    }

    // 3. Phone number validation: exactly 11 digits
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    if (digitsOnly.length !== 11) {
      setValidationError(`Phone number must be exactly 11 digits. Currently entered: ${digitsOnly.length} digits.`);
      return;
    }

    if (queueState?.config.isPaused) {
      setValidationError('Queue intake is currently paused by clinic staff.');
      return;
    }

    setLoading(true);

    socketRef.current.emit(
      'patient:generate_token',
      {
        patientName: cleanName,
        phoneNumber: digitsOnly,
        department,
        priority: isPriority ? 1 : 0
      },
      (res: { 
        success: boolean; 
        token?: Token; 
        queuePosition?: number; 
        estimatedWaitMinutes?: number; 
        error?: string 
      }) => {
        setLoading(false);
        if (res.success && res.token) {
          setMyToken(res.token);
          localStorage.setItem('clinic_patient_token', JSON.stringify(res.token));
          setPatientName('');
          setPhoneNumber('');
          setIsPriority(false);
          setNotification({
            type: 'success',
            message: `Token #${res.token.tokenNumber} issued successfully! Position in queue: ${res.queuePosition}`
          });
        } else {
          setValidationError(res.error || 'Failed to generate token. Please try again.');
        }
      }
    );
  };

  // Patient Cancels Token
  const handleCancelToken = () => {
    if (!myToken) return;
    setCancelling(true);

    socketRef.current.emit(
      'patient:cancel_token',
      { tokenId: myToken.id },
      (res: { success: boolean; token?: Token; error?: string }) => {
        setCancelling(false);
        setShowCancelConfirm(false);

        if (res.success) {
          const cancelledToken: Token = {
            ...myToken,
            status: 'cancelled',
            completedAt: Date.now()
          };
          setMyToken(cancelledToken);
          localStorage.setItem('clinic_patient_token', JSON.stringify(cancelledToken));
          setNotification({
            type: 'info',
            message: `Token #${myToken.tokenNumber} has been cancelled.`
          });
        } else {
          setNotification({
            type: 'error',
            message: res.error || 'Unable to cancel token.'
          });
        }
      }
    );
  };

  // Reset local token so patient can register again after completion or cancellation
  const handleClearTokenPass = () => {
    localStorage.removeItem('clinic_patient_token');
    setMyToken(null);
    setIsCalledNotice(false);
    setShowCancelConfirm(false);
    setNotification(null);
  };

  // Compute position & estimated wait
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

  const hasActiveToken = myToken && (myToken.status === 'waiting' || myToken.status === 'serving');
  const isServingMe = myToken?.status === 'serving' || isCalledNotice;
  const clinicName = queueState?.config.clinicName || 'Dr. Abdul Muqeet Clinic';
  const doctorName = queueState?.config.doctorName || 'Dr. Abdul Muqeet';

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
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            {clinicName}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Doctor: <span className="font-semibold text-slate-700">{doctorName}</span> ({queueState?.config.roomNumber || 'Room 101'})
          </p>
        </div>

        {/* Global Notifications */}
        {notification && (
          <div className={`mb-4 p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 shadow-sm ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : notification.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{notification.message}</span>
          </div>
        )}

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

        {/* CASE 1: USER HAS AN ACTIVE OR PREVIOUS TOKEN */}
        {myToken ? (
          <div className="space-y-4">
            {/* CALL ALERT BANNER */}
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

            {/* Token Pass Card */}
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
                    : myToken.status === 'waiting'
                    ? 'bg-amber-100 text-amber-800'
                    : myToken.status === 'completed'
                    ? 'bg-blue-100 text-blue-800'
                    : myToken.status === 'cancelled'
                    ? 'bg-slate-200 text-slate-700'
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  {myToken.status === 'serving' && '🎯 Currently Serving'}
                  {myToken.status === 'waiting' && '⏳ Waiting in Line'}
                  {myToken.status === 'completed' && '✅ Consultation Done'}
                  {myToken.status === 'cancelled' && '🚫 Token Cancelled'}
                  {(myToken.status === 'skipped' || myToken.status === 'no_show') && '⚠️ Skipped / No Show'}
                </span>
              </div>

              {/* Big Token Number Display */}
              <div className="py-6 text-center">
                <p className="text-xs uppercase tracking-widest font-bold text-slate-400">Token Number</p>
                <div className="my-2">
                  <span className={`text-7xl font-black tracking-tight inline-block ${
                    myToken.status === 'cancelled' ? 'text-slate-400 line-through' : 'text-emerald-600'
                  }`}>
                    {myToken.tokenNumber}
                  </span>
                </div>
                
                {/* Patient Information Pills */}
                <div className="space-y-1.5 mt-2">
                  <p className="text-base font-bold text-slate-800">
                    {myToken.patientName}
                  </p>
                  <p className="text-xs text-slate-500 font-mono">
                    📱 {myToken.phoneNumber}
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      {myToken.department || 'General Consultation'}
                    </span>
                    {myToken.priority > 0 && (
                      <span className="inline-block text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                        Priority
                      </span>
                    )}
                  </div>
                </div>
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

              {/* CANCEL TOKEN CONFIRMATION / ACTIONS */}
              {hasActiveToken && (
                <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
                  {showCancelConfirm ? (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                      <p className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        Cancel your queue ticket?
                      </p>
                      <p className="text-[11px] text-rose-700">
                        You will lose your position (#{queuePosition}) and will need to register again.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={handleCancelToken}
                          disabled={cancelling}
                          className="flex-1 py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition"
                        >
                          {cancelling ? 'Cancelling...' : 'Yes, Cancel Token'}
                        </button>
                        <button
                          onClick={() => setShowCancelConfirm(false)}
                          className="py-2 px-3 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
                        >
                          Keep Position
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => socketRef.current.emit('queue:state')}
                        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Refresh
                      </button>
                      <button
                        onClick={() => setShowCancelConfirm(true)}
                        className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-bold bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Cancel Token
                      </button>
                    </div>
                  )}

                  {/* Device restriction reminder */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 text-center flex items-center justify-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
                    <span>Device locked to Token #{myToken.tokenNumber} (1 token per user)</span>
                  </div>
                </div>
              )}

              {/* If token is completed or cancelled: Allow registering new token */}
              {!hasActiveToken && (
                <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                  <button
                    onClick={handleClearTokenPass}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow transition"
                  >
                    Register New Consultation
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* CASE 2: REGISTRATION & TOKEN GENERATION FORM */
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-lg">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Patient Registration</h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter your details to claim an official sequential token.
              </p>
            </div>

            {/* Validation Error Banner */}
            {validationError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{validationError}</span>
              </div>
            )}

            <form onSubmit={handleGenerateToken} className="space-y-4">
              {/* Field 1: Patient Name (Required) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Patient Full Name <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-slate-400 font-normal">Required</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Muhammad Ali"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                  />
                </div>
              </div>

              {/* Field 2: 11-digit Phone Number (Required with strict validation) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Mobile Phone Number <span className="text-rose-500">*</span></span>
                  <span className={`text-[10px] font-bold ${
                    phoneNumber.replace(/\D/g, '').length === 11 ? 'text-emerald-600' : 'text-slate-400'
                  }`}>
                    {phoneNumber.replace(/\D/g, '').length}/11 Digits
                  </span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="tel"
                    required
                    maxLength={14}
                    placeholder="03001234567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 text-sm font-mono ${
                      phoneNumber.replace(/\D/g, '').length === 11
                        ? 'border-emerald-500 focus:ring-emerald-500 bg-emerald-50/20'
                        : 'border-slate-200 focus:ring-emerald-500'
                    }`}
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Must be exactly 11 digits (e.g. 03001234567).
                </p>
              </div>

              {/* Field 3: Department / Specialty */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Department / Specialty</span>
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium bg-white text-slate-800"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Field 4: Priority / Elderly Checkbox */}
              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={isPriority}
                  onChange={(e) => setIsPriority(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <span className="text-xs text-slate-600 font-medium">
                  Priority check-in (Elderly, Pediatric, or Urgent emergency)
                </span>
              </label>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || Boolean(queueState?.config.isPaused)}
                className={`w-full py-3.5 px-6 rounded-2xl font-bold text-base shadow-lg transition-all flex items-center justify-center gap-2 ${
                  queueState?.config.isPaused
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 active:scale-[0.98]'
                }`}
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Generating Token...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate Token
                  </>
                )}
              </button>
            </form>

            {/* Notice: 1 token per device restriction */}
            <div className="mt-4 pt-3 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
                <span>Notice: One active token allowed per device.</span>
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer Info */}
      <footer className="mt-8 text-center text-xs text-slate-400">
        <p>{clinicName} • Sequential Queue System</p>
      </footer>
    </div>
  );
}
