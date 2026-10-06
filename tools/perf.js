/* Mesure de performance (P9) : construit une grande ville, chronomètre la génération et le rendu,
 * compte les appels de dessin réels (renderer.info). Sert à décider honnêtement si la fusion de
 * maillages par îlot est nécessaire maintenant ou si elle peut attendre (voir ROADMAP.md).
 * node tools/perf.js — nécessite `node tools/serve.js` lancé en parallèle. */
const fs = require('fs');
const puppeteer = require('puppeteer-core');

const CHROME = process.env.CHROME_PATH
  || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium']
    .find((p) => fs.existsSync(p));
const URL = process.env.DW_URL || 'http://localhost:8124/index.html';
const N = parseInt(process.argv[2] || '2000', 10); // nombre de cellules à construire

(async () => {
  if (!CHROME) throw new Error('Chrome introuvable (définir CHROME_PATH)');
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--window-size=1000,700', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1000, height: 700 });
  page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));

  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction('window.DW_TEST && window.DW_TEST.world', { timeout: 5000 });

  const result = await page.evaluate((N) => {
    const w = window.DW_TEST.world;
    w.clear();
    // Carré compact plutôt qu'un archipel (pire cas : un seul gros îlot, beaucoup de murs internes
    // nuls mais beaucoup de toits/sommets quand même) — majoré volontairement par rapport à un usage réel.
    const side = Math.ceil(Math.sqrt(N));
    const t0 = performance.now();
    let built = 0;
    for (let x = 0; x < side && built < N; x++) {
      for (let z = 0; z < side && built < N; z++) { w.build(1000 + x, 1000 + z); built++; }
    }
    const buildMs = performance.now() - t0;

    // Cadre la caméra sur la construction : sans ça, le frustum culling de THREE.js exclurait tout
    // (la ville de test est loin de la vue de départ) et la mesure de rendu ne mesurerait rien.
    const o = window.DW_TEST.orbit;
    o.target.x = 1000 + side / 2; o.target.z = 1000 + side / 2;
    o.distance = side * 1.3; o.pitch = 0.6; o._apply();

    const r0 = performance.now();
    for (let i = 0; i < 30; i++) window.DW_TEST.render();
    const renderMs = (performance.now() - r0) / 30;

    return {
      built, buildMs, renderMsPerFrame: renderMs,
      meshCount: w.meshCount,
    };
  }, N);

  const rendererInfo = await page.evaluate(() => {
    // renderer n'est pas exposé dans DW_TEST ; on le retrouve via le canvas THREE attache un contexte WebGL,
    // mais le plus simple est de lire les stats que l'on expose nous-mêmes si disponibles.
    return window.DW_TEST.rendererInfo ? window.DW_TEST.rendererInfo() : null;
  });

  console.log('--- Mesure de performance Driftwick ---');
  console.log('Cellules construites :', result.built);
  console.log('Temps total de construction :', result.buildMs.toFixed(1), 'ms soit', (result.buildMs / result.built).toFixed(3), 'ms/cellule');
  console.log('Temps de rendu moyen par image :', result.renderMsPerFrame.toFixed(2), 'ms (', (1000 / result.renderMsPerFrame).toFixed(0), 'im/s max théorique)');
  console.log('Maillages actifs (meshCount) :', result.meshCount);
  if (rendererInfo) console.log('Appels de dessin (draw calls) :', rendererInfo.calls, '| triangles :', rendererInfo.triangles);

  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
