# Little Sprouts design specification

Primary concept: [concept.png](concept.png), native size 1487 × 1058. Generated with ImageGen and used as the implementation reference.

## Design system

- Canvas: warm cream `#fcf9f1`. Text: forest `#244d3c`. Moss: `#56805b`.
- Font: self-hosted Nunito, weights 400/600/700/800/900. Rounded, readable, substantial controls.
- Cream tactile header, native sprout mark, explorer selector, sound control, Grown-ups entry.
- Open storybook meadow with large left heading, character selection, and world selection.
- One horizontal row of five genuine activity buttons, with muted green, peach, lilac, blue, and yellow tops and cream captions.
- All text, choices, controls, progress, and mathematical geometry are code-native. Generated watercolor assets supply characters, landscapes, and familiar objects.
- Art: `public/assets/characters.png` (2 × 2 poses), `backgrounds.png` (woodland/starlight stacked), `objects.png` (4 × 3 object grid).

## Visible home copy

little sprouts; Little Explorer; Grown-ups; Little adventures.; Big discoveries.; Pick a game and let's explore.; Milo; Pip; Woodland; Starlight; What shall we play?; Numbers; Count to 10; Letters; Explore A–Z; Colors; A world of color; Shapes; Find a match; Our world; Name & discover; A little discovery, every day.

The explorer nickname is user-editable. Portrait mobile adds an unobtrusive rotate suggestion. Activity, exploration, completion, and parent settings extend the same typography, spacing, colors, and controls.

## Hard motion policy

The shared timing policy distinguishes quick interaction from calmly paced action: menu fades 240 ms; picker/local feedback fades 180 ms; question changes 420 ms; world changes 1,200 ms; future action-scene transitions 2,000 ms. Content fades through the existing stage. No flashing, repeated rapid cuts, forced-speed tasks, abrupt camera moves, or timed question progression. Reduced motion removes decorative bobbing, rotation, slides, and modal translation. Ordinary navigation must remain responsive.

## Intentional production differences

- The production sprite atlas supplies full-body standing/celebrating poses instead of the concept's seated illustration.
- Exact learning geometry, letterforms, numerals, and color swatches use native rendering for correctness and legibility.
- Native SVG symbols replace raster control symbols so controls remain crisp and accessible.
- The game uses real selectable worlds, settings, local profiles, and learning responses, extending the illustrated hub into a working application.
- At widths up to 850 px, the companion uses its generated illustration. The optional Phaser animation loads on desktop; compact-screen controls, learning rules, and motion policy are identical. The illustration stays visible until an animated first frame is available.
