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
- Nouveaux parts `connector`, `connector--first` et `connector--last` sur `ar-breadcrumb-item`
  (mobile).
- Tokens supprimés : `--ar-breadcrumb-mobile-separator-color`, `--ar-breadcrumb-toggle-bg`,
  `--ar-breadcrumb-toggle-bg-hover`, `--ar-breadcrumb-toggle-bg-pressed`,
  `--ar-breadcrumb-toggle-bg-focus`, `--ar-breadcrumb-toggle-transition-duration`.

## 1. Rendu porté par `ar-breadcrumb-item`

### `ar-breadcrumb`

Il rend le `<nav part="breadcrumb">`, le libellé `sr-only`, puis :

- **Desktop** : `<ol part="list list--desktop"><slot></slot></ol>`.
- **Mobile** : le `.dropdown` existant. Le bouton `home` reste rendu par `ar-breadcrumb` à partir
  de `label` / `href` du premier item (lus sur l'instance). Le panel contient
  `<ol part="list list--mobile"><slot></slot></ol>`.

Un seul `<slot>` existe à la fois : il change d'emplacement quand `isMobile` change. Les items
étant des enfants light DOM de `ar-breadcrumb`, ils suivent le slot d'un `<ol>` à l'autre sans
être recréés.

### `ar-breadcrumb-item`

L'item a un shadow DOM propre (comme `ar-stepper-item`) :

- Hôte en `display: contents`, avec `role="listitem"` posé dans `updated()` ; `aria-current="page"`
  sur le dernier item, retiré sinon.
- Le shadow rend un wrapper interne (`position: relative`, flex centré) contenant, dans l'ordre :
    - **desktop, item non premier** : `<span part="separator" aria-hidden="true">` (contenu : cf.
      section 3) ;
    - **mobile, item visible ayant au moins un voisin visible** :
      `<span part="connector[ connector--first][ connector--last]" aria-hidden="true">` puis
      `<span part="indicator[ indicator--current]" aria-hidden="true">` ;
      `connector--first` quand aucun item visible ne précède, `connector--last` quand aucun ne
      suit ; un item visible seul ne rend pas de connecteur ;
    - le contrôle : `<a part="link" href=…>label</a>` ou `<span part="current">label</span>` pour
      le dernier item.
- En **mobile, le premier item ne rend rien** : il est déjà affiché par le bouton `home`. Son hôte
  porte l'attribut `hidden` et le CSS interne pose `:host([hidden]) { display: none; }` (sinon
  `:host { display: contents }` l'emporterait sur le style navigateur de `[hidden]`), pour ne pas
  exposer un `listitem` vide aux lecteurs d'écran.

### État de rendu

`ar-breadcrumb` calcule, à chaque reconstruction (déjà planifiée par `_scheduleRebuild`), un état
par item et le pousse via une méthode `setRenderState()` — même patron que
`ArStepperItem.setRenderState` :

```ts
export interface ItemRenderState {
    isFirst: boolean;
    isCurrent: boolean; // dernier item
    isMobile: boolean;
    hasPrevious: boolean; // un item visible précède celui-ci
    hasNext: boolean; // un item visible suit celui-ci
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

| Reste en interne                                                                                                 | Passe au thème (`::part()`)                                                                                    |
| ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Layout de `list--desktop` (flex row wrap) et `list--mobile` (flex column), reset `margin` / `padding` des `<ol>` | Couleur de la liste, `padding-inline-end` du nav                                                               |
| `display: inline-flex; align-items: center` sur `link`, `current`, `home`, `trigger`                             | Reset visuel des liens (couleur héritée, décoration)                                                           |
| Wrapper de l'item : flex centré, `position: relative`                                                            | Séparateur : couleur, taille de police                                                                         |
| Padding vertical des liens dans la liste mobile (`0.5rem 0.25rem`, cible tactile WCAG 2.5.8)                     |                                                                                                                |
| `svg { height: 1.25em; … }` et slots d'icône par défaut                                                          | Indicateur : tailles, marges, forme, couleur, variante `--current`                                             |
| Repli d'accessibilité `--ar-breadcrumb-toggle-min-size` (WCAG 2.5.8)                                             | Connecteur mobile : ligne pointillée, géométrie, couleur                                                       |
| Marge minimale du séparateur (cf. ci-dessous)                                                                    | Boutons `home` / `trigger` : fond, états hover / active / focus, transition, outline, `prefers-reduced-motion` |
| `distance` / `offset` (consommés par `AnchoredController`), tokens `--ar-panel-*`                                |                                                                                                                |

- **Séparateur** : marge interne fonctionnelle en `em` (ex. `margin-inline: 0.5em`), commentée
  `functional-default`, surchargeable par `::part(separator)`. Sans thème, items et séparateurs ne
  sont jamais collés. Aucune marge équivalente pour l'indicateur et le connecteur, dont la taille
  est purement visuelle.
- **Connecteur mobile** : un vrai élément (`part="connector"`), positionné par le thème
  (`position: absolute` relatif au wrapper interne). Il remplace le `::before` de la liste. Chaque
  item visible trace la portion de ligne de sa propre hauteur (`top: 0; bottom: 0`), de sorte que
  les segments de deux lignes successives se joignent bord à bord quelle que soit leur hauteur
  (libellé sur plusieurs lignes compris) ; les variantes `connector--first` (`top: 50%`) et
  `connector--last` (`bottom: 50%`) arrêtent le tracé au centre des indicateurs des extrémités.
  Ordre dans le thème : `connector` avant ses variantes (garde-fou `validate-part-state-order`).
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
  nœud modèle à chaque item via `ItemRenderState.separator`, et chaque item en fait un
  `cloneNode(true)` dans `<span part="separator" aria-hidden="true">` de son shadow. Le light DOM
  des items n'est jamais modifié. L'item ne re-clone que si le nœud modèle ou sa version change.
- **Suivi des changements.** Un `MutationObserver` sur `ar-breadcrumb` (`childList`, `subtree`,
  `characterData`, attribut `slot`) déclenche `_scheduleRebuild()` : nécessaire pour les frameworks
  réactifs qui modifient le texte de l'intérieur du `<span>` sans le recréer. Il est connecté dans
  `connectedCallback` et déconnecté dans `disconnectedCallback`.
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
  structure et parts (`link`, `current`, `separator`, `indicator`, `indicator--current`,
  `connector`) selon l'état de rendu ; `role="listitem"`, `aria-current="page"` sur le dernier ;
  premier item mobile sans rendu, `hidden` sur l'hôte ; aucun rendu avant le premier état ; « / » par défaut ; clonage du séparateur fourni.
- **`breadcrumb.test.ts`** : structure du parent (`nav`, `list--desktop` / `list--mobile`, bouton
  `home`, `trigger`, panel), état de rendu poussé aux items, ordre DOM, slot `separator` (clone dans
  chaque item, mise à jour sur mutation du contenu, repli « / » si le slot est retiré).
- **`breadcrumb.browser.test.ts`** : conserver ouverture / fermeture, light-dismiss, fond et
  bordure du panel sans thème, taille de cible des boutons `home` / `trigger` sans thème ;
  supprimer le test `collision hover/focus (#157)` (token `bg-focus` supprimé) et le test RTL
  `padding-inline-end` si ce padding passe au thème.
- **`breadcrumb.a11y.test.ts`** : vérifier que `role="listitem"` sur l'hôte `display: contents`
  d'un item, dans un `<ol>`, passe axe (même mécanisme que `ar-stepper-item`).
- Gardes-fous CI : `validate-cssprop-defaults` (tokens supprimés retirés du JSDoc et de `:root`) et
  `validate-part-state-order`.

## Fichiers touchés

- Composants : `breadcrumb.ts`, `breadcrumb.styles.ts`, `breadcrumb-item.ts`, nouveau
  `breadcrumb-item.styles.ts`.
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

- `display: contents` avec `role="listitem"` sur l'hôte d'un item dans un `<ol>` du shadow :
  même mécanisme que `ar-stepper-item`, à revérifier par le test a11y du breadcrumb.
- Le clonage du séparateur instancie deux fois les éventuels custom elements du contenu (original
  dans le light DOM, caché, et un clone par item) : documenté.
