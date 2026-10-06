/* Cycle jour/nuit : interpolation cyclique entre quelques instants-clés (couleur du ciel, de la
 * brume, du soleil, intensités, et un `nightFactor` 0..1 qui pilote tout ce qui doit s'allumer la
 * nuit — fenêtres, lanternes, lueur de l'eau — sans que ces systèmes aient besoin de connaître
 * l'heure elle-même). Pur (aucune dépendance THREE) : testable en Node, UMD-lite comme le reste du
 * moteur. L'application aux objets THREE (scene.background, matériaux...) vit dans game.js, qui
 * consomme juste le résultat de `compute`. */
(function (global) {
  // t=0 confondu avec t=1 (cycle). Le crépuscule (t=0.55) reprend exactement la palette d'origine
  // du jeu (analysis/GAME_DESIGN.md §4) : c'est l'identité visuelle par défaut, le jour et la nuit
  // en sont des variations, pas l'inverse.
  const DEFAULT_KEYFRAMES = [
    { t: 0.00, sky: [246, 226, 207], fog: [244, 214, 189], sun: [255, 224, 173], sunIntensity: 1.6, hemiIntensity: 1.3, nightFactor: 0.1 }, // aube
    { t: 0.30, sky: [251, 233, 218], fog: [248, 221, 196], sun: [255, 230, 190], sunIntensity: 2.2, hemiIntensity: 1.6, nightFactor: 0.0 }, // jour
    { t: 0.55, sky: [244, 217, 198], fog: [240, 201, 168], sun: [255, 217, 160], sunIntensity: 2.0, hemiIntensity: 1.6, nightFactor: 0.3 }, // crépuscule (identité par défaut)
    { t: 0.70, sky: [90, 75, 110], fog: [80, 70, 110], sun: [255, 170, 120], sunIntensity: 0.8, hemiIntensity: 0.8, nightFactor: 0.75 }, // tombée de la nuit
    { t: 0.85, sky: [27, 34, 64], fog: [30, 38, 70], sun: [140, 150, 210], sunIntensity: 0.18, hemiIntensity: 0.5, nightFactor: 1.0 }, // nuit
  ];

  function lerp(a, b, alpha) { return a + (b - a) * alpha; }
  function lerpArr(a, b, alpha) { return a.map((v, i) => lerp(v, b[i], alpha)); }

  function compute(t, keyframes) {
    keyframes = keyframes || DEFAULT_KEYFRAMES;
    t = ((t % 1) + 1) % 1;
    const n = keyframes.length;
    let prevIdx = 0;
    for (let i = 0; i < n; i++) if (keyframes[i].t <= t) prevIdx = i;
    const nextIdx = (prevIdx + 1) % n;
    const prev = keyframes[prevIdx], next = keyframes[nextIdx];
    let span = next.t - prev.t; if (span <= 0) span += 1;
    let local = t - prev.t; if (local < 0) local += 1;
    const alpha = span > 0 ? local / span : 0;
    return {
      sky: lerpArr(prev.sky, next.sky, alpha),
      fog: lerpArr(prev.fog, next.fog, alpha),
      sun: lerpArr(prev.sun, next.sun, alpha),
      sunIntensity: lerp(prev.sunIntensity, next.sunIntensity, alpha),
      hemiIntensity: lerp(prev.hemiIntensity, next.hemiIntensity, alpha),
      nightFactor: lerp(prev.nightFactor, next.nightFactor, alpha),
    };
  }

  const ns = (global.DW = global.DW || {});
  ns.DayNight = { compute, DEFAULT_KEYFRAMES };
  if (typeof module !== 'undefined' && module.exports) module.exports = { compute, DEFAULT_KEYFRAMES };
})(typeof window !== 'undefined' ? window : globalThis);
