/**
 * First-paint boot surface. It gives slow WebGL builds a deliberate state and
 * leaves a readable failure surface if module initialization throws.
 */
export function createBootOverlay() {
  let root = document.getElementById('sk3d-boot');
  if (!root) {
    root = document.createElement('div');
    root.id = 'sk3d-boot';
    root.innerHTML = '<div class="sk3d-boot-card"><div class="sk3d-boot-logo">SUPER <span>KART</span></div><div class="sk3d-boot-bar"><i></i></div><div class="sk3d-boot-step" aria-live="polite">starting renderer</div></div>';
    const style = document.createElement('style');
    style.textContent = `
      #sk3d-boot{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;background:radial-gradient(120% 90% at 50% 8%,#4cc9f0 0%,#a8e6ff 46%,#4cc9f0 100%);color:#1b2a41;transition:opacity .45s ease;font-family:system-ui,-apple-system,sans-serif;pointer-events:auto}
      #sk3d-boot.done{opacity:0;pointer-events:none}
      .sk3d-boot-card{display:flex;flex-direction:column;align-items:center;gap:24px;width:min(82vw,420px)}
      .sk3d-boot-logo{font-weight:950;letter-spacing:.16em;font-size:clamp(30px,8vw,72px);line-height:.9;text-align:center;background:linear-gradient(#fff,#ffd166 55%,#ff5a5f);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 4px 12px rgba(255,255,255,0.4))}
      .sk3d-boot-logo span{display:block;font-size:.48em;letter-spacing:.48em;margin-left:.48em}
      .sk3d-boot-bar{height:5px;width:100%;border-radius:99px;overflow:hidden;background:rgba(255,255,255,0.3)}
      .sk3d-boot-bar i{display:block;width:0;height:100%;border-radius:inherit;background:linear-gradient(90deg,#4cc9f0,#ffd166);box-shadow:0 0 14px #4cc9f0aa;transition:width .25s ease}
      .sk3d-boot-step{min-height:1.2em;color:#1b2a41aa;font-size:12px;letter-spacing:.22em;text-transform:uppercase;text-align:center}
      @media(prefers-reduced-motion:reduce){#sk3d-boot,.sk3d-boot-bar i{transition:none}}
    `;
    document.head.appendChild(style);
    document.body.appendChild(root);
  }
  const bar = root.querySelector('.sk3d-boot-bar i');
  const step = root.querySelector('.sk3d-boot-step');
  window.addEventListener('error', (event) => {
    if (!root.classList.contains('done')) {
      if (step) step.textContent = 'boot error — reload to retry';
      console.error('[boot]', event.error || event.message);
    }
  }, { once: false });
  return {
    setStage(label, progress) {
      if (step) step.textContent = label;
      if (bar) bar.style.width = `${Math.max(0, Math.min(1, progress)) * 100}%`;
    },
    complete() {
      if (window.__boothold) return; // visual QA: freeze overlay, caller releases
      if (bar) bar.style.width = '100%';
      if (step) step.textContent = 'ready';
      requestAnimationFrame(() => root.classList.add('done'));
      setTimeout(() => root.remove(), 600);
    },
    release() { window.__boothold = null; root.remove(); },
    fail(message) {
      if (step) step.textContent = message || 'graphics unavailable — reload to retry';
      root.classList.remove('done');
    },
  };
}
