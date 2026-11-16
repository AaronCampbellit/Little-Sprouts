import { normalizeSpeechText } from './speech-text.ts';

export interface Recording {
  file: string;
  seconds: number;
}

export interface RecordingManifest {
  version: 1;
  voice: 'heart';
  clips: Record<string, Recording>;
}

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

export function parseRecordingManifest(value: unknown): RecordingManifest | null {
  if (!record(value) || value.version !== 1 || value.voice !== 'heart' || !record(value.clips)) return null;
  const clips: Record<string, Recording> = Object.create(null);
  for (const [text, clip] of Object.entries(value.clips)) {
    if (normalizeSpeechText(text) !== text || !text || !record(clip)
      || typeof clip.file !== 'string' || !/^\/audio\/heart\/[a-f0-9]{16}\.mp3$/.test(clip.file)
      || typeof clip.seconds !== 'number' || !Number.isFinite(clip.seconds) || clip.seconds < 0.15 || clip.seconds > 60) return null;
    clips[text] = { file: clip.file, seconds: clip.seconds };
  }
  return Object.keys(clips).length ? { version: 1, voice: 'heart', clips } : null;
}

export function recordingFor(manifest: RecordingManifest, text: string): Recording | undefined {
  return manifest.clips[normalizeSpeechText(text)];
}
