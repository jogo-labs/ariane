# Spec — Redesign du site de documentation Ariane

**Date :** 2026-03-28
**Scope :** Amélioration visuelle et ergonomique du site existant — même structure, meilleur look. Pas de refonte de l'architecture de navigation.

---

## 1. Typographie & Palette

### Police

- **Inter** (Google Fonts) — 400 / 500 / 600 / 700
- Chargement via `<link>` Google Fonts dans le `<head>` (haute probabilité de cache navigateur)
- Fallback : `system-ui, sans-serif`
- Code : `'Fira Code', 'Cascadia Code', monospace` (inchangé)

### Mode light

| Token                 | Valeur    | Usage                                         |
| --------------------- | --------- | --------------------------------------------- |
| `--doc-bg`            | `#fafaf8` | Fond général (crème chaud)                    |
| `--doc-nav-bg`        | `#fafaf8` | Identique au fond — nav non différenciée      |
| `--doc-text`          | `#1a1a1a` | Texte principal                               |
| `--doc-text-muted`    | `#6b7280` | Texte secondaire (≥ 4.6:1 sur #fafaf8 ✓ AA)   |
| `--doc-text-subtle`   | `#4b5563` | Nav items, TOC items (≥ 7:1 ✓ AAA)            |
| `--doc-border`        | `#e8e6e0` | Bordures génériques                           |
| `--doc-nav-border`    | `#e8e6e0` | Bordure droite de la nav                      |
| `--doc-accent`        | `#7c3aed` | Violet — actif, CTA, accent                   |
| `--doc-accent-bg`     | `#f3efff` | Fond violet pâle (nav active, badges)         |
| `--doc-accent-border` | `#e0d0ff` | Bordure violet pâle                           |
| `--doc-code-bg`       | `#161b22` | Fond blocs de code (dark dans les deux modes) |

### Mode dark

| Token                 | Valeur    |
| --------------------- | --------- |
| `--doc-bg`            | `#161b22` |
| `--doc-nav-bg`        | `#161b22` |
| `--doc-text`          | `#e6edf3` |
| `--doc-text-muted`    | `#8b949e` |
| `--doc-text-subtle`   | `#8b949e` |
| `--doc-border`        | `#21262d` |
| `--doc-nav-border`    | `#21262d` |
| `--doc-accent`        | `#7c3aed` |
| `--doc-accent-bg`     | `#21262d` |
| `--doc-accent-border` | `#30215a` |

---

## 2. Layout

### Colonnes (pages avec nav + TOC)

```
Nav (270px) | Contenu (fluid, max-width: 1180px) | TOC (180px)
```

- **Nav** : 270px fixe, sticky, scroll indépendant, bordure droite `--doc-nav-border`
- **Contenu** : fluid entre la nav et la TOC, plafonné à `1180px`
- **TOC** : 180px fixe, sticky, **sans bordure gauche** — flotte visuellement dans la page

### Header

- Hauteur : `3.25rem` (inchangé)
- Fond : `rgba(250,250,248,0.92)` avec `backdrop-filter: blur(8px)` — effet givré au scroll
- **Gauche** : logo `Ariane` + point violet `●` + badge version pill
- **Droite** : icône GitHub (SVG standard, bouton 32×32px) + toggle thème groupé (☀ / ⬤ / ☾)

---

## 3. Navigation gauche

### Labels de section

- Taille : `0.65rem`, 600, uppercase, `letter-spacing: 0.08em`
- Couleur : `#6b7280` — ratio 4.6:1 sur fond crème ✓ WCAG AA
- _(était `#b8b0c8` → 2.3:1 ✗)_

### Items nav

- Couleur par défaut : `#4b5563` — ratio 7:1 ✓ WCAG AAA
- Hover : fond `#f0ede6`, texte `#111`
- Actif : fond `#f3efff`, texte `#7c3aed`, font-weight 600
- Sous-items (ex. Breadcrumb Item) : même couleur `#4b5563`, indent `padding-left: 1rem`, taille `0.78rem`

---

## 4. Table des matières (TOC)

- **Pas de bordure gauche** sur le conteneur — la TOC flotte dans la colonne droite
- Titre "Sur cette page" : `0.65rem`, 600, uppercase, `#6b7280`
- Items inactifs : `#4b5563` (ratio 7:1 ✓)
- Item actif : `color: #7c3aed` + `border-left: 2px solid #7c3aed` — **pas de fond, pas de border-radius**
- Sous-items : `padding-left: 1rem`, `0.73rem`

---

## 5. Page composant

### Exemples (variantes)

Chaque variante est un bloc empilé verticalement :

```
[Titre de la variante]       ← 0.9rem, 600, #374151
[Description optionnelle]    ← 0.82rem, #6b7280
┌─────────────────────────────────────┐
│  Preview (fond blanc, centré)       │
├─────────────────────────────────────┤
│  Bloc de code (fond #161b22)        │
└─────────────────────────────────────┘
```

- Pas de tabs — les variantes se lisent en défilant
- Chaque bloc : `border: 1px solid #e8e6e0`, `border-radius: 10px`, overflow hidden

### Playground interactif

Section distincte des exemples, identifiée par un label "Playground" (violet, uppercase, point ●) :

```
● PLAYGROUND
┌─────────────────────────────────────┐  ← border violette + box-shadow violet pâle
│  Preview                            │
├─────────────────────────────────────┤
│  Bloc de code                       │
├─────────────────────────────────────┤
│  Contrôles (select, checkbox…)      │  ← fond #fafaf8
└─────────────────────────────────────┘
```

- Bordure : `1px solid #d4bbff`
- Box-shadow : `0 0 0 3px rgba(124,58,237,0.06)`
- Contrôles : labels `#6b7280`, selects avec bordure `#e0d0ff`

---

## 6. Landing page

### Structure

```
Header
└── Hero (centré, max-width 760px)
    ├── Eyebrow pill : "Web Components accessibles"
    ├── Titre h1 (grand, gradient violet sur le mot clé)
    ├── Pitch (2-3 lignes, #4b5563)
    ├── Badges : version · nb composants · licence · stack
    └── CTAs : [Démarrage rapide →]  [Voir les composants]

── Séparateur ──

Selling points (max-width 1100px, centré)
├── Titre de section
├── Grille 3 colonnes :
│   ├── ♿ Accessible par défaut
│   │   ARIA, navigation clavier et rôles sémantiques intégrés.
│   ├── ⚡ Indépendant du framework
│   │   React, Vue, Svelte, Angular ou HTML pur — un seul package.
│   └── 🏗 Fondation pour votre Design System
│       Tokens CSS exposés, aucune opinion visuelle. À toi de définir l'identité.
└── [Section différentiation vs Webawesome/Radix — PLACEHOLDER]

CTA bas de page (fond #f3efff)
└── "Prêt à commencer ?" + [Démarrage rapide →] + [Explorer les composants]

Footer
```

### Catchphrase (provisoire)

> _"Des composants qui fonctionnent vraiment"_

À affiner avec les selling points définitifs.

### Idée future — strip de composants live

Après les CTAs du hero : une rangée de mini-aperçus interactifs des composants réels (spinner animé, boutons, stepper, etc.). **À implémenter post-v1** une fois que le catalogue de composants est plus étoffé. Sert de preuve visuelle immédiate de ce qu'Ariane produit.

---

## 7. Accessibilité

Tous les textes muted corrigés pour passer WCAG AA minimum :

| Élément                     | Avant     | Après     | Ratio       |
| --------------------------- | --------- | --------- | ----------- |
| Labels section nav          | `#b8b0c8` | `#6b7280` | 4.6:1 ✓ AA  |
| Items nav / TOC             | `#9ca3af` | `#4b5563` | 7.0:1 ✓ AAA |
| Labels contrôles playground | `#9ca3af` | `#6b7280` | 4.6:1 ✓ AA  |

Attributs ARIA à conserver/ajouter :

- `aria-current="page"` sur le lien nav actif
- `aria-label` sur les boutons icônes (GitHub, theme toggle)
- `role="group"` + `aria-label` sur le toggle thème

---

## 8. Mode mobile

L'existant est fonctionnel et conservé — on le restylle uniquement pour respecter la nouvelle palette.

| Élément | Comportement existant                   | Action                           |
| ------- | --------------------------------------- | -------------------------------- |
| Nav     | Drawer overlay (burger menu)            | Recolor avec les nouveaux tokens |
| TOC     | `<details>` collapsible sous le contenu | Recolor, vérifier contraste      |
| Header  | Burger visible < 768px                  | Recolor                          |

Pas de refonte du mécanisme — uniquement la couche CSS.

---

## 9. Dark mode — landing page

La landing utilise les tokens `--doc-*` du site — le switch thème la couvre automatiquement. Points à vérifier explicitement en dark :

| Élément               | Light                          | Dark                                   |
| --------------------- | ------------------------------ | -------------------------------------- |
| Fond hero             | `#fafaf8`                      | `#161b22`                              |
| Gradient titre (`em`) | `#7c3aed → #a855f7`            | Identique (ressort bien sur fond dark) |
| Badges                | fond `#fff`, bordure `#e8e6e0` | fond `#21262d`, bordure `#30215a`      |
| Cards selling points  | fond `#fff`, bordure `#e8e6e0` | fond `#1c2128`, bordure `#21262d`      |
| Fond CTA bottom       | `#f3efff`                      | `#1a1030` (violet très sombre)         |
| Bordure CTA bottom    | `#e0d0ff`                      | `#30215a`                              |

---

## 10. Hors scope

- Refonte de l'architecture de navigation (ordre des sections, nommage)
- Animations de transition entre pages
- Recherche dans la doc
- Strip de composants live sur la landing (→ post-v1)
- Contenu des selling points définitifs et section différentiation (→ contenu à définir)
