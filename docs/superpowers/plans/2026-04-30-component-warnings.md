# Component Warnings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter les appels `warn()` (conditionnel à `__DEV__`) dans les composants existants, en migrant les `console.warn` nus et en ajoutant des contrôles utiles (a11y, bornes numériques, combinaisons invalides), avec tests de non-régression pour chaque avertissement.

**Architecture:** Utiliser l'utilitaire `warn(tag, message)` de `packages/core/src/utils/warn.ts` qui conditionne l'affichage à `__DEV__`. Ajouter `define: { __DEV__: 'true' }` dans `vitest.config.ts` pour que les tests puissent exercer les branches `warn()`. Chaque warn dans `updated()` est déclenché par le changement de la propriété concernée.

**Tech Stack:** Lit 3, TypeScript, Vitest, happy-dom.

---

## Fichiers modifiés

| Fichier                                                        | Action                                                                                                                 |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `packages/core/vitest.config.ts`                               | Ajouter `define: { __DEV__: 'true' }` au niveau racine                                                                 |
| `packages/core/src/components/alert/alert.ts`                  | Supprimer la fonction `warn()` locale, importer depuis utils                                                           |
| `packages/core/src/components/alert/alert.test.ts`             | Supprimer le test existant qui vérifiait `console.warn` (aucun test à écrire pour ar-alert — le warn local était mort) |
| `packages/core/src/components/dropdown/dropdown.ts`            | Remplacer les 2 `console.warn` nus par `warn()`                                                                        |
| `packages/core/src/components/dropdown/dropdown.test.ts`       | Ajouter tests warn trigger introuvable                                                                                 |
| `packages/core/src/components/stepper/stepper.ts`              | Remplacer `console.warn` nu par `warn()`                                                                               |
| `packages/core/src/components/stepper/stepper.test.ts`         | Ajouter test warn desktop-target introuvable                                                                           |
| `packages/core/src/components/dialog/dialog.ts`                | Remplacer `console.warn` dans `_warnIfMissingLabel()` + ajouter warn placement/modal                                   |
| `packages/core/src/components/dialog/dialog.test.ts`           | Ajouter tests warn label manquant + placement/modal                                                                    |
| `packages/core/src/components/progressbar/progressbar.ts`      | Ajouter `updated()` avec warn si percent hors [0, 100]                                                                 |
| `packages/core/src/components/progressbar/progressbar.test.ts` | Ajouter tests warn percent                                                                                             |
| `packages/core/src/components/pagination/pagination.ts`        | Ajouter warn dans `updated()` si current hors bornes ou total < 1                                                      |
| `packages/core/src/components/pagination/pagination.test.ts`   | Ajouter tests warn pagination                                                                                          |
| `packages/core/src/components/spinner/spinner.ts`              | Ajouter warn dans `updated()` si loadingLabel ou doneLabel vides                                                       |
| `packages/core/src/components/spinner/spinner.test.ts`         | Ajouter tests warn spinner                                                                                             |

---

## Task 0 : Créer la branche

**Files:** aucun fichier modifié.

- [ ] **Step 1 : Créer la branche depuis dev**

```bash
cd /Users/jon/Code/Active_projects/ariane
git checkout dev && git pull
git checkout -b feat/component-warnings
```

Expected : branch `feat/component-warnings` créée et active.

---

## Task 1 : Fixer vitest.config.ts — injecter `__DEV__`

**Files:**

- Modify: `packages/core/vitest.config.ts`

Sans ce fix, tout test qui déclenche un `warn()` lancerait `ReferenceError: __DEV__ is not defined`. Cette tâche est un prérequis pour toutes les suivantes.

- [ ] **Step 1 : Ajouter `define` au niveau racine du config**

Modifier `packages/core/vitest.config.ts` :

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
    define: {
        __DEV__: 'true',
    },
    test: {
        environment: 'happy-dom',
        include: ['src/**/*.test.ts'],
        exclude: ['src/**/*.browser.test.ts', 'src/**/*.a11y.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*.ts'],
            exclude: [
                'src/**/*.test.ts',
                'src/**/*.browser.test.ts',
                'src/**/*.a11y.test.ts',
                'src/**/*.styles.ts',
                'src/controllers/scroll-follow.controller.ts',
            ],
            thresholds: {
                lines: 80,
                functions: 80,
                branches: 70,
                statements: 80,
            },
        },
        isolate: true,
    },
});
```

- [ ] **Step 2 : Vérifier que les tests existants passent toujours**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run test
```

Expected : tous les tests passent (le `define` est inerte si aucun code n'utilise encore `__DEV__` dans les tests).

- [ ] **Step 3 : Commit**

```bash
git add packages/core/vitest.config.ts
git commit -m "test(vitest): injecte __DEV__=true pour les tests unitaires"
```

---

## Task 2 : ar-alert — supprimer la fonction warn() locale

**Files:**

- Modify: `packages/core/src/components/alert/alert.ts`

La fonction `warn()` locale (lignes 6–9) est exportée mais non utilisée dans la codebase. Elle contourne `__DEV__` et doit être supprimée. Aucun test à ajouter : la `console.error` dans `_finishHide` reste intentionnellement un `console.error` (erreur runtime, pas dev-only).

- [ ] **Step 1 : Supprimer la fonction locale**

Dans `packages/core/src/components/alert/alert.ts`, supprimer les lignes 6–9 :

```diff
-export function warn(name: string, message: string, error?: Error) {
-    if (error) console.warn(`${name} - ${message}`, error);
-    else console.warn(`${name} - ${message}`);
-}
-
 /** Objet de configuration d'un webcomposant ArAlert */
```

- [ ] **Step 2 : Vérifier la compilation TypeScript**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run test -- --reporter=verbose 2>&1 | grep -E "(PASS|FAIL|error)" | head -20
```

Expected : aucune erreur de compilation, les tests alert passent.

- [ ] **Step 3 : Commit**

```bash
git add packages/core/src/components/alert/alert.ts
git commit -m "refactor(alert): supprime la fonction warn() locale non utilisée"
```

---

## Task 3 : ar-dropdown — migrer les console.warn

**Files:**

- Modify: `packages/core/src/components/dropdown/dropdown.ts`
- Modify: `packages/core/src/components/dropdown/dropdown.test.ts`

Deux `console.warn` nus existent (lignes 93 et 123) — trigger externe introuvable.

- [ ] **Step 1 : Écrire les tests qui échouent**

Dans `packages/core/src/components/dropdown/dropdown.test.ts`, ajouter un bloc `describe` dédié aux warnings (ajouter **après** les describes existants, avant la fermeture de la suite principale) :

```ts
describe('warn() — trigger introuvable', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('émet un warn si trigger pointe vers un ID inexistant (firstUpdated)', async () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await fixture('<ar-dropdown trigger="id-qui-nexiste-pas"></ar-dropdown>');

        expect(spy).toHaveBeenCalledOnce();
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('[ar-dropdown]'));
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('id-qui-nexiste-pas'));
    });

    it('émet un warn si trigger est mis à jour vers un ID inexistant', async () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const el = await fixture<ArDropdown>('<ar-dropdown></ar-dropdown>');

        el.trigger = 'id-inconnu';
        await waitForUpdate(el);

        expect(spy).toHaveBeenCalledOnce();
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('[ar-dropdown]'));
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('id-inconnu'));
    });
});
```

- [ ] **Step 2 : Vérifier que les tests échouent**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run test -- --reporter=verbose packages/core/src/components/dropdown/dropdown.test.ts 2>&1 | tail -20
```

Expected : les deux nouveaux tests FAIL (le `console.warn` brut ne matche pas le format `[ar-dropdown]`).

- [ ] **Step 3 : Migrer les console.warn dans dropdown.ts**

Ajouter l'import en tête de `packages/core/src/components/dropdown/dropdown.ts` (après les imports existants) :

```ts
import { warn } from '../../utils/warn.js';
```

Remplacer ligne 93 :

```diff
-            console.warn(`[ar-dropdown] Aucun élément trouvé avec l'id "${this.trigger}".`);
+            warn('ar-dropdown', `Aucun élément trouvé avec l'id "${this.trigger}".`);
```

Remplacer ligne 123 :

```diff
-                console.warn(`[ar-dropdown] Aucun élément trouvé avec l'id "${this.trigger}".`);
+                warn('ar-dropdown', `Aucun élément trouvé avec l'id "${this.trigger}".`);
```

- [ ] **Step 4 : Vérifier que les tests passent**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run test -- --reporter=verbose packages/core/src/components/dropdown/dropdown.test.ts 2>&1 | tail -20
```

Expected : tous les tests PASS.

- [ ] **Step 5 : Commit**

```bash
git add packages/core/src/components/dropdown/dropdown.ts packages/core/src/components/dropdown/dropdown.test.ts
git commit -m "feat(dropdown): migre les console.warn vers warn() conditionnel __DEV__"
```

---

## Task 4 : ar-stepper — migrer le console.warn

**Files:**

- Modify: `packages/core/src/components/stepper/stepper.ts`
- Modify: `packages/core/src/components/stepper/stepper.test.ts`

Un `console.warn` nu existe ligne 384 dans `_teleportToTarget()`.

- [ ] **Step 1 : Écrire le test qui échoue**

Dans `packages/core/src/components/stepper/stepper.test.ts`, ajouter un bloc dédié aux warnings :

```ts
describe('warn() — desktop-target introuvable', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('émet un warn si desktop-target pointe vers un ID inexistant', async () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        // Simuler un viewport desktop pour déclencher _teleportToTarget
        Object.defineProperty(window, 'innerWidth', { writable: true, value: 1200 });
        const el = await fixture<ArStepper>(
            '<ar-stepper desktop-target="conteneur-inexistant" desktop-from="992"></ar-stepper>',
        );
        // Forcer la résolution du MediaQueryList en simulant le callback
        el['_handleMediaChange']?.({ matches: true } as MediaQueryListEvent);
        await waitForUpdate(el);

        expect(spy).toHaveBeenCalled();
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('[ar-stepper]'));
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('conteneur-inexistant'));
    });
});
```

Note : si `_handleMediaChange` est privée et inaccessible, utiliser directement `el['_teleportToTarget']?.()` après `await el.updateComplete`.

- [ ] **Step 2 : Vérifier que le test échoue**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run test -- --reporter=verbose 2>&1 | grep -A 5 "desktop-target"
```

- [ ] **Step 3 : Migrer le console.warn dans stepper.ts**

Ajouter l'import en tête de `packages/core/src/components/stepper/stepper.ts` :

```ts
import { warn } from '../../utils/warn.js';
```

Remplacer ligne 384 :

```diff
-            console.warn(`[ar-stepper] desktop target "${this.desktopTarget}" not found`);
+            warn('ar-stepper', `desktop-target "${this.desktopTarget}" introuvable.`);
```

- [ ] **Step 4 : Vérifier que les tests passent**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run test -- --reporter=verbose packages/core/src/components/stepper/stepper.test.ts 2>&1 | tail -20
```

Expected : tous les tests PASS.

- [ ] **Step 5 : Commit**

```bash
git add packages/core/src/components/stepper/stepper.ts packages/core/src/components/stepper/stepper.test.ts
git commit -m "feat(stepper): migre le console.warn vers warn() conditionnel __DEV__"
```

---

## Task 5 : ar-dialog — migrer \_warnIfMissingLabel + ajouter warn placement/modal

**Files:**

- Modify: `packages/core/src/components/dialog/dialog.ts`
- Modify: `packages/core/src/components/dialog/dialog.test.ts`

Deux cas :

1. `_warnIfMissingLabel()` appelle `console.warn` directement → migrer vers `warn()`
2. Ajouter un warn si `placement` est défini à une valeur non-défaut alors que `mode === 'modal'`

- [ ] **Step 1 : Écrire les tests qui échouent**

Dans `packages/core/src/components/dialog/dialog.test.ts`, ajouter :

```ts
describe('warn() — label manquant et placement/modal', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("émet un warn si aucun label ni slot label n'est fourni", async () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await fixture('<ar-dialog open></ar-dialog>');

        expect(spy).toHaveBeenCalledOnce();
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('[ar-dialog]'));
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('label'));
    });

    it("n'émet pas de warn si label est fourni", async () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await fixture('<ar-dialog open label="Titre du dialog"></ar-dialog>');

        expect(spy).not.toHaveBeenCalled();
    });

    it('émet un warn si placement est défini hors mode drawer', async () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await fixture('<ar-dialog label="Test" placement="left" mode="modal"></ar-dialog>');

        expect(spy).toHaveBeenCalledWith(expect.stringContaining('[ar-dialog]'));
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('placement'));
    });

    it("n'émet pas de warn placement si mode est drawer", async () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await fixture('<ar-dialog label="Test" placement="left" mode="drawer"></ar-dialog>');

        // Seul le warn label peut être absent ; pas de warn placement
        const placementWarns = spy.mock.calls.filter((c) => String(c[0]).includes('placement'));
        expect(placementWarns).toHaveLength(0);
    });
});
```

- [ ] **Step 2 : Vérifier que les tests échouent**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run test -- --reporter=verbose packages/core/src/components/dialog/dialog.test.ts 2>&1 | tail -30
```

Expected : les tests label échouent (format de message incorrect), le test placement échoue (warn absent).

- [ ] **Step 3 : Migrer \_warnIfMissingLabel et ajouter warn placement/modal**

Ajouter l'import en tête de `packages/core/src/components/dialog/dialog.ts` :

```ts
import { warn } from '../../utils/warn.js';
```

Remplacer `_warnIfMissingLabel()` :

```ts
private _warnIfMissingLabel(): void {
    if (this._hasWarnedMissingLabel) return;
    if ((this.label ?? '').trim() || this._slotController.test('label')) return;

    this._hasWarnedMissingLabel = true;
    warn(
        'ar-dialog',
        'Aucun libellé accessible fourni. Ajoutez la propriété "label" ou un enfant direct avec slot="label".',
    );
}
```

Dans `updated()`, ajouter le contrôle placement/modal après l'appel à `_warnIfMissingLabel()` :

```ts
override updated(changedProperties: PropertyValues<this>): void {
    this._warnIfMissingLabel();
    if (
        (changedProperties.has('placement') || changedProperties.has('mode')) &&
        this.mode === 'modal' &&
        this.placement !== 'right'
    ) {
        warn('ar-dialog', 'placement n\'a aucun effet en mode "modal".');
    }
    if (changedProperties.has('open')) {
        if (this.open && !this.dialog?.open) {
            this._show();
        } else if (!this.open && this.dialog?.open) {
            this._close();
        }
    }
}
```

- [ ] **Step 4 : Vérifier que les tests passent**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run test -- --reporter=verbose packages/core/src/components/dialog/dialog.test.ts 2>&1 | tail -30
```

Expected : tous les tests PASS.

- [ ] **Step 5 : Commit**

```bash
git add packages/core/src/components/dialog/dialog.ts packages/core/src/components/dialog/dialog.test.ts
git commit -m "feat(dialog): migre warn() label + ajoute warn placement/modal"
```

---

## Task 6 : ar-progressbar — warn si percent hors bornes

**Files:**

- Modify: `packages/core/src/components/progressbar/progressbar.ts`
- Modify: `packages/core/src/components/progressbar/progressbar.test.ts`

Le composant borne silencieusement `percent` entre 0 et 100. Ajouter un warn pour signaler les valeurs hors-plage.

- [ ] **Step 1 : Écrire les tests qui échouent**

Dans `packages/core/src/components/progressbar/progressbar.test.ts`, ajouter :

```ts
describe('warn() — percent hors bornes', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('émet un warn si percent > 100', async () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await fixture('<ar-progressbar percent="150"></ar-progressbar>');

        expect(spy).toHaveBeenCalledOnce();
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('[ar-progressbar]'));
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('150'));
    });

    it('émet un warn si percent < 0', async () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await fixture('<ar-progressbar percent="-10"></ar-progressbar>');

        expect(spy).toHaveBeenCalledOnce();
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('[ar-progressbar]'));
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('-10'));
    });

    it("n'émet pas de warn pour une valeur valide", async () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await fixture('<ar-progressbar percent="50"></ar-progressbar>');

        expect(spy).not.toHaveBeenCalled();
    });

    it('émet un warn si percent est NaN (attribut HTML invalide)', async () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const el = await fixture<ArProgressbar>('<ar-progressbar percent="abc"></ar-progressbar>');

        // Lit convertit "abc" en NaN pour un Number property
        if (isNaN(el.percent)) {
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('[ar-progressbar]'));
        }
    });
});
```

- [ ] **Step 2 : Vérifier que les tests échouent**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run test -- --reporter=verbose packages/core/src/components/progressbar/progressbar.test.ts 2>&1 | tail -20
```

- [ ] **Step 3 : Ajouter warn() dans progressbar.ts**

Ajouter l'import :

```ts
import { warn } from '../../utils/warn.js';
```

Ajouter la méthode `updated()` dans `ArProgressbar` (avant `render()`) :

```ts
override updated(changed: Map<string, unknown>): void {
    if (changed.has('percent')) {
        if (isNaN(this.percent)) {
            warn('ar-progressbar', `percent est NaN — vérifiez l'attribut HTML fourni.`);
        } else if (this.percent < 0 || this.percent > 100) {
            warn(
                'ar-progressbar',
                `percent doit être compris entre 0 et 100. Valeur reçue : ${this.percent}. Elle sera bornée automatiquement.`,
            );
        }
    }
}
```

- [ ] **Step 4 : Vérifier que les tests passent**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run test -- --reporter=verbose packages/core/src/components/progressbar/progressbar.test.ts 2>&1 | tail -20
```

- [ ] **Step 5 : Commit**

```bash
git add packages/core/src/components/progressbar/progressbar.ts packages/core/src/components/progressbar/progressbar.test.ts
git commit -m "feat(progressbar): avertit si percent est hors bornes [0, 100]"
```

---

## Task 7 : ar-pagination — warn si bornes numériques invalides

**Files:**

- Modify: `packages/core/src/components/pagination/pagination.ts`
- Modify: `packages/core/src/components/pagination/pagination.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

Dans `packages/core/src/components/pagination/pagination.test.ts`, ajouter :

```ts
describe('warn() — bornes numériques', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('émet un warn si total < 1', async () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await fixture('<ar-pagination total="0"></ar-pagination>');

        expect(spy).toHaveBeenCalledOnce();
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('[ar-pagination]'));
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('total'));
    });

    it('émet un warn si current < 1', async () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await fixture('<ar-pagination current="0" total="5"></ar-pagination>');

        expect(spy).toHaveBeenCalledWith(expect.stringContaining('[ar-pagination]'));
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('current'));
    });

    it('émet un warn si current > total', async () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await fixture('<ar-pagination current="10" total="5"></ar-pagination>');

        expect(spy).toHaveBeenCalledWith(expect.stringContaining('[ar-pagination]'));
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('current'));
    });

    it("n'émet pas de warn pour des valeurs valides", async () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await fixture('<ar-pagination current="3" total="10"></ar-pagination>');

        expect(spy).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2 : Vérifier que les tests échouent**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run test -- --reporter=verbose packages/core/src/components/pagination/pagination.test.ts 2>&1 | tail -20
```

- [ ] **Step 3 : Ajouter warn() dans pagination.ts**

Ajouter l'import :

```ts
import { warn } from '../../utils/warn.js';
```

Ajouter la méthode `updated()` dans `ArPagination` (avant `render()`) :

```ts
override updated(changed: Map<string, unknown>): void {
    if (changed.has('total') && this.total < 1) {
        warn('ar-pagination', `total doit être ≥ 1. Valeur reçue : ${this.total}.`);
    }
    if (changed.has('current') || changed.has('total')) {
        if (this.current < 1) {
            warn('ar-pagination', `current doit être ≥ 1. Valeur reçue : ${this.current}.`);
        } else if (this.current > this.total) {
            warn(
                'ar-pagination',
                `current (${this.current}) est supérieur à total (${this.total}).`,
            );
        }
    }
}
```

- [ ] **Step 4 : Vérifier que les tests passent**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run test -- --reporter=verbose packages/core/src/components/pagination/pagination.test.ts 2>&1 | tail -20
```

- [ ] **Step 5 : Commit**

```bash
git add packages/core/src/components/pagination/pagination.ts packages/core/src/components/pagination/pagination.test.ts
git commit -m "feat(pagination): avertit si current ou total sont hors bornes"
```

---

## Task 8 : ar-spinner — warn si labels ARIA vides

**Files:**

- Modify: `packages/core/src/components/spinner/spinner.ts`
- Modify: `packages/core/src/components/spinner/spinner.test.ts`

Labels vides → lecteurs d'écran n'annoncent rien → problème d'accessibilité silencieux.

- [ ] **Step 1 : Écrire les tests qui échouent**

Dans `packages/core/src/components/spinner/spinner.test.ts`, ajouter :

```ts
describe('warn() — labels ARIA vides', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('émet un warn si loading-label est vidé', async () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await fixture('<ar-spinner loading-label=""></ar-spinner>');

        expect(spy).toHaveBeenCalledOnce();
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('[ar-spinner]'));
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('loading-label'));
    });

    it('émet un warn si done-label est vidé', async () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await fixture('<ar-spinner done-label=""></ar-spinner>');

        expect(spy).toHaveBeenCalledOnce();
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('[ar-spinner]'));
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('done-label'));
    });

    it("n'émet pas de warn avec les labels par défaut", async () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await fixture('<ar-spinner></ar-spinner>');

        expect(spy).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2 : Vérifier que les tests échouent**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run test -- --reporter=verbose packages/core/src/components/spinner/spinner.test.ts 2>&1 | tail -20
```

- [ ] **Step 3 : Ajouter warn() dans spinner.ts**

Ajouter l'import :

```ts
import { warn } from '../../utils/warn.js';
```

Ajouter la méthode `updated()` dans `ArSpinner` (avant `render()`) :

```ts
override updated(changed: Map<string, unknown>): void {
    if (changed.has('loadingLabel') && !this.loadingLabel.trim()) {
        warn('ar-spinner', 'loading-label est vide — le spinner ne sera pas annoncé aux lecteurs d\'écran.');
    }
    if (changed.has('doneLabel') && !this.doneLabel.trim()) {
        warn('ar-spinner', 'done-label est vide — l\'état terminé ne sera pas annoncé aux lecteurs d\'écran.');
    }
}
```

- [ ] **Step 4 : Vérifier que les tests passent**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run test -- --reporter=verbose packages/core/src/components/spinner/spinner.test.ts 2>&1 | tail -20
```

- [ ] **Step 5 : Commit**

```bash
git add packages/core/src/components/spinner/spinner.ts packages/core/src/components/spinner/spinner.test.ts
git commit -m "feat(spinner): avertit si loading-label ou done-label est vide (a11y)"
```

---

## Task 9 : Vérification finale et suite de tests complète

- [ ] **Step 1 : Lancer la suite de tests complète**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run test
```

Expected : tous les tests PASS, couverture maintenue (≥ 80%).

- [ ] **Step 2 : Vérifier qu'aucun console.warn nu ne subsiste dans les composants**

```bash
grep -rn "console\.warn" /Users/jon/Code/Active_projects/ariane/packages/core/src/components --include="*.ts"
```

Expected : aucune ligne retournée.

- [ ] **Step 3 : Commit de vérification (si aucune correction nécessaire)**

Si tout est propre, pas de commit supplémentaire. Sinon corriger et committer.

---

## Task 10 : Ouvrir la PR

- [ ] **Step 1 : Pousser la branche**

```bash
git push -u origin feat/component-warnings
```

- [ ] **Step 2 : Ouvrir la PR via gh**

```bash
gh pr create \
  --title "feat(components): migre les warn() vers l'utilitaire conditionnel __DEV__" \
  --base dev \
  --body "$(cat <<'EOF'
## Résumé

- Injecte `__DEV__ = true` dans `vitest.config.ts` pour permettre les tests des branches `warn()`
- Migre les 4 `console.warn` nus existants (alert local, dropdown ×2, stepper, dialog) vers `warn(tag, message)` protégé par `__DEV__`
- Ajoute des warnings utiles : `ar-progressbar` (percent hors [0,100]), `ar-pagination` (current/total hors bornes), `ar-spinner` (labels ARIA vides), `ar-dialog` (placement en mode modal)
- Couvre chaque nouveau warn par un test Vitest (anti-régression)

Closes #59

## Plan de test

- [ ] `npm run test` — tous les tests passent
- [ ] `grep -rn "console\.warn" packages/core/src/components` — aucun résultat
- [ ] Vérifier en mode dev (CDN) que les warns apparaissent bien en console
- [ ] Vérifier en mode prod que les warns sont supprimés (esbuild tree-shake)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
