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

    // Son + haptique (P6) : le contexte audio ne peut démarrer que depuis un vrai geste utilisateur
    // (politique des navigateurs) — jamais pendant la génération programmatique de l'archipel.
    function wake() { DW.Audio.init(); DW.Audio.startAmbience(); }

    // Sauvegarde (P7) : un monde édité se sauvegarde tout seul (debounce 800ms), sous le nom
    // courant. `currentWorldName`/`currentSeed` suivent le monde affiché à l'écran.
    const WORLD_SEED = 20261006;
    let currentWorldName = DW.Save.DEFAULT_NAME;
    let currentSeed = WORLD_SEED;
    let saveTimer = null;
    function scheduleSave() {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => DW.Save.saveWorld(currentWorldName, world.grid, currentSeed), 800);
    }
    function refreshWorldList() {
      const { names } = DW.Save.listWorlds();
      hud.refreshWorldList(currentWorldName, names);
    }
    // Point d'accroche unique (voir le commentaire sur World.onEdit) : posé avant tout appel à
    // generateWorld()/build(), pour que même la génération initiale de l'archipel déclenche
    // l'autosauvegarde — pas seulement les tap/appui long du joueur.
    world.onEdit = scheduleSave;

    let hud = null;
    DW.Gestures.attach(canvas, {
      onTap(x, y) {
        wake(); hud.dismissHint();
        const c = screenToCell(x, y);
        if (c) { world.build(c.cx, c.cz); DW.Audio.playBuild(); DW.Haptics.tick('build'); }
      },
      onLongPress(x, y) {
        wake(); hud.dismissHint();
        const c = screenToCell(x, y);
        if (c) { world.demolish(c.cx, c.cz); DW.Audio.playDemolish(); DW.Haptics.tick('demolish'); }
      },
      onDragOrbit(dx, dy) { hud.dismissHint(); orbit.orbit(-dx * 0.006, -dy * 0.006); },
      onPan(dx, dy) { orbit.pan(-dx, dy); },
      onZoom(factor) { hud.dismissHint(); orbit.zoom(factor); },
    });

    // Archipel de départ (P3) : plusieurs îlots déterministes plutôt qu'une seule étendue continue.
    function generateWorld(seed) {
      const landCells = DW.Islands.generateArchipelago(seed);
      for (const [x, z] of landCells) world.build(x, z);
      DW.Islands.markSurroundingWater(world.grid, landCells, 3);
    }

    // Reprend le dernier monde ouvert s'il existe ; sinon génère l'archipel de départ et le
    // sauvegarde tout de suite sous son nom par défaut (section 13 du brief : sauvegarde automatique).
    const existing = DW.Save.listWorlds();
    if (existing.current) {
      const loadedSeed = world.loadFromStore(existing.current);
      if (loadedSeed !== null) { currentWorldName = existing.current; currentSeed = loadedSeed; }
      else { generateWorld(WORLD_SEED); DW.Save.saveWorld(currentWorldName, world.grid, currentSeed); }
    } else {
      generateWorld(WORLD_SEED);
      DW.Save.saveWorld(currentWorldName, world.grid, currentSeed);
    }

    // Interface minimale (P5) : indice de premier lancement, réglages, recommencer, mondes (P7).
    // Mode photo (P8) : la barre du bas et ses contrôles sont câblés juste après hud = DW.HUD.init(...).
    let photoMode = false;
    let wasPaused = false;
    const photoTimeInput = document.getElementById('photo-time');
    hud = DW.HUD.init({
      onReset() { world.clear(); generateWorld(currentSeed); scheduleSave(); },
      onPhotoToggle() {
        photoMode = !photoMode;
        document.getElementById('hud-hint').hidden = photoMode;
        document.getElementById('hud-settings').hidden = photoMode;
        document.getElementById('hud-photo').textContent = photoMode ? '✕' : '📷';
        document.getElementById('photo-bar').hidden = !photoMode;
        if (photoMode) {
          photoTimeInput.value = String(dayNight.t);
          wasPaused = dayNight.paused;
          dayNight.paused = true;
        } else {
          dayNight.paused = wasPaused;
          document.getElementById('photo-vignette').hidden = true;
        }
      },
      onNewWorld() {
        const base = window.prompt('Nom du nouveau monde :', 'Nouvelle île');
        if (!base) return;
        currentWorldName = DW.Save.uniqueName(base);
        currentSeed = Date.now() ^ Math.floor(Math.random() * 1e9);
        world.clear();
        generateWorld(currentSeed);
        DW.Save.saveWorld(currentWorldName, world.grid, currentSeed);
        refreshWorldList();
      },
      onSwitchWorld(name) {
        const seed = world.loadFromStore(name);
        if (seed !== null) { currentWorldName = name; currentSeed = seed; }
      },
      onExport() {
        const json = DW.Save.exportWorld(world.grid, currentSeed);
        const blob = new Blob([json], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = currentWorldName.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.driftwick.json';
        a.click();
        URL.revokeObjectURL(a.href);
      },
      onImport(json) {
        try {
          const seed = world.loadFromJSON(json);
          currentWorldName = DW.Save.uniqueName('Monde importé');
          currentSeed = seed;
          DW.Save.saveWorld(currentWorldName, world.grid, currentSeed);
          refreshWorldList();
        } catch (e) { window.alert('Fichier illisible : ce n’est pas une sauvegarde Driftwick valide.'); }
      },
    });
    DW.Audio.setEnabled(hud.settings.sound);
    DW.Haptics.setEnabled(hud.settings.vibration);
    document.getElementById('hud-sound').addEventListener('change', (e) => DW.Audio.setEnabled(e.target.checked));
    document.getElementById('hud-vibration').addEventListener('change', (e) => DW.Haptics.setEnabled(e.target.checked));
    refreshWorldList();

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

    // Mode photo (P8) : curseur d'heure, filtres, capture, partage. Les filtres CSS (`#scene.filter-*`)
    // ne sont là que pour l'aperçu à l'écran — ils n'affectent jamais le buffer WebGL lui-même, donc
    // la capture recompose l'image dans un <canvas> 2D (qui lui supporte `ctx.filter`) pour que le
    // fichier exporté corresponde réellement à ce que le joueur voit, vignette comprise.
    let currentFilter = 'none';
    photoTimeInput.addEventListener('input', () => {
      dayNight.t = parseFloat(photoTimeInput.value);
      applyDayNight();
    });
    document.getElementById('photo-filters').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-filter]');
      if (!btn) return;
      currentFilter = btn.dataset.filter;
      for (const b of document.querySelectorAll('#photo-filters button')) b.classList.toggle('active', b === btn);
      canvas.classList.remove('filter-sepia', 'filter-mono');
      if (currentFilter === 'sepia') canvas.classList.add('filter-sepia');
      if (currentFilter === 'mono') canvas.classList.add('filter-mono');
      document.getElementById('photo-vignette').hidden = currentFilter !== 'vignette';
    });

    const CSS_FILTER = { none: 'none', sepia: 'sepia(0.75) saturate(1.2)', mono: 'grayscale(1) contrast(1.05)', vignette: 'none' };
    function capturePhoto() {
      render(); // garantit un buffer WebGL à jour juste avant de le lire (voir ROADMAP.md)
      const out = document.createElement('canvas');
      out.width = canvas.width; out.height = canvas.height;
      const ctx = out.getContext('2d');
      ctx.filter = CSS_FILTER[currentFilter] || 'none';
      ctx.drawImage(canvas, 0, 0);
      if (currentFilter === 'vignette') {
        ctx.filter = 'none';
        const g = ctx.createRadialGradient(
          out.width / 2, out.height / 2, Math.min(out.width, out.height) * 0.3,
          out.width / 2, out.height / 2, Math.max(out.width, out.height) * 0.7
        );
        g.addColorStop(0, 'rgba(10,8,6,0)'); g.addColorStop(1, 'rgba(10,8,6,0.55)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, out.width, out.height);
      }
      return out;
    }
    document.getElementById('photo-capture').addEventListener('click', () => {
      const out = capturePhoto();
      const a = document.createElement('a');
      a.href = out.toDataURL('image/png');
      a.download = 'driftwick-' + Date.now() + '.png';
      a.click();
      DW.Haptics.tick('build');
    });
    const shareBtn = document.getElementById('photo-share');
    if (navigator.share && navigator.canShare) shareBtn.hidden = false;
    shareBtn.addEventListener('click', async () => {
      const out = capturePhoto();
      out.toBlob(async (blob) => {
        const file = new File([blob], 'driftwick.png', { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          try { await navigator.share({ files: [file], title: 'Driftwick' }); } catch (e) { /* annulé par le joueur */ }
        }
      }, 'image/png');
    });

    let lastFrame = performance.now();
    function tick() {
      const now = performance.now();
      const dt = Math.min(0.1, (now - lastFrame) / 1000);
      lastFrame = now;
      if (!dayNight.paused) { dayNight.t += dt / CYCLE_SECONDS; applyDayNight(); }
      world.update(now);
      render();
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    // Accroche de test : pilotée par tools/smoke.js (headless), sans dépendre de requestAnimationFrame
    // ni d'événements DOM simulés pour vérifier la logique — leçon reprise de l'ancien labo.jeux
    // (rAF gelé dans certains navigateurs embarqués en mode caché).
    window.DW_TEST = {
      world, orbit, camera, screenToCell, render, WORLD_SEED, dayNight, applyDayNight, hud,
      // P9 : expose les statistiques de rendu pour tools/perf.js (appels de dessin, triangles) —
      // sans ça, impossible de mesurer honnêtement le coût d'un maillage par cellule.
      rendererInfo: () => ({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles }),
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
