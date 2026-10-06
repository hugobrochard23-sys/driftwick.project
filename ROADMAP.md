# Feuille de route Driftwick

## Fait (P0 + cœur de P1)

- [x] Grille creuse à hauteur entière par cellule, culling de face par voisinage (`src/core/grid.js`, `src/topology/mesher.js`).
- [x] Génération de géométrie (murs + toit) à partir du descripteur (`src/geometry/buildCellGeometry.js`).
- [x] Monde incrémental : édition = recalcul de la cellule + 4 voisines seulement (`src/procedural/world.js`).
- [x] Caméra orbitale (glisser = orbite, 2 doigts = pan, pincement/molette = zoom) (`src/camera/orbitCamera.js`).
- [x] Gestes unifiés souris + tactile via Pointer Events, tap/appui long/glisser/pincer (`src/input/gestures.js`).
- [x] Palette et éclairage de départ (archipel au crépuscule) (`src/rendering/materials.js`).
- [x] 12 tests unitaires purs (Node, sans navigateur) du moteur procédural (`tests/topology.test.js`).
- [x] Test d'intégration headless (Chrome via Puppeteer) : gestes réels, captures d'écran (`tools/smoke.js`).

## P2 — Génération automatique de bâtiments plus riche

- Toits variés (plat / une pente / deux pentes) choisis selon la silhouette locale.
- Fenêtres et portes placées automatiquement sur les murs visibles (densité selon la hauteur).
- Escaliers extérieurs et balcons quand une marche de hauteur le permet.
- Extension optionnelle "modèle de coins" si le modèle par cellule montre ses limites (voir
  `GAME_DESIGN.md` §2).

## P3 — Plusieurs îles, eau, quais, ponts

- Plusieurs masses d'eau / îles dans un même monde.
- Ponts automatiques entre deux rives proches.
- Quais et pontons en bordure d'eau.

## P4 — Direction artistique complète

- Lanternes qui s'allument au crépuscule, cycle jour/nuit léger.
- Végétation stylisée (quelques variantes, placement contextuel).
- Matériaux et variations de couleur par îlot (évite la monotonie visuelle à grande échelle).

## P5 — UX mobile

- Interface minimale (aucun bouton sauf un réglage et le mode photo).
- Premier lancement : aucun tutoriel long, le geste de construction s'apprend en un tap.

## P6 — Animations, audio, haptique

- Petite animation + son à la pose/démolition, vibration légère.
- Ambiance sonore évolutive (vent, eau, cloches lointaines).

## P7 — Sauvegarde

- Sauvegarde automatique en `localStorage`, plusieurs mondes nommés.
- Export/import d'une construction (JSON de la grille).

## P8 — Mode photo

- Masquer l'interface, régler l'heure/la lumière, filtre, capture, partage.

## P9 — Polish et optimisation mobile

- Profilage sur téléphone réel (voir gabarits de test dans `play-store.project/cold-impact.project`).
- Fusion des maillages par îlot si le nombre de cellules le justifie (voir `GAME_DESIGN.md` §5).
- Passage des matériaux en `FrontSide` une fois la géométrie stabilisée.

## Connu, à ne pas réapprendre

- Le pitch de caméra par défaut doit rester sous `FOV/2` au-dessus de l'angle vers la cible, sinon
  l'horizon sort du cadre dès l'ouverture (corrigé dans `OrbitCamera`, pitch par défaut 0.4 rad).
- `setPointerCapture` échoue sur un `PointerEvent` fabriqué à la main (`dispatchEvent`) — les tests
  de gestes doivent passer par `page.mouse` / `page.touchscreen` de Puppeteer (entrée CDP réelle),
  pas par des événements DOM synthétiques.
- Trois.js r152+ gère la couleur en sRGB/linéaire par défaut : une couleur de matériau éclairée
  paraîtra toujours plus sombre et désaturée que son code hexadécimal brut (le ciel, non éclairé
  via `scene.background`, reste lui exact). Normal, pas un bug — en tenir compte en choisissant
  les couleurs de matériaux plutôt que de chercher à reproduire le hex exact à l'écran.
