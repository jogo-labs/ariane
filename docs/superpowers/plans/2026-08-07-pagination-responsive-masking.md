# Pagination — Masquage Responsive Progressif (#152) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le masquage responsive CSS binaire (`@media max-width: 640px`) d'`ar-pagination`
par un algorithme piloté par JS qui mesure la largeur réelle du composant (`ResizeObserver`) et
réduit progressivement le nombre de pages générées, avec un palier texte "Page X sur Y" en dessous
d'un plancher minimal.

**Architecture:** `_calculatePages(current, total, budget?)` (pagination.utils.ts) devient
paramétrable par un budget de slots numériques ; un `ResizeObserver` sur `[part="nav"]`
(pagination.ts) mesure la largeur disponible à chaque resize et calcule ce budget ; en dessous
d'un plancher (3 slots si `current` est en bord, 5 sinon), le composant bascule sur un rendu texte
plutôt que d'appeler `_calculatePages`. CSS : suppression de la media query, `flex-wrap: nowrap`.

**Tech Stack:** Lit 3, TypeScript, Vitest (unitaire), @web/test-runner + @open-wc/testing
(navigateur réel, Chromium).

## Global Constraints

- Prettier : 100 caractères, 4 espaces, guillemets simples.
- `import type` pour tous les imports de types.
- Conventional Commits (validé par commitlint/Husky).
- Composant headless : aucun fallback cosmétique `var(--token, valeur)` dans `pagination.styles.ts`
  pour un nouveau token — seuls les fallbacks structurels (0px, `2.5rem` déjà existant pour WCAG
  2.5.8) sont acceptables. Cette PR n'introduit pas de nouveau token CSS.
- Tout nouveau `@csspart` doit être documenté dans le JSDoc du composant.
- Branches `fix/<desc>` depuis `dev`, PR vers `dev`.

---

## Fichiers concernés

- `packages/core/src/components/pagination/pagination.utils.ts` — généralisation de
  `_calculatePages` avec paramètre `budget` optionnel.
- `packages/core/src/components/pagination/pagination.utils.test.ts` — **nouveau**, tests
  unitaires dédiés à `_calculatePages` (n'existait pas : la fonction n'était testée
  qu'indirectement via le rendu DOM).
- `packages/core/src/components/pagination/pagination.ts` — mesure `ResizeObserver`, état
  `_budget`, palier texte, JSDoc `@csspart`.
- `packages/core/src/components/pagination/pagination.styles.ts` — suppression de la media query,
  `flex-wrap: nowrap`.
- `packages/core/src/components/pagination/pagination.browser.test.ts` — tests WTR du
  comportement responsive réel.
- `apps/docs/src/content/components/ar-pagination.mdx` — mise à jour de la section
  "Comportement responsive".

---

### Task 1 : Branche + `_calculatePages(current, total, budget?)`

**Files:**

- Modify: `packages/core/src/components/pagination/pagination.utils.ts`
- Create: `packages/core/src/components/pagination/pagination.utils.test.ts`

**Interfaces:**

- Produces: `_calculatePages(current: number, total: number, budget?: number): number[]` — sans
  `budget` (ou `budget` ≥ `total`), comportement identique à l'existant (liste complète si
  `total < 10`, sinon jusqu'à 9 slots avec `siblingCount` de 2). Avec `budget` réduit, réduit
  `siblingCount` (2 → 1 → 0) jusqu'à tenir dans le budget, puis renvoie la représentation
  minimale (`[1, -1, current, -2, total]` ou variante bord) si aucune ne tient — c'est le
  **plancher algorithmique** de la fonction ; le composant (Task 3) doit éviter d'appeler la
  fonction en dessous de ce plancher et utiliser le palier texte à la place.
- Produces (inchangé) : `_clamp(value, min, max): number`.

- [ ] **Step 1 : Créer la branche de travail**

```bash
cd /Users/jon/Code/Active_projects/ariane
git checkout dev
git pull origin dev
git checkout -b fix/pagination-responsive-masking
```

- [ ] **Step 2 : Écrire les tests unitaires (doivent échouer)**

Remplacer entièrement `packages/core/src/components/pagination/pagination.utils.test.ts` (nouveau
fichier) par :

```typescript
import { describe, expect, it } from 'vitest';
import { _calculatePages, _clamp } from './pagination.utils.js';

describe('_calculatePages', () => {
    describe('sans budget (comportement existant inchangé)', () => {
        it('total < 10 : renvoie la liste complète', () => {
            expect(_calculatePages(3, 5)).toEqual([1, 2, 3, 4, 5]);
        });

        it('current proche du début : boundary + ellipsis de fin', () => {
            expect(_calculatePages(1, 15)).toEqual([1, 2, 3, 4, 5, 6, 7, -2, 15]);
            expect(_calculatePages(5, 15)).toEqual([1, 2, 3, 4, 5, 6, 7, -2, 15]);
        });

        it('current proche de la fin : ellipsis de début + boundary', () => {
            expect(_calculatePages(11, 15)).toEqual([1, -1, 9, 10, 11, 12, 13, 14, 15]);
            expect(_calculatePages(15, 15)).toEqual([1, -1, 9, 10, 11, 12, 13, 14, 15]);
        });

        it('current au milieu : deux ellipsis', () => {
            expect(_calculatePages(8, 15)).toEqual([1, -1, 6, 7, 8, 9, 10, -2, 15]);
        });
    });

    describe('avec budget suffisant pour le total', () => {
        it('renvoie la liste complète, comme sans budget', () => {
            expect(_calculatePages(3, 5, 5)).toEqual([1, 2, 3, 4, 5]);
            expect(_calculatePages(8, 15, 9)).toEqual([1, -1, 6, 7, 8, 9, 10, -2, 15]);
        });
    });

    describe('avec budget réduit : siblingCount décroissant', () => {
        it('budget=7 : siblingCount passe de 2 à 1', () => {
            expect(_calculatePages(8, 15, 7)).toEqual([1, -1, 7, 8, 9, -2, 15]);
        });

        it('budget=5 : siblingCount passe à 0', () => {
            expect(_calculatePages(8, 15, 5)).toEqual([1, -1, 8, -2, 15]);
        });

        it('budget tout juste suffisant pour siblingCount=1 (7 slots exactement)', () => {
            expect(_calculatePages(11, 15, 7)).toEqual([1, -1, 10, 11, 12, -2, 15]);
        });
    });

    describe('plancher : budget insuffisant même pour siblingCount=0', () => {
        it('current au bord (page 1) : représentation minimale à 3 slots', () => {
            expect(_calculatePages(1, 15, 3)).toEqual([1, -2, 15]);
        });

        it('current au bord (dernière page) : représentation minimale à 3 slots', () => {
            expect(_calculatePages(15, 15, 3)).toEqual([1, -1, 15]);
        });

        it('current au milieu : représentation minimale à 5 slots (plancher réel de la fonction)', () => {
            expect(_calculatePages(8, 15, 3)).toEqual([1, -1, 8, -2, 15]);
        });
    });

    describe('total < 10 avec budget très restreint (troncable aussi)', () => {
        it('current au bord : réduit à la représentation minimale', () => {
            expect(_calculatePages(1, 5, 3)).toEqual([1, -2, 5]);
        });

        it("budget partiellement restreint : tronque avant d'atteindre le plancher", () => {
            expect(_calculatePages(3, 5, 4)).toEqual([1, 3, 4, 5]);
        });
    });
});

describe('_clamp', () => {
    it('renvoie value si dans les bornes', () => {
        expect(_clamp(3, 1, 5)).toBe(3);
    });

    it('renvoie min si value < min', () => {
        expect(_clamp(-1, 1, 5)).toBe(1);
    });

    it('renvoie max si value > max', () => {
        expect(_clamp(10, 1, 5)).toBe(5);
    });
});
```

- [ ] **Step 3 : Lancer les tests, vérifier l'échec**

Run: `cd /Users/jon/Code/Active_projects/ariane && npx vitest run packages/core/src/components/pagination/pagination.utils.test.ts`
Expected: FAIL — `_calculatePages` n'accepte pas encore de 3ᵉ paramètre, les scénarios budgétés
ne matchent pas les valeurs attendues (le budget est actuellement ignoré).

- [ ] **Step 4 : Généraliser `_calculatePages`**

Remplacer entièrement le contenu de
`packages/core/src/components/pagination/pagination.utils.ts` par :

```typescript
/**
 * Renvoie la liste des pages à afficher suivant la position courante.
 *
 * Sans `budget` (ou `budget` suffisant pour afficher `total` pages), comportement inchangé.
 * Avec un `budget` réduit (nombre de slots numériques disponibles, ellipses incluses), réduit
 * progressivement le nombre de pages voisines autour de `current` (`siblingCount` : 2 → 1 → 0),
 * puis renvoie une représentation minimale (3 ou 5 slots) si aucune ne tient dans le budget —
 * c'est le plancher algorithmique de cette fonction ; en dessous, l'appelant doit utiliser un
 * autre mode de rendu plutôt que d'appeler cette fonction.
 *
 * @param current Page courante
 * @param total Nombre total de pages
 * @param budget Nombre maximal de slots numériques (pages + ellipses, hors prev/next).
 *   `undefined` = comportement historique (liste complète si `total < 10`, sinon 9 slots max).
 */
export function _calculatePages(current: number, total: number, budget?: number): number[] {
    // 9 = plafond historique (siblingCount 2, boundary 1 + 2 ellipses + 5 pages autour de current)
    // utilisé quand `budget` n'est pas fourni — préserve le comportement existant à l'identique.
    const DEFAULT_BUDGET = 9;
    const effectiveBudget = budget ?? DEFAULT_BUDGET;

    if (total <= effectiveBudget) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }

    for (const siblingCount of [2, 1, 0]) {
        const pages = _pagesWithSiblings(current, total, siblingCount);
        if (pages.length <= effectiveBudget) return pages;
    }

    return _minimalPages(current, total);
}

/**
 * Construit la liste [1, ...ellipsis/siblings..., total] pour un `siblingCount` donné : jusqu'à
 * `siblingCount` pages de chaque côté de `current`, avec ellipses (`-1`/`-2`) si la page 1 ou
 * `total` ne sont pas directement adjacentes à la plage affichée.
 */
function _pagesWithSiblings(current: number, total: number, siblingCount: number): number[] {
    // Nombre de pages affichées quand une ellipse est absorbée d'un côté (boundary incluse).
    const windowSize = 2 * siblingCount + 3;

    let left = Math.max(current - siblingCount, 2);
    let right = Math.min(current + siblingCount, total - 1);

    const showLeftEllipsis = left > 3;
    const showRightEllipsis = right < total - 2;

    if (!showLeftEllipsis) {
        left = 2;
        right = Math.min(windowSize, total - 1);
    }
    if (!showRightEllipsis) {
        right = total - 1;
        left = Math.max(total - windowSize + 1, 2);
    }

    const pages = [1];
    if (showLeftEllipsis) pages.push(-1);
    for (let p = left; p <= right; p++) pages.push(p);
    if (showRightEllipsis) pages.push(-2);
    pages.push(total);
    return pages;
}

/** Plancher algorithmique : boundary(s) + current, avec ellipses si nécessaire. 3 ou 5 slots. */
function _minimalPages(current: number, total: number): number[] {
    if (current <= 1) return [1, -2, total];
    if (current >= total) return [1, -1, total];
    return [1, -1, current, -2, total];
}

/**
 * Renvoie une valeur comprise dans un intervalle
 *
 * @param value Valeur retournée si comprise dans l'intervalle
 * @param min Valeur minimale retournée
 * @param max Valeur maximale retournée
 */
export function _clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}
```

- [ ] **Step 5 : Lancer les tests, vérifier le succès**

Run: `cd /Users/jon/Code/Active_projects/ariane && npx vitest run packages/core/src/components/pagination/pagination.utils.test.ts`
Expected: PASS — tous les tests de l'étape 2.

- [ ] **Step 6 : Lancer la suite complète du composant (non-régression)**

Run: `cd /Users/jon/Code/Active_projects/ariane && npx vitest run packages/core/src/components/pagination/pagination.test.ts`
Expected: PASS — `pagination.test.ts` appelle `_calculatePages` uniquement via le rendu (sans
budget), le comportement doit être strictement identique à avant.

- [ ] **Step 7 : Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add packages/core/src/components/pagination/pagination.utils.ts \
        packages/core/src/components/pagination/pagination.utils.test.ts
git commit -m "feat(pagination): ajoute un paramètre budget optionnel à _calculatePages"
```

---

### Task 2 : Mesure `ResizeObserver` et intégration du budget dans le rendu

**Files:**

- Modify: `packages/core/src/components/pagination/pagination.ts`

**Interfaces:**

- Consumes: `_calculatePages(current: number, total: number, budget?: number): number[]` (Task 1).
- Produces: état interne `_budget?: number` (non exposé publiquement) — consommé par Task 3 pour
  décider du palier texte.

- [ ] **Step 1 : Ajouter l'état `_budget`, la mesure et le nettoyage**

Dans `packages/core/src/components/pagination/pagination.ts`, modifier l'import Lit en haut du
fichier :

```typescript
import { LitElement, type TemplateResult, type CSSResultGroup, html } from 'lit';
import { property, state } from 'lit/decorators.js';
```

Ajouter les champs privés et le cycle de vie juste avant `override updated(...)` (après la
déclaration de `total`) :

```typescript
    @state() private _budget?: number;
    private _resizeObserver?: ResizeObserver;
    private _itemWidth = 0;

    override firstUpdated(): void {
        this._setupResizeObserver();
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        this._resizeObserver?.disconnect();
    }

    private _setupResizeObserver(): void {
        const nav = this.shadowRoot?.querySelector<HTMLElement>('[part="nav"]');
        if (!nav) return;
        this._resizeObserver = new ResizeObserver(() => this._recalculateBudget());
        this._resizeObserver.observe(nav);
    }

    private _recalculateBudget(): void {
        const nav = this.shadowRoot?.querySelector<HTMLElement>('[part="nav"]');
        const prev = this.shadowRoot?.querySelector<HTMLElement>('[part~="prev"]');
        const next = this.shadowRoot?.querySelector<HTMLElement>('[part~="next"]');
        const item = this.shadowRoot?.querySelector<HTMLElement>('[part~="link"], [part~="current"]');
        if (!nav || !prev || !next) return;

        if (!this._itemWidth && item) {
            this._itemWidth = item.getBoundingClientRect().width;
        }
        if (!this._itemWidth) return;

        const available =
            nav.getBoundingClientRect().width -
            prev.getBoundingClientRect().width -
            next.getBoundingClientRect().width;
        this._budget = Math.max(Math.floor(available / this._itemWidth), 0);
    }
```

Dans `override render()`, passer le budget à `_calculatePages` :

```typescript
                ${repeat(
                    _calculatePages(current, total, this._budget),
                    (page) => page,
```

- [ ] **Step 2 : Vérifier que les tests existants passent toujours (happy-dom sans vrai `ResizeObserver`)**

Run: `cd /Users/jon/Code/Active_projects/ariane && npx vitest run packages/core/src/components/pagination/`
Expected: PASS. `happy-dom` (environnement Vitest de ce projet) ne calcule pas de vrai layout :
`getBoundingClientRect().width` renvoie `0` pour tous les éléments, donc `_itemWidth` reste `0`
et `_recalculateBudget` retourne avant d'assigner `_budget` (garde `if (!this._itemWidth) return;`).
`_budget` reste `undefined`, donc `_calculatePages(current, total, undefined)` — comportement
historique, tests inchangés.

- [ ] **Step 3 : Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add packages/core/src/components/pagination/pagination.ts
git commit -m "feat(pagination): mesure la largeur disponible via ResizeObserver pour piloter le budget de pages"
```

---

### Task 3 : Palier texte "Page X sur Y" sous le plancher

**Files:**

- Modify: `packages/core/src/components/pagination/pagination.ts`

**Interfaces:**

- Consumes: état `_budget` (Task 2), `_calculatePages` (Task 1).
- Produces: nouveau `@csspart page-status` sur le `<li>` du palier texte.

- [ ] **Step 1 : Écrire le test (doit échouer)**

Ajouter dans `packages/core/src/components/pagination/pagination.test.ts`, dans le bloc
`describe('pages affichées', ...)` déjà existant, un nouveau `describe` juste après (avant la
fermeture du fichier, au même niveau que les autres `describe` de haut niveau) :

```typescript
// ── Palier texte (budget très restreint) ─────────────────────────────────

describe('palier texte sous le plancher', () => {
    it('bascule sur un texte "Page X sur Y" quand _budget est sous le plancher', async () => {
        el = await fixture('<ar-pagination current="3" total="15"></ar-pagination>');
        // @ts-expect-error accès à un champ privé pour simuler une mesure ResizeObserver
        el._budget = 2;
        el.requestUpdate();
        await waitForUpdate(el);

        const shadow = el.shadowRoot as ShadowRoot;
        const status = shadow.querySelector('[part~="page-status"]');
        expect(status).not.toBeNull();
        expect(status?.textContent?.trim()).toBe('Page 3 sur 15');
        expect(shadow.querySelectorAll('[part~="link"], [part~="current"]').length).toBe(0);
    });

    it('prev/next restent affichés et fonctionnels en palier texte', async () => {
        el = await fixture('<ar-pagination current="3" total="15"></ar-pagination>');
        // @ts-expect-error accès à un champ privé pour simuler une mesure ResizeObserver
        el._budget = 2;
        el.requestUpdate();
        await waitForUpdate(el);

        expect(getPart(el, 'prev')).not.toBeNull();
        expect(getPart(el, 'next')).not.toBeNull();
        (requirePart(el, 'next') as HTMLElement).click();
        await waitForUpdate(el);
        expect(el.current).toBe(4);
    });

    it('ne bascule pas en palier texte si _budget est au-dessus du plancher', async () => {
        el = await fixture('<ar-pagination current="8" total="15"></ar-pagination>');
        // @ts-expect-error accès à un champ privé pour simuler une mesure ResizeObserver
        el._budget = 5;
        el.requestUpdate();
        await waitForUpdate(el);

        const shadow = el.shadowRoot as ShadowRoot;
        expect(shadow.querySelector('[part~="page-status"]')).toBeNull();
    });
});
```

- [ ] **Step 2 : Lancer les tests, vérifier l'échec**

Run: `cd /Users/jon/Code/Active_projects/ariane && npx vitest run packages/core/src/components/pagination/pagination.test.ts`
Expected: FAIL — aucun `[part~="page-status"]` n'existe encore.

- [ ] **Step 3 : Implémenter le palier texte**

Dans `packages/core/src/components/pagination/pagination.ts`, modifier `override render()` :
remplacer le bloc `${repeat(...)}` par une condition sur le plancher. Le calcul du plancher et la
condition sont insérés juste après la déclaration de `nextPageNumber` :

```typescript
const nextPageNumber = _clamp(current + 1, 1, total);
const isEdgeCurrent = current <= 1 || current >= total;
const floorSlots = isEdgeCurrent ? 3 : 5;
const useTextMode = this._budget !== undefined && this._budget < floorSlots;
```

Puis remplacer :

```typescript
                ${repeat(
                    _calculatePages(current, total, this._budget),
                    (page) => page,
                    (page) => {
                        // -1 et -2 sont des sentinelles représentant les ellipses
                        return page === -1 || page === -2
                            ? html` <li part="item" aria-hidden="true">
                                  <span part="ellipsis">...</span>
                              </li>`
                            : this.renderPage(page, page === current);
                    },
                )}
```

par :

```typescript
                ${useTextMode
                    ? html`<li part="item page-status">
                          <span class="sr-only">Page&nbsp;</span>${current}
                          <span aria-hidden="true">&nbsp;sur&nbsp;</span>${total}
                      </li>`
                    : repeat(
                          _calculatePages(current, total, this._budget),
                          (page) => page,
                          (page) => {
                              // -1 et -2 sont des sentinelles représentant les ellipses
                              return page === -1 || page === -2
                                  ? html` <li part="item" aria-hidden="true">
                                        <span part="ellipsis">...</span>
                                    </li>`
                                  : this.renderPage(page, page === current);
                          },
                      )}
```

Ajouter l'entrée JSDoc `@csspart` (dans le bloc de commentaire au-dessus de `export class
ArPagination`, à côté des autres `@csspart`) :

```typescript
 * @csspart page-status - Le `<li>` du texte "Page X sur Y" affiché à la place de la liste de
 *   pages quand l'espace disponible ne permet plus d'afficher de numéros (palier minimal).
```

- [ ] **Step 4 : Lancer les tests, vérifier le succès**

Run: `cd /Users/jon/Code/Active_projects/ariane && npx vitest run packages/core/src/components/pagination/pagination.test.ts`
Expected: PASS.

- [ ] **Step 5 : Lancer toute la suite Vitest (non-régression globale)**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run test`
Expected: PASS.

- [ ] **Step 6 : Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add packages/core/src/components/pagination/pagination.ts \
        packages/core/src/components/pagination/pagination.test.ts
git commit -m "feat(pagination): ajoute un palier texte 'Page X sur Y' sous le plancher de budget"
```

---

### Task 4 : CSS — suppression de la media query, `flex-wrap: nowrap`

**Files:**

- Modify: `packages/core/src/components/pagination/pagination.styles.ts`

**Interfaces:**

- Consumes: rien de nouveau — s'appuie sur le fait que Task 2/3 garantissent que ce qui est rendu
  tient toujours dans la largeur disponible.

- [ ] **Step 1 : Modifier les styles**

Dans `packages/core/src/components/pagination/pagination.styles.ts` :

1. Remplacer `flex-wrap: wrap;` par `flex-wrap: nowrap;` dans la règle `[part='list']`.
2. Supprimer entièrement le bloc `@media screen and (max-width: 640px) { ... }` en fin de fichier.

Résultat attendu pour ces deux zones :

```typescript
    [part='list'] {
        display: flex;
        flex-wrap: nowrap;
        justify-content: center;
        padding-inline-start: 0;
        margin-bottom: 0;
        list-style: none;
    }
```

```typescript
    [part~='nav-btn--disabled'] {
        cursor: not-allowed;
    }
`;
```

(le fichier se termine directement après `[part~='nav-btn--disabled']`, sans media query).

- [ ] **Step 2 : Lancer la suite Vitest du composant**

Run: `cd /Users/jon/Code/Active_projects/ariane && npx vitest run packages/core/src/components/pagination/`
Expected: PASS — happy-dom n'évalue pas le CSS réel, ce changement ne casse aucun test Vitest.

- [ ] **Step 3 : Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add packages/core/src/components/pagination/pagination.styles.ts
git commit -m "fix(pagination): retire la media query de masquage, le budget JS pilote désormais le contenu"
```

---

### Task 5 : Tests navigateur (WTR) du comportement responsive réel

**Files:**

- Modify: `packages/core/src/components/pagination/pagination.browser.test.ts`

**Interfaces:**

- Consumes : comportement complet de Task 2/3/4 (mesure réelle `ResizeObserver` + rendu +
  `flex-wrap: nowrap`). Un `ResizeObserver` mocké en Vitest classique ne reflète pas le
  comportement réel du navigateur (cf. spec) — ces scénarios sont donc exclusivement en WTR.

- [ ] **Step 1 : Ajouter les tests responsive**

Ajouter dans `packages/core/src/components/pagination/pagination.browser.test.ts`, un nouveau
`describe` après celui de `'propriétés logiques (RTL)'` :

```typescript
describe('masquage responsive progressif (#152)', () => {
    async function waitForResize(): Promise<void> {
        // Laisse le temps au ResizeObserver de déclencher son callback et à Lit de re-render.
        await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
        await new Promise((resolve) => setTimeout(resolve, 50));
    }

    it('affiche la liste complète des numéros dans un conteneur large', async () => {
        const wrapper = await fixture(
            html`<div style="width: 900px;">
                <ar-pagination current="8" total="15"></ar-pagination>
            </div>`,
        );
        const el = wrapper.querySelector('ar-pagination') as HTMLElement;
        await elementUpdated(el);
        await waitForResize();

        const shadow = el.shadowRoot as ShadowRoot;
        expect(shadow.querySelectorAll('[part~="link"], [part~="current"]').length).to.equal(8);
    });

    it('réduit le nombre de pages affichées quand le conteneur est rétréci', async () => {
        const wrapper = await fixture(
            html`<div style="width: 900px;">
                <ar-pagination current="8" total="15"></ar-pagination>
            </div>`,
        );
        const el = wrapper.querySelector('ar-pagination') as HTMLElement;
        await elementUpdated(el);
        await waitForResize();

        wrapper.style.width = '260px';
        await waitForResize();

        const shadow = el.shadowRoot as ShadowRoot;
        const numericCount = shadow.querySelectorAll('[part~="link"], [part~="current"]').length;
        expect(numericCount).to.be.greaterThan(0);
        expect(numericCount).to.be.lessThan(8);
    });

    it('bascule sur le palier texte "Page X sur Y" à largeur extrême', async () => {
        const wrapper = await fixture(
            html`<div style="width: 900px;">
                <ar-pagination current="8" total="15"></ar-pagination>
            </div>`,
        );
        const el = wrapper.querySelector('ar-pagination') as HTMLElement;
        await elementUpdated(el);
        await waitForResize();

        wrapper.style.width = '90px';
        await waitForResize();

        const shadow = el.shadowRoot as ShadowRoot;
        const status = shadow.querySelector('[part~="page-status"]');
        expect(status).to.not.equal(null);
        expect(status?.textContent?.trim()).to.equal('Page 8 sur 15');
    });

    it('prev/next restent cliquables au palier texte', async () => {
        const wrapper = await fixture(
            html`<div style="width: 90px;">
                <ar-pagination current="8" total="15"></ar-pagination>
            </div>`,
        );
        const el = wrapper.querySelector('ar-pagination') as HTMLElement;
        await elementUpdated(el);
        await waitForResize();

        const shadow = el.shadowRoot as ShadowRoot;
        const next = shadow.querySelector('[part~="next"]') as HTMLElement;
        next.click();
        await elementUpdated(el);

        expect((el as unknown as { current: number }).current).to.equal(9);
    });

    it("[part='list'] ne wrap plus (flex-wrap: nowrap)", async () => {
        const el = await fixture(html`<ar-pagination current="1" total="5"></ar-pagination>`);
        const list = el.shadowRoot?.querySelector<HTMLElement>('[part="list"]');
        if (!list) throw new Error('[part="list"] introuvable');
        expect(getComputedStyle(list).flexWrap).to.equal('nowrap');
    });
});
```

- [ ] **Step 2 : Lancer les tests WTR**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run test:all`
Expected: PASS pour tous les nouveaux tests. Si un seuil de largeur ne produit pas le nombre de
pages attendu, ajuster la largeur du wrapper dans le test (la largeur exacte dépend de
`--ar-pagination-btn-size` du thème par défaut, pas d'une valeur figée dans le composant) plutôt
que le comportement du composant.

- [ ] **Step 3 : Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add packages/core/src/components/pagination/pagination.browser.test.ts
git commit -m "test(pagination): couvre le masquage responsive progressif en conditions réelles (WTR)"
```

---

### Task 6 : Documentation (apps/docs)

**Files:**

- Modify: `apps/docs/src/content/components/ar-pagination.mdx`

- [ ] **Step 1 : Mettre à jour la section "Comportement responsive"**

Dans `apps/docs/src/content/components/ar-pagination.mdx`, remplacer la section :

```markdown
## Comportement responsive

En dessous de **640px**, le composant réduit automatiquement le nombre de pages affichées :

- Seules les pages **précédente**, **active**, **suivante** et les deux voisines directes restent visibles.
- Les autres pages sont masquées — aucune configuration nécessaire.
```

par :

```markdown
## Comportement responsive

Le composant mesure sa propre largeur (pas celle du viewport) et réduit progressivement le
nombre de numéros affichés pour toujours tenir sur une ligne — aucune configuration nécessaire :

- **Largeur confortable** : tous les numéros de page, comme aujourd'hui.
- **Largeur réduite** : les pages voisines de la page active diminuent progressivement (jusqu'à
  ne plus afficher que la page active elle-même, entourée d'ellipses).
- **Largeur extrême** : les numéros de page sont remplacés par un texte "Page X sur Y". Les
  boutons précédent/suivant restent toujours affichés et fonctionnels.

Le composant peut être placé dans un conteneur étroit (ex. barre latérale) sur un écran large : le
comportement suit la largeur du conteneur, pas celle de l'écran.
```

- [ ] **Step 2 : Vérifier le rendu de la doc**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run build --workspace=packages/core && npm run dev --workspace=apps/docs`
Ouvrir `http://localhost:4321/components/ar-pagination` (ou le port affiché), vérifier que la
section "Comportement responsive" s'affiche correctement, puis arrêter le serveur (Ctrl+C).

- [ ] **Step 3 : Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add apps/docs/src/content/components/ar-pagination.mdx
git commit -m "docs(pagination): décrit le masquage responsive progressif par mesure de largeur"
```

---

### Task 7 : Ouvrir la PR

**Files:** aucun.

- [ ] **Step 1 : Vérification finale complète**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run test:all
```

Expected: PASS sur l'ensemble (Vitest + WTR).

- [ ] **Step 2 : Push et création de la PR**

```bash
cd /Users/jon/Code/Active_projects/ariane
git push -u origin fix/pagination-responsive-masking
gh pr create --base dev --title "fix(pagination): masquage responsive progressif piloté par la largeur du composant" --body "$(cat <<'EOF'
## Résumé

- Remplace la media query CSS binaire (`max-width: 640px`) par un algorithme JS qui mesure la
  largeur réelle du composant (`ResizeObserver`) et réduit progressivement le nombre de pages
  générées.
- `_calculatePages` accepte un paramètre `budget` optionnel (réduction `siblingCount` 2 → 1 → 0).
- En dessous d'un plancher minimal, bascule sur un texte "Page X sur Y" (prev/next toujours
  affichés et fonctionnels).
- `[part='list']` passe de `flex-wrap: wrap` à `nowrap`.

Closes #152

## Test plan

- [x] Tests unitaires `_calculatePages` (tous les paliers de budget)
- [x] Tests Vitest du palier texte
- [x] Tests WTR du comportement responsive réel (redimensionnement de conteneur)
- [x] `npm run test:all`
EOF
)"
```

- [ ] **Step 3 : Partager le lien de la PR**

Communiquer l'URL renvoyée par `gh pr create` à l'utilisateur·rice.
