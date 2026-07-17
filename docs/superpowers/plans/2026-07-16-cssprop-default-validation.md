# Validation `@cssprop` default vs `default.css` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire échouer `npm run build:manifest` (et donc la CI) quand une valeur `@cssprop [--nom=valeur]` écrite à la main dans le JSDoc d'un composant diverge de la définition réelle du même token dans `packages/core/src/styles/themes/default.css`.

**Architecture:** Deux fonctions pures et testables (`extractThemeTokens`, `validateCssPropertyDefaults`) dans un nouveau fichier `packages/core/scripts/validate-cssprop-defaults.js`, appelées depuis le hook `packageLinkPhase` existant de `packages/core/cem.config.js`. Aucune génération, aucune modification de fichier composant — uniquement une comparaison en lecture seule qui `throw` en cas de désaccord.

**Tech Stack:** Node.js (ESM), Vitest (tests), `@custom-elements-manifest/analyzer` (`packageLinkPhase` hook déjà en place dans `cem.config.js`).

## Global Constraints

- Prettier : 100 caractères, 4 espaces, guillemets simples.
- Pas de dépendance `packages/core` → `apps/docs` : la regex d'extraction est dupliquée localement, pas importée depuis `apps/docs/src/utils/parse-tokens.ts`.
- Comparaison en chaîne brute, sans résolution des `var(...)` (cf. spec, section 2).
- Aucun fichier composant (`*.ts` sous `src/components/`) n'est modifié par ce chantier.
- Branches `fix/<desc>` depuis `dev`, PR vers `dev`, jamais de push direct sur `main`.

---

## Fichiers touchés

- **Créer** `packages/core/scripts/validate-cssprop-defaults.js` — les deux fonctions pures : extraction des tokens depuis `default.css`, comparaison avec le manifest CEM.
- **Créer** `packages/core/scripts/validate-cssprop-defaults.test.js` — tests Vitest des deux fonctions.
- **Modifier** `packages/core/vitest.config.ts` — étend `test.include` pour que Vitest ramasse aussi `scripts/**/*.test.js` (aujourd'hui limité à `src/**/*.test.ts`).
- **Modifier** `packages/core/cem.config.js` — importe et appelle les deux fonctions dans `packageLinkPhase`, `throw` en cas de désaccord.

---

### Task 1: Créer la branche de travail

**Files:** aucun

- [ ] **Step 1: Vérifier que `dev` est propre et à jour**

Run: `git -C /Users/jon/Code/Active_projects/ariane status && git -C /Users/jon/Code/Active_projects/ariane fetch origin dev && git -C /Users/jon/Code/Active_projects/ariane log HEAD..origin/dev --oneline`

Expected: `nothing to commit, working tree clean` et aucune sortie pour la comparaison avec `origin/dev` (déjà à jour).

- [ ] **Step 2: Créer et checkout la branche**

Run: `git -C /Users/jon/Code/Active_projects/ariane checkout -b fix/cssprop-default-validation`

Expected: `Switched to a new branch 'fix/cssprop-default-validation'`

---

### Task 2: `extractThemeTokens` — extraction des tokens depuis `default.css`

**Files:**

- Create: `packages/core/scripts/validate-cssprop-defaults.js`
- Test: `packages/core/scripts/validate-cssprop-defaults.test.js`

**Interfaces:**

- Produces: `extractThemeTokens(css: string): Map<string, string>` — nom du token (`--ar-xxx`) → valeur nettoyée (sans commentaire `/* ... */` trailing, trim). Consommée par Task 3 et par `cem.config.js` (Task 4).

- [ ] **Step 1: Écrire les tests (doivent échouer, le module n'existe pas encore)**

Créer `packages/core/scripts/validate-cssprop-defaults.test.js` :

```js
import { describe, expect, it } from 'vitest';
import { extractThemeTokens } from './validate-cssprop-defaults.js';

describe('extractThemeTokens', () => {
    it('extrait un token simple', () => {
        const css = `:root { --ar-color-text: #171717; }`;
        const tokens = extractThemeTokens(css);
        expect(tokens.get('--ar-color-text')).toBe('#171717');
    });

    it('retire le commentaire oklch trailing', () => {
        const css = `:root { --ar-color-primary-05: #010105 /* oklch(7.47% 0.022 279.71) */; }`;
        const tokens = extractThemeTokens(css);
        expect(tokens.get('--ar-color-primary-05')).toBe('#010105');
    });

    it('garde une référence var() non résolue', () => {
        const css = `:root { --ar-pagination-bg: var(--ar-button-tertiary-bg); }`;
        const tokens = extractThemeTokens(css);
        expect(tokens.get('--ar-pagination-bg')).toBe('var(--ar-button-tertiary-bg)');
    });

    it("extrait plusieurs tokens malgré l'imbrication @layer/:root", () => {
        const css = `
            @layer ariane.theme {
                :root {
                    --ar-color-text: #171717;
                    --ar-spacing-sm: 0.5rem;
                }
            }
        `;
        const tokens = extractThemeTokens(css);
        expect(tokens.size).toBe(2);
        expect(tokens.get('--ar-spacing-sm')).toBe('0.5rem');
    });

    it('retourne une map vide pour un CSS sans token --ar-*', () => {
        const css = `:root { --other-prop: red; }`;
        const tokens = extractThemeTokens(css);
        expect(tokens.size).toBe(0);
    });
});
```

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent**

Run: `cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run scripts/validate-cssprop-defaults.test.js`

Expected: FAIL — `Cannot find module './validate-cssprop-defaults.js'` (ou équivalent, le fichier n'existe pas).

- [ ] **Step 3: Étendre `vitest.config.ts` pour ramasser les tests du dossier `scripts/`**

Modifier `packages/core/vitest.config.ts`, le bloc `test` :

```ts
        // *.browser.test.ts et *.a11y.test.ts sont gérés par @web/test-runner, pas Vitest
        include: ['src/**/*.test.ts', 'scripts/**/*.test.js'],
        exclude: ['src/**/*.browser.test.ts', 'src/**/*.a11y.test.ts'],
```

(Remplace uniquement la ligne `include: ['src/**/*.test.ts'],` — le reste du fichier ne change pas.)

- [ ] **Step 4: Créer `packages/core/scripts/validate-cssprop-defaults.js` avec l'implémentation minimale**

```js
/**
 * Extrait et valide les valeurs par défaut des CSS custom properties (`@cssprop`)
 * documentées à la main dans le JSDoc des composants, en les comparant à leur
 * définition réelle dans le thème par défaut (`src/styles/themes/default.css`).
 *
 * Utilisé par `cem.config.js` (hook `packageLinkPhase`) pour faire échouer
 * `npm run build:manifest` en cas de désaccord — cf. docs/superpowers/specs/2026-07-16-cem-theme-default-sync-design.md
 */

const TOKEN_RE = /(--ar[\w-]+)\s*:\s*([^;]+)/g;

/**
 * Parse un fichier CSS de thème et retourne une map nom de token → valeur nettoyée
 * (commentaire `/* ... *\/` trailing retiré, valeur triée). Ignore le nesting
 * (`@layer`/`:root`) — la regex matche sur le contenu brut du fichier.
 *
 * @param {string} css
 * @returns {Map<string, string>}
 */
export function extractThemeTokens(css) {
    const tokens = new Map();
    TOKEN_RE.lastIndex = 0;
    let match;
    while ((match = TOKEN_RE.exec(css)) !== null) {
        const name = match[1].trim();
        const value = match[2].split('/*')[0].trim();
        tokens.set(name, value);
    }
    return tokens;
}
```

- [ ] **Step 5: Lancer les tests, vérifier qu'ils passent**

Run: `cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run scripts/validate-cssprop-defaults.test.js`

Expected: PASS — 5 tests verts.

- [ ] **Step 6: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add packages/core/scripts/validate-cssprop-defaults.js packages/core/scripts/validate-cssprop-defaults.test.js packages/core/vitest.config.ts
git commit -m "test(core): ajoute extractThemeTokens pour parser default.css"
```

---

### Task 3: `validateCssPropertyDefaults` — comparaison manifest vs thème

**Files:**

- Modify: `packages/core/scripts/validate-cssprop-defaults.js`
- Test: `packages/core/scripts/validate-cssprop-defaults.test.js`

**Interfaces:**

- Consumes: `extractThemeTokens` (Task 2) — `Map<string, string>`.
- Produces: `validateCssPropertyDefaults(customElementsManifest: { modules: Array<{ declarations?: Array<{ name: string, cssProperties?: Array<{ name: string, default?: string }> }> }> }, themeTokens: Map<string, string>): string[]` — liste de messages d'erreur lisibles (un par désaccord), tableau vide si tout est cohérent. Consommée par Task 4 (`cem.config.js`).

- [ ] **Step 1: Ajouter les tests (doivent échouer, la fonction n'existe pas encore)**

Ajouter à la fin de `packages/core/scripts/validate-cssprop-defaults.test.js` :

```js
import { validateCssPropertyDefaults } from './validate-cssprop-defaults.js';

describe('validateCssPropertyDefaults', () => {
    function manifestWith(cssProperties) {
        return {
            modules: [{ declarations: [{ name: 'ArPagination', cssProperties }] }],
        };
    }

    it('ne retourne aucune erreur quand la valeur JSDoc correspond au thème', () => {
        const themeTokens = new Map([['--ar-pagination-radius', '0.75rem']]);
        const manifest = manifestWith([{ name: '--ar-pagination-radius', default: '0.75rem' }]);
        expect(validateCssPropertyDefaults(manifest, themeTokens)).toEqual([]);
    });

    it('retourne une erreur détaillée quand la valeur JSDoc diverge du thème', () => {
        const themeTokens = new Map([['--ar-pagination-radius', '0.75rem']]);
        const manifest = manifestWith([{ name: '--ar-pagination-radius', default: '1rem' }]);
        const errors = validateCssPropertyDefaults(manifest, themeTokens);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('ArPagination');
        expect(errors[0]).toContain('--ar-pagination-radius');
        expect(errors[0]).toContain('1rem');
        expect(errors[0]).toContain('0.75rem');
    });

    it('ignore les cssProperties sans default (rien à comparer)', () => {
        const themeTokens = new Map([['--ar-charcounter-color', '#171717']]);
        const manifest = manifestWith([{ name: '--ar-charcounter-color' }]);
        expect(validateCssPropertyDefaults(manifest, themeTokens)).toEqual([]);
    });

    it('ignore les tokens absents du thème (props hors thème, ex. --ar-dialog-width)', () => {
        const themeTokens = new Map();
        const manifest = manifestWith([{ name: '--ar-dialog-width', default: '500px' }]);
        expect(validateCssPropertyDefaults(manifest, themeTokens)).toEqual([]);
    });

    it('agrège les erreurs sur plusieurs déclarations', () => {
        const themeTokens = new Map([
            ['--ar-pagination-radius', '0.75rem'],
            ['--ar-alert-padding', '1rem'],
        ]);
        const manifest = {
            modules: [
                {
                    declarations: [
                        {
                            name: 'ArPagination',
                            cssProperties: [{ name: '--ar-pagination-radius', default: '1rem' }],
                        },
                        {
                            name: 'ArAlert',
                            cssProperties: [{ name: '--ar-alert-padding', default: '2rem' }],
                        },
                    ],
                },
            ],
        };
        expect(validateCssPropertyDefaults(manifest, themeTokens)).toHaveLength(2);
    });
});
```

- [ ] **Step 2: Lancer les tests, vérifier que les 5 nouveaux échouent**

Run: `cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run scripts/validate-cssprop-defaults.test.js`

Expected: FAIL — `validateCssPropertyDefaults is not a function` (ou équivalent), les tests d'`extractThemeTokens` restent verts.

- [ ] **Step 3: Ajouter l'implémentation à `packages/core/scripts/validate-cssprop-defaults.js`**

Ajouter à la fin du fichier :

```js
/**
 * Compare les `@cssprop [--nom=valeur]` déjà résolus dans le manifest CEM
 * aux valeurs réelles du thème par défaut. Ne modifie rien : retourne la liste
 * des désaccords trouvés (tableau vide si tout est cohérent).
 *
 * @param {{ modules?: Array<{ declarations?: Array<{ name: string, cssProperties?: Array<{ name: string, default?: string }> }> }> }} customElementsManifest
 * @param {Map<string, string>} themeTokens
 * @returns {string[]}
 */
export function validateCssPropertyDefaults(customElementsManifest, themeTokens) {
    const errors = [];
    for (const mod of customElementsManifest.modules ?? []) {
        for (const decl of mod.declarations ?? []) {
            for (const prop of decl.cssProperties ?? []) {
                if (prop.default === undefined) continue;
                const themeValue = themeTokens.get(prop.name);
                if (themeValue === undefined) continue;
                if (prop.default !== themeValue) {
                    errors.push(
                        `${decl.name} : ${prop.name} déclare [default=${prop.default}] dans le JSDoc mais default.css définit "${themeValue}"`,
                    );
                }
            }
        }
    }
    return errors;
}
```

- [ ] **Step 4: Lancer tous les tests du fichier, vérifier qu'ils passent**

Run: `cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run scripts/validate-cssprop-defaults.test.js`

Expected: PASS — 10 tests verts (5 `extractThemeTokens` + 5 `validateCssPropertyDefaults`).

- [ ] **Step 5: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add packages/core/scripts/validate-cssprop-defaults.js packages/core/scripts/validate-cssprop-defaults.test.js
git commit -m "test(core): ajoute validateCssPropertyDefaults pour comparer manifest et thème"
```

---

### Task 4: Brancher la validation dans `cem.config.js`

**Files:**

- Modify: `packages/core/cem.config.js`

**Interfaces:**

- Consumes: `extractThemeTokens`, `validateCssPropertyDefaults` (Task 2 et 3), importées depuis `./scripts/validate-cssprop-defaults.js`.

- [ ] **Step 1: Ajouter l'import en haut de `packages/core/cem.config.js`**

Après la ligne `import { customElementVsCodePlugin } from 'custom-element-vs-code-integration';` (ligne 14), ajouter :

```js
import {
    extractThemeTokens,
    validateCssPropertyDefaults,
} from './scripts/validate-cssprop-defaults.js';
```

- [ ] **Step 2: Ajouter l'appel de validation à la fin de `packageLinkPhase`**

Dans `packages/core/cem.config.js`, à l'intérieur de `packageLinkPhase({ customElementsManifest }) { ... }`, juste avant l'accolade fermante de la fonction (après le dernier bloc `for (const mod of customElementsManifest.modules) { ... }` qui gère les knobs api-demo), ajouter :

```js
// Valide que les @cssprop [--nom=valeur] écrits à la main dans le JSDoc
// des composants correspondent aux valeurs réelles de default.css —
// cf. docs/superpowers/specs/2026-07-16-cem-theme-default-sync-design.md
const themeCss = readFileSync(resolve(process.cwd(), 'src/styles/themes/default.css'), 'utf-8');
const themeTokens = extractThemeTokens(themeCss);
const cssPropErrors = validateCssPropertyDefaults(customElementsManifest, themeTokens);
if (cssPropErrors.length > 0) {
    throw new Error(
        `[CEM] ${cssPropErrors.length} @cssprop désynchronisé(s) avec default.css :\n` +
            cssPropErrors.map((e) => `  - ${e}`).join('\n'),
    );
}
```

- [ ] **Step 3: Lancer `build:manifest` sur l'état actuel du repo, vérifier qu'il passe**

Run: `cd /Users/jon/Code/Active_projects/ariane/packages/core && npm run build:manifest`

Expected: la commande se termine sans erreur (code de sortie 0), pas de message `[CEM] N @cssprop désynchronisé(s)`. Si des désaccords apparaissent, corriger le `@cssprop [--nom=valeur]` du composant concerné pour qu'il corresponde à `default.css` avant de continuer (ce ne serait pas attendu d'après l'audit fait en PR #98, mais la commande fait foi).

- [ ] **Step 4: Vérification manuelle — provoquer une désynchronisation pour confirmer la détection**

Modifier temporairement `packages/core/src/components/pagination/pagination.ts` : changer `@cssprop [--ar-pagination-radius=var(--ar-border-radius-lg)]` en `@cssprop [--ar-pagination-radius=1px]`.

Run: `cd /Users/jon/Code/Active_projects/ariane/packages/core && npm run build:manifest`

Expected: la commande échoue (code de sortie non nul), le message d'erreur contient `ArPagination`, `--ar-pagination-radius`, `1px` et `var(--ar-border-radius-lg)`.

Annuler la modification :

Run: `cd /Users/jon/Code/Active_projects/ariane && git checkout -- packages/core/src/components/pagination/pagination.ts`

Expected: le fichier revient à son état d'origine (`git status` propre sur ce fichier).

- [ ] **Step 5: Relancer `build:manifest` pour confirmer le retour à la normale**

Run: `cd /Users/jon/Code/Active_projects/ariane/packages/core && npm run build:manifest`

Expected: succès (code de sortie 0), comme au Step 3.

- [ ] **Step 6: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add packages/core/cem.config.js
git commit -m "feat(core): fait échouer build:manifest si un @cssprop diverge de default.css"
```

---

### Task 5: Vérification globale et PR

**Files:** aucun (vérification uniquement)

- [ ] **Step 1: Suite de tests complète du core**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run test --workspace=packages/core`

Expected: tous les tests passent (711+ existants, +10 nouveaux dans `scripts/validate-cssprop-defaults.test.js`), aucune régression.

- [ ] **Step 2: Build complet du package core (exerce le pipeline turbo réel, `build:manifest` → `build:bundles`/`build:types`)**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run build --workspace=packages/core`

Expected: succès, aucune erreur de `tsc` ni de `cem analyze`.

- [ ] **Step 3: Lint**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run lint --workspace=packages/core`

Expected: aucune erreur.

- [ ] **Step 4: Build de la doc (consomme `packages/core/dist/custom-elements.json`, vérifie qu'aucune régression n'apparaît côté `apps/docs`)**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run build --workspace=apps/docs`

Expected: succès.

- [ ] **Step 5: Push et ouverture de la PR**

```bash
cd /Users/jon/Code/Active_projects/ariane
git push -u origin fix/cssprop-default-validation
gh pr create --base dev --title "fix(core): valide les @cssprop default contre default.css au build" --body "$(cat <<'EOF'
## Summary
- Ajoute une validation dans le hook `packageLinkPhase` de `cem.config.js` : compare chaque `@cssprop [--nom=valeur]` écrit à la main dans le JSDoc des composants à la valeur réelle du même token dans `default.css`, et fait échouer `npm run build:manifest` en cas de désaccord.
- Aucune génération, aucun fichier composant modifié — cf. spec `docs/superpowers/specs/2026-07-16-cem-theme-default-sync-design.md` (#111 item 2).

## Test plan
- [x] `npm run test --workspace=packages/core` — vert
- [x] `npm run build --workspace=packages/core` — vert
- [x] `npm run lint --workspace=packages/core` — vert
- [x] `npm run build --workspace=apps/docs` — vert
- [x] Désynchronisation provoquée manuellement sur `pagination.ts` → `build:manifest` échoue avec un message clair, puis revert confirmé
EOF
)"
```

Expected : l'URL de la PR est retournée par `gh pr create`.

---

## Self-Review

- **Couverture du spec** : mécanisme de validation (§1) → Task 2-4 ; pas de résolution `var()` (§2) → testé explicitement (`validateCssPropertyDefaults` test "garde une référence var() non résolue" côté extraction, comparaison en chaîne brute côté validation) ; props hors thème (§3) → test dédié "ignore les tokens absents du thème" ; aucun nettoyage JSDoc (§4) → aucune task ne touche `src/components/**/*.ts` (Task 4 Step 4 modifie puis annule pagination.ts uniquement pour la vérification) ; throw bloquant plutôt que warn (§1, "Pourquoi un throw") → Task 4 Step 2.
- **Placeholders** : aucun — chaque step contient soit une commande exacte avec sortie attendue, soit du code complet.
- **Cohérence des types/signatures** : `extractThemeTokens(css: string): Map<string, string>` utilisé identiquement en Task 2, 3 (paramètre `themeTokens`) et 4 (`readFileSync` → `extractThemeTokens` → passé à `validateCssPropertyDefaults`). `validateCssPropertyDefaults(customElementsManifest, themeTokens): string[]` cohérent entre Task 3 et son usage en Task 4.
