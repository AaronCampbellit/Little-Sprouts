import './style.css';
import { Narrator } from './audio.ts';
import { FiretruckGame } from './firetruck-game.ts';
import { ACTIVITIES, CHARACTERS, activityById } from './content.ts';
import { makeQuestion, makeRound, recordResult } from './learning.ts';
import { openParents } from './parents.ts';
import { SaveStore } from './storage.ts';
import { SPEECH, characterGreeting, correctSpeech, countingSpeech, hintSpeech } from './speech-text.ts';
import { GentleStage, TRANSITION_MS, fadeLocal } from './transitions.ts';
import type { TransitionKind } from './transitions.ts';
import { icon, itemPicture } from './ui.ts';
import { explore, finished, header, home, practice } from './views.ts';
import type { Companion } from './scene.ts';
import type { ActivityId, LearningItem, Question } from './types.ts';

const root = document.querySelector<HTMLDivElement>('#app')!;
const store = new SaveStore();
const narrator = new Narrator();
let screen: 'home' | 'practice' | 'explore' | 'finished' | 'firetruck' = 'home';
let firetruckGame: FiretruckGame | undefined;
let activityId: ActivityId = 'numbers';
let targets: LearningItem[] = [];
let question: Question | undefined;
let questionIndex = 0;
let selectedItem: LearningItem | undefined;
let counted = new Set<number>();
let wrong = new Set<string>();
let hint = false;
let feedback: 'none' | 'correct' | 'incorrect' = 'none';
let companion: Companion | undefined;
let renderVersion = 0;
let sceneFailed = false;
let visualBusy = false;
let feedbackVersion = 0;

narrator.enabled = store.profile.settings.sound;
document.documentElement.dataset.theme = store.profile.theme;
root.innerHTML = header(store.profile) + '<div class="scene-host" id="scene-host"></div><div class="rotate-tip">A little more room to explore: turn your phone sideways.</div>';
const stage = new GentleStage(document.querySelector<HTMLElement>('#scene-host')!);

function syncHeader(): void {
  const profile = store.profile;
  narrator.enabled = profile.settings.sound;
  const name = document.querySelector<HTMLElement>('.profile-button>span:last-child')!;
  if (name.textContent !== profile.name) void fadeLocal(name, () => { name.textContent = profile.name; });
  document.querySelector('.profile-button')!.setAttribute('aria-label', `Choose explorer: ${profile.name}`);
  const avatar = document.querySelector<HTMLElement>('.profile-avatar')!;
  const spriteX = profile.character === 'milo' ? '0%' : '100%';
  if (avatar.style.getPropertyValue('--sprite-x') !== spriteX) {
    const out = avatar.animate([{ opacity: 1 }, { opacity: 0 }], { duration: TRANSITION_MS.picker / 2, fill: 'forwards' });
    void out.finished.then(async () => {
      avatar.style.setProperty('--sprite-x', spriteX);
      avatar.style.setProperty('--portrait-x', profile.character === 'milo' ? '24%' : '83%');
      avatar.style.setProperty('--portrait-y', profile.character === 'milo' ? '8%' : '14%');
      avatar.setAttribute('aria-label', `${CHARACTERS[profile.character].name}, ${CHARACTERS[profile.character].description}`);
      const incoming = avatar.animate([{ opacity: 0 }, { opacity: 1 }], { duration: TRANSITION_MS.picker / 2, fill: 'forwards' });
      out.cancel(); await incoming.finished; incoming.cancel();
    });
  }
  const sound = document.querySelector<HTMLButtonElement>('.sound-button')!;
  sound.setAttribute('aria-label', profile.settings.sound ? 'Mute sound' : 'Turn sound on');
  sound.setAttribute('aria-pressed', String(profile.settings.sound));
  void fadeLocal(sound, () => { sound.innerHTML = icon(profile.settings.sound ? 'speaker' : 'muted'); });
}

async function renderScene(kind: TransitionKind = 'menu'): Promise<void> {
  firetruckGame?.unmount();
  const version = ++renderVersion;
  const previous = companion; companion = undefined;
  const profile = store.profile;
  document.documentElement.dataset.theme = profile.theme;
  const markup = screen === 'home' ? home(profile)
    : screen === 'firetruck' ? firetruckGame!.markup()
    : screen === 'explore' ? explore(profile, activityId, selectedItem)
    : screen === 'finished' ? finished(profile, activityId)
    : practice({ profile, question: question!, index: questionIndex, length: targets.length, counted, feedback, hint, wrong });
  await stage.show(markup, kind);
  // Keep the outgoing canvas alive until its content has faded away.
  previous?.destroy();
  if (version !== renderVersion) return;
  if (screen === 'firetruck') firetruckGame?.mount();
  // Keep the generated friend illustration on compact screens; the optional
  // WebGL companion is reserved for desktop where its rendering is reliable.
  if (screen === 'practice' && !sceneFailed && window.matchMedia('(min-width: 851px)').matches) {
    const parent = document.querySelector<HTMLElement>('#companion')!;
    void import('./scene.ts').then(({ Companion: Friend }) => {
      if (version !== renderVersion || !parent.isConnected) return;
      try { companion = new Friend(parent, profile.character); }
      catch { sceneFailed = true; parent.dataset.ready = 'false'; }
    }).catch(() => { sceneFailed = true; });
  }
}

async function startRound(): Promise<void> {
  narrator.stop(); targets = makeRound(activityId, store.profile.settings); questionIndex = 0; screen = 'practice';
  await nextQuestion('menu');
}

async function nextQuestion(kind: TransitionKind = 'question'): Promise<void> {
  question = makeQuestion(activityId, targets[questionIndex], store.profile.settings, store.profile.theme);
  counted = new Set(); wrong = new Set(); hint = false; feedback = 'none';
  await renderScene(kind); narrator.speak(question.prompt);
  document.querySelector<HTMLElement>('#question-heading')?.setAttribute('tabindex', '-1');
  document.querySelector<HTMLElement>('#question-heading')?.focus({ preventScroll: true });
}

async function goHome(): Promise<void> { narrator.stop(); firetruckGame?.unmount(); firetruckGame = undefined; screen = 'home'; question = undefined; await renderScene(); }

function updatePractice(): void {
  if (!question) return;
  const q = question;
  document.querySelectorAll<HTMLButtonElement>('.answer-button').forEach((button) => {
    const id = button.dataset.answer!;
    button.classList.toggle('correct', feedback === 'correct' && id === q.target.id);
    button.classList.toggle('hinted', hint && id === q.target.id);
    button.classList.toggle('tried', wrong.has(id));
    button.disabled = feedback === 'correct' || wrong.has(id);
  });
  if (hint && q.activity === 'objects') {
    const sample = document.querySelector<HTMLElement>('.listening-prompt');
    if (sample && !sample.dataset.revealed) {
      sample.dataset.revealed = 'true';
      void fadeLocal(sample, () => { sample.innerHTML = itemPicture('objects', q.target); sample.style.width = '140px'; sample.style.margin = 'auto'; });
    }
  }
  const element = document.querySelector<HTMLElement>('.feedback')!;
  const version = ++feedbackVersion;
  const feedbackState = feedback;
  void fadeLocal(element, () => {
    if (version !== feedbackVersion) return;
    element.className = `feedback ${feedbackState}`;
    element.innerHTML = feedbackState === 'correct' ? `${icon('check')}<strong>You found it!</strong>` : feedbackState === 'incorrect' ? '<strong>Let’s have another look.</strong>' : '<span>Follow the gentle glow.</span>';
  });
  if (feedback === 'correct' && !document.querySelector('[data-action="next"]')) {
    const button = document.createElement('button'); button.className = 'primary-button next-button'; button.dataset.action = 'next';
    button.innerHTML = `${questionIndex + 1 === targets.length ? 'All done' : 'Next discovery'}${icon('next')}`;
    document.querySelector('.play-footer')!.append(button);
    companion?.celebrate(); button.focus({ preventScroll: true });
  }
}

function answer(id: string): void {
  if (screen !== 'practice' || !question || feedback === 'correct' || wrong.has(id) || !question.choices.some((c) => c.id === id)) return;
  if (id === question.target.id) {
    feedback = 'correct'; recordResult(store.profile, question, wrong.size, hint); store.save(); narrator.chime();
    narrator.speak(correctSpeech(question, store.profile.theme)); updatePractice();
  } else {
    wrong.add(id); feedback = 'incorrect'; if (wrong.size >= question.choices.length - 1) hint = true;
    narrator.speak(SPEECH.retry); updatePractice();
    document.querySelector<HTMLButtonElement>('.answer-button:not(:disabled)')?.focus({ preventScroll: true });
  }
}

async function changeCharacter(character: 'milo' | 'pip'): Promise<void> {
  if (store.profile.character === character) return;
  visualBusy = true; store.profile.character = character; store.save();
  document.querySelectorAll<HTMLButtonElement>('.character-option').forEach((button) => {
    const selected = button.dataset.character === character;
    button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected));
    const existing = button.querySelector('.selected-check');
    if (existing && !selected) { const animation = existing.animate([{ opacity: 1 }, { opacity: 0 }], { duration: TRANSITION_MS.picker }); void animation.finished.then(() => existing.remove()); }
    if (!existing && selected) button.querySelector('.character-portrait')!.insertAdjacentHTML('beforeend', `<span class="selected-check">${icon('check')}</span>`);
  });
  const avatar = document.querySelector<HTMLElement>('.profile-avatar')!;
  const fadeOut = avatar.animate([{ opacity: 1 }, { opacity: 0 }], { duration: TRANSITION_MS.picker / 2, fill: 'forwards' });
  await fadeOut.finished;
  avatar.style.setProperty('--sprite-x', character === 'milo' ? '0%' : '100%');
  avatar.style.setProperty('--portrait-x', character === 'milo' ? '24%' : '83%');
  avatar.style.setProperty('--portrait-y', character === 'milo' ? '8%' : '14%');
  avatar.setAttribute('aria-label', `${CHARACTERS[character].name}, ${CHARACTERS[character].description}`);
  const fadeIn = avatar.animate([{ opacity: 0 }, { opacity: 1 }], { duration: TRANSITION_MS.picker / 2, fill: 'forwards' });
  fadeOut.cancel(); await fadeIn.finished; fadeIn.cancel();
  visualBusy = false; narrator.speak(characterGreeting(character));
}

root.addEventListener('click', async (event) => {
  const button = (event.target as Element).closest<HTMLButtonElement>('button[data-action]');
  if (!button || button.disabled || stage.busy && button.dataset.action !== 'sound' || visualBusy && button.dataset.action === 'character') return;
  narrator.unlock();
  switch (button.dataset.action) {
    case 'home': if (screen !== 'home') await goHome(); break;
    case 'parents': narrator.stop(); firetruckGame?.pause(); openParents(store, narrator, () => { syncHeader(); void goHome(); }); break;
    case 'firetruck':
      narrator.stop(); firetruckGame?.unmount(); screen = 'firetruck';
      firetruckGame = new FiretruckGame(store.profile, narrator, () => store.save(), renderScene);
      await renderScene(); firetruckGame?.speakPrompt(); break;
    case 'sound':
      store.profile.settings.sound = !store.profile.settings.sound; store.save(); narrator.enabled = store.profile.settings.sound;
      if (narrator.enabled) { narrator.unlock(); narrator.speak(SPEECH.soundOn); } else narrator.stop();
      syncHeader(); break;
    case 'character': if (button.dataset.character === 'milo' || button.dataset.character === 'pip') await changeCharacter(button.dataset.character); break;
    case 'theme':
      if ((button.dataset.theme !== 'woodland' && button.dataset.theme !== 'starlight') || store.profile.theme === button.dataset.theme) return;
      store.profile.theme = button.dataset.theme; store.save();
      document.documentElement.dataset.theme = store.profile.theme;
      document.querySelectorAll<HTMLButtonElement>('.theme-button').forEach((item) => { const selected = item.dataset.theme === store.profile.theme; item.classList.toggle('selected', selected); item.setAttribute('aria-pressed', String(selected)); });
      break;
    case 'activity':
      if (!ACTIVITIES.some((a) => a.id === button.dataset.activity)) return;
      activityId = button.dataset.activity as ActivityId; await startRound(); break;
    case 'practice': await startRound(); break;
    case 'explore': screen = 'explore'; selectedItem = undefined; narrator.stop(); await renderScene(); narrator.speak(SPEECH.explore); break;
    case 'discover': {
      const item = activityById(activityId).items.find((i) => i.id === button.dataset.item);
      if (!item) return;
      selectedItem = item;
      document.querySelectorAll<HTMLButtonElement>('.explore-item').forEach((choice) => { const selected = choice.dataset.item === item.id; choice.classList.toggle('selected', selected); choice.setAttribute('aria-pressed', String(selected)); });
      const caption = document.querySelector<HTMLElement>('.discovery-caption')!;
      void fadeLocal(caption, () => {
        caption.querySelector('strong')!.textContent = activityId === 'letters' ? item.label === 'X' ? 'X — fox' : `${item.label} is for ${item.word}` : item.label;
        caption.querySelector('span')!.textContent = activityId === 'letters' && item.label === 'X' ? 'Listen for X at the end of fox.' : 'Look around. Can you find one near you?';
      }); narrator.speak(item.speech); break;
    }
    case 'repeat': narrator.speak(screen === 'explore' ? selectedItem?.speech ?? SPEECH.explore : question?.prompt ?? SPEECH.ready); break;
    case 'hint':
      if (screen !== 'practice' || !question || feedback === 'correct') return;
      hint = true; updatePractice(); narrator.speak(hintSpeech(question)); break;
    case 'count': {
      const index = Number(button.dataset.index);
      if (screen !== 'practice' || question?.activity !== 'numbers' || !Number.isInteger(index) || index < 0 || index >= question.target.value! || counted.has(index) || feedback === 'correct') return;
      counted.add(index);
      const target = document.createElement('span'); target.className = 'count-order'; target.textContent = String(counted.size); button.append(target);
      button.classList.add('counted'); button.setAttribute('aria-pressed', 'true');
      narrator.speak(countingSpeech(counted.size, question.target.value!)); break;
    }
    case 'answer': answer(button.dataset.answer!); break;
    case 'next':
      if (screen !== 'practice' || feedback !== 'correct') return;
      narrator.stop(); questionIndex++;
      if (questionIndex >= targets.length) { screen = 'finished'; await renderScene(); narrator.chime(); narrator.speak(SPEECH.finished); }
      else await nextQuestion(); break;
  }
});

document.addEventListener('visibilitychange', () => { if (document.hidden) narrator.stop(); });
void renderScene();
