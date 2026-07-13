# Mode headless (#47) — config prefix CDN + généralisation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Généraliser à 18 composants restants le pattern « classe pure + `index.ts` d'enregistrement » validé par le spike `ar-spinner`, ajouter un mécanisme de préfixe configurable (`window.ARIANE_CONFIG.prefix`) à l'autoloader CDN, et exposer un point d'entrée `headless` (classes pures sans effet de bord) pour les consommateurs npm.

**Architecture:** Chaque composant garde sa classe Lit pure dans `[name].ts` (sans décorateur `@customElement`) ; un nouveau `[name]/index.ts` fait `customElements.define('ar-x', ArX)` pour le bundle npm standard (`src/index.ts` l'importe pour effet de bord). `autoloader.ts` (CDN uniquement) importe directement les classes pures et fait lui-même `customElements.define(\`${prefix}-x\`, ArX)`avec`prefix`lu une fois sur`window.ARIANE_CONFIG?.prefix ?? 'ar'`. Voir le design complet : `docs/superpowers/specs/2026-07-07-headless-mode-config-design.md`.

**Tech Stack:** Lit 3, TypeScript, esbuild (bundles npm/CDN), Vitest (tests unitaires happy-dom), @web/test-runner + Playwright (tests navigateur/a11y), Custom Elements Manifest analyzer.

## Global Constraints

- Prettier : 100 char, 4 spaces, single quotes (appliqué automatiquement par lint-staged au commit).
- `import type` obligatoire pour tous les imports de types.
- Conventional Commits (commitlint + Husky) — préfixes `feat`, `fix`, `refactor`, `chore`, `docs`, `test`.
- Aucun fallback cosmétique dans les composants — non concerné par ce chantier (pas de style touché).
- `i18n` dans `ArianeConfig` est un contrat de type uniquement — ne pas implémenter de logique de lecture dans ce chantier (hors scope, réservé à #80).
- Niveau 2 de l'autoloader (`createAutoloader` factory) — ne pas implémenter, documenté comme extension future uniquement.

---

## Contexte de fichiers pour l'exécutant

Ces 18 composants suivent tous exactement la même structure historique (générée par
`scripts/create-component.js`) :

```ts
import { LitElement, ... } from 'lit';
import { customElement, /* property, query, state... */ } from 'lit/decorators.js';
// ...
@customElement('ar-x')
export class ArX extends LitElement {
    // ...
}

declare global {
    interface HTMLElementTagNameMap {
        'ar-x': ArX;
    }
}
```

La migration consiste, pour chaque composant, à :

1. Retirer `customElement` de l'import `lit/decorators.js` (retirer toute la ligne si c'est le seul import).
2. Retirer la ligne `@customElement('ar-x')`.
3. Retirer le bloc `declare global { interface HTMLElementTagNameMap { 'ar-x': ArX; } }` en fin de fichier (avec la ligne vide qui le précède).
4. Créer `[dir]/index.ts` :

```ts
import { ArX } from './[file].js';

customElements.define('ar-x', ArX);

declare global {
    interface HTMLElementTagNameMap {
        'ar-x': ArX;
    }
}

export { ArX };
```

5. Dans `src/index.ts`, ajouter `import './components/[dir]/index.js';` juste avant la ligne `export { ArX } from './components/[dir]/[file].js';` existante.
6. Dans chaque fichier de test du composant qui contient `import './[file].js';` en effet de bord (pas les imports `import type { ArX } from './[file].js';`, ceux-là restent inchangés), remplacer par `import './index.js';`.
7. Si un fichier de test d'un AUTRE composant importe ce composant en effet de bord (ex. `import '../dropdown-item/dropdown-item.js';` dans `dropdown.test.ts`), remplacer par `import '../dropdown-item/index.js';`.

Table de substitution (tous les composants restants, dérivée de l'état actuel du code) :

| dir             | file            | className        | tag                | import decorators avant                                                      | a des fichiers `.a11y.test.ts` / `.browser.test.ts` |
| --------------- | --------------- | ---------------- | ------------------ | ---------------------------------------------------------------------------- | --------------------------------------------------- |
| alert           | alert           | ArAlert          | ar-alert           | `import { customElement, property } from 'lit/decorators.js';`               | a11y                                                |
| breadcrumb      | breadcrumb      | ArBreadcrumb     | ar-breadcrumb      | `import { customElement, property, query, state } from 'lit/decorators.js';` | a11y, browser                                       |
| breadcrumb-item | breadcrumb-item | ArBreadcrumbItem | ar-breadcrumb-item | `import { customElement, property } from 'lit/decorators.js';`               | —                                                   |
| charcounter     | charcounter     | ArCharcounter    | ar-charcounter     | `import { customElement, property } from 'lit/decorators.js';`               | a11y                                                |
| collapse        | collapse        | ArCollapse       | ar-collapse        | `import { customElement, property, query } from 'lit/decorators.js';`        | a11y, browser                                       |
| datepicker      | datepicker      | ArDatepicker     | ar-datepicker      | `import { customElement, property, query } from 'lit/decorators.js';`        | a11y, browser                                       |
| dialog          | dialog          | ArDialog         | ar-dialog          | `import { customElement, property, query, state } from 'lit/decorators.js';` | a11y, browser                                       |
| dropdown        | dropdown        | ArDropdown       | ar-dropdown        | `import { customElement, property, query } from 'lit/decorators.js';`        | a11y, browser                                       |
| dropdown-item   | dropdown-item   | ArDropdownItem   | ar-dropdown-item   | `import { customElement } from 'lit/decorators.js';` (ligne entière retirée) | —                                                   |
| pagination      | pagination      | ArPagination     | ar-pagination      | `import { customElement, property } from 'lit/decorators.js';`               | a11y                                                |
| progressbar     | progressbar     | ArProgressbar    | ar-progressbar     | `import { customElement, property } from 'lit/decorators.js';`               | a11y                                                |
| stepper         | stepper         | ArStepper        | ar-stepper         | `import { customElement, property, query, state } from 'lit/decorators.js';` | a11y, browser                                       |
| stepper-item    | stepper-item    | ArStepperItem    | ar-stepper-item    | `import { customElement, property } from 'lit/decorators.js';`               | —                                                   |
| tab             | tab             | ArTab            | ar-tab             | `import { customElement, property } from 'lit/decorators.js';`               | —                                                   |
| tab-group       | tab-group       | ArTabGroup       | ar-tab-group       | `import { customElement, property } from 'lit/decorators.js';`               | a11y, browser                                       |
| tab-panel       | tab-panel       | ArTabPanel       | ar-tab-panel       | `import { customElement, property } from 'lit/decorators.js';`               | —                                                   |
| table-sort      | table-sort      | ArTableSort      | ar-table-sort      | `import { customElement, property } from 'lit/decorators.js';`               | a11y, browser                                       |
| tooltip         | tooltip         | ArTooltip        | ar-tooltip         | `import { customElement, property, query } from 'lit/decorators.js';`        | a11y, browser                                       |

Imports croisés en effet de bord à corriger (au-delà du fichier `.test.ts` propre à chaque composant) :

- `breadcrumb.test.ts`, `breadcrumb.a11y.test.ts`, `breadcrumb.browser.test.ts` importent `../breadcrumb-item/breadcrumb-item.js` → `../breadcrumb-item/index.js`
- `dropdown.test.ts`, `dropdown.a11y.test.ts`, `dropdown.browser.test.ts` importent `../dropdown-item/dropdown-item.js` → `../dropdown-item/index.js`
- `stepper.test.ts`, `stepper.a11y.test.ts`, `stepper.browser.test.ts` importent `../stepper-item/stepper-item.js` → `../stepper-item/index.js`
- `tab-group.test.ts`, `tab-group.a11y.test.ts`, `tab-group.browser.test.ts` importent `../tab/tab.js` ET `../tab-panel/tab-panel.js` → `../tab/index.js` et `../tab-panel/index.js`

Commande de test unitaire (rapide, à lancer après chaque tâche de migration) :

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run src/components/<dir>
```

Commande de type-check globale (à lancer après chaque tâche touchant `.ts`) :

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx tsc --noEmit
```

---

### Task 1: Créer la branche de travail

**Files:** aucun

- [ ] **Step 1: Créer et checkout la branche depuis `dev`**

```bash
cd /Users/jon/Code/Active_projects/ariane && git checkout dev && git pull && git checkout -b feat/headless-mode-config
```

Expected: branche `feat/headless-mode-config` créée, à jour avec `dev`.

---

### Task 2: Contrat de configuration `ArianeConfig`

**Files:**

- Create: `packages/core/src/types/ariane-config.d.ts`
- Create: `packages/core/src/types/ariane-config.typecheck.ts` (fichier de vérification de type, supprimé à la fin de la tâche)

**Interfaces:**

- Produces: `interface ArianeConfig { prefix?: string; i18n?: Record<string, Record<string, string>>; }`, augmentation ambiante `Window.ARIANE_CONFIG?: ArianeConfig`. Consommé par `autoloader.ts` en Task 12.

- [ ] **Step 1: Créer le fichier de déclaration ambiante**

```ts
/**
 * Contrat de configuration globale exposé par les consommateurs CDN via
 * `window.ARIANE_CONFIG` avant le chargement du script Ariane.
 */
interface ArianeConfig {
    /** Préfixe des tags custom elements générés par l'autoloader CDN. Défaut : 'ar'. */
    prefix?: string;
    /**
     * Réservé pour l'infrastructure i18n (issue #80). Structure figée pour éviter un
     * breaking change de shape plus tard, mais non lu par le code tant que #80 n'est
     * pas implémenté.
     * Forme : { <composant camelCase sans "ar">: { <clé de label>: <valeur traduite> } }
     */
    i18n?: Record<string, Record<string, string>>;
}

declare global {
    interface Window {
        ARIANE_CONFIG?: ArianeConfig;
    }
}

export {};
```

- [ ] **Step 2: Écrire un fichier de vérification de type temporaire**

```ts
// Vérifie que le contrat ArianeConfig est utilisable tel que documenté dans le design.
// Ce fichier est supprimé après vérification (Step 4) — ce n'est pas un test permanent.
window.ARIANE_CONFIG = {
    prefix: 'acme',
    i18n: {
        tableSort: {
            ascending: 'Trier par ordre croissant',
        },
    },
};
```

Sauvegarder dans `packages/core/src/types/ariane-config.typecheck.ts`.

- [ ] **Step 3: Vérifier la compilation**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx tsc --noEmit
```

Expected: aucune erreur (le fichier `.typecheck.ts` compile, `window.ARIANE_CONFIG` est typé).

- [ ] **Step 4: Supprimer le fichier de vérification temporaire**

```bash
rm /Users/jon/Code/Active_projects/ariane/packages/core/src/types/ariane-config.typecheck.ts
```

- [ ] **Step 5: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add packages/core/src/types/ariane-config.d.ts
git commit -m "feat(core): ajoute le contrat de type ArianeConfig (window.ARIANE_CONFIG)"
```

---

### Task 3: Migrer `ar-alert` (exemple travaillé en détail)

**Files:**

- Modify: `packages/core/src/components/alert/alert.ts`
- Create: `packages/core/src/components/alert/index.ts`
- Modify: `packages/core/src/components/alert/alert.test.ts`
- Modify: `packages/core/src/components/alert/alert.a11y.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**

- Consumes: aucune dépendance sur les tâches précédentes.
- Produces: `packages/core/src/components/alert/index.ts` exportant `ArAlert` avec effet de bord d'enregistrement — pattern répliqué à l'identique dans les tâches 4 à 9.

- [ ] **Step 1: Retirer le décorateur et l'import `customElement` de `alert.ts`**

Modifier la ligne d'import :

```
old: import { customElement, property } from 'lit/decorators.js';
new: import { property } from 'lit/decorators.js';
```

Retirer la ligne `@customElement('ar-alert')` juste au-dessus de `export class ArAlert extends LitElement {` (la ligne `export class ArAlert extends LitElement {` reste).

- [ ] **Step 2: Retirer le bloc `declare global` en fin de fichier**

```
old:

declare global {
    interface HTMLElementTagNameMap {
        'ar-alert': ArAlert;
    }
}
new: (rien — fin de fichier après la fermeture de la classe ArAlert)
```

- [ ] **Step 3: Créer `alert/index.ts`**

```ts
import { ArAlert } from './alert.js';

customElements.define('ar-alert', ArAlert);

declare global {
    interface HTMLElementTagNameMap {
        'ar-alert': ArAlert;
    }
}

export { ArAlert };
```

- [ ] **Step 4: Mettre à jour `src/index.ts`**

```
old: export { ArAlert } from './components/alert/alert.js';
new:
import './components/alert/index.js';
export { ArAlert } from './components/alert/alert.js';
```

- [ ] **Step 5: Mettre à jour les imports d'effet de bord dans les tests**

Dans `alert.test.ts` :

```
old: import './alert.js';
new: import './index.js';
```

Dans `alert.a11y.test.ts` :

```
old: import './alert.js';
new: import './index.js';
```

- [ ] **Step 6: Lancer les tests unitaires du composant**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run src/components/alert
```

Expected: PASS, tous les tests existants passent sans modification de leur contenu.

- [ ] **Step 7: Vérifier la compilation**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Step 8: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add packages/core/src/components/alert packages/core/src/index.ts
git commit -m "refactor(alert): sépare la classe pure de l'enregistrement du tag (mode headless)"
```

---

### Task 4: Migrer `ar-breadcrumb` et `ar-breadcrumb-item`

**Files:**

- Modify: `packages/core/src/components/breadcrumb/breadcrumb.ts`, `breadcrumb.test.ts`, `breadcrumb.a11y.test.ts`, `breadcrumb.browser.test.ts`
- Create: `packages/core/src/components/breadcrumb/index.ts`
- Modify: `packages/core/src/components/breadcrumb-item/breadcrumb-item.ts`, `breadcrumb-item.test.ts`
- Create: `packages/core/src/components/breadcrumb-item/index.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**

- Consumes: pattern défini en Task 3.
- Produces: `breadcrumb/index.ts` (export `ArBreadcrumb`), `breadcrumb-item/index.ts` (export `ArBreadcrumbItem`).

- [ ] **Step 1: `breadcrumb.ts`** — appliquer le pattern de la Task 3 :
    - Import : `import { customElement, property, query, state } from 'lit/decorators.js';` → `import { property, query, state } from 'lit/decorators.js';`
    - Retirer `@customElement('ar-breadcrumb')`
    - Retirer le bloc `declare global { interface HTMLElementTagNameMap { 'ar-breadcrumb': ArBreadcrumb; } }` en fin de fichier

- [ ] **Step 2: Créer `breadcrumb/index.ts`**

```ts
import { ArBreadcrumb } from './breadcrumb.js';

customElements.define('ar-breadcrumb', ArBreadcrumb);

declare global {
    interface HTMLElementTagNameMap {
        'ar-breadcrumb': ArBreadcrumb;
    }
}

export { ArBreadcrumb };
```

- [ ] **Step 3: `breadcrumb-item.ts`** — appliquer le pattern :
    - Import : `import { customElement, property } from 'lit/decorators.js';` → `import { property } from 'lit/decorators.js';`
    - Retirer `@customElement('ar-breadcrumb-item')`
    - Retirer le bloc `declare global` (`'ar-breadcrumb-item': ArBreadcrumbItem`)

- [ ] **Step 4: Créer `breadcrumb-item/index.ts`**

```ts
import { ArBreadcrumbItem } from './breadcrumb-item.js';

customElements.define('ar-breadcrumb-item', ArBreadcrumbItem);

declare global {
    interface HTMLElementTagNameMap {
        'ar-breadcrumb-item': ArBreadcrumbItem;
    }
}

export { ArBreadcrumbItem };
```

- [ ] **Step 5: Mettre à jour `src/index.ts`**

```
old:
export { ArBreadcrumb } from './components/breadcrumb/breadcrumb.js';
export { ArBreadcrumbItem } from './components/breadcrumb-item/breadcrumb-item.js';
new:
import './components/breadcrumb/index.js';
export { ArBreadcrumb } from './components/breadcrumb/breadcrumb.js';
import './components/breadcrumb-item/index.js';
export { ArBreadcrumbItem } from './components/breadcrumb-item/breadcrumb-item.js';
```

- [ ] **Step 6: Mettre à jour les imports d'effet de bord des tests**

Dans `breadcrumb.test.ts`, `breadcrumb.a11y.test.ts`, `breadcrumb.browser.test.ts` :

```
old: import './breadcrumb.js';
new: import './index.js';
old: import '../breadcrumb-item/breadcrumb-item.js';
new: import '../breadcrumb-item/index.js';
```

Dans `breadcrumb-item.test.ts` :

```
old: import './breadcrumb-item.js';
new: import './index.js';
```

- [ ] **Step 7: Lancer les tests unitaires**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run src/components/breadcrumb src/components/breadcrumb-item
```

Expected: PASS.

- [ ] **Step 8: Vérifier la compilation**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Step 9: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add packages/core/src/components/breadcrumb packages/core/src/components/breadcrumb-item packages/core/src/index.ts
git commit -m "refactor(breadcrumb): sépare la classe pure de l'enregistrement du tag (mode headless)"
```

---

### Task 5: Migrer `ar-charcounter`, `ar-collapse`, `ar-datepicker`, `ar-dialog`

**Files:**

- Modify + Create `index.ts` pour : `charcounter`, `collapse`, `datepicker`, `dialog` (fichiers `[name].ts`, `[name].test.ts`, `[name].a11y.test.ts` le cas échéant, `[name].browser.test.ts` le cas échéant)
- Modify: `packages/core/src/index.ts`

**Interfaces:**

- Consumes: pattern défini en Task 3.
- Produces: `index.ts` pour chacun des 4 composants, exportant leur classe respective.

- [ ] **Step 1: `charcounter.ts`**
    - Import : `import { customElement, property } from 'lit/decorators.js';` → `import { property } from 'lit/decorators.js';`
    - Retirer `@customElement('ar-charcounter')`
    - Retirer le bloc `declare global` (`'ar-charcounter': ArCharcounter`)

- [ ] **Step 2: Créer `charcounter/index.ts`**

```ts
import { ArCharcounter } from './charcounter.js';

customElements.define('ar-charcounter', ArCharcounter);

declare global {
    interface HTMLElementTagNameMap {
        'ar-charcounter': ArCharcounter;
    }
}

export { ArCharcounter };
```

- [ ] **Step 3: `collapse.ts`**
    - Import : `import { customElement, property, query } from 'lit/decorators.js';` → `import { property, query } from 'lit/decorators.js';`
    - Retirer `@customElement('ar-collapse')`
    - Retirer le bloc `declare global` (`'ar-collapse': ArCollapse`)

- [ ] **Step 4: Créer `collapse/index.ts`**

```ts
import { ArCollapse } from './collapse.js';

customElements.define('ar-collapse', ArCollapse);

declare global {
    interface HTMLElementTagNameMap {
        'ar-collapse': ArCollapse;
    }
}

export { ArCollapse };
```

- [ ] **Step 5: `datepicker.ts`**
    - Import : `import { customElement, property, query } from 'lit/decorators.js';` → `import { property, query } from 'lit/decorators.js';`
    - Retirer `@customElement('ar-datepicker')`
    - Retirer le bloc `declare global` (`'ar-datepicker': ArDatepicker`)

- [ ] **Step 6: Créer `datepicker/index.ts`**

```ts
import { ArDatepicker } from './datepicker.js';

customElements.define('ar-datepicker', ArDatepicker);

declare global {
    interface HTMLElementTagNameMap {
        'ar-datepicker': ArDatepicker;
    }
}

export { ArDatepicker };
```

- [ ] **Step 7: `dialog.ts`**
    - Import : `import { customElement, property, query, state } from 'lit/decorators.js';` → `import { property, query, state } from 'lit/decorators.js';`
    - Retirer `@customElement('ar-dialog')`
    - Retirer le bloc `declare global` (`'ar-dialog': ArDialog`)

- [ ] **Step 8: Créer `dialog/index.ts`**

```ts
import { ArDialog } from './dialog.js';

customElements.define('ar-dialog', ArDialog);

declare global {
    interface HTMLElementTagNameMap {
        'ar-dialog': ArDialog;
    }
}

export { ArDialog };
```

- [ ] **Step 9: Mettre à jour `src/index.ts`**

```
old:
export { ArProgressbar } from './components/progressbar/progressbar.js';
import './components/spinner/index.js';
export { ArSpinner } from './components/spinner/spinner.js';
new:
export { ArProgressbar } from './components/progressbar/progressbar.js';
import './components/spinner/index.js';
export { ArSpinner } from './components/spinner/spinner.js';
```

(pas de changement structurel ici — insérer les 4 nouvelles paires d'imports/exports à l'endroit correspondant à `ArCharcounter`, `ArCollapse`, `ArDatepicker`, `ArDialog` déjà exportés) :

```
old: export { ArDialog } from './components/dialog/dialog.js';
new:
import './components/dialog/index.js';
export { ArDialog } from './components/dialog/dialog.js';
```

```
old: export { ArCharcounter } from './components/charcounter/charcounter.js';
new:
import './components/charcounter/index.js';
export { ArCharcounter } from './components/charcounter/charcounter.js';
```

```
old: export { ArCollapse } from './components/collapse/collapse.js';
new:
import './components/collapse/index.js';
export { ArCollapse } from './components/collapse/collapse.js';
```

```
old: export { ArDatepicker } from './components/datepicker/datepicker.js';
new:
import './components/datepicker/index.js';
export { ArDatepicker } from './components/datepicker/datepicker.js';
```

- [ ] **Step 10: Mettre à jour les imports d'effet de bord des tests**

Dans `charcounter.test.ts`, `charcounter.a11y.test.ts` ; `collapse.test.ts`, `collapse.a11y.test.ts`, `collapse.browser.test.ts` ; `datepicker.test.ts`, `datepicker.a11y.test.ts`, `datepicker.browser.test.ts` ; `dialog.test.ts`, `dialog.a11y.test.ts`, `dialog.browser.test.ts` :

```
old: import './<file>.js';
new: import './index.js';
```

(remplacer `<file>` par `charcounter`, `collapse`, `datepicker`, `dialog` selon le fichier)

- [ ] **Step 11: Lancer les tests unitaires**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run src/components/charcounter src/components/collapse src/components/datepicker src/components/dialog
```

Expected: PASS.

- [ ] **Step 12: Vérifier la compilation**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Step 13: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add packages/core/src/components/charcounter packages/core/src/components/collapse packages/core/src/components/datepicker packages/core/src/components/dialog packages/core/src/index.ts
git commit -m "refactor(charcounter,collapse,datepicker,dialog): sépare la classe pure de l'enregistrement du tag (mode headless)"
```

---

### Task 6: Migrer `ar-dropdown` et `ar-dropdown-item`

**Files:**

- Modify: `packages/core/src/components/dropdown/dropdown.ts`, `dropdown.test.ts`, `dropdown.a11y.test.ts`, `dropdown.browser.test.ts`
- Create: `packages/core/src/components/dropdown/index.ts`
- Modify: `packages/core/src/components/dropdown-item/dropdown-item.ts`, `dropdown-item.test.ts`
- Create: `packages/core/src/components/dropdown-item/index.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**

- Consumes: pattern défini en Task 3.
- Produces: `dropdown/index.ts` (export `ArDropdown`), `dropdown-item/index.ts` (export `ArDropdownItem`).

- [ ] **Step 1: `dropdown.ts`**
    - Import : `import { customElement, property, query } from 'lit/decorators.js';` → `import { property, query } from 'lit/decorators.js';`
    - Retirer `@customElement('ar-dropdown')`
    - Retirer le bloc `declare global` (`'ar-dropdown': ArDropdown`)

- [ ] **Step 2: Créer `dropdown/index.ts`**

```ts
import { ArDropdown } from './dropdown.js';

customElements.define('ar-dropdown', ArDropdown);

declare global {
    interface HTMLElementTagNameMap {
        'ar-dropdown': ArDropdown;
    }
}

export { ArDropdown };
```

- [ ] **Step 3: `dropdown-item.ts`**
    - Retirer la ligne entière `import { customElement } from 'lit/decorators.js';`
    - Retirer `@customElement('ar-dropdown-item')`
    - Retirer le bloc `declare global` (`'ar-dropdown-item': ArDropdownItem`)

- [ ] **Step 4: Créer `dropdown-item/index.ts`**

```ts
import { ArDropdownItem } from './dropdown-item.js';

customElements.define('ar-dropdown-item', ArDropdownItem);

declare global {
    interface HTMLElementTagNameMap {
        'ar-dropdown-item': ArDropdownItem;
    }
}

export { ArDropdownItem };
```

- [ ] **Step 5: Mettre à jour `src/index.ts`**

```
old: export { ArDropdown } from './components/dropdown/dropdown.js';
new:
import './components/dropdown/index.js';
export { ArDropdown } from './components/dropdown/dropdown.js';
```

```
old: export { ArDropdownItem } from './components/dropdown-item/dropdown-item.js';
new:
import './components/dropdown-item/index.js';
export { ArDropdownItem } from './components/dropdown-item/dropdown-item.js';
```

- [ ] **Step 6: Mettre à jour les imports d'effet de bord des tests**

Dans `dropdown.test.ts`, `dropdown.a11y.test.ts`, `dropdown.browser.test.ts` :

```
old: import './dropdown.js';
new: import './index.js';
old: import '../dropdown-item/dropdown-item.js';
new: import '../dropdown-item/index.js';
```

Dans `dropdown-item.test.ts` :

```
old: import './dropdown-item.js';
new: import './index.js';
```

- [ ] **Step 7: Lancer les tests unitaires**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run src/components/dropdown src/components/dropdown-item
```

Expected: PASS.

- [ ] **Step 8: Vérifier la compilation**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Step 9: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add packages/core/src/components/dropdown packages/core/src/components/dropdown-item packages/core/src/index.ts
git commit -m "refactor(dropdown): sépare la classe pure de l'enregistrement du tag (mode headless)"
```

---

### Task 7: Migrer `ar-pagination`, `ar-progressbar`, `ar-stepper` et `ar-stepper-item`

**Files:**

- Modify + Create `index.ts` pour : `pagination`, `progressbar`, `stepper`, `stepper-item`
- Modify: `packages/core/src/index.ts`

**Interfaces:**

- Consumes: pattern défini en Task 3.
- Produces: `index.ts` pour les 4 composants.

- [ ] **Step 1: `pagination.ts`**
    - Import : `import { customElement, property } from 'lit/decorators.js';` → `import { property } from 'lit/decorators.js';`
    - Retirer `@customElement('ar-pagination')`
    - Retirer le bloc `declare global` (`'ar-pagination': ArPagination`)

- [ ] **Step 2: Créer `pagination/index.ts`**

```ts
import { ArPagination } from './pagination.js';

customElements.define('ar-pagination', ArPagination);

declare global {
    interface HTMLElementTagNameMap {
        'ar-pagination': ArPagination;
    }
}

export { ArPagination };
```

- [ ] **Step 3: `progressbar.ts`**
    - Import : `import { customElement, property } from 'lit/decorators.js';` → `import { property } from 'lit/decorators.js';`
    - Retirer `@customElement('ar-progressbar')`
    - Retirer le bloc `declare global` (`'ar-progressbar': ArProgressbar`)

- [ ] **Step 4: Créer `progressbar/index.ts`**

```ts
import { ArProgressbar } from './progressbar.js';

customElements.define('ar-progressbar', ArProgressbar);

declare global {
    interface HTMLElementTagNameMap {
        'ar-progressbar': ArProgressbar;
    }
}

export { ArProgressbar };
```

- [ ] **Step 5: `stepper.ts`**
    - Import : `import { customElement, property, query, state } from 'lit/decorators.js';` → `import { property, query, state } from 'lit/decorators.js';`
    - Retirer `@customElement('ar-stepper')`
    - Retirer le bloc `declare global` (`'ar-stepper': ArStepper`)

- [ ] **Step 6: Créer `stepper/index.ts`**

```ts
import { ArStepper } from './stepper.js';

customElements.define('ar-stepper', ArStepper);

declare global {
    interface HTMLElementTagNameMap {
        'ar-stepper': ArStepper;
    }
}

export { ArStepper };
```

- [ ] **Step 7: `stepper-item.ts`**
    - Import : `import { customElement, property } from 'lit/decorators.js';` → `import { property } from 'lit/decorators.js';`
    - Retirer `@customElement('ar-stepper-item')`
    - Retirer le bloc `declare global` (`'ar-stepper-item': ArStepperItem`)

- [ ] **Step 8: Créer `stepper-item/index.ts`**

```ts
import { ArStepperItem } from './stepper-item.js';

customElements.define('ar-stepper-item', ArStepperItem);

declare global {
    interface HTMLElementTagNameMap {
        'ar-stepper-item': ArStepperItem;
    }
}

export { ArStepperItem };
```

- [ ] **Step 9: Mettre à jour `src/index.ts`**

```
old: export { ArPagination } from './components/pagination/pagination.js';
new:
import './components/pagination/index.js';
export { ArPagination } from './components/pagination/pagination.js';
```

```
old: export { ArStepper } from './components/stepper/stepper.js';
new:
import './components/stepper/index.js';
export { ArStepper } from './components/stepper/stepper.js';
```

```
old: export { ArStepperItem } from './components/stepper-item/stepper-item.js';
new:
import './components/stepper-item/index.js';
export { ArStepperItem } from './components/stepper-item/stepper-item.js';
```

`ArProgressbar` est déjà précédé de `import './components/spinner/index.js';` dans le fichier actuel (ligne juste après son export) — ajouter son propre import juste avant sa ligne d'export :

```
old: export { ArProgressbar } from './components/progressbar/progressbar.js';
new:
import './components/progressbar/index.js';
export { ArProgressbar } from './components/progressbar/progressbar.js';
```

- [ ] **Step 10: Mettre à jour les imports d'effet de bord des tests**

Dans `pagination.test.ts`, `pagination.a11y.test.ts` ; `progressbar.test.ts`, `progressbar.a11y.test.ts` ; `stepper-item.test.ts` :

```
old: import './<file>.js';
new: import './index.js';
```

Dans `stepper.test.ts`, `stepper.a11y.test.ts`, `stepper.browser.test.ts` :

```
old: import './stepper.js';
new: import './index.js';
old: import '../stepper-item/stepper-item.js';
new: import '../stepper-item/index.js';
```

- [ ] **Step 11: Lancer les tests unitaires**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run src/components/pagination src/components/progressbar src/components/stepper src/components/stepper-item
```

Expected: PASS.

- [ ] **Step 12: Vérifier la compilation**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Step 13: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add packages/core/src/components/pagination packages/core/src/components/progressbar packages/core/src/components/stepper packages/core/src/components/stepper-item packages/core/src/index.ts
git commit -m "refactor(pagination,progressbar,stepper): sépare la classe pure de l'enregistrement du tag (mode headless)"
```

---

### Task 8: Migrer `ar-tab`, `ar-tab-group` et `ar-tab-panel`

**Files:**

- Modify + Create `index.ts` pour : `tab`, `tab-group`, `tab-panel`
- Modify: `packages/core/src/index.ts`

**Interfaces:**

- Consumes: pattern défini en Task 3.
- Produces: `index.ts` pour les 3 composants.

- [ ] **Step 1: `tab.ts`**
    - Import : `import { customElement, property } from 'lit/decorators.js';` → `import { property } from 'lit/decorators.js';`
    - Retirer `@customElement('ar-tab')`
    - Retirer le bloc `declare global` (`'ar-tab': ArTab`)

- [ ] **Step 2: Créer `tab/index.ts`**

```ts
import { ArTab } from './tab.js';

customElements.define('ar-tab', ArTab);

declare global {
    interface HTMLElementTagNameMap {
        'ar-tab': ArTab;
    }
}

export { ArTab };
```

- [ ] **Step 3: `tab-panel.ts`**
    - Import : `import { customElement, property } from 'lit/decorators.js';` → `import { property } from 'lit/decorators.js';`
    - Retirer `@customElement('ar-tab-panel')`
    - Retirer le bloc `declare global` (`'ar-tab-panel': ArTabPanel`)

- [ ] **Step 4: Créer `tab-panel/index.ts`**

```ts
import { ArTabPanel } from './tab-panel.js';

customElements.define('ar-tab-panel', ArTabPanel);

declare global {
    interface HTMLElementTagNameMap {
        'ar-tab-panel': ArTabPanel;
    }
}

export { ArTabPanel };
```

- [ ] **Step 5: `tab-group.ts`**
    - Import : `import { customElement, property } from 'lit/decorators.js';` → `import { property } from 'lit/decorators.js';`
    - Retirer `@customElement('ar-tab-group')`
    - Retirer le bloc `declare global` (`'ar-tab-group': ArTabGroup`)

- [ ] **Step 6: Créer `tab-group/index.ts`**

```ts
import { ArTabGroup } from './tab-group.js';

customElements.define('ar-tab-group', ArTabGroup);

declare global {
    interface HTMLElementTagNameMap {
        'ar-tab-group': ArTabGroup;
    }
}

export { ArTabGroup };
```

- [ ] **Step 7: Mettre à jour `src/index.ts`**

```
old: export { ArTabGroup } from './components/tab-group/tab-group.js';
new:
import './components/tab-group/index.js';
export { ArTabGroup } from './components/tab-group/tab-group.js';
```

```
old: export { ArTab } from './components/tab/tab.js';
new:
import './components/tab/index.js';
export { ArTab } from './components/tab/tab.js';
```

```
old: export { ArTabPanel } from './components/tab-panel/tab-panel.js';
new:
import './components/tab-panel/index.js';
export { ArTabPanel } from './components/tab-panel/tab-panel.js';
```

- [ ] **Step 8: Mettre à jour les imports d'effet de bord des tests**

Dans `tab.test.ts` ; `tab-panel.test.ts` :

```
old: import './<file>.js';
new: import './index.js';
```

Dans `tab-group.test.ts`, `tab-group.a11y.test.ts`, `tab-group.browser.test.ts` :

```
old: import './tab-group.js';
new: import './index.js';
old: import '../tab/tab.js';
new: import '../tab/index.js';
old: import '../tab-panel/tab-panel.js';
new: import '../tab-panel/index.js';
```

- [ ] **Step 9: Lancer les tests unitaires**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run src/components/tab src/components/tab-group src/components/tab-panel
```

Expected: PASS.

- [ ] **Step 10: Vérifier la compilation**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Step 11: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add packages/core/src/components/tab packages/core/src/components/tab-group packages/core/src/components/tab-panel packages/core/src/index.ts
git commit -m "refactor(tab): sépare la classe pure de l'enregistrement du tag (mode headless)"
```

---

### Task 9: Migrer `ar-table-sort` et `ar-tooltip`

**Files:**

- Modify + Create `index.ts` pour : `table-sort`, `tooltip`
- Modify: `packages/core/src/index.ts`

**Interfaces:**

- Consumes: pattern défini en Task 3.
- Produces: `index.ts` pour les 2 composants. Dernière tâche de migration — après celle-ci, les 19 composants suivent tous le pattern classe pure + `index.ts`.

- [ ] **Step 1: `table-sort.ts`**
    - Import : `import { customElement, property } from 'lit/decorators.js';` → `import { property } from 'lit/decorators.js';`
    - Retirer `@customElement('ar-table-sort')`
    - Retirer le bloc `declare global` (`'ar-table-sort': ArTableSort`)

- [ ] **Step 2: Créer `table-sort/index.ts`**

```ts
import { ArTableSort } from './table-sort.js';

customElements.define('ar-table-sort', ArTableSort);

declare global {
    interface HTMLElementTagNameMap {
        'ar-table-sort': ArTableSort;
    }
}

export { ArTableSort };
```

- [ ] **Step 3: `tooltip.ts`**
    - Import : `import { customElement, property, query } from 'lit/decorators.js';` → `import { property, query } from 'lit/decorators.js';`
    - Retirer `@customElement('ar-tooltip')`
    - Retirer le bloc `declare global` (`'ar-tooltip': ArTooltip`)

- [ ] **Step 4: Créer `tooltip/index.ts`**

```ts
import { ArTooltip } from './tooltip.js';

customElements.define('ar-tooltip', ArTooltip);

declare global {
    interface HTMLElementTagNameMap {
        'ar-tooltip': ArTooltip;
    }
}

export { ArTooltip };
```

- [ ] **Step 5: Mettre à jour `src/index.ts`**

```
old: export { ArTableSort } from './components/table-sort/table-sort.js';
new:
import './components/table-sort/index.js';
export { ArTableSort } from './components/table-sort/table-sort.js';
```

```
old: export { ArTooltip } from './components/tooltip/tooltip.js';
new:
import './components/tooltip/index.js';
export { ArTooltip } from './components/tooltip/tooltip.js';
```

- [ ] **Step 6: Mettre à jour les imports d'effet de bord des tests**

Dans `table-sort.test.ts`, `table-sort.a11y.test.ts`, `table-sort.browser.test.ts` ; `tooltip.test.ts`, `tooltip.a11y.test.ts`, `tooltip.browser.test.ts` :

```
old: import './<file>.js';
new: import './index.js';
```

- [ ] **Step 7: Lancer les tests unitaires**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run src/components/table-sort src/components/tooltip
```

Expected: PASS.

- [ ] **Step 8: Lancer la suite unitaire complète**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run
```

Expected: PASS, tous les composants confondus (les 19 composants sont maintenant migrés).

- [ ] **Step 9: Vérifier la compilation**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Step 10: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add packages/core/src/components/table-sort packages/core/src/components/tooltip packages/core/src/index.ts
git commit -m "refactor(table-sort,tooltip): sépare la classe pure de l'enregistrement du tag (mode headless)"
```

---

### Task 10: Autoloader — préfixe dynamique via `window.ARIANE_CONFIG`

**Files:**

- Modify: `packages/core/src/autoloader.ts`

**Interfaces:**

- Consumes: `ArianeConfig` (Task 2), tous les composants migrés en classes pures (Tasks 3–9), y compris `ar-spinner` (déjà migré par le spike antérieur — sa classe pure vit dans `components/spinner/spinner.js`).
- Produces: autoloader capable de servir n'importe quel préfixe configuré, base pour la vérification finale (Task 13).

- [ ] **Step 1: Remplacer `COMPONENT_MAP` par `COMPONENT_DEFS` (nom de composant → classe pure)**

```
old:
const COMPONENT_MAP: Record<string, () => Promise<unknown>> = {
    'ar-alert': () => import('./components/alert/alert.js'),
    'ar-breadcrumb': () => import('./components/breadcrumb/breadcrumb.js'),
    'ar-breadcrumb-item': () => import('./components/breadcrumb-item/breadcrumb-item.js'),
    'ar-pagination': () => import('./components/pagination/pagination.js'),
    'ar-progressbar': () => import('./components/progressbar/progressbar.js'),
    'ar-spinner': () => import('./components/spinner/index.js'),
    'ar-stepper': () => import('./components/stepper/stepper.js'),
    'ar-stepper-item': () => import('./components/stepper-item/stepper-item.js'),
    'ar-dialog': () => import('./components/dialog/dialog.js'),
    'ar-dropdown': () => import('./components/dropdown/dropdown.js'),
    'ar-dropdown-item': () => import('./components/dropdown-item/dropdown-item.js'),
    'ar-tab-group': () => import('./components/tab-group/tab-group.js'),
    'ar-tab': () => import('./components/tab/tab.js'),
    'ar-tab-panel': () => import('./components/tab-panel/tab-panel.js'),
    'ar-table-sort': () => import('./components/table-sort/table-sort.js'),
    'ar-charcounter': () => import('./components/charcounter/charcounter.js'),
    'ar-collapse': () => import('./components/collapse/collapse.js'),
    'ar-datepicker': () => import('./components/datepicker/datepicker.js'),
    // ⚠ Mis à jour automatiquement par le script create-component.js
};
new:
/**
 * Table nom-de-composant → loader de la classe pure (aucun effet de bord).
 * Le tag effectivement enregistré est construit dynamiquement avec le préfixe
 * configuré (voir `prefix` ci-dessous), pas hardcodé ici.
 */
const COMPONENT_DEFS: Record<string, () => Promise<Record<string, CustomElementConstructor>>> = {
    alert: () => import('./components/alert/alert.js'),
    breadcrumb: () => import('./components/breadcrumb/breadcrumb.js'),
    'breadcrumb-item': () => import('./components/breadcrumb-item/breadcrumb-item.js'),
    pagination: () => import('./components/pagination/pagination.js'),
    progressbar: () => import('./components/progressbar/progressbar.js'),
    spinner: () => import('./components/spinner/spinner.js'),
    stepper: () => import('./components/stepper/stepper.js'),
    'stepper-item': () => import('./components/stepper-item/stepper-item.js'),
    dialog: () => import('./components/dialog/dialog.js'),
    dropdown: () => import('./components/dropdown/dropdown.js'),
    'dropdown-item': () => import('./components/dropdown-item/dropdown-item.js'),
    'tab-group': () => import('./components/tab-group/tab-group.js'),
    tab: () => import('./components/tab/tab.js'),
    'tab-panel': () => import('./components/tab-panel/tab-panel.js'),
    'table-sort': () => import('./components/table-sort/table-sort.js'),
    charcounter: () => import('./components/charcounter/charcounter.js'),
    collapse: () => import('./components/collapse/collapse.js'),
    datepicker: () => import('./components/datepicker/datepicker.js'),
    tooltip: () => import('./components/tooltip/tooltip.js'),
    // ⚠ Mis à jour automatiquement par le script create-component.js
};

/** Préfixe des tags, lu une seule fois au chargement du module. Défaut : 'ar'. */
const prefix = window.ARIANE_CONFIG?.prefix ?? 'ar';

/** Map inverse tag → nom de composant, construite à partir du préfixe résolu. */
const TAG_TO_COMPONENT: Record<string, string> = Object.fromEntries(
    Object.keys(COMPONENT_DEFS).map((name) => [`${prefix}-${name}`, name]),
);
```

Le nom d'export de chaque module (`ArAlert`, `ArBreadcrumb`, ...) n'est pas connu statiquement dans une table générique — Step 2 résout la classe en prenant la première export nommée du module qui est un constructeur de `HTMLElement`.

- [ ] **Step 2: Adapter `loadComponent` pour résoudre le nom de composant et enregistrer dynamiquement**

```
old:
async function loadComponent(tagName: string): Promise<void> {
    if (loaded.has(tagName) || !COMPONENT_MAP[tagName]) return;

    // Marque comme "en cours" immédiatement pour éviter les appels parallèles
    loaded.add(tagName);

    try {
        await COMPONENT_MAP[tagName]();

        // Attend que le custom element soit effectivement enregistré dans la registry
        // (le module peut définir l'élément de façon asynchrone dans certains cas)
        await customElements.whenDefined(tagName);

        // Rescanne tous les roots connus : les instances de ce composant
        // ont maintenant un shadowRoot et peuvent contenir d'autres composants
        rescanAllRoots();
    } catch (err) {
        console.error(`[ariane autoloader] Failed to load <${tagName}>:`, err);
        // Retire du Set pour permettre un retry
        loaded.delete(tagName);
    }
}
new:
async function loadComponent(tagName: string): Promise<void> {
    const componentName = TAG_TO_COMPONENT[tagName];
    if (loaded.has(tagName) || !componentName) return;

    // Marque comme "en cours" immédiatement pour éviter les appels parallèles
    loaded.add(tagName);

    try {
        const componentModule = await COMPONENT_DEFS[componentName]();
        const ExportedClass = Object.values(componentModule)[0];

        if (!customElements.get(tagName)) {
            customElements.define(tagName, ExportedClass);
        }

        // Attend que le custom element soit effectivement enregistré dans la registry
        await customElements.whenDefined(tagName);

        // Rescanne tous les roots connus : les instances de ce composant
        // ont maintenant un shadowRoot et peuvent contenir d'autres composants
        rescanAllRoots();
    } catch (err) {
        console.error(`[ariane autoloader] Failed to load <${tagName}>:`, err);
        // Retire du Set pour permettre un retry
        loaded.delete(tagName);
    }
}
```

- [ ] **Step 3: Vérifier la compilation**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx tsc --noEmit
```

Expected: aucune erreur. (`CustomElementConstructor` est un type DOM lib global, aucun import requis.)

- [ ] **Step 4: Écrire un test unitaire du comportement de préfixe**

Créer `packages/core/src/autoloader.test.ts` s'il n'existe pas déjà — vérifier d'abord :

```bash
ls /Users/jon/Code/Active_projects/ariane/packages/core/src/autoloader.test.ts 2>/dev/null || echo "n'existe pas"
```

Si le fichier n'existe pas, le créer avec :

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

declare global {
    interface Window {
        ARIANE_CONFIG?: { prefix?: string };
    }
}

describe('autoloader — préfixe configurable', () => {
    afterEach(() => {
        delete window.ARIANE_CONFIG;
        document.body.innerHTML = '';
        vi.resetModules();
    });

    it('charge un composant sous le tag ar-x par défaut sans config', async () => {
        document.body.innerHTML = '<ar-spinner></ar-spinner>';
        await import('./autoloader.js');
        await customElements.whenDefined('ar-spinner');
        expect(customElements.get('ar-spinner')).toBeDefined();
    });

    it('charge un composant sous le préfixe configuré via window.ARIANE_CONFIG', async () => {
        window.ARIANE_CONFIG = { prefix: 'acme' };
        document.body.innerHTML = '<acme-spinner></acme-spinner>';
        await import('./autoloader.js');
        await customElements.whenDefined('acme-spinner');
        expect(customElements.get('acme-spinner')).toBeDefined();
    });
});
```

- [ ] **Step 5: Lancer le test**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run src/autoloader.test.ts
```

Expected: PASS, les deux cas (préfixe par défaut et préfixe configuré) passent.

Note : `vi.resetModules()` est nécessaire car l'autoloader lit `window.ARIANE_CONFIG` et construit `TAG_TO_COMPONENT` une seule fois au chargement du module — chaque test doit réimporter le module après avoir positionné `window.ARIANE_CONFIG`.

- [ ] **Step 6: Lancer la suite unitaire complète**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add packages/core/src/autoloader.ts packages/core/src/autoloader.test.ts
git commit -m "feat(autoloader): préfixe des tags configurable via window.ARIANE_CONFIG.prefix"
```

---

### Task 11: Point d'entrée `headless` (classes pures, npm)

**Files:**

- Create: `packages/core/src/headless.ts`
- Modify: `packages/core/package.json`
- Modify: `packages/core/scripts/build-bundles.js`

**Interfaces:**

- Consumes: toutes les classes de composants (déjà exportées individuellement par chaque `[name].ts`, inchangé par ce chantier).
- Produces: sous-chemin d'export `@ariane-ui/core/headless`, buildé dans `dist/headless.js`.

- [ ] **Step 1: Créer `src/headless.ts`**

```ts
/**
 * Point d'entrée headless : exporte uniquement les classes Lit pures, sans
 * aucun effet de bord d'enregistrement (`customElements.define`). Le
 * consommateur choisit lui-même les tags :
 *
 *   import { ArAlert } from '@ariane-ui/core/headless';
 *   customElements.define('acme-alert', ArAlert);
 */
export { ArAlert } from './components/alert/alert.js';
export { ArBreadcrumb } from './components/breadcrumb/breadcrumb.js';
export { ArBreadcrumbItem } from './components/breadcrumb-item/breadcrumb-item.js';
export { ArCharcounter } from './components/charcounter/charcounter.js';
export type { CharcounterState } from './components/charcounter/charcounter.js';
export { ArCollapse } from './components/collapse/collapse.js';
export { ArDatepicker } from './components/datepicker/datepicker.js';
export { ArDialog } from './components/dialog/dialog.js';
export { ArDropdown } from './components/dropdown/dropdown.js';
export { ArDropdownItem } from './components/dropdown-item/dropdown-item.js';
export { ArPagination } from './components/pagination/pagination.js';
export { ArProgressbar } from './components/progressbar/progressbar.js';
export { ArSpinner } from './components/spinner/spinner.js';
export { ArStepper } from './components/stepper/stepper.js';
export { ArStepperItem } from './components/stepper-item/stepper-item.js';
export { ArTab } from './components/tab/tab.js';
export { ArTabGroup } from './components/tab-group/tab-group.js';
export { ArTabPanel } from './components/tab-panel/tab-panel.js';
export { ArTableSort } from './components/table-sort/table-sort.js';
export type { TableSortType, TableSortOrder } from './components/table-sort/table-sort.js';
export { ArTooltip } from './components/tooltip/tooltip.js';
export type { ArTooltipPlacement } from './components/tooltip/tooltip.js';
```

- [ ] **Step 2: Ajouter l'export `./headless` dans `package.json`**

```
old:
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./cdn": "./cdn/index.js",
new:
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./headless": {
      "types": "./dist/headless.d.ts",
      "default": "./dist/headless.js"
    },
    "./cdn": "./cdn/index.js",
```

- [ ] **Step 3: Ajouter `headless` aux points d'entrée du build npm dans `build-bundles.js`**

```
old:
const entryPoints = {
    index: join(SRC, 'index.ts'),
    ...Object.fromEntries(componentFiles.map((f) => [toEntryKey(f), f])),
};
new:
const entryPoints = {
    index: join(SRC, 'index.ts'),
    headless: join(SRC, 'headless.ts'),
    ...Object.fromEntries(componentFiles.map((f) => [toEntryKey(f), f])),
};
```

- [ ] **Step 4: Builder et vérifier la sortie**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npm run build
ls dist/headless.js dist/headless.d.ts
```

Expected: les deux fichiers existent. Inspecter rapidement `dist/headless.js` pour confirmer l'absence de tout appel `customElements.define` :

```bash
grep -c "customElements.define" dist/headless.js
```

Expected: `0`.

- [ ] **Step 5: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add packages/core/src/headless.ts packages/core/package.json packages/core/scripts/build-bundles.js
git commit -m "feat(core): ajoute le point d'entrée headless (classes pures, npm)"
```

---

### Task 12: Mettre à jour le scaffold `create-component.js`

**Files:**

- Modify: `packages/core/scripts/create-component.js`

**Interfaces:**

- Consumes: pattern classe pure + `index.ts` établi Tasks 3–9.
- Produces: tout nouveau composant scaffoldé suit directement le nouveau pattern — plus besoin de migration manuelle après scaffold.

- [ ] **Step 1: Retirer le décorateur et le `declare global` du template de composant**

```
old:
const componentTemplate = `import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './${fileName}.styles.js';

/**
 * @summary Résumé du composant ${tagName}.
 *
 * @slot         - Contenu principal.
 *
 * @csspart base - L'élément racine du composant.
 * @cssprop [--${tagName}-size=auto] - Taille du composant.
 *
 * @event {CustomEvent} ${tagName}-change - Émis lors d'un changement.
 */
@customElement('${tagName}')
export class ${className} extends LitElement {
    static override styles = [styles];

    override render() {
        return html\`
            <div part="base">
                <slot></slot>
            </div>
        \`;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        '${tagName}': ${className};
    }
}
`;
new:
const componentTemplate = `import { LitElement, html } from 'lit';
import { property } from 'lit/decorators.js';
import styles from './${fileName}.styles.js';

/**
 * @summary Résumé du composant ${tagName}.
 *
 * @slot         - Contenu principal.
 *
 * @csspart base - L'élément racine du composant.
 * @cssprop [--${tagName}-size=auto] - Taille du composant.
 *
 * @event {CustomEvent} ${tagName}-change - Émis lors d'un changement.
 */
export class ${className} extends LitElement {
    static override styles = [styles];

    override render() {
        return html\`
            <div part="base">
                <slot></slot>
            </div>
        \`;
    }
}
`;

const indexTemplate = `import { ${className} } from './${fileName}.js';

customElements.define('${tagName}', ${className});

declare global {
    interface HTMLElementTagNameMap {
        '${tagName}': ${className};
    }
}

export { ${className} };
`;
```

- [ ] **Step 2: Mettre à jour le template de test pour importer `./index.js`**

```
old: import './${fileName}.js';
new: import './index.js';
```

(dans `testTemplate`, la ligne juste après l'import de `fixture, waitForUpdate, getPart, requirePart`)

- [ ] **Step 3: Écrire le fichier `index.ts` généré et mettre à jour l'autoloader avec le nom sans préfixe**

```
old:
const files = [
    {
        path: join(componentDir, `${fileName}.ts`),
        content: componentTemplate,
        label: `src/components/${dirName}/${fileName}.ts`,
    },
    {
        path: join(componentDir, `${fileName}.styles.ts`),
        content: stylesTemplate,
        label: `src/components/${dirName}/${fileName}.styles.ts`,
    },
    {
        path: join(componentDir, `${fileName}.test.ts`),
        content: testTemplate,
        label: `src/components/${dirName}/${fileName}.test.ts`,
    },
];
new:
const files = [
    {
        path: join(componentDir, `${fileName}.ts`),
        content: componentTemplate,
        label: `src/components/${dirName}/${fileName}.ts`,
    },
    {
        path: join(componentDir, 'index.ts'),
        content: indexTemplate,
        label: `src/components/${dirName}/index.ts`,
    },
    {
        path: join(componentDir, `${fileName}.styles.ts`),
        content: stylesTemplate,
        label: `src/components/${dirName}/${fileName}.styles.ts`,
    },
    {
        path: join(componentDir, `${fileName}.test.ts`),
        content: testTemplate,
        label: `src/components/${dirName}/${fileName}.test.ts`,
    },
];
```

- [ ] **Step 4: Adapter la mise à jour du barrel `src/index.ts`**

```
old:
const barrelPath = join(ROOT, 'src', 'index.ts');
const barrelContent = readFileSync(barrelPath, 'utf-8');
const exportLine = `export { ${className} } from './components/${dirName}/${fileName}.js';\n`;

if (!barrelContent.includes(exportLine)) {
    writeFileSync(barrelPath, barrelContent + exportLine, 'utf-8');
    console.log(`  ✓ src/index.ts mis à jour`);
}
new:
const barrelPath = join(ROOT, 'src', 'index.ts');
const barrelContent = readFileSync(barrelPath, 'utf-8');
const sideEffectImportLine = `import './components/${dirName}/index.js';\n`;
const exportLine = `export { ${className} } from './components/${dirName}/${fileName}.js';\n`;

if (!barrelContent.includes(exportLine)) {
    writeFileSync(barrelPath, barrelContent + sideEffectImportLine + exportLine, 'utf-8');
    console.log(`  ✓ src/index.ts mis à jour`);
}
```

- [ ] **Step 5: Adapter la mise à jour de l'autoloader — entrée sans préfixe pointant vers la classe pure**

```
old:
const autoloaderPath = join(ROOT, 'src', 'autoloader.ts');
const autoloaderContent = readFileSync(autoloaderPath, 'utf-8');
const autoloaderEntry = `    '${tagName}': () => import('./components/${dirName}/${fileName}.js'),`;
const marker = '    // ⚠ Mis à jour automatiquement par le script create-component.js';

if (!autoloaderContent.includes(`'${tagName}'`)) {
    const updated = autoloaderContent.replace(marker, `${autoloaderEntry}\n${marker}`);
    writeFileSync(autoloaderPath, updated, 'utf-8');
    console.log(`  ✓ src/autoloader.ts mis à jour`);
}
new:
const autoloaderPath = join(ROOT, 'src', 'autoloader.ts');
const autoloaderContent = readFileSync(autoloaderPath, 'utf-8');
const autoloaderEntry = `    ${dirName.includes('-') ? `'${dirName}'` : dirName}: () => import('./components/${dirName}/${fileName}.js'),`;
const marker = '    // ⚠ Mis à jour automatiquement par le script create-component.js';

if (!autoloaderContent.includes(`import('./components/${dirName}/${fileName}.js')`)) {
    const updated = autoloaderContent.replace(marker, `${autoloaderEntry}\n${marker}`);
    writeFileSync(autoloaderPath, updated, 'utf-8');
    console.log(`  ✓ src/autoloader.ts mis à jour`);
}
```

- [ ] **Step 6: Tester le scaffold sur un composant jetable**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npm run create -- scaffold-smoke-test
```

Expected: création réussie, sortie confirmant `src/components/scaffold-smoke-test/index.ts`, `src/index.ts` et `src/autoloader.ts` mis à jour.

- [ ] **Step 7: Vérifier la compilation avec le composant généré**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Step 8: Supprimer le composant de test et revenir sur `src/index.ts`/`src/autoloader.ts`**

```bash
cd /Users/jon/Code/Active_projects/ariane
rm -rf packages/core/src/components/scaffold-smoke-test
rm -f apps/docs/src/content/components/ar-scaffold-smoke-test.mdx
git checkout -- packages/core/src/index.ts packages/core/src/autoloader.ts
```

Expected: `git status` ne montre plus aucune trace du composant de test.

- [ ] **Step 9: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add packages/core/scripts/create-component.js
git commit -m "chore(scripts): scaffold génère directement le pattern classe pure + index.ts"
```

---

### Task 13: Vérification complète et build

**Files:** aucun fichier modifié — tâche de vérification.

- [ ] **Step 1: Suite unitaire complète**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run
```

Expected: PASS, tous les composants.

- [ ] **Step 2: Suite navigateur complète (a11y + browser)**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npm run test:browser
```

Expected: PASS.

- [ ] **Step 3: Type-check complet**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Step 4: Build complet (manifest + bundles + css + types)**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npm run build
```

Expected: succès, sans warning `@display` manquant dans le manifest CEM (confirme que le CEM analyzer résout toujours `tagName`/`customElement: true` pour les 19 composants via leurs `index.ts` respectifs).

- [ ] **Step 5: Vérifier l'absence d'effet de bord dans les bundles headless et npm par composant**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core
grep -l "customElements.define" dist/components/*/*.js | grep -v "/index.js" || echo "OK — aucun customElements.define hors des fichiers index.js"
```

Expected: `OK — aucun customElements.define hors des fichiers index.js`.

- [ ] **Step 6: Vérifier que le bundle npm standard enregistre bien tous les tags par défaut**

```bash
grep -c "customElements.define" dist/index.js
```

Expected: un nombre cohérent avec le nombre de composants ayant un effet de bord dans `dist/index.js` (peut être `0` si esbuild a placé les `customElements.define` dans les chunks séparés des `index.js` de composants — dans ce cas, vérifier plutôt) :

```bash
grep -rl "customElements.define" dist/chunks/ | wc -l
```

- [ ] **Step 7: Lancer un smoke test manuel du préfixe CDN**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core
cat > /tmp/ariane-prefix-smoke.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
<script>window.ARIANE_CONFIG = { prefix: 'acme' };</script>
</head>
<body>
<acme-spinner></acme-spinner>
<script type="module" src="./cdn/autoloader.js"></script>
</body>
</html>
EOF
npx http-server . -p 8123 -o /tmp/ariane-prefix-smoke.html &
sleep 1
echo "Ouvrir http://localhost:8123$(realpath --relative-to=. /tmp/ariane-prefix-smoke.html) dans un navigateur et vérifier dans la console : customElements.get('acme-spinner') retourne bien la classe ArSpinner."
```

Expected : vérification manuelle dans la console navigateur que `<acme-spinner>` est bien upgradé (a un `shadowRoot`) et que `customElements.get('ar-spinner')` retourne `undefined` (pas de double-enregistrement sous le tag par défaut).

Arrêter le serveur après vérification :

```bash
kill %1
```

- [ ] **Step 8: Commit final si des fichiers de build générés doivent être ignorés**

Vérifier qu'aucun artefact de build n'est resté indexé par erreur (rappel : `dist/` n'est jamais committé) :

```bash
cd /Users/jon/Code/Active_projects/ariane && git status
```

Expected: seuls les fichiers source modifiés dans les tâches précédentes apparaissent, aucun fichier sous `dist/` ou `cdn/`.

---

### Task 14: Ouvrir la pull request

**Files:** aucun fichier modifié.

- [ ] **Step 1: Pousser la branche**

```bash
cd /Users/jon/Code/Active_projects/ariane && git push -u origin feat/headless-mode-config
```

- [ ] **Step 2: Créer la PR vers `dev`**

```bash
gh pr create --base dev --title "feat(core): mode headless — classes pures + préfixe CDN configurable (#47)" --body "$(cat <<'EOF'
## Résumé

- Généralise à tous les composants le pattern classe pure (`[name].ts`) + `index.ts` d'enregistrement, validé par le spike `ar-spinner`.
- Ajoute `window.ARIANE_CONFIG.prefix` : l'autoloader CDN construit dynamiquement les tags custom elements avec un préfixe configurable (défaut `'ar'`).
- Ajoute le point d'entrée `@ariane-ui/core/headless` (classes pures, sans effet de bord, pour les consommateurs npm).
- Met à jour `create-component.js` pour scaffolder directement le nouveau pattern.
- Réserve (sans l'implémenter) la forme `ArianeConfig.i18n` pour l'infrastructure i18n (#80), à traiter dans un chantier séparé.

Ferme #47. Design : `docs/superpowers/specs/2026-07-07-headless-mode-config-design.md`.

## Test plan

- [ ] `npx vitest run` — suite unitaire complète verte
- [ ] `npm run test:browser` — suite a11y/browser complète verte
- [ ] `npx tsc --noEmit` — sans erreur
- [ ] `npm run build` — build complet sans warning
- [ ] Smoke test manuel préfixe CDN (`window.ARIANE_CONFIG = { prefix: 'acme' }`) — tag `acme-spinner` upgradé correctement

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: URL de la PR retournée.

---

## Self-Review

**Couverture du design :**

- Contrat `ArianeConfig` (prefix + i18n réservé) — Task 2.
- Séparation classe pure / enregistrement pour les 19 composants — Tasks 3–9 (18 composants restants ; `ar-spinner` déjà migré par le spike antérieur, non retouché sauf son entrée dans l'autoloader, Task 10).
- Autoloader CDN avec préfixe dynamique, divergence du mapping du spike vers la classe pure de `ar-spinner` — Task 10.
- `src/index.ts` inchangé dans son principe (imports d'effet de bord) — couvert dans chaque tâche de migration.
- `src/headless.ts` + export `package.json` — Task 11.
- `scripts/create-component.js` mis à jour — Task 12.
- Niveau 2 autoloader et implémentation i18n — explicitement non traités, documentés comme hors scope dans les constraints globales.

**Aucun placeholder** — chaque étape contient soit une commande exacte avec sortie attendue, soit un bloc de code complet (avant/après ou fichier entier).

**Cohérence des types** — `ArianeConfig` défini Task 2 est consommé uniquement en lecture (`window.ARIANE_CONFIG?.prefix`) par `autoloader.ts` Task 10 ; aucune fonction `configure()`/`setLocale()` n'est introduite dans ce plan (hors scope, réservé à #80) donc pas de risque de divergence de signature.
