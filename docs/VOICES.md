# Heart narration

The game uses **Heart**, Kokoro-82M v1.0 voice `af_heart`, as its consistent English narrator. All 293 current lesson lines are prerecorded and served with the game. No paid speech API, credentials, model server, or installed system voice is needed during play.

## Playback

`src/speech-text.ts` is the shared catalogue of actual prompts, letters, object names, counting totals, hints, greetings, and feedback. `public/audio/manifest.json` maps normalized lines to MP3 files in `public/audio/heart/`. Clips load on demand, decode through Web Audio after a user gesture, and use a bounded 32-clip memory cache.

Fire Truck adds 35 whole-prompt recordings covering all eight color/object goals, hints, retries, discovery feedback, and round completion.

Grown-ups → Test sound previews Heart. The existing sound control mutes both narration and gentle chimes. Changing items, questions, activities, repeating a prompt, hiding the page, or muting cancels current and pending narration. A late network response cannot play an old prompt. If a recording fails, an available English device voice provides a fallback; the app remains usable when no device voice is installed.

Letters are taught by name. The text explicitly says “the letter A”; the generation pipeline also supplies standalone-letter pronunciations so A is never interpreted as the article “a” in these lesson lines. X uses fox as an ending-letter example. Prompts are synthesized as complete recordings, without joining separately recorded words.

## Regenerate after changing spoken content

Ordinary builds use the checked-in recordings and need only Node. Generation is a separate, local development step. Use Python 3.12 and the pinned toolchain in ignored `.voice-venv/`; ignored `.voice-cache/` holds weights and resumable generation progress. Neither directory is deployed.

For a fresh generation environment using `uv`:

```sh
uv venv --python 3.12 .voice-venv
uv pip sync --python .voice-venv/bin/python scripts/voice-requirements.lock
```

Download `kokoro-v1.0.onnx` and `voices-v1.0.bin` from the official [kokoro-onnx model-files-v1.1 release](https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.1) into `.voice-cache/`. The generator rejects files whose SHA-256 differs from:

```text
kokoro-v1.0.onnx  beb0d1848dee9a49da392cc3df26958d46cfa35d321edf434f52949153f0df3a
voices-v1.0.bin   bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d
```

Then run:

```sh
npm run voices:generate
.voice-venv/bin/python -m unittest discover -s tests -p '*_test.py'
npm test
npm run build
```

Generation uses CPU-only ONNX Runtime, four inference threads, speed 0.94, 24 kHz mono, and 80 kbps MP3. Gain normalization and short edge ramps reduce volume jumps and clipping. Each clip records its duration, bytes, SHA-256, and peak. Changed audio receives a new content-derived filename; unchanged cached clips keep their URLs. Publish the manifest and its complete audio directory together. Only remove obsolete files after checking that no current manifest references them.

`npm test` checks exact catalogue coverage and every audio checksum, as well as manifest parsing and safe same-origin file paths. The optional Python tests cover the A-pronunciation regression and contractions. Browser acceptance covers actual decoding/playback without device speech voices, repeat, mute, delayed-request cancellation, parent preview, practice feedback, and landscape layout. The family's listening check can use Test sound and the alphabet Explore screen.

## Sources and attribution

- [Kokoro-82M model card](https://huggingface.co/hexgrad/Kokoro-82M): model and Apache-2.0 weight license.
- [Official voices and samples](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md): `af_heart`, American English.
- [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx): ONNX conversion and local inference tooling, MIT.
- [Distributed audio notice](../public/audio/NOTICE.txt), [Apache-2.0 license](../public/licenses/Kokoro-Apache-2.0.txt), and [kokoro-onnx MIT license](../public/licenses/kokoro-onnx-MIT.txt).

Heart was selected after a sample audition. Paid speech services are not part of this implementation.
