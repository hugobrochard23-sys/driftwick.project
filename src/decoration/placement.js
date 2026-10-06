/* Placement déterministe d'éléments décoratifs (végétation pour l'instant) : une case donnée a
 * toujours la même décision, sans tirage aléatoire à chaque rechargement — c'est un hachage, pas un
 * générateur aléatoire. Pur, UMD-lite, testable en Node comme le reste du moteur. */
(function (global) {
  // Hachage entier rapide (pas cryptographique) : déterministe, bien distribué pour un usage
  // cosmétique (décider si une case a un buisson, pas pour de la sécurité).
  function hash2(x, z) {
    let h = (x * 374761393 + z * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  // Végétation sur les toits plats (terrasses) : environ une cellule sur trois, jamais sur un toit
  // à deux pans (pas de surface plane pour la poser).
  function hasRooftopVegetation(cx, cz) {
    return hash2(cx, cz) < 0.35;
  }

  const ns = (global.DW = global.DW || {});
  ns.Decoration = { hash2, hasRooftopVegetation };
  if (typeof module !== 'undefined' && module.exports) module.exports = { hash2, hasRooftopVegetation };
})(typeof window !== 'undefined' ? window : globalThis);
