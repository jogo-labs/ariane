# Spec — Scroll de page & accès clavier au TOC (docs)

**Date :** 2026-07-03
**Scope :** `apps/docs/src/layouts/Layout.astro`
**Approche :** Édition directe du layout partagé (impacte toutes les pages composant)

---

## Contexte

Aujourd'hui, `.layout-body` a une hauteur fixe (`calc(100vh - header - banner)`), et c'est `main` (ainsi que `.nav-column` et `.toc-column`) qui scrollent en interne via `overflow-y: auto`. Ce scroll interne au `main` casse le comportement de scroll quand un popover ouvert dans le contenu (dropdown, datepicker) dépend du scroll de la page pour se repositionner ou se fermer.

Par ailleurs, l'ordre du DOM est `nav` → `main` → `aside` (TOC). Un utilisateur clavier doit tabuler tout le contenu du `main` avant d'atteindre le sommaire (TOC), qui n'est pourtant qu'à un clic visuel.

Ce problème n'existe déjà pas en mobile : le media query `@media (max-width: 768px)` bascule `.layout-body` et `main` en `height: auto` / `overflow-y: visible`, laissant `<body>` scroller nativement. Le desktop diverge du mobile sur ce point.

---

## Objectif

1. `<html>`/`<body>` gèrent le scroll de la page sur desktop comme en mobile — plus de scroll interne au `main`.
2. La nav latérale et le TOC restent visibles à l'écran pendant que le contenu défile (`position: sticky`), sans réintroduire de piège de scroll.
3. Le TOC est atteignable rapidement au clavier sans dépendre de l'ordre du DOM (pas de réordre CSS — cf. WCAG 1.3.2 Meaningful Sequence).
4. La colonne TOC est légèrement élargie pour améliorer la lisibilité des sous-titres.

---

## Changements

### 1. Scroll de page (desktop)

Dans `Layout.astro`, supprimer :

- La hauteur fixe de `.layout-body` (`height: calc(100vh - ...)`).
- `overflow-y: auto` sur `main`.
- Le comportement de scroll interne actuellement propre au desktop dans `.nav-column` / `.toc-column`.

`.nav-column` et `.toc-column` passent en sidebar sticky à scroll interne :

```css
.nav-column,
.toc-column {
    position: sticky;
    top: var(--doc-header-h);
    max-height: calc(100vh - var(--doc-header-h) - var(--doc-alpha-banner-h));
    overflow-y: auto;
}
```

Le header (`.site-header`) reste `position: sticky; top: 0` (inchangé). Le bloc `@media (max-width: 768px)` existant continue de désactiver ce comportement sticky (nav en drawer, TOC masqué) — pas de changement mobile.

### 2. Largeur de la colonne TOC

`grid-template-columns: 270px 1fr 180px` → `270px 1fr 220px` sur `.layout-body.with-nav.with-toc`. La colonne nav (270px) est inchangée.

### 3. Liens d'évitement (skip links)

Le DOM garde son ordre actuel (`nav`, `main`, `aside`) — **pas de réordre visuel via CSS `order`/grid-column**, qui découplerait l'ordre de lecture/focus de l'ordre visuel (anti-pattern WCAG 1.3.2).

Deux liens `sr-only`, focusables (visibles au focus clavier), ajoutés tout en haut de `<body>`, avant `.alpha-banner` :

- **"Aller au contenu principal"** → `#main-content` (ancre à ajouter sur `<main>`). Toujours présent.
- **"Aller au sommaire"** → `#toc` (ancre à ajouter sur `<aside class="toc-column">`). Rendu uniquement si `showToc` est vrai.

Style : classe `.skip-link`, positionnée en `sr-only` par défaut, mais visible (`position: fixed; top: 0; left: 0`, fond contrasté, `z-index` au-dessus du header) quand elle reçoit le focus — pattern standard.

---

## Hors scope

- Le contenu ou la structure du TOC lui-même (`TableOfContents.astro`) — seule la largeur de sa colonne change.
- Le comportement mobile (déjà correct).
- La deuxième partie du travail (sections "Utilisation" par composant), qui fait l'objet d'un spec séparé.

---

## Tests / vérification

- Vérifier visuellement qu'aucune régression de layout n'apparaît sur une page avec TOC (ex. `/components/ar-datepicker`) et une page sans TOC.
- Vérifier qu'un popover ouvert dans le contenu (ex. `ar-dropdown` du thème, ou un composant datepicker en page) ne casse plus le scroll de la page lors du défilement.
- Vérifier à la tab depuis le chargement de la page : le premier skip link ("Aller au contenu principal") apparaît, suivi du second ("Aller au sommaire") si le TOC est présent, avant d'atteindre le burger/nav.
- Vérifier que nav et TOC restent visibles (sticky) pendant le scroll sur une page longue, en desktop.
