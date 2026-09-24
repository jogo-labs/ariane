# ar-charcounter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implémenter `ar-charcounter`, composant standalone qui observe un champ texte via `for="id"` et affiche le décompte de caractères restants avec 3 états (normal / warning / error) et hooks CSS externes.

**Architecture:** Composant LitElement headless sans wrapper — même pattern `for` qu'`ar-tooltip`. État calculé en interne (`_state`) réfléchi comme attribut sur le host pour le ciblage CSS. Effets de bord sur les éléments liés (`data-ar-char-state`) au lieu d'ARIA directement, laissant `aria-invalid` au consumer.

**Tech Stack:** Lit 3, TypeScript, Vitest (happy-dom), WTR (@open-wc/testing), `announceA11y`, `warn`.

**Spec:** `docs/superpowers/specs/2026-06-10-ar-charcounter-design.md`

---

## Fichiers

| Action               | Chemin                                                              |
| -------------------- | ------------------------------------------------------------------- |
| Créé par scaffold    | `packages/core/src/components/charcounter/charcounter.ts`           |
| Créé par scaffold    | `packages/core/src/components/charcounter/charcounter.styles.ts`    |
| Créé par scaffold    | `packages/core/src/components/charcounter/charcounter.test.ts`      |
| Créé par scaffold    | `apps/docs/src/content/components/ar-charcounter.mdx`               |
| Créé manuellement    | `packages/core/src/components/charcounter/charcounter.a11y.test.ts` |
| Modifié par scaffold | `packages/core/src/index.ts`                                        |
| Modifié manuellement | `packages/core/src/index.ts` (ajout export type)                    |
| Modifié manuellement | `apps/docs/src/themes/default.css`                                  |

---

## Task 0 : Création de la branche

**Files:** aucun

- [ ] **Step 1 : Créer la branche depuis `dev`**

```bash
git checkout dev && git pull && git checkout -b feat/ar-charcounter
```

Expected: branche `feat/ar-charcounter` active, propre.

---

## Task 1 : Scaffold

**Files:**

- Create: `packages/core/src/components/charcounter/` (via script)
- Modify: `packages/core/src/index.ts` (via script)

- [ ] **Step 1 : Lancer le scaffold**

```bash
cd /path/to/ariane && npm run create ar-charcounter
```

Expected output: fichiers créés dans `packages/core/src/components/charcounter/` et export ajouté dans `index.ts`.

- [ ] **Step 2 : Vérifier les fichiers générés**

```bash
ls packages/core/src/components/charcounter/
```

Expected: `charcounter.ts`, `charcounter.styles.ts`, `charcounter.test.ts`

- [ ] **Step 3 : Vérifier l'export dans index.ts**

```bash
grep 'charcounter' packages/core/src/index.ts
```

Expected: une ligne `export { ArCharcounter } from './components/charcounter/charcounter.js';`

---

## Task 2 : Styles headless

**Files:**

- Modify: `packages/core/src/components/charcounter/charcounter.styles.ts`

- [ ] **Step 1 : Remplacer le contenu du fichier styles**

```typescript
import { css } from 'lit';

export default css`
    :host {
        display: inline-block;
    }

    slot[name='icon-warning'],
    slot[name='icon-error'] {
        display: none;
    }

    :host([state='warning']) slot[name='icon-warning'] {
        display: contents;
    }

    :host([state='error']) slot[name='icon-error'] {
        display: contents;
    }
`;
```

- [ ] **Step 2 : Commit**

```bash
git add packages/core/src/components/charcounter/charcounter.styles.ts
git commit -m "feat(charcounter): styles headless — visibilité slots icônes"
```

---

## Task 3 : Propriétés, rendu de base, warn si max absent (TDD)

**Files:**

- Modify: `packages/core/src/components/charcounter/charcounter.test.ts`
- Modify: `packages/core/src/components/charcounter/charcounter.ts`

- [ ] **Step 1 : Écrire les tests (remplacer le contenu scaffoldé)**

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, waitForUpdate, getPart } from '../../test-utils.js';
import type { ArCharcounter } from './charcounter.js';
import './charcounter.js';

describe('ArCharcounter', () => {
    let el: ArCharcounter;
    afterEach(() => {
        el?.remove();
        document.body.innerHTML = '';
    });

    // ── Valeurs par défaut ────────────────────────────────────────────────

    describe('valeurs par défaut', () => {
        beforeEach(async () => {
            document.body.innerHTML = '<textarea id="f"></textarea>';
            el = await fixture('<ar-charcounter for="f" max="200"></ar-charcounter>');
        });

        it('warnThreshold vaut 20', () => expect(el.warnThreshold).toBe(20));
        it('label vaut "restants"', () => expect(el.label).toBe('restants'));
        it('state vaut "normal"', () => expect(el.state).toBe('normal'));
        it('state="normal" est réfléchi comme attribut', () =>
            expect(el.getAttribute('state')).toBe('normal'));
    });

    // ── Reflection des attributs ──────────────────────────────────────────

    describe('reflect', () => {
        it('lit warnThreshold depuis warn-threshold', async () => {
            document.body.innerHTML = '<textarea id="f"></textarea>';
            el = await fixture(
                '<ar-charcounter for="f" max="200" warn-threshold="30"></ar-charcounter>',
            );
            expect(el.warnThreshold).toBe(30);
        });

        it("lit label depuis l'attribut", async () => {
            document.body.innerHTML = '<textarea id="f"></textarea>';
            el = await fixture(
                '<ar-charcounter for="f" max="200" label="remaining"></ar-charcounter>',
            );
            expect(el.label).toBe('remaining');
        });
    });

    // ── Rendu shadow DOM ──────────────────────────────────────────────────

    describe('rendu shadow DOM', () => {
        beforeEach(async () => {
            document.body.innerHTML = '<textarea id="f"></textarea>';
            el = await fixture('<ar-charcounter for="f" max="200"></ar-charcounter>');
        });

        it('contient part="container"', () => expect(getPart(el, 'container')).not.toBeNull());
        it('contient part="count"', () => expect(getPart(el, 'count')).not.toBeNull());
        it('contient part="remaining"', () => expect(getPart(el, 'remaining')).not.toBeNull());
        it('contient part="label"', () => expect(getPart(el, 'label')).not.toBeNull());
        it('affiche "200 restants" au départ (champ vide)', () => {
            expect(getPart(el, 'remaining')?.textContent?.trim()).toBe('200');
            expect(getPart(el, 'label')?.textContent?.trim()).toBe('restants');
        });
    });

    // ── warn() si max absent ──────────────────────────────────────────────

    describe('warn() si max absent', () => {
        it("émet un warn si max n'est pas fourni", async () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            document.body.innerHTML = '<textarea id="f"></textarea>';
            el = await fixture('<ar-charcounter for="f"></ar-charcounter>');
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('max'));
            spy.mockRestore();
        });

        it('ne rend rien si max est absent', async () => {
            vi.spyOn(console, 'warn').mockImplementation(() => {});
            document.body.innerHTML = '<textarea id="f"></textarea>';
            el = await fixture('<ar-charcounter for="f"></ar-charcounter>');
            expect(getPart(el, 'container')).toBeNull();
            vi.restoreAllMocks();
        });
    });

    // ── warn() si for invalide ────────────────────────────────────────────

    describe('warn() si for invalide', () => {
        it("émet un warn si l'id est introuvable", async () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            el = await fixture('<ar-charcounter for="inexistant" max="100"></ar-charcounter>');
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('inexistant'));
            spy.mockRestore();
        });
    });
});
```

- [ ] **Step 2 : Lancer les tests — vérifier qu'ils échouent**

```bash
npm run test -- --reporter=verbose packages/core/src/components/charcounter/charcounter.test.ts
```

Expected: échecs sur les assertions (composant scaffoldé vide).

- [ ] **Step 3 : Écrire l'implémentation dans charcounter.ts**

```typescript
import { LitElement, html, nothing, type TemplateResult, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { warn } from '../../utils/warn.js';
import { announceA11y } from '../../a11y/announce-a11y.js';
import styles from './charcounter.styles.js';

export type CharcounterState = 'normal' | 'warning' | 'error';

/**
 * @summary Compteur de caractères restants pour un champ texte accessible.
 *
 * Observe un `<textarea>` ou `<input>` via `for="id"` et affiche le décompte.
 * Passe en état `warning` puis `error` quand la limite approche ou est dépassée.
 * Utiliser `aria-describedby` sur le champ pour lier le counter aux lecteurs d'écran.
 *
 * @slot icon-warning - Icône affichée en état warning.
 * @slot icon-error   - Icône affichée en état error.
 *
 * @csspart container - L'élément racine.
 * @csspart count     - Le bloc chiffre + label.
 * @csspart remaining - Le chiffre des caractères restants.
 * @csspart label     - Le texte après le chiffre (ex: "restants").
 *
 * @cssprop --ar-charcounter-color         - Couleur état normal.
 * @cssprop --ar-charcounter-warning-color - Couleur état warning.
 * @cssprop --ar-charcounter-error-color   - Couleur état error.
 */
@customElement('ar-charcounter')
export class ArCharcounter extends LitElement {
    static override styles = [styles];
    static readonly NAME = 'ArCharcounter';

    /** ID du champ observé. Requis. */
    @property({ reflect: true }) for = '';

    /** Limite de caractères. Requis — warn dev et rendu vide si absent. */
    @property({ type: Number }) max?: number | undefined;

    /** Pourcentage restant déclenchant l'état warning (défaut : 20). */
    @property({ attribute: 'warn-threshold', reflect: true, type: Number }) warnThreshold = 20;

    /** Texte affiché après le chiffre (défaut : "restants"). */
    @property({ reflect: true }) label = 'restants';

    @state() private _count = 0;
    @state() private _state: CharcounterState = 'normal';

    private _field: (HTMLInputElement | HTMLTextAreaElement) | null = null;

    /** État courant. Readonly — piloté par le composant. */
    get state(): CharcounterState {
        return this._state;
    }

    override connectedCallback(): void {
        super.connectedCallback();
        if (this.max === undefined) {
            warn('ar-charcounter', "l'attribut max est requis.");
        }
    }

    override firstUpdated(): void {
        this._attachField();
    }

    override updated(changed: PropertyValues<this>): void {
        if (changed.has('for')) {
            this._detachField();
            this._attachField();
        }
        this.setAttribute('state', this._state);
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        this._detachField();
    }

    private _attachField(): void {
        if (!this.for) return;
        const root = this.getRootNode();
        const field = (root as Document).getElementById(this.for) as
            | HTMLInputElement
            | HTMLTextAreaElement
            | null;
        if (!field) {
            warn('ar-charcounter', `Aucun élément trouvé avec l'id "${this.for}".`);
            return;
        }
        this._field = field;
        this._count = field.value.length;
        this._computeState();
        field.addEventListener('input', this._handleInput);
    }

    private _detachField(): void {
        if (!this._field) return;
        this._field.removeEventListener('input', this._handleInput);
        this._clearLinkedAttributes();
        this._field = null;
    }

    private readonly _handleInput = (): void => {
        if (!this._field) return;
        this._count = this._field.value.length;
        this._computeState();
    };

    private _computeState(): void {
        if (this.max === undefined) return;
        const remaining = this.max - this._count;
        const warnLimit = Math.floor((this.max * this.warnThreshold) / 100);
        const prevState = this._state;

        let nextState: CharcounterState;
        if (remaining < 0) {
            nextState = 'error';
        } else if (remaining <= warnLimit) {
            nextState = 'warning';
        } else {
            nextState = 'normal';
        }

        if (nextState !== prevState) {
            this._state = nextState;
            this._announceTransition(nextState, remaining);
            if (nextState === 'normal') {
                this._clearLinkedAttributes();
            } else {
                this._setLinkedAttributes(nextState);
            }
        }
    }

    private _announceTransition(state: CharcounterState, remaining: number): void {
        if (state === 'warning') {
            announceA11y(`${remaining} ${this.label}`, 'polite');
        } else if (state === 'error') {
            announceA11y('Limite dépassée', 'assertive');
        }
    }

    private _setLinkedAttributes(state: CharcounterState): void {
        if (!this._field) return;
        this._field.setAttribute('data-ar-char-state', state);
        for (const lbl of Array.from((this._field as HTMLInputElement).labels ?? [])) {
            lbl.setAttribute('data-ar-char-state', state);
        }
    }

    private _clearLinkedAttributes(): void {
        if (!this._field) return;
        this._field.removeAttribute('data-ar-char-state');
        for (const lbl of Array.from((this._field as HTMLInputElement).labels ?? [])) {
            lbl.removeAttribute('data-ar-char-state');
        }
    }

    override render(): TemplateResult | typeof nothing {
        if (this.max === undefined) return nothing;
        const remaining = this.max - this._count;
        return html`
            <span part="container">
                <slot name="icon-warning"></slot>
                <slot name="icon-error"></slot>
                <span part="count">
                    <span part="remaining">${remaining}</span>
                    <span part="label"> ${this.label}</span>
                </span>
            </span>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'ar-charcounter': ArCharcounter;
    }
}
```

- [ ] **Step 4 : Lancer les tests — vérifier qu'ils passent**

```bash
npm run test -- --reporter=verbose packages/core/src/components/charcounter/charcounter.test.ts
```

Expected: tous les tests de la Task 3 passent.

- [ ] **Step 5 : Commit**

```bash
git add packages/core/src/components/charcounter/charcounter.ts \
        packages/core/src/components/charcounter/charcounter.test.ts
git commit -m "feat(charcounter): props, rendu de base, warn si max absent"
```

---

## Task 4 : Observation du champ (TDD)

**Files:**

- Modify: `packages/core/src/components/charcounter/charcounter.test.ts`

L'implémentation est déjà présente dans Task 3. Cette tâche ajoute les tests manquants pour la logique d'observation.

- [ ] **Step 1 : Ajouter les tests d'observation au fichier de tests existant**

Ajouter après le dernier `describe` dans `charcounter.test.ts` :

```typescript
// ── Observation du champ ──────────────────────────────────────────────

describe('observation du champ', () => {
    it('lit la valeur initiale du champ', async () => {
        document.body.innerHTML = '<textarea id="f">bonjour</textarea>';
        el = await fixture('<ar-charcounter for="f" max="200"></ar-charcounter>');
        expect(getPart(el, 'remaining')?.textContent?.trim()).toBe('193');
    });

    it('met à jour le décompte à chaque event input', async () => {
        document.body.innerHTML = '<textarea id="f"></textarea>';
        el = await fixture('<ar-charcounter for="f" max="200"></ar-charcounter>');
        const field = document.getElementById('f') as HTMLTextAreaElement;
        field.value = 'hello';
        field.dispatchEvent(new Event('input'));
        await waitForUpdate(el);
        expect(getPart(el, 'remaining')?.textContent?.trim()).toBe('195');
    });

    it('retire le listener input au changement de for', async () => {
        document.body.innerHTML = '<textarea id="a"></textarea><textarea id="b"></textarea>';
        el = await fixture('<ar-charcounter for="a" max="100"></ar-charcounter>');
        el.for = 'b';
        await waitForUpdate(el);
        const fieldA = document.getElementById('a') as HTMLTextAreaElement;
        fieldA.value = 'xxx';
        fieldA.dispatchEvent(new Event('input'));
        await waitForUpdate(el);
        expect(getPart(el, 'remaining')?.textContent?.trim()).toBe('100');
    });

    it('observe le nouveau champ après changement de for', async () => {
        document.body.innerHTML = '<textarea id="a"></textarea><textarea id="b">abc</textarea>';
        el = await fixture('<ar-charcounter for="a" max="100"></ar-charcounter>');
        el.for = 'b';
        await waitForUpdate(el);
        expect(getPart(el, 'remaining')?.textContent?.trim()).toBe('97');
    });
});
```

- [ ] **Step 2 : Lancer les tests**

```bash
npm run test -- --reporter=verbose packages/core/src/components/charcounter/charcounter.test.ts
```

Expected: tous les tests passent.

- [ ] **Step 3 : Commit**

```bash
git add packages/core/src/components/charcounter/charcounter.test.ts
git commit -m "test(charcounter): observation du champ — input event, changement de for"
```

---

## Task 5 : Calcul d'état et hooks CSS externes (TDD)

**Files:**

- Modify: `packages/core/src/components/charcounter/charcounter.test.ts`

L'implémentation est dans Task 3. Cette tâche couvre les transitions d'état et `data-ar-char-state`.

- [ ] **Step 1 : Ajouter les tests d'état et de hooks CSS**

Ajouter après le dernier `describe` dans `charcounter.test.ts` :

```typescript
// ── Transitions d'état ────────────────────────────────────────────────

describe("transitions d'état", () => {
    async function setupWithCount(count: number, max = 200, threshold = 20) {
        document.body.innerHTML = `<textarea id="f">${'x'.repeat(count)}</textarea>`;
        const el = await fixture<ArCharcounter>(
            `<ar-charcounter for="f" max="${max}" warn-threshold="${threshold}"></ar-charcounter>`,
        );
        return el;
    }

    it('state="normal" quand remaining > seuil', async () => {
        el = await setupWithCount(0, 200, 20);
        expect(el.state).toBe('normal');
        expect(el.getAttribute('state')).toBe('normal');
    });

    it('state="warning" quand remaining ≤ seuil (20% de 200 = 40)', async () => {
        el = await setupWithCount(160, 200, 20);
        expect(el.state).toBe('warning');
        expect(el.getAttribute('state')).toBe('warning');
    });

    it('state="warning" exactement au seuil (remaining = 40)', async () => {
        el = await setupWithCount(160, 200, 20);
        expect(el.state).toBe('warning');
    });

    it('state="normal" quand remaining = 41 (juste au dessus du seuil)', async () => {
        el = await setupWithCount(159, 200, 20);
        expect(el.state).toBe('normal');
    });

    it('state="error" quand remaining < 0', async () => {
        el = await setupWithCount(201, 200, 20);
        expect(el.state).toBe('error');
        expect(el.getAttribute('state')).toBe('error');
    });

    it('affiche remaining négatif en état error', async () => {
        el = await setupWithCount(205, 200, 20);
        expect(getPart(el, 'remaining')?.textContent?.trim()).toBe('-5');
    });

    it('retour à normal depuis error après suppression de texte', async () => {
        document.body.innerHTML = '<textarea id="f"></textarea>';
        el = await fixture(
            '<ar-charcounter for="f" max="10" warn-threshold="20"></ar-charcounter>',
        );
        const field = document.getElementById('f') as HTMLTextAreaElement;
        field.value = 'xxxxxxxxxxxx';
        field.dispatchEvent(new Event('input'));
        await waitForUpdate(el);
        expect(el.state).toBe('error');
        field.value = 'hello';
        field.dispatchEvent(new Event('input'));
        await waitForUpdate(el);
        expect(el.state).toBe('normal');
    });
});

// ── data-ar-char-state sur le champ et le label ───────────────────────

describe('data-ar-char-state', () => {
    it('pose data-ar-char-state="warning" sur le textarea', async () => {
        document.body.innerHTML = '<textarea id="f"></textarea>';
        const el = await fixture<ArCharcounter>(
            '<ar-charcounter for="f" max="10" warn-threshold="20"></ar-charcounter>',
        );
        const field = document.getElementById('f') as HTMLTextAreaElement;
        field.value = 'xxxxxxxxxx';
        field.dispatchEvent(new Event('input'));
        await waitForUpdate(el);
        expect(field.getAttribute('data-ar-char-state')).toBe('warning');
        el.remove();
    });

    it('pose data-ar-char-state="error" sur le textarea', async () => {
        document.body.innerHTML = '<textarea id="f"></textarea>';
        const el = await fixture<ArCharcounter>(
            '<ar-charcounter for="f" max="5" warn-threshold="20"></ar-charcounter>',
        );
        const field = document.getElementById('f') as HTMLTextAreaElement;
        field.value = 'xxxxxx';
        field.dispatchEvent(new Event('input'));
        await waitForUpdate(el);
        expect(field.getAttribute('data-ar-char-state')).toBe('error');
        el.remove();
    });

    it('retire data-ar-char-state au retour à normal', async () => {
        document.body.innerHTML = '<textarea id="f"></textarea>';
        const el = await fixture<ArCharcounter>(
            '<ar-charcounter for="f" max="5" warn-threshold="20"></ar-charcounter>',
        );
        const field = document.getElementById('f') as HTMLTextAreaElement;
        field.value = 'xxxxxx';
        field.dispatchEvent(new Event('input'));
        await waitForUpdate(el);
        field.value = 'hi';
        field.dispatchEvent(new Event('input'));
        await waitForUpdate(el);
        expect(field.hasAttribute('data-ar-char-state')).toBe(false);
        el.remove();
    });

    it('retire data-ar-char-state au disconnectedCallback', async () => {
        document.body.innerHTML = '<textarea id="f"></textarea>';
        const el = await fixture<ArCharcounter>(
            '<ar-charcounter for="f" max="5" warn-threshold="20"></ar-charcounter>',
        );
        const field = document.getElementById('f') as HTMLTextAreaElement;
        field.value = 'xxxxxx';
        field.dispatchEvent(new Event('input'));
        await waitForUpdate(el);
        el.remove();
        expect(field.hasAttribute('data-ar-char-state')).toBe(false);
    });
});
```

- [ ] **Step 2 : Lancer les tests**

```bash
npm run test -- --reporter=verbose packages/core/src/components/charcounter/charcounter.test.ts
```

Expected: tous les tests passent.

- [ ] **Step 3 : Commit**

```bash
git add packages/core/src/components/charcounter/charcounter.test.ts
git commit -m "test(charcounter): transitions d'état et data-ar-char-state"
```

---

## Task 6 : Tests a11y browser (WTR)

**Files:**

- Create: `packages/core/src/components/charcounter/charcounter.a11y.test.ts`

- [ ] **Step 1 : Créer le fichier de tests browser**

```typescript
/// <reference types="mocha" />
import { fixture, html, expect } from '@open-wc/testing';
import type { ArCharcounter } from './charcounter.js';
import './charcounter.js';

describe('ar-charcounter — accessibilité', () => {
    // ── Audit axe ─────────────────────────────────────────────────────────

    describe('audit axe', () => {
        it('passe axe avec aria-describedby', async () => {
            const container = await fixture(html`
                <div>
                    <label for="field">Commentaire</label>
                    <textarea id="field" aria-describedby="counter"></textarea>
                    <ar-charcounter id="counter" for="field" max="200"></ar-charcounter>
                </div>
            `);
            await expect(container).to.be.accessible();
        });

        it('passe axe en état warning', async () => {
            const container = await fixture(html`
                <div>
                    <label for="field2">Commentaire</label>
                    <textarea id="field2" aria-describedby="counter2">${'x'.repeat(165)}</textarea>
                    <ar-charcounter id="counter2" for="field2" max="200"></ar-charcounter>
                </div>
            `);
            await expect(container).to.be.accessible();
        });
    });

    // ── Annonces SR ───────────────────────────────────────────────────────

    describe('announceA11y aux transitions', () => {
        it('annonce le seuil warning (polite)', async () => {
            const el = await fixture<ArCharcounter>(html`
                <div>
                    <textarea id="fa"></textarea>
                    <ar-charcounter for="fa" max="10" warn-threshold="20"></ar-charcounter>
                </div>
            `);
            const counter = el.querySelector<ArCharcounter>('ar-charcounter')!;
            const field = el.querySelector<HTMLTextAreaElement>('textarea')!;

            field.value = 'xxxxxxxxxx';
            field.dispatchEvent(new Event('input'));
            await counter.updateComplete;

            await new Promise((r) => setTimeout(r, 80));
            const region = document.getElementById('ar-live-region-polite');
            expect(region?.textContent?.trim()).to.equal('0 restants');
        });

        it('annonce "Limite dépassée" en assertive', async () => {
            const el = await fixture<ArCharcounter>(html`
                <div>
                    <textarea id="fb"></textarea>
                    <ar-charcounter for="fb" max="5" warn-threshold="0"></ar-charcounter>
                </div>
            `);
            const counter = el.querySelector<ArCharcounter>('ar-charcounter')!;
            const field = el.querySelector<HTMLTextAreaElement>('textarea')!;

            field.value = 'xxxxxx';
            field.dispatchEvent(new Event('input'));
            await counter.updateComplete;

            await new Promise((r) => setTimeout(r, 80));
            const region = document.getElementById('ar-live-region-assertive');
            expect(region?.textContent?.trim()).to.equal('Limite dépassée');
        });
    });

    // ── Parts shadow DOM ──────────────────────────────────────────────────

    describe('parts shadow DOM', () => {
        it('expose part="container"', async () => {
            const el = await fixture<ArCharcounter>(html`
                <div>
                    <textarea id="fc"></textarea>
                    <ar-charcounter for="fc" max="100"></ar-charcounter>
                </div>
            `);
            const counter = el.querySelector<ArCharcounter>('ar-charcounter')!;
            expect(counter.shadowRoot!.querySelector('[part="container"]')).to.not.equal(null);
        });
    });
});
```

- [ ] **Step 2 : Lancer les tests browser**

```bash
npm run test:all
```

Expected: tous les tests passent (Vitest + WTR).

- [ ] **Step 3 : Commit**

```bash
git add packages/core/src/components/charcounter/charcounter.a11y.test.ts
git commit -m "test(charcounter): tests browser axe + annonces SR"
```

---

## Task 7 : Export type + thème default.css

**Files:**

- Modify: `packages/core/src/index.ts`
- Modify: `apps/docs/src/themes/default.css`

- [ ] **Step 1 : Ajouter l'export du type CharcounterState dans index.ts**

Trouver la ligne `export { ArCharcounter }` ajoutée par le scaffold et ajouter en dessous :

```typescript
export type { CharcounterState } from './components/charcounter/charcounter.js';
```

- [ ] **Step 2 : Regénérer le manifest**

```bash
npm run build:manifest
```

Expected: `custom-elements.json` mis à jour avec `ar-charcounter`.

- [ ] **Step 3 : Ajouter les tokens dans default.css**

Dans `apps/docs/src/themes/default.css`, trouver le bloc des tokens `ar-table-sort` et ajouter après :

```css
/* ar-charcounter */
ar-charcounter::part(count) {
    color: var(--ar-charcounter-color, var(--ar-color-text-muted));
    font-size: 0.875rem;
}
ar-charcounter[state='warning']::part(count) {
    color: var(--ar-charcounter-warning-color, var(--ar-color-warning));
    font-weight: 600;
}
ar-charcounter[state='error']::part(count) {
    color: var(--ar-charcounter-error-color, var(--ar-color-error));
    font-weight: 700;
}
```

- [ ] **Step 4 : Commit**

```bash
git add packages/core/src/index.ts custom-elements.json apps/docs/src/themes/default.css
git commit -m "feat(charcounter): export type + tokens thème default.css"
```

---

## Task 8 : Page de documentation

**Files:**

- Modify: `apps/docs/src/content/components/ar-charcounter.mdx`

- [ ] **Step 1 : Remplacer le contenu scaffoldé du fichier MDX**

````mdx
---
tagName: ar-charcounter
title: Char Counter
description: Compteur de caractères restants pour un champ texte — décompte accessible avec états warning et error.
playgroundTemplate: default
variants:
    - name: default
      label: Par défaut
      description: |
          Liez `ar-charcounter` à un `<textarea>` via `for="id"`.
          Utilisez `aria-describedby` sur le champ pour que les lecteurs d'écran annoncent le décompte au focus.
      html: |
          <div style="display:flex;flex-direction:column;gap:0.5rem;max-width:400px;">
              <label for="cc-default">Commentaire</label>
              <textarea
                  id="cc-default"
                  aria-describedby="cc-default-counter"
                  style="resize:vertical;min-height:80px;"
              ></textarea>
              <ar-charcounter id="cc-default-counter" for="cc-default" max="200"></ar-charcounter>
          </div>
    - name: warning
      label: Seuil warning
      description: |
          `warn-threshold` définit le pourcentage restant à partir duquel l'état passe à `warning` (défaut : 20 %).
          Le composant pose `data-ar-char-state="warning"` sur le champ et son label pour permettre un style CSS ciblé.
      html: |
          <div style="display:flex;flex-direction:column;gap:0.5rem;max-width:400px;">
              <label for="cc-warn">Message court</label>
              <textarea
                  id="cc-warn"
                  aria-describedby="cc-warn-counter"
                  style="resize:vertical;min-height:80px;"
              >Un texte déjà assez long pour déclencher le warning ici !</textarea>
              <ar-charcounter
                  id="cc-warn-counter"
                  for="cc-warn"
                  max="60"
                  warn-threshold="30"
              ></ar-charcounter>
          </div>
    - name: icon
      label: Icône non-couleur
      description: |
          Fournir une icône via `slot="icon-warning"` et/ou `slot="icon-error"` pour satisfaire WCAG 1.4.1
          (la couleur seule ne suffit pas). L'icône est masquée en état normal.
      html: |
          <div style="display:flex;flex-direction:column;gap:0.5rem;max-width:400px;">
              <label for="cc-icon">Bio</label>
              <textarea
                  id="cc-icon"
                  aria-describedby="cc-icon-counter"
                  style="resize:vertical;min-height:80px;"
              ></textarea>
              <ar-charcounter id="cc-icon-counter" for="cc-icon" max="50" warn-threshold="20">
                  <span slot="icon-warning" aria-hidden="true" style="margin-right:.25rem;">⚠</span>
                  <span slot="icon-error"   aria-hidden="true" style="margin-right:.25rem;">✕</span>
              </ar-charcounter>
          </div>
    - name: label
      label: Label personnalisé
      description: L'attribut `label` surcharge le texte affiché après le chiffre — utile pour la localisation.
      html: |
          <div style="display:flex;flex-direction:column;gap:0.5rem;max-width:400px;">
              <label for="cc-label">Comment</label>
              <textarea id="cc-label" aria-describedby="cc-label-counter" style="resize:vertical;min-height:80px;"></textarea>
              <ar-charcounter id="cc-label-counter" for="cc-label" max="200" label="remaining"></ar-charcounter>
          </div>
---

import WcagRef from '../../components/WcagRef.astro';

## Accessibilité

### Pris en charge automatiquement

- Une région `aria-live="polite"` annonce le décompte à l'entrée en état **warning** (ex : _"40 restants"_).
- Une région `aria-live="assertive"` annonce _"Limite dépassée"_ à l'entrée en état **error**.
- `data-ar-char-state` est posé sur le champ lié **et** ses `<label>` associés à chaque changement d'état — retiré au retour à `normal` et au `disconnectedCallback`.
- Les slots `icon-warning` et `icon-error` sont masqués par le shadow DOM en état normal, visibles uniquement dans l'état correspondant.

Les critères WCAG suivants sont implémentés :

- Le décompte est disponible programmatiquement via `aria-describedby` (<WcagRef criterion="1.3.1" summary="Info and Relationships : le counter lié par aria-describedby encode l'information programmatiquement." />).
- Les slots d'icône permettent un signal non-couleur (<WcagRef criterion="1.4.1" summary="Use of Color : couleur non seul signal — slot icon-warning / icon-error disponibles." />).
- La région `aria-live` annonce les transitions sans déplacer le focus (<WcagRef criterion="4.1.3" summary="Status Messages : annonces warning et error via aria-live sans déplacement de focus." />).

### Pattern recommandé

```html
<label for="field">Commentaire</label>
<textarea id="field" aria-describedby="field-counter"></textarea>
<ar-charcounter id="field-counter" for="field" max="200"></ar-charcounter>
```
````

Le `aria-describedby` fait lire le contenu du counter au focus — le lecteur d'écran annoncera par exemple _"200 restants"_.

### `aria-invalid` — responsabilité du consumer

`ar-charcounter` ne pose pas `aria-invalid` automatiquement. Le poser pendant la frappe est désastreux pour les lecteurs d'écran (annonce répétée _"entrée non valide"_). Gérer sur `blur` ou `submit` :

```js
field.addEventListener('blur', () => {
    field.ariaInvalid = String(field.value.length > 200);
});
```

### WCAG 1.4.1 — icône dans le label

Pour les cas où l'icône doit apparaître dans le `<label>` plutôt que dans le counter, utiliser `data-ar-char-state` via CSS :

```html
<label for="field">
    Commentaire
    <svg class="warn-icon" style="display:none" aria-hidden="true">…</svg>
</label>
<ar-charcounter for="field" max="200"></ar-charcounter>
```

```css
label[data-ar-char-state='warning'] .warn-icon {
    display: inline;
}
```

````

- [ ] **Step 2 : Vérifier que le site de doc se compile**

```bash
npm run dev
````

Ouvrir `http://localhost:4321/components/ar-charcounter` dans le navigateur.
Vérifier : playground fonctionnel, 4 variantes visibles, section Accessibilité complète.

- [ ] **Step 3 : Commit**

```bash
git add apps/docs/src/content/components/ar-charcounter.mdx
git commit -m "docs(charcounter): page de documentation — playground, accessibilité, patterns"
```

---

## Vérification finale et PR

- [ ] **Lancer la suite complète**

```bash
npm run test:all
```

Expected: tous les tests Vitest + WTR passent.

- [ ] **Vérifier la couverture des exports**

```bash
grep 'charcounter\|CharCounter' packages/core/src/index.ts
```

Expected: `ArCharcounter` et `CharcounterState` tous les deux exportés.

- [ ] **Pousser la branche et ouvrir la PR vers `dev`**

```bash
git push -u origin feat/ar-charcounter
gh pr create \
  --base dev \
  --title "feat(charcounter): ar-charcounter — compteur de caractères accessible" \
  --body "$(cat <<'EOF'
## Summary

- Composant standalone `ar-charcounter` observant un champ via `for="id"` (pattern `ar-tooltip`)
- Décompte inversé avec 3 états : normal / warning / error
- Slots `icon-warning` / `icon-error` pour signal non-couleur (WCAG 1.4.1)
- `data-ar-char-state` posé sur le champ lié et ses labels pour CSS externe
- `announceA11y` aux transitions d'état uniquement (polite warning, assertive error)
- `warn()` dev si `max` absent ou `for` invalide
- Page de doc avec 4 variantes playground, section accessibilité complète

Closes #13 (partiel — roadmap composants v1)

## Test plan

- [ ] `npm run test:all` — tous les tests Vitest + WTR passent
- [ ] Playground doc fonctionnel sur `/components/ar-charcounter`
- [ ] Tester manuellement les 4 variantes dans le navigateur
- [ ] Vérifier les annonces SR avec VoiceOver (warning → error → retour)
- [ ] Vérifier `data-ar-char-state` dans les DevTools au passage des seuils

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
