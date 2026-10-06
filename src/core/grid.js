/* Grille creuse de hauteurs entières par cellule carrée (cx,cz). 0 = vide/eau.
 * Format UMD-lite : chargeable en <script> classique dans le navigateur (global DW.Grid)
 * et en require() direct depuis Node pour les tests unitaires du moteur, sans bundler. */
(function (global) {
  const MAX_HEIGHT = 24;

  class Grid {
    constructor() {
      this.heights = new Map();
    }

    static key(cx, cz) {
      return cx + ',' + cz;
    }

    get(cx, cz) {
      return this.heights.get(Grid.key(cx, cz)) || 0;
    }

    set(cx, cz, h) {
      h = Math.max(0, Math.min(h, MAX_HEIGHT));
      const k = Grid.key(cx, cz);
      if (h <= 0) this.heights.delete(k);
      else this.heights.set(k, h);
      return h;
    }

    raise(cx, cz) {
      return this.set(cx, cz, this.get(cx, cz) + 1);
    }

    lower(cx, cz) {
      return this.set(cx, cz, this.get(cx, cz) - 1);
    }

    neighbors4(cx, cz) {
      return {
        n: this.get(cx, cz - 1),
        s: this.get(cx, cz + 1),
        e: this.get(cx + 1, cz),
        w: this.get(cx - 1, cz),
      };
    }

    // Cellules dont le rendu dépend de (cx,cz) : elle-même + ses 4 voisines directes.
    // Sert à ne recalculer que ce qui a réellement changé après une édition (section 14 : recalcul local).
    cellsTouching(cx, cz) {
      return [
        [cx, cz],
        [cx, cz - 1],
        [cx, cz + 1],
        [cx + 1, cz],
        [cx - 1, cz],
      ];
    }

    get size() {
      return this.heights.size;
    }
  }

  Grid.MAX_HEIGHT = MAX_HEIGHT;

  const ns = (global.DW = global.DW || {});
  ns.Grid = Grid;
  if (typeof module !== 'undefined' && module.exports) module.exports = { Grid };
})(typeof window !== 'undefined' ? window : globalThis);
