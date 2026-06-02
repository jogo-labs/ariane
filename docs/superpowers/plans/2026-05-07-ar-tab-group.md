# ar-tab-group Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implémenter le pattern WAI-ARIA Tabs complet via trois éléments coopérants (`ar-tab-group`, `ar-tab`, `ar-tab-panel`) avec roving tabindex, association tab↔panel par nom, scroll horizontal et scroll-hints.

**Architecture:** `ar-tab-group` fournit un `ContextProvider` (`@lit/context`) exposant un registry. `ar-tab` et `ar-tab-panel` sont des `ContextConsumer` qui s'enregistrent au `connectedCallback`. `ar-tab-group` orchestre tout : pose les attributs ARIA sur les hosts light DOM, gère le roving tabindex et le clavier.

**Tech Stack:** Lit 3, TypeScript, `@lit/context`, Vitest (tests unitaires), `@web/test-runner` + `@open-wc/testing` (tests browser).

---

## Structure des fichiers

| Fichier                                                            | Action                     | Responsabilité                                                   |
| ------------------------------------------------------------------ | -------------------------- | ---------------------------------------------------------------- |
| `packages/core/src/context/tabs.context.ts`                        | Créer                      | Interface `TabGroupRegistry` + clé de contexte                   |
| `packages/core/src/components/tab/tab.ts`                          | Créer (scaffold)           | `ar-tab` : props, consumer, ARIA sur host, click                 |
| `packages/core/src/components/tab/tab.styles.ts`                   | Créer (scaffold)           | Styles ar-tab                                                    |
| `packages/core/src/components/tab/tab.test.ts`                     | Créer (scaffold)           | Tests unitaires ar-tab (Vitest)                                  |
| `packages/core/src/components/tab-panel/tab-panel.ts`              | Créer (scaffold)           | `ar-tab-panel` : props, consumer, ARIA sur host                  |
| `packages/core/src/components/tab-panel/tab-panel.styles.ts`       | Créer (scaffold)           | Styles ar-tab-panel                                              |
| `packages/core/src/components/tab-panel/tab-panel.test.ts`         | Créer (scaffold)           | Tests unitaires ar-tab-panel (Vitest)                            |
| `packages/core/src/components/tab-group/tab-group.ts`              | Modifier (scaffold existe) | `ar-tab-group` : provider, registry, ARIA, clavier, scroll-hints |
| `packages/core/src/components/tab-group/tab-group.styles.ts`       | Modifier (scaffold existe) | Styles ar-tab-group                                              |
| `packages/core/src/components/tab-group/tab-group.test.ts`         | Modifier (scaffold existe) | Tests unitaires intégration (Vitest)                             |
| `packages/core/src/components/tab-group/tab-group.browser.test.ts` | Créer                      | Tests browser clavier + scroll-hints (WTR)                       |
| `packages/core/src/components/tab-group/tab-group.a11y.test.ts`    | Créer                      | Tests ARIA accessibilité (WTR)                                   |
| `packages/core/src/index.ts`                                       | Modifier                   | Ajouter exports ArTab, ArTabPanel                                |
| `packages/core/src/autoloader.ts`                                  | Modifier                   | Ajouter ar-tab, ar-tab-panel                                     |
| `apps/docs/src/content/components/ar-tab-group.mdx`                | Modifier (scaffold existe) | Documentation complète avec variantes                            |
| `apps/docs/src/content/components/ar-tab.mdx`                      | Créer (scaffold crée)      | Doc sous-composant ar-tab                                        |
| `apps/docs/src/content/components/ar-tab-panel.mdx`                | Créer (scaffold crée)      | Doc sous-composant ar-tab-panel                                  |

---

## Task 0 : Créer la branche de travail

- [ ] **Step 1 : Créer la branche depuis dev**

```bash
git checkout dev && git checkout -b feat/ar-tab-group
```

---

## Task 1 : Scaffold ar-tab, ar-tab-panel + tabs.context.ts

**Files:**

- Create: `packages/core/src/context/tabs.context.ts`
- Create: `packages/core/src/components/tab/` (via scaffold)
- Create: `packages/core/src/components/tab-panel/` (via scaffold)
- Modify: `packages/core/src/index.ts` (scaffold met à jour automatiquement)
- Modify: `packages/core/src/autoloader.ts` (scaffold met à jour automatiquement)

- [ ] **Step 1 : Lancer le scaffold pour ar-tab**

Depuis la racine du repo :

```bash
npm run create ar-tab
```

Résultat attendu :

```
✓ src/components/tab/tab.ts
✓ src/components/tab/tab.styles.ts
✓ src/components/tab/tab.test.ts
✓ apps/docs/src/content/components/ar-tab.mdx
✓ src/index.ts mis à jour
✓ src/autoloader.ts mis à jour
```

- [ ] **Step 2 : Lancer le scaffold pour ar-tab-panel**

```bash
npm run create ar-tab-panel
```

Résultat attendu :

```
✓ src/components/tab-panel/tab-panel.ts
✓ src/components/tab-panel/tab-panel.styles.ts
✓ src/components/tab-panel/tab-panel.test.ts
✓ apps/docs/src/content/components/ar-tab-panel.mdx
✓ src/index.ts mis à jour
✓ src/autoloader.ts mis à jour
```

- [ ] **Step 3 : Créer tabs.context.ts**

```typescript
// packages/core/src/context/tabs.context.ts
import { createContext } from '@lit/context';
import type { ArTab } from '../components/tab/tab.js';
import type { ArTabPanel } from '../components/tab-panel/tab-panel.js';

export interface TabGroupRegistry {
    registerTab(tab: ArTab): void;
    unregisterTab(tab: ArTab): void;
    registerPanel(panel: ArTabPanel): void;
    unregisterPanel(panel: ArTabPanel): void;
    activate(name: string): void;
}

export const tabGroupContext = createContext<TabGroupRegistry>(Symbol('ar-tab-group'));
```

- [ ] **Step 4 : Vérifier les exports dans index.ts**

Ouvrir `packages/core/src/index.ts` et vérifier que ces trois lignes sont présentes (le scaffold les ajoute automatiquement) :

```typescript
export { ArTabGroup } from './components/tab-group/tab-group.js';
export { ArTab } from './components/tab/tab.js';
export { ArTabPanel } from './components/tab-panel/tab-panel.js';
```

- [ ] **Step 5 : Commit**

```bash
git add packages/core/src/context/tabs.context.ts \
        packages/core/src/components/tab/ \
        packages/core/src/components/tab-panel/ \
        packages/core/src/index.ts \
        packages/core/src/autoloader.ts \
        apps/docs/src/content/components/ar-tab.mdx \
        apps/docs/src/content/components/ar-tab-panel.mdx
git commit -m "feat(tab-group): scaffold ar-tab, ar-tab-panel + tabs.context"
```

---

## Task 2 : ar-tab — tests unitaires + implémentation

**Files:**

- Modify: `packages/core/src/components/tab/tab.ts`
- Modify: `packages/core/src/components/tab/tab.test.ts`

- [ ] **Step 1 : Écrire les tests unitaires ar-tab**

Remplacer le contenu de `packages/core/src/components/tab/tab.test.ts` :

```typescript
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fixture, waitForUpdate, getPart } from '../../test-utils.js';
import type { ArTab } from './tab.js';
import './tab.js';

describe('ArTab', () => {
    let el: ArTab;
    afterEach(() => el?.remove());

    describe('rendu', () => {
        it('monte un shadow DOM avec un slot', async () => {
            el = await fixture('<ar-tab panel="a">Tab A</ar-tab>');
            expect(el.shadowRoot).not.toBeNull();
            expect(el.shadowRoot?.querySelector('slot')).not.toBeNull();
        });
    });

    describe('valeurs par défaut', () => {
        it('panel vaut chaîne vide', async () => {
            el = await fixture('<ar-tab>Tab</ar-tab>');
            expect(el.panel).toBe('');
        });

        it('disabled vaut false', async () => {
            el = await fixture('<ar-tab panel="a">Tab A</ar-tab>');
            expect(el.disabled).toBe(false);
        });
    });

    describe('attribut panel', () => {
        it("lit panel depuis l'attribut HTML", async () => {
            el = await fixture('<ar-tab panel="intro">Tab</ar-tab>');
            expect(el.panel).toBe('intro');
        });

        it('reflète panel en attribut', async () => {
            el = await fixture('<ar-tab panel="intro">Tab</ar-tab>');
            el.panel = 'usage';
            await waitForUpdate(el);
            expect(el.getAttribute('panel')).toBe('usage');
        });
    });

    describe('disabled', () => {
        it('reflète disabled en attribut', async () => {
            el = await fixture('<ar-tab panel="a">Tab</ar-tab>');
            el.disabled = true;
            await waitForUpdate(el);
            expect(el.hasAttribute('disabled')).toBe(true);
        });

        it('ne déclenche pas activate si disabled', async () => {
            el = await fixture('<ar-tab panel="a" disabled>Tab</ar-tab>');
            const spy = vi.fn();
            (el as any)._registry = { activate: spy, registerTab: vi.fn(), unregisterTab: vi.fn() };
            el.click();
            expect(spy).not.toHaveBeenCalled();
        });
    });

    describe('click', () => {
        it('appelle registry.activate(panel) au clic', async () => {
            el = await fixture('<ar-tab panel="test">Tab</ar-tab>');
            const activate = vi.fn();
            (el as any)._registry = { activate, registerTab: vi.fn(), unregisterTab: vi.fn() };
            el.click();
            expect(activate).toHaveBeenCalledWith('test');
        });
    });
});
```

- [ ] **Step 2 : Lancer les tests — vérifier l'échec**

```bash
cd packages/core && npm run test -- --reporter=verbose tab/tab.test.ts
```

Attendu : FAIL — le scaffold génère un stub minimal ; les tests de `panel`, `disabled`, `click` et ARIA échouent car l'implémentation réelle n'est pas encore écrite.

- [ ] **Step 3 : Implémenter ar-tab**

Remplacer `packages/core/src/components/tab/tab.ts` :

```typescript
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ContextConsumer } from '@lit/context';
import { tabGroupContext, type TabGroupRegistry } from '../../context/tabs.context.js';
import styles from './tab.styles.js';

/**
 * @summary Onglet déclencheur pour ar-tab-group.
 * @parent ar-tab-group
 * @display docs
 *
 * @slot - Libellé de l'onglet.
 *
 * @csspart base - Wrapper du slot.
 */
@customElement('ar-tab')
export class ArTab extends LitElement {
    static override styles = [styles];

    /** Nom du ar-tab-panel associé. Requis. */
    @property({ reflect: true }) panel = '';

    /** Désactive l'onglet — non sélectionnable, ignoré au clavier. */
    @property({ reflect: true, type: Boolean }) disabled = false;

    _registry?: TabGroupRegistry;

    protected readonly _consumer = new ContextConsumer(this, {
        context: tabGroupContext,
        subscribe: true,
        callback: (registry) => this._setRegistry(registry),
    });

    private _setRegistry(registry: TabGroupRegistry): void {
        if (this._registry) {
            this._registry.unregisterTab(this);
        }
        this._registry = registry;
        registry.registerTab(this);
    }

    override connectedCallback(): void {
        super.connectedCallback();
        this.addEventListener('click', this._handleClick);
    }

    override disconnectedCallback(): void {
        this._registry?.unregisterTab(this);
        this._registry = undefined;
        this.removeEventListener('click', this._handleClick);
        super.disconnectedCallback();
    }

    private _handleClick = (): void => {
        if (!this.disabled) {
            this._registry?.activate(this.panel);
        }
    };

    override render() {
        return html`<div part="base"><slot></slot></div>`;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'ar-tab': ArTab;
    }
}
```

- [ ] **Step 4 : Relancer les tests — vérifier le passage**

```bash
cd packages/core && npm run test -- --reporter=verbose tab/tab.test.ts
```

Attendu : PASS (6 tests).

- [ ] **Step 5 : Commit**

```bash
git add packages/core/src/components/tab/
git commit -m "feat(tab-group): ar-tab — implémentation et tests unitaires"
```

---

## Task 3 : ar-tab-panel — tests unitaires + implémentation

**Files:**

- Modify: `packages/core/src/components/tab-panel/tab-panel.ts`
- Modify: `packages/core/src/components/tab-panel/tab-panel.test.ts`

- [ ] **Step 1 : Écrire les tests unitaires ar-tab-panel**

Remplacer `packages/core/src/components/tab-panel/tab-panel.test.ts` :

```typescript
import { afterEach, describe, expect, it } from 'vitest';
import { fixture, waitForUpdate } from '../../test-utils.js';
import type { ArTabPanel } from './tab-panel.js';
import './tab-panel.js';

describe('ArTabPanel', () => {
    let el: ArTabPanel;
    afterEach(() => el?.remove());

    describe('rendu', () => {
        it('monte un shadow DOM avec un slot', async () => {
            el = await fixture('<ar-tab-panel name="a">Contenu</ar-tab-panel>');
            expect(el.shadowRoot).not.toBeNull();
            expect(el.shadowRoot?.querySelector('slot')).not.toBeNull();
        });
    });

    describe('valeurs par défaut', () => {
        it('name vaut chaîne vide', async () => {
            el = await fixture('<ar-tab-panel>Contenu</ar-tab-panel>');
            expect(el.name).toBe('');
        });
    });

    describe('attribut name', () => {
        it("lit name depuis l'attribut HTML", async () => {
            el = await fixture('<ar-tab-panel name="intro">Contenu</ar-tab-panel>');
            expect(el.name).toBe('intro');
        });

        it('reflète name en attribut', async () => {
            el = await fixture('<ar-tab-panel name="intro">Contenu</ar-tab-panel>');
            el.name = 'usage';
            await waitForUpdate(el);
            expect(el.getAttribute('name')).toBe('usage');
        });
    });
});
```

- [ ] **Step 2 : Lancer les tests — vérifier l'échec**

```bash
cd packages/core && npm run test -- --reporter=verbose tab-panel/tab-panel.test.ts
```

Attendu : FAIL — le scaffold génère un stub minimal ; les tests de `name` et de reflect échouent car l'implémentation réelle n'est pas encore écrite.

- [ ] **Step 3 : Implémenter ar-tab-panel**

Remplacer `packages/core/src/components/tab-panel/tab-panel.ts` :

```typescript
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ContextConsumer } from '@lit/context';
import { tabGroupContext, type TabGroupRegistry } from '../../context/tabs.context.js';
import styles from './tab-panel.styles.js';

/**
 * @summary Panneau de contenu pour ar-tab-group.
 * @parent ar-tab-group
 * @display docs
 *
 * @slot - Contenu du panel.
 *
 * @csspart base - Wrapper du slot.
 */
@customElement('ar-tab-panel')
export class ArTabPanel extends LitElement {
    static override styles = [styles];

    /** Nom correspondant à l'attribut `panel` du ar-tab associé. Requis. */
    @property({ reflect: true }) name = '';

    private _registry?: TabGroupRegistry;

    protected readonly _consumer = new ContextConsumer(this, {
        context: tabGroupContext,
        subscribe: true,
        callback: (registry) => this._setRegistry(registry),
    });

    private _setRegistry(registry: TabGroupRegistry): void {
        if (this._registry) {
            this._registry.unregisterPanel(this);
        }
        this._registry = registry;
        registry.registerPanel(this);
    }

    override disconnectedCallback(): void {
        this._registry?.unregisterPanel(this);
        this._registry = undefined;
        super.disconnectedCallback();
    }

    override render() {
        return html`<div part="base"><slot></slot></div>`;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'ar-tab-panel': ArTabPanel;
    }
}
```

- [ ] **Step 4 : Relancer les tests — vérifier le passage**

```bash
cd packages/core && npm run test -- --reporter=verbose tab-panel/tab-panel.test.ts
```

Attendu : PASS (4 tests).

- [ ] **Step 5 : Commit**

```bash
git add packages/core/src/components/tab-panel/
git commit -m "feat(tab-group): ar-tab-panel — implémentation et tests unitaires"
```

---

## Task 4 : ar-tab-group — registry, ARIA, show/hide

**Files:**

- Modify: `packages/core/src/components/tab-group/tab-group.ts`
- Modify: `packages/core/src/components/tab-group/tab-group.test.ts`

- [ ] **Step 1 : Écrire les tests unitaires ar-tab-group (registry + ARIA)**

Remplacer `packages/core/src/components/tab-group/tab-group.test.ts` :

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, waitForUpdate, getPart } from '../../test-utils.js';
import type { ArTabGroup } from './tab-group.js';
import './tab-group.js';
import '../tab/tab.js';
import '../tab-panel/tab-panel.js';

const DEFAULT_HTML = `
    <ar-tab-group>
        <ar-tab panel="a">Tab A</ar-tab>
        <ar-tab panel="b">Tab B</ar-tab>
        <ar-tab-panel name="a">Panel A</ar-tab-panel>
        <ar-tab-panel name="b">Panel B</ar-tab-panel>
    </ar-tab-group>
`;

describe('ArTabGroup', () => {
    let el: ArTabGroup;
    afterEach(() => el?.remove());

    // ── Rendu ───────────────────────────────────────────────────────────────

    describe('rendu', () => {
        beforeEach(async () => {
            el = await fixture('<ar-tab-group></ar-tab-group>');
        });

        it('monte un shadow DOM', () => {
            expect(el.shadowRoot).not.toBeNull();
        });

        it('contient part="base"', () => {
            expect(getPart(el, 'base')).not.toBeNull();
        });

        it('contient part="nav"', () => {
            expect(getPart(el, 'nav')).not.toBeNull();
        });

        it('contient part="tabs" avec role="tablist"', () => {
            expect(getPart(el, 'tabs')?.getAttribute('role')).toBe('tablist');
        });
    });

    // ── Valeurs par défaut ─────────────────────────────────────────────────

    describe('valeurs par défaut', () => {
        beforeEach(async () => {
            el = await fixture('<ar-tab-group></ar-tab-group>');
        });

        it('active vaut chaîne vide', () => expect(el.active).toBe(''));
        it('label vaut chaîne vide', () => expect(el.label).toBe(''));
        it('manualActivation vaut false', () => expect(el.manualActivation).toBe(false));
        it('scrollHints vaut false', () => expect(el.scrollHints).toBe(false));
    });

    // ── Onglet actif par défaut ────────────────────────────────────────────

    describe('onglet actif par défaut', () => {
        it('active le premier onglet non-disabled si active est absent', async () => {
            el = await fixture(DEFAULT_HTML);
            await waitForUpdate(el);
            const tabA = el.querySelector<HTMLElement>('ar-tab[panel="a"]')!;
            expect(tabA.getAttribute('aria-selected')).toBe('true');
            expect(tabA.getAttribute('tabindex')).toBe('0');
        });

        it('masque le panel inactif avec hidden', async () => {
            el = await fixture(DEFAULT_HTML);
            await waitForUpdate(el);
            const panelB = el.querySelector<HTMLElement>('ar-tab-panel[name="b"]')!;
            expect(panelB.hasAttribute('hidden')).toBe(true);
        });

        it('affiche le panel actif sans hidden', async () => {
            el = await fixture(DEFAULT_HTML);
            await waitForUpdate(el);
            const panelA = el.querySelector<HTMLElement>('ar-tab-panel[name="a"]')!;
            expect(panelA.hasAttribute('hidden')).toBe(false);
        });
    });

    // ── Attribut active ────────────────────────────────────────────────────

    describe('attribut active', () => {
        it('active le bon onglet selon active="b"', async () => {
            el = await fixture(`
                <ar-tab-group active="b">
                    <ar-tab panel="a">Tab A</ar-tab>
                    <ar-tab panel="b">Tab B</ar-tab>
                    <ar-tab-panel name="a">Panel A</ar-tab-panel>
                    <ar-tab-panel name="b">Panel B</ar-tab-panel>
                </ar-tab-group>
            `);
            await waitForUpdate(el);
            const tabB = el.querySelector<HTMLElement>('ar-tab[panel="b"]')!;
            expect(tabB.getAttribute('aria-selected')).toBe('true');
        });

        it("changer active programmatiquement met à jour l'ARIA", async () => {
            el = await fixture(DEFAULT_HTML);
            await waitForUpdate(el);
            el.active = 'b';
            await waitForUpdate(el);
            const tabB = el.querySelector<HTMLElement>('ar-tab[panel="b"]')!;
            expect(tabB.getAttribute('aria-selected')).toBe('true');
            const panelB = el.querySelector<HTMLElement>('ar-tab-panel[name="b"]')!;
            expect(panelB.hasAttribute('hidden')).toBe(false);
        });
    });

    // ── ARIA IDs et associations ───────────────────────────────────────────

    describe('ARIA — IDs et associations', () => {
        beforeEach(async () => {
            el = await fixture(DEFAULT_HTML);
            await waitForUpdate(el);
        });

        it('chaque ar-tab a role="tab"', () => {
            el.querySelectorAll('ar-tab').forEach((tab) => {
                expect(tab.getAttribute('role')).toBe('tab');
            });
        });

        it('chaque ar-tab-panel a role="tabpanel"', () => {
            el.querySelectorAll('ar-tab-panel').forEach((panel) => {
                expect(panel.getAttribute('role')).toBe('tabpanel');
            });
        });

        it("aria-controls sur ar-tab pointe vers l'ID du panel correspondant", () => {
            const tabA = el.querySelector<HTMLElement>('ar-tab[panel="a"]')!;
            const panelA = el.querySelector<HTMLElement>('ar-tab-panel[name="a"]')!;
            expect(tabA.getAttribute('aria-controls')).toBe(panelA.id);
        });

        it("aria-labelledby sur ar-tab-panel pointe vers l'ID du tab correspondant", () => {
            const tabA = el.querySelector<HTMLElement>('ar-tab[panel="a"]')!;
            const panelA = el.querySelector<HTMLElement>('ar-tab-panel[name="a"]')!;
            expect(panelA.getAttribute('aria-labelledby')).toBe(tabA.id);
        });

        it('chaque ar-tab-panel a tabindex="0"', () => {
            el.querySelectorAll('ar-tab-panel').forEach((panel) => {
                expect(panel.getAttribute('tabindex')).toBe('0');
            });
        });
    });

    // ── label ──────────────────────────────────────────────────────────────

    describe('attribut label', () => {
        it('pose aria-label sur le tablist', async () => {
            el = await fixture(`
                <ar-tab-group label="Navigation principale">
                    <ar-tab panel="a">A</ar-tab>
                    <ar-tab-panel name="a">A</ar-tab-panel>
                </ar-tab-group>
            `);
            expect(getPart(el, 'tabs')?.getAttribute('aria-label')).toBe('Navigation principale');
        });
    });

    // ── disabled ───────────────────────────────────────────────────────────

    describe('ar-tab disabled', () => {
        it('pose aria-disabled="true" sur l\'onglet désactivé', async () => {
            el = await fixture(`
                <ar-tab-group>
                    <ar-tab panel="a" disabled>Tab A</ar-tab>
                    <ar-tab panel="b">Tab B</ar-tab>
                    <ar-tab-panel name="a">A</ar-tab-panel>
                    <ar-tab-panel name="b">B</ar-tab-panel>
                </ar-tab-group>
            `);
            await waitForUpdate(el);
            const tabA = el.querySelector<HTMLElement>('ar-tab[panel="a"]')!;
            expect(tabA.getAttribute('aria-disabled')).toBe('true');
        });

        it('saute le premier onglet si disabled et active le suivant', async () => {
            el = await fixture(`
                <ar-tab-group>
                    <ar-tab panel="a" disabled>Tab A</ar-tab>
                    <ar-tab panel="b">Tab B</ar-tab>
                    <ar-tab-panel name="a">A</ar-tab-panel>
                    <ar-tab-panel name="b">B</ar-tab-panel>
                </ar-tab-group>
            `);
            await waitForUpdate(el);
            const tabB = el.querySelector<HTMLElement>('ar-tab[panel="b"]')!;
            expect(tabB.getAttribute('aria-selected')).toBe('true');
        });
    });

    // ── Événement ─────────────────────────────────────────────────────────

    describe('événement ar-tab-group-change', () => {
        it('émet ar-tab-group-change avec { active } au clic', async () => {
            el = await fixture(DEFAULT_HTML);
            await waitForUpdate(el);
            const events: CustomEvent[] = [];
            el.addEventListener('ar-tab-group-change', (e) => events.push(e as CustomEvent));
            const tabB = el.querySelector<HTMLElement>('ar-tab[panel="b"]')!;
            tabB.click();
            await waitForUpdate(el);
            expect(events.length).toBe(1);
            expect(events[0].detail).toEqual({ active: 'b' });
        });
    });

    // ── warn() ─────────────────────────────────────────────────────────────

    describe('warn() — panel orphelin', () => {
        it("affiche un warn si panel d'un ar-tab n'a pas de ar-tab-panel correspondant", async () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            el = await fixture(`
                <ar-tab-group>
                    <ar-tab panel="orphan">Tab</ar-tab>
                </ar-tab-group>
            `);
            await waitForUpdate(el);
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('orphan'));
            warnSpy.mockRestore();
        });
    });

    // ── slot="tab" automatique ─────────────────────────────────────────────

    describe('slot="tab" automatique', () => {
        it('pose slot="tab" sur chaque ar-tab enregistré', async () => {
            el = await fixture(DEFAULT_HTML);
            await waitForUpdate(el);
            el.querySelectorAll('ar-tab').forEach((tab) => {
                expect(tab.getAttribute('slot')).toBe('tab');
            });
        });
    });
});
```

- [ ] **Step 2 : Lancer les tests — vérifier l'échec**

```bash
cd packages/core && npm run test -- --reporter=verbose tab-group/tab-group.test.ts
```

Attendu : FAIL — les tests d'ARIA et d'onglet actif échouent.

- [ ] **Step 3 : Implémenter ar-tab-group (core)**

Remplacer `packages/core/src/components/tab-group/tab-group.ts` :

```typescript
import { LitElement, html, nothing, type PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ContextProvider } from '@lit/context';
import { tabGroupContext, type TabGroupRegistry } from '../../context/tabs.context.js';
import type { ArTab } from '../tab/tab.js';
import type { ArTabPanel } from '../tab-panel/tab-panel.js';
import { warn } from '../../utils/warn.js';
import styles from './tab-group.styles.js';

/**
 * @summary Groupe d'onglets accessibles — pattern WAI-ARIA Tabs complet.
 * @display demo
 *
 * @slot - ar-tab et ar-tab-panel enfants.
 *
 * @csspart base - Conteneur racine.
 * @csspart nav  - Zone scrollable (overflow-x: auto).
 * @csspart tabs - div[role="tablist"].
 *
 * @cssprop [--ar-tab-group-gap=0] - Espacement entre tablist et panels.
 *
 * @event {CustomEvent<{ active: string }>} ar-tab-group-change - Émis quand l'onglet actif change.
 */
@customElement('ar-tab-group')
export class ArTabGroup extends LitElement {
    static override styles = [styles];

    /** Nom de l'onglet actif. Si absent, le premier onglet non-disabled s'active. */
    @property({ reflect: true }) active = '';

    /** aria-label sur le tablist — recommandé si plusieurs ar-tab-group sur la page. */
    @property({ reflect: true }) label = '';

    /** Active le mode manuel : les flèches déplacent le focus sans activer l'onglet. */
    @property({ attribute: 'manual-activation', reflect: true, type: Boolean })
    manualActivation = false;

    /** Active les classes has-overflow-start / has-overflow-end sur part="nav". */
    @property({ attribute: 'scroll-hints', reflect: true, type: Boolean })
    scrollHints = false;

    private _tabs: ArTab[] = [];
    private _panels: ArTabPanel[] = [];
    private readonly _prefix = Math.random().toString(36).slice(2, 9);
    private _resizeObserver?: ResizeObserver;
    private _scrollHintsUnlisten?: () => void;

    private readonly _registry: TabGroupRegistry = {
        registerTab: (tab: ArTab) => {
            if (!this._tabs.includes(tab)) {
                this._tabs.push(tab);
                this._tabs.sort((a, b) =>
                    a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
                );
            }
            tab.setAttribute('slot', 'tab');
            this._syncAll();
        },
        unregisterTab: (tab: ArTab) => {
            this._tabs = this._tabs.filter((t) => t !== tab);
            this._syncAll();
        },
        registerPanel: (panel: ArTabPanel) => {
            if (!this._panels.includes(panel)) {
                this._panels.push(panel);
            }
            this._syncAll();
        },
        unregisterPanel: (panel: ArTabPanel) => {
            this._panels = this._panels.filter((p) => p !== panel);
            this._syncAll();
        },
        activate: (name: string) => {
            if (this.active === name) return;
            this.active = name;
            this._syncAll();
            this._scrollActiveTabIntoView();
            this._emit('ar-tab-group-change', { active: name });
        },
    };

    protected readonly _provider = new ContextProvider(this, {
        context: tabGroupContext,
        initialValue: this._registry,
    });

    override updated(changed: PropertyValues<this>): void {
        if (changed.has('active')) {
            this._syncAll();
            this._scrollActiveTabIntoView();
        }
        if (changed.has('label')) {
            const tablist = this.shadowRoot?.querySelector('[part="tabs"]');
            if (tablist) {
                if (this.label) tablist.setAttribute('aria-label', this.label);
                else tablist.removeAttribute('aria-label');
            }
        }
        if (changed.has('scrollHints')) {
            this._setupScrollHints();
        }
    }

    override connectedCallback(): void {
        super.connectedCallback();
        this.addEventListener('keydown', this._handleKeyDown);
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        this.removeEventListener('keydown', this._handleKeyDown);
        this._resizeObserver?.disconnect();
        this._scrollHintsUnlisten?.();
    }

    override render() {
        return html`
            <div part="base">
                <div part="nav">
                    <div part="tabs" role="tablist" aria-label=${this.label || nothing}>
                        <slot name="tab"></slot>
                    </div>
                </div>
                <slot></slot>
            </div>
        `;
    }

    private get _effectiveActive(): string {
        const found = this._tabs.find((t) => t.panel === this.active && !t.disabled);
        if (found) return this.active;
        return this._tabs.find((t) => !t.disabled)?.panel ?? '';
    }

    private _syncAll(): void {
        const active = this._effectiveActive;
        const pfx = this._prefix;

        this._tabs.forEach((tab) => {
            const isActive = tab.panel === active;
            tab.setAttribute('role', 'tab');
            tab.id = `${pfx}-tab-${tab.panel}`;
            tab.setAttribute('aria-controls', `${pfx}-panel-${tab.panel}`);
            tab.setAttribute('aria-selected', String(isActive));
            tab.setAttribute('tabindex', isActive ? '0' : '-1');
            if (tab.disabled) {
                tab.setAttribute('aria-disabled', 'true');
            } else {
                tab.removeAttribute('aria-disabled');
            }
            if (tab.panel && !this._panels.find((p) => p.name === tab.panel)) {
                warn('ar-tab-group', `Aucun ar-tab-panel avec name="${tab.panel}" trouvé.`);
            }
        });

        this._panels.forEach((panel) => {
            const isActive = panel.name === active;
            panel.setAttribute('role', 'tabpanel');
            panel.id = `${pfx}-panel-${panel.name}`;
            panel.setAttribute('aria-labelledby', `${pfx}-tab-${panel.name}`);
            panel.setAttribute('tabindex', '0');
            if (isActive) {
                panel.removeAttribute('hidden');
            } else {
                panel.setAttribute('hidden', '');
            }
        });
    }

    private _scrollActiveTabIntoView(): void {
        const active = this._effectiveActive;
        const tab = this._tabs.find((t) => t.panel === active);
        tab?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }

    private _emit(name: string, detail: unknown): void {
        this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
    }

    private _handleKeyDown = (e: KeyboardEvent): void => {
        const target = e.composedPath()[0] as Element;
        if (!this._tabs.some((t) => t === target)) return;

        const enabledTabs = this._tabs.filter((t) => !t.disabled);
        const currentIdx = enabledTabs.findIndex((t) => t === target);

        switch (e.key) {
            case 'ArrowLeft':
            case 'ArrowRight': {
                e.preventDefault();
                const dir = e.key === 'ArrowLeft' ? -1 : 1;
                const newIdx = (currentIdx + dir + enabledTabs.length) % enabledTabs.length;
                this._moveFocusTo(enabledTabs[newIdx]);
                if (!this.manualActivation) {
                    this._registry.activate(enabledTabs[newIdx].panel);
                }
                break;
            }
            case 'Home':
                e.preventDefault();
                this._moveFocusTo(enabledTabs[0]);
                if (!this.manualActivation) this._registry.activate(enabledTabs[0].panel);
                break;
            case 'End':
                e.preventDefault();
                this._moveFocusTo(enabledTabs[enabledTabs.length - 1]);
                if (!this.manualActivation)
                    this._registry.activate(enabledTabs[enabledTabs.length - 1].panel);
                break;
            case 'Enter':
            case ' ': // Espace — WAI-ARIA Tabs: Enter ET Space activent en mode manuel
                if (this.manualActivation) {
                    e.preventDefault();
                    const tab = this._tabs.find((t) => t === target);
                    if (tab) this._registry.activate(tab.panel);
                }
                break;
        }
    };

    private _moveFocusTo(tab: ArTab): void {
        this._tabs.forEach((t) => t.setAttribute('tabindex', '-1'));
        tab.setAttribute('tabindex', '0');
        tab.focus();
    }

    private _setupScrollHints(): void {
        this._resizeObserver?.disconnect();
        this._scrollHintsUnlisten?.();
        this._scrollHintsUnlisten = undefined;

        const nav = this.shadowRoot?.querySelector<HTMLElement>('[part="nav"]');
        if (!nav || !this.scrollHints) return;

        const update = () => {
            nav.classList.toggle('has-overflow-start', nav.scrollLeft > 0);
            nav.classList.toggle(
                'has-overflow-end',
                nav.scrollLeft + nav.clientWidth < nav.scrollWidth,
            );
        };

        this._resizeObserver = new ResizeObserver(update);
        this._resizeObserver.observe(nav);
        nav.addEventListener('scroll', update, { passive: true });
        this._scrollHintsUnlisten = () => nav.removeEventListener('scroll', update);
        update();
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'ar-tab-group': ArTabGroup;
    }
}
```

- [ ] **Step 4 : Relancer les tests — vérifier le passage**

```bash
cd packages/core && npm run test -- --reporter=verbose tab-group/tab-group.test.ts
```

Attendu : PASS (tous les tests tab-group).

- [ ] **Step 5 : Lancer l'ensemble des tests pour détecter les régressions**

```bash
cd packages/core && npm run test
```

Attendu : tous les tests passent.

- [ ] **Step 6 : Commit**

```bash
git add packages/core/src/components/tab-group/
git commit -m "feat(tab-group): ar-tab-group — registry, ARIA, clavier"
```

---

## Task 5 : Styles minimaux (tab-group, tab, tab-panel)

**Files:**

- Modify: `packages/core/src/components/tab-group/tab-group.styles.ts`
- Modify: `packages/core/src/components/tab/tab.styles.ts`
- Modify: `packages/core/src/components/tab-panel/tab-panel.styles.ts`

> Les styles sont fonctionnels (layout, overflow, focus) sans imposer de design visuel — le design system complétera via `::part()`.

- [ ] **Step 1 : Écrire tab-group.styles.ts**

```typescript
// packages/core/src/components/tab-group/tab-group.styles.ts
import { css } from 'lit';

export default css`
    :host {
        display: block;
    }

    [part='base'] {
        display: flex;
        flex-direction: column;
        gap: var(--ar-tab-group-gap, 0);
    }

    [part='nav'] {
        overflow-x: auto;
        /* Masque la scrollbar native — le design system la styline via ::part(nav) */
        scrollbar-width: none;
    }

    [part='nav']::-webkit-scrollbar {
        display: none;
    }

    [part='tabs'] {
        display: flex;
        flex-direction: row;
    }
`;
```

- [ ] **Step 2 : Écrire tab.styles.ts**

```typescript
// packages/core/src/components/tab/tab.styles.ts
import { css } from 'lit';

export default css`
    :host {
        display: inline-flex;
        cursor: pointer;
        white-space: nowrap;
        user-select: none;
    }

    :host([disabled]) {
        cursor: not-allowed;
        opacity: 0.5;
    }

    :host(:focus-visible) {
        outline: 2px solid currentColor;
        outline-offset: -2px;
    }
`;
```

- [ ] **Step 3 : Écrire tab-panel.styles.ts**

```typescript
// packages/core/src/components/tab-panel/tab-panel.styles.ts
import { css } from 'lit';

export default css`
    :host {
        display: block;
    }

    :host([hidden]) {
        display: none;
    }
`;
```

- [ ] **Step 4 : Vérifier les tests**

```bash
cd packages/core && npm run test
```

Attendu : tous les tests passent.

- [ ] **Step 5 : Commit**

```bash
git add packages/core/src/components/tab-group/tab-group.styles.ts \
        packages/core/src/components/tab/tab.styles.ts \
        packages/core/src/components/tab-panel/tab-panel.styles.ts
git commit -m "feat(tab-group): styles fonctionnels tab-group, tab, tab-panel"
```

---

## Task 6 : Tests browser — clavier, scroll-hints, accessibilité

**Files:**

- Create: `packages/core/src/components/tab-group/tab-group.browser.test.ts`
- Create: `packages/core/src/components/tab-group/tab-group.a11y.test.ts`

- [ ] **Step 1 : Écrire tab-group.browser.test.ts**

```typescript
/// <reference types="mocha" />
/**
 * tab-group.browser.test.ts
 *
 * Tests nécessitant un vrai navigateur (Chromium via @web/test-runner) :
 *   - Navigation clavier (flèches, Home, End, Enter/Space)
 *   - Activation automatique vs manuelle
 *   - scroll-hints (has-overflow-start / has-overflow-end)
 *   - scrollIntoView au changement d'onglet
 */
import { fixture, html, expect, aTimeout } from '@open-wc/testing';
import type { ArTabGroup } from './tab-group.js';
import './tab-group.js';
import '../tab/tab.js';
import '../tab-panel/tab-panel.js';

function getTab(el: ArTabGroup, panel: string): HTMLElement {
    const tab = el.querySelector<HTMLElement>(`ar-tab[panel="${panel}"]`);
    if (!tab) throw new Error(`ar-tab[panel="${panel}"] introuvable`);
    return tab;
}

function getNav(el: ArTabGroup): HTMLElement {
    const nav = el.shadowRoot?.querySelector<HTMLElement>('[part="nav"]');
    if (!nav) throw new Error('[part="nav"] introuvable');
    return nav;
}

describe('ar-tab-group — browser', () => {
    // ── Activation par clic ────────────────────────────────────────────────

    describe('activation par clic', () => {
        it('affiche le panel correspondant et masque les autres', async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <ar-tab-group>
                    <ar-tab panel="a">A</ar-tab>
                    <ar-tab panel="b">B</ar-tab>
                    <ar-tab-panel name="a">Panel A</ar-tab-panel>
                    <ar-tab-panel name="b">Panel B</ar-tab-panel>
                </ar-tab-group>
            `);
            const el = wrapper.querySelector<ArTabGroup>('ar-tab-group')!;
            getTab(el, 'b').click();
            await el.updateComplete;
            expect(el.querySelector('ar-tab-panel[name="b"]')!.hasAttribute('hidden')).to.equal(
                false,
            );
            expect(el.querySelector('ar-tab-panel[name="a"]')!.hasAttribute('hidden')).to.equal(
                true,
            );
        });

        it('émet ar-tab-group-change avec { active }', async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <ar-tab-group>
                    <ar-tab panel="a">A</ar-tab>
                    <ar-tab panel="b">B</ar-tab>
                    <ar-tab-panel name="a">A</ar-tab-panel>
                    <ar-tab-panel name="b">B</ar-tab-panel>
                </ar-tab-group>
            `);
            const el = wrapper.querySelector<ArTabGroup>('ar-tab-group')!;
            const events: CustomEvent[] = [];
            el.addEventListener('ar-tab-group-change', (e) => events.push(e as CustomEvent));
            getTab(el, 'b').click();
            await el.updateComplete;
            expect(events[0].detail.active).to.equal('b');
        });
    });

    // ── Navigation clavier — activation automatique ────────────────────────

    describe('navigation clavier — mode automatique', () => {
        it('ArrowRight active le tab suivant', async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <ar-tab-group>
                    <ar-tab panel="a">A</ar-tab>
                    <ar-tab panel="b">B</ar-tab>
                    <ar-tab-panel name="a">A</ar-tab-panel>
                    <ar-tab-panel name="b">B</ar-tab-panel>
                </ar-tab-group>
            `);
            const el = wrapper.querySelector<ArTabGroup>('ar-tab-group')!;
            getTab(el, 'a').focus();
            getTab(el, 'a').dispatchEvent(
                new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }),
            );
            await el.updateComplete;
            expect(el.active).to.equal('b');
            expect(getTab(el, 'b').getAttribute('aria-selected')).to.equal('true');
        });

        it('ArrowLeft active le tab précédent (wrap)', async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <ar-tab-group>
                    <ar-tab panel="a">A</ar-tab>
                    <ar-tab panel="b">B</ar-tab>
                    <ar-tab-panel name="a">A</ar-tab-panel>
                    <ar-tab-panel name="b">B</ar-tab-panel>
                </ar-tab-group>
            `);
            const el = wrapper.querySelector<ArTabGroup>('ar-tab-group')!;
            getTab(el, 'a').focus();
            getTab(el, 'a').dispatchEvent(
                new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, composed: true }),
            );
            await el.updateComplete;
            expect(el.active).to.equal('b');
        });

        it('Home active le premier tab', async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <ar-tab-group active="b">
                    <ar-tab panel="a">A</ar-tab>
                    <ar-tab panel="b">B</ar-tab>
                    <ar-tab-panel name="a">A</ar-tab-panel>
                    <ar-tab-panel name="b">B</ar-tab-panel>
                </ar-tab-group>
            `);
            const el = wrapper.querySelector<ArTabGroup>('ar-tab-group')!;
            getTab(el, 'b').focus();
            getTab(el, 'b').dispatchEvent(
                new KeyboardEvent('keydown', { key: 'Home', bubbles: true, composed: true }),
            );
            await el.updateComplete;
            expect(el.active).to.equal('a');
        });

        it('End active le dernier tab', async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <ar-tab-group>
                    <ar-tab panel="a">A</ar-tab>
                    <ar-tab panel="b">B</ar-tab>
                    <ar-tab-panel name="a">A</ar-tab-panel>
                    <ar-tab-panel name="b">B</ar-tab-panel>
                </ar-tab-group>
            `);
            const el = wrapper.querySelector<ArTabGroup>('ar-tab-group')!;
            getTab(el, 'a').focus();
            getTab(el, 'a').dispatchEvent(
                new KeyboardEvent('keydown', { key: 'End', bubbles: true, composed: true }),
            );
            await el.updateComplete;
            expect(el.active).to.equal('b');
        });
    });

    // ── Navigation clavier — activation manuelle ───────────────────────────

    describe('navigation clavier — manual-activation', () => {
        it('ArrowRight déplace le focus sans changer active', async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <ar-tab-group manual-activation>
                    <ar-tab panel="a">A</ar-tab>
                    <ar-tab panel="b">B</ar-tab>
                    <ar-tab-panel name="a">A</ar-tab-panel>
                    <ar-tab-panel name="b">B</ar-tab-panel>
                </ar-tab-group>
            `);
            const el = wrapper.querySelector<ArTabGroup>('ar-tab-group')!;
            getTab(el, 'a').focus();
            getTab(el, 'a').dispatchEvent(
                new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }),
            );
            await el.updateComplete;
            expect(el.active).to.equal('a');
            expect(document.activeElement).to.equal(getTab(el, 'b'));
        });

        it('Enter sur le tab focusé active le panel', async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <ar-tab-group manual-activation>
                    <ar-tab panel="a">A</ar-tab>
                    <ar-tab panel="b">B</ar-tab>
                    <ar-tab-panel name="a">A</ar-tab-panel>
                    <ar-tab-panel name="b">B</ar-tab-panel>
                </ar-tab-group>
            `);
            const el = wrapper.querySelector<ArTabGroup>('ar-tab-group')!;
            getTab(el, 'a').focus();
            getTab(el, 'a').dispatchEvent(
                new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }),
            );
            await el.updateComplete;
            getTab(el, 'b').dispatchEvent(
                new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }),
            );
            await el.updateComplete;
            expect(el.active).to.equal('b');
        });
    });

    // ── scroll-hints ───────────────────────────────────────────────────────

    describe('scroll-hints', () => {
        it('ajoute has-overflow-end quand le contenu déborde', async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <div style="width: 100px; overflow: hidden;">
                    <ar-tab-group scroll-hints>
                        <ar-tab panel="a" style="min-width:60px">A</ar-tab>
                        <ar-tab panel="b" style="min-width:60px">B</ar-tab>
                        <ar-tab panel="c" style="min-width:60px">C</ar-tab>
                        <ar-tab-panel name="a">A</ar-tab-panel>
                        <ar-tab-panel name="b">B</ar-tab-panel>
                        <ar-tab-panel name="c">C</ar-tab-panel>
                    </ar-tab-group>
                </div>
            `);
            const el = wrapper.querySelector<ArTabGroup>('ar-tab-group')!;
            await aTimeout(50);
            const nav = getNav(el);
            expect(nav.classList.contains('has-overflow-end')).to.equal(true);
        });

        it("n'ajoute pas has-overflow-start si scroll à 0", async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <div style="width: 100px; overflow: hidden;">
                    <ar-tab-group scroll-hints>
                        <ar-tab panel="a" style="min-width:60px">A</ar-tab>
                        <ar-tab panel="b" style="min-width:60px">B</ar-tab>
                        <ar-tab panel="c" style="min-width:60px">C</ar-tab>
                        <ar-tab-panel name="a">A</ar-tab-panel>
                        <ar-tab-panel name="b">B</ar-tab-panel>
                        <ar-tab-panel name="c">C</ar-tab-panel>
                    </ar-tab-group>
                </div>
            `);
            const el = wrapper.querySelector<ArTabGroup>('ar-tab-group')!;
            await aTimeout(50);
            const nav = getNav(el);
            expect(nav.classList.contains('has-overflow-start')).to.equal(false);
        });
    });
});
```

- [ ] **Step 2 : Écrire tab-group.a11y.test.ts**

```typescript
/// <reference types="mocha" />
/**
 * tab-group.a11y.test.ts
 *
 * Tests d'accessibilité structurels — WAI-ARIA Tabs pattern.
 */
import { fixture, html, expect } from '@open-wc/testing';
import type { ArTabGroup } from './tab-group.js';
import './tab-group.js';
import '../tab/tab.js';
import '../tab-panel/tab-panel.js';

describe('ar-tab-group — accessibilité', () => {
    // ── Rôles ARIA ─────────────────────────────────────────────────────────

    describe('rôles ARIA', () => {
        it('le tablist a role="tablist"', async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <ar-tab-group>
                    <ar-tab panel="a">A</ar-tab>
                    <ar-tab-panel name="a">A</ar-tab-panel>
                </ar-tab-group>
            `);
            const el = wrapper.querySelector<ArTabGroup>('ar-tab-group')!;
            const tablist = el.shadowRoot?.querySelector('[part="tabs"]');
            expect(tablist?.getAttribute('role')).to.equal('tablist');
        });

        it('chaque ar-tab a role="tab"', async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <ar-tab-group>
                    <ar-tab panel="a">A</ar-tab>
                    <ar-tab panel="b">B</ar-tab>
                    <ar-tab-panel name="a">A</ar-tab-panel>
                    <ar-tab-panel name="b">B</ar-tab-panel>
                </ar-tab-group>
            `);
            const el = wrapper.querySelector<ArTabGroup>('ar-tab-group')!;
            el.querySelectorAll('ar-tab').forEach((tab) => {
                expect(tab.getAttribute('role')).to.equal('tab');
            });
        });

        it('chaque ar-tab-panel a role="tabpanel"', async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <ar-tab-group>
                    <ar-tab panel="a">A</ar-tab>
                    <ar-tab-panel name="a">A</ar-tab-panel>
                </ar-tab-group>
            `);
            const el = wrapper.querySelector<ArTabGroup>('ar-tab-group')!;
            expect(el.querySelector('ar-tab-panel')!.getAttribute('role')).to.equal('tabpanel');
        });
    });

    // ── Associations ARIA ──────────────────────────────────────────────────

    describe('associations ARIA (light DOM → light DOM)', () => {
        it("aria-controls du tab pointe vers l'ID du panel (même arbre)", async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <ar-tab-group>
                    <ar-tab panel="intro">Intro</ar-tab>
                    <ar-tab-panel name="intro">Contenu</ar-tab-panel>
                </ar-tab-group>
            `);
            const el = wrapper.querySelector<ArTabGroup>('ar-tab-group')!;
            const tab = el.querySelector<HTMLElement>('ar-tab[panel="intro"]')!;
            const panel = el.querySelector<HTMLElement>('ar-tab-panel[name="intro"]')!;
            expect(tab.getAttribute('aria-controls')).to.equal(panel.id);
            // Vérifie que l'ID référencé est bien résolvable dans le light DOM
            expect(document.getElementById(panel.id)).to.equal(panel);
        });

        it("aria-labelledby du panel pointe vers l'ID du tab (même arbre)", async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <ar-tab-group>
                    <ar-tab panel="intro">Intro</ar-tab>
                    <ar-tab-panel name="intro">Contenu</ar-tab-panel>
                </ar-tab-group>
            `);
            const el = wrapper.querySelector<ArTabGroup>('ar-tab-group')!;
            const tab = el.querySelector<HTMLElement>('ar-tab[panel="intro"]')!;
            const panel = el.querySelector<HTMLElement>('ar-tab-panel[name="intro"]')!;
            expect(panel.getAttribute('aria-labelledby')).to.equal(tab.id);
            expect(document.getElementById(tab.id)).to.equal(tab);
        });
    });

    // ── État sélectionné ───────────────────────────────────────────────────

    describe('état sélectionné', () => {
        it('le tab actif a aria-selected="true"', async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <ar-tab-group>
                    <ar-tab panel="a">A</ar-tab>
                    <ar-tab-panel name="a">A</ar-tab-panel>
                </ar-tab-group>
            `);
            const el = wrapper.querySelector<ArTabGroup>('ar-tab-group')!;
            expect(el.querySelector('ar-tab')!.getAttribute('aria-selected')).to.equal('true');
        });

        it('les tabs inactifs ont aria-selected="false"', async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <ar-tab-group>
                    <ar-tab panel="a">A</ar-tab>
                    <ar-tab panel="b">B</ar-tab>
                    <ar-tab-panel name="a">A</ar-tab-panel>
                    <ar-tab-panel name="b">B</ar-tab-panel>
                </ar-tab-group>
            `);
            const el = wrapper.querySelector<ArTabGroup>('ar-tab-group')!;
            expect(el.querySelector('ar-tab[panel="b"]')!.getAttribute('aria-selected')).to.equal(
                'false',
            );
        });
    });

    // ── Panneau masqué ─────────────────────────────────────────────────────

    describe('panneau masqué', () => {
        it("le panel inactif a l'attribut hidden", async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <ar-tab-group>
                    <ar-tab panel="a">A</ar-tab>
                    <ar-tab panel="b">B</ar-tab>
                    <ar-tab-panel name="a">A</ar-tab-panel>
                    <ar-tab-panel name="b">B</ar-tab-panel>
                </ar-tab-group>
            `);
            const el = wrapper.querySelector<ArTabGroup>('ar-tab-group')!;
            expect(el.querySelector('ar-tab-panel[name="b"]')!.hasAttribute('hidden')).to.equal(
                true,
            );
        });

        it("le panel actif n'a pas l'attribut hidden", async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <ar-tab-group>
                    <ar-tab panel="a">A</ar-tab>
                    <ar-tab-panel name="a">A</ar-tab-panel>
                </ar-tab-group>
            `);
            const el = wrapper.querySelector<ArTabGroup>('ar-tab-group')!;
            expect(el.querySelector('ar-tab-panel[name="a"]')!.hasAttribute('hidden')).to.equal(
                false,
            );
        });
    });

    // ── Roving tabindex ────────────────────────────────────────────────────

    describe('roving tabindex', () => {
        it('le tab actif a tabindex="0", les inactifs tabindex="-1"', async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <ar-tab-group>
                    <ar-tab panel="a">A</ar-tab>
                    <ar-tab panel="b">B</ar-tab>
                    <ar-tab-panel name="a">A</ar-tab-panel>
                    <ar-tab-panel name="b">B</ar-tab-panel>
                </ar-tab-group>
            `);
            const el = wrapper.querySelector<ArTabGroup>('ar-tab-group')!;
            expect(el.querySelector('ar-tab[panel="a"]')!.getAttribute('tabindex')).to.equal('0');
            expect(el.querySelector('ar-tab[panel="b"]')!.getAttribute('tabindex')).to.equal('-1');
        });
    });
});
```

- [ ] **Step 3 : Lancer les tests browser**

```bash
cd packages/core && npm run test:browser
```

Attendu : tous les tests browser passent.

- [ ] **Step 4 : Commit**

```bash
git add packages/core/src/components/tab-group/tab-group.browser.test.ts \
        packages/core/src/components/tab-group/tab-group.a11y.test.ts
git commit -m "test(tab-group): tests browser clavier, scroll-hints et accessibilité"
```

---

## Task 7 : Documentation MDX

**Files:**

- Modify: `apps/docs/src/content/components/ar-tab-group.mdx`
- Modify: `apps/docs/src/content/components/ar-tab.mdx`
- Modify: `apps/docs/src/content/components/ar-tab-panel.mdx`

- [ ] **Step 1 : Écrire ar-tab-group.mdx**

Remplacer `apps/docs/src/content/components/ar-tab-group.mdx` :

```mdx
---
tagName: ar-tab-group
title: Tab Group
description: Groupe d'onglets accessibles — pattern WAI-ARIA Tabs complet avec roving tabindex et gestion du scroll horizontal.
playgroundTemplate: default
variants:
    - name: default
      label: Par défaut
      description: Déclarer les onglets avec `<ar-tab panel="nom">` et les panneaux avec `<ar-tab-panel name="nom">`. L'association se fait par correspondance du nom.
      html: |
          <ar-tab-group>
              <ar-tab panel="intro">Introduction</ar-tab>
              <ar-tab panel="usage">Utilisation</ar-tab>
              <ar-tab panel="api">API</ar-tab>
              <ar-tab-panel name="intro">Contenu de l'onglet Introduction.</ar-tab-panel>
              <ar-tab-panel name="usage">Contenu de l'onglet Utilisation.</ar-tab-panel>
              <ar-tab-panel name="api">Contenu de l'onglet API.</ar-tab-panel>
          </ar-tab-group>
    - name: active
      label: Onglet initial
      description: Utilisez l'attribut `active` pour définir l'onglet ouvert par défaut.
      html: |
          <ar-tab-group active="usage">
              <ar-tab panel="intro">Introduction</ar-tab>
              <ar-tab panel="usage">Utilisation</ar-tab>
              <ar-tab panel="api">API</ar-tab>
              <ar-tab-panel name="intro">Introduction.</ar-tab-panel>
              <ar-tab-panel name="usage">Cet onglet est actif par défaut.</ar-tab-panel>
              <ar-tab-panel name="api">API.</ar-tab-panel>
          </ar-tab-group>
    - name: disabled
      label: Onglet désactivé
      description: L'attribut `disabled` sur un `<ar-tab>` rend l'onglet non sélectionnable et l'exclut de la navigation clavier.
      html: |
          <ar-tab-group>
              <ar-tab panel="a">Actif</ar-tab>
              <ar-tab panel="b" disabled>Désactivé</ar-tab>
              <ar-tab panel="c">Actif aussi</ar-tab>
              <ar-tab-panel name="a">Panel A.</ar-tab-panel>
              <ar-tab-panel name="b">Panel B (inaccessible).</ar-tab-panel>
              <ar-tab-panel name="c">Panel C.</ar-tab-panel>
          </ar-tab-group>
    - name: manual-activation
      label: Activation manuelle
      description: Avec `manual-activation`, les flèches déplacent le focus sans changer l'onglet actif — il faut appuyer sur Entrée ou Espace pour confirmer. Utile quand le contenu du panel est coûteux à charger.
      html: |
          <ar-tab-group manual-activation>
              <ar-tab panel="a">Tab A</ar-tab>
              <ar-tab panel="b">Tab B</ar-tab>
              <ar-tab panel="c">Tab C</ar-tab>
              <ar-tab-panel name="a">Panel A.</ar-tab-panel>
              <ar-tab-panel name="b">Panel B.</ar-tab-panel>
              <ar-tab-panel name="c">Panel C.</ar-tab-panel>
          </ar-tab-group>
    - name: scroll-hints
      label: Scroll hints
      description: L'attribut `scroll-hints` ajoute les classes `has-overflow-start` et `has-overflow-end` sur `part="nav"` quand du contenu est masqué de chaque côté. La demo ci-dessous utilise un `mask-image` CSS pour signaler l'overflow.
      html: |
          <style>
              .demo-scroll ar-tab-group::part(nav) {
                  --mask-start: linear-gradient(to right, transparent 0, black 3rem);
                  --mask-end: linear-gradient(to left, transparent 0, black 3rem);
                  mask-image: var(--mask-start-active, none), var(--mask-end-active, none);
              }
              .demo-scroll ar-tab-group::part(nav).has-overflow-start {
                  --mask-start-active: var(--mask-start);
              }
              .demo-scroll ar-tab-group::part(nav).has-overflow-end {
                  --mask-end-active: var(--mask-end);
              }
          </style>
          <div class="demo-scroll" style="max-width: 300px;">
              <ar-tab-group scroll-hints>
                  <ar-tab panel="a">Premier onglet</ar-tab>
                  <ar-tab panel="b">Deuxième onglet</ar-tab>
                  <ar-tab panel="c">Troisième onglet</ar-tab>
                  <ar-tab panel="d">Quatrième onglet</ar-tab>
                  <ar-tab-panel name="a">Panel A.</ar-tab-panel>
                  <ar-tab-panel name="b">Panel B.</ar-tab-panel>
                  <ar-tab-panel name="c">Panel C.</ar-tab-panel>
                  <ar-tab-panel name="d">Panel D.</ar-tab-panel>
              </ar-tab-group>
          </div>
---

import WcagRef from '../../components/WcagRef.astro';

## Accessibilité

### Pris en charge automatiquement

- Le tablist reçoit `role="tablist"`, chaque onglet `role="tab"` et chaque panneau `role="tabpanel"`.
- Les associations `aria-controls` (onglet → panneau) et `aria-labelledby` (panneau → onglet) sont calculées et posées automatiquement sur les hôtes en light DOM — les IDREF restent dans le même arbre et sont lisibles par les technologies d'assistance.
- <WcagRef
      criterion="2.1.1"
      summary="Keyboard : toutes les fonctionnalités doivent être accessibles au clavier."
  />
  : navigation ←/→ entre les onglets, `Home`/`End` pour le premier/dernier, `Tab` pour atteindre le
  panneau actif.
- L'onglet actif a `tabindex="0"`, les inactifs `tabindex="-1"` (roving tabindex).
- Les panneaux inactifs ont l'attribut `hidden` natif — exclus du flux de tabulation et invisibles aux lecteurs d'écran.

### Scroll horizontal et overflow

<WcagRef
    criterion="1.4.10"
    summary="Reflow : le contenu doit être accessible à 320px de large sans scroll horizontal."
/>

Le tablist utilise un scroll horizontal natif (`overflow-x: auto`). Les onglets restent toujours accessibles au clavier via les flèches (l'onglet actif est automatiquement ramené dans le viewport). Cette approche s'appuie sur l'exception WCAG 1.4.10 pour les éléments de navigation à mise en page bidimensionnelle.

**Recommandations pour votre design system :**

- Utilisez `scroll-hints` et branchez un `mask-image` CSS sur `.has-overflow-end` / `.has-overflow-start` pour signaler visuellement l'overflow aux utilisateurs souris (voir la variante _Scroll hints_).
- Si une scrollbar visible est souhaitée, stylez `ar-tab-group::part(nav)::-webkit-scrollbar` et `scrollbar-width`.

### À la charge de l'auteur

- **Nommer le tablist** : si la page contient plusieurs `ar-tab-group`, ajoutez l'attribut `label` sur chacun — il devient l'`aria-label` du tablist, permettant aux lecteurs d'écran de les distinguer.
- **Libellés des onglets** : le texte visible de l'onglet est son nom accessible. Évitez les onglets avec des icônes seules sans texte alternatif (`aria-label` sur `ar-tab`).
```

- [ ] **Step 2 : Mettre à jour ar-tab.mdx**

Remplacer `apps/docs/src/content/components/ar-tab.mdx` :

```mdx
---
tagName: ar-tab
title: Tab
description: Onglet déclencheur pour ar-tab-group. Pose automatiquement role="tab", tabindex et aria-controls sur son hôte via le registry de ar-tab-group.
---

Sous-composant de [`ar-tab-group`](/components/ar-tab-group). À utiliser exclusivement comme enfant direct de `ar-tab-group`.
```

- [ ] **Step 3 : Mettre à jour ar-tab-panel.mdx**

Remplacer `apps/docs/src/content/components/ar-tab-panel.mdx` :

```mdx
---
tagName: ar-tab-panel
title: Tab Panel
description: Panneau de contenu pour ar-tab-group. Pose automatiquement role="tabpanel", tabindex et aria-labelledby sur son hôte via le registry de ar-tab-group.
---

Sous-composant de [`ar-tab-group`](/components/ar-tab-group). À utiliser exclusivement comme enfant direct de `ar-tab-group`.
```

- [ ] **Step 4 : Vérifier la compilation du site de documentation**

```bash
cd apps/docs && npm run build 2>&1 | tail -20
```

Attendu : build sans erreur.

- [ ] **Step 5 : Commit**

```bash
git add apps/docs/src/content/components/ar-tab-group.mdx \
        apps/docs/src/content/components/ar-tab.mdx \
        apps/docs/src/content/components/ar-tab-panel.mdx
git commit -m "docs(tab-group): documentation MDX — variantes, accessibilité, scroll"
```

---

## Task 8 : Branche et PR

- [ ] **Step 1 : Vérifier que tous les tests passent**

```bash
npm run test:all
```

Attendu : tous les tests Vitest + WTR passent.

- [ ] **Step 2 : Vérifier les exports dans index.ts**

```bash
grep -n 'ArTab\|ArTabGroup\|ArTabPanel' packages/core/src/index.ts
```

Attendu : les trois classes sont exportées.

- [ ] **Step 3 : Pousser la branche**

```bash
git push -u origin feat/ar-tab-group
```

- [ ] **Step 4 : Créer la PR vers dev**

```bash
gh pr create \
  --base dev \
  --title "feat(tab-group): ar-tab-group, ar-tab, ar-tab-panel — WAI-ARIA Tabs" \
  --body "$(cat <<'EOF'
## Summary

- Implémente le pattern WAI-ARIA Tabs complet via trois éléments : `ar-tab-group`, `ar-tab`, `ar-tab-panel`
- Communication via `@lit/context` registry — ARIA (role, IDs, aria-controls, aria-labelledby) posé sur les hôtes light DOM
- Roving tabindex, navigation clavier ←/→ Home/End, activation automatique et manuelle (`manual-activation`)
- Scroll horizontal avec `scrollIntoView` + mécanisme `scroll-hints` (classes CSS dynamiques)

## Test plan

- [ ] `npm run test` — tous les tests Vitest passent
- [ ] `npm run test:all` — tests WTR browser + a11y passent
- [ ] Tester manuellement la navigation clavier dans le navigateur
- [ ] Vérifier la démo scroll-hints dans la doc

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
