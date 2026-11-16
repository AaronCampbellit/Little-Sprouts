export type ActivityId = 'numbers' | 'letters' | 'colors' | 'shapes' | 'objects';
export type ThemeId = 'woodland' | 'starlight';
export type CharacterId = 'milo' | 'pip';
export type Stage = 'little' | 'growing';
export type LetterCase = 'upper' | 'lower' | 'mixed';

export interface LearningItem {
  id: string;
  label: string;
  speech: string;
  value?: number;
  color?: string;
  lower?: string;
  word?: string;
  objectIndex?: number;
  category?: 'food' | 'animals' | 'toys' | 'things';
}

export interface Activity {
  id: ActivityId;
  title: string;
  subtitle: string;
  description: string;
  accent: string;
  items: LearningItem[];
}

export interface Question {
  activity: ActivityId;
  target: LearningItem;
  choices: LearningItem[];
  prompt: string;
  instruction: string;
  skill: string;
}

export interface Settings {
  stage: Stage;
  maxNumber: 5 | 10;
  letterCase: LetterCase;
  roundLength: 5 | 10;
  sound: boolean;
}

export interface SkillProgress {
  attempts: number;
  firstTry: number;
  completed: number;
  hints: number;
}

export interface Profile {
  id: string;
  name: string;
  character: CharacterId;
  theme: ThemeId;
  settings: Settings;
  progress: Record<string, SkillProgress>;
}

export interface SaveData {
  version: 1;
  activeProfileId: string;
  profiles: Profile[];
}
