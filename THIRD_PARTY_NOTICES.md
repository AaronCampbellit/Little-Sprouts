# Third-party notices and asset provenance

These notices describe third-party components used by Little Sprouts. They do not grant an open-source license to the original project. Dependency distributions can include additional notices; retain those when redistributing the relevant component.

| Component | Use | License or provenance |
| --- | --- | --- |
| [Phaser](https://github.com/phaserjs/phaser) | Optional desktop companion renderer | MIT; [included license](public/licenses/Phaser.txt) |
| Nunito | Self-hosted interface fonts | SIL Open Font License 1.1; [included license](public/assets/OFL-Nunito.txt) |
| [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M), `af_heart` | Local generation of prerecorded narration | Upstream model weights identify Apache-2.0; [included license](public/licenses/Kokoro-Apache-2.0.txt) |
| [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx) | Optional local voice-generation tooling | MIT; [included license](public/licenses/kokoro-onnx-MIT.txt) |
| [Vite](https://github.com/vitejs/vite) | Development server and production bundling | MIT; distributed through the locked npm dependencies |
| [TypeScript](https://github.com/microsoft/TypeScript) | Type checking | Apache-2.0; distributed through the locked npm dependencies |
| ImageGen illustrations | Character, landscape, object atlases, and design concept | AI-generated project assets; [prompts and file provenance](docs/design/image-prompts.json) |

The game ships generated MP3 recordings, not speech-model weights or a Python runtime. See the [audio notice](public/audio/NOTICE.txt) and [narration workflow](docs/VOICES.md) for the generation details. Narration is identified as AI-generated in the grown-up settings.

The README screenshots show the running application with a generic test profile. They do not contain a child's personal progress or nickname.
