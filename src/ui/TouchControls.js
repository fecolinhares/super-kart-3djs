/**
 * Super Kart 3D.js — mobile touch controls overlay.
 *
 * Pure DOM, appended to document.body, hidden by default.
 * Large left/right steer buttons plus an item button. Only shows on
 * touch devices (coarse pointer or narrow viewport). Pointer events
 * with `touch-action: none` — the page never scrolls or zooms from them.
 */
import './ui.css';

export class TouchControls {
  /**
   * @param {object} opts
   * @param {(v: number) => void} [opts.onSteer] called with -1 | 0 | +1
   * @param {() => void} [opts.onItem]          called when the item button is pressed
   * @param {() => void} [opts.onPause]         called when the pause button is pressed
   * @param {(b: boolean) => void} [opts.onDrift] called on drift button hold/release
   */
  constructor({ onSteer, onItem, onPause, onDrift } = {}) {
    this.onSteer = typeof onSteer === 'function' ? onSteer : () => {};
    this.onItem = typeof onItem === 'function' ? onItem : () => {};
    this.onPause = typeof onPause === 'function' ? onPause : () => {};
    this.onDrift = typeof onDrift === 'function' ? onDrift : () => {};
    this.steerValue = 0;
    this._steerPressed = { left: false, right: false };

    this.root = document.createElement('div');
    this.root.className = 'sk3d-touch sk3d-hidden';
    this.root.innerHTML = `
      <button type="button" class="sk3d-touch-btn sk3d-touch-left" aria-label="Steer left"><span class="sk3d-touch-arrow">◀</span><span class="sk3d-touch-label">LEFT</span></button>
      <button type="button" class="sk3d-touch-btn sk3d-touch-right" aria-label="Steer right"><span class="sk3d-touch-arrow">▶</span><span class="sk3d-touch-label">RIGHT</span></button>
      <button type="button" class="sk3d-touch-btn sk3d-touch-drift" aria-label="Drift (hold)"><span class="sk3d-touch-arrow">🧲</span><span class="sk3d-touch-label">DRIFT</span></button>
      <button type="button" class="sk3d-touch-btn sk3d-touch-item" aria-label="Use item"><span class="sk3d-touch-arrow">🎁</span><span class="sk3d-touch-label">ITEM</span></button>
      <button type="button" class="sk3d-touch-pause" aria-label="Pause"><span>⏸</span></button>`;

    this.leftBtn = this.root.querySelector('.sk3d-touch-left');
    this.rightBtn = this.root.querySelector('.sk3d-touch-right');
    this.driftBtn = this.root.querySelector('.sk3d-touch-drift');
    this.itemBtn = this.root.querySelector('.sk3d-touch-item');
    this.pauseBtn = this.root.querySelector('.sk3d-touch-pause');
    this.pauseBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); this.onPause(); });
    // Drift is hold-to-drift: press = drift on, release = drift off.
    const setDrift = (b) => (e) => { e.preventDefault(); this.onDrift(b); };
    this.driftBtn.addEventListener('pointerdown', setDrift(true));
    this.driftBtn.addEventListener('pointerup', setDrift(false));
    this.driftBtn.addEventListener('pointerleave', setDrift(false));
    this.driftBtn.addEventListener('pointercancel', setDrift(false));

    this.bindSteer(this.leftBtn, -1);
    this.bindSteer(this.rightBtn, 1);
    this.bindItem(this.itemBtn);

    document.body.appendChild(this.root);
  }

  /** @returns {boolean} true when the device likely needs touch controls. */
  isTouchDevice() {
    return (
      (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) ||
      window.innerWidth <= 768
    );
  }

  /** Show only on touch devices (no-op on desktop). */
  show() {
    this.root.classList.toggle('sk3d-hidden', !this.isTouchDevice());
  }

  hide() {
    this.root.classList.add('sk3d-hidden');
  }

  bindSteer(button, value) {
    const side = value < 0 ? 'left' : 'right';
    const update = () => {
      const next = this._steerPressed.left === this._steerPressed.right
        ? 0
        : this._steerPressed.left ? -1 : 1;
      if (this.steerValue === next) return;
      this.steerValue = next;
      this.onSteer(next);
    };

    button.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (button.setPointerCapture) button.setPointerCapture(e.pointerId);
      this._steerPressed[side] = true;
      button.classList.add('is-active');
      update();
    });
    const release = () => {
      this._steerPressed[side] = false;
      button.classList.remove('is-active');
      update();
    };
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('pointerleave', release);
    button.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  bindItem(button) {
    button.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      button.classList.add('is-active');
      this.onItem();
    });
    button.addEventListener('pointerup', () => {
      button.classList.remove('is-active');
    });
    button.addEventListener('pointercancel', () => {
      button.classList.remove('is-active');
    });
    button.addEventListener('contextmenu', (e) => e.preventDefault());
  }
}
