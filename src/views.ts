import { ACTIVITIES, CHARACTERS, THEMES, activityById } from './content.ts';
import { activityArtwork, escapeHtml, icon, itemPicture, mascot, objectPicture, shapePicture } from './ui.ts';
import type { ActivityId, LearningItem, Profile, Question } from './types.ts';

export function header(profile: Profile): string {
  return `<header class="app-header">
    <button class="brand" data-action="home" aria-label="Little Sprouts home">${icon('leaf')}<span>little sprouts</span></button>
    <div class="header-controls">
      <button class="profile-button" data-action="parents" aria-label="Choose explorer: ${escapeHtml(profile.name)}">${mascot(profile.character, 0, 'profile-avatar')}<span>${escapeHtml(profile.name)}</span></button>
      <button class="round-button sound-button" data-action="sound" aria-label="${profile.settings.sound ? 'Mute sound' : 'Turn sound on'}" aria-pressed="${profile.settings.sound}">${icon(profile.settings.sound ? 'speaker' : 'muted')}</button>
      <button class="parent-button" data-action="parents" aria-label="Grown-ups">${icon('gear')}<span>Grown-ups</span></button>
    </div>
  </header>`;
}

export function home(profile: Profile): string {
  return `<main class="home-screen">
    <section class="welcome" aria-labelledby="welcome-heading">
      <div class="welcome-landscape" aria-hidden="true"><div class="landscape-layer landscape-woodland"></div><div class="landscape-layer landscape-starlight"></div></div>
      <div class="hero-friends" aria-hidden="true">${mascot('milo', 1, 'hero-milo')}${mascot('pip', 1, 'hero-pip')}</div>
      <div class="welcome-copy"><h1 id="welcome-heading">Little adventures.<br>Big discoveries.</h1><p>Pick a game and let's explore.</p>
        <div class="adventure-options">
          <div class="character-options" role="group" aria-label="Choose a friend">${Object.entries(CHARACTERS).map(([id, c]) => `<button class="character-option ${profile.character === id ? 'selected' : ''}" data-action="character" data-character="${id}" aria-pressed="${profile.character === id}" aria-label="Choose ${c.name}"><span class="character-portrait">${mascot(id as Profile['character'], 1)}${profile.character === id ? `<span class="selected-check">${icon('check')}</span>` : ''}</span><span>${c.name}</span></button>`).join('')}</div>
          <div class="theme-options" role="group" aria-label="Choose a world">${Object.entries(THEMES).map(([id, t]) => `<button class="theme-button ${profile.theme === id ? 'selected' : ''}" data-action="theme" data-theme="${id}" aria-pressed="${profile.theme === id}">${icon(id === 'woodland' ? 'trees' : 'moon')}<span>${t.name}</span></button>`).join('')}</div>
        </div>
      </div>
    </section>
    <section class="activity-selection" aria-labelledby="activity-heading"><h2 id="activity-heading">What shall we play?</h2>
      <div class="activity-list">${ACTIVITIES.map((a) => `<button class="activity-tile accent-${a.accent}" data-action="activity" data-activity="${a.id}" aria-label="Play ${a.title}: ${a.subtitle}"><span class="activity-art">${activityArtwork(a.id)}</span><span class="tile-caption"><strong>${a.title}</strong><span>${a.subtitle}</span></span></button>`).join('')}</div>
    </section>
    <footer class="app-footer">${icon('leaf')}<span>A little discovery, every day.</span>${icon('leaf')}</footer>
  </main>`;
}

export function activityNav(id: ActivityId, mode: 'practice' | 'explore'): string {
  const a = activityById(id);
  return `<nav class="activity-nav" aria-label="Activity controls">
    <button class="back-button" data-action="home">${icon('back')}<span>All games</span></button>
    <h1>${a.title}</h1>
    <div class="mode-switch" role="group" aria-label="Play mode"><button data-action="practice" aria-pressed="${mode === 'practice'}" class="${mode === 'practice' ? 'selected' : ''}">Play a round</button><button data-action="explore" aria-pressed="${mode === 'explore'}" class="${mode === 'explore' ? 'selected' : ''}">Explore</button></div>
  </nav>`;
}

export function explore(profile: Profile, id: ActivityId, selected?: LearningItem): string {
  const activity = activityById(id);
  return `<main class="activity-screen">${activityNav(id, 'explore')}
    <section class="explore-intro"><div><h2>Every little thing is a discovery.</h2><p>Choose one to look, listen, and learn.</p></div><button class="listen-button" data-action="repeat" aria-label="Listen">${icon('speaker')}<span>Listen</span></button></section>
    <div class="explore-grid explore-${id}" role="group" aria-label="Explore ${activity.title}">${activity.items.map((item) => `<button class="explore-item ${selected?.id === item.id ? 'selected' : ''}" data-action="discover" data-item="${item.id}" aria-label="Explore ${item.label}" aria-pressed="${selected?.id === item.id}">${itemPicture(id, item, profile.settings.letterCase)}${id !== 'numbers' && id !== 'letters' ? `<span>${item.label}</span>` : ''}</button>`).join('')}</div>
    <div class="discovery-caption" aria-live="polite">${selected ? `<strong>${id === 'letters' ? selected.label === 'X' ? 'X — fox' : `${selected.label} is for ${selected.word}` : selected.label}</strong><span>${id === 'letters' && selected.label === 'X' ? 'Listen for X at the end of fox.' : 'Look around. Can you find one near you?'}</span>` : `<strong>So much to explore.</strong><span>Take your time. Every item is ready to discover.</span>`}</div>
  </main>`;
}

export interface PracticeView {
  profile: Profile;
  question: Question;
  index: number;
  length: number;
  counted: Set<number>;
  feedback: 'none' | 'correct' | 'incorrect';
  hint: boolean;
  wrong: Set<string>;
}

export function practice(view: PracticeView): string {
  const { profile, question: q, index, length, counted, feedback, hint, wrong } = view;
  const { character, theme, settings } = profile;
  const countTarget = q.target.value ?? 0;
  const singular = theme === 'woodland' ? 'apple' : 'star';
  const sample = q.activity === 'numbers'
    ? `<div class="counting-objects" role="group" aria-label="Objects to count">${Array.from({ length: countTarget }, (_, i) => `<button class="count-object ${counted.has(i) ? 'counted' : ''}" data-action="count" data-index="${i}" aria-label="Count ${singular} ${i + 1}" aria-pressed="${counted.has(i)}">${theme === 'woodland' ? objectPicture(0) : shapePicture('star')}${counted.has(i) ? `<span class="count-order">${[...counted].indexOf(i) + 1}</span>` : ''}</button>`).join('')}</div>`
    : q.activity === 'objects' && !hint
      ? `<div class="listening-prompt">${icon('speaker')}<span>Listen to ${CHARACTERS[character].name}.</span></div>`
      : `<div class="question-sample sample-${q.activity}" aria-label="${q.target.label}">${itemPicture(q.activity, q.target, settings.letterCase)}</div>`;
  return `<main class="activity-screen">${activityNav(q.activity, 'practice')}
    <div class="round-progress" aria-label="Question ${index + 1} of ${length}"><div class="progress-dots">${Array.from({ length }, (_, i) => `<span class="progress-dot ${i < index ? 'complete' : i === index ? 'current' : ''}">${i < index ? icon('check') : ''}</span>`).join('')}</div><span>${index + 1} of ${length}</span></div>
    <section class="playground" aria-labelledby="question-heading">
      <div class="question-zone"><h2 id="question-heading">${q.prompt}</h2><p class="question-instruction">${q.instruction}</p>${sample}
        <div class="answer-choices answers-${q.activity}" role="group" aria-label="Choose an answer">${q.choices.map((item) => `<button class="answer-button ${feedback === 'correct' && item.id === q.target.id ? 'correct' : ''} ${hint && item.id === q.target.id ? 'hinted' : ''} ${wrong.has(item.id) ? 'tried' : ''}" data-action="answer" data-answer="${item.id}" aria-label="${q.activity === 'letters' ? `Letter ${item.label}` : item.label}" ${feedback === 'correct' || wrong.has(item.id) ? 'disabled' : ''}>${itemPicture(q.activity, item, settings.letterCase)}</button>`).join('')}</div>
      </div>
      <aside class="friend-zone" aria-label="Your learning friend"><div class="friend-scenery" aria-hidden="true"><div class="landscape-layer landscape-woodland"></div><div class="landscape-layer landscape-starlight"></div></div><div class="companion-mount" id="companion" aria-hidden="true">${mascot(character, feedback === 'correct' ? 1 : 0, 'companion-fallback')}</div><span class="friend-name">${CHARACTERS[character].name} is here to help.</span></aside>
    </section>
    <div class="play-footer"><div class="support-controls"><button class="listen-button" data-action="repeat">${icon('speaker')}<span>Hear it again</span></button><button class="hint-button" data-action="hint">${icon('help')}<span>A little help</span></button></div>
      <div class="feedback ${feedback}" role="status">${feedback === 'correct' ? `${icon('check')}<strong>You found it!</strong>` : feedback === 'incorrect' ? '<strong>Let’s have another look.</strong>' : hint ? '<span>Follow the gentle glow.</span>' : '<span>Take your time. You’ve got this.</span>'}</div>
      ${feedback === 'correct' ? `<button class="primary-button next-button" data-action="next">${index + 1 === length ? 'All done' : 'Next discovery'}${icon('next')}</button>` : ''}
    </div>
  </main>`;
}

export function finished(profile: Profile, id: ActivityId): string {
  return `<main class="finish-screen"><div class="finish-friend">${mascot(profile.character, 1)}</div><h1>Look what you discovered!</h1><p>A little practice. A lovely adventure.</p><div class="finish-stars" aria-hidden="true">${shapePicture('star')}${shapePicture('star')}${shapePicture('star')}</div><div class="finish-actions"><button class="primary-button" data-action="practice">Play again ${icon('replay')}</button><button class="secondary-button" data-action="explore">Explore ${activityById(id).title}</button><button class="back-button" data-action="home">${icon('back')}All games</button></div></main>`;
}
