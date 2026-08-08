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
   */
  constructor({ onSteer, onItem } = {}) {
    this.onSteer = typeof onSteer === 'function' ? onSteer : () => {};
    this.onItem = typeof onItem === 'function' ? onItem : () => {};
    this.steerValue = 0;

    this.root = document.createElement('div');
    this.root.className = 'sk3d-touch sk3d-hidden';
    this.root.innerHTML = `
      <button type="button" class="sk3d-touch-btn sk3d-touch-left" aria-label="Steer left">◀</button>
      <button type="button" class="sk3d-touch-btn sk3d-touch-right" aria-label="Steer right">▶</button>
      <button type="button" class="sk3d-touch-btn sk3d-touch-item" aria-label="Use item">🎁</button>`;

    this.leftBtn = this.root.querySelector('.sk3d-touch-left');
    this.rightBtn = this.root.querySelector('.sk3d-touch-right');
    this.itemBtn = this.root.querySelector('.sk3d-touch-item');

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
    const set = (v) => {
      if (this.steerValue === v) return;
      this.steerValue = v;
      this.onSteer(v);
    };

    button.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (button.setPointerCapture) button.setPointerCapture(e.pointerId);
      button.classList.add('is-active');
      set(value);
    });
    button.addEventListener('pointerup', () => {
      button.classList.remove('is-active');
      set(0);
    });
    button.addEventListener('pointercancel', () => {
      button.classList.remove('is-active');
      set(0);
    });
    button.addEventListener('pointerleave', () => {
      button.classList.remove('is-active');
      set(0);
    });
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
