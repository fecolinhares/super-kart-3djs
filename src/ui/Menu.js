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

    this.root = document.createElement('div');
    this.root.className = 'sk3d-overlay sk3d-menu sk3d-hidden';
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-label', 'Main menu');
    this.root.innerHTML = this.buildHtml();

    this.startBtn = this.root.querySelector('.sk3d-start-btn');
    this.helpToggle = this.root.querySelector('.sk3d-help-toggle');
    this.helpPanel = this.root.querySelector('.sk3d-help-panel');
    this.swatches = Array.from(this.root.querySelectorAll('.sk3d-color-swatch'));
    this.muteBtn = this.root.querySelector('.sk3d-mute-toggle');
    this.trackSwitch = this.root.querySelector('.sk3d-track-switch');

    this.bindEvents();
    document.body.appendChild(this.root);
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
        <div class="sk3d-color-picker">
          <span class="sk3d-color-label" id="sk3d-color-label">Kart color</span>
          <div class="sk3d-color-swatches" role="radiogroup" aria-labelledby="sk3d-color-label">${swatches}</div>
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
    // Hover feedback (audit minor: 'uiHover' recipe existed but was never
    // wired). Gate to real hover pointers (v4 F6: on touch, pointerenter
    // fires on tap → hover+click double-tick).
    const canHover = window.matchMedia && window.matchMedia('(hover: hover)').matches;
    if (canHover) {
      for (const el of [this.startBtn, this.helpToggle, this.muteBtn, ...this.swatches]) {
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

  /** @returns {number} currently selected kart color (0xRRGGBB). */
  getColor() {
    return this.selectedColor;
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
