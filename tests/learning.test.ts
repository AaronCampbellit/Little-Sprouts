import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTIVITIES, LETTERS, NUMBERS, OBJECTS } from '../src/content.ts';
import { makeQuestion, makeRound, recordResult } from '../src/learning.ts';
import { DEFAULT_SETTINGS, newProfile, validateSave } from '../src/storage.ts';

function seeded(seed: number) {
  return () => { seed = Math.imul(1664525, seed) + 1013904223 | 0; return (seed >>> 0) / 4294967296; };
}

test('content covers 1–10 and all 26 distinct alphabet letters', () => {
  assert.deepEqual(NUMBERS.map((n) => n.value), [1,2,3,4,5,6,7,8,9,10]);
  assert.equal(LETTERS.map((l) => l.label).join(''), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  assert.equal(new Set(OBJECTS.map((i) => i.id)).size, 12);
  assert.equal(new Set(ACTIVITIES.flatMap((a) => a.items.map((i) => i.id))).size, 66);
});

test('each practice question has exactly one correct, unique answer over many seeds', () => {
  for (const stage of ['little', 'growing'] as const) for (const activity of ACTIVITIES) {
    for (let seed = 0; seed < 50; seed++) {
      const settings = { ...DEFAULT_SETTINGS, stage };
      const rng = seeded(seed);
      for (const target of makeRound(activity.id, settings, rng)) {
        const q = makeQuestion(activity.id, target, settings, 'woodland', rng);
        assert.equal(q.choices.length, stage === 'little' ? 2 : 3);
        assert.equal(q.choices.filter((c) => c.id === target.id).length, 1);
        assert.equal(new Set(q.choices.map((c) => c.id)).size, q.choices.length);
      }
    }
  }
});

test('a ten-question counting round visits every number once, including ten', () => {
  const round = makeRound('numbers', { ...DEFAULT_SETTINGS, roundLength: 10 }, seeded(8));
  assert.deepEqual(round.map((n) => n.value).sort((a,b) => a! - b!), NUMBERS.map((n) => n.value));
});

test('the parent counting limit applies to targets and distractors', () => {
  const settings = { ...DEFAULT_SETTINGS, maxNumber: 5 as const, roundLength: 10 as const };
  for (const target of makeRound('numbers', settings, seeded(42))) {
    assert.ok(target.value! <= 5);
    assert.ok(makeQuestion('numbers', target, settings, 'woodland').choices.every((i) => i.value! <= 5));
  }
});

test('theme changes preserve the skill and answer while changing the scene noun', () => {
  const a = makeQuestion('numbers', NUMBERS[9], DEFAULT_SETTINGS, 'woodland', seeded(1));
  const b = makeQuestion('numbers', NUMBERS[9], DEFAULT_SETTINGS, 'starlight', seeded(1));
  assert.equal(a.skill, b.skill); assert.deepEqual(a.choices, b.choices);
  assert.match(a.prompt, /apples/); assert.match(b.prompt, /stars/);
});

test('hints and retries do not count as first-try learning evidence', () => {
  const p = newProfile();
  const q = makeQuestion('letters', LETTERS[0], DEFAULT_SETTINGS, 'woodland');
  recordResult(p, q, 1, false); recordResult(p, q, 0, true); recordResult(p, q, 0, false);
  assert.deepEqual(p.progress[q.skill], { attempts: 4, completed: 3, firstTry: 1, hints: 1 });
});

test('backup validation rejects unknown versions, duplicate explorers, and empty data', () => {
  assert.throws(() => validateSave({ version: 2, profiles: [] }));
  const p = newProfile();
  assert.throws(() => validateSave({ version: 1, profiles: [p,p] }));
});

test('backup validation repairs counters and discards foreign progress keys', () => {
  const p = newProfile();
  p.progress['numbers:number-1'] = { attempts: -1, completed: 2, firstTry: 99, hints: Infinity };
  p.progress['unknown:stuff'] = { attempts: 1, completed: 1, firstTry: 1, hints: 0 };
  const data = validateSave({ version: 1, activeProfileId: 'missing', profiles: [p] });
  assert.equal(data.activeProfileId, p.id);
  assert.deepEqual(data.profiles[0].progress['numbers:number-1'], { attempts: 2, completed: 2, firstTry: 2, hints: 0 });
  assert.equal(data.profiles[0].progress['unknown:stuff'], undefined);
});
