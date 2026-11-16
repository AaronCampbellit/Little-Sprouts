import { parseRecordingManifest, recordingFor } from './recordings.ts';
import type { RecordingManifest } from './recordings.ts';

export class Narrator {
  available = 'AudioContext' in window || 'speechSynthesis' in window;
  private soundEnabled = true;
  private context: AudioContext | undefined;
  private master: GainNode | undefined;
  private voice: SpeechSynthesisVoice | undefined;
  private manifest: Promise<RecordingManifest | null> | undefined;
  private buffers = new Map<string, Promise<AudioBuffer | null>>();
  private currentSource: AudioBufferSourceNode | undefined;
  private currentGain: GainNode | undefined;
  private sequence = 0;

  constructor() {
    if ('speechSynthesis' in window) {
      this.chooseDeviceVoice();
      window.speechSynthesis.addEventListener('voiceschanged', () => this.chooseDeviceVoice());
    }
    // Fetch only the small catalogue at load; recordings are fetched as needed.
    void this.loadManifest();
  }

  get enabled(): boolean { return this.soundEnabled; }
  set enabled(value: boolean) {
    if (value === this.soundEnabled) return;
    this.soundEnabled = value;
    if (!value) this.stop();
    if (this.context && this.master) {
      this.master.gain.cancelScheduledValues(this.context.currentTime);
      this.master.gain.setTargetAtTime(value ? 1 : 0, this.context.currentTime, 0.01);
    }
  }

  private chooseDeviceVoice(): void {
    const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'));
    this.voice = voices.find((v) => v.lang === 'en-US' && /natural|neural|samantha|google/i.test(v.name))
      ?? voices.find((v) => v.lang === 'en-US' && v.localService) ?? voices[0];
  }

  unlock(): void {
    if (!this.enabled || !('AudioContext' in window)) return;
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.master.connect(this.context.destination);
      }
      void this.context.resume().catch(() => {});
    } catch { /* An English device voice remains available as a fallback. */ }
  }

  private loadManifest(): Promise<RecordingManifest | null> {
    if (this.manifest) return this.manifest;
    const pending = fetch('/audio/manifest.json', { cache: 'no-cache' })
      .then(async (response) => response.ok ? parseRecordingManifest(await response.json()) : null)
      .catch(() => null);
    this.manifest = pending;
    void pending.then((value) => { if (!value && this.manifest === pending) this.manifest = undefined; });
    return pending;
  }

  private buffer(file: string): Promise<AudioBuffer | null> {
    const cached = this.buffers.get(file);
    if (cached) { this.buffers.delete(file); this.buffers.set(file, cached); return cached; }
    const context = this.context!;
    const pending = fetch(file).then(async (response) => {
      if (!response.ok) return null;
      return await context.decodeAudioData(await response.arrayBuffer());
    }).catch(() => null);
    this.buffers.set(file, pending);
    while (this.buffers.size > 32) this.buffers.delete(this.buffers.keys().next().value!);
    void pending.then((value) => { if (!value && this.buffers.get(file) === pending) this.buffers.delete(file); });
    return pending;
  }

  speak(text: string): void {
    this.stop();
    if (!this.enabled) return;
    const sequence = this.sequence;
    void this.play(text, sequence);
  }

  private async play(text: string, sequence: number): Promise<void> {
    try {
      const manifest = await this.loadManifest();
      if (sequence !== this.sequence || !this.enabled) return;
      const recording = manifest && recordingFor(manifest, text);
      if (recording && this.context && this.master) {
        const buffer = await this.buffer(recording.file);
        if (sequence !== this.sequence || !this.enabled) return;
        if (buffer && this.context.state === 'running') {
          const source = this.context.createBufferSource();
          const gain = this.context.createGain();
          source.buffer = buffer; source.connect(gain); gain.connect(this.master);
          const startsAt = this.context.currentTime + 0.04;
          gain.gain.setValueAtTime(0, startsAt);
          gain.gain.linearRampToValueAtTime(1, startsAt + 0.025);
          this.currentSource = source; this.currentGain = gain;
          source.onended = () => {
            source.disconnect(); gain.disconnect();
            if (this.currentSource === source) { this.currentSource = undefined; this.currentGain = undefined; }
          };
          source.start(startsAt);
          return;
        }
      }
      this.deviceSpeech(text, sequence);
    } catch {
      this.deviceSpeech(text, sequence);
    }
  }

  private deviceSpeech(text: string, sequence: number): void {
    if (sequence !== this.sequence || !this.enabled || !('speechSynthesis' in window) || !this.voice) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US'; utterance.rate = 0.88; utterance.pitch = 1;
    utterance.voice = this.voice;
    window.speechSynthesis.speak(utterance);
  }

  stop(): void {
    ++this.sequence;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (this.currentSource && this.context) {
      const now = this.context.currentTime;
      this.currentGain?.gain.cancelScheduledValues(now);
      this.currentGain?.gain.setTargetAtTime(0, now, 0.008);
      try { this.currentSource.stop(now + 0.04); } catch { /* Already ended. */ }
      this.currentSource = undefined; this.currentGain = undefined;
    }
  }

  chime(): void {
    if (!this.enabled || !this.context || !this.master) return;
    const context = this.context;
    [523.25, 659.25, 783.99].forEach((frequency, i) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const time = context.currentTime + i * 0.12;
      oscillator.type = 'sine'; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.08, time + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
      oscillator.connect(gain); gain.connect(this.master!);
      oscillator.start(time); oscillator.stop(time + 0.4);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
  }
}
