---
date: 2026-05-07
status: approved
---

# ar-tab-group — Design spec

## Contexte

`ar-tab-group` implémente le pattern **WAI-ARIA Tabs** complet : un groupe d'onglets accessibles avec roving tabindex, association automatique tab ↔ panel par nom, et gestion de l'overflow horizontal.

Trois éléments coopèrent via `@lit/context` :

- `ar-tab-group` — conteneur, fournit le registry, orchestre l'ARIA et le clavier
- `ar-tab` — onglet déclencheur, s'enregistre dans le registry
- `ar-tab-panel` — panneau de contenu, s'enregistre dans le registry

Référence de conformité : **WCAG 2.2 AA**.

---

## API publique

### `ar-tab-group`

#### Attributs

| Attribut            | Type      | Défaut  | Description                                                                       |
| ------------------- | --------- | ------- | --------------------------------------------------------------------------------- |
| `active`            | `string`  | `''`    | Nom de l'onglet actif. Si absent, le premier onglet non-disabled s'active.        |
| `label`             | `string`  | `''`    | `aria-label` sur le tablist — recommandé si plusieurs `ar-tab-group` sur la page. |
| `manual-activation` | `boolean` | `false` | Les flèches déplacent le focus sans activer l'onglet — Enter/Space requis.        |
| `scroll-hints`      | `boolean` | `false` | Active les classes `has-overflow-start` / `has-overflow-end` sur `part="nav"`.    |

#### Événements

| Événement             | Détail               | Annulable |
| --------------------- | -------------------- | --------- |
| `ar-tab-group-change` | `{ active: string }` | non       |

#### CSS Parts

| Part   | Élément                                              |
| ------ | ---------------------------------------------------- |
| `base` | Conteneur racine                                     |
| `nav`  | Zone scrollable (overflow-x: auto, scroll-hints ici) |
| `tabs` | `div[role="tablist"]`                                |

#### CSS custom properties

| Propriété            | Défaut | Description                        |
| -------------------- | ------ | ---------------------------------- |
| `--ar-tab-group-gap` | `0`    | Espacement entre tablist et panels |

---

### `ar-tab`

#### Attributs

| Attribut   | Type      | Défaut  | Description                                   |
| ---------- | --------- | ------- | --------------------------------------------- |
| `panel`    | `string`  | requis  | Nom du `ar-tab-panel` associé.                |
| `disabled` | `boolean` | `false` | Onglet non sélectionnable, ignoré au clavier. |

#### CSS Parts

| Part   | Élément         |
| ------ | --------------- |
| `base` | Wrapper du slot |

---

### `ar-tab-panel`

#### Attributs

| Attribut | Type     | Défaut | Description                               |
| -------- | -------- | ------ | ----------------------------------------- |
| `name`   | `string` | requis | Nom correspondant à `panel` sur `ar-tab`. |

#### CSS Parts

| Part   | Élément         |
| ------ | --------------- |
| `base` | Wrapper du slot |

---

## Usage

```html
<ar-tab-group active="usage" label="Documentation">
    <ar-tab panel="intro">Introduction</ar-tab>
    <ar-tab panel="usage">Utilisation</ar-tab>
    <ar-tab panel="api" disabled>API</ar-tab>

    <ar-tab-panel name="intro">Contenu introduction…</ar-tab-panel>
    <ar-tab-panel name="usage">Contenu utilisation…</ar-tab-panel>
    <ar-tab-panel name="api">Contenu API…</ar-tab-panel>
</ar-tab-group>

<!-- Activation manuelle -->
<ar-tab-group manual-activation>…</ar-tab-group>

<!-- Scroll hints -->
<ar-tab-group scroll-hints>…</ar-tab-group>
```

---

## Architecture

### Structure DOM

```html
<!-- Light DOM (utilisateur) -->
<ar-tab-group active="usage" label="Documentation">
    <!-- slot="tab" posé automatiquement par le registry sur chaque ar-tab -->
    <ar-tab
        slot="tab"
        panel="intro"
        role="tab"
        id="pfx-tab-intro"
        aria-controls="pfx-panel-intro"
        aria-selected="false"
        tabindex="-1"
    >
        Introduction
    </ar-tab>
    <ar-tab
        slot="tab"
        panel="usage"
        role="tab"
        id="pfx-tab-usage"
        aria-controls="pfx-panel-usage"
        aria-selected="true"
        tabindex="0"
    >
        Utilisation
    </ar-tab>

    <ar-tab-panel
        name="intro"
        role="tabpanel"
        id="pfx-panel-intro"
        aria-labelledby="pfx-tab-intro"
        tabindex="0"
        hidden
        >…</ar-tab-panel
    >
    <ar-tab-panel
        name="usage"
        role="tabpanel"
        id="pfx-panel-usage"
        aria-labelledby="pfx-tab-usage"
        tabindex="0"
        >…</ar-tab-panel
    >
</ar-tab-group>

<!-- Shadow DOM de ar-tab-group -->
<div part="base">
    <div part="nav">
        <div part="tabs" role="tablist" aria-label="Documentation">
            <slot name="tab"></slot>
        </div>
    </div>
    <slot></slot>
</div>

<!-- Shadow DOM de ar-tab -->
<slot></slot>

<!-- Shadow DOM de ar-tab-panel -->
<slot></slot>
```

### IDs générés

`ar-tab-group` génère un préfixe aléatoire par instance (`pfx`). Les IDs suivent le schéma :

| Élément                     | ID posé sur le host |
| --------------------------- | ------------------- |
| `<ar-tab panel="foo">`      | `${pfx}-tab-foo`    |
| `<ar-tab-panel name="foo">` | `${pfx}-panel-foo`  |

`aria-controls` sur `ar-tab` et `aria-labelledby` sur `ar-tab-panel` référencent tous les deux des éléments en light DOM → IDREF dans le même arbre, pas de problème cross-shadow.

### Context registry

```typescript
// tabs.context.ts
interface TabGroupRegistry {
    registerTab(tab: ArTab): void;
    unregisterTab(tab: ArTab): void;
    registerPanel(panel: ArTabPanel): void;
    unregisterPanel(panel: ArTabPanel): void;
    activate(name: string): void;
    readonly active: string;
}
```

À `registerTab()`, le registry pose `slot="tab"` sur le host `ar-tab` — l'utilisateur n'a pas à l'écrire.

### Attributs ARIA posés par le registry

**Sur chaque `ar-tab` (host light DOM) :**

```
role="tab"
slot="tab"
id="${pfx}-tab-${panel}"
aria-controls="${pfx}-panel-${panel}"
aria-selected="true|false"
aria-disabled="true"        ← uniquement si disabled
tabindex="0|-1"             ← roving tabindex
```

**Sur chaque `ar-tab-panel` (host light DOM) :**

```
role="tabpanel"
id="${pfx}-panel-${name}"
aria-labelledby="${pfx}-tab-${name}"
tabindex="0"
hidden                      ← attribut natif quand inactif
```

**Sur `div[role="tablist"]` (shadow de ar-tab-group) :**

```
aria-label="${label}"       ← si label défini
```

### Navigation clavier

| Touche        | Effet                                                                |
| ------------- | -------------------------------------------------------------------- |
| `←` / `→`     | Déplace le focus (+ active immédiatement si pas `manual-activation`) |
| `Home`        | Focus sur le premier onglet non-disabled                             |
| `End`         | Focus sur le dernier onglet non-disabled                             |
| `Enter/Space` | Active l'onglet focusé (mode `manual-activation` uniquement)         |
| `Tab`         | Quitte le tablist → focus sur le panel actif (`tabindex="0"`)        |

Le roving tabindex est géré directement dans `ar-tab-group` (inline, liste plate — pas de controller dédié).

Les onglets `disabled` sont skippés à la navigation clavier.

### Scroll & overflow

**Par défaut :** `part="nav"` a `overflow-x: auto`. `scrollIntoView({ block: 'nearest', inline: 'nearest' })` est appelé sur l'onglet actif à chaque changement → tous les onglets restent atteignables au clavier.

**`scroll-hints` :** quand l'attribut est présent, un `ResizeObserver` + un listener `scroll` observent `part="nav"` et posent dynamiquement :

| Classe               | Condition                                                          |
| -------------------- | ------------------------------------------------------------------ |
| `has-overflow-start` | Du contenu caché à gauche (scrollLeft > 0)                         |
| `has-overflow-end`   | Du contenu caché à droite (scrollLeft + clientWidth < scrollWidth) |

Le design system branche son CSS sur ces classes (typiquement `mask-image`). `part="nav"` est aussi exposé pour styler la scrollbar via `::part(nav)::-webkit-scrollbar`.

---

## Accessibilité

| Critère WCAG 2.2                   | Implémentation                                                        |
| ---------------------------------- | --------------------------------------------------------------------- |
| 1.3.1 — Info and Relationships (A) | `role="tablist/tab/tabpanel"` + `aria-controls` + `aria-labelledby`   |
| 2.1.1 — Keyboard (A)               | Roving tabindex, flèches ←/→, Home/End, Tab vers panel                |
| 2.4.3 — Focus Order (A)            | Tab → panel actif (tabindex="0"), panels inactifs exclus (hidden)     |
| 4.1.2 — Name, Role, Value (A)      | `aria-selected`, `aria-disabled`, `aria-label` sur le tablist         |
| 1.4.10 — Reflow (AA)               | Scroll horizontal + scrollIntoView — exception "2D layout" documentée |
| 2.5.3 — Label in Name (AA)         | Texte visible de l'onglet = son nom accessible (slot direct)          |

La doc inclut un bloc **Accessibilité** dédié sur la gestion du scroll overflow (recommandations WCAG 1.4.10, démo `scroll-hints` + scrollbar custom via `::part(nav)`).

---

## Tests

### `tab-group.test.ts` (Vitest)

- Render : shadow DOM correct (`part="base/nav/tabs"`, `role="tablist"`).
- Premier onglet non-disabled actif si `active` absent.
- `active="foo"` → `ar-tab[panel="foo"]` a `aria-selected="true"`, `tabindex="0"`.
- `ar-tab-panel[name="foo"]` visible, les autres ont `hidden`.
- `aria-controls` sur chaque tab pointe vers l'ID du panel correspondant.
- `aria-labelledby` sur chaque panel pointe vers l'ID du tab correspondant.
- `disabled` sur un tab → `aria-disabled="true"`, skipé au clavier.
- `ar-tab-group-change` émis avec `{ active: string }` au changement d'onglet.
- `manual-activation` → le changement n'a pas lieu sur flèche, seulement sur Enter/Space.
- Warn si `panel` d'un `ar-tab` ne correspond à aucun `ar-tab-panel`.
- `slot="tab"` posé automatiquement sur chaque `ar-tab` à l'enregistrement.

### `tab-group.browser.test.ts` (WTR)

- Clic sur un onglet → panel correspondant visible, onglet précédent masqué.
- `←` / `→` → focus se déplace entre onglets, activation immédiate (mode auto).
- `←` / `→` en `manual-activation` → focus déplacé, panel inchangé jusqu'à Enter.
- `Home` / `End` → focus sur premier / dernier onglet non-disabled.
- `Tab` depuis un onglet actif → focus sur le panel actif.
- `scroll-hints` → classes `has-overflow-start` / `has-overflow-end` présentes/absentes selon scroll.
- `scrollIntoView` appelé sur l'onglet actif après activation clavier.
- Ajout dynamique d'un `ar-tab` + `ar-tab-panel` → intégré dans le registry, navigable.

### `tab-group.a11y.test.ts` (axe-core)

- axe-core sur le tab-group avec onglet actif.
- axe-core sur le tab-group avec `disabled` et `manual-activation`.
- Vérification `aria-controls` / `aria-labelledby` croisés tab ↔ panel.

---

## Ce qui n'est pas dans ce composant

- **Orientation verticale** — ↑/↓ + `aria-orientation="vertical"` — backlog, hors scope v1.
- **Collapse vers `<select>` sur mobile** — décision design system, pas fondation.
- **Fermeture/suppression d'onglets** — pattern différent (closable tabs), hors scope.
- **Onglets comme liens (`<a href>`)** — pattern navigation, différent du pattern tabs WAI-ARIA.
- **Lazy loading des panels** — responsabilité du design system / de l'application.
