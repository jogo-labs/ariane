# Design — AnchoredController & refacto couche flottante

**Date :** 2026-04-28
**Branche cible :** `refactor/anchored-controller` (depuis `dev`, après merge de `feat/ar-dropdown`)
**Scope :** extraction de deux utilitaires partagés, remplacement de `PopoverController` par `AnchoredController`, nouveau `TooltipController`, migration des composants existants, suppression de `DropdownController`.

---

## Contexte

`PopoverController` concentre trois responsabilités distinctes : gestion de la native popover API + positionnement floating-ui, scroll lock par ref-counting, et attributs ARIA. Cette concentration rend impossible le partage de ces mécanismes avec un futur `TooltipController` (ARIA différente, pas de scroll lock) et maintient une duplication avec `ar-dialog` (scroll lock sur `document.body`). `DropdownController` (outside-click, sans positionnement) est utilisé par `ar-stepper` et dupliqué inline dans `ar-breadcrumb` — deux composants qui gagneraient à utiliser la native popover API.

---

## Architecture cible

```
src/utils/scroll-lock.ts        ← ref-counting partagé, aucune dépendance
src/utils/popover.ts            ← class Popover : popover API + floating-ui
        ↓
src/controllers/anchored.controller.ts   ← ARIA menu/dialog + scroll lock
src/controllers/tooltip.controller.ts    ← ARIA tooltip (nouveau)
        ↓
components : ar-dropdown, ar-breadcrumb, ar-stepper, ar-dialog
             futur : ar-tooltip, ar-datepicker
```

Les deux utilitaires sont internes à `packages/core` (non exportés depuis `index.ts`).

---

## Section 1 — `src/utils/scroll-lock.ts`

Registre module-level avec ref-counting par élément. Extrait du `_scrollLockRegistry` actuel de `PopoverController`.

```ts
export function acquireScrollLock(el: HTMLElement): void;
export function releaseScrollLock(el: HTMLElement): void;
```

**Comportement :**

- `acquireScrollLock` : si l'élément n'est pas dans le registre, sauvegarde `el.style.overflowY/X` et applique `hidden` ; sinon incrémente le compteur.
- `releaseScrollLock` : décrémente le compteur ; si compteur = 0, restaure les styles originaux et supprime du registre.

**Interaction dialog + dropdown :** un dropdown ouvert dans un dialog incrémente le compteur de `document.body` (déjà locké par le dialog) et du container scrollable interne du dialog. Chaque fermeture décrémente proprement — le body n'est déverrouillé qu'à la fermeture du dialog.

`ar-dialog` migre vers cet utilitaire : `_freezeScroll()` → `acquireScrollLock(document.body)`, `_unfreezeScroll()` → `releaseScrollLock(document.body)`. `arDialogLocks` (Set) et `_savedBodyOverflow` sont supprimés.

---

## Section 2 — `src/utils/popover.ts`

Classe interne `Popover`. Pas un `ReactiveController`. Reçoit le host pour `requestUpdate()`. Encapsule la totalité de la logique de positionnement et du cycle de vie de la native popover API.

```ts
interface PopoverOptions {
    placement?: Placement; // défaut : 'bottom-start'
    distance?: number; // défaut : 4
    offset?: number; // défaut : 0
    popoverType?: 'auto' | 'manual'; // défaut : 'auto'
    onExternalClose?: () => void;
}

class Popover {
    constructor(host: ReactiveControllerHost & HTMLElement, options?: PopoverOptions);

    attach(trigger: HTMLElement, panel: HTMLElement): void;
    // - pose popover="auto|manual" sur le panel
    // - génère panel.id si absent (ar-popover-<uuid>)
    // - branche le listener toggle (pour onExternalClose)

    show(): Promise<void>;
    // - visibility:hidden sur le panel
    // - showPopover()
    // - autoUpdate → position → visibility:'' → resolve

    hide(): void;
    // - hidePopover()
    // - cleanup autoUpdate

    get isOpen(): boolean;

    setPlacement(v: Placement): void;
    setDistance(v: number): void;
    setOffset(v: number): void;

    destroy(): void;
    // - retire le listener toggle
    // - cleanup autoUpdate
}
```

**Responsabilités :** popover API, positionnement (floating-ui : flip, shift, hide, offset), callback `onExternalClose` via l'événement `toggle`. Aucun ARIA, aucun scroll lock.

> `onExternalClose` n'est pertinent que pour `popoverType: 'auto'` — le browser fire l'événement `toggle` (closed) lors du light-dismiss natif. Avec `popoverType: 'manual'`, aucun light-dismiss natif, `onExternalClose` n'est jamais appelé.

---

## Section 3 — `src/controllers/anchored.controller.ts`

Remplace `PopoverController`. Implémente `ReactiveController`. Thin wrapper sur `Popover` + `scroll-lock`.

```ts
interface AnchoredControllerOptions {
    popupMode?: 'menu' | 'dialog'; // défaut : 'menu'
    placement?: Placement;
    distance?: number;
    offset?: number;
    lockScroll?: boolean; // défaut : true
    onExternalClose?: () => void;
}

class AnchoredController implements ReactiveController {
    constructor(host: ReactiveControllerHost & HTMLElement, options?: AnchoredControllerOptions);

    attach(trigger: HTMLElement, panel: HTMLElement): void;
    show(): Promise<void>;
    hide(): void;
    toggle(): void;
    get isOpen(): boolean;

    setPlacement(v: Placement): void;
    setDistance(v: number): void;
    setOffset(v: number): void;
    setLockScroll(v: boolean): void;
}
```

**ARIA posée par `attach()` :**

- `popupMode: 'menu'` → `aria-haspopup="true"`, `aria-controls={panel.id}`, `aria-expanded="false"`
- `popupMode: 'dialog'` → `aria-haspopup="dialog"`, `aria-controls={panel.id}`, `aria-expanded="false"`
- `aria-expanded` est mis à jour par `show()` / `hide()` / `onExternalClose`

**Scroll lock :** `show()` traverse les ancêtres du trigger pour trouver les containers scrollables (computed `overflow: auto|scroll`) ou déjà présents dans le registre (`acquireScrollLock`). `hide()` appelle `releaseScrollLock` pour chacun.

---

## Section 4 — `src/controllers/tooltip.controller.ts`

Nouveau controller. Implémente `ReactiveController`. Thin wrapper sur `Popover` sans scroll lock.

```ts
interface TooltipControllerOptions {
    placement?: Placement; // défaut : 'top'
    distance?: number; // défaut : 6
    offset?: number;
}

class TooltipController implements ReactiveController {
    constructor(host: ReactiveControllerHost & HTMLElement, options?: TooltipControllerOptions);

    attach(trigger: HTMLElement, panel: HTMLElement): void;
    show(): Promise<void>;
    hide(): void;
    get isOpen(): boolean;

    setPlacement(v: Placement): void;
    setDistance(v: number): void;
    setOffset(v: number): void;
}
```

**ARIA posée par `attach()` :** `role="tooltip"` sur le panel, `aria-describedby={panel.id}` sur le trigger.

`Popover` instancié avec `popoverType: 'manual'` — pas de light-dismiss, pas de `onExternalClose`. Le composant gère hover/focus lui-même. Pas de `toggle()`.

---

## Section 5 — Migrations

**Ordre recommandé** (chaque étape mergeable indépendamment) :

1. **`scroll-lock.ts`** + migration `ar-dialog` — aucune API publique ne change
2. **`popover.ts`** + **`AnchoredController`** — tests dropdown existants valident
3. **Migration `ar-dropdown`** vers `AnchoredController` — renommage interne
4. **Migration `ar-stepper`** — `DropdownController` → `AnchoredController` (`lockScroll: false`, `popupMode: 'menu'`)
5. **Migration `ar-breadcrumb`** — inline `_show`/`_hide` + listener `blur` → `AnchoredController` (`lockScroll: false`, `popupMode: 'menu'`) ; le light-dismiss natif (`popover="auto"`) remplace le listener `blur`
6. **Suppression `dropdown.controller.ts`** — pas de dépréciation (librairie non encore publiée en usage)

**Critère de succès des migrations :** tous les tests existants (Vitest + WTR) passent sans modification.

---

## Section 6 — Tests à ajouter

| Fichier                       | Type          | Cas couverts                                                                                                         |
| ----------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------- |
| `scroll-lock.test.ts`         | Vitest        | increment/decrement compteur, unlock à 0 seulement, deux callers même élément, plusieurs éléments                    |
| `popover.test.ts`             | Browser (WTR) | show/hide/position, `popover="auto"` vs `"manual"`, callback `onExternalClose`, promise résolue après positionnement |
| `anchored.controller.test.ts` | Browser (WTR) | scroll lock multi-instance (deux dropdowns), ARIA `menu` vs `dialog`                                                 |
| `breadcrumb.browser.test.ts`  | Browser (WTR) | ouverture/fermeture mobile, light-dismiss                                                                            |

Les tests des composants migrés (`ar-dialog`, `ar-stepper`, `ar-breadcrumb`) ne sont pas modifiés — leur passage est le critère de non-régression.

---

## Composants futurs

- **`ar-tooltip`** → `TooltipController` (hover/focus géré par le composant)
- **`ar-datepicker`** → `AnchoredController` avec `popupMode: 'dialog'`, navigation clavier gérée par le composant
