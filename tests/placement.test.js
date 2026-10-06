/* Tests du placement décoratif déterministe, purs Node. node tests/placement.test.js */
const assert = require('assert');
const { hash2, hasRooftopVegetation } = require('../src/decoration/placement.js');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('ok -', name); }
  catch (e) { console.error('FAIL -', name, '\n   ', e.message); process.exitCode = 1; }
}

test('hash2 est déterministe', () => {
  assert.strictEqual(hash2(12, -7), hash2(12, -7));
});

test('hash2 reste dans [0,1)', () => {
  for (const [x, z] of [[0, 0], [-100, 50], [999, -999], [1, 2]]) {
    const h = hash2(x, z);
    assert.ok(h >= 0 && h < 1, `hash2(${x},${z}) = ${h}`);
  }
});

test('hasRooftopVegetation est déterministe et varie selon la case', () => {
  const a = hasRooftopVegetation(3, 3), b = hasRooftopVegetation(3, 3);
  assert.strictEqual(a, b);
  // sur un échantillon, pas 100% vrai ni 100% faux (sinon ce n'est pas une variation)
  let trueCount = 0;
  for (let x = 0; x < 50; x++) if (hasRooftopVegetation(x, 0)) trueCount++;
  assert.ok(trueCount > 5 && trueCount < 45, `trop uniforme : ${trueCount}/50`);
});

console.log(passed + ' tests passés');
if (process.exitCode) console.error('ÉCHEC'); else console.log('OK');
