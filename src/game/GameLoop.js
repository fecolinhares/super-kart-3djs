/**
 * Super Kart 3D.js — requestAnimationFrame loop with clamped delta.
 * Headless/software WebGL can run at ~1-2 fps; the dt clamp keeps
 * physics stable (slow motion instead of explosion) — same pattern
 * validated in Match-3D.js.
 */
export class GameLoop {
  constructor() {
    this.running = false;
    this.rafId = 0;
    this.last = 0;
    this.updateFn = null;
    this.elapsed = 0;
  }

  start(updateFn) {
    this.updateFn = updateFn;
    this.running = true;
    this.last = performance.now();
    const tick = (now) => {
      if (!this.running) return;
      const raw = (now - this.last) / 1000;
      this.last = now;
      const dt = Math.min(raw, 0.05);
      this.elapsed += dt;
      this.updateFn(dt, this.elapsed);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }
}
