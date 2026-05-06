---
name: ariane-write-docs
description: Architecture du site de documentation Ariane utilisation Astro 6 et conventions MDX — fichiers clés apps/docs/, frontmatter schema, mapping types CEM vers contrôles playground. À utiliser quand on écrit ou modifie une page de documentation composant.
---

# Documentation Ariane (`apps/docs/`)

## Fichiers clés

| Fichier                                | Rôle                                                                               |
| -------------------------------------- | ---------------------------------------------------------------------------------- |
| `src/pages/components/[slug].astro`    | Route dynamique — résout HTML playground, appelle `buildControls()`, construit TOC |
| `src/components/Playground.astro`      | Variantes + playground + ComponentApi ; charge `public/js/playground.js`           |
| `src/components/ComponentApi.astro`    | Tables API depuis le CEM ; swatches couleur sur les CSS custom property defaults   |
| `src/components/TableOfContents.astro` | TOC sticky colonne droite ; reçoit `entries[]` via props                           |
| `src/components/SiteNav.astro`         | Nav gauche ; auto-généré depuis le CEM avec hiérarchie parent/enfant               |
| `src/layouts/Layout.astro`             | Grille 3 colonnes (`260px 1fr 220px`) quand `showToc={true}`                       |
| `src/content/config.ts`                | Schéma Zod du frontmatter MDX                                                      |
| `public/js/playground.js`              | Boutons copier + manipulation live des attributs via `setAttribute`                |
| `src/utils/cem-types.ts`               | Types CEM + helpers `getCustomElements`, `buildControls`                           |
| `src/utils/parse-tokens.ts`            | Parse `default.css`, catégorise les CSS custom properties                          |
| `src/utils/tag-name.ts`                | `getSlug()`, `getPrefix()`, `groupByPrefix()`                                      |

## MDX frontmatter schema

```yaml
tagName: ar-alert # requis
title: Alerte # requis
description: … # optionnel
playgroundTemplate: default # optionnel — variante initiale du playground (défaut : première)
variants:
    - name: default
      label: Par défaut
      description: …
      html: '<ar-alert variant="info">Message.</ar-alert>'
```

## Sous-composants

`@parent ar-<tag>` en JSDoc uniquement — pas de champ MDX. Le CEM `x-parent` est lu directement par la nav et la home page.

## Mapping CEM type → contrôle playground

Défini dans `src/utils/cem-types.ts` → `buildControls()` :

| Type CEM                         | Contrôle                                               |
| -------------------------------- | ------------------------------------------------------ |
| `'a' \| 'b' \| …`                | `<select>`                                             |
| `'a' \| 'b' \| undefined`        | `<select>` + option "Par défaut" (value="") en premier |
| `boolean`                        | `<input type="checkbox">`                              |
| `number` / `number \| undefined` | `<input type="number">`                                |
| autre                            | `<input type="text">`                                  |

## Références WCAG

La section "Pris en charge automatiquement" de chaque composant doit référencer les critères WCAG implémentés via le composant `WcagRef`.

### Import

Ajouter après le frontmatter de chaque fichier MDX qui utilise des références WCAG :

```mdx
import WcagRef from '../../components/WcagRef.astro';
```

### Usage inline

Placer `<WcagRef>` directement dans la bullet qui décrit le comportement couvert. Une référence par comportement distinct.

```mdx
- `role="alert"` conforme
    <WcagRef
        criterion="4.1.3"
        summary="Status Messages : les messages de statut doivent être annoncés aux technologies d'assistance sans déplacer le focus."
    />
```

### Props

| Prop        | Type     | Exemple                   |
| ----------- | -------- | ------------------------- |
| `criterion` | `string` | `"4.1.2"`                 |
| `summary`   | `string` | `"Name, Role, Value : …"` |

Le composant (`apps/docs/src/components/WcagRef.astro`) génère l'ID automatiquement et construit l'URL vers la page "Understanding" WCAG 2.2. `ar-tooltip` est disponible globalement via le layout — aucun import supplémentaire n'est nécessaire.

### Critères déjà mappés

Voir la table `slugs` dans `WcagRef.astro` pour la liste des critères supportés : 1.3.1, 1.4.13, 2.1.1, 2.1.2, 2.4.8, 3.2.2, 4.1.2, 4.1.3.
