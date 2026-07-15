# PR2 — Convention unifiée des events de cycle de vie — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aligner `ar-breadcrumb`, `ar-tooltip` et `ar-stepper` sur la convention d'events déjà majoritaire dans la librairie (`show`/`shown`/`hide`/`hidden`, `detail: { id }`, suffixe `-change`), et corriger au passage la fuite d'event interne `step-changed` sur `ar-stepper`.

**Architecture:** Chaque composant est traité dans sa propre tâche, isolément testable. `ar-breadcrumb` et `ar-tooltip` gagnent des méthodes privées `_show()`/`_hide()` qui centralisent l'émission d'events (miroir du pattern déjà en place dans `dropdown.ts`), appelées depuis les points d'entrée existants (`updated()` pour breadcrumb, les timers/handlers existants pour tooltip). `ar-stepper` perd un dispatch non documenté et renomme l'autre.

**Tech Stack:** Lit 3, TypeScript, Vitest (`fixture`/`waitForUpdate`/`getPart`/`getShadow` depuis `packages/core/src/test-utils.ts`), WTR pour les tests browser (`breadcrumb.browser.test.ts`).

## Global Constraints

- Prettier : 100 caractères, 4 espaces, quotes simples (auto-appliqué par `lint-staged` au commit).
- Conventional Commits (commitlint/Husky).
- `warn(tag, message)` reste l'unique mécanisme de diagnostic dev (aucun changement dans ce plan, mais ne pas régresser sur les fichiers touchés).
- Tout event de disclosure (`show`/`hide`) est `cancelable: true`, `bubbles: true`, `composed: true`. Les events `shown`/`hidden` suivent le même `_emit()` (donc techniquement aussi `cancelable: true` dans l'implémentation, comme `ar-dropdown` — ce n'est pas une nouvelle divergence à corriger ici, juste le pattern existant reconduit à l'identique).
- `detail: { id: this.id || undefined }` systématique sur tous les events ajoutés/renommés dans ce plan.
- Branche : `fix/pr2-events-lifecycle-convention` depuis `dev` (PR1 n'est pas encore mergée au moment de la rédaction ; pas de recouvrement de fichiers attendu — `breadcrumb.ts`, `tooltip.ts`, `stepper.ts` ne sont pas touchés par PR1). PR vers `dev` en fin de plan.
- Design de référence : `docs/superpowers/specs/2026-07-14-pr2-events-convention-design.md`.

---

### Task 1: Créer la branche de travail

**Files:** aucun fichier modifié.

- [ ] **Step 1: Créer et checkout la branche depuis `dev`**

```bash
cd /Users/jon/Code/Active_projects/ariane
git checkout dev
git pull origin dev
git checkout -b fix/pr2-events-lifecycle-convention
```

Expected: branche créée et checkoutée, `git status` propre.

---

### Task 2: `ar-breadcrumb` — pattern show/shown/hide/hidden

**Files:**

- Modify: `packages/core/src/components/breadcrumb/breadcrumb.ts`
- Modify: `packages/core/src/components/breadcrumb/breadcrumb.test.ts`
- Modify: `packages/core/src/components/breadcrumb/breadcrumb.browser.test.ts`
- Modify: `apps/docs/src/content/components/ar-breadcrumb.mdx`

**Interfaces:**

- Nouveaux events publics : `ar-breadcrumb-show` (cancelable), `ar-breadcrumb-shown`, `ar-breadcrumb-hide` (cancelable), `ar-breadcrumb-hidden`. Tous `detail: { id: string | undefined }`.
- Suppression des events `ar-breadcrumb-open`/`ar-breadcrumb-close`.
- Nouvelle méthode privée `_emit(name: string): CustomEvent`.

- [ ] **Step 1: Écrire les tests qui échouent — renommage des 5 tests existants `open`/`close` → `show`/`hide`**

Dans `packages/core/src/components/breadcrumb/breadcrumb.test.ts`, remplacer les 5 occurrences suivantes (chercher `ar-breadcrumb-open` et `ar-breadcrumb-close`) :

1. Ligne ~223, titre du test : `"émet ar-breadcrumb-open à l'ouverture du dropdown"` → `"émet ar-breadcrumb-show à l'ouverture du dropdown"`, et `el.addEventListener('ar-breadcrumb-open', handler)` → `el.addEventListener('ar-breadcrumb-show', handler)`.
2. Ligne ~240, titre : `'émet ar-breadcrumb-close à la fermeture du dropdown'` → `'émet ar-breadcrumb-hide à la fermeture du dropdown'`, et les deux `addEventListener` renommés `ar-breadcrumb-show`/`ar-breadcrumb-hide` (variables `openHandler`/`closeHandler` gardées telles quelles, ou renommées `showHandler`/`hideHandler` pour cohérence — au choix, sans impact fonctionnel).
3. Ligne ~262, titre : `'émet ar-breadcrumb-open au premier clic sur le bouton'` → `'émet ar-breadcrumb-show au premier clic sur le bouton'`, `addEventListener('ar-breadcrumb-open', ...)` → `addEventListener('ar-breadcrumb-show', ...)`.
4. Ligne ~280, titre : `'émet ar-breadcrumb-close au deuxième clic sur le bouton'` → `'émet ar-breadcrumb-hide au deuxième clic sur le bouton'`, `addEventListener('ar-breadcrumb-close', ...)` → `addEventListener('ar-breadcrumb-hide', ...)`.
5. Ligne ~326, titre : `'open=true programmatique émet ar-breadcrumb-open'` → `'open=true programmatique émet ar-breadcrumb-show'`, `addEventListener('ar-breadcrumb-open', handler)` → `addEventListener('ar-breadcrumb-show', handler)`.

Dans `packages/core/src/components/breadcrumb/breadcrumb.browser.test.ts` (ligne ~80) : titre `"un hidePopover() externe ferme le panel et émet ar-breadcrumb-close une seule fois"` → `"...émet ar-breadcrumb-hide une seule fois"`, `addEventListener('ar-breadcrumb-close', ...)` → `addEventListener('ar-breadcrumb-hide', ...)`.

Ces 6 tests renommés vérifient la même sémantique que l'ancien `open`/`close` (event synchrone au changement d'état) — `show`/`hide` sont émis au même point d'exécution synchrone que l'étaient `open`/`close`, donc aucune autre modification de logique de test n'est nécessaire.

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent**

Run: `npm run test -w packages/core -- breadcrumb.test.ts`
Expected: FAIL — les 5 tests renommés échouent (`ar-breadcrumb-show`/`ar-breadcrumb-hide` ne sont jamais émis, le code émet encore `ar-breadcrumb-open`/`-close`).

- [ ] **Step 3: Refactorer `breadcrumb.ts` — extraire `_show()`/`_hide()`/`_emit()`, renommer le handler de clic**

Remplacer les lignes 130-149 (`updated()`) :

```typescript
    override updated(changed: PropertyValues<this>): void {
        if ((changed as Map<PropertyKey, unknown>).has('isMobile') && this.isMobile) {
            void this.updateComplete.then(() => {
                if (this.isConnected) this._attachDropdown();
            });
        }
        if (changed.has('open') && changed.get('open') !== undefined && this.isMobile) {
            if (this.open) {
                void this._popover.show();
                this.dispatchEvent(
                    new CustomEvent('ar-breadcrumb-open', { bubbles: true, composed: true }),
                );
            } else {
                this._popover.hide();
                this.dispatchEvent(
                    new CustomEvent('ar-breadcrumb-close', { bubbles: true, composed: true }),
                );
            }
        }
    }
```

par :

```typescript
    override updated(changed: PropertyValues<this>): void {
        if ((changed as Map<PropertyKey, unknown>).has('isMobile') && this.isMobile) {
            void this.updateComplete.then(() => {
                if (this.isConnected) this._attachDropdown();
            });
        }
        if (changed.has('open') && changed.get('open') !== undefined && this.isMobile) {
            if (this.open) this._show();
            else this._hide();
        }
    }
```

Remplacer les lignes 245-251 (les anciennes méthodes `_show()`/`_hide()` utilisées comme handlers de clic) :

```typescript
    private _show(): void {
        this.open = true;
    }

    private _hide(): void {
        this.open = false;
    }
```

par (nouveau nom pour le handler de clic + nouvelles méthodes d'émission) :

```typescript
    private _handleTriggerClick = (): void => {
        this.open = !this.open;
    };

    private _show(): void {
        const showEv = this._emit('ar-breadcrumb-show');
        if (showEv.defaultPrevented) {
            this.open = false;
            return;
        }
        void this._popover.show().then(() => {
            this._emit('ar-breadcrumb-shown');
        });
    }

    private _hide(): void {
        const hideEv = this._emit('ar-breadcrumb-hide');
        if (hideEv.defaultPrevented) {
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

Dans `render()` (ligne ~190), remplacer :

```typescript
                          <button
                              @click=${this.open ? this._hide : this._show}
```

par :

```typescript
                          <button
                              @click=${this._handleTriggerClick}
```

- [ ] **Step 4: Mettre à jour le JSDoc `@event`**

Remplacer les lignes 49-50 :

```typescript
 * @event {CustomEvent} ar-breadcrumb-open  - Émis à l'ouverture du dropdown mobile.
 * @event {CustomEvent} ar-breadcrumb-close - Émis à la fermeture du dropdown mobile.
```

par :

```typescript
 * @event {CustomEvent} ar-breadcrumb-show   - Émis avant l'ouverture du dropdown mobile. Annulable.
 * @event {CustomEvent} ar-breadcrumb-shown  - Émis après l'ouverture du dropdown mobile.
 * @event {CustomEvent} ar-breadcrumb-hide   - Émis avant la fermeture du dropdown mobile. Annulable.
 * @event {CustomEvent} ar-breadcrumb-hidden - Émis après la fermeture du dropdown mobile.
```

- [ ] **Step 5: Lancer les tests renommés, vérifier qu'ils passent**

Run: `npm run test -w packages/core -- breadcrumb.test.ts`
Expected: PASS pour les 5 tests renommés (peuvent encore échouer sur d'autres points si les steps suivants ne sont pas faits — c'est attendu, on complète au fil des steps).

- [ ] **Step 6: Écrire les tests qui échouent — `shown`/`hidden`, annulation, `detail.id`**

Ajouter dans `breadcrumb.test.ts`, dans le même `describe` que les tests d'events existants :

```typescript
it('émet ar-breadcrumb-shown après ar-breadcrumb-show', async () => {
    el = await fixture(`
                <ar-breadcrumb id="my-breadcrumb">
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
    const shownHandler = vi.fn();
    el.addEventListener('ar-breadcrumb-shown', shownHandler);

    const btn = getShadow(el).querySelector('#breadcrumb-dropdown') as HTMLButtonElement;
    btn.click();
    await waitForUpdate(el);

    expect(shownHandler).toHaveBeenCalledOnce();
    const event = shownHandler.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toEqual({ id: 'my-breadcrumb' });
});

it("preventDefault() sur ar-breadcrumb-show bloque l'ouverture", async () => {
    el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
    el.addEventListener('ar-breadcrumb-show', (e) => e.preventDefault());

    const btn = getShadow(el).querySelector('#breadcrumb-dropdown') as HTMLButtonElement;
    btn.click();
    await waitForUpdate(el);

    expect(el.open).toBe(false);
});

it('preventDefault() sur ar-breadcrumb-hide bloque la fermeture', async () => {
    el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
    const btn = getShadow(el).querySelector('#breadcrumb-dropdown') as HTMLButtonElement;
    btn.click();
    await waitForUpdate(el);

    el.addEventListener('ar-breadcrumb-hide', (e) => e.preventDefault());
    btn.click();
    await waitForUpdate(el);

    expect(el.open).toBe(true);
});
```

Vérifier en tête de fichier que `getShadow` (ou l'équivalent utilisé par les tests existants du fichier — confirmer le nom exact importé, ex. `getShadow`/`requireShadow`) est déjà importé ; sinon aligner sur l'import déjà utilisé par les tests voisins du même fichier plutôt que d'introduire un nouveau helper.

- [ ] **Step 7: Lancer les tests, vérifier qu'ils échouent puis passent**

Run: `npm run test -w packages/core -- breadcrumb.test.ts`
Expected avant tout changement de Step 3 déjà appliqué : ces 3 nouveaux tests FAIL (events inexistants). Comme Step 3 a déjà été appliqué à ce stade du plan, relancer directement :
Expected: PASS (tous les tests du fichier, anciens renommés + nouveaux).

- [ ] **Step 8: Mettre à jour le test browser (WTR)**

Le renommage du Step 1 (browser test) a déjà été appliqué au Step 1. Vérifier qu'il n'y a pas d'autre occurrence :

Run: `grep -n "ar-breadcrumb-open\|ar-breadcrumb-close" packages/core/src/components/breadcrumb/breadcrumb.browser.test.ts`
Expected: aucune occurrence.

- [ ] **Step 9: Mettre à jour la doc `ar-breadcrumb.mdx`**

Dans `apps/docs/src/content/components/ar-breadcrumb.mdx`, chercher le bloc sous le titre "Écouter l'ouverture/fermeture du dropdown mobile". La phrase d'intro actuelle est : "En dessous de 768px, `ar-breadcrumb` émet `ar-breadcrumb-open` et `ar-breadcrumb-close` (sans `detail`) à chaque changement d'état du dropdown condensé :". La remplacer par : "En dessous de 768px, `ar-breadcrumb` émet `ar-breadcrumb-show`/`ar-breadcrumb-shown` (annulable puis confirmé) et `ar-breadcrumb-hide`/`ar-breadcrumb-hidden` à chaque changement d'état du dropdown condensé, avec `detail: { id }` :".

Le bloc de code JS qui suit cette phrase est actuellement :

```js
const breadcrumb = document.querySelector('ar-breadcrumb');
breadcrumb.addEventListener('ar-breadcrumb-open', () => console.log('Dropdown ouvert'));
breadcrumb.addEventListener('ar-breadcrumb-close', () => console.log('Dropdown fermé'));
```

Le remplacer par :

```js
const breadcrumb = document.querySelector('ar-breadcrumb');
breadcrumb.addEventListener('ar-breadcrumb-shown', () => console.log('Dropdown ouvert'));
breadcrumb.addEventListener('ar-breadcrumb-hidden', () => console.log('Dropdown fermé'));
```

Ne pas toucher au reste de la page (forme/contenu hors scope, cf. passe doc séparée) — uniquement cette phrase et ce bloc de code.

- [ ] **Step 10: Lancer la suite complète breadcrumb (Vitest) et vérifier les imports**

Run: `npm run test -w packages/core -- breadcrumb.test.ts`
Expected: PASS, tous les tests.

Run: `npx tsc --noEmit -p packages/core`
Expected: aucune erreur.

- [ ] **Step 11: Commit**

```bash
git add packages/core/src/components/breadcrumb/breadcrumb.ts \
        packages/core/src/components/breadcrumb/breadcrumb.test.ts \
        packages/core/src/components/breadcrumb/breadcrumb.browser.test.ts \
        apps/docs/src/content/components/ar-breadcrumb.mdx
git commit -m "fix(breadcrumb)!: aligne les events sur le pattern show/shown/hide/hidden

BREAKING CHANGE: ar-breadcrumb-open et ar-breadcrumb-close sont retirés,
remplacés par ar-breadcrumb-show (annulable) / ar-breadcrumb-shown et
ar-breadcrumb-hide (annulable) / ar-breadcrumb-hidden, avec detail: { id }."
```

---

### Task 3: `ar-tooltip` — ajout de `shown`/`hidden` (sans variante annulable)

**Files:**

- Modify: `packages/core/src/components/tooltip/tooltip.ts`
- Modify: `packages/core/src/components/tooltip/tooltip.test.ts`

**Interfaces:**

- Nouveaux events publics : `ar-tooltip-shown`, `ar-tooltip-hidden`. Pas de `ar-tooltip-show`/`ar-tooltip-hide` annulables — choix documenté (un tooltip n'a pas de raison métier de bloquer son affichage).
- Nouvelles méthodes privées `_show(): void`, `_hide(): void`, `_emit(name: string): void`. Remplacent tous les appels directs à `this._tooltip.show()`/`this._tooltip.hide()` (le `TooltipController`).

- [ ] **Step 1: Écrire le test qui échoue — `ar-tooltip-shown` émis après affichage effectif**

Ajouter dans `packages/core/src/components/tooltip/tooltip.test.ts` :

```typescript
describe('events de cycle de vie', () => {
    beforeEach(async () => {
        document.body.innerHTML = '<button id="btn">x</button>';
        el = await fixture<ArTooltip>(
            '<ar-tooltip id="my-tooltip" for="btn" show-delay="0">Aide</ar-tooltip>',
        );
        mockBubblePopover(el);
    });

    it('émet ar-tooltip-shown avec detail.id après affichage', async () => {
        const shownHandler = vi.fn();
        el.addEventListener('ar-tooltip-shown', shownHandler);

        const trigger = document.getElementById('btn') as HTMLButtonElement;
        trigger.dispatchEvent(new Event('mouseenter'));
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(shownHandler).toHaveBeenCalledOnce();
        const event = shownHandler.mock.calls[0][0] as CustomEvent;
        expect(event.detail).toEqual({ id: 'my-tooltip' });
    });

    it('émet ar-tooltip-hidden après masquage effectif', async () => {
        const trigger = document.getElementById('btn') as HTMLButtonElement;
        trigger.dispatchEvent(new Event('mouseenter'));
        await new Promise((resolve) => setTimeout(resolve, 10));

        const hiddenHandler = vi.fn();
        el.addEventListener('ar-tooltip-hidden', hiddenHandler);
        trigger.dispatchEvent(new Event('mouseleave'));
        await new Promise((resolve) => setTimeout(resolve, el.hideDelay + 10));

        expect(hiddenHandler).toHaveBeenCalledOnce();
    });

    it("n'émet pas ar-tooltip-hidden si le tooltip n'a jamais été affiché", async () => {
        const hiddenHandler = vi.fn();
        el.addEventListener('ar-tooltip-hidden', hiddenHandler);

        const trigger = document.getElementById('btn') as HTMLButtonElement;
        // mouseleave sans mouseenter préalable : ne doit rien émettre.
        trigger.dispatchEvent(new Event('mouseleave'));
        await new Promise((resolve) => setTimeout(resolve, el.hideDelay + 10));

        expect(hiddenHandler).not.toHaveBeenCalled();
    });
});
```

`show-delay="0"` évite d'attendre le délai par défaut (300ms) dans le test.

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent**

Run: `npm run test -w packages/core -- tooltip.test.ts`
Expected: FAIL — `ar-tooltip-shown`/`ar-tooltip-hidden` ne sont jamais émis (aucun code ne les dispatch encore).

- [ ] **Step 3: Ajouter `_show()`/`_hide()`/`_emit()`, remplacer tous les appels directs au controller**

Dans `packages/core/src/components/tooltip/tooltip.ts`, ajouter ces 3 méthodes privées (par exemple juste avant `_scheduleShow()`) :

```typescript
    private _show(): void {
        if (this._tooltip.isOpen) return;
        void this._tooltip.show().then(() => {
            this._emit('ar-tooltip-shown');
        });
    }

    private _hide(): void {
        if (!this._tooltip.isOpen) return;
        this._tooltip.hide();
        this._emit('ar-tooltip-hidden');
    }

    private _emit(name: string): void {
        this.dispatchEvent(
            new CustomEvent(name, {
                bubbles: true,
                composed: true,
                detail: { id: this.id || undefined },
            }),
        );
    }
```

Le garde `if (this._tooltip.isOpen) return;` / `if (!this._tooltip.isOpen) return;` est nécessaire car, contrairement à `ar-dropdown`/`ar-breadcrumb` (dont `_show()`/`_hide()` ne sont appelées qu'en réaction à un vrai changement de propriété `open`), `ar-tooltip` appelle ces méthodes depuis plusieurs handlers réactifs (`mouseleave`, `blur`, changement de `for`, `Escape`, `disabled`) qui peuvent se déclencher sans qu'un affichage effectif ait eu lieu — sans ce garde, `ar-tooltip-hidden` serait émis à tort.

Remplacer chaque appel direct à `this._tooltip.show()`/`this._tooltip.hide()` par `this._show()`/`this._hide()` :

1. Dans `_scheduleShow()` :

```typescript
this._showTimer = window.setTimeout(() => {
    void this._tooltip.show();
}, this.showDelay);
```

devient :

```typescript
this._showTimer = window.setTimeout(() => {
    this._show();
}, this.showDelay);
```

2. Dans `_scheduleHide()` :

```typescript
this._hideTimer = window.setTimeout(() => {
    this._tooltip.hide();
    document.removeEventListener('keydown', this._handleKeyDown);
}, this.hideDelay);
```

devient :

```typescript
this._hideTimer = window.setTimeout(() => {
    this._hide();
    document.removeEventListener('keydown', this._handleKeyDown);
}, this.hideDelay);
```

3. Dans `_detachTrigger()`, la ligne `this._tooltip.hide();` devient `this._hide();`.

4. Dans `updated()`, la branche `if (changed.has('disabled') && this.disabled) { ... this._tooltip.hide(); }` : remplacer `this._tooltip.hide();` par `this._hide();`.

5. Dans `_handleKeyDown` (Escape), la ligne `this._tooltip.hide();` devient `this._hide();`.

- [ ] **Step 4: Mettre à jour le JSDoc `@event`**

Dans `packages/core/src/components/tooltip/tooltip.ts`, ajouter après le dernier `@cssprop` (avant la fermeture `*/` du bloc JSDoc de la classe, ligne ~43) :

```typescript
 * @cssprop [--ar-tooltip-offset=var(--ar-anchor-offset)] - Décalage latéral de la bulle.
 *
 * Pas d'events show/hide annulables : un tooltip n'a pas de raison métier de bloquer
 * son affichage (contrairement à un dialog ou un menu), contrairement à
 * ar-dropdown/ar-dialog/ar-breadcrumb.
 * @event {CustomEvent} ar-tooltip-shown  - Émis après l'affichage effectif de la bulle.
 * @event {CustomEvent} ar-tooltip-hidden - Émis après le masquage effectif de la bulle.
```

- [ ] **Step 5: Lancer les tests, vérifier qu'ils passent**

Run: `npm run test -w packages/core -- tooltip.test.ts`
Expected: PASS, tous les tests (nouveaux + existants — le garde `isOpen` ne doit rien casser sur les tests déjà en place).

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit -p packages/core`
Expected: aucune erreur.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/components/tooltip/tooltip.ts packages/core/src/components/tooltip/tooltip.test.ts
git commit -m "feat(tooltip): ajoute les events ar-tooltip-shown/ar-tooltip-hidden"
```

---

### Task 4: `ar-stepper` — retire `step-changed` et renomme `ar-stepper-step-changed` → `ar-stepper-step-change`

**Files:**

- Modify: `packages/core/src/components/stepper/stepper.ts`
- Modify: `packages/core/src/components/stepper/stepper.test.ts`
- Modify: `apps/docs/src/content/components/ar-stepper.mdx`

**Interfaces:** `ar-stepper-step-change` remplace `ar-stepper-step-changed`, `detail: { path: string }` inchangé. `step-changed` (nom court, non préfixé) n'existe plus.

- [ ] **Step 1: Écrire les tests — renommer le test existant, ajouter un test négatif pour `step-changed`**

Dans `packages/core/src/components/stepper/stepper.test.ts`, remplacer le test `'émet ar-stepper-step-changed au clic sur un lien'` (~ligne 130) :

```typescript
it('émet ar-stepper-step-changed au clic sur un lien', async () => {
    const el = await fixtureWithItems(`
                <ar-stepper current-path="/b" mode="edit">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);

    const handler = vi.fn();
    el.addEventListener('ar-stepper-step-changed', handler);

    const link = shadow(el).querySelector<HTMLAnchorElement>('a.stepper-link');
    if (link) {
        link.click();
        expect(handler).toHaveBeenCalledTimes(1);
        const event = handler.mock.calls[0][0] as CustomEvent;
        expect(event.detail).toHaveProperty('path');
    }

    el.removeEventListener('ar-stepper-step-changed', handler);
});
```

par :

```typescript
it('émet ar-stepper-step-change au clic sur un lien', async () => {
    const el = await fixtureWithItems(`
                <ar-stepper current-path="/b" mode="edit">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);

    const handler = vi.fn();
    el.addEventListener('ar-stepper-step-change', handler);

    const link = shadow(el).querySelector<HTMLAnchorElement>('a.stepper-link');
    if (link) {
        link.click();
        expect(handler).toHaveBeenCalledTimes(1);
        const event = handler.mock.calls[0][0] as CustomEvent;
        expect(event.detail).toHaveProperty('path');
    }

    el.removeEventListener('ar-stepper-step-change', handler);
});
```

Remplacer le second test `'émet aussi step-changed (nom court) au clic'` (~ligne 152) par un test négatif :

```typescript
it("n'émet plus step-changed (nom court) au clic", async () => {
    const el = await fixtureWithItems(`
                <ar-stepper current-path="/b" mode="edit">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);

    const handler = vi.fn();
    el.addEventListener('step-changed', handler);

    const link = shadow(el).querySelector<HTMLAnchorElement>('a.stepper-link');
    if (link) {
        link.click();
        expect(handler).not.toHaveBeenCalled();
    }

    el.removeEventListener('step-changed', handler);
});
```

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent**

Run: `npm run test -w packages/core -- stepper.test.ts`
Expected: FAIL sur les deux tests modifiés (l'event s'appelle encore `ar-stepper-step-changed`, et `step-changed` est encore émis).

- [ ] **Step 3: Modifier `onClickLink` dans `stepper.ts`**

Remplacer (chercher `onClickLink`, ~ligne 450) :

```typescript
    private onClickLink = (event: MouseEvent): void => {
        const path = (event.target as HTMLElement).closest('a')?.dataset['path'];
        if (!path) return;

        const detail: ArStepperStepChangeDetail = { path };

        // Double dispatch : nom court pour usage interne, nom préfixé pour usage externe
        this.dispatchEvent(
            new CustomEvent('step-changed', { bubbles: true, composed: true, detail }),
        );
        this.dispatchEvent(
            new CustomEvent('ar-stepper-step-changed', { bubbles: true, composed: true, detail }),
        );
```

par :

```typescript
    private onClickLink = (event: MouseEvent): void => {
        const path = (event.target as HTMLElement).closest('a')?.dataset['path'];
        if (!path) return;

        const detail: ArStepperStepChangeDetail = { path };

        this.dispatchEvent(
            new CustomEvent('ar-stepper-step-change', { bubbles: true, composed: true, detail }),
        );
```

(le reste de la méthode — calcul de `stepLabel`, `announceA11y` — ne change pas)

- [ ] **Step 4: Mettre à jour le JSDoc `@event`**

Remplacer la ligne 77 :

```typescript
 * @event {CustomEvent<{ path: string }>} ar-stepper-step-changed - Émis au clic sur une étape.
```

par :

```typescript
 * @event {CustomEvent<{ path: string }>} ar-stepper-step-change - Émis au clic sur une étape.
```

- [ ] **Step 5: Lancer les tests, vérifier qu'ils passent**

Run: `npm run test -w packages/core -- stepper.test.ts`
Expected: PASS, tous les tests.

- [ ] **Step 6: Mettre à jour la doc `ar-stepper.mdx`**

Dans `apps/docs/src/content/components/ar-stepper.mdx`, chercher le bloc sous le titre "Écouter le changement d'étape". La phrase d'intro actuelle est : "`ar-stepper` émet `ar-stepper-step-changed` au clic sur une étape, avec l'attribut `path` de l'étape sélectionnée dans `detail` :". La remplacer par : "`ar-stepper` émet `ar-stepper-step-change` au clic sur une étape, avec l'attribut `path` de l'étape sélectionnée dans `detail` :".

Le bloc de code JS qui suit cette phrase est actuellement :

```js
document.querySelector('ar-stepper').addEventListener('ar-stepper-step-changed', (e) => {
    console.log('Étape sélectionnée :', e.detail.path);
});
```

Le remplacer par :

```js
document.querySelector('ar-stepper').addEventListener('ar-stepper-step-change', (e) => {
    console.log('Étape sélectionnée :', e.detail.path);
});
```

- [ ] **Step 7: Typecheck et suite complète du composant**

Run: `npx tsc --noEmit -p packages/core`
Expected: aucune erreur.

Run: `npm run test -w packages/core -- stepper.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/components/stepper/stepper.ts \
        packages/core/src/components/stepper/stepper.test.ts \
        apps/docs/src/content/components/ar-stepper.mdx
git commit -m "fix(stepper)!: retire le dispatch interne step-changed, renomme l'event en ar-stepper-step-change

BREAKING CHANGE: l'event non documenté step-changed (sans préfixe, composed,
fuite hors shadow DOM) est retiré. ar-stepper-step-changed est renommé
ar-stepper-step-change (suffixe -change unifié avec le reste de la librairie)."
```

---

### Task 5: Validation finale et ouverture de la PR

**Files:** aucun fichier modifié.

- [ ] **Step 1: Lancer la suite complète de tests**

Run: `npm run test`
Expected: tous PASS, aucune régression.

- [ ] **Step 2: Lancer le typecheck complet**

Run: `npx tsc --noEmit -p packages/core`
Expected: aucune erreur.

- [ ] **Step 3: Lancer le build complet**

Run: `npm run build -w packages/core`
Expected: exit 0.

- [ ] **Step 4: Sweep grep de vérification — aucune référence résiduelle aux anciens noms d'events**

Run: `grep -rn "ar-breadcrumb-open\|ar-breadcrumb-close\|ar-stepper-step-changed\|'step-changed'" packages/core/src apps/docs/src`
Expected: aucune occurrence (hors éventuel commentaire explicatif dans ce plan lui-même, non inclus dans le grep car hors de ces répertoires).

- [ ] **Step 5: Pousser la branche**

```bash
git push -u origin fix/pr2-events-lifecycle-convention
```

- [ ] **Step 6: Créer la PR vers `dev`**

```bash
gh pr create --base dev --title "fix(core): unifie la convention d'events de cycle de vie (breadcrumb/tooltip/stepper)" --body "$(cat <<'EOF'
## Résumé

Traite le constat transversal #3 de l'audit technique v1.0-beta (`docs/superpowers/specs/2026-07-14-audit-technique-v1-beta.md`) : conventions d'events incohérentes entre composants.

- **`ar-breadcrumb`** (breaking) : `ar-breadcrumb-open`/`-close` remplacés par le pattern `show`(annulable)/`shown`/`hide`(annulable)/`hidden`, aligné sur `ar-dropdown`/`ar-dialog`/`ar-collapse`. `detail: { id }` ajouté.
- **`ar-tooltip`** : ajout de `ar-tooltip-shown`/`ar-tooltip-hidden` (pas de variante annulable — choix documenté, un tooltip n'a pas de raison métier de bloquer son affichage).
- **`ar-stepper`** (breaking) : retrait du dispatch interne non documenté `step-changed` (fuite hors shadow DOM) ; `ar-stepper-step-changed` renommé `ar-stepper-step-change` (suffixe `-change` unifié).
- **`ar-dropdown`** : déjà conforme depuis PR1, aucun changement.

Design : `docs/superpowers/specs/2026-07-14-pr2-events-convention-design.md`. Plan : `docs/superpowers/plans/2026-07-14-pr2-events-convention.md`.

## Test plan

- [x] Tests unitaires ajoutés/renommés par composant (TDD), chacun revu indépendamment (spec + qualité)
- [x] `npm run test` complet vert
- [x] `tsc --noEmit` propre
- [x] `npm run build` complet vert
- [x] Sweep grep : aucune référence résiduelle aux anciens noms d'events dans le code ou la doc
EOF
)"
```

Expected: la commande affiche l'URL de la PR créée.
