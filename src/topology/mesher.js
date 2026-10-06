/* Analyse de voisinage pure (aucune dépendance 3D) : pour une cellule donnée, décide quels murs
 * sont visibles et où. Règle : un mur apparaît sur le côté S, de la hauteur du voisin jusqu'à la
 * hauteur propre, uniquement si le voisin est plus bas (culling de face façon voxel : si le voisin
 * est aussi haut ou plus haut, il masque/possède déjà cette frontière).
 *
 * P2 : chaque mur porte deux indices qui pilotent sa forme (src/geometry/buildCellGeometry.js) :
 *  - `grounded` (from === 0) : le mur part du sol/de l'eau → c'est un mur de façade normal,
 *    candidat à recevoir la porte.
 *  - `stepped`  (from > 0, petit écart) : le mur part du toit d'un voisin plus bas → silhouette
 *    en marches plutôt qu'un pan vertical plein, pour lire visuellement "cet immeuble prend appui
 *    sur son voisin" (l'équivalent structurel d'un escalier extérieur).
 * Le toit est `hip` (à deux pans) seulement si la cellule dépasse ses 4 voisins de tous les côtés
 * (un vrai sommet isolé) ; sinon `flat` (terrasse/plateau, cohérent avec un voisin aussi haut ou
 * plus haut juste à côté). La porte est posée sur le premier mur `grounded` trouvé (ordre N,S,E,W :
 * déterministe, donc stable d'une reconstruction à l'autre — vérifié par les tests).
 *
 * P3 — pont : une cellule de hauteur 1 dont les deux voisins opposés (N/S ou E/W) sont construits
 * ET dont la paire perpendiculaire est de l'EAU EXPLICITEMENT MARQUÉE (`grid.isWater`, posée une
 * fois par la génération d'archipel) devient un pont plutôt qu'un bâtiment. Le test sur l'eau
 * explicite est essentiel : géométriquement, le milieu d'une rangée de 3 maisons accolées a
 * exactement la même signature de voisinage (deux voisins bâtis opposés, les deux autres à 0) —
 * sans ce test, toute rangée plate se transformerait en pont. L'eau, elle, ne devient jamais un
 * bâtiment normal par ailleurs, donc aucune ambiguïté inverse.
 * UMD-lite : même fichier utilisable en <script> (DW.Mesher) et en require() Node (tests). */
(function (global) {
  const SIDES = ['n', 's', 'e', 'w'];
  const STEP_MAX_SPAN = 2; // au-delà, un mur "posé en hauteur" reste un pan plein (trop haut pour lire comme des marches)

  function bridgeAxis(grid, cx, cz, nb) {
    if (nb.n > 0 && nb.s > 0 && grid.isWater(cx + 1, cz) && grid.isWater(cx - 1, cz)) return 'ns';
    if (nb.e > 0 && nb.w > 0 && grid.isWater(cx, cz - 1) && grid.isWater(cx, cz + 1)) return 'ew';
    return null;
  }

  function cellDescriptor(grid, cx, cz) {
    const h = grid.get(cx, cz);
    if (h <= 0) return null;
    const nb = grid.neighbors4(cx, cz);

    if (h === 1) {
      const axis = bridgeAxis(grid, cx, cz, nb);
      if (axis) return { cx, cz, height: h, kind: 'bridge', axis };
    }

    const walls = [];
    let isPeak = true;
    for (const side of SIDES) {
      const nh = nb[side];
      if (nh >= h) isPeak = false;
      if (nh < h) {
        const grounded = nh === 0;
        const stepped = !grounded && (h - nh) <= STEP_MAX_SPAN;
        walls.push({ side, from: nh, to: h, grounded, stepped });
      }
    }
    const doorWall = walls.find((w) => w.grounded) || null;
    return {
      cx, cz, height: h, walls, roof: true, kind: 'building',
      roofType: isPeak ? 'hip' : 'flat',
      doorSide: doorWall ? doorWall.side : null,
    };
  }

  const ns = (global.DW = global.DW || {});
  ns.Mesher = { cellDescriptor, SIDES, STEP_MAX_SPAN };
  if (typeof module !== 'undefined' && module.exports) module.exports = { cellDescriptor, SIDES, STEP_MAX_SPAN };
})(typeof window !== 'undefined' ? window : globalThis);
