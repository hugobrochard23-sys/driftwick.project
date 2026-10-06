# Townscaper — ce qui est public, ce qu'on en retient

Synthèse des informations **publiques** sur le fonctionnement de Townscaper (Oskar Stålberg),
utilisées pour comprendre les *principes* du genre — aucune ligne de code, aucun asset, aucun
fichier du jeu original n'a été consulté ni copié. Chaque affirmation est sourcée et notée par
niveau de confiance : **confirmé** (le créateur l'a dit explicitement), **déduit** (reconstitution
technique par la communauté, cohérente avec les observations), **hypothèse** (plausible mais non
vérifié).

## 1. Grille

Deux systèmes à ne pas confondre :

- **Le maillage visuel irrégulier.** Un hexagone de triangles équilatéraux dont des paires
  adjacentes fusionnent aléatoirement en quadrilatères, puis une relaxation géométrique lisse le
  résultat ; étendu à l'infini par un pavage hexagonal qui génère son maillage à la demande.
  *Déduit* (boristhebrave.com/sylves, podcast *Math and Art* d'etao.blog).
- **Le placement des tuiles.** Stålberg l'a confirmé lui-même sur X en 2019 : *« It's marching
  squares on irregular quadrilateral grids »* — chaque coin de cellule a un état plein/vide, et
  un algorithme de marching squares choisit la géométrie du coin. *Confirmé* pour le principe ;
  *déduit* pour les détails d'implémentation (reconstructions communautaires en Unity).

## 2. Génération procédurale des bâtiments

Combinaison de marching squares (forme de base) et d'une logique proche du **Wave Function
Collapse** (déjà utilisé par Stålberg dans *Bad North*) pour choisir les modules compatibles
cellule par cellule, puis une couche de décoration contextuelle (fenêtres, jardins « prioritaires
mais seulement contre un mur », etc.). *Confirmé* pour le principe général (Game Developer,
*« How Townscaper Works »*) ; *déduit/hypothèse* pour le détail exact des règles de priorité
(non publiées).

## 3. Contrôles et UX

Tap pour poser/retirer, pincer pour zoomer, un doigt pour tourner, deux doigts pour déplacer ;
aucun menu, aucun objectif affiché. *Confirmé* (reviews concordantes AppUnwrapper, TouchArcade,
LadiesGamers).

## 4. Retours joueurs

Unanimement salué comme relaxant et beau, pensé comme un « jouet » plutôt qu'un « jeu » ; critique
récurrente : absence de but perçue comme un manque de profondeur après 30 minutes. Limite de
grille doublée après le lancement suite aux retours des joueurs. *Confirmé* (forums Steam,
TechRaptor, Metacritic).

## 5. Jeux comparables

*Bad North* (origine du WFC chez Stålberg), *Islanders* (city-builder zen posé à la main),
*Dorfromantik* (tuiles hexagonales séquentielles, plus proche du puzzle), **Tiny Glade** (2024-25,
successeur spirituel explicite, réactivité contextuelle similaire mais boîte à outils plus riche).
*Confirmé par la presse spécialisée* (PCGamer, comparatifs directs).

## 6. Limites connues

Version mobile (iOS/Android, Raw Fury, octobre 2021) bien reçue, performances solides même sur
gros projets. Limite de largeur/profondeur du monde ayant fait l'objet d'un patch d'agrandissement ;
pas de limite de hauteur pratique documentée. *Confirmé* (TouchArcade, retours Steam officiels).

## Ce qu'on en retient pour Driftwick

- Le principe générique « marching squares sur grille + culling de face selon les voisins » est
  une technique de game dev **publique et générique** (pas une invention propriétaire de
  Townscaper) : on peut légitimement s'en inspirer en construisant **notre propre** variante
  (voir `GAME_DESIGN.md`).
- La critique la plus citée (absence de profondeur après 30 minutes) oriente directement nos
  choix de différenciation : plusieurs îles, mode photo, sauvegarde multiple, et une direction
  artistique propre plutôt qu'un simple reskin.
- La relaxation de maillage de Townscaper est coûteuse (recalcul géométrique global à chaque
  édition) ; Driftwick fait un autre choix technique, plus mobile-friendly, détaillé dans
  `GAME_DESIGN.md`.
