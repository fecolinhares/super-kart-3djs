/**
 * Super Kart 3D.js — title menu overlay.
 *
 * Pure DOM, appended to document.body, hidden by default.
 * Shows the game logo, Start Race button, How to Play (controls table),
 * a kart color picker and the credit footer. Animated cartoon entrance.
 */
import { CONFIG } from '../config.js';
import './ui.css';

/** [action, keyboard, touch] rows for the "How to Play" table. */
const CONTROL_ROWS = [
  ['Steer', '← → or A / D', '◀ ▶ buttons'],
  ['Accelerate', '↑ or W', 'Auto'],
  ['Brake / Reverse', '↓ or S', '—'],
  ['Drift', 'Shift (hold)', '🧲 DRIFT button'],
  ['Use item', 'Space', '🎁 button'],
  ['Throw item back', 'Hold Space, release', 'Hold 🎁, release'],
  ['Restart', 'R', '—'],
  ['Pause', 'P / Esc', '⏸ button'],
];

/** 0xff5a5f -> "#ff5a5f" */
function toHex(value) {
  return `#${value.toString(16).padStart(6, '0')}`;
}

export class Menu {
  /**
   * @param {object} opts
   * @param {() => void} [opts.onStart]   called when "Start Race" is pressed
   * @param {(color: number) => void} [opts.onColor] called when a swatch is picked
   * @param {(name: string) => void} [opts.onSound] played on UI interaction
   * @param {(muted: boolean) => void} [opts.onToggleMute] called when the sound toggle is pressed
   */
  constructor({ onStart, onColor, onSound, onToggleMute } = {}) {
    this.onStart = typeof onStart === 'function' ? onStart : () => {};
    this.onColor = typeof onColor === 'function' ? onColor : () => {};
    this.onSound = typeof onSound === 'function' ? onSound : () => {};
    this.onToggleMute = typeof onToggleMute === 'function' ? onToggleMute : () => {};
    this.muted = false;
    this.selectedColor = CONFIG.kart.playerColors[0];
    this.selectedChar = 0; // AUDIT r4: driver cards (restored in restoreSettings)
    // Difficulty/accessibility state (audit r3): restored from localStorage.
    this.cc = CONFIG.cc.default;
    this.autoAccel = CONFIG.assist.autoAccelerate;
    this.steerAssist = CONFIG.assist.steerAssist;

    this.root = document.createElement('div');
    this.root.className = 'sk3d-overlay sk3d-menu sk3d-hidden';
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-label', 'Main menu');
    this.root.innerHTML = this.buildHtml();

    this.startBtn = this.root.querySelector('.sk3d-start-btn');
    this.helpToggle = this.root.querySelector('.sk3d-help-toggle');
    this.helpPanel = this.root.querySelector('.sk3d-help-panel');
    this.swatches = Array.from(this.root.querySelectorAll('.sk3d-color-swatch'));
    this.charCards = Array.from(this.root.querySelectorAll('.sk3d-driver-card')); // AUDIT r4
    this.muteBtn = this.root.querySelector('.sk3d-mute-toggle');
    this.trackSwitch = this.root.querySelector('.sk3d-track-switch');
    this.ccBtns = Array.from(this.root.querySelectorAll('.sk3d-cc-btn'));
    this.assistToggles = Array.from(this.root.querySelectorAll('input[data-assist]'));

    this.bindEvents();
    document.body.appendChild(this.root);
    this.restoreSettings(); // persisted difficulty/assist choices (audit r3)
  }

  buildHtml() {
    const rows = CONTROL_ROWS
      .map(
        ([action, keyboard, touch]) =>
          `<tr><td>${action}</td><td>${keyboard}</td><td>${touch}</td></tr>`
      )
      .join('');

    const swatches = CONFIG.kart.playerColors
      .map(
        (color, i) =>
          `<button type="button" class="sk3d-color-swatch${
            i === 0 ? ' is-selected' : ''
          }" data-index="${i}" style="--sk3d-swatch:${toHex(
            color
          )}" aria-label="Select kart color ${i + 1}"></button>`
      )
      .join('');

    // AUDIT r4: driver cards — one per roster character, with the identity
    // color swatch and speed/accel/handling stat bars (1-10). Inline styles
    // only (ui.css is out of scope for this change).
    const statBar = (label, v) => `
      <span style="display:flex;align-items:center;gap:6px;font-size:0.62rem;letter-spacing:0.05em;color:rgba(255,255,255,0.75);line-height:1;">
        <span style="width:34px;text-align:right;flex:none;">${label}</span>
        <span style="flex:1;height:6px;border-radius:3px;background:rgba(255,255,255,0.18);overflow:hidden;display:inline-block;">
          <span style="display:block;height:100%;width:${Math.round((v / 10) * 100)}%;border-radius:3px;background:linear-gradient(90deg,var(--sk3d-yellow),#ff9f45);"></span>
        </span>
        <span style="width:14px;text-align:left;flex:none;">${v}</span>
      </span>`;
    const cards = CONFIG.kart.characters
      .map((c, i) => {
        const sel = i === 0;
        return `
        <button type="button" class="sk3d-driver-card${sel ? ' is-selected' : ''}" data-index="${i}" role="radio" aria-checked="${sel}" aria-label="Select ${c.name}"
          style="display:flex;flex-direction:column;gap:6px;align-items:stretch;padding:10px 10px 8px;border-radius:12px;border:2px solid ${sel ? 'var(--sk3d-yellow)' : 'rgba(255,255,255,0.22)'};background:${sel ? 'rgba(255,209,102,0.14)' : 'rgba(255,255,255,0.05)'};cursor:pointer;color:#fff;font-family:inherit;min-width:112px;max-width:150px;flex:1;">
          <span style="display:flex;align-items:center;gap:8px;justify-content:center;">
            <span style="width:18px;height:18px;border-radius:50%;background:${toHex(c.color)};box-shadow:0 0 8px ${toHex(c.color)};display:inline-block;flex:none;"></span>
            <span style="font-weight:800;font-size:0.95rem;">${c.name}</span>
          </span>
          ${statBar('SPD', c.stats.speed)}
          ${statBar('ACC', c.stats.accel)}
          ${statBar('HAN', c.stats.handling)}
        </button>`;
      })
      .join('');

    const ccBtns = CONFIG.cc.levels
      .map((cc) => {
        const sel = cc === CONFIG.cc.default;
        return `<button type="button" class="sk3d-btn sk3d-cc-btn" data-cc="${cc}" role="radio" aria-checked="${sel}" style="padding:8px 18px;font-size:1rem;background:${sel ? 'var(--sk3d-yellow)' : 'var(--sk3d-cream)'}">${cc}cc</button>`;
      })
      .join('');

    return `
      <div class="sk3d-menu-card">
        <h1 class="sk3d-logo">
          <span class="sk3d-logo-line">SUPER KART</span>
          <span class="sk3d-logo-sub">3D.js</span>
        </h1>
        <div class="sk3d-logo-strip" aria-hidden="true"></div>
        <p class="sk3d-tagline">Cartoon arcade kart racing — drift, boost and blast your rivals!</p>
        <button type="button" class="sk3d-btn sk3d-primary-btn sk3d-start-btn">🏁 Start Race</button>
        <button type="button" class="sk3d-btn sk3d-help-toggle" aria-expanded="false">❓ How to Play</button>
        <div class="sk3d-help-panel sk3d-hidden">
          <table class="sk3d-controls-table">
            <thead><tr><th>Action</th><th>Keyboard</th><th>Touch</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div class="sk3d-driver-picker">
          <span class="sk3d-color-label" id="sk3d-driver-label">Driver</span>
          <div class="sk3d-driver-cards" role="radiogroup" aria-labelledby="sk3d-driver-label" style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;max-width:660px;margin:0 auto;">${cards}</div>
        </div>
        <div class="sk3d-color-picker">
          <span class="sk3d-color-label" id="sk3d-color-label">Kart color</span>
          <div class="sk3d-color-swatches" role="radiogroup" aria-labelledby="sk3d-color-label">${swatches}</div>
        </div>
        <div class="sk3d-settings" role="group" aria-label="Race settings">
          <div class="sk3d-setting-row" style="display:flex;flex-direction:column;align-items:center;gap:8px;">
            <span class="sk3d-color-label" id="sk3d-cc-label">Engine class</span>
            <div class="sk3d-cc-row" role="radiogroup" aria-labelledby="sk3d-cc-label" style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">${ccBtns}</div>
          </div>
          <div class="sk3d-assist-row" role="group" aria-label="Driving assists" style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
            <label class="sk3d-btn sk3d-assist-toggle" style="display:inline-flex;align-items:center;gap:8px;padding:8px 16px;font-size:0.95rem;">
              <input type="checkbox" data-assist="autoAccel" /> Auto-accelerate
            </label>
            <label class="sk3d-btn sk3d-assist-toggle" style="display:inline-flex;align-items:center;gap:8px;padding:8px 16px;font-size:0.95rem;">
              <input type="checkbox" data-assist="steerAssist" /> Steer assist
            </label>
          </div>
        </div>
        <button type="button" class="sk3d-btn sk3d-mute-toggle" aria-pressed="false">🔊 Sound on</button>
        <button type="button" class="sk3d-btn sk3d-track-switch" id="sk3d-track-switch">🌆 Neon City</button>
        <footer class="sk3d-credit">Made with Three.js — open source</footer>
      </div>`;
  }

  bindEvents() {
    this.startBtn.addEventListener('click', () => { this.onSound('uiSelect'); this.onStart(); });
    this.helpToggle.addEventListener('click', () => { this.onSound('uiClick'); this.toggleHelp(); });
    for (const swatch of this.swatches) {
      swatch.addEventListener('click', () => { this.onSound('uiClick'); this.selectColor(swatch); });
    }
    // AUDIT r4: driver cards — picking one publishes __sk3dChar + repaints the kart.
    for (const card of this.charCards) {
      card.addEventListener('click', () => { this.onSound('uiClick'); this.selectChar(card); });
    }
    // Engine class + assist toggles (difficulty/accessibility layer, audit r3).
    for (const b of this.ccBtns) {
      b.addEventListener('click', () => { this.onSound('uiClick'); this.selectCc(Number(b.dataset.cc)); });
    }
    for (const input of this.assistToggles) {
      input.addEventListener('change', () => {
        this.onSound('uiClick');
        this[input.dataset.assist] = input.checked;
        this.saveSettings();
      });
    }
    // Hover feedback (audit minor: 'uiHover' recipe existed but was never
    // wired). Gate to real hover pointers (v4 F6: on touch, pointerenter
    // fires on tap → hover+click double-tick).
    const canHover = window.matchMedia && window.matchMedia('(hover: hover)').matches;
    if (canHover) {
      for (const el of [this.startBtn, this.helpToggle, this.muteBtn, ...this.swatches, ...this.ccBtns, ...this.charCards]) {
        el.addEventListener('pointerenter', () => { this.onSound('uiHover'); });
      }
    }
    this.muteBtn.addEventListener('click', () => { this.toggleMute(); });
    // Track switch: reload with ?track=2 (or back to 1) — simplest robust
    // way to swap the whole world (track + environment theme).
    if (this.trackSwitch) {
      this.trackSwitch.textContent = new URLSearchParams(location.search).get('track') === '2' ? '🌇 Meadow Circuit' : '🌆 Neon City';
      this.trackSwitch.addEventListener('click', () => {
        this.onSound('uiSelect');
        const next = new URLSearchParams(location.search).get('track') === '2' ? '' : '?track=2';
        location.search = next;
      });
    }
  }

  /** Flip the audio mute toggle (persisted in localStorage). */
  toggleMute() {
    this.muted = !this.muted;
    this.muteBtn.setAttribute('aria-pressed', String(this.muted));
    this.muteBtn.textContent = this.muted ? '🔇 Sound off' : '🔊 Sound on';
    try {
      localStorage.setItem('sk3d.muted', this.muted ? '1' : '0');
    } catch { /* private mode */ }
    this.onToggleMute(this.muted);
  }

  /** Restore the persisted mute state. */
  restoreMute() {
    try {
      if (localStorage.getItem('sk3d.muted') === '1') this.toggleMute();
    } catch { /* private mode */ }
  }

  /** Pick an engine class (50/100/150cc) — persisted + published (audit r3). */
  selectCc(cc) {
    if (!CONFIG.cc.levels.includes(cc)) return;
    this.cc = cc;
    for (const b of this.ccBtns) {
      const sel = Number(b.dataset.cc) === cc;
      b.setAttribute('aria-checked', String(sel));
      b.style.background = sel ? 'var(--sk3d-yellow)' : 'var(--sk3d-cream)';
    }
    this.saveSettings();
  }

  /** Persist difficulty/assist/driver choices + publish to window (startRace reads). */
  saveSettings() {
    try {
      localStorage.setItem('sk3d.cc', String(this.cc));
      localStorage.setItem('sk3d.autoAccel', this.autoAccel ? '1' : '0');
      localStorage.setItem('sk3d.steerAssist', this.steerAssist ? '1' : '0');
      localStorage.setItem('sk3d.char', String(this.selectedChar)); // AUDIT r4: driver pick
    } catch { /* private mode */ }
    this.syncGlobals();
  }

  /** Live settings on window so main.js reads them at race start. */
  syncGlobals() {
    window.__sk3dCc = this.cc;
    window.__sk3dAutoAccel = this.autoAccel;
    window.__sk3dSteerAssist = this.steerAssist;
    window.__sk3dChar = this.selectedChar; // AUDIT r4: driver index (buildKarts reads it)
  }

  /** Restore persisted difficulty/assist choices (constructor → DOM). */
  restoreSettings() {
    try {
      const savedCc = Number(localStorage.getItem('sk3d.cc'));
      if (CONFIG.cc.levels.includes(savedCc)) this.cc = savedCc;
      if (localStorage.getItem('sk3d.autoAccel') === '1') this.autoAccel = true;
      if (localStorage.getItem('sk3d.steerAssist') === '1') this.steerAssist = true;
    } catch { /* private mode */ }
    for (const b of this.ccBtns) {
      const sel = Number(b.dataset.cc) === this.cc;
      b.setAttribute('aria-checked', String(sel));
      b.style.background = sel ? 'var(--sk3d-yellow)' : 'var(--sk3d-cream)';
    }
    for (const input of this.assistToggles) {
      input.checked = input.dataset.assist === 'autoAccel' ? this.autoAccel : this.steerAssist;
    }
    // AUDIT r4: restore the persisted driver pick onto the cards.
    try {
      const savedChar = Number(localStorage.getItem('sk3d.char'));
      if (Number.isFinite(savedChar) && CONFIG.kart.characters[savedChar]) this.selectedChar = savedChar;
    } catch { /* private mode */ }
    for (const card of this.charCards) this._setCardSelected(card, Number(card.dataset.index) === this.selectedChar);
    this.saveSettings();
  }

  toggleHelp() {
    const open = !this.helpPanel.classList.contains('sk3d-hidden');
    this.helpPanel.classList.toggle('sk3d-hidden', open);
    this.helpToggle.setAttribute('aria-expanded', String(!open));
  }

  selectColor(swatch) {
    const index = Number(swatch.dataset.index);
    const color = CONFIG.kart.playerColors[index];
    if (color === undefined) return;
    this.selectedColor = color;
    for (const s of this.swatches) {
      s.classList.toggle('is-selected', s === swatch);
    }
    this.onColor(color);
  }

  /** Pick a driver (audit r4 — character cards with stat bars). Persisted and
   *  published to window.__sk3dChar; the character's identity color also
   *  drives the kart paint (onColor) so the grid reads the choice. */
  selectChar(card) {
    const index = Number(card.dataset.index);
    if (!CONFIG.kart.characters[index]) return;
    this.selectedChar = index;
    for (const c of this.charCards) this._setCardSelected(c, c === card);
    this.onColor(CONFIG.kart.characters[index].color);
    this.saveSettings();
  }

  /** Reflect a card's selected state (class + aria + inline highlight). */
  _setCardSelected(card, sel) {
    card.classList.toggle('is-selected', sel);
    card.setAttribute('aria-checked', String(sel));
    card.style.borderColor = sel ? 'var(--sk3d-yellow)' : 'rgba(255,255,255,0.22)';
    card.style.background = sel ? 'rgba(255,209,102,0.14)' : 'rgba(255,255,255,0.05)';
  }

  /** @returns {number} selected driver index into CONFIG.kart.characters. */
  getCharacter() {
    return this.selectedChar;
  }

  /** Reflect an externally chosen driver index (e.g. persisted pick on boot). */
  setSelectedCharacter(index) {
    if (!CONFIG.kart.characters[index]) return;
    this.selectedChar = index;
    for (const c of this.charCards) this._setCardSelected(c, Number(c.dataset.index) === index);
  }

  /** @returns {number} currently selected kart color (0xRRGGBB). */
  getColor() {
    return this.selectedColor;
  }

  /** @returns {number} selected engine class (50 | 100 | 150). */
  getCc() {
    return this.cc;
  }

  /** @returns {boolean} auto-accelerate assist enabled. */
  isAutoAccel() {
    return this.autoAccel;
  }

  /** @returns {boolean} steer-assist enabled. */
  isSteerAssist() {
    return this.steerAssist;
  }

  /** @returns {{cc:number, autoAccel:boolean, steerAssist:boolean, color:number, character:number}} */
  getSelection() {
    return { cc: this.cc, autoAccel: this.autoAccel, steerAssist: this.steerAssist, color: this.selectedColor, character: this.selectedChar };
  }

  /** Show the menu. Idempotent — DOM is built once in the constructor. */
  show() {
    this.root.classList.remove('sk3d-hidden');
    // Re-trigger the entrance animation on every show.
    this.root.classList.remove('sk3d-menu-anim');
    void this.root.offsetWidth;
    this.root.classList.add('sk3d-menu-anim');
    this.startBtn.focus({ preventScroll: true });
  }

  /** Reflect the persisted kart color on the swatch row (audit v4 F2). */
  setSelectedColor(color) {
    const index = CONFIG.kart.playerColors.indexOf(color);
    if (index < 0) return;
    this.selectedColor = color;
    for (const s of this.swatches) {
      s.classList.toggle('is-selected', Number(s.dataset.index) === index);
    }
  }

  hide() {
    this.root.classList.add('sk3d-hidden');
  }
}
