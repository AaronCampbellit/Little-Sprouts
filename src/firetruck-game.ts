import './firetruck.css';
import { Narrator } from './audio.ts';
import { FIRETRUCK_COLORS, FIRETRUCK_SPEECH, fireComplete, fireHint, fireMatches, firePrompt, fireRetry, fireSkill, makeFiretruckQuestion, makeFiretruckRound, sprayFiretruckItem } from './firetruck.ts';
import type { FireItem, FireQuestion } from './firetruck.ts';
import { recordResult } from './learning.ts';
import { fadeLocal, LOCAL_FADE_MS } from './transitions.ts';
import type { TransitionKind } from './transitions.ts';
import type { Profile } from './types.ts';
import { firetruckPicture, icon } from './ui.ts';

const picture = (item: Pick<FireItem, 'kind' | 'color'>) => firetruckPicture((item.kind === 'frog' ? 0 : 4) + FIRETRUCK_COLORS.indexOf(item.color));

/** Owns a mini-game session; the shared stage still owns all scene transitions. */
export class FiretruckGame {
  private goals;
  private index = 0;
  private question: FireQuestion;
  private finished = false;
  private busy = false;
  private root?: HTMLElement;
  private board?: HTMLElement;
  private listeners?: AbortController;
  private pointer?: number;
  private point = { x: 0, y: 0 };
  private frame?: number;
  private dwell?: number;
  private waterTimer?: number;
  private hover?: string;
  private feedbackVersion = 0;

  constructor(private profile: Profile, private narrator: Narrator, private save: () => void, private redraw: (kind: TransitionKind) => Promise<void>) {
    this.goals = makeFiretruckRound(profile.settings.roundLength);
    this.question = makeFiretruckQuestion(this.goals[0], profile.settings.stage);
  }

  markup(): string {
    if (this.finished) return `<main class="finish-screen firetruck-screen"><div class="firetruck-finish-art">${firetruckPicture(8)}</div><h1>Lovely spraying!</h1><p>A little teamwork. A lovely adventure.</p><div class="finish-actions"><button class="primary-button" data-fire-action="replay">Play Fire Truck again ${icon('replay')}</button><button class="secondary-button" data-action="home">All games ${icon('back')}</button></div></main>`;
    const q = this.question;
    const total = q.items.filter(item => fireMatches(item, q.goal)).length;
    return `<main class="activity-screen firetruck-screen"><nav class="activity-nav"><button class="back-button" data-action="home">${icon('back')}<span>All games</span></button><h1>Fire Truck</h1><span class="firetruck-round">${this.index + 1} of ${this.goals.length}</span></nav>
      <section class="firetruck-prompt" aria-labelledby="firetruck-heading"><span class="firetruck-goal-picture">${picture(q.goal)}</span><div><h2 id="firetruck-heading" tabindex="-1">${firePrompt(q.goal)}</h2><p>Tap a picture, or hold and move to spray.</p></div><button class="listen-button" data-fire-action="repeat" aria-label="Hear it again">${icon('speaker')}<span>Hear it again</span></button></section>
      <section class="firetruck-board" aria-label="Fire truck spray playground"><div class="firetruck-scenery" aria-hidden="true"></div><div class="firetruck-items firetruck-items-${q.items.length}" role="group" aria-label="Pictures to spray">${q.items.map(item => `<button class="firetruck-target" data-fire-action="target" data-fire-item="${item.id}" aria-label="Spray ${item.color} ${item.kind}" aria-pressed="false">${picture(item)}<span class="firetruck-washed" aria-hidden="true">${icon('check')}</span></button>`).join('')}</div>
        <div class="firetruck-truck" aria-hidden="true">${firetruckPicture(8)}</div><span class="firetruck-source" aria-hidden="true"></span><div class="firetruck-board-note" aria-hidden="true">A little water.<br>A little discovery.</div>
        <svg class="firetruck-water" aria-hidden="true" preserveAspectRatio="none"><path class="firetruck-water-path"/><path class="firetruck-water-path firetruck-water-center"/><g class="firetruck-impact"><circle r="13"/><circle cx="-14" cy="-10" r="4"/><circle cx="12" cy="-13" r="5"/></g></svg></section>
      <div class="firetruck-footer"><button class="hint-button" data-fire-action="hint">${icon('help')}<span>A little help</span></button><div class="firetruck-progress"><span>${icon('check')}<strong class="firetruck-count">0 of ${total} found</strong></span><p class="firetruck-status" role="status">Take your time. You've got this.</p></div><div class="firetruck-continue"><button class="primary-button" data-fire-action="next" hidden>${this.index + 1 === this.goals.length ? 'All done' : 'Next discovery'} ${icon('next')}</button></div></div></main>`;
  }

  mount(): void {
    this.root = document.querySelector<HTMLElement>('.firetruck-screen')!;
    this.board = this.root.querySelector<HTMLElement>('.firetruck-board') ?? undefined;
    this.listeners = new AbortController();
    const options = { signal: this.listeners.signal };
    this.root.addEventListener('click', event => {
      const button = (event.target as Element).closest<HTMLButtonElement>('[data-fire-action]');
      if (!button || button.disabled || this.busy) return;
      this.narrator.unlock();
      switch (button.dataset.fireAction) {
        case 'repeat': this.speakPrompt(); break;
        case 'hint':
          if (this.question.complete) return;
          this.question.hinted = true; this.update('Follow the gentle glow.'); this.narrator.speak(fireHint(this.question.goal)); break;
        case 'target': this.hit(button, true, event.detail === 0); break;
        case 'next': if (this.question.complete) void this.advance(); break;
        case 'replay': void this.advance(true); break;
      }
    }, options);
    if (!this.board) return;
    this.board.addEventListener('pointerdown', event => {
      if (!event.isPrimary || this.busy || this.question.complete || event.button !== 0) return;
      event.preventDefault(); this.narrator.unlock(); this.pointer = event.pointerId;
      this.board!.setPointerCapture(event.pointerId);
      this.aim(event.clientX, event.clientY);
      const button = this.itemAt(event.clientX, event.clientY);
      if (button) this.hit(button);
    }, options);
    this.board.addEventListener('pointermove', event => {
      if (this.pointer !== event.pointerId) return;
      this.aim(event.clientX, event.clientY);
      const button = this.itemAt(event.clientX, event.clientY);
      const id = button?.dataset.fireItem;
      if (id === this.hover) return;
      window.clearTimeout(this.dwell); this.hover = id;
      if (button) {
        const question = this.question;
        this.dwell = window.setTimeout(() => { if (this.pointer !== undefined && this.question === question) this.hit(button); }, 180);
      }
    }, options);
    this.board.addEventListener('pointerup', event => {
      if (this.pointer !== event.pointerId) return;
      const point = this.point;
      this.stopWater(); this.aim(point.x, point.y); this.paintWater();
      this.waterTimer = window.setTimeout(() => this.stopWater(), 500);
    }, options);
    this.board.addEventListener('pointercancel', () => this.stopWater(), options);
    this.board.addEventListener('lostpointercapture', () => { if (this.pointer !== undefined) this.stopWater(); }, options);
    window.addEventListener('blur', () => this.pause(), options);
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.pause(); }, options);
  }

  speakPrompt(): void { this.narrator.speak(this.finished ? FIRETRUCK_SPEECH.finished : firePrompt(this.question.goal)); }
  pause(): void { this.stopWater(); this.narrator.stop(); }
  unmount(): void {
    this.stopWater(); this.listeners?.abort(); this.listeners = undefined;
    this.root = undefined; this.board = undefined;
  }

  private itemAt(x: number, y: number): HTMLButtonElement | null {
    const item = document.elementFromPoint(x, y)?.closest<HTMLButtonElement>('[data-fire-item]') ?? null;
    return item && this.board?.contains(item) ? item : null;
  }

  private aim(x: number, y: number): void {
    if (!this.board) return;
    this.point = { x, y };
    const rect = this.board.getBoundingClientRect();
    this.board.classList.toggle('spraying', x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom);
    if (this.frame === undefined) this.frame = requestAnimationFrame(() => { this.frame = undefined; this.paintWater(); });
  }

  private paintWater(): void {
    if (!this.board?.isConnected) return;
    const rect = this.board.getBoundingClientRect();
    const source = this.board.querySelector<HTMLElement>('.firetruck-source')!.getBoundingClientRect();
    const x = this.point.x - rect.left, y = this.point.y - rect.top;
    const startX = source.left + source.width / 2 - rect.left, startY = source.top + source.height / 2 - rect.top;
    const svg = this.board.querySelector<SVGElement>('.firetruck-water')!;
    svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
    for (const path of svg.querySelectorAll('.firetruck-water-path')) path.setAttribute('d', `M${startX},${startY} Q${(startX + x) / 2},${Math.min(startY, y) - 35} ${x},${y}`);
    svg.querySelector('.firetruck-impact')!.setAttribute('transform', `translate(${x},${y})`);
  }

  private stopWater(): void {
    const pointer = this.pointer; this.pointer = undefined; this.hover = undefined;
    window.clearTimeout(this.dwell); window.clearTimeout(this.waterTimer);
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.frame = undefined; this.board?.classList.remove('spraying');
    if (pointer !== undefined && this.board?.hasPointerCapture(pointer)) this.board.releasePointerCapture(pointer);
  }

  private hit(button: HTMLButtonElement, tap = false, keyboard = false): void {
    const result = sprayFiretruckItem(this.question, button.dataset.fireItem!);
    if (result === 'ignored') return;
    if (tap) {
      const rect = button.getBoundingClientRect(); this.aim(rect.left + rect.width / 2, rect.top + rect.height / 2);
      window.clearTimeout(this.waterTimer); this.waterTimer = window.setTimeout(() => this.stopWater(), 650);
    }
    if (result === 'miss') { this.update(`Look for ${this.question.goal.label}.`); this.narrator.speak(fireRetry(this.question.goal)); return; }
    if (result === 'complete') {
      recordResult(this.profile, { skill: fireSkill(this.question.goal) }, this.question.mistakes.size, this.question.hinted);
      this.save(); this.narrator.chime(); this.narrator.speak(fireComplete(this.question.goal));
      this.update('You found them all!'); window.clearTimeout(this.dwell);
    } else {
      this.update('A little splash. Keep looking!');
      this.narrator.speak(this.question.found.size === 1 ? FIRETRUCK_SPEECH.foundOne : FIRETRUCK_SPEECH.foundTwo);
    }
    if (keyboard) {
      const next = this.question.complete ? this.root?.querySelector<HTMLButtonElement>('[data-fire-action="next"]') : this.root?.querySelector<HTMLButtonElement>('[data-fire-item]:not(:disabled)');
      next?.focus({ preventScroll: true });
    }
  }

  private update(message: string): void {
    if (!this.root) return;
    const q = this.question;
    for (const button of this.root.querySelectorAll<HTMLButtonElement>('[data-fire-item]')) {
      const item = q.items.find(item => item.id === button.dataset.fireItem)!;
      const found = q.found.has(item.id);
      button.classList.toggle('found', found); button.classList.toggle('hinted', q.hinted && !found && fireMatches(item, q.goal));
      button.setAttribute('aria-pressed', String(found)); button.disabled = found;
    }
    const total = q.items.filter(item => fireMatches(item, q.goal)).length;
    this.root.querySelector('.firetruck-count')!.textContent = `${q.found.size} of ${total} found`;
    const status = this.root.querySelector<HTMLElement>('.firetruck-status')!;
    const version = ++this.feedbackVersion;
    void fadeLocal(status, () => { if (version === this.feedbackVersion) status.textContent = message; });
    if (q.complete) {
      this.root.querySelector<HTMLButtonElement>('[data-fire-action="hint"]')!.disabled = true;
      const next = this.root.querySelector<HTMLButtonElement>('[data-fire-action="next"]')!;
      next.hidden = false; next.animate([{ opacity: 0 }, { opacity: 1 }], { duration: LOCAL_FADE_MS });
    }
  }

  private async advance(replay = false): Promise<void> {
    if (this.busy || (!replay && !this.question.complete)) return;
    this.busy = true; this.pause();
    if (replay) { this.index = 0; this.finished = false; this.goals = makeFiretruckRound(this.profile.settings.roundLength); }
    else this.index++;
    if (this.index >= this.goals.length) this.finished = true;
    else this.question = makeFiretruckQuestion(this.goals[this.index], this.profile.settings.stage);
    await this.redraw(this.finished ? 'menu' : 'question'); this.busy = false;
    this.speakPrompt();
    this.root?.querySelector<HTMLElement>('#firetruck-heading')?.focus({ preventScroll: true });
  }
}
