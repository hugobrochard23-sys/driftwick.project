/* Tests du cycle jour/nuit, purs Node. node tests/dayNight.test.js */
const assert = require('assert');
const { compute, DEFAULT_KEYFRAMES } = require('../src/rendering/dayNight.js');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('ok -', name); }
  catch (e) { console.error('FAIL -', name, '\n   ', e.message); process.exitCode = 1; }
}

test('continuité du cycle : t=0 et t=1 donnent le même résultat', () => {
  const a = compute(0), b = compute(1);
  assert.deepStrictEqual(a, b);
});

test('exactement sur un instant-clé : résultat identique à la clé (pas d’interpolation parasite)', () => {
  const dusk = DEFAULT_KEYFRAMES.find((k) => k.t === 0.55);
  const r = compute(0.55);
  assert.deepStrictEqual(r.sky, dusk.sky);
  assert.strictEqual(r.nightFactor, dusk.nightFactor);
});

test('la nuit est bien plus sombre et plus "night" que le jour', () => {
  const day = compute(0.3), night = compute(0.85);
  assert.ok(night.nightFactor > day.nightFactor);
  assert.ok(night.sunIntensity < day.sunIntensity);
  const brightness = (c) => c[0] + c[1] + c[2];
  assert.ok(brightness(night.sky) < brightness(day.sky));
});

test('interpolation à mi-chemin entre deux instants-clés', () => {
  const k0 = DEFAULT_KEYFRAMES[0], k1 = DEFAULT_KEYFRAMES[1];
  const mid = k0.t + (k1.t - k0.t) / 2;
  const r = compute(mid);
  const expected = (k0.nightFactor + k1.nightFactor) / 2;
  assert.ok(Math.abs(r.nightFactor - expected) < 1e-9);
});

console.log(passed + ' tests passés');
if (process.exitCode) console.error('ÉCHEC'); else console.log('OK');
