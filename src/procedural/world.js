/* Relie la grille (données), l'analyse de voisinage et la géométrie à la scène THREE.js.
 * Recalcul local uniquement : éditer une cellule ne reconstruit que son maillage et celui de ses
 * 4 voisines directes (section 14 — jamais toute la ville). Un maillage par cellule pour l'instant ;
 * fusion en un seul BufferGeometry par îlot prévue en P2+ si le nombre de cellules le justifie. */
(function (global) {
  class World {
    constructor(THREE, scene, materials) {
      this.THREE = THREE;
      this.scene = scene;
      this.materials = materials; // palette : { building, window, door, ... }
      this.grid = new DW.Grid();
      this.meshes = new Map(); // key -> { structure, windows, door } (windows/door peuvent être null)
    }

    _key(cx, cz) { return cx + ',' + cz; }

    _disposeEntry(entry) {
      for (const mesh of [entry.structure, entry.windows, entry.door]) {
        if (!mesh) continue;
        this.scene.remove(mesh);
        mesh.geometry.dispose();
      }
    }

    _rebuildCell(cx, cz) {
      const key = this._key(cx, cz);
      const old = this.meshes.get(key);
      if (old) { this._disposeEntry(old); this.meshes.delete(key); }
      const desc = DW.Mesher.cellDescriptor(this.grid, cx, cz);
      if (!desc) return;
      const T = this.THREE, G = DW.Geometry;
      const structure = new T.Mesh(G.buildCellGeometry(T, desc), this.materials.building);
      this.scene.add(structure);
      const winGeo = G.buildWindowsGeometry(T, desc);
      const windows = winGeo ? new T.Mesh(winGeo, this.materials.window) : null;
      if (windows) this.scene.add(windows);
      const doorGeo = G.buildDoorGeometry(T, desc);
      const door = doorGeo ? new T.Mesh(doorGeo, this.materials.door) : null;
      if (door) this.scene.add(door);
      this.meshes.set(key, { structure, windows, door });
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
