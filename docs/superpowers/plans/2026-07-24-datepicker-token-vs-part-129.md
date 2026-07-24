# Migration `ar-datepicker` — token scopé vs `::part()` (#129) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Appliquer le critère à 4 branches défini dans `docs/superpowers/specs/2026-07-24-token-vs-part-datepicker-design.md` à `ar-datepicker` : retirer les 35 tokens `:root` à usage unique/purement cosmétiques de `default.css`, les remplacer par des règles `::part()` groupées, et documenter le critère en amendement à ADR-005.

**Architecture:** Pour chaque groupe de propriétés (nav-btn, footer-btn, footer, header, weekday, day, panel, label), retirer la déclaration `:root` correspondante dans `default.css`, retirer la consommation `var(--ar-datepicker-*)` dans `datepicker.styles.ts` (le composant ne déclare plus la propriété), ajouter une règle `ar-datepicker::part(<part>)` dans `default.css` avec la valeur reprise telle quelle (littérale ou alias direct vers un token global), et retirer l'entrée `@cssprop` correspondante dans `datepicker.ts`. Les 23 tokens conservés (fallback WCAG, lus en JS, réutilisés ≥2×, sur `:host`, ou à calibration dark-mode indépendante) restent inchangés.

**Tech Stack:** Lit 3 + TypeScript, CSS custom properties + Shadow Parts (`@layer ariane.theme` dans `packages/core/src/styles/themes/default.css`), `packages/core/scripts/validate-cssprop-defaults.js`.

## Global Constraints

- Aucun changement visuel par défaut (thème chargé) : chaque règle `::part()` reprend exactement la valeur du token qu'elle remplace.
- Ne pas toucher aux 23 tokens conservés (cf. spec, section « Application à `ar-datepicker` »).
- Ne pas toucher `--ar-datepicker-error-color`, `--ar-datepicker-input-error-border-color` (calibration dark-mode indépendante) ni aux règles `::part(error)`/`::part(input)` existantes qui les consomment.
- Prettier : 100 caractères, 4 espaces, quotes simples (appliqué automatiquement par `lint-staged` au commit).
- Conventional Commits — chaque tâche se termine par un commit séparé.
- Ne jamais committer `packages/core/dist/`.
- Vérification par tâche : `npx vitest run datepicker` (depuis `packages/core/`) pour la non-régression comportementale (81 tests attendus), et `npm run build:manifest --workspace=packages/core` (depuis la racine) pour valider la couverture `@cssprop`/`default.css`.
- Les tâches 1 à 7 modifient les 3 mêmes fichiers (`default.css`, `datepicker.styles.ts`, `datepicker.ts`) dans des zones disjointes — à exécuter dans l'ordre, chaque tâche partant de l'état laissé par la précédente (pas de parallélisation).

---

## Task 1: `nav-btn` — 8 tokens retirés

**Files:**

- Modify: `packages/core/src/styles/themes/default.css` (section `ar-datepicker`, bloc `nav-btn`)
- Modify: `packages/core/src/components/datepicker/datepicker.styles.ts` (règles `[part~='nav-btn']*`)
- Modify: `packages/core/src/components/datepicker/datepicker.ts` (JSDoc `@cssprop`)

**Interfaces:** Retire `--ar-datepicker-nav-btn-size/-bg/-border-width/-color/-radius/-hover-bg/-active-bg/-focus-ring-offset`. Conserve `--ar-datepicker-nav-btn-border-color` et `--ar-datepicker-nav-btn-focus-ring-color` (Catégorie A, inchangés). Produit une nouvelle règle `ar-datepicker::part(nav-btn)` (+ `:hover`/`:active`/`:focus-visible`) dans `default.css`.

- [ ] **Step 1: Retirer les 8 tokens de `default.css`**

Remplacer dans la section `ar-datepicker` de `default.css` :

```css
--ar-datepicker-nav-btn-size: 2rem;
--ar-datepicker-nav-btn-bg: transparent;
--ar-datepicker-nav-btn-border-width: 0px;
--ar-datepicker-nav-btn-border-color: transparent;
--ar-datepicker-nav-btn-color: var(--ar-color-text);
--ar-datepicker-nav-btn-radius: var(--ar-border-radius-sm);
--ar-datepicker-nav-btn-hover-bg: color-mix(in srgb, var(--ar-color-text) 8%, transparent);
--ar-datepicker-nav-btn-active-bg: color-mix(in srgb, var(--ar-color-text) 14%, transparent);
--ar-datepicker-nav-btn-focus-ring-color: var(--ar-focus-ring-color);
--ar-datepicker-nav-btn-focus-ring-offset: var(--ar-focus-ring-offset);
```

par :

```css
--ar-datepicker-nav-btn-border-color: transparent;
--ar-datepicker-nav-btn-focus-ring-color: var(--ar-focus-ring-color);
```

- [ ] **Step 2: Ajouter la règle `::part(nav-btn)` dans `default.css`**

Juste avant la règle `ar-datepicker::part(label)` existante (fin du fichier, avant le bloc `::part(hint)`), ajouter :

```css
ar-datepicker::part(nav-btn) {
    width: 2rem;
    height: 2rem;
    background: transparent;
    border-width: 0px;
    color: var(--ar-color-text);
    border-radius: var(--ar-border-radius-sm);
}

ar-datepicker::part(nav-btn):hover {
    background: color-mix(in srgb, var(--ar-color-text) 8%, transparent);
}

ar-datepicker::part(nav-btn):active {
    background: color-mix(in srgb, var(--ar-color-text) 14%, transparent);
}

ar-datepicker::part(nav-btn):focus-visible {
    outline-offset: var(--ar-focus-ring-offset);
}
```

- [ ] **Step 3: Simplifier `[part~='nav-btn']*` dans `datepicker.styles.ts`**

Remplacer :

```ts
    [part~='nav-btn'] {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: var(--ar-datepicker-nav-btn-size);
        aspect-ratio: 1 / 1;
        cursor: pointer;
        font: inherit;
        border-radius: var(--ar-datepicker-nav-btn-radius);
        background: var(--ar-datepicker-nav-btn-bg);
        border-style: solid;
        border-width: var(--ar-datepicker-nav-btn-border-width);
        /* a11y-fallback: border: raccourci scindé en longhands — un var() défaillant dans un raccourci invalide border-style, ce qui ferait disparaître la bordure entièrement sans thème */
        border-color: var(--ar-datepicker-nav-btn-border-color, transparent);
        color: var(--ar-datepicker-nav-btn-color);
    }

    [part~='nav-btn']:hover {
        background: var(--ar-datepicker-nav-btn-hover-bg);
    }

    [part~='nav-btn']:active {
        background: var(--ar-datepicker-nav-btn-active-bg);
    }

    [part~='nav-btn']:focus-visible {
        outline: 2px solid var(--ar-datepicker-nav-btn-focus-ring-color, ButtonText);
        outline-offset: var(--ar-datepicker-nav-btn-focus-ring-offset);
    }
```

par :

```ts
    [part~='nav-btn'] {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        aspect-ratio: 1 / 1;
        cursor: pointer;
        font: inherit;
        border-style: solid;
        /* a11y-fallback: border: raccourci scindé en longhands — un var() défaillant dans un raccourci invalide border-style, ce qui ferait disparaître la bordure entièrement sans thème */
        border-color: var(--ar-datepicker-nav-btn-border-color, transparent);
    }

    [part~='nav-btn']:focus-visible {
        outline: 2px solid var(--ar-datepicker-nav-btn-focus-ring-color, ButtonText);
    }
```

- [ ] **Step 4: Retirer les entrées `@cssprop` correspondantes dans `datepicker.ts`**

Supprimer ces 8 lignes du bloc JSDoc (garder les entrées `nav-btn-border-color` et `nav-btn-focus-ring-color`) :

```ts
 * @cssprop --ar-datepicker-nav-btn-size - Taille (width = height) des boutons nav.
 * @cssprop --ar-datepicker-nav-btn-bg - Fond des boutons de navigation.
 * @cssprop --ar-datepicker-nav-btn-border-width - Épaisseur de bordure des boutons nav.
 * @cssprop --ar-datepicker-nav-btn-color - Couleur texte des boutons nav.
 * @cssprop --ar-datepicker-nav-btn-radius - Border-radius des boutons nav.
 * @cssprop --ar-datepicker-nav-btn-hover-bg - Fond au survol des boutons nav.
 * @cssprop --ar-datepicker-nav-btn-active-bg - Fond à l'état actif des boutons nav.
```

et, séparément (fin de bloc, groupé avec les autres entrées `focus-ring`) :

```ts
 * @cssprop --ar-datepicker-nav-btn-focus-ring-offset - Décalage de l'anneau de focus des boutons de navigation (cascade vers --ar-focus-ring-offset).
```

- [ ] **Step 5: Tests**

Run (depuis `packages/core/`) : `npx vitest run datepicker`
Expected: 81/81 tests passent.

- [ ] **Step 6: Manifest**

Run (depuis la racine) : `npm run build:manifest --workspace=packages/core`
Expected: aucune erreur `validate-cssprop-defaults`.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/styles/themes/default.css packages/core/src/components/datepicker/datepicker.styles.ts packages/core/src/components/datepicker/datepicker.ts
git commit -m "refactor(datepicker): migre nav-btn de tokens scopés vers ::part() (#129)"
```

---

## Task 2: `footer-btn` — 9 tokens retirés

**Files:** mêmes 3 fichiers que Task 1.

**Interfaces:** Retire `--ar-datepicker-footer-btn-bg/-border-width/-color/-radius/-padding/-hover-bg/-hover-border-color/-active-bg/-focus-ring-offset`. Conserve `--ar-datepicker-footer-btn-border-color` et `--ar-datepicker-footer-btn-focus-ring-color`. Produit `ar-datepicker::part(footer-btn)` (+ `:hover`/`:active`/`:focus-visible`).

- [ ] **Step 1: Retirer les 9 tokens de `default.css`**

Remplacer :

```css
--ar-datepicker-footer-btn-bg: transparent;
--ar-datepicker-footer-btn-border-width: 1px;
--ar-datepicker-footer-btn-border-color: var(--ar-color-border);
--ar-datepicker-footer-btn-color: var(--ar-color-interactive);
--ar-datepicker-footer-btn-radius: var(--ar-border-radius-md);
--ar-datepicker-footer-btn-padding: 0.375rem 0.75rem;
--ar-datepicker-footer-btn-hover-bg: color-mix(
    in srgb,
    var(--ar-color-interactive) 10%,
    transparent
);
--ar-datepicker-footer-btn-hover-border-color: var(--ar-color-interactive);
--ar-datepicker-footer-btn-active-bg: color-mix(
    in srgb,
    var(--ar-color-interactive) 18%,
    transparent
);
--ar-datepicker-footer-btn-focus-ring-color: var(--ar-focus-ring-color);
--ar-datepicker-footer-btn-focus-ring-offset: var(--ar-focus-ring-offset);
```

par :

```css
--ar-datepicker-footer-btn-border-color: var(--ar-color-border);
--ar-datepicker-footer-btn-focus-ring-color: var(--ar-focus-ring-color);
```

- [ ] **Step 2: Ajouter la règle `::part(footer-btn)` dans `default.css`**

À la suite du bloc `::part(nav-btn)` ajouté en Task 1 :

```css
ar-datepicker::part(footer-btn) {
    background: transparent;
    border-width: 1px;
    color: var(--ar-color-interactive);
    border-radius: var(--ar-border-radius-md);
    padding: 0.375rem 0.75rem;
}

ar-datepicker::part(footer-btn):hover {
    background: color-mix(in srgb, var(--ar-color-interactive) 10%, transparent);
    border-color: var(--ar-color-interactive);
}

ar-datepicker::part(footer-btn):active {
    background: color-mix(in srgb, var(--ar-color-interactive) 18%, transparent);
}

ar-datepicker::part(footer-btn):focus-visible {
    outline-offset: var(--ar-focus-ring-offset);
}
```

- [ ] **Step 3: Simplifier `[part~='footer-btn']*` dans `datepicker.styles.ts`**

Remplacer :

```ts
    [part~='footer-btn'] {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font: inherit;
        padding: var(--ar-datepicker-footer-btn-padding);
        border-radius: var(--ar-datepicker-footer-btn-radius);
        background: var(--ar-datepicker-footer-btn-bg);
        border-style: solid;
        border-width: var(--ar-datepicker-footer-btn-border-width);
        /* a11y-fallback: border: raccourci scindé en longhands — un var() défaillant dans un raccourci invalide border-style, ce qui ferait disparaître la bordure entièrement sans thème */
        border-color: var(--ar-datepicker-footer-btn-border-color, transparent);
        color: var(--ar-datepicker-footer-btn-color);
    }

    [part~='footer-btn']:hover {
        background: var(--ar-datepicker-footer-btn-hover-bg);
        border-color: var(--ar-datepicker-footer-btn-hover-border-color);
    }

    [part~='footer-btn']:active {
        background: var(--ar-datepicker-footer-btn-active-bg);
    }

    [part~='footer-btn']:focus-visible {
        outline: 2px solid var(--ar-datepicker-footer-btn-focus-ring-color, ButtonText);
        outline-offset: var(--ar-datepicker-footer-btn-focus-ring-offset);
    }
```

par :

```ts
    [part~='footer-btn'] {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font: inherit;
        border-style: solid;
        /* a11y-fallback: border: raccourci scindé en longhands — un var() défaillant dans un raccourci invalide border-style, ce qui ferait disparaître la bordure entièrement sans thème */
        border-color: var(--ar-datepicker-footer-btn-border-color, transparent);
    }

    [part~='footer-btn']:focus-visible {
        outline: 2px solid var(--ar-datepicker-footer-btn-focus-ring-color, ButtonText);
    }
```

- [ ] **Step 4: Retirer les entrées `@cssprop` correspondantes dans `datepicker.ts`**

Supprimer (garder `footer-btn-border-color` et `footer-btn-focus-ring-color`) :

```ts
 * @cssprop --ar-datepicker-footer-btn-bg - Fond des boutons du footer.
 * @cssprop --ar-datepicker-footer-btn-border-width - Épaisseur de bordure des boutons footer.
 * @cssprop --ar-datepicker-footer-btn-color - Couleur texte des boutons footer.
 * @cssprop --ar-datepicker-footer-btn-radius - Border-radius des boutons footer.
 * @cssprop --ar-datepicker-footer-btn-padding - Padding des boutons footer.
 * @cssprop --ar-datepicker-footer-btn-hover-bg - Fond au survol des boutons footer.
 * @cssprop --ar-datepicker-footer-btn-hover-border-color - Couleur de bordure au survol des boutons footer.
 * @cssprop --ar-datepicker-footer-btn-active-bg - Fond à l'état actif des boutons footer.
```

et :

```ts
 * @cssprop --ar-datepicker-footer-btn-focus-ring-offset - Décalage de l'anneau de focus des boutons du footer (cascade vers --ar-focus-ring-offset).
```

- [ ] **Step 5: Tests**

Run (depuis `packages/core/`) : `npx vitest run datepicker`
Expected: 81/81 tests passent.

- [ ] **Step 6: Manifest**

Run (depuis la racine) : `npm run build:manifest --workspace=packages/core`
Expected: aucune erreur.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/styles/themes/default.css packages/core/src/components/datepicker/datepicker.styles.ts packages/core/src/components/datepicker/datepicker.ts
git commit -m "refactor(datepicker): migre footer-btn de tokens scopés vers ::part() (#129)"
```

---

## Task 3: `footer` + `header` — 8 tokens retirés

**Files:** mêmes 3 fichiers.

**Interfaces:** Retire `--ar-datepicker-footer-margin/-padding/-bg` et `--ar-datepicker-header-font-size/-margin/-padding/-radius/-bg`. Produit `ar-datepicker::part(footer)` et `ar-datepicker::part(header)`.

- [ ] **Step 1: Retirer les 8 tokens de `default.css`**

Remplacer :

```css
--ar-datepicker-header-font-size: 1rem;
--ar-datepicker-header-margin: 0;
--ar-datepicker-header-padding: 0 0 0.75rem;
--ar-datepicker-header-radius: 0;
--ar-datepicker-header-bg: transparent;
```

par (bloc retiré entièrement — aucun token `header-*` ne reste dans cette zone du fichier).

Remplacer :

```css
--ar-datepicker-footer-margin: 0;
--ar-datepicker-footer-padding: 0.75rem 0 0;
--ar-datepicker-footer-bg: transparent;
```

par (bloc retiré entièrement).

- [ ] **Step 2: Ajouter les règles `::part(header)` et `::part(footer)` dans `default.css`**

À la suite des blocs ajoutés en Task 1/2 :

```css
ar-datepicker::part(header) {
    font-size: 1rem;
    margin: 0;
    padding: 0 0 0.75rem;
    border-radius: 0;
    background: transparent;
}

ar-datepicker::part(footer) {
    margin: 0;
    padding: 0.75rem 0 0;
    background: transparent;
}
```

- [ ] **Step 3: Simplifier `[part='header']` et `[part='footer']` dans `datepicker.styles.ts`**

Remplacer :

```ts
    [part='header'] {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.25rem;
        font-size: var(--ar-datepicker-header-font-size);
        margin: var(--ar-datepicker-header-margin);
        padding: var(--ar-datepicker-header-padding);
        background: var(--ar-datepicker-header-bg);
        border-radius: var(--ar-datepicker-header-radius);
    }
```

par :

```ts
    [part='header'] {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.25rem;
    }
```

Remplacer :

```ts
    [part='footer'] {
        display: flex;
        justify-content: space-between;
        gap: 0.5rem;
        margin: var(--ar-datepicker-footer-margin);
        padding: var(--ar-datepicker-footer-padding);
        background: var(--ar-datepicker-footer-bg);
    }
```

par :

```ts
    [part='footer'] {
        display: flex;
        justify-content: space-between;
        gap: 0.5rem;
    }
```

- [ ] **Step 4: Retirer les entrées `@cssprop` correspondantes dans `datepicker.ts`**

Supprimer :

```ts
 * @cssprop --ar-datepicker-header-font-size - Taille de police de l'en-tête.
 * @cssprop --ar-datepicker-header-padding - Padding de l'en-tête.
 * @cssprop --ar-datepicker-header-margin - Margin de l'en-tête.
 * @cssprop --ar-datepicker-header-radius - Border-radius de l'en-tête.
 * @cssprop --ar-datepicker-header-bg - Fond de l'en-tête.
```

et :

```ts
 * @cssprop --ar-datepicker-footer-padding - Padding du footer.
 * @cssprop --ar-datepicker-footer-bg - Fond du footer.
 * @cssprop --ar-datepicker-footer-margin - Margin du footer.
```

- [ ] **Step 5: Tests**

Run (depuis `packages/core/`) : `npx vitest run datepicker`
Expected: 81/81 tests passent.

- [ ] **Step 6: Manifest**

Run (depuis la racine) : `npm run build:manifest --workspace=packages/core`
Expected: aucune erreur.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/styles/themes/default.css packages/core/src/components/datepicker/datepicker.styles.ts packages/core/src/components/datepicker/datepicker.ts
git commit -m "refactor(datepicker): migre footer/header de tokens scopés vers ::part() (#129)"
```

---

## Task 4: `weekday` — 2 tokens retirés, nouveau part

**Files:**

- Modify: `packages/core/src/styles/themes/default.css`
- Modify: `packages/core/src/components/datepicker/datepicker.styles.ts`
- Modify: `packages/core/src/components/datepicker/datepicker.ts` (JSDoc `@cssprop` + `@csspart` + template du `<th>`)

**Interfaces:** Retire `--ar-datepicker-weekday-color/-font-size`. Ajoute l'attribut `part="weekday"` sur le `<th>` (actuellement sans aucun `part`). Produit `ar-datepicker::part(weekday)`.

- [ ] **Step 1: Retirer les 2 tokens de `default.css`**

Remplacer :

```css
/* neutral-60 (~2.6:1 sur blanc) — distinction visuelle prioritaire sur AA strict */
--ar-datepicker-weekday-color: var(--ar-color-neutral-50);
--ar-datepicker-weekday-font-size: 0.75rem;
--ar-datepicker-day-other-month-color: var(--ar-color-neutral-50);
```

par :

```css
--ar-datepicker-day-other-month-color: var(--ar-color-neutral-50);
```

- [ ] **Step 2: Ajouter la règle `::part(weekday)` dans `default.css`**

À la suite des blocs précédents :

```css
/* neutral-60 (~2.6:1 sur blanc) — distinction visuelle prioritaire sur AA strict */
ar-datepicker::part(weekday) {
    color: var(--ar-color-neutral-50);
    font-size: 0.75rem;
}
```

- [ ] **Step 3: Ajouter `part="weekday"` au `<th>` dans `datepicker.ts`**

Remplacer (méthode qui construit les en-têtes de colonnes) :

```ts
                                html`<th aria-label=${full} scope="col">${abbr}</th>`,
```

par :

```ts
                                html`<th part="weekday" aria-label=${full} scope="col">${abbr}</th>`,
```

- [ ] **Step 4: Simplifier `[part='grid'] th` dans `datepicker.styles.ts`**

Remplacer :

```ts
    [part='grid'] th {
        text-align: center;
        font-size: var(--ar-datepicker-weekday-font-size);
        font-weight: normal;
        padding-block: 0.5rem;
        text-transform: uppercase;
        color: var(--ar-datepicker-weekday-color);
    }
```

par :

```ts
    [part='grid'] th {
        text-align: center;
        font-weight: normal;
        padding-block: 0.5rem;
        text-transform: uppercase;
    }
```

- [ ] **Step 5: Mettre à jour le JSDoc dans `datepicker.ts`**

Ajouter à la liste `@csspart` (après la ligne `@csspart grid`) :

```ts
 * @csspart weekday    - Les cellules d'en-tête de colonne (abréviations de jours).
```

Retirer :

```ts
 * @cssprop --ar-datepicker-weekday-color - Couleur des abréviations de jours.
 * @cssprop --ar-datepicker-weekday-font-size - Taille de police des abréviations de jours.
```

- [ ] **Step 6: Tests**

Run (depuis `packages/core/`) : `npx vitest run datepicker`
Expected: 81/81 tests passent.

- [ ] **Step 7: Manifest**

Run (depuis la racine) : `npm run build:manifest --workspace=packages/core`
Expected: aucune erreur.

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/styles/themes/default.css packages/core/src/components/datepicker/datepicker.styles.ts packages/core/src/components/datepicker/datepicker.ts
git commit -m "refactor(datepicker): migre weekday vers un nouveau part dedie (#129)"
```

---

## Task 5: `day` (hors « today ») — 5 tokens retirés

**Files:** mêmes 3 fichiers.

**Interfaces:** Retire `--ar-datepicker-day-bg/-border-width/-color/-font-size/-radius`. Conserve `--ar-datepicker-day-border-color`, `--ar-datepicker-day-size` et tous les tokens d'état (`today`/`hover`/`selected`/`focus`/`other-month`), inchangés. Produit `ar-datepicker::part(day)`.

- [ ] **Step 1: Retirer les 5 tokens de `default.css`**

Remplacer :

```css
--ar-datepicker-day-font-size: 1rem;
--ar-datepicker-day-color: var(--ar-color-text);
--ar-datepicker-day-size: 2.5rem;
--ar-datepicker-day-radius: 0.5rem;
--ar-datepicker-day-bg: transparent;
```

par :

```css
--ar-datepicker-day-size: 2.5rem;
```

- [ ] **Step 2: Ajouter la règle `::part(day)` dans `default.css`**

À la suite des blocs précédents :

```css
ar-datepicker::part(day) {
    font-size: 1rem;
    color: var(--ar-color-text);
    border-radius: 0.5rem;
    background-color: transparent;
    border-width: 2px;
}
```

- [ ] **Step 3: Simplifier `[part='day']` dans `datepicker.styles.ts`**

Remplacer :

```ts
    [part='day'] {
        font-size: var(--ar-datepicker-day-font-size);
        color: var(--ar-datepicker-day-color);
        /* a11y-fallback: WCAG 2.5.8 (Target Size Minimum) — [part='grid'] a border-collapse: collapse, qui supprime l'espacement natif du <table> ; sans thème la cellule se dimensionnerait à son seul contenu textuel */
        width: var(--ar-datepicker-day-size, 2.5rem);
        /* a11y-fallback: WCAG 2.5.8 (Target Size Minimum) — [part='grid'] a border-collapse: collapse, qui supprime l'espacement natif du <table> ; sans thème la cellule se dimensionnerait à son seul contenu textuel */
        height: var(--ar-datepicker-day-size, 2.5rem);
        display: flex;
        align-items: center;
        justify-content: center;
        margin: auto;
        cursor: pointer;
        border-radius: var(--ar-datepicker-day-radius);
        background-color: var(--ar-datepicker-day-bg);
        border-style: solid;
        border-width: var(--ar-datepicker-day-border-width);
        /* a11y-fallback: border: raccourci scindé en longhands — un var() défaillant dans un raccourci invalide border-style, ce qui casse la surcharge border-color de .today ci-dessous */
        border-color: var(--ar-datepicker-day-border-color, transparent);
    }
```

par :

```ts
    [part='day'] {
        /* a11y-fallback: WCAG 2.5.8 (Target Size Minimum) — [part='grid'] a border-collapse: collapse, qui supprime l'espacement natif du <table> ; sans thème la cellule se dimensionnerait à son seul contenu textuel */
        width: var(--ar-datepicker-day-size, 2.5rem);
        /* a11y-fallback: WCAG 2.5.8 (Target Size Minimum) — [part='grid'] a border-collapse: collapse, qui supprime l'espacement natif du <table> ; sans thème la cellule se dimensionnerait à son seul contenu textuel */
        height: var(--ar-datepicker-day-size, 2.5rem);
        display: flex;
        align-items: center;
        justify-content: center;
        margin: auto;
        cursor: pointer;
        border-style: solid;
        /* a11y-fallback: border: raccourci scindé en longhands — un var() défaillant dans un raccourci invalide border-style, ce qui casse la surcharge border-color de .today ci-dessous */
        border-color: var(--ar-datepicker-day-border-color, transparent);
    }
```

- [ ] **Step 4: Retirer les entrées `@cssprop` correspondantes dans `datepicker.ts`**

Supprimer :

```ts
 * @cssprop --ar-datepicker-day-font-size - Taille de police des jours.
 * @cssprop --ar-datepicker-day-radius - Border-radius des cellules jour.
 * @cssprop --ar-datepicker-day-bg - Fond des cellules jour.
```

et (`day-border-color` reste documenté, ne pas y toucher) :

```ts
 * @cssprop --ar-datepicker-day-border-width - Épaisseur de bordure des cellules jour.
```

et (également retiré) :

```ts
 * @cssprop --ar-datepicker-day-color - Couleur du texte des cellules jour (cascade vers --ar-color-text).
```

- [ ] **Step 5: Tests**

Run (depuis `packages/core/`) : `npx vitest run datepicker`
Expected: 81/81 tests passent — vérifier en particulier les tests `datepicker.browser.test.ts` qui contrôlent `day-size` (width/height calculée), non affectés par ce changement.

- [ ] **Step 6: Manifest**

Run (depuis la racine) : `npm run build:manifest --workspace=packages/core`
Expected: aucune erreur.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/styles/themes/default.css packages/core/src/components/datepicker/datepicker.styles.ts packages/core/src/components/datepicker/datepicker.ts
git commit -m "refactor(datepicker): migre le style de base des cellules jour vers ::part() (#129)"
```

---

## Task 6: `panel` — 2 tokens retirés

**Files:** mêmes 3 fichiers.

**Interfaces:** Retire `--ar-datepicker-panel-width/-padding`. Conserve `--ar-datepicker-panel-max-width` (fallback WCAG). Produit `ar-datepicker::part(panel)`.

- [ ] **Step 1: Retirer les 2 tokens de `default.css`**

Remplacer :

```css
--ar-datepicker-panel-width: 20rem;
/* Valeurs propres, volontairement non cascadées depuis --ar-panel-max-width/--ar-panel-padding
           (bloc partagé dropdown/breadcrumb/stepper) : le panel calendrier datepicker a toujours
           nécessité une taille plus généreuse (25rem/1rem) que la valeur par défaut partagée
           (18rem/0.25rem) — même précédent que --ar-dropdown-min-width. */
--ar-datepicker-panel-max-width: 25rem;
--ar-datepicker-panel-padding: 1rem;
```

par :

```css
/* Valeur propre, volontairement non cascadée depuis --ar-panel-max-width (bloc partagé
           dropdown/breadcrumb/stepper) : le panel calendrier datepicker a toujours nécessité une
           taille plus généreuse (25rem) que la valeur par défaut partagée (18rem) — même
           précédent que --ar-dropdown-min-width. */
--ar-datepicker-panel-max-width: 25rem;
```

- [ ] **Step 2: Ajouter la règle `::part(panel)` dans `default.css`**

À la suite des blocs précédents :

```css
ar-datepicker::part(panel) {
    width: 20rem;
    padding: 1rem;
}
```

- [ ] **Step 3: Simplifier `[part='panel']` dans `datepicker.styles.ts`**

Remplacer :

```ts
    [part='panel'] {
        width: var(--ar-datepicker-panel-width);
        /* a11y-fallback: évite que la grille de ~35 jours s'étale sur toute la largeur de la page sans thème chargé */
        max-width: var(--ar-datepicker-panel-max-width, 25rem);
        padding: var(--ar-datepicker-panel-padding);
    }
```

par :

```ts
    [part='panel'] {
        /* a11y-fallback: évite que la grille de ~35 jours s'étale sur toute la largeur de la page sans thème chargé */
        max-width: var(--ar-datepicker-panel-max-width, 25rem);
    }
```

- [ ] **Step 4: Retirer les entrées `@cssprop` correspondantes dans `datepicker.ts`**

Supprimer :

```ts
 * @cssprop --ar-datepicker-panel-width - Largeur du popover.
```

et :

```ts
 * @cssprop --ar-datepicker-panel-padding - Padding interne du popover (valeur propre, non cascadée depuis --ar-panel-padding).
```

- [ ] **Step 5: Tests**

Run (depuis `packages/core/`) : `npx vitest run datepicker`
Expected: 81/81 tests passent — le test `panel max-width` (`datepicker.browser.test.ts:326-327`) reste vert, `panel-max-width` inchangé.

- [ ] **Step 6: Manifest**

Run (depuis la racine) : `npm run build:manifest --workspace=packages/core`
Expected: aucune erreur.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/styles/themes/default.css packages/core/src/components/datepicker/datepicker.styles.ts packages/core/src/components/datepicker/datepicker.ts
git commit -m "refactor(datepicker): migre width/padding du panel vers ::part() (#129)"
```

---

## Task 7: `label-gap` — 1 token retiré (branche 5)

**Files:**

- Modify: `packages/core/src/styles/themes/default.css`
- Modify: `packages/core/src/components/datepicker/datepicker.ts` (JSDoc `@cssprop` uniquement — aucune règle dans `datepicker.styles.ts` ne consomme ce token)

**Interfaces:** Retire `--ar-datepicker-label-gap`, jamais consommé par le composant lui-même — seulement par la règle `ar-datepicker::part(label)` de `default.css`. `--ar-datepicker-gap` (conservé, sur `:host`) reste inchangé.

- [ ] **Step 1: Retirer le token de `default.css`**

Remplacer :

```css
--ar-datepicker-distance: var(--ar-anchor-distance);
--ar-datepicker-offset: var(--ar-anchor-offset);
--ar-datepicker-gap: 0.35rem;
--ar-datepicker-label-gap: 0.5rem;
```

par :

```css
--ar-datepicker-distance: var(--ar-anchor-distance);
--ar-datepicker-offset: var(--ar-anchor-offset);
--ar-datepicker-gap: 0.35rem;
```

- [ ] **Step 2: Mettre à jour la règle `ar-datepicker::part(label)` existante**

Remplacer :

```css
ar-datepicker::part(label) {
    font-size: var(--ar-font-size-sm);
    font-weight: var(--ar-font-weight-medium);
    color: var(--ar-color-text);
    margin-bottom: calc(var(--ar-datepicker-label-gap) - var(--ar-datepicker-gap));
}
```

par :

```css
ar-datepicker::part(label) {
    font-size: var(--ar-font-size-sm);
    font-weight: var(--ar-font-weight-medium);
    color: var(--ar-color-text);
    margin-bottom: calc(0.5rem - var(--ar-datepicker-gap));
}
```

- [ ] **Step 3: Retirer l'entrée `@cssprop` dans `datepicker.ts`**

Supprimer :

```ts
 * @cssprop --ar-datepicker-label-gap - Marge sous le label (combinée à `--ar-datepicker-gap` via `calc()`).
```

- [ ] **Step 4: Tests**

Run (depuis `packages/core/`) : `npx vitest run datepicker`
Expected: 81/81 tests passent.

- [ ] **Step 5: Manifest**

Run (depuis la racine) : `npm run build:manifest --workspace=packages/core`
Expected: aucune erreur.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/styles/themes/default.css packages/core/src/components/datepicker/datepicker.ts
git commit -m "refactor(datepicker): retire le token label-gap, uniquement consomme par le theme (#129)"
```

---

## Task 8: Met à jour le test obsolète sur les tokens de fond

**Files:**

- Modify: `packages/core/src/components/datepicker/datepicker.test.ts:474-493`

**Contexte:** Ce test vérifie aujourd'hui, par lecture directe du fichier source de `default.css`, que `--ar-datepicker-header-bg`, `-day-bg` et `-footer-bg` existent comme tokens `:root`. Ces 3 tokens ont été retirés dans les Tasks 3 et 5 — le test doit vérifier à la place l'existence des règles `::part()` correspondantes avec une déclaration `background`.

**Interfaces:** Aucune — modification de test uniquement.

- [ ] **Step 1: Remplacer le test**

Remplacer (dans `datepicker.test.ts`) :

```ts
describe('fonds par défaut du calendrier (thème)', () => {
    it('default.css définit --ar-datepicker-header-bg, -day-bg et -footer-bg', async () => {
        // Lecture directe du fichier source : le thème n'est pas chargé dans
        // l'environnement de test (happy-dom), voir vitest.config.ts.
        // `new URL(relative, import.meta.url)` est évité car happy-dom remplace le
        // constructeur URL global et résout la base sur `window.location` au lieu
        // de l'argument fourni — on passe donc par node:url/node:path.
        const { readFileSync } = await import('node:fs');
        const { fileURLToPath } = await import('node:url');
        const { dirname, join } = await import('node:path');
        const themePath = join(
            dirname(fileURLToPath(import.meta.url)),
            '../../styles/themes/default.css',
        );
        const themeCss = readFileSync(themePath, 'utf-8');
        expect(themeCss).toMatch(/--ar-datepicker-header-bg:/);
        expect(themeCss).toMatch(/--ar-datepicker-day-bg:/);
        expect(themeCss).toMatch(/--ar-datepicker-footer-bg:/);
    });
});
```

par :

```ts
describe('fonds par défaut du calendrier (thème)', () => {
    it('default.css définit un fond pour ::part(header), ::part(day) et ::part(footer)', async () => {
        // Lecture directe du fichier source : le thème n'est pas chargé dans
        // l'environnement de test (happy-dom), voir vitest.config.ts.
        // `new URL(relative, import.meta.url)` est évité car happy-dom remplace le
        // constructeur URL global et résout la base sur `window.location` au lieu
        // de l'argument fourni — on passe donc par node:url/node:path.
        const { readFileSync } = await import('node:fs');
        const { fileURLToPath } = await import('node:url');
        const { dirname, join } = await import('node:path');
        const themePath = join(
            dirname(fileURLToPath(import.meta.url)),
            '../../styles/themes/default.css',
        );
        const themeCss = readFileSync(themePath, 'utf-8');
        expect(themeCss).toMatch(/ar-datepicker::part\(header\)\s*\{[^}]*background:/);
        expect(themeCss).toMatch(/ar-datepicker::part\(day\)\s*\{[^}]*background-color:/);
        expect(themeCss).toMatch(/ar-datepicker::part\(footer\)\s*\{[^}]*background:/);
    });
});
```

- [ ] **Step 2: Lancer le test**

Run (depuis `packages/core/`) : `npx vitest run datepicker`
Expected: 81/81 tests passent, y compris le test modifié.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/components/datepicker/datepicker.test.ts
git commit -m "test(datepicker): adapte le test de fonds par defaut a la migration ::part() (#129)"
```

---

## Task 9: Amendement ADR-005 — critère token scopé vs `::part()`

**Files:**

- Modify: `docs/decisions/ADR-005-tokens-pilotes-par-attribut.md`

**Interfaces:** Aucune — documentation uniquement.

- [ ] **Step 1: Ajouter une nouvelle section datée à la fin du fichier**

Ajouter, à la fin de `docs/decisions/ADR-005-tokens-pilotes-par-attribut.md` (après la section « Amendement (2026-07-22) : fallback d'accessibilité sur les surfaces flottantes ») :

```markdown
## Amendement (2026-07-24) : critère token scopé vs `::part()`

La généralisation du scoping systématique (issue #129, PR #136) a produit un volume de
tokens à usage unique difficile à justifier — `ar-datepicker` déclarait 58 tokens `:root`
dont 65% consommés à un seul endroit. Une variable n'est vraiment utile que si elle est
réutilisable ; `::part()` offre déjà un point de surcharge gratuit pour toute propriété d'un
élément interne, sans nécessiter de token dédié.

**Critère retenu**, à appliquer dans l'ordre pour toute propriété CSS consommée via un token
scopé :

1. Mécanisme WCAG/fonctionnel critique sans thème (fallback déjà requis par l'amendement du
   2026-07-22) → reste un token, avec son fallback.
2. Lu en JavaScript (`getComputedStyle`, ex. `AnchoredController`) → reste un token `:root`,
   `::part()` n'est pas lisible en JS.
3. Réutilisé ≥ 2 fois dans le `.styles.ts` du composant (vraie valeur DRY) → reste un token.
4. Sinon (usage unique, propriété d'un élément interne portant un `part`, pas de fallback
   critique) → la propriété n'est pas déclarée dans le composant ; `default.css` la stylise
   directement via une règle `::part()`, sans token scopé intermédiaire ni `@cssprop` dédié.

Un token consommé **uniquement** par la propre règle `::part()` de `default.css` (jamais par
le composant) n'est pas une vraie surface d'API — repli direct sur une valeur littérale dans
la règle, pas de token `:root`.

**Deux contraintes techniques** limitent la branche 4 : `::part()` ne peut cibler que des
éléments portant un `part` (jamais `:host`) — une propriété sur `:host` reste nécessairement
un token quel que soit son usage. Une **valeur dark-mode calibrée indépendamment de son alias
clair** (pas une simple variance héritée) prime aussi sur le critère « usage unique » — un tel
token reste en place plutôt que d'être aplati en valeur littérale dans une règle `::part()`,
ce qui perdrait sa calibration sans dupliquer la règle sous un bloc dark.

**Application** : `ar-datepicker` (cas d'étude), 35 tokens sur 58 migrés vers 8 nouvelles
règles `::part()` groupées (`nav-btn`, `footer-btn`, `header`, `footer`, `weekday` — nouveau
part créé pour l'occasion —, `day`, `panel`, `label` amendée). 23 tokens conservés. Détail
complet : `docs/superpowers/specs/2026-07-24-token-vs-part-datepicker-design.md`. Les 5
autres composants scopés par PR #136 n'ont pas été réaudités sous cet angle — périmètre
volontairement limité au cas d'étude, à généraliser dans un chantier séparé si le critère
fait ses preuves.
```

- [ ] **Step 2: Commit**

```bash
git add docs/decisions/ADR-005-tokens-pilotes-par-attribut.md
git commit -m "docs(adr): amendement ADR-005, critere token scope vs ::part() (#129)"
```

---

## Suite

Une fois les 9 tâches mergées, le fichier `default.css` d'`ar-datepicker` passe de 58 à 23
tokens `:root` (-60%), regroupés en 8 nouvelles règles `::part()`. L'issue #129 pourra être
mise à jour avec ce résultat ; la généralisation aux 5 autres composants scopés par PR #136
(ou aux 13 jamais audités) reste hors périmètre, à documenter comme piste future si le critère
se révèle concluant à l'usage.
