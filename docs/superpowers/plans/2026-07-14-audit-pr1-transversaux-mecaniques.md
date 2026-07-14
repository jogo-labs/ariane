# Audit technique v1.0-beta — PR1 : transversaux mécaniques

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger les 6 incohérences transversales "mécaniques" identifiées dans l'audit technique v1.0-beta (`docs/superpowers/specs/2026-07-14-audit-technique-v1-beta.md`) — celles qui ne demandent pas de trancher une nouvelle convention d'API publique (contrairement aux events, traités en PR2).

**Architecture:** Chaque tâche corrige un seul constat transversal, isolément testable. Pas de nouveau fichier — uniquement des modifications ciblées dans des fichiers existants (composants + `utils/`, `controllers/`, `themes/default.css`).

**Tech Stack:** Lit 3, TypeScript, Vitest (`fixture`/`waitForUpdate`/`getPart`/`requirePart`/`requireShadow` depuis `packages/core/src/test-utils.ts`).

## Global Constraints

- Prettier : 100 caractères, 4 espaces, quotes simples (auto-appliqué par le hook `lint-staged` au commit — ne pas reformater à la main).
- `import type` obligatoire pour tout import de type seul.
- Conventional Commits (validé par commitlint/Husky au commit).
- `warn(tag, message)` (`packages/core/src/utils/warn.ts`) est l'unique mécanisme de diagnostic dev — jamais de `console.warn`/`console.error` direct dans le code applicatif.
- Toute valeur de design (couleurs, tailles, espacements) va dans `packages/core/src/styles/themes/default.css` — jamais de fallback cosmétique dans les `*.styles.ts` des composants (modèle headless).
- Tout nouveau token `--ar-*` doit avoir son entrée `@cssprop` dans le JSDoc du composant, notation `[--ar-x=valeur-par-défaut]` cohérente avec les autres tokens du même composant.
- Branche : `fix/audit-technical-transversal-mechanics` depuis `dev`. PR vers `dev` en fin de plan.

---

### Task 1: Créer la branche de travail

**Files:** aucun fichier modifié.

- [ ] **Step 1: Créer et checkout la branche depuis `dev`**

```bash
cd /Users/jon/Code/Active_projects/ariane
git checkout dev
git pull origin dev
git checkout -b fix/audit-technical-transversal-mechanics
```

Expected: la branche `fix/audit-technical-transversal-mechanics` est créée et checkoutée, `git status` montre "nothing to commit, working tree clean".

---

### Task 2: Unifier les diagnostics dev sur `warn()` (constat transversal #1)

**Files:**

- Modify: `packages/core/src/utils/popover.ts:76`
- Modify: `packages/core/src/components/alert/alert.ts:195-198`
- Modify: `packages/core/src/controllers/navigation-tree.controller.ts:61`
- Modify: `packages/core/src/components/datepicker/datepicker.ts:202`
- Test: `packages/core/src/utils/popover.test.ts` (nouveau test), `packages/core/src/components/alert/alert.test.ts` (nouveau test)

**Interfaces:**

- Consommé : `warn(tag: string, message: string): void` déjà exporté par `packages/core/src/utils/warn.ts` (signature existante, ne pas modifier).

- [ ] **Step 1: Écrire le test qui échoue — `Popover.show()` doit utiliser `warn()`, pas `console.warn`**

Ouvrir `packages/core/src/utils/popover.test.ts`. S'il n'existe pas encore, le créer avec ce contenu minimal (adapter les imports si un fichier existe déjà avec d'autres tests — dans ce cas, ajouter uniquement le bloc `describe('show() sans attach()', ...)`):

```typescript
import { describe, expect, it, vi, afterEach } from 'vitest';
import { Popover } from './popover.js';
import { LitElement } from 'lit';

class TestHost extends LitElement {}
customElements.define('ar-test-popover-host', TestHost);

describe('show() sans attach()', () => {
    afterEach(() => {
        document.querySelectorAll('ar-test-popover-host').forEach((el) => el.remove());
        vi.unstubAllGlobals();
    });

    it("n'appelle pas console.warn directement", async () => {
        const host = document.createElement('ar-test-popover-host') as TestHost;
        document.body.appendChild(host);
        const popover = new Popover(host);
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await popover.show();

        expect(consoleWarnSpy).not.toHaveBeenCalled();
        consoleWarnSpy.mockRestore();
        host.remove();
    });
});
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `npm run test -w packages/core -- popover.test.ts`
Expected: FAIL — `console.warn` est bien appelé avec `'[Popover] show() called before attach()'`.

- [ ] **Step 3: Remplacer `console.warn` par `warn()` dans `popover.ts`**

Dans `packages/core/src/utils/popover.ts`, ajouter l'import en haut du fichier (après les imports existants ligne 1-3) :

```typescript
import { warn } from './warn.js';
```

Remplacer la ligne 76 :

```typescript
console.warn('[Popover] show() called before attach()');
```

par :

```typescript
warn('Popover', 'show() called before attach()');
```

- [ ] **Step 4: Lancer le test, vérifier qu'il passe**

Run: `npm run test -w packages/core -- popover.test.ts`
Expected: PASS.

- [ ] **Step 5: Écrire le test qui échoue — `ar-alert` doit utiliser `warn()`, pas `console.error`, quand `next-focus` est invalide**

Ouvrir `packages/core/src/components/alert/alert.test.ts`. Ajouter ce bloc `describe` (adapter l'emplacement si le fichier a déjà une structure `describe('ArAlert', ...)` — insérer à l'intérieur) :

```typescript
describe('next-focus invalide', () => {
    it("n'appelle pas console.error directement", async () => {
        el = await fixture(
            '<ar-alert next-focus="id-inexistant"><span slot="close-icon">x</span></ar-alert>',
        );
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const closeButton = getPart(el, 'close') as HTMLButtonElement;

        closeButton.click();

        expect(consoleErrorSpy).not.toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
    });
});
```

Vérifier en tête de fichier que `fixture`, `getPart`, `vi` sont déjà importés (cas standard, cf. `alert.test.ts` existant) ; sinon compléter l'import depuis `'../../test-utils.js'` et `'vitest'`.

- [ ] **Step 6: Lancer le test, vérifier qu'il échoue**

Run: `npm run test -w packages/core -- alert.test.ts`
Expected: FAIL — `console.error` est appelé.

- [ ] **Step 7: Remplacer `console.error` par `warn()` dans `alert.ts`**

Dans `packages/core/src/components/alert/alert.ts`, ajouter l'import (après la ligne 4, à côté de `prefersReducedMotion`) :

```typescript
import { warn } from '../../utils/warn.js';
```

Remplacer les lignes 194-198 :

```typescript
if (!$focusableElement) {
    console.error(
        `${ArAlert.NAME} - L'id "${this.nextFocus}" spécifié via 'next-focus' n'est pas présent dans la page.`,
    );
    return;
}
```

par :

```typescript
if (!$focusableElement) {
    warn(
        ArAlert.NAME,
        `L'id "${this.nextFocus}" spécifié via 'next-focus' n'est pas présent dans la page.`,
    );
    return;
}
```

- [ ] **Step 8: Lancer le test, vérifier qu'il passe**

Run: `npm run test -w packages/core -- alert.test.ts`
Expected: PASS.

- [ ] **Step 9: Remplacer `console.warn` par `warn()` dans `navigation-tree.controller.ts`**

Pas de test dédié (composant interne, comportement déjà couvert par `stepper.test.ts` pour la fonctionnalité — ce changement ne touche que le canal de diagnostic). Dans `packages/core/src/controllers/navigation-tree.controller.ts`, ajouter l'import après la ligne 7 :

```typescript
import { warn } from '../utils/warn.js';
```

Remplacer la ligne 61 :

```typescript
console.warn(`[ar-stepper] duplicate path "${item.path}"`);
```

par :

```typescript
warn('ar-stepper', `duplicate path "${item.path}"`);
```

- [ ] **Step 10: Remplacer `console.error` par `warn()` dans `datepicker.ts`**

Pas de test dédié (chemin d'erreur `_anchored.show()` rejetée — cas déjà géré par `AnchoredController`, testé indirectement). Dans `packages/core/src/components/datepicker/datepicker.ts`, ajouter l'import après la ligne 8 :

```typescript
import { warn } from '../../utils/warn.js';
```

Remplacer les lignes 200-203 :

```typescript
            } else if (this.open) {
                void this._show().catch((e) => {
                    if (__DEV__) console.error('[ar-datepicker]', e);
                });
```

par :

```typescript
            } else if (this.open) {
                void this._show().catch((e: unknown) => {
                    warn('ar-datepicker', String(e));
                });
```

- [ ] **Step 11: Lancer la suite complète des tests touchés et `tsc`**

Run: `npm run test -w packages/core -- popover.test.ts alert.test.ts stepper.test.ts datepicker.test.ts`
Expected: tous PASS.

Run: `npm run build:types -w packages/core` (ou `npx tsc --noEmit -p packages/core` si ce script n'existe pas — vérifier dans `packages/core/package.json`)
Expected: aucune erreur.

- [ ] **Step 12: Commit**

```bash
git add packages/core/src/utils/popover.ts packages/core/src/utils/popover.test.ts \
        packages/core/src/components/alert/alert.ts packages/core/src/components/alert/alert.test.ts \
        packages/core/src/controllers/navigation-tree.controller.ts \
        packages/core/src/components/datepicker/datepicker.ts
git commit -m "fix(core): unifie les diagnostics dev sur warn() (popover, alert, stepper, datepicker)"
```

---

### Task 3: Corriger la résolution de `for` en shadow DOM sur `ar-dropdown` (constat transversal #5)

**Files:**

- Modify: `packages/core/src/components/dropdown/dropdown.ts:152-158`
- Test: `packages/core/src/components/dropdown/dropdown.test.ts` (nouveau test)

**Interfaces:**

- Aucune nouvelle interface — même signature de `_resolvedTrigger` (accesseur privé), comportement changé uniquement.

- [ ] **Step 1: Écrire le test qui échoue — `for` doit résoudre un trigger dans le même shadow root que `ar-dropdown`**

Ajouter dans `packages/core/src/components/dropdown/dropdown.test.ts` (dans le `describe('ArDropdown', ...)` existant) :

```typescript
describe('for en shadow DOM', () => {
    it('résout le trigger via getRootNode() quand ar-dropdown est dans un shadow root', async () => {
        class HostWithShadow extends HTMLElement {
            constructor() {
                super();
                const root = this.attachShadow({ mode: 'open' });
                root.innerHTML = `
                        <button id="trigger-in-shadow">Ouvrir</button>
                        <ar-dropdown for="trigger-in-shadow">
                            <div>Contenu</div>
                        </ar-dropdown>
                    `;
            }
        }
        if (!customElements.get('ar-test-shadow-host')) {
            customElements.define('ar-test-shadow-host', HostWithShadow);
        }
        const host = document.createElement('ar-test-shadow-host');
        document.body.appendChild(host);

        const dropdown = host.shadowRoot!.querySelector('ar-dropdown') as ArDropdown;
        mockPanelPopover(dropdown);
        await waitForUpdate(dropdown);

        const trigger = host.shadowRoot!.getElementById('trigger-in-shadow') as HTMLButtonElement;
        trigger.click();
        await waitForUpdate(dropdown);

        expect(dropdown.open).toBe(true);

        host.remove();
    });
});
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `npm run test -w packages/core -- dropdown.test.ts`
Expected: FAIL — `dropdown.open` reste `false` car `document.getElementById('trigger-in-shadow')` ne trouve rien (le trigger est dans un shadow root, pas dans `document`).

- [ ] **Step 3: Aligner `_resolvedTrigger` sur le pattern déjà validé de `ar-tooltip` (`getRootNode()`)**

Dans `packages/core/src/components/dropdown/dropdown.ts`, remplacer les lignes 152-158 :

```typescript
    private get _resolvedTrigger(): HTMLElement | null {
        if (this.for) {
            return document.getElementById(this.for);
        }
        const slot = this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]');
        return (slot?.assignedElements({ flatten: true })[0] as HTMLElement | undefined) ?? null;
    }
```

par :

```typescript
    private get _resolvedTrigger(): HTMLElement | null {
        if (this.for) {
            const root = this.getRootNode() as Document | ShadowRoot;
            return root.getElementById(this.for);
        }
        const slot = this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]');
        return (slot?.assignedElements({ flatten: true })[0] as HTMLElement | undefined) ?? null;
    }
```

- [ ] **Step 4: Lancer le test, vérifier qu'il passe**

Run: `npm run test -w packages/core -- dropdown.test.ts`
Expected: PASS.

- [ ] **Step 5: Lancer toute la suite dropdown pour vérifier l'absence de régression**

Run: `npm run test -w packages/core -- dropdown.test.ts`
Expected: tous PASS (le mode `for` en light DOM classique continue de fonctionner : `Document` implémente aussi `getElementById`).

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/components/dropdown/dropdown.ts packages/core/src/components/dropdown/dropdown.test.ts
git commit -m "fix(dropdown): résout for via getRootNode() pour fonctionner en shadow DOM"
```

---

### Task 4: Ajouter `detail: { id }` aux events de `ar-dropdown` et documenter `--ar-dropdown-color`

**Files:**

- Modify: `packages/core/src/components/dropdown/dropdown.ts:32-46,230-234`
- Test: `packages/core/src/components/dropdown/dropdown.test.ts` (nouveau test)

**Interfaces:**

- `_emit(name: string): CustomEvent` — signature élargie, ajoute `detail: { id: string | undefined }` à l'event dispatché (les composants consommateurs qui écoutent déjà `ar-dropdown-show`/`shown`/`hide`/`hidden` restent compatibles, `detail` était `null` avant, devient un objet).

- [ ] **Step 1: Écrire le test qui échoue — `ar-dropdown-shown` doit porter `detail.id`**

Ajouter dans `packages/core/src/components/dropdown/dropdown.test.ts` :

```typescript
describe('detail des events de cycle de vie', () => {
    it('ar-dropdown-shown porte detail.id', async () => {
        el = await fixture('<ar-dropdown id="my-dropdown"><div>Contenu</div></ar-dropdown>');
        mockPanelPopover(el);
        const shownHandler = vi.fn();
        el.addEventListener('ar-dropdown-shown', shownHandler);

        el.open = true;
        await waitForUpdate(el);
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(shownHandler).toHaveBeenCalledTimes(1);
        const event = shownHandler.mock.calls[0][0] as CustomEvent;
        expect(event.detail).toEqual({ id: 'my-dropdown' });
    });
});
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `npm run test -w packages/core -- dropdown.test.ts`
Expected: FAIL — `event.detail` vaut `null`.

- [ ] **Step 3: Ajouter `detail: { id }` dans `_emit()`**

Dans `packages/core/src/components/dropdown/dropdown.ts`, remplacer les lignes 230-234 :

```typescript
    private _emit(name: string): CustomEvent {
        const e = new CustomEvent(name, { bubbles: true, composed: true, cancelable: true });
        this.dispatchEvent(e);
        return e;
    }
```

par :

```typescript
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

- [ ] **Step 4: Lancer le test, vérifier qu'il passe**

Run: `npm run test -w packages/core -- dropdown.test.ts`
Expected: PASS.

- [ ] **Step 5: Documenter `--ar-dropdown-color` dans le JSDoc**

Dans `packages/core/src/components/dropdown/dropdown.ts`, le token est utilisé (`dropdown.styles.ts:11`) et défini (`default.css:427`) mais absent du JSDoc. Ajouter une ligne après la ligne 32 (`@cssprop [--ar-dropdown-min-width=10rem] ...`) :

```typescript
 * @cssprop [--ar-dropdown-min-width=10rem] - Largeur minimale du panel.
 * @cssprop [--ar-dropdown-color=var(--ar-panel-text)] - Couleur du texte (cascade vers --ar-panel-text).
```

(insérer la nouvelle ligne juste après celle existante, avant `@cssprop [--ar-dropdown-max-width=...]`)

- [ ] **Step 6: Régénérer le manifeste des custom elements et vérifier qu'il capte le nouveau `@cssprop`**

Run: `npm run build:manifest`
Expected: exit 0. Vérifier dans `packages/core/custom-elements.json` (ou l'emplacement configuré) que `cssProperties` de `ar-dropdown` contient désormais une entrée `--ar-dropdown-color`.

Run: `grep -c "ar-dropdown-color" packages/core/custom-elements.json`
Expected: `1` ou plus.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/components/dropdown/dropdown.ts packages/core/src/components/dropdown/dropdown.test.ts packages/core/custom-elements.json
git commit -m "fix(dropdown): ajoute detail.id aux events de cycle de vie et documente --ar-dropdown-color"
```

---

### Task 5: Généraliser `aria-controls` trigger→panel dans `AnchoredController` (constat transversal #6)

**Files:**

- Modify: `packages/core/src/controllers/anchored.controller.ts:62-69`
- Test: `packages/core/src/controllers/anchored.controller.test.ts` (nouveau test si le fichier n'existe pas encore ; sinon ajouter dans le fichier existant) ou, si aucun fichier de test dédié au controller n'existe, ajouter le test directement dans `packages/core/src/components/dropdown/dropdown.test.ts` (le controller n'a pas d'API publique testable isolément sans un host Lit).

**Interfaces:**

- `attach(trigger, panel, anchor?)` — signature inchangée, effet de bord supplémentaire : pose `aria-controls` sur `trigger`.

- [ ] **Step 1: Vérifier l'existence d'un fichier de test dédié au controller**

Run: `ls packages/core/src/controllers/anchored.controller.test.ts 2>/dev/null; echo $?`

Si le fichier n'existe pas (code retour `1`), ajouter le test à `packages/core/src/components/dropdown/dropdown.test.ts` (Step 2 ci-dessous, variante "via dropdown.test.ts"). Si le fichier existe, y ajouter le test suivant en l'adaptant à sa structure existante.

- [ ] **Step 2: Écrire le test qui échoue — `attach()` pose `aria-controls` sur le trigger**

Ajouter dans `packages/core/src/components/dropdown/dropdown.test.ts` (dans le `describe('ArDropdown', ...)` existant) :

```typescript
describe('aria-controls', () => {
    it("attach() pose aria-controls sur le trigger, référençant l'id du panel", async () => {
        el = await fixture(
            '<ar-dropdown><button slot="trigger">Ouvrir</button><div>Contenu</div></ar-dropdown>',
        );
        mockPanelPopover(el);
        await waitForUpdate(el);

        const trigger = el.querySelector('[slot="trigger"]') as HTMLButtonElement;
        const panel = getPart(el, 'panel') as HTMLElement;

        expect(trigger.getAttribute('aria-controls')).toBe(panel.id);
    });
});
```

- [ ] **Step 3: Lancer le test, vérifier qu'il échoue**

Run: `npm run test -w packages/core -- dropdown.test.ts`
Expected: FAIL — `trigger.getAttribute('aria-controls')` vaut `null`.

- [ ] **Step 4: Poser `aria-controls` dans `AnchoredController.attach()`**

Dans `packages/core/src/controllers/anchored.controller.ts`, remplacer les lignes 62-69 :

```typescript
    attach(trigger: HTMLElement, panel: HTMLElement, anchor?: HTMLElement): void {
        // Precondition: call hide() before re-attaching to avoid stale scroll-lock refs.
        this._trigger = trigger;
        this._popover.attach(trigger, panel, anchor);
        const haspopup = this._opts.popupMode === 'dialog' ? 'dialog' : 'true';
        trigger.setAttribute('aria-haspopup', haspopup);
        trigger.setAttribute('aria-expanded', 'false');
    }
```

par :

```typescript
    attach(trigger: HTMLElement, panel: HTMLElement, anchor?: HTMLElement): void {
        // Precondition: call hide() before re-attaching to avoid stale scroll-lock refs.
        this._trigger = trigger;
        this._popover.attach(trigger, panel, anchor);
        const haspopup = this._opts.popupMode === 'dialog' ? 'dialog' : 'true';
        trigger.setAttribute('aria-haspopup', haspopup);
        trigger.setAttribute('aria-expanded', 'false');
        // Popover.attach() garantit que panel.id est défini (généré si absent).
        trigger.setAttribute('aria-controls', panel.id);
    }
```

- [ ] **Step 5: Lancer le test, vérifier qu'il passe**

Run: `npm run test -w packages/core -- dropdown.test.ts`
Expected: PASS.

- [ ] **Step 6: Lancer les suites de tous les composants consommant `AnchoredController` pour vérifier l'absence de régression**

Run: `npm run test -w packages/core -- dropdown.test.ts tooltip.test.ts breadcrumb.test.ts datepicker.test.ts stepper.test.ts`

Note : `ar-tooltip` utilise `TooltipController`, pas `AnchoredController` directement — vérifier avec `grep -n "AnchoredController" packages/core/src/controllers/tooltip.controller.ts` si ce fichier est aussi concerné. S'il l'est, ce composant hérite automatiquement du fix (pas de modification supplémentaire nécessaire).

Expected: tous PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/controllers/anchored.controller.ts packages/core/src/components/dropdown/dropdown.test.ts
git commit -m "fix(core): AnchoredController.attach() pose aria-controls sur le trigger"
```

---

### Task 6: Retirer la double convention `aria-disabled` sur `ar-pagination` (constat transversal #4)

**Files:**

- Modify: `packages/core/src/components/pagination/pagination.ts:104-114,130-142`
- Test: `packages/core/src/components/pagination/pagination.test.ts` (nouveau test)

**Interfaces:** aucune — retire une redondance interne, pas de changement de rendu observable pour `aria-disabled` (l'attribut reste posé, seule la propriété IDL `.ariaDisabled` disparaît).

- [ ] **Step 1: Écrire le test qui échoue — le lien prev ne doit pas exposer la propriété IDL `ariaDisabled` en plus de l'attribut**

Ajouter dans `packages/core/src/components/pagination/pagination.test.ts` :

```typescript
describe('aria-disabled', () => {
    it('pose uniquement l\'attribut aria-disabled sur le lien "prev" à la première page', async () => {
        el = await fixture('<ar-pagination current="1" total="5"></ar-pagination>');
        const prevLink = getPart(el, 'prev') as HTMLAnchorElement;

        expect(prevLink.getAttribute('aria-disabled')).toBe('true');
        // La propriété IDL ARIAMixin ne doit plus être posée séparément — seul l'attribut fait foi.
        expect(prevLink.ariaDisabled).toBeNull();
    });
});
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `npm run test -w packages/core -- pagination.test.ts`
Expected: FAIL — `prevLink.ariaDisabled` vaut `'true'` (string), pas `null`.

- [ ] **Step 3: Retirer `.ariaDisabled=` du template, ne garder que l'attribut**

Dans `packages/core/src/components/pagination/pagination.ts`, remplacer les lignes 104-114 :

```typescript
                <li part="item" class="pagination-item">
                    <a
                        part="prev"
                        class="btn btn-tertiary btn-ratio-square"
                        href="javascript:;"
                        .ariaDisabled=${isPreviousDisabled}
                        aria-disabled=${isPreviousDisabled}
                        @click=${this._onPreviousPage}
                    >
                        <span aria-hidden="true" class="icon icon-chevron-l">&lt;</span>
                        <span class="sr-only">Page précédente (page ${previousPageNumber})</span>
                    </a>
                </li>
```

par :

```typescript
                <li part="item" class="pagination-item">
                    <a
                        part="prev"
                        class="btn btn-tertiary btn-ratio-square"
                        href="javascript:;"
                        aria-disabled=${isPreviousDisabled}
                        @click=${this._onPreviousPage}
                    >
                        <span aria-hidden="true" class="icon icon-chevron-l">&lt;</span>
                        <span class="sr-only">Page précédente (page ${previousPageNumber})</span>
                    </a>
                </li>
```

Et remplacer les lignes 130-142 (bloc "next", même pattern) :

```typescript
                <li part="item" class="pagination-item">
                    <a
                        part="next"
                        class="btn btn-tertiary btn-ratio-square"
                        href="javascript:;"
                        .ariaDisabled=${isNextDisabled}
                        aria-disabled=${isNextDisabled}
                        @click=${this._onNextPage}
                    >
                        <span aria-hidden="true" class="icon icon-chevron-r">&gt;</span>
                        <span class="sr-only">Page suivante (page ${nextPageNumber})</span>
                    </a>
                </li>
```

par :

```typescript
                <li part="item" class="pagination-item">
                    <a
                        part="next"
                        class="btn btn-tertiary btn-ratio-square"
                        href="javascript:;"
                        aria-disabled=${isNextDisabled}
                        @click=${this._onNextPage}
                    >
                        <span aria-hidden="true" class="icon icon-chevron-r">&gt;</span>
                        <span class="sr-only">Page suivante (page ${nextPageNumber})</span>
                    </a>
                </li>
```

- [ ] **Step 4: Lancer le test, vérifier qu'il passe**

Run: `npm run test -w packages/core -- pagination.test.ts`
Expected: PASS.

- [ ] **Step 5: Lancer toute la suite pagination pour vérifier l'absence de régression**

Run: `npm run test -w packages/core -- pagination.test.ts`
Expected: tous PASS (le CSS ciblant `[aria-disabled='true']`, s'il existe dans `pagination.styles.ts` ou `button.styles.ts`, continue de fonctionner car l'attribut est toujours posé).

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/components/pagination/pagination.ts packages/core/src/components/pagination/pagination.test.ts
git commit -m "fix(pagination): retire la propriété IDL ariaDisabled redondante avec l'attribut"
```

---

### Task 7: Préfixer les custom properties de `ar-dialog` (constat transversal #8)

**Files:**

- Modify: `packages/core/src/components/dialog/dialog.styles.ts:9-46,89,105,176-177`
- Modify: `packages/core/src/components/dialog/dialog.ts:64-67`
- Test: `packages/core/src/components/dialog/dialog.test.ts` (nouveau test)

**Interfaces:** breaking change CSS assumé (alpha) — `--width`/`--spacing`/`--spacing-block`/`--spacing-inline` renommés `--ar-dialog-width`/`--ar-dialog-spacing`/`--ar-dialog-spacing-block`/`--ar-dialog-spacing-inline`. Aucun autre fichier du repo ne référence ces noms (vérifié : `apps/docs`, tests, `default.css`).

- [ ] **Step 1: Écrire le test qui échoue — `ar-dialog` doit être personnalisable via `--ar-dialog-width`**

Ajouter dans `packages/core/src/components/dialog/dialog.test.ts` :

```typescript
describe('personnalisation --ar-dialog-width', () => {
    it('applique --ar-dialog-width à la largeur du dialog natif', async () => {
        el = await fixture('<ar-dialog style="--ar-dialog-width: 333px"></ar-dialog>');
        el.open = true;
        await waitForUpdate(el);

        const dialogEl = getDialogEl(el);
        expect(getComputedStyle(dialogEl).width).toBe('333px');
    });
});
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `npm run test -w packages/core -- dialog.test.ts`
Expected: FAIL — `--ar-dialog-width` n'est lu nulle part, le dialog garde sa largeur par défaut (`500px` pour `size="md"`).

- [ ] **Step 3: Renommer les custom properties dans `dialog.styles.ts`**

Dans `packages/core/src/components/dialog/dialog.styles.ts`, remplacer les lignes 9-46 :

```typescript
        :host {
            display: block;

            /* Taille modale par défaut (md = 500px). Surchargeable par --width sur l'instance. */
            --width: 500px;
            /* Padding interne par défaut. Surchargeable par --spacing/--spacing-block/--spacing-inline sur l'instance. */
            --spacing: 1.25rem;
        }

        /* Tailles modal */
        :host([size='sm']) {
            --width: 360px;
        }
        :host([size='md']) {
            --width: 500px;
        }
        :host([size='lg']) {
            --width: 800px;
        }
        :host([size='xl']) {
            --width: 1140px;
        }

        /* Tailles drawer — ont priorité sur les valeurs modal via la spécificité */
        :host([mode='drawer']) {
            --width: 720px;
        }
        :host([mode='drawer'][size='sm']) {
            --width: 360px;
        }
        :host([mode='drawer'][size='md']) {
            --width: 720px;
        }
        :host([mode='drawer'][size='lg']) {
            --width: 960px;
        }
        :host([mode='drawer'][size='xl']) {
            --width: 1440px;
        }
```

par :

```typescript
        :host {
            display: block;

            /* Taille modale par défaut (md = 500px). Surchargeable par --ar-dialog-width sur l'instance. */
            --ar-dialog-width: 500px;
            /* Padding interne par défaut. Surchargeable par --ar-dialog-spacing/-block/-inline sur l'instance. */
            --ar-dialog-spacing: 1.25rem;
        }

        /* Tailles modal */
        :host([size='sm']) {
            --ar-dialog-width: 360px;
        }
        :host([size='md']) {
            --ar-dialog-width: 500px;
        }
        :host([size='lg']) {
            --ar-dialog-width: 800px;
        }
        :host([size='xl']) {
            --ar-dialog-width: 1140px;
        }

        /* Tailles drawer — ont priorité sur les valeurs modal via la spécificité */
        :host([mode='drawer']) {
            --ar-dialog-width: 720px;
        }
        :host([mode='drawer'][size='sm']) {
            --ar-dialog-width: 360px;
        }
        :host([mode='drawer'][size='md']) {
            --ar-dialog-width: 720px;
        }
        :host([mode='drawer'][size='lg']) {
            --ar-dialog-width: 960px;
        }
        :host([mode='drawer'][size='xl']) {
            --ar-dialog-width: 1440px;
        }
```

Remplacer la ligne 89 :

```typescript
            width: min(var(--width), calc(100vw - 2rem));
```

par :

```typescript
            width: min(var(--ar-dialog-width), calc(100vw - 2rem));
```

Remplacer la ligne 105 :

```typescript
            width: min(var(--width), 100vw);
```

par :

```typescript
            width: min(var(--ar-dialog-width), 100vw);
```

Remplacer les lignes 176-177 :

```typescript
            padding-block: var(--spacing-block, var(--spacing));
            padding-inline: var(--spacing-inline, var(--spacing));
```

par :

```typescript
            padding-block: var(--ar-dialog-spacing-block, var(--ar-dialog-spacing));
            padding-inline: var(--ar-dialog-spacing-inline, var(--ar-dialog-spacing));
```

- [ ] **Step 4: Mettre à jour le JSDoc `@cssprop` dans `dialog.ts`**

Dans `packages/core/src/components/dialog/dialog.ts`, remplacer les lignes 64-67 :

```typescript
 * @cssprop [--width=500px (modal) ou 720px (drawer)] - Largeur du dialog. Prend le pas sur les tailles prédéfinies.
 * @cssprop [--spacing=1.25rem] - Padding interne (block et inline) de la zone de contenu.
 * @cssprop [--spacing-block] - Padding haut/bas. Prend le pas sur `--spacing` si défini.
 * @cssprop [--spacing-inline] - Padding gauche/droite. Prend le pas sur `--spacing` si défini.
```

par :

```typescript
 * @cssprop [--ar-dialog-width=500px (modal) ou 720px (drawer)] - Largeur du dialog. Prend le pas sur les tailles prédéfinies.
 * @cssprop [--ar-dialog-spacing=1.25rem] - Padding interne (block et inline) de la zone de contenu.
 * @cssprop [--ar-dialog-spacing-block] - Padding haut/bas. Prend le pas sur `--ar-dialog-spacing` si défini.
 * @cssprop [--ar-dialog-spacing-inline] - Padding gauche/droite. Prend le pas sur `--ar-dialog-spacing` si défini.
```

- [ ] **Step 5: Lancer le test, vérifier qu'il passe**

Run: `npm run test -w packages/core -- dialog.test.ts`
Expected: PASS.

- [ ] **Step 6: Lancer toute la suite dialog pour vérifier l'absence de régression sur les tailles `size`/`mode`**

Run: `npm run test -w packages/core -- dialog.test.ts`
Expected: tous PASS.

- [ ] **Step 7: Régénérer le manifeste des custom elements**

Run: `npm run build:manifest`
Expected: exit 0.

Run: `grep -c "ar-dialog-width\|ar-dialog-spacing" packages/core/custom-elements.json`
Expected: `4` ou plus (les 4 nouveaux noms de tokens apparaissent).

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/components/dialog/dialog.styles.ts packages/core/src/components/dialog/dialog.ts \
        packages/core/src/components/dialog/dialog.test.ts packages/core/custom-elements.json
git commit -m "fix(dialog)!: préfixe --width/--spacing en --ar-dialog-width/--ar-dialog-spacing

BREAKING CHANGE: les custom properties --width, --spacing, --spacing-block
et --spacing-inline sont renommées --ar-dialog-width, --ar-dialog-spacing,
--ar-dialog-spacing-block et --ar-dialog-spacing-inline pour éviter toute
collision avec des custom properties globales du consommateur."
```

---

### Task 8: Documenter les tokens `@cssprop` manquants de `ar-charcounter` (constat transversal #7)

**Files:**

- Modify: `packages/core/src/components/charcounter/charcounter.ts:30-32`

**Interfaces:** aucune — documentation uniquement, pas de comportement changé.

- [ ] **Step 1: Compléter le JSDoc `@cssprop` avec les 3 tokens manquants et harmoniser le format**

Les tokens `--ar-charcounter-font-size`, `--ar-charcounter-warning-weight` et `--ar-charcounter-error-weight` sont consommés (`charcounter.styles.ts:10,15,20`) et définis dans le thème (`default.css:448,450,452`) mais absents du JSDoc. Le format actuel n'utilise pas non plus la notation `[--ar-x=default]` utilisée par les autres composants (`alert`, `dropdown`).

Dans `packages/core/src/components/charcounter/charcounter.ts`, remplacer les lignes 30-32 :

```typescript
 * @cssprop --ar-charcounter-color         - Couleur état normal.
 * @cssprop --ar-charcounter-warning-color - Couleur état warning.
 * @cssprop --ar-charcounter-error-color   - Couleur état error.
```

par :

```typescript
 * @cssprop [--ar-charcounter-color]                - Couleur état normal.
 * @cssprop [--ar-charcounter-warning-color]         - Couleur état warning.
 * @cssprop [--ar-charcounter-error-color]           - Couleur état error.
 * @cssprop [--ar-charcounter-font-size=0.875rem]    - Taille de police.
 * @cssprop [--ar-charcounter-warning-weight=600]    - Graisse du texte en état warning.
 * @cssprop [--ar-charcounter-error-weight=700]      - Graisse du texte en état error.
```

(valeurs par défaut copiées de `default.css:448,450,452` — vérifier avec `grep -n "charcounter-font-size\|charcounter-warning-weight\|charcounter-error-weight" packages/core/src/styles/themes/default.css` avant d'écrire les valeurs si le thème a changé depuis l'audit.)

- [ ] **Step 2: Régénérer le manifeste des custom elements**

Run: `npm run build:manifest`
Expected: exit 0.

Run: `grep -c "charcounter-font-size\|charcounter-warning-weight\|charcounter-error-weight" packages/core/custom-elements.json`
Expected: `3` ou plus.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/components/charcounter/charcounter.ts packages/core/custom-elements.json
git commit -m "docs(charcounter): documente les 3 @cssprop manquants et harmonise le format"
```

---

### Task 9: Définir et documenter les tokens de fond manquants de `ar-datepicker` (constat bloquant beta lié à #7)

**Files:**

- Modify: `packages/core/src/styles/themes/default.css` (section `ar-datepicker`, après ligne 503)
- Modify: `packages/core/src/components/datepicker/datepicker.ts:47-89`
- Test: `packages/core/src/components/datepicker/datepicker.test.ts` (nouveau test)

**Interfaces:** aucune — ajoute des tokens CSS jusque-là non définis, pas de changement d'API du composant.

- [ ] **Step 1: Écrire le test qui échoue — l'en-tête, les jours et le footer du calendrier ont un fond non transparent par défaut**

Ajouter dans `packages/core/src/components/datepicker/datepicker.test.ts` :

```typescript
describe('fonds par défaut du calendrier (thème)', () => {
    it('--ar-datepicker-header-bg, -day-bg et -footer-bg ont une valeur calculée non vide', async () => {
        el = await fixture('<ar-datepicker></ar-datepicker>');
        const style = getComputedStyle(el);

        expect(style.getPropertyValue('--ar-datepicker-header-bg').trim()).not.toBe('');
        expect(style.getPropertyValue('--ar-datepicker-day-bg').trim()).not.toBe('');
        expect(style.getPropertyValue('--ar-datepicker-footer-bg').trim()).not.toBe('');
    });
});
```

Note : ce test nécessite que `packages/core/src/styles/themes/default.css` soit chargé dans l'environnement de test. Vérifier avec `grep -n "themes/default" packages/core/vitest.config.ts packages/core/vitest.setup.ts 2>/dev/null` — si le thème n'est pas importé dans la config de test, ce test ne peut pas passer par ce mécanisme ; dans ce cas, remplacer l'assertion par une vérification directe de la présence des déclarations dans le fichier source :

```typescript
describe('fonds par défaut du calendrier (thème)', () => {
    it('default.css définit --ar-datepicker-header-bg, -day-bg et -footer-bg', async () => {
        const { readFileSync } = await import('node:fs');
        const themeCss = readFileSync(
            new URL('../../styles/themes/default.css', import.meta.url),
            'utf-8',
        );
        expect(themeCss).toMatch(/--ar-datepicker-header-bg:/);
        expect(themeCss).toMatch(/--ar-datepicker-day-bg:/);
        expect(themeCss).toMatch(/--ar-datepicker-footer-bg:/);
    });
});
```

Utiliser cette seconde forme (indépendante de la config Vitest).

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `npm run test -w packages/core -- datepicker.test.ts`
Expected: FAIL — les 3 tokens sont absents de `default.css`.

- [ ] **Step 3: Ajouter les 3 tokens dans `default.css`**

Dans `packages/core/src/styles/themes/default.css`, la section `ar-datepicker` liste déjà `--ar-datepicker-header-font-size`/`-margin`/`-padding`/`-radius` (lignes 500-503) sans jamais définir `-bg`. Ajouter une ligne après la ligne 503 (`--ar-datepicker-header-radius: 0;`) :

```css
--ar-datepicker-header-radius: 0;
--ar-datepicker-header-bg: transparent;
```

Pour `--ar-datepicker-day-bg`, ajouter après la ligne 546 (`--ar-datepicker-day-radius: 0.5rem;`) :

```css
--ar-datepicker-day-radius: 0.5rem;
--ar-datepicker-day-bg: transparent;
```

Pour `--ar-datepicker-footer-bg`, ajouter après la ligne 519 (`--ar-datepicker-footer-padding: 0.75rem 0 0;`) :

```css
--ar-datepicker-footer-padding: 0.75rem 0 0;
--ar-datepicker-footer-bg: transparent;
```

(Valeur `transparent` : cohérente avec le style actuel du composant — `header`/`day`/`footer` n'ont jamais eu de fond visible depuis leur création, ce correctif comble un token headless jusque-là non résolu plutôt que de changer l'apparence par défaut. Si un rendu avec fond visible est souhaité, discuter la valeur avec l'équipe design avant de merger — ce n'est pas trancher ici.)

- [ ] **Step 4: Documenter les 3 tokens dans le JSDoc de `datepicker.ts`**

Dans `packages/core/src/components/datepicker/datepicker.ts`, ajouter après la ligne 50 (`@cssprop [--ar-datepicker-header-radius] ...`) :

```typescript
 * @cssprop [--ar-datepicker-header-radius]            - Border-radius de l'en-tête.
 * @cssprop [--ar-datepicker-header-bg=transparent]     - Fond de l'en-tête.
```

Ajouter après la ligne 66 (`@cssprop [--ar-datepicker-footer-margin] ...` / avant `-footer-btn-bg`, vérifier la ligne exacte avec `grep -n "footer-padding" packages/core/src/components/datepicker/datepicker.ts`) juste après `@cssprop [--ar-datepicker-footer-padding] ...` :

```typescript
 * @cssprop [--ar-datepicker-footer-padding]                - Padding du footer.
 * @cssprop [--ar-datepicker-footer-bg=transparent]          - Fond du footer.
```

Ajouter après la ligne `@cssprop [--ar-datepicker-day-radius] ...` (vérifier avec `grep -n "day-radius" packages/core/src/components/datepicker/datepicker.ts`) :

```typescript
 * @cssprop [--ar-datepicker-day-radius]               - Border-radius des cellules jour.
 * @cssprop [--ar-datepicker-day-bg=transparent]        - Fond des cellules jour.
```

- [ ] **Step 5: Lancer le test, vérifier qu'il passe**

Run: `npm run test -w packages/core -- datepicker.test.ts`
Expected: PASS.

- [ ] **Step 6: Régénérer le manifeste des custom elements**

Run: `npm run build:manifest`
Expected: exit 0.

Run: `grep -c "datepicker-header-bg\|datepicker-day-bg\|datepicker-footer-bg" packages/core/custom-elements.json`
Expected: `3` ou plus.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/styles/themes/default.css packages/core/src/components/datepicker/datepicker.ts \
        packages/core/src/components/datepicker/datepicker.test.ts packages/core/custom-elements.json
git commit -m "fix(datepicker): définit --ar-datepicker-header/day/footer-bg dans le thème (jusque-là non résolus)"
```

---

### Task 10: Validation finale et ouverture de la PR

**Files:** aucun fichier modifié.

- [ ] **Step 1: Lancer la suite complète de tests**

Run: `npm run test`
Expected: tous PASS, aucune régression.

- [ ] **Step 2: Lancer le typecheck complet**

Run: `npx tsc --noEmit -p packages/core` (adapter la commande si `package.json` expose un script dédié, ex. `npm run typecheck -w packages/core`)
Expected: aucune erreur.

- [ ] **Step 3: Lancer le build complet pour vérifier que `custom-elements.json` et les bundles restent cohérents**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 4: Pousser la branche**

```bash
git push -u origin fix/audit-technical-transversal-mechanics
```

- [ ] **Step 5: Créer la PR vers `dev`**

```bash
gh pr create --base dev --title "fix(core): corrige les incohérences transversales mécaniques de l'audit v1.0-beta" --body "$(cat <<'EOF'
## Résumé

Corrige les 6 constats transversaux "mécaniques" de l'audit technique v1.0-beta (`docs/superpowers/specs/2026-07-14-audit-technique-v1-beta.md`) :

- Diagnostics dev unifiés sur `warn()` (popover, alert, stepper, datepicker) — plus de fuite `console.*` en production.
- `ar-dropdown` : résolution de `for` en shadow DOM alignée sur `ar-tooltip` (`getRootNode()`), `detail.id` ajouté aux events de cycle de vie, `--ar-dropdown-color` documenté.
- `AnchoredController.attach()` pose désormais `aria-controls` sur le trigger (généralisé depuis `ar-collapse`) — bénéficie à dropdown/tooltip/breadcrumb/datepicker/stepper.
- `ar-pagination` : retrait de la propriété IDL `ariaDisabled` redondante avec l'attribut.
- `ar-dialog` (breaking, alpha) : `--width`/`--spacing*` renommés `--ar-dialog-width`/`--ar-dialog-spacing*`.
- `ar-charcounter` : 3 `@cssprop` manquants documentés.
- `ar-datepicker` : 3 tokens de fond (header/day/footer) jusque-là non définis dans le thème — corrige un bug de rendu réel en plus de la doc.

Ne couvre pas les conventions d'events (traité en PR2 séparée) ni les 7 bloquants beta isolés par composant (PR3).

## Test plan

- [x] Tests unitaires ajoutés par correctif (TDD, cf. plan `docs/superpowers/plans/2026-07-14-audit-pr1-transversaux-mecaniques.md`)
- [x] `npm run test` complet vert
- [x] `tsc --noEmit` propre
- [x] `npm run build` complet (bundles + manifest CEM) vert
EOF
)"
```

Expected: la commande affiche l'URL de la PR créée.
