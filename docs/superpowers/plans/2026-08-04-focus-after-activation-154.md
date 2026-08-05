# Restaurer le focus après activation (#154) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quand un utilisateur active (clic ou clavier) un `<a>` cliquable d'`ar-pagination` ou
d'`ar-stepper` qui se retrouve remplacé par un élément non focalisable au re-render suivant, le
focus doit atterrir explicitement sur ce nouvel élément plutôt que se perdre sur `<body>`.

**Architecture:** Un utilitaire partagé `focusAfterUpdate(host, selector)` dans
`packages/core/src/a11y/`. `ar-pagination` l'appelle directement après avoir muté son état interne
(cas simple). `ar-stepper` (composant contrôlé, `currentPath` mis à jour par le consommateur) mémorise
le `path` cliqué et ne déclenche le focus que si `currentPath` matche ce `path` au cycle de
rendu suivant. Les deux composants ajoutent `tabindex="-1"` sur l'élément de remplacement et un
style `:focus-visible` cohérent avec leurs éléments interactifs voisins.

**Tech Stack:** Lit 3, TypeScript, Vitest (happy-dom), Web Test Runner (Chromium réel), Prettier.

## Global Constraints

- Prettier : 100 char, 4 spaces, single quotes (CLAUDE.md).
- Spec de référence : `docs/superpowers/specs/2026-08-04-focus-after-activation-154-design.md`
  (fait foi pour toute question non couverte ici).
- `[part='current']`/`.item-header` reçoivent `tabindex="-1"` en permanence (jamais un arrêt `Tab`
  normal), le focus est posé programmatiquement après activation.
- Style de focus en `:focus-visible`, jamais `:focus` (cf. spec — heuristique de modalité
  d'interaction des navigateurs).
- Ne jamais merger sur `dev` sans confirmation explicite de l'utilisateur
  (feedback_merge_after_autonomous_fix).
- `npm run dev --workspace=apps/docs` seul ne reconstruit pas le JS de `packages/core/dist` —
  rebuild explicite (`npm run build:dev --workspace=packages/core`) requis avant toute
  vérification Playwright.

---

## Task 1: Créer la branche de travail

**Files:** aucun.

- [ ] **Step 1: Créer la branche depuis `dev`**

```bash
git checkout dev
git pull origin dev
git checkout -b fix/focus-after-activation-154
```

- [ ] **Step 2: Vérifier l'état propre**

Run: `git status`
Expected: `On branch fix/focus-after-activation-154`, `nothing to commit, working tree clean`.

---

## Task 2: Utilitaire partagé `focusAfterUpdate`

**Files:**

- Create: `packages/core/src/a11y/focus-after-update.ts`
- Test: `packages/core/src/a11y/focus-after-update.test.ts`

**Interfaces:**

- Produces: `focusAfterUpdate(host: ReactiveElement, selector: string): Promise<void>` — attend la
  fin du rendu Lit en cours puis appelle `.focus()` sur le premier élément du shadow DOM matchant
  `selector`. Sans effet si `host.shadowRoot` est absent ou si `selector` ne matche rien. Consommé
  par les Tasks 3 et 4.

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { describe, expect, it } from 'vitest';
import { LitElement, html } from 'lit';
import { focusAfterUpdate } from './focus-after-update.js';

class FocusAfterUpdateFixture extends LitElement {
    static override properties = { showTarget: { type: Boolean } };
    showTarget = false;

    override render() {
        return html`
            <button type="button" id="always">toujours là</button>
            ${this.showTarget
                ? html`<button type="button" id="target" tabindex="-1">cible</button>`
                : ''}
        `;
    }
}
customElements.define('focus-after-update-fixture', FocusAfterUpdateFixture);

describe('focusAfterUpdate', () => {
    it('ne fait rien si aucun élément ne matche le sélecteur', async () => {
        const el = document.createElement('focus-after-update-fixture') as FocusAfterUpdateFixture;
        document.body.appendChild(el);
        await el.updateComplete;

        await expect(focusAfterUpdate(el, '#inexistant')).resolves.toBeUndefined();
        expect(el.shadowRoot?.activeElement).toBeNull();

        el.remove();
    });

    it('focalise le premier élément matchant après la fin du rendu en cours', async () => {
        const el = document.createElement('focus-after-update-fixture') as FocusAfterUpdateFixture;
        document.body.appendChild(el);
        await el.updateComplete;

        el.showTarget = true;
        // Pas de await updateComplete ici — focusAfterUpdate doit gérer l'attente lui-même.
        await focusAfterUpdate(el, '#target');

        expect(el.shadowRoot?.activeElement?.id).toBe('target');

        el.remove();
    });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npm run test --workspace=packages/core -- focus-after-update`
Expected: FAIL — `Cannot find module './focus-after-update.js'` (ou équivalent, le fichier
n'existe pas encore).

- [ ] **Step 3: Implémentation minimale**

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

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `npm run test --workspace=packages/core -- focus-after-update`
Expected: PASS (2/2).

- [ ] **Step 5: Vérifier le format**

Run: `npx prettier --check packages/core/src/a11y/focus-after-update.ts packages/core/src/a11y/focus-after-update.test.ts`
Expected: pas d'erreur.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/a11y/focus-after-update.ts packages/core/src/a11y/focus-after-update.test.ts
git commit -m "feat(a11y): ajoute focusAfterUpdate, restaure le focus après un re-render"
```

---

## Task 3: `ar-pagination` — focus après activation d'un lien de page

**Files:**

- Modify: `packages/core/src/components/pagination/pagination.ts`
- Modify: `packages/core/src/components/pagination/pagination.styles.ts`
- Modify: `packages/core/src/components/pagination/pagination.test.ts`

**Interfaces:**

- Consumes: `focusAfterUpdate` (Task 2), import
  `import { focusAfterUpdate } from '../../a11y/focus-after-update.js';`.

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter dans `pagination.test.ts`, à la fin de la `describe('navigation', ...)` existante (après
le test `'un clic sur un lien de page met à jour current'`) :

```ts
it('un clic sur un lien de page focalise le nouvel élément part="current"', async () => {
    el = await fixture('<ar-pagination current="1" total="5"></ar-pagination>');
    const shadow = el.shadowRoot as ShadowRoot;
    const pageLink = shadow.querySelector('[data-ar-pagination-page="3"]') as HTMLElement;
    pageLink.click();
    await waitForUpdate(el);

    const current = shadow.querySelector('[part~="current"]') as HTMLElement;
    expect(shadow.activeElement).toBe(current);
});

it('le nouvel élément part="current" porte tabindex="-1"', async () => {
    el = await fixture('<ar-pagination current="2" total="5"></ar-pagination>');
    const shadow = el.shadowRoot as ShadowRoot;
    const current = shadow.querySelector('[part~="current"]') as HTMLElement;
    expect(current.getAttribute('tabindex')).toBe('-1');
});

it("un clic sur prev/next ne modifie pas le focus (l'élément cliqué reste focalisable)", async () => {
    el = await fixture('<ar-pagination current="3" total="5"></ar-pagination>');
    const nextBtn = requirePart(el, 'next') as HTMLElement;
    nextBtn.focus();
    nextBtn.click();
    await waitForUpdate(el);

    expect(el.shadowRoot?.activeElement).toBe(nextBtn);
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npm run test --workspace=packages/core -- pagination`
Expected: FAIL sur les 2 premiers nouveaux tests (`shadow.activeElement` est `null`,
`tabindex` est `null`) ; le 3ᵉ test passe déjà (aucun changement de comportement attendu dessus).

- [ ] **Step 3: Ajouter le `tabindex` et l'appel à `focusAfterUpdate`**

Dans `pagination.ts`, ajouter l'import en tête de fichier (après l'import de `announceA11y`) :

```ts
import { focusAfterUpdate } from '../../a11y/focus-after-update.js';
```

Dans `renderPageLink`, remplacer :

```ts
    protected renderPageLink(page: number, active: boolean): TemplateResult {
        if (active) {
            return html` <span part="current" aria-current="true" data-ar-pagination-page="${page}">
                ${this.renderPageLabel(page)}
            </span>`;
        }
```

par :

```ts
    protected renderPageLink(page: number, active: boolean): TemplateResult {
        if (active) {
            return html` <span
                part="current"
                tabindex="-1"
                aria-current="true"
                data-ar-pagination-page="${page}"
            >
                ${this.renderPageLabel(page)}
            </span>`;
        }
```

Dans `_onPageChange`, remplacer :

```ts
    private _onPageChange(event: MouseEvent): void {
        const target = event.target as HTMLElement;
        const page = target.dataset['arPaginationPage'];
        if (target.tagName !== 'A' || !page) return;
        const from = this.current;
        this.current = parseInt(page);
        this._emit({ from, to: this.current });
        this._announcePageChange();
    }
```

par :

```ts
    private _onPageChange(event: MouseEvent): void {
        const target = event.target as HTMLElement;
        const page = target.dataset['arPaginationPage'];
        if (target.tagName !== 'A' || !page) return;
        const from = this.current;
        this.current = parseInt(page);
        this._emit({ from, to: this.current });
        this._announcePageChange();
        void focusAfterUpdate(this, '[part~="current"]');
    }
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npm run test --workspace=packages/core -- pagination`
Expected: PASS (tous, y compris les tests préexistants).

- [ ] **Step 5: CSS — `:focus-visible` sur `[part~='current']`**

Dans `pagination.styles.ts`, remplacer :

```css
[part~='prev'],
[part~='next'],
[part~='link'] {
    text-decoration: none;
    transition:
        background-color var(--ar-pagination-transition-duration),
        color var(--ar-pagination-transition-duration);

    &:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: 2px;
    }
}
```

par :

```css
[part~='prev'],
[part~='next'],
[part~='link'] {
    text-decoration: none;
    transition:
        background-color var(--ar-pagination-transition-duration),
        color var(--ar-pagination-transition-duration);
}

[part~='prev'],
[part~='next'],
[part~='link'],
[part~='current'] {
    &:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: 2px;
    }
}
```

- [ ] **Step 6: Vérifier le format**

Run: `npx prettier --check packages/core/src/components/pagination/pagination.ts packages/core/src/components/pagination/pagination.styles.ts packages/core/src/components/pagination/pagination.test.ts`
Expected: pas d'erreur.

- [ ] **Step 7: Relancer la suite complète du composant**

Run: `npm run test --workspace=packages/core -- pagination`
Expected: PASS (tous).

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/components/pagination/pagination.ts packages/core/src/components/pagination/pagination.styles.ts packages/core/src/components/pagination/pagination.test.ts
git commit -m "fix(pagination): restaure le focus après activation d'un lien de page (#154)"
```

---

## Task 4: `ar-stepper` — focus après activation d'un lien d'étape

**Files:**

- Modify: `packages/core/src/components/stepper/stepper.ts`
- Modify: `packages/core/src/components/stepper/stepper.renderer.ts`
- Modify: `packages/core/src/components/stepper/stepper.styles.ts`
- Modify: `packages/core/src/components/stepper/stepper.test.ts`

**Interfaces:**

- Consumes: `focusAfterUpdate` (Task 2).

- [ ] **Step 1: `data-path` sur le `<div>` de remplacement**

Dans `stepper.renderer.ts`, fonction `renderStep` (autour de la ligne 125-127), remplacer :

```ts
                : html`
                      <div class="item-header">${renderStepText(step.label, order, isCurrent)}</div>
                  `}
```

par :

```ts
                : html`
                      <div class="item-header" data-path=${step.path}>
                          ${renderStepText(step.label, order, isCurrent)}
                      </div>
                  `}
```

Fonction `renderSubStep` (autour de la ligne 86-89), remplacer :

```ts
                : html`
                      <div class="item-header">
                          ${renderStepText(sub.label, order, isCurrent, true)}
                      </div>
                  `}
```

par :

```ts
                : html`
                      <div class="item-header" data-path=${sub.path}>
                          ${renderStepText(sub.label, order, isCurrent, true)}
                      </div>
                  `}
```

- [ ] **Step 2: Écrire les tests qui échouent**

Ajouter dans `stepper.test.ts`, une nouvelle `describe` après `describe('mise à jour de
currentPath', ...)` :

```ts
// ── Focus après activation (#154) ───────────────────────────────────────

describe("focus après activation d'un lien", () => {
    it("porte data-path sur le <div> de remplacement de l'étape courante", async () => {
        const el = await fixtureWithItems(`
                <ar-stepper current-path="/b">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);

        const currentHeader = requireQuery<HTMLDivElement>(
            shadow(el),
            'li.item.current > .item-header',
        );
        expect(currentHeader.tagName.toLowerCase()).toBe('div');
        expect(currentHeader.getAttribute('data-path')).toBe('/b');
    });

    it("focalise le <div> de l'étape cliquée quand le consommateur répond en mettant à jour currentPath", async () => {
        const el = await fixtureWithItems(`
                <ar-stepper current-path="/b">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);

        const linkA = requireQuery<HTMLAnchorElement>(shadow(el), 'a[data-path="/a"]');
        linkA.click();

        // Le composant est contrôlé : le consommateur répond à l'event en réassignant
        // currentPath (pattern déjà utilisé par les tests existants du fichier).
        el.currentPath = '/a';
        await waitForUpdate(el);

        const newCurrentHeader = shadow(el).querySelector<HTMLDivElement>('[data-path="/a"]');
        expect(newCurrentHeader?.tagName.toLowerCase()).toBe('div');
        expect(shadow(el).activeElement).toBe(newCurrentHeader);
        expect(newCurrentHeader?.getAttribute('tabindex')).toBe('-1');
    });

    it('ne vole pas le focus si currentPath change sans rapport avec le dernier clic (ex. scroll-follow)', async () => {
        const el = await fixtureWithItems(`
                <ar-stepper current-path="/a" follow-scroll>
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);

        // Simule un changement de currentPath déclenché par le scroll-follow, sans clic
        // préalable sur aucun lien.
        el.currentPath = '/b';
        await waitForUpdate(el);

        expect(shadow(el).activeElement).not.toBe(shadow(el).querySelector('[data-path="/b"]'));
    });

    it("n'affecte plus le focus au cycle de rendu suivant un clic (fenêtre bornée à un seul cycle)", async () => {
        const el = await fixtureWithItems(`
                <ar-stepper current-path="/c">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                    <ar-stepper-item path="/c" label="Étape C"></ar-stepper-item>
                </ar-stepper>
            `);

        const linkA = requireQuery<HTMLAnchorElement>(shadow(el), 'a[data-path="/a"]');
        linkA.click();

        // Le consommateur ignore l'event (currentPath ne change pas tout de suite) puis,
        // un cycle plus tard, une cause sans rapport (scroll-follow) amène sur /a.
        await waitForUpdate(el);
        el.currentPath = '/a';
        await waitForUpdate(el);

        expect(shadow(el).activeElement).not.toBe(shadow(el).querySelector('[data-path="/a"]'));
    });
});
```

- [ ] **Step 3: Lancer les tests pour vérifier qu'ils échouent**

Run: `npm run test --workspace=packages/core -- stepper`
Expected: FAIL sur le test « focalise le `<div>` de l'étape cliquée » (`tabindex` absent, focus
non posé). Les 3 autres nouveaux tests peuvent déjà passer par absence de comportement (à
confirmer au run — s'ils passent déjà c'est attendu, ce sont des gardes de non-régression).

- [ ] **Step 4: Implémenter le mécanisme dans `stepper.ts`**

Ajouter l'import en tête de fichier (après l'import de `announceA11y`) :

```ts
import { focusAfterUpdate } from '../../a11y/focus-after-update.js';
```

Ajouter un champ privé, à côté des autres champs privés du composant (près de
`_dropdownAttached`, autour de la ligne 162) :

```ts
    private _pendingFocusPath?: string;
```

Modifier `onClickLink` (ligne ~451) pour mémoriser le path cliqué :

```ts
    private onClickLink = (event: MouseEvent): void => {
        const path = (event.target as HTMLElement).closest('a')?.dataset['path'];
        if (!path) return;

        this._pendingFocusPath = path;

        const node = this.navigation.tree
```

(seule la ligne `this._pendingFocusPath = path;` est ajoutée, juste après le `if (!path) return;`
existant — le reste de la fonction est inchangé)

Ajouter la confirmation dans le `updated()` **existant** (ligne ~239, ne pas en créer un second —
Lit n'autoriserait qu'une seule méthode `updated` par classe). Remplacer :

```ts
    override updated(changed: PropertyValues<this>): void {
        if (!this._isDesktop && !this._dropdownAttached) {
            void this.updateComplete.then(() => {
                this._dropdownAttached = this._attachDropdown();
            });
        }
        if (changed.has('open') && !this._isDesktop && this._dropdownAttached) {
            // Différer évite que Popover.requestUpdate() déclenche le warning Lit "change-in-update".
            if (this.open) {
                void this.updateComplete.then(() => {
                    if (this.isConnected) void this._popover.show();
                });
            } else {
                void this.updateComplete.then(() => {
                    if (this.isConnected) this._popover.hide();
                });
            }
        }
    }
```

par :

```ts
    override updated(changed: PropertyValues<this>): void {
        if (!this._isDesktop && !this._dropdownAttached) {
            void this.updateComplete.then(() => {
                this._dropdownAttached = this._attachDropdown();
            });
        }
        if (changed.has('open') && !this._isDesktop && this._dropdownAttached) {
            // Différer évite que Popover.requestUpdate() déclenche le warning Lit "change-in-update".
            if (this.open) {
                void this.updateComplete.then(() => {
                    if (this.isConnected) void this._popover.show();
                });
            } else {
                void this.updateComplete.then(() => {
                    if (this.isConnected) this._popover.hide();
                });
            }
        }
        if (changed.has('currentPath') && this.currentPath === this._pendingFocusPath) {
            void focusAfterUpdate(this, `[data-path="${this._pendingFocusPath}"]`);
        }
        this._pendingFocusPath = undefined;
    }
```

- [ ] **Step 5: Ajouter `tabindex="-1"` sur les deux `<div>` de remplacement**

Dans `stepper.renderer.ts`, reprendre les deux emplacements modifiés au Step 1 et ajouter
`tabindex="-1"` :

`renderStep` :

```ts
                : html`
                      <div class="item-header" data-path=${step.path} tabindex="-1">
                          ${renderStepText(step.label, order, isCurrent)}
                      </div>
                  `}
```

`renderSubStep` :

```ts
                : html`
                      <div class="item-header" data-path=${sub.path} tabindex="-1">
                          ${renderStepText(sub.label, order, isCurrent, true)}
                      </div>
                  `}
```

- [ ] **Step 6: Lancer les tests pour vérifier qu'ils passent**

Run: `npm run test --workspace=packages/core -- stepper`
Expected: PASS (tous, y compris les tests préexistants — en particulier ceux de la
`describe('mise à jour de currentPath', ...)` qui ne doivent pas régresser).

- [ ] **Step 7: CSS — extraire la règle de focus partagée**

Dans `stepper.styles.ts`, remplacer :

```css
[part~='step-link'] {
    &:is(:focus, :hover) {
        &:before {
            background-color: var(--ar-stepper-link-hover-bullet-color);
        }

        .item-label {
            color: var(--ar-stepper-link-hover-label-color);
        }

        [part~='bullet'] {
            color: var(--ar-stepper-link-hover-bullet-text-color);
            background-color: var(--ar-stepper-bullet-hover-bg);
            box-shadow: none;
        }
    }

    &:focus {
        outline-offset: 4px;
        outline-color: var(--ar-stepper-link-focus-outline-color);
    }
}
```

par :

```css
[part~='step-link'] {
    &:is(:focus, :hover) {
        &:before {
            background-color: var(--ar-stepper-link-hover-bullet-color);
        }

        .item-label {
            color: var(--ar-stepper-link-hover-label-color);
        }

        [part~='bullet'] {
            color: var(--ar-stepper-link-hover-bullet-text-color);
            background-color: var(--ar-stepper-bullet-hover-bg);
            box-shadow: none;
        }
    }
}

.item-header:focus-visible {
    outline-offset: 4px;
    outline-color: var(--ar-stepper-link-focus-outline-color);
}
```

- [ ] **Step 8: Vérifier le format**

Run: `npx prettier --check packages/core/src/components/stepper/stepper.ts packages/core/src/components/stepper/stepper.renderer.ts packages/core/src/components/stepper/stepper.styles.ts packages/core/src/components/stepper/stepper.test.ts`
Expected: pas d'erreur.

- [ ] **Step 9: Relancer la suite complète du composant**

Run: `npm run test --workspace=packages/core -- stepper`
Expected: PASS (tous).

- [ ] **Step 10: Commit**

```bash
git add packages/core/src/components/stepper/stepper.ts packages/core/src/components/stepper/stepper.renderer.ts packages/core/src/components/stepper/stepper.styles.ts packages/core/src/components/stepper/stepper.test.ts
git commit -m "fix(stepper): restaure le focus après activation d'un lien d'étape (#154)"
```

---

## Task 5: Tests navigateur (WTR) — continuité du parcours `Tab`

**Files:**

- Modify: `packages/core/src/components/pagination/pagination.browser.test.ts`
- Modify: `packages/core/src/components/stepper/stepper.browser.test.ts`

**Interfaces:** aucune — tests uniquement, exécutés en Chromium réel (Web Test Runner), seul
environnement du repo où `:focus-visible` et l'ordre de tabulation réel sont fiables.

- [ ] **Step 1: Lire la structure existante des deux fichiers**

Run: `head -40 packages/core/src/components/pagination/pagination.browser.test.ts`
Run: `head -40 packages/core/src/components/stepper/stepper.browser.test.ts`

Repérer le pattern de montage de fixture déjà utilisé (`fixture` de `@open-wc/testing` ou
équivalent WTR du projet) pour suivre exactement la même convention d'import/montage dans les
nouveaux tests ci-dessous — adapter la syntaxe de montage si elle diffère de `fixture()` du
helper Vitest (WTR utilise généralement `@open-wc/testing`, pas `test-utils.ts`).

- [ ] **Step 2: Ajouter le test pagination**

Ajouter dans `pagination.browser.test.ts`, dans un nouveau bloc `describe` :

```ts
describe('focus après activation (#154)', () => {
    it("un Tab après activation clavier d'un lien de page continue depuis le nouvel élément courant", async () => {
        const el = await fixture(html`<ar-pagination current="1" total="5"></ar-pagination>`);
        const shadowRoot = el.shadowRoot as ShadowRoot;
        const pageLink = shadowRoot.querySelector('[data-ar-pagination-page="3"]') as HTMLElement;

        pageLink.focus();
        pageLink.click();
        await elementUpdated(el);

        const current = shadowRoot.querySelector('[part~="current"]') as HTMLElement;
        expect(shadowRoot.activeElement).to.equal(current);
        expect(current.matches(':focus-visible')).to.be.true;
    });
});
```

(Adapter `fixture`/`elementUpdated`/`expect` aux imports réellement utilisés par le fichier —
voir Step 1. Le point clé de l'assertion : `shadowRoot.activeElement` pointe sur le nouvel élément
`current`, et `:focus-visible` matche réellement en Chromium après une activation initiée par
`focus()` + `click()` explicites simulant un parcours clavier.)

- [ ] **Step 3: Ajouter le test stepper**

Ajouter dans `stepper.browser.test.ts`, dans un nouveau bloc `describe` :

```ts
describe('focus après activation (#154)', () => {
    it('focalise le nouvel élément courant quand le consommateur répond à ar-stepper-step-change', async () => {
        const el = await fixture(html`
            <ar-stepper current-path="/b">
                <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
            </ar-stepper>
        `);
        await elementUpdated(el);
        await elementUpdated(el);

        el.addEventListener('ar-stepper-step-change', (event: Event) => {
            el.currentPath = (event as CustomEvent<{ path: string }>).detail.path;
        });

        const shadowRoot = el.shadowRoot as ShadowRoot;
        const linkA = shadowRoot.querySelector('a[data-path="/a"]') as HTMLElement;
        linkA.focus();
        linkA.click();
        await elementUpdated(el);

        const newCurrent = shadowRoot.querySelector('[data-path="/a"]') as HTMLElement;
        expect(newCurrent.tagName.toLowerCase()).to.equal('div');
        expect(shadowRoot.activeElement).to.equal(newCurrent);
        expect(newCurrent.matches(':focus-visible')).to.be.true;
    });
});
```

(Même remarque qu'au Step 2 sur l'adaptation des imports/helpers au fichier existant.)

- [ ] **Step 4: Lancer la suite browser des deux composants**

Run (depuis `packages/core`) :
`npx web-test-runner "src/components/{pagination,stepper}/*.{browser,a11y}.test.ts"`
Expected: tous les tests passent, y compris les 2 nouveaux.

- [ ] **Step 5: Vérifier le format**

Run: `npx prettier --check packages/core/src/components/pagination/pagination.browser.test.ts packages/core/src/components/stepper/stepper.browser.test.ts`
Expected: pas d'erreur.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/components/pagination/pagination.browser.test.ts packages/core/src/components/stepper/stepper.browser.test.ts
git commit -m "test: vérifie la continuité du focus clavier après activation (#154)"
```

---

## Task 6: Vérification finale et Pull Request

**Files:** aucun.

- [ ] **Step 1: Suite complète + garde-fous CI**

```bash
npm run test --workspace=packages/core
npm run build:manifest --workspace=packages/core
```

Expected: tout vert. `build:manifest` ne doit signaler aucun garde-fou cassé (aucun nouveau
`@cssprop`/`@csspart` introduit par ce plan — changement purement comportemental + CSS interne).

- [ ] **Step 2: Suite browser complète**

Run (depuis `packages/core`) : `npx web-test-runner`
Expected: tout vert.

- [ ] **Step 3: Vérification visuelle manuelle Playwright**

Rebuild explicite puis démarrage du site de doc :

```bash
npm run build:dev --workspace=packages/core
npm run dev --workspace=apps/docs
```

Sur les démos `ar-pagination` et `ar-stepper` : activer un lien au clavier (Tab jusqu'au lien,
Entrée), vérifier que l'anneau de focus apparaît sur le nouvel élément courant et qu'un `Tab`
suivant continue logiquement dans la page (pas de retour à `<body>`). Reproduire aussi via un
clic **souris** direct : vérifier qu'aucun anneau de focus ne s'affiche dans ce cas (comportement
`:focus-visible` attendu).

- [ ] **Step 4: Revue finale de branche**

Dispatcher une revue de branche complète sur un agent capable (modèle le plus performant
disponible), comparant l'intégralité du diff `dev...fix/focus-after-activation-154` à la spec
`docs/superpowers/specs/2026-08-04-focus-after-activation-154-design.md`. Points d'attention
spécifiques :

- `focusAfterUpdate` : aucune fuite (pas d'appel `.focus()` si le composant a été démonté entre
  temps — `shadowRoot` resterait accessible mais `querySelector` ne trouverait rien, comportement
  sûr par construction).
- `ar-stepper` : la fenêtre bornée à un seul cycle de `_pendingFocusPath` est bien réinitialisée
  dans tous les chemins de `updated()`, y compris quand `currentPath` ne fait pas partie des
  propriétés changées à ce cycle (elle ne doit alors pas non plus être remise à `undefined` avant
  d'avoir eu sa chance de matcher — relire attentivement l'ordre des opérations dans le Step 4 de
  la Task 4).
- Aucune référence résiduelle à `[part~='step-link']:focus` (retiré) sans que
  `.item-header:focus-visible` ne le remplace strictement.
- Cohérence des noms entre les tâches : `focusAfterUpdate`, `_pendingFocusPath`, chemin d'import
  `../../a11y/focus-after-update.js` identiques dans `pagination.ts`/`stepper.ts`.

- [ ] **Step 5: Corriger les findings en une vague unique**

Si des findings « Critical »/« Important » remontent, les corriger en un seul commit groupé, puis
relancer Steps 1-2 pour re-vérifier.

- [ ] **Step 6: Pousser la branche**

```bash
git push -u origin fix/focus-after-activation-154
```

- [ ] **Step 7: Créer la PR vers `dev`**

```bash
gh pr create --base dev --title "fix(pagination,stepper): restaure le focus après activation d'un élément qui devient non focalisable (#154)" --body "$(cat <<'EOF'
## Summary
- `ar-pagination` : un clic/activation clavier sur un numéro de page focalise désormais le nouvel élément `part="current"` (`tabindex="-1"` + `focus()` programmatique) au lieu de perdre le focus sur `<body>`.
- `ar-stepper` : même correctif pour le `<div>` de remplacement d'un lien d'étape (top-level et sous-étape) — plus délicat car `currentPath` est contrôlé par le consommateur ; le focus n'est posé que si `currentPath` matche le `path` cliqué au cycle de rendu immédiatement suivant (ne vole jamais le focus lors d'un changement de `currentPath` sans rapport, ex. scroll-follow).
- Nouvel utilitaire partagé `focusAfterUpdate()` (`packages/core/src/a11y/`), même niveau d'abstraction que `announceA11y()`.
- Indicateur de focus en `:focus-visible` (pas `:focus`) sur les deux composants — n'apparaît qu'après une activation clavier, jamais après un clic souris.

Closes #154

Spec : `docs/superpowers/specs/2026-08-04-focus-after-activation-154-design.md`
Plan : `docs/superpowers/plans/2026-08-04-focus-after-activation-154.md`

## Test plan
- [x] `npm run test --workspace=packages/core` (suite complète)
- [x] Suite browser (WTR) complète
- [x] `npm run build:manifest --workspace=packages/core` (garde-fous CI verts)
- [x] Vérification visuelle Playwright (clavier + souris, pagination + stepper top-level/sous-étape)
- [x] Revue finale de branche

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 8: Confirmer avec l'utilisateur avant tout merge**

Ne pas merger sur `dev` sans confirmation explicite (feedback_merge_after_autonomous_fix).

---

## Self-Review (déjà appliqué en rédigeant ce plan)

1. **Couverture de la spec** : Décision retenue (tabindex/`:focus-visible`) → Tasks 3/4 Steps 1/5,
   7 ; Mécanisme partagé → Task 2 ; `ar-pagination` → Task 3 ; `ar-stepper` (intention en attente,
   fenêtre bornée, `data-path`) → Task 4 ; CSS → Tasks 3/4 (CSS) ; Tests unitaires → Tasks 3/4 ;
   Tests browser → Task 5 ; Vérification → Task 6. Hors scope (breadcrumb, desktop stepper)
   correctement non traité.
2. **Scan placeholders** : aucun « TBD »/« gérer les cas limites » — chaque step contient le code
   exact à écrire ou la commande exacte à lancer.
3. **Cohérence des types/noms** : `focusAfterUpdate(host: ReactiveElement, selector: string):
Promise<void>` défini en Task 2, réutilisé à l'identique (même signature, même chemin
   d'import) en Tasks 3 et 4. `_pendingFocusPath` introduit et consommé dans la même Task 4, pas
   de dérive de nom entre Steps.
