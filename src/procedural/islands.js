/* Génération du terrain de départ : plusieurs îlots séparés par de l'eau plutôt qu'une seule
 * étendue continue (différenciation directe vis-à-vis des critiques connues de Townscaper — un
 * seul monde continu qui finit par lasser, voir analysis/TOWNSCAPER_RESEARCH.md §4/§6). Pur
 * (aucune dépendance 3D, aucun THREE) : testable en Node, UMD-lite comme le reste du moteur.
 * Déterministe : une même graine produit toujours le même archipel. */
(function (global) {
  // PRNG seedé minuscule (mulberry32, domaine public) : suffisant pour de la génération de contenu,
  // pas pour de la cryptographie — on ne cherche qu'un aléa reproductible d'une graine.
  function mulberry32(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Fait pousser un îlot organique par accrétion aléatoire : à chaque étape, on part d'une cellule
  // déjà posée (choisie au hasard parmi celles déjà là) et on tente d'y accoler un voisin direct.
  // Produit une forme irrégulière connexe plutôt qu'un carré ou un cercle parfait.
  function growBlob(rng, cx, cz, size) {
    const key = (x, z) => x + ',' + z;
    const seen = new Set([key(cx, cz)]);
    const list = [[cx, cz]];
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const maxAttempts = size * 50; // garde-fou : évite une boucle longue si le blob se retrouve cerné
    let attempts = 0;
    while (list.length < size && attempts < maxAttempts) {
      attempts++;
      const [bx, bz] = list[Math.floor(rng() * list.length)];
      const [dx, dz] = dirs[Math.floor(rng() * 4)];
      const nx = bx + dx, nz = bz + dz, k = key(nx, nz);
      if (!seen.has(k)) { seen.add(k); list.push([nx, nz]); }
    }
    return list;
  }

  // Archipel de départ : quelques îlots espacés. Les coordonnées/tailles sont fixes (pas tirées
  // au hasard) pour que la disposition d'ensemble reste lisible ; seule la forme de chaque îlot varie
  // avec la graine.
  const ISLAND_SPECS = [
    { cx: 0, cz: 0, size: 26 },
    { cx: 10, cz: 3, size: 16 },
    { cx: 4, cz: -9, size: 12 },
  ];

  function generateArchipelago(seed) {
    const rng = mulberry32(seed);
    const land = [];
    for (const spec of ISLAND_SPECS) land.push(...growBlob(rng, spec.cx, spec.cz, spec.size));
    return land;
  }

  // Marque en eau toute case vide d'une zone rectangulaire autour du terrain généré (avec une
  // marge), pour que la détection de pont (mesher.js) sache distinguer "vraie eau" de "pas encore
  // construit". `grid` doit déjà contenir les cellules de terre (via world.build) avant cet appel :
  // on ne marque que ce qui est encore à 0.
  function markSurroundingWater(grid, landCells, padding) {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const [x, z] of landCells) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
    for (let x = minX - padding; x <= maxX + padding; x++) {
      for (let z = minZ - padding; z <= maxZ + padding; z++) {
        if (grid.get(x, z) === 0) grid.markWater(x, z);
      }
    }
  }

  const ns = (global.DW = global.DW || {});
  ns.Islands = { mulberry32, growBlob, generateArchipelago, markSurroundingWater, ISLAND_SPECS };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { mulberry32, growBlob, generateArchipelago, markSurroundingWater, ISLAND_SPECS };
  }
})(typeof window !== 'undefined' ? window : globalThis);
