import fs from 'fs';
import path from 'path';
import { Token, QueueConfig, QueueState } from '../types/queue';

const DATA_DIR = path.join(process.cwd(), 'data');
const STATE_FILE = path.join(DATA_DIR, 'clinic_state.json');
const AUDIT_FILE = path.join(DATA_DIR, 'audit_log.json');

interface StoredData {
  config: QueueConfig;
  tokens: Token[];
  nextTokenNumber: number;
  lastResetDate: string; // YYYY-MM-DD
}

class QueueService {
  private data: StoredData;

  constructor() {
    this.ensureDirectory();
    this.data = this.loadState();
    this.checkDailyReset();
  }

  private ensureDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private getTodayString(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getDefaultState(): StoredData {
    return {
      config: {
        isPaused: false,
        avgConsultMinutes: 5,
        doctorName: 'Dr. Abdul Muqeet',
        roomNumber: 'Room 101',
        clinicName: 'Dr. Abdul Muqeet Clinic',
      },
      tokens: [],
      nextTokenNumber: 1, // Sequential integers: 1, 2, 3...
      lastResetDate: this.getTodayString(),
    };
  }

  private loadState(): StoredData {
    try {
      if (fs.existsSync(STATE_FILE)) {
        const raw = fs.readFileSync(STATE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        const mergedConfig = {
          ...this.getDefaultState().config,
          ...(parsed.config || {})
        };
        // Auto-migrate legacy clinic name if needed
        if (!mergedConfig.clinicName || mergedConfig.clinicName === 'Apex Health Clinic') {
          mergedConfig.clinicName = 'Dr. Abdul Muqeet Clinic';
        }
        if (!mergedConfig.doctorName || mergedConfig.doctorName === 'Dr. Sarah Mitchell') {
          mergedConfig.doctorName = 'Dr. Abdul Muqeet';
        }

        const state: StoredData = {
          ...this.getDefaultState(),
          ...parsed,
          config: mergedConfig,
        };
        this.saveState(state);
        return state;
      }
    } catch (err) {
      console.error('Error reading clinic_state.json, initializing fresh state:', err);
    }
    const fresh = this.getDefaultState();
    this.saveState(fresh);
    return fresh;
  }

  private saveState(dataToSave?: StoredData) {
    try {
      this.ensureDirectory();
      const stateToPersist = dataToSave || this.data;
      fs.writeFileSync(STATE_FILE, JSON.stringify(stateToPersist, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist clinic state:', err);
    }
  }

  private logAudit(action: string, details: Record<string, unknown>) {
    try {
      this.ensureDirectory();
      const entry = {
        timestamp: new Date().toISOString(),
        action,
        details,
      };
      let logs: unknown[] = [];
      if (fs.existsSync(AUDIT_FILE)) {
        try {
          logs = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf-8'));
        } catch {
          logs = [];
        }
      }
      logs.push(entry);
      // Keep last 1000 entries
      if (logs.length > 1000) logs = logs.slice(-1000);
      fs.writeFileSync(AUDIT_FILE, JSON.stringify(logs, null, 2), 'utf-8');
    } catch (err) {
      console.error('Audit log failed:', err);
    }
  }

  public checkDailyReset() {
    const today = this.getTodayString();
    if (this.data.lastResetDate !== today) {
      this.logAudit('DAILY_RESET', { previousDate: this.data.lastResetDate, today });
      this.data.tokens = [];
      this.data.nextTokenNumber = 1;
      this.data.lastResetDate = today;
      this.saveState();
    }
  }

  public getState(): QueueState {
    this.checkDailyReset();

    const nowServing = this.data.tokens.find(t => t.status === 'serving') || null;
    
    // Sort waiting: highest priority first (e.g. 1 before 0), then ascending tokenNumber
    const waitingList = this.data.tokens
      .filter(t => t.status === 'waiting')
      .sort((a, b) => (b.priority - a.priority) || (a.tokenNumber - b.tokenNumber));

    // Recently called (serving + completed/skipped), sorted descending by calledAt
    const recentlyCalled = this.data.tokens
      .filter(t => t.calledAt && t.status !== 'waiting' && t.status !== 'cancelled')
      .sort((a, b) => (b.calledAt || 0) - (a.calledAt || 0))
      .slice(0, 5);

    const totalWaiting = waitingList.length;
    const totalServedToday = this.data.tokens.filter(t => t.status === 'completed').length;
    const totalSkippedToday = this.data.tokens.filter(t => t.status === 'skipped' || t.status === 'no_show').length;

    const currentEstimatedWaitMinutes = totalWaiting * this.data.config.avgConsultMinutes;

    return {
      config: { ...this.data.config },
      nowServing,
      recentlyCalled,
      waitingList,
      totalWaiting,
      totalServedToday,
      totalSkippedToday,
      currentEstimatedWaitMinutes,
    };
  }

  public generateToken(
    patientName: string,
    phoneNumber: string,
    department: string = 'General Consultation',
    priority: number = 0
  ): { token: Token; queuePosition: number; estimatedWaitMinutes: number } {
    this.checkDailyReset();

    // Validation
    const cleanName = (patientName || '').trim();
    if (!cleanName) {
      throw new Error('Patient name is required.');
    }

    const cleanPhone = (phoneNumber || '').replace(/\D/g, '');
    if (cleanPhone.length !== 11) {
      throw new Error('Phone number must be exactly 11 digits.');
    }

    const assignedNumber = this.data.nextTokenNumber;
    this.data.nextTokenNumber += 1;

    const newToken: Token = {
      id: `token_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tokenNumber: assignedNumber,
      patientName: cleanName,
      phoneNumber: cleanPhone,
      department: department?.trim() || 'General Consultation',
      priority: priority > 0 ? 1 : 0,
      status: 'waiting',
      createdAt: Date.now(),
    };

    this.data.tokens.push(newToken);
    this.saveState();

    this.logAudit('TOKEN_GENERATED', { 
      tokenNumber: assignedNumber, 
      patientName: cleanName,
      phoneNumber: cleanPhone,
      department: newToken.department,
      priority 
    });

    const state = this.getState();
    const queuePosition = state.waitingList.findIndex(t => t.id === newToken.id) + 1;
    const estimatedWaitMinutes = Math.max(1, queuePosition * this.data.config.avgConsultMinutes);

    return {
      token: newToken,
      queuePosition,
      estimatedWaitMinutes,
    };
  }

  public cancelToken(tokenId: string): Token | null {
    const token = this.data.tokens.find(t => t.id === tokenId);
    if (!token) return null;

    if (token.status === 'waiting' || token.status === 'serving') {
      token.status = 'cancelled';
      token.completedAt = Date.now();
      this.saveState();
      this.logAudit('TOKEN_CANCELLED', { 
        tokenNumber: token.tokenNumber, 
        patientName: token.patientName,
        tokenId 
      });
      return token;
    }

    return null;
  }

  public callNext(roomNumber?: string): Token | null {
    this.checkDailyReset();

    // Mark current serving token as completed if one exists
    const currentServing = this.data.tokens.find(t => t.status === 'serving');
    if (currentServing) {
      currentServing.status = 'completed';
      currentServing.completedAt = Date.now();
    }

    // Find next in queue (respecting priority first, then tokenNumber)
    const waiting = this.data.tokens
      .filter(t => t.status === 'waiting')
      .sort((a, b) => (b.priority - a.priority) || (a.tokenNumber - b.tokenNumber));

    if (waiting.length === 0) {
      this.saveState();
      return null;
    }

    const nextToken = waiting[0];
    nextToken.status = 'serving';
    nextToken.calledAt = Date.now();
    nextToken.doctorRoom = roomNumber || this.data.config.roomNumber;

    this.saveState();
    this.logAudit('TOKEN_CALLED', { tokenNumber: nextToken.tokenNumber, room: nextToken.doctorRoom });

    return nextToken;
  }

  public recallCurrent(): Token | null {
    const current = this.data.tokens.find(t => t.status === 'serving');
    if (current) {
      current.calledAt = Date.now();
      this.saveState();
      this.logAudit('TOKEN_RECALLED', { tokenNumber: current.tokenNumber });
      return current;
    }
    return null;
  }

  public skipCurrent(reason: 'skipped' | 'no_show' = 'no_show'): Token | null {
    const current = this.data.tokens.find(t => t.status === 'serving');
    if (current) {
      current.status = reason;
      current.completedAt = Date.now();
      this.saveState();
      this.logAudit('TOKEN_SKIPPED', { tokenNumber: current.tokenNumber, reason });
      return current;
    }
    return null;
  }

  public togglePause(): boolean {
    this.data.config.isPaused = !this.data.config.isPaused;
    this.saveState();
    this.logAudit('QUEUE_PAUSE_TOGGLED', { isPaused: this.data.config.isPaused });
    return this.data.config.isPaused;
  }

  public updateConfig(updates: Partial<QueueConfig>): QueueConfig {
    this.data.config = {
      ...this.data.config,
      ...updates,
    };
    this.saveState();
    this.logAudit('CONFIG_UPDATED', updates);
    return this.data.config;
  }

  public resetQueue(): void {
    this.data.tokens = [];
    this.data.nextTokenNumber = 1;
    this.data.lastResetDate = this.getTodayString();
    this.saveState();
    this.logAudit('MANUAL_QUEUE_RESET', {});
  }
}

export const queueService = new QueueService();
