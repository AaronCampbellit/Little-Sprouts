import test from 'node:test';
import assert from 'node:assert/strict';
import { FIRETRUCK_GOALS, fireMatches, fireSkill, firetruckNarrationTexts, makeFiretruckQuestion, makeFiretruckRound, sprayFiretruckItem } from '../src/firetruck.ts';
import { recordResult } from '../src/learning.ts';
import { narrationTexts, normalizeSpeechText } from '../src/speech-text.ts';
import { newProfile, validateSave } from '../src/storage.ts';

function seeded(seed: number) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; }; }

test('spray rounds begin with blue frogs and yellow cars and respect round length', () => {
  for (const length of [5, 10] as const) {
    const round = makeFiretruckRound(length, seeded(17));
    assert.equal(round.length, length);
    assert.deepEqual(round.slice(0, 2).map(goal => goal.label), ['blue frogs', 'yellow cars']);
    assert.ok(round.every(goal => FIRETRUCK_GOALS.includes(goal)));
    assert.ok(round.every((goal, i) => i === 0 || goal.id !== round[i - 1].id));
  }
});

test('every spray board has the right target count and distractors for both attributes', () => {
  for (let seed = 0; seed < 100; seed++) for (const goal of FIRETRUCK_GOALS) for (const stage of ['little', 'growing'] as const) {
    const q = makeFiretruckQuestion(goal, stage, seeded(seed));
    assert.equal(q.items.length, stage === 'little' ? 4 : 6);
    assert.equal(new Set(q.items.map(item => item.id)).size, q.items.length);
    assert.equal(q.items.filter(item => fireMatches(item, goal)).length, stage === 'little' ? 2 : 3);
    assert.ok(q.items.some(item => item.color === goal.color && item.kind !== goal.kind));
    assert.ok(q.items.some(item => item.kind === goal.kind && item.color !== goal.color));
  }
});

test('spraying needs both attributes; repeats and stale hits cannot inflate progress', () => {
  const q = makeFiretruckQuestion(FIRETRUCK_GOALS[0], 'growing', seeded(9));
  const distractors = q.items.filter(item => !fireMatches(item, q.goal));
  for (const item of distractors) {
    assert.equal(sprayFiretruckItem(q, item.id), 'miss');
    assert.equal(sprayFiretruckItem(q, item.id), 'ignored');
  }
  assert.equal(q.found.size, 0); assert.equal(q.complete, false);
  assert.equal(q.mistakes.size, distractors.length);
  assert.equal(sprayFiretruckItem(q, 'not-on-this-board'), 'ignored');
  const matches = q.items.filter(item => fireMatches(item, q.goal));
  matches.forEach((item, index) => {
    assert.equal(sprayFiretruckItem(q, item.id), index === matches.length - 1 ? 'complete' : 'match');
    assert.equal(sprayFiretruckItem(q, item.id), 'ignored');
  });
  assert.equal(q.found.size, 3); assert.equal(q.complete, true);
});

test('Fire Truck observations survive backup validation and distinguish assisted completion', () => {
  const profile = newProfile('Test explorer');
  const goal = FIRETRUCK_GOALS[0];
  recordResult(profile, { skill: fireSkill(goal) }, 2, true);
  const save = validateSave({ version: 1, activeProfileId: profile.id, profiles: [profile] });
  assert.deepEqual(save.profiles[0].progress[fireSkill(goal)], { attempts: 3, completed: 1, firstTry: 0, hints: 1 });
  recordResult(profile, { skill: fireSkill(FIRETRUCK_GOALS[1]) }, 0, false);
  assert.equal(profile.progress[fireSkill(FIRETRUCK_GOALS[1])].firstTry, 1);
});

test('Heart catalogue includes all Fire Truck prompts, hints, retries, and feedback', () => {
  const catalogue = new Set(narrationTexts());
  for (const text of firetruckNarrationTexts()) assert.ok(catalogue.has(normalizeSpeechText(text)), text);
});
