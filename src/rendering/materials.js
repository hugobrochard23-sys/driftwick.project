/* Palette Driftwick : archipel au crépuscule, pierre rosée et bois flotté, eau profonde à reflets
 * chauds. Choix volontairement éloignés du bleu/blanc froid de référence du genre (voir
 * analysis/GAME_DESIGN.md, section direction artistique). DoubleSide tant que le sens des faces
 * n'est pas optimisé (voir note dans buildCellGeometry.js) — à resserrer en FrontSide en P2+. */
(function (global) {
  function createPalette(THREE) {
    return {
      sky: new THREE.Color('#f4d9c6'),
      fog: new THREE.Color('#f0c9a8'),
      water: new THREE.Color('#2f7d85'),
      building: new THREE.MeshStandardMaterial({
        color: new THREE.Color('#e3a98b'),
        roughness: 0.9,
        metalness: 0.0,
        side: THREE.DoubleSide,
      }),
      sun: new THREE.Color('#ffd9a0'),
      ambient: new THREE.Color('#6a7fa8'),
    };
  }

  const ns = (global.DW = global.DW || {});
  ns.Materials = { createPalette };
})(window);
