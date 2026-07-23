# Fallback CSS d'accessibilité pour les surfaces flottantes — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un filet de sécurité CSS d'accessibilité (fallback fonctionnel) sur les tokens dont l'absence de thème rend un composant flottant confus, cassé ou inaccessible — système panel partagé (dropdown/breadcrumb/stepper/datepicker), `ar-tooltip`, et deux tokens dimensionnels d'`ar-datepicker` — avec un garde-fou CI qui distingue les fallbacks justifiés (couleur système ou commentaire `a11y-fallback`) de toute autre valeur littérale.

**Architecture:** Amendement ciblé à ADR-005 (headless strict) : deux mécanismes de repli autorisés — mots-clés couleur système CSS4 (`Canvas`, `CanvasText`, `ButtonBorder`, etc.) pour tout ce qui touche au contraste, valeur littérale justifiée par un commentaire `/* a11y-fallback: <raison> */` pour les dimensions sans équivalent système. Une nouvelle fonction `findUnjustifiedFallbacks` dans `validate-no-hardcoded-tokens.js` fait échouer `npm run build:manifest` si un `var(--ar-*, fallback)` ne respecte aucun des deux mécanismes. Les tests qui vérifient que le fallback s'applique réellement (résolution CSS) doivent tourner dans un vrai navigateur — `happy-dom` (utilisé par les tests Vitest de ce projet) ne résout pas la branche fallback d'un `var()` non défini (vérifié empiriquement, voir « Écarts » en fin de plan) — donc ils vont dans les fichiers `*.browser.test.ts` existants (Playwright/Chromium via `@web/test-runner`), pas dans les `*.test.ts` Vitest.

**Tech Stack:** Lit 3, TypeScript, Vitest (happy-dom) pour les tests unitaires du script Node, `@web/test-runner` + Playwright/Chromium pour les tests navigateur, Custom Elements Manifest analyzer (`cem.config.js`) pour le garde-fou CI.

## Global Constraints

- Prettier : 100 caractères, 4 espaces, quotes simples.
- Toujours `import type` pour les imports de types.
- Conventional Commits (français, sujet < 100 caractères — limite par défaut `@commitlint/config-conventional`), un commit par tâche technique (2 à 6).
- CSS headless : aucun fallback cosmétique dans les composants — seule exception : les 7 tokens listés dans la spec `docs/superpowers/specs/2026-07-22-css-fallback-accessibilite-design.md`, selon les deux mécanismes documentés (couleur système / littéral justifié par commentaire `a11y-fallback`).
- `border-radius`, `box-shadow` et le padding générique du panel restent hors périmètre (pas de fallback) — seuls `--ar-panel-bg`, `--ar-panel-text`, `--ar-panel-border-color`, `--ar-tooltip-bg`, `--ar-tooltip-color`, `--ar-datepicker-panel-max-width`, `--ar-datepicker-day-size` sont modifiés dans cette passe.
- Branche courante `docs/css-fallback-accessibilite`, déjà créée et à jour avec `dev` — ne pas créer de nouvelle branche.
- PR finale vers `dev`, jamais vers `main` directement.

---

## Task 1 : Vérifier la branche de travail

**Files:** aucun.

**Interfaces:** aucune — tâche de vérification pure.

- [ ] **Step 1 : Confirmer la branche courante**

```bash
git -C /Users/jon/Code/Active_projects/ariane branch --show-current
```

Attendu : `docs/css-fallback-accessibilite`. Si une autre branche est active, **s'arrêter et alerter** — ce plan suppose explicitement qu'elle existe déjà et ne doit pas être recréée.

- [ ] **Step 2 : Confirmer un arbre de travail propre**

```bash
git -C /Users/jon/Code/Active_projects/ariane status
```

Attendu : `nothing to commit, working tree clean` et `Your branch is up to date with 'origin/docs/css-fallback-accessibilite'`.

---

## Task 2 : Détection des fallbacks non justifiés dans `validate-no-hardcoded-tokens.js`

**Files:**

- Modify: `packages/core/scripts/validate-no-hardcoded-tokens.js`
- Modify: `packages/core/scripts/validate-no-hardcoded-tokens.test.js`
- Modify: `packages/core/cem.config.js:19-22` (import) et `:192-214` (agrégation des erreurs)

**Interfaces:**

- Produces : `findUnjustifiedFallbacks(filePath: string, source: string): string[]`, exportée depuis `packages/core/scripts/validate-no-hardcoded-tokens.js`, même contrat que `findHardcodedTokenAssignments` (retourne un tableau de messages `${filePath}:${line} — ...`, tableau vide si rien à signaler). Consommée par `cem.config.js` (Task 2, ce fichier) puis implicitement exercée par les fichiers modifiés dans les Tasks 3-5.

Le fichier `validate-no-hardcoded-tokens.js` actuel (lu intégralement avant cette tâche) contient déjà `HARDCODED_ASSIGNMENT_RE`, `findStylesFiles` et `findHardcodedTokenAssignments`, qui neutralisent les commentaires CSS (`/\*[\s\S]*?\*\//g` remplacé caractère par caractère par des espaces, retours à la ligne préservés) avant de faire tourner une regex, pour ne jamais confondre une mention en prose dans un commentaire avec une vraie assignation. La nouvelle fonction reprend exactement cette technique de neutralisation, mais doit _aussi_ lire le texte brut (non neutralisé) pour vérifier le commentaire `a11y-fallback` — c'est le seul endroit où le contenu réel d'un commentaire doit être lu plutôt que neutralisé.

- [ ] **Step 1 : Écrire les tests (ils doivent d'abord échouer — la fonction n'existe pas encore)**

Ajouter en tête du fichier de test, dans l'import existant :

```javascript
import {
    findHardcodedTokenAssignments,
    findStylesFiles,
    findUnjustifiedFallbacks,
} from './validate-no-hardcoded-tokens.js';
```

Ajouter un nouveau bloc `describe` à la fin du fichier (après le `describe('findStylesFiles', ...)` existant) :

```javascript
describe('findUnjustifiedFallbacks', () => {
    it('accepte un mot-clé couleur système whitelisté', () => {
        const source = `
            [part='panel'] {
                background-color: var(--ar-panel-bg, Canvas);
            }
        `;
        expect(findUnjustifiedFallbacks('panel.styles.ts', source)).toEqual([]);
    });

    it('rejette un mot-clé système avec une casse différente (whitelist stricte)', () => {
        const source = `
            [part='panel'] {
                background-color: var(--ar-panel-bg, canvas);
            }
        `;
        const errors = findUnjustifiedFallbacks('panel.styles.ts', source);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('--ar-panel-bg');
    });

    it('rejette une valeur littérale sans commentaire de justification', () => {
        const source = `
            [part='panel'] {
                max-width: var(--ar-panel-max-width, 25rem);
            }
        `;
        const errors = findUnjustifiedFallbacks('panel.styles.ts', source);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('--ar-panel-max-width');
    });

    it('accepte une valeur littérale précédée du commentaire a11y-fallback correctement formé', () => {
        const source = [
            "[part='panel'] {",
            '    max-width: var(',
            '        --ar-panel-max-width,',
            '        /* a11y-fallback: évite un panel démesuré sans thème */',
            '        25rem',
            '    );',
            '}',
        ].join('\n');
        expect(findUnjustifiedFallbacks('panel.styles.ts', source)).toEqual([]);
    });

    it('rejette une valeur littérale dont le commentaire a un texte hors format', () => {
        const source = [
            "[part='panel'] {",
            '    max-width: var(',
            '        --ar-panel-max-width,',
            '        /* TODO: revoir cette valeur */',
            '        25rem',
            '    );',
            '}',
        ].join('\n');
        const errors = findUnjustifiedFallbacks('panel.styles.ts', source);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('--ar-panel-max-width');
    });

    it("rejette une valeur littérale dont le commentaire n'est pas sur la ligne immédiatement précédente", () => {
        const source = [
            "[part='panel'] {",
            '    /* a11y-fallback: évite un panel démesuré sans thème */',
            '',
            '    max-width: var(--ar-panel-max-width, 25rem);',
            '}',
        ].join('\n');
        const errors = findUnjustifiedFallbacks('panel.styles.ts', source);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('--ar-panel-max-width');
    });

    it('ignore var(--ar-token) sans fallback (usage normal)', () => {
        const source = `
            [part='panel'] {
                background-color: var(--ar-panel-bg);
            }
        `;
        expect(findUnjustifiedFallbacks('panel.styles.ts', source)).toEqual([]);
    });

    it('ignore une mention dans un commentaire CSS', () => {
        const source = `
            /* Ne pas faire : var(--ar-panel-bg, red) */
            [part='panel'] {
                background-color: var(--ar-panel-bg);
            }
        `;
        expect(findUnjustifiedFallbacks('panel.styles.ts', source)).toEqual([]);
    });

    it('rapporte le bon numéro de ligne', () => {
        const source = [
            '/* ligne 1 */',
            "[part='panel'] {",
            '    max-width: var(--ar-panel-max-width, 25rem);',
            '}',
        ].join('\n');
        const errors = findUnjustifiedFallbacks('panel.styles.ts', source);
        expect(errors[0]).toContain(':3');
    });

    it('accepte un fallback structurel 0px (compensation de layout, cf. CLAUDE.md)', () => {
        const source = `
            [part='base'] {
                margin-block-start: calc(-1 * var(--ar-tab-group-border-top-width, 0px));
            }
        `;
        expect(findUnjustifiedFallbacks('tab.styles.ts', source)).toEqual([]);
    });

    it('accepte un fallback qui référence un autre token --ar-* (cascade token-à-token)', () => {
        const source = `
            [part='body'] {
                padding-block: var(--ar-dialog-spacing-block, var(--ar-dialog-spacing));
            }
        `;
        expect(findUnjustifiedFallbacks('dialog.styles.ts', source)).toEqual([]);
    });
});
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent (fonction absente)**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run scripts/validate-no-hardcoded-tokens.test.js
```

Attendu : échec — `findUnjustifiedFallbacks` n'est pas exportée (`SyntaxError` ou `undefined is not a function` selon la résolution ESM).

- [ ] **Step 3 : Implémenter `findUnjustifiedFallbacks`**

Dans `packages/core/scripts/validate-no-hardcoded-tokens.js`, ajouter après `HARDCODED_ASSIGNMENT_RE` (ligne 15) :

```javascript
// Détecte var(--ar-xxx, fallback) en consommation. Capture group 2 = expression du
// fallback, potentiellement multi-lignes (cf. format a11y-fallback ci-dessous).
// `[^()]*(?:\([^()]*\)[^()]*)*` tolère un niveau d'imbrication de parenthèses dans
// le fallback (ex. `var(--a, var(--b))`, déjà présent dans dialog.styles.ts) sans
// tronquer la capture au premier `)` rencontré.
const VAR_FALLBACK_RE = /var\(\s*(--ar[\w-]+)\s*,\s*([^()]*(?:\([^()]*\)[^()]*)*)\)/dg;

// Mots-clés couleur système CSS4 autorisés comme fallback sans justification —
// liste fermée, cf. section « Garde-fou CI » de la spec. Exact match (pas de
// tolérance de casse) : `canvas` n'est pas équivalent à `Canvas`.
const SYSTEM_COLOR_KEYWORDS = new Set([
    'Canvas',
    'CanvasText',
    'ButtonBorder',
    'ButtonFace',
    'ButtonText',
    'Field',
    'FieldText',
    'GrayText',
]);

// Fallbacks structurels déjà sanctionnés par CLAUDE.md (section « Philosophie de
// conception ») : « Les fallbacks structurels (0px pour des compensations de
// layout) sont acceptables. » — ex. tab.styles.ts:20-21, `calc(-1 * var(--ar-tab-
// group-border-top-width, 0px))`. Pas une valeur de design, pas besoin de
// commentaire a11y-fallback.
const STRUCTURAL_LITERAL_KEYWORDS = new Set(['0px', '0']);

// Un fallback qui est lui-même une référence nue à un autre token --ar-* (sans son
// propre fallback) n'est pas une valeur de design codée en dur — c'est une cascade
// token-à-token déjà légitime dans le modèle actuel (ex. dialog.styles.ts:174-175,
// `var(--ar-dialog-spacing-block, var(--ar-dialog-spacing))`).
const BARE_TOKEN_FALLBACK_RE = /^var\(\s*--ar[\w-]+\s*\)$/;

// Commentaire de justification requis pour un fallback littéral hors liste système,
// au format exact (pas une simple tolérance de tout commentaire), sur la ligne
// immédiatement précédente la valeur.
const A11Y_FALLBACK_COMMENT_RE = /^\s*\/\* a11y-fallback: .+ \*\/\s*$/;
```

Puis ajouter la fonction après `findHardcodedTokenAssignments` (fin de fichier) :

```javascript
/**
 * Détecte les `var(--ar-*, <fallback>)` dont le fallback n'est ni un mot-clé
 * couleur système CSS4 whitelisté, ni un fallback structurel sanctionné (0px), ni
 * une référence nue à un autre token --ar-*, ni une valeur littérale justifiée par
 * un commentaire `/* a11y-fallback: <raison> *\/` sur la ligne immédiatement
 * précédente — cf. section « Garde-fou CI » de
 * docs/superpowers/specs/2026-07-22-css-fallback-accessibilite-design.md.
 *
 * @param {string} filePath chemin du fichier, utilisé uniquement pour le message d'erreur
 * @param {string} source contenu brut du fichier
 * @returns {string[]}
 */
export function findUnjustifiedFallbacks(filePath, source) {
    // Même technique de neutralisation que findHardcodedTokenAssignments : les
    // commentaires CSS sont blanchis (mais leurs retours à la ligne préservés) pour
    // ne pas faire matcher un var() mentionné en prose dans un commentaire.
    const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, (comment) =>
        comment.replace(/[^\n]/g, ' '),
    );
    const rawLines = source.split('\n');

    const errors = [];
    VAR_FALLBACK_RE.lastIndex = 0;
    let match;
    while ((match = VAR_FALLBACK_RE.exec(withoutComments)) !== null) {
        const token = match[1];
        const fallback = match[2].trim();

        if (SYSTEM_COLOR_KEYWORDS.has(fallback)) continue;
        if (STRUCTURAL_LITERAL_KEYWORDS.has(fallback)) continue;
        if (BARE_TOKEN_FALLBACK_RE.test(fallback)) continue;

        // Ligne où débute la valeur réelle du fallback (après un éventuel
        // commentaire neutralisé/espace en tête) — c'est cette ligne qui sert de
        // référence pour vérifier la ligne a11y-fallback précédente, pas la ligne
        // où commence l'appel var() (qui peut être plusieurs lignes plus haut dans
        // le format multi-lignes).
        const [groupStart] = match.indices[2];
        const trimmedStart = groupStart + (match[2].length - match[2].trimStart().length);
        const valueLine = withoutComments.slice(0, trimmedStart).split('\n').length;

        const precedingLine = rawLines[valueLine - 2] ?? '';
        if (A11Y_FALLBACK_COMMENT_RE.test(precedingLine)) continue;

        errors.push(
            `${filePath}:${valueLine} — fallback "${fallback}" non justifié pour ${token} : ` +
                `utilisez un mot-clé couleur système (${[...SYSTEM_COLOR_KEYWORDS].join(', ')}) ` +
                `ou un commentaire /* a11y-fallback: <raison> */ sur la ligne précédente`,
        );
    }
    return errors;
}
```

- [ ] **Step 4 : Lancer les tests pour vérifier qu'ils passent**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run scripts/validate-no-hardcoded-tokens.test.js
```

Attendu : tous les tests passent (11 nouveaux + 6 existants pour `findHardcodedTokenAssignments` + 1 pour `findStylesFiles`).

- [ ] **Step 5 : Brancher `findUnjustifiedFallbacks` dans `cem.config.js`**

Dans `packages/core/cem.config.js`, modifier l'import (lignes 19-22) :

```javascript
import {
    findHardcodedTokenAssignments,
    findStylesFiles,
    findUnjustifiedFallbacks,
} from './scripts/validate-no-hardcoded-tokens.js';
```

Puis dans `packageLinkPhase` (lignes 192-214), remplacer :

```javascript
// Valide qu'aucun composant n'assigne une valeur littérale à une
// custom property --ar-* dans ses *.styles.ts au lieu de référencer
// un token default.css via var() — cf.
// docs/superpowers/specs/2026-07-16-dialog-width-headless-tokens-design.md
const stylesFiles = findStylesFiles(resolve(process.cwd(), 'src'));
const hardcodedErrors = stylesFiles.flatMap((filePath) =>
    findHardcodedTokenAssignments(filePath, readFileSync(filePath, 'utf-8')),
);

const allErrors = [...cssPropCoverageErrors, ...hardcodedErrors];
if (allErrors.length > 0) {
    const coverageErrorsMsg =
        cssPropCoverageErrors.length > 0
            ? `\n  non documenté(s) :\n${cssPropCoverageErrors.map((e) => `    - ${e}`).join('\n')}`
            : '';
    const hardcodedErrorsMsg =
        hardcodedErrors.length > 0
            ? `\n  codé(s) en dur :\n${hardcodedErrors.map((e) => `    - ${e}`).join('\n')}`
            : '';
    throw new Error(
        `[CEM] ${allErrors.length} @cssprop erreur(s) avec default.css :${coverageErrorsMsg}${hardcodedErrorsMsg}`,
    );
}
```

par :

```javascript
// Valide qu'aucun composant n'assigne une valeur littérale à une
// custom property --ar-* dans ses *.styles.ts au lieu de référencer
// un token default.css via var() — cf.
// docs/superpowers/specs/2026-07-16-dialog-width-headless-tokens-design.md
const stylesFiles = findStylesFiles(resolve(process.cwd(), 'src'));
const hardcodedErrors = stylesFiles.flatMap((filePath) =>
    findHardcodedTokenAssignments(filePath, readFileSync(filePath, 'utf-8')),
);

// Valide que tout var(--ar-*, fallback) en consommation utilise un
// fallback justifié (couleur système whitelistée ou commentaire
// a11y-fallback) — cf. section « Garde-fou CI » de
// docs/superpowers/specs/2026-07-22-css-fallback-accessibilite-design.md
const unjustifiedFallbackErrors = stylesFiles.flatMap((filePath) =>
    findUnjustifiedFallbacks(filePath, readFileSync(filePath, 'utf-8')),
);

const allErrors = [...cssPropCoverageErrors, ...hardcodedErrors, ...unjustifiedFallbackErrors];
if (allErrors.length > 0) {
    const coverageErrorsMsg =
        cssPropCoverageErrors.length > 0
            ? `\n  non documenté(s) :\n${cssPropCoverageErrors.map((e) => `    - ${e}`).join('\n')}`
            : '';
    const hardcodedErrorsMsg =
        hardcodedErrors.length > 0
            ? `\n  codé(s) en dur :\n${hardcodedErrors.map((e) => `    - ${e}`).join('\n')}`
            : '';
    const unjustifiedFallbackErrorsMsg =
        unjustifiedFallbackErrors.length > 0
            ? `\n  fallback(s) non justifié(s) :\n${unjustifiedFallbackErrors.map((e) => `    - ${e}`).join('\n')}`
            : '';
    throw new Error(
        `[CEM] ${allErrors.length} @cssprop erreur(s) avec default.css :${coverageErrorsMsg}${hardcodedErrorsMsg}${unjustifiedFallbackErrorsMsg}`,
    );
}
```

- [ ] **Step 6 : Vérifier que `build:manifest` passe toujours sur le code existant**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run build:manifest
```

Attendu : succès. Important : le code actuel contient déjà deux `var(--ar-*, fallback)` en consommation, antérieurs à ce chantier —
`dialog.styles.ts:174-175` (`var(--ar-dialog-spacing-block, var(--ar-dialog-spacing))`, une cascade token-à-token) et
`tab.styles.ts:20-21` (`var(--ar-tab-group-border-top-width, 0px)`, un fallback structurel `0px` explicitement sanctionné par
CLAUDE.md, section « Philosophie de conception »). `findUnjustifiedFallbacks` a été vérifié empiriquement contre l'intégralité
du corpus `*.styles.ts` avant d'écrire ce plan (script Node exécuté directement, hors Vitest) pour confirmer que ces deux cas
ne remontent aucune erreur — `BARE_TOKEN_FALLBACK_RE` et `STRUCTURAL_LITERAL_KEYWORDS` existent spécifiquement pour ça. Si
cette étape échoue avec une erreur sur `dialog.styles.ts` ou `tab.styles.ts`, la regex `VAR_FALLBACK_RE` ou l'une des deux
listes d'exemption a une régression — ne pas contourner en modifiant `dialog.styles.ts`/`tab.styles.ts` (hors périmètre de ce
chantier), corriger la fonction de détection.

- [ ] **Step 7 : Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add packages/core/scripts/validate-no-hardcoded-tokens.js packages/core/scripts/validate-no-hardcoded-tokens.test.js packages/core/cem.config.js && git commit -m "feat(core): détecte les fallback CSS non justifiés dans le garde-fou headless"
```

---

## Task 3 : Fallback système sur le panel partagé (dropdown/breadcrumb/stepper)

**Files:**

- Modify: `packages/core/src/styles/shared/panel.styles.ts:16-19`
- Modify: `packages/core/src/components/dropdown/dropdown.ts:35,38-39`
- Modify: `packages/core/src/components/breadcrumb/breadcrumb.ts:44-45`
- Modify: `packages/core/src/components/stepper/stepper.ts:57-58`
- Modify: `packages/core/src/components/dropdown/dropdown.browser.test.ts`

**Interfaces:**

- Consumes: `findUnjustifiedFallbacks` (Task 2) — s'exécute automatiquement via `npm run build:manifest`, pas d'appel direct dans cette tâche.
- Produces: `[part='panel']` (dans `panel.styles.ts`, consommé par dropdown/breadcrumb/stepper/datepicker) a un fond, un texte et une bordure visibles même sans `default.css` chargé. Les tests suivants (Task 4, Task 5) suivent le même patron de test navigateur.

- [ ] **Step 1 : Modifier `panel.styles.ts`**

Dans `packages/core/src/styles/shared/panel.styles.ts`, remplacer les lignes 16-19 :

```css
/* Tokens visuels */
background-color: var(--ar-panel-bg);
color: var(--ar-panel-text);
border: 1px solid var(--ar-panel-border-color);
```

par :

```css
/* Tokens visuels */
background-color: var(--ar-panel-bg, Canvas);
color: var(--ar-panel-text, CanvasText);
border: 1px solid var(--ar-panel-border-color, ButtonBorder);
```

(`border-radius`, `box-shadow`, `padding`, `max-width` — lignes 20-23 — restent inchangées, hors périmètre.)

- [ ] **Step 2 : Mettre à jour le JSDoc `@cssprop` de `dropdown.ts`**

Dans `packages/core/src/components/dropdown/dropdown.ts`, remplacer :

```
 * @cssprop --ar-dropdown-color - Couleur du texte (cascade vers --ar-panel-text).
```

par :

```
 * @cssprop --ar-dropdown-color - Couleur du texte (cascade vers --ar-panel-text, repli système `CanvasText` si aucun thème n'est chargé).
```

et remplacer :

```
 * @cssprop --ar-dropdown-bg - Fond du panel (cascade vers --ar-panel-bg).
 * @cssprop --ar-dropdown-border-color - Bordure (cascade vers --ar-panel-border-color).
```

par :

```
 * @cssprop --ar-dropdown-bg - Fond du panel (cascade vers --ar-panel-bg, repli système `Canvas` si aucun thème n'est chargé).
 * @cssprop --ar-dropdown-border-color - Bordure (cascade vers --ar-panel-border-color, repli système `ButtonBorder` si aucun thème n'est chargé).
```

- [ ] **Step 3 : Mettre à jour le JSDoc `@cssprop` de `breadcrumb.ts`**

Dans `packages/core/src/components/breadcrumb/breadcrumb.ts`, remplacer :

```
 * @cssprop --ar-breadcrumb-panel-bg - Fond du panel mobile (cascade vers --ar-panel-bg).
 * @cssprop --ar-breadcrumb-panel-border-color - Couleur de bordure du panel mobile (cascade vers --ar-panel-border-color).
```

par :

```
 * @cssprop --ar-breadcrumb-panel-bg - Fond du panel mobile (cascade vers --ar-panel-bg, repli système `Canvas` si aucun thème n'est chargé).
 * @cssprop --ar-breadcrumb-panel-border-color - Couleur de bordure du panel mobile (cascade vers --ar-panel-border-color, repli système `ButtonBorder` si aucun thème n'est chargé).
```

- [ ] **Step 4 : Mettre à jour le JSDoc `@cssprop` de `stepper.ts`**

Dans `packages/core/src/components/stepper/stepper.ts`, remplacer :

```
 * @cssprop --ar-stepper-panel-bg - Fond du panel mobile (cascade vers --ar-panel-bg).
 * @cssprop --ar-stepper-panel-border-color - Couleur de bordure du panel mobile (cascade vers --ar-panel-border-color).
```

par :

```
 * @cssprop --ar-stepper-panel-bg - Fond du panel mobile (cascade vers --ar-panel-bg, repli système `Canvas` si aucun thème n'est chargé).
 * @cssprop --ar-stepper-panel-border-color - Couleur de bordure du panel mobile (cascade vers --ar-panel-border-color, repli système `ButtonBorder` si aucun thème n'est chargé).
```

- [ ] **Step 5 : Écrire le test navigateur (fallback réellement résolu sans thème)**

`packages/core/src/components/dropdown/dropdown.browser.test.ts` importe déjà `fixture, html, expect, aTimeout` de `@open-wc/testing`, et définit déjà `getPanel(el)` et `openDropdown(el)`. Ajouter un nouveau bloc `describe` à la fin, avant la fermeture du `describe('ar-dropdown — browser', ...)` (juste après le bloc `navigation clavier menu`, avant la dernière accolade fermante) :

```typescript
// ── Fallback CSS d'accessibilité ─────────────────────────────────────────

describe('fallback CSS sans thème chargé', () => {
    it('le panel a un fond, un texte et une bordure visibles même sans default.css', async () => {
        el = await fixture(html`
            <ar-dropdown>
                <button slot="trigger">Trigger</button>
                <p>Contenu</p>
            </ar-dropdown>
        `);
        await openDropdown(el);
        const panel = getPanel(el);
        const computed = getComputedStyle(panel);

        // default.css n'est jamais chargé dans les tests (Vitest ni WTR) : ces
        // valeurs viennent uniquement du fallback système CSS4 posé dans
        // panel.styles.ts, pas d'un thème.
        expect(computed.backgroundColor).to.not.equal('');
        expect(computed.backgroundColor).to.not.equal('rgba(0, 0, 0, 0)');
        expect(computed.color).to.not.equal('');
        expect(computed.borderTopColor).to.not.equal('');
        expect(computed.borderTopColor).to.not.equal('rgba(0, 0, 0, 0)');
        expect(computed.borderTopWidth).to.equal('1px');
    });
});
```

- [ ] **Step 6 : Lancer le test navigateur pour vérifier qu'il échoue avant le fix, puis passe après**

D'abord vérifier que le test échoue sur l'état actuel (avant Step 1) n'est pas possible rétroactivement puisque Step 1 est déjà appliqué à ce stade — à la place, lancer le test après les Steps 1-5 pour confirmer qu'il passe :

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx web-test-runner "src/components/dropdown/dropdown.browser.test.ts"
```

Attendu : tous les tests du fichier passent, y compris le nouveau. Si besoin de confirmer que le test aurait échoué sans le fallback : commenter temporairement `, Canvas`/`, CanvasText`/`, ButtonBorder` dans `panel.styles.ts`, relancer la commande — attendu `backgroundColor`/`borderTopColor` vides (`''`), donc échec des assertions `.to.not.equal('')` — puis rétablir le fallback.

- [ ] **Step 7 : Lancer la suite Vitest complète pour vérifier l'absence de régression**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run
```

Attendu : tous les tests existants (dropdown.test.ts, breadcrumb.test.ts, stepper.test.ts, datepicker.test.ts, etc.) passent toujours — cette tâche ne change aucun comportement testé par Vitest (happy-dom ne résout pas le fallback de toute façon, donc les tests Vitest existants ne peuvent ni détecter ni casser sur ce changement).

- [ ] **Step 8 : Vérifier `build:manifest`**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run build:manifest
```

Attendu : succès — les 3 fallbacks système ajoutés sont dans la whitelist `SYSTEM_COLOR_KEYWORDS`, donc `findUnjustifiedFallbacks` ne les signale pas.

- [ ] **Step 9 : Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add packages/core/src/styles/shared/panel.styles.ts packages/core/src/components/dropdown/dropdown.ts packages/core/src/components/breadcrumb/breadcrumb.ts packages/core/src/components/stepper/stepper.ts packages/core/src/components/dropdown/dropdown.browser.test.ts && git commit -m "feat(core): fallback couleur système sur le panel partagé (dropdown/breadcrumb/stepper)"
```

---

## Task 4 : Fallback système sur `ar-tooltip`

**Files:**

- Modify: `packages/core/src/components/tooltip/tooltip.styles.ts:24-25,51`
- Modify: `packages/core/src/components/tooltip/tooltip.ts:35-36`
- Modify: `packages/core/src/components/tooltip/tooltip.browser.test.ts`

**Interfaces:**

- Consumes: `findUnjustifiedFallbacks` (Task 2, exécuté via `npm run build:manifest`), patron de test navigateur établi en Task 3.
- Produces: `[part='bubble']` et `[part='arrow']` ont un fond visible, `[part='bubble']` a un texte visible, même sans thème chargé.

- [ ] **Step 1 : Modifier `tooltip.styles.ts`**

Dans `packages/core/src/components/tooltip/tooltip.styles.ts`, remplacer (bloc `[part='bubble']`, lignes 23-25) :

```css
/* Visual */
background-color: var(--ar-tooltip-bg);
color: var(--ar-tooltip-color);
```

par :

```css
/* Visual */
background-color: var(--ar-tooltip-bg, Canvas);
color: var(--ar-tooltip-color, CanvasText);
```

Et remplacer (bloc `[part='arrow']`, ligne 51) :

```css
background-color: var(--ar-tooltip-bg);
```

par :

```css
background-color: var(--ar-tooltip-bg, Canvas);
```

(Les deux occurrences de `--ar-tooltip-bg` reçoivent le même fallback pour rester visuellement cohérentes — bulle et flèche.)

- [ ] **Step 2 : Mettre à jour le JSDoc `@cssprop` de `tooltip.ts`**

Dans `packages/core/src/components/tooltip/tooltip.ts`, remplacer :

```
 * @cssprop --ar-tooltip-bg - Fond de la bulle.
 * @cssprop --ar-tooltip-color - Couleur du texte.
```

par :

```
 * @cssprop --ar-tooltip-bg - Fond de la bulle (repli système `Canvas` si aucun thème n'est chargé).
 * @cssprop --ar-tooltip-color - Couleur du texte (repli système `CanvasText` si aucun thème n'est chargé).
```

- [ ] **Step 3 : Écrire le test navigateur**

`packages/core/src/components/tooltip/tooltip.browser.test.ts` importe déjà `fixture, html, expect, aTimeout` de `@open-wc/testing` et définit `getBubble(el)`. Ajouter un nouveau bloc `describe` juste avant la fermeture finale du `describe('ar-tooltip — browser', ...)` (après le bloc `describe('caret', ...)`) :

```typescript
// ── Fallback CSS d'accessibilité ─────────────────────────────────────────

describe('fallback CSS sans thème chargé', () => {
    it('la bulle et la flèche ont un fond visible même sans default.css', async () => {
        const wrapper = await fixture<HTMLElement>(html`
            <div>
                <button id="btn10">x</button>
                <ar-tooltip for="btn10" show-delay="0">Aide</ar-tooltip>
            </div>
        `);
        const el = wrapper.querySelector<ArTooltip>('ar-tooltip')!;
        const btn = wrapper.querySelector<HTMLElement>('#btn10')!;
        btn.dispatchEvent(new MouseEvent('mouseenter'));
        await aTimeout(20);

        const bubble = getBubble(el);
        const bubbleComputed = getComputedStyle(bubble);
        expect(bubbleComputed.backgroundColor).to.not.equal('');
        expect(bubbleComputed.backgroundColor).to.not.equal('rgba(0, 0, 0, 0)');
        expect(bubbleComputed.color).to.not.equal('');

        const arrow = el.shadowRoot?.querySelector<HTMLElement>('[part="arrow"]');
        if (!arrow) throw new Error('[part="arrow"] introuvable');
        const arrowComputed = getComputedStyle(arrow);
        expect(arrowComputed.backgroundColor).to.not.equal('');
        expect(arrowComputed.backgroundColor).to.not.equal('rgba(0, 0, 0, 0)');
    });
});
```

- [ ] **Step 4 : Lancer le test navigateur**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx web-test-runner "src/components/tooltip/tooltip.browser.test.ts"
```

Attendu : tous les tests du fichier passent.

- [ ] **Step 5 : Lancer la suite Vitest complète**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run
```

Attendu : aucune régression.

- [ ] **Step 6 : Vérifier `build:manifest`**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run build:manifest
```

Attendu : succès.

- [ ] **Step 7 : Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add packages/core/src/components/tooltip/tooltip.styles.ts packages/core/src/components/tooltip/tooltip.ts packages/core/src/components/tooltip/tooltip.browser.test.ts && git commit -m "feat(core): fallback couleur système sur ar-tooltip (bulle et flèche)"
```

---

## Task 5 : Fallback littéral justifié sur `ar-datepicker`

**Files:**

- Modify: `packages/core/src/components/datepicker/datepicker.styles.ts:41-45,135-148`
- Modify: `packages/core/src/components/datepicker/datepicker.ts:49,80`
- Modify: `packages/core/src/components/datepicker/datepicker.browser.test.ts`

**Interfaces:**

- Consumes: `findUnjustifiedFallbacks` (Task 2) — vérifie ici la branche « commentaire `a11y-fallback` bien formé », pas seulement la whitelist système. Format de commentaire exact défini par `A11Y_FALLBACK_COMMENT_RE` (Task 2) : `/* a11y-fallback: <raison> */` sur la ligne immédiatement précédant la valeur littérale (dans le format multi-lignes ci-dessous, c'est la ligne juste avant `25rem`/`2.5rem`).
- Produces: `[part='panel']` a une largeur maximale de 25rem par défaut sans thème ; `[part='day']` fait 2.5rem × 2.5rem par défaut sans thème (WCAG 2.5.8).

- [ ] **Step 1 : Modifier `datepicker.styles.ts` — `--ar-datepicker-panel-max-width`**

Dans `packages/core/src/components/datepicker/datepicker.styles.ts`, remplacer le bloc `[part='panel']` (lignes 41-45) :

```css
[part='panel'] {
    width: var(--ar-datepicker-panel-width);
    max-width: var(--ar-datepicker-panel-max-width);
    padding: var(--ar-datepicker-panel-padding);
}
```

par :

```css
[part='panel'] {
    width: var(--ar-datepicker-panel-width);
    max-width: var(
        --ar-datepicker-panel-max-width,
        /* a11y-fallback: évite que la grille de ~35 jours s'étale sur toute la largeur de la page sans thème chargé */
        25rem
    );
    padding: var(--ar-datepicker-panel-padding);
}
```

- [ ] **Step 2 : Modifier `datepicker.styles.ts` — `--ar-datepicker-day-size`**

Dans le même fichier, remplacer dans le bloc `[part='day']` (lignes 135-148) :

```css
    [part='day'] {
        font-size: var(--ar-datepicker-day-font-size);
        color: var(--ar-color-text);
        width: var(--ar-datepicker-day-size);
        height: var(--ar-datepicker-day-size);
        display: flex;
```

par :

```css
    [part='day'] {
        font-size: var(--ar-datepicker-day-font-size);
        color: var(--ar-color-text);
        width: var(
            --ar-datepicker-day-size,
            /* a11y-fallback: WCAG 2.5.8 (Target Size Minimum) — [part='grid'] a border-collapse: collapse, qui supprime l'espacement natif du <table> ; sans thème la cellule se dimensionnerait à son seul contenu textuel */
            2.5rem
        );
        height: var(
            --ar-datepicker-day-size,
            /* a11y-fallback: WCAG 2.5.8 (Target Size Minimum) — [part='grid'] a border-collapse: collapse, qui supprime l'espacement natif du <table> ; sans thème la cellule se dimensionnerait à son seul contenu textuel */
            2.5rem
        );
        display: flex;
```

Le reste du bloc `[part='day']` (lignes 140-148 d'origine : `align-items`, `justify-content`, `margin`, `cursor`, `border-radius`, `background-color`, `border`) reste inchangé.

- [ ] **Step 3 : Mettre à jour le JSDoc `@cssprop` de `datepicker.ts`**

Dans `packages/core/src/components/datepicker/datepicker.ts`, remplacer :

```
 * @cssprop --ar-datepicker-panel-max-width - Largeur maximale du popover (valeur propre, non cascadée depuis --ar-panel-max-width).
```

par :

```
 * @cssprop --ar-datepicker-panel-max-width - Largeur maximale du popover (valeur propre, non cascadée depuis --ar-panel-max-width ; repli `25rem` si aucun thème n'est chargé, évite que la grille de ~35 jours s'étale sur toute la largeur de la page).
```

Et remplacer :

```
 * @cssprop --ar-datepicker-day-size - Taille des cellules jour.
```

par :

```
 * @cssprop --ar-datepicker-day-size - Taille des cellules jour (repli `2.5rem` si aucun thème n'est chargé — cible tactile WCAG 2.5.8 Target Size Minimum, la grille utilisant border-collapse: collapse qui supprime l'espacement natif du <table>).
```

- [ ] **Step 4 : Écrire le test navigateur**

`packages/core/src/components/datepicker/datepicker.browser.test.ts` importe déjà `expect, fixture, html, aTimeout` de `@open-wc/testing` et définit `openPicker(el)`. Ajouter un nouveau bloc `describe` juste avant la fermeture finale du `describe('ar-datepicker — browser', ...)` :

```typescript
// ── Fallback CSS d'accessibilité ─────────────────────────────────────────

describe('fallback CSS sans thème chargé', () => {
    it('le panel a une largeur maximale de 25rem par défaut', async () => {
        el = await fixture(html`<ar-datepicker></ar-datepicker>`);
        await openPicker(el);

        const panel = el.shadowRoot?.querySelector<HTMLElement>('[part="panel"]');
        if (!panel) throw new Error('[part="panel"] introuvable');
        const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
        expect(getComputedStyle(panel).maxWidth).to.equal(`${25 * rootFontSize}px`);
    });

    it('les cellules jour font 2.5rem × 2.5rem par défaut (WCAG 2.5.8)', async () => {
        el = await fixture(html`<ar-datepicker></ar-datepicker>`);
        await openPicker(el);

        const day = el.shadowRoot?.querySelector<HTMLElement>('[part="day"]');
        if (!day) throw new Error('[part="day"] introuvable');
        const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
        const expectedPx = `${2.5 * rootFontSize}px`;
        expect(getComputedStyle(day).width).to.equal(expectedPx);
        expect(getComputedStyle(day).height).to.equal(expectedPx);
    });
});
```

- [ ] **Step 5 : Lancer le test navigateur**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx web-test-runner "src/components/datepicker/datepicker.browser.test.ts"
```

Attendu : tous les tests du fichier passent (les assertions comparent en `px` résolus par le navigateur, `rem` étant relatif à la taille de police racine — 16px par défaut sans feuille de style chargée, donc `25rem` = `400px` et `2.5rem` = `40px` en pratique, mais le calcul via `rootFontSize` évite de coder cette valeur en dur dans le test).

- [ ] **Step 6 : Lancer la suite Vitest complète**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run
```

Attendu : aucune régression, y compris sur `datepicker.test.ts` qui contient déjà un test (`fonds par défaut du calendrier (thème)`) lisant `default.css` directement — ce test n'est pas affecté par le changement (il vérifie des tokens _couleur_ d'état, hors périmètre de cette passe).

- [ ] **Step 7 : Vérifier `build:manifest`**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run build:manifest
```

Attendu : succès — les deux fallbacks littéraux sont chacun précédés d'un commentaire `a11y-fallback` au format exact, donc `findUnjustifiedFallbacks` ne les signale pas.

- [ ] **Step 8 : Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add packages/core/src/components/datepicker/datepicker.styles.ts packages/core/src/components/datepicker/datepicker.ts packages/core/src/components/datepicker/datepicker.browser.test.ts && git commit -m "feat(core): fallback littéral justifié sur ar-datepicker (max-width panel, taille jour WCAG 2.5.8)"
```

---

## Task 6 : Amendement ADR-005

**Files:**

- Modify: `docs/decisions/ADR-005-tokens-pilotes-par-attribut.md` (ajout d'une section en fin de fichier, après « Conséquences »)

**Interfaces:** aucune — documentation pure.

- [ ] **Step 1 : Ajouter la section d'amendement**

Le fichier `ADR-005-tokens-pilotes-par-attribut.md` (lu intégralement en amont de ce plan) se termine actuellement par la section « Conséquences » (lignes 58-65, dernière ligne du fichier : `- Pas de convention de nommage pour des tokens véritablement internes/non documentables — écartée faute de cas concret (YAGNI), à documenter séparément si un besoin apparaît.`).

Ajouter à la toute fin du fichier :

```markdown
## Amendement (2026-07-22) : fallback d'accessibilité sur les surfaces flottantes

L'interdiction stricte de tout fallback (section « Décision » ci-dessus) suppose implicitement
qu'un thème (`default.css` ou équivalent) est toujours chargé par le consommateur. En pratique,
son absence rend certaines surfaces flottantes avec fond (dropdown/breadcrumb/stepper mobile/
datepicker via `panel.styles.ts`, plus `ar-tooltip`) confuses ou inaccessibles : panel
transparent qui se confond avec la page, texte illisible, cible tactile sous le seuil WCAG 2.5.8.

**Critère retenu :** un token peut recevoir un fallback fonctionnel dans le composant si, et
seulement si, son absence rend le composant confus, cassé ou inaccessible sans thème chargé —
pas juste « moins joli ». Présomption d'éligibilité pour les cas relevant d'un critère WCAG
précis (1.4.3, 1.4.11, 2.4.7, 2.5.8…) ; éligibilité sans présomption pour le reste, à justifier
individuellement.

**Deux mécanismes, jamais un fallback « à nous » choisi arbitrairement :**

1. **Couleur système CSS4** (préféré) : mots-clés (`Canvas`, `CanvasText`, `ButtonBorder`, etc.)
   pour tout ce qui touche au contraste — héritent du thème OS/navigateur, y compris le mode
   contraste élevé.
2. **Valeur littérale justifiée** : pour les dimensions sans équivalent système, un commentaire
   `/* a11y-fallback: <raison> */` sur la ligne précédant la valeur, vérifié automatiquement par
   `validate-no-hardcoded-tokens.js` (`findUnjustifiedFallbacks`, branché dans `cem.config.js`).

`border-radius`, `box-shadow` et le padding générique restent hors exception (purement
cosmétiques). Ce critère devient la règle générale de la librairie ; son application immédiate se
limite aux surfaces flottantes déjà identifiées — l'audit du reste des composants est suivi par
l'issue #129.

Détail complet du raisonnement, du périmètre et des tokens concernés :
`docs/superpowers/specs/2026-07-22-css-fallback-accessibilite-design.md`.
```

- [ ] **Step 2 : Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add docs/decisions/ADR-005-tokens-pilotes-par-attribut.md && git commit -m "docs(adr): amende ADR-005 pour le fallback CSS d'accessibilité des surfaces flottantes"
```

---

## Task 7 : Vérification finale et Pull Request

**Files:** aucun fichier modifié — validation et publication uniquement.

**Interfaces:** aucune.

- [ ] **Step 1 : Suite complète Vitest**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run test
```

Attendu : tous les tests passent (`packages/core` et `apps/docs`), y compris les nouveaux tests de `validate-no-hardcoded-tokens.test.js`.

- [ ] **Step 2 : Suite complète navigateur (WTR)**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx web-test-runner
```

Attendu : tous les tests `*.browser.test.ts` et `*.a11y.test.ts` passent, y compris les 4 nouveaux tests de fallback (dropdown, tooltip, datepicker × 2).

- [ ] **Step 3 : Manifest CEM**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run build:manifest
```

Attendu : succès sans erreur `[CEM]`.

- [ ] **Step 4 : Vérifier l'état de la branche et pousser**

```bash
cd /Users/jon/Code/Active_projects/ariane && git status && git log --oneline dev..HEAD
```

Attendu : 5 commits (Task 2 à Task 6), working tree clean. Puis :

```bash
cd /Users/jon/Code/Active_projects/ariane && git push -u origin docs/css-fallback-accessibilite
```

- [ ] **Step 5 : Créer la Pull Request vers `dev`**

Pas d'issue GitHub dédiée à cette implémentation précise (l'issue de suivi #129 « Audit du fallback CSS d'accessibilité sur l'ensemble des composants » existe déjà et couvre l'étape _suivante_, hors périmètre de cette passe — ne pas la fermer avec cette PR).

```bash
cd /Users/jon/Code/Active_projects/ariane && gh pr create --base dev --title "feat(core): fallback CSS d'accessibilité sur les surfaces flottantes" --body "$(cat <<'EOF'
## Résumé

- Amendement à ADR-005 : un token peut recevoir un fallback fonctionnel si son absence rend un
  composant confus, cassé ou inaccessible sans thème chargé (présomption pour les critères WCAG
  identifiés). Deux mécanismes : couleur système CSS4, ou valeur littérale justifiée par un
  commentaire `a11y-fallback`.
- `--ar-panel-bg`/`-text`/`-border-color` (dropdown/breadcrumb/stepper/datepicker),
  `--ar-tooltip-bg`/`-color` : fallback couleur système (`Canvas`/`CanvasText`/`ButtonBorder`).
- `--ar-datepicker-panel-max-width` (25rem) et `--ar-datepicker-day-size` (2.5rem, WCAG 2.5.8) :
  fallback littéral justifié.
- Nouveau garde-fou CI (`findUnjustifiedFallbacks` dans `validate-no-hardcoded-tokens.js`) : tout
  `var(--ar-*, fallback)` non couvert par l'un des deux mécanismes fait échouer
  `npm run build:manifest`.

Détail complet : `docs/superpowers/specs/2026-07-22-css-fallback-accessibilite-design.md`.
Suivi (hors périmètre, non fermé par cette PR) : #129.

## Test plan

- [ ] `npm run test` (Vitest, racine) — vert
- [ ] `npx web-test-runner` (packages/core) — vert, y compris les 4 nouveaux tests de résolution
      réelle du fallback (dropdown/tooltip/datepicker × 2)
- [ ] `npm run build:manifest` — vert
EOF
)"
```

Retourner l'URL de la PR affichée par `gh pr create`.

---

## Auto-relecture

**1. Couverture de la spec.**

- Principe retenu / critère WCAG prioritaire vs cas général → documenté dans l'amendement ADR-005 (Task 6) et implicite dans les justifications des Tasks 3-5.
- Mécanisme A (couleur système) → Tasks 3 et 4.
- Mécanisme B (littéral justifié) → Task 5.
- Ce qui reste hors périmètre (`border-radius`, `box-shadow`, padding générique) → explicitement non touché dans panel.styles.ts (Task 3, Step 1) et datepicker.styles.ts (Task 5, Steps 1-2 ne touchent que max-width/day-size).
- Système panel partagé (3 tokens × 4 consommateurs mais JSDoc seulement pour dropdown/breadcrumb/stepper, pas datepicker) → Task 3.
- `ar-tooltip` (2 tokens, 3 occurrences dont 2 de `--ar-tooltip-bg`) → Task 4.
- `ar-datepicker` (2 tokens, justification individuelle) → Task 5.
- Garde-fou CI (nouvelle fonction, whitelist fermée, format de commentaire exact) → Task 2.
- Documentation `@cssprop` mentionnant la valeur de repli → Tasks 3, 4, 5.
- Tests de résolution réelle du fallback → Tasks 3, 4, 5 (Step test dans chaque tâche).
- Hors périmètre — suivi (issue milestone #1) → déjà satisfait par l'issue #129 existante, référencée dans l'amendement ADR-005 et le corps de la PR (Task 6, Task 7) ; aucune tâche de création d'issue nécessaire.
- Amendement ADR-005 → Task 6.

Aucun gap identifié.

**2. Scan de placeholders.** Aucune occurrence de « TBD », « TODO », « implement later », « add appropriate handling » dans les steps de code. Chaque step de code contient le contenu réel (diffs exacts avec avant/après, tests complets avec assertions concrètes).

**3. Cohérence des noms.**

- `findUnjustifiedFallbacks(filePath, source)` : signature identique entre Task 2 (définition + tests) et son usage implicite (exécution automatique via `cem.config.js`) dans Tasks 3-5 — aucune divergence.
- Format du commentaire `/* a11y-fallback: <raison> */` : identique entre la regex `A11Y_FALLBACK_COMMENT_RE` définie en Task 2 et les commentaires réellement écrits dans `datepicker.styles.ts` en Task 5 (vérifié caractère par caractère : préfixe `/* a11y-fallback: `, suffixe ` */`, sur la ligne immédiatement précédant la valeur littérale dans le format multi-lignes `var(\n    --token,\n    /* ... */\n    valeur\n)`).
- `SYSTEM_COLOR_KEYWORDS` (Task 2) contient exactement les 8 mots-clés utilisés dans Tasks 3-4 (`Canvas`, `CanvasText`, `ButtonBorder`) — sous-ensemble cohérent, pas de mot-clé halluciné hors liste.
- `STRUCTURAL_LITERAL_KEYWORDS` / `BARE_TOKEN_FALLBACK_RE` (Task 2) : noms et comportement cohérents entre leur définition et leur usage exclusivement dans la vérification anti-régression de Step 6 (aucune Task 3-5 n'a besoin de ces deux exemptions, réservées aux cas préexistants `dialog.styles.ts`/`tab.styles.ts`).
- Helpers de test réutilisés sans redéfinition divergente : `getPanel`/`openDropdown` (dropdown.browser.test.ts, déjà présents), `getBubble` (tooltip.browser.test.ts, déjà présent), `openPicker` (datepicker.browser.test.ts, déjà présent) — aucun nouveau helper concurrent introduit.

## Écarts constatés par rapport aux instructions initiales

À vérifier par l'utilisateur — ces points diffèrent de ce qui était supposé dans le brief :

1. **Tests de résolution du fallback déplacés en tests navigateur, pas Vitest.** Le brief suggérait de placer le test de résolution dans `dropdown.test.ts`/`tooltip.test.ts`/`datepicker.test.ts` (fichiers Vitest, environnement `happy-dom`). Vérification empirique faite avant d'écrire ce plan (scripts Node exécutant `happy-dom` directement) : `happy-dom` résout `var(--x)` quand `--x` a une valeur, mais **ne résout jamais la branche fallback** d'un `var(--y, Canvas)` quand `--y` est absent — `getComputedStyle(...).backgroundColor` retourne `''` dans les deux cas (repli présent ou non), donc un test Vitest ne peut pas distinguer un fallback qui fonctionne d'un fallback cassé. Confirmé aussi que Chromium réel (via Playwright, donc via `@web/test-runner`) résout correctement la branche fallback (`Canvas` → `rgb(255, 255, 255)` par exemple). J'ai donc placé ces tests dans les fichiers `*.browser.test.ts` déjà existants pour dropdown/tooltip/datepicker (Tasks 3, 4, 5), pas dans les `*.test.ts` Vitest.
2. **`--ar-datepicker-day-size` a déjà une entrée `@cssprop`.** Le brief supposait qu'elle était probablement absente. Vérifié dans `datepicker.ts:80` : `@cssprop --ar-datepicker-day-size - Taille des cellules jour.` existe déjà — Task 5 la modifie (ajout de la mention du repli) plutôt que de l'ajouter ex nihilo.
3. **`--ar-dropdown-color` mis à jour en plus de `--ar-dropdown-bg`/`-border-color`.** Le brief mentionnait explicitement cette entrée comme « l'alias texte déjà existant » sans trancher s'il fallait la modifier. Je l'ai mise à jour (Task 3, Step 2) puisqu'elle cascade vers `--ar-panel-text`, qui reçoit désormais un fallback `CanvasText` — cohérent avec le traitement de `--ar-dropdown-bg`/`-border-color`.
4. **Issue de suivi déjà créée.** Le brief (via la spec) indiquait qu'« une issue sera créée » pour l'audit général (milestone #1). Elle existe déjà : **#129** « Audit du fallback CSS d'accessibilité sur l'ensemble des composants ». Aucune tâche de création d'issue n'a donc été ajoutée au plan ; Task 6 et Task 7 la référencent simplement.
5. **Régression détectée et corrigée dans la conception de `findUnjustifiedFallbacks` (Task 2) avant d'écrire le reste du plan.** Une version initiale de la regex (`[^)]+` pour capturer le fallback) cassait sur deux cas déjà présents dans le code : `dialog.styles.ts:174-175` (`var(--ar-dialog-spacing-block, var(--ar-dialog-spacing))`, un `var()` imbriqué tronqué au premier `)` rencontré) et `tab.styles.ts:20-21` (`var(--ar-tab-group-border-top-width, 0px)`, un fallback structurel `0px` explicitement sanctionné par CLAUDE.md). Vérifié empiriquement en exécutant la fonction contre l'intégralité du corpus `*.styles.ts` actuel (22 fichiers) avant d'écrire les tâches suivantes — la version initiale remontait 4 faux positifs, qui auraient fait échouer `npm run build:manifest` dès la Task 2, avant même de toucher panel/tooltip/datepicker. Le plan final (Task 2, Step 3) utilise une regex tolérant un niveau d'imbrication de parenthèses (`[^()]*(?:\([^()]*\)[^()]*)*`) plus deux exemptions supplémentaires (`STRUCTURAL_LITERAL_KEYWORDS`, `BARE_TOKEN_FALLBACK_RE`), revérifiées contre le corpus complet : 0 faux positif. Task 2, Step 6 documente explicitement ce garde-fou anti-régression.
6. **Contenu des fichiers cités dans le brief.** Tous les extraits de code cités dans le brief (`panel.styles.ts`, `tooltip.styles.ts`, `datepicker.styles.ts`, JSDoc de dropdown/breadcrumb/stepper/tooltip/datepicker, `validate-no-hardcoded-tokens.js`, `cem.config.js`, ADR-005) correspondent exactement à l'état actuel des fichiers — relu intégralement avant d'écrire chaque tâche, aucune divergence trouvée au-delà des points 1-5 ci-dessus.
