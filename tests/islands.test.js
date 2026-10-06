/* Tests de la génération d'archipel, purs Node. node tests/islands.test.js */
const assert = require('assert');
const { Grid } = require('../src/core/grid.js');
const { mulberry32, growBlob, generateArchipelago, markSurroundingWater } = require('../src/procedural/islands.js');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('ok -', name); }
  catch (e) { console.error('FAIL -', name, '\n   ', e.message); process.exitCode = 1; }
}

test('mulberry32 est déterministe : même graine, même suite', () => {
  const a = mulberry32(42), b = mulberry32(42);
  const seqA = [a(), a(), a()], seqB = [b(), b(), b()];
  assert.deepStrictEqual(seqA, seqB);
});

test('growBlob produit une taille proche de la cible et des cellules connexes', () => {
  const rng = mulberry32(7);
  const blob = growBlob(rng, 0, 0, 20);
  assert.ok(blob.length >= 15, `au moins 15 cellules obtenues (obtenu ${blob.length})`);
  const seen = new Set(blob.map(([x, z]) => x + ',' + z));
  // connexité : chaque cellule après la première doit toucher au moins une cellule déjà présente
  // au moment de son ajout n'est pas vérifiable a posteriori simplement ; on vérifie plutôt qu'au
  // moins une cellule voisine directe existe dans l'ensemble final (condition nécessaire, pas suffisante,
  // mais suffisante pour détecter un blob qui aurait "téléporté" des cellules isolées).
  for (const [x, z] of blob) {
    if (x === 0 && z === 0) continue;
    const hasNeighbor = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => seen.has((x + dx) + ',' + (z + dz)));
    assert.ok(hasNeighbor, `cellule (${x},${z}) sans voisin dans le blob`);
  }
});

test('generateArchipelago est déterministe (même graine → même terrain)', () => {
  const a = generateArchipelago(1234).map(([x, z]) => x + ',' + z).sort();
  const b = generateArchipelago(1234).map(([x, z]) => x + ',' + z).sort();
  assert.deepStrictEqual(a, b);
});

test('markSurroundingWater ne marque que les cases vides autour du terrain', () => {
  const g = new Grid();
  const land = [[0, 0], [1, 0]];
  for (const [x, z] of land) g.set(x, z, 1);
  markSurroundingWater(g, land, 2);
  assert.ok(g.isWater(3, 0), 'une case vide dans la marge est marquée eau');
  assert.ok(!g.isWater(0, 0), 'une case construite n’est jamais marquée eau');
  assert.ok(!g.isWater(100, 100), 'loin de la marge : jamais marqué');
});

console.log(passed + ' tests passés');
if (process.exitCode) console.error('ÉCHEC'); else console.log('OK');
