# Design — `ar-dialog` : personnalisation du header (actions, titre invisible, header absent)

**Statut :** Validé (en attente de plan d'implémentation)
**Date :** 2026-08-11
**Contexte :** issue [#145](https://github.com/jogo-labs/ariane/issues/145)

## Question préalable : séparer `ar-dialog`/`ar-drawer` (façon WebAwesome) ?

Tranchée en amont du reste du design, car elle détermine si ce qui suit s'applique à un seul
composant ou deux.

**Décision : non — `ar-dialog` reste unifié (`mode="modal"|"drawer"`).**

Motivation initiale de la question : dialog sert à du contenu simple, drawer à du contenu plus
riche, et le header/footer pourrait ne pas avoir la même complexité entre les deux — inquiétude
renforcée par le fait que WebAwesome (Shoelace) a fait le choix de deux composants séparés
(`wa-dialog`/`wa-drawer`).

Vérification faite en lisant directement le code source de WebAwesome
(`shoelace-style/webawesome`, `packages/webawesome/src/components/{dialog,drawer}/`) :

- Les deux fichiers (`dialog.ts` 346 lignes, `drawer.ts` 358 lignes) étendent uniquement
  `WebAwesomeElement`, leur classe Lit générique utilisée par tous leurs composants — aucune base
  partagée spécifique au couple dialog/drawer.
- Diff des deux fichiers : **256 lignes de différence sur ~350** — essentiellement le même
  composant copié-collé avec renommage mécanique (`dialog`→`drawer`, `this.dialog`→`this.drawer`,
  etc.). La seule vraie différence fonctionnelle est la propriété `placement` sur le drawer — que
  `ar-dialog` a déjà, unifiée.
- **Le `render()` du header et du footer est strictement identique** entre les deux fichiers :
  même structure (`<header part="header">`, `<h2 id="title"><slot name="label">`, slot
  `header-actions`, bouton close), même `withoutHeader`, même footer conditionnel sur slot. Ça
  contredit directement l'inquiétude de départ — même chez WebAwesome, header et footer ne
  divergent pas entre dialog et drawer.
- Bonus relevé en cours de route : ni `dialog.ts` ni `drawer.ts` de WebAwesome ne posent le
  moindre `aria-labelledby`/`aria-label`/`role` explicite dans leur template. `ar-dialog` fait
  déjà mieux aujourd'hui (`role="dialog"` + `aria-labelledby="dialog-heading"` +
  `aria-modal="true"` + repli `DEFAULT_DIALOG_LABEL` + warning dev si label manquant) — reproduire
  leur pattern tel quel aurait été un recul a11y, pas une garantie de robustesse.

Conclusion : la séparation de WebAwesome n'est pas motivée par une divergence architecturale
réelle entre dialog et drawer — c'est de la duplication de code. Sur le point précis qui motivait
la question (complexité différente du header/footer), ils n'ont eux-mêmes rien différencié.
`ar-dialog` reste un seul composant ; les vraies différences entre modes (largeur/hauteur par
défaut, direction d'animation, `placement`) restent isolées via sélecteurs d'attribut dans
`dialog.styles.ts`, pattern déjà en place et qui fonctionne.

## Les 3 cas de l'issue

### 1. Actions additionnelles dans le header

Nouveau slot nommé **`header-actions`**, unique (pas de `header-start`/`header-end` — YAGNI, aucun
besoin concret identifié au-delà du cas cité dans l'issue). Positionné dans le DOM entre le titre
et le bouton close (donc juste avant lui dans l'ordre de tabulation). Alignement avec l'API
WebAwesome sur ce point précis (même nom de slot, même position) — ici la convergence est
justifiée par un vrai besoin partagé, pas par mimétisme.

### 2. Titre non visible (mais toujours nommé pour l'a11y)

**Pas de nouvel attribut.** `part="title"` existe déjà sur le `h1` — le consommateur masque
lui-même visuellement via `::part(title)`. Documenté avec la technique sr-only correcte :

```css
ar-dialog::part(title) {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
}
```

Note technique à inclure dans la doc : ne pas utiliser `display: none` ni `visibility: hidden` —
certains navigateurs excluent le texte d'un élément totalement masqué du calcul du nom accessible
via `aria-labelledby`, ce qui casserait le nom du dialog pour les lecteurs d'écran.

### 3. Header absent

Nouvel attribut booléen **`without-header`**. Effets :

- Le `<header>` n'est **pas rendu du tout** (pas de titre, pas de zone `header-actions`, pas de
  bouton close) — pas un simple `display: none` en CSS, un retrait conditionnel dans `render()`
  (même pattern que le footer conditionnel existant, `dialog.ts:279-283`).
- La propriété `label` (texte brut) **devient requise** dans ce mode : elle alimente `aria-label`
  directement (voir section ARIA ci-dessous), puisqu'il n'y a plus de `h1#dialog-heading` à
  référencer via `aria-labelledby`. Le warning dev existant `_warnIfMissingLabel` continue de
  s'appliquer tel quel (il ne dépend pas de l'état du header) et couvre ce cas.
- Le slot `label` (titre HTML riche) devient **sans effet** dans ce mode — `aria-label` ne peut
  contenir que du texte brut, pas de HTML. Un warning dev signale si `slot="label"` est fourni
  sans la prop `label` en mode `without-header` (son contenu serait silencieusement ignoré sinon).
- Le footer garde son comportement actuel, inchangé (déjà conditionnel sur contenu du slot).

## ARIA : bascule `aria-labelledby` → `aria-label`

Le `<dialog>` racine passe de :

```html
<dialog aria-labelledby="dialog-heading" ...></dialog>
```

à, conditionnellement quand `without-header` est actif :

```html
<dialog aria-label="${headingLabel}" ...></dialog>
```

`headingLabel` est la même valeur déjà calculée par `_getHeadingLabel()` (repli
`DEFAULT_DIALOG_LABEL` inclus) — aucune nouvelle logique de résolution du libellé, seule la cible
ARIA change selon la présence du header.

## Garde-fou : dialog toujours fermable sans header

Échap fonctionne nativement dans tous les cas (géré au niveau de l'élément `<dialog>`, via
`_handleDocumentKeyDown` — indépendant de la présence du header). Mais si en plus
`close-on-backdrop` est à `false` et qu'aucun élément `[data-ar-dismiss]`/`[data-ar-accept]`
n'existe dans le contenu slotté par le consommateur, le dialog devient fermable **uniquement** au
clavier — piège potentiel pour un utilisateur souris qui ne connaît pas Échap.

**Nouveau warning dev** (même pattern que `_warnIfMissingLabel`, déclenché une seule fois) : si
`without-header` est actif, `closeOnBackdrop` est `false`, et aucun `[data-ar-dismiss]`/
`[data-ar-accept]` n'est détecté dans le contenu slotté (`this.querySelector`), avertir en
développement. Documenté aussi en note dans la doc du composant.

## Focus management : aucun changement de code nécessaire

Le repli en cascade existant (`dialog.ts:441-454` : `[autofocus]` → premier élément focusable →
`[data-ar-dismiss]` → `this.dialog`) gère déjà nativement l'absence du bouton close via son
enchaînement de `??` — quand `[data-ar-dismiss]` n'existe plus dans le shadow DOM (mode
`without-header`), `querySelector` renvoie `null` et le repli tombe directement sur `this.dialog`.
À vérifier par un test dédié, mais aucune modification de la logique existante n'est requise.

## Impact

**Composant** (`packages/core/src/components/dialog/dialog.ts`) :

- Nouvelle propriété `@property({ reflect: true, type: Boolean, attribute: 'without-header' })
withoutHeader = false;`.
- `render()` : le bloc `<header>` devient conditionnel sur `!this.withoutHeader` (pattern miroir
  du footer existant). Ajout du slot `header-actions` entre le titre et le bouton close, dans le
  header. `aria-labelledby`/`aria-label` sur le `<dialog>` racine devient conditionnel sur
  `this.withoutHeader`.
- Nouvelle méthode privée `_warnIfNoCloseMechanism()` (ou extension de `_warnIfMissingLabel`),
  appelée depuis `updated()`, une seule fois (même pattern `_hasWarnedX` que l'existant).
- Warning dev pour `slot="label"` fourni sans prop `label` en mode `without-header`.
- JSDoc : nouveau `@slot header-actions`, nouveau `@csspart` si nécessaire (aucun a priori — pas
  de wrapper dédié prévu pour `header-actions`, le slot s'insère directement dans `header`),
  `@attr without-header` documenté avec la contrainte "label requis dans ce mode".

**Styles** (`packages/core/src/components/dialog/dialog.styles.ts`) :

- Positionnement du contenu du slot `header-actions` dans le `header` (`display: flex` déjà en
  place sur `header` — le nouveau slot s'intègre dans le flow existant, entre le titre et
  `[part='close']`).

**Docs** (`apps/docs/src/content/components/ar-dialog.mdx`) :

- Section sur `header-actions` (exemple avec un bouton d'action).
- Section sur le masquage visuel du titre via `::part(title)`, avec la technique sr-only complète
  et la mise en garde `display:none`/`visibility:hidden`.
- Section sur `without-header` : exemple, rappel que `label` est requis, rappel qu'un moyen de
  fermeture doit rester accessible (close-on-backdrop ou action dans le contenu/footer), sinon
  Échap reste le seul recours.

**Tests** (`dialog.test.ts`, `dialog.a11y.test.ts`, `dialog.browser.test.ts`) :

- `without-header` : header absent du DOM rendu, `aria-label` posé au lieu de `aria-labelledby`,
  slot `label` sans effet (warning émis si fourni sans prop `label`).
- `header-actions` : slot rendu et positionné avant le bouton close.
- Warning dev émis quand `without-header` + `closeOnBackdrop=false` + aucun élément
  dismiss/accept dans le contenu ; absent sinon (close-on-backdrop actif, ou élément dismiss
  présent).
- Focus management : premier focusable correctement ciblé quand le bouton close n'existe plus
  (repli sur `this.dialog`).
- Non-régression : comportement actuel (header toujours présent) inchangé quand `without-header`
  n'est pas posé.

## Hors scope

- Séparation `ar-dialog`/`ar-drawer` en deux composants — tranchée ci-dessus (non retenue).
- Slots multiples pour le header (`header-start`/`header-end`) — YAGNI, aucun besoin identifié.
- Repositionnement du bouton close en overlay quand `without-header` est actif — le bouton
  disparaît entièrement plutôt que d'être repositionné, cohérent avec Échap/backdrop comme filet
  de sécurité et avec le comportement WebAwesome sur ce point précis.
- Attribut dédié pour masquer visuellement le titre sans le retirer de l'a11y — couvert par
  `::part(title)` déjà existant, pas de nouvelle API nécessaire.
