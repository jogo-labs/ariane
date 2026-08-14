# Infrastructure i18n (#80, lot 1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer l'infrastructure i18n de `@ariane-ui/core` via `@shoelace-style/localize`, et migrer
`ar-table-sort` et `ar-datepicker` (les deux seuls composants ayant aujourd'hui des chaînes
accessibles FR hardcodées) sur ce mécanisme.

**Architecture:** Un `LocalizeController` (Lit `ReactiveController`, fourni par
`@shoelace-style/localize`) est instancié par composant traduit. La langue effective vient de
l'attribut `lang` du composant, ou à défaut de `<html lang>` — jamais d'un ancêtre intermédiaire
(limite documentée de la lib). Les traductions sont des modules ES qui s'auto-enregistrent à
l'import (`registerTranslation()`), livrées dans `src/translations/{fr,en}.ts`. Le contrat typé
`Translation` (un seul type plat, `src/types/translation.ts`) définit les termes disponibles,
certains étant des fonctions pour gérer interpolation/pluriel (ex.
`sortApplied: (columnLabel: string, order: TableSortOrder) => string`).

**Tech Stack:** Lit 3, TypeScript, `@shoelace-style/localize` (nouvelle dépendance, MIT), Vitest
(tests unitaires), `@web/test-runner` (tests navigateur `.browser.test.ts`).

## Global Constraints

- Prettier : 100 caractères, 4 espaces, guillemets simples — respecté automatiquement par
  lint-staged au commit, aucune action manuelle requise.
- Toujours `import type` pour les imports de types.
- Conventional Commits (commitlint + Husky) — préfixes `feat`/`fix`/`docs`/`test`/`chore` selon la
  nature du changement de chaque tâche.
- `packages/core` est **headless** : aucun changement de ce plan ne touche à des styles, donc pas
  de nouveau token `--ar-*` à documenter.
- Branche depuis `dev`, PR vers `dev` — jamais de push direct sur `main`.
- Breaking change sur `ar-datepicker` (retrait de `today-label`/`close-label`) acceptable en alpha
  — pas de `warnDeprecated()` nécessaire (convention du projet).

---

## File Structure

**Nouveaux fichiers :**

- `packages/core/src/types/translation.ts` — interface `Translation` du projet (étend celle de la
  lib).
- `packages/core/src/translations/fr.ts` — traduction française (fallback).
- `packages/core/src/translations/en.ts` — traduction anglaise (référence).
- `packages/core/src/translations/translations.test.ts` — garde-fou : `fr`/`en` implémentent tous
  les termes de `Translation`.
- `packages/core/src/controllers/localize.controller.ts` — `LocalizeController` typé sur
  `Translation`.
- `apps/docs/src/pages/getting-started/i18n.astro` — page de doc du mécanisme.

**Fichiers modifiés :**

- `packages/core/package.json` — nouvelle dépendance `@shoelace-style/localize`.
- `packages/core/src/types/ariane-config.d.ts` — retrait de `ArianeConfig.i18n`.
- `packages/core/src/index.ts` — nouveaux exports publics.
- `packages/core/src/components/table-sort/table-sort.ts` — migration des labels vers
  `LocalizeController`.
- `packages/core/src/components/table-sort/table-sort.test.ts`,
  `table-sort.browser.test.ts` — assertions mises à jour + nouveau test `lang="en"`.
- `packages/core/src/components/datepicker/datepicker.ts` — migration `today`/`close`, retrait des
  props, alignement du fallback `locale`.
- `packages/core/src/components/datepicker/datepicker.test.ts` — assertions mises à jour.
- `packages/core/README.md` — section crédits.
- `apps/docs/src/components/SiteNav.astro` — entrée de nav vers la nouvelle page i18n.

---

### Task 1: Branche + dépendance `@shoelace-style/localize`

**Files:**

- Modify: `packages/core/package.json`

**Interfaces:**

- Produces: dépendance `@shoelace-style/localize` disponible pour tous les imports des tâches
  suivantes.

- [ ] **Step 1: Créer la branche depuis `dev`**

```bash
cd /Users/jon/Code/Active_projects/ariane
git checkout dev
git pull
git checkout -b feat/i18n-infrastructure-80
```

- [ ] **Step 2: Installer la dépendance dans `packages/core`**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm install @shoelace-style/localize --workspace=packages/core
```

Vérifier après coup que `packages/core/package.json` liste bien `"@shoelace-style/localize"` dans
`dependencies` (pas `devDependencies` — c'est une dépendance runtime des composants) et que
`package-lock.json` a été mis à jour à la racine.

- [ ] **Step 3: Commit**

```bash
git add packages/core/package.json package-lock.json
git commit -m "chore(core): ajoute la dépendance @shoelace-style/localize (#80)"
```

---

### Task 2: Type `Translation` du projet + retrait de la réservation obsolète

**Files:**

- Create: `packages/core/src/types/translation.ts`
- Modify: `packages/core/src/types/ariane-config.d.ts`

**Interfaces:**

- Consumes: `Translation` (type de base) exporté par `@shoelace-style/localize`.
- Produces: `export interface Translation extends BaseTranslation { ... }` — tous les termes
  `table-sort`/`datepicker`, consommé par Task 3 (fichiers de traduction) et Task 4 (controller).

- [ ] **Step 1: Écrire `src/types/translation.ts`**

```ts
import type { Translation as BaseTranslation } from '@shoelace-style/localize';
import type { TableSortType, TableSortOrder } from '../components/table-sort/table-sort.js';

/**
 * Contrat de traduction d'Ariane — étend le type de base de @shoelace-style/localize.
 * Un seul type plat regroupant les termes de tous les composants traduits (pas d'augmentation
 * par composant), à l'image du modèle Shoelace/WebAwesome.
 */
export interface Translation extends BaseTranslation {
    // ar-table-sort
    sortAscending: (type: TableSortType) => string;
    sortDescending: (type: TableSortType) => string;
    sortReset: (type: TableSortType) => string;
    sortPending: string;
    sortInProgress: string;
    sortApplied: (columnLabel: string, order: TableSortOrder) => string;
    sortFailed: (columnLabel: string) => string;

    // ar-datepicker
    today: string;
    close: string;
}
```

Note : `TableSortType`/`TableSortOrder` sont déjà exportés par `table-sort.ts` (`export type
TableSortType = 'alpha' | 'numeric' | 'date'`, `export type TableSortOrder = 'none' | 'asc' |
'desc'`) — pas de nouveau type à créer, juste les réimporter pour garder les termes typés sans
dupliquer les unions littérales.

- [ ] **Step 2: Retirer `ArianeConfig.i18n`**

Dans `packages/core/src/types/ariane-config.d.ts`, supprimer entièrement le bloc :

```ts
    /**
     * Réservé pour l'infrastructure i18n (issue #80). Structure figée pour éviter un
     * breaking change de shape plus tard, mais non lu par le code tant que #80 n'est
     * pas implémenté.
     * Forme : { <composant camelCase sans "ar">: { <clé de label>: <valeur traduite> } }
     */
    i18n?: Record<string, Record<string, string>>;
```

Le fichier résultant :

```ts
/**
 * Contrat de configuration globale exposé par les consommateurs CDN via
 * `window.ARIANE_CONFIG` avant le chargement du script Ariane.
 */
interface ArianeConfig {
    /** Préfixe des tags custom elements générés par l'autoloader CDN. Défaut : 'ar'. */
    prefix?: string;
}

declare global {
    interface Window {
        ARIANE_CONFIG?: ArianeConfig;
    }
}

export {};
```

- [ ] **Step 3: Vérifier la compilation TypeScript**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core
npx tsc --noEmit
```

Expected: pas d'erreur liée à `translation.ts` (les composants ne consomment pas encore
`Translation` à ce stade — normal). Si une erreur apparaît ailleurs sur `ArianeConfig.i18n`,
chercher les usages restants avec `grep -rn "ARIANE_CONFIG" packages/core/src apps/docs/src` et les
retirer (aucun usage attendu — la propriété n'était lue par aucun code).

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/types/translation.ts packages/core/src/types/ariane-config.d.ts
git commit -m "feat(core): ajoute le type Translation, retire ArianeConfig.i18n obsolète (#80)"
```

---

### Task 3: Fichiers de traduction `fr`/`en` + garde-fou de couverture

**Files:**

- Create: `packages/core/src/translations/fr.ts`
- Create: `packages/core/src/translations/en.ts`
- Test: `packages/core/src/translations/translations.test.ts`

**Interfaces:**

- Consumes: `Translation` (Task 2), `registerTranslation` de `@shoelace-style/localize`.
- Produces: `export default translation` (objet `Translation` complet) dans chaque fichier,
  consommé par Task 5/6 (imports d'enregistrement) et par ce test.

- [ ] **Step 1: Écrire le test de couverture (échoue avant les fichiers de traduction)**

```ts
// packages/core/src/translations/translations.test.ts
import { describe, expect, it } from 'vitest';
import fr from './fr.js';
import en from './en.js';

describe('traductions', () => {
    it('fr a $code, $name, $dir renseignés', () => {
        expect(fr.$code).toBe('fr');
        expect(fr.$name).toBe('Français');
        expect(fr.$dir).toBe('ltr');
    });

    it('en a $code, $name, $dir renseignés', () => {
        expect(en.$code).toBe('en');
        expect(en.$name).toBe('English');
        expect(en.$dir).toBe('ltr');
    });

    it('fr et en implémentent les mêmes termes', () => {
        const termsOf = (t: Record<string, unknown>) =>
            Object.keys(t)
                .filter((k) => !k.startsWith('$'))
                .sort();
        expect(termsOf(fr)).toEqual(termsOf(en));
    });

    it('fr.sortApplied interpole columnLabel et order', () => {
        expect(fr.sortApplied('Prix', 'asc')).toBe('Prix : tri croissant appliqué');
        expect(fr.sortApplied('Prix', 'none')).toBe('Prix : tri supprimé');
    });

    it('en.sortApplied interpole columnLabel et order', () => {
        expect(en.sortApplied('Price', 'desc')).toBe('Price: descending sort applied');
    });
});
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core
npx vitest run src/translations/translations.test.ts
```

Expected: FAIL — `Cannot find module './fr.js'` (les fichiers n'existent pas encore).

- [ ] **Step 3: Écrire `src/translations/fr.ts`**

```ts
import { registerTranslation } from '@shoelace-style/localize';
import type { Translation } from '../types/translation.js';

const sortLabel = (
    type: 'alpha' | 'numeric' | 'date',
    labels: { alpha: string; numeric: string; date: string },
): string => labels[type];

const translation: Translation = {
    $code: 'fr',
    $name: 'Français',
    $dir: 'ltr',

    sortAscending: (type) =>
        sortLabel(type, {
            alpha: 'Trier de A à Z',
            numeric: 'Trier par ordre croissant',
            date: 'Trier du plus ancien au plus récent',
        }),
    sortDescending: (type) =>
        sortLabel(type, {
            alpha: 'Trier de Z à A',
            numeric: 'Trier par ordre décroissant',
            date: 'Trier du plus récent au plus ancien',
        }),
    sortReset: (type) =>
        sortLabel(type, {
            alpha: 'Supprimer le tri alphabétique',
            numeric: 'Supprimer le tri numérique',
            date: 'Supprimer le tri chronologique',
        }),
    sortPending: 'Tri en cours…',
    sortInProgress: 'Tri en cours, veuillez patienter.',
    sortApplied: (columnLabel, order) => {
        const suffix =
            order === 'none'
                ? 'tri supprimé'
                : order === 'asc'
                  ? 'tri croissant appliqué'
                  : 'tri décroissant appliqué';
        return `${columnLabel} : ${suffix}`;
    },
    sortFailed: (columnLabel) => `${columnLabel} : échec du tri.`,

    today: "Aujourd'hui",
    close: 'Fermer',
};

registerTranslation(translation);

export default translation;
```

- [ ] **Step 4: Écrire `src/translations/en.ts`**

```ts
import { registerTranslation } from '@shoelace-style/localize';
import type { Translation } from '../types/translation.js';

const sortLabel = (
    type: 'alpha' | 'numeric' | 'date',
    labels: { alpha: string; numeric: string; date: string },
): string => labels[type];

const translation: Translation = {
    $code: 'en',
    $name: 'English',
    $dir: 'ltr',

    sortAscending: (type) =>
        sortLabel(type, {
            alpha: 'Sort A to Z',
            numeric: 'Sort in ascending order',
            date: 'Sort oldest to newest',
        }),
    sortDescending: (type) =>
        sortLabel(type, {
            alpha: 'Sort Z to A',
            numeric: 'Sort in descending order',
            date: 'Sort newest to oldest',
        }),
    sortReset: (type) =>
        sortLabel(type, {
            alpha: 'Remove alphabetical sort',
            numeric: 'Remove numeric sort',
            date: 'Remove chronological sort',
        }),
    sortPending: 'Sorting…',
    sortInProgress: 'Sorting in progress, please wait.',
    sortApplied: (columnLabel, order) => {
        const suffix =
            order === 'none'
                ? 'sort removed'
                : order === 'asc'
                  ? 'ascending sort applied'
                  : 'descending sort applied';
        return `${columnLabel}: ${suffix}`;
    },
    sortFailed: (columnLabel) => `${columnLabel}: sort failed.`,

    today: 'Today',
    close: 'Close',
};

registerTranslation(translation);

export default translation;
```

- [ ] **Step 5: Lancer le test, vérifier qu'il passe**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core
npx vitest run src/translations/translations.test.ts
```

Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/translations/
git commit -m "feat(core): traductions fr (défaut) et en (référence) — table-sort + datepicker (#80)"
```

---

### Task 4: `LocalizeController` typé + exports publics

**Files:**

- Create: `packages/core/src/controllers/localize.controller.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**

- Consumes: `Translation` (Task 2), `LocalizeController`/`registerTranslation` de
  `@shoelace-style/localize`.
- Produces: `export class LocalizeController extends BaseLocalizeController<Translation> {}` —
  `new LocalizeController(this)` utilisé par Task 5 et Task 6 dans les composants.

- [ ] **Step 1: Écrire `src/controllers/localize.controller.ts`**

```ts
import { LocalizeController as BaseLocalizeController } from '@shoelace-style/localize';
import type { Translation } from '../types/translation.js';

/**
 * LocalizeController d'Ariane, typé sur le contrat Translation du projet.
 * Wrapper de @shoelace-style/localize — cf. https://github.com/shoelace-style/localize.
 */
export class LocalizeController extends BaseLocalizeController<Translation> {}
```

- [ ] **Step 2: Ajouter les exports publics dans `src/index.ts`**

Dans `packages/core/src/index.ts`, après la ligne `export { announceA11y } from
'./a11y/announce-a11y.js';` et avant le premier `import './components/alert/index.js';`, ajouter :

```ts
export { LocalizeController } from './controllers/localize.controller.js';
export { registerTranslation } from '@shoelace-style/localize';
export type { Translation } from './types/translation.js';
export { default as frTranslation } from './translations/fr.js';
export { default as enTranslation } from './translations/en.js';
```

(Nommage `frTranslation`/`enTranslation` plutôt que `fr`/`en` pour l'export public — évite un nom
à deux lettres trop générique dans l'API publique du package, sans ambiguïté pour qui lit
`import { frTranslation } from '@ariane-ui/core'`.)

- [ ] **Step 3: Vérifier la compilation**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core
npx tsc --noEmit
```

Expected: pas de nouvelle erreur.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/controllers/localize.controller.ts packages/core/src/index.ts
git commit -m "feat(core): expose LocalizeController et les traductions dans l'API publique (#80)"
```

---

### Task 5: Migration `ar-table-sort`

**Files:**

- Modify: `packages/core/src/components/table-sort/table-sort.ts`
- Modify: `packages/core/src/components/table-sort/table-sort.test.ts`
- Modify: `packages/core/src/components/table-sort/table-sort.browser.test.ts`

**Interfaces:**

- Consumes: `LocalizeController` (Task 4), termes `sortAscending`/`sortDescending`/`sortReset`/
  `sortPending`/`sortInProgress`/`sortApplied`/`sortFailed` (Task 2/3).

- [ ] **Step 1: Écrire le test `lang="en"` qui échoue (comportement pas encore migré)**

Ajouter dans `table-sort.test.ts`, dans une nouvelle section en fin de fichier :

```ts
// ── i18n ──────────────────────────────────────────────────────────────

describe('i18n', () => {
    it('tooltip traduit en anglais via lang="en"', async () => {
        el = await fixture('<ar-table-sort type="alpha" lang="en"></ar-table-sort>');
        expect(tooltipLabel(el)).toBe('Sort A to Z');
    });
});
```

(`tooltipLabel` est la fonction déjà définie plus haut dans le fichier, ligne 60 —
`el.shadowRoot!.querySelector('ar-tooltip')!.textContent!.trim()`.)

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core
npx vitest run src/components/table-sort/table-sort.test.ts -t "i18n"
```

Expected: FAIL — le tooltip affiche toujours "Trier de A à Z" (comportement FR hardcodé actuel,
`lang` n'a aucun effet).

- [ ] **Step 3: Migrer `table-sort.ts`**

Remplacer les imports en tête de fichier :

```ts
import { LitElement, html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import styles from './table-sort.styles.js';
import { announceA11y } from '../../a11y/announce-a11y.js';
import { warn } from '../../utils/warn.js';
import { LocalizeController } from '../../controllers/localize.controller.js';
import '../../translations/fr.js';
import '../../translations/en.js';
import '../tooltip/index.js';
```

Supprimer entièrement `ACTION_LABELS`, `APPLIED_LABELS` et `getActionLabel()` (les constantes et
la fonction module-level, lignes 17-46 dans la version actuelle).

Dans la classe `ArTableSort`, ajouter le controller juste après la déclaration de `pending` :

```ts
    private readonly localize = new LocalizeController(this);
```

Remplacer le corps de `confirm()` :

```ts
    confirm(): void {
        if (!this._pendingOrder) return;
        const newOrder = this._pendingOrder;
        this._pendingOrder = null;
        this.pending = false;
        this.order = newOrder;
        announceA11y(this.localize.term('sortApplied', this._getColumnLabel(), newOrder));
    }
```

Remplacer le corps de `reset()` :

```ts
    reset(): void {
        if (this.order === 'none') return;
        this.order = 'none';
        announceA11y(this.localize.term('sortApplied', this._getColumnLabel(), 'none'));
    }
```

Remplacer le corps de `reject()` :

```ts
    reject(reason?: string): void {
        if (!this._pendingOrder) return;
        this._pendingOrder = null;
        this.pending = false;
        announceA11y(reason ?? this.localize.term('sortFailed', this._getColumnLabel()));
    }
```

Dans `_handleClick()`, remplacer l'annonce hardcodée :

```ts
    private _handleClick(): void {
        if (this.pending) {
            announceA11y(this.localize.term('sortInProgress'));
            return;
        }
        // ... reste inchangé
```

Ajouter une méthode privée `_getActionLabel()` juste avant `render()`, et l'utiliser dedans :

```ts
    private _getActionLabel(): string {
        if (this.pending) return this.localize.term('sortPending');
        if (this.order === 'none') return this.localize.term('sortAscending', this.type);
        if (this.order === 'asc') return this.localize.term('sortDescending', this.type);
        return this.localize.term('sortReset', this.type);
    }

    override render() {
        const label = this._getActionLabel();
        return html`
            <button
                part="sort-button action-button${this.pending ? ' sort-button--pending' : ''}"
                type="button"
                aria-disabled=${this.pending ? 'true' : nothing}
                @click=${this._handleClick}
                id=${this._buttonId}
            >
                <slot></slot>
                <span part="indicator" aria-hidden="true"></span>
            </button>
            <ar-tooltip for=${this._buttonId}>${label}</ar-tooltip>
        `;
    }
```

- [ ] **Step 4: Lancer le test ciblé, vérifier qu'il passe**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core
npx vitest run src/components/table-sort/table-sort.test.ts -t "i18n"
```

Expected: PASS.

- [ ] **Step 5: Lancer toute la suite unitaire du composant, vérifier la non-régression**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core
npx vitest run src/components/table-sort/table-sort.test.ts
```

Expected: PASS — tous les tests existants ("labels — alpha/numeric/date") passent toujours, la
sortie FR par défaut est inchangée (elle vient maintenant de `fr.ts` au lieu des constantes
inline, même texte).

- [ ] **Step 6: Lancer les tests navigateur, vérifier la non-régression**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core
npx web-test-runner "src/components/table-sort/*.browser.test.ts"
```

Expected: PASS, y compris `'annonce via aria-live après confirm()'` qui vérifie
`live.textContent === 'Prix : tri croissant appliqué'` — sortie inchangée par construction
(`sortApplied('Prix', 'asc')` produit exactement cette chaîne, cf. test de Task 3).

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/components/table-sort/
git commit -m "feat(table-sort): migre les labels accessibles vers LocalizeController (#80)"
```

---

### Task 6: Migration `ar-datepicker`

**Files:**

- Modify: `packages/core/src/components/datepicker/datepicker.ts`
- Modify: `packages/core/src/components/datepicker/datepicker.test.ts`

**Interfaces:**

- Consumes: `LocalizeController` (Task 4), termes `today`/`close` (Task 2/3).

- [ ] **Step 1: Adapter les tests existants qui dépendent des props retirées**

Dans `datepicker.test.ts`, remplacer le bloc `describe('libellés today/close', ...)` (lignes
336-398 actuelles) par :

```ts
describe('libellés today/close', () => {
    it('today-button et close-button affichent "Aujourd\'hui" / "Fermer" par défaut (fr)', async () => {
        el = await fixture('<ar-datepicker></ar-datepicker>');
        el.open = true;
        await waitForUpdate(el);
        const todayBtn = getPart(el, 'today-button');
        const closeBtn = getPart(el, 'close-button');
        expect(todayBtn?.textContent?.trim()).toBe("Aujourd'hui");
        expect(todayBtn?.getAttribute('aria-label')).toBe("Aujourd'hui");
        expect(closeBtn?.textContent?.trim()).toBe('Fermer');
        expect(closeBtn?.getAttribute('aria-label')).toBe('Fermer');
    });

    it('today-button et close-button sont traduits en anglais via lang="en"', async () => {
        el = await fixture('<ar-datepicker lang="en"></ar-datepicker>');
        el.open = true;
        await waitForUpdate(el);
        const todayBtn = getPart(el, 'today-button');
        const closeBtn = getPart(el, 'close-button');
        expect(todayBtn?.textContent?.trim()).toBe('Today');
        expect(closeBtn?.textContent?.trim()).toBe('Close');
    });

    it('nav-button et footer-button portent le rôle transverse "action-button"', async () => {
        el = await fixture('<ar-datepicker></ar-datepicker>');
        el.open = true;
        await waitForUpdate(el);
        const navButton = el.shadowRoot?.querySelector('[part~="nav-button"]');
        const footerButton = el.shadowRoot?.querySelector('[part~="footer-button"]');
        expect(navButton?.getAttribute('part')?.split(/\s+/)).toContain('action-button');
        expect(footerButton?.getAttribute('part')?.split(/\s+/)).toContain('action-button');
    });

    it('les slots today-label/close-label remplacent le contenu par défaut', async () => {
        el = await fixture(`
                <ar-datepicker>
                    <span slot="today-label">📅 Aujourd'hui</span>
                    <span slot="close-label">✕</span>
                </ar-datepicker>
            `);
        el.open = true;
        await waitForUpdate(el);

        const todaySlot = el.shadowRoot?.querySelector(
            'slot[name="today-label"]',
        ) as HTMLSlotElement;
        const closeSlot = el.shadowRoot?.querySelector(
            'slot[name="close-label"]',
        ) as HTMLSlotElement;
        expect(todaySlot.assignedElements()).toHaveLength(1);
        expect(closeSlot.assignedElements()).toHaveLength(1);
    });

    it('aria-label reste posé sur le bouton même quand le slot est utilisé (icône seule)', async () => {
        el = await fixture(`
                <ar-datepicker>
                    <span slot="close-label" aria-hidden="true">✕</span>
                </ar-datepicker>
            `);
        el.open = true;
        await waitForUpdate(el);
        const closeBtn = getPart(el, 'close-button');
        expect(closeBtn?.getAttribute('aria-label')).toBe('Fermer');
    });
});
```

Changements par rapport à l'existant :

- Le test `'todayLabel et closeLabel valent ... par défaut'` (qui lisait `el.todayLabel`) est
  remplacé par une assertion sur le texte rendu (les props n'existent plus).
- Le test `'les props todayLabel/closeLabel changent le texte des boutons'` est remplacé par le
  test `lang="en"` — c'est désormais le seul mécanisme de changement de langue, plus de
  surcharge par attribut de texte libre.
- Le test `'aria-label reste posé ... (icône seule)'` n'utilise plus l'attribut `close-label`
  (retiré) pour surcharger le texte — il vérifie que `aria-label` reste posé et vaut le terme
  traduit par défaut, même quand seul le slot (icône) a un contenu personnalisé.

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent (props pas encore retirées)**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core
npx vitest run src/components/datepicker/datepicker.test.ts -t "libellés today/close"
```

Expected: FAIL — `el.todayLabel`/`el.closeLabel` existent encore avec les valeurs hardcodées,
`lang="en"` n'a aucun effet sur le texte rendu.

- [ ] **Step 3: Migrer `datepicker.ts`**

Ajouter les imports en tête de fichier :

```ts
import { LitElement, html, nothing, type TemplateResult, type PropertyValues } from 'lit';
import { property, query } from 'lit/decorators.js';
import { CalendarController, type CalendarControllerOptions } from './calendar.controller.js';
import { HasSlotController } from '../../controllers/has-slot.controller.js';
import { AnchoredController } from '../../controllers/anchored.controller.js';
import { LocalizeController } from '../../controllers/localize.controller.js';
import { parse, format } from './date-parser.js';
import panelStyles from '../../styles/shared/panel.styles.js';
import styles from './datepicker.styles.js';
import { warn } from '../../utils/warn.js';
import '../../translations/fr.js';
import '../../translations/en.js';
```

Mettre à jour le JSDoc des slots (lignes 22-25 actuelles) :

```ts
 * @slot today-label - Contenu riche du bouton « Aujourd'hui » (icône + texte, remplace le texte
 *                     traduit par défaut).
 * @slot close-label - Contenu riche du bouton « Fermer » (icône + texte, remplace le texte
 *                     traduit par défaut).
```

Retirer les deux propriétés (lignes 144-147 actuelles) :

```ts
    /** Libellé du bouton « Aujourd'hui » (alternative au slot `today-label`). */
    @property({ attribute: 'today-label' }) todayLabel = "Aujourd'hui";
    /** Libellé du bouton « Fermer » (alternative au slot `close-label`). */
    @property({ attribute: 'close-label' }) closeLabel = 'Fermer';
```

Ajouter le controller à côté de `_anchored` (juste après son initialisation, avant les
`@property`) :

```ts
    private readonly localize = new LocalizeController(this);
```

Dans `render()`, remplacer la ligne de calcul de `locale` — `this.localize.lang()` résout déjà
`this.lang || document.documentElement.lang || navigator.language` en interne (vérifié dans le
code source de la lib), pas de raison de dupliquer cette chaîne à la main :

```ts
    override render(): TemplateResult {
        // this.localize.lang() résout déjà this.lang || <html lang> || navigator.language —
        // pas de raison de dupliquer cette chaîne de fallback à la main.
        const locale = this.locale || this.localize.lang();
        const todayLabel = this.localize.term('today');
        const closeLabel = this.localize.term('close');
        const exampleDate = new Date(new Date().getFullYear(), 11, 31);
```

Remplacer les 4 usages de `this.todayLabel`/`this.closeLabel` dans le footer (lignes 383-400
actuelles) par les consts locales :

```ts
            <div part="footer">
                <button
                    part="footer-button today-button action-button"
                    type="button"
                    aria-label=${todayLabel}
                    @click=${this._handleTodayClick}
                >
                    <slot name="today-label">${todayLabel}</slot>
                </button>
                <button
                    part="footer-button close-button action-button"
                    type="button"
                    aria-label=${closeLabel}
                    @click=${this._handleCloseClick}
                >
                    <slot name="close-label">${closeLabel}</slot>
                </button>
            </div>
```

- [ ] **Step 4: Lancer les tests, vérifier qu'ils passent**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core
npx vitest run src/components/datepicker/datepicker.test.ts
```

Expected: PASS — l'ensemble du fichier, pas seulement la section `libellés today/close` (vérifie
l'absence de régression sur le reste du composant, notamment le calcul de `rangeText`/`locale`
qui dépend de la même ligne modifiée).

- [ ] **Step 5: Lancer les tests navigateur du composant, vérifier la non-régression**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core
npx web-test-runner "src/components/datepicker/*.browser.test.ts"
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/components/datepicker/
git commit -m "feat(datepicker): migre today/close vers LocalizeController, retire les props (#80)

BREAKING CHANGE: les props today-label/close-label sont retirées. Utiliser lang
pour changer la langue, ou le slot today-label/close-label pour un contenu riche."
```

---

### Task 7: Documentation — crédits + page i18n

**Files:**

- Modify: `packages/core/README.md`
- Create: `apps/docs/src/pages/getting-started/i18n.astro`
- Modify: `apps/docs/src/components/SiteNav.astro`

**Interfaces:**

- Consumes: aucune (documentation pure).

- [ ] **Step 1: Ajouter la section crédits dans `packages/core/README.md`**

Avant la section finale `## Contribuer` (juste après le bloc de fermeture des tests, ligne 227
actuelle), insérer :

```markdown
## Crédits

L'infrastructure i18n s'appuie sur [`@shoelace-style/localize`](https://github.com/shoelace-style/localize)
(MIT), la micro-librairie de traduction de Shoelace. Ariane s'inspire plus largement de
[WebAwesome](https://webawesome.com/) (successeur de Shoelace) comme référence de conception pour
plusieurs de ses composants et mécanismes.

---
```

- [ ] **Step 2: Écrire la page de doc `apps/docs/src/pages/getting-started/i18n.astro`**

```astro
---
import Layout from '../../layouts/Layout.astro';
import TableOfContents from '../../components/TableOfContents.astro';

const tocEntries = [
    { id: 'principe',        label: 'Principe : lang',                level: 1 as const },
    { id: 'limite',           label: 'Limite : pas d’héritage',        level: 1 as const },
    { id: 'fr-en',            label: 'fr/en : rien à importer',        level: 1 as const },
    { id: 'traductions',      label: 'Fournir sa propre traduction',   level: 1 as const },
    { id: 'composants',       label: 'Composants concernés',           level: 1 as const },
];

const codeChangeLang = `<!-- Langue par défaut de la page -->
<html lang="en">

<!-- Ou par composant, en surcharge -->
<ar-table-sort lang="es">Prix</ar-table-sort>`;

const codeCustomTranslation = `import { registerTranslation } from '@ariane-ui/core';
import type { Translation } from '@ariane-ui/core';
import { enTranslation } from '@ariane-ui/core';

const es: Translation = {
    ...enTranslation, // base de départ, à traduire terme par terme
    $code: 'es',
    $name: 'Español',
    $dir: 'ltr',
    today: 'Hoy',
    close: 'Cerrar',
    // ...
};

registerTranslation(es);`;

const codeCustomTranslationCdn = `<!-- mon-app-es.js : le fichier ci-dessus, compilé, hébergé par vous -->
<script type="module" src="/mon-app-es.js"></script>`;
---

<Layout title="Internationalisation (i18n)" currentPath="/getting-started/i18n" showToc={true}>
    <div class="page-container">
        <div class="page-header">
            <h2 class="page-title">Internationalisation</h2>
            <p class="summary">
                Certains composants Ariane embarquent des libellés accessibles (annonces
                aria-live, aria-label). Ce mécanisme permet de les traduire sans surcharger
                chaque instance manuellement.
            </p>
        </div>

        <section id="principe" class="main-section">
            <div>
                <h3 class="section-title">Principe : l'attribut <code>lang</code></h3>
                <p>
                    Ariane s'appuie sur <a href="https://github.com/shoelace-style/localize"
                    target="_blank" rel="noopener">@shoelace-style/localize</a> : la langue
                    effective d'un composant vient de son propre attribut <code>lang</code>, ou à
                    défaut de <code>&lt;html lang&gt;</code>. Le français est la langue par défaut
                    si aucun <code>lang</code> n'est posé nulle part.
                </p>
                <pre><code class="language-html" set:text={codeChangeLang} /></pre>
            </div>
        </section>

        <section id="limite" class="main-section">
            <div>
                <h3 class="section-title">Limite : pas d'héritage via un ancêtre intermédiaire</h3>
                <ar-alert variant="warning" without-notification class="doc-callout-alert">
                    <p class="doc-callout-alert-title">À savoir</p>
                    <div class="doc-callout-alert-content">
                        <p>
                            Seuls <code>&lt;html lang&gt;</code> et le <code>lang</code> posé
                            directement sur le composant sont pris en compte — un
                            <code>&lt;div lang="es"&gt;</code> autour d'un composant Ariane n'a
                            aucun effet. C'est une limite assumée de la librairie, pour des
                            raisons de performance (pas de traversée du DOM à chaque rendu).
                        </p>
                    </div>
                </ar-alert>
            </div>
        </section>

        <section id="fr-en" class="main-section">
            <div>
                <h3 class="section-title"><code>fr</code>/<code>en</code> : rien à importer</h3>
                <p>
                    Contrairement à d'autres bibliothèques qui publient un fichier par langue à
                    charger à la demande, les traductions <code>fr</code> (défaut) et
                    <code>en</code> sont embarquées directement dans chaque composant qui en a
                    besoin (CDN ou npm). Charger <code>ar-table-sort</code> ou
                    <code>ar-datepicker</code> suffit — les deux langues sont déjà enregistrées,
                    aucun import supplémentaire n'est nécessaire pour les utiliser.
                </p>
            </div>
        </section>

        <section id="traductions" class="main-section">
            <div>
                <h3 class="section-title">Fournir sa propre traduction</h3>
                <p>
                    Pour une langue tierce, partez de <code>enTranslation</code> (traduction
                    anglaise, exportée par le package) comme référence typée, et fournissez tous
                    les termes attendus. Cette fois l'import est à votre charge — c'est votre
                    fichier, pas un fichier livré par Ariane.
                </p>
                <pre><code class="language-js" set:text={codeCustomTranslation} /></pre>
                <p>
                    Via CDN, enregistrez-la avec un <code>&lt;script type="module"&gt;</code>
                    pointant vers votre propre fichier compilé :
                </p>
                <pre><code class="language-html" set:text={codeCustomTranslationCdn} /></pre>
            </div>
        </section>

        <section id="composants" class="main-section">
            <div>
                <h3 class="section-title">Composants concernés</h3>
                <p>
                    <code>ar-table-sort</code> (labels de tri, annonces aria-live) et
                    <code>ar-datepicker</code> (boutons « Aujourd'hui » / « Fermer »). D'autres
                    composants rejoindront ce mécanisme au fil des prochaines versions.
                </p>
            </div>
        </section>
    </div>

    <TableOfContents entries={tocEntries} slot="toc" />
</Layout>

<style>
    @import '../../styles/doc-prose.css';
</style>
```

- [ ] **Step 3: Ajouter l'entrée de navigation**

Dans `apps/docs/src/components/SiteNav.astro`, dans le même tableau que les autres entrées
`getting-started`, ajouter après `naming-conventions` :

```ts
    { href: '/getting-started/i18n', label: 'Internationalisation', ariaCurrent: undefined },
```

- [ ] **Step 4: Vérifier visuellement dans le navigateur**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run dev
```

Ouvrir `http://localhost:4321/getting-started/i18n` (port à confirmer dans la sortie de la
commande), vérifier que la page s'affiche sans erreur de build Astro et que le lien apparaît dans
la nav latérale.

- [ ] **Step 5: Commit**

```bash
git add packages/core/README.md apps/docs/src/pages/getting-started/i18n.astro apps/docs/src/components/SiteNav.astro
git commit -m "docs: crédits @shoelace-style/localize + page i18n (#80)"
```

---

### Task 8: Vérification finale + PR

**Files:** aucun nouveau fichier — vérification globale uniquement.

- [ ] **Step 1: Suite de tests complète (unitaire + navigateur), depuis la racine**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run test:all
```

Expected: tous les tests passent (`packages/core` et `apps/docs`), aucune régression sur les
composants non touchés.

- [ ] **Step 2: Build complet, y compris le manifest CEM**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run build --workspace=packages/core
```

Expected: build réussi. Vérifier dans `packages/core/dist/custom-elements.json` que
`ar-datepicker` n'expose plus `today-label`/`close-label` dans ses `attributes`/`members`
(`grep -n "todayLabel\|closeLabel" packages/core/dist/custom-elements.json` ne doit rien
retourner).

- [ ] **Step 3: Vérification TypeScript stricte**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core
npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Step 4: Push et création de la PR**

```bash
cd /Users/jon/Code/Active_projects/ariane
git push -u origin feat/i18n-infrastructure-80
gh pr create --base dev --title "feat(core): infrastructure i18n — table-sort + datepicker (#80)" --body "$(cat <<'EOF'
## Résumé

- Ajoute l'infrastructure i18n via `@shoelace-style/localize` (`LocalizeController`, attribut
  `lang`) — remplace le design initial (`setLocale()` global), suite à l'évaluation demandée
  dans l'issue.
- Migre `ar-table-sort` (labels de tri, annonces aria-live) et `ar-datepicker`
  (`today`/`close`, retrait des props `today-label`/`close-label`) sur ce mécanisme.
- Traductions `fr` (défaut) et `en` (référence typée) livrées avec le package.
- Retire `ArianeConfig.i18n`, réservation obsolète incompatible avec le modèle retenu.

Lot 2 (pagination, spinner, stepper, charcounter) traité dans une PR dédiée ultérieure, toujours
sous #80.

Spec : `docs/superpowers/specs/2026-08-14-i18n-infrastructure-design.md`
Plan : `docs/superpowers/plans/2026-08-14-i18n-infrastructure.md`

Closes #80 (partiellement — lot 2 à suivre, ne pas fermer l'issue à ce merge).

## Breaking change

`ar-datepicker` : `today-label`/`close-label` (props) retirés. Utiliser `lang` pour changer la
langue, ou les slots `today-label`/`close-label` pour un contenu riche personnalisé.

## Test plan

- [x] `npm run test:all` — suite complète verte
- [x] `npx tsc --noEmit` — aucune erreur de type
- [x] Build + manifest CEM vérifié (props retirées bien absentes de `custom-elements.json`)
- [x] Page doc i18n vérifiée visuellement en dev

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Ne pas fermer l'issue #80 au merge de cette PR (label `status:en-attente-release`) — le lot 2
reste à faire dans le cadre de la même issue.
