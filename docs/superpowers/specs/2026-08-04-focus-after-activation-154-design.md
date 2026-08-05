# Restaurer le focus après activation d'un élément qui devient non focalisable (#154)

**Date :** 2026-08-04
**Statut :** Brouillon — à valider avant plan

## Contexte

Sur `ar-pagination`, cliquer (ou activer au clavier) un numéro de page fait passer le `<a
part="link">` ciblé à `<span part="current">` (non focalisable) au re-render suivant. Aucun
élément ne reprend le focus : `document.activeElement` retombe sur `<body>`, un `Tab` suivant
repart du tout début du document au lieu de continuer depuis la pagination. Vérifié empiriquement
(Playwright, Chromium réel) par le mainteneur avant l'ouverture de l'issue.

En explorant la conception, le même schéma a été trouvé sur `ar-stepper` : un `<a
part="step-link">` cliqué devient un `<div class="item-header">` dès que l'étape (ou sous-étape)
cliquée passe à l'état courant (`stepper.renderer.ts`, condition `isCompleted`). Décision du
mainteneur (2026-08-04, commentaire sur l'issue) : traiter les deux composants dans la même
conception plutôt que composant par composant.

## Décision retenue

Focus programmatique sur le nouvel élément « courant » lui-même, juste après le re-render :

- `tabindex="-1"` en permanence sur l'élément non focalisable (`[part='current']` côté
  pagination, `.item-header` du `<div>` de remplacement côté stepper) — jamais un arrêt `Tab`
  normal (l'élément n'est pas actionnable), mais reçoit le focus explicitement après activation.
  Un `Tab` suivant continue naturellement depuis cet élément vers le prochain focalisable du DOM.
- Indicateur visuel de focus en `:focus-visible` (pas `:focus`) : le focus posé ici est
  programmatique, et les navigateurs modernes basent le matching de `:focus-visible` sur la
  dernière modalité d'interaction connue. Une activation clavier (Entrée) → modalité "clavier" →
  `:focus-visible` matche, l'anneau s'affiche. Un clic souris → modalité "souris" →
  `:focus-visible` ne matche pas, pas d'anneau parasite pour l'utilisateur souris. C'est
  exactement le comportement voulu, sans logique supplémentaire à écrire.

## Mécanisme partagé

Nouvel utilitaire `packages/core/src/a11y/focus-after-update.ts` (même dossier/niveau
d'abstraction que `announce-a11y.ts` — fonction pure, pas un controller réactif, l'usage étant
ponctuel) :

```ts
import type { ReactiveElement } from 'lit';

/**
 * Focalise le premier élément du shadow DOM correspondant à `selector`, une fois le rendu
 * en cours terminé. Sans effet si aucun élément ne matche.
 */
export async function focusAfterUpdate(host: ReactiveElement, selector: string): Promise<void> {
    await host.updateComplete;
    host.shadowRoot?.querySelector<HTMLElement>(selector)?.focus();
}
```

`await host.updateComplete` est sûr à appeler même depuis l'intérieur du cycle de mise à jour de
Lit (`updated()`) — la promesse est déjà résolue ou se résout au prochain microtask, pas de risque
de blocage ni de double-rendu.

## `ar-pagination`

État interne (`current`) muté directement dans le click handler → cas simple.

- `renderPageLink` : ajouter `tabindex="-1"` sur `<span part="current">`.
- `_onPageChange` : après avoir posé `this.current = ...`, appeler
  `focusAfterUpdate(this, '[part~="current"]')`.
- `_onPreviousPage`/`_onNextPage` ne sont **pas concernés** : ces boutons restent des `<a>` dans
  tous les cas (jamais remplacés par un autre tag), Lit ne détruit donc jamais le nœud focalisé
  quand on clique dessus — seul un clic direct sur un numéro de page déclenche la disparition du
  nœud focalisé.

## `ar-stepper`

Plus délicat : `currentPath` est une propriété **contrôlée par le consommateur** (pattern
« composant contrôlé », cf. `onClickLink` qui se contente de dispatcher
`ar-stepper-step-change` sans jamais muter `this.currentPath` lui-même). Le re-render qui fait
disparaître le `<a>` cliqué n'a donc lieu que plus tard, quand (et si) le consommateur répond à
l'event en mettant à jour l'attribut `current-path` — potentiellement jamais si l'event est
ignoré ou bloqué.

- **Intention en attente** : `onClickLink` mémorise le `path` cliqué dans un champ privé
  `_pendingFocusPath`, en plus de dispatcher l'event comme aujourd'hui.
- **Confirmation au bon cycle** : dans `updated(changed)`, si `changed.has('currentPath')` ET
  `this.currentPath === this._pendingFocusPath`, appeler
  `focusAfterUpdate(this, `[data-path="${this._pendingFocusPath}"]`)`.
- **Fenêtre bornée à un seul cycle** : `_pendingFocusPath` est remis à `undefined` en fin de
  `updated()`, que la condition ait matché ou non — sans ça, un `currentPath` qui matcherait plus
  tard pour une tout autre raison (ex. `handleScrollChange` en mode `follow-scroll` atteignant
  coïncidemment le même step) volerait le focus pendant un scroll, ce qui serait un vrai bug UX.
  En bornant à un seul cycle, seule une mise à jour de `currentPath` survenant **immédiatement**
  après le clic déclenche le focus — le cas normal d'un consommateur qui répond à l'event de
  façon synchrone ou quasi-synchrone (le cas React/Vue typique).
- **`data-path` sur le `<div>` de remplacement** : actuellement seul le `<a>` porte
  `data-path=${step.path}` (`stepper.renderer.ts:118`). Nécessaire d'ajouter le même attribut sur
  le `<div class="item-header">` de remplacement (`renderStep` ligne ~126, `renderSubStep` ligne
  ~87) — **pas pour du style ou un usage externe, uniquement pour lever une ambiguïté de
  sélecteur** : `isGroupCurrent()` fait qu'un step parent ET sa sous-étape active sont
  simultanément `.item.current` quand une sous-étape est l'étape réellement courante (le parent
  devient lui aussi un `<div>` non cliquable). Une sélection par simple classe
  (`.item.current > .item-header`) matcherait alors 2 éléments ; `[data-path="..."]` cible sans
  ambiguïté l'élément qui correspond exactement au `path` cliqué.

## CSS

Ajouter `:focus-visible` sur les éléments concernés, cohérent avec le style déjà existant sur les
éléments interactifs voisins du même composant :

- `pagination.styles.ts` : `[part~='current']:focus-visible` — même déclaration que
  `[part~='link']:focus-visible` (ligne 45-48 actuelle), `outline: 2px solid currentColor;
outline-offset: 2px;`.
- `stepper.styles.ts` : `<a class="item-header" part="step-link">` et `<div class="item-header">`
  portent tous les deux `class="item-header"` (`stepper.renderer.ts`, les deux branches du
  ternaire `isCompleted ? html\`<a class="item-header" ...>\` : html\`<div class="item-header">\``)
— `.item-header`est donc déjà un sur-ensemble de`[part~='step-link']`pour cette règle
précise, un seul sélecteur suffit. Remplacer le`&:focus { outline-offset: 4px; outline-color:
  var(--ar-stepper-link-focus-outline-color); }`actuellement imbriqué dans`[part~='step-link']
  { }` (lignes 93-96) par une règle top-level partagée :

        ```css
        .item-header:focus-visible {
            outline-offset: 4px;
            outline-color: var(--ar-stepper-link-focus-outline-color);
        }
        ```

        Le reste du bloc `[part~='step-link'] { &:is(:focus, :hover) { ... } }` (recoloriage
        puce/label) reste inchangé et scopé au seul `<a>` — volontairement **pas** étendu à
        `.item-header`, pour ne pas donner un signal visuel « interactif » (recoloriage au survol
        souris) à l'étape courante non cliquable.
        Effet de bord assumé : le vrai lien `<a part="step-link">` passe de `:focus` à
        `:focus-visible` pour cette règle — comportement plus cohérent avec le reste de la librairie
        (`[part~='link']:focus-visible` de pagination) : l'anneau ne s'affiche plus après un clic
        souris sur un lien d'étape, seulement au clavier. Aucun test existant ne dépend de `:focus` sur
        `step-link`, pas de régression attendue.

## Tests

- **Unitaire (vitest/happy-dom)** : après `_onPageChange`/`onClickLink` + `await
el.updateComplete`, `el.shadowRoot?.activeElement` pointe vers le nouvel élément courant
  attendu (par sélecteur), et celui-ci porte `tabindex="-1"`. Pour stepper : simuler la réponse du
  consommateur en réassignant `el.currentPath` après l'event (pattern déjà utilisé par les tests
  existants du composant, contrôlé), vérifier le focus seulement dans ce cas — et vérifier
  qu'aucun focus n'est volé quand `currentPath` change pour une raison sans rapport (scroll-follow
  simulé) après la fenêtre d'un cycle.
- **Browser (WTR, Chromium réel)** : activer un lien au clavier (focus + Entrée), vérifier qu'un
  `Tab` suivant atteint l'élément focalisable suivant dans le DOM (pas `<body>`). Vérifier
  visuellement/programmatiquement que `:focus-visible` matche après une activation clavier.

## Vérification

- `npm run test --workspace=packages/core -- pagination stepper`
- Suite browser (WTR) des deux composants
- `npm run build:manifest --workspace=packages/core` (nouveaux `@csspart`/`@cssprop` — aucun
  attendu ici, changement purement comportemental/CSS interne, pas de nouveau token)
- Vérification manuelle Playwright : activation clavier sur pagination et sur stepper (top-level
  et sous-étape), confirmer la continuité du parcours `Tab` et l'apparition de l'anneau de focus
  uniquement après activation clavier (pas après un clic souris).

## Hors scope

- `ar-breadcrumb` : pattern similaire en apparence (lien → `<span part="current">`), mais ce
  `<span>` représente la page **déjà affichée** (dernier élément du fil, jamais un lien cliquable
  au départ) — aucune activation ne transforme un lien fraîchement cliqué en élément non
  focalisable dans ce composant, pas concerné par ce bug précis.
- Le bug de collision hover/focus sur `ar-breadcrumb` (icône trigger invisible au survol après
  clic, [issue #157](https://github.com/jogo-labs/ariane/issues/157)) — sujet distinct, déjà
  tracké séparément.
- Rendu desktop d'`ar-stepper` (liste verticale) : même mécanisme, aucune divergence attendue
  (même `renderStep`/`renderSubStep`), pas de traitement spécifique nécessaire au-delà de ce qui
  est déjà couvert ci-dessus.
