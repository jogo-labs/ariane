# Migration `--ar-dialog-width`/`--ar-dialog-spacing` vers `default.css` + garde-fou anti-régression — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrer les valeurs `--ar-dialog-width`/`--ar-dialog-spacing` actuellement codées en dur dans `dialog.styles.ts` vers `default.css`, et ajouter un garde-fou automatique (`npm run build:manifest`) qui empêche toute réintroduction future d'une valeur `--ar-*` littérale dans un fichier `*.styles.ts`.

**Architecture:** `default.css` gagne 9 nouveaux tokens (8 presets de largeur + spacing). `dialog.styles.ts` référence ces presets via `var()` au lieu de valeurs littérales, sans changement de comportement pour les consommateurs. Un nouveau module `packages/core/scripts/validate-no-hardcoded-tokens.js` (fonctions pures, même style que `validate-cssprop-defaults.js` de la PR #114) scanne tous les `*.styles.ts` du package et détecte toute assignation `--ar-*: <valeur littérale>;`, branché dans le même hook `packageLinkPhase` de `cem.config.js`. Un nouvel `ADR-005` formalise la règle pour les futurs composants.

**Tech Stack:** Node.js (ESM), Vitest (tests), `@custom-elements-manifest/analyzer` (`packageLinkPhase` hook).

## Global Constraints

- Prettier : 100 caractères, 4 espaces, guillemets simples.
- Continuation directe de la branche `fix/cssprop-default-validation` (PR [#114](https://github.com/jogo-labs/ariane/pull/114), toujours ouverte) — **pas de nouvelle branche**, ces tâches committent sur la branche existante.
- Aucune régression de comportement visible : les valeurs de largeur/spacing rendues restent identiques, seule leur source change.
- `--ar-dialog-width` reste un seul token (pas de token interne séparé), toujours sélectionné par les règles d'attribut ET surchargeable directement sur l'instance — comportement inchangé.
- Le nouveau garde-fou ne vérifie que les _assignations_ de custom properties (`--ar-xxx: valeur;`), jamais les usages en consommation (`var(--ar-xxx, fallback)`) — les fallbacks structurels restent autorisés.
- Pas de nouvelle dépendance npm — utiliser `node:fs` (`readdirSync` avec `recursive: true`, disponible en Node 24) pour lister les fichiers `*.styles.ts`, pas de librairie de glob externe.

---

## Fichiers touchés

- **Modifier** `packages/core/src/styles/themes/default.css` — ajoute 9 tokens dialog (8 presets de largeur + spacing).
- **Modifier** `packages/core/src/components/dialog/dialog.styles.ts` — retire les valeurs littérales, référence les presets via `var()`.
- **Modifier** `packages/core/src/components/dialog/dialog.ts` — ajoute 8 `@cssprop` pour les nouveaux tokens preset.
- **Modifier** `packages/core/src/components/dialog/dialog.test.ts` — met à jour l'assertion sur `--ar-dialog-width` désormais non résolue en environnement Vitest (happy-dom ne charge pas `default.css`).
- **Créer** `packages/core/scripts/validate-no-hardcoded-tokens.js` — `findStylesFiles` + `findHardcodedTokenAssignments`.
- **Créer** `packages/core/scripts/validate-no-hardcoded-tokens.test.js` — tests Vitest des deux fonctions.
- **Modifier** `packages/core/cem.config.js` — importe et appelle les deux fonctions, combine leurs erreurs avec les deux checks existants de la PR #114.
- **Créer** `docs/decisions/ADR-005-tokens-pilotes-par-attribut.md`.

---

### Task 1: Migration CSS — `default.css` + `dialog.styles.ts`

**Files:**

- Modify: `packages/core/src/styles/themes/default.css:436-442`
- Modify: `packages/core/src/components/dialog/dialog.styles.ts:9-47`
- Modify: `packages/core/src/components/dialog/dialog.test.ts:619-625`

**Interfaces:** aucune (changement CSS pur + une assertion de test).

- [ ] **Step 1: Ajouter les 9 tokens à `default.css`**

Dans `packages/core/src/styles/themes/default.css`, la section `/* dialog */` (ligne 436-442) devient :

```css
/* dialog */
--ar-dialog-width-sm: 360px;
--ar-dialog-width-md: 500px;
--ar-dialog-width-lg: 800px;
--ar-dialog-width-xl: 1140px;
--ar-dialog-drawer-width-sm: 360px;
--ar-dialog-drawer-width-md: 720px;
--ar-dialog-drawer-width-lg: 960px;
--ar-dialog-drawer-width-xl: 1440px;
--ar-dialog-spacing: 1.25rem;
--ar-dialog-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 20px 50px -8px rgba(0, 0, 0, 0.2);
--ar-dialog-backdrop: rgba(0, 0, 0, 0.5);
--ar-dialog-close-bg: var(--ar-button-tertiary-bg);
--ar-dialog-close-bg-hover: var(--ar-button-tertiary-bg-hover);
--ar-dialog-close-bg-pressed: var(--ar-button-tertiary-bg-active);
--ar-dialog-close-bg-focus: var(--ar-button-tertiary-bg-focus);
```

(Seules les 9 premières lignes sont ajoutées ; `--ar-dialog-shadow` et les lignes suivantes existent déjà et ne changent pas.)

- [ ] **Step 2: Remplacer les valeurs littérales par des `var()` dans `dialog.styles.ts`**

Dans `packages/core/src/components/dialog/dialog.styles.ts`, remplacer les lignes 9 à 47 par :

```css
:host {
    display: block;

    /* Taille modale par défaut (md). Surchargeable par --ar-dialog-width sur l'instance. */
    --ar-dialog-width: var(--ar-dialog-width-md);
}

/* Tailles modal */
:host([size='sm']) {
    --ar-dialog-width: var(--ar-dialog-width-sm);
}
:host([size='md']) {
    --ar-dialog-width: var(--ar-dialog-width-md);
}
:host([size='lg']) {
    --ar-dialog-width: var(--ar-dialog-width-lg);
}
:host([size='xl']) {
    --ar-dialog-width: var(--ar-dialog-width-xl);
}

/* Tailles drawer — ont priorité sur les valeurs modal via la spécificité */
:host([mode='drawer']) {
    --ar-dialog-width: var(--ar-dialog-drawer-width-md);
}
:host([mode='drawer'][size='sm']) {
    --ar-dialog-width: var(--ar-dialog-drawer-width-sm);
}
:host([mode='drawer'][size='md']) {
    --ar-dialog-width: var(--ar-dialog-drawer-width-md);
}
:host([mode='drawer'][size='lg']) {
    --ar-dialog-width: var(--ar-dialog-drawer-width-lg);
}
:host([mode='drawer'][size='xl']) {
    --ar-dialog-width: var(--ar-dialog-drawer-width-xl);
}
```

Notez que `--ar-dialog-spacing: 1.25rem;` (ancienne ligne 15) est **retiré** du bloc `:host` — il n'est plus redéclaré ici du tout, hérité par cascade depuis `default.css` (`:root`). Le reste du fichier (`dialog::backdrop`, `[part='body']` qui consomme `var(--ar-dialog-spacing-block, var(--ar-dialog-spacing))`, etc.) ne change pas.

- [ ] **Step 3: Lancer les tests existants du composant pour observer l'impact**

Run: `cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run src/components/dialog/dialog.test.ts`

Expected: la plupart des tests passent. Le test `personnalisation --ar-dialog-width` (ligne ~620-624) échoue probablement, car l'environnement Vitest (happy-dom) ne charge pas `default.css` — `--ar-dialog-width-sm` n'y est donc jamais défini, et `getComputedStyle(el).getPropertyValue('--ar-dialog-width')` ne peut plus renvoyer `'360px'` (la valeur n'est plus littérale dans le composant). Observez la valeur réellement renvoyée par happy-dom dans le message d'échec du test (probablement la chaîne non résolue `'var(--ar-dialog-width-sm)'`, mais ne présumez pas — lisez la sortie réelle).

- [ ] **Step 4: Mettre à jour l'assertion du test avec la valeur réellement observée**

Dans `packages/core/src/components/dialog/dialog.test.ts`, remplacer la ligne 623 :

```ts
expect(getComputedStyle(el).getPropertyValue('--ar-dialog-width').trim()).toBe('360px');
```

par une assertion qui reflète la valeur réelle observée au Step 3 (probablement) :

```ts
expect(getComputedStyle(el).getPropertyValue('--ar-dialog-width').trim()).toBe(
    'var(--ar-dialog-width-sm)',
);
```

Le but du test reste le même : prouver que la sélection de taille pilote bien `--ar-dialog-width` vers le bon preset — seule la nature de la valeur observée change (référence non résolue plutôt que pixel final, la résolution finale étant désormais la responsabilité de `default.css`, hors de portée d'un test de composant isolé). Si la valeur observée au Step 3 diffère de `'var(--ar-dialog-width-sm)'` (espacement différent, guillemets, etc.), utilisez la valeur réellement observée, pas celle-ci.

- [ ] **Step 5: Relancer les tests du composant, vérifier qu'ils passent tous**

Run: `cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run src/components/dialog/dialog.test.ts`

Expected: PASS, tous les tests verts (y compris le test `personnalisation --ar-dialog-spacing` à la ligne 627-636, qui ne devrait pas être affecté puisqu'il surcharge `--ar-dialog-spacing` directement sur l'instance via `style=`).

- [ ] **Step 6: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add packages/core/src/styles/themes/default.css packages/core/src/components/dialog/dialog.styles.ts packages/core/src/components/dialog/dialog.test.ts
git commit -m "fix(core): sourced --ar-dialog-width/-spacing depuis default.css au lieu de valeurs codées en dur"
```

---

### Task 2: Documentation JSDoc — `dialog.ts`

**Files:**

- Modify: `packages/core/src/components/dialog/dialog.ts:65-66`

**Interfaces:** aucune (JSDoc uniquement).

- [ ] **Step 1: Ajouter les 8 nouveaux `@cssprop`**

Dans `packages/core/src/components/dialog/dialog.ts`, remplacer les lignes 65-66 :

```ts
 * @cssprop [--ar-dialog-width=500px (modal) ou 720px (drawer)] - Largeur du dialog. Prend le pas sur les tailles prédéfinies.
 * @cssprop [--ar-dialog-spacing=1.25rem] - Padding interne (block et inline) de la zone de contenu.
```

par :

```ts
 * @cssprop [--ar-dialog-width=500px (modal) ou 720px (drawer)] - Largeur du dialog. Prend le pas sur les tailles prédéfinies.
 * @cssprop [--ar-dialog-width-sm=360px] - Largeur du dialog modal, taille `sm`.
 * @cssprop [--ar-dialog-width-md=500px] - Largeur du dialog modal, taille `md`.
 * @cssprop [--ar-dialog-width-lg=800px] - Largeur du dialog modal, taille `lg`.
 * @cssprop [--ar-dialog-width-xl=1140px] - Largeur du dialog modal, taille `xl`.
 * @cssprop [--ar-dialog-drawer-width-sm=360px] - Largeur du drawer, taille `sm`.
 * @cssprop [--ar-dialog-drawer-width-md=720px] - Largeur du drawer, taille `md`.
 * @cssprop [--ar-dialog-drawer-width-lg=960px] - Largeur du drawer, taille `lg`.
 * @cssprop [--ar-dialog-drawer-width-xl=1440px] - Largeur du drawer, taille `xl`.
 * @cssprop [--ar-dialog-spacing=1.25rem] - Padding interne (block et inline) de la zone de contenu.
```

- [ ] **Step 2: Vérifier la cohérence via le mécanisme de la PR #114**

Run: `cd /Users/jon/Code/Active_projects/ariane/packages/core && npm run build:manifest`

Expected: succès (code de sortie 0). Les deux checks existants de la PR #114 (`validateCssPropertyDefaults`, `validateCssPropertyCoverage`) couvrent automatiquement les 8 nouveaux tokens dès qu'ils existent des deux côtés (`default.css` depuis la Task 1, JSDoc depuis ce Step) — aucune vérification manuelle supplémentaire à écrire.

- [ ] **Step 3: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add packages/core/src/components/dialog/dialog.ts
git commit -m "docs(core): documente les 8 tokens preset --ar-dialog-*-width"
```

---

### Task 3: Garde-fou automatique — `validate-no-hardcoded-tokens.js`

**Files:**

- Create: `packages/core/scripts/validate-no-hardcoded-tokens.js`
- Test: `packages/core/scripts/validate-no-hardcoded-tokens.test.js`

**Interfaces:**

- Produces: `findStylesFiles(dir: string): string[]` — chemins absolus de tous les fichiers `*.styles.ts` sous `dir`, récursivement. Consommée par Task 4 (`cem.config.js`).
- Produces: `findHardcodedTokenAssignments(filePath: string, source: string): string[]` — liste de messages d'erreur (un par assignation `--ar-*: <valeur littérale>;` détectée dans `source`, hors commentaires). Consommée par Task 4.

- [ ] **Step 1: Écrire les tests (doivent échouer, le module n'existe pas encore)**

Créer `packages/core/scripts/validate-no-hardcoded-tokens.test.js` :

```js
import { describe, expect, it } from 'vitest';
import { findHardcodedTokenAssignments, findStylesFiles } from './validate-no-hardcoded-tokens.js';

describe('findHardcodedTokenAssignments', () => {
    it('détecte une assignation littérale', () => {
        const source = `
            :host {
                --ar-dialog-width: 500px;
            }
        `;
        const errors = findHardcodedTokenAssignments('dialog.styles.ts', source);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('dialog.styles.ts');
        expect(errors[0]).toContain('--ar-dialog-width');
    });

    it("n'agit pas sur une référence var()", () => {
        const source = `
            :host {
                --ar-dialog-width: var(--ar-dialog-width-md);
            }
        `;
        expect(findHardcodedTokenAssignments('dialog.styles.ts', source)).toEqual([]);
    });

    it('ignore les mentions dans un commentaire CSS', () => {
        const source = `
            /* Surchargeable par --ar-dialog-width: 500px si besoin. */
            :host {
                --ar-dialog-width: var(--ar-dialog-width-md);
            }
        `;
        expect(findHardcodedTokenAssignments('dialog.styles.ts', source)).toEqual([]);
    });

    it('rapporte le bon numéro de ligne', () => {
        const source = ['/* ligne 1 */', ':host {', '    --ar-dialog-width: 500px;', '}'].join(
            '\n',
        );
        const errors = findHardcodedTokenAssignments('dialog.styles.ts', source);
        expect(errors[0]).toContain(':3');
    });

    it('agrège plusieurs assignations littérales', () => {
        const source = `
            :host {
                --ar-dialog-width: 500px;
                --ar-dialog-spacing: 1.25rem;
            }
        `;
        expect(findHardcodedTokenAssignments('dialog.styles.ts', source)).toHaveLength(2);
    });
});

describe('findStylesFiles', () => {
    it('trouve les fichiers *.styles.ts existants du package (test d’intégration léger)', () => {
        const files = findStylesFiles(new URL('../src', import.meta.url).pathname);
        expect(files.some((f) => f.endsWith('dialog.styles.ts'))).toBe(true);
        expect(files.every((f) => f.endsWith('.styles.ts'))).toBe(true);
    });
});
```

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent**

Run: `cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run scripts/validate-no-hardcoded-tokens.test.js`

Expected: FAIL — `Cannot find module './validate-no-hardcoded-tokens.js'`.

- [ ] **Step 3: Créer `packages/core/scripts/validate-no-hardcoded-tokens.js`**

```js
/**
 * Détecte les CSS custom properties `--ar-*` assignées avec une valeur littérale
 * dans un fichier `*.styles.ts`, plutôt qu'une référence `var()` vers un token
 * `default.css` — viole la philosophie headless du projet (aucune valeur de
 * design codée en dur dans un composant).
 *
 * Utilisé par `cem.config.js` (hook `packageLinkPhase`) pour faire échouer
 * `npm run build:manifest` en cas de détection — cf.
 * docs/superpowers/specs/2026-07-16-dialog-width-headless-tokens-design.md
 */

import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const HARDCODED_ASSIGNMENT_RE = /(--ar[\w-]+)\s*:\s*(?!var\()[^;]+;/g;

/**
 * Recense récursivement tous les fichiers `*.styles.ts` sous `dir`.
 *
 * @param {string} dir
 * @returns {string[]} chemins absolus
 */
export function findStylesFiles(dir) {
    return readdirSync(dir, { recursive: true })
        .filter((relativePath) => relativePath.endsWith('.styles.ts'))
        .map((relativePath) => join(dir, relativePath));
}

/**
 * Détecte les assignations `--ar-*: <valeur littérale>;` dans le contenu d'un
 * fichier `*.styles.ts` (hors commentaires CSS, neutralisés avant la détection
 * pour éviter les faux positifs sur une mention en prose). Ne touche jamais aux
 * usages en consommation (`var(--ar-xxx, fallback)`), seulement aux assignations.
 *
 * @param {string} filePath chemin du fichier, utilisé uniquement pour le message d'erreur
 * @param {string} source contenu brut du fichier
 * @returns {string[]}
 */
export function findHardcodedTokenAssignments(filePath, source) {
    // Neutralise le contenu des commentaires /* ... */ sans changer la longueur
    // ni les retours à la ligne, pour garder des numéros de ligne exacts.
    const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, (comment) =>
        comment.replace(/[^\n]/g, ' '),
    );

    const errors = [];
    HARDCODED_ASSIGNMENT_RE.lastIndex = 0;
    let match;
    while ((match = HARDCODED_ASSIGNMENT_RE.exec(withoutComments)) !== null) {
        const line = withoutComments.slice(0, match.index).split('\n').length;
        errors.push(
            `${filePath}:${line} — ${match[1]} codé en dur, doit référencer un token default.css via var()`,
        );
    }
    return errors;
}
```

- [ ] **Step 4: Lancer les tests, vérifier qu'ils passent**

Run: `cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run scripts/validate-no-hardcoded-tokens.test.js`

Expected: PASS — 6 tests verts.

- [ ] **Step 5: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add packages/core/scripts/validate-no-hardcoded-tokens.js packages/core/scripts/validate-no-hardcoded-tokens.test.js
git commit -m "test(core): ajoute le garde-fou anti valeurs codées en dur dans *.styles.ts"
```

---

### Task 4: Brancher le garde-fou dans `cem.config.js`

**Files:**

- Modify: `packages/core/cem.config.js`

**Interfaces:**

- Consumes: `findStylesFiles`, `findHardcodedTokenAssignments` (Task 3), importées depuis `./scripts/validate-no-hardcoded-tokens.js`.

- [ ] **Step 1: Ajouter l'import en haut de `packages/core/cem.config.js`**

Après la ligne qui importe déjà `extractThemeTokens`/`validateCssPropertyDefaults`/`validateCssPropertyCoverage` depuis `./scripts/validate-cssprop-defaults.js`, ajouter :

```js
import {
    findHardcodedTokenAssignments,
    findStylesFiles,
} from './scripts/validate-no-hardcoded-tokens.js';
```

- [ ] **Step 2: Ajouter l'appel de détection dans `packageLinkPhase`, avant le `throw` combiné existant**

Dans `packages/core/cem.config.js`, à l'intérieur de `packageLinkPhase({ customElementsManifest }) { ... }`, juste avant le `throw new Error(...)` combiné qui agrège déjà `cssPropErrors`/`coverageErrors` (ajouté par la PR #114), ajouter :

```js
const stylesFiles = findStylesFiles(resolve(process.cwd(), 'src'));
const hardcodedErrors = stylesFiles.flatMap((filePath) =>
    findHardcodedTokenAssignments(filePath, readFileSync(filePath, 'utf-8')),
);
```

Puis étendre la condition et le message du `throw` existant pour inclure `hardcodedErrors` comme une troisième section, sur le même modèle que les deux premières (une section "codé(s) en dur" en plus de "désynchronisé(s)" et "non documenté(s)").

- [ ] **Step 3: Lancer `build:manifest` sur l'état actuel du repo, vérifier qu'il passe**

Run: `cd /Users/jon/Code/Active_projects/ariane/packages/core && npm run build:manifest`

Expected: succès (code de sortie 0), 0 erreur "codé en dur" — la Task 1 a déjà éliminé la seule occurrence existante dans le repo.

- [ ] **Step 4: Vérification manuelle — provoquer une désynchronisation pour confirmer la détection**

Modifier temporairement `packages/core/src/components/dialog/dialog.styles.ts` : changer `--ar-dialog-width: var(--ar-dialog-width-sm);` (règle `:host([size='sm'])`) en `--ar-dialog-width: 999px;`.

Run: `cd /Users/jon/Code/Active_projects/ariane/packages/core && npm run build:manifest`

Expected: la commande échoue (code de sortie non nul), le message d'erreur contient `dialog.styles.ts`, le numéro de ligne modifiée, et `--ar-dialog-width`.

Annuler la modification :

Run: `cd /Users/jon/Code/Active_projects/ariane && git checkout -- packages/core/src/components/dialog/dialog.styles.ts`

- [ ] **Step 5: Relancer `build:manifest` pour confirmer le retour à la normale**

Run: `cd /Users/jon/Code/Active_projects/ariane/packages/core && npm run build:manifest`

Expected: succès (code de sortie 0), comme au Step 3.

- [ ] **Step 6: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add packages/core/cem.config.js
git commit -m "feat(core): fait échouer build:manifest si une valeur --ar-* est codée en dur dans *.styles.ts"
```

---

### Task 5: ADR-005

**Files:**

- Create: `docs/decisions/ADR-005-tokens-pilotes-par-attribut.md`

**Interfaces:** aucune (documentation).

- [ ] **Step 1: Créer le fichier**

Créer `docs/decisions/ADR-005-tokens-pilotes-par-attribut.md` :

```markdown
# ADR-005 : Tokens pilotés par attribut — pas de valeur littérale dans les composants

**Statut :** Adopté
**Date :** 2026-07-16

## Contexte

ADR-004 pose la répartition en 3 couches (styles internes fixes / tokens `--ar-*` / `::part()`)
mais illustre la couche 2 avec un exemple aujourd'hui dépassé : `color: var(--ar-tab-color, currentColor)`,
un fallback fonctionnel inline dans le composant. Depuis le chantier headless (#47, PR #90), la
pratique a changé : `packages/core/src/styles/themes/default.css` est la seule source de valeurs de
design, sans fallback dans les composants (cf. CLAUDE.md, section « Philosophie de conception »).
Le reste d'ADR-004 (répartition en 3 couches) reste valide — seul cet exemple ponctuel est obsolète.

L'audit de `dialog.styles.ts` (2026-07-16, cf.
`docs/superpowers/specs/2026-07-16-dialog-width-headless-tokens-design.md`) a révélé un cas non
couvert par la règle « aucun fallback cosmétique » : des tokens dont la valeur dépend d'un
attribut du composant (`--ar-dialog-width` piloté par `size`/`mode`), codés en dur directement
sur `:host([size='sm'])` etc. Ce cas n'est pas un fallback au sens d'ADR-004 (pas de
`var(--token, valeur)` inline) mais une violation de même nature : une valeur de design présente
dans le code du composant plutôt que dans `default.css`.

## Décision

Amendement à ADR-004 : l'exemple `var(--ar-tab-color, currentColor)` ne doit plus être suivi —
aucune valeur de repli, fonctionnelle ou cosmétique, ne doit apparaître dans le CSS d'un composant.
Toute valeur de design vit dans `default.css`, consommée via `var(--token)` sans second argument.

Nouvelle règle pour les tokens pilotés par état/attribut : chaque état a son propre token
`default.css`, nommé `--ar-<composant>-<propriété>-<état>` (ex. `--ar-dialog-width-sm`). Le
composant sélectionne la valeur via `var()` dans ses règles d'attribut (`:host([attr='...'])`) —
jamais de valeur littérale, même conditionnelle. Le token « consolidé » que ces règles alimentent
(ex. `--ar-dialog-width`) reste public et documenté (`@cssprop`) s'il sert aussi de point de
surcharge direct pour un consommateur.

Un garde-fou automatique (`packages/core/scripts/validate-no-hardcoded-tokens.js`, branché dans
`cem.config.js`) fait échouer `npm run build:manifest` si une assignation `--ar-*: <valeur littérale>;`
est détectée dans un fichier `*.styles.ts`.

## Conséquences

- `dialog.styles.ts` migré : `--ar-dialog-spacing` et les 8 variantes de `--ar-dialog-width`
  (`sm`/`md`/`lg`/`xl` × `modal`/`drawer`) sourcées depuis `default.css`.
- Tout nouveau composant avec une valeur pilotée par attribut doit suivre ce pattern dès sa
  conception — le garde-fou automatique le rappellera sinon au premier `npm run build:manifest`.
- Pas de convention de nommage pour des tokens véritablement internes/non documentables — écartée
  faute de cas concret (YAGNI), à documenter séparément si un besoin apparaît.
```

- [ ] **Step 2: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add docs/decisions/ADR-005-tokens-pilotes-par-attribut.md
git commit -m "docs: ajoute ADR-005 sur les tokens pilotés par attribut"
```

---

### Task 6: Vérification globale et push

**Files:** aucun (vérification uniquement)

- [ ] **Step 1: Suite de tests complète du core**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run test --workspace=packages/core`

Expected: tous les tests passent, aucune régression.

- [ ] **Step 2: Build complet du package core**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run build --workspace=packages/core`

Expected: succès, aucune erreur `tsc` ni `cem analyze`.

- [ ] **Step 3: Lint**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run lint --workspace=packages/core`

Expected: aucune erreur.

- [ ] **Step 4: Vérification visuelle — au moins une taille modal et une taille drawer**

Démarrer le serveur de doc (`npm run dev --workspace=apps/docs` ou équivalent déjà en place), ouvrir la page `ar-dialog`, tester au moins une taille modal (`size="lg"`) et une taille drawer (`mode="drawer" size="lg"`), confirmer visuellement que les largeurs rendues correspondent aux valeurs attendues (800px modal lg, 960px drawer lg) — aucun changement visuel ne doit être observé par rapport à l'état avant ce chantier.

- [ ] **Step 5: Build de la doc**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run build --workspace=apps/docs`

Expected: succès.

- [ ] **Step 6: Push sur la branche existante**

```bash
cd /Users/jon/Code/Active_projects/ariane
git push
```

Expected: la PR [#114](https://github.com/jogo-labs/ariane/pull/114) se met à jour automatiquement avec les nouveaux commits (pas de nouvelle PR à créer).

---

## Self-Review

- **Couverture du spec** : migration `--ar-dialog-spacing` (§1) → Task 1 ; migration `--ar-dialog-width` en 8 presets (§2) → Task 1 ; JSDoc (§3) → Task 2 ; garde-fou automatique (§4) → Tasks 3-4 ; ADR-005 (§5) → Task 5 ; hors scope (pas de token interne, pas d'autre composant touché, pas de résolution récursive) → respecté dans toutes les tasks, aucune ne l'introduit.
- **Placeholders** : aucun — chaque step contient du code complet ou une commande exacte avec sortie attendue. Task 1 Step 4 est la seule étape à valeur non figée à l'avance (dépend de l'observation réelle de happy-dom) — traité explicitement comme une étape d'investigation TDD, pas un flou de spécification.
- **Cohérence des types/signatures** : `findStylesFiles(dir: string): string[]` et `findHardcodedTokenAssignments(filePath: string, source: string): string[]` utilisés identiquement en Task 3 (définition + tests) et Task 4 (câblage dans `cem.config.js`, `filePath`/`source` correctement fournis via `readFileSync`).
