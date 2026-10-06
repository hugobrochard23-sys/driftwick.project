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

## P2 — Génération automatique de bâtiments plus riche (fait)

- [x] Toit à deux pans (hip simplifié, faîtage selon X) si la cellule dépasse ses 4 voisins (pic isolé), toit plat sinon.
- [x] Porte automatique sur le premier mur au sol (`doorSide`), fenêtres automatiques par étage au-dessus (`src/geometry/buildCellGeometry.js`).
- [x] Murs "en marches" (escalier extérieur) quand un mur repose sur un voisin plus bas de 1-2 niveaux (`stepped`).
- Extension optionnelle "modèle de coins" (arches, silhouettes non rectangulaires) non faite — le
  modèle par cellule suffit pour l'instant (voir `GAME_DESIGN.md` §2).

## P3 — Plusieurs îles, eau, quais, ponts (fait)

- [x] Archipel de départ déterministe, 3 îlots organiques (`src/procedural/islands.js`, accrétion aléatoire seedée).
- [x] Eau marquée explicitement (`grid.markWater`) pour distinguer "vraie eau" de "pas encore construit" — nécessaire à la détection de pont (voir "Connu" ci-dessous).
- [x] Pont automatique : une case vide entre deux rives, avec de l'eau marquée perpendiculairement, devient un tablier de bois + garde-corps au lieu d'un bâtiment (`buildBridgeGeometry`).
- [x] Quai automatique : tout mur de rez-de-chaussée d'un bâtiment d'un seul étage donnant sur du vide reçoit un ponton (`buildDockGeometry`) — vérifié visuellement (`analysis/p3_pont_et_quais.png`).
- [x] 4 tests unitaires du générateur d'îlots + 3 tests de détection de pont (dont la non-régression "rangée de maisons ≠ pont").

## P4 — Direction artistique complète (fait)

- [x] Cycle jour/nuit (`src/rendering/dayNight.js`, pur et testable) : aube/jour/crépuscule/tombée de nuit/nuit, interpolation cyclique, le crépuscule reste l'identité par défaut.
- [x] Lanternes au-dessus de chaque porte, intensité émissive pilotée par `nightFactor` — un seul matériau partagé, une seule affectation par image pour toutes les lanternes.
- [x] Fenêtres qui s'allument la nuit (même mécanisme, matériau déjà posé en P2).
- [x] Eau légèrement bioluminescente la nuit (emissive sur le matériau de l'eau, piloté par `nightFactor`).
- [x] Végétation stylisée sur les toits plats (placement déterministe par hachage, `src/decoration/placement.js`), jamais sur un toit à deux pans.
- [x] 7 tests unitaires supplémentaires (cycle jour/nuit, hachage de placement), vérifié visuellement aux trois moments du cycle (`analysis/p4_cycle_jour_nuit.png`).
- Non fait : variations de couleur par îlot (un seul jeu de teintes pour l'instant) — reporté, pas
  jugé prioritaire tant que le nombre d'îlots reste petit.

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
- Un panneau décoratif (porte, fenêtre) "en retrait" sur un mur sans épaisseur doit être décalé
  **vers l'extérieur** (`d` négatif), jamais vers l'intérieur : un décalage positif le place
  géométriquement derrière le mur, qui le masque entièrement au test de profondeur — invisible de
  face bien que présent dans la scène (bug trouvé par capture d'écran rapprochée, voir
  `src/geometry/buildCellGeometry.js`, fonction `inset`). Toujours vérifier une nouvelle géométrie
  décorative par une capture cadrée pile en face, pas seulement par le nombre de sommets.
- Deux configurations de voisinage peuvent être géométriquement identiques en local (une case vide
  entre deux rives = exactement la même signature que le milieu d'une rangée de maisons). Le local
  seul ne suffit pas à trancher : il faut un indice posé une fois par ailleurs (ici, `grid.isWater`,
  rempli par la génération de terrain) plutôt que d'essayer de deviner depuis les seuls voisins.
