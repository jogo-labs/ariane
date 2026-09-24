# Généralisation du scoping des tokens sémantiques (#129, volet architecture) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scoper les 13 consommations directes de tokens sémantiques globaux (`--ar-color-bg`, `--ar-color-text`, `--ar-color-text-inverse`, `--ar-color-interactive`, `--ar-focus-ring-color`, `--ar-focus-ring-offset`) trouvées dans 6 composants (`alert`, `breadcrumb`, `stepper`, `datepicker`, `tab`, `pagination`), en appliquant la Règle 1 actée le 2026-07-23 (généralisation du scoping systématique — révoque l'exception « point d'extension public » posée dans l'addendum #127 du 2026-07-22 pour ces 6 tokens précis).

**Architecture:** Reprend exactement le pattern d'alias déjà établi par #125/#128 (ADR-005) et généralisé par #127/PR #132 : le composant déclare son propre token `--ar-<composant>-<rôle>`, `default.css` l'aliase par défaut vers le token global concerné, et le `.styles.ts` du composant consomme uniquement son propre token scopé. Aucun changement visuel : chaque nouvel alias pointe par défaut vers exactement la même valeur héritée.

**Tech Stack:** Lit 3 + TypeScript, CSS custom properties (`@layer ariane.theme` dans `packages/core/src/styles/themes/default.css`), `packages/core/scripts/validate-cssprop-defaults.js` (vérifie que chaque token de `default.css` a une entrée `@cssprop` correspondante dans le JSDoc du composant, exécuté via `npm run build:manifest`).

## Global Constraints

- Aucun changement visuel : chaque nouvel alias pointe par défaut vers exactement le token global qu'il remplace, même valeur héritée.
- Chaque token scopé nouvellement créé remplace l'entrée `@cssprop` existante qui documentait la consommation directe (supprimer l'ancienne entrée « Token sémantique global (non scopé à ar-X) », ajouter la nouvelle avec la mention « cascade vers --ar-<token-global> »).
- Prettier : 100 caractères, 4 espaces, quotes simples (appliqué automatiquement par `lint-staged` au commit).
- Conventional Commits — chaque tâche se termine par un commit séparé.
- Ne jamais committer `packages/core/dist/`.
- Chaque tâche est indépendante (fichiers disjoints) — peut être exécutée dans n'importe quel ordre.
- Vérification par tâche : `npx vitest run <nom-composant>` (depuis `packages/core/`) pour la non-régression comportementale, et `npm run build:manifest --workspace=packages/core` (depuis la racine) pour valider la couverture `@cssprop`/`default.css` (échoue si un token de `default.css` n'a pas d'entrée `@cssprop`, ou si le manifest ne se régénère pas proprement).

---

## Task 0: Corrige la dérive de documentation `datepicker.ts` (bug trouvé pendant l'audit)

**Contexte:** PR #134 a changé `datepicker.styles.ts` pour référencer `--ar-panel-bg` au lieu de `--ar-color-bg` dans le cutout de focus de la cellule jour, mais a oublié de mettre à jour le JSDoc `@cssprop` correspondant dans `datepicker.ts`, qui documente encore `--ar-color-bg`. Trouvé pendant l'audit exploratoire du volet architecture — à corriger avant de toucher au reste du fichier dans la Task 4 (évite un conflit d'édition sur la même zone).

**Files:**

- Modify: `packages/core/src/components/datepicker/datepicker.ts:101`

**Interfaces:** aucune — commentaire JSDoc uniquement, aucun changement de comportement ni de token.

- [ ] **Step 1: Corriger l'entrée `@cssprop`**

Dans `packages/core/src/components/datepicker/datepicker.ts`, remplacer la ligne 101 :

```ts
 * @cssprop --ar-color-bg - Couleur de bordure de la cellule jour focusée dans la grille (contraste avec l'anneau de focus). Token sémantique global (non scopé à ar-datepicker).
```

par :

```ts
 * @cssprop --ar-panel-bg - Couleur de bordure de la cellule jour focusée dans la grille (contraste avec l'anneau de focus). Le popover pilote son fond réel via ce token (panelStyles) ; référencer --ar-color-bg directement casserait ce cutout pour un consommateur ne surchargeant que --ar-panel-bg.
```

- [ ] **Step 2: Vérifier la génération du manifest**

Run (depuis la racine du repo) : `npm run build:manifest --workspace=packages/core`
Expected: aucune erreur `validate-cssprop-defaults`, sortie se termine par `Created new manifest.`

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/components/datepicker/datepicker.ts
git commit -m "docs(datepicker): corrige le token documenté du cutout de focus (--ar-panel-bg)"
```

---

## Task 1: Scope `--ar-color-text` pour `ar-alert`

**Files:**

- Modify: `packages/core/src/styles/themes/default.css` (section `/* alert */`, ligne 296)
- Modify: `packages/core/src/components/alert/alert.styles.ts:12`
- Modify: `packages/core/src/components/alert/alert.ts:53`

**Interfaces:** Produces `--ar-alert-color` (alias de `--ar-color-text`), consommé uniquement par `alert.styles.ts`.

- [ ] **Step 1: Ajouter l'alias dans `default.css`**

Dans la section `/* alert */` (ligne 296), ajouter en première ligne du bloc :

```css
/* alert */
--ar-alert-color: var(--ar-color-text);
--ar-alert-padding: 1rem;
```

- [ ] **Step 2: Consommer le token scopé dans `alert.styles.ts`**

Remplacer (ligne 12) :

```ts
        color: var(--ar-color-text);
```

par :

```ts
        color: var(--ar-alert-color);
```

- [ ] **Step 3: Mettre à jour le JSDoc `@cssprop`**

Dans `alert.ts`, remplacer (ligne 53) :

```ts
 * @cssprop --ar-color-text - Couleur du texte de l'alerte. Token sémantique global (non scopé à ar-alert) : le surcharger affecte aussi tous les autres composants qui le consomment directement.
```

par (à sa place alphabétique/logique dans le bloc, en tête des `@cssprop` de couleur) :

```ts
 * @cssprop --ar-alert-color - Couleur du texte de l'alerte (cascade vers --ar-color-text).
```

- [ ] **Step 4: Lancer les tests du composant**

Run (depuis `packages/core/`) : `npx vitest run alert`
Expected: tous les tests passent (aucune assertion sur la couleur de texte, changement purement visuel).

- [ ] **Step 5: Vérifier la génération du manifest**

Run (depuis la racine du repo) : `npm run build:manifest --workspace=packages/core`
Expected: aucune erreur `validate-cssprop-defaults`.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/styles/themes/default.css packages/core/src/components/alert/alert.styles.ts packages/core/src/components/alert/alert.ts
git commit -m "fix(alert): scope --ar-color-text en --ar-alert-color (audit #129)"
```

---

## Task 2: Scope `--ar-color-bg` et `--ar-color-interactive` pour `ar-breadcrumb`

**Files:**

- Modify: `packages/core/src/styles/themes/default.css` (section `/* breadcrumb */`, lignes 347-364)
- Modify: `packages/core/src/components/breadcrumb/breadcrumb.styles.ts:101,112`
- Modify: `packages/core/src/components/breadcrumb/breadcrumb.ts:56-57`

**Interfaces:** Produces `--ar-breadcrumb-bullet-ring-color` (alias de `--ar-color-bg`) et `--ar-breadcrumb-active-bullet-color` (alias de `--ar-color-interactive`), consommés uniquement par `breadcrumb.styles.ts`.

- [ ] **Step 1: Ajouter les alias dans `default.css`**

Dans la section `/* breadcrumb */`, après la ligne `--ar-breadcrumb-mobile-separator-color: var(--ar-color-neutral-90);`, ajouter :

```css
--ar-breadcrumb-mobile-separator-color: var(--ar-color-neutral-90);
--ar-breadcrumb-bullet-ring-color: var(--ar-color-bg);
--ar-breadcrumb-active-bullet-color: var(--ar-color-interactive);
```

- [ ] **Step 2: Consommer les tokens scopés dans `breadcrumb.styles.ts`**

Remplacer (ligne 101) :

```ts
        box-shadow: 0 0 0 2px var(--ar-color-bg);
```

par :

```ts
        box-shadow: 0 0 0 2px var(--ar-breadcrumb-bullet-ring-color);
```

Remplacer (ligne 112) :

```ts
        background-color: var(--ar-color-interactive);
```

par :

```ts
        background-color: var(--ar-breadcrumb-active-bullet-color);
```

- [ ] **Step 3: Mettre à jour le JSDoc `@cssprop`**

Dans `breadcrumb.ts`, remplacer (lignes 56-57) :

```ts
 * @cssprop --ar-color-bg - Couleur du liseré autour des puces de la liste mobile (`box-shadow`). Token sémantique global (non scopé à ar-breadcrumb).
 * @cssprop --ar-color-interactive - Couleur de la puce du dernier élément de la liste mobile (élément actif/courant). Token sémantique global (non scopé à ar-breadcrumb).
```

par :

```ts
 * @cssprop --ar-breadcrumb-bullet-ring-color - Couleur du liseré autour des puces de la liste mobile (`box-shadow`, cascade vers --ar-color-bg).
 * @cssprop --ar-breadcrumb-active-bullet-color - Couleur de la puce du dernier élément de la liste mobile (élément actif/courant, cascade vers --ar-color-interactive).
```

- [ ] **Step 4: Lancer les tests du composant**

Run (depuis `packages/core/`) : `npx vitest run breadcrumb`
Expected: tous les tests passent.

- [ ] **Step 5: Vérifier la génération du manifest**

Run (depuis la racine du repo) : `npm run build:manifest --workspace=packages/core`
Expected: aucune erreur `validate-cssprop-defaults`.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/styles/themes/default.css packages/core/src/components/breadcrumb/breadcrumb.styles.ts packages/core/src/components/breadcrumb/breadcrumb.ts
git commit -m "fix(breadcrumb): scope les tokens de puce mobile (audit #129)"
```

---

## Task 3: Scope les 4 tokens hover/focus pour `ar-stepper`

**Files:**

- Modify: `packages/core/src/styles/themes/default.css` (section `/* stepper */`, lignes 366-388)
- Modify: `packages/core/src/components/stepper/stepper.styles.ts:110,116,121,128`
- Modify: `packages/core/src/components/stepper/stepper.ts:82-84`

**Interfaces:** Produces `--ar-stepper-link-hover-bullet-color` (alias `--ar-color-interactive`), `--ar-stepper-link-hover-label-color` (alias `--ar-color-text`), `--ar-stepper-link-hover-bullet-text-color` (alias `--ar-color-text-inverse`), `--ar-stepper-link-focus-outline-color` (alias `--ar-color-interactive`) — consommés uniquement par `stepper.styles.ts`.

- [ ] **Step 1: Ajouter les alias dans `default.css`**

Dans la section `/* stepper */`, après la ligne `--ar-stepper-link-hover-color: var(--ar-color-text-muted);`, ajouter :

```css
--ar-stepper-link-hover-color: var(--ar-color-text-muted);
--ar-stepper-link-hover-bullet-color: var(--ar-color-interactive);
--ar-stepper-link-hover-label-color: var(--ar-color-text);
--ar-stepper-link-hover-bullet-text-color: var(--ar-color-text-inverse);
--ar-stepper-link-focus-outline-color: var(--ar-color-interactive);
```

- [ ] **Step 2: Consommer les tokens scopés dans `stepper.styles.ts`**

Remplacer (ligne 110, bloc `.stepper-item .stepper-link:focus:before, .stepper-item .stepper-link:hover:before`) :

```ts
        background-color: var(--ar-color-interactive);
```

par :

```ts
        background-color: var(--ar-stepper-link-hover-bullet-color);
```

Remplacer (ligne 116, bloc `.stepper-item-label` au hover/focus) :

```ts
        color: var(--ar-color-text);
```

par :

```ts
        color: var(--ar-stepper-link-hover-label-color);
```

Remplacer (ligne 121, bloc `.stepper-item-bullet` au hover/focus) :

```ts
        color: var(--ar-color-text-inverse);
```

par :

```ts
        color: var(--ar-stepper-link-hover-bullet-text-color);
```

Remplacer (ligne 128, bloc `.stepper-link:focus`) :

```ts
        outline-color: var(--ar-color-interactive);
```

par :

```ts
        outline-color: var(--ar-stepper-link-focus-outline-color);
```

- [ ] **Step 3: Mettre à jour le JSDoc `@cssprop`**

Dans `stepper.ts`, remplacer (lignes 82-84) :

```ts
 * @cssprop --ar-color-interactive - Couleur de la puce et de l'anneau de focus du lien d'étape au survol/focus. Token sémantique global (non scopé à ar-stepper).
 * @cssprop --ar-color-text - Couleur du label de l'étape au survol/focus. Token sémantique global (non scopé à ar-stepper).
 * @cssprop --ar-color-text-inverse - Couleur du numéro affiché dans la puce au survol/focus. Token sémantique global (non scopé à ar-stepper).
```

par :

```ts
 * @cssprop --ar-stepper-link-hover-bullet-color - Couleur de la puce du lien d'étape au survol/focus (cascade vers --ar-color-interactive).
 * @cssprop --ar-stepper-link-hover-label-color - Couleur du label de l'étape au survol/focus (cascade vers --ar-color-text).
 * @cssprop --ar-stepper-link-hover-bullet-text-color - Couleur du numéro affiché dans la puce au survol/focus (cascade vers --ar-color-text-inverse).
 * @cssprop --ar-stepper-link-focus-outline-color - Couleur de l'anneau de focus du lien d'étape (cascade vers --ar-color-interactive).
```

- [ ] **Step 4: Lancer les tests du composant**

Run (depuis `packages/core/`) : `npx vitest run stepper`
Expected: tous les tests passent.

- [ ] **Step 5: Vérifier la génération du manifest**

Run (depuis la racine du repo) : `npm run build:manifest --workspace=packages/core`
Expected: aucune erreur `validate-cssprop-defaults`.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/styles/themes/default.css packages/core/src/components/stepper/stepper.styles.ts packages/core/src/components/stepper/stepper.ts
git commit -m "fix(stepper): scope les tokens hover/focus du lien d'étape (audit #129)"
```

---

## Task 4: Scope les 3 tokens restants pour `ar-datepicker`

**Contexte:** Dépend de la Task 0 (doit être appliquée avant, même fichier `datepicker.ts`). La cellule jour a déjà ses propres tokens scopés pour le focus (`--ar-datepicker-day-focus-ring-color/-width/-offset`) ; l'incohérence porte sur les boutons nav/footer (encore en tokens génériques) et la couleur de base du texte des cellules.

**Files:**

- Modify: `packages/core/src/styles/themes/default.css` (section `/* ar-datepicker */`, lignes 530-617)
- Modify: `packages/core/src/components/datepicker/datepicker.styles.ts:88-91,116-119,142`
- Modify: `packages/core/src/components/datepicker/datepicker.ts:98,100` (101 déjà traité en Task 0)

**Interfaces:** Produces `--ar-datepicker-nav-btn-focus-ring-color`/`--ar-datepicker-nav-btn-focus-ring-offset` (alias `--ar-focus-ring-color`/`--ar-focus-ring-offset`), `--ar-datepicker-footer-btn-focus-ring-color`/`--ar-datepicker-footer-btn-focus-ring-offset` (mêmes alias), `--ar-datepicker-day-color` (alias `--ar-color-text`) — consommés uniquement par `datepicker.styles.ts`.

- [ ] **Step 1: Ajouter les alias dans `default.css`**

Après `--ar-datepicker-nav-btn-active-bg: color-mix(...)` (fin du bloc nav-btn, ligne ~567), ajouter :

```css
--ar-datepicker-nav-btn-focus-ring-color: var(--ar-focus-ring-color);
--ar-datepicker-nav-btn-focus-ring-offset: var(--ar-focus-ring-offset);
```

Après `--ar-datepicker-footer-btn-active-bg: color-mix(...)` (fin du bloc footer-btn, ligne ~587), ajouter :

```css
--ar-datepicker-footer-btn-focus-ring-color: var(--ar-focus-ring-color);
--ar-datepicker-footer-btn-focus-ring-offset: var(--ar-focus-ring-offset);
```

Après `--ar-datepicker-day-font-size: 1rem;` (ligne 595), ajouter :

```css
--ar-datepicker-day-color: var(--ar-color-text);
```

- [ ] **Step 2: Consommer les tokens scopés dans `datepicker.styles.ts`**

Remplacer (bloc `[part~='nav-btn']:focus-visible`) :

```ts
    [part~='nav-btn']:focus-visible {
        outline: 2px solid var(--ar-focus-ring-color, ButtonText);
        outline-offset: var(--ar-focus-ring-offset);
    }
```

par :

```ts
    [part~='nav-btn']:focus-visible {
        outline: 2px solid var(--ar-datepicker-nav-btn-focus-ring-color, ButtonText);
        outline-offset: var(--ar-datepicker-nav-btn-focus-ring-offset);
    }
```

Remplacer (bloc `[part~='footer-btn']:focus-visible`) :

```ts
    [part~='footer-btn']:focus-visible {
        outline: 2px solid var(--ar-focus-ring-color, ButtonText);
        outline-offset: var(--ar-focus-ring-offset);
    }
```

par :

```ts
    [part~='footer-btn']:focus-visible {
        outline: 2px solid var(--ar-datepicker-footer-btn-focus-ring-color, ButtonText);
        outline-offset: var(--ar-datepicker-footer-btn-focus-ring-offset);
    }
```

Remplacer (bloc `[part='day']`) :

```ts
    [part='day'] {
        font-size: var(--ar-datepicker-day-font-size);
        color: var(--ar-color-text);
```

par :

```ts
    [part='day'] {
        font-size: var(--ar-datepicker-day-font-size);
        color: var(--ar-datepicker-day-color);
```

- [ ] **Step 3: Mettre à jour le JSDoc `@cssprop`**

Dans `datepicker.ts`, remplacer :

```ts
 * @cssprop --ar-focus-ring-color - Couleur de l'anneau de focus des boutons de navigation et du footer. Token sémantique global (non scopé à ar-datepicker) — les cellules jour ont leur propre token scopé, --ar-datepicker-day-focus-ring-color. Repli `ButtonText` si aucun thème n'est chargé (WCAG 2.4.7).
 * @cssprop --ar-focus-ring-offset - Décalage de l'anneau de focus des boutons de navigation et du footer. Token sémantique global (non scopé à ar-datepicker).
 * @cssprop --ar-color-text - Couleur du texte des cellules jour. Token sémantique global (non scopé à ar-datepicker).
```

par :

```ts
 * @cssprop --ar-datepicker-nav-btn-focus-ring-color - Couleur de l'anneau de focus des boutons de navigation (cascade vers --ar-focus-ring-color). Repli `ButtonText` si aucun thème n'est chargé (WCAG 2.4.7).
 * @cssprop --ar-datepicker-nav-btn-focus-ring-offset - Décalage de l'anneau de focus des boutons de navigation (cascade vers --ar-focus-ring-offset).
 * @cssprop --ar-datepicker-footer-btn-focus-ring-color - Couleur de l'anneau de focus des boutons du footer (cascade vers --ar-focus-ring-color). Repli `ButtonText` si aucun thème n'est chargé (WCAG 2.4.7).
 * @cssprop --ar-datepicker-footer-btn-focus-ring-offset - Décalage de l'anneau de focus des boutons du footer (cascade vers --ar-focus-ring-offset).
 * @cssprop --ar-datepicker-day-color - Couleur du texte des cellules jour (cascade vers --ar-color-text).
```

- [ ] **Step 4: Lancer les tests du composant**

Run (depuis `packages/core/`) : `npx vitest run datepicker`
Expected: tous les tests passent (81 tests attendus, cf. PR #134).

- [ ] **Step 5: Vérifier la génération du manifest**

Run (depuis la racine du repo) : `npm run build:manifest --workspace=packages/core`
Expected: aucune erreur `validate-cssprop-defaults`.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/styles/themes/default.css packages/core/src/components/datepicker/datepicker.styles.ts packages/core/src/components/datepicker/datepicker.ts
git commit -m "fix(datepicker): scope les tokens focus nav/footer-btn et day-color (audit #129)"
```

---

## Task 5: Scope `--ar-focus-ring-color` pour `ar-tab`

**Files:**

- Modify: `packages/core/src/styles/themes/default.css` (section `/* tab */`, ligne 503-522)
- Modify: `packages/core/src/components/tab/tab.styles.ts:47`
- Modify: `packages/core/src/components/tab/tab.ts:31`

**Interfaces:** Produces `--ar-tab-focus-ring-color` (alias de `--ar-focus-ring-color`), consommé uniquement par `tab.styles.ts`. Le composant a déjà `--ar-tab-focus-ring-offset` scopé — ce token complète la paire.

- [ ] **Step 1: Ajouter l'alias dans `default.css`**

Après `--ar-tab-focus-ring-offset: -2px;` (ligne 522), ajouter :

```css
--ar-tab-focus-ring-offset: -2px;
--ar-tab-focus-ring-color: var(--ar-focus-ring-color);
```

- [ ] **Step 2: Consommer le token scopé dans `tab.styles.ts`**

Remplacer (ligne 47) :

```ts
        outline: 2px solid var(--ar-focus-ring-color, ButtonText);
```

par :

```ts
        outline: 2px solid var(--ar-tab-focus-ring-color, ButtonText);
```

- [ ] **Step 3: Mettre à jour le JSDoc `@cssprop`**

Dans `tab.ts`, remplacer (ligne 31) :

```ts
 * @cssprop --ar-focus-ring-color - Couleur de la bague de focus de l'onglet. Token sémantique global (non scopé à ar-tab). Repli `ButtonText` si aucun thème n'est chargé (WCAG 2.4.7).
```

par :

```ts
 * @cssprop --ar-tab-focus-ring-color - Couleur de la bague de focus de l'onglet (cascade vers --ar-focus-ring-color). Repli `ButtonText` si aucun thème n'est chargé (WCAG 2.4.7).
```

- [ ] **Step 4: Lancer les tests du composant**

Run (depuis `packages/core/`) : `npx vitest run tab`
Expected: tous les tests passent (75 tests attendus, cf. PR #135).

- [ ] **Step 5: Vérifier la génération du manifest**

Run (depuis la racine du repo) : `npm run build:manifest --workspace=packages/core`
Expected: aucune erreur `validate-cssprop-defaults`.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/styles/themes/default.css packages/core/src/components/tab/tab.styles.ts packages/core/src/components/tab/tab.ts
git commit -m "fix(tab): scope --ar-focus-ring-color en --ar-tab-focus-ring-color (audit #129)"
```

---

## Task 6: Scope `--ar-color-bg` pour `ar-pagination`

**Files:**

- Modify: `packages/core/src/styles/themes/default.css` (section `/* pagination */`, lignes 403-410)
- Modify: `packages/core/src/components/pagination/pagination.styles.ts:67`
- Modify: `packages/core/src/components/pagination/pagination.ts:47`

**Interfaces:** Produces `--ar-pagination-active-bg` (alias de `--ar-color-bg`), consommé uniquement par `pagination.styles.ts`. À ne pas confondre avec `--ar-pagination-bg` (fond des boutons non-actifs, déjà scopé).

- [ ] **Step 1: Ajouter l'alias dans `default.css`**

Dans la section `/* pagination */`, ajouter la ligne (après le dernier token existant de la section, avant `/* spinner */`) :

```css
--ar-pagination-active-bg: var(--ar-color-bg);
```

- [ ] **Step 2: Consommer le token scopé dans `pagination.styles.ts`**

Remplacer (ligne 67) :

```ts
        background-color: var(--ar-color-bg);
```

par :

```ts
        background-color: var(--ar-pagination-active-bg);
```

- [ ] **Step 3: Mettre à jour le JSDoc `@cssprop`**

Dans `pagination.ts`, remplacer (ligne 47) :

```ts
 * @cssprop --ar-color-bg - Couleur du fond du numéro de page actif. Token sémantique global (non scopé à ar-pagination).
```

par :

```ts
 * @cssprop --ar-pagination-active-bg - Couleur du fond du numéro de page actif (cascade vers --ar-color-bg).
```

- [ ] **Step 4: Lancer les tests du composant**

Run (depuis `packages/core/`) : `npx vitest run pagination`
Expected: tous les tests passent.

- [ ] **Step 5: Vérifier la génération du manifest**

Run (depuis la racine du repo) : `npm run build:manifest --workspace=packages/core`
Expected: aucune erreur `validate-cssprop-defaults`.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/styles/themes/default.css packages/core/src/components/pagination/pagination.styles.ts packages/core/src/components/pagination/pagination.ts
git commit -m "fix(pagination): scope --ar-color-bg en --ar-pagination-active-bg (audit #129)"
```

---

## Hors périmètre (confirmé sans action pendant l'audit)

- **`ar-tab-group`** (bordure de séparation `--ar-tab-group-border-color`) — cosmétique, décision déjà actée, cf. PR #135.
- **`ar-charcounter`** (warning/error indiscernables sans thème) — décision déjà actée en #133, pas d'équivalent couleur système fiable.
- **`ar-datepicker` `[part='error']` sans fallback `font-weight`** — incohérence mineure trouvée pendant l'audit (parité avec `ar-charcounter`), sous le seuil de gravité retenu, à noter dans #129 mais pas de tâche dans ce plan (cohérent avec le traitement de `ar-charcounter`, pas de demande concrète).
- **Règles `::part()` de `default.css` ciblant `ar-datepicker`** (`::part(hint)`, `::part(error)`) — vérifiées pendant l'audit : aucun mécanisme essentiel manquant dans le composant nu, uniquement des enrichissements cosmétiques sur des éléments HTML natifs déjà fonctionnels sans thème. Aucune violation de la Règle 2 trouvée sur l'ensemble des 19 composants.
- **13 autres composants** (`breadcrumb-item`, `charcounter`, `collapse`, `dialog`, `dropdown`, `dropdown-item`, `progressbar`, `spinner`, `stepper-item`, `tab-group`, `tab-panel`, `table-sort`, `tooltip`) — aucune consommation directe de token générique trouvée, `.styles.ts` déjà propre.

## Suite

Une fois les 6 tâches ci-dessus mergées, le volet architecture de #129 sera traité dans son intégralité (audit du style nu + généralisation du scoping). Reste uniquement `ar-charcounter` (warning/error) en veille, sans action requise sauf besoin concret futur — l'issue #129 pourra alors être fermée.
