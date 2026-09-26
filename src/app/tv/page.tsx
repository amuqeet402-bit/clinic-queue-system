'use client';

import React, { useEffect, useState, useRef } from 'react';
import { getSocket } from '@/lib/socketClient';
import { QueueState, CallAlertPayload, Token } from '@/types/queue';
import { soundEngine } from '@/lib/sound';
import { 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Clock, 
  Calendar,
  Users, 
  Activity, 
  BellRing,
  Sparkles,
  ArrowLeft,
  Building2
} from 'lucide-react';
import Link from 'next/link';

export default function TVDisplayPage() {
  const [queueState, setQueueState] = useState<QueueState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [dayOfWeek, setDayOfWeek] = useState<string>('');
  const [isFlashing, setIsFlashing] = useState(false);
  const [lastAnnouncement, setLastAnnouncement] = useState<string | null>(null);

  const socketRef = useRef(getSocket());

  // High-precision live clock and calendar date
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
      );
      setCurrentDate(
        now.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })
      );
      setDayOfWeek(
        now.toLocaleDateString([], { weekday: 'long' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Socket & Audio Chimes
  useEffect(() => {
    const socket = socketRef.current;

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    const onQueueState = (state: QueueState) => {
      setQueueState(state);
    };

    const onTokenCalled = (payload: CallAlertPayload) => {
      // Trigger flash effect
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 3500);

      setLastAnnouncement(`Calling Token #${payload.token.tokenNumber} to ${payload.room}`);

      // Sound announcement
      if (audioEnabled) {
        soundEngine.announceToken(payload.token.tokenNumber, payload.room);
      }
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
  }, [audioEnabled]);

  // Audio gesture unlock
  const handleEnableAudio = () => {
    setAudioEnabled(true);
    // Play a gentle welcome chime to prime AudioContext
    soundEngine.playChime();
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const nowServing = queueState?.nowServing;
  const lastCalledList = (queueState?.recentlyCalled || [])
    .filter((t) => !nowServing || t.id !== nowServing.id)
    .slice(0, 4);

  const clinicName = queueState?.config.clinicName || 'Dr. Abdul Muqeet Clinic';
  const doctorName = queueState?.config.doctorName || 'Dr. Abdul Muqeet';

  return (
    <div 
      onClick={!audioEnabled ? handleEnableAudio : undefined}
      className={`min-h-screen bg-slate-950 text-white flex flex-col justify-between selection:bg-emerald-500 overflow-hidden font-sans transition-colors duration-500 ${
        isFlashing ? 'bg-slate-900 ring-8 ring-emerald-500 ring-inset' : ''
      }`}
    >
      {/* AUDIO UNLOCK BANNER (If not interacted yet) */}
      {!audioEnabled && (
        <div className="bg-emerald-600 text-white text-xs sm:text-sm font-bold py-2.5 px-4 text-center cursor-pointer hover:bg-emerald-500 transition flex items-center justify-center gap-2 shadow-lg animate-pulse">
          <Volume2 className="w-4 h-4" />
          <span>Click anywhere on this screen to activate Voice Announcements & Hospital Chime</span>
        </div>
      )}

      {/* TOP HEADER BAR WITH PROMINENT DATE & TIME */}
      <header className="px-6 lg:px-12 py-5 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-md">
        {/* Left: Clinic Identity */}
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition"
            title="Back to portal"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Hub</span>
          </Link>
          <div className="h-6 w-px bg-slate-700 hidden sm:block" />
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Activity className="w-7 h-7 text-emerald-400" />
              <span>{clinicName}</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Waiting Hall Display • Consultant: <span className="text-slate-200 font-semibold">{doctorName}</span>
            </p>
          </div>
        </div>

        {/* Right: Prominent Date, Time, and TV Controls */}
        <div className="flex items-center gap-6">
          {/* Prominent High-Contrast Date & Live Clock Panel */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl px-5 py-2.5 text-right shadow-inner flex items-center gap-4">
            <div className="text-right border-r border-slate-800 pr-4 hidden sm:block">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-end gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>{dayOfWeek || 'Today'}</span>
              </div>
              <div className="text-xs text-slate-300 font-medium mt-0.5">
                {currentDate || 'Loading date...'}
              </div>
            </div>

            <div className="text-right">
              <div className="text-2xl sm:text-3xl font-mono font-black tracking-wider text-white flex items-center justify-end gap-1.5">
                <Clock className="w-5 h-5 text-emerald-400 hidden xs:inline" />
                <span>{currentTime || '--:--:--'}</span>
              </div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Live Standard Time
              </div>
            </div>
          </div>

          {/* Quick TV Control Buttons */}
          <div className="flex items-center gap-2 pl-2">
            <button
              onClick={handleEnableAudio}
              className={`p-2.5 rounded-xl border transition ${
                audioEnabled 
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title={audioEnabled ? 'Audio chime active' : 'Click to enable audio chime'}
            >
              {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            <button
              onClick={handleToggleFullscreen}
              className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition"
              title="Fullscreen Mode"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* PAUSE BANNER */}
      {queueState?.config.isPaused && (
        <div className="bg-amber-500/90 text-amber-950 px-6 py-3 text-center font-black text-sm tracking-wide flex items-center justify-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-950 animate-ping" />
          <span>CONSULTATION INTAKE PAUSED — PLEASE REMAIN SEATED IN WAITING AREA</span>
        </div>
      )}

      {/* MAIN WAITING ROOM LAYOUT */}
      <main className="flex-1 px-6 lg:px-12 py-8 flex flex-col justify-center max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* LEFT 8 COLUMNS: HERO NOW SERVING BOARD */}
          <div className="lg:col-span-8 flex flex-col">
            <div className={`flex-1 rounded-3xl p-8 sm:p-12 border bg-slate-900/90 flex flex-col justify-between transition-all duration-300 shadow-2xl relative overflow-hidden ${
              isFlashing 
                ? 'border-emerald-400 shadow-emerald-500/30 ring-4 ring-emerald-500/20' 
                : 'border-slate-800'
            }`}>
              {/* Ambient Glow */}
              <div className="absolute -top-24 -left-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Sub-header */}
              <div className="flex items-center justify-between pb-6 border-b border-slate-800 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-xl sm:text-2xl font-black uppercase tracking-widest text-emerald-400">
                    NOW SERVING
                  </span>
                </div>
                <div className="px-4 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs sm:text-sm font-bold text-slate-300">
                  {doctorName}
                </div>
              </div>

              {/* GIANT TOKEN DISPLAY */}
              <div className="py-8 sm:py-14 text-center relative z-10">
                {nowServing ? (
                  <div>
                    <span className="text-xs uppercase font-extrabold tracking-widest text-slate-400 block mb-2">
                      TOKEN NUMBER
                    </span>
                    <div className="inline-block transition-transform duration-300 scale-105">
                      <span className="text-8xl sm:text-9xl md:text-[11rem] font-black tracking-tighter text-white drop-shadow-2xl">
                        {nowServing.tokenNumber}
                      </span>
                    </div>

                    {/* Patient Name & Department Pill */}
                    <div className="mt-3 flex items-center justify-center gap-3">
                      <span className="text-xl font-bold text-slate-200">
                        {nowServing.patientName}
                      </span>
                      {nowServing.department && (
                        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          {nowServing.department}
                        </span>
                      )}
                    </div>

                    {/* Room Destination Banner */}
                    <div className="mt-6 inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/60 shadow-lg text-emerald-300">
                      <BellRing className="w-7 h-7 text-emerald-400 animate-bounce" />
                      <span className="text-2xl sm:text-3xl font-black tracking-wide text-white">
                        PROCEED TO {nowServing.doctorRoom || queueState?.config.roomNumber || 'ROOM 101'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-slate-500">
                    <p className="text-4xl sm:text-5xl font-black text-slate-600">PLEASE WAIT</p>
                    <p className="text-base text-slate-500 mt-2 font-medium">The doctor will call the next token shortly</p>
                  </div>
                )}
              </div>

              {/* Bottom Alert Ticker / Notification */}
              <div className="pt-6 border-t border-slate-800 flex items-center justify-between text-xs sm:text-sm text-slate-400 relative z-10">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>{lastAnnouncement || 'Listening for live calls...'}</span>
                </div>
                <div className="font-semibold text-slate-400">
                  Total Patients in Queue: <span className="text-emerald-400 font-bold">{queueState?.totalWaiting ?? 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT 4 COLUMNS: RECENTLY CALLED TOKENS */}
          <div className="lg:col-span-4 flex flex-col">
            <div className="flex-1 rounded-3xl p-6 sm:p-8 border border-slate-800 bg-slate-900/60 backdrop-blur-md flex flex-col justify-between shadow-xl">
              <div>
                <div className="pb-4 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-300">
                    RECENTLY CALLED
                  </h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                    History
                  </span>
                </div>

                {/* List of last 3-4 called tokens */}
                <div className="mt-5 space-y-3">
                  {lastCalledList.length > 0 ? (
                    lastCalledList.map((token, index) => (
                      <div
                        key={token.id}
                        className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 font-bold">#{index + 1}</span>
                            <span className="text-2xl font-black text-white">
                              Token {token.tokenNumber}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-0.5 font-medium">
                            {token.patientName} • <span className="text-slate-400">{token.department || 'General'}</span>
                          </p>
                        </div>

                        <span className={`text-xs font-black uppercase px-2.5 py-1 rounded-lg ${
                          token.status === 'completed'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                          {token.status === 'completed' ? 'Treated' : 'No-Show'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center text-slate-600">
                      <p className="text-sm font-semibold">No previous tokens</p>
                      <p className="text-xs text-slate-600 mt-1">Called tokens will appear here</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Waiting Room Notice Card */}
              <div className="mt-6 pt-5 border-t border-slate-800">
                <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 text-xs text-slate-300 space-y-1">
                  <p className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    Waiting Room Instructions
                  </p>
                  <p className="text-slate-400 leading-relaxed">
                    Please listen for the chime. Have your token number ready when entering the doctor consultation room.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* FOOTER TICKER */}
      <footer className="px-6 lg:px-12 py-3 bg-slate-900 border-t border-slate-800 text-center text-xs text-slate-500 flex items-center justify-between">
        <span>{clinicName} • Real-Time Broadcast</span>
        <span className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-rose-500'}`} />
          {isConnected ? 'TV Screen Synchronized' : 'Connecting to Server...'}
        </span>
      </footer>
    </div>
  );
}
