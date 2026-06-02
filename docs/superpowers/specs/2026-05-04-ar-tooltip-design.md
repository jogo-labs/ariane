---
date: 2026-05-04
status: approved
---

# ar-tooltip — Design spec

## Contexte

`ar-tooltip` est un composant de fondation pour afficher une bulle d'information non-interactive sur hover et focus d'un élément déclencheur externe. Il s'appuie sur le `TooltipController` introduit dans la PR #61 et sur l'utilitaire `Popover` partagé avec `ar-dropdown`.

Référence de conformité : **WCAG 2.1 AA** (couvre les exigences RGAA 4.1 — voir note globale dans la doc du site).

---

## API publique

### Attributs

| Attribut        | Type        | Défaut  | Description                              |
| --------------- | ----------- | ------- | ---------------------------------------- |
| `for`           | `string`    | `''`    | ID du trigger dans le light DOM. Requis. |
| `placement`     | `Placement` | `'top'` | Placement Floating UI (12 valeurs).      |
| `distance`      | `number`    | `6`     | Espacement trigger→bulle en px.          |
| `offset`        | `number`    | `0`     | Décalage latéral en px.                  |
| `show-delay`    | `number`    | `300`   | Délai avant affichage en ms.             |
| `hide-delay`    | `number`    | `150`   | Délai avant masquage en ms.              |
| `without-arrow` | `boolean`   | `false` | Supprime le caret.                       |
| `disabled`      | `boolean`   | `false` | Désactive complètement le tooltip.       |

### Slots

| Slot        | Description                                                                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| _(default)_ | Texte du tooltip. Doit rester non-interactif (convention documentée, non enforcée techniquement — conforme à la spec ARIA `role="tooltip"`). |

### CSS parts

| Part     | Description                               |
| -------- | ----------------------------------------- |
| `bubble` | Le panel flottant (fond, bordure, ombre). |
| `arrow`  | Le caret directionnel.                    |

### CSS custom properties

| Propriété                    | Défaut              | Description       |
| ---------------------------- | ------------------- | ----------------- |
| `--ar-tooltip-bg`            | `#1a1a1a`           | Fond de la bulle. |
| `--ar-tooltip-color`         | `#fff`              | Couleur du texte. |
| `--ar-tooltip-border-radius` | `0.25rem`           | Arrondi.          |
| `--ar-tooltip-padding`       | `0.375rem 0.625rem` | Marge interne.    |
| `--ar-tooltip-font-size`     | `0.8125rem`         | Taille de police. |
| `--ar-tooltip-max-width`     | `18rem`             | Largeur maximale. |
| `--ar-tooltip-arrow-size`    | `6px`               | Taille du caret.  |

### Événements

Aucun événement public — le tooltip est purement informatif.

---

## Usage

```html
<button id="help-btn" aria-label="Aide">?</button>
<ar-tooltip for="help-btn" placement="top"> Explication du champ </ar-tooltip>

<!-- Sans caret -->
<ar-tooltip for="help-btn" without-arrow>Aide</ar-tooltip>

<!-- Délais personnalisés -->
<ar-tooltip for="help-btn" show-delay="500" hide-delay="300">Aide</ar-tooltip>
```

---

## Architecture

### Structure DOM

```html
<!-- Light DOM — trigger inchangé, attribut posé par le composant -->
<button id="help-btn" aria-describedby="ar-tt-xxxxxxxx">?</button>

<!-- Shadow DOM d'ar-tooltip -->
<div part="bubble" popover="manual" id="ar-tt-xxxxxxxx" role="tooltip">
    <slot></slot>
    <div part="arrow"></div>
    <!-- absent si without-arrow -->
</div>
```

- `popover="manual"` : pas de light-dismiss natif, fermeture entièrement contrôlée.
- `role="tooltip"` + `aria-describedby` posés par `TooltipController.attach()`.
- L'`id` du panel est généré (`crypto.randomUUID().slice(0, 8)` via le controller).

### Cycle de vie du trigger

1. `firstUpdated` → `document.getElementById(for)` → `controller.attach(trigger, bubble)` + enregistrement des listeners hover/focus.
2. `updated` sur changement de `for` → détachement des anciens listeners, résolution du nouveau trigger, nouvel attach.
3. `disconnectedCallback` → retrait des listeners + `controller.hostDisconnected()`.
4. `for` ne résout rien → `warn('ar-tooltip', ...)` avec l'id manquant.

### Déclencheurs

**Hover + focus uniquement — non configurable.** C'est une contrainte d'accessibilité : hover seul est inaccessible au clavier (WCAG 2.1.1), click-to-open est un pattern différent (disclosure/toggletip, couvert par `ar-dropdown`).

### Cycle show / hide

```text
mouseenter / focus  →  clearTimeout(hideTimer)
                    →  showTimer après show-delay ms
                    →  controller.show()

mouseleave / blur   →  clearTimeout(showTimer)
                    →  hideTimer après hide-delay ms
                    →  controller.hide()
```

**WCAG 1.4.13 (Content on Hover or Focus) :** le panel lui-même écoute `mouseenter` / `mouseleave`. Entrer dans la bulle annule le `hideTimer` ; la quitter le relance. Le pointeur peut se déplacer librement du trigger vers le tooltip sans fermeture intempestive.

**Escape :** listener `keydown` sur `document` actif uniquement quand le tooltip est visible → `controller.hide()` immédiat, sans délai, sans déplacer le focus.

**`disabled` :** bloque le scheduling du show. Si `disabled` passe à `true` pendant l'affichage → `controller.hide()` immédiat.

### Caret (arrow)

- Floating UI middleware `arrow()` calcule la position du caret selon le placement final (après éventuel `flip()`).
- La position est injectée via `style.left` / `style.top` sur `[part="arrow"]`.
- La rotation est contrôlée par une variable CSS interne `--_arrow-rotation` (0deg / 90deg / 180deg / 270deg selon le côté).
- `without-arrow` → l'élément `[part="arrow"]` est **absent du DOM** (pas `display:none`) pour ne pas perturber le calcul de position Floating UI.

---

## Accessibilité

| Critère                                 | Implémentation                                            |
| --------------------------------------- | --------------------------------------------------------- |
| WCAG 1.3.1 — Info and Relationships     | `role="tooltip"` + `aria-describedby` sur le trigger      |
| WCAG 2.1.1 — Keyboard                   | Tooltip accessible au focus clavier                       |
| WCAG 1.4.13 — Content on Hover or Focus | Délai hide-delay + hover sur la bulle annule la fermeture |
| WCAG 4.1.3 — Status Messages            | Pas de message de statut, non applicable                  |

Le lecteur d'écran lit le contenu du tooltip via `aria-describedby` au focus du trigger, que la bulle soit visible ou non — c'est le comportement ARIA correct pour `role="tooltip"`. Aucun focus ne doit entrer dans la bulle.

---

## Tests

### `tooltip.test.ts` (Vitest)

- Render : panel présent dans le shadow DOM avec `role="tooltip"` et `popover="manual"`.
- `for` valide → `aria-describedby` posé sur le trigger, warn absent.
- `for` invalide → `warn('ar-tooltip', ...)` appelé.
- `disabled` → aucun show déclenché sur mouseenter/focus.
- `without-arrow` → `[part="arrow"]` absent du DOM.
- Changement de `for` → anciens listeners détachés, nouveaux posés.
- `placement`, `distance`, `offset` → propagés au controller.

### `tooltip.browser.test.ts` (WTR)

- Mouseenter → après `show-delay` ms, tooltip visible.
- Mouseleave → après `hide-delay` ms, tooltip masqué.
- Mouseenter sur la bulle pendant le hide-delay → tooltip reste visible (WCAG 1.4.13).
- Focus trigger → tooltip visible. Blur → tooltip masqué.
- Escape pendant affichage → tooltip masqué, focus inchangé.
- Changement de `placement` → bulle repositionnée côté attendu.
- `without-arrow` false → `[part="arrow"]` présent. `true` → absent.

### `tooltip.a11y.test.ts` (axe-core)

- axe-core sur tooltip visible et sur tooltip masqué.
- `aria-describedby` sur le trigger pointe vers l'`id` du panel.

---

## Ce qui n'est pas dans ce composant

- **Contenu HTML riche ou interactif** → utiliser `ar-dropdown` (disclosure/popover).
- **Toggletip (click)** → pattern différent, rôle ARIA différent, hors scope.
- **Attribut `trigger` configurable** → non-configurable par design (contrainte accessibilité).
- **Attribut `content`** → YAGNI, le slot par défaut suffit.
