import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTIVITIES, LETTERS } from '../src/content.ts';
import { makeQuestion } from '../src/learning.ts';
import { DEFAULT_SETTINGS } from '../src/storage.ts';
import { correctSpeech, countingSpeech, hintSpeech, narrationTexts, normalizeSpeechText } from '../src/speech-text.ts';

test('recording catalogue covers every subject, theme, letter, hint and count total', () => {
  const catalogue = new Set(narrationTexts());
  for (const theme of ['woodland', 'starlight'] as const) for (const activity of ACTIVITIES) for (const item of activity.items) {
    const q = makeQuestion(activity.id, item, DEFAULT_SETTINGS, theme);
    for (const text of [item.speech, q.prompt, correctSpeech(q, theme), hintSpeech(q)]) {
      assert.ok(catalogue.has(normalizeSpeechText(text)), text);
    }
  }
  for (let i = 1; i <= 10; i++) {
    assert.ok(catalogue.has(String(i)));
    assert.ok(catalogue.has(countingSpeech(i, i)));
  }
  assert.equal(LETTERS.filter((letter) => catalogue.has(normalizeSpeechText(letter.speech))).length, 26);
});

test('speech catalogue normalizes apostrophes and whitespace without changing letters or numbers', () => {
  assert.equal(normalizeSpeechText(' Let’s  find A.\n'), "Let's find A.");
  assert.equal(normalizeSpeechText('10 apples.'), '10 apples.');
  const items = narrationTexts();
  assert.equal(new Set(items).size, items.length);
});
