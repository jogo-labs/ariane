# PR3 — Bloquants beta restants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger les 5 constats bloquants pour la beta restants après PR1 (transversaux mécaniques) et PR2 (convention d'events), isolés par composant : `ar-alert` (vol de focus), `ar-pagination` (crash sur `total` négatif), `ar-table-sort` (dépendance `ar-tooltip` non importée), `ar-stepper` (navigation cassée sur les liens sans `href` réel), `ar-tab` (désynchronisation `disabled`/registry).

**Architecture:** Chaque bloquant est un correctif isolé et testable indépendamment sur un composant existant — aucune nouvelle abstraction, pas de refonte. Référence : `docs/superpowers/specs/2026-07-14-audit-technique-v1-beta.md`, section "Constats bloquants pour la beta (par composant)".

**Tech Stack:** Lit 3 + TypeScript, Vitest (happy-dom), Web Test Runner (Chromium réel) pour les tests `.browser.test.ts`/`.a11y.test.ts`.

## Global Constraints

- Prettier : 100 caractères, 4 espaces, guillemets simples.
- Toujours `import type` pour les imports de types.
- Conventional Commits (un commit par tâche, message en français comme le reste du dépôt).
- Aucun fallback cosmétique headless — sans objet ici (aucun de ces correctifs ne touche aux tokens CSS).
- Ne pas renommer `mrPaginationUtils` (préfixe `mr` reliquat, déjà noté en dette séparée dans l'audit — hors scope de cette PR).

---

### Task 1: `ar-alert` — le survol/focus du bouton close ne doit plus voler le focus

**Contexte du bug :** `ArAlert` écoute `transitionend` sur lui-même dès le constructeur (`this.addEventListener('transitionend', this._finishHide)`). N'importe quelle transition CSS qui bubble jusqu'à l'hôte (par exemple un `background-color` au survol/focus du bouton close) déclenche `_finishHide()`. Cette méthode vérifie `this.hiding` avant de fermer l'alerte, mais exécute ensuite le vol de focus vers `next-focus` **sans re-vérifier ce flag** — un simple survol du bouton close vole donc le focus sans rien fermer. Référence audit : `alert.ts:101,172-201`.

**Files:**

- Modify: `packages/core/src/components/alert/alert.ts:180-201`
- Test: `packages/core/src/components/alert/alert.test.ts`

**Interfaces:**

- Consumes: rien de nouveau.
- Produces: rien de nouveau — comportement existant corrigé, pas de nouvelle API.

- [ ] **Step 1: Lire le code actuel pour confirmer les lignes exactes**

```bash
sed -n '178,201p' packages/core/src/components/alert/alert.ts
```

Attendu : la méthode `_finishHide` telle que décrite ci-dessus, avec le vol de focus hors du `if (this.hiding)`.

- [ ] **Step 2: Écrire le test qui échoue**

Ajouter dans `packages/core/src/components/alert/alert.test.ts`, dans le describe existant `'fermeture'` (ligne 205), juste après le test `"n'émet pas ar-alert-close si hiding=false au transitionend"` (ligne 236-245) — même fixture, même style (`el` est la variable de describe déjà déclarée en tête de fichier, pas une const locale) :

```typescript
it('un transitionend qui bubble sans clic sur close (hiding=false) ne vole pas le focus', async () => {
    const target = document.createElement('button');
    target.id = 'btn-cible-survol';
    document.body.appendChild(target);

    el = await fixture('<ar-alert next-focus="btn-cible-survol"></ar-alert>');
    const initiallyFocused = document.activeElement;

    // Simule un transitionend qui bubble jusqu'à l'hôte SANS clic préalable sur le bouton
    // close (ex: transition CSS de survol/focus sur le bouton lui-même) — hiding reste false.
    el.dispatchEvent(new Event('transitionend'));

    expect(document.activeElement).toBe(initiallyFocused);
    expect(document.activeElement).not.toBe(target);

    target.remove();
});
```

- [ ] **Step 3: Lancer le test pour vérifier qu'il échoue**

Run: `npm run test -w packages/core -- alert.test.ts`
Expected: FAIL — `document.activeElement` est `target` (le focus a été volé) alors que le test attend qu'il ne le soit pas.

- [ ] **Step 4: Corriger `_finishHide()`**

Remplacer dans `packages/core/src/components/alert/alert.ts` :

```typescript
    /** Supprime l'alerte du DOM et reporte le focus après la fin de la transition CSS */
    private _finishHide = (): void => {
        if (!this.canBeHidden) return;

        if (this.hiding) {
            this.dispatchEvent(
                new CustomEvent('ar-alert-close', { bubbles: true, composed: true }),
            );
            this.remove();
        }

        const $focusableElement = document.getElementById(
            `${(this.nextFocus as string).replace('#', '')}`,
        );
        if (!$focusableElement) {
            warn(
                ArAlert.NAME,
                `L'id "${this.nextFocus}" spécifié via 'next-focus' n'est pas présent dans la page.`,
            );
            return;
        }
        $focusableElement.focus();
    };
```

par :

```typescript
    /** Supprime l'alerte du DOM et reporte le focus après la fin de la transition CSS */
    private _finishHide = (): void => {
        if (!this.canBeHidden || !this.hiding) return;

        this.dispatchEvent(new CustomEvent('ar-alert-close', { bubbles: true, composed: true }));
        this.remove();

        const $focusableElement = document.getElementById(
            `${(this.nextFocus as string).replace('#', '')}`,
        );
        if (!$focusableElement) {
            warn(
                ArAlert.NAME,
                `L'id "${this.nextFocus}" spécifié via 'next-focus' n'est pas présent dans la page.`,
            );
            return;
        }
        $focusableElement.focus();
    };
```

Le seul changement de logique : `!this.hiding` ajouté à la garde initiale, ce qui fait un retour anticipé (sans vol de focus) pour tout `transitionend` qui bubble alors que l'alerte n'est pas en cours de fermeture.

- [ ] **Step 5: Lancer le test pour vérifier qu'il passe**

Run: `npm run test -w packages/core -- alert.test.ts`
Expected: PASS — tous les tests du fichier passent (celui-ci + les existants, notamment ceux qui vérifient que le clic sur close ferme bien l'alerte et reporte le focus).

- [ ] **Step 6: Vérifier l'absence de régression sur l'ensemble du composant**

Run: `npx tsc --noEmit -p packages/core`
Expected: aucune erreur.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/components/alert/alert.ts packages/core/src/components/alert/alert.test.ts
git commit -m "fix(alert): le survol/focus du bouton close ne vole plus le focus sans fermeture"
```

---

### Task 2: `ar-pagination` — `total` négatif ne doit plus crasher `render()`

> **Correction (2026-07-15, post-implémentation) :** vérifié empiriquement que
> `Array.from({ length: négatif }, fn)` ne lève jamais de `RangeError` — `ToLength`
> clampe les longueurs négatives à 0. Le mécanisme de crash décrit ci-dessous est
> inexact. Le vrai bug (moins sévère mais réel) : `total` négatif affiche des
> numéros de page négatifs ("Page suivante (page -3)") sans qu'aucune erreur ne
> le signale. Le clamp reste une correction pertinente ; commentaire/test/commit
> ont été corrigés en conséquence (commit `0f704aa`).

**Contexte du bug (tel qu'affirmé par l'audit, non vérifié empiriquement avant écriture du plan) :** `updated()` avertit via `warn()` si `total < 1`, mais ne clampe rien. `render()` transmet `this.total` tel quel à `mrPaginationUtils._calculatePages(current, total)`, qui fait `Array.from({ length: total }, ...)` — une longueur négative lève `RangeError: Invalid array length`, qui casse tout le rendu du composant (pas seulement un avertissement dev). Référence audit : `pagination.ts:74-97`, `pagination.utils.ts:10`.

**Files:**

- Modify: `packages/core/src/components/pagination/pagination.ts:86-98`
- Test: `packages/core/src/components/pagination/pagination.test.ts`

**Interfaces:**

- Consumes: `mrPaginationUtils._calculatePages(current: number, total: number)`, `mrPaginationUtils._clamp(value, min, max)` — déjà exportés par `pagination.utils.ts`, signatures inchangées.
- Produces: rien de nouveau.

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter dans `packages/core/src/components/pagination/pagination.test.ts`, dans le describe `'warn() — bornes numériques'` (dernier describe du fichier) :

```typescript
it('ne lève pas de RangeError quand total est négatif (render() reste fonctionnel)', async () => {
    el = await fixture('<ar-pagination total="-3"></ar-pagination>');
    // Si render() a jeté une RangeError, la ligne ci-dessus a déjà fait échouer le test —
    // cette assertion vérifie en plus que le composant est retombé sur un état affichable.
    expect(el.shadowRoot?.querySelector('[part="nav"]')).not.toBeNull();
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npm run test -w packages/core -- pagination.test.ts`
Expected: FAIL — `RangeError: Invalid array length` levée pendant `render()` (via `Array.from({ length: total }, ...)` dans `_calculatePages` avec `total = -3`), qui fait échouer le test dès le `await fixture(...)`. C'est la preuve du crash.

- [ ] **Step 3: Corriger `render()` pour clamper `total` avant tout calcul**

Dans `packages/core/src/components/pagination/pagination.ts`, remplacer :

```typescript
    override render(): TemplateResult {
        const isNextDisabled = this.current >= this.total;
        const isPreviousDisabled = this.current <= 1;
        const previousPageNumber = mrPaginationUtils._clamp(
            this.current - 1,
            1,
            this.total > 1 ? this.total - 1 : 1,
        );
        const nextPageNumber = mrPaginationUtils._clamp(this.current + 1, 1, this.total);
        const current = mrPaginationUtils._clamp(this.current, 1, this.total);
```

par :

```typescript
    override render(): TemplateResult {
        // Garde défensive : total/current invalides sont déjà signalés par warn() dans
        // updated(), mais render() doit rester fonctionnel (pas de RangeError sur
        // Array.from({ length: total < 0 ... })).
        const total = Math.max(this.total, 1);
        const current = mrPaginationUtils._clamp(this.current, 1, total);
        const isNextDisabled = current >= total;
        const isPreviousDisabled = current <= 1;
        const previousPageNumber = mrPaginationUtils._clamp(
            current - 1,
            1,
            total > 1 ? total - 1 : 1,
        );
        const nextPageNumber = mrPaginationUtils._clamp(current + 1, 1, total);
```

Puis, plus bas dans le même `render()`, remplacer l'appel :

```typescript
                ${repeat(
                    mrPaginationUtils._calculatePages(this.current, this.total),
                    (page) => page,
```

par :

```typescript
                ${repeat(
                    mrPaginationUtils._calculatePages(current, total),
                    (page) => page,
```

Le reste du template (qui référence déjà la variable locale `current`) n'a pas besoin d'autre changement — vérifier avec `grep -n "this.total\|this.current" packages/core/src/components/pagination/pagination.ts` après édition qu'il ne reste plus de référence à `this.total`/`this.current` dans le corps de `render()` (en dehors des deux lignes `isNextDisabled`/`isPreviousDisabled` déjà migrées ci-dessus).

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `npm run test -w packages/core -- pagination.test.ts`
Expected: PASS — tous les tests, y compris le nouveau.

- [ ] **Step 5: Vérifier l'absence de régression**

Run: `npx tsc --noEmit -p packages/core`
Expected: aucune erreur.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/components/pagination/pagination.ts packages/core/src/components/pagination/pagination.test.ts
git commit -m "fix(pagination): clampe total/current dans render() pour éviter le crash sur total négatif"
```

---

### Task 3: `ar-table-sort` — importer `ar-tooltip` pour fonctionner en import headless isolé

**Contexte du bug :** `table-sort.ts` rend `<ar-tooltip for=${this._buttonId}>${label}</ar-tooltip>` dans son propre template, mais n'importe jamais le module qui enregistre `ar-tooltip` (`../tooltip/index.js`). Si un consommateur importe `ar-table-sort` isolément (mode headless — un des piliers de ce projet, cf. CLAUDE.md), `<ar-tooltip>` reste un élément anonyme non défini : pas de positionnement, pas de comportement. Référence audit : `table-sort.ts:186`.

**Files:**

- Modify: `packages/core/src/components/table-sort/table-sort.ts:1-6`
- Test: `packages/core/src/components/table-sort/table-sort.test.ts`

**Interfaces:**

- Consumes: le module `../tooltip/index.js` (side-effect import, `customElements.define('ar-tooltip', ArTooltip)`).
- Produces: rien de nouveau.

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter dans `packages/core/src/components/table-sort/table-sort.test.ts` (nouveau describe en fin de fichier) :

```typescript
describe('dépendance ar-tooltip', () => {
    it('ar-tooltip est défini après import isolé de ar-table-sort', () => {
        expect(customElements.get('ar-tooltip')).toBeDefined();
    });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npm run test -w packages/core -- table-sort.test.ts`

Attention : dans la suite de tests Vitest complète, d'autres fichiers de test (`tooltip.test.ts`, `dropdown.test.ts` via `ar-dropdown-item`, etc.) importent déjà `ar-tooltip` ailleurs dans le même processus, ce qui peut faire passer ce test par accident si Vitest ne l'isole pas dans son propre contexte de module. Vérifier que ce fichier de test s'exécute bien seul (`-- table-sort.test.ts` cible un seul fichier) : Vitest instancie un environnement DOM par fichier de test par défaut, donc `customElements` n'est PAS partagé entre fichiers — ce test doit échouer avant le correctif.

Expected: FAIL — `customElements.get('ar-tooltip')` retourne `undefined`.

- [ ] **Step 3: Ajouter l'import manquant**

Dans `packages/core/src/components/table-sort/table-sort.ts`, en haut du fichier :

```typescript
import { LitElement, html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import styles from './table-sort.styles.js';
import utilitiesStyles from '../../styles/utilities.styles.js';
import { announceA11y } from '../../a11y/announce-a11y.js';
import { warn } from '../../utils/warn.js';
```

devient :

```typescript
import { LitElement, html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import styles from './table-sort.styles.js';
import utilitiesStyles from '../../styles/utilities.styles.js';
import { announceA11y } from '../../a11y/announce-a11y.js';
import { warn } from '../../utils/warn.js';
import '../tooltip/index.js';
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `npm run test -w packages/core -- table-sort.test.ts`
Expected: PASS.

- [ ] **Step 5: Vérifier l'absence de régression sur l'ensemble de la suite**

Run: `npm run test -w packages/core`
Expected: tous les tests passent (aucune double-registration `customElements.define` ne doit lever d'erreur — `../tooltip/index.js` importé par plusieurs composants fait déjà l'objet d'imports multiples ailleurs dans le projet, ce pattern est sûr par nature des modules ES : un seul `define()` exécuté malgré les imports multiples).

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/components/table-sort/table-sort.ts packages/core/src/components/table-sort/table-sort.test.ts
git commit -m "fix(table-sort): importe ar-tooltip pour fonctionner en import headless isolé"
```

---

### Task 4: `ar-stepper` — navigation cassée sur les items sans `href` réel

**Contexte du bug :** Le fallback `href` diffère entre le rendu des steps principaux (`step.href ?? '#'`, `stepper.renderer.ts` fonction `renderStep`) et celui des sous-étapes (`sub.href ?? 'javascript:;'`, fonction précédente dans le même fichier). Dans les deux cas, `onClickLink` (dans `stepper.ts`) n'appelle jamais `event.preventDefault()` : un clic sur un item sans `href` réel (le cas d'usage documenté — la doc `ar-stepper.mdx` utilise systématiquement `href="#"`) déclenche une vraie navigation d'ancre native (scroll-to-top intempestif avec `#`). Référence audit : `stepper.renderer.ts:67,104`, `stepper.ts:451-469`.

**Files:**

- Modify: `packages/core/src/components/stepper/stepper.renderer.ts:65` (fallback substep)
- Modify: `packages/core/src/components/stepper/stepper.ts:454-467` (`onClickLink`)
- Test: `packages/core/src/components/stepper/stepper.test.ts`

**Interfaces:**

- Consumes: rien de nouveau.
- Produces: rien de nouveau — `onClickLink` garde la même signature `(event: MouseEvent) => void`.

- [ ] **Step 1: Unifier le fallback `href` sur `'#'`**

Dans `packages/core/src/components/stepper/stepper.renderer.ts`, la fonction qui rend les sous-étapes contient :

```typescript
                          href=${sub.href ?? 'javascript:;'}
```

Remplacer par :

```typescript
                          href=${sub.href ?? '#'}
```

(Le rendu des steps principaux utilise déjà `step.href ?? '#'` — inchangé.)

- [ ] **Step 2: Écrire le test qui échoue pour `preventDefault()`**

Ajouter dans `packages/core/src/components/stepper/stepper.test.ts` un nouveau describe (chercher un emplacement après les describes existants sur les clics/navigation, ou en fin de fichier) :

```typescript
describe('navigation — preventDefault sur les liens sans href réel', () => {
    it("appelle preventDefault() au clic sur un lien d'étape (empêche le scroll-to-top natif)", async () => {
        const el = await fixtureWithItems(`
            <ar-stepper current-path="/b" mode="edit">
                <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
            </ar-stepper>
        `);

        const link = shadow(el).querySelector<HTMLAnchorElement>('a.stepper-link');
        expect(link).not.toBeNull();
        const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
        const preventDefaultSpy = vi.spyOn(clickEvent, 'preventDefault');

        link!.dispatchEvent(clickEvent);

        expect(preventDefaultSpy).toHaveBeenCalledOnce();
    });
});
```

Ce test réutilise exactement le fixture et les helpers du describe `'événements'` existant (`fixtureWithItems`, `shadow(el)`, item `path="/a"` sans `href` — donc le fallback `'#'` s'applique, c'est justement le cas régressé). Placer ce describe juste après le describe `'événements'` existant (ligne ~129) dans `stepper.test.ts`.

- [ ] **Step 3: Lancer le test pour vérifier qu'il échoue**

Run: `npm run test -w packages/core -- stepper.test.ts`
Expected: FAIL — `preventDefaultSpy` n'a jamais été appelé.

- [ ] **Step 4: Corriger `onClickLink`**

Dans `packages/core/src/components/stepper/stepper.ts`, remplacer :

```typescript
    private onClickLink = (event: MouseEvent): void => {
        const path = (event.target as HTMLElement).closest('a')?.dataset['path'];
        if (!path) return;

        const detail: ArStepperStepChangeDetail = { path };
```

par :

```typescript
    private onClickLink = (event: MouseEvent): void => {
        const path = (event.target as HTMLElement).closest('a')?.dataset['path'];
        if (!path) return;

        // Ces liens ne sont jamais des URLs réellement navigables (fallback '#') — la
        // navigation est entièrement pilotée par ar-stepper-step-change, pas par le
        // comportement natif de l'ancre.
        event.preventDefault();

        const detail: ArStepperStepChangeDetail = { path };
```

- [ ] **Step 5: Lancer le test pour vérifier qu'il passe**

Run: `npm run test -w packages/core -- stepper.test.ts`
Expected: PASS — tous les tests du fichier, y compris ceux déjà existants sur `ar-stepper-step-change`.

- [ ] **Step 6: Vérifier la suite browser (le vrai `<a href="#">` cliqué dans un navigateur réel est le scénario régressé)**

Run: `npm run test:browser -w packages/core` (filtrer sur `stepper` si l'outil le permet, sinon suite complète)
Expected: `stepper.browser.test.ts` et `stepper.a11y.test.ts` passent sans avertissement supplémentaire.

- [ ] **Step 7: Mettre à jour la doc si le changement de fallback substep est visible**

Vérifier `apps/docs/src/content/components/ar-stepper.mdx` : la doc utilise déjà `href="#"` partout (aucun exemple ne compte sur `javascript:;`), donc aucune mise à jour de contenu n'est nécessaire — juste confirmer avec `grep -n "javascript:;" apps/docs/src/content/components/ar-stepper.mdx` qu'il n'y a aucune référence à supprimer.

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/components/stepper/stepper.renderer.ts packages/core/src/components/stepper/stepper.ts packages/core/src/components/stepper/stepper.test.ts
git commit -m "fix(stepper)!: preventDefault() sur les liens d'étape, unifie le fallback href sur #"
```

Note : marqué `!` (breaking) par prudence — un consommateur qui dépendait de la navigation native cassée (peu probable, c'est le bug lui-même) verrait un changement de comportement. À alpha, assumé sans migration.

---

### Task 5: `ar-tab` — synchroniser le registry quand `disabled` change à chaud

**Contexte du bug :** `ArTab` n'a pas de hook `updated()` : quand `disabled` change après le montage initial, rien ne notifie `ArTabGroup` pour ré-exécuter `_syncAll()`. Résultat : `aria-disabled`/`tabindex` restent obsolètes dans le DOM alors que la navigation clavier (qui lit `tab.disabled` en direct depuis le tab-group, pas depuis l'attribut ARIA reflété) exclut déjà correctement l'onglet — état ARIA et comportement réel divergent. Référence audit : `tab.ts` (absence de hook `updated()`).

**Pattern de référence déjà en place dans ce dépôt :** `BreadcrumbRegistry.notifyItemChanged(item)` (`packages/core/src/context/breadcrumb.context.ts`) résout exactement ce problème pour `ar-breadcrumb-item`. On reproduit le même pattern ici.

**Files:**

- Modify: `packages/core/src/context/tabs.context.ts`
- Modify: `packages/core/src/components/tab-group/tab-group.ts:50-88`
- Modify: `packages/core/src/components/tab/tab.ts`
- Test: `packages/core/src/components/tab-group/tab-group.test.ts` (le comportement observable passe par le tab-group, pas par `ar-tab` isolément)

**Interfaces:**

- Produces : `TabGroupRegistry.notifyTabChanged(tab: ArTab): void` — nouvelle méthode de l'interface, implémentée par `ArTabGroup._registry`, appelée par `ArTab.updated()`.

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter dans `packages/core/src/components/tab-group/tab-group.test.ts` (chercher le describe existant sur `disabled`/`aria-disabled`, sinon en créer un) :

```typescript
describe('disabled à chaud', () => {
    it('met à jour aria-disabled quand tab.disabled change après le montage', async () => {
        el = await fixture(`
            <ar-tab-group>
                <ar-tab panel="a">Tab A</ar-tab>
                <ar-tab panel="b">Tab B</ar-tab>
                <ar-tab-panel name="a">Panel A</ar-tab-panel>
                <ar-tab-panel name="b">Panel B</ar-tab-panel>
            </ar-tab-group>
        `);
        await waitForUpdate(el);

        const tabB = el.querySelector<ArTab>('ar-tab[panel="b"]')!;
        expect(tabB.hasAttribute('aria-disabled')).toBe(false);

        tabB.disabled = true;
        await waitForUpdate(el);

        expect(tabB.getAttribute('aria-disabled')).toBe('true');
    });
});
```

Ce test suit exactement le pattern du describe `'ar-tab disabled'` existant (ligne ~167 de `tab-group.test.ts`, markup sans `slot="tab"` — posé automatiquement par `registerTab()`). Ajouter `import type { ArTab } from '../tab/tab.js';` en tête de fichier si pas déjà présent (vérifier avec `grep -n "import type { ArTab }" packages/core/src/components/tab-group/tab-group.test.ts` avant d'ajouter, pour ne pas dupliquer l'import). Placer ce describe juste après le describe `'ar-tab disabled'` existant.

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npm run test -w packages/core -- tab-group.test.ts`
Expected: FAIL — `tabB.getAttribute('aria-disabled')` reste `null` après le changement.

- [ ] **Step 3: Ajouter `notifyTabChanged` à l'interface `TabGroupRegistry`**

Dans `packages/core/src/context/tabs.context.ts`, remplacer :

```typescript
export interface TabGroupRegistry {
    registerTab(tab: ArTab): void;
    unregisterTab(tab: ArTab): void;
    registerPanel(panel: ArTabPanel): void;
    unregisterPanel(panel: ArTabPanel): void;
    activate(name: string): void;
}
```

par :

```typescript
export interface TabGroupRegistry {
    registerTab(tab: ArTab): void;
    unregisterTab(tab: ArTab): void;
    registerPanel(panel: ArTabPanel): void;
    unregisterPanel(panel: ArTabPanel): void;
    activate(name: string): void;
    notifyTabChanged(tab: ArTab): void;
}
```

- [ ] **Step 4: Implémenter `notifyTabChanged` dans `ArTabGroup._registry`**

Dans `packages/core/src/components/tab-group/tab-group.ts`, dans l'objet `_registry`, ajouter une entrée après `unregisterTab` :

```typescript
        unregisterTab: (tab: ArTab) => {
            const wasActive = tab.panel === this.active;
            this._tabs = this._tabs.filter((t) => t !== tab);
            this._syncAll();
            if (wasActive) {
                const newActive = this._effectiveActive;
                this.active = newActive;
                this._emit('ar-tab-group-change', { active: newActive });
            }
        },
        notifyTabChanged: (_tab: ArTab) => {
            this._syncAll();
        },
```

(`_syncAll()` relit déjà `tab.disabled` en direct sur chaque tab enregistré — cf. `tab-group.ts:139-158` — donc aucun autre changement n'est nécessaire dans `_syncAll()` lui-même.)

- [ ] **Step 5: Appeler `notifyTabChanged` depuis `ArTab.updated()`**

Dans `packages/core/src/components/tab/tab.ts`, ajouter l'import `PropertyValues` et la méthode `updated()` :

```typescript
import { LitElement, html } from 'lit';
import { property } from 'lit/decorators.js';
import { ContextConsumer } from '@lit/context';
import { tabGroupContext, type TabGroupRegistry } from '../../context/tabs.context.js';
import styles from './tab.styles.js';
```

devient :

```typescript
import { LitElement, html, type PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { ContextConsumer } from '@lit/context';
import { tabGroupContext, type TabGroupRegistry } from '../../context/tabs.context.js';
import styles from './tab.styles.js';
```

Et ajouter la méthode `updated()`, par exemple juste après `_setRegistry` :

```typescript
    private _setRegistry(registry: TabGroupRegistry): void {
        if (this._registry) {
            this._registry.unregisterTab(this);
        }
        this._registry = registry;
        registry.registerTab(this);
    }

    override updated(changed: PropertyValues<this>): void {
        if (changed.has('disabled') && changed.get('disabled') !== undefined) {
            this._registry?.notifyTabChanged(this);
        }
    }
```

Le garde `changed.get('disabled') !== undefined` évite un appel redondant au tout premier rendu (où `registerTab()` vient déjà d'appeler `_syncAll()` via `_setRegistry`), en miroir du pattern déjà utilisé par `breadcrumb.ts:142` pour la même raison.

- [ ] **Step 6: Lancer le test pour vérifier qu'il passe**

Run: `npm run test -w packages/core -- tab-group.test.ts`
Expected: PASS.

- [ ] **Step 7: Vérifier l'absence de régression sur tab/tab-group et le typecheck**

Run: `npm run test -w packages/core -- tab.test.ts tab-group.test.ts`
Run: `npx tsc --noEmit -p packages/core`
Expected: tout passe, aucune erreur de type (l'interface `TabGroupRegistry` étendue doit être implémentée intégralement par `_registry` dans `tab-group.ts`, sinon `tsc` signale un objet incomplet).

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/context/tabs.context.ts packages/core/src/components/tab-group/tab-group.ts packages/core/src/components/tab/tab.ts packages/core/src/components/tab-group/tab-group.test.ts
git commit -m "fix(tab): synchronise aria-disabled/tabindex quand disabled change après le montage"
```

---

### Task 6: Validation finale et ouverture de la PR

**Files:** aucun nouveau fichier — validation transverse + ouverture PR.

- [ ] **Step 1: Suite Vitest complète**

Run: `npm run test -w packages/core`
Expected: tous les tests passent (aucune régression sur les 5 composants touchés ni sur le reste).

- [ ] **Step 2: Suite browser complète (au moins 2 runs consécutifs pour détecter la flakiness)**

Run: `npm run test:browser -w packages/core` (x2)
Expected: tous les tests passent, aucun nouvel avertissement dev Lit.

- [ ] **Step 3: Typecheck complet**

Run: `npx tsc --noEmit -p packages/core`
Expected: aucune erreur.

- [ ] **Step 4: Build complet**

Run: `npm run build -w packages/core`
Expected: build OK (bundles + `custom-elements.json`).

- [ ] **Step 5: Revue finale de la branche (whole-branch review)**

Suivre `superpowers:requesting-code-review` sur l'ensemble du diff de la branche par rapport à `dev` avant d'ouvrir la PR.

- [ ] **Step 6: Ouvrir la PR**

```bash
gh pr create --base dev --title "fix(core): corrige les 5 bloquants beta restants (alert/pagination/table-sort/stepper/tab)" --body "$(cat <<'EOF'
## Résumé

Corrige les 5 constats bloquants pour la beta restants de l'audit technique v1.0-beta (`docs/superpowers/specs/2026-07-14-audit-technique-v1-beta.md`), après PR1 (transversaux mécaniques, #103) et PR2 (convention d'events, #104) :

- `ar-alert` : le survol/focus du bouton close (sans clic) ne vole plus le focus vers `next-focus` — la garde `hiding` couvre désormais tout le corps de `_finishHide()`, pas seulement l'émission de l'event de fermeture.
- `ar-pagination` : `total` négatif ne fait plus planter `render()` (`RangeError: Invalid array length`) — clampé à 1 minimum avant tout calcul, cohérent avec le `warn()` déjà émis.
- `ar-table-sort` : importe désormais `ar-tooltip` — fonctionne en import headless isolé (le composant rendait déjà `<ar-tooltip>` dans son propre template sans jamais l'importer).
- `ar-stepper` : `onClickLink` appelle désormais `preventDefault()` — un clic sur un item sans `href` réel ne déclenche plus de scroll-to-top natif. Fallback `href` unifié sur `'#'` (substeps utilisaient `javascript:;`, incohérent avec les steps principaux et avec la doc).
- `ar-tab` : `disabled` changé après montage notifie désormais le registry du tab-group (nouveau `TabGroupRegistry.notifyTabChanged()`, pattern calqué sur `BreadcrumbRegistry.notifyItemChanged()`) — `aria-disabled`/`tabindex` restent synchronisés avec le comportement clavier réel.

Chaque correctif est isolé et testé indépendamment, en TDD (test qui échoue avant, passe après).

## Test plan

- [x] Test de régression ajouté par correctif, vérifié en échec avant le fix
- [x] `npm run test` complet vert
- [x] `npm run test:browser` — 2 runs consécutifs verts
- [x] `tsc --noEmit` propre
- [x] `npm run build` complet vert
EOF
)"
```

- [ ] **Step 7: Mettre à jour la mémoire du projet si des décisions non triviales ont émergé pendant l'exécution**

Si un des correctifs a nécessité un compromis non documenté dans ce plan (ex: choix entre plusieurs fallbacks `href`, décision sur le comportement de `notifyTabChanged` avec plusieurs tab-groups imbriqués), le noter dans le système de mémoire projet avant de conclure.
