# Correction `ar-stepper` — parts d'état pour `active` (#129) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Appliquer le nouveau principe de multiplication des parts d'état (cf.
`docs/superpowers/specs/2026-07-27-part-state-multiplication-design.md`) à `ar-stepper` avant
de merger PR #138 : ajouter un nouveau garde-fou de validation d'ordre CSS, exposer un part
d'état `bullet-active`, migrer les 2 tokens qui s'y prêtent (`--ar-stepper-active-bullet-bg`,
`--ar-stepper-active-bullet-color`), et documenter dans ADR-005 pourquoi
`--ar-stepper-active-label-color` **ne** migre **pas** malgré son apparence de candidat évident.

**Architecture:** Reprend le pattern `::part()` déjà établi (lot 1, PR #138) : `default.css`
complète le bloc `ar-stepper { &::part(x) { ... } }` existant avec une nouvelle règle
`&::part(bullet-active) { ... }`, déclarée après `&::part(bullet) { ... }` (ordre imposé par un
nouveau script de validation). Le composant pose le part d'état conditionnellement dans
`stepper.renderer.ts` (`part="bullet bullet-active"` quand l'étape est active), et retire la
déclaration CSS interne devenue redondante dans `stepper.styles.ts`.

**Tech Stack:** Lit 3 + TypeScript, CSS custom properties + nesting natif (`@layer
ariane.theme` dans `packages/core/src/styles/themes/default.css`), Custom Elements Manifest
analyzer (`npm run build:manifest`, hooks dans `packages/core/cem.config.js`).

## Global Constraints

- Continue sur la branche existante `fix/stepper-token-vs-part-129` (déjà checkoutée, PR #138
  ouverte sur `dev`) — pas de nouvelle branche à créer.
- Aucun changement visuel par défaut : chaque règle `::part()` reprend exactement la valeur du
  token qu'elle remplace, et le comportement de survol/focus déjà en place (y compris le cas
  limite « sous-étape active en mode edit survolée ») doit rester identique — cf. justification
  détaillée en Task 3.
- CSS de `default.css` : nesting natif (`&::part(x) { }`) dans le bloc `ar-stepper { }` déjà
  existant (`packages/core/src/styles/themes/default.css:851-886`), nouvelle règle ajoutée
  **après** `&::part(bullet) { }` — jamais avant (ordre validé automatiquement, cf. Task 1/2).
- Prettier : 100 caractères, 4 espaces, quotes simples (appliqué automatiquement par
  `lint-staged` au commit).
- Conventional Commits — chaque tâche se termine par un commit séparé.
- Ne jamais committer `packages/core/dist/`.
- Vérification par tâche : `npx vitest run stepper` (depuis `packages/core/`) pour la
  non-régression comportementale, `npm run build:manifest --workspace=packages/core` (depuis la
  racine) pour valider la couverture `@cssprop`/`default.css` et le nouvel ordre `::part()`.
- Breaking change assumé (alpha, cf. CLAUDE.md) : un consommateur qui surchargeait
  `--ar-stepper-active-bullet-bg`/`--ar-stepper-active-bullet-color` doit passer à une règle
  `::part(bullet-active)` directe.

---

## Task 1: Créer le script de validation d'ordre des parts d'état

**Contexte:** Les règles `::part()` de même spécificité se départagent par ordre de
déclaration dans `default.css` (la dernière l'emporte) — cf. spec
`2026-07-27-part-state-multiplication-design.md`, section « Garde-fou d'ordre CSS ». Ce script
détecte une règle `::part(<base>)` déclarée **après** une règle `::part(<base>-<état>)`
correspondante dans le même bloc de composant, ce qui ferait perdre la base au profit de sa
propre variante d'état.

**Files:**

- Create: `packages/core/scripts/validate-part-state-order.js`
- Test: `packages/core/scripts/validate-part-state-order.test.js`

**Interfaces:**

- Produces: `findPartStateOrderErrors(filePath: string, source: string): string[]` — utilisée
  par Task 2 dans `cem.config.js`.
- Produces (interne, non consommée ailleurs) : `findComponentBlocks(source: string): {
component: string, body: string, bodyStartLine: number }[]`.

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `packages/core/scripts/validate-part-state-order.test.js` :

```js
import { describe, expect, it } from 'vitest';
import { findPartStateOrderErrors } from './validate-part-state-order.js';

describe('findPartStateOrderErrors', () => {
    it("détecte une règle d'état déclarée avant sa base", () => {
        const source = `
            ar-test {
                &::part(bullet-active) {
                    background-color: red;
                }

                &::part(bullet) {
                    border-radius: 0.75rem;
                }
            }
        `;
        const errors = findPartStateOrderErrors('default.css', source);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('bullet-active');
        expect(errors[0]).toContain('bullet');
    });

    it("accepte une règle d'état déclarée après sa base", () => {
        const source = `
            ar-test {
                &::part(bullet) {
                    border-radius: 0.75rem;
                }

                &::part(bullet-active) {
                    background-color: red;
                }
            }
        `;
        expect(findPartStateOrderErrors('default.css', source)).toEqual([]);
    });

    it('ignore un part sans base déclarée dans le même bloc (aucune fausse relation)', () => {
        const source = `
            ar-test {
                &::part(step-link) {
                    color: blue;
                }

                &::part(bullet) {
                    border-radius: 0.75rem;
                }
            }
        `;
        expect(findPartStateOrderErrors('default.css', source)).toEqual([]);
    });

    it('traite chaque bloc de composant indépendamment', () => {
        const source = `
            ar-one {
                &::part(bullet-active) {
                    background-color: red;
                }
                &::part(bullet) {
                    border-radius: 0.75rem;
                }
            }

            ar-two {
                &::part(bullet) {
                    border-radius: 0.5rem;
                }
                &::part(bullet-active) {
                    background-color: blue;
                }
            }
        `;
        const errors = findPartStateOrderErrors('default.css', source);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('ar-one');
    });

    it('rapporte le bon numéro de ligne', () => {
        const source = [
            'ar-test {',
            '    &::part(bullet-active) {',
            '        background-color: red;',
            '    }',
            '',
            '    &::part(bullet) {',
            '        border-radius: 0.75rem;',
            '    }',
            '}',
        ].join('\n');
        const errors = findPartStateOrderErrors('default.css', source);
        expect(errors[0]).toContain(':2');
    });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run (depuis `packages/core/`) : `npx vitest run validate-part-state-order`
Expected: FAIL — `Cannot find module './validate-part-state-order.js'` (le fichier n'existe pas
encore).

- [ ] **Step 3: Écrire l'implémentation**

Créer `packages/core/scripts/validate-part-state-order.js` :

```js
/**
 * Détecte un ::part(x) de base déclaré après son ::part(x-état) correspondant dans
 * default.css — les règles ::part() de même spécificité se départagent par ordre de
 * déclaration (la dernière l'emporte), donc une base après sa variante d'état ferait
 * perdre la base au profit de l'état, y compris hors contexte actif.
 *
 * Heuristique : un nom de part B est considéré variante d'état d'un nom A (déclaré
 * dans le même bloc de composant) si B commence par `${A}-`. Limite connue : un part
 * non lié nommé `<A>-<suffixe>` (ex. `step`/`step-link`) serait à tort considéré comme
 * variante si les deux étaient un jour stylés dans le même bloc default.css — cas rare,
 * à corriger au cas par cas si rencontré (renommage ou réordonnancement).
 *
 * Utilisé par `cem.config.js` (hook `packageLinkPhase`) pour faire échouer
 * `npm run build:manifest` en cas de détection — cf.
 * docs/superpowers/specs/2026-07-27-part-state-multiplication-design.md
 */

const COMPONENT_BLOCK_RE = /^[ \t]*(ar-[\w-]+)[^{\n]*\{/gm;
const PART_RE = /::part\(([\w-]+)\)/g;

/**
 * @param {string} source
 * @param {number} openBraceIndex index (dans source) de l'accolade ouvrante
 * @returns {number} index de l'accolade fermante correspondante
 */
function findMatchingBrace(source, openBraceIndex) {
    let depth = 1;
    for (let i = openBraceIndex + 1; i < source.length; i++) {
        if (source[i] === '{') depth++;
        else if (source[i] === '}') {
            depth--;
            if (depth === 0) return i;
        }
    }
    throw new Error('Accolade fermante introuvable dans default.css');
}

/**
 * Découpe `source` en blocs de composant top-level (`ar-<nom> { ... }`), en gérant
 * l'imbrication CSS native (`&::part(x) { ... }`) via un comptage d'accolades.
 *
 * @param {string} source
 * @returns {{ component: string, body: string, bodyStartLine: number }[]}
 */
export function findComponentBlocks(source) {
    const blocks = [];
    COMPONENT_BLOCK_RE.lastIndex = 0;
    let match;
    while ((match = COMPONENT_BLOCK_RE.exec(source)) !== null) {
        const component = match[1];
        const openBraceIndex = match.index + match[0].length - 1;
        const closeBraceIndex = findMatchingBrace(source, openBraceIndex);
        const body = source.slice(openBraceIndex + 1, closeBraceIndex);
        const bodyStartLine = source.slice(0, openBraceIndex + 1).split('\n').length;
        blocks.push({ component, body, bodyStartLine });
    }
    return blocks;
}

/**
 * @param {string} body
 * @param {number} bodyStartLine
 * @returns {Map<string, number>} nom de part → première ligne de déclaration
 */
function findPartOccurrences(body, bodyStartLine) {
    const occurrences = new Map();
    PART_RE.lastIndex = 0;
    let match;
    while ((match = PART_RE.exec(body)) !== null) {
        const name = match[1];
        if (occurrences.has(name)) continue;
        const line = bodyStartLine + body.slice(0, match.index).split('\n').length - 1;
        occurrences.set(name, line);
    }
    return occurrences;
}

/**
 * @param {string} filePath chemin du fichier, utilisé uniquement pour le message d'erreur
 * @param {string} source contenu brut de default.css
 * @returns {string[]}
 */
export function findPartStateOrderErrors(filePath, source) {
    const errors = [];
    for (const { component, body, bodyStartLine } of findComponentBlocks(source)) {
        const occurrences = findPartOccurrences(body, bodyStartLine);
        const names = [...occurrences.keys()];
        for (const stateName of names) {
            for (const baseName of names) {
                if (baseName === stateName) continue;
                if (!stateName.startsWith(`${baseName}-`)) continue;
                const baseLine = /** @type {number} */ (occurrences.get(baseName));
                const stateLine = /** @type {number} */ (occurrences.get(stateName));
                if (stateLine < baseLine) {
                    errors.push(
                        `${filePath}:${stateLine} — ${component}::part(${stateName}) déclaré ` +
                            `avant ${component}::part(${baseName}) : la règle de base doit ` +
                            `toujours précéder ses parts d'état`,
                    );
                }
            }
        }
    }
    return errors;
}
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run (depuis `packages/core/`) : `npx vitest run validate-part-state-order`
Expected: PASS — les 5 tests passent.

- [ ] **Step 5: Commit**

```bash
git add packages/core/scripts/validate-part-state-order.js packages/core/scripts/validate-part-state-order.test.js
git commit -m "feat(scripts): ajoute la validation d'ordre des parts d'état (#129)"
```

---

## Task 2: Brancher le script dans `cem.config.js`

**Files:**

- Modify: `packages/core/cem.config.js`

**Interfaces:**

- Consumes: `findPartStateOrderErrors(filePath: string, source: string): string[]` (Task 1).

- [ ] **Step 1: Importer la nouvelle fonction**

Dans `packages/core/cem.config.js`, après l'import existant de
`validate-no-hardcoded-tokens.js` :

```js
import {
    findHardcodedTokenAssignments,
    findStylesFiles,
    findUnjustifiedFallbacks,
} from './scripts/validate-no-hardcoded-tokens.js';
```

ajouter juste après :

```js
import { findPartStateOrderErrors } from './scripts/validate-part-state-order.js';
```

- [ ] **Step 2: Appeler la validation et l'agréger aux erreurs existantes**

Dans le hook `packageLinkPhase`, juste après le calcul de `unjustifiedFallbackErrors` (qui
utilise déjà `stylesFiles`), ajouter :

```js
// Valide que toute règle ::part(x) de base précède ses parts d'état
// (::part(x-état)) dans default.css — cf.
// docs/superpowers/specs/2026-07-27-part-state-multiplication-design.md
const partStateOrderErrors = findPartStateOrderErrors('src/styles/themes/default.css', themeCss);
```

(`themeCss` est déjà lu plus haut dans le hook pour `extractThemeTokens` — pas de nouvelle
lecture disque nécessaire.)

Remplacer :

```js
const allErrors = [...cssPropCoverageErrors, ...hardcodedErrors, ...unjustifiedFallbackErrors];
```

par :

```js
const allErrors = [
    ...cssPropCoverageErrors,
    ...hardcodedErrors,
    ...unjustifiedFallbackErrors,
    ...partStateOrderErrors,
];
```

Remplacer :

```js
const unjustifiedFallbackErrorsMsg =
    unjustifiedFallbackErrors.length > 0
        ? `\n  fallback(s) non justifié(s) :\n${unjustifiedFallbackErrors.map((e) => `    - ${e}`).join('\n')}`
        : '';
throw new Error(
    `[CEM] ${allErrors.length} @cssprop erreur(s) avec default.css :${coverageErrorsMsg}${hardcodedErrorsMsg}${unjustifiedFallbackErrorsMsg}`,
);
```

par :

```js
const unjustifiedFallbackErrorsMsg =
    unjustifiedFallbackErrors.length > 0
        ? `\n  fallback(s) non justifié(s) :\n${unjustifiedFallbackErrors.map((e) => `    - ${e}`).join('\n')}`
        : '';
const partStateOrderErrorsMsg =
    partStateOrderErrors.length > 0
        ? `\n  ordre part d'état invalide :\n${partStateOrderErrors.map((e) => `    - ${e}`).join('\n')}`
        : '';
throw new Error(
    `[CEM] ${allErrors.length} @cssprop erreur(s) avec default.css :${coverageErrorsMsg}${hardcodedErrorsMsg}${unjustifiedFallbackErrorsMsg}${partStateOrderErrorsMsg}`,
);
```

- [ ] **Step 3: Vérifier que le manifest se génère toujours sans erreur**

Run (depuis la racine du repo) : `npm run build:manifest --workspace=packages/core`
Expected: aucune erreur (aucun part d'état n'existe encore dans `default.css` à ce stade —
le script n'a rien à signaler).

- [ ] **Step 4: Commit**

```bash
git add packages/core/cem.config.js
git commit -m "feat(scripts): branche la validation d'ordre des parts d'état dans cem.config.js (#129)"
```

---

## Task 3: Exposer le part d'état `bullet-active` dans `stepper.renderer.ts`

**Contexte — réévaluation précise des 3 tokens candidats :**

La spec de conception listait 3 tokens candidats (`active-bullet-bg`, `active-bullet-color`,
`active-label-color`). Une analyse de spécificité CSS sur le code actuel montre que **seuls les
2 premiers peuvent migrer sans changement de comportement** :

- `.stepper-item.active > .stepper-item-inner .stepper-item-bullet` (règle interne actuelle
  pour `active-bullet-bg`/`active-bullet-color`) a la spécificité `(0,4,0)`, **identique** à la
  règle de survol interne `.stepper-item .stepper-link:is(:focus, :hover)
.stepper-item-bullet` — à spécificité égale, la règle « active » (déclarée après la règle
  hover dans `stepper.styles.ts`) l'emporte déjà aujourd'hui. Migrer ces 2 tokens vers
  `::part(bullet-active)` (règle externe, qui l'emporte **toujours** sur une règle interne,
  cf. ADR-005 contrainte 2) préserve exactement ce résultat : « actif » continue de l'emporter
  sur « survolé ».
- `.stepper-item.active > .stepper-item-inner` (règle interne pour `active-label-color`) a une
  spécificité **plus faible**, `(0,3,0)` — la règle de survol interne équivalente pour le label
  (`.stepper-item .stepper-link:is(:focus, :hover) .stepper-item-label`) a `(0,4,0)` et
  l'emporte aujourd'hui sur `active-label-color` dans le cas limite atteignable où une
  sous-étape **active** est aussi un lien **survolé/focus** (en mode `edit`, `renderSubStep`
  rend toujours un `<a part="step-link">`, même pour l'étape courante — contrairement à
  `renderStep` qui ne rend jamais l'étape courante comme un lien). Migrer
  `active-label-color` vers un `::part(label-active)` externe **inverserait ce résultat**
  (l'externe l'emporterait toujours, y compris sur le hover), ce qui serait un changement de
  comportement visible dans ce cas limite précis. **`--ar-stepper-active-label-color` ne migre
  donc pas dans cette tâche** — reclassé sous la contrainte 5 d'ADR-005 (état posé sur un part
  ancêtre — `step-link` — ciblant un part descendant différent), au même titre que
  `--ar-stepper-label-color` (base).

Cette tâche est donc purement additive côté rendu (un seul part conditionnel ajouté), sans
retrait de la règle `active-label-color` existante.

**Files:**

- Modify: `packages/core/src/components/stepper/stepper.renderer.ts`
- Test: `packages/core/src/components/stepper/stepper.test.ts`

**Interfaces:**

- `renderStepText` change de signature : `renderStepText(label: string, order: number, isActive:
boolean, isSubstep = false): TemplateResult` (paramètre `isActive` ajouté en 3ᵉ position, avant
  `isSubstep`). Les deux appelants (`renderStep`, `renderSubStep`) sont mis à jour dans cette
  même tâche — aucun autre appelant dans la base de code (vérifié : `grep -rn
renderStepText packages/core/src` ne retourne que la définition et ces 2 appels).

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter dans `packages/core/src/components/stepper/stepper.test.ts`, à la fin du bloc
`describe('rendu', ...)` (après le test existant `'rend part="bullet" sur la puce de chaque
étape'`, juste avant la fermeture `});` de ce `describe`) :

```ts
it('rend le part d\'état "bullet-active" uniquement sur la puce de l\'étape active', async () => {
    const el = await fixtureWithItems(`
                <ar-stepper current-path="/a">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);
    const steps = shadow(el).querySelectorAll('ol.stepper-list > li[part="step"]');
    expect(steps.length).toBe(2);

    const bulletA = requireQuery<HTMLElement>(steps[0]!, '.stepper-item-bullet');
    expect(bulletA.getAttribute('part')).toBe('bullet bullet-active');

    const bulletB = requireQuery<HTMLElement>(steps[1]!, '.stepper-item-bullet');
    expect(bulletB.getAttribute('part')).toBe('bullet');
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run (depuis `packages/core/`) : `npx vitest run stepper`
Expected: FAIL — le nouveau test échoue (`bulletA.getAttribute('part')` vaut `'bullet'`, pas
`'bullet bullet-active'`), le reste passe.

- [ ] **Step 3: Modifier `renderStepText` et ses appelants**

Remplacer (`packages/core/src/components/stepper/stepper.renderer.ts:33-39`) :

```ts
function renderStepText(label: string, order: number, isSubstep = false): TemplateResult {
    return html`
        <span class="stepper-item-bullet" part="bullet" aria-hidden="true"></span>
        <span class="sr-only">${isSubstep ? 'sous-' : ''}étape ${order}:</span>
        <span class="stepper-item-label">${label}</span>
    `;
}
```

par :

```ts
function renderStepText(
    label: string,
    order: number,
    isActive: boolean,
    isSubstep = false,
): TemplateResult {
    const bulletPart = isActive ? 'bullet bullet-active' : 'bullet';
    return html`
        <span class="stepper-item-bullet" part=${bulletPart} aria-hidden="true"></span>
        <span class="sr-only">${isSubstep ? 'sous-' : ''}étape ${order}:</span>
        <span class="stepper-item-label">${label}</span>
    `;
}
```

Dans `renderSubStep`, remplacer les deux appels `renderStepText(sub.label, order, true)` (un
dans la branche `<a>`, un dans la branche `<div>`) par `renderStepText(sub.label, order,
isActive, true)` — la variable `isActive` est déjà calculée en tête de fonction
(`const isActive = sub.state === 'current';`).

Dans `renderStep`, remplacer les deux appels `renderStepText(step.label, order)` (un dans la
branche `<a>`, un dans la branche `<div>`) par `renderStepText(step.label, order, active)` — la
variable `active` est déjà calculée en tête de fonction (`const active = isGroupActive(step,
mode);`).

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run (depuis `packages/core/`) : `npx vitest run stepper`
Expected: PASS — tous les tests passent, y compris le nouveau.

- [ ] **Step 5: Vérifier la génération du manifest**

Run (depuis la racine du repo) : `npm run build:manifest --workspace=packages/core`
Expected: aucune erreur (le part `bullet-active` n'est encore stylé nulle part dans
`default.css`, rien à valider côté ordre ou couverture `@cssprop`).

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/components/stepper/stepper.renderer.ts packages/core/src/components/stepper/stepper.test.ts
git commit -m "feat(stepper): expose le part d'état bullet-active (#129)"
```

---

## Task 4: Migrer `active-bullet-bg`/`active-bullet-color` vers `::part(bullet-active)`

**Files:**

- Modify: `packages/core/src/styles/themes/default.css`
- Modify: `packages/core/src/components/stepper/stepper.styles.ts`
- Modify: `packages/core/src/components/stepper/stepper.ts`

**Interfaces:** Aucune. Migration de 2 tokens (`active-bullet-bg`, `active-bullet-color`) plus
le `box-shadow: none` co-localisé (valeur littérale, pas un token) vers une règle
`ar-stepper::part(bullet-active)` nichée dans le bloc `ar-stepper { }` existant.

- [ ] **Step 1: Retirer les 2 tokens de `default.css` et compléter le bloc `ar-stepper`**

Dans la section `/* stepper */` de `default.css`
(`packages/core/src/styles/themes/default.css:367-386`), remplacer :

```css
--ar-stepper-active-label-color: var(--ar-color-interactive);
--ar-stepper-active-bullet-color: var(--ar-color-text-inverse);
--ar-stepper-active-bullet-bg: var(--ar-color-interactive);
```

par (seule la ligne `active-label-color` est conservée — cf. justification Task 3) :

```css
--ar-stepper-active-label-color: var(--ar-color-interactive);
```

Dans le bloc `ar-stepper { }` (`packages/core/src/styles/themes/default.css:851-886`), ajouter
après `&::part(bullet) { border-radius: 0.75rem; }` (dernière règle du bloc) :

```css
&::part(bullet-active) {
    background-color: var(--ar-color-interactive);
    color: var(--ar-color-text-inverse);
    box-shadow: none;
}
```

(Valeurs cascadées depuis les mêmes tokens globaux que les tokens scopés supprimés — pas de
valeur inventée. `box-shadow: none` était déjà une valeur littérale dans le composant, pas un
token, elle migre telle quelle.)

- [ ] **Step 2: Retirer la déclaration correspondante de `stepper.styles.ts`**

Remplacer (`packages/core/src/components/stepper/stepper.styles.ts:100-109`) :

```ts
    .stepper-item.active > .stepper-item-inner {
        color: var(--ar-stepper-active-label-color);
        font-weight: 700;
    }

    .stepper-item.active > .stepper-item-inner .stepper-item-bullet {
        color: var(--ar-stepper-active-bullet-color);
        background-color: var(--ar-stepper-active-bullet-bg);
        box-shadow: none;
    }
```

par (la première règle est inchangée — `active-label-color` reste un token consommé en
interne, cf. Task 3 ; la seconde règle disparaît entièrement, ses 3 déclarations migrent) :

```ts
    .stepper-item.active > .stepper-item-inner {
        color: var(--ar-stepper-active-label-color);
        font-weight: 700;
    }
```

- [ ] **Step 3: Mettre à jour le JSDoc `@cssprop` et `@csspart`**

Dans `packages/core/src/components/stepper/stepper.ts`, remplacer :

```ts
 * @cssprop --ar-stepper-active-label-color - Couleur du label de l'étape active.
```

Rien ne change sur cette ligne (le token reste documenté). Supprimer les 2 lignes :

```ts
 * @cssprop --ar-stepper-active-bullet-bg - Fond de la puce de l'étape active.
 * @cssprop --ar-stepper-active-bullet-color - Couleur du numéro dans la puce active.
```

Dans le bloc `@csspart`, ajouter une nouvelle entrée après `bullet` :

```ts
 * @csspart bullet       - La puce numérotée d'une étape.
 * @csspart bullet-active - La puce numérotée de l'étape active (variante d'état de `bullet`).
```

- [ ] **Step 4: Lancer les tests du composant**

Run (depuis `packages/core/`) : `npx vitest run stepper`
Expected: tous les tests passent (aucune assertion sur la couleur/le fond de la puce active).

- [ ] **Step 5: Vérifier la génération du manifest**

Run (depuis la racine du repo) : `npm run build:manifest --workspace=packages/core`
Expected: aucune erreur — ni couverture `@cssprop`, ni ordre des parts d'état (`bullet-active`
est bien déclaré après `bullet`).

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/styles/themes/default.css packages/core/src/components/stepper/stepper.styles.ts packages/core/src/components/stepper/stepper.ts
git commit -m "refactor(stepper): migre active-bullet-bg/active-bullet-color vers ::part(bullet-active) (#129)"
```

---

## Task 5: Documenter dans ADR-005, vérification finale et mise à jour de la PR

**Files:**

- Modify: `docs/decisions/ADR-005-tokens-pilotes-par-attribut.md`

**Interfaces:** aucune — documentation et vérification uniquement.

- [ ] **Step 1: Documenter le remplacement de la contrainte 2 et la reclassification de `active-label-color`**

Dans `docs/decisions/ADR-005-tokens-pilotes-par-attribut.md`, à la fin du fichier, après le
dernier paragraphe (« **Lot 1 — `ar-stepper` (2026-07-25)** : … »), ajouter :

```markdown
## Amendement (2026-07-27) : parts d'état, remplacement partiel de la contrainte 2

La contrainte 2 (état interne sur le même élément → reste token) est remplacée par un nouveau
pattern : exposer l'état lui-même comme un `part` supplémentaire sur le même élément
(`part="<élément> <élément>-<état>"`, ex. `part="bullet bullet-active"`), ciblable par le
thème via `::part(<élément>-<état>)`. Vérifié empiriquement (Chromium réel, Playwright) : une
règle externe `::part(x-état)` déclarée après `::part(x)` l'emporte sur `background-color`
sans affecter `color` (piloté uniquement par la règle de base), et neutralise totalement une
règle interne à spécificité supérieure ciblant la même propriété — cf. détail complet
`docs/superpowers/specs/2026-07-27-part-state-multiplication-design.md`.

**La contrainte 5 (état posé sur un `part` ancêtre, ciblant un `part` descendant différent)
n'est pas concernée par ce remplacement** — vérifié empiriquement que `:has()` ne permet pas de
répliquer un hover d'ancêtre sur un part différent sans JS dédié. Elle reste une exception
permanente d'ADR-005.

**Nouveau garde-fou d'ordre** : les règles `::part()` de même spécificité se départagent par
ordre de déclaration dans `default.css` — une règle de base doit toujours précéder ses parts
d'état dans le fichier. Vérifié automatiquement par
`packages/core/scripts/validate-part-state-order.js`, branché dans `cem.config.js`.

**Application — `ar-stepper` (2026-07-27)** : `--ar-stepper-active-bullet-bg` et
`--ar-stepper-active-bullet-color` migrés vers `::part(bullet-active)` (nouveau part d'état).
`--ar-stepper-active-label-color`, bien qu'a priori candidat au même traitement, **reste un
token** : une analyse de spécificité a montré qu'en mode `edit`, une sous-étape active est
toujours rendue comme un lien (`renderSubStep` ignore l'état actif dans son choix `<a>`/`<div>`,
contrairement à `renderStep`), donc atteignable par la règle de survol ancêtre→descendant
(`.stepper-link:hover .stepper-item-label`, spécificité `(0,4,0)`) qui l'emporte aujourd'hui sur
`active-label-color` (`(0,3,0)`). Migrer ce token aurait inversé ce résultat (l'externe
l'emporte toujours). Reclassé sous la contrainte 5, au même titre que `--ar-stepper-label-color`
(base).
```

- [ ] **Step 2: Commit**

```bash
git add docs/decisions/ADR-005-tokens-pilotes-par-attribut.md
git commit -m "docs(adr): documente le remplacement de la contrainte 2 par les parts d'état (#129)"
```

- [ ] **Step 3: Lancer la suite complète**

Run (depuis la racine du repo) :

```bash
npm run test
npm run build:manifest --workspace=packages/core
```

Expected: tout passe, aucune régression sur les autres composants.

- [ ] **Step 4: Vérification empirique Playwright du rendu réel**

Lancer le site de doc et vérifier visuellement `ar-stepper` avec `default.css` chargé :

```bash
npm run dev
```

Naviguer vers la page de démo `ar-stepper` (`/components/stepper`), vérifier :

- Étape active : fond et couleur de la puce identiques à avant la migration.
- Cas limite (mode `edit`, sous-étape active survolée) : la puce garde l'apparence « active »
  (pas l'apparence « survolée ») pendant le survol — comportement inchangé par rapport à avant
  cette tâche (constaté dans le composant existant : la règle active gagnait déjà sur la règle
  hover pour la puce à spécificité égale, par ordre de déclaration).
- Aucune régression sur trigger/panel/lien (déjà migrés en lot 1).

- [ ] **Step 5: Pousser la mise à jour vers la PR #138**

```bash
git push
```

**Ne pas merger sans confirmation explicite de l'utilisateur** (cf.
`feedback_merge_after_autonomous_fix`).
