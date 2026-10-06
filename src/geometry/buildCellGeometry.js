/* Traduit un descripteur de cellule (src/topology/mesher.js) en géométrie THREE.js.
 * Une cellule occupe le carré [cx,cx+1] x [cz,cz+1] au sol ; chaque mur est un quad vertical
 * sur un seul côté, chaque toit un quad horizontal au sommet. Matériau en DoubleSide (voir
 * src/rendering/materials.js) pour rester robuste à l'ordre des sommets pendant le prototypage. */
(function (global) {
  function addQuad(positions, normals, indices, v0, v1, v2, v3, n) {
    const base = positions.length / 3;
    for (const v of [v0, v1, v2, v3]) positions.push(v[0], v[1], v[2]);
    for (let i = 0; i < 4; i++) normals.push(n[0], n[1], n[2]);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  function wallQuad(positions, normals, indices, side, cx, cz, yFrom, yTo) {
    let v0, v1, v2, v3, n;
    switch (side) {
      case 'n': n = [0, 0, -1]; v0 = [cx, yFrom, cz]; v1 = [cx + 1, yFrom, cz]; v2 = [cx + 1, yTo, cz]; v3 = [cx, yTo, cz]; break;
      case 's': n = [0, 0, 1]; v0 = [cx + 1, yFrom, cz + 1]; v1 = [cx, yFrom, cz + 1]; v2 = [cx, yTo, cz + 1]; v3 = [cx + 1, yTo, cz + 1]; break;
      case 'e': n = [1, 0, 0]; v0 = [cx + 1, yFrom, cz]; v1 = [cx + 1, yFrom, cz + 1]; v2 = [cx + 1, yTo, cz + 1]; v3 = [cx + 1, yTo, cz]; break;
      case 'w': n = [-1, 0, 0]; v0 = [cx, yFrom, cz + 1]; v1 = [cx, yFrom, cz]; v2 = [cx, yTo, cz]; v3 = [cx, yTo, cz + 1]; break;
      default: return;
    }
    addQuad(positions, normals, indices, v0, v1, v2, v3, n);
  }

  function roofQuad(positions, normals, indices, cx, cz, y) {
    addQuad(positions, normals, indices, [cx, y, cz + 1], [cx + 1, y, cz + 1], [cx + 1, y, cz], [cx, y, cz], [0, 1, 0]);
  }

  function buildCellGeometry(THREE, descriptor) {
    const positions = [], normals = [], indices = [];
    const { cx, cz, height, walls, roof } = descriptor;
    for (const w of walls) wallQuad(positions, normals, indices, w.side, cx, cz, w.from, w.to);
    if (roof) roofQuad(positions, normals, indices, cx, cz, height);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setIndex(indices);
    return geo;
  }

  const ns = (global.DW = global.DW || {});
  ns.Geometry = { buildCellGeometry };
})(window);
