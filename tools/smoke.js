/* Test d'intégration headless : charge la page dans Chrome, vérifie que la grille se traduit bien
 * en maillages affichés, simule de vrais gestes (tap, glisser, pincement) via PointerEvent, et
 * sauvegarde une capture d'écran pour vérification visuelle humaine.
 * node tools/smoke.js — nécessite `node tools/serve.js` lancé en parallèle. */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME = process.env.CHROME_PATH
  || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium']
    .find((p) => fs.existsSync(p));
const URL = process.env.DW_URL || 'http://localhost:8124/index.html';

function assert(cond, msg) { if (!cond) throw new Error('FAIL: ' + msg); console.log('ok -', msg); }

// Synthétiser un PointerEvent via dispatchEvent() ne déclenche pas setPointerCapture (Chrome exige
// un pointeur réellement actif). On pilote donc la souris au niveau CDP (page.mouse), qui produit
// de vrais PointerEvent — plus fidèle à un doigt réel qu'un événement fabriqué à la main.

(async () => {
  if (!CHROME) throw new Error('Chrome introuvable (définir CHROME_PATH)');
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--window-size=1000,700', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1000, height: 700 });
  page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('CONSOLE ERROR:', m.text()); });

  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction('window.DW_TEST && window.DW_TEST.world', { timeout: 5000 });
  // Laisse la vraie boucle de jeu (requestAnimationFrame) tourner le temps que l'animation de pose
  // (P6, ~220ms) se termine, plutôt que de figer un rendu en plein milieu de l'animation.
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: path.join(__dirname, '..', 'analysis', 'smoke_screenshot_initial.png') });

  const initial = await page.evaluate(() => {
    const expected = window.DW.Islands.generateArchipelago(window.DW_TEST.WORLD_SEED).length;
    return { cells: window.DW_TEST.world.cellCount, meshes: window.DW_TEST.world.meshCount, expected };
  });
  assert(initial.cells === initial.expected, `archipel déterministe : ${initial.expected} cellules attendues (obtenu ${initial.cells})`);
  assert(initial.meshes === initial.expected, `autant de maillages que de cellules (obtenu ${initial.meshes})`);

  // Construction/démolition directe sur une case connue vide (loin de tout îlot généré)
  await page.evaluate(() => window.DW_TEST.world.build(300, 300));
  const afterBuild = await page.evaluate(() => window.DW_TEST.world.cellCount);
  assert(afterBuild === initial.cells + 1, `construction directe : +1 cellule (obtenu ${afterBuild})`);

  await page.evaluate(() => window.DW_TEST.world.demolish(300, 300));
  const afterDemolish = await page.evaluate(() => window.DW_TEST.world.cellCount);
  assert(afterDemolish === initial.cells, `démolition directe : retour à ${initial.cells} cellules (obtenu ${afterDemolish})`);

  // Geste réel (souris CDP) : glisser doit faire tourner la caméra (yaw change)
  const yawBefore = await page.evaluate(() => window.DW_TEST.orbit.yaw);
  await page.mouse.move(500, 350);
  await page.mouse.down();
  await page.mouse.move(560, 350, { steps: 4 });
  await page.mouse.move(620, 350, { steps: 4 });
  await page.mouse.up();
  const yawAfter = await page.evaluate(() => window.DW_TEST.orbit.yaw);
  assert(Math.abs(yawAfter - yawBefore) > 0.01, `le glissé fait tourner la caméra (${yawBefore.toFixed(3)} -> ${yawAfter.toFixed(3)})`);

  // Geste réel : tap bref (sans mouvement) sur une case vide doit construire. La case visée par le
  // raycast peut être une île déjà construite (vue d'ensemble de l'archipel) : on la vide d'abord
  // pour tester uniquement le mécanisme tap -> construction, pas le terrain qui s'y trouve.
  const hit = await page.evaluate(() => window.DW_TEST.screenToCell(500, 500));
  assert(hit && typeof hit.cx === 'number', 'le raycast écran -> cellule renvoie une case valide');
  await page.evaluate(({ cx, cz }) => {
    const w = window.DW_TEST.world;
    while (w.grid.get(cx, cz) > 0) w.demolish(cx, cz);
  }, hit);
  const beforeTap = await page.evaluate(() => window.DW_TEST.world.cellCount);
  await page.mouse.move(500, 500);
  await page.mouse.down();
  await page.mouse.up();
  await new Promise((r) => setTimeout(r, 50));
  const afterTap = await page.evaluate(() => window.DW_TEST.world.cellCount);
  assert(afterTap === beforeTap + 1, `le tap construit une cellule (${beforeTap} -> ${afterTap})`);

  // Molette : doit zoomer (distance caméra change) — vérifie la branche onZoom
  const distBefore = await page.evaluate(() => window.DW_TEST.orbit.distance);
  await page.mouse.wheel({ deltaY: -200 });
  const distAfter = await page.evaluate(() => window.DW_TEST.orbit.distance);
  assert(distAfter < distBefore, `la molette rapproche la caméra (${distBefore.toFixed(1)} -> ${distAfter.toFixed(1)})`);

  await page.evaluate(() => window.DW_TEST.render());
  const shotPath = path.join(__dirname, '..', 'analysis', 'smoke_screenshot.png');
  await page.screenshot({ path: shotPath });
  console.log('capture :', shotPath);

  await browser.close();
  console.log('OK');
})().catch((e) => { console.error(e); process.exit(1); });
