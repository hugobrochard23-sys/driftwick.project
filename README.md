# Driftwick

Un archipel-village miniature qu'on construit du doigt, à la lumière chaude du crépuscule.
Inspiré du plaisir de construction instantanée de Townscaper, mais une œuvre différente — moteur
procédural propre, direction artistique propre, nom propre. Voir
[analysis/TOWNSCAPER_RESEARCH.md](analysis/TOWNSCAPER_RESEARCH.md) (ce qu'on a étudié et pourquoi)
et [analysis/GAME_DESIGN.md](analysis/GAME_DESIGN.md) (comment le moteur fonctionne et pourquoi
ces choix).

**▶ Jouer en ligne (ordinateur, téléphone, tablette) : https://hugobrochard23-sys.github.io/driftwick.project/**

Aucun asset, aucune ligne de code de Townscaper n'a été consultée ni réutilisée : géométrie
procédurale générée par code, matériaux simples, aucun fichier audio (sons synthétisés).

## Jouer en ligne

Publié par **GitHub Pages** depuis la branche `main` (dossier racine) : chaque `git push` sur
`main` met le site à jour en une à deux minutes. Rien à installer ; sur téléphone, les commandes
tactiles s'activent seules.

## Jouer hors ligne

```bash
node tools/serve.js        # http://localhost:8124
```

Ou ouvrir `index.html` directement (fonctionne aussi en `file://`, three.js est copié dans
`assets/lib`, aucune dépendance réseau).

## Contrôles

| Geste | Action |
|---|---|
| Tap (ou clic) sur une case | Construire — pose une cellule ou ajoute un étage |
| Appui prolongé sur une construction | Démolir le dernier étage |
| Glisser un doigt (ou clic-glisser) | Orbiter la caméra |
| Glisser deux doigts | Déplacer la caméra (pan) |
| Pincer (ou molette) | Zoomer |

Aucun menu, aucun objectif : on construit. Une case vide entre deux rives devient un pont ; un
cottage d'un seul étage en bord d'eau reçoit un ponton ; les toits plats accueillent parfois un
buisson ; portes et fenêtres s'allument la nuit.

### Réglages (icône ⚙)

Son, vibration, plusieurs mondes nommés (créer, changer, exporter en JSON, importer), recommencer
le monde courant.

### Mode photo (icône 📷)

Masque l'interface, curseur d'heure (jour ↔ nuit), trois filtres (aucun, sépia, noir et blanc),
vignette, capture PNG, partage (si le navigateur le permet).

## Architecture

```text
driftwick/
├── index.html                point d'entrée (scripts classiques : marche en file://)
├── game.js                   démarrage, scène, caméra, lumières, cycle jour/nuit, boucle de rendu
├── style.css, manifest.json  interface, PWA (installable)
├── src/
│   ├── core/grid.js          grille creuse (hauteur entière par cellule, eau marquée) — pur, testable en Node
│   ├── topology/mesher.js    analyse de voisinage → descripteur de cellule (murs, toit, porte, pont) — pur
│   ├── geometry/             descripteur → THREE.BufferGeometry (murs, marches, toits, porte, fenêtres, pont, quai, lanterne)
│   ├── procedural/
│   │   ├── world.js          relie grille + mesher + géométrie + scène, recalcul local, animation de pose, autosauvegarde
│   │   └── islands.js        génération d'archipel déterministe (accrétion aléatoire seedée) — pur
│   ├── decoration/placement.js  placement déterministe de la végétation — pur
│   ├── rendering/
│   │   ├── materials.js      palette (direction artistique)
│   │   └── dayNight.js       cycle jour/nuit (interpolation cyclique) — pur
│   ├── camera/orbitCamera.js caméra orbitale (orbite, pan, zoom)
│   ├── input/
│   │   ├── gestures.js       tap / appui long / glisser / pincer, unifié souris + tactile
│   │   └── haptics.js        vibration légère
│   ├── audio/audio.js        sons synthétisés (Web Audio, aucun fichier)
│   ├── save/save.js          sérialisation + mondes multiples (localStorage) — pur pour la sérialisation
│   └── ui/hud.js             interface minimale (indice, réglages, mondes, mode photo)
├── assets/lib/three.min.js   build UMD de Three.js (copié, pas de CDN, marche hors ligne)
├── tests/                    5 fichiers, tests purs Node (aucun navigateur requis)
├── tools/
│   ├── serve.js               serveur statique local
│   ├── smoke.js                test d'intégration headless (Chrome + Puppeteer) : gestes réels, captures
│   └── perf.js                mesure de performance (construction, rendu, appels de dessin)
└── analysis/                  documents de conception, captures de vérification
```

Le moteur de génération (`core/`, `topology/`, `geometry/`, `procedural/`) ne dépend que de
structures de données et de THREE.BufferGeometry — aucune dépendance au rendu, à l'input ou à
l'audio, pour pouvoir le faire évoluer sans toucher au reste (voir `GAME_DESIGN.md` §3).

## Tests

```bash
for f in tests/*.test.js; do node "$f"; done   # moteur procédural, pur Node — quelques millisecondes
node tools/serve.js &                           # puis, dans un autre terminal :
node tools/smoke.js                             # intégration headless : gestes réels, captures dans analysis/
node tools/perf.js 2000                         # mesure de performance sur N cellules
```

## Feuille de route

Voir [ROADMAP.md](ROADMAP.md) — prototype 0 à P9 faits et vérifiés.
