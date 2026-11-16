import { ACTIVITIES, CHARACTERS } from './content.ts';
import { makeQuestion } from './learning.ts';
import type { CharacterId, Question, Settings, ThemeId } from './types.ts';

/** One source for runtime prompts and the recordings made for them. */
export const SPEECH = {
  test: 'Hello, little explorer! Let’s play and discover together.',
  explore: 'Choose one to look, listen, and learn.',
  ready: 'Let’s explore together.',
  soundOn: 'Sound is on. Let’s play!',
  retry: 'Let’s have another look. You can do it.',
  finished: 'Look what you discovered! What a lovely adventure.',
} as const;

export function normalizeSpeechText(text: string): string {
  return text.normalize('NFKC').replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();
}

export function characterGreeting(character: CharacterId): string {
  return `Hello! I’m ${CHARACTERS[character].name}. Let’s explore together.`;
}

export function correctSpeech(question: Question, theme: ThemeId): string {
  if (question.activity === 'letters') return question.target.speech;
  if (question.activity === 'numbers') {
    const single = question.target.value === 1;
    const noun = theme === 'woodland' ? single ? 'apple' : 'apples' : single ? 'star' : 'stars';
    return `${question.target.label} ${noun}.`;
  }
  return `You found the ${question.target.label}!`;
}

export function hintSpeech(question: Question): string {
  return question.activity === 'numbers'
    ? `Let’s count together. There are ${question.target.label}. Follow the glowing number.`
    : `Look for ${question.target.label}. Follow the gentle glow.`;
}

export function countingSpeech(count: number, total: number): string {
  return count === total ? `${count}. ${count} altogether. Can you find ${count}?` : String(count);
}

export function narrationTexts(): string[] {
  const settings: Settings = { stage: 'growing', maxNumber: 10, letterCase: 'upper', roundLength: 5, sound: true };
  const texts = new Set<string>(Object.values(SPEECH).map(normalizeSpeechText));
  const add = (text: string) => texts.add(normalizeSpeechText(text));
  for (const character of ['milo', 'pip'] as const) add(characterGreeting(character));
  for (const theme of ['woodland', 'starlight'] as const) {
    for (const activity of ACTIVITIES) for (const item of activity.items) {
      const question = makeQuestion(activity.id, item, settings, theme, () => 0.5);
      add(item.speech); add(question.prompt); add(correctSpeech(question, theme)); add(hintSpeech(question));
    }
  }
  for (let i = 1; i <= 10; i++) { add(String(i)); add(countingSpeech(i, i)); }
  return [...texts].sort();
}
