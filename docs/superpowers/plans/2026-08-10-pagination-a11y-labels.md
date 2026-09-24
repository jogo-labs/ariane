# Labels accessibles enrichis d'ar-pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrichir les labels accessibles d'`ar-pagination` (prev/next, liens de page, page active,
nom du landmark) avec le nombre total de pages, corriger `aria-current="true"` en
`aria-current="page"`, sans changement visuel.

**Architecture:** Toutes les modifications sont dans `pagination.ts` : les méthodes de rendu
(`renderPage`, `renderPageLink`, `renderPageLabel`) gagnent un paramètre `total` propagé depuis
`render()` ; `renderPageLabel` sépare texte lu (`<span class="sr-only">`, complet) et texte
affiché (`<span aria-hidden="true">`, numéro seul) au lieu de préfixer le numéro visible d'un
texte sr-only partiel. Le nom du landmark (`<p id="ar-pagination">`) devient dynamique.

**Tech Stack:** Lit 3 + TypeScript, Vitest (happy-dom) pour les tests unitaires, `@web/test-runner`
et Playwright/Chromium pour les tests navigateur et axe-core.

## Global Constraints

- Prettier : 100 caractères, 4 espaces, guillemets simples. `import type` pour les imports de
  types. Conventional Commits.
- Aucun changement visuel : seul le texte accessible (sr-only, attributs ARIA) change ; le rendu
  visible (numéros affichés, mise en page) reste identique.
- Changement de signature des méthodes protégées (`renderPage`, `renderPageLink`,
  `renderPageLabel`) accepté sans dépréciation — composant en alpha (cf. CLAUDE.md).
- Tout le texte interpolé destiné à être lu par un lecteur d'écran doit rester une **seule chaîne
  dans un seul élément** (jamais plusieurs bindings Lit adjacents au même niveau dans un conteneur
  `display:flex`) — c'est la cause du bug historique #152 ("8sur15"), déjà documentée dans
  `pagination.ts`.
- `vitest` s'exécute depuis `packages/core`, jamais depuis la racine du repo.

---

### Task 1: Labels enrichis — prev/next, pages, aria-current, landmark dynamique

**Files:**

- Modify: `packages/core/src/components/pagination/pagination.ts`
- Modify: `packages/core/src/components/pagination/pagination.test.ts`

**Interfaces:**

- Consumes : aucune nouvelle dépendance externe.
- Produces : nouvelles signatures `renderPage(page: number, active: boolean, total: number)`,
  `renderPageLink(page: number, active: boolean, total: number)`,
  `renderPageLabel(page: number, total: number)` — Task 2 (tests navigateur) et Task 3 (docs) lisent
  le rendu qui en résulte, aucune n'appelle directement ces méthodes.

- [ ] **Step 1: Écrire les tests unitaires qui échouent (Vitest)**

Dans `packages/core/src/components/pagination/pagination.test.ts`, remplacer le test existant :

```ts
it('la page active a aria-current="true"', async () => {
    el = await fixture('<ar-pagination current="3" total="5"></ar-pagination>');
    const shadow = el.shadowRoot as ShadowRoot;
    const current = shadow.querySelector('[part="current"]') as Element;
    expect(current).not.toBeNull();
    expect(current.getAttribute('aria-current')).toBe('true');
});
```

par :

```ts
it('la page active a aria-current="page"', async () => {
    el = await fixture('<ar-pagination current="3" total="5"></ar-pagination>');
    const shadow = el.shadowRoot as ShadowRoot;
    const current = shadow.querySelector('[part="current"]') as Element;
    expect(current).not.toBeNull();
    expect(current.getAttribute('aria-current')).toBe('page');
});
```

Puis ajouter un nouveau bloc `describe`, juste après la fermeture du `describe('pages affichées', ...)` (après la ligne contenant le test `'ellipses présentes si total >= 10 ...'`) :

```ts
// ── Labels accessibles enrichis ──────────────────────────────────────────

describe('labels accessibles enrichis (total dans le contexte)', () => {
    it('le sr-only d\'un lien de page inclut le total ("Page X sur Y")', async () => {
        el = await fixture('<ar-pagination current="3" total="12"></ar-pagination>');
        const shadow = el.shadowRoot as ShadowRoot;
        const link = shadow.querySelector('[data-ar-pagination-page="4"]') as Element;
        const srOnly = link.querySelector('.sr-only');
        expect(srOnly?.textContent).toBe('Page 4 sur 12');
    });

    it("le span aria-hidden d'un lien de page ne contient que le numéro (rendu visuel inchangé)", async () => {
        el = await fixture('<ar-pagination current="3" total="12"></ar-pagination>');
        const shadow = el.shadowRoot as ShadowRoot;
        const link = shadow.querySelector('[data-ar-pagination-page="4"]') as Element;
        const visible = link.querySelector('[aria-hidden="true"]');
        expect(visible?.textContent).toBe('4');
    });

    it('le sr-only de la page active inclut le total ("Page X sur Y")', async () => {
        el = await fixture('<ar-pagination current="3" total="12"></ar-pagination>');
        const shadow = el.shadowRoot as ShadowRoot;
        const current = shadow.querySelector('[part="current"]') as Element;
        const srOnly = current.querySelector('.sr-only');
        expect(srOnly?.textContent).toBe('Page 3 sur 12');
    });

    it('le sr-only de "précédent" inclut le total', async () => {
        el = await fixture('<ar-pagination current="3" total="12"></ar-pagination>');
        const srOnly = requirePart(el, 'prev').querySelector('.sr-only');
        expect(srOnly?.textContent).toBe('Page précédente (page 2 sur 12)');
    });

    it('le sr-only de "suivant" inclut le total', async () => {
        el = await fixture('<ar-pagination current="3" total="12"></ar-pagination>');
        const srOnly = requirePart(el, 'next').querySelector('.sr-only');
        expect(srOnly?.textContent).toBe('Page suivante (page 4 sur 12)');
    });

    it('le nom du landmark (aria-labelledby) reflète current/total', async () => {
        el = await fixture('<ar-pagination current="3" total="12"></ar-pagination>');
        const label = (el.shadowRoot as ShadowRoot).getElementById('ar-pagination');
        expect(label?.textContent).toBe('Pagination, page 3 sur 12');
    });

    it('le nom du landmark se met à jour après un changement de page', async () => {
        el = await fixture('<ar-pagination current="3" total="12"></ar-pagination>');
        el.current = 4;
        await waitForUpdate(el);
        const label = (el.shadowRoot as ShadowRoot).getElementById('ar-pagination');
        expect(label?.textContent).toBe('Pagination, page 4 sur 12');
    });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `(cd packages/core && npx vitest run src/components/pagination/pagination.test.ts)`
Expected: FAIL — `aria-current` vaut encore `"true"`, les `.sr-only` ne contiennent pas encore le
total, le landmark reste statique "Pagination".

- [ ] **Step 3: Modifier `pagination.ts`**

Dans `packages/core/src/components/pagination/pagination.ts`, dans `render()`, remplacer le nom
statique du landmark :

```ts
            <p id="ar-pagination" class="sr-only">Pagination</p>
```

par :

```ts
            <p id="ar-pagination" class="sr-only">Pagination, page ${current} sur ${total}</p>
```

Remplacer le label sr-only de "précédent" :

```ts
                        <span class="sr-only">Page précédente (page ${previousPageNumber})</span>
```

par :

```ts
                        <span class="sr-only"
                            >Page précédente (page ${previousPageNumber} sur ${total})</span
                        >
```

Remplacer le label sr-only de "suivant" :

```ts
                        <span class="sr-only">Page suivante (page ${nextPageNumber})</span>
```

par :

```ts
                        <span class="sr-only"
                            >Page suivante (page ${nextPageNumber} sur ${total})</span
                        >
```

Dans la branche `repeat(pages, ...)`, remplacer l'appel :

```ts
                                  : this.renderPage(page, page === current);
```

par :

```ts
                                  : this.renderPage(page, page === current, total);
```

Remplacer les trois méthodes `renderPage`, `renderPageLink`, `renderPageLabel` :

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
            return html` <span
                part="current"
                tabindex="-1"
                aria-current="true"
                data-ar-pagination-page="${page}"
            >
                ${this.renderPageLabel(page)}
            </span>`;
        }
        return html` <a part="link" data-ar-pagination-page="${page}" href="javascript:;">
            ${this.renderPageLabel(page)}
        </a>`;
    }

    /** Génère le label d'une page avec texte sr-only pour les lecteurs d'écran */
    protected renderPageLabel(page: number): TemplateResult {
        return html`<span class="sr-only">Page&nbsp;</span>${page}`;
    }
```

par :

```ts
    /** Génère le `<li>` d'une page. Surcharger en sous-classe si besoin. */
    protected renderPage(page: number, active: boolean, total: number): TemplateResult {
        return html` <li part="item${active ? ' item--current' : ''}">
            ${this.renderPageLink(page, active, total)}
        </li>`;
    }

    /** Génère le lien ou le span (si page active) d'une page */
    protected renderPageLink(page: number, active: boolean, total: number): TemplateResult {
        if (active) {
            return html` <span
                part="current"
                tabindex="-1"
                aria-current="page"
                data-ar-pagination-page="${page}"
            >
                ${this.renderPageLabel(page, total)}
            </span>`;
        }
        return html` <a part="link" data-ar-pagination-page="${page}" href="javascript:;">
            ${this.renderPageLabel(page, total)}
        </a>`;
    }

    /**
     * Génère le label d'une page : texte complet ("Page X sur Y") lu par les lecteurs d'écran,
     * numéro seul affiché — les deux `<span>` doivent rester adjacents sans texte/espace entre
     * eux (voir garde globale sur les bindings adjacents dans un conteneur flex).
     */
    protected renderPageLabel(page: number, total: number): TemplateResult {
        return html`<span class="sr-only">Page ${page} sur ${total}</span
            ><span aria-hidden="true">${page}</span>`;
    }
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `(cd packages/core && npx vitest run src/components/pagination/pagination.test.ts)`
Expected: PASS — tous les tests, y compris le nouveau bloc "labels accessibles enrichis".

- [ ] **Step 5: Lancer la suite Vitest complète du composant pour vérifier l'absence de régression**

Run: `(cd packages/core && npx vitest run src/components/pagination/)`
Expected: PASS — en particulier le test `'total négatif : render() reste fonctionnel...'`
(`pagination.test.ts`, describe `'warn() — bornes numériques'`), qui vérifie que le label de
prev/next ne contient jamais de nombre négatif — doit rester vert avec le total désormais inclus
dans ce même label.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/components/pagination/pagination.ts \
        packages/core/src/components/pagination/pagination.test.ts
git commit -m "feat(pagination): enrichit les labels accessibles avec le total de pages"
```

---

### Task 2: Vérification navigateur — rendu réel, focus, axe-core

**Files:**

- Modify: `packages/core/src/components/pagination/pagination.browser.test.ts`
- Modify: `packages/core/src/components/pagination/pagination.a11y.test.ts`

**Interfaces:**

- Consumes : structure produite par Task 1 (`part="link"`/`part="current"` contenant
  `.sr-only`/`[aria-hidden="true"]`, `aria-current="page"`, palier select via `_budget` privé déjà
  utilisé par les tests existants du même fichier).
- Produces : aucune nouvelle interface — tests uniquement.

- [ ] **Step 1: Ajouter un test navigateur avec `innerText` (pas seulement `textContent`)**

Dans `packages/core/src/components/pagination/pagination.browser.test.ts`, ajouter un nouveau
`describe`, juste après la fermeture du `describe('masquage responsive progressif (#152)', ...)`
(avant `describe('invariant anti-débordement ...')`) :

```ts
describe('labels accessibles enrichis (total dans le contexte)', () => {
    it('le sr-only d\'un lien de page se lit "Page X sur Y" en layout réel (innerText)', async () => {
        const el = await fixture(html`<ar-pagination current="3" total="12"></ar-pagination>`);
        const link = el.shadowRoot?.querySelector('[data-ar-pagination-page="4"]') as HTMLElement;
        const srOnly = link.querySelector('.sr-only') as HTMLElement;
        // `innerText` (pas `textContent`) : reflète le rendu réel appliqué par le layout,
        // seul moyen fiable de détecter une régression du bug historique #152 ("8sur15") où
        // plusieurs bindings adjacents dans un conteneur flex perdaient leurs espaces.
        expect(srOnly.innerText.trim()).to.equal('Page 4 sur 12');
    });

    it('la page active porte aria-current="page"', async () => {
        const el = await fixture(html`<ar-pagination current="3" total="12"></ar-pagination>`);
        const current = el.shadowRoot?.querySelector('[part="current"]') as HTMLElement;
        expect(current.getAttribute('aria-current')).to.equal('page');
    });
});
```

- [ ] **Step 2: Lancer ce test pour vérifier qu'il échoue avant Task 1... (déjà fait, Task 1 est mergée)**

Ce step est informatif seulement si Task 1 n'était pas encore appliquée ; dans l'ordre normal
d'exécution de ce plan, Task 1 est déjà en place — passer directement au Step 3.

- [ ] **Step 3: Lancer la suite de tests navigateur du composant**

Run: `(cd packages/core && npx web-test-runner --files "src/components/pagination/pagination.browser.test.ts")`
Expected: PASS — tous les tests, y compris ceux de focus existants (`'focalise le nouvel élément
part="current"...'`) : aucune régression, la structure interne de `[part="current"]` change mais
pas son `tabindex`/focusabilité.

- [ ] **Step 4: Ajouter un scénario axe-core pour le palier select**

Dans `packages/core/src/components/pagination/pagination.a11y.test.ts`, ajouter à la fin du
`describe('ar-pagination — accessibilité', ...)`, après le test `'avec ellipses (total élevé) est
accessible'` :

```ts
it('palier select (largeur insuffisante) est accessible', async () => {
    const el = await fixture(html`<ar-pagination current="8" total="20"></ar-pagination>`);
    // Force le palier select sans dépendre d'un ResizeObserver réel en test — même technique
    // que pagination.browser.test.ts pour simuler un budget mesuré très restreint.
    (el as unknown as { _budget: number })._budget = 2;
    (el as unknown as { requestUpdate: () => void }).requestUpdate();
    await (el as unknown as { updateComplete: Promise<boolean> }).updateComplete;
    await expect(el).to.be.accessible();
});
```

- [ ] **Step 5: Lancer la suite a11y du composant**

Run: `(cd packages/core && npx web-test-runner --files "src/components/pagination/pagination.a11y.test.ts")`
Expected: PASS — les 4 scénarios existants restent verts, le nouveau scénario select passe axe-core
sans violation.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/components/pagination/pagination.browser.test.ts \
        packages/core/src/components/pagination/pagination.a11y.test.ts
git commit -m "test(pagination): couvre les labels enrichis et le palier select en tests navigateur/a11y"
```

---

### Task 3: Documentation

**Files:**

- Modify: `apps/docs/src/content/components/ar-pagination.mdx`

**Interfaces:**

- Consumes : comportement final d'`ar-pagination` issu de Tasks 1-2.
- Produces : aucune nouvelle interface — documentation uniquement.

- [ ] **Step 1: Mettre à jour la section "Pris en charge automatiquement"**

Dans `apps/docs/src/content/components/ar-pagination.mdx`, remplacer :

```mdx
### Pris en charge automatiquement

- `role="navigation"` et `aria-labelledby` posés sur le conteneur — la région est annoncée
  par les lecteurs d'écran comme zone de navigation.
- Les boutons "précédent" et "suivant" ont `aria-disabled` synchronisé avec leur état désactivé —
    <WcagRef
        criterion="4.1.2"
        summary="Name, Role, Value : tout composant UI doit exposer son nom, rôle et valeur (états inclus) aux technologies d'assistance."
    />
- Les séparateurs et points de suspension sont masqués aux lecteurs d'écran (`aria-hidden`).
```

par :

```mdx
### Pris en charge automatiquement

- `role="navigation"` et `aria-labelledby` posés sur le conteneur, dont le nom inclut la position
  courante ("Pagination, page 4 sur 12") — repérable immédiatement en navigation par régions,
  sans avoir à explorer les liens pour savoir où on en est.
- Les boutons "précédent" et "suivant" ont `aria-disabled` synchronisé avec leur état désactivé —
    <WcagRef
        criterion="4.1.2"
        summary="Name, Role, Value : tout composant UI doit exposer son nom, rôle et valeur (états inclus) aux technologies d'assistance."
    />
- Chaque lien de page et les boutons "précédent"/"suivant" indiquent le nombre total de pages
  ("Page 4 sur 12") — la position dans la liste (début, milieu, fin) est compréhensible en
  navigation clavier/lecteur d'écran, sans avoir à deviner si une page est la dernière.
- La page active porte `aria-current="page"`.
- Les séparateurs et points de suspension sont masqués aux lecteurs d'écran (`aria-hidden`).
```

- [ ] **Step 2: Vérifier le rendu MDX**

Run: `npx astro check --root apps/docs`
Expected: 0 erreurs.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/src/content/components/ar-pagination.mdx
git commit -m "docs(pagination): documente les labels accessibles enrichis"
```
