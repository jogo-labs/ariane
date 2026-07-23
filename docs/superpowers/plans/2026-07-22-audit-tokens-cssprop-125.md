# Audit tokens exposés #125 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger les 11 constats validés de l'audit #125 (tokens CSS exposés par `default.css` par rapport aux composants qui les consomment) : aliaser les dépendances croisées entre composants, supprimer les tokens morts, documenter les incohérences, rapatrier une règle mal placée, et remplacer un token de palette brute par son équivalent sémantique.

**Architecture:** Chaque composant garde son autonomie headless : tout token qu'il consomme doit soit lui appartenir en propre (`--ar-<composant>-*`), soit être un token sémantique global légitime (`--ar-color-*`), jamais un token `--ar-<autre-composant>-*` en dur. Le pattern de référence est `ar-dropdown` (cf. `docs/decisions/ADR-005-*.md`) : quand un composant a besoin d'une valeur d'un bloc partagé (`panel`, `button`), `default.css` déclare un alias `--ar-<composant>-<propriété>: var(--ar-panel-<propriété>)`, et le `.styles.ts` du composant consomme l'alias, jamais le token partagé directement.

**Tech Stack:** Lit 3 + TypeScript, CSS custom properties (`@layer ariane.theme` dans `packages/core/src/styles/themes/default.css`), Vitest, script de validation maison `packages/core/scripts/validate-cssprop-defaults.js` (exécuté par `npm run build:manifest` via `cem.config.js`).

## Global Constraints

- Headless : aucun fallback cosmétique (`var(--token)` sans valeur par défaut) dans les `.styles.ts`. Toutes les valeurs de design vont dans `packages/core/src/styles/themes/default.css`. Les fallbacks structurels (`0px` pour compensations de layout) restent acceptables — ne pas toucher à `var(--ar-tab-group-border-top-width, 0px)` / `-bottom-width, 0px)` dans `tab.styles.ts`.
- Tout nouveau token `--ar-*` doit avoir son entrée `@cssprop` dans le JSDoc du composant qui le consomme (validé par `npm run build:manifest`, cf. `packages/core/scripts/validate-cssprop-defaults.js`).
- Prettier : 100 caractères, 4 espaces, quotes simples.
- Conventional Commits (commitlint + Husky) — chaque tâche se termine par un commit séparé.
- Ne jamais committer `packages/core/dist/`.
- Branches `fix/<desc>` / `chore/<desc>` créées depuis `dev`. PR vers `dev`, jamais push direct sur `main`.

---

## Contexte technique découvert pendant la lecture du code

- `packages/core/src/styles/themes/default.css` fait 805 lignes, structuré en 6 sections numérotées sous `@layer ariane.theme { :root { ... } }`, suivi d'un bloc `:root[data-theme='dark']`, d'un bloc `@media (prefers-color-scheme: dark)`, puis de règles `ar-datepicker::part(...)` et `ar-collapse::part(panel)` hors `:root`.
- `packages/core/src/styles/shared/panel.styles.ts` (bloc partagé dropdown/breadcrumb/stepper) expose ces tokens dans sa règle `[part='panel']` : `--ar-panel-bg`, `--ar-panel-text`, `--ar-panel-border-color`, `--ar-panel-radius`, `--ar-panel-shadow`, `--ar-panel-padding`, `--ar-panel-max-width`. Il n'utilise **pas** `--ar-panel-min-width` en interne (ce token existe dans `default.css` mais n'est consommé que par les alias `--ar-breadcrumb-panel-min-width`/`--ar-stepper-panel-min-width`, appliqués directement dans `breadcrumb.styles.ts`/`stepper.styles.ts`).
- Le pattern d'alias déjà en place pour `ar-dropdown` (lignes 424-437 de `default.css`) nomme la bordure `--ar-dropdown-border-color` (pas `-color`) et le radius `--ar-dropdown-border-radius` (pas `-radius`). Ce plan reprend cette convention exacte pour les nouveaux alias breadcrumb/stepper (Task 4), même si le libellé de l'audit disait génériquement « `-radius` » — voir note de fin de plan.
- Dans `breadcrumb.ts` et `stepper.ts`, l'ordre du tableau `static override styles` place le fichier `styles` (le `.styles.ts` du composant) **après** `panelStyles` — les règles `[part='panel']` du composant gagnent donc déjà la cascade par ordre de source, sans besoin d'augmenter la spécificité.

---

### Task 1: Créer la branche de travail

**Files:** aucun fichier modifié — opération git uniquement.

- [ ] **Step 1: Créer la branche depuis `dev`**

```bash
cd /Users/jon/Code/Active_projects/ariane
git checkout dev
git pull
git checkout -b fix/audit-tokens-125
```

- [ ] **Step 2: Vérifier l'état propre**

Run: `git status`
Expected: `On branch fix/audit-tokens-125`, `nothing to commit, working tree clean`

---

### Task 2 (Lot A.1): Aliaser `--ar-alert-close-transition-duration` pour `ar-alert`

**Files:**

- Modify: `packages/core/src/styles/themes/default.css` (section `/* alert */`, lignes 294-315)
- Modify: `packages/core/src/components/alert/alert.styles.ts:86-88`
- Modify: `packages/core/src/components/alert/alert.ts` (bloc JSDoc `@cssprop`, après ligne 51)
- Test: `packages/core/src/components/alert/alert.test.ts` (aucune modif attendue — juste vérification qu'il passe toujours)

**Interfaces:**

- Produces: nouveau token `--ar-alert-close-transition-duration` (alias vers `--ar-button-transition-duration`), consommé uniquement par `alert.styles.ts`.

- [ ] **Step 1: Ajouter l'alias dans `default.css`**

La section alert se termine ligne 314 par :

```css
--ar-alert-success-icon: var(--ar-color-success-text);
```

Ajouter juste après (ligne 315) :

```css
--ar-alert-success-icon: var(--ar-color-success-text);
--ar-alert-close-transition-duration: var(--ar-button-transition-duration);
```

- [ ] **Step 2: Utiliser l'alias dans `alert.styles.ts`**

Remplacer (lignes 86-88) :

```css
transition:
    opacity var(--ar-button-transition-duration),
    background-color var(--ar-button-transition-duration);
```

par :

```css
transition:
    opacity var(--ar-alert-close-transition-duration),
    background-color var(--ar-alert-close-transition-duration);
```

- [ ] **Step 3: Documenter le token dans `alert.ts`**

Le bloc JSDoc de `alert.ts` se termine ligne 51 par :

```
 * @cssprop --ar-alert-success-icon - Couleur de l'icône "success".
```

Ajouter juste après :

```
 * @cssprop --ar-alert-success-icon - Couleur de l'icône "success".
 * @cssprop --ar-alert-close-transition-duration - Durée de la transition (opacity/background-color) du bouton de fermeture au survol/focus.
```

- [ ] **Step 4: Vérifier la couverture `@cssprop` et les tests**

Run: `npm run build:manifest --workspace=@ariane-ui/core`
Expected: succès, aucune erreur de `validate-cssprop-defaults.js` (le nouveau token a son entrée JSDoc).

Run: `npx vitest run packages/core/src/components/alert --root /Users/jon/Code/Active_projects/ariane`
Expected: tous les tests alert passent, aucune régression visuelle (la transition garde la même valeur numérique `0.15s`, seul le nom du token change).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/styles/themes/default.css packages/core/src/components/alert/alert.styles.ts packages/core/src/components/alert/alert.ts
git commit -m "fix(alert): alias --ar-alert-close-transition-duration au lieu de consommer --ar-button-transition-duration directement"
```

---

### Task 3 (Lot A.2): Remplacer `var(--ar-panel-bg)` par `var(--ar-color-bg)` dans `ar-datepicker`

**Files:**

- Modify: `packages/core/src/components/datepicker/datepicker.styles.ts:169-174`

**Interfaces:** aucun nouveau token — remplacement d'un token d'un autre composant par un token sémantique global déjà utilisé ailleurs dans ce même fichier (`--ar-color-text` ligne 135).

- [ ] **Step 1: Remplacer le token**

Remplacer (lignes 169-174) :

```css
[part='grid']:focus-within [part='day'][tabindex='0'] {
    outline: solid var(--ar-datepicker-day-focus-ring-width)
        var(--ar-datepicker-day-focus-ring-color);
    outline-offset: var(--ar-datepicker-day-focus-ring-offset);
    border-color: var(--ar-panel-bg);
}
```

par :

```css
[part='grid']:focus-within [part='day'][tabindex='0'] {
    outline: solid var(--ar-datepicker-day-focus-ring-width)
        var(--ar-datepicker-day-focus-ring-color);
    outline-offset: var(--ar-datepicker-day-focus-ring-offset);
    border-color: var(--ar-color-bg);
}
```

- [ ] **Step 2: Vérification visuelle**

`--ar-color-bg` vaut `var(--ar-color-white)` en light et `var(--ar-color-neutral-10)` en dark — valeurs identiques à `--ar-panel-bg` (qui n'est qu'un alias de `--ar-color-bg`, cf. `default.css:410`). Aucun changement visuel attendu. Aucun test automatisé ne couvre cette bordure de focus précisément ; vérifier à l'œil dans le playground docs (`npm run dev`, page `ar-datepicker`, ouvrir le calendrier, naviguer au clavier jusqu'à une cellule focus) que l'anneau de focus garde son apparence en light et en dark.

- [ ] **Step 3: Run tests existants**

Run: `npx vitest run packages/core/src/components/datepicker --root /Users/jon/Code/Active_projects/ariane`
Expected: tous les tests datepicker passent (aucun test ne dépend de cette valeur CSS précise).

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/components/datepicker/datepicker.styles.ts
git commit -m "fix(datepicker): utilise --ar-color-bg au lieu de --ar-panel-bg pour la bordure de focus de la grille"
```

---

### Task 4 (Lot A.3): Aliaser `--ar-datepicker-panel-max-width`/`-padding` et supprimer la règle `::part(panel)` redondante

**Files:**

- Modify: `packages/core/src/styles/themes/default.css` (section datepicker lignes 505-586, et suppression lignes 715-718)
- Modify: `packages/core/src/components/datepicker/datepicker.styles.ts:41-43`
- Modify: `packages/core/src/components/datepicker/datepicker.ts` (JSDoc, après ligne 48)

**Interfaces:**

- Produces: `--ar-datepicker-panel-max-width` (alias de `--ar-panel-max-width`, valeur `25rem`), `--ar-datepicker-panel-padding` (alias de `--ar-panel-padding`, valeur `1rem`).

- [ ] **Step 1: Ajouter les deux alias dans la section datepicker de `default.css`**

Remplacer (ligne 517) :

```css
--ar-datepicker-panel-width: 20rem;
```

par :

```css
--ar-datepicker-panel-width: 20rem;
/* Alias scopés au composant : cascadent vers --ar-panel-max-width/--ar-panel-padding
           (bloc partagé dropdown/breadcrumb/stepper) sans que datepicker.styles.ts consomme
           ces tokens partagés en dur — même pattern que ar-dropdown (ADR-005). */
--ar-datepicker-panel-max-width: var(--ar-panel-max-width);
--ar-datepicker-panel-padding: var(--ar-panel-padding);
```

- [ ] **Step 2: Supprimer la règle `ar-datepicker::part(panel)` devenue redondante**

Supprimer (lignes 715-718) :

```css
ar-datepicker::part(panel) {
    --ar-panel-max-width: 25rem;
    --ar-panel-padding: 1rem;
}
```

(bloc entier, y compris la ligne vide qui suit).

- [ ] **Step 3: Appliquer les alias en surcharge scopée dans `datepicker.styles.ts`**

Remplacer (lignes 41-43) :

```css
[part='panel'] {
    width: var(--ar-datepicker-panel-width);
}
```

par :

```css
[part='panel'] {
    width: var(--ar-datepicker-panel-width);
    max-width: var(--ar-datepicker-panel-max-width);
    padding: var(--ar-datepicker-panel-padding);
}
```

Note : `datepicker.ts` importe `panelStyles` (qui définit `max-width: var(--ar-panel-max-width)` et `padding: var(--ar-panel-padding)` sur `[part='panel']`) avant `styles` (le fichier `datepicker.styles.ts`) — même ordre que breadcrumb/stepper, donc cette règle gagne la cascade par ordre de source. Vérifier l'ordre dans `datepicker.ts` si ce fichier est retouché ailleurs : `panelStyles` doit rester avant `styles` dans le tableau `static override styles`.

- [ ] **Step 4: Documenter les deux nouveaux tokens dans `datepicker.ts`**

Le JSDoc se termine ligne 48 par :

```
 * @cssprop --ar-datepicker-panel-width - Largeur du popover.
```

Ajouter juste après :

```
 * @cssprop --ar-datepicker-panel-width - Largeur du popover.
 * @cssprop --ar-datepicker-panel-max-width - Largeur maximale du popover (cascade vers --ar-panel-max-width).
 * @cssprop --ar-datepicker-panel-padding - Padding interne du popover (cascade vers --ar-panel-padding).
```

- [ ] **Step 5: Vérifier la couverture `@cssprop` et les tests**

Run: `npm run build:manifest --workspace=@ariane-ui/core`
Expected: succès, aucune erreur de couverture.

Run: `npx vitest run packages/core/src/components/datepicker --root /Users/jon/Code/Active_projects/ariane`
Expected: tous les tests passent.

- [ ] **Step 6: Vérification visuelle**

Valeur numérique inchangée (25rem / 1rem, juste rapatriée depuis la règle `::part()` externe vers les valeurs par défaut des nouveaux alias). Vérifier dans le playground docs que le panel calendrier garde la même largeur max et le même padding qu'avant.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/styles/themes/default.css packages/core/src/components/datepicker/datepicker.styles.ts packages/core/src/components/datepicker/datepicker.ts
git commit -m "refactor(datepicker): aliase --ar-datepicker-panel-max-width/-padding et supprime la règle ::part(panel) redondante"
```

---

### Task 5 (Lot A.4): Compléter les alias panel de `ar-breadcrumb`

**Files:**

- Modify: `packages/core/src/styles/themes/default.css` (section breadcrumb lignes 344-355)
- Modify: `packages/core/src/components/breadcrumb/breadcrumb.styles.ts:145-148`
- Modify: `packages/core/src/components/breadcrumb/breadcrumb.ts` (JSDoc, après ligne 43)

**Interfaces:**

- Produces: `--ar-breadcrumb-panel-bg`, `--ar-breadcrumb-panel-border-color`, `--ar-breadcrumb-panel-border-radius`, `--ar-breadcrumb-panel-shadow`, `--ar-breadcrumb-panel-padding` (alias respectivement vers `--ar-panel-bg`, `--ar-panel-border-color`, `--ar-panel-radius`, `--ar-panel-shadow`, `--ar-panel-padding`).

- [ ] **Step 1: Ajouter les 5 alias dans la section breadcrumb de `default.css`**

Remplacer (lignes 350-351) :

```css
--ar-breadcrumb-panel-min-width: var(--ar-panel-min-width);
--ar-breadcrumb-panel-max-width: var(--ar-panel-max-width);
```

par :

```css
--ar-breadcrumb-panel-min-width: var(--ar-panel-min-width);
--ar-breadcrumb-panel-max-width: var(--ar-panel-max-width);
--ar-breadcrumb-panel-bg: var(--ar-panel-bg);
--ar-breadcrumb-panel-border-color: var(--ar-panel-border-color);
--ar-breadcrumb-panel-border-radius: var(--ar-panel-radius);
--ar-breadcrumb-panel-shadow: var(--ar-panel-shadow);
--ar-breadcrumb-panel-padding: var(--ar-panel-padding);
```

- [ ] **Step 2: Appliquer les alias en surcharge scopée dans `breadcrumb.styles.ts`**

Remplacer (lignes 145-148) :

```css
[part='panel'] {
    min-width: var(--ar-breadcrumb-panel-min-width);
    max-width: var(--ar-breadcrumb-panel-max-width);
}
```

par :

```css
[part='panel'] {
    min-width: var(--ar-breadcrumb-panel-min-width);
    max-width: var(--ar-breadcrumb-panel-max-width);
    background-color: var(--ar-breadcrumb-panel-bg);
    border-color: var(--ar-breadcrumb-panel-border-color);
    border-radius: var(--ar-breadcrumb-panel-border-radius);
    box-shadow: var(--ar-breadcrumb-panel-shadow);
    padding: var(--ar-breadcrumb-panel-padding);
}
```

- [ ] **Step 3: Documenter les 5 nouveaux tokens dans `breadcrumb.ts`**

Le JSDoc contient ligne 43 :

```
 * @cssprop --ar-breadcrumb-panel-max-width - Largeur max du panel mobile (cascade vers --ar-panel-max-width).
```

Ajouter juste après :

```
 * @cssprop --ar-breadcrumb-panel-max-width - Largeur max du panel mobile (cascade vers --ar-panel-max-width).
 * @cssprop --ar-breadcrumb-panel-bg - Fond du panel mobile (cascade vers --ar-panel-bg).
 * @cssprop --ar-breadcrumb-panel-border-color - Couleur de bordure du panel mobile (cascade vers --ar-panel-border-color).
 * @cssprop --ar-breadcrumb-panel-border-radius - Border-radius du panel mobile (cascade vers --ar-panel-radius).
 * @cssprop --ar-breadcrumb-panel-shadow - Ombre portée du panel mobile (cascade vers --ar-panel-shadow).
 * @cssprop --ar-breadcrumb-panel-padding - Padding interne du panel mobile (cascade vers --ar-panel-padding).
```

- [ ] **Step 4: Vérifier la couverture `@cssprop` et les tests**

Run: `npm run build:manifest --workspace=@ariane-ui/core`
Expected: succès.

Run: `npx vitest run packages/core/src/components/breadcrumb --root /Users/jon/Code/Active_projects/ariane`
Expected: tous les tests passent (valeurs par défaut identiques à celles héritées de `panelStyles`, aucun changement visuel).

- [ ] **Step 5: Vérification visuelle**

Playground docs, page `ar-breadcrumb`, réduire la fenêtre pour déclencher le mode mobile, ouvrir le dropdown de breadcrumb : le panel doit garder le même fond, la même bordure, le même radius et la même ombre qu'avant (ces valeurs viennent maintenant d'un alias scopé au lieu d'être héritées directement de `panelStyles`, mais pointent vers les mêmes tokens globaux).

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/styles/themes/default.css packages/core/src/components/breadcrumb/breadcrumb.styles.ts packages/core/src/components/breadcrumb/breadcrumb.ts
git commit -m "refactor(breadcrumb): complete les alias panel (bg, border-color, border-radius, shadow, padding)"
```

---

### Task 6 (Lot A.4): Compléter les alias panel de `ar-stepper`

**Files:**

- Modify: `packages/core/src/styles/themes/default.css` (section stepper lignes 357-379)
- Modify: `packages/core/src/components/stepper/stepper.styles.ts:44-48`
- Modify: `packages/core/src/components/stepper/stepper.ts` (JSDoc, après ligne 56)

**Interfaces:**

- Produces: `--ar-stepper-panel-bg`, `--ar-stepper-panel-border-color`, `--ar-stepper-panel-border-radius`, `--ar-stepper-panel-shadow`, `--ar-stepper-panel-padding` — même pattern que Task 5.

- [ ] **Step 1: Ajouter les 5 alias dans la section stepper de `default.css`**

Remplacer (lignes 376-377) :

```css
--ar-stepper-panel-min-width: var(--ar-panel-min-width);
--ar-stepper-panel-max-width: var(--ar-panel-max-width);
```

par :

```css
--ar-stepper-panel-min-width: var(--ar-panel-min-width);
--ar-stepper-panel-max-width: var(--ar-panel-max-width);
--ar-stepper-panel-bg: var(--ar-panel-bg);
--ar-stepper-panel-border-color: var(--ar-panel-border-color);
--ar-stepper-panel-border-radius: var(--ar-panel-radius);
--ar-stepper-panel-shadow: var(--ar-panel-shadow);
--ar-stepper-panel-padding: var(--ar-panel-padding);
```

- [ ] **Step 2: Appliquer les alias en surcharge scopée dans `stepper.styles.ts`**

Remplacer (lignes 44-48) :

```css
[part='panel'] {
    padding: 0.75rem;
    min-width: var(--ar-stepper-panel-min-width);
    max-width: var(--ar-stepper-panel-max-width);
}
```

par :

```css
[part='panel'] {
    padding: var(--ar-stepper-panel-padding);
    min-width: var(--ar-stepper-panel-min-width);
    max-width: var(--ar-stepper-panel-max-width);
    background-color: var(--ar-stepper-panel-bg);
    border-color: var(--ar-stepper-panel-border-color);
    border-radius: var(--ar-stepper-panel-border-radius);
    box-shadow: var(--ar-stepper-panel-shadow);
}
```

Note : la valeur en dur `0.75rem` est remplacée par l'alias `--ar-stepper-panel-padding`, qui par défaut vaut `var(--ar-panel-padding)` = `0.25rem` — **valeur différente** de l'ancien `0.75rem` codé en dur dans `stepper.styles.ts`. Pour ne pas changer le rendu visuel actuel, donner à l'alias `--ar-stepper-panel-padding` une valeur par défaut propre de `0.75rem` plutôt que de cascader depuis `--ar-panel-padding`. Corriger l'ajout de Step 1 en conséquence :

```css
--ar-stepper-panel-min-width: var(--ar-panel-min-width);
--ar-stepper-panel-max-width: var(--ar-panel-max-width);
--ar-stepper-panel-bg: var(--ar-panel-bg);
--ar-stepper-panel-border-color: var(--ar-panel-border-color);
--ar-stepper-panel-border-radius: var(--ar-panel-radius);
--ar-stepper-panel-shadow: var(--ar-panel-shadow);
/* Valeur propre (0.75rem), volontairement non cascadée depuis --ar-panel-padding :
           le panel disclosure du stepper a toujours eu un padding plus généreux que le
           défaut partagé (0.25rem) — même logique que --ar-dropdown-min-width. */
--ar-stepper-panel-padding: 0.75rem;
```

- [ ] **Step 3: Documenter les 5 nouveaux tokens dans `stepper.ts`**

Le JSDoc contient ligne 56 :

```
 * @cssprop --ar-stepper-panel-max-width - Largeur max du panel mobile (cascade vers --ar-panel-max-width).
```

Ajouter juste après :

```
 * @cssprop --ar-stepper-panel-max-width - Largeur max du panel mobile (cascade vers --ar-panel-max-width).
 * @cssprop --ar-stepper-panel-bg - Fond du panel mobile (cascade vers --ar-panel-bg).
 * @cssprop --ar-stepper-panel-border-color - Couleur de bordure du panel mobile (cascade vers --ar-panel-border-color).
 * @cssprop --ar-stepper-panel-border-radius - Border-radius du panel mobile (cascade vers --ar-panel-radius).
 * @cssprop --ar-stepper-panel-shadow - Ombre portée du panel mobile (cascade vers --ar-panel-shadow).
 * @cssprop --ar-stepper-panel-padding - Padding interne du panel mobile. Valeur propre (0.75rem), non cascadée depuis --ar-panel-padding.
```

- [ ] **Step 4: Vérifier la couverture `@cssprop` et les tests**

Run: `npm run build:manifest --workspace=@ariane-ui/core`
Expected: succès.

Run: `npx vitest run packages/core/src/components/stepper --root /Users/jon/Code/Active_projects/ariane`
Expected: tous les tests passent.

- [ ] **Step 5: Vérification visuelle**

Playground docs, page `ar-stepper`, mode mobile, ouvrir le panel disclosure : padding, fond, bordure, radius et ombre doivent être visuellement identiques à avant (le padding reste `0.75rem`, les 4 autres valeurs restent celles de `--ar-panel-*`).

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/styles/themes/default.css packages/core/src/components/stepper/stepper.styles.ts packages/core/src/components/stepper/stepper.ts
git commit -m "refactor(stepper): complete les alias panel (bg, border-color, border-radius, shadow, padding)"
```

---

### Task 7 (Lot A.5): Aliaser `--ar-tooltip-show-duration` pour `ar-tooltip`

**Files:**

- Modify: `packages/core/src/styles/themes/default.css` (section tooltip lignes 398-407)
- Modify: `packages/core/src/components/tooltip/tooltip.styles.ts:37-39`
- Modify: `packages/core/src/components/tooltip/tooltip.ts` (JSDoc, après ligne 41)

**Interfaces:**

- Produces: `--ar-tooltip-show-duration` (alias de `--ar-panel-show-duration`, valeur `0.2s`).

- [ ] **Step 1: Ajouter l'alias dans la section tooltip de `default.css`**

Remplacer (ligne 407) :

```css
--ar-tooltip-arrow-size: 6px;
```

par :

```css
--ar-tooltip-arrow-size: 6px;
--ar-tooltip-show-duration: var(--ar-panel-show-duration);
```

- [ ] **Step 2: Utiliser l'alias dans `tooltip.styles.ts`**

Remplacer (lignes 37-39) :

```css
[part='bubble']:popover-open {
    animation: arPanelShow var(--ar-panel-show-duration) ease-out;
}
```

par :

```css
[part='bubble']:popover-open {
    animation: arPanelShow var(--ar-tooltip-show-duration) ease-out;
}
```

- [ ] **Step 3: Documenter le token dans `tooltip.ts`**

Le JSDoc se termine ligne 41 par :

```
 * @cssprop --ar-tooltip-arrow-size - Taille du caret.
```

Ajouter juste après :

```
 * @cssprop --ar-tooltip-arrow-size - Taille du caret.
 * @cssprop --ar-tooltip-show-duration - Durée de l'animation d'apparition de la bulle (cascade vers --ar-panel-show-duration).
```

- [ ] **Step 4: Vérifier la couverture `@cssprop` et les tests**

Run: `npm run build:manifest --workspace=@ariane-ui/core`
Expected: succès.

Run: `npx vitest run packages/core/src/components/tooltip --root /Users/jon/Code/Active_projects/ariane`
Expected: tous les tests passent, durée d'animation inchangée (`0.2s`).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/styles/themes/default.css packages/core/src/components/tooltip/tooltip.styles.ts packages/core/src/components/tooltip/tooltip.ts
git commit -m "fix(tooltip): alias --ar-tooltip-show-duration au lieu de consommer --ar-panel-show-duration directement"
```

---

### Task 8 (Lot B.6): Supprimer `--ar-pagination-radius`, token sans effet

**Files:**

- Modify: `packages/core/src/styles/themes/default.css:393`
- Modify: `packages/core/src/components/pagination/pagination.styles.ts:9-17`
- Modify: `packages/core/src/components/pagination/pagination.ts:41`

**Interfaces:** aucune — suppression pure d'un token mort. `.pagination` n'a ni `background` ni `border` dans `pagination.styles.ts` : un `border-radius` sur cet élément est sans effet visuel constatable.

- [ ] **Step 1: Vérifier qu'aucun test ne référence ce token**

Run: `grep -rn "pagination-radius" packages/core/src`
Expected (avant modification) : 3 occurrences — `default.css:393`, `pagination.styles.ts:12`, `pagination.ts:41`. Aucune dans `pagination.test.ts` ni `pagination.a11y.test.ts` (confirmé pendant l'audit — pas de test à mettre à jour).

- [ ] **Step 2: Supprimer la déclaration dans `default.css`**

Remplacer (lignes 392-393) :

```css
--ar-pagination-bg-focus: var(--ar-button-tertiary-bg-focus);
--ar-pagination-radius: var(--ar-border-radius-lg);
```

par :

```css
--ar-pagination-bg-focus: var(--ar-button-tertiary-bg-focus);
```

- [ ] **Step 3: Supprimer la ligne `border-radius` dans `pagination.styles.ts`**

Remplacer (lignes 9-17) :

```css
.pagination {
    padding-left: 0;
    list-style: none;
    border-radius: var(--ar-pagination-radius);
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    margin-bottom: 0;
}
```

par :

```css
.pagination {
    padding-left: 0;
    list-style: none;
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    margin-bottom: 0;
}
```

- [ ] **Step 4: Supprimer l'entrée `@cssprop` dans `pagination.ts`**

Remplacer (ligne 41) :

```
 * @cssprop --ar-pagination-radius - Arrondi du conteneur de pagination.
 * @cssprop --ar-pagination-active-color - Couleur de la page active (texte + bordure).
```

par :

```
 * @cssprop --ar-pagination-active-color - Couleur de la page active (texte + bordure).
```

- [ ] **Step 5: Vérifier la couverture `@cssprop` et les tests**

Run: `npm run build:manifest --workspace=@ariane-ui/core`
Expected: succès (suppression symétrique token + JSDoc, pas de trou de couverture).

Run: `npx vitest run packages/core/src/components/pagination --root /Users/jon/Code/Active_projects/ariane`
Expected: `pagination.test.ts` et `pagination.a11y.test.ts` passent sans modification.

- [ ] **Step 6: Vérification visuelle**

Playground docs, page `ar-pagination` : aucun changement visuel attendu (le token n'avait aucun effet observable avant suppression).

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/styles/themes/default.css packages/core/src/components/pagination/pagination.styles.ts packages/core/src/components/pagination/pagination.ts
git commit -m "fix(pagination): supprime --ar-pagination-radius, token sans effet visuel"
```

---

### Task 9 (Lot B.7): Supprimer le token orphelin `--ar-table-padding-x`

**Files:**

- Modify: `packages/core/src/styles/themes/default.css:460-461`

**Interfaces:** aucune — suppression pure. Confirmé par `grep -rn "ar-table-padding-x" packages/core/src apps/docs/src` : zéro consommateur dans tout le repo (ni dans les composants `table-sort`, ni ailleurs).

- [ ] **Step 1: Supprimer la déclaration**

Remplacer (lignes 459-462) :

```css
/* table */
--ar-table-padding-x: 1rem;

/* charcounter */
```

par :

```css
/* charcounter */
```

- [ ] **Step 2: Vérifier qu'aucune référence ne subsiste**

Run: `grep -rn "ar-table-padding-x" packages/core/src apps/docs/src`
Expected: aucune occurrence (commande retourne vide, code de sortie 1).

- [ ] **Step 3: Vérifier la couverture `@cssprop` et les tests**

Run: `npm run build:manifest --workspace=@ariane-ui/core`
Expected: succès (le token n'était documenté nulle part, sa suppression ne peut pas créer de trou de couverture inverse).

Run: `npx vitest run packages/core/src/components/table-sort --root /Users/jon/Code/Active_projects/ariane`
Expected: tous les tests passent, aucune dépendance à ce token.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/styles/themes/default.css
git commit -m "chore(theme): supprime --ar-table-padding-x, token orphelin sans consommateur"
```

---

### Task 10 (Lot C.8): Documenter `--ar-dialog-spacing-block`/`-inline` comme points d'extension dans `default.css`

**Files:**

- Modify: `packages/core/src/styles/themes/default.css` (section dialog, lignes 439-454)

**Interfaces:** aucun nouveau token déclaré — commentaire de découvrabilité uniquement. `--ar-dialog-spacing-block`/`--ar-dialog-spacing-inline` restent non déclarés dans `default.css` ; ils sont déjà documentés en `@cssprop` dans `dialog.ts` (lignes 75-76) et consommés avec fallback dans `dialog.styles.ts:174-175` (`padding-block: var(--ar-dialog-spacing-block, var(--ar-dialog-spacing))`).

- [ ] **Step 1: Ajouter le commentaire dans la section dialog de `default.css`**

Remplacer (ligne 448) :

```css
--ar-dialog-spacing: 1.25rem;
```

par :

```css
--ar-dialog-spacing: 1.25rem;
/* --ar-dialog-spacing-block / --ar-dialog-spacing-inline : points d'extension
           optionnels, consommés avec fallback dans dialog.styles.ts (padding-block/-inline
           de [part='body']). Volontairement non déclarés ici — --ar-dialog-spacing suffit
           par défaut ; les définir permet de différencier le padding vertical/horizontal
           sans surcharge globale de --ar-dialog-spacing. */
```

- [ ] **Step 2: Vérifier la couverture `@cssprop`**

Run: `npm run build:manifest --workspace=@ariane-ui/core`
Expected: succès. Ces deux tokens sont déjà documentés en `@cssprop` dans `dialog.ts` sans être déclarés dans `default.css` — situation déjà tolérée par `validate-cssprop-defaults.js` avant ce changement (le script vérifie que chaque token de `default.css` a un `@cssprop`, pas l'inverse). Ce commentaire n'affecte donc pas le résultat du script, il améliore uniquement la découvrabilité pour un humain qui lit `default.css`.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/styles/themes/default.css
git commit -m "docs(theme): documente --ar-dialog-spacing-block/-inline comme points d'extension optionnels"
```

---

### Task 11 (Lot C.9): Documenter la dépendance `ar-tab` → `ar-tab-group` dans le JSDoc

**Files:**

- Modify: `packages/core/src/components/tab/tab.ts` (JSDoc, après ligne 30)

**Interfaces:** aucun nouveau token — documentation uniquement. Le fallback structurel `0px` dans `tab.styles.ts:20-21` (`var(--ar-tab-group-border-top-width, 0px)` / `var(--ar-tab-group-border-bottom-width, 0px)`) reste inchangé, conformément à la philosophie headless (fallback structurel autorisé).

- [ ] **Step 1: Ajouter la note JSDoc dans `tab.ts`**

Le JSDoc de `ar-tab` se termine ligne 30 par :

```
 * @cssprop --ar-tab-focus-ring-offset - Décalage de la bague de focus. Valeur négative = inset (non coupée par le conteneur overflow du tab-group). Surcharge le token global --ar-focus-ring-offset pour ce composant.
```

Ajouter juste après, avant la ligne `export class ArTab extends LitElement {` :

```
 * @cssprop --ar-tab-focus-ring-offset - Décalage de la bague de focus. Valeur négative = inset (non coupée par le conteneur overflow du tab-group). Surcharge le token global --ar-focus-ring-offset pour ce composant.
 *
 * Note d'implémentation : la mise en page de [part='base'] compense la bordure de son parent
 * ar-tab-group via les tokens --ar-tab-group-border-top-width / --ar-tab-group-border-bottom-width
 * (déclarés et documentés sur ar-tab-group, cf. tab-group.ts) — pas des tokens propres à ar-tab.
 * Le fallback 0px est structurel (évite un décalage visuel si ar-tab est utilisé hors d'un
 * ar-tab-group) et reste volontaire.
```

- [ ] **Step 2: Vérifier la couverture `@cssprop` et les tests**

Run: `npm run build:manifest --workspace=@ariane-ui/core`
Expected: succès (aucun nouveau token, un commentaire JSDoc de prose n'est pas parsé comme `@cssprop`).

Run: `npx vitest run packages/core/src/components/tab --root /Users/jon/Code/Active_projects/ariane`
Expected: tous les tests passent (aucun changement de code).

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/components/tab/tab.ts
git commit -m "docs(tab): documente la dependance de mise en page vers --ar-tab-group-border-*-width du parent"
```

---

### Task 12 (Lot D.10): Rapatrier la transition `ar-collapse::part(panel)` dans `collapse.styles.ts`

**Files:**

- Modify: `packages/core/src/components/collapse/collapse.styles.ts:14-16`
- Modify: `packages/core/src/styles/themes/default.css:802-804`

**Interfaces:** aucun nouveau token — `--ar-collapse-duration`/`--ar-collapse-easing` existent déjà (`default.css:457-458`, documentés dans `collapse.ts:21-22`). Seul le point de câblage change : de `ar-collapse::part(panel)` (règle externe hors `:root`, dépend du chargement de `default.css`) vers `[part='panel']` dans `collapse.styles.ts` (règle interne au composant, fonctionne même sans thème chargé).

- [ ] **Step 1: Ajouter la transition dans `collapse.styles.ts`**

Remplacer (lignes 14-16) :

```css
[part='panel'] {
    overflow: hidden;
}
```

par :

```css
[part='panel'] {
    overflow: hidden;
    transition: height var(--ar-collapse-duration) var(--ar-collapse-easing);
}
```

- [ ] **Step 2: Supprimer la règle devenue redondante dans `default.css`**

Remplacer (lignes 801-805, dernier bloc du fichier avant la fermeture de `@layer`) :

```css
    ar-collapse::part(panel) {
        transition: height var(--ar-collapse-duration) var(--ar-collapse-easing);
    }
}
```

par :

```css
}
```

- [ ] **Step 3: Vérifier la couverture `@cssprop` et les tests**

Run: `npm run build:manifest --workspace=@ariane-ui/core`
Expected: succès — `--ar-collapse-duration`/`--ar-collapse-easing` restent déclarés dans `default.css` (section `/* collapse */`, lignes 456-458), seule la règle de câblage externe est supprimée.

Run: `npx vitest run packages/core/src/components/collapse --root /Users/jon/Code/Active_projects/ariane`
Expected: tous les tests passent.

- [ ] **Step 4: Vérification visuelle**

Playground docs, page `ar-collapse` : ouvrir/fermer le panel doit toujours transitionner en hauteur avec la même durée/easing qu'avant (`--ar-collapse-duration` vaut `0s` par défaut dans `default.css`, donc pas de transition visible par défaut — surcharger `--ar-collapse-duration: 0.3s` localement dans le playground pour vérifier que l'animation fonctionne bien depuis le composant seul, y compris si `default.css` n'est pas chargé — désactiver temporairement le lien vers `default.css` dans les devtools pour confirmer que la transition persiste, contrairement à avant ce correctif).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/components/collapse/collapse.styles.ts packages/core/src/styles/themes/default.css
git commit -m "refactor(collapse): rapatrie la transition height dans collapse.styles.ts au lieu d'une regle externe dans default.css"
```

---

### Task 13 (Lot E.11): Remplacer `--ar-color-danger-50` par `--ar-color-danger-text` dans `ar-dialog`

**Files:**

- Modify: `packages/core/src/components/dialog/dialog.styles.ts:230`

**Interfaces:** aucun nouveau token — remplacement d'un token de palette brute (`--ar-color-danger-50`, section 1 « PALETTE BRUTE » de `default.css`, censée ne jamais être consommée directement par les composants) par le token sémantique déjà utilisé pour ce même usage ailleurs dans le thème (`--ar-color-danger-text`, utilisé par `--ar-alert-error-icon`, `--ar-charcounter-error-color`, `--ar-datepicker-error-color` — cf. commentaire `default.css:513-514`).

- [ ] **Step 1: Remplacer le token dans le bloc `prefers-reduced-motion`**

Remplacer (lignes 228-232) :

```css
dialog.shake {
    animation: none;
    outline: 3px solid var(--ar-color-danger-50);
    outline-offset: 2px;
}
```

par :

```css
dialog.shake {
    animation: none;
    outline: 3px solid var(--ar-color-danger-text);
    outline-offset: 2px;
}
```

- [ ] **Step 2: Vérifier la couverture `@cssprop`**

Run: `npm run build:manifest --workspace=@ariane-ui/core`
Expected: succès. `--ar-color-danger-text` est un token sémantique global (section 3 de `default.css`), pas un token de composant — il n'a pas besoin d'entrée `@cssprop` sur `ar-dialog` (même statut que `--ar-color-bg`/`--ar-color-text` déjà consommés directement dans `dialog.styles.ts:77-78` sans JSDoc dédié).

Run: `npx vitest run packages/core/src/components/dialog --root /Users/jon/Code/Active_projects/ariane`
Expected: tous les tests passent.

- [ ] **Step 3: Vérification visuelle**

Cette règle ne s'applique qu'en `prefers-reduced-motion: reduce`, comme remplacement visuel du shake animé. Activer "reduce motion" dans les préférences système (ou émuler via devtools : Rendering → Emulate CSS media feature `prefers-reduced-motion`), déclencher une tentative de fermeture bloquée d'un `ar-dialog` (ex. dialog avec `data-dismissable="false"` ou action requise), et vérifier que l'anneau `outline` reste visuellement rouge/danger en light et en dark (`--ar-color-danger-text` vaut `--ar-color-danger-40` en light et `--ar-color-danger-70` en dark — plus lisible en contexte `outline` que `--ar-color-danger-50` qui n'a pas d'adaptation dark explicite).

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/components/dialog/dialog.styles.ts
git commit -m "fix(dialog): utilise le token semantique --ar-color-danger-text au lieu de la palette brute --ar-color-danger-50"
```

---

### Task 14: Ouvrir la Pull Request

**Files:** aucun fichier modifié — opération git/GitHub uniquement.

- [ ] **Step 1: Pousser la branche**

```bash
cd /Users/jon/Code/Active_projects/ariane
git push -u origin fix/audit-tokens-125
```

- [ ] **Step 2: Lancer la suite de tests complète et le build du manifest une dernière fois**

Run: `npm run build:manifest --workspace=@ariane-ui/core && npm run test`
Expected: build du manifest réussi, tous les tests passent (racine, `turbo run test`).

- [ ] **Step 3: Créer la PR vers `dev`**

```bash
gh pr create --base dev --title "fix: corrige les tokens exposés par défaut.css (audit #125)" --body "$(cat <<'EOF'
## Summary
- Aliase les dépendances croisées entre composants (alert→button, datepicker→panel×2, breadcrumb/stepper→panel complet, tooltip→panel) sur le pattern déjà établi par ar-dropdown (ADR-005)
- Supprime deux tokens sans effet ou orphelins (--ar-pagination-radius, --ar-table-padding-x)
- Documente deux incohérences (--ar-dialog-spacing-block/-inline non déclarés dans default.css, dépendance ar-tab → ar-tab-group)
- Rapatrie la transition height d'ar-collapse depuis une règle externe de default.css vers collapse.styles.ts
- Remplace un token de palette brute (--ar-color-danger-50) par son équivalent sémantique (--ar-color-danger-text) dans ar-dialog

Closes #125

## Test plan
- [ ] `npm run build:manifest` passe sans erreur de couverture @cssprop sur les 19 composants
- [ ] `npm run test` (suite Vitest complète) passe
- [ ] Vérification visuelle manuelle : ar-datepicker (focus ring + panel calendrier), ar-breadcrumb/ar-stepper (panel mobile), ar-collapse (transition sans default.css chargé), ar-dialog (outline shake en reduced-motion)
EOF
)"
```

- [ ] **Step 4: Confirmer la création**

Run: `gh pr view --web` (ou noter l'URL retournée par `gh pr create`)
Expected: PR ouverte vers `dev`, CI déclenchée.

---

## Self-Review

**1. Couverture spec (11 constats + branche/PR) :**

- Constat 1 (alert) → Task 2. ✓
- Constat 2 (datepicker panel-bg) → Task 3. ✓
- Constat 3 (datepicker panel max-width/padding) → Task 4. ✓
- Constat 4 (breadcrumb + stepper) → Tasks 5 et 6 (scindé en deux tâches car deux composants indépendamment testables). ✓
- Constat 5 (tooltip) → Task 7. ✓
- Constat 6 (pagination-radius) → Task 8. ✓
- Constat 7 (table-padding-x) → Task 9. ✓
- Constat 8 (dialog spacing comment) → Task 10. ✓
- Constat 9 (tab JSDoc) → Task 11. ✓
- Constat 10 (collapse) → Task 12. ✓
- Constat 11 (dialog danger-50) → Task 13. ✓
- Branche (Task 1) et PR (Task 14) encadrent le tout, conformément à la convention du projet.

**2. Scan de placeholders :** aucun « TBD »/« TODO »/« implémenter plus tard » — chaque step contient le diff exact avec numéros de ligne réels lus dans le code source actuel.

**3. Cohérence des noms :** vérifié que les noms de tokens introduits dans une tâche (ex. `--ar-datepicker-panel-max-width` en Task 4) sont réutilisés à l'identique dans les steps suivants de la même tâche (JSDoc, styles.ts). Vérifié que `--ar-stepper-panel-padding` a une valeur par défaut propre (`0.75rem`) et non cascadée, contrairement aux 4 autres alias stepper — divergence assumée et documentée en Step 2/Step 3 de Task 6 pour ne pas changer le rendu visuel actuel.

---

## Écarts par rapport aux instructions initiales (à vérifier)

1. **Nommage des alias panel breadcrumb/stepper (Task 5, 6)** : l'audit demandait des noms génériques `-radius`/`-color`. Le code réel de `ar-dropdown` (le pattern de référence explicitement cité) nomme ces alias `--ar-dropdown-border-radius` et `--ar-dropdown-border-color` (pas `-radius`/`-color` tout court). J'ai suivi cette convention exacte : `--ar-breadcrumb-panel-border-radius`, `--ar-breadcrumb-panel-border-color` (idem stepper). À valider que c'est bien l'intention plutôt que des noms courts.
2. **`--ar-stepper-panel-padding` (Task 6)** : `stepper.styles.ts` avait un padding en dur `0.75rem` sur `[part='panel']`, différent de `--ar-panel-padding` (`0.25rem`). Pour ne pas changer le rendu, j'ai donné à ce nouvel alias une valeur propre `0.75rem` non cascadée, au lieu de `var(--ar-panel-padding)` comme les 4 autres alias stepper/breadcrumb. C'est cohérent avec le commentaire déjà présent dans `default.css` pour `--ar-dropdown-min-width` (valeur propre assumée), mais c'est une décision que je prends unilatéralement — à confirmer.
3. **Task 8 (pagination-radius)** : confirmé par grep qu'aucun test ne référence ce token avant de proposer sa suppression sans modification de test — pas d'écart, mais je le signale car l'instruction demandait explicitement de vérifier ce point.
4. Aucun autre écart constaté : tous les autres noms de fichiers, lignes et valeurs correspondent exactement à ce qui est décrit dans les constats validés.
