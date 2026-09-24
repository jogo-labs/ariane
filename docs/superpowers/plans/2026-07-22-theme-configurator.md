# Configurateur de thème "Personnalisation" (#120) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer `/foundations/tokens` par une nouvelle page "Personnalisation" (section "Bien démarrer") qui affiche `default.css` comme un thème de démo éditable, permet de personnaliser chaque token (global + par composant) via des contrôles typés, prévisualise en live, persiste en `localStorage`, et exporte un fichier `.css` complet.

**Architecture:** Un utilitaire de build (`build-theme-manifest.ts`) fusionne le manifeste CEM (`cssProperties`/`@cssprop`, liste maîtresse par composant) avec les valeurs claire/sombre extraites de `default.css`, en infère le type de contrôle par token, et produit un `ThemeManifest` sérialisé en JSON dans la page. Un script client (module Astro, pas de framework) lit ce JSON, applique les changements en live via `style.setProperty` sur des conteneurs de preview isolés, persiste les overrides dans `localStorage`, et génère l'export CSS via une fonction pure (`buildThemeCss`) testable indépendamment du DOM.

**Tech Stack:** Astro 6, TypeScript, Lit (composants `ar-*` existants réutilisés en preview), Vitest (`environment: 'node'`), pas de framework JS côté client (scripts vanilla TS dans des `<script>` de composants Astro).

## Global Constraints

- Prettier : 100 caractères, 4 espaces, guillemets simples (`.prettierrc` racine — s'applique à tout fichier créé/modifié).
- `import type` obligatoire pour tout import de type uniquement.
- Tests Vitest : imports relatifs avec extension `.js` même pour un fichier source `.ts` (convention déjà en place dans `apps/docs/src/utils/*.test.ts`), descriptions `it()` en français, minuscule, sans point final.
- `apps/docs/vitest.config.ts` a `environment: 'node'` — aucun test ne doit dépendre du DOM (`window`, `document`).
- Aucun nouveau composant public `ar-*` dans `packages/core` — tout le code du configurateur vit dans `apps/docs`.
- Le code ne doit jamais s'appliquer sur `document.documentElement` — uniquement sur des conteneurs de preview isolés (`[data-preview-for]`).
- Commits en Conventional Commits (commitlint + Husky actifs sur ce repo — ne pas utiliser `--no-verify`).
- Toute commande `npm`/`git` racine doit être préfixée du chemin absolu du repo : `/Users/jon/Code/Active_projects/ariane`.

## Note de déviation par rapport à la spec

La spec (`docs/superpowers/specs/2026-07-22-theme-configurator-design.md`) mentionnait factoriser `findTokenOwner` (rattachement par préfixe de tag) depuis `validate-cssprop-defaults.js`. En pratique, ce n'est pas nécessaire : comme le manifeste CEM (`cssProperties`) est la liste maîtresse par composant, on itère directement ses entrées et on cherche leur valeur par **nom exact** dans les maps `default.css` — pas besoin de deviner un propriétaire par préfixe. Seul l'ajout d'`extractDarkThemeTokens` (Task 1) est repris de la spec.

Autre déviation, à valider avec l'utilisateur en fin de plan : le contrôle `dimension` est implémenté comme un simple `<input type="text">` avec `pattern` de validation, plutôt qu'un couple input numérique + `<select>` d'unité séparé — un token n'a jamais qu'une seule unité observée dans `default.css`, donc scinder value/unité en deux champs à recombiner ajoute de la complexité sans bénéfice fonctionnel réel pour ce premier jet.

---

### Task 1: `extractDarkThemeTokens` dans `validate-cssprop-defaults.js`

**Files:**

- Modify: `packages/core/scripts/validate-cssprop-defaults.js`
- Test: `packages/core/scripts/validate-cssprop-defaults.test.js`

**Interfaces:**

- Produces: `extractDarkThemeTokens(css: string): Map<string, string>` — même contrat que `extractThemeTokens` mais sur la portion du CSS **après** le marqueur de surcharge dark (`DARK_OVERRIDE_RE`, déjà défini dans ce fichier). Retourne une `Map` vide si aucune surcharge dark n'existe.

- [ ] **Step 1: Écrire les tests pour `extractDarkThemeTokens`**

Ajouter à la fin de `packages/core/scripts/validate-cssprop-defaults.test.js` (après le dernier `describe('validateCssPropertyCoverage', ...)`, avant la fin du fichier) :

```js
describe('extractDarkThemeTokens', () => {
    it("retourne une map vide quand aucune surcharge dark n'existe", () => {
        const css = `:root { --ar-color-text: #171717; }`;
        expect(extractDarkThemeTokens(css).size).toBe(0);
    });

    it("extrait la valeur de la surcharge dark manuelle (:root[data-theme='dark'])", () => {
        const css = `
            @layer ariane.theme {
                :root {
                    --ar-alert-info-border: var(--ar-color-info-bg);
                }

                :root[data-theme='dark'] {
                    --ar-alert-info-border: var(--ar-color-info-40);
                }
            }
        `;
        const tokens = extractDarkThemeTokens(css);
        expect(tokens.get('--ar-alert-info-border')).toBe('var(--ar-color-info-40)');
    });

    it('extrait la valeur de la surcharge dark automatique (@media prefers-color-scheme: dark)', () => {
        const css = `
            @layer ariane.theme {
                :root {
                    --ar-alert-info-border: var(--ar-color-info-bg);
                }

                @media (prefers-color-scheme: dark) {
                    :root:not([data-theme='light']) {
                        --ar-alert-info-border: var(--ar-color-info-40);
                    }
                }
            }
        `;
        const tokens = extractDarkThemeTokens(css);
        expect(tokens.get('--ar-alert-info-border')).toBe('var(--ar-color-info-40)');
    });

    it("n'inclut pas les tokens qui n'ont pas de surcharge dark", () => {
        const css = `
            @layer ariane.theme {
                :root {
                    --ar-spacing-sm: 0.5rem;
                    --ar-alert-info-border: var(--ar-color-info-bg);
                }

                :root[data-theme='dark'] {
                    --ar-alert-info-border: var(--ar-color-info-40);
                }
            }
        `;
        const tokens = extractDarkThemeTokens(css);
        expect(tokens.has('--ar-spacing-sm')).toBe(false);
        expect(tokens.get('--ar-alert-info-border')).toBe('var(--ar-color-info-40)');
    });
});
```

Et mettre à jour l'import en tête du fichier :

```js
import {
    extractThemeTokens,
    extractDarkThemeTokens,
    validateCssPropertyCoverage,
} from './validate-cssprop-defaults.js';
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `cd /Users/jon/Code/Active_projects/ariane && npx vitest run packages/core/scripts/validate-cssprop-defaults.test.js`
Expected: FAIL — `extractDarkThemeTokens is not a function` (ou `is not exported`).

- [ ] **Step 3: Implémenter `extractDarkThemeTokens`**

Dans `packages/core/scripts/validate-cssprop-defaults.js`, ajouter après la fonction `extractThemeTokens` existante :

```js
/**
 * Parse un fichier CSS de thème et retourne une map nom de token → valeur nettoyée,
 * pour la portion du fichier qui suit le début des surcharges dark mode uniquement
 * (`:root[data-theme='dark']` ou `@media (prefers-color-scheme: dark)`). Retourne une
 * map vide si le fichier ne déclare aucune surcharge dark.
 *
 * @param {string} css
 * @returns {Map<string, string>}
 */
export function extractDarkThemeTokens(css) {
    const darkStart = css.search(DARK_OVERRIDE_RE);
    if (darkStart === -1) return new Map();
    const darkCss = css.slice(darkStart);

    const tokens = new Map();
    TOKEN_RE.lastIndex = 0;
    let match;
    while ((match = TOKEN_RE.exec(darkCss)) !== null) {
        const name = match[1].trim();
        const value = match[2].split('/*')[0].trim().replace(/\s+/g, ' ');
        tokens.set(name, value);
    }
    return tokens;
}
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `cd /Users/jon/Code/Active_projects/ariane && npx vitest run packages/core/scripts/validate-cssprop-defaults.test.js`
Expected: PASS (tous les tests, y compris les 4 nouveaux et les existants inchangés).

- [ ] **Step 5: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add packages/core/scripts/validate-cssprop-defaults.js packages/core/scripts/validate-cssprop-defaults.test.js
git commit -m "feat(core): ajoute extractDarkThemeTokens pour le configurateur de thème (#120)"
```

---

### Task 2: `detectNonColorKind` — inférence de type de contrôle

**Files:**

- Create: `apps/docs/src/utils/infer-control.ts`
- Test: `apps/docs/src/utils/infer-control.test.ts`

**Interfaces:**

- Produces: `type NonColorControlKind = 'dimension' | 'select' | 'text'`, `detectNonColorKind(value: string): NonColorControlKind`. La détection couleur se fait en amont (Task 3) via `resolveColor`/`isColor` de `parse-tokens.ts`, qui a besoin de la map complète des tokens pour suivre les `var()` — cette fonction ne gère que le cas où la valeur n'est **pas** une couleur.

- [ ] **Step 1: Écrire les tests**

Créer `apps/docs/src/utils/infer-control.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { detectNonColorKind } from './infer-control.js';

// --- detectNonColorKind ------------------------------------------------------

describe('detectNonColorKind', () => {
    it('reconnait une dimension en rem', () => {
        expect(detectNonColorKind('0.75rem')).toBe('dimension');
    });

    it('reconnait une dimension en px', () => {
        expect(detectNonColorKind('1px')).toBe('dimension');
    });

    it('reconnait une dimension negative', () => {
        expect(detectNonColorKind('-0.5em')).toBe('dimension');
    });

    it('reconnait un pourcentage', () => {
        expect(detectNonColorKind('100%')).toBe('dimension');
    });

    it('reconnait un mot-cle simple comme select', () => {
        expect(detectNonColorKind('solid')).toBe('select');
    });

    it('reconnait un mot-cle avec tiret comme select', () => {
        expect(detectNonColorKind('space-between')).toBe('select');
    });

    it('tombe en text pour une valeur composee (calc)', () => {
        expect(detectNonColorKind('calc(100% - 1rem)')).toBe('text');
    });

    it('tombe en text pour une reference var() non resolue', () => {
        expect(detectNonColorKind('var(--ar-panel-max-width)')).toBe('text');
    });

    it('tombe en text pour une valeur multi-tokens (box-shadow)', () => {
        expect(detectNonColorKind('0 1px 2px rgba(0,0,0,0.1)')).toBe('text');
    });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `cd /Users/jon/Code/Active_projects/ariane && npx vitest run apps/docs/src/utils/infer-control.test.ts`
Expected: FAIL — le module `./infer-control.js` n'existe pas.

- [ ] **Step 3: Implémenter `detectNonColorKind`**

Créer `apps/docs/src/utils/infer-control.ts` :

```ts
/**
 * infer-control.ts
 *
 * Infère le type de contrôle UI le plus adapté pour éditer une valeur CSS brute
 * qui n'est pas une couleur (la détection couleur se fait en amont via
 * resolveColor/isColor de parse-tokens.ts, qui suit les var() jusqu'à une valeur
 * concrète — cette fonction ne voit que le cas restant).
 */

export type NonColorControlKind = 'dimension' | 'select' | 'text';

const DIMENSION_RE = /^-?\d*\.?\d+(rem|em|px|%|ms|s|vh|vw)$/;
const KEYWORD_RE = /^[a-z][a-z-]*$/i;

export function detectNonColorKind(value: string): NonColorControlKind {
    if (DIMENSION_RE.test(value)) return 'dimension';
    if (KEYWORD_RE.test(value)) return 'select';
    return 'text';
}
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `cd /Users/jon/Code/Active_projects/ariane && npx vitest run apps/docs/src/utils/infer-control.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add apps/docs/src/utils/infer-control.ts apps/docs/src/utils/infer-control.test.ts
git commit -m "feat(docs): ajoute detectNonColorKind pour le configurateur de thème (#120)"
```

---

### Task 3: `build-theme-manifest.ts` — fusion CEM + default.css

**Files:**

- Create: `apps/docs/src/utils/build-theme-manifest.ts`
- Test: `apps/docs/src/utils/build-theme-manifest.test.ts`

**Interfaces:**

- Consumes: `extractThemeTokens`, `extractDarkThemeTokens` (Task 1, import relatif cross-package `../../../../packages/core/scripts/validate-cssprop-defaults.js`) ; `parsePalette`, `buildTokenMap`, `isColor`, `resolveColor` de `./parse-tokens.ts` (existants, inchangés) ; `detectNonColorKind` de `./infer-control.ts` (Task 2) ; `getCustomElements`, `type CemDeclaration` de `./cem-types.ts` (existant, inchangé).
- Produces:
    - `interface ThemeToken { name: string; group: 'global' | string; category?: string; description: string; control: 'color' | 'dimension' | 'select' | 'text'; light?: string; dark?: string; options?: string[]; }`
    - `interface ThemeComponentGroup { tagName: string; label: string; tokens: ThemeToken[]; }`
    - `interface ThemeManifest { palette: PaletteHue[]; globalTokens: ThemeToken[]; componentGroups: ThemeComponentGroup[]; }`
    - `buildThemeManifest(css: string, manifest: unknown, mdxTitleByTag: Record<string, string>): ThemeManifest`
    - `buildComponentThemeTokens(lightTokens: Map<string, string>, darkTokens: Map<string, string>, tokenMap: Map<string, string>, manifest: unknown, mdxTitleByTag: Record<string, string>): ThemeComponentGroup[]` (exportée séparément pour être testable indépendamment)
    - `resolveTokenControl(value: string | undefined, tokenMap: Map<string, string>): ThemeToken['control']` (exportée pour test direct)

- [ ] **Step 1: Écrire les tests**

Créer `apps/docs/src/utils/build-theme-manifest.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import {
    buildComponentThemeTokens,
    buildThemeManifest,
    resolveTokenControl,
} from './build-theme-manifest.js';

const FAKE_CSS = `
    @layer ariane.theme {
        :root {
            --ar-color-info-bg: #eaecfb /* oklch(94.60% 0.020 279.87) */;
            --ar-focus-ring-color: #434fa7;
            --ar-spacing-sm: 0.5rem;
            --ar-alert-padding: 1rem;
            --ar-alert-border-style: solid;
            --ar-alert-info-bg: var(--ar-color-info-bg);
            --ar-alert-info-border: var(--ar-color-info-bg);
            --ar-dropdown-min-width: 10rem;
        }

        :root[data-theme='dark'] {
            --ar-alert-info-border: #283276;
            --ar-alert-border-style: dashed;
        }
    }
`;

function fakeManifest(declarations: Array<Record<string, unknown>>) {
    return { modules: [{ declarations }] };
}

// --- resolveTokenControl ------------------------------------------------------

describe('resolveTokenControl', () => {
    const tokenMap = new Map([
        ['--ar-color-info-bg', '#eaecfb'],
        ['--ar-alert-info-bg', 'var(--ar-color-info-bg)'],
    ]);

    it("retourne text quand aucune valeur n'est fournie", () => {
        expect(resolveTokenControl(undefined, tokenMap)).toBe('text');
    });

    it('reconnait une couleur litterale', () => {
        expect(resolveTokenControl('#171717', tokenMap)).toBe('color');
    });

    it('reconnait une couleur derriere une reference var() resolue', () => {
        expect(resolveTokenControl('var(--ar-alert-info-bg)', tokenMap)).toBe('color');
    });

    it('reconnait une dimension', () => {
        expect(resolveTokenControl('0.75rem', tokenMap)).toBe('dimension');
    });

    it('reconnait un mot-cle comme select', () => {
        expect(resolveTokenControl('solid', tokenMap)).toBe('select');
    });
});

// --- buildComponentThemeTokens ------------------------------------------------

describe('buildComponentThemeTokens', () => {
    it('regroupe les tokens par composant depuis les cssProperties du manifeste CEM', () => {
        const manifest = fakeManifest([
            {
                kind: 'class',
                customElement: true,
                tagName: 'ar-alert',
                name: 'ArAlert',
                cssProperties: [
                    { name: '--ar-alert-padding', description: 'Marge interne.' },
                    { name: '--ar-alert-info-bg', description: 'Fond info.' },
                ],
            },
        ]);
        const lightTokens = new Map([
            ['--ar-alert-padding', '1rem'],
            ['--ar-alert-info-bg', 'var(--ar-color-info-bg)'],
        ]);
        const darkTokens = new Map<string, string>();
        const tokenMap = new Map([
            ['--ar-color-info-bg', '#eaecfb'],
            ['--ar-alert-info-bg', 'var(--ar-color-info-bg)'],
        ]);

        const groups = buildComponentThemeTokens(lightTokens, darkTokens, tokenMap, manifest, {
            'ar-alert': 'Alerte',
        });

        expect(groups).toHaveLength(1);
        expect(groups[0].tagName).toBe('ar-alert');
        expect(groups[0].label).toBe('Alerte');
        expect(groups[0].tokens).toHaveLength(2);

        const padding = groups[0].tokens.find((t) => t.name === '--ar-alert-padding');
        expect(padding?.control).toBe('dimension');
        expect(padding?.light).toBe('1rem');

        const bg = groups[0].tokens.find((t) => t.name === '--ar-alert-info-bg');
        expect(bg?.control).toBe('color');
    });

    it('affiche un token documente sans valeur dans default.css, sans planter', () => {
        const manifest = fakeManifest([
            {
                kind: 'class',
                customElement: true,
                tagName: 'ar-alert',
                name: 'ArAlert',
                cssProperties: [{ name: '--ar-alert-close-shadow', description: 'Ombre.' }],
            },
        ]);
        const groups = buildComponentThemeTokens(new Map(), new Map(), new Map(), manifest, {});
        expect(groups[0].tokens[0].light).toBeUndefined();
        expect(groups[0].tokens[0].control).toBe('text');
    });

    it('ignore les composants sans cssProperties', () => {
        const manifest = fakeManifest([
            {
                kind: 'class',
                customElement: true,
                tagName: 'ar-icon',
                name: 'ArIcon',
                cssProperties: [],
            },
        ]);
        const groups = buildComponentThemeTokens(new Map(), new Map(), new Map(), manifest, {});
        expect(groups).toHaveLength(0);
    });

    it('collecte les options select depuis les valeurs claire et sombre', () => {
        const manifest = fakeManifest([
            {
                kind: 'class',
                customElement: true,
                tagName: 'ar-alert',
                name: 'ArAlert',
                cssProperties: [{ name: '--ar-alert-border-style' }],
            },
        ]);
        const groups = buildComponentThemeTokens(
            new Map([['--ar-alert-border-style', 'solid']]),
            new Map([['--ar-alert-border-style', 'dashed']]),
            new Map(),
            manifest,
            {},
        );
        expect(groups[0].tokens[0].options).toEqual(['solid', 'dashed']);
    });
});

// --- buildThemeManifest --------------------------------------------------------

describe('buildThemeManifest', () => {
    it('separe les tokens globaux des tokens de composant', () => {
        const manifest = fakeManifest([
            {
                kind: 'class',
                customElement: true,
                tagName: 'ar-alert',
                name: 'ArAlert',
                cssProperties: [
                    { name: '--ar-alert-padding' },
                    { name: '--ar-alert-border-style' },
                    { name: '--ar-alert-info-bg' },
                    { name: '--ar-alert-info-border' },
                ],
            },
        ]);
        const result = buildThemeManifest(FAKE_CSS, manifest, { 'ar-alert': 'Alerte' });

        const globalNames = result.globalTokens.map((t) => t.name);
        expect(globalNames).toContain('--ar-focus-ring-color');
        expect(globalNames).toContain('--ar-spacing-sm');
        expect(globalNames).not.toContain('--ar-alert-padding');
        expect(globalNames).not.toContain('--ar-color-info-bg'); // palette brute exclue

        expect(result.componentGroups).toHaveLength(1);
        const dropdownToken = result.globalTokens.find((t) => t.name === '--ar-dropdown-min-width');
        expect(dropdownToken).toBeUndefined(); // --ar-dropdown-* n'est dans aucun cssProperties du fake manifest, donc ni global ni composant ici — non fabriqué depuis le vide
    });

    it('applique la valeur dark quand elle existe pour un token de composant', () => {
        const manifest = fakeManifest([
            {
                kind: 'class',
                customElement: true,
                tagName: 'ar-alert',
                name: 'ArAlert',
                cssProperties: [{ name: '--ar-alert-info-border' }],
            },
        ]);
        const result = buildThemeManifest(FAKE_CSS, manifest, {});
        const token = result.componentGroups[0].tokens[0];
        expect(token.light).toBe('var(--ar-color-info-bg)');
        expect(token.dark).toBe('#283276');
    });

    it('inclut la palette brute separement', () => {
        const manifest = fakeManifest([]);
        const result = buildThemeManifest(FAKE_CSS, manifest, {});
        expect(result.palette.length).toBeGreaterThan(0);
    });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `cd /Users/jon/Code/Active_projects/ariane && npx vitest run apps/docs/src/utils/build-theme-manifest.test.ts`
Expected: FAIL — le module `./build-theme-manifest.js` n'existe pas.

- [ ] **Step 3: Implémenter `build-theme-manifest.ts`**

Créer `apps/docs/src/utils/build-theme-manifest.ts` :

```ts
/**
 * build-theme-manifest.ts
 *
 * Fusionne le manifeste CEM (cssProperties/@cssprop — liste maîtresse des tokens
 * par composant) avec les valeurs claire/sombre extraites de default.css, pour
 * produire le manifeste consommé par la page de personnalisation (#120).
 *
 * Un @cssprop documenté sans valeur dans default.css est quand même inclus (avec
 * light/dark absents) — c'est le trou que validateCssPropertyCoverage (côté core)
 * ne détecte pas, puisqu'elle ne vérifie que le sens inverse (token présent dans
 * default.css sans @cssprop).
 */

import {
    extractThemeTokens,
    extractDarkThemeTokens,
    // @ts-expect-error -- module JS sans types, cf. packages/core/scripts (dev-only, hors exports npm)
} from '../../../../packages/core/scripts/validate-cssprop-defaults.js';
import { buildTokenMap, isColor, parsePalette, parseTokens, resolveColor } from './parse-tokens.ts';
import type { PaletteHue } from './parse-tokens.ts';
import { detectNonColorKind } from './infer-control.ts';
import { getCustomElements } from './cem-types.ts';

export interface ThemeToken {
    name: string;
    group: 'global' | string;
    category?: string;
    description: string;
    control: 'color' | 'dimension' | 'select' | 'text';
    light?: string;
    dark?: string;
    options?: string[];
}

export interface ThemeComponentGroup {
    tagName: string;
    label: string;
    tokens: ThemeToken[];
}

export interface ThemeManifest {
    palette: PaletteHue[];
    globalTokens: ThemeToken[];
    componentGroups: ThemeComponentGroup[];
}

export function resolveTokenControl(
    value: string | undefined,
    tokenMap: Map<string, string>,
): ThemeToken['control'] {
    if (!value) return 'text';
    const resolved = resolveColor(value, tokenMap) ?? (isColor(value) ? value : undefined);
    if (resolved) return 'color';
    return detectNonColorKind(value);
}

function selectOptions(light: string | undefined, dark: string | undefined): string[] | undefined {
    const values = [light, dark].filter((v): v is string => Boolean(v));
    return values.length > 0 ? [...new Set(values)] : undefined;
}

export function buildComponentThemeTokens(
    lightTokens: Map<string, string>,
    darkTokens: Map<string, string>,
    tokenMap: Map<string, string>,
    manifest: unknown,
    mdxTitleByTag: Record<string, string>,
): ThemeComponentGroup[] {
    const components = getCustomElements(manifest);
    const groups: ThemeComponentGroup[] = [];

    for (const component of components) {
        const cssProperties = component.cssProperties ?? [];
        if (cssProperties.length === 0) continue;

        const tokens: ThemeToken[] = cssProperties.map((prop) => {
            const light = lightTokens.get(prop.name);
            const dark = darkTokens.get(prop.name);
            const control = resolveTokenControl(light ?? dark, tokenMap);

            return {
                name: prop.name,
                group: component.tagName as string,
                description: prop.description ?? '',
                control,
                light,
                dark,
                options: control === 'select' ? selectOptions(light, dark) : undefined,
            };
        });

        groups.push({
            tagName: component.tagName as string,
            label: mdxTitleByTag[component.tagName as string] ?? component.name,
            tokens,
        });
    }

    return groups;
}

export function buildThemeManifest(
    css: string,
    manifest: unknown,
    mdxTitleByTag: Record<string, string>,
): ThemeManifest {
    const lightTokens: Map<string, string> = extractThemeTokens(css);
    const darkTokens: Map<string, string> = extractDarkThemeTokens(css);
    const tokenMap = buildTokenMap(css);

    const componentGroups = buildComponentThemeTokens(
        lightTokens,
        darkTokens,
        tokenMap,
        manifest,
        mdxTitleByTag,
    );
    const ownedNames = new Set(componentGroups.flatMap((g) => g.tokens.map((t) => t.name)));

    // categoryByName réutilise parseTokens uniquement pour le libellé de catégorie
    // (Interaction, Typographie...) et pour identifier/exclure la palette brute —
    // pas pour les valeurs claire/sombre elles-mêmes (parseTokens ne les sépare pas).
    const categoryByName = new Map<string, string>();
    for (const category of parseTokens(css)) {
        if (category.label === 'Palette brute') continue;
        for (const token of category.tokens) categoryByName.set(token.name, category.label);
    }

    const globalTokens: ThemeToken[] = [];
    for (const [name, category] of categoryByName) {
        if (ownedNames.has(name)) continue;
        const light = lightTokens.get(name);
        const dark = darkTokens.get(name);
        const control = resolveTokenControl(light ?? dark, tokenMap);

        globalTokens.push({
            name,
            group: 'global',
            category,
            description: category,
            control,
            light,
            dark,
            options: control === 'select' ? selectOptions(light, dark) : undefined,
        });
    }

    return {
        palette: parsePalette(css),
        globalTokens,
        componentGroups,
    };
}
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `cd /Users/jon/Code/Active_projects/ariane && npx vitest run apps/docs/src/utils/build-theme-manifest.test.ts`
Expected: PASS (10 tests). Si le test `'ignore les composants sans cssProperties'` échoue à cause d'un filtre différent dans `getCustomElements` (il filtre déjà `kind === 'class' && customElement === true` en amont), vérifier que le fixture `fakeManifest` inclut bien ces deux champs — sinon `getCustomElements` retournera un tableau vide et le test passera quand même (0 groupe), ce qui est le résultat attendu.

- [ ] **Step 5: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add apps/docs/src/utils/build-theme-manifest.ts apps/docs/src/utils/build-theme-manifest.test.ts
git commit -m "feat(docs): ajoute build-theme-manifest, fusion CEM + default.css (#120)"
```

---

### Task 4: `theme-config-storage.ts` — persistance des overrides

**Files:**

- Create: `apps/docs/src/utils/theme-config-storage.ts`
- Test: `apps/docs/src/utils/theme-config-storage.test.ts`

**Interfaces:**

- Produces: `interface TokenOverride { light?: string; dark?: string; }`, `const THEME_STORAGE_KEY = 'ariane-theme-config-v1'`, `serializeOverrides(overrides: Map<string, TokenOverride>): string`, `parseStoredOverrides(json: string): Map<string, TokenOverride>`, `loadOverrides(): Map<string, TokenOverride>`, `saveOverrides(overrides: Map<string, TokenOverride>): void`, `clearOverrides(): void`.

- [ ] **Step 1: Écrire les tests (fonctions pures uniquement — `loadOverrides`/`saveOverrides`/`clearOverrides` touchent `window.localStorage`, non testables sous `environment: 'node'`, vérifiées manuellement en Task 11)**

Créer `apps/docs/src/utils/theme-config-storage.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { parseStoredOverrides, serializeOverrides } from './theme-config-storage.js';
import type { TokenOverride } from './theme-config-storage.js';

// --- serializeOverrides / parseStoredOverrides --------------------------------

describe('serializeOverrides et parseStoredOverrides', () => {
    it('fait un aller-retour sans perte', () => {
        const overrides = new Map<string, TokenOverride>([
            ['--ar-alert-padding', { light: '1.25rem' }],
            ['--ar-alert-info-border', { light: '#ffffff', dark: '#000000' }],
        ]);
        const json = serializeOverrides(overrides);
        const parsed = parseStoredOverrides(json);
        expect(parsed).toEqual(overrides);
    });

    it('serialise une map vide en objet vide', () => {
        expect(serializeOverrides(new Map())).toBe('{}');
    });

    it('retourne une map vide pour un JSON invalide', () => {
        expect(parseStoredOverrides("{ ceci n'est pas du json").size).toBe(0);
    });

    it("retourne une map vide pour un JSON valide mais qui n'est pas un objet (tableau)", () => {
        expect(parseStoredOverrides('[1, 2, 3]').size).toBe(0);
    });

    it('retourne une map vide pour la chaine "null"', () => {
        expect(parseStoredOverrides('null').size).toBe(0);
    });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `cd /Users/jon/Code/Active_projects/ariane && npx vitest run apps/docs/src/utils/theme-config-storage.test.ts`
Expected: FAIL — le module `./theme-config-storage.js` n'existe pas.

- [ ] **Step 3: Implémenter `theme-config-storage.ts`**

Créer `apps/docs/src/utils/theme-config-storage.ts` :

```ts
/**
 * theme-config-storage.ts
 *
 * Sérialisation et persistance localStorage des overrides du configurateur de
 * thème (#120). Clé versionnée : une version stockée qui ne correspond pas au
 * schéma attendu (structure future incompatible) est simplement ignorée, sans
 * migration automatique.
 */

export interface TokenOverride {
    light?: string;
    dark?: string;
}

export const THEME_STORAGE_KEY = 'ariane-theme-config-v1';

export function serializeOverrides(overrides: Map<string, TokenOverride>): string {
    return JSON.stringify(Object.fromEntries(overrides));
}

export function parseStoredOverrides(json: string): Map<string, TokenOverride> {
    try {
        const parsed: unknown = JSON.parse(json);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return new Map();
        return new Map(Object.entries(parsed as Record<string, TokenOverride>));
    } catch {
        return new Map();
    }
}

/** Dégradation silencieuse si localStorage est indisponible (navigation privée stricte, quota dépassé). */
export function loadOverrides(): Map<string, TokenOverride> {
    try {
        const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
        return raw ? parseStoredOverrides(raw) : new Map();
    } catch {
        return new Map();
    }
}

export function saveOverrides(overrides: Map<string, TokenOverride>): void {
    try {
        window.localStorage.setItem(THEME_STORAGE_KEY, serializeOverrides(overrides));
    } catch {
        // localStorage indisponible — l'édition reste fonctionnelle en mémoire pour la session
    }
}

export function clearOverrides(): void {
    try {
        window.localStorage.removeItem(THEME_STORAGE_KEY);
    } catch {
        // idem
    }
}
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `cd /Users/jon/Code/Active_projects/ariane && npx vitest run apps/docs/src/utils/theme-config-storage.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add apps/docs/src/utils/theme-config-storage.ts apps/docs/src/utils/theme-config-storage.test.ts
git commit -m "feat(docs): ajoute la persistance localStorage du configurateur de thème (#120)"
```

---

### Task 5: `export-theme-css.ts` — génération du fichier exporté

**Files:**

- Create: `apps/docs/src/utils/export-theme-css.ts`
- Test: `apps/docs/src/utils/export-theme-css.test.ts`

**Interfaces:**

- Consumes: `type ThemeManifest`, `type ThemeToken` de `./build-theme-manifest.ts` (Task 3) ; `type TokenOverride` de `./theme-config-storage.ts` (Task 4).
- Produces: `buildThemeCss(manifest: ThemeManifest, overrides: Map<string, TokenOverride>): string`.

- [ ] **Step 1: Écrire les tests**

Créer `apps/docs/src/utils/export-theme-css.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { buildThemeCss } from './export-theme-css.js';
import type { ThemeManifest } from './build-theme-manifest.js';
import type { TokenOverride } from './theme-config-storage.js';

function manifestFixture(): ThemeManifest {
    return {
        palette: [],
        globalTokens: [
            {
                name: '--ar-spacing-sm',
                group: 'global',
                category: 'Espacement & Forme',
                description: 'Espacement & Forme',
                control: 'dimension',
                light: '0.5rem',
            },
        ],
        componentGroups: [
            {
                tagName: 'ar-alert',
                label: 'Alerte',
                tokens: [
                    {
                        name: '--ar-alert-padding',
                        group: 'ar-alert',
                        description: 'Marge interne.',
                        control: 'dimension',
                        light: '1rem',
                    },
                    {
                        name: '--ar-alert-info-border',
                        group: 'ar-alert',
                        description: 'Bordure info.',
                        control: 'color',
                        light: '#eaecfb',
                        dark: '#283276',
                    },
                    {
                        name: '--ar-alert-close-shadow',
                        group: 'ar-alert',
                        description: 'Ombre (non defini dans default.css).',
                        control: 'text',
                    },
                ],
            },
        ],
    };
}

// --- buildThemeCss --------------------------------------------------------------

describe('buildThemeCss', () => {
    it('genere un bloc :root avec toutes les valeurs claires connues', () => {
        const css = buildThemeCss(manifestFixture(), new Map());
        expect(css).toContain(':root {');
        expect(css).toContain('--ar-spacing-sm: 0.5rem;');
        expect(css).toContain('--ar-alert-padding: 1rem;');
    });

    it('genere un bloc dark uniquement pour les tokens qui ont une valeur sombre', () => {
        const css = buildThemeCss(manifestFixture(), new Map());
        expect(css).toContain("[data-theme='dark'] {");
        expect(css).toContain('--ar-alert-info-border: #283276;');
        expect(css).not.toMatch(/dark'\] \{[^}]*--ar-alert-padding/s);
    });

    it('omet un token sans valeur claire ni sombre et sans override', () => {
        const css = buildThemeCss(manifestFixture(), new Map());
        expect(css).not.toContain('--ar-alert-close-shadow');
    });

    it('un override remplace la valeur par defaut de default.css', () => {
        const overrides = new Map<string, TokenOverride>([
            ['--ar-alert-padding', { light: '1.5rem' }],
        ]);
        const css = buildThemeCss(manifestFixture(), overrides);
        expect(css).toContain('--ar-alert-padding: 1.5rem;');
        expect(css).not.toContain('--ar-alert-padding: 1rem;');
    });

    it("un override peut fournir une valeur pour un token qui n'en avait aucune", () => {
        const overrides = new Map<string, TokenOverride>([
            ['--ar-alert-close-shadow', { light: '0 1px 2px rgba(0,0,0,0.2)' }],
        ]);
        const css = buildThemeCss(manifestFixture(), overrides);
        expect(css).toContain('--ar-alert-close-shadow: 0 1px 2px rgba(0,0,0,0.2);');
    });

    it("n'ajoute pas de bloc dark si aucun token n'a de valeur sombre", () => {
        const manifest = manifestFixture();
        manifest.componentGroups[0].tokens = manifest.componentGroups[0].tokens.filter(
            (t) => t.name !== '--ar-alert-info-border',
        );
        const css = buildThemeCss(manifest, new Map());
        expect(css).not.toContain("data-theme='dark'");
    });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `cd /Users/jon/Code/Active_projects/ariane && npx vitest run apps/docs/src/utils/export-theme-css.test.ts`
Expected: FAIL — le module `./export-theme-css.js` n'existe pas.

- [ ] **Step 3: Implémenter `export-theme-css.ts`**

Créer `apps/docs/src/utils/export-theme-css.ts` :

```ts
/**
 * export-theme-css.ts
 *
 * Génère le fichier .css complet exporté par le configurateur de thème (#120),
 * en fusionnant les valeurs de default.css avec les overrides utilisateur.
 * Fonction pure — aucune dépendance au DOM, testable directement.
 */

import type { ThemeManifest, ThemeToken } from './build-theme-manifest.ts';
import type { TokenOverride } from './theme-config-storage.ts';

function allTokens(manifest: ThemeManifest): ThemeToken[] {
    return [...manifest.globalTokens, ...manifest.componentGroups.flatMap((g) => g.tokens)];
}

function formatBlock(entries: [string, string][]): string {
    return entries.map(([name, value]) => `    ${name}: ${value};`).join('\n');
}

export function buildThemeCss(
    manifest: ThemeManifest,
    overrides: Map<string, TokenOverride>,
): string {
    const lightEntries: [string, string][] = [];
    const darkEntries: [string, string][] = [];

    for (const token of allTokens(manifest)) {
        const override = overrides.get(token.name);
        const light = override?.light ?? token.light;
        const dark = override?.dark ?? token.dark;
        if (light) lightEntries.push([token.name, light]);
        if (dark) darkEntries.push([token.name, dark]);
    }

    const lightBlock = `:root {\n${formatBlock(lightEntries)}\n}`;
    const darkBlock =
        darkEntries.length > 0
            ? `\n\n:root[data-theme='dark'] {\n${formatBlock(darkEntries)}\n}`
            : '';

    return `${lightBlock}${darkBlock}\n`;
}
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `cd /Users/jon/Code/Active_projects/ariane && npx vitest run apps/docs/src/utils/export-theme-css.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add apps/docs/src/utils/export-theme-css.ts apps/docs/src/utils/export-theme-css.test.ts
git commit -m "feat(docs): ajoute la generation du fichier CSS exporte (#120)"
```

---

### Task 6: Extraction de `playground-html.ts` (préparation de la preview live)

**Files:**

- Create: `apps/docs/src/utils/playground-html.ts`
- Test: `apps/docs/src/utils/playground-html.test.ts`
- Modify: `apps/docs/src/pages/components/[slug].astro:44-58`

**Interfaces:**

- Produces: `interface PlaygroundVariant { name: string; label?: string; description?: string; html: string; }`, `buildPlaygroundHtml(variants: PlaygroundVariant[], playgroundVariantName?: string): string`.

- [ ] **Step 1: Écrire les tests**

Créer `apps/docs/src/utils/playground-html.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { buildPlaygroundHtml } from './playground-html.js';

const variants = [
    { name: 'default', html: '<ar-alert id="foo">Texte</ar-alert>' },
    {
        name: 'with-dialog',
        html: '<button data-ar-dialog-open="foo">Ouvrir</button><ar-dialog id="foo"></ar-dialog>',
    },
];

// --- buildPlaygroundHtml --------------------------------------------------------

describe('buildPlaygroundHtml', () => {
    it("utilise la premiere variante quand aucun nom n'est fourni", () => {
        const html = buildPlaygroundHtml(variants);
        expect(html).toContain('pg-foo');
    });

    it('selectionne la variante nommee quand elle existe', () => {
        const html = buildPlaygroundHtml(variants, 'with-dialog');
        expect(html).toContain('data-ar-dialog-open="pg-foo"');
    });

    it('prefixe les id= pour eviter les collisions', () => {
        const html = buildPlaygroundHtml(variants, 'default');
        expect(html).toContain('id="pg-foo"');
        expect(html).not.toContain('id="foo"');
    });

    it('retourne une chaine vide si la liste de variantes est vide', () => {
        expect(buildPlaygroundHtml([])).toBe('');
    });

    it("retourne une chaine vide si le nom de variante demande n'existe pas", () => {
        expect(buildPlaygroundHtml(variants, 'introuvable')).toBe('');
    });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `cd /Users/jon/Code/Active_projects/ariane && npx vitest run apps/docs/src/utils/playground-html.test.ts`
Expected: FAIL — le module `./playground-html.js` n'existe pas.

- [ ] **Step 3: Implémenter `playground-html.ts`**

Créer `apps/docs/src/utils/playground-html.ts` :

```ts
/**
 * playground-html.ts
 *
 * Sélectionne une variante de démo et préfixe ses id= (et attributs qui y
 * réfèrent) pour éviter les collisions quand le même HTML de variante est
 * réutilisé comme preview ailleurs sur la page (playground du composant,
 * accordéon du configurateur de thème #120).
 */

export interface PlaygroundVariant {
    name: string;
    label?: string;
    description?: string;
    html: string;
}

export function buildPlaygroundHtml(
    variants: PlaygroundVariant[],
    playgroundVariantName?: string,
): string {
    const variant = playgroundVariantName
        ? variants.find((v) => v.name === playgroundVariantName)
        : variants[0];

    const rawHtml = variant?.html ?? '';
    return rawHtml
        .replace(/\bid="([\w-]+)"/g, 'id="pg-$1"')
        .replace(/\bdata-ar-dialog-open="([\w-]+)"/g, 'data-ar-dialog-open="pg-$1"')
        .replace(/\bfor="([\w-]+)"/g, 'for="pg-$1"')
        .replace(/\bgetElementById\((['"])([\w-]+)\1\)/g, "getElementById('pg-$2')");
}
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `cd /Users/jon/Code/Active_projects/ariane && npx vitest run apps/docs/src/utils/playground-html.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Refactorer `[slug].astro` pour utiliser `buildPlaygroundHtml`**

Dans `apps/docs/src/pages/components/[slug].astro`, remplacer les lignes 44-58 :

```ts
// ─── HTML initial du playground ───────────────────────────────────────────────

const playgroundVariantName = mdx?.data.playgroundTemplate;
const playgroundVariant = playgroundVariantName
    ? variants.find((v: { name: string }) => v.name === playgroundVariantName)
    : variants[0];

// Préfixe les id= et les data-*-open="id" du playground pour éviter les collisions
// avec les aperçus de variantes qui utilisent le même HTML (même IDs).
const rawPlaygroundHtml = playgroundVariant?.html ?? '';
const playgroundHtml = rawPlaygroundHtml
    .replace(/\bid="([\w-]+)"/g, 'id="pg-$1"')
    .replace(/\bdata-ar-dialog-open="([\w-]+)"/g, 'data-ar-dialog-open="pg-$1"')
    .replace(/\bfor="([\w-]+)"/g, 'for="pg-$1"')
    .replace(/\bgetElementById\((['"])([\w-]+)\1\)/g, "getElementById('pg-$2')");
```

par :

```ts
// ─── HTML initial du playground ───────────────────────────────────────────────

const playgroundHtml = buildPlaygroundHtml(variants, mdx?.data.playgroundTemplate);
```

Et ajouter l'import en tête de fichier (après l'import de `getSlug`) :

```ts
import { buildPlaygroundHtml } from '../../utils/playground-html.ts';
```

- [ ] **Step 6: Vérifier que le build docs passe toujours**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run build --workspace=@ariane-ui/docs`
Expected: build réussi, aucune régression sur les pages composant (le HTML généré doit être strictement identique — la logique n'a pas changé, juste déplacée).

- [ ] **Step 7: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add apps/docs/src/utils/playground-html.ts apps/docs/src/utils/playground-html.test.ts apps/docs/src/pages/components/\[slug\].astro
git commit -m "refactor(docs): extrait buildPlaygroundHtml pour reutilisation dans le configurateur de theme (#120)"
```

---

### Task 7: Navigation — retrait de "Fondations", ajout de "Personnalisation"

**Files:**

- Modify: `apps/docs/src/components/SiteNav.astro`
- Modify: `apps/docs/src/pages/getting-started/utilisation.astro:144`

**Interfaces:**

- Aucune nouvelle interface — modification de données statiques (`gettingStartedLinks`, `foundationsLinks`) et de rendu.

- [ ] **Step 1: Modifier `SiteNav.astro`**

Dans `apps/docs/src/components/SiteNav.astro`, remplacer (lignes 30-43) :

```ts
const gettingStartedLinks: NavLink[] = [
    { href: '/getting-started/quickstart', label: 'Démarrage rapide', ariaCurrent: undefined },
    { href: '/getting-started/utilisation', label: 'Utilisation', ariaCurrent: undefined },
].map((link) => ({
    ...link,
    ariaCurrent: currentPath === link.href ? ('page' as const) : undefined,
}));

const foundationsLinks: NavLink[] = [
    { href: '/foundations/tokens', label: 'Design Tokens', ariaCurrent: undefined },
].map((link) => ({
    ...link,
    ariaCurrent: currentPath === link.href ? ('page' as const) : undefined,
}));
```

par :

```ts
const gettingStartedLinks: NavLink[] = [
    { href: '/getting-started/quickstart', label: 'Démarrage rapide', ariaCurrent: undefined },
    { href: '/getting-started/utilisation', label: 'Utilisation', ariaCurrent: undefined },
    {
        href: '/getting-started/personnalisation',
        label: 'Personnalisation',
        ariaCurrent: undefined,
    },
].map((link) => ({
    ...link,
    ariaCurrent: currentPath === link.href ? ('page' as const) : undefined,
}));
```

Puis retirer entièrement la section "Fondations" du template (lignes 110-119) :

```astro
        <div class="nav-section">
            <h2>Fondations</h2>
            <ul class="nav-list">
                {foundationsLinks.map((link) => (
                    <li>
                        <a href={link.href} aria-current={link.ariaCurrent}>{link.label}</a>
                    </li>
                ))}
            </ul>
        </div>

```

(la section entière, y compris les lignes vides autour, est supprimée — le bloc "Composants" qui suit reste inchangé).

- [ ] **Step 2: Mettre à jour le lien dans `utilisation.astro`**

Dans `apps/docs/src/pages/getting-started/utilisation.astro:144`, remplacer :

```astro
                Consultez la page <a href="/foundations/tokens">Design Tokens</a> pour la liste
```

par :

```astro
                Consultez la page <a href="/getting-started/personnalisation">Personnalisation</a> pour la liste
```

- [ ] **Step 3: Vérifier qu'aucune référence à `/foundations/tokens` ne subsiste**

Run: `cd /Users/jon/Code/Active_projects/ariane && grep -rn "foundations/tokens\|foundationsLinks" apps/docs/src`
Expected: aucun résultat (les seules occurrences restantes seraient dans `apps/docs/src/pages/foundations/tokens.astro` lui-même, supprimé en Task 9).

- [ ] **Step 4: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add apps/docs/src/components/SiteNav.astro apps/docs/src/pages/getting-started/utilisation.astro
git commit -m "feat(docs): remplace la section Fondations par le lien Personnalisation (#120)"
```

---

### Task 8: `ThemeTokenControl.astro` — composant de contrôle réutilisable

**Files:**

- Create: `apps/docs/src/components/ThemeTokenControl.astro`

**Interfaces:**

- Consumes: `type ThemeToken` de `../utils/build-theme-manifest.ts` (Task 3).
- Produces: rendu HTML avec `data-token-name` (sur le conteneur) et `data-token-control` (sur l'input/select) — contrat consommé par le script client de la Task 10.

Pas de test unitaire pour ce fichier : c'est un composant de rendu pur sans logique (l'inférence de contrôle est déjà testée en Task 3), conforme à la convention du repo où les `.astro` ne sont pas couverts par Vitest (aucun `*.astro.test.*` existant dans `apps/docs`).

- [ ] **Step 1: Créer le composant**

Créer `apps/docs/src/components/ThemeTokenControl.astro` :

```astro
---
/**
 * ThemeTokenControl.astro
 *
 * Rend un contrôle d'édition pour un token de thème (#120), selon le type
 * inféré par build-theme-manifest.ts. `data-token-name` sur le conteneur et
 * `data-token-control` sur l'input/select sont le contrat consommé par le
 * script client de la page de personnalisation.
 */
import type { ThemeToken } from '../utils/build-theme-manifest.ts';

interface Props {
    token: ThemeToken;
}

const { token } = Astro.props;
const initial = token.light ?? token.dark ?? '';
const isHexColor = /^#[0-9a-fA-F]{6}$/.test(initial);
const controlId = `ctl-${token.name}`;
---

<div class="token-control" data-token-name={token.name}>
    <label class="token-label" for={controlId}>
        <code>{token.name}</code>
        {token.description && <span class="token-desc">{token.description}</span>}
        {!initial && <span class="token-unset">non défini dans default.css</span>}
    </label>

    {token.control === 'color' && (
        <div class="token-color-row">
            <input
                type="color"
                id={controlId}
                data-token-control
                data-control-kind="color"
                value={isHexColor ? initial : '#000000'}
            />
            <code class="token-raw-value">{initial || '—'}</code>
        </div>
    )}

    {token.control === 'dimension' && (
        <input
            type="text"
            id={controlId}
            data-token-control
            data-control-kind="dimension"
            value={initial}
            placeholder="ex: 0.75rem"
            pattern="^-?\d*\.?\d+(rem|em|px|%|ms|s|vh|vw)$"
        />
    )}

    {token.control === 'select' && (
        <select id={controlId} data-token-control data-control-kind="select">
            {(token.options ?? []).map((opt) => (
                <option value={opt} selected={opt === initial}>{opt}</option>
            ))}
        </select>
    )}

    {token.control === 'text' && (
        <input type="text" id={controlId} data-token-control data-control-kind="text" value={initial} />
    )}
</div>

<style>
    .token-control {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        padding: 0.6rem 0;
        border-bottom: 1px solid var(--doc-border);
    }

    .token-label {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 0.5rem;
        font-size: 0.8rem;
    }

    .token-label code {
        font-family: 'Fira Code', 'Cascadia Code', monospace;
        color: var(--doc-accent);
        background: var(--doc-accent-bg);
        padding: 0.1em 0.35em;
        border-radius: 0.25em;
    }

    .token-desc {
        color: var(--doc-text-muted);
    }

    .token-unset {
        color: var(--doc-text-muted);
        font-style: italic;
    }

    .token-color-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .token-raw-value {
        font-size: 0.75rem;
        color: var(--doc-text-muted);
    }

    input[type='text'],
    select {
        max-width: 20rem;
        padding: 0.35rem 0.5rem;
        border: 1px solid var(--doc-border);
        border-radius: 0.375rem;
        background: var(--doc-bg);
        color: var(--doc-text);
        font-size: 0.85rem;
    }
</style>
```

- [ ] **Step 2: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add apps/docs/src/components/ThemeTokenControl.astro
git commit -m "feat(docs): ajoute ThemeTokenControl, composant de controle de token (#120)"
```

---

### Task 9: Page `personnalisation.astro` — assemblage & suppression de `tokens.astro`

**Files:**

- Create: `apps/docs/src/pages/getting-started/personnalisation.astro`
- Delete: `apps/docs/src/pages/foundations/tokens.astro`

**Interfaces:**

- Consumes: `buildThemeManifest` (Task 3), `ThemeTokenControl` (Task 8), `buildPlaygroundHtml` (Task 6), `PaletteGrid.astro` (existant, inchangé), `getSlug` de `../../utils/tag-name.ts` (existant).

- [ ] **Step 1: Supprimer l'ancienne page**

```bash
cd /Users/jon/Code/Active_projects/ariane
git rm apps/docs/src/pages/foundations/tokens.astro
```

- [ ] **Step 2: Créer la nouvelle page**

Créer `apps/docs/src/pages/getting-started/personnalisation.astro` :

```astro
---
/**
 * personnalisation.astro
 *
 * Page "Personnalisation" (#120) — remplace /foundations/tokens.
 * Présente default.css comme un thème de démo éditable : section Global
 * (tokens sémantiques) + accordéon par composant (cssProperties/@cssprop),
 * preview live, export CSS complet. Toute la logique interactive vit dans le
 * <script> en fin de fichier (module Astro, pas de framework).
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getCollection } from 'astro:content';
import manifest from '@cem';
import Layout from '../../layouts/Layout.astro';
import TableOfContents from '../../components/TableOfContents.astro';
import PaletteGrid from '../../components/PaletteGrid.astro';
import ThemeTokenControl from '../../components/ThemeTokenControl.astro';
import { buildThemeManifest } from '../../utils/build-theme-manifest.ts';
import { buildPlaygroundHtml } from '../../utils/playground-html.ts';
import { getSlug } from '../../utils/tag-name.ts';

const themePath = resolve(process.cwd(), '../../packages/core/src/styles/themes/default.css');
const css = readFileSync(themePath, 'utf-8');

const mdxEntries = await getCollection('components');
const mdxTitleByTag = Object.fromEntries(
    mdxEntries.map((e) => [e.data.tagName, e.data.title]),
) as Record<string, string>;
const mdxByTag = Object.fromEntries(mdxEntries.map((e) => [e.data.tagName, e]));

const theme = buildThemeManifest(css, manifest, mdxTitleByTag);

// Regroupe les tokens globaux par catégorie pour l'affichage (même ordre que
// l'ancienne page /foundations/tokens, sans "Palette brute" ni "Tokens composants",
// déjà gérées séparément).
const GLOBAL_CATEGORY_ORDER = [
    'Interaction',
    'Texte & Surface',
    'États',
    'Focus',
    'Typographie',
    'Espacement & Forme',
];
const globalByCategory = GLOBAL_CATEGORY_ORDER.map((label) => ({
    label,
    tokens: theme.globalTokens.filter((t) => t.category === label),
})).filter((group) => group.tokens.length > 0);

const allStops = [...new Set(theme.palette.flatMap((h) => h.stops.map((s) => s.stop)))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
);

// Preview live par composant : réutilise le HTML de variante déjà généré pour
// le playground du composant (même mécanisme que [slug].astro).
function previewHtmlFor(tagName: string): string {
    const mdx = mdxByTag[tagName];
    const variants = mdx?.data.variants ?? [];
    return buildPlaygroundHtml(variants, mdx?.data.playgroundTemplate);
}

const tocEntries = [
    { id: 'global', label: 'Global', level: 1 as const },
    ...globalByCategory.map((g) => ({
        id: `global-${getSlug(g.label.toLowerCase().replace(/\s|&/g, '-'))}`,
        label: g.label,
        level: 2 as const,
    })),
    { id: 'composants', label: 'Par composant', level: 1 as const },
];
---

<Layout title="Personnalisation" currentPath="/getting-started/personnalisation" showToc={true}>
    <TableOfContents slot="toc" entries={tocEntries} />

    <div class="page-container">
        <div class="page-header">
            <h2 class="page-title">Personnalisation</h2>
            <p class="summary">
                <code>default.css</code> est un thème de démo fourni avec Ariane — pas les valeurs
                par défaut intrinsèques des composants (Ariane est headless). Personnalisez les
                tokens ci-dessous et exportez un fichier de thème CSS prêt à l'emploi.
            </p>
        </div>

        <ar-alert variant="info" style="margin-bottom: 1.5rem">
            <p style="margin: 0">
                Les valeurs ci-dessous viennent du thème de démo <code>default.css</code>. Les
                modifications sont conservées dans votre navigateur (non partagées, non envoyées à
                un serveur) et n'affectent que les aperçus de cette page.
            </p>
        </ar-alert>

        <div class="toolbar">
            <button type="button" id="reset-all-btn" data-reset-scope="all">
                Réinitialiser tout
            </button>
            <button type="button" id="export-theme-btn">Exporter le thème (.css)</button>
        </div>

        {/* ── Section Global ── */}
        <section id="global">
            <h3 class="section-title">Global</h3>
            <p class="section-desc">
                Couleurs, focus, typographie, espacement — tokens sémantiques transversaux.
            </p>

            <section id="palette-brute">
                <h4 class="subsection-title">Palette brute (lecture seule)</h4>
                <PaletteGrid hues={theme.palette} allStops={allStops} />
            </section>

            <div class="global-preview" data-preview-for="global">
                <ar-button variant="primary">Bouton</ar-button>
                <ar-alert variant="success" style="margin: 0">Exemple d'alerte</ar-alert>
            </div>

            {globalByCategory.map((group) => (
                <section id={`global-${getSlug(group.label.toLowerCase().replace(/\s|&/g, '-'))}`}>
                    <div class="section-header-row">
                        <h4 class="subsection-title">{group.label}</h4>
                        <button
                            type="button"
                            class="reset-btn"
                            data-reset-scope="global"
                            data-reset-category={group.label}
                        >
                            Réinitialiser
                        </button>
                    </div>
                    {group.tokens.map((token) => <ThemeTokenControl token={token} />)}
                </section>
            ))}
        </div>

        {/* ── Section par composant ── */}
        <section id="composants">
            <h3 class="section-title">Par composant</h3>
            <p class="section-desc">
                Tokens documentés (<code>@cssprop</code>) propres à chaque composant.
            </p>

            {theme.componentGroups.map((group) => (
                <details class="component-accordion">
                    <summary>
                        {group.label}
                        <button
                            type="button"
                            class="reset-btn"
                            data-reset-scope={group.tagName}
                        >
                            Réinitialiser
                        </button>
                    </summary>

                    <div class="component-preview" data-preview-for={group.tagName} set:html={previewHtmlFor(group.tagName)} />

                    {group.tokens.map((token) => <ThemeTokenControl token={token} />)}
                </details>
            ))}
        </section>
    </div>
</Layout>

<style>
    @import '../../styles/doc-prose.css';
    @import '../../styles/doc-table.css';

    .toolbar {
        display: flex;
        gap: 0.75rem;
        margin-bottom: 1.5rem;
    }

    .toolbar button,
    .reset-btn {
        padding: 0.45rem 0.9rem;
        border: 1px solid var(--doc-border);
        border-radius: 0.375rem;
        background: var(--doc-nav-bg);
        color: var(--doc-text);
        font-size: 0.8rem;
        cursor: pointer;
    }

    #export-theme-btn {
        background: var(--doc-accent);
        border-color: var(--doc-accent);
        color: var(--doc-bg);
        font-weight: 600;
    }

    .section-header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
    }

    .global-preview {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        margin: 1rem 0 1.5rem;
        border: 1px dashed var(--doc-border);
        border-radius: 0.5rem;
    }

    .component-accordion {
        border: 1px solid var(--doc-border);
        border-radius: 0.5rem;
        margin-bottom: 0.75rem;
        padding: 0 1rem;
    }

    .component-accordion summary {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.75rem 0;
        cursor: pointer;
        font-weight: 600;
        list-style: none;
    }

    .component-accordion summary::-webkit-details-marker { display: none; }

    .component-preview {
        padding: 1rem;
        margin-bottom: 0.75rem;
        border: 1px dashed var(--doc-border);
        border-radius: 0.5rem;
    }
</style>

<script>
    import { loadOverrides, saveOverrides } from '../../utils/theme-config-storage.ts';
    import { buildThemeCss } from '../../utils/export-theme-css.ts';
    import type { ThemeManifest } from '../../utils/build-theme-manifest.ts';

    declare global {
        interface Window {
            __arianeThemeManifest?: ThemeManifest;
        }
    }
</script>
```

**Remarque volontairement laissée pour la Task 10 :** ce fichier se termine ici avec un `<script>` incomplet — le manifeste doit être injecté en JSON et le script complet (lecture des overrides, application live, reset, export) est écrit dans la Task 10 pour isoler la logique interactive dans une étape dédiée et testable indépendamment de l'assemblage de la page.

- [ ] **Step 3: Vérifier que le build docs passe (page statique, sans encore le script interactif fonctionnel)**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run build --workspace=@ariane-ui/docs`
Expected: build réussi. Si erreur de type sur l'import `../../utils/theme-config-storage.ts`/`export-theme-css.ts` dans le `<script>` (Astro les traite comme modules bundlés par Vite), c'est attendu tant que la Task 10 n'a pas complété le script — dans ce cas, retirer temporairement l'import inutilisé `saveOverrides`/`buildThemeCss` de ce fichier avant de commit, ils seront réintroduits complets en Task 10. Le `<script>` final de cette étape peut se limiter à la déclaration de type `Window` si les imports posent un souci de build à ce stade intermédiaire.

- [ ] **Step 4: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add apps/docs/src/pages/getting-started/personnalisation.astro
git commit -m "feat(docs): ajoute la page Personnalisation, remplace foundations/tokens (#120)"
```

---

### Task 10: Script client — état, preview live, reset, export

**Files:**

- Modify: `apps/docs/src/pages/getting-started/personnalisation.astro` (bloc `<script>` en fin de fichier, Task 9)

**Interfaces:**

- Consumes: `loadOverrides`, `saveOverrides` de `../../utils/theme-config-storage.ts` (Task 4) ; `buildThemeCss` de `../../utils/export-theme-css.ts` (Task 5) ; `type ThemeManifest`, `type TokenOverride`.
- Contrat DOM consommé (posé en Task 8/9) : `[data-token-name]` (conteneur), `[data-token-control]` (input/select), `[data-preview-for]` (conteneur de preview), `#reset-all-btn` + `[data-reset-scope]` (boutons reset), `#export-theme-btn`.

- [ ] **Step 1: Injecter le manifeste en JSON dans la page**

Dans `apps/docs/src/pages/getting-started/personnalisation.astro`, juste avant la fermeture de `</Layout>`, ajouter :

```astro
    <script type="application/json" id="theme-manifest-data" set:html={JSON.stringify(theme)} />
```

- [ ] **Step 2: Remplacer le `<script>` de fin de fichier par la version complète**

Remplacer le bloc `<script>` placeholder de la Task 9 par :

```astro
<script>
    import { loadOverrides, saveOverrides } from '../../utils/theme-config-storage.ts';
    import { buildThemeCss } from '../../utils/export-theme-css.ts';
    import type { ThemeManifest } from '../../utils/build-theme-manifest.ts';
    import type { TokenOverride } from '../../utils/theme-config-storage.ts';

    const dataEl = document.getElementById('theme-manifest-data');
    const manifest: ThemeManifest = JSON.parse(dataEl?.textContent ?? 'null') ?? {
        palette: [],
        globalTokens: [],
        componentGroups: [],
    };

    const overrides = loadOverrides();

    function applyLive(name: string, value: string): void {
        document.querySelectorAll<HTMLElement>('[data-preview-for]').forEach((preview) => {
            preview.style.setProperty(name, value);
        });
    }

    function setOverride(name: string, value: string): void {
        const current: TokenOverride = overrides.get(name) ?? {};
        overrides.set(name, { ...current, light: value });
        saveOverrides(overrides);
        applyLive(name, value);
    }

    // Restaure les overrides déjà stockés au chargement, sur toutes les previews présentes
    for (const [name, override] of overrides) {
        if (override.light) applyLive(name, override.light);
    }

    document
        .querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-token-control]')
        .forEach((control) => {
            control.addEventListener('input', () => {
                const wrapper = control.closest<HTMLElement>('[data-token-name]');
                const name = wrapper?.dataset.tokenName;
                if (!name) return;
                setOverride(name, control.value);
            });
        });

    document
        .querySelectorAll<HTMLButtonElement>('[data-reset-scope]')
        .forEach((button) => {
            button.addEventListener('click', () => {
                const scope = button.dataset.resetScope;
                if (!scope) return;

                for (const name of [...overrides.keys()]) {
                    if (scope === 'all' || name.startsWith(`--${scope}-`)) {
                        overrides.delete(name);
                    }
                }
                saveOverrides(overrides);
                location.reload();
            });
        });

    document.getElementById('export-theme-btn')?.addEventListener('click', () => {
        const css = buildThemeCss(manifest, overrides);
        const blob = new Blob([css], { type: 'text/css' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'ariane-theme.css';
        link.click();
        URL.revokeObjectURL(url);
    });
</script>
```

Retirer aussi le bloc `declare global { interface Window ... }` de la Task 9 : il n'est plus nécessaire, le manifeste est maintenant lu depuis le JSON injecté plutôt que posé sur `window`.

- [ ] **Step 3: Build**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run build --workspace=@ariane-ui/docs`
Expected: build réussi, aucune erreur TypeScript dans le `<script>` (Astro type-check les scripts de module via `astro check` si configuré — sinon vérifier au minimum que le build Vite ne signale pas d'import cassé).

- [ ] **Step 4: Vérification manuelle du flux complet**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run dev --workspace=@ariane-ui/docs`

Ouvrir `http://localhost:<port>/getting-started/personnalisation` et vérifier :

1. La section Global affiche la palette brute (lecture seule) et les catégories de tokens éditables.
2. Modifier une couleur globale (ex. `--ar-focus-ring-color`) met à jour l'échantillon composite (`data-preview-for="global"`) en live.
3. Ouvrir l'accordéon d'un composant (ex. `ar-alert`) affiche sa preview et ses tokens ; modifier `--ar-alert-padding` met à jour la preview de ce composant en live.
4. Recharger la page : les modifications persistent (relues depuis `localStorage`).
5. Cliquer "Réinitialiser" sur la section `ar-alert` retire uniquement ses overrides (les overrides globaux restent).
6. Cliquer "Exporter le thème (.css)" télécharge un fichier `ariane-theme.css` contenant `:root { ... }` et, si des valeurs sombres existent, `:root[data-theme='dark'] { ... }`.
7. Cliquer "Réinitialiser tout" vide tous les overrides et recharge la page.

Documenter le résultat (pass/fail par point) dans le message de fin de tâche — pas d'automatisation E2E pour ce flux (cf. spec, absence de précédent Playwright pour de l'état interactif de ce type dans ce repo).

- [ ] **Step 5: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add apps/docs/src/pages/getting-started/personnalisation.astro
git commit -m "feat(docs): implemente le script client du configurateur de theme (#120)"
```

---

### Task 11: Vérification finale & nettoyage

**Files:** aucun nouveau — vérification transverse.

- [ ] **Step 1: Suite de tests complète**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run test`
Expected: tous les tests passent (core + docs), y compris les nouveaux fichiers des Tasks 1-6.

- [ ] **Step 2: Lint & typecheck**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run build --workspace=@ariane-ui/docs`
Expected: build réussi sans erreur.

- [ ] **Step 3: Recherche de références résiduelles à l'ancienne page**

Run: `cd /Users/jon/Code/Active_projects/ariane && grep -rn "foundations/tokens\|Design Tokens" apps/docs/src`
Expected: aucun résultat (hors éventuel changelog/historique non concerné par ce grep, qui cible `apps/docs/src`).

- [ ] **Step 4: Vérifier la couverture de tests du package core**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run test --workspace=@ariane-ui/core`
Expected: PASS, y compris `validate-cssprop-defaults.test.js` modifié en Task 1 — confirme que le refactor n'a pas cassé `validateCssPropertyCoverage` ni le hook `cem.config.js` qui en dépend au build du manifest (`npm run build:manifest`).

- [ ] **Step 5: Commit final si des ajustements ont été faits pendant la vérification**

```bash
cd /Users/jon/Code/Active_projects/ariane
git status
```

Si des fichiers ont été modifiés pendant cette tâche de vérification, les committer avec un message décrivant l'ajustement (ex. `fix(docs): corrige <problème identifié pendant la vérification manuelle> (#120)`). Sinon, aucun commit supplémentaire n'est nécessaire.

---

## Self-Review

**Couverture de la spec :** Emplacement/nav (Task 7, 9) ; fusion CEM ∪ default.css avec tokens non-définis affichés quand même (Task 3) ; inférence color/dimension/select/text (Task 2, 3) ; accordéon par composant + preview live réutilisant `playgroundHtml` (Task 6, 9, 10) ; preview composite Global (Task 9) ; bandeau `ar-alert` (Task 9) ; reset par section + reset global (Task 9, 10) ; export CSS complet (Task 5, 10) ; persistance `localStorage` versionnée avec dégradation silencieuse (Task 4) ; application live isolée via `style.setProperty` sur `[data-preview-for]`, jamais sur `document.documentElement` (Task 10) ; validation `CSS.supports` en fallback texte — **non implémentée dans ce plan, voir ci-dessous**.

**Écart identifié pendant le self-review :** la spec section "Gestion des erreurs & cas limites" prévoyait une validation `CSS.supports(...)` avant application pour le contrôle `text`, avec message d'erreur inline si invalide. Ce plan (Task 10) applique la valeur sans validation. C'est un écart volontaire de scope pour ce premier jet (le contrôle `text` ne concerne qu'un sous-ensemble de tokens à valeur composée, ex. `box-shadow`, `calc()` — un `style.setProperty` avec une valeur invalide est silencieusement ignoré par le navigateur, sans crash ni corruption d'état, donc le risque réel est un manque de feedback utilisateur plutôt qu'un bug) — à signaler explicitement à l'utilisateur en fin de plan plutôt qu'à cacher.

**Cohérence des types :** `ThemeToken` (Task 3), `TokenOverride` (Task 4) et leur usage dans `export-theme-css.ts` (Task 5) et le script client (Task 10) utilisent les mêmes noms de champs (`light`, `dark`, `name`, `control`) de bout en bout — vérifié.
