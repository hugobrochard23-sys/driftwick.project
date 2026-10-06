# Driftwick

Prototype jouable en HTML/WebGL (Three.js) : un archipel-village miniature qu'on construit du
doigt, à la lumière chaude du crépuscule. Inspiré du plaisir de construction instantanée de
Townscaper, mais une œuvre différente — moteur procédural propre, direction artistique propre,
nom propre. Voir [analysis/TOWNSCAPER_RESEARCH.md](analysis/TOWNSCAPER_RESEARCH.md) (ce qu'on a
étudié et pourquoi) et [analysis/GAME_DESIGN.md](analysis/GAME_DESIGN.md) (comment le moteur
fonctionne et pourquoi ces choix).

Aucun asset, aucune ligne de code de Townscaper n'a été consultée ni réutilisée : géométrie
procédurale générée par code, matériaux simples.

## Jouer

```bash
node tools/serve.js        # http://localhost:8124
```

Ou ouvrir `index.html` directement (fonctionne aussi en `file://`, three.js est copié dans
`assets/lib`).

## Contrôles

| Geste | Action |
|---|---|
| Tap (ou clic) sur une case | Construire — pose une cellule ou ajoute un étage |
| Appui prolongé sur une construction | Démolir le dernier étage |
| Glisser un doigt (ou clic-glisser) | Orbiter la caméra |
| Glisser deux doigts | Déplacer la caméra (pan) |
| Pincer (ou molette) | Zoomer |

Aucun menu, aucun objectif : on construit.

## Architecture

```text
driftwick/
├── index.html              point d'entrée (scripts classiques : marche en file://)
├── game.js                 démarrage, scène, caméra, lumières, boucle de rendu
├── style.css
├── manifest.json           PWA (installable)
├── src/
│   ├── core/grid.js        grille creuse (hauteur entière par cellule) — pur, testable en Node
│   ├── topology/mesher.js  analyse de voisinage → descripteur de cellule — pur, testable en Node
│   ├── geometry/           descripteur → THREE.BufferGeometry (murs, toit)
│   ├── procedural/world.js relie grille + mesher + géométrie + scène, recalcul local uniquement
│   ├── camera/             caméra orbitale (orbite, pan, zoom)
│   ├── input/gestures.js   tap / appui long / glisser / pincer, unifié souris + tactile
│   ├── rendering/          palette et matériaux (direction artistique)
│   ├── decoration/         réservé P2 (fenêtres, portes, végétation)
│   ├── audio/, save/, ui/  réservés P6/P7/P8
├── assets/lib/three.min.js build UMD de Three.js (copié, pas de CDN, marche hors ligne)
├── tests/topology.test.js  12 tests du moteur procédural, purs Node (aucun navigateur requis)
├── tools/
│   ├── serve.js            serveur statique local
│   └── smoke.js            test d'intégration headless (Chrome + Puppeteer) : gestes réels, captures
└── analysis/               documents de conception, captures de vérification
```

Le moteur de génération (`core/`, `topology/`, `geometry/`, `procedural/`) ne dépend que de
structures de données et de THREE.BufferGeometry — aucune dépendance au rendu, à l'input ou à
l'audio, pour pouvoir le faire évoluer sans toucher au reste (voir `GAME_DESIGN.md` §3).

## Tests

```bash
node tests/topology.test.js   # moteur procédural, pur Node — quelques millisecondes
node tools/serve.js &         # puis, dans un autre terminal :
node tools/smoke.js           # intégration headless : gestes réels, captures dans analysis/
```

## Feuille de route

Voir [ROADMAP.md](ROADMAP.md).
