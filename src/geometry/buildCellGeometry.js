/* Traduit un descripteur de cellule (src/topology/mesher.js) en géométrie THREE.js.
 * Une cellule occupe le carré [cx,cx+1] x [cz,cz+1] au sol. P2 : silhouette automatique enrichie —
 * mur plein / mur en marches (stepped) / toit plat / toit à deux pans (hip) — pilotée entièrement
 * par les champs du descripteur, sans toucher au reste du pipeline (section "pipeline procédural",
 * analysis/GAME_DESIGN.md §3). Matériau en DoubleSide (voir materials.js) : les normales sont
 * calculées par produit vectoriel (toujours correctes), le double-face reste une marge de sécurité
 * bon marché tant que la géométrie évolue encore. */
(function (global) {
  const TREAD_DEPTH = 0.3; // profondeur d'une marche d'escalier extérieur (fraction de la cellule)
  const RIDGE_HEIGHT = 0.6; // hauteur du faîtage au-dessus du sommet des murs, toit à deux pans

  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function normalize(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }

  // Normale calculée par produit vectoriel (v1-v0)x(v2-v0) : jamais besoin de la deviner à la main,
  // et toujours correcte tant que v0,v1,v2,v3 sont donnés dans le même sens (voir chaque appelant).
  function addQuad(positions, normals, indices, v0, v1, v2, v3) {
    const n = normalize(cross(sub(v1, v0), sub(v2, v0)));
    const base = positions.length / 3;
    for (const v of [v0, v1, v2, v3]) positions.push(v[0], v[1], v[2]);
    for (let i = 0; i < 4; i++) normals.push(n[0], n[1], n[2]);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  function addTri(positions, normals, indices, v0, v1, v2) {
    const n = normalize(cross(sub(v1, v0), sub(v2, v0)));
    const base = positions.length / 3;
    for (const v of [v0, v1, v2]) positions.push(v[0], v[1], v[2]);
    for (let i = 0; i < 3; i++) normals.push(n[0], n[1], n[2]);
    indices.push(base, base + 1, base + 2);
  }

  // Repère paramétrique par côté : u parcourt la largeur du mur (0..1), d s'enfonce vers
  // l'intérieur de la cellule (0 = à l'aplomb de la cellule voisine, d>0 = en retrait, pour les
  // marches d'escalier). Évite de dupliquer la logique géométrique pour les 4 côtés.
  function sidePos(side, cx, cz, u, d, y) {
    switch (side) {
      case 'n': return [cx + u, y, cz + d];
      case 's': return [cx + 1 - u, y, cz + 1 - d];
      case 'e': return [cx + 1 - d, y, cz + u];
      case 'w': return [cx + d, y, cz + 1 - u];
      default: return [cx, y, cz];
    }
  }

  function flatWall(positions, normals, indices, side, cx, cz, yFrom, yTo) {
    const v0 = sidePos(side, cx, cz, 0, 0, yFrom);
    const v1 = sidePos(side, cx, cz, 1, 0, yFrom);
    const v2 = sidePos(side, cx, cz, 1, 0, yTo);
    const v3 = sidePos(side, cx, cz, 0, 0, yTo);
    addQuad(positions, normals, indices, v0, v1, v2, v3);
  }

  // Mur "en marches" : une volée de petits paliers (contremarche + giron) au lieu d'un pan plein,
  // pour lire "ce bâtiment prend appui sur son voisin plus bas" (section 7 du brief : escaliers
  // automatiques). Le dernier giron est omis : le toit couvre déjà cette bande (évite un
  // chevauchement de polygones coplanaires à la même hauteur).
  function steppedWall(positions, normals, indices, side, cx, cz, yFrom, yTo) {
    const steps = Math.round(yTo - yFrom);
    for (let i = 0; i < steps; i++) {
      const y0 = yFrom + i, y1 = y0 + 1, d = i * TREAD_DEPTH, dNext = d + TREAD_DEPTH;
      // contremarche verticale, en retrait de d
      addQuad(
        positions, normals, indices,
        sidePos(side, cx, cz, 0, d, y0), sidePos(side, cx, cz, 1, d, y0),
        sidePos(side, cx, cz, 1, d, y1), sidePos(side, cx, cz, 0, d, y1)
      );
      if (i < steps - 1) {
        // giron horizontal du palier
        addQuad(
          positions, normals, indices,
          sidePos(side, cx, cz, 0, d, y1), sidePos(side, cx, cz, 1, d, y1),
          sidePos(side, cx, cz, 1, dNext, y1), sidePos(side, cx, cz, 0, dNext, y1)
        );
      }
    }
  }

  function flatRoof(positions, normals, indices, cx, cz, y) {
    addQuad(positions, normals, indices, [cx, y, cz + 1], [cx + 1, y, cz + 1], [cx + 1, y, cz], [cx, y, cz]);
  }

  // Toit à deux pans (gable) : faîtage selon l'axe X, à mi-profondeur de la cellule. Pas un vrai
  // "hip" à 4 pans (plus simple à générer et à tester), mais lit clairement comme "toit pentu"
  // par opposition au toit plat — suffisant pour la silhouette recherchée (voir GAME_DESIGN.md §2).
  function hipRoof(positions, normals, indices, cx, cz, y) {
    const ridgeY = y + RIDGE_HEIGHT, midZ = cz + 0.5;
    const nw = [cx, y, cz], ne = [cx + 1, y, cz];
    const sw = [cx, y, cz + 1], se = [cx + 1, y, cz + 1];
    const rw = [cx, ridgeY, midZ], re = [cx + 1, ridgeY, midZ];
    addQuad(positions, normals, indices, nw, ne, re, rw); // pan nord
    addQuad(positions, normals, indices, se, sw, rw, re); // pan sud
    addTri(positions, normals, indices, nw, rw, sw); // pignon ouest
    addTri(positions, normals, indices, ne, se, re); // pignon est
  }

  function buildCellGeometry(THREE, descriptor) {
    const positions = [], normals = [], indices = [];
    const { cx, cz, height, walls, roofType } = descriptor;
    for (const w of walls) {
      if (w.stepped) steppedWall(positions, normals, indices, w.side, cx, cz, w.from, w.to);
      else flatWall(positions, normals, indices, w.side, cx, cz, w.from, w.to);
    }
    if (roofType === 'hip') hipRoof(positions, normals, indices, cx, cz, height);
    else flatRoof(positions, normals, indices, cx, cz, height);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setIndex(indices);
    return geo;
  }

  // Panneau plat en légère saillie sur un mur (porte ou fenêtre) : centré en largeur, borné en
  // hauteur dans l'intervalle [yFrom,yTo] du mur porteur. `d` doit être légèrement NÉGATIF (vers
  // l'extérieur) — le mur n'a pas d'épaisseur, donc un panneau en retrait (d>0) se retrouverait
  // géométriquement derrière lui et serait masqué par le test de profondeur (bug trouvé par
  // capture d'écran : un panneau à d=+0.03 était invisible de face, voir ROADMAP.md).
  function inset(positions, normals, indices, side, cx, cz, yFrom, yTo, u0, u1, d) {
    addQuad(
      positions, normals, indices,
      sidePos(side, cx, cz, u0, d, yFrom), sidePos(side, cx, cz, u1, d, yFrom),
      sidePos(side, cx, cz, u1, d, yTo), sidePos(side, cx, cz, u0, d, yTo)
    );
  }

  // Porte : un seul panneau, au sol, sur le mur retenu par le mesher (`doorSide`). Toujours
  // présente puisque toute cellule construite touche le sol par au moins un côté dans ce modèle.
  function buildDoorGeometry(THREE, descriptor) {
    if (!descriptor.doorSide) return null;
    const positions = [], normals = [], indices = [];
    inset(positions, normals, indices, descriptor.doorSide, descriptor.cx, descriptor.cz, 0, 0.8, 0.32, 0.68, -0.02);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setIndex(indices);
    return geo;
  }

  // Fenêtres : une par étage au-dessus du rez-de-chaussée de chaque mur plein (pas sur les murs en
  // marches, qui restent lisibles comme un escalier plutôt qu'une façade). Un mur d'un seul niveau
  // (rez-de-chaussée uniquement) n'en reçoit aucune — cohérent avec une porte qui suffit à elle seule.
  function buildWindowsGeometry(THREE, descriptor) {
    const positions = [], normals = [], indices = [];
    const { cx, cz, walls } = descriptor;
    for (const w of walls) {
      if (w.stepped) continue;
      for (let level = w.from + 1; level < w.to; level++) {
        inset(positions, normals, indices, w.side, cx, cz, level + 0.15, level + 0.75, 0.35, 0.65, -0.02);
      }
    }
    if (!positions.length) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setIndex(indices);
    return geo;
  }

  const ns = (global.DW = global.DW || {});
  ns.Geometry = { buildCellGeometry, buildDoorGeometry, buildWindowsGeometry };
})(window);
