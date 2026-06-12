# ar-collapse — Design Spec

**Date** : 2026-06-11  
**Statut** : approuvé  
**Composant** : `ar-collapse`  
**Issue backlog** : #13 (roadmap v1 — remplace l'entrée `ar-collapse-trigger` + `ar-collapse-panel`)

---

## Résumé

Composant de panneau pliable/dépliable accessible. Supporte un trigger interne (slot) ou externe (attribut `for`), un mode accordéon via l'attribut `name`, et une animation de hauteur pilotée par JS avec transition CSS à la charge de l'auteur (modèle headless).

---

## Architecture

### Composant unique : `ar-collapse`

L'entrée backlog `ar-collapse-trigger` + `ar-collapse-panel` est remplacée par un seul composant `ar-collapse`, suivant le même pattern que `ar-dropdown`.

### Dual trigger

Deux modes de déclenchement, mutuellement exclusifs (`for` a la priorité) :

- **Trigger externe** — `for="btn-id"` : le composant pointe vers un bouton natif (`<button>`) dans la page. Le composant pose `aria-expanded` et `aria-controls` sur ce bouton.
- **Trigger interne** — `slot="trigger"` : un élément est sloté directement dans le composant. Le composant pose `aria-expanded` et `aria-controls` sur l'élément sloté.

Si les deux sont présents simultanément, `for` prend la priorité et un warning est émis.

### Mode accordéon

L'attribut `name` groupe plusieurs `ar-collapse` en accordéon. À l'ouverture d'un item, le composant effectue `document.querySelectorAll('ar-collapse[name="x"]')` et appelle `.hide()` sur tous les autres membres du groupe.

**Limitation connue** : le DOM query est document-scoped. Le mode accordéon ne fonctionne pas entre des `ar-collapse` situés dans des shadow roots différents. Acceptable pour l'usage typique — à réévaluer si un besoin cross-shadow émerge.

### Structure du shadow DOM

```
<div part="base">
  <!-- ordre DOM selon trigger-position -->
  <slot name="trigger" part="trigger-container">
  <div part="panel">   ← overflow:hidden via collapse.styles.ts (structurel)
    <div part="content">
      <slot>
```

`trigger-position` contrôle l'ordre de rendu dans le template Lit (pas via CSS `order`, pour respecter l'ordre focus DOM = ordre visuel — WCAG 2.4.3 et 1.3.2).

`overflow: hidden` est un style structurel (nécessaire au clipping pendant l'animation) — il va dans `collapse.styles.ts`, pas inline. Seul `height` est posé en inline style par JS, uniquement pendant la transition. En état stable : attribut `hidden` (fermé) ou absence de `height` inline (ouvert).

---

## API publique

### Propriétés / Attributs

| Attribut           | Type                | Défaut     | Reflect | Description                  |
| ------------------ | ------------------- | ---------- | ------- | ---------------------------- |
| `open`             | `Boolean`           | `false`    | oui     | État ouvert/fermé            |
| `for`              | `String`            | `''`       | oui     | ID du trigger externe        |
| `name`             | `String`            | `''`       | oui     | Groupe accordéon             |
| `trigger-position` | `'before'\|'after'` | `'before'` | oui     | Position DOM du slot trigger |
| `disabled`         | `Boolean`           | `false`    | oui     | Désactive le déclencheur     |

### Méthodes

- `show()` — ouvre le panel. Émet `ar-collapse-show` (annulable). No-op si déjà ouvert ou animating.
- `hide()` — ferme le panel. Émet `ar-collapse-hide` (annulable). No-op si déjà fermé ou animating.

### Événements

| Événement            | Annulable | Moment                                   |
| -------------------- | --------- | ---------------------------------------- |
| `ar-collapse-show`   | oui       | avant l'ouverture                        |
| `ar-collapse-shown`  | non       | après la fin de l'animation d'ouverture  |
| `ar-collapse-hide`   | oui       | avant la fermeture                       |
| `ar-collapse-hidden` | non       | après la fin de l'animation de fermeture |

### Slots

| Slot       | Description                                      |
| ---------- | ------------------------------------------------ |
| `trigger`  | Élément déclencheur. Ignoré si `for` est défini. |
| _(défaut)_ | Contenu collapsible                              |

### CSS Parts

| Part                | Description                                              |
| ------------------- | -------------------------------------------------------- |
| `base`              | Conteneur racine                                         |
| `trigger-container` | Wrapper du slot trigger                                  |
| `panel`             | Zone animée (height 0 → auto)                            |
| `content`           | Wrapper interne du contenu (isole overflow des paddings) |

### CSS Custom Properties

| Propriété                | Défaut structurel | Description                  |
| ------------------------ | ----------------- | ---------------------------- |
| `--ar-collapse-duration` | `0s`              | Durée de l'animation height  |
| `--ar-collapse-easing`   | `ease`            | Easing de l'animation height |

Le défaut `0s` = pas d'animation sans thème, conforme au modèle headless. La `transition` est posée par l'auteur :

```css
ar-collapse::part(panel) {
    transition: height var(--ar-collapse-duration, 0s) var(--ar-collapse-easing, ease);
}
```

---

## Comportement ARIA

Le composant pose automatiquement sur le trigger (interne ou externe) :

- `aria-expanded="true|false"`
- `aria-controls="<id-panel>"` — l'`id` est auto-généré sur l'hôte si absent

**Limitation** : `aria-controls` (IDREF) est résolu dans le même root. Si le trigger et le panel sont dans des shadow roots différents, l'AT ne résout pas la référence. Même contrainte que l'attribut `for` (tous deux reposent sur des IDs document-scoped).

`ariaControlsElements` (IDL, références directes cross-shadow) est au backlog — support navigateur insuffisant en 2026-06.

Quand `disabled` :

- Trigger interne : `disabled` + `aria-disabled="true"` posés sur l'élément sloté
- Trigger externe : clics ignorés par le composant

---

## Animation

### Ouverture

1. Émet `ar-collapse-show` (annulable)
2. `aria-expanded="true"` sur le trigger
3. Retire `hidden` du panel, mesure `scrollHeight`
4. Pose `height: 0` puis `height: {scrollHeight}px`
5. Attend `transitionend` → pose `height: auto` + émet `ar-collapse-shown`

### Fermeture

1. Émet `ar-collapse-hide` (annulable)
2. `aria-expanded="false"` sur le trigger
3. Fixe `height: {scrollHeight}px` (point de départ explicite)
4. Force reflow (`panel.offsetHeight`)
5. Pose `height: 0`
6. Attend `transitionend` → pose `hidden` + émet `ar-collapse-hidden`

### Reduced motion

Si `prefers-reduced-motion: reduce` : skip de la transition, toggle immédiat (même pattern que `ar-dialog`).

### État `_animating`

Flag interne bloquant les appels `show()`/`hide()` pendant une transition en cours. Empêche les états intermédiaires corrompus.

---

## Tests

### Vitest — `collapse.test.ts`

- Toggle `open` via `show()` / `hide()`
- Événements émis dans le bon ordre ; annulation fonctionne
- `aria-expanded` / `aria-controls` posés correctement (trigger interne et externe)
- Accordion : ouverture d'un item ferme les autres du même `name`
- `disabled` bloque `show()` / `hide()`
- `trigger-position="after"` place le trigger après le panel dans le DOM
- `for` inexistant → warning via `warn()`

### WTR browser — `collapse.browser.test.ts`

- Animation height 0 → auto (mesure `scrollHeight` avant/après)
- `transitionend` déclenche `ar-collapse-shown` / `ar-collapse-hidden`
- Reduced motion : pas de transition, toggle immédiat
- `_animating` bloque un double appel concurrent

### Axe-core — `collapse.a11y.test.ts`

- Violations axe sur états open et closed
- Trigger interne : `aria-expanded`, `aria-controls`, `id` auto-générés
- Trigger externe (`for`) : mêmes attributs posés sur le bouton natif

---

## Documentation Astro

- Fichier : `apps/docs/src/content/docs/components/collapse.mdx`
- Playground : toggle `open`, switch `trigger-position`, groupe accordéon avec `name`
- Exemples : standalone, accordéon, trigger externe via `for`
- Section limitations : cross-shadow `for` / `aria-controls`, `ariaControlsElements` au backlog

---

## Limitations connues (à documenter)

1. **Cross-shadow** : `for` et `aria-controls` reposent sur des IDs document-scoped. Ne fonctionne pas si trigger et panel sont dans des shadow roots différents.
2. **Accordion cross-shadow** : le DOM query `querySelectorAll` ne traverse pas les shadow roots — les groupes `name` ne fonctionnent qu'au sein du même document.
3. **`ariaControlsElements`** : au backlog — à adopter quand le support navigateur sera stable.
