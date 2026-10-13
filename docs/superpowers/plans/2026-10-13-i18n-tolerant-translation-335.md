# i18n : type `Translation` tolérant, repli prévisible et message de validation (#335) — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre le type `Translation` tolérant (avec `FullTranslation` strict en opt-in), garantir `fr` comme repli complet via un enrobage de `registerTranslation`, et localiser le message de validité du datepicker (`validationValueMissing`).

**Architecture:** `FullTranslation` (tous les termes requis) reste le contrat interne de `fr.ts`, `en.ts` et du `LocalizeController` ; `Translation` public devient `Pick<$code|$name|$dir> & Partial<termes>`. `utils/register-translation.ts` importe `translations/fr.js` (effet de bord : enregistre `fr` en premier) puis délègue à `registerTranslation` de `@shoelace-style/localize`, qui fusionne par code et par terme. Le datepicker lit son message via `localize.term`.

**Tech Stack:** TypeScript 6 (strict, `exactOptionalPropertyTypes`), Lit 3, `@shoelace-style/localize`, Vitest (happy-dom), Web Test Runner (bundles CDN), esbuild.

**Spec:** `docs/superpowers/specs/2026-10-13-i18n-tolerant-translation-335-design.md`

## Global Constraints

- Prettier : 100 caractères, 4 espaces, guillemets simples. `import type` pour tout import de type.
- Commits Conventional Commits, branche `feat/i18n-tolerant-translation-335` créée depuis `dev`. **Ne jamais pousser ni ouvrir de PR sans confirmation du mainteneur** (CLAUDE.md, mémoire `feedback_no_auto_push`).
- Node 24 : préfixer chaque commande npm par `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null &&` et utiliser le chemin absolu `/Users/jon/Code/Active_projects/ariane` (racine du dépôt).
- Headless : aucun fallback cosmétique ajouté. Aucune dépendance ajoutée.
- API publique modifiée : le skill (`packages/core/scripts/skill/content/`) doit être mis à jour ; `npm run check:skill` doit passer.
- `warn()` n'est pas traduit : hors périmètre.
- Tests navigateur locaux sans Firefox : `ARIANE_BROWSERS=chromium,webkit` (Firefox ne démarre pas sur macOS 27).

## Review Focus

Entrées et conditions que le spec implique mais que les tests de base n'exercent pas ; chacune a son test dans la tâche indiquée.

1. Surcharge partielle de `fr` enregistrée **avant** le chargement des composants : la valeur de l'utilisateur doit gagner, les autres termes rester ceux de `fr` (Tâche 2).
2. Variante régionale : `fr-CA` enregistré, page en `fr-CA` → terme régional ; page en `fr-FR` → `fr` (Tâche 2).
3. Changement de `lang` à chaud sur un datepicker obligatoire et vide : le message de validité suit (Tâche 3).
4. Datepicker désactivé ou non obligatoire : aucun message de validité posé (Tâche 3).
5. Bundle `/utils` : embarque `fr` mais aucun composant, aucun `customElements.define` ; `cdn/utils.js` partage le registre avec l'autoloader (Tâches 2 et 4).

---

### Task 1: Types `FullTranslation` et `Translation`, terme `validationValueMissing`

**Files:**

- Modify: `packages/core/src/types/translation.ts`
- Modify: `packages/core/src/translations/fr.ts`, `packages/core/src/translations/en.ts`
- Modify: `packages/core/src/controllers/localize.controller.ts`
- Modify: `packages/core/src/utils/index.ts`, `packages/core/src/index.ts`
- Create: `packages/core/src/types/translation.types.test.ts`
- Modify: `packages/core/src/translations/translations.test.ts`

**Interfaces:**

- Produces: `FullTranslation` (interface, tous les termes requis, exportée), `Translation` (type tolérant, exporté), terme `validationValueMissing: string` dans `FullTranslation`. Tâches 2 et 3 s'appuient sur ces noms.

- [ ] **Step 1: Créer la branche**

```bash
cd /Users/jon/Code/Active_projects/ariane && git checkout dev && git pull --ff-only origin dev && git checkout -b feat/i18n-tolerant-translation-335
```

Expected: `Switched to a new branch 'feat/i18n-tolerant-translation-335'`. Le spec et le plan non suivis restent dans l'arbre.

- [ ] **Step 2: Vérifier les usages du type avant de le toucher**

Run: `cd /Users/jon/Code/Active_projects/ariane/packages/core && grep -rn "Translation" src --include='*.ts' | grep -v "test\.ts" | grep -v "registerTranslation" | cut -c1-140`
Expected: seulement `types/translation.ts`, `translations/fr.ts`, `translations/en.ts`, `controllers/localize.controller.ts`, `utils/index.ts`, `index.ts`. Si un autre fichier apparaît, l'ajouter à cette tâche.

- [ ] **Step 3: Écrire le test de types (échoue)**

Créer `packages/core/src/types/translation.types.test.ts` :

```ts
// @vitest-environment node
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { afterAll, describe, expect, it } from 'vitest';

const TYPES_MODULE = fileURLToPath(new URL('./translation', import.meta.url));
const dir = mkdtempSync(join(tmpdir(), 'ar-translation-types-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));
let counter = 0;

/** Compile `body` avec les types importés et renvoie les messages d'erreur du fichier. */
function check(body: string): string[] {
    const file = join(dir, `fixture-${counter++}.ts`);
    writeFileSync(
        file,
        `import type { Translation, FullTranslation } from '${TYPES_MODULE}';\n${body}\nexport {};\n`,
    );
    const program = ts.createProgram([file], {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
        strict: true,
        exactOptionalPropertyTypes: true,
        experimentalDecorators: true,
        skipLibCheck: true,
        noEmit: true,
        types: [],
    });
    return ts
        .getPreEmitDiagnostics(program)
        .filter((d) => d.file?.fileName === file)
        .map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'));
}

describe('types Translation et FullTranslation', () => {
    it('accepte une traduction réduite à $code, $name et $dir', () => {
        expect(
            check(`const t: Translation = { $code: 'es', $name: 'Español', $dir: 'ltr' }; void t;`),
        ).toEqual([]);
    });

    it('accepte une traduction partielle, fonctions comprises', () => {
        const body = `const t: Translation = {
            $code: 'es', $name: 'Español', $dir: 'ltr',
            closeAlert: 'Cerrar',
            sortFailed: (columnLabel: string) => columnLabel,
        }; void t;`;
        expect(check(body)).toEqual([]);
    });

    it('rejette un terme inconnu', () => {
        const errors = check(
            `const t: Translation = { $code: 'es', $name: 'E', $dir: 'ltr', closeAlerte: 'x' }; void t;`,
        );
        expect(errors.join('\n')).toContain('closeAlerte');
    });

    it('rejette un terme du mauvais type', () => {
        const errors = check(
            `const t: Translation = { $code: 'es', $name: 'E', $dir: 'ltr', closeAlert: 3 }; void t;`,
        );
        expect(errors.join('\n')).toContain("'number' is not assignable to type 'string'");
    });

    it('exige $code, $name et $dir', () => {
        expect(check(`const t: Translation = { closeAlert: 'x' }; void t;`).length).toBeGreaterThan(
            0,
        );
    });

    it('FullTranslation exige tous les termes', () => {
        const errors = check(
            `const t: FullTranslation = { $code: 'es', $name: 'E', $dir: 'ltr' }; void t;`,
        );
        expect(errors.join('\n')).toContain('validationValueMissing');
    });

    it('une FullTranslation est assignable à Translation', () => {
        expect(
            check(`declare const full: FullTranslation; const t: Translation = full; void t;`),
        ).toEqual([]);
    });
});
```

- [ ] **Step 4: Lancer le test pour le voir échouer**

Run: `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run src/types/translation.types.test.ts`
Expected: FAIL (`FullTranslation` n'est pas exporté, `Translation` exige tous les termes). La première exécution peut durer plusieurs secondes (chargement des types DOM et Lit).

- [ ] **Step 5: Implémenter les types**

Dans `packages/core/src/types/translation.ts` :

1. Remplacer le commentaire d'en-tête et la ligne `export interface Translation extends BaseTranslation {` par :

```ts
/**
 * Contrat strict de traduction d'Ariane — étend le type de base de @shoelace-style/localize.
 * Un seul type plat regroupant les termes de tous les composants traduits (pas d'augmentation
 * par composant), à l'image du modèle Shoelace/WebAwesome. Groupé par composant en commentaire
 * ci-dessous (et dans src/translations/{fr,en}.ts) — si des termes finissent par être partagés
 * entre plusieurs composants, les regrouper sous un commentaire dédié plutôt que de les dupliquer.
 *
 * Exigeant : tout terme ajouté dans une version ultérieure devient une erreur de compilation
 * pour qui type sa traduction avec `FullTranslation`. À choisir pour que le compilateur
 * garantisse une traduction complète ; sinon utiliser `Translation`, qui tolère les termes absents
 * (le terme manquant s'affiche alors en français).
 */
export interface FullTranslation extends BaseTranslation {
```

2. Avant l'accolade fermante de l'interface (après `closeAlert: string;`), ajouter :

```ts
// Validation des formulaires — messages de validité native (`validationMessage`, bulle du
// navigateur), pas le contenu du slot `error`. Nom = `validation` + drapeau de ValidityState
// avec majuscule initiale (`validationValueMissing`, `validationRangeUnderflow`…).
validationValueMissing: string;
```

3. Après l'interface, ajouter :

```ts
/**
 * Traduction fournie à `registerTranslation` : `$code`, `$name` et `$dir` obligatoires, tous les
 * termes optionnels. Un terme absent se replie, terme par terme, sur la traduction française
 * intégrée. Enregistrer une traduction d'un code déjà connu (`fr`, `en`) fusionne ses termes
 * par-dessus ceux déjà enregistrés : une surcharge partielle suffit. Pour obtenir une vérification
 * d'exhaustivité du compilateur, typer avec `FullTranslation`.
 */
export type Translation = Pick<BaseTranslation, '$code' | '$name' | '$dir'> &
    Partial<Omit<FullTranslation, keyof BaseTranslation>>;
```

- [ ] **Step 6: Typer les traductions internes et le contrôleur**

`packages/core/src/translations/fr.ts` et `en.ts` : remplacer `import type { Translation } from '../types/translation.js';` par `import type { FullTranslation } from '../types/translation.js';` et `const translation: Translation = {` par `const translation: FullTranslation = {`. Ajouter à la fin de l'objet, après `closeAlert` :

fr.ts :

```ts

    // ── Validation des formulaires ───────────────────────────────────────
    validationValueMissing: 'Veuillez renseigner ce champ.',
```

en.ts :

```ts

    // ── Form validation ──────────────────────────────────────────────────
    validationValueMissing: 'Please fill out this field.',
```

`packages/core/src/controllers/localize.controller.ts` :

```ts
import { LocalizeController as BaseLocalizeController } from '@shoelace-style/localize';
import type { FullTranslation } from '../types/translation.js';

/**
 * LocalizeController d'Ariane, typé sur le contrat strict FullTranslation du projet : les appels
 * `term()` des composants gardent des clés vérifiées.
 * Wrapper de @shoelace-style/localize — cf. https://github.com/shoelace-style/localize.
 */
export class LocalizeController extends BaseLocalizeController<FullTranslation> {}
```

`packages/core/src/utils/index.ts` : remplacer la ligne `export type { Translation } from '../types/translation.js';` par `export type { Translation, FullTranslation } from '../types/translation.js';`.

`packages/core/src/index.ts` : remplacer `export type { WhenAllDefinedOptions, Translation } from './utils/index.js';` par `export type { WhenAllDefinedOptions, Translation, FullTranslation } from './utils/index.js';`.

- [ ] **Step 7: Ajouter les tests de valeur du terme**

Dans `translations.test.ts`, avant la dernière accolade du `describe`, ajouter :

```ts
it('fr et en fournissent validationValueMissing', () => {
    expect(fr.validationValueMissing).toBe('Veuillez renseigner ce champ.');
    expect(en.validationValueMissing).toBe('Please fill out this field.');
});
```

- [ ] **Step 8: Lancer les tests et le typage**

Run: `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run src/types src/translations && npx tsc --noEmit -p tsconfig.json`
Expected: tous PASS, `tsc` sans erreur.

- [ ] **Step 9: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add packages/core/src docs/superpowers/specs/2026-10-13-i18n-tolerant-translation-335-design.md docs/superpowers/plans/2026-10-13-i18n-tolerant-translation-335.md && git commit -m "feat(core): Translation tolérant, FullTranslation exporté, terme validationValueMissing (#335)"
```

---

### Task 2: Enrobage de `registerTranslation` (repli `fr` toujours complet)

**Files:**

- Create: `packages/core/src/utils/register-translation.ts`
- Create: `packages/core/src/utils/register-translation.test.ts`
- Modify: `packages/core/src/utils/index.ts`
- Modify: `packages/core/src/utils/index.test.ts`

**Interfaces:**

- Consumes: `Translation` (Tâche 1), `LocalizeController` typé `FullTranslation`.
- Produces: `registerTranslation(...translations: Translation[]): void` exporté par `utils/index.ts` (et donc par `index.ts` et le bundle CDN `utils`).

- [ ] **Step 1: Mesurer la taille de référence de `/utils`**

Créer `/private/tmp/claude-501/-Users-jon-Code-Active-projects-ariane/b3a2705d-332d-4038-91f8-31e3f60c8ee8/scratchpad/utils-size.mjs` :

```js
import { build } from '/Users/jon/Code/Active_projects/ariane/node_modules/esbuild/lib/main.js';
const r = await build({
    entryPoints: ['/Users/jon/Code/Active_projects/ariane/packages/core/src/utils/index.ts'],
    bundle: true,
    write: false,
    minify: true,
    format: 'esm',
    outfile: 'out.js',
    external: ['lit', 'lit/*', '@lit/*'],
    define: { __DEV__: 'false' },
    logLevel: 'silent',
});
console.log('utils/index.ts minifié (Lit externe) :', r.outputFiles[0].contents.length, 'octets');
```

Run: `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && node /private/tmp/claude-501/-Users-jon-Code-Active-projects-ariane/b3a2705d-332d-4038-91f8-31e3f60c8ee8/scratchpad/utils-size.mjs`
Expected: un nombre d'octets (référence #267 : environ 962). Le noter pour la PR.

- [ ] **Step 2: Écrire les tests de l'enrobage (échouent)**

Créer `packages/core/src/utils/register-translation.test.ts` :

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Term = (key: string) => string;

/** Hôte minimal du contrôleur (addController, lang, dir) : pas besoin d'un vrai composant. */
function termFor(
    controllerModule: typeof import('../controllers/localize.controller.js'),
    lang: string,
): Term {
    const host = { addController() {}, lang, dir: '' } as never;
    const controller = new controllerModule.LocalizeController(host);
    return (key) => (controller as unknown as { term: Term }).term(key);
}

describe('registerTranslation (enrobage de /utils)', () => {
    let register: typeof import('./register-translation.js').registerTranslation;
    let controllerModule: typeof import('../controllers/localize.controller.js');

    beforeEach(async () => {
        vi.resetModules();
        ({ registerTranslation: register } = await import('./register-translation.js'));
        controllerModule = await import('../controllers/localize.controller.js');
    });

    it('fr est le repli complet même si une autre langue est enregistrée en premier', () => {
        register({ $code: 'es', $name: 'Español', $dir: 'ltr', closeAlert: 'Cerrar' });

        expect(termFor(controllerModule, 'de')('closeDialog')).toBe('Fermer la boîte de dialogue');
        expect(termFor(controllerModule, 'es')('closeAlert')).toBe('Cerrar');
        expect(termFor(controllerModule, 'es')('closeDialog')).toBe('Fermer la boîte de dialogue');
    });

    it('une surcharge partielle de fr enregistrée avant les composants est conservée', async () => {
        register({ $code: 'fr', $name: 'Français', $dir: 'ltr', closeAlert: 'Fermer ce bandeau' });
        // Les composants importent fr.ts : le module déjà évalué ne ré-enregistre rien.
        await import('../translations/fr.js');
        await import('../translations/en.js');

        const term = termFor(controllerModule, 'fr');
        expect(term('closeAlert')).toBe('Fermer ce bandeau');
        expect(term('closeDialog')).toBe('Fermer la boîte de dialogue');
    });

    it('une variante régionale ne remplace que sa région', () => {
        register({
            $code: 'fr-CA',
            $name: 'Français (Canada)',
            $dir: 'ltr',
            closeAlert: 'Fermer (CA)',
        });

        expect(termFor(controllerModule, 'fr-CA')('closeAlert')).toBe('Fermer (CA)');
        expect(termFor(controllerModule, 'fr-FR')('closeAlert')).toBe("Fermer l'alerte");
    });

    it('en reste disponible une fois les composants chargés', async () => {
        await import('../translations/en.js');

        expect(termFor(controllerModule, 'en')('closeAlert')).toBe('Close alert');
    });
});
```

- [ ] **Step 3: Les lancer pour les voir échouer**

Run: `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run src/utils/register-translation.test.ts`
Expected: FAIL (`./register-translation.js` introuvable).

- [ ] **Step 4: Créer l'enrobage**

Créer `packages/core/src/utils/register-translation.ts` :

```ts
import '../translations/fr.js';
import { registerTranslation as register } from '@shoelace-style/localize';
import type { Translation } from '../types/translation.js';

/**
 * Enregistre une ou plusieurs traductions. Importer ce module enregistre d'abord la traduction
 * française intégrée : elle est donc toujours la langue de repli, complète, quel que soit l'ordre
 * dans lequel l'application enregistre les siennes. Enregistrer un code déjà connu (`fr`, `en`)
 * fusionne ses termes par-dessus les termes existants : une surcharge partielle suffit, et elle
 * n'est plus écrasée par les composants chargés ensuite (leur module `fr` n'est évalué qu'une fois).
 */
export function registerTranslation(...translations: Translation[]): void {
    register(...translations);
}
```

Dans `utils/index.ts`, remplacer `export { registerTranslation } from '@shoelace-style/localize';` par `export { registerTranslation } from './register-translation.js';` et ajouter, dans le commentaire d'en-tête, la phrase : « Importer ce point d'entrée enregistre la traduction française intégrée (effet de bord limité au registre de traductions) : elle sert de langue de repli complète. »

- [ ] **Step 5: Relancer les tests**

Run: `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run src/utils`
Expected: PASS, y compris `index.test.ts` (« exporte exactement whenAllDefined et registerTranslation », « n'embarque aucun composant »). Si le test « aucun composant » échoue parce que `fr.ts` tire un fichier de composant, corriger l'import de types concerné (`import type` seulement).

- [ ] **Step 6: Renforcer le test de bundle**

Dans `utils/index.test.ts`, ajouter dans le `describe` :

```ts
it('embarque la traduction fr (repli) mais ni composant ni customElements.define', async () => {
    const { inputs, code } = await bundle('./index.ts');

    expect(inputs.some((path) => path.endsWith('translations/fr.ts'))).toBe(true);
    expect(inputs.filter((path) => path.includes('/components/'))).toEqual([]);
    expect(code).not.toMatch(/customElements\s*\.\s*define/);
});
```

Run: `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run src/utils && node /private/tmp/claude-501/-Users-jon-Code-Active-projects-ariane/b3a2705d-332d-4038-91f8-31e3f60c8ee8/scratchpad/utils-size.mjs`
Expected: PASS ; nouvelle taille supérieure à la référence (le surcoût attendu est la traduction `fr`). Noter l'écart pour la PR.

- [ ] **Step 7: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add packages/core/src/utils && git commit -m "feat(core): registerTranslation de /utils enregistre fr en premier, repli complet (#335)"
```

---

### Task 3: Message de validité du datepicker localisé

**Files:**

- Modify: `packages/core/src/components/datepicker/datepicker.ts`
- Modify: `packages/core/src/components/datepicker/datepicker.test.ts`
- Modify: `packages/core/src/components/datepicker/datepicker.browser.test.ts`

**Interfaces:**

- Consumes: terme `validationValueMissing` (Tâche 1).

- [ ] **Step 1: Écrire les tests (échouent)**

Dans `datepicker.test.ts`, dans le `describe('setValidity / required', …)`, à la suite du test « vide → setValidity({ valueMissing:true }) appelé », ajouter (en reprenant le helper `withFakeInternals` et la structure du test voisin ; relire d'abord les lignes 492 à 540 du fichier pour réutiliser exactement la fabrication de l'élément) :

```ts
it(
    'le message de validité est localisé selon lang',
    withFakeInternals(async (setValiditySpy) => {
        await fixture<ArDatepicker>(html`<ar-datepicker required lang="en"></ar-datepicker>`);
        const call = setValiditySpy.mock.calls.find(
            ([flags]: [ValidityStateFlags]) => flags?.valueMissing === true,
        );
        expect(call?.[1]).toBe('Please fill out this field.');
    }),
);

it(
    'lang="fr" donne le message français',
    withFakeInternals(async (setValiditySpy) => {
        await fixture<ArDatepicker>(html`<ar-datepicker required lang="fr"></ar-datepicker>`);
        const call = setValiditySpy.mock.calls.find(
            ([flags]: [ValidityStateFlags]) => flags?.valueMissing === true,
        );
        expect(call?.[1]).toBe('Veuillez renseigner ce champ.');
    }),
);

it(
    'non obligatoire ou désactivé : aucun message valueMissing',
    withFakeInternals(async (setValiditySpy) => {
        await fixture<ArDatepicker>(html`<ar-datepicker lang="en"></ar-datepicker>`);
        await fixture<ArDatepicker>(html`<ar-datepicker required disabled></ar-datepicker>`);
        const missing = setValiditySpy.mock.calls.filter(
            ([flags]: [ValidityStateFlags]) => flags?.valueMissing === true,
        );
        expect(missing).toHaveLength(0);
    }),
);
```

Adapter les noms (`fixture`, `html`, `withFakeInternals`) à ceux déjà importés dans le fichier.

- [ ] **Step 2: Lancer pour voir l'échec**

Run: `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run src/components/datepicker/datepicker.test.ts -t "setValidity"`
Expected: FAIL sur les deux tests de langue (le message est « Veuillez sélectionner une date. »).

- [ ] **Step 3: Implémenter**

Dans `datepicker.ts`, `_syncFormValue()` : remplacer `'Veuillez sélectionner une date.',` par `this.localize.term('validationValueMissing'),`.

Dans `updated()`, étendre la condition de synchronisation pour que le message suive un changement de `lang` (le contrôleur de localisation déclenche une mise à jour sans propriété modifiée) :

```ts
if (
    changed.has('value') ||
    changed.has('required') ||
    changed.has('disabled') ||
    (changed as Map<PropertyKey, unknown>).has('_formDisabled') ||
    (this.required && !this.value)
) {
    this._syncFormValue();
}
```

- [ ] **Step 4: Relancer**

Run: `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run src/components/datepicker`
Expected: PASS (tous les tests du datepicker).

- [ ] **Step 5: Test navigateur : le message suit un changement de langue**

Dans `datepicker.browser.test.ts`, ajouter (reprendre les imports et le motif `fixture` du fichier ; `internals` est `protected`, d'où le cast) :

```ts
it('le message de validité suit un changement de lang à chaud', async () => {
    const el = await fixture<ArDatepicker>(
        html`<ar-datepicker required lang="fr"></ar-datepicker>`,
    );
    const message = () =>
        (el as unknown as { internals: ElementInternals }).internals.validationMessage;
    expect(message()).to.equal('Veuillez renseigner ce champ.');

    el.setAttribute('lang', 'en');
    await el.updateComplete;
    expect(message()).to.equal('Please fill out this field.');
});
```

Run: `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && cd /Users/jon/Code/Active_projects/ariane/packages/core && ARIANE_BROWSERS=chromium,webkit npx web-test-runner --files "src/components/datepicker/datepicker.browser.test.ts"`
Expected: PASS. Si le changement de `lang` posé par attribut n'atteint pas le contrôleur (il lit `host.lang`), faire passer par `document.documentElement.lang = 'en'` comme le fait le haut du fichier et restaurer `'fr'` en `finally`.

- [ ] **Step 6: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add packages/core/src/components/datepicker && git commit -m "fix(core): ar-datepicker localise son message de validité obligatoire (#335)"
```

---

### Task 4: Bundles CDN : registre partagé et repli `fr`

**Files:**

- Modify: `packages/core/src/cdn-utils-prod.browser.test.ts`
- Modify: `packages/core/src/cdn-utils-dev.browser.test.ts`

**Interfaces:**

- Consumes: enrobage de la Tâche 2 (dans `cdn/utils.js` après `npm run build:bundles`).

- [ ] **Step 1: Construire les bundles**

Run: `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && cd /Users/jon/Code/Active_projects/ariane/packages/core && npm run build:bundles && wc -c cdn/utils.js cdn/utils.dev.js`
Expected: build sans erreur ; noter la taille de `cdn/utils.js` pour la PR.

- [ ] **Step 2: Écrire le test de repli (échoue sans l'enrobage, passe avec)**

Dans `cdn-utils-prod.browser.test.ts`, après le test « une traduction enregistrée par utils atteint un composant… », ajouter (le registre étant partagé entre les tests du fichier, le code de langue `zy` est distinct de `zz`) :

```ts
it('une traduction partielle se replie, terme par terme, sur le français intégré', async () => {
    utils.registerTranslation({
        $code: 'zy',
        $name: 'Test partiel',
        $dir: 'ltr',
        loading: 'Partiel',
    });
    await import('../cdn/autoloader.js');

    const el = document.createElement('ar-spinner');
    el.setAttribute('lang', 'zy');
    el.setAttribute('done', '');
    document.body.appendChild(el);
    await customElements.whenDefined('ar-spinner');
    await (el as unknown as { updateComplete: Promise<boolean> }).updateComplete;

    // `loadingDone` est absent de la traduction `zy` : repli sur le français.
    expect(el.shadowRoot?.querySelector('[part="status"] p')?.textContent).to.equal(
        'Chargement terminé',
    );
    el.remove();
});
```

Faire la même addition dans `cdn-utils-dev.browser.test.ts` en important `../cdn/utils.dev.js` / `../cdn/autoloader.dev.js` selon le motif de ce fichier.

- [ ] **Step 3: Lancer**

Run: `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && cd /Users/jon/Code/Active_projects/ariane/packages/core && ARIANE_BROWSERS=chromium,webkit npx web-test-runner --files "src/cdn-utils-*.browser.test.ts"`
Expected: PASS. Contre-vérification de l'utilité du test : sur `dev` (sans l'enrobage), la même assertion échoue car le repli est `zz`/`zy` lui-même. Si le test passe sans l'enrobage, il ne prouve rien : le rendre plus strict avant de continuer.

- [ ] **Step 4: Garde-fou CDN**

Run: `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && cd /Users/jon/Code/Active_projects/ariane/packages/core && npm run check:cdn`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add packages/core/src/cdn-utils-prod.browser.test.ts packages/core/src/cdn-utils-dev.browser.test.ts && git commit -m "test(core): le repli français s'applique aux bundles CDN (#335)"
```

---

### Task 5: Documentation et skill

**Files:**

- Modify: `packages/core/scripts/skill/content/ariane/references/i18n.md`
- Modify: `apps/docs/src/pages/getting-started/traductions.astro`
- Régénérés : `packages/core/skills/**`, `packages/core/llms/**` (s'ils sont suivis par git)

- [ ] **Step 1: Réécrire les énoncés d'`i18n.md`**

Dans `i18n.md` :

1. Dans le bloc de code TypeScript, remplacer le commentaire `// ... tous les termes, traduits` par `// ... les termes à traduire (les termes absents s'affichent en français)`, et idem pour le bloc HTML du CDN.
2. Remplacer la puce « Le type `Translation` impose de fournir tous les termes … » par :

```md
- `Translation` n'impose que `$code`, `$name` et `$dir` : un terme absent s'affiche en français (repli terme par terme). Le tableau ci-dessous liste les termes disponibles (noms et arguments). Pour que le compilateur garantisse une traduction complète et signale les termes ajoutés dans une version ultérieure, typer avec `FullTranslation` (exporté par `@ariane-ui/core/utils`) : un terme ajouté en version mineure devient alors une erreur de compilation, par choix. Les traductions `fr` et `en` intégrées n'ont pas d'export public.
- Surcharger une traduction existante : enregistrer un objet partiel avec le même `$code` (`fr`, `en`, ou `fr-CA` pour une variante régionale). Les termes sont fusionnés par-dessus les existants, seul ce qui est fourni change. Code régional : `fr-CA` ne s'applique qu'à `fr-CA` ; `fr` couvre les autres variantes (`fr-FR`, `fr-BE`…).
```

3. Remplacer la puce « Ordre d'enregistrement … » par :

```md
- Ordre d'enregistrement : avec `registerTranslation` importé de `@ariane-ui/core/utils` (ou de `cdn/utils.js`), l'ordre n'a pas d'importance. La traduction française intégrée est enregistrée à l'import, donc c'est toujours la langue de repli, complète ; une langue sans traduction s'affiche en français. Une surcharge de `fr` ou de `en` enregistrée avant ou après les composants est conservée. Ces garanties ne valent pas pour un `registerTranslation` importé directement de `@shoelace-style/localize`, où la première traduction enregistrée devient le repli.
```

4. Dans le tableau des termes, ajouter après la ligne `ar-alert` :

```md
| Validation des formulaires | `validationValueMissing` — message de validité native (`validationMessage`, bulle du navigateur) d'un champ obligatoire vide. Pour un message affiché dans la page, utiliser le slot `error` du composant. Autres drapeaux de `ValidityState` : nom en `validation` + drapeau (`validationRangeUnderflow`…), ajoutés avec les fonctionnalités qui en ont besoin. |
```

5. Ajouter `ar-datepicker` n'est pas nécessaire (déjà listé). Reformatter la ligne du tableau pour garder l'alignement Prettier si le fichier est passé par `prettier --check`.

- [ ] **Step 2: Mettre à jour la page de doc `traductions.astro`**

Lire `apps/docs/src/pages/getting-started/traductions.astro`. Aux endroits qui disent « copie de fr.ts, traduite terme par terme » et « tous les termes de fr.ts, traduits » (constantes `codeCustomTranslationCdnImportModule` et `codeCustomTranslationNpm`, environ lignes 23 à 70) : reformuler pour indiquer que seuls les termes à changer sont nécessaires, le reste s'affichant en français ; ajouter dans la section « Avec le paquet NPM » un paragraphe sur `FullTranslation` (strict, opt-in) et sur la surcharge d'un code existant (`fr`), avec les phrases de l'étape 1. Vérifier ensuite qu'aucune phrase du fichier n'affirme encore que `Translation` impose tous les termes : `grep -n "tous les termes" apps/docs/src/pages/getting-started/traductions.astro`.

- [ ] **Step 3: Régénérer et contrôler le skill**

Run: `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && cd /Users/jon/Code/Active_projects/ariane/packages/core && npm run build:skill && npm run check:skill`
Expected: PASS. `git status --short` montre les fichiers régénérés ; s'ils sont suivis par git, les ajouter au commit.

- [ ] **Step 4: Tests de la doc**

Run: `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && cd /Users/jon/Code/Active_projects/ariane && npm run test 2>&1 | tail -15`
Expected: PASS (suite Vitest racine : core et docs).

- [ ] **Step 5: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add -A packages/core/scripts packages/core/skills packages/core/llms apps/docs && git commit -m "docs(core): traductions partielles, FullTranslation, repli fr et ordre d'enregistrement (#335)"
```

(Vérifier d'abord avec `git status --short` qu'aucun fichier hors périmètre n'est ajouté ; ne jamais committer `dist/`.)

---

### Task 6: Vérification d'ensemble

**Files:** aucun changement attendu.

- [ ] **Step 1: Suites complètes**

Run: `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && cd /Users/jon/Code/Active_projects/ariane && npm run test && ARIANE_BROWSERS=chromium,webkit npm run test:browser --workspace=packages/core`
Expected: tout PASS. Firefox est couvert par la CI.

- [ ] **Step 2: Lint, formatage, build**

Run: `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && cd /Users/jon/Code/Active_projects/ariane && npx prettier --check packages/core/src docs 2>&1 | tail -5; npm run lint --workspace=packages/core 2>&1 | tail -5; npm run build --workspace=packages/core 2>&1 | tail -8`
Expected: formatage conforme (corriger avec `npx prettier --write` sur les fichiers de la branche si besoin), lint sans erreur, build complet (inclut `check:cdn` et `check:skill`).

- [ ] **Step 3: Mesures pour la PR**

Reporter : taille de `utils/index.ts` minifié avant/après (Tâche 2) et de `cdn/utils.js` (Tâche 4).

- [ ] **Step 4: Rapport au mainteneur, sans pousser**

Résumer : commits de la branche, résultats de tests, mesures de taille, écarts éventuels. **Demander confirmation avant `git push` et avant d'ouvrir la PR** (description de PR : référence #335 sans mot-clé de fermeture ; label `status:en-attente-release` sur l'issue à la fusion, fermeture à la release sur `main`, conformément à la mémoire `feedback_issue_close_on_release_only`).
