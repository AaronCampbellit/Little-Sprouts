import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseRecordingManifest, recordingFor } from '../src/recordings.ts';
import { narrationTexts } from '../src/speech-text.ts';

test('every current narration line has a complete, verified Heart MP3', () => {
  const root = resolve(import.meta.dirname, '..');
  const raw = JSON.parse(readFileSync(resolve(root, 'public/audio/manifest.json'), 'utf8'));
  const manifest = parseRecordingManifest(raw);
  assert.ok(manifest);
  const texts = narrationTexts();
  assert.deepEqual(Object.keys(manifest.clips).sort(), texts);
  for (const text of texts) {
    const clip = recordingFor(manifest, text)!;
    const path = resolve(root, `public${clip.file}`);
    assert.ok(statSync(path).size > 1000, text);
    const buffer = readFileSync(path);
    assert.equal(createHash('sha256').update(buffer).digest('hex'), raw.clips[text].sha256, text);
    assert.ok(raw.clips[text].peak <= 0.89, text);
  }
});

test('recording lookup tolerates apostrophe and whitespace variants', () => {
  const manifest = parseRecordingManifest({ version: 1, voice: 'heart', clips: {
    "Let's play.": { file: '/audio/heart/0123456789abcdef.mp3', seconds: 1.2 },
  } });
  assert.ok(manifest);
  assert.equal(recordingFor(manifest, ' Let’s  play. ')?.seconds, 1.2);
  assert.equal(recordingFor(manifest, 'Unknown line'), undefined);
});

test('invalid manifests and recording paths cannot become playback requests', () => {
  for (const clip of [
    { file: 'https://example.com/audio.mp3', seconds: 1 },
    { file: '/audio/heart/../secret.mp3', seconds: 1 },
    { file: '/audio/heart/0123456789abcdef.mp3', seconds: Infinity },
    { file: '/audio/heart/0123456789abcdef.mp3', seconds: 0 },
  ]) assert.equal(parseRecordingManifest({ version: 1, voice: 'heart', clips: { hello: clip } }), null);
  assert.equal(parseRecordingManifest({ version: 2, voice: 'heart', clips: {} }), null);
});
