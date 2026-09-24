# Headless Styles Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Supprimer tous les fallbacks cosmétiques des `*.styles.ts` composants et reporter les valeurs dans `themes/default.css`, conformément au modèle headless d'Ariane (issue #74).

**Architecture:** Pour chaque composant — (1) ajouter dans `default.css` les tokens manquants, (2) retirer les fallbacks dans le `*.styles.ts`, (3) vérifier, (4) committer. La PR cible est `refactor/headless-styles` → `dev`.

**Tech Stack:** Lit 3, CSS custom properties, TypeScript, Vitest.

---

## Règles appliquées dans ce plan

- **R1** `var(--ar-token, #valeur)` → `var(--ar-token)` — token doit être dans `default.css`
- **R2** `var(--ar-X, var(--ar-Y, ...))` → `var(--ar-X)` — `--ar-X` pointe vers `--ar-Y` dans `default.css`
- **R3** `calc(-1 * var(--ar-X, 0px))` — inchangé (fallback structurel layout)
- **R4** `var(--ar-color-danger, #d04442)` → `var(--ar-color-danger-50)` (token inexistant → corriger la référence)

---

## Task 1 : progressbar

**Files:**

- Modify: `packages/core/src/components/progressbar/progressbar.styles.ts`

Les 3 tokens (`--ar-progressbar-track-color`, `--ar-progressbar-fill-color`, `--ar-progressbar-percent-color`) sont déjà dans `default.css`. Aucun ajout requis.

- [ ] **Étape 1 — Retirer les fallbacks dans `progressbar.styles.ts`**

Remplacer les lignes 28, 33, 70 :

```ts
// ligne 28
background-color: var(--ar-progressbar-track-color);

// ligne 33
background-color: var(--ar-progressbar-fill-color);

// ligne 70
color: var(--ar-progressbar-percent-color);
```

- [ ] **Étape 2 — Vérifier**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run test
```

Attendu : tous les tests passent.

- [ ] **Étape 3 — Committer**

```bash
git add packages/core/src/components/progressbar/progressbar.styles.ts
git commit -m "refactor(progressbar): supprimer fallbacks cosmétiques — modèle headless"
```

---

## Task 2 : spinner

**Files:**

- Modify: `packages/core/src/components/spinner/spinner.styles.ts`
- Modify: `packages/core/src/styles/themes/default.css`

- [ ] **Étape 1 — Ajouter le token dans `default.css`**

Dans la section `/* 6. TOKENS COMPOSANTS */`, après la section existante `/* pagination */`, ajouter :

```css
/* spinner */
--ar-spinner-stroke-color: currentColor;
```

- [ ] **Étape 2 — Retirer le fallback dans `spinner.styles.ts`**

Ligne 30 :

```ts
stroke: var(--ar-spinner-stroke-color);
```

- [ ] **Étape 3 — Vérifier**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run test
```

- [ ] **Étape 4 — Committer**

```bash
git add packages/core/src/components/spinner/spinner.styles.ts \
        packages/core/src/styles/themes/default.css
git commit -m "refactor(spinner): supprimer fallbacks cosmétiques — modèle headless"
```

---

## Task 3 : dialog

**Files:**

- Modify: `packages/core/src/components/dialog/dialog.styles.ts`

Les tokens `--ar-color-bg` et `--ar-color-text` sont des tokens globaux déjà définis. Le token `--ar-color-danger` n'existe pas — remplacer par `--ar-color-danger-50` (R4).

- [ ] **Étape 1 — Retirer les fallbacks et corriger le token inexistant**

Lignes 77-78, 209 :

```ts
// ligne 77
background: var(--ar-color-bg);

// ligne 78
color: var(--ar-color-text);

// ligne 209
outline: 3px solid var(--ar-color-danger-50);
```

- [ ] **Étape 2 — Vérifier**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run test
```

- [ ] **Étape 3 — Committer**

```bash
git add packages/core/src/components/dialog/dialog.styles.ts
git commit -m "refactor(dialog): supprimer fallbacks cosmétiques — modèle headless"
```

---

## Task 4 : alert

**Files:**

- Modify: `packages/core/src/components/alert/alert.styles.ts`
- Modify: `packages/core/src/styles/themes/default.css`

Les tokens `--ar-alert-info/error/warning/success-*` sont déjà dans `default.css`. Les tokens `--ar-alert-padding`, `--ar-alert-border-*`, `--ar-alert-close-*` sont absents.

- [ ] **Étape 1 — Ajouter les tokens manquants dans `default.css`**

Dans la section `/* alert */` existante, ajouter les tokens manquants. Résultat final de la section :

```css
/* alert */
--ar-alert-padding: 1rem;
--ar-alert-border-radius: 0.75rem;
--ar-alert-border-width: 1px;
--ar-alert-border-style: solid;
--ar-alert-close-size: 2rem;
--ar-alert-close-bg: color-mix(in srgb, currentColor 8%, transparent);
--ar-alert-close-hover-bg: color-mix(in srgb, currentColor 20%, transparent);
--ar-alert-info-bg: var(--ar-color-info-bg);
--ar-alert-info-border: var(--ar-color-info-bg);
--ar-alert-info-icon: var(--ar-color-info-text);
--ar-alert-warning-bg: var(--ar-color-warning-bg);
--ar-alert-warning-border: var(--ar-color-warning-bg);
--ar-alert-warning-icon: var(--ar-color-warning-text);
--ar-alert-error-bg: var(--ar-color-danger-bg);
--ar-alert-error-border: var(--ar-color-danger-bg);
--ar-alert-error-icon: var(--ar-color-danger-text);
--ar-alert-success-bg: var(--ar-color-success-bg);
--ar-alert-success-border: var(--ar-color-success-bg);
--ar-alert-success-icon: var(--ar-color-success-text);
```

- [ ] **Étape 2 — Retirer tous les fallbacks dans `alert.styles.ts`**

Résultat attendu du fichier après modification (contenu complet) :

```ts
import { css } from 'lit';

export default css`
    :host {
        display: flex;
        box-sizing: border-box;
        column-gap: 0.75rem;
        position: relative;
        align-items: center;
        opacity: 1;
        transform: scale(1);
        color: var(--ar-color-text);
        padding: var(--ar-alert-padding);
        border-radius: var(--ar-alert-border-radius);
        border-width: var(--ar-alert-border-width);
        border-style: var(--ar-alert-border-style);
    }

    :host([variant='info']) {
        background-color: var(--ar-alert-info-bg);
        border-color: var(--ar-alert-info-border);

        [part='icon'] {
            color: var(--ar-alert-info-icon);
        }
    }

    :host([variant='error']) {
        background-color: var(--ar-alert-error-bg);
        border-color: var(--ar-alert-error-border);

        [part='icon'] {
            color: var(--ar-alert-error-icon);
        }
    }

    :host([variant='warning']) {
        background-color: var(--ar-alert-warning-bg);
        border-color: var(--ar-alert-warning-border);

        [part='icon'] {
            color: var(--ar-alert-warning-icon);
        }
    }

    :host([variant='success']) {
        background-color: var(--ar-alert-success-bg);
        border-color: var(--ar-alert-success-border);

        [part='icon'] {
            color: var(--ar-alert-success-icon);
        }
    }

    :host([hiding]) {
        opacity: 0;
        transform: scale(0.75);
        transition:
            opacity 0.33s,
            transform 0.33s;
    }

    @media (prefers-reduced-motion: reduce) {
        :host([hiding]),
        [part='close'] {
            transition: none;
        }
    }

    [part='close'] {
        order: 1;
        align-self: flex-start;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: var(--ar-alert-close-size);
        height: var(--ar-alert-close-size);
        padding: 0;
        border: none;
        border-radius: 7px;
        background-color: var(--ar-alert-close-bg);
        color: currentColor;
        cursor: pointer;
        opacity: 0.75;
        transition:
            opacity 0.15s,
            background-color 0.15s;
        position: relative;
        top: -0.2rem;
        right: -0.2rem;

        &:hover {
            opacity: 1;
            background-color: var(--ar-alert-close-hover-bg);
        }

        &:focus-visible {
            opacity: 1;
            outline: 2px solid currentColor;
            outline-offset: 2px;
        }
    }

    svg {
        height: 1.25em;
        overflow: visible;
        width: auto;
    }

    [part='icon'] {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        font-size: 1.5em;
    }
`;
```

- [ ] **Étape 3 — Vérifier**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run test
```

- [ ] **Étape 4 — Committer**

```bash
git add packages/core/src/components/alert/alert.styles.ts \
        packages/core/src/styles/themes/default.css
git commit -m "refactor(alert): supprimer fallbacks cosmétiques — modèle headless"
```

---

## Task 5 : tooltip

**Files:**

- Modify: `packages/core/src/components/tooltip/tooltip.styles.ts`
- Modify: `packages/core/src/styles/themes/default.css`

Aucun token `--ar-tooltip-*` n'existe dans `default.css` — tous à créer.

- [ ] **Étape 1 — Ajouter la section tooltip dans `default.css`**

Après la section `/* spinner */`, ajouter :

```css
/* tooltip */
--ar-tooltip-bg: #1a1a1a;
--ar-tooltip-color: var(--ar-color-white);
--ar-tooltip-border-radius: var(--ar-border-radius-sm);
--ar-tooltip-font-size: 0.8125rem;
--ar-tooltip-padding: 0.375rem 0.625rem;
--ar-tooltip-max-width: 18rem;
--ar-tooltip-arrow-size: 6px;
```

- [ ] **Étape 2 — Retirer les fallbacks dans `tooltip.styles.ts`**

Résultat attendu des lignes concernées :

```ts
padding: var(--ar-tooltip-padding);
max-width: var(--ar-tooltip-max-width);
background-color: var(--ar-tooltip-bg);
color: var(--ar-tooltip-color);
border-radius: var(--ar-tooltip-border-radius);
font-size: var(--ar-tooltip-font-size);

// dans [part='arrow'] :
width: var(--ar-tooltip-arrow-size);
height: var(--ar-tooltip-arrow-size);
background-color: var(--ar-tooltip-bg);
```

- [ ] **Étape 3 — Vérifier**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run test
```

- [ ] **Étape 4 — Committer**

```bash
git add packages/core/src/components/tooltip/tooltip.styles.ts \
        packages/core/src/styles/themes/default.css
git commit -m "refactor(tooltip): supprimer fallbacks cosmétiques — modèle headless"
```

---

## Task 6 : panel.styles + dropdown

**Files:**

- Modify: `packages/core/src/styles/shared/panel.styles.ts`
- Modify: `packages/core/src/components/dropdown/dropdown.styles.ts`
- Modify: `packages/core/src/styles/themes/default.css`

`panel.styles.ts` est partagé par dropdown, breadcrumb et stepper. Les tokens `--ar-panel-*` et `--ar-dropdown-*` sont tous absents de `default.css`.

- [ ] **Étape 1 — Ajouter les sections panel et dropdown dans `default.css`**

Après la section `/* tooltip */`, ajouter :

```css
/* panel (shared — dropdown, breadcrumb, stepper) */
--ar-panel-bg: var(--ar-color-bg);
--ar-panel-text: var(--ar-color-text);
--ar-panel-border-color: var(--ar-color-border);
--ar-panel-radius: var(--ar-border-radius-md);
--ar-panel-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 10px 15px -3px rgba(0, 0, 0, 0.07);
--ar-panel-padding: 0.25rem;
--ar-panel-min-width: 18rem;
--ar-panel-max-width: 18rem;

/* dropdown */
--ar-dropdown-bg: var(--ar-panel-bg);
--ar-dropdown-color: var(--ar-panel-text);
--ar-dropdown-border-color: var(--ar-panel-border-color);
--ar-dropdown-border-radius: var(--ar-panel-radius);
--ar-dropdown-shadow: var(--ar-panel-shadow);
--ar-dropdown-padding: var(--ar-panel-padding);
--ar-dropdown-min-width: 10rem;
--ar-dropdown-max-width: var(--ar-panel-max-width);
```

- [ ] **Étape 2 — Retirer les fallbacks dans `panel.styles.ts`**

Résultat attendu du bloc `[part='panel']` :

```ts
[part='panel'] {
    /* Popover positioning reset */
    position: absolute;
    inset: 0 auto auto 0;
    margin: 0;

    /* Box model */
    box-sizing: border-box;
    overflow-y: auto;

    /* Tokens visuels */
    background-color: var(--ar-panel-bg);
    color: var(--ar-panel-text);
    border: 1px solid var(--ar-panel-border-color);
    border-radius: var(--ar-panel-radius);
    box-shadow: var(--ar-panel-shadow);
    padding: var(--ar-panel-padding);
    max-width: var(--ar-panel-max-width);
}
```

- [ ] **Étape 3 — Retirer les fallbacks dans `dropdown.styles.ts`**

Résultat attendu du bloc `[part='panel']` :

```ts
[part='panel'] {
    /* Overrides composant — chaînent vers les tokens shared --ar-panel-* */
    background-color: var(--ar-dropdown-bg);
    color: var(--ar-dropdown-color);
    border-color: var(--ar-dropdown-border-color);
    border-radius: var(--ar-dropdown-border-radius);
    box-shadow: var(--ar-dropdown-shadow);
    padding: var(--ar-dropdown-padding);
    min-width: var(--ar-dropdown-min-width);
    max-width: var(--ar-dropdown-max-width);
}
```

- [ ] **Étape 4 — Vérifier**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run test
```

- [ ] **Étape 5 — Committer**

```bash
git add packages/core/src/styles/shared/panel.styles.ts \
        packages/core/src/components/dropdown/dropdown.styles.ts \
        packages/core/src/styles/themes/default.css
git commit -m "refactor(panel,dropdown): supprimer fallbacks cosmétiques — modèle headless"
```

---

## Task 7 : breadcrumb

**Files:**

- Modify: `packages/core/src/components/breadcrumb/breadcrumb.styles.ts`
- Modify: `packages/core/src/styles/themes/default.css`

Les tokens `--ar-breadcrumb-separator-color` et `--ar-breadcrumb-bullet-color` sont déjà dans `default.css`. Ajouter `--ar-breadcrumb-panel-min-width` et `--ar-breadcrumb-panel-max-width`. Les tokens globaux (`--ar-color-text`, `--ar-color-bg`, etc.) sont définis.

Note : `breadcrumb.styles.ts` contient deux fallbacks incohérents pour `--ar-color-text` (`#2e2e31` et `#171717`). Les deux deviennent `var(--ar-color-text)` — la valeur du thème fait foi.

- [ ] **Étape 1 — Ajouter les tokens manquants dans `default.css`**

Dans la section `/* breadcrumb */` existante, ajouter à la suite :

```css
--ar-breadcrumb-panel-min-width: var(--ar-panel-min-width);
--ar-breadcrumb-panel-max-width: var(--ar-panel-max-width);
```

- [ ] **Étape 2 — Retirer les fallbacks dans `breadcrumb.styles.ts`**

Remplacements à effectuer :

```ts
// ligne 20
color: var(--ar-color-text);

// ligne 53
color: var(--ar-color-text);

// ligne 76
background-color: var(--ar-breadcrumb-separator-color);

// ligne 106
background-color: var(--ar-breadcrumb-bullet-color);

// ligne 109
box-shadow: 0 0 0 2px var(--ar-color-bg);

// ligne 113
background-color: var(--ar-color-neutral-50);

// ligne 124
background-color: var(--ar-color-interactive);

// ligne 142
background-image: linear-gradient(var(--ar-color-neutral-90) 25%, transparent 0);

// ligne 149
background-image: linear-gradient(var(--ar-color-neutral-70) 25%, transparent 0);

// ligne 162
min-width: var(--ar-breadcrumb-panel-min-width);

// ligne 163
max-width: var(--ar-breadcrumb-panel-max-width);
```

- [ ] **Étape 3 — Vérifier**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run test
```

- [ ] **Étape 4 — Committer**

```bash
git add packages/core/src/components/breadcrumb/breadcrumb.styles.ts \
        packages/core/src/styles/themes/default.css
git commit -m "refactor(breadcrumb): supprimer fallbacks cosmétiques — modèle headless"
```

---

## Task 8 : pagination

**Files:**

- Modify: `packages/core/src/components/pagination/pagination.styles.ts`

Tous les tokens utilisés (`--ar-color-bg`, `--ar-color-border`, `--ar-color-interactive`, `--ar-color-bg-subtle`, `--ar-color-text-inverse`, `--ar-color-text-muted`, `--ar-pagination-active-color`) sont déjà dans `default.css`. Aucun ajout requis.

Note : `pagination.styles.ts` contient deux blocs `.pagination-item.active .btn-tertiary` dupliqués (pré-existant). Retirer les fallbacks dans les deux occurrences.

- [ ] **Étape 1 — Retirer les fallbacks dans `pagination.styles.ts`**

Remplacements (tous les `var(--ar-xxx, valeur)` → `var(--ar-xxx)`) :

```ts
// ligne 21
background-color: var(--ar-color-bg);

// ligne 22
border: 1px solid var(--ar-color-border);

// ligne 27
color: var(--ar-color-interactive);

// ligne 33
background-color: var(--ar-color-bg-subtle);

// ligne 34
border-color: var(--ar-color-border);

// ligne 57
color: var(--ar-color-text-inverse);

// ligne 58
background-color: var(--ar-color-interactive);

// ligne 59
border-color: var(--ar-color-interactive);

// ligne 63
color: var(--ar-color-text-muted);

// ligne 66
background-color: var(--ar-color-bg);

// ligne 67
border-color: var(--ar-color-border);

// ligne 138-139 (1er bloc dupliqué)
color: var(--ar-color-text-inverse);
background-color: var(--ar-color-interactive);

// ligne 179
color: var(--ar-pagination-active-color);

// ligne 180
background-color: var(--ar-color-bg);

// ligne 181
border: 1px solid var(--ar-pagination-active-color);
```

- [ ] **Étape 2 — Vérifier**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run test
```

- [ ] **Étape 3 — Committer**

```bash
git add packages/core/src/components/pagination/pagination.styles.ts
git commit -m "refactor(pagination): supprimer fallbacks cosmétiques — modèle headless"
```

---

## Task 9 : stepper

**Files:**

- Modify: `packages/core/src/components/stepper/stepper.styles.ts`
- Modify: `packages/core/src/styles/themes/default.css`

Plusieurs tokens `--ar-stepper-*` sont absents de `default.css`. De plus, `default.css` contient `--ar-stepper-bullet-hover-color` mais le composant utilise `--ar-stepper-bullet-hover-bg` — renommer dans `default.css`.

- [ ] **Étape 1 — Mettre à jour la section stepper dans `default.css`**

Remplacer la section `/* stepper */` existante par :

```css
/* stepper */
--ar-stepper-label-color: var(--ar-color-text-muted);
--ar-stepper-bullet-radius: 0.75rem;
--ar-stepper-bullet-color: var(--ar-color-interactive);
--ar-stepper-bullet-bg: var(--ar-color-primary-80);
--ar-stepper-bullet-border-color: var(--ar-color-neutral-80);
--ar-stepper-bullet-hover-bg: var(--ar-color-text-muted);
--ar-stepper-active-label-color: var(--ar-color-interactive);
--ar-stepper-active-bullet-color: var(--ar-color-text-inverse);
--ar-stepper-active-bullet-bg: var(--ar-color-interactive);
--ar-stepper-gap: 1.5rem;
--ar-stepper-substep-gap: 1rem;
--ar-stepper-connector-color: var(--ar-color-neutral-80);
--ar-stepper-panel-min-width: var(--ar-panel-min-width);
--ar-stepper-panel-max-width: var(--ar-panel-max-width);
```

- [ ] **Étape 2 — Retirer les fallbacks dans `stepper.styles.ts`**

Remplacements :

```ts
// ligne 28-30 [part='panel']
min-width: var(--ar-stepper-panel-min-width);
max-width: var(--ar-stepper-panel-max-width);

// ligne 44 .stepper-item-bullet, .stepper-item-inner
color: var(--ar-stepper-label-color);

// ligne 53 .stepper-item-bullet
border-radius: var(--ar-stepper-bullet-radius);

// ligne 57-59 box-shadow
box-shadow: 0 0 0 1px var(--ar-stepper-bullet-border-color) inset;

// ligne 83 .stepper-link:focus, :hover — color
color: var(--ar-stepper-bullet-hover-bg);

// ligne 88 :focus:before, :hover:before
background-color: var(--ar-color-interactive);

// ligne 94 .stepper-link:focus .stepper-item-label, :hover .stepper-item-label
color: var(--ar-color-text);

// ligne 99-100 .stepper-link:focus .stepper-item-bullet, :hover .stepper-item-bullet
color: var(--ar-color-text-inverse);
background-color: var(--ar-stepper-bullet-hover-bg);

// ligne 106
outline-color: var(--ar-color-interactive);

// ligne 111 .stepper-item.active
color: var(--ar-stepper-active-label-color);

// ligne 116
color: var(--ar-stepper-active-bullet-color);

// ligne 117
background-color: var(--ar-stepper-active-bullet-bg);

// ligne 127 .stepper-link .stepper-item-bullet
color: var(--ar-stepper-bullet-color);

// ligne 128
background-color: var(--ar-stepper-bullet-bg);

// ligne 139-145 .stepper-list:not(.stepper-horizontal) background-image
background-image: linear-gradient(var(--ar-stepper-connector-color) 25%, transparent 0);

// ligne 138
height: var(--ar-stepper-gap);

// ligne 156
height: var(--ar-stepper-substep-gap);

// ligne 157-163 .stepper-list .stepper-list background-image
background-image: linear-gradient(var(--ar-stepper-connector-color) 25%, transparent 0);

// ligne 192 .stepper-edition .stepper-item-bullet
color: var(--ar-stepper-bullet-color);

// ligne 193
background-color: var(--ar-stepper-bullet-bg);
```

- [ ] **Étape 3 — Vérifier**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run test
```

- [ ] **Étape 4 — Committer**

```bash
git add packages/core/src/components/stepper/stepper.styles.ts \
        packages/core/src/styles/themes/default.css
git commit -m "refactor(stepper): supprimer fallbacks cosmétiques — modèle headless"
```

---

## Task 10 : Vérification finale et PR

**Files:** aucun fichier supplémentaire

- [ ] **Étape 1 — Vérifier l'absence de fallbacks cosmétiques résiduels**

```bash
grep -rE "var\(--ar-[^,)]+,\s*[^v]" \
  packages/core/src/components/*/  \
  packages/core/src/styles/shared/ \
  --include="*.styles.ts"
```

Attendu : aucun résultat (ou uniquement des `0px` dans des `calc()`).

- [ ] **Étape 2 — Vérifier que tous les tokens composant sont définis dans `default.css`**

```bash
# Lister les tokens utilisés dans les styles mais absents de default.css
grep -rhoE "\-\-ar-[a-z-]+" \
  packages/core/src/components/ \
  packages/core/src/styles/shared/ \
  --include="*.styles.ts" | sort -u > /tmp/used.txt

grep -oE "\-\-ar-[a-z-]+(?=:)" \
  packages/core/src/styles/themes/default.css | sort -u > /tmp/defined.txt

comm -23 /tmp/used.txt /tmp/defined.txt
```

Attendu : uniquement des tokens globaux (`--ar-color-*`, `--ar-border-radius-*`, `--ar-font-*`, `--ar-spacing-*`, `--ar-focus-*`) qui sont normaux à utiliser directement sans token composant intermédiaire. Aucun `--ar-<composant>-*` non défini.

- [ ] **Étape 3 — Build TypeScript docs**

```bash
cd /Users/jon/Code/Active_projects/ariane && \
  npx tsc --project apps/docs/tsconfig.json --noEmit
```

Attendu : aucune erreur.

- [ ] **Étape 4 — Pousser la branche et ouvrir la PR**

```bash
git push -u origin refactor/headless-styles

gh pr create \
  --title "refactor(styles): migration modèle headless — supprimer fallbacks cosmétiques (issue #74)" \
  --body "## Summary

- Supprime tous les fallbacks cosmétiques des \`*.styles.ts\` composants
- Ajoute dans \`themes/default.css\` les tokens manquants : \`--ar-tooltip-*\`, \`--ar-panel-*\`, \`--ar-dropdown-*\`, \`--ar-alert-*\` (padding/border/close), \`--ar-stepper-*\` (manquants), \`--ar-spinner-stroke-color\`
- Corrige la référence \`--ar-color-danger\` → \`--ar-color-danger-50\` dans \`dialog.styles.ts\`
- Renomme \`--ar-stepper-bullet-hover-color\` → \`--ar-stepper-bullet-hover-bg\` (alignement avec le nom utilisé dans le composant)

Closes #74

## Test plan
- [ ] \`npm run test\` passe
- [ ] Build TypeScript docs sans erreur
- [ ] Vérification visuelle light/dark mode sur les composants affectés

🤖 Generated with [Claude Code](https://claude.com/claude-code)" \
  --base dev
```
