# Little Sprouts project rules

## Gentle motion — hard requirement

- Never introduce flashes, strobes, blinking rewards, rapid repeated cuts, abrupt camera moves, or forced fast-paced action.
- Menus, pickers, and simple matching/recognition questions should respond promptly. Use the shared timing policy: menus 240 ms, pickers/local feedback 180 ms, and question changes 420 ms.
- Fade content through the existing scene rather than flashing a blank page or overlapping readable questions. Ordinary navigation must not introduce long waits.
- Environmental/world changes stay gradual (1,200 ms). Future action-scene transitions use the calmer 2,000 ms category. Smooth frame rate does not authorize fast gameplay, rapid camera cuts, or repeated visual stimulation.
- Keep counting, hints, and feedback in place. The child chooses when to continue after a correct answer; do not automatically advance questions or reward speed.
- Reduced-motion preferences remove bobbing, rotation, slides, and decorative movement. Keep gentle opacity fades and prompt menu response.
- Browser QA must verify that ordinary menus/questions no longer incur long delays, world changes remain continuous, rapid inputs do not corrupt state, and reduced-motion behavior is respected.
- Keep this policy in the README and design documentation. Apply it to future activities and character/theme packs. The timings are design choices, not medical or developmental thresholds.

## Product and architecture

- Family first; around ages 2–4. Full 1–10 and A–Z exploration remains accessible.
- Keep learning rules and progress separate from themes, characters, and presentation.
- Keep prompts and controls code-native, large, and accessible by mouse, touch, and keyboard.
- Keep local progress observations distinct from claims of mastery or developmental assessment.
- Use authoritative curriculum sources and record how our activities adapt them.
- Use a dedicated production workload and preserve unrelated applications.
- Never commit credentials, personal progress exports, build output, or temporary QA artifacts.

Follow the active workspace's installation permissions. Keep optional voice-generation tools, model weights, and caches isolated from the production runtime and excluded from Git. Keep host-specific operational notes and credentials outside the public repository.
