/* Relie la grille (données), l'analyse de voisinage et la géométrie à la scène THREE.js.
 * Recalcul local uniquement : éditer une cellule ne reconstruit que son maillage et celui de ses
 * 4 voisines directes (section 14 — jamais toute la ville). Un maillage par cellule pour l'instant ;
 * fusion en un seul BufferGeometry par îlot prévue en P2+ si le nombre de cellules le justifie. */
(function (global) {
  class World {
    constructor(THREE, scene, material) {
      this.THREE = THREE;
      this.scene = scene;
      this.material = material;
      this.grid = new DW.Grid();
      this.meshes = new Map();
    }

    _key(cx, cz) { return cx + ',' + cz; }

    _rebuildCell(cx, cz) {
      const key = this._key(cx, cz);
      const old = this.meshes.get(key);
      if (old) { this.scene.remove(old); old.geometry.dispose(); this.meshes.delete(key); }
      const desc = DW.Mesher.cellDescriptor(this.grid, cx, cz);
      if (!desc) return;
      const geo = DW.Geometry.buildCellGeometry(this.THREE, desc);
      const mesh = new this.THREE.Mesh(geo, this.material);
      this.scene.add(mesh);
      this.meshes.set(key, mesh);
    }

    _touch(cx, cz) {
      for (const [x, z] of this.grid.cellsTouching(cx, cz)) this._rebuildCell(x, z);
    }

    build(cx, cz) { this.grid.raise(cx, cz); this._touch(cx, cz); }
    demolish(cx, cz) { this.grid.lower(cx, cz); this._touch(cx, cz); }

    get cellCount() { return this.grid.size; }
    get meshCount() { return this.meshes.size; }
  }

  const ns = (global.DW = global.DW || {});
  ns.World = World;
})(window);
