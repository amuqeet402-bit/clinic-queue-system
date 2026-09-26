'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { getSocket } from '@/lib/socketClient';
import { QueueState } from '@/types/queue';
import { 
  Smartphone, 
  Stethoscope, 
  Tv, 
  Users, 
  Clock, 
  CheckCircle2, 
  Sparkles,
  ArrowRight,
  Activity,
  Layers,
  Zap
} from 'lucide-react';

export default function HomePortal() {
  const [queueState, setQueueState] = useState<QueueState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(getSocket());

  useEffect(() => {
    const socket = socketRef.current;

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    const onQueueState = (state: QueueState) => setQueueState(state);

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

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between selection:bg-emerald-500">
      {/* Top Bar */}
      <header className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white">
                Dr. Abdul Muqeet Clinic
              </h1>
              <p className="text-xs text-slate-400">
                Real-Time Token & Queue Management System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-xs">
            <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-slate-300 font-semibold">
              {isConnected ? 'WebSocket Online' : 'Connecting...'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Hero */}
      <main className="max-w-6xl mx-auto px-6 py-12 flex-1 flex flex-col justify-center">
        {/* Live Pulse Bar */}
        <div className="mb-10 p-5 rounded-3xl bg-slate-800/80 border border-slate-700/80 backdrop-blur-md shadow-2xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Current Queue State</span>
              <p className="text-2xl font-black text-white">
                {queueState?.nowServing ? (
                  <span>Serving Token <span className="text-emerald-400 font-mono">#{queueState.nowServing.tokenNumber}</span></span>
                ) : (
                  <span className="text-slate-400">Queue Ready • No active call</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <div className="text-right">
              <p className="text-xs text-slate-400 font-bold uppercase">Waiting</p>
              <p className="text-xl font-bold text-white">{queueState?.totalWaiting ?? 0}</p>
            </div>
            <div className="h-8 w-px bg-slate-700" />
            <div className="text-right">
              <p className="text-xs text-slate-400 font-bold uppercase">Completed</p>
              <p className="text-xl font-bold text-emerald-400">{queueState?.totalServedToday ?? 0}</p>
            </div>
            <div className="h-8 w-px bg-slate-700" />
            <div className="text-right">
              <p className="text-xs text-slate-400 font-bold uppercase">Est. Wait</p>
              <p className="text-xl font-bold text-amber-400">{queueState?.currentEstimatedWaitMinutes ?? 0}m</p>
            </div>
          </div>
        </div>

        {/* 3 Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Patient Interface */}
          <Link
            href="/patient"
            className="group rounded-3xl p-8 bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 hover:border-emerald-500/70 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Smartphone className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold text-white group-hover:text-emerald-300 transition">
                Patient Interface
              </h2>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                Mobile-optimized web check-in. Patients tap to claim sequential integer tokens, view position in line, estimated wait times, and receive instant turn alerts.
              </p>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between text-sm font-bold text-emerald-400">
              <span>Open Patient View</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Link>

          {/* Card 2: Doctor Dashboard */}
          <Link
            href="/doctor"
            className="group rounded-3xl p-8 bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 hover:border-blue-500/70 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Stethoscope className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold text-white group-hover:text-blue-300 transition">
                Doctor Dashboard
              </h2>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                Full-featured control panel with large distinct buttons: Call Next Token, Recall on TV, Mark No-Show, Pause Queue, and live consultation timers.
              </p>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between text-sm font-bold text-blue-400">
              <span>Open Doctor Console</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Link>

          {/* Card 3: Reception / TV Display */}
          <Link
            href="/tv"
            className="group rounded-3xl p-8 bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 hover:border-purple-500/70 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Tv className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold text-white group-hover:text-purple-300 transition">
                Waiting Room TV
              </h2>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                High-contrast waiting hall display with massive typography for &quot;Now Serving&quot;, recent token history, two-tone chime audio, and voice announcement.
              </p>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between text-sm font-bold text-purple-400">
              <span>Launch TV Display</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Link>
        </div>

        {/* Live Multi-Screen Testing Hint */}
        <div className="mt-10 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400 text-center flex flex-col sm:flex-row items-center justify-center gap-3">
          <span className="font-bold text-emerald-400 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            Recommended Live Test:
          </span>
          <span>
            Open <strong>/doctor</strong> in one window, <strong>/patient</strong> on your mobile or second tab, and <strong>/tv</strong> in another. Watch updates synchronize under 10ms!
          </span>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-slate-800/80 text-center text-xs text-slate-500">
        Digital Clinic Token and Queue Management System • Next.js & Socket.IO Architecture
      </footer>
    </div>
  );
}
