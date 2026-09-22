# ar-breadcrumb : rendu porté par ar-breadcrumb-item, CSS découplé, séparateur personnalisable (#239)

## Contexte

Le chantier #226 a donné à `ar-stepper-item` son propre shadow DOM et fait passer le visuel
de `ar-stepper` dans le thème. `ar-breadcrumb` présente les mêmes défauts :

1. **`ar-breadcrumb-item` est un simple porteur de données.** Il rend dans son propre light
   DOM (`createRenderRoot() { return this; }`) et ne fait que déclarer `label` et `href` au
   parent via `breadcrumbContext`. `ar-breadcrumb` construit tous les `<li>`, `<a>`,
   séparateurs et puces à partir de ces valeurs.
2. **Le CSS interne porte du visuel.** Séparateur desktop (trait de 1px incliné à 15°, hauteur
   65 %, marges), puces mobiles (tailles, marges), connecteur pointillé de la liste mobile
   (`[part~='list--mobile']:before`, inaccessible au thème : `::part(x)::before` est invalide),
   paddings des liens, fonds et états des boutons `home` / `trigger` via des tokens
   `--ar-breadcrumb-toggle-*`. Le composant n'est pas headless.
3. **Le séparateur n'est pas personnalisable.** Le thème ne peut pas injecter de contenu
   (`::part(separator)::before` est invalide), il ne peut que colorer une boîte vide.

## Portée

### Dans le périmètre

- `ar-breadcrumb-item` rend son propre shadow DOM ; `ar-breadcrumb` ne construit plus les
  items.
- Partage du CSS : le CSS interne ne garde que le structurel et l'accessibilité, le reste passe
  dans `default.css`.
- Slot `separator` sur `ar-breadcrumb`, cloné dans chaque item ; séparateur par défaut « / ».
- Renommage des parts `bullet` / `bullet--current` en `indicator` / `indicator--current`.
- Mise à jour de la doc, du thème, du manifest et des tests.

### Hors périmètre

- Séparateur différent par item, attribut `separator` en chaîne (ajoutables plus tard sans
  casser cette API).
- Toute modification du comportement mobile (bouton `home`, `trigger`, panel, événements
  `ar-breadcrumb-show` / `-hide`) au-delà du déplacement du rendu des items.

### Changements cassants assumés

Alpha, pas de dépréciation (cf. `CLAUDE.md`) :

- Les parts `link`, `current`, `separator` et `indicator` passent de `ar-breadcrumb` à
  `ar-breadcrumb-item`.
- `bullet` et `bullet--current` deviennent `indicator` et `indicator--current`.
- Le part `item` est supprimé ; on cible la balise `ar-breadcrumb-item`.
- Nouveau part `connector` sur `ar-breadcrumb` (mobile uniquement) : un unique élément décoratif
  posé dans le panel, pas un par item.
- `<ol>` remplacé par `<div role="list">` pour les listes desktop et mobile (le contenu d'un
  `<ol>` se limite à `<li>` et aux script-supporting elements ; un `<slot>` n'y est pas valide).
  Même correctif appliqué à `ar-stepper` / `ar-stepper-item`, touchés par ricochet dans cette PR.
- Tokens supprimés : `--ar-breadcrumb-mobile-separator-color`, `--ar-breadcrumb-toggle-bg`,
  `--ar-breadcrumb-toggle-bg-hover`, `--ar-breadcrumb-toggle-bg-pressed`,
  `--ar-breadcrumb-toggle-bg-focus`, `--ar-breadcrumb-toggle-transition-duration`.

## 1. Rendu porté par `ar-breadcrumb-item`

### `ar-breadcrumb`

Il rend le `<nav part="breadcrumb">`, le libellé `sr-only`, puis :

- **Desktop** : `<div role="list" part="list list--desktop"><slot></slot></div>`.
- **Mobile** : le `.dropdown` existant. Le bouton `home` reste rendu par `ar-breadcrumb` à partir
  de `label` / `href` du premier item (lus sur l'instance ; notifié par l'item via
  `notifyItemChanged` si `href` est renseigné après coup). Le panel contient un unique
  `<div part="connector" aria-hidden="true">` (cf. section 2, le trait pointillé reliant les
  puces) puis `<div role="list" part="list list--mobile"><slot></slot></div>`.

`role="list"` restaure la sémantique perdue en abandonnant `<ol>`/`<ul>` (nécessaire ici puisque
la liste contient un `<slot>`, invalide dans un `<ol>`). Un seul `<slot>` existe à la fois : il
change d'emplacement quand `isMobile` change. Les items étant des enfants light DOM de
`ar-breadcrumb`, ils suivent le slot d'un conteneur à l'autre sans être recréés.

### `ar-breadcrumb-item`

L'item a un shadow DOM propre (comme `ar-stepper-item`) :

- Hôte en `display: contents`, avec `role="listitem"` posé dans `connectedCallback` (sauf si
  l'auteur a déjà posé un `role`) ; `aria-current="page"` sur le dernier item, retiré sinon.
- Le shadow rend un wrapper interne (flex centré) contenant, dans l'ordre :
    - **desktop, item non premier** : `<span part="separator" aria-hidden="true">` (contenu : cf.
      section 3) ;
    - **mobile, item visible** : `<span part="indicator[ indicator--current]" aria-hidden="true">`
      contenant `<slot name="indicator">` (contenu par défaut : rien — l'aplat de couleur vient
      entièrement du thème). Aucun élément décoratif supplémentaire autour : le trait qui relie
      les puces entre elles est porté par `ar-breadcrumb`, pas par l'item (cf. section 2) ;
    - le contrôle : `<a part="control link" href=…>` ou `<span part="control current">`
      (dernier item), contenant l'indicateur puis `<span part="label">label</span>`.
- En **mobile, le premier item ne rend rien** : il est déjà affiché par le bouton `home`. Son hôte
  porte l'attribut `hidden`, mais uniquement si c'est le composant qui l'a posé (un `hidden`
  laissé par l'auteur sur un item n'est jamais retiré) ; le CSS interne pose
  `:host([hidden]) { display: none; }` (sinon `:host { display: contents }` l'emporterait sur le
  style navigateur de `[hidden]`), pour ne pas exposer un `listitem` vide aux lecteurs d'écran.

### État de rendu

`ar-breadcrumb` calcule, à chaque reconstruction (déjà planifiée par `_scheduleRebuild`), un état
par item et le pousse via une méthode `setRenderState()` — même patron que
`ArStepperItem.setRenderState` :

```ts
export interface BreadcrumbItemRenderState {
    isFirst: boolean;
    isCurrent: boolean; // dernier item
    isMobile: boolean;
    hasPrevious: boolean; // un item visible précède celui-ci
    separator: Node | undefined; // nœud modèle, cf. section 3
}
```

**Tant qu'un item n'a pas reçu son premier état de rendu, il ne rend rien.** Sans cette règle, un
item rendu avant que `ar-breadcrumb` lui pousse son état afficherait son lien par défaut : le
premier item serait brièvement visible et cliquable dans le panel mobile (en plus du bouton `home`),
ou dupliqué en desktop. L'item apparaît directement avec le bon état.

Le registre `BreadcrumbRegistry` (register / unregister / notifyItemChanged) est inchangé.

### Ordre des items

L'ordre reste celui du DOM (`querySelectorAll('*')` filtré sur `ArBreadcrumbItem`, comme
aujourd'hui). Aucune structure imbriquée : contrairement au stepper, pas d'arbre.

## 2. Partage du CSS interne / thème

Règle : le CSS interne ne garde que le structurel et l'accessibilité ; forme, taille, couleur,
espacement et états visuels passent dans `default.css`.

| Reste en interne                                                                                                              | Passe au thème (`::part()`)                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Layout de `list--desktop` (flex row wrap) et `list--mobile` (flex column), reset `margin` / `padding` des conteneurs de liste | Couleur de la liste, `padding-inline-end` du nav                                                               |
| `display: inline-flex` sur `control` (`link`/`current`)                                                                       | Reset visuel des liens (couleur héritée, décoration)                                                           |
| Wrapper de l'item : flex centré                                                                                               | Séparateur : couleur, taille de police                                                                         |
| Padding vertical du contrôle dans la liste mobile (`0.5rem 0.25rem`, cible tactile WCAG 2.5.8)                                |                                                                                                                |
| `svg { height: 1.25em; … }` et slots d'icône par défaut                                                                       | Indicateur : taille, marge, forme, couleur, variante `--current`                                               |
| Repli d'accessibilité `--ar-breadcrumb-toggle-min-size` (WCAG 2.5.8)                                                          | Connecteur mobile : dessin (pointillé, couleur), `top`/`bottom` calculés depuis des tokens de thème            |
| Connecteur mobile : hors du flux (`position: absolute; inset-inline-start: 0`) — relève de son rôle, pas du visuel            |                                                                                                                |
| Marge minimale du séparateur (cf. ci-dessous)                                                                                 | Boutons `home` / `trigger` : fond, états hover / active / focus, transition, outline, `prefers-reduced-motion` |
| `distance` / `offset` (consommés par `AnchoredController`), tokens `--ar-panel-*`                                             |                                                                                                                |

- **Séparateur** : marge interne fonctionnelle en `em` (ex. `margin-inline: 0.5em`), commentée
  `functional-default`, surchargeable par `::part(separator)`. Sans thème, items et séparateurs ne
  sont jamais collés. Aucune marge équivalente pour l'indicateur et le connecteur, dont la taille
  est purement visuelle.
- **Indicateur mobile** : tous les indicateurs ont la même taille et les mêmes marges (le thème
  les pose via des tokens `--ar-theme-breadcrumb-*`, réutilisés aussi par la géométrie du
  connecteur, cf. plus bas) ; `indicator--current` ne change que la couleur de fond
  (`--ar-color-interactive` au lieu de `--ar-color-neutral-80`). L'indicateur expose un slot
  `indicator` (comme `ar-stepper-item`) pour une icône personnalisée, purement décoratif.
- **Connecteur mobile : un unique élément, pas un par item.** `ar-breadcrumb` rend un seul
  `<div part="connector" aria-hidden="true">` dans le panel, avant la liste. Rester hors du flux,
  ancré au panel, relève de son rôle plutôt que d'un choix visuel (même raisonnement que pour
  `[part='panel']` lui-même) : le CSS interne pose donc `position: absolute; inset-inline-start:
0;`, structurel. Le thème dessine un pointillé continu par-dessus (`repeat-y`,
  `background-size: 2px 8px`, `--ar-color-neutral-80`, identique au connecteur d'`ar-stepper`) sur
  toute la hauteur utile du panel, calée par `top`/`bottom`. Sa position ne dépend donc jamais de
  la hauteur d'un item (libellé sur une ou plusieurs lignes) :
    - le haut est calé un peu après le centre de la puce du premier item, via un `calc()` sur des
      tokens de thème partagés avec l'indicateur (`--ar-theme-breadcrumb-indicator-size`,
      `-indicator-margin-block`, `-panel-padding`) — un léger espace visible avant la première
      puce est accepté ;
    - le bas s'arrête au padding du panel ; le segment qui dépasserait sous le dernier indicateur
      est masqué par le fond opaque d'`ar-breadcrumb-item::part(current)`, qui couvre toute la
      hauteur réelle du dernier item (1 ou plusieurs lignes) — sans dépendre de calc() ;
    - chaque puce masque localement le segment de pointillé qui passe derrière elle via son propre
      halo (`box-shadow` dans la couleur de fond du panel), sans dépendre de la phase du motif.
    - Pour que ce fond masque bien le connecteur, `::part(current)` porte `position: relative`
      (documenté dans `default.css`) : un `::part()` positionné peint après un élément non
      positionné, quel que soit l'ordre du DOM — sans cette déclaration, malgré le fond opaque, un
      élément `position: static` reste peint derrière le connecteur (`position: absolute`), et
      celui-ci resterait visible par-dessus le texte. Le contrat implicite qui en découle :
      `ar-breadcrumb-item` (dans la liste) doit rester après le connecteur dans le DOM — déjà le
      cas, structurellement.
- **Panel mobile** : le thème pose une `max-width` propre sur `ar-breadcrumb::part(panel)`,
  `min(20rem, calc(100vw - 2rem))`, volontairement non cascadée depuis `--ar-panel-max-width`
  (18rem, partagé avec les autres composants à panel) : la liste mobile empile des libellés de
  fil d'ariane, qui se replient moins sur 20rem. `min()` borne la largeur au viewport (WCAG
  1.4.10 Reflow) ; `min-width` reste celle du panel partagé.
- **Boutons `home` / `trigger`** : les états visuels passent en règles `::part(home)` /
  `::part(trigger)` du thème (`:hover`, `:active`, `:focus-visible`), en pseudo-classes seules
  (aucun sélecteur d'attribut après `::part()`, invalide). Le thème gère
  `prefers-reduced-motion`.
- **Ordre des états** dans le thème : `indicator` avant `indicator--current` (garde-fou
  `validate-part-state-order`).

Conséquence : sans thème, le breadcrumb est « nu » (pas de puce ni de connecteur visibles, boutons
sans fond) ; le séparateur « / » et l'espacement minimal restent visibles.

## 3. Slot `separator`

### API

`@slot separator` sur `ar-breadcrumb` (JSDoc) :

```html
<ar-breadcrumb>
    <span slot="separator">›</span>
    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
    <ar-breadcrumb-item label="Produits" href="/produits"></ar-breadcrumb-item>
    <ar-breadcrumb-item label="Chaussures"></ar-breadcrumb-item>
</ar-breadcrumb>
```

Sans élément `slot="separator"`, chaque item affiche « / » (contenu de repli du séparateur).

### Mécanisme

- Un nœud `slot="separator"` sans `<slot name="separator">` correspondant dans le shadow n'est pas
  rendu : `ar-breadcrumb` ne déclare pas ce slot et lit le nœud directement parmi ses enfants
  (`:scope > [slot="separator"]`).
- **Un clone par item.** Un nœud ne peut être assigné qu'à un seul slot : `ar-breadcrumb` passe le
  nœud modèle à chaque item via `BreadcrumbItemRenderState.separator`, et chaque item en fait un
  `cloneNode(true)` dans `<span part="separator" aria-hidden="true">` de son shadow. Le light DOM
  des items n'est jamais modifié. L'item ne re-clone que si le nœud modèle lui-même change
  (identité), jamais sur une mutation de son contenu.
- **Pas de suivi des mutations du séparateur.** `ar-breadcrumb` relit le nœud modèle à chaque
  reconstruction (`_pushRenderState`), mais celle-ci n'est déclenchée que par un changement d'items
  (ajout, retrait, `label`/`href`) ou de mode (`isMobile`). Une mutation isolée du séparateur seul
  — son contenu modifié en place, son attribut `slot` changé, ou le nœud retiré — sans qu'aucun
  item ne change en même temps, n'est pas répercutée : le séparateur est traité comme posé une
  fois, pas comme un contenu réactif.
- **Accessibilité** : le conteneur est toujours `aria-hidden="true"` ; le consommateur n'a pas à le
  poser.
- **Mobile** : le séparateur n'est rendu qu'en desktop.

### Précautions documentées

- Ne pas mettre d'`id` dans le contenu du séparateur (dupliqué dans chaque clone).
- Éviter les éléments interactifs (le conteneur est `aria-hidden`).

## Tests

Tests headless uniquement : aucun ne charge le thème, et ils ne vérifient que ce qui relève du
composant.

- **`breadcrumb-item.test.ts`** (reçoit les assertions de rendu qui étaient sur le parent) :
  structure et parts (`link`, `current`, `separator`, `indicator`, `indicator--current`) selon
  l'état de rendu ; l'item ne rend jamais de `part="connector"` (porté par `ar-breadcrumb`) ;
  `role="listitem"` posé dès `connectedCallback` sauf s'il est déjà posé par l'auteur,
  `aria-current="page"` sur le dernier ; un `hidden` posé par l'auteur n'est jamais retiré par le
  composant ; premier item mobile sans rendu, `hidden` posé par le composant ; aucun rendu avant
  le premier état ; « / » par défaut ; clonage du séparateur fourni, jamais re-cloné sur une
  mutation de son contenu (seule l'identité du nœud compte) ; `href` notifié au parent dès qu'il
  passe de `undefined` à une valeur, même après le premier rendu.
- **`breadcrumb.test.ts`** : structure du parent (`nav`, conteneurs `role="list"`
  `list--desktop` / `list--mobile`, bouton `home`, `trigger`, panel), état de rendu poussé aux
  items, ordre DOM, slot `separator` (clone dans chaque item, repli « / » si le nœud est retiré
  _et_ qu'un item change en même temps, mais pas si le séparateur seul est retiré sans changement
  d'item — cf. section 3), unique `part="connector"` dans le panel en mobile (aucun en desktop),
  lien `home` qui reçoit le `href` du premier item même renseigné après coup.
- **`breadcrumb.browser.test.ts`** : conserver ouverture / fermeture, light-dismiss, fond et
  bordure du panel sans thème, taille de cible des boutons `home` / `trigger` sans thème ;
  supprimer le test `collision hover/focus (#157)` (token `bg-focus` supprimé) et le test RTL
  `padding-inline-end` si ce padding passe au thème.
- **`breadcrumb.a11y.test.ts`** : vérifier que `role="listitem"` sur l'hôte `display: contents`
  d'un item, dans un conteneur `role="list"`, passe axe (même mécanisme que `ar-stepper-item`).
- Gardes-fous CI : `validate-cssprop-defaults` (tokens supprimés retirés du JSDoc et de `:root`) et
  `validate-part-state-order`.

## Fichiers touchés

- Composants : `breadcrumb.ts`, `breadcrumb.styles.ts`, `breadcrumb-item.ts`, nouveau
  `breadcrumb-item.styles.ts`. Par ricochet (correctif `<ol>` invalide) : `stepper.renderer.ts`,
  `stepper-item.ts`.
- Contexte : `context/breadcrumb.context.ts` inchangé (l'état de rendu passe par
  `setRenderState`, pas par le registre).
- Thème : section `ar-breadcrumb` de `default.css` et tokens de `:root`.
- Doc : `ar-breadcrumb.mdx` (variante « séparateur personnalisé » et section d'usage). Aucun
  changement nécessaire dans `ar-breadcrumb-item.mdx` (les parts de l'item viennent du JSDoc via le
  manifest, non versionné et régénéré) ni dans `personnalisation-avancee.astro` (les parts
  `list--desktop` / `list--mobile` restent sur `ar-breadcrumb`).

## Découpage

Une branche, une PR, trois commits dans l'ordre :

1. `ar-breadcrumb-item` rend son propre shadow DOM, sans changement de comportement visible : les
   règles CSS des parts déplacés suivent leurs éléments, sans être modifiées ; thème adapté aux
   nouveaux parts (`indicator*`, sélecteur `ar-breadcrumb-item`).
2. Partage du CSS interne / thème, suppression des tokens, nouveau part `connector` et séparateur
   par défaut « / » (le trait dessiné en CSS disparaît avec le CSS visuel : le caractère le
   remplace dans la même étape).
3. Slot `separator` (clonage, suivi des mutations) et doc.

## Risques

- `display: contents` avec `role="listitem"` sur l'hôte d'un item dans un conteneur `role="list"`
  du shadow : même mécanisme que `ar-stepper-item`, vérifié par le test a11y du breadcrumb
  (Chromium uniquement).
- Le clonage du séparateur instancie deux fois les éventuels custom elements du contenu (original
  dans le light DOM, caché, et un clone par item) : documenté.
- Le masquage du connecteur sous le dernier item repose sur `position: relative` (cf. section 2) :
  un contrat implicite (ordre du DOM) plutôt qu'un mécanisme explicite. Documenté dans le
  commentaire du thème.
- Le connecteur suppose que les items précédant le dernier ont une hauteur suffisante pour que le
  `calc()` du haut (basé sur la seule hauteur du premier item) ne dépasse jamais visiblement dans
  les cas courants ; non garanti formellement pour toute combinaison extrême de tailles de police.
