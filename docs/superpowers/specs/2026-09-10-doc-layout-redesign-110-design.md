# Relook visuel du layout principal de la doc — « Le Fil » (#110, sous-chantier 3)

## Contexte

Les sous-chantiers 1 et 2 de #110 ont livré les fondations (tokens `--doc-*` unifiés,
palette sombre « Voûte », rythme vertical, ADR-006) et le contenu/l'organisation des
pages narratives (PR #213, #215). Ce qui reste : faire porter au **chrome** du site
(header, nav, TOC, composants narratifs) la même signature visuelle que la home —
jusqu'ici seule à l'avoir reçue (PR #202).

Brainstorming mené avec Opus, rôle cantonné au visuel/layout — même convention que
pour la palette « Voûte » du sous-chantier 1. Trois directions explorées en mockups
Artifacts (« Le Fil », « L'Établi », « Le Portique »). **Direction retenue : « Le
Fil »**. Design affiné sur 6 itérations avec le mainteneur — ce document fige
l'état final.

Mockup de référence (HTML/CSS complet, à utiliser comme source des valeurs
d'implémentation) : Artifact publié pendant le brainstorming, conservé dans l'historique
de session. Les valeurs ci-dessous en sont extraites ; les détails de mise en œuvre
(fichiers `.astro`, `.css`) restent à la main de l'implémentation, du moment que le
rendu correspond.

## Portée

### Dans le périmètre

1. Système visuel « le fil » : nouveaux tokens, rail/perle appliqués à la nav, au TOC,
   aux listes d'API, aux titres de section.
2. Header : simplifié, nouveau logo SVG.
3. Nav latérale gauche : structure par grandes sections avec rails segmentés, un
   niveau d'imbrication pour les composants qui ont des sous-composants documentés.
4. Contenu principal : fil d'Ariane (breadcrumb), badge de statut, titres de section,
   hiérarchie h2/h3 narrative.
5. Tables d'API remplacées par des listes de définition (« lignes de vie »).
6. Playground / exemples d'usage : bloc de démo, exemples preview + code repliable.
7. Blocs de code : bouton copier repositionné.
8. TOC : colonne sticky desktop (220px, 296px ≥1440px), repli dans le flux <1180px.
9. Comportement mobile : nav en drawer, TOC en `<details>` dans le flux.

### Hors scope

- Regroupement de la nav par famille de composants (Surfaces/Navigation/Saisie...) —
  exploré en mockup, mis de côté volontairement pour un chantier ultérieur. Seul le
  niveau composant → sous-composant est retenu dans ce chantier (cf. section 3).
- Moteur de recherche — emplacement réservé dans le header, mais aucune
  implémentation de recherche dans ce chantier.
- `themes/default.css` (packages/core) — c'est #201, qui suit ce chantier. Le
  vocabulaire visuel du fil devra l'informer (cf. section Suite), pas le dupliquer ici.
- Réutilisation du nouveau logo sur la home page — tâche de suivi séparée, notée mais
  non incluse dans ce chantier (le logo est créé ici, sa propagation à `HomeLayout.astro`
  est un travail distinct).
- Contenu réel des pages (textes, exemples) — seule la structure/le style changent ;
  le contenu existant est reporté tel quel dans la nouvelle structure.
- Démo épinglée (réduction de la démo dans la colonne TOC) — explorée en mockup
  (emprunt à la direction « Établi »), écartée : la démo interactive reste unique,
  dans le flux principal (cf. section 6).

## 1. Système visuel : le fil

Le motif signature de la home (ligne + perle) cesse d'être une illustration confinée à
la home et devient l'ossature du chrome : un rail 1px décoratif court le long de la nav,
du TOC et des listes d'API ; une perle ambre marque la position courante. Le rail est
un pseudo-élément (`::before`), jamais une bordure de conteneur.

**Nouveaux tokens** (ajouts à `doc-tokens.css`, aucun token existant renommé/modifié) :

| Token             | Rôle                                                    | Clair                | Sombre              |
| ----------------- | ------------------------------------------------------- | -------------------- | ------------------- |
| `--doc-rail`      | trait décoratif continu                                 | `rgba(20,20,20,.13)` | `--doc-thread-soft` |
| `--doc-rail-live` | segment « parcouru » (amorces, puces, soulignés actifs) | `--doc-ember`        | `--doc-ember`       |
| `--doc-bead`      | la perle (position courante)                            | `--doc-ember`        | `--doc-ember`       |
| `--doc-bead-ring` | détourage de la perle sur son fond                      | `--doc-paper`        | `--doc-vault`       |
| `--doc-alpha`     | statut de maturité « alpha »                            | `#8f5f00`            | `--doc-ember`       |
| `--doc-stable`    | statut de maturité « stable »                           | `#2f6b45`            | `#7fd3a2`           |
| `--doc-surface`   | fond de zone secondaire (barres de contrôle, encarts)   | `--doc-slate`        | `--doc-vault-deep`  |

`--doc-alpha`/`--doc-stable` sont des couleurs sémantiques **distinctes** de l'ambre
d'accent : un badge de maturité n'est pas un élément interactif/actif, il ne doit
jamais emprunter la couleur qui signifie « vous êtes ici ».

**Règle de segmentation** : le rail ne traverse jamais une rupture de nature — il ne
relie que des éléments du même parcours. Concrètement :

- Entre deux grandes sections de nav (Démarrer / Thème / Composants), le rail
  s'interrompt : chaque section ouvre son propre segment (`.nav-group > .nav-list::before`),
  espacement `2.1rem` entre sections pour appuyer la rupture.
- Le titre de section (`.nav-group-title`) sort du rail : décalé à `margin-inline-start:
-1.15rem` jusqu'à l'axe du fil, le segment ne commence qu'en dessous (`top: 0.35rem`
  de la liste). Le titre nomme le segment, il n'y est pas accroché — seuls les items
  le sont.
- À l'intérieur d'une liste d'API, le rail relie toutes les entrées en continu
  (`.api-row::before`), avec une perle qui apparaît au survol de chaque ligne.

## 2. Header

Simplifié : plus de liens de section (« Composants », « Thème ») — ils vivent dans la
nav gauche, les répéter dans le header brouille la question « où suis-je ? » que la
perle est censée trancher. Composition finale : bouton drawer (mobile uniquement),
logo, pastille de version (`0.9.0-alpha.4`, mono), **emplacement réservé pour une
recherche future** (`aria-disabled="true"`, infobulle « Recherche — prévue, non
active » — dimensionne le header dès maintenant, aucune implémentation de recherche
dans ce chantier), GitHub, sélecteur de thème (Clair/Sombre/Auto).

Le nouveau **logo SVG** (trait fil + perle stylisés, `viewBox 0 0 22 22`) créé pendant
ce chantier est validé par le mainteneur et remplace le texte seul actuel
(`header-brand`). Il doit être repris sur la home page — tâche de suivi séparée (cf.
Hors scope).

Le fil de séparation header/contenu est un `box-shadow: inset 0 -1px 0 var(--doc-rail)`,
pas une bordure — cohérence avec le vocabulaire du rail plutôt qu'un simple filet.

## 3. Nav latérale

Liste plate par grande section (Démarrer / Thème / Composants) — pas de regroupement
par famille (cf. Hors scope). Composants en police mono (`--doc-font-mono`), le reste
en police body.

**Un niveau d'imbrication, pour les composants qui ont des sous-composants
documentés** : `ar-breadcrumb` › `ar-breadcrumb-item`, `ar-dropdown` ›
`ar-dropdown-item`, `ar-stepper` › `ar-stepper-item`, `ar-tab-group` › `ar-tab` /
`ar-tab-panel`. Règle de rail qui distingue cette imbrication de celle écartée
(regroupement par famille) : **le segment de rail reste continu** — un sous-composant
ne démarre pas son propre fil, il prolonge celui de son parent (le composant et ses
enfants appartiennent au même parcours, contrairement à deux grandes sections qui n'ont
rien en commun). Le décrochage visuel entre un composant et sa liste d'enfants est
porté uniquement par une coche horizontale qui part du rail et rejoint chaque feuille.
La perle d'un sous-composant actif se pose sur le même rail que celle d'un composant
de premier niveau.

## 4. Contenu principal

**Fil d'Ariane** (breadcrumb) : `Composants · Surfaces` avec un point ambre entre les
segments — validé sans changement.

**Titre de page + statut** : badge de maturité (`Alpha`/`Stable`) posé à côté du `<h1>`
via `.title-row`, **uniquement sur la page composant** — jamais dans la nav, c'est une
propriété de la page qu'on lit, pas un critère de repérage dans une liste.

**Titres de section (h2)** : amorce horizontale ambre (`::before`, 28×2px) en
prolongement du fil — réservée au niveau h2. **Titres de sous-section (h3)** : pas
d'amorce — si le repère se retrouve à tous les niveaux, il perd sa valeur de marqueur
de section. Rythme vertical par rôle (1rem entre paragraphes, 1.5rem avant une
sous-section, 2.5rem entre sections — les trois `--doc-space-*` déjà définis, cf.
`charte-graphique.md`).

**Listes** : les puces empruntent la perle en version discrète (5px, `--doc-rail-live`)
plutôt qu'un caractère de liste natif.

**Encarts** (ex. accessibilité) : filet vertical ambre (`border-inline-start`) plutôt
qu'une carte fermée — cohérent avec la légèreté demandée pour les exemples d'usage
(section 6).

## 5. API en « lignes de vie »

Les tables d'attributs/slots/événements/parts/CSS sont remplacées par des listes de
définition à deux colonnes (nom + signature à gauche en mono, description à droite en
prose), reliées par un rail vertical continu avec une perle au survol de chaque ligne.
Règle stricte : **plus jamais de tableau HTML pour l'API** — le format actuel déborde
horizontalement en mobile, celui-ci dégrade proprement en une colonne (`<900px`).

Organisation par onglets (`role="tablist"`) : Attributs / Slots / Événements / Parts /
CSS, avec compteur par onglet.

## 6. Playground et exemples d'usage

**Démo interactive** (section « Démonstration », remplace/enrichit `Playground.astro`) :
zone de scène (fond pointillé léger réutilisant `--doc-rail`), contrôles de props
(select/input/checkbox), bloc de code avec bouton copier — le tout dans un même cadre
(`.playground`, bordure + radius md).

**Exemples d'usage** (nouveau pattern, section dédiée après « Quand l'utiliser ») :
un encart par cas. Titre (`h3`, 1.05rem) et description (0.88rem, gris) en **prose
libre au-dessus**, hors cadre — ils appartiennent au fil de lecture, pas à la
démonstration. En dessous, un cadre (`.example-frame`, bordure + radius md) contenant
la preview et, sous un filet horizontal, le code repliable (`<details>`, libellé
« Voir le code » / « Masquer le code », chevron animé) — c'est le code de _cette_
preview, pas un bloc autonome, donc il partage son cadre. Séparation entre deux
exemples : espacement (2.4rem), pas de règle ni de cadre superflu.

## 7. Blocs de code

Bouton « Copier » positionné en coin de fin de lecture (`inset-block-start` +
`inset-inline-end` — bascule automatiquement à gauche en RTL), révélé au survol du
bloc ou au focus clavier (`:hover`, `:focus-within`), **toujours visible sur pointeur
tactile** (`@media (hover: none)`, pas de survol possible). Confirmation sur place
(le libellé devient « Copié » 1.6s) plutôt qu'un toast.

## 8. TOC (sommaire de page)

- **Desktop** : colonne sticky à droite, 220px, rail + perle, sous-niveaux indentés.
- **≥1440px** : la colonne s'élargit à 296px (plus d'air pour le sommaire quand la
  place le permet) — pas de contenu supplémentaire à ce palier, la démo interactive
  n'existe qu'à un seul endroit, dans le flux principal (section 6, cf. Hors scope).
- **<1180px** : la colonne TOC disparaît, remplacée par un `<details>` repliable
  inséré dans le flux sous le titre de page. Replié par défaut, son `<summary>` affiche
  la section courante (`API · 5 sections`) — donc informe même fermé. Garde son rail
  et sa perle à l'identique.

## 9. Comportement mobile (<820px)

Nav latérale et TOC ne se disputent jamais l'écran car elles ne jouent pas le même
rôle :

- **Nav du site** = un _déplacement_ : part en drawer plein écran (surcouche
  `position: fixed`, appelée par le bouton burger du header), la page ne se
  réorganise pas dessous. Se ferme après sélection.
- **TOC** = un _repère de lecture_ : reste dans le flux (cf. section 8, comportement
  déjà actif dès <1180px), ne part jamais en drawer.

## Suite

Une fois ce sous-chantier livré, #110 peut être fermé (label
`status:en-attente-release` jusqu'à la release réelle sur `main`, jamais
rétroactivement). Étape suivante, séparée : #201 (rafraîchir `themes/default.css`,
`packages/core`) — le vocabulaire visuel du fil (rail/perle, statuts sémantiques)
devra informer le style des composants publiés, sans dupliquer telles quelles les
valeurs `--doc-*` (systèmes de tokens distincts, cf. sous-chantier 1). Tâche de suivi
notée séparément : reprendre le nouveau logo sur la home page.

## Tests / vérification

- Vérification visuelle Playwright (clair + sombre) sur : une page composant (ex.
  `ar-dialog`), une page de contenu narratif, la nav en drawer mobile, la TOC repliée.
- Contrôle de contraste WCAG AA sur `--doc-alpha`/`--doc-stable` dans les deux modes.
- Vérification clavier : bouton copier accessible au focus (`:focus-within`), drawer
  nav piège le focus et se ferme à `Échap`, `<details>` (TOC inline, exemples
  d'usage) navigables au clavier.
- `npm run test` (Vitest + WTR docs) et build Astro sans erreur après migration des
  composants de layout (`Layout.astro`, `SiteNav.astro`, `ComponentApi.astro`,
  `Playground.astro`, `TableOfContents.astro`).
- Vérification que les listes d'API en lignes de vie ne débordent pas horizontalement
  en mobile (`<900px`) — c'était le défaut du format tableau qu'elles remplacent.
