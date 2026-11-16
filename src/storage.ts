import { ACTIVITIES } from './content.ts';
import { FIRETRUCK_GOALS, fireSkill } from './firetruck.ts';
import type { Profile, SaveData, Settings, SkillProgress } from './types.ts';

export const STORAGE_KEY = 'little-sprouts:v1';
export const DEFAULT_SETTINGS: Settings = { stage: 'growing', maxNumber: 10, letterCase: 'upper', roundLength: 5, sound: true };
const allowedSkills = new Set([...ACTIVITIES.flatMap((a) => a.items.map((i) => `${a.id}:${i.id}`)), ...FIRETRUCK_GOALS.map(fireSkill)]);
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const counter = (value: unknown): number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000 ? value : 0;

export function newProfile(name = 'Little Explorer'): Profile {
  return { id: crypto.randomUUID(), name: name.trim().slice(0, 24) || 'Little Explorer', character: 'milo', theme: 'woodland', settings: { ...DEFAULT_SETTINGS }, progress: {} };
}

export function freshSave(): SaveData {
  const profile = newProfile();
  return { version: 1, activeProfileId: profile.id, profiles: [profile] };
}

export function validateSave(value: unknown): SaveData {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.profiles) || value.profiles.length < 1 || value.profiles.length > 8) throw new Error('Please choose a Little Sprouts version 1 backup with 1–8 explorers.');
  const ids = new Set<string>();
  const profiles = value.profiles.map((raw): Profile => {
    if (!isRecord(raw) || typeof raw.id !== 'string' || !/^[a-zA-Z0-9-]{1,64}$/.test(raw.id) || ids.has(raw.id) || typeof raw.name !== 'string') throw new Error('This backup contains an invalid explorer.');
    ids.add(raw.id);
    const s = isRecord(raw.settings) ? raw.settings : {};
    const settings: Settings = {
      stage: s.stage === 'little' ? 'little' : 'growing',
      maxNumber: s.maxNumber === 5 ? 5 : 10,
      letterCase: s.letterCase === 'lower' || s.letterCase === 'mixed' ? s.letterCase : 'upper',
      roundLength: s.roundLength === 10 ? 10 : 5,
      sound: s.sound !== false,
    };
    const progress: Record<string, SkillProgress> = Object.create(null);
    if (isRecord(raw.progress)) {
      for (const [key, item] of Object.entries(raw.progress)) {
        if (!allowedSkills.has(key) || !isRecord(item)) continue;
        const completed = counter(item.completed);
        progress[key] = { attempts: Math.max(counter(item.attempts), completed), completed, firstTry: Math.min(counter(item.firstTry), completed), hints: Math.min(counter(item.hints), completed) };
      }
    }
    return { id: raw.id, name: raw.name.trim().slice(0, 24) || 'Little Explorer', character: raw.character === 'pip' ? 'pip' : 'milo', theme: raw.theme === 'starlight' ? 'starlight' : 'woodland', settings, progress };
  });
  return { version: 1, profiles, activeProfileId: profiles.some((p) => p.id === value.activeProfileId) ? String(value.activeProfileId) : profiles[0].id };
}

export class SaveStore {
  data: SaveData;
  persistent = true;
  constructor() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      this.data = raw ? validateSave(JSON.parse(raw)) : freshSave();
    } catch {
      this.data = freshSave();
      this.persistent = false;
    }
  }
  get profile(): Profile { return this.data.profiles.find((p) => p.id === this.data.activeProfileId)!; }
  save(): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data)); this.persistent = true; }
    catch { this.persistent = false; }
  }
  import(value: unknown): void { this.data = validateSave(value); this.save(); }
}
