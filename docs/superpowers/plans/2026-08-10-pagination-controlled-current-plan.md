# Passage d'`ar-pagination.current` en modèle contrôlé — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `ar-pagination.current` cesse d'être muté en interne au clic ; le composant dispatch uniquement un event cancelable d'intention (`ar-pagination-page-change`) puis un event de confirmation (`ar-pagination-page-changed`) une fois que `current` a réellement transitionné — c'est au consommateur de réassigner `current`.

**Architecture:** Deux événements sur le modèle verbe/participe-passé déjà utilisé par `ar-dialog` (`show`/`shown`). `page-change` (cancelable) est dispatché depuis les 4 handlers d'interaction sans toucher à `current`. `page-changed` (non-cancelable), l'annonce aria-live et le transfert de focus sont tous les trois déclenchés depuis `updated()` quand `current` a réellement changé — peu importe la source (réassignation suite à confirmation du consommateur, ou set externe indépendant).

**Tech Stack:** Lit 3, TypeScript, Vitest (happy-dom), @open-wc/testing + @web/test-runner (Chromium réel), Astro 6 + MDX (docs).

## Global Constraints

- Breaking change direct, sans dépréciation (package en `0.1.0-alpha.8`, règle CLAUDE.md).
- Prettier : 100 caractères, 4 espaces, quotes simples.
- `import type` pour tous les imports de types.
- Conventional Commits (commitlint + Husky) — un commit par étape complète.
- Branches `fix/<desc>` depuis `dev`, PR vers `dev`.
- Référence de design : `docs/superpowers/specs/2026-08-10-pagination-controlled-current-design.md`.

---

### Task 1: Créer la branche de travail

**Files:** aucun.

- [ ] **Step 1: Créer la branche depuis `dev`**

```bash
cd /Users/jon/Code/Active_projects/ariane
git checkout dev
git pull origin dev
git checkout -b fix/161-pagination-controlled-current
```

---

### Task 2: `ar-pagination-page-change` cancelable, `current` purement contrôlé

**Files:**

- Modify: `packages/core/src/components/pagination/pagination.ts:376-427` (méthodes `_onSelectChange`, `_onPreviousPage`, `_onNextPage`, `_onPageChange`, `_emit`)
- Test: `packages/core/src/components/pagination/pagination.test.ts:511-682` (describes `navigation` et `événement ar-pagination-page-change`)

**Interfaces:**

- Consumes: `ArPaginationPageChangeDetail` (déjà défini, `pagination.ts:19-24`, `{ from: number, to: number }`) ; `_clamp` (déjà importé de `./pagination.utils.js`).
- Produces: `private _requestPageChange(to: number): boolean` — dispatch `ar-pagination-page-change` (cancelable), retourne `false` si `preventDefault()` a été appelé (valeur de retour native de `dispatchEvent`). Utilisé par la Task 3 pour rien de plus (Task 3 ne touche pas cette méthode).

- [ ] **Step 1: Remplacer le describe `navigation` par la version "current contrôlé" (tests qui doivent échouer contre l'implémentation actuelle)**

Dans `packages/core/src/components/pagination/pagination.test.ts`, remplacer entièrement le bloc `describe('navigation', ...)` (lignes 513 à 592) par :

```typescript
// ── Navigation (current reste contrôlé de l'extérieur) ──────────────────

describe('navigation (current contrôlé)', () => {
    it('un clic sur prev ne mute pas current tout seul', async () => {
        el = await fixture('<ar-pagination current="3" total="5"></ar-pagination>');
        (requirePart(el, 'prev') as HTMLElement).click();
        await waitForUpdate(el);
        expect(el.current).toBe(3);
    });

    it('un clic sur next ne mute pas current tout seul', async () => {
        el = await fixture('<ar-pagination current="3" total="5"></ar-pagination>');
        (requirePart(el, 'next') as HTMLElement).click();
        await waitForUpdate(el);
        expect(el.current).toBe(3);
    });

    it('un clic sur un lien de page ne mute pas current tout seul', async () => {
        el = await fixture('<ar-pagination current="1" total="5"></ar-pagination>');
        const shadow = el.shadowRoot as ShadowRoot;
        const pageLink = shadow.querySelector('[data-ar-pagination-page="3"]') as HTMLElement;
        pageLink.click();
        await waitForUpdate(el);
        expect(el.current).toBe(1);
    });

    it("un clic sur le span imbriqué (numéro visible) résout tout de même l'ancre via closest()", async () => {
        // Régression : `renderPageLabel` enveloppe le numéro visible dans un
        // `<span aria-hidden="true">` nichée dans le `<a part="link">`. `_onPageChange`
        // doit résoudre l'ancre via `closest()` même quand `event.target` est ce span.
        el = await fixture('<ar-pagination current="1" total="5"></ar-pagination>');
        const shadow = el.shadowRoot as ShadowRoot;
        const handler = vi.fn();
        el.addEventListener('ar-pagination-page-change', handler);
        const pageLink = shadow.querySelector('[data-ar-pagination-page="3"]') as HTMLElement;
        const visibleNumber = pageLink.querySelector('[aria-hidden="true"]') as HTMLElement;
        visibleNumber.click();
        await waitForUpdate(el);
        expect(handler).toHaveBeenCalledOnce();
        const detail = (handler.mock.calls[0][0] as CustomEvent<ArPaginationPageChangeDetail>)
            .detail;
        expect(detail).toEqual({ from: 1, to: 3 });
    });

    it('réassigner current depuis un handler ar-pagination-page-change met à jour le rendu', async () => {
        el = await fixture('<ar-pagination current="1" total="5"></ar-pagination>');
        el.addEventListener('ar-pagination-page-change', (e) => {
            el.current = (e as CustomEvent<ArPaginationPageChangeDetail>).detail.to;
        });
        const shadow = el.shadowRoot as ShadowRoot;
        const pageLink = shadow.querySelector('[data-ar-pagination-page="3"]') as HTMLElement;
        pageLink.click();
        await waitForUpdate(el);
        expect(el.current).toBe(3);
    });

    it("un clic sur prev/next ne modifie pas le focus (l'élément cliqué reste focalisable)", async () => {
        el = await fixture('<ar-pagination current="3" total="5"></ar-pagination>');
        const nextBtn = requirePart(el, 'next') as HTMLElement;
        nextBtn.focus();
        nextBtn.click();
        await waitForUpdate(el);
        expect(el.shadowRoot?.activeElement).toBe(nextBtn);
    });
});
```

Ce remplacement retire au passage les deux tests de focus ("un clic sur un lien de page
focalise...", "le nouvel élément part=current porte tabindex=-1", lignes 565-581 de l'ancien
fichier) : ils sont réintroduits, adaptés au modèle contrôlé, dans le describe `focus après
confirmation externe` de la Task 3 Step 1 — rien à faire de plus ici.

- [ ] **Step 2: Remplacer le describe `événement ar-pagination-page-change`**

Remplacer le bloc (lignes 596-682, avant le describe `annonces a11y`) par :

```typescript
// ── Événement ar-pagination-page-change ──────────────────────────────────

describe('événement ar-pagination-page-change', () => {
    it('est cancelable', async () => {
        el = await fixture('<ar-pagination current="2" total="5"></ar-pagination>');
        const handler = vi.fn();
        el.addEventListener('ar-pagination-page-change', handler);
        (requirePart(el, 'next') as HTMLElement).click();
        await waitForUpdate(el);
        const event = handler.mock.calls[0]?.[0] as CustomEvent;
        expect(event.cancelable).toBe(true);
    });

    it('émis avec {from, to} au clic sur next', async () => {
        el = await fixture('<ar-pagination current="2" total="5"></ar-pagination>');
        const handler = vi.fn();
        el.addEventListener('ar-pagination-page-change', handler);

        (requirePart(el, 'next') as HTMLElement).click();
        await waitForUpdate(el);

        expect(handler).toHaveBeenCalledOnce();
        const detail = (handler.mock.calls[0][0] as CustomEvent<ArPaginationPageChangeDetail>)
            .detail;
        expect(detail).toEqual({ from: 2, to: 3 });
    });

    it('émis avec {from, to} au clic sur prev', async () => {
        el = await fixture('<ar-pagination current="3" total="5"></ar-pagination>');
        const handler = vi.fn();
        el.addEventListener('ar-pagination-page-change', handler);

        (requirePart(el, 'prev') as HTMLElement).click();
        await waitForUpdate(el);

        expect(handler).toHaveBeenCalledOnce();
        const detail = (handler.mock.calls[0][0] as CustomEvent<ArPaginationPageChangeDetail>)
            .detail;
        expect(detail).toEqual({ from: 3, to: 2 });
    });

    it('émis avec {from, to} au clic sur un lien de page', async () => {
        el = await fixture('<ar-pagination current="1" total="5"></ar-pagination>');
        const handler = vi.fn();
        el.addEventListener('ar-pagination-page-change', handler);

        const shadow = el.shadowRoot as ShadowRoot;
        const pageLink = shadow.querySelector('[data-ar-pagination-page="4"]') as HTMLElement;
        pageLink.click();
        await waitForUpdate(el);

        expect(handler).toHaveBeenCalledOnce();
        const detail = (handler.mock.calls[0][0] as CustomEvent<ArPaginationPageChangeDetail>)
            .detail;
        expect(detail).toEqual({ from: 1, to: 4 });
    });

    it("n'est pas émis si prev est cliqué en page 1", async () => {
        el = await fixture('<ar-pagination current="1" total="5"></ar-pagination>');
        const handler = vi.fn();
        el.addEventListener('ar-pagination-page-change', handler);

        (requirePart(el, 'prev') as HTMLElement).click();
        await waitForUpdate(el);

        expect(handler).not.toHaveBeenCalled();
    });

    it("n'est pas émis si next est cliqué en dernière page", async () => {
        el = await fixture('<ar-pagination current="5" total="5"></ar-pagination>');
        const handler = vi.fn();
        el.addEventListener('ar-pagination-page-change', handler);

        (requirePart(el, 'next') as HTMLElement).click();
        await waitForUpdate(el);

        expect(handler).not.toHaveBeenCalled();
    });

    it('bulle et traverse le Shadow DOM (bubbles + composed)', async () => {
        el = await fixture('<ar-pagination current="2" total="5"></ar-pagination>');
        let captured: CustomEvent | null = null;
        document.addEventListener(
            'ar-pagination-page-change',
            (e) => {
                captured = e as CustomEvent;
            },
            { once: true },
        );

        (requirePart(el, 'next') as HTMLElement).click();
        await waitForUpdate(el);

        expect(captured).not.toBeNull();
    });

    it("preventDefault() bloque l'interaction : current ne change pas, le focus reste sur l'élément cliqué", async () => {
        el = await fixture('<ar-pagination current="1" total="5"></ar-pagination>');
        el.addEventListener('ar-pagination-page-change', (e) => e.preventDefault());
        const shadow = el.shadowRoot as ShadowRoot;
        const pageLink = shadow.querySelector('[data-ar-pagination-page="3"]') as HTMLElement;
        pageLink.focus();
        pageLink.click();
        await waitForUpdate(el);

        expect(el.current).toBe(1);
        expect(shadow.activeElement).toBe(pageLink);
    });
});

describe('palier select — modèle contrôlé', () => {
    it('changer la valeur du select émet ar-pagination-page-change sans muter current', async () => {
        el = await fixture('<ar-pagination current="3" total="15"></ar-pagination>');
        // @ts-expect-error accès à un champ privé pour simuler une mesure ResizeObserver
        el._budget = 2;
        el.requestUpdate();
        await waitForUpdate(el);

        const handler = vi.fn();
        el.addEventListener('ar-pagination-page-change', handler);
        const select = (el.shadowRoot as ShadowRoot).querySelector(
            '[part="select"]',
        ) as HTMLSelectElement;
        select.value = '15';
        select.dispatchEvent(new Event('change'));
        await waitForUpdate(el);

        expect(el.current).toBe(3);
        expect(handler).toHaveBeenCalledOnce();
        const detail = (handler.mock.calls[0][0] as CustomEvent<ArPaginationPageChangeDetail>)
            .detail;
        expect(detail).toEqual({ from: 3, to: 15 });
    });

    it('preventDefault() sur le select revert sa valeur DOM affichée', async () => {
        el = await fixture('<ar-pagination current="3" total="15"></ar-pagination>');
        // @ts-expect-error accès à un champ privé pour simuler une mesure ResizeObserver
        el._budget = 2;
        el.requestUpdate();
        await waitForUpdate(el);
        el.addEventListener('ar-pagination-page-change', (e) => e.preventDefault());

        const select = (el.shadowRoot as ShadowRoot).querySelector(
            '[part="select"]',
        ) as HTMLSelectElement;
        select.value = '15';
        select.dispatchEvent(new Event('change'));
        await waitForUpdate(el);

        expect(el.current).toBe(3);
        expect(select.value).toBe('3');
    });

    it('réassigner current depuis le handler du select met à jour le rendu', async () => {
        el = await fixture('<ar-pagination current="3" total="15"></ar-pagination>');
        // @ts-expect-error accès à un champ privé pour simuler une mesure ResizeObserver
        el._budget = 2;
        el.requestUpdate();
        await waitForUpdate(el);
        el.addEventListener('ar-pagination-page-change', (e) => {
            el.current = (e as CustomEvent<ArPaginationPageChangeDetail>).detail.to;
        });

        const select = (el.shadowRoot as ShadowRoot).querySelector(
            '[part="select"]',
        ) as HTMLSelectElement;
        select.value = '15';
        select.dispatchEvent(new Event('change'));
        await waitForUpdate(el);

        expect(el.current).toBe(15);
    });

    it('prev/next au palier select ne mutent plus current tout seuls', async () => {
        el = await fixture('<ar-pagination current="3" total="15"></ar-pagination>');
        // @ts-expect-error accès à un champ privé pour simuler une mesure ResizeObserver
        el._budget = 2;
        el.requestUpdate();
        await waitForUpdate(el);

        expect(getPart(el, 'prev')).not.toBeNull();
        expect(getPart(el, 'next')).not.toBeNull();
        (requirePart(el, 'next') as HTMLElement).click();
        await waitForUpdate(el);
        expect(el.current).toBe(3);
    });
});
```

Cette dernière insertion remplace aussi le test "changer la valeur du select émet..." et "prev/next restent affichés et fonctionnels au palier select" du describe `palier select sous le plancher` (lignes 384-420 dans le fichier actuel) : les retirer de ce describe pour éviter la duplication, le reste du describe `palier select sous le plancher` (rendu, peuplement des options) reste inchangé.

- [ ] **Step 3: Lancer les tests pour vérifier qu'ils échouent contre l'implémentation actuelle**

```bash
cd /Users/jon/Code/Active_projects/ariane
npx vitest run packages/core/src/components/pagination/pagination.test.ts
```

Expected: plusieurs échecs — `el.current` vaut la nouvelle page au lieu de rester inchangé, `event.cancelable` est `false` (event actuel non cancelable), `preventDefault()` n'a aucun effet.

- [ ] **Step 4: Remplacer les 4 handlers et `_emit` par le nouveau flux**

Dans `packages/core/src/components/pagination/pagination.ts`, remplacer les méthodes `_onSelectChange`, `_onPreviousPage`, `_onNextPage`, `_onPageChange` et `_emit` (lignes 376-423) par :

```typescript
    private _onSelectChange(event: Event): void {
        const select = event.target as HTMLSelectElement;
        const page = parseInt(select.value, 10);
        if (Number.isNaN(page) || page === this.current) return;
        if (!this._requestPageChange(page)) {
            // Annulé : le <select> a déjà muté nativement sa `.value` avant que ce handler ne
            // s'exécute. Puisque `current` ne change pas, aucun cycle de rendu ne redéclenchera
            // le sync existant dans updated() — revert explicite nécessaire ici.
            select.value = String(_clamp(this.current, 1, Math.max(this.total, 1)));
        }
    }

    private _onPreviousPage(): void {
        if (this.current <= 1) return;
        this._requestPageChange(this.current - 1);
    }

    private _onNextPage(): void {
        if (this.current >= this.total) return;
        this._requestPageChange(this.current + 1);
    }

    private _onPageChange(event: MouseEvent): void {
        const link = (event.target as HTMLElement).closest<HTMLAnchorElement>(
            'a[data-ar-pagination-page]',
        );
        const page = link?.dataset['arPaginationPage'];
        if (!link || !page) return;
        this._requestPageChange(parseInt(page));
    }

    /**
     * Dispatch l'intention de changement de page, sans muter `current` : c'est au
     * consommateur de le réassigner en réponse à cet event pour que le changement prenne
     * effet (modèle contrôlé, cf. ar-stepper.currentPath).
     * @returns `false` si `preventDefault()` a été appelé sur l'event (valeur native de
     *   `dispatchEvent` pour un event cancelable).
     */
    private _requestPageChange(to: number): boolean {
        const from = this.current;
        return this.dispatchEvent(
            new CustomEvent<ArPaginationPageChangeDetail>('ar-pagination-page-change', {
                bubbles: true,
                composed: true,
                cancelable: true,
                detail: { from, to },
            }),
        );
    }
```

Remarque : `focusAfterUpdate` et `_announcePageChange()` ne sont plus appelés depuis ces méthodes — ils seront déplacés vers `updated()` en Task 3. Retirer aussi les imports devenus inutilisés si `focusAfterUpdate`/`announceA11y` ne sont plus référencés ailleurs dans le fichier à ce stade (ils seront réintroduits en Task 3, donc laisser les imports en place pour éviter un aller-retour — Task 3 les réutilise dans le même fichier).

- [ ] **Step 5: Lancer les tests pour vérifier qu'ils passent**

```bash
npx vitest run packages/core/src/components/pagination/pagination.test.ts
```

Expected: PASS pour tous les tests des describes modifiés en Step 1/2. Des échecs sont attendus sur les tests de focus/annonce non encore adaptés (Task 3) et sur ceux d'annonce a11y — normal à ce stade, traités en Task 3.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/components/pagination/pagination.ts packages/core/src/components/pagination/pagination.test.ts
git commit -m "fix(pagination): current devient controle, page-change cancelable (#161)"
```

---

### Task 3: `ar-pagination-page-changed`, annonce et focus déplacés vers `updated()`

**Files:**

- Modify: `packages/core/src/components/pagination/pagination.ts:56` (JSDoc `@event`), `:80-91` (champs privés), `:166-199` (`updated()`)
- Test: `packages/core/src/components/pagination/pagination.test.ts` (describes `annonces a11y`, focus après clic)

**Interfaces:**

- Consumes: `_requestPageChange` (Task 2), `ArPaginationPageChangeDetail`.
- Produces: `private _emitChanged(detail: ArPaginationPageChangeDetail): void` — dispatch `ar-pagination-page-changed` (non-cancelable). Rien d'autre n'en dépend dans ce plan.

- [ ] **Step 1: Remplacer le describe `annonces a11y` par la version gated sur la confirmation (doit échouer contre le code actuel de Task 2)**

Remplacer le bloc `describe('annonces a11y', ...)` par :

```typescript
// ── Annonces a11y (après confirmation externe de current) ───────────────

describe('annonces a11y', () => {
    afterEach(() => {
        document.querySelectorAll('[data-ar-live-region]').forEach((node) => node.remove());
    });

    it("n'annonce rien tant que current n'est pas confirmé par le consommateur", async () => {
        el = await fixture('<ar-pagination current="3" total="5"></ar-pagination>');
        (requirePart(el, 'prev') as HTMLElement).click();
        await waitForUpdate(el);
        await new Promise((resolve) => setTimeout(resolve, 60));

        expect(document.getElementById('ar-live-region-polite')).toBeNull();
    });

    it('un clic sur prev confirmé annonce "Page N-1 sur M"', async () => {
        el = await fixture('<ar-pagination current="3" total="5"></ar-pagination>');
        el.addEventListener('ar-pagination-page-change', (e) => {
            el.current = (e as CustomEvent<ArPaginationPageChangeDetail>).detail.to;
        });
        (requirePart(el, 'prev') as HTMLElement).click();
        await waitForUpdate(el);
        await new Promise((resolve) => setTimeout(resolve, 60));

        expect(document.getElementById('ar-live-region-polite')?.textContent).toBe('Page 2 sur 5');
    });

    it('un clic sur next confirmé annonce "Page N+1 sur M"', async () => {
        el = await fixture('<ar-pagination current="2" total="5"></ar-pagination>');
        el.addEventListener('ar-pagination-page-change', (e) => {
            el.current = (e as CustomEvent<ArPaginationPageChangeDetail>).detail.to;
        });
        (requirePart(el, 'next') as HTMLElement).click();
        await waitForUpdate(el);
        await new Promise((resolve) => setTimeout(resolve, 60));

        expect(document.getElementById('ar-live-region-polite')?.textContent).toBe('Page 3 sur 5');
    });

    it('un clic direct sur un numéro de page confirmé annonce "Page N sur M"', async () => {
        el = await fixture('<ar-pagination current="1" total="5"></ar-pagination>');
        el.addEventListener('ar-pagination-page-change', (e) => {
            el.current = (e as CustomEvent<ArPaginationPageChangeDetail>).detail.to;
        });
        const shadow = el.shadowRoot as ShadowRoot;
        const pageLink = shadow.querySelector('[data-ar-pagination-page="4"]') as HTMLElement;
        pageLink.click();
        await waitForUpdate(el);
        await new Promise((resolve) => setTimeout(resolve, 60));

        expect(document.getElementById('ar-live-region-polite')?.textContent).toBe('Page 4 sur 5');
    });
});

describe('événement ar-pagination-page-changed', () => {
    it("n'est pas émis tant que current n'a pas réellement changé", async () => {
        el = await fixture('<ar-pagination current="1" total="5"></ar-pagination>');
        const handler = vi.fn();
        el.addEventListener('ar-pagination-page-changed', handler);
        (requirePart(el, 'next') as HTMLElement).click();
        await waitForUpdate(el);
        expect(handler).not.toHaveBeenCalled();
    });

    it('est émis avec {from, to}, non cancelable, quand current change (réassignation externe)', async () => {
        el = await fixture('<ar-pagination current="1" total="5"></ar-pagination>');
        const handler = vi.fn();
        el.addEventListener('ar-pagination-page-changed', handler);
        el.current = 3;
        await waitForUpdate(el);

        expect(handler).toHaveBeenCalledOnce();
        const event = handler.mock.calls[0][0] as CustomEvent<ArPaginationPageChangeDetail>;
        expect(event.cancelable).toBe(false);
        expect(event.detail).toEqual({ from: 1, to: 3 });
    });

    it("n'est pas émis au premier rendu", async () => {
        const handler = vi.fn();
        el = await fixture('<ar-pagination current="3" total="5"></ar-pagination>');
        el.addEventListener('ar-pagination-page-changed', handler);
        await waitForUpdate(el);
        expect(handler).not.toHaveBeenCalled();
    });
});

describe('focus après confirmation externe', () => {
    it('focalise le nouvel élément part="current" une fois current réassigné en réponse à page-change', async () => {
        el = await fixture('<ar-pagination current="1" total="5"></ar-pagination>');
        el.addEventListener('ar-pagination-page-change', (e) => {
            el.current = (e as CustomEvent<ArPaginationPageChangeDetail>).detail.to;
        });
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
        const current = shadow.querySelector('[part="current"]') as HTMLElement;
        expect(current.getAttribute('tabindex')).toBe('-1');
    });
});
```

Le test "un clic sur un lien de page focalise le nouvel élément part=current" (ancien, lignes 565-574) et "le nouvel élément part=current porte tabindex=-1" (576-581) de l'ancien describe `navigation` sont remplacés par ce nouveau describe `focus après confirmation externe` — les retirer du describe `navigation (current contrôlé)` de la Task 2 s'ils y ont été laissés par erreur (ils n'en font pas partie dans le contenu fourni en Task 2 Step 1, donc rien à faire si Task 2 a été suivie telle quelle).

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent**

```bash
npx vitest run packages/core/src/components/pagination/pagination.test.ts
```

Expected: échecs sur `ar-pagination-page-changed` (jamais dispatché), sur le focus (toujours transféré immédiatement au clic dans le code actuel de Task 2, alors qu'il ne doit l'être qu'après confirmation), sur les annonces (déclenchées immédiatement au lieu d'attendre la confirmation).

- [ ] **Step 3: Mettre à jour le JSDoc `@event`**

Dans `packages/core/src/components/pagination/pagination.ts:56`, remplacer :

```typescript
 * @event {CustomEvent<{from: number, to: number}>} ar-pagination-page-change - Émis à chaque changement de page. Contient `from` et `to`.
```

par :

```typescript
 * @event {CustomEvent<{from: number, to: number}>} ar-pagination-page-change - Émis avant le
 *   changement de page, à chaque interaction (clic page, précédent, suivant, sélection dans le
 *   `<select>` mobile). Annulable via `preventDefault()` : bloque l'interaction, `current` ne
 *   change pas. Contient `from` et `to`.
 * @event {CustomEvent<{from: number, to: number}>} ar-pagination-page-changed - Émis quand
 *   `current` a réellement changé (réassignation externe suite à la confirmation du
 *   consommateur, ou set programmatique indépendant). Non annulable. Contient `from` et `to`.
```

- [ ] **Step 4: Ajouter le flag `_hasRenderedOnce` et `_emitChanged`**

Dans `packages/core/src/components/pagination/pagination.ts`, ajouter le champ privé juste après `private _needsRemeasure = false;` (fin du bloc de champs privés, ligne 90) :

```typescript
    // Distingue le tout premier cycle updated() (où `current` "change" par rapport à sa
    // valeur pré-upgrade non définie) des transitions réelles ultérieures — sans ce flag,
    // ar-pagination-page-changed/l'annonce/le focus se déclencheraient au montage initial.
    private _hasRenderedOnce = false;
```

Ajouter la méthode `_emitChanged`, juste après `_requestPageChange` (ajoutée en Task 2) :

```typescript
    private _emitChanged(detail: ArPaginationPageChangeDetail): void {
        this.dispatchEvent(
            new CustomEvent<ArPaginationPageChangeDetail>('ar-pagination-page-changed', {
                bubbles: true,
                composed: true,
                detail,
            }),
        );
    }
```

- [ ] **Step 5: Déplacer annonce/focus/nouvel event vers `updated()`**

Dans `packages/core/src/components/pagination/pagination.ts`, à la fin de `updated()` (juste avant l'accolade fermante de la méthode, après le bloc `if (select) { ... }` existant, ligne ~198), ajouter :

```typescript
if (this._hasRenderedOnce && changed.has('current')) {
    const from = changed.get('current') as number;
    const to = this.current;
    if (from !== to) {
        this._emitChanged({ from, to });
        this._announcePageChange();
        void focusAfterUpdate(this, '[part~="current"]');
    }
}
this._hasRenderedOnce = true;
```

- [ ] **Step 6: Lancer les tests, vérifier qu'ils passent**

```bash
npx vitest run packages/core/src/components/pagination/pagination.test.ts
```

Expected: PASS sur l'ensemble du fichier.

- [ ] **Step 7: Lancer la suite complète du package pour détecter une régression ailleurs**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run test --workspace=packages/core
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/components/pagination/pagination.ts packages/core/src/components/pagination/pagination.test.ts
git commit -m "fix(pagination): ajoute page-changed, annonce/focus gates sur confirmation (#161)"
```

---

### Task 4: Tests navigateur réel (`pagination.browser.test.ts`)

**Files:**

- Modify: `packages/core/src/components/pagination/pagination.browser.test.ts:14-34` (focus #154), `:167-212` (select + prev/next au palier select)

**Interfaces:**

- Consumes : comportement final de Task 2/3 (`current` contrôlé, `page-changed` gate le focus).

- [ ] **Step 1: Adapter le test de focus #154**

Remplacer le bloc `describe('focus après activation (#154)', ...)` (lignes 14-34) par :

```typescript
describe('focus après activation, confirmée par le consommateur (#154, #161)', () => {
    // Vérifie que le focus atterrit sur le nouvel élément part="current" et que
    // :focus-visible matche après un focus() + click() programmatiques, une fois que le
    // consommateur a réassigné `current` en réponse à ar-pagination-page-change (modèle
    // contrôlé depuis #161). Ne vérifie PAS l'ordre de tabulation réel ni la distinction
    // clavier/souris — nécessiterait @web/test-runner-commands (sendKeys/sendMouse), non
    // installé, hors scope.
    it('focalise le nouvel élément part="current" et :focus-visible matche après confirmation', async () => {
        const el = await fixture(html`<ar-pagination current="1" total="5"></ar-pagination>`);
        el.addEventListener('ar-pagination-page-change', (e) => {
            (el as unknown as { current: number }).current = (
                e as CustomEvent<{ from: number; to: number }>
            ).detail.to;
        });
        const shadowRoot = el.shadowRoot as ShadowRoot;
        const pageLink = shadowRoot.querySelector('[data-ar-pagination-page="3"]') as HTMLElement;

        pageLink.focus();
        pageLink.click();
        await elementUpdated(el);

        const current = shadowRoot.querySelector('[part~="current"]') as HTMLElement;
        expect(shadowRoot.activeElement).to.equal(current);
        expect(current.matches(':focus-visible')).to.equal(true);
    });

    it('sans confirmation, le focus reste sur le lien cliqué (pas de span "current" créé)', async () => {
        const el = await fixture(html`<ar-pagination current="1" total="5"></ar-pagination>`);
        const shadowRoot = el.shadowRoot as ShadowRoot;
        const pageLink = shadowRoot.querySelector('[data-ar-pagination-page="3"]') as HTMLElement;

        pageLink.focus();
        pageLink.click();
        await elementUpdated(el);

        expect(shadowRoot.activeElement).to.equal(pageLink);
    });
});
```

- [ ] **Step 2: Adapter le test "clic sur le contenu imbriqué"**

Remplacer le bloc `describe('clic sur le contenu imbriqué du lien (régression)', ...)` (lignes 37-55) par :

```typescript
describe('clic sur le contenu imbriqué du lien (régression)', () => {
    it('un clic sur le numéro visible (span aria-hidden imbriqué) dispatch bien ar-pagination-page-change avec la bonne cible', async () => {
        const el = await fixture(html`<ar-pagination current="1" total="5"></ar-pagination>`);
        const shadow = el.shadowRoot as ShadowRoot;
        const link = shadow.querySelector('[data-ar-pagination-page="3"]') as HTMLElement;
        const visibleNumber = link.querySelector('[aria-hidden="true"]') as HTMLElement;

        let detail: { from: number; to: number } | undefined;
        el.addEventListener('ar-pagination-page-change', (e) => {
            detail = (e as CustomEvent<{ from: number; to: number }>).detail;
        });
        visibleNumber.click();
        await elementUpdated(el);

        expect(detail).to.deep.equal({ from: 1, to: 3 });
    });
});
```

- [ ] **Step 3: Adapter les tests select/prev-next au palier select dans "masquage responsive progressif"**

Dans le describe `masquage responsive progressif (#152)` :

Remplacer le test `'sélectionner une option du select change la page'` (lignes 167-188) par :

```typescript
it('sélectionner une option du select confirmée change la page', async () => {
    const wrapper = await fixture(
        html`<div style="width: 90px;">
            <ar-pagination current="8" total="15"></ar-pagination>
        </div>`,
    );
    const el = wrapper.querySelector('ar-pagination') as HTMLElement;
    el.addEventListener('ar-pagination-page-change', (e) => {
        (el as unknown as { current: number }).current = (
            e as CustomEvent<{ from: number; to: number }>
        ).detail.to;
    });
    await elementUpdated(el);
    await waitForResize();

    const shadow = el.shadowRoot as ShadowRoot;
    const select = shadow.querySelector('[part~="select"]') as HTMLSelectElement;
    select.value = '15';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await elementUpdated(el);

    expect((el as unknown as { current: number }).current).to.equal(15);
    expect(select.selectedIndex).to.not.equal(-1);
    expect(select.options[select.selectedIndex]?.textContent?.trim()).to.equal('Page 15 sur 15');
});
```

Remplacer le test `'prev/next restent cliquables au palier select'` (lignes 190-212) par :

```typescript
it('prev/next confirmés restent fonctionnels au palier select', async () => {
    const wrapper = await fixture(
        html`<div style="width: 90px;">
            <ar-pagination current="8" total="15"></ar-pagination>
        </div>`,
    );
    const el = wrapper.querySelector('ar-pagination') as HTMLElement;
    el.addEventListener('ar-pagination-page-change', (e) => {
        (el as unknown as { current: number }).current = (
            e as CustomEvent<{ from: number; to: number }>
        ).detail.to;
    });
    await elementUpdated(el);
    await waitForResize();

    const shadow = el.shadowRoot as ShadowRoot;
    const next = shadow.querySelector('[part~="next"]') as HTMLElement;
    next.click();
    await elementUpdated(el);

    expect((el as unknown as { current: number }).current).to.equal(9);

    const select = shadow.querySelector('[part~="select"]') as HTMLSelectElement;
    expect(select.selectedIndex).to.not.equal(-1);
    expect(select.options[select.selectedIndex]?.textContent?.trim()).to.equal('Page 9 sur 15');
});
```

Le test `'bascule sur un <select> de saut de page à largeur extrême'` (lignes 137-165) ne clique/sélectionne rien : inchangé. Le test de régression `"ne reste pas bloqué au palier select..."` (lignes 221-267) mute `current`/`total` directement en propriété (pas via clic) : inchangé.

- [ ] **Step 4: Lancer les tests navigateur**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run test:browser --workspace=packages/core
```

Expected: PASS sur `pagination.browser.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/components/pagination/pagination.browser.test.ts
git commit -m "test(pagination): adapte les tests navigateur au modele controle (#161)"
```

---

### Task 5: Documentation (`ar-pagination.mdx`)

**Files:**

- Modify: `apps/docs/src/content/components/ar-pagination.mdx`

- [ ] **Step 1: Réécrire la section "Utilisation"**

Remplacer les lignes 62-75 (section `## Utilisation` complète) par :

````mdx
## Utilisation

`current` est piloté depuis l'extérieur : `ar-pagination` émet `ar-pagination-page-change`
(annulable) avant chaque changement, puis `ar-pagination-page-changed` une fois `current`
effectivement mis à jour. `detail` contient `{ from, to }` dans les deux cas.

```js
document.addEventListener('ar-pagination-page-change', (e) => {
    /* Mettez à jour le contenu de la page, puis la page active du composant */
    e.target.current = e.detail.to;
});
```
````

- [ ] **Step 2: Enrichir "À votre charge"**

Dans la section `### À votre charge` (lignes 48-54), ajouter une puce après celle sur `current`/`total` :

```mdx
- **`current` ne change que si vous le réassignez.** Le focus et l'annonce aria-live suivent
  cette réassignation — mettez `current` à jour de façon synchrone (ou quasi-synchrone) dans le
  handler de `ar-pagination-page-change` pour qu'ils restent cohérents avec l'action de
  l'utilisateur.
```

- [ ] **Step 3: Ajouter le script de simulation à la dernière variante**

Dans le frontmatter, remplacer le bloc de la variante `20-pages-end` (lignes 21-25) par :

```yaml
- name: 20-pages-end
  label: 20 pages (current en fin)
  description: Pagination à 20 pages, page 18 active (fin de la liste).
  html: |
      <ar-pagination current="18" total="20"></ar-pagination>
      <script>
          document.addEventListener('ar-pagination-page-change', (e) => {
              if (e.target.matches('ar-pagination')) e.target.current = e.detail.to;
          });
      </script>
```

Même snippet que l'exemple de la section "Utilisation" (un seul listener délégué sur `document`,
pas un par instance) — la garde `e.target.matches('ar-pagination')` évite de réagir à un autre
composant qui bullerait le même nom d'event sur la page. Ce script s'exécute une seule fois au
chargement (SSR via `Fragment set:html` dans `Playground.astro`, pas d'injection `innerHTML` — le
`<script>` est donc exécuté normalement par le navigateur) et couvre nativement, par délégation,
les 4 variantes de démo ainsi que l'instance du playground interactif plus bas sur la page.

- [ ] **Step 4: Vérifier visuellement dans le navigateur**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run dev
```

Ouvrir la page `ar-pagination` de la doc, cliquer sur un numéro de page dans chacune des 4
démos : la page active doit visuellement changer dans chacune. Vérifier aussi le playground
interactif en bas de page.

- [ ] **Step 5: Commit**

```bash
git add apps/docs/src/content/components/ar-pagination.mdx
git commit -m "docs(pagination): documente le modele controle, demos live (#161)"
```

---

### Task 6: Vérification finale et PR

**Files:** aucun nouveau.

- [ ] **Step 1: Suite complète (Vitest + WTR browser)**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run test:all
```

Expected: PASS sur l'ensemble du monorepo.

- [ ] **Step 2: Regénérer le manifest CEM (JSDoc `@event` modifié)**

```bash
npm run build:manifest
git status --short
```

Si `packages/core/custom-elements.json` (ou équivalent généré) a changé, l'ajouter au commit suivant.

- [ ] **Step 3: Lint**

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 4: Commit du manifest si modifié**

```bash
git add packages/core/custom-elements.json
git commit -m "chore(pagination): regenere le manifest CEM (#161)"
```

(Sauter cette étape si `git status --short` de Step 2 ne montrait aucun changement.)

- [ ] **Step 5: Push et création de la PR**

```bash
git push -u origin fix/161-pagination-controlled-current
gh pr create --base dev --title "fix(pagination): current en modèle contrôlé, events page-change/page-changed" --body "$(cat <<'EOF'
## Résumé

- `ar-pagination.current` n'est plus muté en interne au clic — modèle contrôlé façon `ar-stepper.currentPath`.
- Nouvel event `ar-pagination-page-change` (cancelable) émis avant tout changement ; `ar-pagination-page-changed` (non-cancelable) émis quand `current` a réellement changé.
- Annonce aria-live et transfert de focus déplacés : ils n'ont lieu qu'après confirmation externe de `current`, plus au clic — la pagination ne "ment" plus sur l'état affiché pendant un chargement async qui échouerait.
- Breaking change (package alpha, pas de dépréciation) — closes #161.

Design : `docs/superpowers/specs/2026-08-10-pagination-controlled-current-design.md`

## Test plan

- [ ] `npm run test:all` passe
- [ ] Démos de la doc `ar-pagination` vérifiées manuellement (clic change bien la page dans les 4 variantes + playground)
- [ ] `npm run lint` passe

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

## Self-Review

**Couverture du spec** :

1. `ar-pagination-page-change` cancelable, `current` contrôlé → Task 2.
2. `ar-pagination-page-changed`, annonce/focus gated → Task 3.
3. Revert du `<select>` si annulé → Task 2, Step 4.
4. Docs (deux events, "À votre charge", démos live) → Task 5.
5. Pas de `-prevented` → respecté (aucune mention dans le plan).
6. Hors scope `ar-stepper` → non touché par ce plan.

**Cohérence des types/signatures** : `ArPaginationPageChangeDetail { from, to }` réutilisé identique pour les deux events dans toutes les tasks. `_requestPageChange(to: number): boolean` défini en Task 2, seule Task 2 l'utilise (les 4 handlers). `_emitChanged(detail): void` défini et utilisé uniquement en Task 3. `_hasRenderedOnce` déclaré et lu dans la même task (3). Pas de références à des noms non définis dans une task antérieure.
