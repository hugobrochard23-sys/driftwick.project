/* Tests de la sérialisation de sauvegarde, purs Node. node tests/save.test.js */
const assert = require('assert');
const { Grid } = require('../src/core/grid.js');
const { serializeGrid, applyGrid } = require('../src/save/save.js');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('ok -', name); }
  catch (e) { console.error('FAIL -', name, '\n   ', e.message); process.exitCode = 1; }
}

test('aller-retour grille -> sérialisation -> grille identique', () => {
  const g = new Grid();
  g.set(0, 0, 1); g.set(2, 3, 5); g.set(-4, 7, 2);
  g.markWater(10, 10); g.markWater(-1, -1);
  const data = serializeGrid(g);
  const g2 = new Grid();
  applyGrid(g2, data);
  assert.strictEqual(g2.get(0, 0), 1);
  assert.strictEqual(g2.get(2, 3), 5);
  assert.strictEqual(g2.get(-4, 7), 2);
  assert.strictEqual(g2.size, g.size);
  assert.ok(g2.isWater(10, 10));
  assert.ok(g2.isWater(-1, -1));
  assert.ok(!g2.isWater(0, 0));
});

test('applyGrid efface l’état précédent avant de restaurer', () => {
  const g = new Grid();
  g.set(99, 99, 3); // présent avant restauration
  const data = serializeGrid(new Grid()); // grille vide à restaurer
  applyGrid(g, data);
  assert.strictEqual(g.get(99, 99), 0, 'l’ancien état doit disparaître, pas s’additionner');
});

test('sérialisation JSON-compatible (round-trip via JSON.stringify/parse)', () => {
  const g = new Grid();
  g.set(1, 1, 4);
  const data = JSON.parse(JSON.stringify(serializeGrid(g)));
  const g2 = new Grid();
  applyGrid(g2, data);
  assert.strictEqual(g2.get(1, 1), 4);
});

console.log(passed + ' tests passés');
if (process.exitCode) console.error('ÉCHEC'); else console.log('OK');
