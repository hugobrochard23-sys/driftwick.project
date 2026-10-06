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

## P5 — UX mobile (fait)

- [x] Deux icônes seulement (réglages, mode photo), zones tactiles ≥44px, zones de sécurité `env(safe-area-inset-*)`.
- [x] Indice d'une ligne au premier lancement, disparaît dès la première interaction et pour toujours ensuite (`localStorage`).
- [x] Panneau réglages minimal : son, vibration, recommencer ce monde — rien d'autre.
- [x] "Recommencer" régénère le même archipel de départ (même graine) plutôt que de le vider — vérifié (`world.clear()` + régénération).
- Mode photo : bouton câblé (masque l'indice et les réglages) mais comportement complet réservé à P8.

## P6 — Animations, audio, haptique (fait)

- [x] Animation de pose : chaque cellule (re)construite "sort de l'eau" (position.y animée, jamais l'échelle — voir note ci-dessous), ~220ms, `World.update(now)` appelé depuis la boucle de jeu.
- [x] Sons synthétisés (Web Audio, aucun fichier) : un bip montant à la construction, un bip descendant à la démolition (`src/audio/audio.js`).
- [x] Ambiance : bruit filtré en boucle très bas volume, démarre au premier vrai geste (politique des navigateurs).
- [x] Vibration légère (Android/Chrome ; iPhone/Safari l'ignore silencieusement, cohérent avec la limite déjà notée pour Cold Impact).
- [x] Réglages son/vibration du panneau P5 effectivement branchés (`DW.Audio.setEnabled`, `DW.Haptics.setEnabled`).
- Démolition : pas d'animation de sortie (le mesh est retiré immédiatement) — simplification assumée, voir note plus bas.

## P7 — Sauvegarde (fait)

- [x] Sérialisation grille + eau (`src/save/save.js`, pur et testable), round-trip vérifié (3 tests).
- [x] Autosauvegarde automatique : `World.onEdit` se déclenche à chaque `build()`/`demolish()`, quel que soit l'appelant (geste réel, régénération d'archipel, reset) — un seul point d'accroche, jamais oublié.
- [x] Plusieurs mondes nommés : "Nouveau monde" (nomme, graine aléatoire, nouvel archipel), liste déroulante pour changer de monde, chacun gardant sa propre graine et sa propre grille.
- [x] Export (téléchargement JSON) / import (lecture de fichier) d'un monde complet.
- [x] Persistance vérifiée en conditions réelles : construction → attente de l'autosave → rechargement de la page → monde identique retrouvé (cellule construite comprise).

## P8 — Mode photo (fait)

- [x] Bascule : masque l'indice et les réglages, montre une barre dédiée (heure, filtres, capturer, partager) ; met le cycle jour/nuit en pause et restaure son état exact à la sortie.
- [x] Curseur d'heure : pilote directement `dayNight.t`, image mise à jour immédiatement.
- [x] Trois filtres (aucun, sépia, N&B) en aperçu CSS sur le canevas + vignette en incrustation DOM.
- [x] Capture : recomposée dans un `<canvas>` 2D (`ctx.filter` + dégradé radial pour la vignette) — un filtre CSS n'affecte jamais le buffer WebGL lui-même, donc le fichier exporté n'aurait pas montré l'effet sans cette recomposition.
- [x] Partage (Web Share API) si le navigateur le permet, sinon téléchargement PNG seul.
- Vérifié visuellement (`analysis/p8_mode_photo.png`) et par script (bascule, curseur, filtre, taille d'image composite non triviale, restauration de l'état de pause à la sortie).

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
- Animer une construction dont la géométrie encode des coordonnées **absolues** (notre cas, voir
  `buildCellGeometry.js`) ne peut pas passer par `mesh.scale` : ça grossirait depuis l'origine du
  monde (0,0,0), pas depuis la cellule. Seule une translation (`position.y`) reste valide sans
  réécrire la géométrie en coordonnées locales.
- Spécificité CSS : `#hud-panel { display: flex }` (sélecteur ID, spécificité 100) écrase le
  masquage natif de l'attribut `[hidden]` (spécificité ~10) — le panneau restait affiché en
  permanence malgré `hidden` posé en HTML. Toujours ajouter une règle `#id[hidden] { display: none }`
  explicite dès qu'un élément togglé par `hidden` reçoit aussi un `display` en CSS. Trouvé par
  capture d'écran (le panneau apparaissait dans une capture qui ne devait pas l'ouvrir) — un rappel
  que "ça a l'air bon sur la capture qu'on attendait" ne suffit pas, il faut vérifier l'état qu'on
  n'attendait PAS de voir.
- Brancher un effet de bord (ici : la sauvegarde) sur le point d'entrée visible (le geste du
  joueur, `onTap`/`onLongPress`) plutôt que sur l'opération de données elle-même (`World.build`)
  est fragile : un test — ou une future fonctionnalité — qui appelle `world.build()` directement
  (génération d'archipel, import, script de debug) contourne silencieusement l'effet attendu.
  Trouvé en testant la persistance : `world.build()` appelé hors geste ne déclenchait aucune
  sauvegarde. Corrigé en déplaçant l'accroche dans `World` lui-même (`onEdit`), au plus près de
  la donnée qui change, pas au plus près du geste qui l'a provoquée.
- Un filtre CSS (`filter:` sur l'élément canvas) est un effet de **compositing** appliqué par le
  navigateur à l'affichage : il ne touche jamais aux pixels réellement stockés dans le buffer
  WebGL. `canvas.toDataURL()` ou `drawImage(canvas,...)` appelé directement ignore donc totalement
  un filtre CSS actif. Pour qu'une capture corresponde à l'aperçu filtré, il faut recomposer dans
  un second `<canvas>` 2D (qui supporte `ctx.filter` en tant que propriété de dessin, pas de style).
