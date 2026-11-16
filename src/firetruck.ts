import { shuffled } from './learning.ts';
import type { Stage } from './types.ts';

export const FIRETRUCK_COLORS = ['blue', 'yellow', 'red', 'green'] as const;
export type FireColor = typeof FIRETRUCK_COLORS[number];
export type FireObject = 'frog' | 'car';
export interface FireGoal { id: string; color: FireColor; kind: FireObject; label: string }
export interface FireItem { id: string; color: FireColor; kind: FireObject }
export interface FireQuestion {
  goal: FireGoal;
  items: FireItem[];
  found: Set<string>;
  mistakes: Set<string>;
  hinted: boolean;
  complete: boolean;
}
export const FIRETRUCK_GOALS: FireGoal[] = FIRETRUCK_COLORS.flatMap(color =>
  (['frog', 'car'] as const).map(kind => ({ id: `${color}-${kind}`, color, kind, label: `${color} ${kind}s` })),
);
export const FIRETRUCK_SPEECH = {
  finished: 'Lovely spraying! You found every picture. What a helpful adventure!',
  foundOne: 'One found. Keep looking!',
  foundTwo: 'Two found. Keep looking!',
} as const;
export const firePrompt = (goal: FireGoal) => `Spray all the ${goal.label}.`;
export const fireHint = (goal: FireGoal) => `Look for ${goal.label}. Follow the gentle glow.`;
export const fireRetry = (goal: FireGoal) => `Let's look for ${goal.label}. Try another picture.`;
export const fireComplete = (goal: FireGoal) => `You found all the ${goal.label}. Lovely spraying!`;
export const fireSkill = (goal: FireGoal) => `firetruck:${goal.id}`;
export const fireMatches = (item: FireItem, goal: FireGoal) => item.color === goal.color && item.kind === goal.kind;

export function makeFiretruckRound(length: 5 | 10, random: () => number = Math.random): FireGoal[] {
  const first = [FIRETRUCK_GOALS.find(g => g.id === 'blue-frog')!, FIRETRUCK_GOALS.find(g => g.id === 'yellow-car')!];
  const goals = [...first, ...shuffled(FIRETRUCK_GOALS.filter(g => !first.includes(g)), random)];
  return Array.from({ length }, (_, index) => goals[index % goals.length]);
}

export function makeFiretruckQuestion(goal: FireGoal, stage: Stage, random: () => number = Math.random): FireQuestion {
  const count = stage === 'little' ? 2 : 3;
  const otherColor = shuffled(FIRETRUCK_COLORS.filter(color => color !== goal.color), random)[0];
  const otherKind = goal.kind === 'frog' ? 'car' : 'frog';
  const items: FireItem[] = Array.from({ length: count }, (_, index) => ({ id: `match-${index}`, color: goal.color, kind: goal.kind }));
  // Both near misses matter: matching just color or just object is insufficient.
  items.push({ id: 'other-color', color: otherColor, kind: goal.kind }, { id: 'other-object', color: goal.color, kind: otherKind });
  if (stage === 'growing') items.push({ id: 'other-both', color: otherColor, kind: otherKind });
  return { goal, items: shuffled(items, random), found: new Set(), mistakes: new Set(), hinted: false, complete: false };
}

export function sprayFiretruckItem(question: FireQuestion, id: string): 'match' | 'miss' | 'complete' | 'ignored' {
  const item = question.items.find(item => item.id === id);
  if (!item || question.complete || question.found.has(id) || question.mistakes.has(id)) return 'ignored';
  if (!fireMatches(item, question.goal)) { question.mistakes.add(id); return 'miss'; }
  question.found.add(id);
  if (question.items.filter(item => fireMatches(item, question.goal)).every(item => question.found.has(item.id))) {
    question.complete = true;
    return 'complete';
  }
  return 'match';
}

export function firetruckNarrationTexts(): string[] {
  return [...Object.values(FIRETRUCK_SPEECH), ...FIRETRUCK_GOALS.flatMap(goal => [firePrompt(goal), fireHint(goal), fireRetry(goal), fireComplete(goal)])];
}
