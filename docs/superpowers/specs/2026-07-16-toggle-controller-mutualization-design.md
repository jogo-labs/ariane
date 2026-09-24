# Mutualisation du pattern events annulables (ToggleController)

Date : 2026-07-16
Contexte : [issue #111](https://github.com/jogo-labs/ariane/issues/111) (chantier technique global), item 1 — 2ᵉ moitié. La 1ʳᵉ moitié (bug d'émission parasite du toggle opposé sur annulation) est livrée en [PR #112](https://github.com/jogo-labs/ariane/pull/112). Fait suite à [`2026-07-14-pr2-events-convention-design.md`](./2026-07-14-pr2-events-convention-design.md), qui a aligné `ar-breadcrumb`/`ar-tooltip`/`ar-stepper` sur le pattern `show`/`shown`/`hide`/`hidden` déjà en place sur `ar-dropdown`/`ar-dialog`/`ar-collapse`.

## Objectif

Deux choses distinctes mais liées :

1. **Mutualiser** la mécanique dupliquée entre `ar-dropdown`, `ar-breadcrumb` et `ar-collapse` (émission `show`/`hide` annulable, revert de `open` sur annulation, flag anti-cycle-redondant post-fix PR #112) dans un `ReactiveController` partagé, `ToggleController` — même famille que `AnchoredController`.
2. **Ajouter** des événements `-prevented` (`ar-*-show-prevented`/`ar-*-hide-prevented`) sur les 4 composants disclosure (`ar-dropdown`, `ar-breadcrumb`, `ar-collapse`, `ar-dialog`), pour que le consommateur soit notifié explicitement d'une annulation au lieu de devoir inspecter `el.open` après coup. `ar-dialog` a déjà `ar-dialog-hide-prevented` ; il lui manque `ar-dialog-show-prevented`.

## Périmètre

**Mutualisé via `ToggleController`** : `ar-dropdown`, `ar-breadcrumb`, `ar-collapse`.

**Non mutualisé, ajout minimal dans le code existant** : `ar-dialog` — sa logique (`_isClosing`, `_closePending`, animations, focus trap, shake + annonce a11y sur annulation) est trop spécifique pour justifier de la forcer dans le controller. Il gagne juste l'émission de `ar-dialog-show-prevented` au bon endroit dans `_show()`. La question de le faire passer par le controller plus tard reste ouverte, à réévaluer une fois le reste du chantier terminé (pas dans ce spec).

## `ToggleController`

Nouveau fichier `packages/core/src/controllers/toggle.controller.ts`.

```ts
export interface ToggleControllerOptions {
    /** Préfixe des events, ex. 'ar-dropdown' → ar-dropdown-show, ar-dropdown-show-prevented, etc. */
    eventPrefix: string;
    /** Logique d'ouverture propre au composant, appelée si le show n'est pas annulé. */
    onShow: () => void;
    /** Logique de fermeture propre au composant, appelée si le hide n'est pas annulé. */
    onHide: () => void;
}

export class ToggleController implements ReactiveController {
    constructor(
        host: ReactiveControllerHost & HTMLElement & { open: boolean },
        opts: ToggleControllerOptions,
    );
}
```

**Responsabilités** :

- Détecte que `open` a changé en comparant à une valeur `_lastOpen` interne à chaque `hostUpdated()` — remplace le `changed.has('open')` que chaque composant gérait dans son propre `updated()`. `_lastOpen` s'initialise à `false` dans le constructeur (valeur par défaut de la propriété `open` sur les 3 composants) : si `open` vaut déjà `true` au tout premier `hostUpdated()` (élément créé avec l'attribut posé avant connexion), la comparaison le détecte comme un changement et déclenche `onShow()` — à vérifier explicitement à l'implémentation contre le test existant `"n'émet ar-dropdown-show qu'une fois quand open est déjà vrai au premier rendu"`, qui dépend de ce comportement.
- Diffère l'action via `host.updateComplete.then()` (même raison qu'aujourd'hui : `Popover.show()`/`hide()` appellent `host.requestUpdate()`, un appel synchrone déclencherait l'avertissement dev Lit "change-in-update").
- Émet `<prefix>-show` ou `<prefix>-hide` (`cancelable: true`).
- Si `defaultPrevented` : revert `host.open` à sa valeur précédente, pose le flag interne anti-cycle-redondant (`_suppressNextToggle`, hérité du fix PR #112, désormais interne au controller au lieu d'un champ privé par composant), puis émet `<prefix>-show-prevented` ou `<prefix>-hide-prevented` (`cancelable: false`) — **dans cet ordre** (revert puis événement), comme le fait déjà `ar-dialog-hide-prevented` aujourd'hui.
- Sinon, appelle `opts.onShow()`/`opts.onHide()` et s'arrête là. L'émission de `<prefix>-shown`/`<prefix>-hidden` reste à la charge du composant lui-même (timing variable : promise pour dropdown/breadcrumb via `Popover.show()`, sync ou `transitionend` pour collapse selon `prefersReducedMotion()`).
- `onExternalClose` (popover, light-dismiss/Escape natif) continue de faire `host.open = false` directement, sans passer par le controller pour l'annulation — le controller le détecte comme une transition normale (le flag n'est pas posé), donc `onHide()` s'exécute et les events s'émettent normalement. C'est le comportement validé empiriquement par le fix de régression CI de PR #112 ; le controller doit le préserver à l'identique.

## Fonction d'émission partagée

Le `_emit()` privé dupliqué dans chaque composant (`{ bubbles: true, composed: true, cancelable: true, detail: { id: host.id || undefined } }` pour _tous_ les events) est remplacé par une fonction exportée, utilisée à la fois par le controller (pour `show`/`hide`/`show-prevented`/`hide-prevented`) et par chaque composant (pour `shown`/`hidden`) :

```ts
export function emitToggleEvent(
    host: HTMLElement,
    name: string,
    opts: { cancelable: boolean },
): CustomEvent {
    const e = new CustomEvent(name, {
        bubbles: true,
        composed: true,
        cancelable: opts.cancelable,
        detail: { id: host.id || undefined },
    });
    host.dispatchEvent(e);
    return e;
}
```

**Correctif de comportement inclus** : aujourd'hui, `_emit()` pose `cancelable: true` sur _tous_ les events, y compris `shown`/`hidden` et `ar-dialog-hide-prevented`, alors que rien ne vérifie `defaultPrevented` dessus — c'est purement informatif. La nouvelle fonction partagée corrige ça : `cancelable: true` uniquement pour `show`/`hide`, `false` pour `shown`/`hidden`/`show-prevented`/`hide-prevented`. Changement mineur de comportement (le `CustomEvent.cancelable` observable passe de `true` à `false` sur ces events), accepté sans dépréciation — precedent posé par [PR #89](https://github.com/jogo-labs/ariane/pull/89) pour les breaking changes en alpha.

Placement : `packages/core/src/utils/toggle-events.ts` (à côté de `popover.ts`, pas dans le controller lui-même, pour rester réutilisable par `ar-dialog` qui n'utilise pas le controller).

## Impact par composant

### `ar-dropdown`

- `_show()`/`_hide()` deviennent les callbacks `onShow()`/`onHide()` passés au `ToggleController`.
- Le bloc `changed.has('open')` disparaît de `updated()`.
- Le champ privé `_suppressNextToggle` (ajouté par PR #112) disparaît, géré par le controller.
- `onShow()`/`onHide()` gardent leur logique actuelle (détection menu mode, listeners clavier, `Popover.show()`/`hide()`) et émettent eux-mêmes `ar-dropdown-shown`/`ar-dropdown-hidden` via `emitToggleEvent()`.
- Nouveaux events : `ar-dropdown-show-prevented`, `ar-dropdown-hide-prevented` (émis par le controller, rien à faire côté composant).

### `ar-breadcrumb`

Même transformation que `ar-dropdown` (structure identique post-PR #112).

### `ar-collapse`

- Même transformation, avec une simplification supplémentaire : le garde `if (this._panel.hasAttribute('hidden') && !this._animating) return;` (et son miroir côté `_show()`) est supprimé — il ne servait que la protection anti-cycle-redondant, désormais gérée par le controller. L'idempotence de l'API publique `show()`/`hide()` (`if (this.open || this._animating || this.disabled) return;`) est indépendante et reste inchangée.
- `onShow()`/`onHide()` gardent toute la logique d'animation (`_animating`, `transitionend`, `_closeGroupSiblings()`) et émettent `ar-collapse-shown`/`ar-collapse-hidden` eux-mêmes au bon moment (sync si `!_shouldAnimate()`, sinon dans le listener `transitionend`).
- Nouveaux events : `ar-collapse-show-prevented`, `ar-collapse-hide-prevented`.

### `ar-dialog`

- Aucun changement structurel. Ajout de `this._emit('ar-dialog-show-prevented')` dans `_show()`, au même endroit où `this.open` est actuellement reverté sur annulation (avant le `return`), symétrique à `ar-dialog-hide-prevented` existant dans `_close()`.
- `_emit()` propre à `ar-dialog` reste en place (pas de migration vers `emitToggleEvent()` dans ce spec — hors scope, cf. section suivante). Le correctif `cancelable: false` sur les events informatifs ne s'applique donc **pas** à `ar-dialog` pour l'instant — incohérence mineure assumée, à trancher si `ar-dialog` migre vers le controller/la fonction partagée plus tard.

## Tests

- Nouveaux tests unitaires pour `ToggleController` isolé (host mocké minimal : `open`, `updateComplete`, `dispatchEvent`).
- Tests existants par composant (show/hide/prevented-implicite/no-op) adaptés à la nouvelle API interne (`onShow`/`onHide` au lieu de `_show`/`_hide`) — comportement observable inchangé, sauf ajout des nouveaux events.
- Nouveaux tests `-show-prevented`/`-hide-prevented` sur les 4 composants : événement émis une seule fois, `detail.id` correct, `cancelable: false` (sauf `ar-dialog`, cf. ci-dessus), `el.open` déjà reverté au moment de l'event.
- Re-vérification des tests navigateur light-dismiss/Escape (`dropdown.browser.test.ts`, `breadcrumb.browser.test.ts`) après migration — point exact de la régression CI de PR #112, à ne pas réintroduire.
- Suite complète (`npm run test` + `npm run test:browser`) + `tsc --noEmit` + `npm run lint` avant merge, comme pour PR #112.

## Documentation

- 6 nouvelles entrées JSDoc `@event` (2 par composant mutualisé × 3) + 1 (`ar-dialog-show-prevented`) = 7 au total.
- Impact sur le CEM (`custom-elements.json`, régénéré par `npm run build:manifest`) et potentiellement la doc Astro (table API/playground) — à vérifier visuellement lors de l'implémentation, pas seulement via le build.

## Hors scope

- Faire passer `ar-dialog` par `ToggleController` — décision différée, cf. section Périmètre.
- Extraction d'un `PopoverController`/mécanisme commun à `ar-dropdown`/`ar-breadcrumb` au-delà du `ToggleController` (ex. mutualiser aussi la détection menu mode) — pas identifié comme dupliqué à ce stade.
- `ar-stepper`, `ar-table-sort` : déjà traités par PR2 (2026-07-14) ou déjà conformes, pas de paire `show`/`hide` annulable applicable.
- Item 2 (sync CEM ↔ thème) et item 3 (audit dette technique large) de #111 : hors scope de ce spec, traités séparément.
