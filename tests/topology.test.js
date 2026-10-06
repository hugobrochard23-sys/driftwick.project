/* Tests du moteur procédural (grille + analyse de voisinage), purs Node, sans navigateur.
 * node tests/topology.test.js — doit afficher "OK" et sortir avec le code 0. */
const assert = require('assert');
const { Grid } = require('../src/core/grid.js');
const { cellDescriptor } = require('../src/topology/mesher.js');

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('ok -', name);
  } catch (e) {
    console.error('FAIL -', name, '\n   ', e.message);
    process.exitCode = 1;
  }
}

function wallSides(desc) {
  return desc.walls.map((w) => w.side).sort().join('');
}

test('cellule isolée : 4 murs, toit, pic (toit à deux pans), porte au sol', () => {
  const g = new Grid();
  g.set(0, 0, 1);
  const d = cellDescriptor(g, 0, 0);
  assert.strictEqual(d.height, 1);
  assert.strictEqual(wallSides(d), 'ensw');
  assert.strictEqual(d.roof, true);
  assert.strictEqual(d.roofType, 'hip');
  assert.strictEqual(d.doorSide, 'n'); // premier côté dans l'ordre N,S,E,W, déterministe
  assert.ok(d.walls.every((w) => w.grounded && !w.stepped));
});

test('grande construction plate : toit plat (pas un pic isolé)', () => {
  const g = new Grid();
  const N = 10;
  for (let x = 0; x < N; x++) for (let z = 0; z < N; z++) g.set(x, z, 1);
  assert.strictEqual(cellDescriptor(g, 5, 5).roofType, 'flat'); // intérieur : voisins à la même hauteur
  assert.strictEqual(cellDescriptor(g, 0, 0).roofType, 'flat'); // bord : au moins un voisin intérieur à la même hauteur
});

test('mur posé sur un voisin plus bas (mais pas au sol) : en marches si l’écart est petit', () => {
  const g = new Grid();
  g.set(0, 0, 1); g.set(1, 0, 3); // voisin w de (1,0) à 1, écart de 2 → en escalier
  const d = cellDescriptor(g, 1, 0);
  const w = d.walls.find((x) => x.side === 'w');
  assert.ok(w && !w.grounded && w.stepped);
  assert.strictEqual(d.roofType, 'hip'); // tous les voisins sont plus bas : pic isolé malgré l'escalier sur un côté
});

test('écart trop grand entre voisins : mur plein, pas de marches', () => {
  const g = new Grid();
  g.set(0, 0, 1); g.set(1, 0, 5); // écart de 4 > STEP_MAX_SPAN
  const w = cellDescriptor(g, 1, 0).walls.find((x) => x.side === 'w');
  assert.ok(w && !w.grounded && !w.stepped);
});

test('cellule vide : pas de descripteur', () => {
  const g = new Grid();
  assert.strictEqual(cellDescriptor(g, 5, 5), null);
});

test('deux cellules adjacentes même hauteur : le mur partagé disparaît', () => {
  const g = new Grid();
  g.set(0, 0, 1);
  g.set(1, 0, 1);
  const a = cellDescriptor(g, 0, 0);
  const b = cellDescriptor(g, 1, 0);
  assert.strictEqual(wallSides(a), 'nsw'); // son côté e (vers (1,0)) a disparu, w reste (terrain vide à l'ouest)
  assert.strictEqual(wallSides(b), 'ens'); // son côté w (vers (0,0)) a disparu, e reste (terrain vide à l'est)
});

test('ligne de 3 cellules : la cellule du milieu a 2 murs', () => {
  const g = new Grid();
  g.set(0, 0, 1); g.set(1, 0, 1); g.set(2, 0, 1);
  const mid = cellDescriptor(g, 1, 0);
  assert.strictEqual(wallSides(mid), 'ns');
});

test('carré 2x2 : chaque cellule garde 2 murs extérieurs (coin)', () => {
  const g = new Grid();
  for (const [x, z] of [[0, 0], [1, 0], [0, 1], [1, 1]]) g.set(x, z, 1);
  const d = cellDescriptor(g, 0, 0);
  assert.strictEqual(d.walls.length, 2);
  assert.strictEqual(wallSides(d), 'nw');
});

test('colonne haute : hauteur conservée, murs pleine hauteur', () => {
  const g = new Grid();
  g.set(0, 0, 5);
  const d = cellDescriptor(g, 0, 0);
  assert.strictEqual(d.height, 5);
  for (const w of d.walls) { assert.strictEqual(w.from, 0); assert.strictEqual(w.to, 5); }
});

test('hauteur plafonnée à MAX_HEIGHT même après de nombreuses élévations', () => {
  const g = new Grid();
  for (let i = 0; i < 100; i++) g.raise(0, 0);
  assert.strictEqual(g.get(0, 0), Grid.MAX_HEIGHT);
});

test('escalier : la marche basse n’a pas de mur vers la marche haute, la marche haute si', () => {
  const g = new Grid();
  g.set(0, 0, 1); g.set(1, 0, 2); g.set(2, 0, 3);
  const low = cellDescriptor(g, 0, 0);
  const mid = cellDescriptor(g, 1, 0);
  assert.ok(!low.walls.some((w) => w.side === 'e'), 'la marche basse ne doit pas avoir de mur côté voisin plus haut');
  const wallToLow = mid.walls.find((w) => w.side === 'w');
  assert.ok(wallToLow, 'la marche du milieu doit avoir un mur partiel vers la marche basse');
  assert.deepStrictEqual([wallToLow.from, wallToLow.to], [1, 2]);
  assert.ok(!mid.walls.some((w) => w.side === 'e'), 'la marche du milieu est masquée par la marche haute voisine');
});

test('suppression au milieu d’une ligne : les voisins regagnent leur mur', () => {
  const g = new Grid();
  g.set(0, 0, 1); g.set(1, 0, 1); g.set(2, 0, 1);
  g.set(1, 0, 0); // suppression de la cellule centrale
  const left = cellDescriptor(g, 0, 0);
  const right = cellDescriptor(g, 2, 0);
  assert.strictEqual(wallSides(left), 'ensw');
  assert.strictEqual(wallSides(right), 'ensw');
  assert.strictEqual(cellDescriptor(g, 1, 0), null);
});

test('suppression d’une cellule périphérique du carré 2x2', () => {
  const g = new Grid();
  for (const [x, z] of [[0, 0], [1, 0], [0, 1], [1, 1]]) g.set(x, z, 1);
  g.set(1, 1, 0); // coin bas-droit supprimé
  const a = cellDescriptor(g, 0, 0); // inchangé : ne touche pas (1,1)
  const b = cellDescriptor(g, 1, 0); // voisin sud de (1,1)
  const c = cellDescriptor(g, 0, 1); // voisin est de (1,1)
  assert.strictEqual(wallSides(a), 'nw');
  assert.ok(b.walls.some((w) => w.side === 's'));
  assert.ok(c.walls.some((w) => w.side === 'e'));
});

test('très grande construction : les murs n’apparaissent qu’en périphérie', () => {
  const g = new Grid();
  const N = 30;
  for (let x = 0; x < N; x++) for (let z = 0; z < N; z++) g.set(x, z, 1);
  let totalWalls = 0;
  for (let x = 0; x < N; x++) for (let z = 0; z < N; z++) totalWalls += cellDescriptor(g, x, z).walls.length;
  assert.strictEqual(totalWalls, 4 * N); // seul le périmètre a un mur par côté exposé
  // cellule intérieure : zéro mur
  assert.strictEqual(cellDescriptor(g, 15, 15).walls.length, 0);
});

test('reconstruction après suppression : état identique à l’original', () => {
  const g = new Grid();
  g.set(2, 2, 3);
  const before = JSON.stringify(cellDescriptor(g, 2, 2));
  g.set(2, 2, 0);
  g.set(2, 2, 3);
  const after = JSON.stringify(cellDescriptor(g, 2, 2));
  assert.strictEqual(before, after);
});

console.log(passed + ' tests passés');
if (process.exitCode) {
  console.error('ÉCHEC');
} else {
  console.log('OK');
}
