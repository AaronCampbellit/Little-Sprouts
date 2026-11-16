import test from 'node:test';
import assert from 'node:assert/strict';
import { TRANSITION_MS, motionPolicy } from '../src/transitions.ts';

test('menus and simple questions stay responsive while world/action transitions are calmer', () => {
  assert.ok(TRANSITION_MS.menu <= 300);
  assert.ok(TRANSITION_MS.picker <= 250);
  assert.ok(TRANSITION_MS.question <= 500);
  assert.ok(TRANSITION_MS.environment >= 1_000);
  assert.ok(TRANSITION_MS.actionScene > TRANSITION_MS.environment);
});

test('reduced motion removes decorative movement without reintroducing long menu waits', () => {
  const regular = motionPolicy(false);
  const reduced = motionPolicy(true);
  assert.deepEqual(regular.durations, reduced.durations);
  assert.ok(reduced.durations.menu <= 300);
  assert.equal(reduced.decorativeMovement, false);
});
