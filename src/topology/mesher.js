/* Analyse de voisinage pure (aucune dépendance 3D) : pour une cellule donnée, décide quels murs
 * sont visibles et où. Règle : un mur apparaît sur le côté S, de la hauteur du voisin jusqu'à la
 * hauteur propre, uniquement si le voisin est plus bas (culling de face façon voxel : si le voisin
 * est aussi haut ou plus haut, il masque/possède déjà cette frontière). Le toit est toujours posé
 * au sommet puisque rien ne peut exister au-dessus dans ce modèle à une seule colonne par cellule.
 * UMD-lite : même fichier utilisable en <script> (DW.Mesher) et en require() Node (tests). */
(function (global) {
  const SIDES = ['n', 's', 'e', 'w'];

  function cellDescriptor(grid, cx, cz) {
    const h = grid.get(cx, cz);
    if (h <= 0) return null;
    const nb = grid.neighbors4(cx, cz);
    const walls = [];
    for (const side of SIDES) {
      const nh = nb[side];
      if (nh < h) walls.push({ side, from: nh, to: h });
    }
    return { cx, cz, height: h, walls, roof: true };
  }

  const ns = (global.DW = global.DW || {});
  ns.Mesher = { cellDescriptor, SIDES };
  if (typeof module !== 'undefined' && module.exports) module.exports = { cellDescriptor, SIDES };
})(typeof window !== 'undefined' ? window : globalThis);
