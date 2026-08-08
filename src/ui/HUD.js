/**
 * Super Kart 3D.js — in-race HUD overlay.
 *
 * Pure DOM, appended to document.body, hidden by default.
 * Shows position pips, lap counter, race time, a circular speedometer
 * with needle, the held item slot, countdown, finish screen and toasts.
 */
import { CONFIG } from '../config.js';
import './ui.css';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** PowerUpType -> emoji icon (contract: PowerUpType in PowerUp.js). */
const ITEM_ICONS = {
  MUSHROOM: '🍄',
  SHELL: '🐢',
  RED_SHELL: '🐢', // styled red via .sk3d-item-red
  BANANA: '🍌',
  STAR: '⭐',
  LIGHTNING: '⚡',
};

/** PowerUpType -> readable name shown under the icon. */
const ITEM_NAMES = {
  MUSHROOM: 'Mushroom',
  SHELL: 'Green Shell',
  RED_SHELL: 'Red Shell',
  BANANA: 'Banana',
  STAR: 'Star',
  LIGHTNING: 'Lightning',
};

/** km/h at the top of the gauge: ~42 m/s * 2.4 ≈ 100 km/h. */
const MAX_KMH = Math.round(CONFIG.physics.maxSpeed * 2.4);
const ARC_RADIUS = 60;
const ARC_LENGTH = Math.PI * ARC_RADIUS;
const COUNTDOWN_NUMBER_MS = 1200; // safety auto-hide for numbers
const COUNTDOWN_GO_MS = 900;
const TOAST_MS = 2400;

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value);
  }
  return el;
}

/** 1 -> "1st", 2 -> "2nd", 3 -> "3rd", 11-13 -> "11th"; invalid -> "--". */
export function ordinal(n) {
  if (!Number.isFinite(n) || n < 1) return '--';
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  const mod10 = n % 10;
  const suffix = mod10 === 1 ? 'st' : mod10 === 2 ? 'nd' : mod10 === 3 ? 'rd' : 'th';
  return `${n}${suffix}`;
}

/** seconds -> "m:ss.t" */
export function formatTime(seconds) {
  const s = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const tenth = Math.floor((s * 10) % 10);
  return `${m}:${String(sec).padStart(2, '0')}.${tenth}`;
}

export class HUD {
  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'sk3d-overlay sk3d-hud sk3d-hidden';
    this.root.setAttribute('aria-live', 'polite');

    this.root.innerHTML = `
      <div class="sk3d-hud-top">
        <div class="sk3d-hud-left">
          <div class="sk3d-chip sk3d-position">--</div>
          <div class="sk3d-chip sk3d-lap">Lap 1/${CONFIG.game.totalLaps}</div>
        </div>
        <div class="sk3d-chip sk3d-time">0:00.0</div>
      </div>
      <div class="sk3d-hud-bottom"></div>
      <div class="sk3d-countdown sk3d-hidden">3</div>
      <div class="sk3d-finish sk3d-hidden">
        <div class="sk3d-finish-card">
          <div class="sk3d-finish-trophy" aria-hidden="true">🏆</div>
          <div class="sk3d-finish-title">FINISHED <span class="sk3d-finish-place">1st</span>!</div>
          <div class="sk3d-finish-time">0:00.0</div>
          <div class="sk3d-finish-hint">Press R to restart</div>
        </div>
      </div>
      <div class="sk3d-toast sk3d-hidden" role="status"></div>`;

    // Speedometer + item slot
    const bottom = this.root.querySelector('.sk3d-hud-bottom');
    const speedo = this.buildSpeedometer();
    this.speedoWrap = speedo.wrap;
    this.speedNeedle = speedo.needle;
    this.speedArc = speedo.arc;
    this.speedValueEl = speedo.wrap.querySelector('.sk3d-speedo-value');
    bottom.append(speedo.wrap, this.buildItemSlot());

    this.positionEl = this.root.querySelector('.sk3d-position');
    this.lapEl = this.root.querySelector('.sk3d-lap');
    this.timeEl = this.root.querySelector('.sk3d-time');
    this.itemIconEl = this.root.querySelector('.sk3d-item-icon');
    this.countdownEl = this.root.querySelector('.sk3d-countdown');
    this.finishEl = this.root.querySelector('.sk3d-finish');
    this.finishCardEl = this.root.querySelector('.sk3d-finish-card');
    this.finishPlaceEl = this.root.querySelector('.sk3d-finish-place');
    this.finishTimeEl = this.root.querySelector('.sk3d-finish-time');
    this.toastEl = this.root.querySelector('.sk3d-toast');

    this.countdownTimer = 0;
    this.toastTimer = 0;

    // Caches so per-frame update() never churns the DOM.
    this._pos = null;
    this._lapText = null;
    this._timeText = null;
    this.itemType = null;

    document.body.appendChild(this.root);
  }

  buildSpeedometer() {
    const wrap = document.createElement('div');
    wrap.className = 'sk3d-speedo';
    wrap.innerHTML = `
      <div class="sk3d-speedo-dial"></div>
      <div class="sk3d-speedo-readout">
        <span class="sk3d-speedo-value">0</span>
        <span class="sk3d-speedo-unit">km/h</span>
      </div>`;

    const dial = wrap.querySelector('.sk3d-speedo-dial');
    const svg = svgEl('svg', {
      viewBox: '0 0 140 80',
      class: 'sk3d-speedo-svg',
      'aria-hidden': 'true',
    });

    const gradient = svgEl('linearGradient', { id: 'sk3d-speedo-grad', x1: '0', y1: '0', x2: '1', y2: '0' });
    gradient.append(
      svgEl('stop', { offset: '0%', style: 'stop-color: var(--sk3d-green)' }),
      svgEl('stop', { offset: '55%', style: 'stop-color: var(--sk3d-yellow)' }),
      svgEl('stop', { offset: '100%', style: 'stop-color: var(--sk3d-red)' })
    );
    const defs = svgEl('defs', {});
    defs.append(gradient);
    svg.append(defs);

    const arcPath = 'M 10 70 A 60 60 0 0 1 130 70';
    const track = svgEl('path', { d: arcPath, fill: 'none', 'stroke-linecap': 'round' });
    track.setAttribute('stroke', '#e9e2d0');
    track.setAttribute('stroke-width', '12');
    svg.append(track);

    const arc = svgEl('path', { d: arcPath, fill: 'none', 'stroke-linecap': 'round', class: 'sk3d-speedo-arc' });
    arc.setAttribute('stroke', 'url(#sk3d-speedo-grad)');
    arc.setAttribute('stroke-width', '12');
    arc.style.strokeDasharray = String(ARC_LENGTH);
    arc.style.strokeDashoffset = String(ARC_LENGTH);
    svg.append(arc);

    // Tick marks every 5 km/h, major every 20.
    for (let kmh = 0; kmh <= MAX_KMH; kmh += 5) {
      const major = kmh % 20 === 0;
      const a = ((-90 + (kmh / MAX_KMH) * 180) * Math.PI) / 180;
      const r1 = 52;
      const r2 = major ? 42 : 46;
      const tick = svgEl('line', {
        x1: 70 + r1 * Math.sin(a),
        y1: 70 - r1 * Math.cos(a),
        x2: 70 + r2 * Math.sin(a),
        y2: 70 - r2 * Math.cos(a),
        'stroke-linecap': 'round',
      });
      tick.style.stroke = 'var(--sk3d-ink)';
      tick.style.strokeWidth = major ? '3' : '2';
      svg.append(tick);
    }

    dial.append(svg);

    const needle = document.createElement('div');
    needle.className = 'sk3d-speedo-needle';
    const hub = document.createElement('div');
    hub.className = 'sk3d-speedo-hub';
    dial.append(needle, hub);

    return { wrap, needle, arc };
  }

  buildItemSlot() {
    const slot = document.createElement('div');
    slot.className = 'sk3d-chip sk3d-item-slot';
    slot.innerHTML = `
      <span class="sk3d-item-label">ITEM</span>
      <span class="sk3d-item-icon sk3d-item-empty">?</span>
      <span class="sk3d-item-name"></span>`;
    return slot;
  }

  show() {
    this.root.classList.remove('sk3d-hidden');
  }

  hide() {
    this.root.classList.add('sk3d-hidden');
  }

  /**
   * Per-frame update. Reads rank/lap/time/speed/item from the race state.
   * @param {object} raceManager RaceManager instance (elapsed, player, ...)
   * @param {object} player      player Kart (position, lap, state, heldItem)
   */
  update(raceManager, player) {
    if (this.root.classList.contains('sk3d-hidden')) return;

    // Position pips (ordinal + medal color).
    const pos = player && typeof player.position === 'number' ? player.position : 0;
    if (pos !== this._pos) {
      this._pos = pos;
      const text = ordinal(pos);
      const medal = pos === 1 ? ' sk3d-position-1' : pos === 2 ? ' sk3d-position-2' : pos === 3 ? ' sk3d-position-3' : '';
      this.positionEl.className = `sk3d-chip sk3d-position${medal}`;
      this.positionEl.textContent = text;
    }

    // Lap counter.
    const lap = player && typeof player.lap === 'number' ? Math.min(player.lap, CONFIG.game.totalLaps) : 1;
    const lapText = `Lap ${lap}/${CONFIG.game.totalLaps}`;
    if (lapText !== this._lapText) {
      this._lapText = lapText;
      this.lapEl.textContent = lapText;
    }

    // Race time (freeze on the player's final time once finished).
    const finished = player && player.finished;
    const elapsed =
      finished && typeof player.totalTime === 'number'
        ? player.totalTime
        : raceManager && typeof raceManager.elapsed === 'number'
          ? raceManager.elapsed
          : 0;
    const timeText = formatTime(elapsed);
    if (timeText !== this._timeText) {
      this._timeText = timeText;
      this.timeEl.textContent = timeText;
    }

    // Speedometer.
    const speed = player && player.state ? player.state.speed : 0;
    this.setSpeed(speed);

    // Held item slot.
    const item = player ? player.heldItem : null;
    this.setItem(item);
  }

  /** @param {number} speed kart speed in m/s (may be negative while reversing). */
  setSpeed(speed) {
    const kmh = Math.max(0, Math.min(speed * 2.4, MAX_KMH));
    const rounded = Math.round(kmh);
    if (this.speedValueEl.textContent !== String(rounded)) {
      this.speedValueEl.textContent = String(rounded);
    }
    const angle = -90 + (kmh / MAX_KMH) * 180;
    this.speedNeedle.style.transform = `rotate(${angle}deg)`;
    this.speedArc.style.strokeDashoffset = String(ARC_LENGTH * (1 - kmh / MAX_KMH));
  }

  /** @param {string|null} itemType PowerUpType key, or null/undefined for empty. */
  setItem(itemType) {
    if (itemType === this.itemType) return;
    this.itemType = itemType || null;

    const icon = this.itemIconEl;
    const nameEl = this.root.querySelector('.sk3d-item-name');
    if (this.itemType && ITEM_ICONS[this.itemType]) {
      icon.textContent = ITEM_ICONS[this.itemType];
      icon.classList.toggle('sk3d-item-red', this.itemType === 'RED_SHELL');
      icon.classList.remove('sk3d-item-empty');
      if (nameEl) nameEl.textContent = ITEM_NAMES[this.itemType] || this.itemType;
    } else {
      icon.textContent = '?';
      icon.classList.remove('sk3d-item-red');
      icon.classList.add('sk3d-item-empty');
      if (nameEl) nameEl.textContent = '';
    }
    // Pop whenever the icon changes.
    icon.classList.remove('sk3d-item-pop');
    void icon.offsetWidth;
    icon.classList.add('sk3d-item-pop');
  }

  /**
   * Big fullscreen countdown number.
   * @param {number|string} n 3|2|1 or 'GO'
   */
  countdown(n) {
    if (n === null || n === undefined) {
      // clear signal — just hide, never render "null"
      this.countdownEl.classList.add('sk3d-hidden');
      return;
    }
    const go = n === 'GO';
    this.countdownEl.textContent = go ? 'GO!' : String(n);
    this.countdownEl.classList.toggle('sk3d-countdown-go', go);
    this.countdownEl.classList.remove('sk3d-hidden');

    this.countdownEl.classList.remove('sk3d-pop');
    void this.countdownEl.offsetWidth;
    this.countdownEl.classList.add('sk3d-pop');

    clearTimeout(this.countdownTimer);
    this.countdownTimer = setTimeout(() => {
      this.countdownEl.classList.add('sk3d-hidden');
    }, go ? COUNTDOWN_GO_MS : COUNTDOWN_NUMBER_MS);
  }

  /** @param {number} place race rank (1-6) @param {number} time total time in seconds */
  showFinish(place, time) {
    this.finishPlaceEl.textContent = ordinal(place);
    this.finishTimeEl.textContent = formatTime(time);
    this.finishEl.classList.remove('sk3d-hidden');

    this.finishCardEl.classList.remove('sk3d-pop');
    void this.finishCardEl.offsetWidth;
    this.finishCardEl.classList.add('sk3d-pop');
  }

  /** Transient centered toast message (auto-hides). @param {string} text */
  showMessage(text) {
    this.toastEl.textContent = text;
    this.toastEl.classList.remove('sk3d-hidden', 'sk3d-toast-show');
    void this.toastEl.offsetWidth;
    this.toastEl.classList.add('sk3d-toast-show');

    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastEl.classList.add('sk3d-hidden');
    }, TOAST_MS);
  }

  /** Clear all HUD state back to defaults. */
  reset() {
    clearTimeout(this.countdownTimer);
    clearTimeout(this.toastTimer);

    this._pos = null;
    this._lapText = null;
    this._timeText = null;

    this.positionEl.className = 'sk3d-chip sk3d-position';
    this.positionEl.textContent = '--';
    this.lapEl.textContent = `Lap 1/${CONFIG.game.totalLaps}`;
    this.timeEl.textContent = '0:00.0';

    this.setSpeed(0);
    this.setItem(null);

    this.countdownEl.classList.add('sk3d-hidden');
    this.finishEl.classList.add('sk3d-hidden');
    this.toastEl.classList.add('sk3d-hidden');
  }
}
