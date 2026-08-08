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

/** PowerUpType (VALUE) -> emoji icon. Keys are lowercase values: 'shell',
 *  'red_shell', … — matches kart.heldItem exactly. */
const ITEM_ICONS = {
  mushroom: '🍄',
  shell: '🐢',
  red_shell: '🐢', // styled red via .sk3d-item-red
  banana: '🍌',
  star: '⭐',
  lightning: '⚡',
};

/** PowerUpType (VALUE) -> readable name shown under the icon. */
const ITEM_NAMES = {
  mushroom: 'Mushroom',
  shell: 'Green Shell',
  red_shell: 'Red Shell',
  banana: 'Banana',
  star: 'Star',
  lightning: 'Lightning',
};

/** km/h at the top of the gauge: ~42 m/s * 2.4 ≈ 100 km/h. */
const MAX_KMH = Math.round(CONFIG.physics.maxSpeed * 2.4);
const ARC_RADIUS = 60;
const ARC_LENGTH = Math.PI * ARC_RADIUS;
const COUNTDOWN_NUMBER_MS = 1200; // safety auto-hide for numbers
const COUNTDOWN_GO_MS = 900;
const TOAST_MS = 2400;

/** Rank medals shown beside the ordinal on the position chip. */
const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };

/** Minimap: number of samples used to flatten the track path into a polyline. */
const MINIMAP_SAMPLES = 64;
const MINIMAP_SIZE = 120;
const MINIMAP_PAD = 9;
const DOT_R = 4;
const DOT_R_LEADER = 5.5;

/** Fallback AI dot color if a kart has no readable body material. */
const DOT_FALLBACK_COLOR = '#ff5a5f';

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

/** Kart body color as a CSS string, read from the live body material. */
function kartDotColor(kart) {
  const mat = kart && kart._bodyMat;
  if (mat && mat.color && typeof mat.color.getStyle === 'function') {
    return mat.color.getStyle();
  }
  return DOT_FALLBACK_COLOR;
}

export class HUD {
  /**
   * @param {object|null} [track] Track descriptor from buildTrack() — used to
   *   render the minimap polyline. Anything with a `path.getPointAt(t)` curve
   *   works; pass null/undefined to skip the minimap entirely.
   */
  constructor(track = null) {
    this.root = document.createElement('div');
    this.root.className = 'sk3d-overlay sk3d-hud sk3d-hidden';
    this.root.setAttribute('aria-live', 'polite');

    this.root.innerHTML = `
      <div class="sk3d-hud-top">
        <div class="sk3d-hud-left">
          <div class="sk3d-chip sk3d-position">--</div>
          <div class="sk3d-chip sk3d-lap">
            <span class="sk3d-lap-text">LAP 1/${CONFIG.game.totalLaps}</span>
            <span class="sk3d-lap-bar"><span class="sk3d-lap-bar-fill"></span></span>
          </div>
        </div>
        <div class="sk3d-hud-right">
          <div class="sk3d-chip sk3d-time">0:00.0</div>
        </div>
      </div>
      <div class="sk3d-hud-bottom"></div>
      <div class="sk3d-countdown sk3d-hidden">3</div>
      <div class="sk3d-pause sk3d-hidden">⏸ PAUSED<div class="sk3d-pause-hint">Press P to resume</div></div>
      <div class="sk3d-finish sk3d-hidden">
        <div class="sk3d-finish-card">
          <div class="sk3d-finish-trophy" aria-hidden="true">🏆</div>
          <div class="sk3d-finish-title">FINISHED <span class="sk3d-finish-place">1st</span>!</div>
          <div class="sk3d-finish-time">0:00.0</div>
          <button type="button" class="sk3d-finish-btn">Race Again</button>
          <div class="sk3d-finish-hint">or press R</div>
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
    // Drift charge meter: a thin bar under the speedometer that fills while
    // drifting (white → yellow → orange, matching the spark colors). Only
    // visible while the player is actually drifting.
    const drift = document.createElement('div');
    drift.className = 'sk3d-drift-meter sk3d-hidden';
    // Tick at the mini-boost release threshold (75%) so the player knows when to let go.
    drift.innerHTML = '<div class="sk3d-drift-fill"></div><div class="sk3d-drift-tick"></div><span class="sk3d-drift-label">DRIFT</span>';
    bottom.append(drift);
    this.driftMeterEl = drift;
    this.driftFillEl = drift.querySelector('.sk3d-drift-fill');

    this.positionEl = this.root.querySelector('.sk3d-position');
    this.lapEl = this.root.querySelector('.sk3d-lap');
    this.lapTextEl = this.root.querySelector('.sk3d-lap-text');
    this.lapBarFillEl = this.root.querySelector('.sk3d-lap-bar-fill');
    this.timeEl = this.root.querySelector('.sk3d-time');
    this.itemIconEl = this.root.querySelector('.sk3d-item-icon');
    this.countdownEl = this.root.querySelector('.sk3d-countdown');
    this.finishEl = this.root.querySelector('.sk3d-finish');
    this.finishCardEl = this.root.querySelector('.sk3d-finish-card');
    this.finishPlaceEl = this.root.querySelector('.sk3d-finish-place');
    this.finishBtnEl = this.root.querySelector('.sk3d-finish-btn');
    this.finishBtnEl.addEventListener('click', () => window.__sk3d?.restartRace?.());
    this.finishTimeEl = this.root.querySelector('.sk3d-finish-time');
    this.toastEl = this.root.querySelector('.sk3d-toast');

    this.countdownTimer = 0;
    this.toastTimer = 0;

    // Caches so per-frame update() never churns the DOM.
    this._pos = null;
    this._lapText = null;
    this._lapPct = null;
    this._timeText = null;
    this.itemType = null;

    // Circular minimap — sits between the left chips and the race clock.
    this._mm = this.buildMinimap(track);
    if (this._mm) {
      // Minimap sits in the TOP-RIGHT corner group (left of the timer), so it
      // never covers the finish gantry / action in screen center.
      const right = this.root.querySelector('.sk3d-hud-right');
      right.prepend(this._mm.wrap);
    }

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
    // Subtle vertical gradient for the base (empty) arc — darker toward the
    // needle pivot so the dial reads as recessed.
    const bgGradient = svgEl('linearGradient', { id: 'sk3d-speedo-bg-grad', x1: '0', y1: '0', x2: '0', y2: '1' });
    bgGradient.append(
      svgEl('stop', { offset: '0%', style: 'stop-color: rgba(27, 42, 65, 0.14)' }),
      svgEl('stop', { offset: '100%', style: 'stop-color: rgba(27, 42, 65, 0.32)' })
    );
    // Soft warm glow behind the filled arc.
    const glowFilter = svgEl('filter', { id: 'sk3d-speedo-glow', x: '-40%', y: '-40%', width: '180%', height: '180%' });
    glowFilter.append(
      svgEl('feDropShadow', {
        dx: '0',
        dy: '3',
        stdDeviation: '4',
        'flood-color': '#ffd166',
        'flood-opacity': '0.55',
      })
    );
    const defs = svgEl('defs', {});
    defs.append(gradient, bgGradient, glowFilter);
    svg.append(defs);

    const arcPath = 'M 10 70 A 60 60 0 0 1 130 70';
    const track = svgEl('path', { d: arcPath, fill: 'none', 'stroke-linecap': 'round' });
    track.setAttribute('stroke', 'url(#sk3d-speedo-bg-grad)');
    track.setAttribute('stroke-width', '12');
    svg.append(track);

    const arc = svgEl('path', { d: arcPath, fill: 'none', 'stroke-linecap': 'round', class: 'sk3d-speedo-arc' });
    arc.setAttribute('stroke', 'url(#sk3d-speedo-grad)');
    arc.setAttribute('stroke-width', '12');
    arc.setAttribute('filter', 'url(#sk3d-speedo-glow)');
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

  /**
   * Build the circular track minimap (SVG). Samples the track path once into a
   * closed polyline, then scales it to fit inside a 120px circle.
   * @param {object|null} track descriptor with a THREE.Curve `path`
   * @returns {object|null} { wrap, dotsGroup } or null when no usable path
   */
  buildMinimap(track) {
    const path = track && track.path;
    if (!path || typeof path.getPointAt !== 'function') return null;

    // Flatten the closed loop into N sample points (getPointAt(1) ≈ getPointAt(0)).
    const samples = [];
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < MINIMAP_SAMPLES; i++) {
      const p = path.getPointAt(i / MINIMAP_SAMPLES);
      const x = p.x;
      const z = p.z;
      samples.push([x, z]);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
    const spanX = maxX - minX;
    const spanZ = maxZ - minZ;
    if (!(spanX > 0) || !(spanZ > 0)) return null;

    // Uniform scale (preserves track shape), centered inside the circle.
    const avail = MINIMAP_SIZE - MINIMAP_PAD * 2;
    const scale = avail / Math.max(spanX, spanZ);
    const midX = (minX + maxX) / 2;
    const midZ = (minZ + maxZ) / 2;
    const offX = MINIMAP_SIZE / 2 - midX * scale;
    const offZ = MINIMAP_SIZE / 2 - midZ * scale;

    const pts = samples
      .map(([x, z]) => `${(offX + x * scale).toFixed(1)},${(offZ + z * scale).toFixed(1)}`)
      .join(' ');
    const polyline = `M ${pts} Z`;

    const wrap = document.createElement('div');
    wrap.className = 'sk3d-chip sk3d-minimap';
    wrap.title = 'Track map';

    const svg = svgEl('svg', {
      viewBox: `0 0 ${MINIMAP_SIZE} ${MINIMAP_SIZE}`,
      class: 'sk3d-minimap-svg',
      'aria-hidden': 'true',
    });

    const defs = svgEl('defs', {});
    const grad = svgEl('linearGradient', { id: 'sk3d-minimap-track-grad', x1: '0', y1: '0', x2: '1', y2: '1' });
    grad.append(
      svgEl('stop', { offset: '0%', style: 'stop-color: rgba(255, 255, 255, 0.95)' }),
      svgEl('stop', { offset: '100%', style: 'stop-color: rgba(255, 209, 102, 0.95)' })
    );
    defs.append(grad);
    svg.append(defs);

    const c = MINIMAP_SIZE / 2;
    svg.append(
      svgEl('circle', { cx: c, cy: c, r: c - 1, class: 'sk3d-minimap-bg' }),
      svgEl('circle', { cx: c, cy: c, r: c - 3, class: 'sk3d-minimap-ring' })
    );
    // Glow underlay makes the route readable at a glance (art-bible: minimap
    // must communicate position, not just look decorative).
    const glowPath = svgEl('path', { d: polyline, class: 'sk3d-minimap-track-glow' });
    svg.append(glowPath);
    const trackPath = svgEl('path', { d: polyline, class: 'sk3d-minimap-track' });
    trackPath.setAttribute('stroke', 'url(#sk3d-minimap-track-grad)');
    svg.append(trackPath);

    const dotsGroup = svgEl('g', { class: 'sk3d-minimap-dots' });
    svg.append(dotsGroup);
    wrap.append(svg);

    return { wrap, dotsGroup, scale, offX, offZ, dots: new Map(), kartsRef: null };
  }

  /** Create the minimap dot for one kart (called once per kart identity). */
  _addMinimapDot(kart) {
    const mm = this._mm;
    const isPlayer = !!kart.isPlayer;
    const dot = svgEl('circle', {
      cx: MINIMAP_SIZE / 2,
      cy: MINIMAP_SIZE / 2,
      r: String(DOT_R),
      class: isPlayer ? 'sk3d-minimap-dot-player' : 'sk3d-minimap-dot-ai',
    });
    if (!isPlayer) {
      dot.style.fill = kartDotColor(kart);
    }
    mm.dotsGroup.append(dot);
    mm.dots.set(kart, dot);
    // Player gets a direction cone (points along state.heading) so the map
    // reads "where am I going", not just "where am I".
    if (isPlayer) {
      const cone = svgEl('path', { d: 'M 0 -8 L 6 4 L 0 0 L -6 4 Z', class: 'sk3d-minimap-cone' });
      mm.dotsGroup.append(cone);
      mm.playerCone = cone;
    }
    return dot;
  }

  /**
   * Project every kart's world XZ onto the minimap. Dots are created once per
   * kart identity (cached); only cx/cy/r attributes are touched per frame.
   * @param {object[]} [karts] raceManager.karts (player first, then AI)
   */
  _updateMinimap(karts) {
    const mm = this._mm;
    if (!mm || !karts || karts.length === 0) return;

    // Rebuild the dot cache when the karts array is swapped (race restart).
    if (karts !== mm.kartsRef) {
      mm.kartsRef = karts;
      mm.dots.clear();
      mm.dotsGroup.replaceChildren();
      for (const kart of karts) this._addMinimapDot(kart);
    }

    for (const kart of karts) {
      const dot = mm.dots.get(kart);
      const p = kart && kart.state && kart.state.position;
      if (!dot || !p) continue;
      const cx = mm.offX + p.x * mm.scale;
      const cy = mm.offZ + p.z * mm.scale;
      if (dot.getAttribute('cx') !== String(cx)) dot.setAttribute('cx', String(cx));
      if (dot.getAttribute('cy') !== String(cy)) dot.setAttribute('cy', String(cy));
      // Race leader dot is slightly larger.
      const r = kart.position === 1 ? DOT_R_LEADER : DOT_R;
      if (dot.getAttribute('r') !== String(r)) dot.setAttribute('r', String(r));
      // Player direction cone: rotate to state.heading (world Z maps to SVG Y).
      if (kart.isPlayer && mm.playerCone) {
        const hDeg = ((kart.state.heading || 0) * 180) / Math.PI;
        const deg = 180 - hDeg;
        mm.playerCone.setAttribute('transform', `translate(${cx.toFixed(1)},${cy.toFixed(1)}) rotate(${deg.toFixed(1)})`);
      }
    }
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
   * @param {object[]} [karts]   raceManager.karts — used to render minimap dots
   */
  update(raceManager, player, karts) {
    if (this.root.classList.contains('sk3d-hidden')) return;

    // Position pips (medal emoji + ordinal + medal-colored chip).
    const pos = player && typeof player.position === 'number' ? player.position : 0;
    if (pos !== this._pos) {
      this._pos = pos;
      const medal = MEDALS[pos] ? `${MEDALS[pos]} ` : '';
      const text = medal + ordinal(pos);
      const cls = pos === 1 ? ' sk3d-position-1' : pos === 2 ? ' sk3d-position-2' : pos === 3 ? ' sk3d-position-3' : '';
      this.positionEl.className = `sk3d-chip sk3d-position${cls}`;
      this.positionEl.textContent = text;
    }

    // Lap counter + per-lap progress bar (progress01 from player.state).
    const lap = player && typeof player.lap === 'number' ? Math.min(player.lap, CONFIG.game.totalLaps) : 1;
    const lapText = `LAP ${lap}/${CONFIG.game.totalLaps}`;
    if (lapText !== this._lapText) {
      this._lapText = lapText;
      this.lapTextEl.textContent = lapText;
    }
    const prog = player && player.state && typeof player.state.progress01 === 'number' ? player.state.progress01 : 0;
    const pct = `${(Math.max(0, Math.min(1, prog)) * 100).toFixed(1)}%`;
    if (pct !== this._lapPct) {
      this._lapPct = pct;
      this.lapBarFillEl.style.width = pct;
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

    // Minimap dots.
    this._updateMinimap(karts);
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
      icon.classList.toggle('sk3d-item-red', this.itemType === 'red_shell');
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

  /** Show drift charge (0..1) while drifting; hide when not. */
  setDriftCharge(charge, active) {
    if (!this.driftMeterEl) return;
    if (!active) {
      if (!this.driftMeterEl.classList.contains('sk3d-hidden')) this.driftMeterEl.classList.add('sk3d-hidden');
      return;
    }
    this.driftMeterEl.classList.remove('sk3d-hidden');
    const pct = Math.max(0, Math.min(1, charge || 0));
    this.driftFillEl.style.width = `${Math.round(pct * 100)}%`;
    const color = pct < 0.33 ? '#ffffff' : pct < 0.66 ? '#ffd166' : '#ff9f45';
    this.driftFillEl.style.background = color;
    this.driftFillEl.style.boxShadow = `0 0 8px ${color}`;
  }

  /** Toggle the pause overlay. */
  showPause(show) {
    const el = this.root.querySelector('.sk3d-pause');
    if (el) el.classList.toggle('sk3d-hidden', !show);
  }

  /** Clear all HUD state back to defaults. */
  reset() {
    clearTimeout(this.countdownTimer);
    clearTimeout(this.toastTimer);
    this.showPause(false);

    this._pos = null;
    this._lapText = null;
    this._lapPct = null;
    this._timeText = null;

    this.positionEl.className = 'sk3d-chip sk3d-position';
    this.positionEl.textContent = '--';
    this.lapTextEl.textContent = `LAP 1/${CONFIG.game.totalLaps}`;
    this.lapBarFillEl.style.width = '0%';
    this.timeEl.textContent = '0:00.0';

    this.setSpeed(0);
    this.setItem(null);

    this.countdownEl.classList.add('sk3d-hidden');
    this.finishEl.classList.add('sk3d-hidden');
    this.toastEl.classList.add('sk3d-hidden');
  }
}
