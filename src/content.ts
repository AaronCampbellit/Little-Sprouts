import type { Activity, ActivityId, LearningItem } from './types.ts';

export const NUMBERS: LearningItem[] = Array.from({ length: 10 }, (_, i) => ({
  id: `number-${i + 1}`, label: String(i + 1), speech: String(i + 1), value: i + 1,
}));

const letterWords = ['apple', 'ball', 'cat', 'dog', 'egg', 'fish', 'goat', 'hat', 'insect', 'jam', 'kite', 'leaf', 'moon', 'nest', 'octopus', 'pig', 'queen', 'rabbit', 'sun', 'tree', 'umbrella', 'van', 'whale', 'fox', 'yarn', 'zebra'];
export const LETTERS: LearningItem[] = Array.from({ length: 26 }, (_, i) => {
  const label = String.fromCharCode(65 + i);
  const word = letterWords[i];
  return {
    id: `letter-${label}`, label, lower: label.toLowerCase(), word,
    // X is an ending-sound example; do not teach "xylophone" as /ks/.
    speech: label === 'X' ? 'X. The letter X is at the end of fox.' : `${label}. The letter ${label} is for ${word}.`,
  };
});

export const COLORS: LearningItem[] = [
  ['red', '#DF675D'], ['blue', '#618DC8'], ['yellow', '#F0C650'],
  ['green', '#76A675'], ['orange', '#EFA164'], ['purple', '#A58AC6'],
  ['pink', '#E99DB8'], ['brown', '#99745C'], ['black', '#3A4247'], ['white', '#FFFFFF'],
].map(([id, color]) => ({ id: `color-${id}`, label: id, speech: id, color }));

export const SHAPES: LearningItem[] = ['circle', 'square', 'triangle', 'rectangle', 'oval', 'star', 'heart', 'diamond']
  .map((label) => ({ id: `shape-${label}`, label, speech: label }));

// Positions in the production object sheet: 4 columns x 3 rows.
export const OBJECTS: LearningItem[] = [
  ['apple', 'food'], ['banana', 'food'], ['ball', 'toys'], ['teddy bear', 'toys'],
  ['cat', 'animals'], ['dog', 'animals'], ['bird', 'animals'], ['fish', 'animals'],
  ['car', 'things'], ['cup', 'things'], ['shoe', 'things'], ['tree', 'things'],
].map(([label, category], objectIndex) => ({
  id: `object-${objectIndex}`, label, speech: label, objectIndex,
  category: category as LearningItem['category'],
}));

export const ACTIVITIES: Activity[] = [
  { id: 'numbers', title: 'Numbers', subtitle: 'Count to 10', description: 'Count, touch, and discover how many.', accent: 'green', items: NUMBERS },
  { id: 'letters', title: 'Letters', subtitle: 'Explore A–Z', description: 'Meet every letter, one little discovery at a time.', accent: 'peach', items: LETTERS },
  { id: 'colors', title: 'Colors', subtitle: 'A world of color', description: 'Find your favorite colors.', accent: 'purple', items: COLORS },
  { id: 'shapes', title: 'Shapes', subtitle: 'Find a match', description: 'Explore circles, corners, and everything in between.', accent: 'blue', items: SHAPES },
  { id: 'objects', title: 'Our world', subtitle: 'Name & discover', description: 'Make friends with familiar things.', accent: 'yellow', items: OBJECTS },
];

export const activityById = (id: ActivityId): Activity => ACTIVITIES.find((a) => a.id === id)!;

export const THEMES = {
  woodland: { name: 'Woodland', description: 'A sunny little woodland', image: '/assets/backgrounds.png', countObject: 'apples', objectIndex: 0 },
  starlight: { name: 'Starlight', description: 'An adventure under the stars', image: '/assets/backgrounds.png', countObject: 'stars', objectIndex: -1 },
} as const;

export const CHARACTERS = {
  milo: { name: 'Milo', description: 'Your curious fox friend', column: 0 },
  pip: { name: 'Pip', description: 'Your cheerful bunny friend', column: 1 },
} as const;
