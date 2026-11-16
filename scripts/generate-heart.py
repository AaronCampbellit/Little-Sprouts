"""Bake the fixed narration catalogue into small, same-origin MP3 recordings.

Run with .voice-venv/bin/python scripts/generate-heart.py. Model weights belong
in ignored .voice-cache; neither the model nor this environment is deployed.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import time

import lameenc
import numpy as np
import onnxruntime as ort
from kokoro_onnx import Kokoro

ROOT = Path(__file__).resolve().parents[1]
MODEL_SHA256 = "beb0d1848dee9a49da392cc3df26958d46cfa35d321edf434f52949153f0df3a"
VOICES_SHA256 = "bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d"
SPEED = 0.94
LETTER = re.compile(r"(?<![A-Za-z'’])([A-Z])(?![A-Za-z'’])")


def letter_phonemes(text: str, tokenizer) -> str:
    """Read isolated capitals as letter names, including A inside a sentence.

    Keep whole-prompt synthesis; this changes pronunciation, not audio splicing.
    Apostrophes prevent the I in I'm from becoming a standalone letter.
    """
    parts: list[str] = []
    start = 0
    for match in LETTER.finditer(text):
        before = text[start:match.start()].strip()
        if before:
            parts.append(tokenizer.phonemize(before, "en-us") if any(c.isalnum() for c in before) else before)
        parts.append(tokenizer.phonemize(match.group(1) + ".", "en-us").rstrip(".").strip())
        start = match.end()
    after = text[start:].strip()
    if after:
        parts.append(tokenizer.phonemize(after, "en-us") if any(c.isalnum() for c in after) else after)
    return " ".join(parts)


def catalogue() -> list[str]:
    code = "import { narrationTexts } from './src/speech-text.ts'; console.log(JSON.stringify(narrationTexts()));"
    return json.loads(subprocess.check_output(["node", "--input-type=module", "-e", code], cwd=ROOT, text=True))


def verify(path: Path, expected: str) -> None:
    with path.open("rb") as handle:
        actual = hashlib.file_digest(handle, "sha256").hexdigest()
    if actual != expected:
        raise RuntimeError(f"Checksum mismatch for {path.name}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, help="Generate a small development sample without publishing a manifest")
    args = parser.parse_args()
    model = ROOT / ".voice-cache/kokoro-v1.0.onnx"
    voices = ROOT / ".voice-cache/voices-v1.0.bin"
    verify(model, MODEL_SHA256)
    verify(voices, VOICES_SHA256)
    options = ort.SessionOptions()
    options.intra_op_num_threads = 4
    options.inter_op_num_threads = 1
    options.log_severity_level = 3
    session = ort.InferenceSession(str(model), sess_options=options, providers=["CPUExecutionProvider"])
    engine = Kokoro.from_session(session, str(voices))
    output = ROOT / "public/audio/heart"
    output.mkdir(parents=True, exist_ok=True)
    cached_file = ROOT / ".voice-cache/heart-progress.json"
    cached = json.loads(cached_file.read_text()) if cached_file.exists() else {}
    # Changing these settings invalidates old cached takes.
    signature = {"voice": "af_heart", "speed": SPEED, "model": MODEL_SHA256, "pipeline": 1}
    if cached.get("settings") != signature:
        cached = {"settings": signature, "clips": {}}
    clips: dict[str, dict] = cached["clips"]
    texts = catalogue()
    if args.limit:
        texts = texts[:args.limit]
    started = time.monotonic()
    for index, text in enumerate(texts, 1):
        pronunciation = "letter-names-v1" if LETTER.search(text) else "default"
        previous = clips.get(text)
        if previous and previous.get("pronunciation", "default") == pronunciation:
            target = ROOT / "public" / previous["file"].lstrip("/")
            if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest() == previous.get("sha256"):
                continue
        spoken = letter_phonemes(text, engine.tokenizer) if pronunciation == "letter-names-v1" else text
        samples, sample_rate = engine.create(spoken, voice="af_heart", speed=SPEED, lang="en-us", sentence_pause=0.25, is_phonemes=pronunciation == "letter-names-v1")
        samples = np.asarray(samples, dtype=np.float32).reshape(-1)
        if not np.isfinite(samples).all() or len(samples) < sample_rate * 0.15:
            raise RuntimeError(f"Invalid generated audio: {text!r}")
        peak = float(np.max(np.abs(samples)))
        rms = float(np.sqrt(np.mean(samples * samples)))
        if peak < 0.001 or rms < 0.0001:
            raise RuntimeError(f"Silent generated audio: {text!r}")
        gain = min(0.88 / peak, 0.12 / rms, 2.5)
        samples *= gain
        ramp = min(int(sample_rate * 0.012), len(samples) // 4)
        samples[:ramp] *= np.linspace(0, 1, ramp)
        samples[-ramp:] *= np.linspace(1, 0, ramp)
        padding = np.zeros(int(sample_rate * 0.025), dtype=np.float32)
        samples = np.concatenate([padding, samples, padding])
        pcm = np.rint(np.clip(samples, -1, 1) * 32767).astype("<i2")
        encoder = lameenc.Encoder()
        encoder.set_bit_rate(80)
        encoder.set_in_sample_rate(sample_rate)
        encoder.set_channels(1)
        encoder.set_quality(2)
        encoded = encoder.encode(pcm.tobytes()) + encoder.flush()
        identifier = hashlib.sha256(encoded).hexdigest()[:16]
        target = output / f"{identifier}.mp3"
        temporary = target.with_suffix(".mp3.partial")
        temporary.write_bytes(encoded)
        temporary.replace(target)
        clips[text] = {"file": f"/audio/heart/{identifier}.mp3", "seconds": round(len(samples) / sample_rate, 4), "bytes": len(encoded), "sha256": hashlib.sha256(encoded).hexdigest(), "peak": round(float(np.max(np.abs(samples))), 5), "pronunciation": pronunciation}
        cached_file.write_text(json.dumps(cached, indent=2) + "\n")
        if index % 20 == 0 or index == 1 or index == len(texts):
            print(f"Heart narration: {index}/{len(texts)} lines, {time.monotonic()-started:.1f}s elapsed", flush=True)
    if not args.limit:
        manifest = {"version": 1, "voice": "heart", "displayName": "Heart", "model": "Kokoro-82M v1.0", "language": "en-US", "sampleRate": 24000, "speed": SPEED, "modelSha256": MODEL_SHA256, "clips": {text: clips[text] for text in texts}}
        destination = ROOT / "public/audio/manifest.json"
        temporary = destination.with_suffix(".json.partial")
        temporary.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
        temporary.replace(destination)
        print(f"Published {len(texts)} Heart recordings ({sum(clips[t]['bytes'] for t in texts)/1_000_000:.2f} MB)", flush=True)


if __name__ == "__main__":
    main()
