# Design : Références WCAG inline dans la doc des composants

**Date :** 2026-05-05  
**Statut :** approuvé

---

## Objectif

Référencer les critères WCAG pertinents directement dans la section Accessibilité de chaque page de composant, sous forme de liens interactifs avec tooltip explicatif — sans alourdir la structure existante.

---

## Composant `WcagRef.astro`

### Localisation

`apps/docs/src/components/WcagRef.astro`

### Props

| Prop        | Type     | Description                                     |
| ----------- | -------- | ----------------------------------------------- |
| `criterion` | `string` | Numéro du critère WCAG, ex. `"4.1.2"`           |
| `summary`   | `string` | Texte court résumant le critère pour le tooltip |

### Comportement

- **ID de l'`ar-tooltip`** : dérivé du critère → `wcag-${criterion.replace(/\./g, '-')}` (ex. `wcag-4-1-2`). Unicité garantie par critère ; pas de collision entre pages.
- **Lien** : cible la page "Understanding" du W3C WAI (WCAG 2.2). Ouverture `target="_blank" rel="noopener"`.
- **Texte du lien** : `WCAG ${criterion}`.
- **Style** : underline pointillé + `cursor: help`, cohérent avec le pattern `<abbr>` déjà utilisé sur la page de démo du tooltip.

### Rendu HTML

```html
<a
    href="https://www.w3.org/WAI/WCAG22/Understanding/name-role-value/"
    id="wcag-4-1-2"
    target="_blank"
    rel="noopener"
    style="cursor:help; text-decoration:underline dotted;"
>
    WCAG 4.1.2
</a>
<ar-tooltip for="wcag-4-1-2">
    Name, Role, Value : tout composant UI doit exposer son nom, rôle et valeur aux technologies
    d'assistance.
</ar-tooltip>
```

---

## Intégration dans les MDX

Import explicite en tête de chaque fichier `.mdx` qui en a besoin :

```mdx
import WcagRef from '../../components/WcagRef.astro';
```

Usage inline dans les bullets existantes, au bout de la phrase qui décrit le comportement concerné. Pas de nouvelle sous-section ni de tableau.

**Règle :** une référence par comportement distinct. Si une bullet décrit plusieurs choses, on ne cite que le critère qui s'y applique directement.

---

## Mapping critères ↔ composants

| Composant        | Critère | Page Understanding          | Justification                                  |
| ---------------- | ------- | --------------------------- | ---------------------------------------------- |
| `ar-alert`       | 4.1.3   | `status-messages`           | `role="alert"` / `role="status"`               |
| `ar-breadcrumb`  | 1.3.1   | `info-and-relationships`    | `role="navigation"` + `aria-labelledby`        |
| `ar-breadcrumb`  | 2.4.8   | `location`                  | `aria-current="page"` sur l'item courant       |
| `ar-dialog`      | 2.1.2   | `no-keyboard-trap`          | Focus trap à l'ouverture                       |
| `ar-dialog`      | 3.2.2   | `on-input`                  | Fermeture prévisible via Escape                |
| `ar-dropdown`    | 4.1.2   | `name-role-value`           | `aria-haspopup` + `aria-expanded`              |
| `ar-dropdown`    | 2.1.1   | `keyboard`                  | Navigation `↑↓ Home End Escape Tab`            |
| `ar-pagination`  | 4.1.2   | `name-role-value`           | `aria-disabled` synchronisé                    |
| `ar-progressbar` | 4.1.2   | `name-role-value`           | `role="progressbar"` + `aria-valuenow/min/max` |
| `ar-spinner`     | 4.1.3   | `status-messages`           | `role="alert"` sur l'annonce d'état            |
| `ar-stepper`     | 1.3.1   | `info-and-relationships`    | `role="navigation"` + structure sémantique     |
| `ar-tooltip`     | 1.4.13  | `content-on-hover-or-focus` | _(déjà présent, à migrer vers WcagRef)_        |

---

## URLs WCAG

Format : `https://www.w3.org/WAI/WCAG22/Understanding/<slug>/`

Tous les critères du mapping utilisent WCAG 2.2 (superset de 2.1 — pas de fallback nécessaire).

---

## Ce qui n'est pas dans ce scope

- Modifier la structure des sections Accessibilité existantes.
- Ajouter des critères AAA.
- Couvrir exhaustivement tous les critères applicables — l'objectif est d'éclairer les comportements clés, pas de produire un audit WCAG.
- Modifier `packages/core` (les tokens `--doc-*` restent dans `apps/docs/`).
