# Mode compact `ar-pagination` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un attribut booléen `compact` à `ar-pagination` qui remplace la numérotation par
un simple prev/next + label de position (`Page X / Y`), rendu identique en mobile et desktop, sans
bascule responsive.

**Architecture:** Extension du composant `ArPagination` existant (`packages/core/src/components/pagination/pagination.ts`).
Le mode compact court-circuite entièrement le `ResizeObserver`/calcul de budget existant (utilisé
par le repli automatique en `<select>`, comportement par défaut inchangé) et bifurque tôt dans
`render()` vers un template dédié réutilisant le squelette DOM et les `csspart` `prev`/`next`
existants.

**Tech Stack:** Lit 3, TypeScript, Vitest (unit, happy-dom), @web/test-runner + axe-core (browser/a11y), Astro/MDX (docs).

## Global Constraints

- Prettier : 100 caractères, 4 espaces, guillemets simples.
- `import type` pour tout import de type.
- Conventional Commits (commitlint + Husky) pour chaque commit.
- Composant headless : aucun fallback cosmétique `var(--token)` dans `pagination.styles.ts` —
  toute valeur de design va dans `packages/core/src/styles/themes/default.css`.
- Nouveau token `--ar-*` custom property : uniquement si consommé via `var()` dans
  `pagination.styles.ts` (sinon ce n'est pas un `@cssprop`, cf. décision spec — pas de nouveau
  token ici, `::part(label)` est stylé directement dans `default.css`).
- Branche créée depuis `dev`, nommage `feat/<desc>` ; PR vers `dev`, jamais de push direct sur `main`.
- Design de référence : `docs/superpowers/specs/2026-08-12-pagination-compact-mode-design.md`
  (issue [#180](https://github.com/jogo-labs/ariane/issues/180)).

---

## Task 1: Créer la branche de travail

**Files:** aucun.

- [ ] **Step 1: Créer et checkout la branche depuis `dev`**

```bash
cd /Users/jon/Code/Active_projects/ariane
git checkout dev
git pull origin dev
git checkout -b feat/pagination-compact-mode
```

---

## Task 2: Propriété `compact` + court-circuit du cycle de vie `ResizeObserver`

**Files:**

- Modify: `packages/core/src/components/pagination/pagination.ts`
- Test: `packages/core/src/components/pagination/pagination.test.ts`

**Interfaces:**

- Produces: `ArPagination.compact: boolean` (propriété réactive, reflétée, défaut `false`).
  Toute la logique de rendu de la Task 3 lit cette propriété via `this.compact`.

Cette tâche ne touche pas encore `render()` — uniquement la propriété et le cycle de vie
(`connectedCallback`, `firstUpdated`, `updated`). Le rendu visuel du mode compact arrive en Task 3 ;
tant qu'il n'existe pas, `compact=true` désactive juste le `ResizeObserver` sans changer l'affichage
(non testé ici, couvert par les tests de Task 3).

- [ ] **Step 1: Écrire les tests unitaires du cycle de vie (échouent, `compact` n'existe pas encore)**

Dans `packages/core/src/components/pagination/pagination.test.ts`, ajouter un nouveau `describe`
juste avant `describe("part d'état item--current", ...)` (ligne ~435) :

```typescript
// ── Mode compact — cycle de vie ResizeObserver ──────────────────────────

describe('mode compact — cycle de vie ResizeObserver', () => {
    it('compact vaut false par défaut', async () => {
        el = await fixture('<ar-pagination></ar-pagination>');
        expect(el.compact).toBe(false);
    });

    it('reflète compact en attribut HTML', async () => {
        el = await fixture('<ar-pagination></ar-pagination>');
        el.compact = true;
        await waitForUpdate(el);
        expect(el.hasAttribute('compact')).toBe(true);
    });

    it('compact=false (défaut) : instancie un ResizeObserver au montage', async () => {
        el = await fixture('<ar-pagination></ar-pagination>');
        // @ts-expect-error accès à un champ privé pour vérifier l'instanciation du ResizeObserver
        expect(el._resizeObserver).toBeInstanceOf(ResizeObserver);
    });

    it("compact=true : n'instancie aucun ResizeObserver au montage", async () => {
        el = await fixture('<ar-pagination compact></ar-pagination>');
        // @ts-expect-error accès à un champ privé pour vérifier l'absence de ResizeObserver
        expect(el._resizeObserver).toBeUndefined();
    });

    it('passer compact de true à false attache le ResizeObserver', async () => {
        el = await fixture('<ar-pagination compact></ar-pagination>');
        // @ts-expect-error accès à un champ privé pour vérifier l'absence de ResizeObserver
        expect(el._resizeObserver).toBeUndefined();

        el.compact = false;
        await waitForUpdate(el);

        // @ts-expect-error accès à un champ privé pour vérifier l'instanciation du ResizeObserver
        expect(el._resizeObserver).toBeInstanceOf(ResizeObserver);
    });

    it('passer compact de false à true déconnecte le ResizeObserver existant', async () => {
        el = await fixture('<ar-pagination></ar-pagination>');
        // @ts-expect-error accès à un champ privé pour récupérer le ResizeObserver interne
        const observer = el._resizeObserver;
        expect(observer).toBeInstanceOf(ResizeObserver);
        const disconnectSpy = vi.spyOn(observer as ResizeObserver, 'disconnect');

        el.compact = true;
        await waitForUpdate(el);

        expect(disconnectSpy).toHaveBeenCalled();
        // @ts-expect-error accès à un champ privé pour vérifier la déconnexion
        expect(el._resizeObserver).toBeUndefined();
    });
});
```

Accès à un champ `private` depuis un test : `private` n'existe qu'au niveau TypeScript (effacé à la
compilation), donc rien n'empêche l'accès à l'exécution — seul le compilateur le refuserait sans
`@ts-expect-error`. C'est déjà la convention de ce fichier (`el._budget = 2` ailleurs dans
`pagination.test.ts`, avec le même commentaire) : chaque accès est précédé de son propre
`@ts-expect-error` plutôt que d'un cast global `as unknown as {...}` (ce dernier pattern existe dans
`pagination.a11y.test.ts`/`pagination.browser.test.ts`, mais pas dans ce fichier — on garde la
convention locale à chaque fichier de test, pas de mélange).

- [ ] **Step 2: Lancer les tests et vérifier qu'ils échouent**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run test --workspace=packages/core -- pagination.test.ts
```

Attendu : échecs sur `el.compact` (propriété inexistante — TypeScript refusera même la compilation
du test, ce qui est le signal d'échec attendu à ce stade).

- [ ] **Step 3: Ajouter la propriété `compact`**

Dans `pagination.ts`, juste après la propriété `total` (après la ligne `total: number = ArPagination.DEFAULT_TOTAL;`, avant `@state() private _budget?: number;`) :

```typescript
    /**
     * Mode compact : uniquement les boutons précédent/suivant et un label de position
     * ("Page X / Y"), navigation strictement séquentielle (pas de saut direct à une page).
     * @attr compact
     * @default false
     */
    @property({ reflect: true, type: Boolean })
    compact: boolean = false;

```

- [ ] **Step 4: Court-circuiter `connectedCallback` et `firstUpdated`**

Remplacer :

```typescript
    override connectedCallback(): void {
        super.connectedCallback();
        if (this._initialized) this._setupResizeObserver();
    }

    override firstUpdated(): void {
        this._initialized = true;
        this._setupResizeObserver();
        // Une police web chargée après le premier paint peut changer la largeur mesurée des
        // items (ex. police variable, chargement asynchrone) : force une remesure une fois
        // les polices prêtes. `document.fonts` est absent de certains environnements de test
        // (happy-dom) — garde défensive.
        if (document.fonts) {
            void document.fonts.ready.then(() => {
                this._needsRemeasure = true;
                this._recalculateBudget();
            });
        }
    }
```

par :

```typescript
    override connectedCallback(): void {
        super.connectedCallback();
        // `_initialized` reste faux ici au tout premier montage (le shadow DOM n'existe pas
        // encore, `_setupResizeObserver` ne trouverait pas `[part="nav"]`) — ce n'est donc PAS un
        // doublon avec l'appel dans `firstUpdated()` ci-dessous, qui gère ce premier montage une
        // fois le rendu initial fait. Cet appel-ci ne joue que lors d'une reconnexion ultérieure
        // (élément déplacé/réinséré dans le DOM après un premier montage), pour réattacher
        // l'observer que `disconnectedCallback` a démonté à la déconnexion précédente.
        if (this._initialized && !this.compact) this._setupResizeObserver();
    }

    override firstUpdated(): void {
        this._initialized = true;
        // Mode compact : pas de repli automatique en <select>, donc aucun besoin de mesurer la
        // largeur disponible — le ResizeObserver et la remesure liée aux polices web seraient un
        // travail pur perte, court-circuités entièrement ici.
        if (this.compact) return;
        this._setupResizeObserver();
        // Une police web chargée après le premier paint peut changer la largeur mesurée des
        // items (ex. police variable, chargement asynchrone) : force une remesure une fois
        // les polices prêtes. `document.fonts` est absent de certains environnements de test
        // (happy-dom) — garde défensive.
        if (document.fonts) {
            void document.fonts.ready.then(() => {
                this._needsRemeasure = true;
                this._recalculateBudget();
            });
        }
    }
```

- [ ] **Step 5: Gérer le toggle runtime et court-circuiter la remesure liée à `total` dans `updated()`**

Remplacer le début de `updated()` :

```typescript
    override updated(changed: Map<string, unknown>): void {
        if (changed.has('total') && this.total < 1) {
```

par :

```typescript
    override updated(changed: Map<string, unknown>): void {
        if (changed.has('compact')) {
            if (this.compact) {
                this._resizeObserver?.disconnect();
                this._resizeObserver = undefined;
            } else if (this._initialized) {
                this._setupResizeObserver();
            }
        }
        if (changed.has('total') && this.total < 1) {
```

Puis, dans le même `updated()`, remplacer :

```typescript
        if (changed.has('total')) {
            const digits = String(Math.max(this.total, 1)).length;
            if (this._prevTotalDigits && digits !== this._prevTotalDigits) {
```

par :

```typescript
        if (changed.has('total')) {
            const digits = String(Math.max(this.total, 1)).length;
            if (!this.compact && this._prevTotalDigits && digits !== this._prevTotalDigits) {
```

`!this.compact` en tête plutôt qu'en fin de condition : sort de la condition avant même d'évaluer
`_prevTotalDigits`/`digits`, cohérent avec l'intention (« en mode compact, toute cette logique de
remesure ne s'applique pas ») plutôt que de la laisser en dernière clause comme une restriction
accessoire.

(le reste du bloc — `this._needsRemeasure = true; this._recalculateBudget();` puis
`this._prevTotalDigits = digits;` — ne change pas.)

- [ ] **Step 6: Lancer les tests et vérifier qu'ils passent**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run test --workspace=packages/core -- pagination.test.ts
```

Attendu : tous les tests passent (les 6 nouveaux + les existants, non régressés).

- [ ] **Step 7: Lint et build TypeScript**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run lint --workspace=packages/core
npm run build:types --workspace=packages/core
```

- [ ] **Step 8: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add packages/core/src/components/pagination/pagination.ts packages/core/src/components/pagination/pagination.test.ts
git commit -m "feat(pagination): ajoute la propriété compact et court-circuite le ResizeObserver (#180)"
```

---

## Task 3: Rendu du mode compact (label + réordonnancement DOM)

**Files:**

- Modify: `packages/core/src/components/pagination/pagination.ts`
- Test: `packages/core/src/components/pagination/pagination.test.ts`

**Interfaces:**

- Consumes: `ArPagination.compact: boolean` (Task 2).
- Produces: nouveau `csspart` `page-label` (le `<li>` englobant) et `label` (le `<span>` interne),
  nouvelle méthode protégée `renderCompactLabel(current: number, total: number): TemplateResult`.

- [ ] **Step 1: Écrire les tests unitaires du rendu compact (échouent, aucun rendu dédié n'existe encore)**

Dans `pagination.test.ts`, ajouter un nouveau `describe` juste après le `describe('mode compact — cycle de vie ResizeObserver', ...)` ajouté en Task 2 :

```typescript
describe('mode compact — rendu', () => {
    it('rend le label "Page X / Y" avec part="label" et aria-hidden', async () => {
        el = await fixture('<ar-pagination compact current="3" total="12"></ar-pagination>');
        const label = requirePart(el, 'label');
        expect(label.textContent?.trim()).toBe('Page 3 / 12');
        expect(label.getAttribute('aria-hidden')).toBe('true');
    });

    it('le <li> englobant du label porte part="item page-label"', async () => {
        el = await fixture('<ar-pagination compact current="3" total="12"></ar-pagination>');
        const label = requirePart(el, 'label');
        const li = label.closest('[part~="page-label"]');
        expect(li?.getAttribute('part')).toBe('item page-label');
    });

    it('ordre DOM : label, prev, next', async () => {
        el = await fixture('<ar-pagination compact current="3" total="12"></ar-pagination>');
        const shadow = el.shadowRoot as ShadowRoot;
        const items = Array.from(shadow.querySelectorAll('[part~="item"]'));
        expect(items).toHaveLength(3);
        expect(items[0]?.getAttribute('part')).toBe('item page-label');
        expect(partContains(items[1] as Element, 'prev')).toBe(true);
        expect(partContains(items[2] as Element, 'next')).toBe(true);
    });

    it("n'affiche aucun numéro de page ni <select> de saut de page", async () => {
        el = await fixture('<ar-pagination compact current="3" total="12"></ar-pagination>');
        const shadow = el.shadowRoot as ShadowRoot;
        expect(shadow.querySelectorAll('[part~="link"], [part~="current"]').length).toBe(0);
        expect(shadow.querySelector('[part~="select"]')).toBeNull();
    });

    it('total=1 : label affiche "Page 1 / 1", prev et next désactivés', async () => {
        el = await fixture('<ar-pagination compact current="1" total="1"></ar-pagination>');
        expect(requirePart(el, 'label').textContent?.trim()).toBe('Page 1 / 1');
        expect(partContains(requirePart(el, 'prev'), 'nav-btn--disabled')).toBe(true);
        expect(partContains(requirePart(el, 'next'), 'nav-btn--disabled')).toBe(true);
    });

    it('prev désactivé en page 1, next actif', async () => {
        el = await fixture('<ar-pagination compact current="1" total="12"></ar-pagination>');
        expect(requirePart(el, 'prev').getAttribute('aria-disabled')).toBe('true');
        expect(requirePart(el, 'next').getAttribute('aria-disabled')).toBe('false');
    });

    it('next désactivé en dernière page, prev actif', async () => {
        el = await fixture('<ar-pagination compact current="12" total="12"></ar-pagination>');
        expect(requirePart(el, 'next').getAttribute('aria-disabled')).toBe('true');
        expect(requirePart(el, 'prev').getAttribute('aria-disabled')).toBe('false');
    });

    it('le label se met à jour après un changement de page confirmé', async () => {
        el = await fixture('<ar-pagination compact current="3" total="12"></ar-pagination>');
        el.addEventListener('ar-pagination-page-change', (e) => {
            el.current = (e as CustomEvent<ArPaginationPageChangeDetail>).detail.to;
        });
        (requirePart(el, 'next') as HTMLElement).click();
        await waitForUpdate(el);
        expect(requirePart(el, 'label').textContent?.trim()).toBe('Page 4 / 12');
    });

    it('prev/next émettent ar-pagination-page-change en mode compact ({from, to})', async () => {
        el = await fixture('<ar-pagination compact current="3" total="12"></ar-pagination>');
        const handler = vi.fn();
        el.addEventListener('ar-pagination-page-change', handler);
        (requirePart(el, 'next') as HTMLElement).click();
        await waitForUpdate(el);
        expect(handler).toHaveBeenCalledOnce();
        const detail = (handler.mock.calls[0][0] as CustomEvent<ArPaginationPageChangeDetail>)
            .detail;
        expect(detail).toEqual({ from: 3, to: 4 });
    });
});
```

- [ ] **Step 2: Lancer les tests et vérifier qu'ils échouent**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run test --workspace=packages/core -- pagination.test.ts
```

Attendu : échecs sur `requirePart(el, 'label')` (part introuvable — `Error: Part "label" not found`).

- [ ] **Step 3: Ajouter `nothing` à l'import `lit`**

Remplacer la première ligne de `pagination.ts` :

```typescript
import { LitElement, type TemplateResult, type CSSResultGroup, html } from 'lit';
```

par :

```typescript
import { LitElement, type TemplateResult, type CSSResultGroup, html, nothing } from 'lit';
```

- [ ] **Step 4: Ajouter les entrées JSDoc `@csspart page-label` et `@csspart label`**

Dans le bloc JSDoc de la classe `ArPagination`, juste après la ligne :

```typescript
 * @csspart select - L'élément `<select>` de saut de page. Personnalisable via `::part(select)`
 *   (apparence). Conserve l'apparence native du navigateur (flèche incluse) par défaut.
```

ajouter :

```typescript
 * @csspart page-label - Le `<li>` englobant le label de position en mode compact (`compact`),
 *   affiché à la place de la liste de pages. Sur le modèle de `page-select`.
 * @csspart label - Le `<span>` du label de position en mode compact ("Page X / Y"), non
 *   cliquable et masqué aux lecteurs d'écran (`aria-hidden`, l'information équivalente est déjà
 *   portée par le landmark et les `aria-label` prev/next). Personnalisable via `::part(label)`.
```

- [ ] **Step 5: Ajouter la méthode `renderCompactLabel`**

Juste après la méthode `renderPageSelect` (avant `private _onSelectChange`), ajouter :

```typescript
    /**
     * Génère le `<li>` du label de position en mode compact ("Page X / Y"), affiché avant
     * prev/next. `aria-hidden` sur le `<span>` : le `<p>` sr-only du landmark et les
     * `aria-label` "Page précédente"/"Page suivante" portent déjà l'information équivalente
     * pour le lecteur d'écran — sans ce marquage, le texte serait annoncé deux fois.
     */
    protected renderCompactLabel(current: number, total: number): TemplateResult {
        return html`<li part="item page-label">
            <span part="label" aria-hidden="true">Page ${current} / ${total}</span>
        </li>`;
    }

```

- [ ] **Step 6: Court-circuiter le calcul des pages et brancher `render()` sur le mode compact**

Remplacer :

```typescript
const floorSlots = 5;
// Calculé une seule fois : réutilisé pour la décision de mode ci-dessous ET pour le
// rendu des boutons numérotés (repeat) si on reste en mode boutons.
const pages = _calculatePages(current, total, this._budget);
```

par :

```typescript
const floorSlots = 5;
// Calculé une seule fois : réutilisé pour la décision de mode ci-dessous ET pour le
// rendu des boutons numérotés (repeat) si on reste en mode boutons. En mode compact,
// aucun numéro n'est jamais affiché — court-circuité à un tableau vide plutôt que de
// calculer une fenêtre de pages qui ne sera jamais rendue.
const pages = this.compact ? [] : _calculatePages(current, total, this._budget);
```

Puis remplacer :

```typescript
const useSelectMode =
    this._budget !== undefined && (this._budget < floorSlots || isMinimalWindowWithDoubleEllipsis);
```

par :

```typescript
const useSelectMode =
    !this.compact &&
    this._budget !== undefined &&
    (this._budget < floorSlots || isMinimalWindowWithDoubleEllipsis);
```

Enfin, remplacer le corps du `<ul>` :

```typescript
            <ul part="list" @click=${this._onPageChange}>
                <li part="item">
                    <a
                        part="prev nav-btn${isPreviousDisabled ? ' nav-btn--disabled' : ''}"
                        href="javascript:;"
                        aria-disabled=${isPreviousDisabled}
                        @click=${this._onPreviousPage}
                    >
                        <slot name="prev-icon">${this._defaultPrevIcon()}</slot>
                        <span class="sr-only"
                            >Page précédente (page ${previousPageNumber} sur ${total})</span
                        >
                    </a>
                </li>

                ${useSelectMode
                    ? this.renderPageSelect(current, total)
                    : repeat(
                          pages,
                          (page) => page,
                          (page) => {
                              // -1 et -2 sont des sentinelles représentant les ellipses
                              return page === -1 || page === -2
                                  ? html` <li part="item" aria-hidden="true">
                                        <span part="ellipsis">...</span>
                                    </li>`
                                  : this.renderPage(page, page === current, total);
                          },
                      )}

                <li part="item">
                    <a
                        part="next nav-btn${isNextDisabled ? ' nav-btn--disabled' : ''}"
                        href="javascript:;"
                        aria-disabled=${isNextDisabled}
                        @click=${this._onNextPage}
                    >
                        <slot name="next-icon">${this._defaultNextIcon()}</slot>
                        <span class="sr-only"
                            >Page suivante (page ${nextPageNumber} sur ${total})</span
                        >
                    </a>
                </li>
            </ul>
        </nav>`;
```

par :

```typescript
            <ul part="list" @click=${this._onPageChange}>
                ${this.compact ? this.renderCompactLabel(current, total) : nothing}

                <li part="item">
                    <a
                        part="prev nav-btn${isPreviousDisabled ? ' nav-btn--disabled' : ''}"
                        href="javascript:;"
                        aria-disabled=${isPreviousDisabled}
                        @click=${this._onPreviousPage}
                    >
                        <slot name="prev-icon">${this._defaultPrevIcon()}</slot>
                        <span class="sr-only"
                            >Page précédente (page ${previousPageNumber} sur ${total})</span
                        >
                    </a>
                </li>

                ${this.compact
                    ? nothing
                    : useSelectMode
                      ? this.renderPageSelect(current, total)
                      : repeat(
                            pages,
                            (page) => page,
                            (page) => {
                                // -1 et -2 sont des sentinelles représentant les ellipses
                                return page === -1 || page === -2
                                    ? html` <li part="item" aria-hidden="true">
                                          <span part="ellipsis">...</span>
                                      </li>`
                                    : this.renderPage(page, page === current, total);
                            },
                        )}

                <li part="item">
                    <a
                        part="next nav-btn${isNextDisabled ? ' nav-btn--disabled' : ''}"
                        href="javascript:;"
                        aria-disabled=${isNextDisabled}
                        @click=${this._onNextPage}
                    >
                        <slot name="next-icon">${this._defaultNextIcon()}</slot>
                        <span class="sr-only"
                            >Page suivante (page ${nextPageNumber} sur ${total})</span
                        >
                    </a>
                </li>
            </ul>
        </nav>`;
```

- [ ] **Step 7: Lancer les tests et vérifier qu'ils passent**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run test --workspace=packages/core -- pagination.test.ts
```

Attendu : tous les tests passent (les 9 nouveaux de cette task + les 6 de Task 2 + l'intégralité de
la suite existante, non régressée — en particulier `describe('palier select sous le plancher', ...)`
qui dépend de `_budget`/`_calculatePages`, inchangés en mode non-compact).

- [ ] **Step 8: Lint et build TypeScript**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run lint --workspace=packages/core
npm run build:types --workspace=packages/core
```

- [ ] **Step 9: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add packages/core/src/components/pagination/pagination.ts packages/core/src/components/pagination/pagination.test.ts
git commit -m "feat(pagination): rendu du mode compact (label + prev/next) (#180)"
```

---

## Task 4: Thème par défaut — couleur du label

**Files:**

- Modify: `packages/core/src/styles/themes/default.css`

**Interfaces:**

- Consumes: `csspart` `label` produit en Task 3.

- [ ] **Step 1: Ajouter la règle de couleur pour `::part(label)`**

Dans `packages/core/src/styles/themes/default.css`, dans le bloc `ar-pagination { ... }` (débute
ligne ~1087), juste après la règle `&::part(select) { ... }` (qui se termine par le
`background-repeat: no-repeat;` suivi de `}`), ajouter :

```css
/* Même couleur de texte que link/prev/next (`--ar-color-text`) : le label doit rester
           visuellement cohérent avec le reste du composant, bien qu'il ne soit pas interactif
           (pas de background-color ni d'état hover/focus/active, contrairement aux parts
           cliquables ci-dessus). */
&::part(label) {
    color: var(--ar-color-text);
}
```

- [ ] **Step 2: Vérifier visuellement dans les docs en local**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run dev
```

Ouvrir la page `ar-pagination` dans le navigateur (`apps/docs`), inspecter temporairement l'élément
avec `document.querySelector('ar-pagination').compact = true` dans la console devtools pour
vérifier que le label est lisible (couleur cohérente avec le reste du composant). Arrêter le
serveur (`Ctrl+C`) une fois vérifié — ce test manuel n'a pas de commande de validation automatisée,
la démo dédiée arrive en Task 6.

- [ ] **Step 3: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add packages/core/src/styles/themes/default.css
git commit -m "style(pagination): couleur du label en mode compact dans le thème par défaut (#180)"
```

---

## Task 5: Tests d'accessibilité et tests navigateur

**Files:**

- Modify: `packages/core/src/components/pagination/pagination.a11y.test.ts`
- Modify: `packages/core/src/components/pagination/pagination.browser.test.ts`

**Interfaces:**

- Consumes: attribut `compact`, `csspart` `label`/`page-label` (Task 2 et 3).

- [ ] **Step 1: Ajouter les tests axe-core du mode compact**

Dans `pagination.a11y.test.ts`, ajouter un nouveau `describe` après le `describe('ar-pagination — accessibilité', ...)` existant (avant la fermeture du fichier) :

```typescript
describe('ar-pagination — mode compact — accessibilité', () => {
    it('page milieu de liste, mode compact, est accessible', async () => {
        const el = await fixture(
            html`<ar-pagination compact current="4" total="12"></ar-pagination>`,
        );
        await expect(el).to.be.accessible();
    });

    it('première page, mode compact (prev désactivé), est accessible', async () => {
        const el = await fixture(
            html`<ar-pagination compact current="1" total="12"></ar-pagination>`,
        );
        await expect(el).to.be.accessible();
    });

    it('dernière page, mode compact (next désactivé), est accessible', async () => {
        const el = await fixture(
            html`<ar-pagination compact current="12" total="12"></ar-pagination>`,
        );
        await expect(el).to.be.accessible();
    });

    it('total=1, mode compact (prev et next désactivés), est accessible', async () => {
        const el = await fixture(
            html`<ar-pagination compact current="1" total="1"></ar-pagination>`,
        );
        await expect(el).to.be.accessible();
    });
});
```

- [ ] **Step 2: Ajouter les tests navigateur du mode compact**

Dans `pagination.browser.test.ts`, ajouter un nouveau `describe` juste avant la fermeture du
`describe('ar-pagination — browser', ...)` (après le `describe('invariant anti-débordement ...')`) :

```typescript
describe('mode compact (#180) — pas de bascule responsive', () => {
    it('reste en mode compact quelle que soit la largeur du conteneur', async () => {
        const wrapper = await fixture(
            html`<div style="width: 900px;">
                <ar-pagination compact current="8" total="15"></ar-pagination>
            </div>`,
        );
        const el = wrapper.querySelector('ar-pagination') as HTMLElement;
        await elementUpdated(el);

        const shadow = el.shadowRoot as ShadowRoot;
        expect(shadow.querySelector('[part~="label"]')).to.not.equal(null);
        expect(shadow.querySelectorAll('[part~="link"], [part~="current"]').length).to.equal(0);
        expect(shadow.querySelector('[part~="select"]')).to.equal(null);

        wrapper.style.width = '90px';
        await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
        await new Promise((resolve) => setTimeout(resolve, 50));

        // À 90px, le mode adaptatif basculerait sur un <select> (cf. test existant "bascule
        // sur un <select>..." plus haut dans ce fichier) — le mode compact doit rester
        // strictement identique, aucune bascule.
        expect(shadow.querySelector('[part~="label"]')).to.not.equal(null);
        expect(shadow.querySelector('[part~="select"]')).to.equal(null);
        expect(shadow.querySelectorAll('[part~="link"], [part~="current"]').length).to.equal(0);
    });

    it('un clic sur next confirmé garde le focus sur le bouton actionné', async () => {
        const el = await fixture(
            html`<ar-pagination compact current="3" total="12"></ar-pagination>`,
        );
        el.addEventListener('ar-pagination-page-change', (e) => {
            (el as unknown as { current: number }).current = (
                e as CustomEvent<{ from: number; to: number }>
            ).detail.to;
        });
        const shadowRoot = el.shadowRoot as ShadowRoot;
        const next = shadowRoot.querySelector('[part~="next"]') as HTMLElement;

        next.focus();
        next.click();
        await elementUpdated(el);

        expect(shadowRoot.activeElement).to.equal(next);
        expect((el as unknown as { current: number }).current).to.equal(4);
    });
});
```

- [ ] **Step 3: Lancer les tests navigateur et vérifier qu'ils passent**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run test:browser --workspace=packages/core
```

Attendu : tous les tests passent, y compris les axe-core (aucune violation) et les nouveaux tests
navigateur. Si le runner échoue au démarrage (cold-start Playwright), relancer une fois —
comportement connu du projet (cf. `browserStartTimeout` 60s en CI), pas un signe de régression.

- [ ] **Step 4: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add packages/core/src/components/pagination/pagination.a11y.test.ts packages/core/src/components/pagination/pagination.browser.test.ts
git commit -m "test(pagination): couverture a11y et navigateur du mode compact (#180)"
```

---

## Task 6: Documentation

**Files:**

- Modify: `apps/docs/src/content/components/ar-pagination.mdx`

**Interfaces:**

- Consumes: attribut `compact`, JSDoc de `pagination.ts` (Task 2, 3 — régénère le manifest CEM
  dont dépend le tableau d'API auto-généré par `ComponentApi.astro`, sans édition manuelle).

- [ ] **Step 1: Ajouter une démo "Mode compact" dans le frontmatter**

Dans `apps/docs/src/content/components/ar-pagination.mdx`, dans la liste `variants:` du
frontmatter, ajouter une entrée après `20-pages-end` (avant `pageScript:`) :

```yaml
- name: compact
  label: Mode compact
  description: Mode compact — uniquement précédent/suivant et un label de position, identique en mobile et desktop.
  html: |
      <ar-pagination compact current="4" total="12"></ar-pagination>
```

Pas de section de prose supplémentaire à ajouter dans le corps de la page : `ComponentApi.astro`
(`apps/docs/src/components/ComponentApi.astro:53`) affiche `attr.description` directement depuis le
JSDoc `@attr` du composant — le texte déjà écrit en Task 2 Step 3 ("Mode compact : uniquement les
boutons précédent/suivant...") apparaîtra donc tel quel dans le tableau d'attributs auto-généré.
Ajouter une section manuelle dupliquerait cette description sans rien apporter ; la démo de la
Step 1 ci-dessus suffit à montrer le rendu.

- [ ] **Step 2: Régénérer le manifest CEM (fait apparaître `compact`/`page-label`/`label` dans le tableau d'API auto-généré)**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run build:manifest
```

- [ ] **Step 3: Vérifier visuellement la page de doc en local**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run dev
```

Ouvrir la page `ar-pagination`, vérifier que :

- la démo "Mode compact" s'affiche correctement (prev/next + label "Page 4 / 12"),
- le tableau d'attributs auto-généré liste `compact`,
- le tableau de `csspart` auto-généré liste `page-label` et `label`.

Arrêter le serveur (`Ctrl+C`) une fois vérifié.

- [ ] **Step 4: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add apps/docs/src/content/components/ar-pagination.mdx packages/core/custom-elements.json
git commit -m "docs(pagination): documente le mode compact (#180)"
```

---

## Task 7: Vérification finale et Pull Request

**Files:** aucun nouveau — vérification de bout en bout.

- [ ] **Step 1: Lancer la suite de tests complète**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run test:all
```

Attendu : tous les tests passent (Vitest + WTR), sans régression sur le reste de la suite
`ar-pagination` ni des autres composants.

- [ ] **Step 2: Build complet du package core**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run build --workspace=packages/core
```

Attendu : build sans erreur (manifest, bundles, CSS, types).

- [ ] **Step 3: Pousser la branche**

```bash
cd /Users/jon/Code/Active_projects/ariane
git push -u origin feat/pagination-compact-mode
```

- [ ] **Step 4: Créer la Pull Request vers `dev`**

```bash
cd /Users/jon/Code/Active_projects/ariane
gh pr create --base dev --title "feat(pagination): mode compact (prev/next + label de position)" --body "$(cat <<'EOF'
## Résumé

- Ajoute un attribut booléen `compact` à `ar-pagination` : uniquement prev/next + label de
  position non cliquable ("Page X / Y"), navigation strictement séquentielle, rendu identique en
  mobile et desktop (pas de bascule responsive comme le repli automatique en `<select>` existant).
- Court-circuite entièrement le `ResizeObserver`/calcul de budget en mode compact (y compris au
  toggle runtime de l'attribut).
- Nouveaux `csspart` `page-label`/`label`, stylés dans le thème par défaut.
- Design : `docs/superpowers/specs/2026-08-12-pagination-compact-mode-design.md`

Closes #180

## Test plan

- [x] Tests unitaires (Vitest) : propriété `compact`, cycle de vie `ResizeObserver`, rendu DOM,
      événements `ar-pagination-page-change`.
- [x] Tests a11y (axe-core) : 4 configurations (milieu, bord début, bord fin, total=1).
- [x] Tests navigateur (WTR) : absence de bascule responsive, focus après clic next.
- [x] `npm run test:all` et `npm run build --workspace=packages/core` passent.
- [ ] Revue manuelle de la démo "Mode compact" sur `apps/docs` (npm run dev) une fois la PR ouverte.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Rapporter l'URL de la PR à l'utilisateur**

Aucune commande — indiquer l'URL retournée par `gh pr create` dans la réponse finale.
