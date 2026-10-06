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
      // emissive à 0 pour l'instant (P2) : le cycle jour/nuit de P4 fera varier emissiveIntensity
      // pour simuler une fenêtre allumée au crépuscule, sans changer la géométrie ni ce matériau.
      window: new THREE.MeshStandardMaterial({
        color: new THREE.Color('#fff1c2'),
        emissive: new THREE.Color('#ffcf7a'),
        emissiveIntensity: 0,
        roughness: 0.4,
        side: THREE.DoubleSide,
      }),
      door: new THREE.MeshStandardMaterial({
        color: new THREE.Color('#5b3a29'),
        roughness: 0.85,
        side: THREE.DoubleSide,
      }),
      // Bois flotté : ponts et quais (P3) — plus clair que la porte, légèrement grisé par l'eau.
      wood: new THREE.MeshStandardMaterial({
        color: new THREE.Color('#9c7a5c'),
        roughness: 0.8,
        side: THREE.DoubleSide,
      }),
      sun: new THREE.Color('#ffd9a0'),
      ambient: new THREE.Color('#6a7fa8'),
    };
  }

  const ns = (global.DW = global.DW || {});
  ns.Materials = { createPalette };
})(window);
