export type TokenStatus = 'waiting' | 'serving' | 'completed' | 'skipped' | 'no_show' | 'cancelled';

export interface Token {
  id: string;
  tokenNumber: number; // Sequential integer: 1, 2, 3...
  patientName: string;
  phoneNumber: string; // 11-digit validated phone number
  department: string;  // e.g. 'General Consultation', 'General Physician', etc.
  priority: number;    // 0 = standard, 1 = high/urgent
  status: TokenStatus;
  createdAt: number;
  calledAt?: number;
  completedAt?: number;
  doctorRoom?: string;
}

export interface QueueConfig {
  isPaused: boolean;
  avgConsultMinutes: number;
  doctorName: string;
  roomNumber: string;
  clinicName: string;
}

export interface QueueState {
  config: QueueConfig;
  nowServing: Token | null;
  recentlyCalled: Token[]; // Last 3-5 called tokens
  waitingList: Token[];
  totalWaiting: number;
  totalServedToday: number;
  totalSkippedToday: number;
  currentEstimatedWaitMinutes: number;
}

export interface CallAlertPayload {
  token: Token;
  room: string;
  doctor: string;
  timestamp: number;
}
