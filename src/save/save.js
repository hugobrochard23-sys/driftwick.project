/* Sérialisation d'un monde (grille + eau + graine) et gestion de plusieurs mondes nommés dans
 * localStorage. `serializeGrid`/`applyGrid` sont pures (ne touchent qu'à l'objet Grid passé en
 * paramètre, testables en Node avec la vraie classe Grid) ; le reste touche localStorage et vit
 * uniquement dans le navigateur. */
(function (global) {
  function serializeGrid(grid) {
    const heights = [];
    for (const [key, h] of grid.heights) {
      const [cx, cz] = key.split(',').map(Number);
      heights.push([cx, cz, h]);
    }
    const water = [];
    for (const key of grid.water) {
      const [cx, cz] = key.split(',').map(Number);
      water.push([cx, cz]);
    }
    return { heights, water };
  }

  function applyGrid(grid, data) {
    grid.heights.clear();
    grid.water.clear();
    for (const [cx, cz, h] of data.heights || []) grid.set(cx, cz, h);
    for (const [cx, cz] of data.water || []) grid.markWater(cx, cz);
  }

  const STORAGE_KEY = 'driftwick.worlds';
  const DEFAULT_NAME = 'Île principale';

  function loadStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* localStorage indisponible ou corrompu : on repart d'un store vide */ }
    return { current: null, slots: {} };
  }

  function saveStore(store) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch (e) { /* tant pis, pas bloquant */ }
  }

  function listWorlds() {
    const store = loadStore();
    return { current: store.current, names: Object.keys(store.slots) };
  }

  function saveWorld(name, grid, seed) {
    const store = loadStore();
    store.slots[name] = { seed, savedAt: Date.now(), ...serializeGrid(grid) };
    store.current = name;
    saveStore(store);
  }

  function loadWorld(name, grid) {
    const store = loadStore();
    const data = store.slots[name];
    if (!data) return null;
    applyGrid(grid, data);
    store.current = name;
    saveStore(store);
    return data.seed;
  }

  function deleteWorld(name) {
    const store = loadStore();
    delete store.slots[name];
    if (store.current === name) store.current = Object.keys(store.slots)[0] || null;
    saveStore(store);
  }

  function uniqueName(base) {
    const { names } = listWorlds();
    if (!names.includes(base)) return base;
    let i = 2;
    while (names.includes(base + ' ' + i)) i++;
    return base + ' ' + i;
  }

  function exportWorld(grid, seed) {
    return JSON.stringify({ seed, ...serializeGrid(grid) }, null, 0);
  }

  function importWorld(grid, json) {
    const data = JSON.parse(json);
    applyGrid(grid, data);
    return data.seed;
  }

  const ns = (global.DW = global.DW || {});
  ns.Save = {
    serializeGrid, applyGrid, listWorlds, saveWorld, loadWorld, deleteWorld,
    uniqueName, exportWorld, importWorld, DEFAULT_NAME,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = { serializeGrid, applyGrid };
})(typeof window !== 'undefined' ? window : globalThis);
