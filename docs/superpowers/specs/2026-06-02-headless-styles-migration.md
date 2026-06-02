# Spec — Migration modèle headless (issue #74)

**Date :** 2026-06-02
**Branche :** `refactor/headless-styles`
**PR cible :** `dev`

## Contexte

Le modèle headless d'Ariane interdit les fallbacks cosmétiques dans les `*.styles.ts`. Chaque token CSS utilisé dans un composant doit être défini dans `themes/default.css` — le composant ne fournit aucune valeur de repli. `ar-tab-group` (PR #73) est la référence.

L'objectif est d'aligner tous les composants existants sur ce modèle avant d'en créer de nouveaux.

## Règles de migration

**R1 — Fallback littéral :** `var(--ar-token, #valeur)` → `var(--ar-token)`
Le token doit être présent dans `default.css` avant suppression.

**R2 — Fallback token-sur-token :** `var(--ar-X, var(--ar-Y, ...))` → `var(--ar-X)`
`--ar-X` doit pointer vers `--ar-Y` dans `default.css` (indirection conservée).

**R3 — Fallback structurel :** `calc(-1 * var(--ar-X, 0px))` → inchangé.
Les compensations de layout `0px`/`none` restent.

**R4 — Token inexistant :** `var(--ar-color-danger, #d04442)` dans `dialog.styles.ts`
→ remplacer par `var(--ar-color-danger-50)`. Pas de création d'alias.

## Tokens à ajouter dans `default.css`

### spinner

```css
--ar-spinner-stroke-color: currentColor;
```

### tooltip (section nouvelle)

```css
--ar-tooltip-bg: #1a1a1a;
--ar-tooltip-color: var(--ar-color-white);
--ar-tooltip-border-radius: var(--ar-border-radius-sm);
--ar-tooltip-font-size: 0.8125rem;
--ar-tooltip-padding: 0.375rem 0.625rem;
--ar-tooltip-max-width: 18rem;
--ar-tooltip-arrow-size: 6px;
```

### panel (section nouvelle — partagée dropdown/breadcrumb/stepper)

```css
--ar-panel-bg: var(--ar-color-bg);
--ar-panel-text: var(--ar-color-text);
--ar-panel-border-color: var(--ar-color-border);
--ar-panel-radius: var(--ar-border-radius-md);
--ar-panel-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 10px 15px -3px rgba(0, 0, 0, 0.07);
--ar-panel-padding: 0.25rem;
--ar-panel-max-width: 18rem;
```

### dropdown (section nouvelle)

```css
--ar-dropdown-bg: var(--ar-panel-bg);
--ar-dropdown-color: var(--ar-panel-text);
--ar-dropdown-border-color: var(--ar-panel-border-color);
--ar-dropdown-border-radius: var(--ar-panel-radius);
--ar-dropdown-padding: var(--ar-panel-padding);
--ar-dropdown-min-width: 10rem;
--ar-dropdown-max-width: var(--ar-panel-max-width);
```

## Composants — ordre d'exécution

| #   | Composant                   | Fallbacks | Travail `default.css`                                    |
| --- | --------------------------- | --------- | -------------------------------------------------------- |
| 1   | `progressbar`               | 3         | aucun                                                    |
| 2   | `spinner`                   | 1         | ajouter `--ar-spinner-stroke-color`                      |
| 3   | `tab`                       | 2         | aucun                                                    |
| 4   | `dialog`                    | 3         | aucun + fix `--ar-color-danger` → `--ar-color-danger-50` |
| 5   | `alert`                     | 19        | aucun                                                    |
| 6   | `tooltip`                   | 9         | ajouter section `--ar-tooltip-*`                         |
| 7   | `dropdown` + `panel.styles` | 7 + 6     | ajouter sections `--ar-panel-*` et `--ar-dropdown-*`     |
| 8   | `breadcrumb`                | 11        | aucun                                                    |
| 9   | `pagination`                | 16        | aucun                                                    |
| 10  | `stepper`                   | 22        | aucun                                                    |

## Critères de succès

- Aucun `*.styles.ts` de composant ne contient de fallback avec une valeur littérale (hex, rem, px, rgba, etc.)
- Aucun `*.styles.ts` ne contient de fallback token-sur-token (`var(--x, var(--y))`)
- `default.css` définit tous les tokens utilisés par les composants
- Les tests passent (`npm run test`)
- Le build docs compile sans erreur TypeScript
- Visuellement identique en light et dark mode
