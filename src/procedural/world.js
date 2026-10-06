/* Relie la grille (données), l'analyse de voisinage et la géométrie à la scène THREE.js.
 * Recalcul local uniquement : éditer une cellule ne reconstruit que son maillage et celui de ses
 * 4 voisines directes (section 14 — jamais toute la ville). Plusieurs maillages par cellule pour
 * l'instant (structure, fenêtres, porte, quai) ; fusion en un seul BufferGeometry par îlot prévue
 * en P9 si le nombre de cellules le justifie (voir analysis/GAME_DESIGN.md §5). */
(function (global) {
  const POP_MS = 220; // durée de l'animation d'apparition (P6 : la construction "sort de l'eau")
  const POP_DROP = 1.4; // de combien une cellule démarre enfoncée avant de remonter à sa place
  function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }

  class World {
    constructor(THREE, scene, materials) {
      this.THREE = THREE;
      this.scene = scene;
      this.materials = materials; // palette : { building, window, door, ... }
      this.grid = new DW.Grid();
      this.meshes = new Map(); // key -> { structure, windows, door, dock, lantern, vegetation } (plusieurs peuvent être null)
      this._bushGeometry = null; // géométrie partagée (primitive THREE simple) : un seul buffer pour tous les buissons
      this._anims = new Map(); // key -> { start, parts: [{mesh, finalY}] } — animations de pose en cours
    }

    _key(cx, cz) { return cx + ',' + cz; }

    _disposeEntry(entry) {
      for (const mesh of [entry.structure, entry.windows, entry.door, entry.dock, entry.lantern, entry.vegetation]) {
        if (!mesh) continue;
        this.scene.remove(mesh);
        if (mesh.geometry !== this._bushGeometry) mesh.geometry.dispose();
      }
    }

    // Enregistre une animation "sort de l'eau" pour les meshes non nuls d'une cellule tout juste
    // (re)construite : on ne touche qu'à position.y (jamais à l'échelle, puisque la géométrie
    // encode déjà des coordonnées absolues — un scale désaxerait tout, voir buildCellGeometry.js).
    _popIn(key, meshes) {
      const parts = meshes.filter(Boolean).map((mesh) => ({ mesh, finalY: mesh.position.y }));
      for (const p of parts) p.mesh.position.y = p.finalY - POP_DROP;
      this._anims.set(key, { start: performance.now(), parts });
    }

    update(now) {
      for (const [key, anim] of this._anims) {
        const t = Math.min(1, (now - anim.start) / POP_MS);
        const e = easeOutCubic(t);
        for (const p of anim.parts) p.mesh.position.y = p.finalY - POP_DROP * (1 - e);
        if (t >= 1) this._anims.delete(key);
      }
    }

    _rebuildCell(cx, cz) {
      const key = this._key(cx, cz);
      const old = this.meshes.get(key);
      if (old) { this._disposeEntry(old); this.meshes.delete(key); }
      this._anims.delete(key);
      const desc = DW.Mesher.cellDescriptor(this.grid, cx, cz);
      if (!desc) return;
      const T = this.THREE, G = DW.Geometry;

      if (desc.kind === 'bridge') {
        const structure = new T.Mesh(G.buildBridgeGeometry(T, desc), this.materials.wood);
        this.scene.add(structure);
        const entry = { structure, windows: null, door: null, dock: null, lantern: null, vegetation: null };
        this.meshes.set(key, entry);
        this._popIn(key, [structure]);
        return;
      }

      const structure = new T.Mesh(G.buildCellGeometry(T, desc), this.materials.building);
      this.scene.add(structure);
      const winGeo = G.buildWindowsGeometry(T, desc);
      const windows = winGeo ? new T.Mesh(winGeo, this.materials.window) : null;
      if (windows) this.scene.add(windows);
      const doorGeo = G.buildDoorGeometry(T, desc);
      const door = doorGeo ? new T.Mesh(doorGeo, this.materials.door) : null;
      if (door) this.scene.add(door);
      const dockGeo = G.buildDockGeometry(T, desc);
      const dock = dockGeo ? new T.Mesh(dockGeo, this.materials.wood) : null;
      if (dock) this.scene.add(dock);
      const lanternGeo = G.buildLanternGeometry(T, desc);
      const lantern = lanternGeo ? new T.Mesh(lanternGeo, this.materials.lantern) : null;
      if (lantern) this.scene.add(lantern);

      let vegetation = null;
      if (desc.roofType === 'flat' && DW.Decoration.hasRooftopVegetation(cx, cz)) {
        if (!this._bushGeometry) this._bushGeometry = new T.ConeGeometry(0.22, 0.4, 6);
        vegetation = new T.Mesh(this._bushGeometry, this.materials.vegetation);
        vegetation.position.set(cx + 0.5, desc.height + 0.2, cz + 0.5);
        this.scene.add(vegetation);
      }

      const entry = { structure, windows, door, dock, lantern, vegetation };
      this.meshes.set(key, entry);
      this._popIn(key, [structure, windows, door, dock, lantern, vegetation]);
    }

    _touch(cx, cz) {
      for (const [x, z] of this.grid.cellsTouching(cx, cz)) this._rebuildCell(x, z);
    }

    build(cx, cz) { this.grid.raise(cx, cz); this._touch(cx, cz); }
    demolish(cx, cz) { this.grid.lower(cx, cz); this._touch(cx, cz); }

    // Repart d'un monde vide (P5 : bouton "Recommencer"). Local et réversible côté joueur au sens
    // où regénérer l'archipel (même graine) redonne exactement le même résultat.
    clear() {
      for (const entry of this.meshes.values()) this._disposeEntry(entry);
      this.meshes.clear();
      this._anims.clear();
      this.grid = new DW.Grid();
    }

    get cellCount() { return this.grid.size; }
    get meshCount() { return this.meshes.size; }
  }

  const ns = (global.DW = global.DW || {});
  ns.World = World;
})(window);
