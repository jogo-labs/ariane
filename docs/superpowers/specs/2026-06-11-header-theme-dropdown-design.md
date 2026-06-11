# Header — Theme Dropdown Design

**Date :** 2026-06-11
**Scope :** `apps/docs/src/layouts/Layout.astro`
**Motivation :** À 375px le groupe de 3 boutons thème compresse le logo. Remplacement par un `ar-dropdown` à icône unique qui affiche le mode actif.

---

## Contexte

Le header actuel contient à droite : un lien GitHub (icon-btn) + un groupe de 3 boutons (`☀ ⬤ ☾`) dans un `.theme-toggle`. Ce groupe fait ~86px de large et force la zone gauche (logo + badge version) à se comprimer.

---

## Design

### Trigger

Un `<button class="icon-btn" id="theme-trigger">` — même style que le bouton GitHub existant (32×32px, bordure, `border-radius: 0.4rem`).

Contenu du trigger : SVG de l'icône du mode actif + chevron `▾`. Le SVG est swappé à chaque changement de mode.

| Mode     | Icône SVG                   |
| -------- | --------------------------- |
| `light`  | Soleil (Lucide `sun`)       |
| `system` | Moniteur (Lucide `monitor`) |
| `dark`   | Lune (Lucide `moon`)        |

`aria-label` dynamique : `"Thème : Clair"` / `"Thème : Automatique"` / `"Thème : Sombre"`.

### Dropdown

`<ar-dropdown>` avec `placement="bottom-end"` positionné immédiatement après le trigger dans le DOM.

Trois `<ar-dropdown-item>` :

```html
<ar-dropdown-item data-theme-mode="light">
    <!-- SVG soleil -->
    Clair
</ar-dropdown-item>
<ar-dropdown-item data-theme-mode="system">
    <!-- SVG moniteur -->
    Automatique
</ar-dropdown-item>
<ar-dropdown-item data-theme-mode="dark">
    <!-- SVG lune -->
    Sombre
</ar-dropdown-item>
```

L'item correspondant au mode actif reçoit `aria-current="true"` (ajouté/retiré via JS, pas via attribut Lit interne).

### Logique JS

La fonction `applyMode(mode)` existante est étendue :

1. Met à jour `data-theme` / `data-themeMode` sur `<html>` (inchangé)
2. Appelle `setTriggerIcon(mode)` : remplace le contenu SVG du trigger par l'icône correspondante
3. Met à jour `aria-label` du trigger
4. Met à jour `aria-current` sur les `ar-dropdown-item`

`setTriggerIcon` swape le SVG inline — pas de rechargement d'image, pas de transition visible.

### Suppression

- Le `<div class="theme-toggle">` et ses 3 `<button class="theme-btn">` sont supprimés du HTML
- Les règles CSS `.theme-toggle`, `.theme-btn`, `.theme-btn.active`, `[data-theme="dark"] .theme-btn.active` sont supprimées

### Ce qui ne change pas

- `.icon-btn` inchangé — utilisé tel quel pour le trigger
- Bouton GitHub inchangé
- `applyMode()` / `resolveTheme()` — logique existante conservée, juste étendue
- Aucune modification dans `packages/core`

---

## Accessibilité

- `ar-dropdown` gère nativement `aria-haspopup="true"` et `aria-expanded` sur le trigger
- `aria-label` du trigger reflète le mode actif en permanence
- `aria-current="true"` sur l'item actif (pattern ARIA recommandé pour indiquer la sélection dans un menu)
- Navigation clavier entièrement gérée par `ar-dropdown` / `ar-dropdown-item`

---

## Hors scope

- Aucune modification du positionnement ou du comportement de `ar-dropdown`
- Pas d'animation sur le swap d'icône
- Pas de tooltip sur le trigger (le `aria-label` suffit)
