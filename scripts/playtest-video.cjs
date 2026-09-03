// Playtest ativo: ?demo autopilot, frames sequenciais via CDP screencast no GPU runner
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (error) {
  // O runner GPU mantém Playwright fora do projeto (/opt/pwtest). Resolver o
  // caminho localmente evita depender de NODE_PATH na chamada remota.
  ({ chromium } = require('/opt/pwtest/node_modules/playwright'));
}
const fs = require('fs');
(async () => {
  const url = process.argv[2], outdir = process.argv[3], track = process.argv[4] || '1';
  const viewportName = process.argv[5] || 'desktop';
  const viewport = viewportName === 'mobile' ? { width: 390, height: 844 } : { width: 1280, height: 720 };
  fs.mkdirSync(outdir, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || '/usr/bin/chromium',
    args: ['--use-gl=angle','--use-angle=vulkan','--no-sandbox','--mute-audio','--disable-frame-rate-limit','--disable-gpu-vsync'],
  });
  const ctx = await browser.newContext({ viewport, hasTouch: viewportName === 'mobile', isMobile: false });
  const page = await ctx.newPage();
  await page.addInitScript(() => localStorage.clear());
  await page.goto(url + '/?demo&track=' + track, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(3000);
  const gpu = await page.evaluate(() => { const c = document.createElement('canvas'); const g = c.getContext('webgl2') || c.getContext('webgl'); const ext = g.getExtension('WEBGL_debug_renderer_info'); return ext ? g.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown'; });
  console.log('GPU:', gpu);
  await page.waitForFunction(() => window.__sk3d && window.__sk3d.raceManager && window.__sk3d.raceManager.phase === 'race', null, { timeout: 180000 }).catch(() => console.log('WARN race state timeout'));
  const client = await page.context().newCDPSession(page);
  await client.send('Page.startScreencast', { format: 'jpeg', quality: 60, maxWidth: 1280, maxHeight: 720, everyNthFrame: 6 });
  let n = 0;
  client.on('Page.screencastFrame', (ev) => {
    n++;
    fs.writeFileSync(`${outdir}/frame_${String(n).padStart(4,'0')}.jpg`, Buffer.from(ev.data, 'base64'));
    client.send('Page.screencastFrameAck', { sessionId: ev.sessionId }).catch(()=>{});
  });
  await page.waitForTimeout(60000);
  await client.send('Page.stopScreencast').catch(()=>{});
  const st = await page.evaluate(() => {
    if (!window.__sk3d) return 'no __sk3d';
    const k = window.__sk3d.playerKart;
    return JSON.stringify({ speed: k && k.speed, lap: k && k.lap, phase: window.__sk3d.raceManager && window.__sk3d.raceManager.phase });
  }).catch(e => 'eval fail: ' + e.message);
  console.log('STATE:', st);
  console.log('FRAMES:', n);
  await browser.close();
})();
