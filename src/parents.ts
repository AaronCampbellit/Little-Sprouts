import { ACTIVITIES } from './content.ts';
import { Narrator } from './audio.ts';
import { SaveStore, newProfile } from './storage.ts';
import { escapeHtml, icon } from './ui.ts';
import { LOCAL_FADE_MS, fadeLocal } from './transitions.ts';
import { SPEECH } from './speech-text.ts';

export function openParents(store: SaveStore, narrator: Narrator, onClose: () => void): void {
  const dialog = document.createElement('dialog');
  dialog.className = 'parent-dialog';
  dialog.setAttribute('aria-labelledby', 'parents-title');
  document.body.append(dialog);
  let notice = '';
  let resetPending = false;
  let closing = false;
  const closeGently = () => {
    if (closing) return;
    closing = true;
    dialog.classList.add('closing');
    const animation = dialog.animate([{ opacity: 1 }, { opacity: 0 }], { duration: LOCAL_FADE_MS, fill: 'forwards' });
    void animation.finished.then(() => dialog.close());
  };
  const render = () => {
    const profile = store.profile;
    const settings = profile.settings;
    const markup = `<div class="dialog-heading"><div><h2 id="parents-title">A little space for grown-ups.</h2><p>Make the adventure their own.</p></div><button class="round-button" data-parent-action="close" aria-label="Close grown-up settings">${icon('close')}</button></div>
      <section class="parent-section"><h3>Your explorers</h3><div class="profile-row"><label>Playing as<select name="profile">${store.data.profiles.map((p) => `<option value="${p.id}" ${p.id === profile.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}</select></label><button class="secondary-button" data-parent-action="add" ${store.data.profiles.length >= 8 ? 'disabled' : ''}>Add explorer</button></div><form id="nickname-form" class="profile-row"><label>Nickname<input name="nickname" maxlength="24" value="${escapeHtml(profile.name)}" autocomplete="off" required></label><button class="secondary-button" type="submit">Save nickname</button></form><p class="field-note">Up to eight explorers. Nicknames and progress stay in this browser.</p></section>
      <section class="parent-section"><h3>A comfortable learning pace</h3><div class="settings-grid">
        <label>Starting stage<select name="stage"><option value="little" ${settings.stage === 'little' ? 'selected' : ''}>Little steps · around 2–3 years</option><option value="growing" ${settings.stage === 'growing' ? 'selected' : ''}>Growing discoveries · around 3–4 years</option></select></label>
        <label>Count with objects<select name="maxNumber"><option value="5" ${settings.maxNumber === 5 ? 'selected' : ''}>Numbers 1–5</option><option value="10" ${settings.maxNumber === 10 ? 'selected' : ''}>Numbers 1–10</option></select></label>
        <label>Letter shapes<select name="letterCase"><option value="upper" ${settings.letterCase === 'upper' ? 'selected' : ''}>Uppercase · A B C</option><option value="lower" ${settings.letterCase === 'lower' ? 'selected' : ''}>Lowercase · a b c</option><option value="mixed" ${settings.letterCase === 'mixed' ? 'selected' : ''}>Together · Aa Bb Cc</option></select></label>
        <label>Discoveries in a round<select name="roundLength"><option value="5" ${settings.roundLength === 5 ? 'selected' : ''}>5 · a little adventure</option><option value="10" ${settings.roundLength === 10 ? 'selected' : ''}>10 · a longer adventure</option></select></label>
      </div><p class="field-note">Little steps offers two choices and fewer colors and shapes. Growing discoveries offers three choices. Explore always includes 1–10 and the full alphabet. Choose by comfort and interest; these ages are starting suggestions.</p>
      <div class="sound-setting"><label class="checkbox-label"><input type="checkbox" name="sound" ${settings.sound ? 'checked' : ''}> Spoken prompts & gentle sounds</label><button class="text-button" data-parent-action="test-sound">Test sound</button></div><p class="field-note">Heart is the narrator. These AI-generated recordings play from the game, so no installed system voice is needed. If a recording cannot play, an available English device voice is used as a fallback. Use Test sound to hear Heart.</p></section>
      <section class="parent-section"><h3>Little discoveries so far</h3><p class="field-note">Practice observations, rather than grades or a developmental assessment. A first try means no wrong answer or explicit hint on that question.</p><div class="progress-table-wrap"><table class="progress-table"><thead><tr><th>Activity</th><th>Completed</th><th>First try</th><th>With a hint</th></tr></thead><tbody>${[...ACTIVITIES, { id: 'firetruck', title: 'Fire Truck' }].map((a) => {
        const entries = Object.entries(profile.progress).filter(([key]) => key.startsWith(`${a.id}:`)).map(([, value]) => value);
        const sum = (key: 'completed' | 'firstTry' | 'hints') => entries.reduce((n, v) => n + v[key], 0);
        return `<tr><th>${a.title}</th><td>${sum('completed')}</td><td>${sum('firstTry')}</td><td>${sum('hints')}</td></tr>`;
      }).join('')}</tbody></table></div></section>
      <section class="parent-section"><details><summary>Learning stages & sources</summary><div class="learning-notes"><p><strong>Around 2–3:</strong> explore familiar objects, match pictures, notice color and shape, and count together. Introduce letters through songs, names, and playful discovery.</p><p><strong>Around 3–4:</strong> practice the counting sequence toward 10, touch objects one at a time, match shapes and colors, and explore familiar letters. Knowing the whole alphabet or independently counting ten objects is not a requirement at age three.</p><p>The activity stages are our adaptation of <a href="https://www.gov.uk/government/publications/development-matters--2/development-matters" target="_blank" rel="noopener noreferrer">Development Matters</a> and the <a href="https://www.govinfo.gov/content/pkg/GOVPUB-HE23_1100-PURL-gpo65456/pdf/GOVPUB-HE23_1100-PURL-gpo65456.pdf" target="_blank" rel="noopener noreferrer">Head Start Early Learning Outcomes Framework</a>. Children develop at different paces. Share books, songs, conversation, and real-world play alongside these games.</p><p>Try it away from the screen: count snack pieces; find a circle in the room; name an object’s color; look for a familiar letter in a book.</p></div></details></section>
      <section class="parent-section"><h3>Keep their discoveries</h3><p class="field-note">Saves belong to this browser and can be lost if its data is cleared. Download a backup to keep a copy or move profiles to another device.</p><div class="backup-actions"><button class="secondary-button" data-parent-action="export">${icon('download')}Download backup</button><button class="secondary-button" data-parent-action="import">${icon('upload')}Restore backup</button><input type="file" id="backup-file" accept="application/json,.json" hidden></div><p class="field-note">Restoring replaces all local explorer profiles with the selected backup.</p><button class="text-button reset-button" data-parent-action="reset">${resetPending ? 'Yes, reset this explorer’s progress' : 'Reset this explorer’s progress'}</button></section>
      <div class="parent-notice" role="status">${escapeHtml(notice || (!store.persistent ? 'Browser storage is unavailable. Keep a downloaded backup before leaving.' : 'Settings save as you change them.'))}</div><div class="dialog-footer"><button class="primary-button" data-parent-action="close">Back to the adventure ${icon('next')}</button></div>`;
    const commit = () => {
    dialog.innerHTML = markup;
    dialog.querySelector('#nickname-form')!.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = dialog.querySelector<HTMLInputElement>('input[name="nickname"]')!;
      profile.name = input.value.trim().slice(0, 24) || 'Little Explorer';
      store.save(); notice = 'Nickname saved.'; render();
    });
    dialog.querySelector<HTMLInputElement>('#backup-file')!.addEventListener('change', async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (file.size > 1_048_576) { notice = 'Please choose a backup smaller than 1 MB.'; render(); return; }
      try { store.import(JSON.parse(await file.text())); narrator.enabled = store.profile.settings.sound; notice = 'Backup restored. Your explorers are ready.'; }
      catch (error) { notice = error instanceof Error ? error.message : 'That backup could not be read.'; }
      render();
    });
    };
    if (dialog.innerHTML) {
      dialog.inert = true;
      void fadeLocal(dialog, commit).finally(() => { dialog.inert = false; });
    } else commit();
  };
  dialog.addEventListener('change', (event) => {
    const input = event.target as HTMLInputElement | HTMLSelectElement;
    const settings = store.profile.settings;
    switch (input.name) {
      case 'profile': store.data.activeProfileId = input.value; resetPending = false; break;
      case 'stage': settings.stage = input.value === 'little' ? 'little' : 'growing'; settings.maxNumber = settings.stage === 'little' ? 5 : 10; break;
      case 'maxNumber': settings.maxNumber = input.value === '5' ? 5 : 10; break;
      case 'letterCase': settings.letterCase = input.value === 'lower' || input.value === 'mixed' ? input.value : 'upper'; break;
      case 'roundLength': settings.roundLength = input.value === '10' ? 10 : 5; break;
      case 'sound': settings.sound = (input as HTMLInputElement).checked; break;
      default: return;
    }
    narrator.enabled = store.profile.settings.sound;
    if (!narrator.enabled) narrator.stop();
    store.save(); notice = 'Saved. Ready for the next adventure.'; render();
  });
  dialog.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-parent-action]');
    if (!button) return;
    switch (button.dataset.parentAction) {
      case 'close': closeGently(); break;
      case 'add':
        if (store.data.profiles.length >= 8) return;
        const profile = newProfile(`Explorer ${store.data.profiles.length + 1}`);
        store.data.profiles.push(profile); store.data.activeProfileId = profile.id; store.save();
        resetPending = false; notice = 'A new explorer is ready. Choose their nickname below.'; render(); break;
      case 'test-sound': narrator.unlock(); narrator.speak(SPEECH.test); break;
      case 'export': {
        const url = URL.createObjectURL(new Blob([JSON.stringify(store.data, null, 2)], { type: 'application/json' }));
        const link = document.createElement('a'); link.href = url; link.download = `little-sprouts-backup-${new Date().toISOString().slice(0,10)}.json`; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000); notice = 'Backup downloaded. Keep it somewhere safe.'; render(); break;
      }
      case 'import': dialog.querySelector<HTMLInputElement>('#backup-file')!.click(); break;
      case 'reset':
        if (!resetPending) { resetPending = true; notice = 'Choose reset again to clear only this explorer’s practice progress.'; }
        else { store.profile.progress = {}; store.save(); resetPending = false; notice = 'This explorer has a fresh start.'; }
        render(); break;
    }
  });
  dialog.addEventListener('close', () => { dialog.remove(); onClose(); }, { once: true });
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); closeGently(); });
  dialog.addEventListener('click', (event) => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeGently(); } });
  render(); dialog.showModal();
}
