# Spec : Application de l'ADR-004 sur ar-tab-group

**Date :** 2026-05-08  
**Branche :** feat/ar-tab-group  
**ADR de référence :** ADR-004 — Philosophie de style des composants

---

## Périmètre

Trois composants concernés, niveaux de travail très différents :

- **`ar-tab`** — essentiel. Zéro token actuellement, pas d'état actif stylé, pas d'état hover. C'est le cœur du travail.
- **`ar-tab-group`** — mineur. Déjà un token (`--ar-tab-group-gap`), styles structurels corrects. Ajouter uniquement les tokens de séparateur et aligner le JSDoc.
- **`ar-tab-panel`** — rien. Styles purement structurels, conforme à l'ADR tel quel.

---

## Architecture : trois couches (ADR-004)

### Couche 1 — Styles internes fixes (`ar-tab`)

Ces styles restent dans le Shadow DOM sans token associé. Ils garantissent la structure et les signaux a11y obligatoires.

| Propriété                       | Valeur                                  | Raison                                         |
| ------------------------------- | --------------------------------------- | ---------------------------------------------- |
| `:host` `display`               | `inline-flex`                           | Layout structurel                              |
| `:host` `white-space`           | `nowrap`                                | Empêche le retour à la ligne dans la tablist   |
| `:host` `user-select`           | `none`                                  | UX universelle sur les onglets                 |
| `:host` `cursor`                | `pointer`                               | Signal interactif non-négociable               |
| `:host([disabled])` `cursor`    | `not-allowed`                           | Signal disabled non-négociable                 |
| `:host(:focus-visible)` outline | via tokens globaux `--ar-focus-ring-*`  | Signal focus a11y, existence fixe              |
| Présence de l'indicateur actif  | box-shadow via `--ar-tab-active-shadow` | Existence fixe, forme via token                |
| `[part="base"]` `position`      | `relative`                              | Nécessaire pour positionnement de l'indicateur |

Le focus ring s'appuie sur les tokens globaux déjà en place dans `default.css` :

```css
:host(:focus-visible) {
    outline: 2px solid var(--ar-focus-ring-color, currentColor);
    outline-offset: var(--ar-focus-ring-offset, 2px);
}
```

### Couche 2 — Tokens CSS `--ar-tab-*`

#### Convention de nommage

Le thème utilise déjà `padding-x` / `padding-y` sur `button` et `table`. Par cohérence avec l'existant, les tokens de tab suivent la même convention (`-x` / `-y`). Une migration globale vers les propriétés logiques CSS (`inline` / `block`) sera l'objet d'un ADR séparé si décidée.

#### Tokens `ar-tab` — état par défaut

| Token                    | Défaut dans le composant | Description         |
| ------------------------ | ------------------------ | ------------------- |
| `--ar-tab-color`         | `inherit`                | Couleur du texte    |
| `--ar-tab-bg`            | `transparent`            | Fond de l'onglet    |
| `--ar-tab-padding-x`     | `1rem`                   | Padding horizontal  |
| `--ar-tab-padding-y`     | `0.5rem`                 | Padding vertical    |
| `--ar-tab-border-radius` | `0`                      | Rayon (pill, card…) |
| `--ar-tab-font-weight`   | `inherit`                | Graisse du texte    |

#### Tokens `ar-tab` — état hover

| Token                  | Défaut dans le composant | Description                |
| ---------------------- | ------------------------ | -------------------------- |
| `--ar-tab-hover-color` | `inherit`                | Couleur du texte au survol |
| `--ar-tab-hover-bg`    | `transparent`            | Fond au survol             |

#### Tokens `ar-tab` — état actif (`[aria-selected="true"]`)

Deux niveaux de contrôle :

**Niveau 1 — tokens ergonomiques** (utilisés par le thème pour composer le shadow) :

| Token                      | Rôle dans le thème par défaut                                  |
| -------------------------- | -------------------------------------------------------------- |
| `--ar-tab-active-color`    | Couleur du texte de l'onglet actif                             |
| `--ar-tab-active-bg`       | Fond de l'onglet actif (`transparent` dans le thème underline) |
| `--ar-tab-indicator-color` | Couleur de l'indicateur actif                                  |
| `--ar-tab-indicator-width` | Épaisseur de l'indicateur (`2px` par défaut)                   |

**Niveau 2 — token brut** (override complet du signal visuel actif) :

| Token                    | Description                                         |
| ------------------------ | --------------------------------------------------- |
| `--ar-tab-active-shadow` | Valeur complète de `box-shadow` sur `[part="base"]` |

Dans `default.css`, le thème compose `--ar-tab-active-shadow` à partir des tokens ergonomiques :

```css
ar-tab {
    --ar-tab-active-shadow: inset 0 calc(-1 * var(--ar-tab-indicator-width, 2px)) 0
        var(--ar-tab-indicator-color, currentColor);
}
```

Un intégrateur qui veut un indicateur en haut override uniquement `--ar-tab-active-shadow` :

```css
ar-tab {
    --ar-tab-active-shadow: inset 0 3px 0 blue;
}
```

Un intégrateur pill désactive le shadow et active le fond :

```css
ar-tab {
    --ar-tab-active-shadow: none;
    --ar-tab-active-bg: var(--ar-color-interactive-subtle);
    --ar-tab-border-radius: var(--ar-border-radius-full);
}
```

#### Tokens `ar-tab` — état disabled

| Token                       | Défaut dans le composant | Description                                              |
| --------------------------- | ------------------------ | -------------------------------------------------------- |
| `--ar-tab-disabled-opacity` | `0.5`                    | Opacité (signal a11y — existence fixe, valeur via token) |

#### Tokens `ar-tab-group` (complément)

| Token                         | Défaut existant | Description                                           |
| ----------------------------- | --------------- | ----------------------------------------------------- |
| `--ar-tab-group-gap`          | `0`             | Espace entre la tablist et les panels (déjà en place) |
| `--ar-tab-group-border-color` | `transparent`   | Couleur du trait séparateur sous la tablist           |
| `--ar-tab-group-border-width` | `0`             | Épaisseur du séparateur                               |

Le séparateur entre tablist et panels est un pattern fréquent (ligne horizontale). Le token est exposé mais désactivé par défaut (`0`). Le thème l'active s'il le souhaite.

### Couche 3 — `::part()` stratégiques

Les parts existants couvrent le besoin sans ajout. Confirmation :

| Composant      | Part   | Utilité                                                                          |
| -------------- | ------ | -------------------------------------------------------------------------------- |
| `ar-tab-group` | `base` | Conteneur flex global                                                            |
| `ar-tab-group` | `nav`  | Zone scrollable (scroll hints, mask)                                             |
| `ar-tab-group` | `tabs` | Le `[role="tablist"]`                                                            |
| `ar-tab`       | `base` | Wrapper du slot — accès direct au bouton pour fond, bordure, typographie avancée |

Aucun ajout nécessaire sur `ar-tab-panel`.

---

## Fichiers à modifier

| Fichier                                                      | Nature des changements                                                                                           |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `packages/core/src/components/tab/tab.styles.ts`             | Appliquer tous les tokens état par défaut, hover, actif, disabled ; aligner le focus ring sur les tokens globaux |
| `packages/core/src/components/tab-group/tab-group.styles.ts` | Ajouter le séparateur tablist/panels via `--ar-tab-group-border-*`                                               |
| `packages/core/src/components/tab/tab.ts`                    | Ajouter les `@cssprop` JSDoc pour tous les tokens                                                                |
| `packages/core/src/components/tab-group/tab-group.ts`        | Ajouter les `@cssprop` JSDoc pour les deux nouveaux tokens de séparateur                                         |
| `packages/core/src/styles/themes/default.css`                | Ajouter la section `/* tab */` avec les valeurs de thème                                                         |
| `apps/docs/src/content/components/ar-tab-group.mdx`          | Mettre à jour la description des variantes pour refléter les tokens disponibles                                  |

---

## Valeurs dans `default.css`

Section à ajouter en fin de section 6 (tokens composants) :

```css
/* tab */
--ar-tab-color: var(--ar-color-text-muted);
--ar-tab-bg: transparent;
--ar-tab-padding-x: 1rem;
--ar-tab-padding-y: 0.5rem;
--ar-tab-border-radius: 0;
--ar-tab-font-weight: var(--ar-font-weight-normal);

--ar-tab-hover-color: var(--ar-color-text);
--ar-tab-hover-bg: transparent;

--ar-tab-active-color: var(--ar-color-interactive);
--ar-tab-active-bg: transparent;
--ar-tab-indicator-color: var(--ar-color-interactive);
--ar-tab-indicator-width: 2px;
--ar-tab-active-shadow: inset 0 calc(-1 * var(--ar-tab-indicator-width)) 0
    var(--ar-tab-indicator-color);

--ar-tab-disabled-opacity: 0.5;

--ar-tab-group-border-color: var(--ar-color-border);
--ar-tab-group-border-width: 0;
```

Pas de surcharge dark mode nécessaire : les tokens composants référencent des tokens sémantiques (`--ar-color-interactive`, `--ar-color-text-muted`, `--ar-color-border`) qui sont déjà surchargeables en dark mode.

---

## Tests

Les tests existants (unitaires et browser) ne testent pas les styles — c'est correct, les styles Shadow DOM ne sont pas observables depuis les tests. Aucun test à ajouter pour les tokens CSS.

Le focus reste sur les tests comportementaux déjà en place.

---

## Hors périmètre

- Audit des autres composants (dropdown, breadcrumb, stepper) pour conformité ADR-004 — issue séparée.
- Migration globale `padding-x`/`padding-y` → `padding-inline`/`padding-block` — ADR séparé si décidé.
- Styles de démo MDX avancés (animation d'indicateur, transitions hover) — appartient aux docs, pas au composant.
