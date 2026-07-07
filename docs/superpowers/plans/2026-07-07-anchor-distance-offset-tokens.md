# Config globale distance/offset des composants ancrés — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le réglage par attribut JS (`distance`/`offset`) de `ar-tooltip`/`ar-dropdown` par des custom properties CSS lues à chaque repositionnement, avec un token global (`--ar-anchor-distance`/`-offset`) et une surcharge par composant, appliqué aux 5 composants ancrés (`ar-dropdown`, `ar-tooltip`, `ar-datepicker`, `ar-stepper`, `ar-breadcrumb`).

**Architecture:** `Popover` (`packages/core/src/utils/popover.ts`) accepte `distance`/`offset` sous forme `number | (() => number)`, résolus juste avant chaque `computePosition()` — donc à chaque recalcul déclenché par `autoUpdate` de Floating UI. `AnchoredController` et `TooltipController` fournissent des closures qui lisent `getComputedStyle(host).getPropertyValue('--ar-<prefix>-distance')` et retombent sur `0` si absent/invalide. Les tokens réels (4px, 6px pour tooltip...) vivent uniquement dans `themes/default.css`.

**Tech Stack:** Lit 3, TypeScript, `@floating-ui/dom`, Vitest (happy-dom, tests unitaires), `@web/test-runner` + Chromium (tests browser réels), Astro/CEM pour la doc générée.

## Global Constraints

- Prettier : 100 char, 4 spaces, single quotes.
- `import type` pour tous les imports de types.
- `exactOptionalPropertyTypes: true` — propriétés optionnelles réassignées à `undefined` doivent être déclarées `?: T | undefined`, ou utiliser le spread conditionnel `...(v !== undefined && { key: v })` (pattern déjà utilisé dans `anchored.controller.ts`).
- Modèle headless : aucune valeur de repli cosmétique dans les fichiers `*.styles.ts` ou dans le JS des composants — seul `themes/default.css` porte les valeurs de design (4px, 6px...). Le seul fallback JS acceptable est `0` (structurel).
- Conventional Commits (commitlint + Husky) — un commit par étape "Commit" de ce plan.
- Breaking change assumé (projet alpha) : suppression des attributs `distance`/`offset` sur `ar-tooltip`/`ar-dropdown`.

---

### Task 0 : Créer la branche

- [ ] **Étape 1 : Créer la branche depuis `dev`**

```bash
git -C /Users/jon/Code/Active_projects/ariane checkout dev
git -C /Users/jon/Code/Active_projects/ariane pull origin dev --ff-only
git -C /Users/jon/Code/Active_projects/ariane checkout -b feat/anchor-distance-offset-tokens
```

---

### Task 1 : `Popover` — `distance`/`offset` acceptent `number | (() => number)`

**Files:**

- Modify: `packages/core/src/utils/popover.ts`
- Test: `packages/core/src/utils/popover.browser.test.ts`

**Interfaces:**

- Produces: `PopoverOptions.distance?: number | (() => number)`, `PopoverOptions.offset?: number | (() => number)`. `Popover` n'expose plus `setDistance`/`setOffset`.

- [ ] **Étape 1 : Écrire les tests (échoueront à la compilation TypeScript)**

Ajouter dans `packages/core/src/utils/popover.browser.test.ts`, juste avant la dernière accolade fermante du `describe('Popover', ...)` (après le bloc `describe('destroy()', ...)`, ligne 147) :

```ts
describe('distance / offset — fonction résolue à chaque repositionnement', () => {
    function parseTranslate(transform: string): { x: number; y: number } {
        const match = transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
        if (!match) throw new Error(`transform inattendu: ${transform}`);
        return { x: Number(match[1]), y: Number(match[2]) };
    }

    it('distance en fonction est résolue et prise en compte au recalcul (autoUpdate)', async () => {
        let distance = 0;
        const { panel, popover } = await setupPopover({
            placement: 'bottom-start',
            distance: () => distance,
        });
        await popover.show();
        const y0 = parseTranslate(panel.style.transform).y;

        distance = 20;
        window.dispatchEvent(new Event('resize'));
        await aTimeout(50);
        const y1 = parseTranslate(panel.style.transform).y;

        expect(y1 - y0).to.be.closeTo(20, 1);
    });

    it('offset en fonction est résolu et pris en compte au recalcul (autoUpdate)', async () => {
        let lateral = 0;
        const { panel, popover } = await setupPopover({
            placement: 'bottom-start',
            offset: () => lateral,
        });
        await popover.show();
        const x0 = parseTranslate(panel.style.transform).x;

        lateral = 15;
        window.dispatchEvent(new Event('resize'));
        await aTimeout(50);
        const x1 = parseTranslate(panel.style.transform).x;

        expect(x1 - x0).to.be.closeTo(15, 1);
    });
});
```

- [ ] **Étape 2 : Vérifier que ça ne compile pas (rouge)**

Run: `cd /Users/jon/Code/Active_projects/ariane/packages/core && npx tsc --noEmit`
Expected: erreur TS sur `popover.browser.test.ts` — `distance`/`offset` n'acceptent pas encore `() => number` (type `number` attendu).

- [ ] **Étape 3 : Implémenter la résolution `number | (() => number)`**

Dans `packages/core/src/utils/popover.ts`, remplacer les lignes 7-18 (interface) :

```ts
export interface PopoverOptions {
    placement?: Placement;
    /** Espacement perpendiculaire trigger→panel (mainAxis) en px, statique ou résolu à chaque repositionnement. Défaut : 0. */
    distance?: number | (() => number);
    /** Décalage latéral (crossAxis) en px, statique ou résolu à chaque repositionnement. Défaut : 0. */
    offset?: number | (() => number);
    popoverType?: 'auto' | 'manual';
    /** Appelé lors du light-dismiss natif (popoverType 'auto' uniquement). */
    onExternalClose?: () => void;
    /** Élément caret positionné par Floating UI arrow(). Optionnel. */
    arrowEl?: HTMLElement;
}
```

Remplacer les lignes 33-43 (constructeur — defaults `4`/`0` → `0`/`0`, plus de `setDistance`/`setOffset`) :

```ts
this._opts = {
    placement: options.placement ?? 'bottom-start',
    distance: options.distance ?? 0,
    offset: options.offset ?? 0,
    popoverType: options.popoverType ?? 'auto',
    ...(options.onExternalClose !== undefined && {
        onExternalClose: options.onExternalClose,
    }),
    ...(options.arrowEl !== undefined && { arrowEl: options.arrowEl }),
};
```

Supprimer les méthodes `setDistance`/`setOffset` (lignes 53-59 de l'original) :

```ts
    setDistance(v: number): void {
        this._opts.distance = v;
    }

    setOffset(v: number): void {
        this._opts.offset = v;
    }
```

Dans `_position()`, remplacer :

```ts
                middleware: [
                    offset({ mainAxis: this._opts.distance, crossAxis: this._opts.offset }),
```

par :

```ts
                middleware: [
                    offset({
                        mainAxis: this._resolve(this._opts.distance),
                        crossAxis: this._resolve(this._opts.offset),
                    }),
```

Ajouter la méthode privée juste avant `_roundByDPR` :

```ts
    private _resolve(v: number | (() => number)): number {
        return typeof v === 'function' ? v() : v;
    }
```

- [ ] **Étape 4 : Vérifier que ça compile (dans le périmètre de cette tâche) et que les tests passent (vert)**

Run: `cd /Users/jon/Code/Active_projects/ariane/packages/core && npx tsc --noEmit`
Expected : aucune erreur liée à `popover.ts` ou `popover.browser.test.ts`. En revanche, il est **normal et attendu** que cette commande rapporte encore des erreurs dans exactement 4 fichiers hors périmètre de cette tâche — `anchored.controller.ts`, `tooltip.controller.ts`, `components/dropdown/dropdown.ts`, `components/tooltip/tooltip.ts` — car ils appellent encore `setDistance`/`setOffset`, supprimés ici. Ces 4 fichiers sont corrigés dans les Tasks 2, 3, 5, 6. Vérifier que les erreurs sont bien confinées à ces 4 fichiers, rien d'autre.

Run: `cd /Users/jon/Code/Active_projects/ariane/packages/core && npx web-test-runner --group default --files "src/utils/popover.browser.test.ts"`
Expected: tous les tests passent, y compris les 2 nouveaux (web-test-runner transpile fichier par fichier via esbuild et ne type-check pas le reste du projet — les erreurs TS des 4 fichiers hors périmètre n'affectent pas ce test).

- [ ] **Étape 5 : Commit**

```bash
git -C /Users/jon/Code/Active_projects/ariane add packages/core/src/utils/popover.ts packages/core/src/utils/popover.browser.test.ts
git -C /Users/jon/Code/Active_projects/ariane commit -m "feat(popover): distance/offset acceptent une fonction résolue à chaque repositionnement"
```

---

### Task 2 : `AnchoredController` — lecture CSS via `cssVarPrefix`

**Files:**

- Modify: `packages/core/src/controllers/anchored.controller.ts`
- Test: `packages/core/src/controllers/anchored.controller.browser.test.ts`

**Interfaces:**

- Consumes: `Popover` avec `distance`/`offset: number | (() => number)` (Task 1).
- Produces: `AnchoredControllerOptions.cssVarPrefix?: string`. Plus de `setDistance`/`setOffset` sur `AnchoredController`.

- [ ] **Étape 1 : Écrire le test (échouera — `cssVarPrefix` n'existe pas encore)**

Ajouter dans `packages/core/src/controllers/anchored.controller.browser.test.ts`, juste avant la dernière accolade fermante du `describe('AnchoredController', ...)` (après le bloc `describe('onExternalClose', ...)`, ligne 203) :

```ts
describe('cssVarPrefix — lecture des custom properties CSS', () => {
    function parseTranslateY(transform: string): number {
        const match = transform.match(/translate\([-\d.]+px,\s*([-\d.]+)px\)/);
        if (!match) throw new Error(`transform inattendu: ${transform}`);
        return Number(match[1]);
    }

    it('lit --ar-<prefix>-distance sur le host et la répercute au positionnement', async () => {
        const { host, panel, ctrl } = await setupAnchored({
            cssVarPrefix: 'test',
            placement: 'bottom-start',
        });
        host.style.setProperty('--ar-test-distance', '0px');
        await ctrl.show();
        const y0 = parseTranslateY(panel.style.transform);

        host.style.setProperty('--ar-test-distance', '20px');
        window.dispatchEvent(new Event('resize'));
        await aTimeout(50);
        const y1 = parseTranslateY(panel.style.transform);

        expect(y1 - y0).to.be.closeTo(20, 1);
        ctrl.hide();
    });

    it('sans cssVarPrefix, distance/offset valent 0', async () => {
        const { panel, ctrl } = await setupAnchored({ placement: 'bottom-start' });
        await ctrl.show();
        const y0 = parseTranslateY(panel.style.transform);

        window.dispatchEvent(new Event('resize'));
        await aTimeout(50);
        const y1 = parseTranslateY(panel.style.transform);

        expect(y1).to.equal(y0);
        ctrl.hide();
    });
});
```

- [ ] **Étape 2 : Vérifier que ça ne compile pas (rouge)**

Run: `cd /Users/jon/Code/Active_projects/ariane/packages/core && npx tsc --noEmit`
Expected: erreur TS — `cssVarPrefix` n'existe pas sur `AnchoredControllerOptions`.

- [ ] **Étape 3 : Implémenter `cssVarPrefix` et la lecture CSS**

Dans `packages/core/src/controllers/anchored.controller.ts`, remplacer l'interface (lignes 6-17) :

```ts
export interface AnchoredControllerOptions {
    popupMode?: 'menu' | 'dialog';
    placement?: Placement;
    /**
     * Slug utilisé pour lire les custom properties CSS `--ar-<cssVarPrefix>-distance`
     * et `--ar-<cssVarPrefix>-offset` sur l'hôte. Si omis, distance/offset valent 0.
     */
    cssVarPrefix?: string;
    /** Verrouille le scroll des ancêtres scrollables à l'ouverture. Défaut : true. */
    lockScroll?: boolean;
    /** Appelé lors d'un light-dismiss natif (popover auto). */
    onExternalClose?: () => void;
}
```

Remplacer les champs de classe et le constructeur (lignes 19-53) :

```ts
export class AnchoredController implements ReactiveController {
    private readonly _host: HTMLElement;
    private _trigger: HTMLElement | null = null;
    private _scrollLocks: HTMLElement[] = [];
    private _opts: Required<
        Omit<AnchoredControllerOptions, 'onExternalClose' | 'cssVarPrefix'>
    > & {
        onExternalClose?: () => void;
        cssVarPrefix?: string;
    };
    private readonly _popover: Popover;

    constructor(
        host: ReactiveControllerHost & HTMLElement,
        options: AnchoredControllerOptions = {},
    ) {
        this._host = host;
        this._opts = {
            popupMode: options.popupMode ?? 'menu',
            placement: options.placement ?? 'bottom-start',
            lockScroll: options.lockScroll ?? true,
            ...(options.cssVarPrefix !== undefined && { cssVarPrefix: options.cssVarPrefix }),
            ...(options.onExternalClose !== undefined && {
                onExternalClose: options.onExternalClose,
            }),
        };
        this._popover = new Popover(host, {
            placement: this._opts.placement,
            distance: () => this._readCssVar('distance'),
            offset: () => this._readCssVar('offset'),
            popoverType: 'auto',
            onExternalClose: () => {
                this._releaseScrollLocks();
                this._trigger?.setAttribute('aria-expanded', 'false');
                this._opts.onExternalClose?.();
            },
        });
        host.addController(this);
    }
```

Supprimer les méthodes `setDistance`/`setOffset` (lignes 95-103 de l'original) :

```ts
    setDistance(v: number): void {
        this._opts.distance = v;
        this._popover.setDistance(v);
    }

    setOffset(v: number): void {
        this._opts.offset = v;
        this._popover.setOffset(v);
    }
```

Ajouter la méthode privée juste avant `hostConnected()` :

```ts
    private _readCssVar(kind: 'distance' | 'offset'): number {
        if (!this._opts.cssVarPrefix) return 0;
        const raw = getComputedStyle(this._host)
            .getPropertyValue(`--ar-${this._opts.cssVarPrefix}-${kind}`)
            .trim();
        const parsed = parseFloat(raw);
        return Number.isFinite(parsed) ? parsed : 0;
    }
```

- [ ] **Étape 4 : Vérifier que ça compile (dans le périmètre de cette tâche) et que les tests passent (vert)**

Run: `cd /Users/jon/Code/Active_projects/ariane/packages/core && npx tsc --noEmit`
Expected : aucune erreur liée à `anchored.controller.ts` ou `anchored.controller.browser.test.ts`. Il est **normal et attendu** que cette commande rapporte encore des erreurs dans exactement 3 fichiers hors périmètre — `tooltip.controller.ts` (Task 3), `components/dropdown/dropdown.ts` (Task 5), `components/tooltip/tooltip.ts` (Task 6). Vérifier que les erreurs sont bien confinées à ces 3 fichiers, rien d'autre.

Run: `cd /Users/jon/Code/Active_projects/ariane/packages/core && npx web-test-runner --group default --files "src/controllers/anchored.controller.browser.test.ts"`
Expected: tous les tests passent, y compris les 2 nouveaux.

- [ ] **Étape 5 : Commit**

```bash
git -C /Users/jon/Code/Active_projects/ariane add packages/core/src/controllers/anchored.controller.ts packages/core/src/controllers/anchored.controller.browser.test.ts
git -C /Users/jon/Code/Active_projects/ariane commit -m "feat(anchored-controller): lit distance/offset depuis les custom properties CSS via cssVarPrefix"
```

---

### Task 3 : `TooltipController` — lecture CSS via `cssVarPrefix`

**Files:**

- Modify: `packages/core/src/controllers/tooltip.controller.ts`

**Interfaces:**

- Consumes: `Popover` avec `distance`/`offset: number | (() => number)` (Task 1).
- Produces: `TooltipControllerOptions.cssVarPrefix?: string`. Plus de `setDistance`/`setOffset` sur `TooltipController`. Couvert indirectement par les tests `ar-tooltip` (Task 5).

- [ ] **Étape 1 : Remplacer le fichier**

Remplacer tout le contenu de `packages/core/src/controllers/tooltip.controller.ts` :

```ts
import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { Placement } from '@floating-ui/dom';
import { Popover } from '../utils/popover.js';

export interface TooltipControllerOptions {
    placement?: Placement;
    /**
     * Slug utilisé pour lire les custom properties CSS `--ar-<cssVarPrefix>-distance`
     * et `--ar-<cssVarPrefix>-offset` sur l'hôte. Si omis, distance/offset valent 0.
     */
    cssVarPrefix?: string;
}

export class TooltipController implements ReactiveController {
    private readonly _host: ReactiveControllerHost & HTMLElement;
    private readonly _popover: Popover;
    private readonly _cssVarPrefix: string | undefined;

    constructor(
        host: ReactiveControllerHost & HTMLElement,
        options: TooltipControllerOptions = {},
    ) {
        this._host = host;
        this._cssVarPrefix = options.cssVarPrefix;
        this._popover = new Popover(host, {
            placement: options.placement ?? 'top',
            distance: () => this._readCssVar('distance'),
            offset: () => this._readCssVar('offset'),
            popoverType: 'manual',
        });
        host.addController(this);
    }

    get isOpen(): boolean {
        return this._popover.isOpen;
    }

    attach(trigger: HTMLElement, panel: HTMLElement): void {
        this._popover.attach(trigger, panel);
        panel.setAttribute('role', 'tooltip');
        if (!this._host.id) this._host.id = `ar-tooltip-${crypto.randomUUID().slice(0, 8)}`;
        trigger.setAttribute('aria-describedby', this._host.id);
    }

    show(): Promise<void> {
        return this._popover.show();
    }

    hide(): void {
        this._popover.hide();
    }

    setPlacement(v: Placement): void {
        this._popover.setPlacement(v);
    }

    setArrow(el: HTMLElement | null): void {
        this._popover.setArrow(el);
    }

    hostConnected(): void {}

    hostDisconnected(): void {
        this._popover.destroy();
    }

    private _readCssVar(kind: 'distance' | 'offset'): number {
        if (!this._cssVarPrefix) return 0;
        const raw = getComputedStyle(this._host)
            .getPropertyValue(`--ar-${this._cssVarPrefix}-${kind}`)
            .trim();
        const parsed = parseFloat(raw);
        return Number.isFinite(parsed) ? parsed : 0;
    }
}
```

- [ ] **Étape 2 : Vérifier que ça compile**

Run: `cd /Users/jon/Code/Active_projects/ariane/packages/core && npx tsc --noEmit`
Expected: erreur TS attendue sur `tooltip.ts` (Task 5 pas encore faite — `distance: 6` passé au constructeur n'existe plus). C'est normal à ce stade ; ne pas corriger `tooltip.ts` ici.

- [ ] **Étape 3 : Commit**

```bash
git -C /Users/jon/Code/Active_projects/ariane add packages/core/src/controllers/tooltip.controller.ts
git -C /Users/jon/Code/Active_projects/ariane commit -m "feat(tooltip-controller): lit distance/offset depuis les custom properties CSS via cssVarPrefix"
```

---

### Task 4 : Tokens CSS dans `themes/default.css`

**Files:**

- Modify: `packages/core/src/styles/themes/default.css`

**Interfaces:**

- Produces: `--ar-anchor-distance`, `--ar-anchor-offset`, `--ar-dropdown-distance`, `--ar-dropdown-offset`, `--ar-tooltip-distance`, `--ar-tooltip-offset`, `--ar-datepicker-distance`, `--ar-datepicker-offset`, `--ar-stepper-distance`, `--ar-stepper-offset`, `--ar-breadcrumb-distance`, `--ar-breadcrumb-offset`.

- [ ] **Étape 1 : Ajouter le groupe partagé `anchor`**

Dans `packages/core/src/styles/themes/default.css`, remplacer :

```css
--ar-panel-min-width: 18rem;
--ar-panel-max-width: 18rem;

/* dropdown */
```

par :

```css
--ar-panel-min-width: 18rem;
--ar-panel-max-width: 18rem;

/* anchor (partagé — positionnement des composants ancrés / popovers) */
--ar-anchor-distance: 4px;
--ar-anchor-offset: 0px;

/* dropdown */
```

- [ ] **Étape 2 : Ajouter les tokens dropdown**

Remplacer :

```css
/* dropdown */
--ar-dropdown-bg: var(--ar-panel-bg);
```

par :

```css
/* dropdown */
--ar-dropdown-distance: var(--ar-anchor-distance);
--ar-dropdown-offset: var(--ar-anchor-offset);
--ar-dropdown-bg: var(--ar-panel-bg);
```

- [ ] **Étape 3 : Ajouter les tokens tooltip (défaut distance distinct : 6px)**

Remplacer :

```css
/* tooltip */
--ar-tooltip-bg: var(--ar-color-neutral-20);
```

par :

```css
/* tooltip */
--ar-tooltip-distance: 6px;
--ar-tooltip-offset: var(--ar-anchor-offset);
--ar-tooltip-bg: var(--ar-color-neutral-20);
```

- [ ] **Étape 4 : Ajouter les tokens breadcrumb**

Remplacer :

```css
/* breadcrumb */
--ar-breadcrumb-separator-color: var(--ar-color-neutral-80);
```

par :

```css
/* breadcrumb */
--ar-breadcrumb-distance: var(--ar-anchor-distance);
--ar-breadcrumb-offset: var(--ar-anchor-offset);
--ar-breadcrumb-separator-color: var(--ar-color-neutral-80);
```

- [ ] **Étape 5 : Ajouter les tokens stepper**

Remplacer :

```css
/* stepper */
--ar-stepper-label-color: var(--ar-color-text-muted);
```

par :

```css
/* stepper */
--ar-stepper-distance: var(--ar-anchor-distance);
--ar-stepper-offset: var(--ar-anchor-offset);
--ar-stepper-label-color: var(--ar-color-text-muted);
```

- [ ] **Étape 6 : Ajouter les tokens datepicker**

Remplacer :

```css
--ar-datepicker-gap: 0.35rem;
```

par :

```css
--ar-datepicker-distance: var(--ar-anchor-distance);
--ar-datepicker-offset: var(--ar-anchor-offset);
--ar-datepicker-gap: 0.35rem;
```

- [ ] **Étape 7 : Vérifier que le CSS reste valide (build)**

Run: `cd /Users/jon/Code/Active_projects/ariane/packages/core && npm run build:css`
Expected: build réussi, pas d'erreur.

- [ ] **Étape 8 : Commit**

```bash
git -C /Users/jon/Code/Active_projects/ariane add packages/core/src/styles/themes/default.css
git -C /Users/jon/Code/Active_projects/ariane commit -m "feat(theme): tokens --ar-anchor-distance/-offset + surcharges par composant ancré"
```

---

### Task 5 : `ar-dropdown` — retrait de l'attribut, `cssVarPrefix`, doc

**Files:**

- Modify: `packages/core/src/components/dropdown/dropdown.ts`
- Modify: `packages/core/src/components/dropdown/dropdown.test.ts`

**Interfaces:**

- Consumes: `AnchoredController` avec `cssVarPrefix` (Task 2).

- [ ] **Étape 1 : Retirer les tests obsolètes sur `distance`/`offset`**

Dans `packages/core/src/components/dropdown/dropdown.test.ts`, supprimer ces deux lignes (bloc `valeurs par défaut`, lignes 49-50) :

```ts
it('distance=4', () => expect(el.distance).toBe(4));
it('offset=0', () => expect(el.offset).toBe(0));
```

Supprimer ces deux tests (bloc `attributs reflect`, lignes 86-96) :

```ts
it('distance reflète en attribut', async () => {
    el.distance = 12;
    await waitForUpdate(el);
    expect(el.getAttribute('distance')).toBe('12');
});

it('offset reflète en attribut', async () => {
    el.offset = 8;
    await waitForUpdate(el);
    expect(el.getAttribute('offset')).toBe('8');
});
```

- [ ] **Étape 2 : Vérifier que ça ne compile pas encore (rouge — `dropdown.ts` a toujours les attributs)**

Run: `cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run src/components/dropdown/dropdown.test.ts`
Expected: PASS (les tests supprimés ne cassent rien tant que `dropdown.ts` n'a pas changé — cette étape confirme juste que le fichier de test reste valide avant la étape suivante).

- [ ] **Étape 3 : Retirer `distance`/`offset` de `dropdown.ts` et passer `cssVarPrefix`**

Dans `packages/core/src/components/dropdown/dropdown.ts`, ajouter au bloc JSDoc du composant (après la ligne `@cssprop [--ar-dropdown-max-width=var(--ar-panel-max-width)] ...`) :

```ts
 * @cssprop [--ar-dropdown-distance=var(--ar-anchor-distance)] - Espacement entre le trigger et le panel (axe principal).
 * @cssprop [--ar-dropdown-offset=var(--ar-anchor-offset)] - Décalage latéral du panel (axe transversal).
```

Supprimer ces deux propriétés :

```ts
    /** Espacement en pixels entre le trigger et le panel (axe principal). */
    @property({ reflect: true, type: Number }) distance = 4;

    /** Décalage latéral en pixels du panel par rapport au trigger (axe transversal). */
    @property({ reflect: true, type: Number }) offset = 0;

```

Remplacer :

```ts
    private readonly _popover = new AnchoredController(this, {
        onExternalClose: () => {
            this.open = false;
        },
    });
```

par :

```ts
    private readonly _popover = new AnchoredController(this, {
        cssVarPrefix: 'dropdown',
        onExternalClose: () => {
            this.open = false;
        },
    });
```

Supprimer dans `updated()` :

```ts
if (changed.has('distance')) {
    this._popover.setDistance(this.distance);
}
if (changed.has('offset')) {
    this._popover.setOffset(this.offset);
}
```

- [ ] **Étape 4 : Vérifier que ça compile et que les tests passent**

Run: `cd /Users/jon/Code/Active_projects/ariane/packages/core && npx tsc --noEmit && npx vitest run src/components/dropdown/dropdown.test.ts`
Expected: aucune erreur TS, tous les tests passent.

Run: `cd /Users/jon/Code/Active_projects/ariane/packages/core && npx web-test-runner --group default --files "src/components/dropdown/dropdown.browser.test.ts"`
Expected: tous les tests passent (inchangés — pas de dépendance sur `distance`/`offset`).

- [ ] **Étape 5 : Commit**

```bash
git -C /Users/jon/Code/Active_projects/ariane add packages/core/src/components/dropdown/dropdown.ts packages/core/src/components/dropdown/dropdown.test.ts
git -C /Users/jon/Code/Active_projects/ariane commit -m "feat(dropdown)!: distance/offset pilotés par CSS (--ar-dropdown-distance/-offset), retrait des attributs JS

BREAKING CHANGE: les attributs distance/offset de ar-dropdown sont retirés. Utiliser les custom properties CSS --ar-dropdown-distance et --ar-dropdown-offset (ou --ar-anchor-distance/-offset pour un réglage global)."
```

---

### Task 6 : `ar-tooltip` — retrait de l'attribut, `cssVarPrefix`, doc

**Files:**

- Modify: `packages/core/src/components/tooltip/tooltip.ts`
- Modify: `packages/core/src/components/tooltip/tooltip.test.ts`

**Interfaces:**

- Consumes: `TooltipController` avec `cssVarPrefix` (Task 3).

- [ ] **Étape 1 : Retirer les tests obsolètes sur `distance`/`offset`**

Dans `packages/core/src/components/tooltip/tooltip.test.ts`, supprimer ces deux lignes (bloc `valeurs par défaut`, lignes 54-55) :

```ts
it('distance=6', () => expect(el.distance).toBe(6));
it('offset=0', () => expect(el.offset).toBe(0));
```

- [ ] **Étape 2 : Retirer `distance`/`offset` de `tooltip.ts` et passer `cssVarPrefix`**

Dans `packages/core/src/components/tooltip/tooltip.ts`, ajouter au bloc JSDoc du composant (après `@cssprop --ar-tooltip-arrow-size ...`) :

```ts
 * @cssprop [--ar-tooltip-distance=6px] - Espacement entre le trigger et la bulle.
 * @cssprop [--ar-tooltip-offset=var(--ar-anchor-offset)] - Décalage latéral de la bulle.
```

Supprimer ces deux propriétés :

```ts
    /** Espacement trigger→bulle en px. */
    @property({ reflect: true, type: Number }) distance = 6;

    /** Décalage latéral en px. */
    @property({ reflect: true, type: Number }) offset = 0;

```

Remplacer :

```ts
    private readonly _tooltip = new TooltipController(this, { placement: 'top', distance: 6 });
```

par :

```ts
    private readonly _tooltip = new TooltipController(this, {
        placement: 'top',
        cssVarPrefix: 'tooltip',
    });
```

Supprimer dans `updated()` :

```ts
if (changed.has('distance')) this._tooltip.setDistance(this.distance);
if (changed.has('offset')) this._tooltip.setOffset(this.offset);
```

- [ ] **Étape 3 : Vérifier que ça compile et que les tests passent**

Run: `cd /Users/jon/Code/Active_projects/ariane/packages/core && npx tsc --noEmit && npx vitest run src/components/tooltip/tooltip.test.ts`
Expected: aucune erreur TS (ceci confirme aussi que `tooltip.controller.ts`, modifié en Task 3 sans que `tooltip.ts` suive, compile enfin correctement), tous les tests passent.

Run: `cd /Users/jon/Code/Active_projects/ariane/packages/core && npx web-test-runner --group default --files "src/components/tooltip/tooltip.browser.test.ts"`
Expected: tous les tests passent.

- [ ] **Étape 4 : Commit**

```bash
git -C /Users/jon/Code/Active_projects/ariane add packages/core/src/components/tooltip/tooltip.ts packages/core/src/components/tooltip/tooltip.test.ts
git -C /Users/jon/Code/Active_projects/ariane commit -m "feat(tooltip)!: distance/offset pilotés par CSS (--ar-tooltip-distance/-offset), retrait des attributs JS

BREAKING CHANGE: les attributs distance/offset de ar-tooltip sont retirés. Utiliser les custom properties CSS --ar-tooltip-distance et --ar-tooltip-offset (ou --ar-anchor-distance/-offset pour un réglage global)."
```

---

### Task 7 : `ar-datepicker` — `cssVarPrefix` + doc

**Files:**

- Modify: `packages/core/src/components/datepicker/datepicker.ts`

**Interfaces:**

- Consumes: `AnchoredController` avec `cssVarPrefix` (Task 2).

- [ ] **Étape 1 : Ajouter `cssVarPrefix` et la doc**

Dans `packages/core/src/components/datepicker/datepicker.ts`, ajouter au bloc JSDoc du composant (après `@cssprop [--ar-datepicker-panel-width] ...`) :

```ts
 * @cssprop [--ar-datepicker-distance=var(--ar-anchor-distance)] - Espacement entre le trigger et le panel.
 * @cssprop [--ar-datepicker-offset=var(--ar-anchor-offset)] - Décalage latéral du panel.
```

Remplacer :

```ts
    private readonly _anchored = new AnchoredController(this, {
        popupMode: 'dialog',
        placement: 'bottom-start',
```

par :

```ts
    private readonly _anchored = new AnchoredController(this, {
        popupMode: 'dialog',
        placement: 'bottom-start',
        cssVarPrefix: 'datepicker',
```

- [ ] **Étape 2 : Vérifier que ça compile et que les tests passent**

Run: `cd /Users/jon/Code/Active_projects/ariane/packages/core && npx tsc --noEmit && npx vitest run src/components/datepicker`
Expected: aucune erreur TS, tous les tests passent.

Run: `cd /Users/jon/Code/Active_projects/ariane/packages/core && npx web-test-runner --group default --files "src/components/datepicker/datepicker.browser.test.ts"`
Expected: tous les tests passent.

- [ ] **Étape 3 : Commit**

```bash
git -C /Users/jon/Code/Active_projects/ariane add packages/core/src/components/datepicker/datepicker.ts
git -C /Users/jon/Code/Active_projects/ariane commit -m "feat(datepicker): distance/offset du panel pilotés par --ar-datepicker-distance/-offset"
```

---

### Task 8 : `ar-stepper` — `cssVarPrefix` + doc

**Files:**

- Modify: `packages/core/src/components/stepper/stepper.ts`

**Interfaces:**

- Consumes: `AnchoredController` avec `cssVarPrefix` (Task 2).

- [ ] **Étape 1 : Ajouter `cssVarPrefix` et la doc**

Dans `packages/core/src/components/stepper/stepper.ts`, ajouter au bloc JSDoc du composant (après `@cssprop [--ar-stepper-panel-max-width=var(--ar-panel-max-width)] ...`) :

```ts
 * @cssprop [--ar-stepper-distance=var(--ar-anchor-distance)]                                 - Espacement entre le trigger et le panel mobile.
 * @cssprop [--ar-stepper-offset=var(--ar-anchor-offset)]                                     - Décalage latéral du panel mobile.
```

Remplacer :

```ts
    private readonly _popover = new AnchoredController(this, {
        lockScroll: false,
        popupMode: 'menu',
        onExternalClose: () => {
            this.open = false;
        },
    });
```

par :

```ts
    private readonly _popover = new AnchoredController(this, {
        lockScroll: false,
        popupMode: 'menu',
        cssVarPrefix: 'stepper',
        onExternalClose: () => {
            this.open = false;
        },
    });
```

- [ ] **Étape 2 : Vérifier que ça compile et que les tests passent**

Run: `cd /Users/jon/Code/Active_projects/ariane/packages/core && npx tsc --noEmit && npx vitest run src/components/stepper`
Expected: aucune erreur TS, tous les tests passent.

Run: `cd /Users/jon/Code/Active_projects/ariane/packages/core && npx web-test-runner --group default --files "src/components/stepper/stepper.browser.test.ts"`
Expected: tous les tests passent.

- [ ] **Étape 3 : Commit**

```bash
git -C /Users/jon/Code/Active_projects/ariane add packages/core/src/components/stepper/stepper.ts
git -C /Users/jon/Code/Active_projects/ariane commit -m "feat(stepper): distance/offset du panel pilotés par --ar-stepper-distance/-offset"
```

---

### Task 9 : `ar-breadcrumb` — `cssVarPrefix` + doc

**Files:**

- Modify: `packages/core/src/components/breadcrumb/breadcrumb.ts`

**Interfaces:**

- Consumes: `AnchoredController` avec `cssVarPrefix` (Task 2).

- [ ] **Étape 1 : Ajouter `cssVarPrefix` et la doc**

Dans `packages/core/src/components/breadcrumb/breadcrumb.ts`, ajouter au bloc JSDoc du composant (après `@cssprop [--ar-breadcrumb-panel-max-width=var(--ar-panel-max-width)] ...`) :

```ts
 * @cssprop [--ar-breadcrumb-distance=var(--ar-anchor-distance)] - Espacement entre le trigger et le panel mobile.
 * @cssprop [--ar-breadcrumb-offset=var(--ar-anchor-offset)] - Décalage latéral du panel mobile.
```

Remplacer :

```ts
    private readonly _popover = new AnchoredController(this, {
        lockScroll: false,
        popupMode: 'menu',
        placement: 'bottom-end',
        onExternalClose: () => {
            this.open = false;
        },
    });
```

par :

```ts
    private readonly _popover = new AnchoredController(this, {
        lockScroll: false,
        popupMode: 'menu',
        placement: 'bottom-end',
        cssVarPrefix: 'breadcrumb',
        onExternalClose: () => {
            this.open = false;
        },
    });
```

- [ ] **Étape 2 : Vérifier que ça compile et que les tests passent**

Run: `cd /Users/jon/Code/Active_projects/ariane/packages/core && npx tsc --noEmit && npx vitest run src/components/breadcrumb`
Expected: aucune erreur TS, tous les tests passent.

Run: `cd /Users/jon/Code/Active_projects/ariane/packages/core && npx web-test-runner --group default --files "src/components/breadcrumb/breadcrumb.browser.test.ts"`
Expected: tous les tests passent.

- [ ] **Étape 3 : Commit**

```bash
git -C /Users/jon/Code/Active_projects/ariane add packages/core/src/components/breadcrumb/breadcrumb.ts
git -C /Users/jon/Code/Active_projects/ariane commit -m "feat(breadcrumb): distance/offset du panel pilotés par --ar-breadcrumb-distance/-offset"
```

---

### Task 10 : Vérification finale, changelog, PR

**Files:**

- Modify: aucun fichier source (vérification uniquement), sauf éventuel changelog s'il existe déjà un fichier suivi.

- [ ] **Étape 1 : Suite complète — lint, tests unitaires, tests browser, build**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run lint`
Expected: aucune erreur.

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run test`
Expected: tous les tests Vitest passent.

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run test:all`
Expected: tous les tests Vitest + tous les tests browser (WTR) passent.

Run: `cd /Users/jon/Code/Active_projects/ariane/packages/core && npm run build`
Expected: build réussi (manifeste CEM, bundles, CSS, types), pas d'erreur — confirme que les nouvelles annotations `@cssprop` sont bien captées par `cem analyze`.

- [ ] **Étape 2 : Vérifier manuellement la génération de doc pour un composant modifié**

Run: `cd /Users/jon/Code/Active_projects/ariane/packages/core && cat dist/custom-elements.json | grep -A3 '"--ar-dropdown-distance"'`
Expected: une entrée `cssProperties` contenant `--ar-dropdown-distance` avec la description "Espacement entre le trigger et le panel (axe principal).".

- [ ] **Étape 3 : Créer la PR vers `dev`**

```bash
git -C /Users/jon/Code/Active_projects/ariane push -u origin feat/anchor-distance-offset-tokens
gh pr create --repo jogo-labs/ariane --base dev --head feat/anchor-distance-offset-tokens \
  --title "feat(anchor): config globale distance/offset via custom properties CSS" \
  --body "$(cat <<'EOF'
## Summary
- Remplace le réglage `distance`/`offset` par attribut JS (`ar-tooltip`, `ar-dropdown`) par des custom properties CSS lues à chaque repositionnement, appliquées aux 5 composants ancrés (`ar-dropdown`, `ar-tooltip`, `ar-datepicker`, `ar-stepper`, `ar-breadcrumb`).
- Nouveau token global `--ar-anchor-distance`/`--ar-anchor-offset` (surchargeable par composant via `--ar-<nom>-distance`/`-offset`, ou par instance).
- `Popover`/`AnchoredController`/`TooltipController` : `distance`/`offset` deviennent `number | (() => number)`, résolus à chaque recalcul de position (`autoUpdate` de Floating UI) — réactif aux changements CSS à chaud.

## Breaking change
Les attributs `distance`/`offset` de `ar-tooltip` et `ar-dropdown` sont retirés. Utiliser les custom properties CSS `--ar-tooltip-distance`/`-offset` et `--ar-dropdown-distance`/`-offset` (ou `--ar-anchor-distance`/`-offset` pour un réglage global).

Voir le design complet : `docs/superpowers/specs/2026-07-07-anchor-distance-offset-tokens-design.md`

## Test plan
- [x] `npm run lint`
- [x] `npm run test` (Vitest)
- [x] `npm run test:all` (Vitest + web-test-runner/Chromium)
- [x] `npm run build` (packages/core) — vérifie la génération du manifeste CEM avec les nouveaux `@cssprop`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

**Couverture de la spec :**

- Périmètre 5 composants → Tasks 5-9. ✓
- CSS uniquement, retrait attributs JS → Tasks 5-6 (breaking change documenté). ✓
- Tokens global + surcharge par composant → Task 4. ✓
- Lecture réactive à chaque repositionnement → Task 1 (`Popover._resolve`), testé via `autoUpdate`/`resize`. ✓
- Fallback JS = 0 partout → `Popover` (`?? 0`), `AnchoredController._readCssVar`, `TooltipController._readCssVar`. ✓
- Fichiers impactés listés dans la spec → tous couverts (Tasks 1-9). ✓
- Tests → Tasks 1, 2 (nouveaux), Tasks 5-6 (suppression des tests obsolètes). ✓
- Documentation → `@cssprop` ajoutés dans Tasks 5-9, vérifiés via le manifeste CEM en Task 10 (la doc Astro se régénère automatiquement depuis `custom-elements.json`, pas de fichier MDX à éditer à la main). ✓
- Changelog de la release → mentionné dans le corps de la PR (Task 10) ; pas de fichier `CHANGELOG.md` suivi dans le repo à ce jour (vérifié : release notes générées par la CI au tag), donc rien à éditer manuellement.

**Placeholders :** aucun — chaque étape contient le code exact à écrire/remplacer.

**Cohérence des types :** `cssVarPrefix?: string` identique dans `AnchoredControllerOptions` (Task 2) et `TooltipControllerOptions` (Task 3). `distance`/`offset: number | (() => number)` identique dans `PopoverOptions` (Task 1) et consommé par les deux controllers (Tasks 2-3). `_readCssVar(kind: 'distance' | 'offset'): number` a la même signature dans les deux controllers.
