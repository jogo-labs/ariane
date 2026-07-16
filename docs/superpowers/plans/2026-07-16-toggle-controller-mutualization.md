# ToggleController — Mutualisation events annulables + events prevented — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mutualiser le pattern events annulables `show`/`hide` dupliqué entre `ar-dropdown`, `ar-breadcrumb`, `ar-collapse` dans un `ToggleController` partagé, et ajouter des événements `-show-prevented`/`-hide-prevented` sur les 4 composants disclosure (`ar-dropdown`, `ar-breadcrumb`, `ar-collapse`, `ar-dialog`).

**Architecture:** `ToggleController` (ReactiveController, même famille qu'`AnchoredController`) prend en charge la détection du changement de `open`, le différé via `updateComplete`, l'émission `show`/`hide`/`show-prevented`/`hide-prevented`, et le flag anti-cycle-redondant. Les composants fournissent `onShow()`/`onHide()` (leur logique propre) et émettent eux-mêmes `shown`/`hidden` via la fonction partagée `emitToggleEvent()`. `ar-dialog` reste hors controller (ajout minimal d'un seul event dans son code existant).

**Tech Stack:** Lit 3 (`ReactiveController`), TypeScript, Vitest (tests unitaires), Web Test Runner/Playwright (tests navigateur).

## Global Constraints

- Prettier : 100 caractères, 4 espaces, guillemets simples.
- Toujours `import type` pour les imports de types.
- Aucun fallback cosmétique — non applicable ici (pas de CSS dans ce chantier).
- Breaking changes en alpha acceptés sans dépréciation (`warnDeprecated`) — précédent PR #89/#112.
- Après chaque tâche : `npm run test` (racine, Vitest) doit passer intégralement avant de committer.
- Spec de référence : `docs/superpowers/specs/2026-07-16-toggle-controller-mutualization-design.md`.

---

## État d'avancement

**Tâches 1 et 2 déjà complétées et committées** (commit `2485186` sur la branche `feat/toggle-controller-mutualization`, créée depuis `dev`) :

- `packages/core/src/utils/toggle-events.ts` — `emitToggleEvent(host, name, { cancelable })`.
- `packages/core/src/controllers/toggle.controller.ts` — `ToggleController`.
- Tests associés (19 tests, tous verts), design validé empiriquement (voir commentaires dans le code sur le comportement de `skipInitialTransition`).

Le reste de ce plan (tâches 3 à 8) part de cet état. Ne pas recréer ces fichiers.

### Interface de `ToggleController` (déjà livrée, pour référence)

```ts
export interface ToggleControllerOptions {
    eventPrefix: string;
    onShow: () => void;
    onHide: () => void;
    shouldToggle?: () => boolean;
    skipInitialTransition?: boolean;
}

export class ToggleController implements ReactiveController {
    constructor(
        host: ReactiveControllerHost & HTMLElement & { open: boolean },
        opts: ToggleControllerOptions,
    );
}
```

### Interface de `emitToggleEvent` (déjà livrée, pour référence)

```ts
export function emitToggleEvent(
    host: HTMLElement,
    name: string,
    opts: { cancelable: boolean },
): CustomEvent;
```

---

### Task 3: Migration `ar-dropdown`

**Files:**

- Modify: `packages/core/src/components/dropdown/dropdown.ts`
- Modify: `packages/core/src/components/dropdown/dropdown.test.ts`
- Verify (pas de modification attendue) : `packages/core/src/components/dropdown/dropdown.browser.test.ts`

**Interfaces:**

- Consumes: `ToggleController` et `emitToggleEvent` (`packages/core/src/controllers/toggle.controller.js`, `packages/core/src/utils/toggle-events.js`).
- Produces: `ar-dropdown-show-prevented`, `ar-dropdown-hide-prevented` (nouveaux events publics).

- [ ] **Step 1: Écrire les tests des nouveaux events `-prevented`**

Ajouter dans `packages/core/src/components/dropdown/dropdown.test.ts`, dans le `describe('événements', ...)` existant (après le test `"n'émet pas ar-dropdown-hide/-hidden quand ar-dropdown-show est annulé"`) :

```ts
it('émet ar-dropdown-show-prevented (non cancelable) quand ar-dropdown-show est annulé', async () => {
    el.addEventListener('ar-dropdown-show', (e) => e.preventDefault());
    let event: CustomEvent | undefined;
    el.addEventListener('ar-dropdown-show-prevented', (e) => {
        event = e as CustomEvent;
    });
    el.open = true;
    await waitForUpdate(el);
    await waitForUpdate(el);
    expect(event).toBeDefined();
    expect(event?.cancelable).toBe(false);
    expect(event?.detail).toEqual({ id: undefined });
});

it('émet ar-dropdown-hide-prevented (non cancelable) quand ar-dropdown-hide est annulé', async () => {
    el.open = true;
    await waitForUpdate(el);
    el.addEventListener('ar-dropdown-hide', (e) => e.preventDefault());
    let event: CustomEvent | undefined;
    el.addEventListener('ar-dropdown-hide-prevented', (e) => {
        event = e as CustomEvent;
    });
    el.open = false;
    await waitForUpdate(el);
    await waitForUpdate(el);
    expect(event).toBeDefined();
    expect(event?.cancelable).toBe(false);
    expect(event?.detail).toEqual({ id: undefined });
});
```

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent**

Run: `cd packages/core && npx vitest run src/components/dropdown/dropdown.test.ts`
Expected: les 2 nouveaux tests FAIL (les events `-prevented` n'existent pas encore). Les autres tests existants doivent encore PASS.

- [ ] **Step 3: Migrer `dropdown.ts` vers `ToggleController`**

Remplacer l'import en haut du fichier :

```ts
import { LitElement, html, type TemplateResult, type PropertyValues } from 'lit';
```

par :

```ts
import { LitElement, html, type TemplateResult, type PropertyValues } from 'lit';
import { ToggleController } from '../../controllers/toggle.controller.js';
import { emitToggleEvent } from '../../utils/toggle-events.js';
```

(insérer les 2 nouvelles lignes juste après l'import `lit`, avant l'import `AnchoredController` existant).

Remplacer le bloc JSDoc `@event` (lignes ~43-46) :

```ts
 * @event {CustomEvent} ar-dropdown-show    - Émis avant l'ouverture (annulable).
 * @event {CustomEvent} ar-dropdown-shown   - Émis après l'ouverture.
 * @event {CustomEvent} ar-dropdown-hide    - Émis avant la fermeture (annulable).
 * @event {CustomEvent} ar-dropdown-hidden  - Émis après la fermeture.
```

par :

```ts
 * @event {CustomEvent} ar-dropdown-show           - Émis avant l'ouverture (annulable).
 * @event {CustomEvent} ar-dropdown-show-prevented - Émis si ar-dropdown-show est annulé.
 * @event {CustomEvent} ar-dropdown-shown          - Émis après l'ouverture.
 * @event {CustomEvent} ar-dropdown-hide           - Émis avant la fermeture (annulable).
 * @event {CustomEvent} ar-dropdown-hide-prevented - Émis si ar-dropdown-hide est annulé.
 * @event {CustomEvent} ar-dropdown-hidden         - Émis après la fermeture.
```

Remplacer le champ `_suppressNextToggle` et son commentaire (lignes ~88-94) :

```ts
    /**
     * Quand _show()/_hide() annule et revient sur `open`, ça redéclenche un second cycle
     * updated() qui appellerait la branche opposée pour rien (le panel n'a jamais changé
     * d'état). Ce flag fait de ce second appel un no-op, sans affecter les fermetures
     * externes légitimes (onExternalClose), qui ne passent pas par cette annulation.
     */
    private _suppressNextToggle = false;
```

par :

```ts
    private readonly _toggle = new ToggleController(this, {
        eventPrefix: 'ar-dropdown',
        onShow: () => this._onShow(),
        onHide: () => this._onHide(),
    });
```

Remplacer entièrement le bloc `updated()` (lignes ~116-147) :

```ts
    override updated(changed: PropertyValues<this>): void {
        if (changed.has('placement')) {
            this._popover.setPlacement(this.placement);
        }
        if (changed.has('noScrollLock')) {
            this._popover.setLockScroll(!this.noScrollLock);
        }
        if (changed.has('for')) {
            this._externalTrigger?.removeEventListener('click', this._handleTriggerClick);
            this._externalTrigger = null;
            const newTrigger = this._resolvedTrigger;
            if (this.for && !newTrigger) {
                warn('ar-dropdown', `Aucun élément trouvé avec l'id "${this.for}".`);
            }
            if (newTrigger && this._panel) {
                this._popover.attach(newTrigger, this._panel);
                if (this.for) {
                    newTrigger.addEventListener('click', this._handleTriggerClick);
                    this._externalTrigger = newTrigger;
                }
            }
        }
        if (changed.has('open')) {
            // Différé après la fin du cycle courant : _show()/_hide() déclenchent
            // Popover.show()/hide(), qui appelle host.requestUpdate() — un appel synchrone
            // ici déclencherait l'avertissement dev Lit "change-in-update".
            void this.updateComplete.then(() => {
                if (this.open) this._show();
                else this._hide();
            });
        }
    }
```

par (le bloc `changed.has('open')` disparaît, le reste est inchangé) :

```ts
    override updated(changed: PropertyValues<this>): void {
        if (changed.has('placement')) {
            this._popover.setPlacement(this.placement);
        }
        if (changed.has('noScrollLock')) {
            this._popover.setLockScroll(!this.noScrollLock);
        }
        if (changed.has('for')) {
            this._externalTrigger?.removeEventListener('click', this._handleTriggerClick);
            this._externalTrigger = null;
            const newTrigger = this._resolvedTrigger;
            if (this.for && !newTrigger) {
                warn('ar-dropdown', `Aucun élément trouvé avec l'id "${this.for}".`);
            }
            if (newTrigger && this._panel) {
                this._popover.attach(newTrigger, this._panel);
                if (this.for) {
                    newTrigger.addEventListener('click', this._handleTriggerClick);
                    this._externalTrigger = newTrigger;
                }
            }
        }
    }
```

Remplacer `_show()`/`_hide()`/`_emit()` (lignes ~215-263) :

```ts
    private _show(): void {
        if (this._suppressNextToggle) {
            this._suppressNextToggle = false;
            return;
        }
        const showEv = this._emit('ar-dropdown-show');
        if (showEv.defaultPrevented) {
            this._suppressNextToggle = true;
            this.open = false;
            return;
        }
        this._detectMenuMode();
        this._panel?.addEventListener('keydown', this._handlePanelKeyDown);
        if (this._menuMode) this._activateMenuListeners();
        void this._popover.show().then(() => {
            if (this._menuMode) this._focusMenuItem(0);
            this._emit('ar-dropdown-shown');
        });
    }

    private _hide(): void {
        if (this._suppressNextToggle) {
            this._suppressNextToggle = false;
            return;
        }
        const hideEv = this._emit('ar-dropdown-hide');
        if (hideEv.defaultPrevented) {
            this._suppressNextToggle = true;
            this.open = true;
            return;
        }
        this._panel?.removeEventListener('keydown', this._handlePanelKeyDown);
        this._removeMenuListeners();
        this._activeIndex = -1;
        this._popover.hide();
        this._resolvedTrigger?.focus();
        this._emit('ar-dropdown-hidden');
    }

    private _emit(name: string): CustomEvent {
        const e = new CustomEvent(name, {
            bubbles: true,
            composed: true,
            cancelable: true,
            detail: { id: this.id || undefined },
        });
        this.dispatchEvent(e);
        return e;
    }
```

par :

```ts
    private _onShow(): void {
        this._detectMenuMode();
        this._panel?.addEventListener('keydown', this._handlePanelKeyDown);
        if (this._menuMode) this._activateMenuListeners();
        void this._popover.show().then(() => {
            if (this._menuMode) this._focusMenuItem(0);
            emitToggleEvent(this, 'ar-dropdown-shown', { cancelable: false });
        });
    }

    private _onHide(): void {
        this._panel?.removeEventListener('keydown', this._handlePanelKeyDown);
        this._removeMenuListeners();
        this._activeIndex = -1;
        this._popover.hide();
        this._resolvedTrigger?.focus();
        emitToggleEvent(this, 'ar-dropdown-hidden', { cancelable: false });
    }
```

- [ ] **Step 4: Adapter les tests existants qui utilisaient `_show`/`_hide` implicitement**

Aucun test n'appelle `_show`/`_hide` directement (méthodes privées) — les tests existants passent par `el.open = ...` ou des clics, donc aucune adaptation attendue au-delà des nouveaux tests du Step 1. Vérifier avec :

Run: `cd packages/core && npx vitest run src/components/dropdown/dropdown.test.ts --reporter=verbose`
Expected: tous les tests PASS, y compris les 2 nouveaux du Step 1.

- [ ] **Step 5: Vérifier les tests navigateur (point exact de la régression PR #112)**

Run: `cd packages/core && npx web-test-runner --files "src/components/dropdown/**/*.browser.test.ts"`
Expected: tous PASS, en particulier `light-dismiss` et `Escape`.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/components/dropdown/dropdown.ts packages/core/src/components/dropdown/dropdown.test.ts
git commit -m "feat(core): migre ar-dropdown vers ToggleController + ajoute show/hide-prevented"
```

---

### Task 4: Migration `ar-breadcrumb`

**Files:**

- Modify: `packages/core/src/components/breadcrumb/breadcrumb.ts`
- Modify: `packages/core/src/components/breadcrumb/breadcrumb.test.ts`
- Verify (pas de modification attendue) : `packages/core/src/components/breadcrumb/breadcrumb.browser.test.ts`

**Interfaces:**

- Consumes: `ToggleController` avec `shouldToggle: () => this.isMobile` et `skipInitialTransition: true` (préserve exactement le comportement actuel — cf. spec, section "Impact par composant").
- Produces: `ar-breadcrumb-show-prevented`, `ar-breadcrumb-hide-prevented`.

- [ ] **Step 1: Écrire les tests des nouveaux events `-prevented`**

Ajouter dans `packages/core/src/components/breadcrumb/breadcrumb.test.ts`, dans le `describe('dropdown mobile', ...)` existant, juste après le test `"n'émet pas ar-breadcrumb-show/-shown quand ar-breadcrumb-hide est annulé"` :

```ts
it('émet ar-breadcrumb-show-prevented (non cancelable) quand ar-breadcrumb-show est annulé', async () => {
    el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
    mockPopoverPanel(el);
    el.addEventListener('ar-breadcrumb-show', (e) => e.preventDefault());
    let event: CustomEvent | undefined;
    el.addEventListener('ar-breadcrumb-show-prevented', (e) => {
        event = e as CustomEvent;
    });
    el.open = true;
    await waitForUpdate(el);
    await waitForUpdate(el);
    expect(event).toBeDefined();
    expect(event?.cancelable).toBe(false);
});

it('émet ar-breadcrumb-hide-prevented (non cancelable) quand ar-breadcrumb-hide est annulé', async () => {
    el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
    mockPopoverPanel(el);
    const btn = getShadow(el).querySelector('#breadcrumb-dropdown') as HTMLButtonElement;
    btn.click();
    await waitForUpdate(el);
    el.addEventListener('ar-breadcrumb-hide', (e) => e.preventDefault());
    let event: CustomEvent | undefined;
    el.addEventListener('ar-breadcrumb-hide-prevented', (e) => {
        event = e as CustomEvent;
    });
    btn.click();
    await waitForUpdate(el);
    await waitForUpdate(el);
    expect(event).toBeDefined();
    expect(event?.cancelable).toBe(false);
});
```

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent**

Run: `cd packages/core && npx vitest run src/components/breadcrumb/breadcrumb.test.ts`
Expected: les 2 nouveaux tests FAIL, les autres PASS.

- [ ] **Step 3: Migrer `breadcrumb.ts` vers `ToggleController`**

Ajouter l'import (après l'import `lit`, avant les imports `@lit/context`/styles) :

```ts
import { ToggleController } from '../../controllers/toggle.controller.js';
import { emitToggleEvent } from '../../utils/toggle-events.js';
```

Remplacer le bloc JSDoc `@event` (lignes ~49-52) :

```ts
 * @event {CustomEvent} ar-breadcrumb-show   - Émis avant l'ouverture du dropdown mobile. Annulable.
 * @event {CustomEvent} ar-breadcrumb-shown  - Émis après l'ouverture du dropdown mobile.
 * @event {CustomEvent} ar-breadcrumb-hide   - Émis avant la fermeture du dropdown mobile. Annulable.
 * @event {CustomEvent} ar-breadcrumb-hidden - Émis après la fermeture du dropdown mobile.
```

par :

```ts
 * @event {CustomEvent} ar-breadcrumb-show           - Émis avant l'ouverture du dropdown mobile. Annulable.
 * @event {CustomEvent} ar-breadcrumb-show-prevented - Émis si ar-breadcrumb-show est annulé.
 * @event {CustomEvent} ar-breadcrumb-shown          - Émis après l'ouverture du dropdown mobile.
 * @event {CustomEvent} ar-breadcrumb-hide           - Émis avant la fermeture du dropdown mobile. Annulable.
 * @event {CustomEvent} ar-breadcrumb-hide-prevented - Émis si ar-breadcrumb-hide est annulé.
 * @event {CustomEvent} ar-breadcrumb-hidden         - Émis après la fermeture du dropdown mobile.
```

Remplacer le champ `_suppressNextToggle` (lignes ~80-86) :

```ts
    /**
     * Quand _show()/_hide() annule et revient sur `open`, ça redéclenche un second cycle
     * updated() qui appellerait la branche opposée pour rien (le panel n'a jamais changé
     * d'état). Ce flag fait de ce second appel un no-op, sans affecter les fermetures
     * externes légitimes (onExternalClose), qui ne passent pas par cette annulation.
     */
    private _suppressNextToggle = false;
```

par :

```ts
    private readonly _toggle = new ToggleController(this, {
        eventPrefix: 'ar-breadcrumb',
        shouldToggle: () => this.isMobile,
        skipInitialTransition: true,
        onShow: () => this._onShow(),
        onHide: () => this._onHide(),
    });
```

Remplacer le bloc `updated()` (lignes ~144-159) :

```ts
    override updated(changed: PropertyValues<this>): void {
        if ((changed as Map<PropertyKey, unknown>).has('isMobile') && this.isMobile) {
            void this.updateComplete.then(() => {
                if (this.isConnected) this._attachDropdown();
            });
        }
        if (changed.has('open') && changed.get('open') !== undefined && this.isMobile) {
            // Différé après la fin du cycle courant : _show()/_hide() déclenchent
            // Popover.show()/hide(), qui appelle host.requestUpdate() — un appel synchrone
            // ici déclencherait l'avertissement dev Lit "change-in-update".
            void this.updateComplete.then(() => {
                if (this.open) this._show();
                else this._hide();
            });
        }
    }
```

par (le bloc `changed.has('open')` disparaît, le reste est inchangé) :

```ts
    override updated(changed: PropertyValues<this>): void {
        if ((changed as Map<PropertyKey, unknown>).has('isMobile') && this.isMobile) {
            void this.updateComplete.then(() => {
                if (this.isConnected) this._attachDropdown();
            });
        }
    }
```

Remplacer `_show()`/`_hide()`/`_emit()` (lignes ~259-299) :

```ts
    private _show(): void {
        if (this._suppressNextToggle) {
            this._suppressNextToggle = false;
            return;
        }
        const showEv = this._emit('ar-breadcrumb-show');
        if (showEv.defaultPrevented) {
            this._suppressNextToggle = true;
            this.open = false;
            return;
        }
        void this._popover.show().then(() => {
            this._emit('ar-breadcrumb-shown');
        });
    }

    private _hide(): void {
        if (this._suppressNextToggle) {
            this._suppressNextToggle = false;
            return;
        }
        const hideEv = this._emit('ar-breadcrumb-hide');
        if (hideEv.defaultPrevented) {
            this._suppressNextToggle = true;
            this.open = true;
            return;
        }
        this._popover.hide();
        this._emit('ar-breadcrumb-hidden');
    }

    private _emit(name: string): CustomEvent {
        const e = new CustomEvent(name, {
            bubbles: true,
            composed: true,
            cancelable: true,
            detail: { id: this.id || undefined },
        });
        this.dispatchEvent(e);
        return e;
    }
```

par :

```ts
    private _onShow(): void {
        void this._popover.show().then(() => {
            emitToggleEvent(this, 'ar-breadcrumb-shown', { cancelable: false });
        });
    }

    private _onHide(): void {
        this._popover.hide();
        emitToggleEvent(this, 'ar-breadcrumb-hidden', { cancelable: false });
    }
```

- [ ] **Step 4: Lancer les tests**

Run: `cd packages/core && npx vitest run src/components/breadcrumb/breadcrumb.test.ts --reporter=verbose`
Expected: tous PASS, y compris les 2 nouveaux du Step 1. En particulier, vérifier que le test `"open vaut false par défaut"` et le comportement desktop (`describe('attribut open — mode desktop', ...)`) restent inchangés (`shouldToggle`/`skipInitialTransition` doivent reproduire exactement l'ancien comportement).

- [ ] **Step 5: Vérifier les tests navigateur**

Run: `cd packages/core && npx web-test-runner --files "src/components/breadcrumb/**/*.browser.test.ts"`
Expected: tous PASS, en particulier le test `light-dismiss` (point exact de la régression PR #112).

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/components/breadcrumb/breadcrumb.ts packages/core/src/components/breadcrumb/breadcrumb.test.ts
git commit -m "feat(core): migre ar-breadcrumb vers ToggleController + ajoute show/hide-prevented"
```

---

### Task 5: Migration `ar-collapse`

**Files:**

- Modify: `packages/core/src/components/collapse/collapse.ts`
- Modify: `packages/core/src/components/collapse/collapse.test.ts`
- Verify (pas de modification attendue) : `packages/core/src/components/collapse/collapse.browser.test.ts`, `collapse.a11y.test.ts`

**Interfaces:**

- Consumes: `ToggleController` avec `skipInitialTransition: true` (préserve le comportement actuel — collapse ne fire pas show/hide sur `open=true` posé avant la première connexion, cf. son ancien guard `changed.get('open') !== undefined` combiné à `_initialized`).
- Produces: `ar-collapse-show-prevented`, `ar-collapse-hide-prevented`. `ar-collapse-show`/`-shown`/`-hide`/`-hidden` gagnent désormais `detail: { id }` (n'en avaient pas avant — décision actée : changement additif accepté).

- [ ] **Step 1: Écrire les tests des nouveaux events `-prevented` et du nouveau `detail`**

Ajouter dans `packages/core/src/components/collapse/collapse.test.ts`, dans le `describe('événements', ...)` existant, après le test `"n'émet pas ar-collapse-show/-shown quand ar-collapse-hide est annulé"` :

```ts
it('émet ar-collapse-show-prevented (non cancelable) quand ar-collapse-show est annulé', async () => {
    el.addEventListener('ar-collapse-show', (e) => e.preventDefault());
    let event: CustomEvent | undefined;
    el.addEventListener('ar-collapse-show-prevented', (e) => {
        event = e as CustomEvent;
    });
    el.open = true;
    await waitForUpdate(el);
    expect(event).toBeDefined();
    expect(event?.cancelable).toBe(false);
});

it('émet ar-collapse-hide-prevented (non cancelable) quand ar-collapse-hide est annulé', async () => {
    el.show();
    await waitForUpdate(el);
    el.addEventListener('ar-collapse-hide', (e) => e.preventDefault());
    let event: CustomEvent | undefined;
    el.addEventListener('ar-collapse-hide-prevented', (e) => {
        event = e as CustomEvent;
    });
    el.open = false;
    await waitForUpdate(el);
    expect(event).toBeDefined();
    expect(event?.cancelable).toBe(false);
});

it('ar-collapse-show porte desormais detail.id (id auto-généré)', async () => {
    let detail: { id?: string } | undefined;
    el.addEventListener('ar-collapse-show', (e) => {
        detail = (e as CustomEvent).detail;
    });
    el.show();
    await waitForUpdate(el);
    expect(detail?.id).toBe(el.id);
});
```

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent**

Run: `cd packages/core && npx vitest run src/components/collapse/collapse.test.ts`
Expected: les 3 nouveaux tests FAIL, les autres PASS.

- [ ] **Step 3: Migrer `collapse.ts` vers `ToggleController`**

Ajouter l'import (après l'import `lit`) :

```ts
import { ToggleController } from '../../controllers/toggle.controller.js';
import { emitToggleEvent } from '../../utils/toggle-events.js';
```

Retirer `export type ArCollapseEvents = ...` (lignes 7-11) — n'est plus utilisé une fois `_emit()` supprimé (vérifier par `grep -rn "ArCollapseEvents" packages/core/src` qu'aucun autre fichier ne l'importe avant de le retirer).

Remplacer le bloc JSDoc `@event` (lignes ~28-31) :

```ts
 * @event {CustomEvent} ar-collapse-show   - Avant l'ouverture. Annulable.
 * @event {CustomEvent} ar-collapse-shown  - Après la fin de l'animation d'ouverture.
 * @event {CustomEvent} ar-collapse-hide   - Avant la fermeture. Annulable.
 * @event {CustomEvent} ar-collapse-hidden - Après la fin de l'animation de fermeture.
```

par :

```ts
 * @event {CustomEvent} ar-collapse-show           - Avant l'ouverture. Annulable.
 * @event {CustomEvent} ar-collapse-show-prevented - Émis si ar-collapse-show est annulé.
 * @event {CustomEvent} ar-collapse-shown          - Après la fin de l'animation d'ouverture.
 * @event {CustomEvent} ar-collapse-hide           - Avant la fermeture. Annulable.
 * @event {CustomEvent} ar-collapse-hide-prevented - Émis si ar-collapse-hide est annulé.
 * @event {CustomEvent} ar-collapse-hidden         - Après la fin de l'animation de fermeture.
```

Ajouter le controller comme champ de classe, juste après `private _onTransitionEnd: (() => void) | null = null;` (ligne 66) :

```ts
    private readonly _toggle = new ToggleController(this, {
        eventPrefix: 'ar-collapse',
        skipInitialTransition: true,
        onShow: () => this._onShow(),
        onHide: () => this._onHide(),
    });
```

Remplacer le bloc `updated()` (lignes ~93-109) :

```ts
    override updated(changed: PropertyValues<this>): void {
        if (!this._initialized) return;
        if (changed.has('for')) {
            this._detachExternalTrigger();
            if (this.for) {
                this._warnIfBothTriggers();
                this._attachExternalTrigger();
            }
        }
        if (changed.has('open') && changed.get('open') !== undefined) {
            if (this.open) this._show();
            else this._hide();
        }
        if (changed.has('disabled')) {
            this._syncTriggerDisabled();
        }
    }
```

par (le bloc `changed.has('open')` disparaît, le reste est inchangé) :

```ts
    override updated(changed: PropertyValues<this>): void {
        if (!this._initialized) return;
        if (changed.has('for')) {
            this._detachExternalTrigger();
            if (this.for) {
                this._warnIfBothTriggers();
                this._attachExternalTrigger();
            }
        }
        if (changed.has('disabled')) {
            this._syncTriggerDisabled();
        }
    }
```

Remplacer `_show()`/`_hide()`/`_emit()` (lignes ~272-352) :

```ts
    private _show(): void {
        // symétrique de la garde de _hide() : panel déjà visible (ex. ar-collapse-hide
        // annulé → open=true redéclenché) — évite de réémettre show/shown pour rien.
        if (!this._panel.hasAttribute('hidden') && !this._animating) return;
        const ev = this._emit('ar-collapse-show');
        if (ev.defaultPrevented) {
            this.open = false;
            return;
        }
        this._abortAnimation();
        this._closeGroupSiblings();
        this._syncTriggerAria();
        this._animating = true;
        const panel = this._panel;
        panel.style.height = '0px';
        panel.removeAttribute('hidden');
        const targetH = panel.scrollHeight;
        void panel.offsetHeight; // force reflow
        if (!this._shouldAnimate()) {
            panel.style.height = 'auto';
            this._animating = false;
            this._emit('ar-collapse-shown');
            return;
        }
        panel.style.height = `${targetH}px`;
        const onShow = () => {
            this._onTransitionEnd = null;
            this._animating = false;
            panel.style.height = 'auto';
            this._emit('ar-collapse-shown');
        };
        this._onTransitionEnd = onShow;
        panel.addEventListener('transitionend', onShow, { once: true });
    }

    private _hide(): void {
        // finding 2 : panel déjà caché (ex. ar-collapse-show annulé → open=false déclenché)
        if (this._panel.hasAttribute('hidden') && !this._animating) return;
        const ev = this._emit('ar-collapse-hide');
        if (ev.defaultPrevented) {
            this.open = true;
            return;
        }
        const wasAnimating = this._animating;
        this._abortAnimation();
        this._syncTriggerAria();
        if (wasAnimating) {
            // finding 5 : snap immédiat — frère accordéon ou interruption externe
            this._panel.setAttribute('hidden', '');
            this._panel.style.height = '';
            this._emit('ar-collapse-hidden');
            return;
        }
        this._animating = true;
        const panel = this._panel;
        panel.style.height = `${panel.scrollHeight}px`;
        void panel.offsetHeight; // force reflow
        if (!this._shouldAnimate()) {
            this._animating = false;
            panel.setAttribute('hidden', '');
            panel.style.height = '';
            this._emit('ar-collapse-hidden');
            return;
        }
        panel.style.height = '0px';
        const onHide = () => {
            this._onTransitionEnd = null;
            this._animating = false;
            panel.setAttribute('hidden', '');
            panel.style.height = '';
            this._emit('ar-collapse-hidden');
        };
        this._onTransitionEnd = onHide;
        panel.addEventListener('transitionend', onHide, { once: true });
    }

    private _emit(name: ArCollapseEvents): CustomEvent {
        const e = new CustomEvent(name, { bubbles: true, composed: true, cancelable: true });
        this.dispatchEvent(e);
        return e;
    }
```

par (les gardes `hasAttribute('hidden')` disparaissent — protection anti-cycle-redondant désormais gérée par le controller ; `_emit()` disparaît, remplacé par `emitToggleEvent`) :

```ts
    private _onShow(): void {
        this._abortAnimation();
        this._closeGroupSiblings();
        this._syncTriggerAria();
        this._animating = true;
        const panel = this._panel;
        panel.style.height = '0px';
        panel.removeAttribute('hidden');
        const targetH = panel.scrollHeight;
        void panel.offsetHeight; // force reflow
        if (!this._shouldAnimate()) {
            panel.style.height = 'auto';
            this._animating = false;
            emitToggleEvent(this, 'ar-collapse-shown', { cancelable: false });
            return;
        }
        panel.style.height = `${targetH}px`;
        const onShow = () => {
            this._onTransitionEnd = null;
            this._animating = false;
            panel.style.height = 'auto';
            emitToggleEvent(this, 'ar-collapse-shown', { cancelable: false });
        };
        this._onTransitionEnd = onShow;
        panel.addEventListener('transitionend', onShow, { once: true });
    }

    private _onHide(): void {
        const wasAnimating = this._animating;
        this._abortAnimation();
        this._syncTriggerAria();
        if (wasAnimating) {
            // finding 5 : snap immédiat — frère accordéon ou interruption externe
            this._panel.setAttribute('hidden', '');
            this._panel.style.height = '';
            emitToggleEvent(this, 'ar-collapse-hidden', { cancelable: false });
            return;
        }
        this._animating = true;
        const panel = this._panel;
        panel.style.height = `${panel.scrollHeight}px`;
        void panel.offsetHeight; // force reflow
        if (!this._shouldAnimate()) {
            this._animating = false;
            panel.setAttribute('hidden', '');
            panel.style.height = '';
            emitToggleEvent(this, 'ar-collapse-hidden', { cancelable: false });
            return;
        }
        panel.style.height = '0px';
        const onHide = () => {
            this._onTransitionEnd = null;
            this._animating = false;
            panel.setAttribute('hidden', '');
            panel.style.height = '';
            emitToggleEvent(this, 'ar-collapse-hidden', { cancelable: false });
        };
        this._onTransitionEnd = onHide;
        panel.addEventListener('transitionend', onHide, { once: true });
    }
```

**Point d'attention** : `_abortAnimation()` (méthode existante, inchangée) référence `this.open` pour décider de l'état final du panel lors d'un abort (`disconnectedCallback`, ou interruption). Vérifier après migration qu'elle continue de fonctionner correctement — elle ne dépend pas de `_show`/`_hide`/`_emit`, seulement de `this.open` et `this._panel`, donc ne devrait pas être affectée par ce refactor. Confirmer avec la suite de tests complète (Step 4).

- [ ] **Step 4: Lancer les tests**

Run: `cd packages/core && npx vitest run src/components/collapse/collapse.test.ts --reporter=verbose`
Expected: tous PASS, y compris les 3 nouveaux du Step 1. Porter une attention particulière aux tests `'show() est no-op si déjà open'` et `'hide() est no-op si déjà fermé'` (describe `'show() / hide()'`) — ces no-op restent garantis par les guards de `show()`/`hide()` publics (`if (this.open || this._animating || this.disabled) return;`), indépendants du controller.

- [ ] **Step 5: Vérifier les tests navigateur et a11y**

Run: `cd packages/core && npx web-test-runner --files "src/components/collapse/**/*.{browser,a11y}.test.ts"`
Expected: tous PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/components/collapse/collapse.ts packages/core/src/components/collapse/collapse.test.ts
git commit -m "feat(core): migre ar-collapse vers ToggleController + ajoute show/hide-prevented"
```

---

### Task 6: Ajout minimal `ar-dialog-show-prevented`

**Files:**

- Modify: `packages/core/src/components/dialog/dialog.ts`
- Modify: `packages/core/src/components/dialog/dialog.test.ts`

**Interfaces:**

- Consumes: rien de nouveau — `ar-dialog` garde son propre `_emit()` (pas de migration vers `emitToggleEvent`/`ToggleController` dans ce plan, cf. spec).
- Produces: `ar-dialog-show-prevented`.

- [ ] **Step 1: Écrire le test du nouvel event**

Ajouter dans `packages/core/src/components/dialog/dialog.test.ts`, dans le `describe('ouverture', ...)` (même bloc que le test `"ar-dialog-show annulable empêche l'ouverture"`, juste après lui) :

```ts
it('ar-dialog-show annulé émet ar-dialog-show-prevented', async () => {
    el = await fixture('<ar-dialog></ar-dialog>');
    el.addEventListener('ar-dialog-show', (e) => e.preventDefault());
    const prevented = vi.fn();
    el.addEventListener('ar-dialog-show-prevented', prevented);
    el.open = true;
    await waitForUpdate(el);
    expect(prevented).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `cd packages/core && npx vitest run src/components/dialog/dialog.test.ts`
Expected: le nouveau test FAIL, les autres PASS.

- [ ] **Step 3: Ajouter l'event dans `dialog.ts`**

Dans le type `ArDialogEvents` (lignes 21-30), ajouter `'ar-dialog-show-prevented'` juste après `'ar-dialog-show'` :

```ts
export type ArDialogEvents =
    | 'ar-dialog-show'
    | 'ar-dialog-show-prevented'
    | 'ar-dialog-shown'
    | 'ar-dialog-hide'
    | 'ar-dialog-hide-prevented'
    | 'ar-dialog-hidden'
    | 'ar-dialog-dismissed'
    | 'ar-dialog-dismissed-prevented'
    | 'ar-dialog-accepted'
    | 'ar-dialog-accepted-prevented';
```

Dans le bloc JSDoc `@event` (ligne 73), ajouter juste après `ar-dialog-show` :

```ts
 * @event {CustomEvent} ar-dialog-show - Émis avant l'ouverture. Annulable.
 * @event {CustomEvent} ar-dialog-show-prevented - Émis si ar-dialog-show est annulé.
```

Dans `_show()` (lignes 409-420), ajouter l'émission juste après `this._triggerElement = null;` — **avant** le `.then()` différé (décision actée : émission synchrone, `el.open` peut encore valoir `true` un instant à ce moment précis, le revert réel arrivant un tick plus tard) :

```ts
    private _show(): void {
        this._triggerElement = document.activeElement;
        const showEvent = this._emit('ar-dialog-show');
        if (showEvent.defaultPrevented) {
            this._triggerElement = null;
            this._emit('ar-dialog-show-prevented');
            void this.updateComplete.then(() => {
                if (this.isConnected && this.open && !this.dialog?.open) {
                    this.open = false;
                }
            });
            return;
        }
```

(le reste de `_show()` est inchangé).

- [ ] **Step 4: Lancer les tests**

Run: `cd packages/core && npx vitest run src/components/dialog/dialog.test.ts --reporter=verbose`
Expected: tous PASS, y compris le nouveau test.

- [ ] **Step 5: Vérifier les tests navigateur et a11y du dialog**

Run: `cd packages/core && npx web-test-runner --files "src/components/dialog/**/*.{browser,a11y}.test.ts"`
Expected: tous PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/components/dialog/dialog.ts packages/core/src/components/dialog/dialog.test.ts
git commit -m "feat(core): ajoute ar-dialog-show-prevented (symétrique à hide-prevented)"
```

---

### Task 7: Vérification globale + documentation

**Files:**

- Verify only (pas de modification de code attendue, sauf régénération de fichiers générés) :
    - `packages/core/custom-elements.json` (régénéré par `build:manifest`)
    - `apps/docs/` (vérification visuelle uniquement)

- [ ] **Step 1: Suite complète Vitest**

Run (depuis la racine) : `npm run test`
Expected: tous les fichiers PASS (comparer le compte total de tests à avant ce chantier + les nouveaux tests ajoutés dans les tasks 3-6 : 5 nouveaux dans dropdown, 5 dans breadcrumb — 2 events-prevented + les 3 tests de non-régression déjà existants restent, en fait juste 2 nouveaux par composant sauf collapse qui en a 3 — total +9 nouveaux tests de composants, +19 déjà comptés dans le commit `2485186`).

- [ ] **Step 2: Suite complète navigateur**

Run: `cd packages/core && npx web-test-runner`
Expected: tous PASS (220+ tests avant ce chantier, plus les vérifications des tasks 3-6 déjà passées individuellement).

- [ ] **Step 3: Typecheck et lint**

Run: `cd packages/core && npx tsc --noEmit && npm run lint`
Expected: aucune erreur.

- [ ] **Step 4: Régénérer le CEM et vérifier l'impact doc**

Run: `cd packages/core && npm run build:manifest`
Expected: `custom-elements.json` regénéré sans erreur, contient les nouveaux events (`grep -c "prevented" custom-elements.json` doit être > 0).

Lancer le site de doc en local (`npm run dev` depuis la racine, ou `cd apps/docs && npm run dev`) et vérifier visuellement les pages `ar-dropdown`, `ar-breadcrumb`, `ar-collapse`, `ar-dialog` — la table des events doit lister les nouveaux `-prevented`, sans régression d'affichage sur les events existants.

- [ ] **Step 5: Commit des fichiers générés si modifiés**

```bash
git status --short packages/core/custom-elements.json
# Si modifié :
git add packages/core/custom-elements.json
git commit -m "chore(core): régénère le CEM avec les nouveaux events -prevented"
```

---

### Task 8: Ouverture de la PR

**Files:** aucun.

- [ ] **Step 1: Push de la branche**

```bash
git push -u origin feat/toggle-controller-mutualization
```

- [ ] **Step 2: Créer la PR vers `dev`**

```bash
gh pr create --base dev --head feat/toggle-controller-mutualization \
  --title "feat(core): mutualise le pattern events annulables (ToggleController) + events -prevented" \
  --body "$(cat <<'EOF'
## Contexte

Item 1 de #111 (chantier technique global), 2ᵉ moitié — suite de #112 (bug d'émission parasite).
Spec : docs/superpowers/specs/2026-07-16-toggle-controller-mutualization-design.md

## Contenu

- `ToggleController` (ReactiveController partagé) + `emitToggleEvent()` — mutualise la mécanique show/hide annulable dupliquée entre ar-dropdown, ar-breadcrumb, ar-collapse.
- Nouveaux événements `ar-*-show-prevented`/`ar-*-hide-prevented` sur les 4 composants disclosure (dropdown, breadcrumb, collapse, dialog).
- Correctif : `cancelable: false` sur les events informatifs (shown/hidden/-prevented), qui étaient `cancelable: true` par erreur — sauf ar-dialog, qui garde son `_emit()` propre (hors scope de la migration controller).
- ar-collapse gagne `detail: { id }` sur ses events (absent auparavant).

## Breaking changes (alpha, acceptés sans dépréciation)

- `CustomEvent.cancelable` passe de `true` à `false` sur ar-dropdown-shown/-hidden, ar-breadcrumb-shown/-hidden, ar-collapse-show/-shown/-hide/-hidden.
- ar-collapse : nouveaux champs `detail.id` sur tous ses events (additif).

## Test plan

- [x] npm run test — suite complète Vitest
- [x] npm run test:browser — suite complète navigateur (WTR), y compris light-dismiss/Escape (point de la régression #112)
- [x] tsc --noEmit + npm run lint
- [x] Vérification visuelle doc Astro (table events)
EOF
)"
```

---

## Self-Review (fait avant remise du plan)

**Couverture spec** : périmètre (3 composants mutualisés + dialog minimal) ✓, `ToggleController` API ✓ (livré, validé empiriquement), fonction d'émission partagée ✓ (livré), impact par composant ✓ (tasks 3-6), tests ✓ (chaque task), documentation/CEM ✓ (task 7).

**Signatures** : `ToggleControllerOptions` (`eventPrefix`, `onShow`, `onHide`, `shouldToggle?`, `skipInitialTransition?`) et `emitToggleEvent(host, name, { cancelable })` utilisés de façon cohérente dans toutes les tasks 3-6, correspondant exactement à l'implémentation livrée dans le commit `2485186`.

**Nuances découvertes en cours de planification, non prévues au spec initial, actées avec l'utilisateur avant rédaction** :

- `ar-breadcrumb` : gate `isMobile` + skip de la toute première transition (`shouldToggle`/`skipInitialTransition`).
- `ar-collapse` : skip de la toute première transition également ; ajout de `detail: { id }` absent auparavant.
- `ar-dialog` : timing synchrone (avant le revert différé) pour `ar-dialog-show-prevented`.
