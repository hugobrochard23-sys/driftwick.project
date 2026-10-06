# Driftwick — document d'ingénierie et de design

## 1. Nom, pitch, différenciation

**Driftwick** : un archipel-village miniature qu'on construit du doigt, à l'heure dorée du
crépuscule. Contrairement à Townscaper (lumière froide, pierre blanche/bleutée, un seul îlot
continental), Driftwick est chaud : pierre rosée, bois flotté, eau teal profonde, lumière de fin
de journée. Différenciation produit (en réponse directe aux critiques connues de Townscaper,
voir `TOWNSCAPER_RESEARCH.md` §4/§6) : plusieurs îles plutôt qu'une seule étendue, mode photo dès
le début de la feuille de route, sauvegarde multi-mondes, et un moteur de génération différent
(voir §3) plutôt qu'un reskin du même algorithme.

## 2. Grille — formalisation mathématique

**Modèle retenu (P0/P1) : hauteur entière par cellule carrée, culling de face par comparaison de
voisinage.** Plus simple à raisonner, tester et optimiser pour mobile qu'une grille de coins avec
marching squares complet (le modèle "le plus proche de Townscaper") — voir la justification au §3.

- **Cellule** : `(cx, cz) ∈ ℤ²`, occupe le carré au sol `[cx, cx+1] × [cz, cz+1]`.
- **Hauteur** : `H(cx, cz) ∈ [0, MAX_HEIGHT]`, entier. `0` = vide/eau. Stockage creux
  (`Map<"cx,cz", H>`) — mémoire proportionnelle à ce qui est construit, pas à la taille du monde
  (important pour un monde "infini" sur mobile).
- **Voisinage** : 4-connexité (N, S, E, W). Pas de diagonales (évite les cas d'angle ambigus,
  cohérent avec un moteur simple à auditer).
- **Visibilité d'une face** : le mur du côté `S` d'une cellule est visible, de la hauteur
  `nh = H(voisin_S)` jusqu'à `h = H(cx,cz)`, **si et seulement si `nh < h`**. Sinon le voisin
  masque/possède déjà cette frontière (culling de face façon voxel). Conséquence directe : deux
  cellules adjacentes de même hauteur ne partagent aucun mur (effet "bâtiment fusionné"), et un
  escalier de hauteurs croissantes ne montre un mur que sur son côté le plus haut — exactement le
  genre d'auto-assemblage qui fait le charme du genre, obtenu ici sans relaxation de maillage.
- **Toit** : toujours posé au sommet (`y = h`), puisque rien ne peut exister au-dessus dans ce
  modèle à une seule colonne par cellule.
- **Cellules à recalculer après une édition** : la cellule éditée + ses 4 voisines directes
  (`grid.cellsTouching`). Jamais plus — c'est la garantie de performance mobile (§5).

Formalisé et vérifié par les 12 tests de `tests/topology.test.js` (cellule isolée, paire, ligne,
carré, colonne haute, plafond de hauteur, escalier, suppressions centrale/périphérique, grande
construction, reconstruction).

**Extension prévue P2+ (non bloquante) :** un modèle de coins (4 coins par cellule, hauteur par
coin plutôt que par cellule) permettrait des silhouettes non rectangulaires, arches et ponts —
formalisable comme une couche *au-dessus* du modèle actuel sans le remplacer, en subdivisant la
cellule en jeu de marching-squares classique (16 configurations) pour les cas où un relief fin est
nécessaire (bord d'île, quai, arche). Documenté ici pour ne pas être oublié, pas implémenté tant
que P0/P1 n'ont pas prouvé que le modèle simple suffit au plaisir de jeu.

## 3. Pipeline procédural

```
geste (tap / appui long)
        │
        ▼
 raycast écran → plan (y=0) → (cx, cz)
        │
        ▼
 Grid.raise / Grid.lower(cx, cz)          ← src/core/grid.js
        │
        ▼
 cellsTouching(cx, cz)                     ← la cellule + ses 4 voisines
        │
        ▼
 pour chacune : Mesher.cellDescriptor      ← src/topology/mesher.js (pur, testable sans navigateur)
        │            (hauteur, murs visibles, toit)
        ▼
 Geometry.buildCellGeometry                ← src/geometry/buildCellGeometry.js (THREE.BufferGeometry)
        │
        ▼
 World : remplace l'ancien Mesh par le nouveau dans la scène   ← src/procedural/world.js
        │
        ▼
 rendu (THREE.WebGLRenderer)
```

Pourquoi ce choix plutôt que l'architecture "analyse de voisins → configuration topologique →
géométrie → décoration" suggérée en exemple : elle reste valable, mais nous insérons une étape
intermédiaire explicite et **pure** (`Mesher`, aucune dépendance 3D) entre l'analyse de voisinage
et la géométrie, précisément pour pouvoir tester le cœur procédural en Node sans navigateur ni
GPU — un test unitaire s'exécute en millisecondes, un test de rendu headless en secondes.
La décoration (fenêtres, portes, lanternes, végétation) sera une étape supplémentaire insérée
entre `Mesher` et `Geometry` en P2, consommant le même descripteur sans toucher au reste du
pipeline (séparation du moteur de génération et du rendu demandée en §15 du brief).

## 4. Direction artistique

**Archipel au crépuscule.** Choix définitif après comparaison des trois pistes proposées :

- Pierre et enduit rosés/terracotta (`#e3a98b`), bois flotté plus sombre pour les finitions
  (prévu P4), plutôt que la pierre claire froide de Townscaper ou le blanc méditerranéen pur.
- Eau teal profonde (`#2f7d85`) plutôt que le bleu/turquoise clair habituel du genre — se désature
  légèrement sous la lumière chaude du soleil couchant, un effet voulu plutôt que corrigé (vérifié
  par capture d'écran, voir `prototype0_initial_view.png`).
- Ciel pêche (`#f4d9c6`) et brume de fin de journée (`#f0c9a8`) : identité chromatique chaude du
  début à la fin, à l'opposé du ciel neutre/froid de la référence.
- Touche distinctive réservée à P4 : lanternes qui s'allument au crépuscule, eau légèrement
  bioluminescente la nuit — un seul effet "magique", pas une dérive fantastique complète (reste
  dans l'esprit "lieu qui pourrait exister" plutôt que "conte de fées").

## 5. Performance mobile

- Stockage creux (`Map`), aucune allocation pour les cellules vides.
- Recalcul strictement local (cellule éditée + 4 voisines) — jamais un rebuild de la ville entière.
- Un `Mesh` THREE.js par cellule actuellement (simple, correct, suffisant jusqu'à quelques
  centaines de cellules) ; fusion en un `BufferGeometry` par îlot prévue si le profilage sur
  mobile réel (P9) montre que le nombre de draw calls devient le goulot, pas avant — évite
  l'optimisation prématurée sur une hypothèse non vérifiée.
- Matériaux en `DoubleSide` pendant le prototypage (évite les faces invisibles par erreur de sens
  des sommets) ; passage en `FrontSide` documenté comme optimisation différée une fois la
  géométrie stabilisée.

## 6. Choix technologique

**HTML + JavaScript classique (scripts, pas de bundler) + Three.js, Capacitor/PWA pour la
distribution mobile.** Décision fondée sur l'observation du Bureau (`play-store.project/`) plutôt
que sur la mémoire longue (qui recommandait Godot 4 pour le 3D, jamais mis en pratique) : les
trois projets mobiles réels déjà en cours (*cold-impact*, *Buzzkill*, *chariot-run*) sont tous
construits ainsi, avec serveur statique maison, tests Puppeteer headless, et déploiement GitHub
Pages. Avantages pour ce projet précis : zéro installation, zéro étape de build, testable de bout
en bout par Claude (headless Chrome, captures d'écran, simulation de gestes réels) sans dépendre
d'un éditeur graphique — la raison même pour laquelle Unity avait été écartée dans les notes du
Bureau s'applique aussi à un usage "éditeur Godot" de Godot, qu'on évite ici en restant en pur
code.

## 7. Suite (feuille de route)

Voir `ROADMAP.md`.
