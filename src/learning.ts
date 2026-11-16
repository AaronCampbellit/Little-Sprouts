import { activityById } from './content.ts';
import type { ActivityId, LearningItem, Profile, Question, Settings, ThemeId } from './types.ts';

export function shuffled<T>(values: readonly T[], random: () => number = Math.random): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function practiceItems(id: ActivityId, settings: Settings): LearningItem[] {
  const items = activityById(id).items;
  if (id === 'numbers') return items.filter((item) => item.value! <= settings.maxNumber);
  if (settings.stage === 'little' && id === 'colors') return items.slice(0, 6);
  if (settings.stage === 'little' && id === 'shapes') return items.slice(0, 4);
  // All 26 letters remain available in both stages, as requested.
  return items;
}

export function makeRound(id: ActivityId, settings: Settings, random: () => number = Math.random): LearningItem[] {
  const items = practiceItems(id, settings);
  const result: LearningItem[] = [];
  while (result.length < settings.roundLength) {
    const batch = shuffled(items, random);
    if (result.length && batch.length > 1 && batch[0].id === result.at(-1)!.id) [batch[0], batch[1]] = [batch[1], batch[0]];
    result.push(...batch.slice(0, settings.roundLength - result.length));
  }
  return result;
}

export function makeQuestion(id: ActivityId, target: LearningItem, settings: Settings, theme: ThemeId, random: () => number = Math.random): Question {
  const choices = shuffled([
    target,
    ...shuffled(practiceItems(id, settings).filter((item) => item.id !== target.id), random)
      .slice(0, settings.stage === 'little' ? 1 : 2),
  ], random);
  const noun = theme === 'woodland' ? 'apples' : 'stars';
  const prompts: Record<ActivityId, [string, string]> = {
    numbers: [`How many ${noun} can you see?`, `Touch each ${noun === 'apples' ? 'apple' : 'star'} to count, then choose a number.`],
    letters: [`Can you find the letter ${target.label}?`, 'Look, listen, and find the matching letter.'],
    colors: [`Can you find ${target.label}?`, 'Choose the matching color.'],
    shapes: [`Can you find the ${target.label}?`, 'Look for the matching shape.'],
    objects: [`Where is the ${target.label}?`, 'Listen, then choose the picture.'],
  };
  return { activity: id, target, choices, prompt: prompts[id][0], instruction: prompts[id][1], skill: `${id}:${target.id}` };
}

export function recordResult(profile: Profile, question: Question, mistakes: number, usedHint: boolean): void {
  const current = profile.progress[question.skill] ?? { attempts: 0, firstTry: 0, completed: 0, hints: 0 };
  current.attempts += 1 + mistakes;
  current.completed += 1;
  if (mistakes === 0 && !usedHint) current.firstTry += 1;
  if (usedHint) current.hints += 1;
  profile.progress[question.skill] = current;
}
