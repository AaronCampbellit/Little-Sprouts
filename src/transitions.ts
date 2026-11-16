// Quick controls and calmly paced action are separate requirements. See AGENTS.md.
export const TRANSITION_MS = Object.freeze({ menu: 240, picker: 180, question: 420, environment: 1_200, actionScene: 2_000 });
export type TransitionKind = keyof typeof TRANSITION_MS;
export const LOCAL_FADE_MS = TRANSITION_MS.picker;

export function motionPolicy(reduced: boolean) {
  return { durations: TRANSITION_MS, localDuration: LOCAL_FADE_MS, decorativeMovement: !reduced };
}

/** A shared stage stays in place while outgoing and incoming content fade. */
export class GentleStage {
  busy = false;
  private active?: HTMLElement;
  private host: HTMLElement;
  constructor(host: HTMLElement) { this.host = host; }

  async show(markup: string, kind: TransitionKind = 'menu'): Promise<void> {
    if (this.busy) return;
    const incoming = document.createElement('div');
    incoming.className = 'scene-layer';
    incoming.innerHTML = markup;
    if (!this.active) { this.host.append(incoming); this.active = incoming; return; }
    this.busy = true;
    this.host.dataset.transitioning = 'true';
    this.host.dataset.transitionKind = kind;
    this.host.setAttribute('aria-busy', 'true');
    const outgoing = this.active;
    outgoing.inert = true; incoming.inert = true;
    incoming.style.opacity = '0';
    this.host.style.minHeight = `${outgoing.getBoundingClientRect().height}px`;
    outgoing.classList.add('outgoing');
    this.host.append(incoming);
    const options: KeyframeAnimationOptions = { duration: TRANSITION_MS[kind], easing: 'ease-in-out', fill: 'forwards' };
    const fadeOut = outgoing.animate([{ opacity: 1, offset: 0 }, { opacity: 0, offset: 0.5 }, { opacity: 0, offset: 1 }], options);
    const fadeIn = incoming.animate([{ opacity: 0, offset: 0 }, { opacity: 0, offset: 0.5 }, { opacity: 1, offset: 1 }], options);
    await Promise.all([fadeOut.finished, fadeIn.finished]);
    outgoing.remove(); incoming.style.opacity = '1';
    fadeOut.cancel(); fadeIn.cancel();
    incoming.inert = false;
    this.active = incoming;
    // Shrink the surrounding stage continuously instead of snapping the page.
    this.host.style.minHeight = `${incoming.getBoundingClientRect().height}px`;
    setTimeout(() => { if (this.active === incoming && !this.busy) this.host.style.minHeight = ''; }, LOCAL_FADE_MS);
    this.host.dataset.transitioning = 'false';
    this.host.setAttribute('aria-busy', 'false');
    this.busy = false;
  }
}

/** Replace local feedback only while it is fully transparent. */
export async function fadeLocal(element: HTMLElement, update: () => void): Promise<void> {
  const previous = element.animate([{ opacity: 1 }, { opacity: 0 }], { duration: LOCAL_FADE_MS / 2, fill: 'forwards' });
  await previous.finished;
  if (!element.isConnected) return;
  update();
  const next = element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: LOCAL_FADE_MS / 2, fill: 'forwards' });
  previous.cancel(); await next.finished; next.cancel();
}
