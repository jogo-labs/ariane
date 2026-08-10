# Select de saut de page au palier minimal d'ar-pagination — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le palier texte non interactif ("Page X sur Y") d'`ar-pagination` par un
`<select>` natif de saut de page, peuplé des mêmes options que produirait `_calculatePages` au
plancher (première/dernière page, fenêtre minimale, ellipses en `<option disabled>`).

**Architecture:** Un seul point de bascule change dans `pagination.ts` : la branche qui rendait un
texte statique rend désormais un `<li part="item page-select">` contenant un `<select part="select">`
peuplé via `_calculatePages(current, total, this._budget)` (aucune modification de l'algorithme).
Le `change` sur le select suit le même chemin que les clics sur les liens de page existants
(`current` mis à jour, événement émis, annonce a11y). Le nom accessible utilise `aria-labelledby`
vers un `<span class="sr-only">` statique par défaut ; si la vérification empirique en Task 2 montre
un débordement du déclencheur fermé à 320-375px, Task 3 (conditionnelle) bascule vers des labels
d'option courts + un `aria-label` dynamique combinant nom et valeur.

**Tech Stack:** Lit 3 + TypeScript, Vitest (happy-dom) pour les tests unitaires, `@web/test-runner`
et Playwright/Chromium pour les tests navigateur.

## Global Constraints

- Prettier : 100 caractères, 4 espaces, guillemets simples.
- Toujours `import type` pour les imports de types.
- Conventional Commits (commitlint + Husky) sur chaque commit.
- Composant headless : aucune couleur/fond en dur dans `pagination.styles.ts` — seules les valeurs
  structurelles (tailles, `appearance: none`) y vont ; l'apparence visuelle va dans
  `themes/default.css` (hors périmètre de ce plan, aucune modification requise ici — le sélecteur
  `ar-pagination::part(select)` n'existe pas encore dans le thème, ce qui est acceptable : un
  `<select>` non thémé reste fonctionnel avec l'apparence native du navigateur).
- `--ar-pagination-btn-size` (déjà déclaré, repli interne `2.5rem`) doit être réutilisé pour la
  taille minimale du `<select>`, pas une nouvelle variable — cohérence WCAG 2.5.8 avec prev/next/link.
- Toute nouvelle entrée `@csspart` doit être documentée dans le JSDoc du composant
  (`pagination.ts`), toute entrée obsolète retirée.
- `vitest` s'exécute depuis `packages/core`, jamais depuis la racine du repo.

---

### Task 1: Rendu `<select>` au palier minimal (remplace le palier texte)

**Files:**

- Modify: `packages/core/src/components/pagination/pagination.ts`
- Modify: `packages/core/src/components/pagination/pagination.styles.ts`
- Modify: `packages/core/src/components/pagination/pagination.test.ts`

**Interfaces:**

- Consumes: `_calculatePages(current: number, total: number, budget?: number): number[]` (déjà
  exporté par `pagination.utils.ts`, aucune modification) ; `announceA11y(message: string, politeness?: 'polite' | 'assertive'): void`.
- Produces: nouvelle méthode privée `_onSelectChange(event: Event): void` sur `ArPagination` ;
  nouvelle méthode protégée `renderPageSelect(current: number, total: number): TemplateResult` ;
  nouveaux parts shadow DOM `select` et `page-select`. Tasks 2 et 3 s'appuient sur ces noms.

- [ ] **Step 1: Écrire les tests unitaires qui échouent (Vitest)**

Dans `packages/core/src/components/pagination/pagination.test.ts`, remplacer entièrement le bloc
`describe('palier texte sous le plancher', ...)` (lignes 219-258 actuelles) par :

```ts
// ── Palier select (budget très restreint) ────────────────────────────────

describe('palier select sous le plancher', () => {
    it('bascule sur un <select> de saut de page quand _budget est sous le plancher', async () => {
        el = await fixture('<ar-pagination current="3" total="15"></ar-pagination>');
        // @ts-expect-error accès à un champ privé pour simuler une mesure ResizeObserver
        el._budget = 2;
        el.requestUpdate();
        await waitForUpdate(el);

        const shadow = el.shadowRoot as ShadowRoot;
        const select = shadow.querySelector('[part~="select"]');
        expect(select).not.toBeNull();
        expect(select?.tagName.toLowerCase()).toBe('select');
        expect(shadow.querySelectorAll('[part~="link"], [part~="current"]').length).toBe(0);
    });

    it('peuple le select avec les mêmes pages que _calculatePages au plancher (première/dernière page, fenêtre minimale, ellipses en disabled)', async () => {
        el = await fixture('<ar-pagination current="3" total="15"></ar-pagination>');
        // @ts-expect-error accès à un champ privé pour simuler une mesure ResizeObserver
        el._budget = 2;
        el.requestUpdate();
        await waitForUpdate(el);

        const select = getPart(el, 'select') as HTMLSelectElement;
        const options = Array.from(select.querySelectorAll('option'));
        // _calculatePages(3, 15, 2) retombe sur _minimalPages(3, 15) = [1, -1, 3, -2, 15]
        expect(options).toHaveLength(5);
        expect(options.map((o) => o.disabled)).toEqual([false, true, false, true, false]);
        expect(options.map((o) => o.value)).toEqual(['1', '', '3', '', '15']);
        expect(options[2]?.selected).toBe(true);
    });

    it('le label de chaque option contient "Page X sur Y"', async () => {
        el = await fixture('<ar-pagination current="3" total="15"></ar-pagination>');
        // @ts-expect-error accès à un champ privé pour simuler une mesure ResizeObserver
        el._budget = 2;
        el.requestUpdate();
        await waitForUpdate(el);

        const select = getPart(el, 'select') as HTMLSelectElement;
        const options = Array.from(select.querySelectorAll('option'));
        expect(options[0]?.textContent?.trim()).toBe('Page 1 sur 15');
        expect(options[2]?.textContent?.trim()).toBe('Page 3 sur 15');
        expect(options[4]?.textContent?.trim()).toBe('Page 15 sur 15');
    });

    it('changer la valeur du select émet ar-pagination-page-change et met à jour current', async () => {
        el = await fixture('<ar-pagination current="3" total="15"></ar-pagination>');
        // @ts-expect-error accès à un champ privé pour simuler une mesure ResizeObserver
        el._budget = 2;
        el.requestUpdate();
        await waitForUpdate(el);

        const handler = vi.fn();
        el.addEventListener('ar-pagination-page-change', handler);
        const select = getPart(el, 'select') as HTMLSelectElement;
        select.value = '15';
        select.dispatchEvent(new Event('change'));
        await waitForUpdate(el);

        expect(el.current).toBe(15);
        expect(handler).toHaveBeenCalledOnce();
        const detail = (handler.mock.calls[0][0] as CustomEvent<ArPaginationPageChangeDetail>)
            .detail;
        expect(detail).toEqual({ from: 3, to: 15 });
    });

    it('prev/next restent affichés et fonctionnels au palier select', async () => {
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

    it('ne bascule pas en palier select si _budget est au-dessus du plancher', async () => {
        el = await fixture('<ar-pagination current="8" total="15"></ar-pagination>');
        // @ts-expect-error accès à un champ privé pour simuler une mesure ResizeObserver
        el._budget = 5;
        el.requestUpdate();
        await waitForUpdate(el);

        const shadow = el.shadowRoot as ShadowRoot;
        expect(shadow.querySelector('[part~="select"]')).toBeNull();
    });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `(cd packages/core && npx vitest run src/components/pagination/pagination.test.ts)`
Expected: FAIL — `[part~="select"]` introuvable (le composant rend encore l'ancien
`[part~="page-status"]`).

- [ ] **Step 3: Modifier `pagination.ts` — rendu du select**

Dans `packages/core/src/components/pagination/pagination.ts` :

1. Renommer la variable locale `useTextMode` en `useSelectMode` dans `render()` (même condition
   `this._budget !== undefined && this._budget < floorSlots`, seul le nom change).

2. Remplacer le bloc conditionnel de rendu (actuellement) :

```ts
                ${useTextMode
                    ? html`<li part="item page-status">Page ${current} sur ${total}</li>`
                    : repeat(
```

par :

```ts
                ${useSelectMode
                    ? this.renderPageSelect(current, total)
                    : repeat(
```

(la branche `repeat(...)` existante et sa fermeture ne changent pas).

3. Ajouter les deux nouvelles méthodes, juste après `renderPageLabel` (avant `_onPreviousPage`) :

```ts
    /**
     * Génère le `<li>` du select de saut de page, affiché à la place de la liste de pages au
     * palier minimal (largeur insuffisante pour la fenêtre de boutons la plus réduite).
     */
    protected renderPageSelect(current: number, total: number): TemplateResult {
        return html`<li part="item page-select">
            <span class="sr-only" id="ar-pagination-select-label">Aller à la page</span>
            <select
                part="select"
                aria-labelledby="ar-pagination-select-label"
                .value=${String(current)}
                @change=${this._onSelectChange}
            >
                ${_calculatePages(current, total, this._budget).map((page) =>
                    page === -1 || page === -2
                        ? html`<option disabled value="">…</option>`
                        : html`<option value=${page} ?selected=${page === current}>
                              Page ${page} sur ${total}
                          </option>`,
                )}
            </select>
        </li>`;
    }
```

```ts
    private _onSelectChange(event: Event): void {
        const select = event.target as HTMLSelectElement;
        const page = parseInt(select.value, 10);
        if (Number.isNaN(page) || page === this.current) return;
        const from = this.current;
        this.current = page;
        this._emit({ from, to: this.current });
        this._announcePageChange();
    }
```

4. Mettre à jour le JSDoc du composant : remplacer

```ts
 * @csspart page-status - Le `<li>` du texte "Page X sur Y" affiché à la place de la liste de
 *   pages quand l'espace disponible ne permet plus d'afficher de numéros (palier minimal).
```

par :

```ts
 * @csspart page-select - Le `<li>` englobant le `<select>` de saut de page, affiché à la place
 *   de la liste de pages quand l'espace disponible ne permet plus d'afficher de numéros (palier
 *   minimal).
 * @csspart select - L'élément `<select>` de saut de page. Personnalisable via `::part(select)`
 *   (apparence, flèche custom via `appearance: none` posé en structurel).
```

- [ ] **Step 4: Modifier `pagination.styles.ts` — styles structurels du select**

Dans `packages/core/src/components/pagination/pagination.styles.ts` :

1. Ajouter `[part~='select']` au groupe de sélecteurs qui pose la taille de cible tactile minimale :

```css
[part~='prev'],
[part~='next'],
[part~='link'],
[part~='current'],
[part~='select'],
[part~='ellipsis'] {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    /* a11y-fallback: WCAG 2.5.8 taille de cible minimale */
    min-height: var(--ar-pagination-btn-size, 2.5rem);
    /* a11y-fallback: WCAG 2.5.8 taille de cible minimale */
    min-width: var(--ar-pagination-btn-size, 2.5rem);
}
```

2. Ajouter `[part~='select']` au groupe qui pose l'outline `:focus-visible` :

```css
[part~='prev'],
[part~='next'],
[part~='link'],
[part~='current'],
[part~='select'] {
    &:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: 2px;
    }
}
```

3. Remplacer la règle `[part~='page-status'] { white-space: nowrap; }` (en fin de fichier) par :

```css
[part~='select'] {
    appearance: none;
}
```

- [ ] **Step 5: Lancer les tests pour vérifier qu'ils passent**

Run: `(cd packages/core && npx vitest run src/components/pagination/pagination.test.ts)`
Expected: PASS — tous les tests, y compris le nouveau bloc "palier select sous le plancher".

- [ ] **Step 6: Lancer la suite Vitest complète du composant pour vérifier l'absence de régression**

Run: `(cd packages/core && npx vitest run src/components/pagination/)`
Expected: PASS — aucun test existant (rendu, navigation, événements, annonces a11y, warn) cassé
par le renommage `useTextMode` → `useSelectMode` ou l'ajout du select.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/components/pagination/pagination.ts \
        packages/core/src/components/pagination/pagination.styles.ts \
        packages/core/src/components/pagination/pagination.test.ts
git commit -m "feat(pagination): remplace le palier texte par un select de saut de page"
```

---

### Task 2: Tests navigateur (WTR) et vérification empirique du débordement

**Files:**

- Modify: `packages/core/src/components/pagination/pagination.browser.test.ts`

**Interfaces:**

- Consumes: parts `select`, `page-select` produits par Task 1 ; propriété `.current`, événement
  `ar-pagination-page-change` (inchangés).
- Produces: verdict GO/NO-GO qui détermine si Task 3 (repli) doit être exécutée.

- [ ] **Step 1: Remplacer le test du palier texte par son équivalent select**

Dans `packages/core/src/components/pagination/pagination.browser.test.ts`, remplacer le test
`it('bascule sur le palier texte "Page X sur Y" à largeur extrême', ...)` (lignes 117-143
actuelles) par :

```ts
it('bascule sur un <select> de saut de page à largeur extrême', async () => {
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
    const select = shadow.querySelector('[part~="select"]') as HTMLSelectElement;
    expect(select).to.not.equal(null);
    expect(select.tagName.toLowerCase()).to.equal('select');
    expect(shadow.querySelectorAll('[part~="link"], [part~="current"]').length).to.equal(0);

    // _calculatePages(8, 15, budget-plancher) → _minimalPages(8, 15) = [1, -1, 8, -2, 15]
    const options = Array.from(select.querySelectorAll('option'));
    expect(options).to.have.lengthOf(5);
    expect(options[2]?.selected).to.equal(true);
    expect(options[2]?.textContent?.trim()).to.equal('Page 8 sur 15');
    expect(options[1]?.disabled).to.equal(true);
    expect(options[3]?.disabled).to.equal(true);
});

it('sélectionner une option du select change la page', async () => {
    const wrapper = await fixture(
        html`<div style="width: 90px;">
            <ar-pagination current="8" total="15"></ar-pagination>
        </div>`,
    );
    const el = wrapper.querySelector('ar-pagination') as HTMLElement;
    await elementUpdated(el);
    await waitForResize();

    const shadow = el.shadowRoot as ShadowRoot;
    const select = shadow.querySelector('[part~="select"]') as HTMLSelectElement;
    select.value = '15';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await elementUpdated(el);

    expect((el as unknown as { current: number }).current).to.equal(15);
});
```

- [ ] **Step 2: Mettre à jour le test "prev/next restent cliquables"**

Le test `it('prev/next restent cliquables au palier texte', ...)` (lignes 145-161 actuelles) ne
référence aucun sélecteur `page-status` — aucune modification nécessaire, seul son nom peut être
clarifié :

```ts
        it('prev/next restent cliquables au palier select', async () => {
```

(remplacer uniquement le titre du test, le corps reste identique).

- [ ] **Step 3: Mettre à jour le test de régression "ne reste pas bloqué"**

Dans le test `it("ne reste pas bloqué au palier texte après un changement d'ordre de grandeur de total suivi d'un réélargissement", ...)` (lignes 170-216 actuelles), remplacer toutes les occurrences de
`[part~="page-status"]` par `[part~="select"]`, et le titre du test :

```ts
it("ne reste pas bloqué au palier select après un changement d'ordre de grandeur de total suivi d'un réélargissement", async () => {
    // Régression : `total` qui change d'ordre de grandeur (9 → 10, 99 → 100, ...)
    // pendant que le composant est déjà au palier select marquait `_itemWidth` comme à
    // remesurer, mais aucun item numérique n'est rendu à ce palier — sans item à
    // mesurer, `_recalculateBudget` ne recalculait plus jamais `_budget`, bloquant le
    // composant sur le select même après un réélargissement massif du conteneur.
    const wrapper = await fixture(
        html`<div style="width: 700px;">
            <ar-pagination current="100" total="200"></ar-pagination>
        </div>`,
    );
    const el = wrapper.querySelector('ar-pagination') as HTMLElement;
    await elementUpdated(el);
    await waitForResize();

    const shadow = el.shadowRoot as ShadowRoot;

    // 1. Conteneur large → numéros affichés, `_itemWidth` mesuré normalement.
    expect(shadow.querySelectorAll('[part~="link"], [part~="current"]').length).to.be.greaterThan(
        0,
    );

    // 2. Rétrécir jusqu'au palier select.
    wrapper.style.width = '90px';
    await waitForResize();
    expect(shadow.querySelector('[part~="select"]')).to.not.equal(null);
    expect(shadow.querySelectorAll('[part~="link"], [part~="current"]').length).to.equal(0);

    // 3. Changer `total` (et `current`, pour rester valide) d'ordre de grandeur pendant
    //    que le composant est au palier select (déclenche l'invalidation de
    //    `_itemWidth`) — toujours aucun item numérique disponible pour remesurer
    //    immédiatement.
    (el as unknown as { total: number; current: number }).total = 15;
    (el as unknown as { total: number; current: number }).current = 8;
    await elementUpdated(el);
    await waitForResize();

    // 4. Réélargir le conteneur → les numéros doivent réapparaître normalement, pas
    //    rester bloqués sur le select.
    wrapper.style.width = '700px';
    await waitForResize();

    expect(shadow.querySelector('[part~="select"]')).to.equal(null);
    expect(shadow.querySelectorAll('[part~="link"], [part~="current"]').length).to.be.greaterThan(
        0,
    );
});
```

- [ ] **Step 4: Lancer la suite de tests navigateur du composant**

Run: `(cd packages/core && npx web-test-runner --files "src/components/pagination/pagination.browser.test.ts")`
Expected: PASS — tous les tests, y compris ceux de la section
`describe('invariant anti-débordement avec le thème par défaut ...')` (non modifiée par ce plan).

- [ ] **Step 5: Vérification empirique du débordement (décision GO/NO-GO pour Task 3)**

Le test `it('list.scrollWidth ne dépasse jamais list.clientWidth avec un total à 3 chiffres (total=999)', ...)`
(section "invariant anti-débordement", déjà présent, non modifié) balaie les largeurs
`[280, 360, 440, 480, 700]` avec `current="500" total="999"` — le cas le plus défavorable pour la
longueur du label (`"Page 500 sur 999"`, 3 chiffres × 2), avec les règles CSS du thème par défaut
(`column-gap`, `padding`) simulées. C'est la vérification empirique demandée par le spec (§ Tests,
"Vérification manuelle (Playwright)") : elle couvre directement le cas limite en conditions
proches du thème réel, sans script Playwright séparé.

- Si ce test **passe** (Step 4 déjà vert) : le label complet tient à toutes les largeurs testées,
  y compris 280px. **Ne pas exécuter Task 3** — noter dans le message de commit de Task 4 que le
  repli n'a pas été nécessaire.
- Si ce test **échoue** (débordement détecté à une largeur ≥ 320px) : passer à Task 3 avant de
  continuer.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/components/pagination/pagination.browser.test.ts
git commit -m "test(pagination): couvre le select de saut de page en tests navigateur"
```

---

### Task 3 (conditionnelle — seulement si Task 2 Step 5 a détecté un débordement) : Repli labels courts + aria-label dynamique

**Ne pas exécuter cette task si Task 2 Step 5 est passée sans débordement.** Si elle est ignorée,
le documenter explicitement dans Task 4.

**Files:**

- Modify: `packages/core/src/components/pagination/pagination.ts`
- Modify: `packages/core/src/components/pagination/pagination.test.ts`
- Modify: `packages/core/src/components/pagination/pagination.browser.test.ts`

**Interfaces:**

- Consumes: `renderPageSelect`, `_onSelectChange` produits par Task 1 (modifiés sur place, aucun
  renommage).
- Produces: aucun nouveau symbole — le contrat public (`part="select"`, événement
  `ar-pagination-page-change`) ne change pas, seul le contenu du DOM interne change.

- [ ] **Step 1: Modifier les tests unitaires (Vitest) pour le label court + aria-label**

Dans `packages/core/src/components/pagination/pagination.test.ts`, remplacer les deux tests
"peuple le select..." et "le label de chaque option..." du bloc `describe('palier select sous le
plancher', ...)` (ajoutés en Task 1) par :

```ts
it('peuple le select avec des labels courts et les mêmes pages que _calculatePages au plancher', async () => {
    el = await fixture('<ar-pagination current="3" total="15"></ar-pagination>');
    // @ts-expect-error accès à un champ privé pour simuler une mesure ResizeObserver
    el._budget = 2;
    el.requestUpdate();
    await waitForUpdate(el);

    const select = getPart(el, 'select') as HTMLSelectElement;
    const options = Array.from(select.querySelectorAll('option'));
    // _calculatePages(3, 15, 2) retombe sur _minimalPages(3, 15) = [1, -1, 3, -2, 15]
    expect(options).toHaveLength(5);
    expect(options.map((o) => o.disabled)).toEqual([false, true, false, true, false]);
    expect(options.map((o) => o.value)).toEqual(['1', '', '3', '', '15']);
    expect(options.map((o) => o.textContent?.trim())).toEqual(['1', '…', '3', '…', '15']);
    expect(options[2]?.selected).toBe(true);
});

it('le select porte un aria-label dynamique combinant nom et valeur courante', async () => {
    el = await fixture('<ar-pagination current="3" total="15"></ar-pagination>');
    // @ts-expect-error accès à un champ privé pour simuler une mesure ResizeObserver
    el._budget = 2;
    el.requestUpdate();
    await waitForUpdate(el);

    const select = getPart(el, 'select') as HTMLSelectElement;
    expect(select.getAttribute('aria-label')).toBe('Aller à la page 3 sur 15');
    expect(select.hasAttribute('aria-labelledby')).toBe(false);
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `(cd packages/core && npx vitest run src/components/pagination/pagination.test.ts)`
Expected: FAIL — le select porte encore `aria-labelledby` et des labels complets.

- [ ] **Step 3: Modifier `renderPageSelect` — labels courts + aria-label dynamique**

Dans `packages/core/src/components/pagination/pagination.ts`, remplacer `renderPageSelect` par :

```ts
    /**
     * Génère le `<li>` du select de saut de page, affiché à la place de la liste de pages au
     * palier minimal (largeur insuffisante pour la fenêtre de boutons la plus réduite).
     *
     * Labels d'option courts (numéro seul) + `aria-label` dynamique portant le nom et la valeur
     * courante : le label complet ("Page X sur Y") dans les options faisait déborder le
     * déclencheur fermé à largeur réduite (vérifié empiriquement, cf. plan d'implémentation).
     */
    protected renderPageSelect(current: number, total: number): TemplateResult {
        return html`<li part="item page-select">
            <select
                part="select"
                aria-label="Aller à la page ${current} sur ${total}"
                .value=${String(current)}
                @change=${this._onSelectChange}
            >
                ${_calculatePages(current, total, this._budget).map((page) =>
                    page === -1 || page === -2
                        ? html`<option disabled value="">…</option>`
                        : html`<option value=${page} ?selected=${page === current}>${page}</option>`,
                )}
            </select>
        </li>`;
    }
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `(cd packages/core && npx vitest run src/components/pagination/pagination.test.ts)`
Expected: PASS.

- [ ] **Step 5: Mettre à jour les tests navigateur (WTR) pour le label court**

Dans `packages/core/src/components/pagination/pagination.browser.test.ts`, dans le test
`it('bascule sur un <select> de saut de page à largeur extrême', ...)` (ajouté en Task 2),
remplacer :

```ts
expect(options[2]?.textContent?.trim()).to.equal('Page 8 sur 15');
```

par :

```ts
expect(options[2]?.textContent?.trim()).to.equal('8');
expect(select.getAttribute('aria-label')).to.equal('Aller à la page 8 sur 15');
```

- [ ] **Step 6: Relancer la vérification empirique (Task 2 Step 5) pour confirmer le repli**

Run: `(cd packages/core && npx web-test-runner --files "src/components/pagination/pagination.browser.test.ts")`
Expected: PASS, y compris `list.scrollWidth ne dépasse jamais list.clientWidth avec un total à 3
chiffres (total=999)` — confirme que le repli résout le débordement détecté en Task 2.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/components/pagination/pagination.ts \
        packages/core/src/components/pagination/pagination.test.ts \
        packages/core/src/components/pagination/pagination.browser.test.ts
git commit -m "fix(pagination): repli labels courts + aria-label dynamique (débordement à largeur réduite)"
```

---

### Task 4: Documentation

**Files:**

- Modify: `apps/docs/src/content/components/ar-pagination.mdx`

**Interfaces:**

- Consumes: comportement final d'`ar-pagination` issu de Task 1 (+ Task 3 si exécutée).
- Produces: aucune nouvelle interface — documentation uniquement.

- [ ] **Step 1: Réécrire la section "Comportement responsive"**

Dans `apps/docs/src/content/components/ar-pagination.mdx`, remplacer le troisième point de la
liste (actuellement) :

```
- **Largeur extrême** : les numéros de page sont remplacés par un texte "Page X sur Y". Les
  boutons précédent/suivant restent toujours affichés et fonctionnels.
```

par :

```
- **Largeur extrême** : les numéros de page sont remplacés par un `<select>` de saut de page,
  peuplé des mêmes pages que la fenêtre minimale ci-dessus (première page, dernière page, page
  active) — les ellipses y apparaissent comme options désactivées. Sélectionner une page dans
  cette liste a le même effet qu'un clic sur un numéro. Les boutons précédent/suivant restent
  toujours affichés et fonctionnels.
```

- [ ] **Step 2: Vérifier le rendu MDX**

Run: `npx astro check --root apps/docs`
Expected: 0 erreurs.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/src/content/components/ar-pagination.mdx
git commit -m "docs(pagination): documente le select de saut de page au palier minimal"
```
