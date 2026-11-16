import { CHARACTERS } from './content.ts';
import type { ActivityId, CharacterId, LearningItem, LetterCase } from './types.ts';

export const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const paths: Record<string, string> = {
  speaker: '<path d="m11 5-6 4H2v6h3l6 4z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  muted: '<path d="m11 5-6 4H2v6h3l6 4z"/><path d="m16 9 6 6m0-6-6 6"/>',
  gear: '<path d="m9 3-.6 2.2-2 .9L4.3 5.5 2.5 8.6 4 10.3v2.4l-1.5 1.7 1.8 3.1 2.1-.6 2 .9L9 20h4l.6-2.2 2-.9 2.1.6 1.8-3.1-1.5-1.7v-2.4l1.5-1.7-1.8-3.1-2.1.6-2-.9L13 3Z"/><circle cx="11" cy="11.5" r="3"/>',
  back: '<path d="m14 6-6 6 6 6M8 12h13"/>',
  next: '<path d="m10 6 6 6-6 6M16 12H3"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  replay: '<path d="M3 10a9 9 0 1 1 1 8M3 4v6h6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  moon: '<path d="M20 14.5A8.8 8.8 0 0 1 9.5 4a9 9 0 1 0 10.5 10.5Z"/><path d="m18 2 .6 2.4L21 5l-2.4.6L18 8l-.6-2.4L15 5l2.4-.6Z"/>',
  trees: '<path d="m8 2-5 8h3l-4 6h5v5h2v-5h5l-4-6h3ZM17 4l-3 5h2l-3 5h3v5h2v-5h4l-3-5h2Z"/>',
  help: '<path d="M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 3"/><path d="M12 17h.01"/><circle cx="12" cy="12" r="10"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M4 15v5h16v-5"/>',
  upload: '<path d="M12 15V3m-4 4 4-4 4 4M4 15v5h16v-5"/>',
  play: '<path d="m9 5 11 7-11 7Z"/>',
  leaf: '<path d="M12 22V11"/><path d="M12 14C3 15 2 8 3 4c7-1 11 3 9 10ZM12 10C11 3 16 1 22 2c0 7-4 11-10 8Z"/>',
};

export function icon(name: string, className = ''): string {
  return `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.leaf}</svg>`;
}

export function mascot(character: CharacterId, pose = 0, className = ''): string {
  return `<span class="mascot ${className}" style="--sprite-x:${CHARACTERS[character].column * 100}%;--sprite-y:${pose * 100}%;--portrait-x:${character === 'milo' ? 24 : 83}%;--portrait-y:${pose ? character === 'milo' ? 68 : 72 : character === 'milo' ? 8 : 14}%" role="img" aria-label="${CHARACTERS[character].name}, ${CHARACTERS[character].description}"></span>`;
}

export function objectPicture(index: number, className = ''): string {
  return `<span class="object-picture ${className}" style="--object-x:${(index % 4) / 3 * 100}%;--object-y:${Math.floor(index / 4) / 2 * 100}%" aria-hidden="true"></span>`;
}

export function shapePicture(label: string, className = ''): string {
  const shapes: Record<string, string> = {
    circle: '<circle cx="50" cy="50" r="40"/>',
    square: '<rect x="12" y="12" width="76" height="76" rx="3"/>',
    triangle: '<path d="M50 7 94 88H6Z"/>',
    rectangle: '<rect x="4" y="24" width="92" height="52" rx="3"/>',
    oval: '<ellipse cx="50" cy="50" rx="44" ry="29"/>',
    star: '<path d="m50 4 13 29 32 4-24 23 6 33-27-16-27 16 6-33L5 37l32-4Z"/>',
    heart: '<path d="M50 88 12 51C-9 25 24-1 50 24 76-1 109 25 88 51Z"/>',
    diamond: '<path d="m50 3 36 47-36 47L14 50Z"/>',
  };
  return `<svg class="shape-picture ${className}" viewBox="0 0 100 100" aria-hidden="true">${shapes[label] ?? shapes.circle}</svg>`;
}

export function letterLabel(item: LearningItem, letterCase: LetterCase): string {
  return letterCase === 'lower' ? item.lower! : letterCase === 'mixed' ? `${item.label}${item.lower}` : item.label;
}

export function itemPicture(activity: ActivityId, item: LearningItem, letterCase: LetterCase = 'upper'): string {
  switch (activity) {
    case 'numbers': return `<span class="number-glyph">${item.label}</span>`;
    case 'letters': return `<span class="letter-glyph">${letterLabel(item, letterCase)}</span>`;
    case 'colors': return `<span class="color-swatch" style="--swatch:${item.color}" aria-hidden="true"></span>`;
    case 'shapes': return shapePicture(item.label);
    case 'objects': return objectPicture(item.objectIndex!);
  }
}

export function activityArtwork(id: ActivityId): string {
  switch (id) {
    case 'numbers': return '<div class="tile-numbers" aria-hidden="true"><span>1</span><span>2</span><span>3</span></div>';
    case 'letters': return '<div class="tile-letters" aria-hidden="true">Aa</div>';
    case 'colors': return '<div class="tile-colors" aria-hidden="true"><i></i><i></i><i></i></div>';
    case 'shapes': return `<div class="tile-shapes">${shapePicture('circle')}${shapePicture('triangle')}${shapePicture('square')}</div>`;
    case 'objects': return `<div class="tile-objects">${objectPicture(0)}${objectPicture(2)}</div>`;
  }
}
