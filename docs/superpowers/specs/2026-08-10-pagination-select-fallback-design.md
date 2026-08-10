# Design — `<select>` de saut de page au palier minimal d'ar-pagination

**Statut :** Validé (en attente de plan d'implémentation)
**Date :** 2026-08-10
**Contexte :** suite du masquage responsive progressif (#152, [spec du
2026-08-07](2026-08-07-pagination-responsive-masking-design.md), PR #172)

## Contexte

Le masquage responsive livré en PR #172 introduit un palier texte ("Page X sur Y", non
interactif) quand la largeur disponible ne permet plus d'afficher la fenêtre minimale de boutons
numérotés (`floorSlots` : 3 en position de bord, 5 sinon). Ce palier dégrade significativement
l'expérience par rapport au desktop : plus aucun moyen d'atteindre directement une page qui n'est
ni la précédente ni la suivante, alors que ce plancher se déclenche dès ~375px de large — une
largeur d'écran mobile courante, pas un cas extrême.

La spec du 2026-08-07 excluait explicitement un widget de saut de page ("hors scope : pattern
d'interaction différent, non demandé par l'issue"). Ce document révise cette décision : un
`<select>` natif remplace le palier texte, sans élargir le périmètre visuel ni casser le contrat
headless.

## Décisions issues du brainstorming

- **Portée de la bascule** : uniquement le palier le plus étroit (ex-mode texte). Les réductions
  intermédiaires (fenêtre à ellipses avec boutons cliquables, budget entre le plancher et le total)
  restent inchangées.
- **Contenu du `<select>`** : les mêmes options que produirait `_calculatePages` au plancher —
  première page, dernière page, fenêtre minimale autour de la page courante — pas la liste
  complète 1..total. Les ellipses deviennent des `<option disabled>`. Aucune modification de
  l'algorithme `_calculatePages` : son plancher naturel (`_minimalPages`) est déjà exactement ce
  qu'il faut peupler.
- **Style** : le `<select>` reste headless (`appearance: none` structurel dans les styles du
  composant, apparence visuelle dans `themes/default.css`) — le déclencheur est stylable, la liste
  d'options natives (rendue par l'OS) ne l'est pas, ce qui est un compromis accepté et déjà
  pratiqué sur d'autres projets par l'équipe.
- **Repli sous le `<select>`** : pas de mécanisme dédié. Un `<select>` (contrôle unique) est bien
  plus étroit que la rangée de boutons qu'il remplace ; le cas où même lui ne tiendrait pas à côté
  de prev/next (largeur extrême, <150px) n'est pas traité séparément — pas de sur-ingénierie pour
  un cas non observé aux largeurs réelles ciblées (320px+).

## Architecture

### 1. Rendu — un seul point de bascule modifié

Dans `pagination.ts`, la condition `useTextMode` (actuellement `this._budget < floorSlots`)
déclenche désormais le rendu d'un `<select>` au lieu du texte statique :

```html
<li part="item page-select">
    <span class="sr-only" id="ar-pagination-select-label">Aller à la page</span>
    <select part="select" aria-labelledby="ar-pagination-select-label" @change="${...}">
        <!-- options générées depuis _calculatePages(current, total, this._budget) -->
    </select>
</li>
```

Rien d'autre ne change : la réduction progressive par `siblingCount` décroissant (largeurs
intermédiaires) continue de rendre des `<li>` numérotés cliquables comme aujourd'hui ; prev/next
restent affichés et fonctionnels dans tous les cas, y compris au palier `<select>`.

### 2. Génération des options

Réutilisation directe de `_calculatePages(current, total, this._budget)` — aucune modification de
`pagination.utils.ts`. Le mapping des éléments retournés :

- page numérique `n` → `<option value="${n}" ?selected=${n === current}>Page ${n} sur ${total}</option>`
- sentinelle d'ellipse (`-1`/`-2`) → `<option disabled>…</option>`

Le label complet ("Page 2 sur 20", cohérent avec le texte déjà utilisé par `announceA11y`) plutôt
qu'un simple numéro : un `<select>` fermé affiche le texte de l'option sélectionnée, donc ce choix
expose le total sans avoir à ouvrir le picker. Contrepartie assumée : le déclencheur fermé est plus
large qu'un simple numéro — **à confirmer empiriquement** (§5) qu'il tient toujours à 320-375px à
côté de prev/next.

**Contrainte technique** : le contenu d'un `<option>` est du texte brut — toute balise imbriquée
(`<span aria-hidden>`, `sr-only`, etc.) est ignorée par le navigateur, aussi bien à l'affichage
(y compris le picker natif OS) qu'à l'annonce lecteur d'écran. Le texte visuel et le texte
accessible d'une option sont donc nécessairement identiques ; aucune compression différenciée n'est
possible à l'intérieur des `<option>` (contrairement aux `<span class="sr-only">` déjà utilisés
ailleurs dans le composant, sur des éléments DOM normaux).

Si la vérification empirique montre un débordement, le repli se fait sans ajouter d'élément
sibling — le `<select>` reste seul : les options passent à un label court (`${n}`), et le
`<select>` porte un `aria-label` dynamique combinant nom et valeur courante
(ex. `"Aller à la page, page 2 sur 20"`, recalculé à chaque changement de `current`), à la place du
`aria-labelledby` statique décrit en §3. Le texte visuel affiché dans le déclencheur fermé reste
court (`"2"`), seul le nom accessible porte l'information complète.

Exemple à `total=20, current=10` (fenêtre minimale, non-bord) : options "Page 1 sur 20" ·
… · "Page 10 sur 20" · … · "Page 20 sur 20" — le jeu de pages est identique à ce que produirait un
desktop très réduit avec le même budget, seul le label change.

### 3. Interaction et accessibilité

- Événement `change` sur le `<select>` → même chemin que `_onPageChange` aujourd'hui : lecture de
  la valeur sélectionnée, `this.current = ...`, émission de `ar-pagination-page-change`
  (`{ from, to }`), `announceA11y`. Pas de gestion de focus additionnelle : le focus natif reste
  sur le `<select>` après sélection (contrairement au clic sur un lien, qui déplace le focus vers
  `[part~="current"]` via `focusAfterUpdate`).
- Nom accessible (cas par défaut, label complet dans les options) : `<span class="sr-only">` +
  `aria-labelledby`, cohérent avec le pattern déjà utilisé pour prev/next
  (`<span class="sr-only">Page précédente…</span>`) — la valeur (page courante) est déjà portée
  par le texte de l'option sélectionnée, pas besoin de la dupliquer dans le nom.
- Nom accessible (repli, labels d'option courts) : `aria-label` dynamique sur le `<select>`
  combinant nom et valeur (§2), remplace le `aria-labelledby` ci-dessus dans ce cas — un élément
  ne peut porter les deux sans que `aria-labelledby` ne l'emporte silencieusement.
- Les `<option disabled>` (ellipses) sont nativement ignorées par la navigation clavier et les
  lecteurs d'écran — comportement natif du `<select>`, aucun code custom requis.

### 4. Style

- Nouveaux parts : `select` (sur l'élément `<select>`) et `page-select` (sur le `<li>` englobant,
  symétrique à `page-status` qu'il remplace).
- `pagination.styles.ts` : `appearance: none` structurel + réutilisation de
  `--ar-pagination-btn-size` pour la hauteur minimale (cohérence WCAG 2.5.8 avec les autres
  contrôles). Aucune couleur/fond en dur — va dans `themes/default.css` (flèche custom, apparence
  visuelle du déclencheur), conformément à la philosophie headless du projet.
- `[part~='page-status']` et sa règle `white-space: nowrap` sont supprimés (le mode texte
  disparaît).
- JSDoc du composant : entrée `@csspart page-status` retirée, `@csspart select` et
  `@csspart page-select` ajoutées.

### 5. Documentation

`apps/docs/src/content/components/ar-pagination.mdx`, section "Comportement responsive" : le
troisième point ("Largeur extrême : … remplacés par un texte") est réécrit pour décrire le
`<select>` de saut de page à la place du texte statique.

## Tests

- **Unitaires (Vitest)** : génération des options du `<select>` à partir de
  `_calculatePages` (mapping page → `<option>`, ellipse → `<option disabled>`, `selected` sur la
  page courante) ; émission de `ar-pagination-page-change` au `change`.
- **Browser (WTR)** : comportement responsive réel au palier minimal — présence du `part="select"`
  à largeur réduite (remplaçant l'actuel test du palier texte), absence des anciens
  `part="page-status"`, sélection d'une option qui déclenche bien le changement de page.
- **Vérification manuelle (Playwright)** : avant de considérer le spec figé, vérifier
  empiriquement que la bascule vers le `<select>` se produit bien autour de 320-375px selon le
  budget réel mesuré (pas seulement en test headless/jsdom), et que le style natif + custom du
  `<select>` se comporte correctement dans un vrai rendu navigateur. Vérifier en particulier que le
  déclencheur fermé avec label complet ("Page 20 sur 20", le cas le plus large) ne déborde pas à
  320-375px à côté de prev/next — sinon appliquer le repli décrit en §2 (label court + `aria-label`
  dynamique, sans élément sibling) avant de figer le plan d'implémentation.

## Hors scope

- Peupler le `<select>` avec la liste complète 1..total (redondant avec l'objectif de réduction
  visuelle ; le picker natif deviendrait long sans bénéfice par rapport à la fenêtre réduite).
- Mesure dédiée de la largeur du `<select>` pour un repli prev/next-seul en dessous — cas non
  observé aux largeurs réelles ciblées, à reconsidérer seulement si un usage réel le montre
  nécessaire.
- Support de tailles d'item hétérogènes entre les numéros de page (hérité de la spec du
  2026-08-07, toujours hors scope ici).
