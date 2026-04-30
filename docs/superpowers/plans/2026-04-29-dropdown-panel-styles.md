# Dropdown Panel Styles — Unification Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unifier les styles visuels des panels flottants de `ar-dropdown`, `ar-stepper` (mobile) et `ar-breadcrumb` (mobile) via un fichier shared `[part='panel']`, supprimer le fichier legacy `dropdown.styles.ts` global, et exposer les tokens `--ar-panel-*` comme API de customisation commune.

**Architecture:** `styles/shared/panel.styles.ts` définit les styles de base via le sélecteur `[part='panel']` et bundlera `animationsStyles` (keyframe `arPanelShow`, centralisé dans `animations.styles.ts`). Chaque composant (1) ajoute `part="panel"` sur son élément panel, (2) met à jour son `@query` vers `[part="panel"]`, (3) importe `panelStyles`, (4) déclare ses overrides propres. Les classes Bootstrap legacy (`dropdown-menu`, `dropdown-toggle`, `dropdown-menu-left`, etc.) sont retirées des templates. Les tokens `--ar-dropdown-*` existants chaînent vers `--ar-panel-*` pour rétro-compatibilité.

**Tech Stack:** Lit 3, TypeScript, CSS custom properties, Popover API, Vitest, Web Test Runner (WTR)

---

## Notes hors-scope (backlog)

- **Unification `popover` statique vs dynamique** : `ar-breadcrumb` et `ar-dropdown` posent `popover="auto"` statiquement dans le template ; `ar-stepper` le reçoit dynamiquement via `AnchoredController.attach()`. À harmoniser dans une PR dédiée.
- **`part="trigger"` sur les boutons déclencheurs** : les triggers sont actuellement identifiés par `id` et `@query`. Une unification via `part="trigger"` simplifierait l'API externe et les queries. À traiter séparément.
- **Variabilisation des styles de trigger** : les boutons de chaque composant (stepper mobile, breadcrumb) bénéficieraient de tokens CSS propres. Implique un nettoyage important des styles breadcrumb. PR séparée.

---

## File Map

| Action     | Fichier                                                        | Rôle                                                                                                                                                    |
| ---------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **MODIFY** | `packages/core/src/styles/animations.styles.ts`                | Ajouter `@keyframes arPanelShow`                                                                                                                        |
| **CREATE** | `packages/core/src/styles/shared/panel.styles.ts`              | Bundler `animationsStyles` + styles de base `[part='panel']`                                                                                            |
| **MODIFY** | `packages/core/src/components/dropdown/dropdown.styles.ts`     | Supprimer les props migrées vers shared, garder uniquement overrides composant                                                                          |
| **MODIFY** | `packages/core/src/components/dropdown/dropdown.ts`            | Importer `panelStyles`, mettre à jour `@cssprop` + `@csspart`                                                                                           |
| **MODIFY** | `packages/core/src/components/stepper/stepper.renderer.ts`     | Ajouter `part="panel"`, retirer classes Bootstrap legacy du panel + `dropdown-toggle` du trigger                                                        |
| **MODIFY** | `packages/core/src/components/stepper/stepper.styles.ts`       | Remplacer `.stepper-dropdown-menu` par `[part='panel']` pour overrides ; ajouter `position: relative` sur le wrapper                                    |
| **MODIFY** | `packages/core/src/components/stepper/stepper.ts`              | Importer `panelStyles`, retirer `dropdownStyles`, mettre à jour `@query`, `@csspart`, `@cssprop`                                                        |
| **MODIFY** | `packages/core/src/components/breadcrumb/breadcrumb.ts`        | Ajouter `part="panel"`, retirer classes Bootstrap legacy du panel, importer `panelStyles`, retirer `dropdownStyles`, mettre à jour `@query`, `@csspart` |
| **MODIFY** | `packages/core/src/components/breadcrumb/breadcrumb.styles.ts` | Ajouter override `[part='panel']` pour max-width cascade                                                                                                |
| **DELETE** | `packages/core/src/styles/components/dropdown.styles.ts`       | Plus importé par aucun composant après migration                                                                                                        |

---

## Task 1 — Ajouter `arPanelShow` dans `animations.styles.ts` et créer `panel.styles.ts`

**Files:**

- Modify: `packages/core/src/styles/animations.styles.ts`
- Create: `packages/core/src/styles/shared/panel.styles.ts`

- [ ] **Step 1 : Ajouter `@keyframes arPanelShow` dans `animations.styles.ts`**

Ajouter à la fin du template CSS existant (avant le backtick fermant) :

```css
@keyframes arPanelShow {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}
```

- [ ] **Step 2 : Créer `packages/core/src/styles/shared/panel.styles.ts`**

Le fichier exporte un tableau qui bundle `animationsStyles` + les styles panel. Les composants n'ont pas besoin d'importer `animationsStyles` séparément.

```ts
import { css } from 'lit';
import type { CSSResultGroup } from 'lit';
import animationsStyles from '../animations.styles.js';

const panelBaseStyles = css`
    [part='panel'] {
        /* Popover positioning reset */
        position: absolute;
        inset: 0 auto auto 0;
        margin: 0;

        /* Box model */
        box-sizing: border-box;
        overflow-y: auto;

        /* Tokens visuels */
        background-color: var(--ar-panel-bg, var(--ar-color-bg, #fff));
        color: var(--ar-panel-text, var(--ar-color-text, #2e2e31));
        border: 1px solid var(--ar-panel-border-color, var(--ar-color-border, #e2e2e5));
        border-radius: var(--ar-panel-radius, 0.375rem);
        box-shadow: var(
            --ar-panel-shadow,
            0 4px 6px -1px rgba(0, 0, 0, 0.1),
            0 10px 15px -3px rgba(0, 0, 0, 0.07)
        );
        padding: var(--ar-panel-padding, 0.25rem);
        max-width: var(--ar-panel-max-width, 18rem);
    }

    [part='panel']:not(:popover-open) {
        display: none;
    }

    [part='panel']:popover-open {
        animation: arPanelShow 0.2s ease-out;
    }

    @media (prefers-reduced-motion: reduce) {
        [part='panel']:popover-open {
            animation: none;
        }
    }
`;

const panelStyles: CSSResultGroup = [animationsStyles, panelBaseStyles];
export default panelStyles;
```

- [ ] **Step 3 : Commit**

```bash
git add packages/core/src/styles/animations.styles.ts \
        packages/core/src/styles/shared/panel.styles.ts
git commit -m "feat(styles): add arPanelShow keyframe + shared panel.styles"
```

---

## Task 2 — Migrer `ar-dropdown`

**Files:**

- Modify: `packages/core/src/components/dropdown/dropdown.styles.ts`
- Modify: `packages/core/src/components/dropdown/dropdown.ts`

`ar-dropdown` a déjà `part="panel"` sur son élément — seuls les styles et le JSDoc changent.

- [ ] **Step 1 : Vérifier que les tests existants passent (baseline)**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run test -- --reporter=verbose 2>&1 | tail -20
```

- [ ] **Step 2 : Réécrire `dropdown.styles.ts`**

Les props visuelles de base sont maintenant dans `panelStyles`. Ce fichier ne garde que le `:host`, les overrides composant avec cascade vers `--ar-panel-*`, et `min-width` propre au dropdown. L'animation `arDropdownShow` est supprimée (remplacée par `arPanelShow` dans le shared).

```ts
import { css } from 'lit';

export default css`
    :host {
        display: contents;
    }

    [part='panel'] {
        /* Overrides composant — chaînent vers les tokens shared --ar-panel-* */
        background-color: var(--ar-dropdown-bg, var(--ar-panel-bg, var(--ar-color-bg, #fff)));
        color: var(--ar-dropdown-color, var(--ar-panel-text, var(--ar-color-text, #2e2e31)));
        border-color: var(
            --ar-dropdown-border-color,
            var(--ar-panel-border-color, var(--ar-color-border, #e2e2e5))
        );
        border-radius: var(--ar-dropdown-border-radius, var(--ar-panel-radius, 0.375rem));
        box-shadow: var(
            --ar-dropdown-shadow,
            var(
                --ar-panel-shadow,
                0 4px 6px -1px rgba(0, 0, 0, 0.1),
                0 10px 15px -3px rgba(0, 0, 0, 0.07)
            )
        );
        padding: var(--ar-dropdown-padding, var(--ar-panel-padding, 0.25rem));
        min-width: var(--ar-dropdown-min-width, 10rem);
        max-width: var(--ar-dropdown-max-width, var(--ar-panel-max-width, 18rem));
    }
`;
```

- [ ] **Step 3 : Mettre à jour `dropdown.ts`**

Remplacer l'import existant de styles par :

```ts
import panelStyles from '../../styles/shared/panel.styles.js';
import dropdownStyles from './dropdown.styles.js';
```

Mettre à jour `static styles` :

```ts
static override styles = [panelStyles, dropdownStyles];
```

Mettre à jour les `@cssprop` dans le JSDoc de classe :

```ts
 * @csspart panel - Le panel flottant.
 *
 * @cssprop [--ar-dropdown-min-width=10rem] - Largeur minimale du panel.
 * @cssprop [--ar-dropdown-max-width=var(--ar-panel-max-width,18rem)] - Largeur maximale (cascade vers --ar-panel-max-width).
 * @cssprop [--ar-dropdown-padding=var(--ar-panel-padding,0.25rem)] - Marge interne (cascade vers --ar-panel-padding).
 * @cssprop [--ar-dropdown-bg=var(--ar-panel-bg)] - Fond du panel (cascade vers --ar-panel-bg).
 * @cssprop [--ar-dropdown-border-color=var(--ar-panel-border-color)] - Bordure (cascade vers --ar-panel-border-color).
 * @cssprop [--ar-dropdown-border-radius=var(--ar-panel-radius)] - Arrondi (cascade vers --ar-panel-radius).
 * @cssprop [--ar-dropdown-shadow=var(--ar-panel-shadow)] - Ombre (cascade vers --ar-panel-shadow).
```

- [ ] **Step 4 : Vérifier que les tests passent**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run test -- --reporter=verbose 2>&1 | tail -20
```

Résultat attendu : même nombre de tests verts qu'au step 1.

- [ ] **Step 5 : Commit**

```bash
git add packages/core/src/components/dropdown/dropdown.styles.ts \
        packages/core/src/components/dropdown/dropdown.ts
git commit -m "refactor(dropdown): migrate panel base styles to shared panel.styles"
```

---

## Task 3 — Migrer `ar-stepper`

**Files:**

- Modify: `packages/core/src/components/stepper/stepper.renderer.ts`
- Modify: `packages/core/src/components/stepper/stepper.styles.ts`
- Modify: `packages/core/src/components/stepper/stepper.ts`
- Test: `packages/core/src/components/stepper/stepper.browser.test.ts`

- [ ] **Step 1 : Écrire le test WTR qui vérifie `part="panel"` sur le panel mobile**

Dans `stepper.browser.test.ts`, ajouter dans le bloc `describe` existant :

```ts
it('mobile panel has part="panel"', async () => {
    await setViewport({ width: 600, height: 800 });
    const el = await fixture<ArStepper>(html`
        <ar-stepper>
            <ar-stepper-item label="Étape 1"></ar-stepper-item>
            <ar-stepper-item label="Étape 2" active></ar-stepper-item>
        </ar-stepper>
    `);
    await el.updateComplete;
    await aTimeout(50);
    const panel = el.shadowRoot!.querySelector('[part="panel"]');
    expect(panel).to.exist;
});
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run test:all 2>&1 | grep -A 3 'part="panel"'
```

Résultat attendu : échec `AssertionError: expected null to exist`.

- [ ] **Step 3 : Modifier `stepper.renderer.ts` — panel et trigger**

Dans `renderMobile` (ligne ~184), modifier le div panel et le bouton trigger :

```ts
// Bouton : retirer la classe 'dropdown-toggle' (suppression de la dépendance au caret Bootstrap)
<button
    type="button"
    class="btn btn-secondary btn-block btn-stepper-mobile"
    aria-controls="stepper-dropdown-menu"
    @click=${ctx.onToggle}
>

// Panel : ajouter part="panel", retirer les classes Bootstrap legacy
<div
    id="stepper-dropdown-menu"
    part="panel"
    class="stepper-dropdown-panel"
>
```

Le wrapper garde `class="dropdown stepper-dropdown${...}"` pour l'instant (la classe `.dropdown` est utilisée pour le positionnement — sera traité dans `stepper.styles.ts`).

- [ ] **Step 4 : Mettre à jour `stepper.styles.ts`**

Remplacer `.stepper-dropdown-menu` par `[part='panel']` et assurer le positionnement du wrapper :

```css
/* Retirer ce bloc : */
.stepper-dropdown-menu {
    padding: 0.75rem;
    max-width: var(--ar-stepper-dropdown-max-width, 18rem);
    background-color: var(--ar-color-bg, #fff);
    color: var(--ar-color-text, #2e2e31);
}

/* Ajouter à la place : */
.stepper-dropdown {
    position: relative;
    display: flex;
}

[part='panel'] {
    padding: 0.75rem;
    max-width: var(--ar-stepper-panel-max-width, var(--ar-panel-max-width, 18rem));
}
```

Note : `.stepper-dropdown` remplace `.dropdown { position: relative }` qui était fourni par le fichier legacy.

- [ ] **Step 5 : Mettre à jour `stepper.ts` — imports, static styles, @query, JSDoc**

Remplacer l'import `dropdownStyles` par `panelStyles` :

```ts
// Retirer :
import dropdownStyles from '../../styles/components/dropdown.styles.js';

// Ajouter :
import panelStyles from '../../styles/shared/panel.styles.js';
```

Mettre à jour `static styles` :

```ts
static override styles = [panelStyles, stepperStyles];
```

Mettre à jour le `@query` du panel :

```ts
// Retirer :
@query('#stepper-dropdown-menu') private _dropdownPanel?: HTMLElement;

// Ajouter :
@query('[part="panel"]') private _dropdownPanel?: HTMLElement;
```

Ajouter dans le JSDoc de classe :

```ts
 * @csspart panel - Le panel mobile flottant.
 * @cssprop [--ar-stepper-panel-max-width=var(--ar-panel-max-width,18rem)] - Largeur max du panel mobile (cascade vers --ar-panel-max-width).
```

- [ ] **Step 6 : Lancer les tests**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run test:all 2>&1 | tail -30
```

Résultat attendu : tous les tests verts, y compris le nouveau.

- [ ] **Step 7 : Commit**

```bash
git add packages/core/src/components/stepper/stepper.renderer.ts \
        packages/core/src/components/stepper/stepper.styles.ts \
        packages/core/src/components/stepper/stepper.ts \
        packages/core/src/components/stepper/stepper.browser.test.ts
git commit -m "refactor(stepper): add part=\"panel\" + migrate to shared panel styles"
```

---

## Task 4 — Migrer `ar-breadcrumb`

**Files:**

- Modify: `packages/core/src/components/breadcrumb/breadcrumb.ts`
- Modify: `packages/core/src/components/breadcrumb/breadcrumb.styles.ts`
- Test: `packages/core/src/components/breadcrumb/breadcrumb.browser.test.ts`

- [ ] **Step 1 : Écrire le test WTR qui vérifie `part="panel"` sur le panel mobile**

Dans `breadcrumb.browser.test.ts`, ajouter dans le bloc `describe` existant :

```ts
it('mobile panel has part="panel"', async () => {
    await setViewport({ width: 400, height: 800 });
    const el = await fixture<ArBreadcrumb>(html`
        <ar-breadcrumb>
            <ar-breadcrumb-item href="/">Accueil</ar-breadcrumb-item>
            <ar-breadcrumb-item href="/section">Section</ar-breadcrumb-item>
            <ar-breadcrumb-item active>Page</ar-breadcrumb-item>
        </ar-breadcrumb>
    `);
    await el.updateComplete;
    await aTimeout(50);
    const panel = el.shadowRoot!.querySelector('[part="panel"]');
    expect(panel).to.exist;
});
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run test:all 2>&1 | grep -A 3 'part="panel"'
```

Résultat attendu : échec `AssertionError: expected null to exist`.

- [ ] **Step 3 : Mettre à jour le template dans `breadcrumb.ts`**

Localiser le div panel mobile (ligne ~166), remplacer :

```ts
<div
    class="dropdown-menu dropdown-menu-left breadcrumb-dropdown-panel${this.dropdownOpen ? ' show' : ''}"
    popover="auto"
    tabindex="-1"
>
```

Par :

```ts
<div
    part="panel"
    popover="auto"
    tabindex="-1"
>
```

Note : `popover="auto"` reste statique dans le template (cohérence avec l'implémentation actuelle). La gestion show/hide passe maintenant entièrement par `:not(:popover-open)` du shared.

- [ ] **Step 4 : Remplacer `dropdownStyles` par `panelStyles` dans `breadcrumb.ts`**

```ts
// Retirer :
import dropdownStyles from '../../styles/components/dropdown.styles.js';

// Ajouter :
import panelStyles from '../../styles/shared/panel.styles.js';
```

Mettre à jour `static styles` :

```ts
static override styles = [panelStyles, breadcrumbStyles];
```

Mettre à jour le `@query` du panel :

```ts
// Retirer :
@query('.breadcrumb-dropdown-panel') private _dropdownPanel?: HTMLElement;

// Ajouter :
@query('[part="panel"]') private _dropdownPanel?: HTMLElement;
```

Ajouter dans le JSDoc de classe :

```ts
 * @csspart panel - Le panel mobile flottant.
 * @cssprop [--ar-breadcrumb-panel-max-width=var(--ar-panel-max-width,18rem)] - Largeur max du panel mobile (cascade vers --ar-panel-max-width).
```

- [ ] **Step 5 : Ajouter les overrides dans `breadcrumb.styles.ts`**

Ajouter à la fin du fichier :

```css
/* ── Panel flottant mobile ───────────────────────────────── */

[part='panel'] {
    max-width: var(--ar-breadcrumb-panel-max-width, var(--ar-panel-max-width, 18rem));
}
```

- [ ] **Step 6 : Lancer les tests**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run test:all 2>&1 | tail -30
```

Résultat attendu : tous les tests verts.

- [ ] **Step 7 : Commit**

```bash
git add packages/core/src/components/breadcrumb/breadcrumb.ts \
        packages/core/src/components/breadcrumb/breadcrumb.styles.ts \
        packages/core/src/components/breadcrumb/breadcrumb.browser.test.ts
git commit -m "refactor(breadcrumb): add part=\"panel\" + migrate to shared panel styles"
```

---

## Task 5 — Supprimer `styles/components/dropdown.styles.ts`

**Files:**

- Delete: `packages/core/src/styles/components/dropdown.styles.ts`

- [ ] **Step 1 : Vérifier qu'aucun fichier n'importe encore le fichier legacy**

```bash
grep -r "styles/components/dropdown.styles" /Users/jon/Code/Active_projects/ariane/packages/core/src
```

Résultat attendu : aucune ligne. Si des imports subsistent, les corriger avant de continuer.

- [ ] **Step 2 : Supprimer le fichier**

```bash
rm /Users/jon/Code/Active_projects/ariane/packages/core/src/styles/components/dropdown.styles.ts
```

- [ ] **Step 3 : Lancer la suite complète pour confirmer aucune régression**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run test:all 2>&1 | tail -30
```

Résultat attendu : toutes les suites vertes.

- [ ] **Step 4 : Commit**

```bash
git add -u packages/core/src/styles/components/dropdown.styles.ts
git commit -m "chore(styles): remove legacy dropdown.styles global (replaced by panel.styles shared)"
```

---

## Task 6 — Vérification finale dark mode

- [ ] **Step 1 : Lancer le serveur de dev**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run dev
```

- [ ] **Step 2 : Vérifier le dark mode sur les trois composants**

Dans Chrome DevTools → Rendering → « Emulate CSS prefers-color-scheme: dark ». Vérifier sur les pages dropdown, stepper, breadcrumb :

- Fond du panel : couleur dark (pas de fond blanc hardcodé)
- Texte : lisible
- Bordure et ombre cohérentes entre les trois composants

- [ ] **Step 3 : Corriger si nécessaire et commiter**

```bash
git add -p
git commit -m "fix(panel-styles): dark mode corrections post-review"
```

---

## Tokens CSS publics exposés après refacto

| Token                             | Défaut                             | Portée                     |
| --------------------------------- | ---------------------------------- | -------------------------- |
| `--ar-panel-bg`                   | `var(--ar-color-bg, #fff)`         | Tous les panels            |
| `--ar-panel-text`                 | `var(--ar-color-text, #2e2e31)`    | Tous les panels            |
| `--ar-panel-border-color`         | `var(--ar-color-border, #e2e2e5)`  | Tous les panels            |
| `--ar-panel-radius`               | `0.375rem`                         | Tous les panels            |
| `--ar-panel-shadow`               | ombre deux couches                 | Tous les panels            |
| `--ar-panel-padding`              | `0.25rem`                          | Tous les panels            |
| `--ar-panel-max-width`            | `18rem`                            | Tous les panels            |
| `--ar-dropdown-*`                 | chaînent vers `--ar-panel-*`       | `ar-dropdown` uniquement   |
| `--ar-stepper-panel-max-width`    | chaîne vers `--ar-panel-max-width` | `ar-stepper` uniquement    |
| `--ar-breadcrumb-panel-max-width` | chaîne vers `--ar-panel-max-width` | `ar-breadcrumb` uniquement |
