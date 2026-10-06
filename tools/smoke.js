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

  await page.evaluate(() => window.DW_TEST.render());
  await page.screenshot({ path: path.join(__dirname, '..', 'analysis', 'smoke_screenshot_initial.png') });

  const initial = await page.evaluate(() => ({
    cells: window.DW_TEST.world.cellCount,
    meshes: window.DW_TEST.world.meshCount,
  }));
  assert(initial.cells === 5, `5 cellules distinctes de départ (obtenu ${initial.cells})`);
  assert(initial.meshes === 5, `5 maillages affichés au départ (obtenu ${initial.meshes})`);

  // Tap sur une cellule vide connue de la caméra de départ (via l'API directe, le raycast est testé séparément ci-dessous)
  await page.evaluate(() => window.DW_TEST.world.build(5, 5));
  const afterBuild = await page.evaluate(() => window.DW_TEST.world.cellCount);
  assert(afterBuild === 6, `construction directe : 6 cellules (obtenu ${afterBuild})`);

  await page.evaluate(() => window.DW_TEST.world.demolish(5, 5));
  const afterDemolish = await page.evaluate(() => window.DW_TEST.world.cellCount);
  assert(afterDemolish === 5, `démolition directe : retour à 5 cellules (obtenu ${afterDemolish})`);

  // Geste réel (souris CDP) : glisser doit faire tourner la caméra (yaw change)
  const yawBefore = await page.evaluate(() => window.DW_TEST.orbit.yaw);
  await page.mouse.move(500, 350);
  await page.mouse.down();
  await page.mouse.move(560, 350, { steps: 4 });
  await page.mouse.move(620, 350, { steps: 4 });
  await page.mouse.up();
  const yawAfter = await page.evaluate(() => window.DW_TEST.orbit.yaw);
  assert(Math.abs(yawAfter - yawBefore) > 0.01, `le glissé fait tourner la caméra (${yawBefore.toFixed(3)} -> ${yawAfter.toFixed(3)})`);

  // Geste réel : tap bref (sans mouvement) sur une case vide doit construire
  const beforeTap = await page.evaluate(() => window.DW_TEST.world.cellCount);
  const hit = await page.evaluate(() => window.DW_TEST.screenToCell(500, 500));
  assert(hit && typeof hit.cx === 'number', 'le raycast écran -> cellule renvoie une case valide');
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
