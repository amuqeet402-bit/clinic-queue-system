// Zero-external-dependency Audio Engine using Web Audio API + Speech Synthesis

class SoundEngine {
  private audioCtx: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Plays a pleasant, modern clinic two-tone chime
  public playChime(): Promise<void> {
    return new Promise((resolve) => {
      try {
        const ctx = this.getAudioContext();
        if (!ctx) {
          resolve();
          return;
        }

        const now = ctx.currentTime;

        // Tone 1: 587.33 Hz (D5)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, now);
        gain1.gain.setValueAtTime(0.3, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.45);

        // Tone 2: 880.00 Hz (A5) slightly louder chime
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880.0, now + 0.28);
        gain2.gain.setValueAtTime(0.35, now + 0.28);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.28);
        osc2.stop(now + 0.85);

        setTimeout(() => {
          resolve();
        }, 900);
      } catch (err) {
        console.warn('AudioContext playback warning:', err);
        resolve();
      }
    });
  }

  // Announces the token using the browser's native text-to-speech
  public speak(tokenNumber: number, room: string = 'Room 1'): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel(); // Stop any pending speech

      const text = `Token number ${tokenNumber}, please proceed to ${room}.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.92; // Slightly measured, clear clinic pace
      utterance.pitch = 1.05;

      // Select an English voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Jenny')));
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis warning:', err);
    }
  }

  // Combined chime + voice announcement sequence
  public async announceToken(tokenNumber: number, room: string = 'Room 1'): Promise<void> {
    await this.playChime();
    this.speak(tokenNumber, room);
  }
}

export const soundEngine = new SoundEngine();
