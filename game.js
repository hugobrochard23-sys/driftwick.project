/* Point d'entrée Driftwick — Prototype 0/1 : grille, construction/démolition au doigt,
 * caméra orbitale, analyse de voisinage automatique. Scripts classiques (pas de bundler,
 * fonctionne en file:// comme les autres projets du Bureau). */
(function () {
  function start() {
    const THREE = window.THREE;
    const canvas = document.getElementById('scene');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const palette = DW.Materials.createPalette(THREE);
    const scene = new THREE.Scene();
    scene.background = palette.sky;
    scene.fog = new THREE.Fog(palette.fog, 30, 90);

    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500);
    const orbit = new DW.OrbitCamera(camera, { x: 4, y: 0, z: -2 });
    orbit.distance = 34;
    orbit.pitch = 0.5;
    orbit._apply();

    const hemi = new THREE.HemisphereLight(palette.sun, palette.ambient, 1.6);
    scene.add(hemi);
    const sunLight = new THREE.DirectionalLight(palette.sun, 2.0);
    sunLight.position.set(12, 18, 6);
    scene.add(sunLight);
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));

    const waterGeo = new THREE.PlaneGeometry(400, 400);
    const waterMat = new THREE.MeshStandardMaterial({
      color: palette.water, roughness: 0.35, metalness: 0.1,
      emissive: new THREE.Color('#2ad6c9'), emissiveIntensity: 0,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -0.05;
    scene.add(water);

    const world = new DW.World(THREE, scene, palette);

    function resize() {
      const w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize);
    resize();

    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const raycaster = new THREE.Raycaster();
    function screenToCell(x, y) {
      const ndc = new THREE.Vector2((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hit = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(groundPlane, hit)) return null;
      return { cx: Math.floor(hit.x), cz: Math.floor(hit.z) };
    }

    DW.Gestures.attach(canvas, {
      onTap(x, y) { const c = screenToCell(x, y); if (c) world.build(c.cx, c.cz); },
      onLongPress(x, y) { const c = screenToCell(x, y); if (c) world.demolish(c.cx, c.cz); },
      onDragOrbit(dx, dy) { orbit.orbit(-dx * 0.006, -dy * 0.006); },
      onPan(dx, dy) { orbit.pan(-dx, dy); },
      onZoom(factor) { orbit.zoom(factor); },
    });

    // Archipel de départ (P3) : plusieurs îlots déterministes plutôt qu'une seule étendue continue.
    const WORLD_SEED = 20261006;
    const landCells = DW.Islands.generateArchipelago(WORLD_SEED);
    for (const [x, z] of landCells) world.build(x, z);
    DW.Islands.markSurroundingWater(world.grid, landCells, 3);

    // Cycle jour/nuit (P4) : un tour complet dure CYCLE_SECONDS, démarre au crépuscule (identité
    // visuelle par défaut du jeu, voir src/rendering/dayNight.js). `paused` et `dayNight.t` sont
    // exposés dans DW_TEST pour que le mode photo (P8) puisse figer/choisir l'heure plus tard.
    const CYCLE_SECONDS = 240;
    const dayNight = { t: 0.55, paused: false };
    const tmpColor = new THREE.Color();
    function setColorRGB(c, rgb) { c.setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255); }

    function applyDayNight() {
      const s = DW.DayNight.compute(dayNight.t);
      setColorRGB(scene.background, s.sky);
      setColorRGB(scene.fog.color, s.fog);
      setColorRGB(sunLight.color, s.sun);
      sunLight.intensity = s.sunIntensity;
      hemi.intensity = s.hemiIntensity;
      palette.window.emissiveIntensity = s.nightFactor;
      palette.lantern.emissiveIntensity = s.nightFactor * 1.4;
      waterMat.emissiveIntensity = s.nightFactor * 0.5;
    }
    applyDayNight();

    function render() { renderer.render(scene, camera); }
    let lastFrame = performance.now();
    function tick() {
      const now = performance.now();
      const dt = Math.min(0.1, (now - lastFrame) / 1000);
      lastFrame = now;
      if (!dayNight.paused) { dayNight.t += dt / CYCLE_SECONDS; applyDayNight(); }
      render();
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    // Accroche de test : pilotée par tools/smoke.js (headless), sans dépendre de requestAnimationFrame
    // ni d'événements DOM simulés pour vérifier la logique — leçon reprise de l'ancien labo.jeux
    // (rAF gelé dans certains navigateurs embarqués en mode caché).
    window.DW_TEST = { world, orbit, camera, screenToCell, render, WORLD_SEED, dayNight, applyDayNight };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
