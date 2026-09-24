# `ar-pagination` token vs `::part()` + découplage `button.styles.ts` (lot 6, #129) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Affranchir `ar-pagination` de `button.styles.ts` (classes `.btn`/`.btn-tertiary`/
`.btn-ratio-square`/`.icon`), remplacer les classes structurelles (`pagination`,
`pagination-item`, `active`) par des `part` (dont 3 nouveaux : `item--current`, `ellipsis`,
`nav-btn`), et migrer 5 des 7 tokens `--ar-pagination-*` (`bg-hover`, `bg-pressed`, `bg-focus`,
`active-color`, `active-bg`) vers des règles `::part()` littérales dans `default.css`, en gardant
`color`/`bg` comme surface de surcharge volontaire — conformément à
`docs/superpowers/specs/2026-08-04-pagination-token-vs-part-129-design.md`. Après ce lot, seul
`ar-stepper` consommera encore `button.styles.ts`.

**Architecture:** Changement de structure DOM (suppression de toutes les classes hors `sr-only`,
ajout de 3 `part`), réécriture complète de `pagination.styles.ts` en CSS structurel pur (plus
aucune couleur), nouveau bloc `ar-pagination { &::part(...) {...} }` dans `default.css`. Un
correctif transverse est nécessaire sur le helper de test partagé `getPart`/`requirePart`
(`test-utils.ts`) : il fait aujourd'hui une égalité stricte sur `part`, incompatible avec les
`part` multi-tokens (`"prev nav-btn"`) introduits ici — à passer en correspondance par token
(`~=`), déjà le comportement utilisé nativement par `ar-stepper` dans ses propres requêtes.

**Tech Stack:** Lit 3, TypeScript, Vitest + WTR (browser), garde-fous CI
(`validate-no-hardcoded-tokens.js`, `validate-part-state-order.js`, custom-elements-manifest via
`cem.config.js`).

## Global Constraints

- Prettier : 100 char, 4 spaces, single quotes (CLAUDE.md).
- `--ar-*` cascade toujours via `var()` référençant `default.css`, jamais de valeur littérale
  codée en dur dans un `.styles.ts` sans commentaire `a11y-fallback`/`functional-default`
  justificatif (garde-fou `validate-no-hardcoded-tokens.js`).
- Tout nouveau/retiré token `--ar-*` doit avoir son entrée `@cssprop` tenue à jour dans le JSDoc
  du composant (feedback_cssprop_jsdoc).
- Ne jamais merger sur `dev` sans confirmation explicite de l'utilisateur
  (feedback_merge_after_autonomous_fix).
- `npm run dev --workspace=apps/docs` seul ne reconstruit pas le JS de `packages/core/dist` —
  rebuild explicite (`npm run build:dev --workspace=packages/core`) requis avant toute
  vérification Playwright d'un changement de renderer (feedback_docs_dev_stale_dist).
- Les parts d'état suivent la convention BEM `--` (`item--current`), et une règle de base doit
  toujours précéder sa règle de part d'état dans `default.css` (garde-fou
  `validate-part-state-order.js`).

---

## Task 1: Créer la branche de travail

**Files:** aucun.

- [ ] **Step 1: Créer la branche depuis `dev`**

```bash
git checkout dev
git pull origin dev
git checkout -b fix/pagination-token-vs-part-129
```

- [ ] **Step 2: Vérifier l'état propre**

Run: `git status`
Expected: `On branch fix/pagination-token-vs-part-129`, `nothing to commit, working tree clean`.

---

## Task 2: Corriger le helper de test partagé `getPart`/`requirePart` (`~=` au lieu de `=`)

**Files:**

- Modify: `packages/core/src/test-utils.ts`

**Interfaces:**

- Consumes: rien.
- Produces: `getPart`/`requirePart` utilisés par 12 fichiers de test (`alert`, `charcounter`,
  `collapse`, `breadcrumb`, `pagination`, `datepicker`, `spinner`, `dialog`, `dropdown`,
  `progressbar`, `tab-group`, `tooltip`) — comportement inchangé pour tout `part` mono-token
  (`~=` est un sur-ensemble strict de `=` pour ce cas), nécessaire pour les `part` multi-tokens
  introduits par ce lot (`"prev nav-btn"`, `"next nav-btn"`).

- [ ] **Step 1: Remplacer l'égalité stricte par une correspondance par token**

Dans `getPart` (ligne ~61) :

```ts
// avant
return el.shadowRoot?.querySelector(`[part="${part}"]`) ?? null;
// après
return el.shadowRoot?.querySelector(`[part~="${part}"]`) ?? null;
```

Dans `requirePart` (ligne ~82) :

```ts
// avant
const found = el.shadowRoot?.querySelector(`[part="${part}"]`);
// après
const found = el.shadowRoot?.querySelector(`[part~="${part}"]`);
```

- [ ] **Step 2: Vérifier le format**

Run: `npx prettier --check packages/core/src/test-utils.ts`

- [ ] **Step 3: Lancer la suite complète Vitest (pas seulement pagination — 12 fichiers concernés)**

Run: `npm run test --workspace=packages/core`
Expected: tous les tests passent, aucune régression sur les 11 autres composants consommant ces
helpers.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/test-utils.ts
git commit -m "fix(test-utils): getPart/requirePart matchent un part parmi plusieurs tokens (~=)"
```

---

## Task 3: Réécrire le DOM de `pagination.ts` (parts, suppression des classes bouton)

**Files:**

- Modify: `packages/core/src/components/pagination/pagination.ts`

**Interfaces:**

- Consumes: rien de nouveau.
- Produces: DOM consommé par `pagination.styles.ts` (Task 4) et `default.css` (Task 5).

- [ ] **Step 1: Retirer l'import et l'usage de `buttonStyles`**

```ts
// retirer cette ligne
import buttonStyles from '../../styles/components/button.styles.js';
```

```ts
// avant
static override styles: CSSResultGroup = [utilitiesStyles, resetStyles, buttonStyles, styles];
// après
static override styles: CSSResultGroup = [utilitiesStyles, resetStyles, styles];
```

- [ ] **Step 2: Réécrire `render()`**

Contenu actuel (lignes 102-144, cf. spec section « Décisions DOM ») remplacé par :

```ts
override render(): TemplateResult {
    // Garde défensive : total/current invalides sont déjà signalés par warn() dans
    // updated(), mais render() doit rester fonctionnel — sans ce clamp, un total
    // négatif produit des numéros de page négatifs affichés (previousPageNumber/
    // nextPageNumber) et une liste de pages vide, sans qu'aucune erreur ne le
    // signale à l'exécution.
    const total = Math.max(this.total, 1);
    const current = _clamp(this.current, 1, total);
    const isNextDisabled = current >= total;
    const isPreviousDisabled = current <= 1;
    const previousPageNumber = _clamp(current - 1, 1, total > 1 ? total - 1 : 1);
    const nextPageNumber = _clamp(current + 1, 1, total);

    return html` <nav part="nav" role="navigation" aria-labelledby="ar-pagination">
        <p id="ar-pagination" class="sr-only">Pagination</p>
        <ul part="list" @click=${this._onPageChange}>
            <li part="item">
                <a
                    part="prev nav-btn"
                    href="javascript:;"
                    aria-disabled=${isPreviousDisabled}
                    @click=${this._onPreviousPage}
                >
                    <span aria-hidden="true">&lt;</span>
                    <span class="sr-only">Page précédente (page ${previousPageNumber})</span>
                </a>
            </li>

            ${repeat(
                _calculatePages(current, total),
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

            <li part="item">
                <a
                    part="next nav-btn"
                    href="javascript:;"
                    aria-disabled=${isNextDisabled}
                    @click=${this._onNextPage}
                >
                    <span aria-hidden="true">&gt;</span>
                    <span class="sr-only">Page suivante (page ${nextPageNumber})</span>
                </a>
            </li>
        </ul>
    </nav>`;
}
```

- [ ] **Step 3: Réécrire `renderPage`/`renderPageLink`**

```ts
/** Génère le `<li>` d'une page. Surcharger en sous-classe si besoin. */
protected renderPage(page: number, active: boolean): TemplateResult {
    return html` <li part="item${active ? ' item--current' : ''}">
        ${this.renderPageLink(page, active)}
    </li>`;
}

/** Génère le lien ou le span (si page active) d'une page */
protected renderPageLink(page: number, active: boolean): TemplateResult {
    if (active) {
        return html` <span part="current" aria-current="true" data-ar-pagination-page="${page}">
            ${this.renderPageLabel(page)}
        </span>`;
    }
    return html` <a part="link" data-ar-pagination-page="${page}" href="javascript:;">
        ${this.renderPageLabel(page)}
    </a>`;
}
```

`renderPageLabel` et le reste de la classe (propriétés, `updated()`, handlers d'événements,
`_emit`, `_announcePageChange`) restent inchangés.

- [ ] **Step 4: Vérifier le format**

Run: `npx prettier --check packages/core/src/components/pagination/pagination.ts`

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/components/pagination/pagination.ts
git commit -m "refactor(pagination): retire button.styles.ts, ajoute part item--current/ellipsis/nav-btn"
```

---

## Task 4: Réécrire `pagination.styles.ts` (CSS structurel uniquement)

**Files:**

- Modify: `packages/core/src/components/pagination/pagination.styles.ts`

**Interfaces:**

- Consumes: `--ar-pagination-btn-size` (nouveau token a11y-fallback, défini en Task 5).
- Produces: mise en page consommée visuellement par `default.css` (Task 5) pour les couleurs.

- [ ] **Step 1: Remplacer tout le contenu du fichier**

```ts
import { css } from 'lit';

export default css`
    :host {
        display: block;
        box-sizing: border-box;
    }

    [part='list'] {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        padding-left: 0;
        margin-bottom: 0;
        list-style: none;
    }

    [part='prev'],
    [part='next'],
    [part='link'],
    [part='current'] {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin: 0 0.125rem;
        padding: 0 0.75rem;
        border: 1px solid transparent;
        text-decoration: none;
        /* a11y-fallback: WCAG 2.5.8 taille de cible minimale */
        min-height: var(--ar-pagination-btn-size, 2.5rem);
        transition:
            background-color 0.15s,
            color 0.15s,
            border-color 0.15s;
    }

    [part='prev'],
    [part='next'] {
        aspect-ratio: 1/1;
        padding: 0;
        /* a11y-fallback: WCAG 2.5.8 taille de cible minimale */
        min-width: var(--ar-pagination-btn-size, 2.5rem);
    }

    [part='prev']:focus-visible,
    [part='next']:focus-visible,
    [part='link']:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: 2px;
    }

    [part='prev'][aria-disabled='true'],
    [part='next'][aria-disabled='true'] {
        opacity: 0.5;
        cursor: not-allowed;
    }

    [part='ellipsis'] {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin: 0 0.125rem;
        min-height: var(--ar-pagination-btn-size, 2.5rem);
    }

    @media only screen and (max-width: 640px) {
        [part='item']:not([part~='item--current']):not([aria-hidden='true']):not(:first-child):not(
                :last-child
            ):not(:nth-child(2)):not(:nth-last-child(2)) {
            display: none;
        }
    }
`;
```

Notes :

- Plus aucune propriété de couleur/fond ici — entièrement porté par `default.css` (Task 5).
- `border: 1px solid transparent` sur la règle de base évite un décalage de layout quand
  `::part(current)` fixe `border-color` en externe (même raison que la base `.btn` d'origine).
- `[part='current']` n'a pas de traitement `:focus-visible`/disabled — c'est un `<span>` non
  interactif.
- Le sélecteur média reprend celui d'origine, adapté : `.active` → `[part~='item--current']`,
  `li` → `[part='item']` (cohérence avec le reste du fichier, cf. audit CSS du 2026-08-03).

- [ ] **Step 2: Vérifier le format**

Run: `npx prettier --check packages/core/src/components/pagination/pagination.styles.ts`

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/components/pagination/pagination.styles.ts
git commit -m "refactor(pagination): CSS interne réduit au structurel, plus de dépendance à button.styles.ts"
```

---

## Task 5: Mettre à jour `default.css` (tokens + nouveau bloc `ar-pagination { }`)

**Files:**

- Modify: `packages/core/src/styles/themes/default.css`

**Interfaces:**

- Consumes: `--ar-button-tertiary-bg-hover`, `--ar-button-tertiary-bg-active`,
  `--ar-button-tertiary-bg-focus` (globaux partagés, déjà définis, réutilisés en valeur littérale
  de theme — pas de couplage de composant réintroduit, seulement une cohérence visuelle voulue par
  le thème), `--ar-color-interactive`, `--ar-color-bg`, `--ar-color-text-muted`.
- Produces: règle externe `ar-pagination::part(...)` consommée visuellement par le composant
  (Task 4).

- [ ] **Step 1: Remplacer le bloc `Pagination` dans `:root` (lignes ~399-408)**

Avant :

```css
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         * Pagination
         * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
--ar-pagination-active-color: var(--ar-color-interactive);
--ar-pagination-color: var(--ar-color-text);
--ar-pagination-bg: var(--ar-button-tertiary-bg);
--ar-pagination-bg-hover: var(--ar-button-tertiary-bg-hover);
--ar-pagination-bg-pressed: var(--ar-button-tertiary-bg-active);
--ar-pagination-bg-focus: var(--ar-button-tertiary-bg-focus);
--ar-pagination-active-bg: var(--ar-color-bg);
```

Après (2 tokens conservés + nouveau token de taille a11y) :

```css
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         * Pagination
         * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
--ar-pagination-color: var(--ar-color-text);
--ar-pagination-bg: var(--ar-button-tertiary-bg);
--ar-pagination-btn-size: 2.5rem;
```

- [ ] **Step 2: Corriger le commentaire obsolète du bloc `Button` (ligne ~322)**

```css
/* avant */
* Button
* Partagé - breadcrumb, dialog, pagination
/* après */
* Button
* Partagé - stepper
```

(`ar-breadcrumb`/`ar-dialog` ne consomment plus `button.styles.ts` depuis le lot 4 ;
`ar-pagination` cesse d'en dépendre avec ce lot — `ar-stepper` est désormais le seul
consommateur.)

- [ ] **Step 3: Ajouter le bloc `ar-pagination { }` hors de `:root`**

Repérer l'emplacement via `grep -n "^    ar-" packages/core/src/styles/themes/default.css` (à la
suite du dernier bloc de composant existant, même profondeur d'indentation que `ar-dropdown { }`/
`ar-breadcrumb { }`) :

```css
ar-pagination {
    &::part(link),
    &::part(prev),
    &::part(next) {
        border-radius: 0.75rem;
        background-color: var(--ar-pagination-bg);
        color: var(--ar-pagination-color);
    }

    &::part(link):hover,
    &::part(prev):hover,
    &::part(next):hover {
        background-color: var(--ar-button-tertiary-bg-hover);
    }

    &::part(link):active,
    &::part(prev):active,
    &::part(next):active {
        background-color: var(--ar-button-tertiary-bg-active);
    }

    &::part(link):focus,
    &::part(prev):focus,
    &::part(next):focus {
        background-color: var(--ar-button-tertiary-bg-focus);
    }

    &::part(current) {
        background-color: var(--ar-color-bg);
        color: var(--ar-color-interactive);
        border-color: var(--ar-color-interactive);
        font-weight: 700;
    }

    &::part(ellipsis) {
        color: var(--ar-color-text-muted);
        cursor: default;
    }
}
```

- [ ] **Step 4: Vérifier le format**

Run: `npx prettier --check packages/core/src/styles/themes/default.css`

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/styles/themes/default.css
git commit -m "refactor(pagination): migre bg-hover/bg-pressed/bg-focus/active-color/active-bg vers ::part(), garde color/bg"
```

---

## Task 6: Mettre à jour le JSDoc de `pagination.ts`

**Files:**

- Modify: `packages/core/src/components/pagination/pagination.ts` (bloc JSDoc en tête de classe)

**Interfaces:**

- Consumes: rien.
- Produces: JSDoc à jour, source du manifeste CEM (Task 7).

- [ ] **Step 1: Remplacer le bloc `@csspart`/`@cssprop`**

Avant :

```ts
 * @csspart nav      - L'élément `<nav>` englobant.
 * @csspart list     - L'élément `<ul>` de la liste des pages.
 * @csspart item     - Chaque `<li>` de la liste.
 * @csspart link     - Les `<a>` cliquables de chaque page.
 * @csspart current  - Le `<span>` de la page courante (non cliquable).
 * @csspart prev     - Le bouton "Page précédente".
 * @csspart next     - Le bouton "Page suivante".
 *
 * @cssprop --ar-pagination-active-color - Couleur de la page active (texte + bordure).
 * @cssprop --ar-pagination-color - Couleur du texte des boutons prev/next/page (non actifs). À surcharger localement pour un fond sombre ponctuel, indépendamment du thème global.
 * @cssprop --ar-pagination-bg - Fond des boutons prev/next/page (non actifs).
 * @cssprop --ar-pagination-bg-hover - Fond des boutons prev/next/page au survol.
 * @cssprop --ar-pagination-bg-pressed - Fond des boutons prev/next/page pressés.
 * @cssprop --ar-pagination-bg-focus - Fond des boutons prev/next/page au focus.
 * @cssprop --ar-pagination-active-bg - Couleur du fond du numéro de page actif (cascade vers --ar-color-bg).
```

Après :

```ts
 * @csspart nav      - L'élément `<nav>` englobant.
 * @csspart list     - L'élément `<ul>` de la liste des pages.
 * @csspart item     - Chaque `<li>` de la liste. Porte aussi le part d'état `item--current` sur le `<li>` de la page active.
 * @csspart link     - Les `<a>` cliquables de chaque page. Personnalisable via `::part(link)` (fond, couleur, bordure, survol/pressé/focus).
 * @csspart current  - Le `<span>` de la page courante (non cliquable). Personnalisable via `::part(current)` (fond, couleur, bordure, épaisseur de trait).
 * @csspart prev     - Le bouton "Page précédente". Porte aussi le part combiné `nav-btn`, partagé avec `next`.
 * @csspart next     - Le bouton "Page suivante". Porte aussi le part combiné `nav-btn`, partagé avec `prev`.
 * @csspart nav-btn  - Part combiné sur `prev`/`next`, pour cibler les deux boutons de navigation ensemble (ex. `::part(nav-btn)` pour un style commun distinct des numéros de page).
 * @csspart ellipsis - Le `<span>` d'ellipse (`...`) entre deux groupes de pages, non interactif.
 *
 * @cssprop --ar-pagination-color - Couleur du texte des boutons prev/next/page (non actifs). À surcharger localement pour un fond sombre ponctuel, indépendamment du thème global.
 * @cssprop --ar-pagination-bg - Fond des boutons prev/next/page (non actifs). À surcharger localement pour un fond sombre ponctuel, indépendamment du thème global.
 * @cssprop --ar-pagination-btn-size - Taille minimale des boutons/pages (fallback WCAG 2.5.8 : `2.5rem` si aucun thème n'est chargé).
```

- [ ] **Step 2: Commit**

```bash
git add packages/core/src/components/pagination/pagination.ts
git commit -m "docs(pagination): met à jour @csspart/@cssprop après migration ::part()"
```

---

## Task 7: Mettre à jour les tests

**Files:**

- Modify: `packages/core/src/components/pagination/pagination.test.ts`
- Modify: `packages/core/src/components/pagination/pagination.a11y.test.ts`

**Interfaces:**

- Consumes: composant modifié (Tasks 3-4), helper corrigé (Task 2).
- Produces: couverture des 3 nouveaux `part`.

- [ ] **Step 1: Ajouter des assertions pour les nouveaux `part` dans `pagination.test.ts`**

Dans le bloc `describe('rendu', ...)` (après le test `contient un part="next"`, ligne ~36) :

```ts
it('contient un part="prev nav-btn" et part="next nav-btn"', () => {
    expect(requirePart(el, 'prev').getAttribute('part')).toBe('prev nav-btn');
    expect(requirePart(el, 'next').getAttribute('part')).toBe('next nav-btn');
});
```

Dans le bloc `describe('pages affichées', ...)`, remplacer le test `ellipses présentes...`
(lignes 149-155) — il testait `[aria-hidden="true"]` en comptant les `<li>`, ce qui reste valide,
mais on ajoute une vérification du nouveau part dédié :

```ts
it('ellipses présentes si total >= 10 et current éloigné des bords, avec part="ellipsis"', async () => {
    el = await fixture('<ar-pagination current="6" total="15"></ar-pagination>');
    const shadow = el.shadowRoot as ShadowRoot;
    const ellipses = shadow.querySelectorAll('[part="ellipsis"]');
    expect(ellipses.length).toBeGreaterThanOrEqual(2);
});
```

Ajouter un test pour `item--current` (nouveau `describe`, à la suite de `pages affichées`) :

```ts
describe("part d'état item--current", () => {
    it('le <li> de la page active porte part="item item--current"', async () => {
        el = await fixture('<ar-pagination current="3" total="5"></ar-pagination>');
        const shadow = el.shadowRoot as ShadowRoot;
        const currentLi = shadow.querySelector('[part~="item--current"]') as Element;
        expect(currentLi).not.toBeNull();
        expect(currentLi.getAttribute('part')).toBe('item item--current');
    });

    it('les <li> non actifs ne portent que part="item"', async () => {
        el = await fixture('<ar-pagination current="3" total="5"></ar-pagination>');
        const shadow = el.shadowRoot as ShadowRoot;
        const items = Array.from(shadow.querySelectorAll('[part~="item"]'));
        const nonCurrent = items.filter(
            (item) => !item.getAttribute('part')?.includes('item--current'),
        );
        expect(nonCurrent.length).toBeGreaterThan(0);
        nonCurrent.forEach((item) => expect(item.getAttribute('part')).toBe('item'));
    });
});
```

- [ ] **Step 2: Retirer l'attribut `variant="dark"` mort dans `pagination.a11y.test.ts`**

Trouvé en marge de ce lot (`ArPagination` n'a plus de propriété `variant` depuis le retrait du
variant au profit des tokens — cf. test existant `pagination.test.ts:72`) : le test
`variante "dark" est accessible` pose un attribut qui n'a plus aucun effet. Corriger pour tester
un cas réellement distinct (ex. avec ellipses) plutôt que de le supprimer sans remplacement :

```ts
// avant
it('variante "dark" est accessible', async () => {
    const el = await fixture(
        html`<ar-pagination current="2" total="5" variant="dark"></ar-pagination>`,
    );
    await expect(el).to.be.accessible();
});

// après
it('avec ellipses (total élevé) est accessible', async () => {
    const el = await fixture(html`<ar-pagination current="8" total="20"></ar-pagination>`);
    await expect(el).to.be.accessible();
});
```

- [ ] **Step 3: Vérifier le format**

Run: `npx prettier --check packages/core/src/components/pagination/*.test.ts`

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/components/pagination/pagination.test.ts packages/core/src/components/pagination/pagination.a11y.test.ts
git commit -m "test(pagination): couvre les part item--current/ellipsis/nav-btn, retire un cas variant mort"
```

---

## Task 8: Lancer les suites de tests et régénérer le manifeste

**Files:**

- Read-only check: tous les fichiers modifiés précédemment.
- Modify (généré): `packages/core/custom-elements.json`

**Interfaces:**

- Consumes: composant modifié (Tasks 3-7).
- Produces: manifeste à jour, confirmation verte.

- [ ] **Step 1: Lancer la suite Vitest complète (pas seulement pagination — Task 2 touche 12 composants)**

Run: `npm run test --workspace=packages/core`
Expected: tous les tests passent.

- [ ] **Step 2: Rebuild le manifeste CEM (déclenche les garde-fous CI)**

Run: `npm run build:manifest --workspace=packages/core`
Expected: succès, aucune erreur `validate-no-hardcoded-tokens.js` (les 2 `min-height`/`min-width`
en `a11y-fallback` sont correctement commentés) ni `validate-part-state-order.js` (vérifier que la
règle `[part='item']` de base précède toute règle `[part~='item--current']` dans
`pagination.styles.ts` — ici il n'y a pas de règle CSS dédiée à `item--current` dans ce fichier,
seulement dans la media query ; si le garde-fou râle sur ce point, ajuster l'ordre ou consulter le
script pour comprendre son heuristique exacte avant de contourner quoi que ce soit).

- [ ] **Step 3: Lancer la suite browser (WTR)**

Run: `npm run test:all --workspace=packages/core -- pagination` (vérifier la commande exacte dans
`packages/core/package.json` si elle échoue).
Expected: tous les tests passent, y compris `pagination.a11y.test.ts`.

- [ ] **Step 4: Commit (manifeste uniquement si modifié)**

```bash
git add packages/core/custom-elements.json
git commit -m "chore(pagination): régénère le manifeste après migration ::part()"
```

Si le manifeste n'a pas changé, passer directement à Task 9 sans commit.

---

## Task 9: Vérification visuelle manuelle (Playwright)

**Files:** aucun fichier modifié — vérification uniquement.

- [ ] **Step 1: Rebuild explicite de `packages/core`**

Run: `npm run build:dev --workspace=packages/core`
Expected: build réussi.

- [ ] **Step 2: Lancer le serveur de doc**

Run: `npm run dev --workspace=apps/docs` (arrière-plan ou terminal dédié).

- [ ] **Step 3: Capturer la page `ar-pagination` (thème chargé), plusieurs états**

Utiliser Playwright pour naviguer vers `http://localhost:<port>/components/pagination`, capturer :

- L'état par défaut (`current=1, total=5`) — comparer visuellement à la capture prise en amont
  de ce chantier (pilule grise, page active en bordure bleue) : aucune différence attendue.
- Un cas avec ellipses (`current=6, total=15`) — vérifier le rendu de `::part(ellipsis)`.
- Le survol d'un lien de page (`:hover`) et le focus clavier (`Tab`) sur `prev` — vérifier
  l'anneau de focus `outline` et le changement de fond au survol.
- La page 1 (prev disabled) — vérifier l'opacité réduite et `cursor: not-allowed`.

- [ ] **Step 4: Vérifier le rendu sans thème (fallback a11y)**

Commenter temporairement l'import de `default.css`, recharger, confirmer que : les boutons restent
utilisables (taille minimale ~2.5rem maintenue via le fallback interne), le texte reste lisible
(couleur héritée du navigateur, pas de contraste cassé), l'ellipse reste visible (texte "...").
Rétablir l'import après vérification.

- [ ] **Step 5: Consigner le résultat**

Si un écart visuel est trouvé, corriger `pagination.styles.ts`/`default.css` (Tasks 4-5) et
refaire les Steps 3-4. Si rien trouvé, continuer.

---

## Task 10: Revue finale de branche

**Files:** aucun — revue uniquement.

- [ ] **Step 1: Dispatcher une revue de branche complète sur un agent capable**

Comparer l'intégralité du diff `dev...fix/pagination-token-vs-part-129` (pas seulement les diffs
de tâche individuels) contre `docs/decisions/ADR-005-tokens-pilotes-par-attribut.md` et
`docs/superpowers/specs/2026-08-04-pagination-token-vs-part-129-design.md`. Points d'attention
spécifiques à ce lot (périmètre plus large que les précédents — DOM + CSS + découplage) :

- Aucune classe résiduelle (`.btn`, `.btn-tertiary`, `.btn-ratio-square`, `.pagination`,
  `.pagination-item`, `.active`, `.icon`, `.icon-chevron-*`) dans `pagination.ts`/
  `pagination.styles.ts` — `grep -n "class="` sur les deux fichiers pour confirmer que seul
  `class="sr-only"` subsiste.
- `getPart`/`requirePart` (`~=`) n'a pas cassé de test existant sur les 11 autres composants
  consommateurs (Task 2, Step 3 déjà vérifié, mais re-confirmer sur le diff final).
- Cohérence exacte entre les 5 tokens retirés du composant et ceux retirés de `default.css`
  (aucun oubli, aucun résidu — `grep -rn` sur les 5 noms hors `git log`).
- Le nouveau bloc `ar-pagination { }` respecte la même structure d'imbrication
  (`&::part(...)`) que `ar-dropdown { }`/`ar-breadcrumb { }`/`ar-stepper { }` existants.
- `part="prev nav-btn"`/`part="next nav-btn"` : confirmer qu'aucun garde-fou CI
  (`validate-part-state-order.js`) ne les confond avec un part d'état (le délimiteur attendu est
  `--`, pas un espace — vérifier que l'heuristique du script ne mélange pas les deux notions).
- JSDoc `@cssprop`/`@csspart` cohérent avec l'implémentation finale (7 parts + 1 combiné +
  1 d'état documentés, 3 `@cssprop` documentés).
- Le retrait de `variant="dark"` dans `pagination.a11y.test.ts` (Task 7, Step 2) ne réduit pas la
  couverture a11y réelle (le nouveau cas « avec ellipses » teste un chemin de rendu distinct,
  pas un doublon d'un test déjà présent dans `describe('premiere/milieu/derniere page')`).

- [ ] **Step 2: Corriger les findings en une vague unique**

Si des findings « Critical »/« Important » remontent, les corriger en un seul commit groupé
plutôt qu'un commit par finding, puis relancer Task 8 Steps 1-3 pour re-vérifier.

---

## Task 11: Créer la Pull Request

**Files:** aucun.

- [ ] **Step 1: Pousser la branche**

```bash
git push -u origin fix/pagination-token-vs-part-129
```

- [ ] **Step 2: Créer la PR vers `dev`**

```bash
gh pr create --base dev --title "refactor(pagination): découple button.styles.ts, migre token vs ::part(), lot 6 (#129)" --body "$(cat <<'EOF'
## Summary
- Affranchit `ar-pagination` de `button.styles.ts` — plus aucune classe interne hors `sr-only` (DOM entièrement piloté par `part`).
- 3 nouveaux `part` : `item--current` (état, sur le `<li>` actif), `ellipsis` (dédié, remplace le détournement des classes bouton pour l'ellipse), `nav-btn` (combiné sur `prev`/`next`).
- Migre 5 des 7 tokens `--ar-pagination-*` (`bg-hover`, `bg-pressed`, `bg-focus`, `active-color`, `active-bg`) vers des règles littérales `ar-pagination::part(...)` dans `default.css`.
- Conserve `color`/`bg` comme surface de surcharge volontaire (fond sombre ponctuel, documenté depuis l'origine du composant).
- Corrige un helper de test partagé (`getPart`/`requirePart`) pour matcher les `part` multi-tokens (`~=`), nécessaire pour `nav-btn`.
- Après ce lot, `ar-stepper` est le seul composant restant à consommer `button.styles.ts`.

Spec : \`docs/superpowers/specs/2026-08-04-pagination-token-vs-part-129-design.md\`
Plan : \`docs/superpowers/plans/2026-08-04-pagination-token-vs-part-129.md\`

## Test plan
- [x] \`npm run test --workspace=packages/core\` (suite complète, 12 composants touchés par le fix du helper de test)
- [x] \`npm run build:manifest --workspace=packages/core\` (garde-fous CI verts)
- [x] Suite browser (WTR) pagination
- [x] Vérification visuelle Playwright (thème chargé, sans thème, hover/focus/disabled)
- [x] Revue finale de branche

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Confirmer avec l'utilisateur avant tout merge**

Ne pas merger sur `dev` sans confirmation explicite — signaler la PR créée et attendre la revue
de l'utilisateur (feedback_merge_after_autonomous_fix).

---

## Self-Review (déjà appliqué en rédigeant ce plan)

1. **Couverture de la spec** : décisions DOM (Task 3), disposition des tokens (Task 5), nouveau
   CSS interne (Task 4) et externe (Task 5), JSDoc (Task 6), tests (Task 7) — toutes les sections
   de la spec sont couvertes. Le correctif du helper partagé (Task 2), non anticipé dans la spec,
   a été découvert en préparant ce plan (conséquence directe de `part="prev nav-btn"` sur
   `getPart`/`requirePart`) et traité en tâche dédiée avec sa propre vérification de
   non-régression élargie (12 composants).
2. **Scan placeholders** : aucun « TBD » — chaque valeur littérale (couleurs, tailles, radius) est
   fixée explicitement plutôt que laissée « à trancher en implémentation » comme le permettait la
   spec.
3. **Cohérence des noms** : `part="prev nav-btn"`/`part="next nav-btn"` (Task 3) correspondent
   exactement aux sélecteurs `[part='prev']`/`[part='next']` (Task 4, ciblage individuel) et
   `::part(prev)`/`::part(next)` (Task 5) ; `item--current` (Task 3) correspond à
   `[part~='item--current']` (Task 4 media query) — même orthographe partout, vérifié.
4. **Risque le plus élevé identifié** : le changement de `getPart`/`requirePart` (Task 2) est
   partagé par 12 fichiers de test — isolé en premier, avec sa propre suite complète avant de
   toucher au composant lui-même, pour détecter tout effet de bord tôt plutôt qu'en fin de
   parcours.
