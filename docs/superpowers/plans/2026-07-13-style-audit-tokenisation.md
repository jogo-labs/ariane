# Passe style v1 — PR (a) : Tokenisation + suppression CSS mort

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Éliminer les valeurs de design codées en dur restantes (couleurs, radius, ombres, fallback cosmétique) et le CSS mort identifiés par l'audit du 2026-07-13 sur `packages/core/src/**/*.styles.ts`, sans changer le rendu visuel d'aucun composant.

**Architecture:** Chaque tâche touche un seul fichier de style (+ son fichier de rendu `.ts` si une classe partagée doit être retirée du template), ajoute les tokens `--ar-*` manquants dans `packages/core/src/styles/themes/default.css`, puis vérifie par `grep` que la valeur littérale a disparu et que le token existe. Aucune valeur numérique ne change — c'est un renommage/déplacement, pas une re-conception (l'harmonisation des incohérences relevées par l'audit — durées de transition, radius non harmonisés — est un chantier séparé, PR (c)).

**Tech Stack:** Lit 3 (`css` tagged template literals), CSS custom properties, Vitest (`npm run test`), tests navigateur WTR (`npm run test:all`).

## Global Constraints

- Aucun fallback cosmétique dans un composant (`var(--token, valeur-de-design)`) — seuls les fallbacks structurels (`0px`, ou une **variable** de repli comme `var(--a, var(--b))`) sont acceptables.
- Toute valeur de design va dans `packages/core/src/styles/themes/default.css`, jamais codée en dur dans un fichier `*.styles.ts`.
- Prettier : 100 caractères, 4 espaces, guillemets simples (`npm run format` ou le hook `lint-staged` au commit s'en charge).
- Branches `fix/<desc>` depuis `dev`, PR vers `dev`.
- Aucune valeur numérique ne doit changer suite à ce plan (parité visuelle stricte) — seul le §Task 2 (suppression de `.btn-tertiary.dark`) et §Task 3 (suppression de `.light`) retirent du rendu, volontairement (code confirmé mort).

---

### Task 1: Créer la branche de travail

**Files:** aucun.

- [ ] **Step 1: Créer et checkout la branche depuis `dev`**

```bash
cd /Users/jon/Code/Active_projects/ariane
git checkout dev
git pull
git checkout -b fix/style-audit-tokenisation
```

Expected: la branche `fix/style-audit-tokenisation` est active (`git branch --show-current`).

---

### Task 2: `button.styles.ts` — supprimer le variant mort `.btn-tertiary.dark` et ses tokens

**Contexte :** vérifié par `grep -rn "btn-tertiary" packages/core/src/components/` — aucune vue du repo n'applique jamais la classe `dark` sur un `.btn`. Le commit `b55c1f0` a par erreur tokenisé ce bloc mort au lieu de le supprimer ; ce commit corrige le tir en supprimant le bloc ET les 4 tokens qu'il avait introduits.

**Files:**

- Modify: `packages/core/src/styles/components/button.styles.ts` (bloc `.btn-tertiary.dark`, lignes ~178-210)
- Modify: `packages/core/src/styles/themes/default.css` (retirer les 4 tokens `--ar-button-tertiary-dark-*` ajoutés en `b55c1f0`, ligne ~331-334)

**Interfaces:**

- Consumes: rien
- Produces: rien (suppression pure)

- [ ] **Step 1: Vérifier qu'aucun usage de `.dark` sur un bouton n'existe**

```bash
grep -rn '\.dark' packages/core/src/components/*/[a-z]*.ts 2>/dev/null | grep -v '\.styles\.ts' | grep -i btn
```

Expected: aucune sortie (confirme le code mort avant suppression).

- [ ] **Step 2: Supprimer le bloc `.btn-tertiary.dark` dans `button.styles.ts`**

Retirer entièrement ce bloc (4 règles : base, hover, active, focus) :

```css
.btn-tertiary.dark,
a.btn-tertiary:not([aria-disabled='true']).dark {
    background-color: var(--ar-button-tertiary-dark-bg);
    border-width: 0;
    color: var(--ar-color-white);
}

.btn-tertiary.dark:hover,
a.btn-tertiary:not([aria-disabled='true']).dark:hover {
    background-color: var(--ar-button-tertiary-dark-bg-hover);
}

.btn-tertiary.dark:not(:disabled):not(.disabled):not([aria-disabled='true']).active,
.btn-tertiary.dark:not(:disabled):not(.disabled):not([aria-disabled='true']):active,
.btn-tertiary.dark:not(:disabled):not(.disabled):not([aria-disabled='true']):active:focus,
a.btn-tertiary:not([aria-disabled='true']).dark:not(:disabled):not(.disabled):not(
        [aria-disabled='true']
    ).active,
a.btn-tertiary:not([aria-disabled='true']).dark:not(:disabled):not(.disabled):not(
        [aria-disabled='true']
    ):active,
a.btn-tertiary:not([aria-disabled='true']).dark:not(:disabled):not(.disabled):not(
        [aria-disabled='true']
    ):active:focus {
    background-color: var(--ar-button-tertiary-dark-bg-active);
    -webkit-box-shadow: 0 1px 4px 0 rgba(0, 0, 0, 0.25) inset;
    box-shadow: inset 0 1px 4px 0 rgba(0, 0, 0, 0.25);
}

.btn-tertiary.dark:focus,
a.btn-tertiary:not([aria-disabled='true']).dark:focus {
    background-color: var(--ar-button-tertiary-dark-bg-focus);
}
```

- [ ] **Step 3: Retirer les 4 tokens devenus orphelins dans `default.css`**

Dans `packages/core/src/styles/themes/default.css`, supprimer :

```css
--ar-button-tertiary-dark-bg: hsla(0, 0%, 100%, 0.1);
--ar-button-tertiary-dark-bg-hover: hsla(0, 0%, 9%, 0.3);
--ar-button-tertiary-dark-bg-active: hsla(0, 0%, 9%, 0.5);
--ar-button-tertiary-dark-bg-focus: hsla(0, 0%, 9%, 0.4);
```

- [ ] **Step 4: Vérifier qu'il ne reste plus aucune trace**

```bash
grep -rn "tertiary-dark\|btn-tertiary.dark" packages/core/src
```

Expected: aucune sortie.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/styles/components/button.styles.ts packages/core/src/styles/themes/default.css
git commit -m "fix(button): retire le variant .btn-tertiary.dark, jamais utilisé"
```

---

### Task 3: `button.styles.ts` + `dialog.*` — supprimer le modificateur `.light` redondant

**Contexte :** `.btn-tertiary.light` produit exactement les mêmes règles que `.btn-tertiary` seul (mêmes 4 propriétés dans les 4 états — vérifié par lecture du fichier). Le seul appelant qui pose `.light` est `dialog.ts:253` (`class="btn btn-tertiary light btn-ratio-square"`), et `dialog.styles.ts` s'appuie sur `.light` uniquement pour gagner en spécificité CSS (`[part='close'].btn.btn-tertiary.light`), pas pour une différence de valeur. On peut retirer `.light` partout : la spécificité du sélecteur `[part='close'].btn.btn-tertiary` (attribut + 2 classes) reste supérieure à `.btn-tertiary` seul (1 classe) dans `button.styles.ts`.

**Files:**

- Modify: `packages/core/src/styles/components/button.styles.ts` (retirer les 8 occurrences `.light`/`).light` dans le bloc `.btn-tertiary`)
- Modify: `packages/core/src/components/dialog/dialog.ts:253` (retirer la classe `light`)
- Modify: `packages/core/src/components/dialog/dialog.styles.ts` (retirer `.light` des 4 sélecteurs `[part='close']...`, mettre à jour le commentaire)

**Interfaces:**

- Consumes: rien
- Produces: rien

- [ ] **Step 1: Confirmer qu'aucun autre appelant n'utilise `.light`**

```bash
grep -rn '"btn[^"]*light' packages/core/src/components/*/[a-z]*.ts | grep -v '\.styles\.ts'
```

Expected: seule ligne `dialog.ts:253`.

- [ ] **Step 2: Simplifier les 4 règles `.btn-tertiary` dans `button.styles.ts`**

Retirer les sélecteurs `.btn-tertiary.light` et `a.btn-tertiary:not([aria-disabled='true']).light` des 4 groupes de sélecteurs (base, hover, active, focus). Exemple pour la règle de base :

```css
.btn-tertiary,
a.btn-tertiary:not([aria-disabled='true']) {
    background-color: var(--ar-button-tertiary-bg);
    color: var(--ar-color-text);
}
```

Appliquer la même simplification aux 3 autres groupes (`:hover`, `:active`, `:focus`), en gardant les valeurs identiques.

- [ ] **Step 3: Retirer la classe `light` du template `dialog.ts`**

Dans `packages/core/src/components/dialog/dialog.ts:253` :

```ts
class="btn btn-tertiary btn-ratio-square"
```

- [ ] **Step 4: Simplifier les sélecteurs et le commentaire dans `dialog.styles.ts`**

Remplacer :

```css
/* ── Bouton de fermeture (tokens scopés au composant) ────────────────────
 * Sélecteurs volontairement plus spécifiques que .btn-tertiary.light dans
 * button.styles.ts (ajout de [part='close'].btn) pour gagner la cascade
 * indépendamment de l'ordre des styles. */

[part='close'].btn.btn-tertiary.light {
```

par :

```css
/* ── Bouton de fermeture (tokens scopés au composant) ────────────────────
 * Sélecteurs volontairement plus spécifiques que .btn-tertiary dans
 * button.styles.ts (ajout de [part='close'].btn) pour gagner la cascade
 * indépendamment de l'ordre des styles. */

[part='close'].btn.btn-tertiary {
```

et retirer `.light` des 3 autres sélecteurs `[part='close'].btn.btn-tertiary.light:hover`, `...:active`, `...:focus` du même bloc.

- [ ] **Step 5: Vérifier qu'il ne reste plus de `.light` sur un bouton**

```bash
grep -rn "btn-tertiary.light\|btn-tertiary light" packages/core/src
```

Expected: aucune sortie.

- [ ] **Step 6: Lancer les tests du composant dialog**

```bash
npx vitest run packages/core/src/components/dialog --root packages/core
```

Expected: tous les tests passent (aucun test n'assert sur la présence de la classe `light`).

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/styles/components/button.styles.ts packages/core/src/components/dialog/dialog.ts packages/core/src/components/dialog/dialog.styles.ts
git commit -m "fix(button,dialog): retire le modificateur .light, redondant avec la règle de base"
```

---

### Task 4: `button.styles.ts` — tokeniser l'ombre `rgba` restante sur `.btn-tertiary:active`

**Files:**

- Modify: `packages/core/src/styles/themes/default.css` (ajouter le token, section button ~ligne 330)
- Modify: `packages/core/src/styles/components/button.styles.ts` (ligne ~164-165, seule occurrence restante après Task 2)

**Interfaces:**

- Consumes: rien
- Produces: `--ar-button-tertiary-active-shadow` (consommé uniquement ici)

- [ ] **Step 1: Ajouter le token dans `default.css`**

Dans la section `/* button */` de `:root`, juste après `--ar-button-tertiary-bg-focus` :

```css
--ar-button-tertiary-active-shadow: 0 1px 4px 0 rgba(0, 0, 0, 0.25);
```

- [ ] **Step 2: Utiliser le token dans `button.styles.ts`**

Remplacer :

```css
.btn-tertiary:not(:disabled):not(.disabled):not([aria-disabled='true']).active,
.btn-tertiary:not(:disabled):not(.disabled):not([aria-disabled='true']):active,
a.btn-tertiary:not([aria-disabled='true']):not(:disabled):not(.disabled):not(
        [aria-disabled='true']
    ).active,
a.btn-tertiary:not([aria-disabled='true']):not(:disabled):not(.disabled):not(
        [aria-disabled='true']
    ):active {
    background-color: var(--ar-button-tertiary-bg-active);
    border-color: var(--ar-button-tertiary-bg-active);
    -webkit-box-shadow: 0 1px 4px 0 rgba(0, 0, 0, 0.25) inset;
    box-shadow: inset 0 1px 4px 0 rgba(0, 0, 0, 0.25);
    color: var(--ar-color-white);
}
```

par :

```css
.btn-tertiary:not(:disabled):not(.disabled):not([aria-disabled='true']).active,
.btn-tertiary:not(:disabled):not(.disabled):not([aria-disabled='true']):active,
a.btn-tertiary:not([aria-disabled='true']):not(:disabled):not(.disabled):not(
        [aria-disabled='true']
    ).active,
a.btn-tertiary:not([aria-disabled='true']):not(:disabled):not(.disabled):not(
        [aria-disabled='true']
    ):active {
    background-color: var(--ar-button-tertiary-bg-active);
    border-color: var(--ar-button-tertiary-bg-active);
    -webkit-box-shadow: var(--ar-button-tertiary-active-shadow) inset;
    box-shadow: inset var(--ar-button-tertiary-active-shadow);
    color: var(--ar-color-white);
}
```

- [ ] **Step 3: Vérifier qu'aucun `rgba` ne reste dans le fichier**

```bash
grep -n "rgba\|hsla" packages/core/src/styles/components/button.styles.ts
```

Expected: aucune sortie.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/styles/themes/default.css packages/core/src/styles/components/button.styles.ts
git commit -m "fix(button): tokenise l'ombre rgba de .btn-tertiary:active"
```

---

### Task 5: `dialog.styles.ts` — retirer le fallback cosmétique `1.25rem` et tokeniser radius/font-size

**Contexte :** `--spacing`/`--spacing-block`/`--spacing-inline` sont une API publique documentée (`@cssprop` dans `dialog.ts`). Le précédent du même fichier pour ce genre d'API publique est `--width`, défini avec une vraie valeur par défaut sur `:host` (pas un fallback littéral dans `var()`). On applique le même traitement à `--spacing`.

**Files:**

- Modify: `packages/core/src/components/dialog/dialog.styles.ts`

**Interfaces:**

- Consumes: `--ar-border-radius-lg` (0.5rem), `--ar-font-size-md` (1rem) — déjà définis dans `default.css`
- Produces: rien

- [ ] **Step 1: Définir `--spacing` par défaut sur `:host`, comme `--width`**

Remplacer :

```css
:host {
    display: block;

    /* Taille modale par défaut (md = 500px). Surchargeable par --width sur l'instance. */
    --width: 500px;
}
```

par :

```css
:host {
    display: block;

    /* Taille modale par défaut (md = 500px). Surchargeable par --width sur l'instance. */
    --width: 500px;
    /* Padding interne par défaut. Surchargeable par --spacing/--spacing-block/--spacing-inline sur l'instance. */
    --spacing: 1.25rem;
}
```

- [ ] **Step 2: Retirer le fallback littéral dans les règles de padding**

Remplacer :

```css
[part='body'] {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding-block: var(--spacing-block, var(--spacing, 1.25rem));
    padding-inline: var(--spacing-inline, var(--spacing, 1.25rem));
}
```

par :

```css
[part='body'] {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding-block: var(--spacing-block, var(--spacing));
    padding-inline: var(--spacing-inline, var(--spacing));
}
```

- [ ] **Step 3: Remplacer le border-radius et le font-size codés en dur par les tokens primitifs partagés**

Remplacer :

```css
        :host(:not([mode='drawer'])) dialog {
            border-radius: 0.5rem;
```

par :

```css
        :host(:not([mode='drawer'])) dialog {
            border-radius: var(--ar-border-radius-lg);
```

Remplacer :

```css
        h1 {
            margin: 0;
            font-size: 1rem;
```

par :

```css
        h1 {
            margin: 0;
            font-size: var(--ar-font-size-md);
```

- [ ] **Step 4: Vérifier qu'aucune valeur codée en dur ne reste**

```bash
grep -nE "(border-radius|font-size)\s*:\s*[0-9]" packages/core/src/components/dialog/dialog.styles.ts
grep -n "1.25rem" packages/core/src/components/dialog/dialog.styles.ts
```

Expected: aucune sortie pour les deux commandes.

- [ ] **Step 5: Lancer les tests du composant dialog**

```bash
npx vitest run packages/core/src/components/dialog --root packages/core
```

Expected: tous les tests passent.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/components/dialog/dialog.styles.ts
git commit -m "fix(dialog): retire le fallback cosmétique --spacing et tokenise radius/font-size"
```

---

### Task 6: `alert.styles.ts` — tokeniser le border-radius du bouton de fermeture

**Files:**

- Modify: `packages/core/src/styles/themes/default.css` (section alert, après `--ar-alert-close-size`)
- Modify: `packages/core/src/components/alert/alert.styles.ts:81`

**Interfaces:**

- Consumes: rien
- Produces: `--ar-alert-close-radius` (consommé uniquement ici)

- [ ] **Step 1: Ajouter le token dans `default.css`**

Après `--ar-alert-close-size: 2rem;` :

```css
--ar-alert-close-radius: 7px;
```

- [ ] **Step 2: Utiliser le token dans `alert.styles.ts`**

Remplacer `border-radius: 7px;` par `border-radius: var(--ar-alert-close-radius);` (ligne 81, dans `[part='close']`).

- [ ] **Step 3: Vérifier**

```bash
grep -n "7px" packages/core/src/components/alert/alert.styles.ts
```

Expected: aucune sortie.

- [ ] **Step 4: Lancer les tests du composant alert**

```bash
npx vitest run packages/core/src/components/alert --root packages/core
```

Expected: tous les tests passent.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/styles/themes/default.css packages/core/src/components/alert/alert.styles.ts
git commit -m "fix(alert): tokenise le border-radius du bouton de fermeture"
```

---

### Task 7: `pagination.styles.ts` — tokeniser le border-radius du conteneur

**Files:**

- Modify: `packages/core/src/styles/themes/default.css` (section pagination, après `--ar-pagination-bg-focus`)
- Modify: `packages/core/src/components/pagination/pagination.styles.ts:12`

**Interfaces:**

- Consumes: `--ar-border-radius-lg` (0.5rem, déjà défini)
- Produces: `--ar-pagination-radius`

- [ ] **Step 1: Ajouter le token dans `default.css`**

Après `--ar-pagination-bg-focus: var(--ar-button-tertiary-bg-focus);` :

```css
--ar-pagination-radius: var(--ar-border-radius-lg);
```

- [ ] **Step 2: Utiliser le token dans `pagination.styles.ts`**

Remplacer `border-radius: 0.5rem;` (ligne 12, règle `.pagination`) par `border-radius: var(--ar-pagination-radius);`.

- [ ] **Step 3: Vérifier**

```bash
grep -nE "border-radius\s*:\s*0\.5rem" packages/core/src/components/pagination/pagination.styles.ts
```

Expected: aucune sortie.

- [ ] **Step 4: Lancer les tests du composant pagination**

```bash
npx vitest run packages/core/src/components/pagination --root packages/core
```

Expected: tous les tests passent.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/styles/themes/default.css packages/core/src/components/pagination/pagination.styles.ts
git commit -m "fix(pagination): tokenise le border-radius du conteneur"
```

---

### Task 8: `datepicker.styles.ts` — tokeniser le font-size des en-têtes de jour

**Files:**

- Modify: `packages/core/src/styles/themes/default.css` (section datepicker, près de `--ar-datepicker-weekday-color`)
- Modify: `packages/core/src/components/datepicker/datepicker.styles.ts:126`

**Interfaces:**

- Consumes: rien
- Produces: `--ar-datepicker-weekday-font-size`

- [ ] **Step 1: Ajouter le token dans `default.css`**

Juste après `--ar-datepicker-weekday-color: var(--ar-color-neutral-50);` :

```css
--ar-datepicker-weekday-font-size: 0.75rem;
```

- [ ] **Step 2: Utiliser le token dans `datepicker.styles.ts`**

Remplacer, dans la règle `[part='grid'] th` :

```css
font-size: 0.75rem;
```

par :

```css
font-size: var(--ar-datepicker-weekday-font-size);
```

- [ ] **Step 3: Vérifier**

```bash
grep -n "0.75rem" packages/core/src/components/datepicker/datepicker.styles.ts
```

Expected: aucune sortie.

- [ ] **Step 4: Lancer les tests du composant datepicker**

```bash
npx vitest run packages/core/src/components/datepicker --root packages/core
```

Expected: tous les tests passent.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/styles/themes/default.css packages/core/src/components/datepicker/datepicker.styles.ts
git commit -m "fix(datepicker): tokenise le font-size des en-têtes de jour"
```

---

### Task 9: `stepper.styles.ts` — tokeniser les 2 border-radius codés en dur

**Files:**

- Modify: `packages/core/src/styles/themes/default.css` (section stepper, près de `--ar-stepper-bullet-radius`)
- Modify: `packages/core/src/components/stepper/stepper.styles.ts` (lignes ~28 et ~125)

**Interfaces:**

- Consumes: rien
- Produces: `--ar-stepper-trigger-radius`, `--ar-stepper-link-focus-radius`

- [ ] **Step 1: Ajouter les 2 tokens dans `default.css`**

Après `--ar-stepper-bullet-radius: 0.75rem;` :

```css
--ar-stepper-trigger-radius: 0.75rem;
--ar-stepper-link-focus-radius: 0.125rem;
```

- [ ] **Step 2: Utiliser les tokens dans `stepper.styles.ts`**

Remplacer, dans `[part='trigger']` (ligne ~28) :

```css
border-radius: 0.75rem;
```

par :

```css
border-radius: var(--ar-stepper-trigger-radius);
```

Remplacer, dans `.stepper-item .stepper-link:focus` (ligne ~125) :

```css
border-radius: 0.125rem;
```

par :

```css
border-radius: var(--ar-stepper-link-focus-radius);
```

- [ ] **Step 3: Vérifier**

```bash
grep -nE "border-radius\s*:\s*(0\.75rem|0\.125rem)" packages/core/src/components/stepper/stepper.styles.ts
```

Expected: aucune sortie.

- [ ] **Step 4: Lancer les tests du composant stepper**

```bash
npx vitest run packages/core/src/components/stepper --root packages/core
```

Expected: tous les tests passent.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/styles/themes/default.css packages/core/src/components/stepper/stepper.styles.ts
git commit -m "fix(stepper): tokenise les border-radius du trigger et du focus ring"
```

---

### Task 10: `stepper.styles.ts` — nettoyer le CSS mort (`.stepper-horizontal`, `.stepper-edition`)

**Contexte :** `.stepper-horizontal` et `.stepper-edition` n'apparaissent dans aucun fichier de rendu (`stepper.ts`, `stepper.renderer.ts`, `stepper-item.ts`). `.stepper-list:not(.stepper-horizontal)` est donc toujours vrai (la classe n'existe jamais) — le sélecteur doit être simplifié, pas juste retiré, pour ne pas changer le comportement. Le bloc `.stepper-edition` entier est mort et peut être supprimé sans remplacement.

**Files:**

- Modify: `packages/core/src/components/stepper/stepper.styles.ts`

**Interfaces:**

- Consumes: rien
- Produces: rien

- [ ] **Step 1: Confirmer l'absence d'usage**

```bash
grep -rn "stepper-horizontal\|stepper-edition" packages/core/src/components/stepper/*.ts | grep -v '\.styles\.ts'
```

Expected: aucune sortie.

- [ ] **Step 2: Simplifier le sélecteur `.stepper-list:not(.stepper-horizontal)`**

Remplacer :

```css
    .stepper-list:not(.stepper-horizontal) .stepper-item:after {
```

par :

```css
    .stepper-list .stepper-item:after {
```

- [ ] **Step 3: Supprimer le bloc mort `.stepper-edition`**

Retirer entièrement :

```css
.stepper-edition .stepper-item-inner .icon {
    margin-bottom: 0;
    margin-left: 0.5rem;
}

.stepper-edition .stepper-item-bullet {
    color: var(--ar-stepper-bullet-color);
    background-color: var(--ar-stepper-bullet-bg);
}
```

- [ ] **Step 4: Vérifier**

```bash
grep -n "stepper-horizontal\|stepper-edition" packages/core/src/components/stepper/stepper.styles.ts
```

Expected: aucune sortie.

- [ ] **Step 5: Lancer les tests du composant stepper**

```bash
npx vitest run packages/core/src/components/stepper --root packages/core
```

Expected: tous les tests passent.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/components/stepper/stepper.styles.ts
git commit -m "fix(stepper): retire le CSS mort .stepper-horizontal / .stepper-edition"
```

---

### Task 11: `utilities.styles.ts` — retirer les classes flex jamais utilisées

**Contexte :** `.flex-column` (utilisée dans `stepper.renderer.ts`) et `.d-inline-flex` (utilisée dans `progressbar.ts`/`stepper.renderer.ts`) restent utilisées et ne sont PAS retirées. `.d-flex`, `.flex-row`, `.flex-row-reverse`, `.flex-column-reverse` n'apparaissent dans aucun fichier `.ts`/`.astro`/`.mdx` du repo.

**Files:**

- Modify: `packages/core/src/styles/utilities.styles.ts`

**Interfaces:**

- Consumes: rien
- Produces: rien

- [ ] **Step 1: Confirmer l'absence d'usage dans tout le repo**

```bash
grep -rn "d-flex\|flex-row\b\|flex-row-reverse\|flex-column-reverse" --include="*.ts" --include="*.astro" --include="*.mdx" packages apps | grep -v "utilities.styles.ts"
```

Expected: aucune sortie.

- [ ] **Step 2: Retirer les 4 classes mortes**

Dans `packages/core/src/styles/utilities.styles.ts`, retirer les blocs `.d-flex`, `.flex-row`, `.flex-row-reverse`, `.flex-column-reverse`, en gardant `.sr-only`, `.list-unstyled`, `.d-inline-flex`, `.flex-column`. Le fichier final :

```ts
import { css } from 'lit';

export default css`
    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
    }

    .list-unstyled {
        padding-left: 0;
        list-style: none;
    }

    .d-inline-flex {
        display: -webkit-inline-box !important;
        display: -ms-inline-flexbox !important;
        display: inline-flex !important;
    }

    .flex-column {
        -webkit-box-orient: vertical !important;
        -webkit-box-direction: normal !important;
        -ms-flex-direction: column !important;
        flex-direction: column !important;
    }
`;
```

- [ ] **Step 3: Vérifier**

```bash
grep -n "d-flex\|flex-row" packages/core/src/styles/utilities.styles.ts
```

Expected: aucune sortie.

- [ ] **Step 4: Lancer toute la suite de tests**

```bash
npm run test --workspace=@ariane-ui/core
```

Expected: tous les tests passent (ce fichier étant partagé, on valide large ici plutôt que sur un seul composant).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/styles/utilities.styles.ts
git commit -m "fix(core): retire les classes flex jamais utilisées de utilities.styles.ts"
```

---

### Task 12: Validation finale et ouverture de la PR

**Files:** aucun.

- [ ] **Step 1: Lancer la suite complète**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run test
```

Expected: tous les tests passent (658+ tests, aucune régression).

- [ ] **Step 2: Lancer les tests navigateur (WTR)**

```bash
npm run test:all
```

Expected: tous les tests passent.

- [ ] **Step 3: Sweep final — vérifier qu'aucune valeur ciblée par ce plan ne subsiste**

```bash
grep -rn "hsla\|tertiary-dark\|btn-tertiary.light" packages/core/src/styles/components/button.styles.ts
grep -rn "1.25rem" packages/core/src/components/dialog/dialog.styles.ts
grep -rn "7px" packages/core/src/components/alert/alert.styles.ts
grep -rnE "border-radius\s*:\s*0\.5rem" packages/core/src/components/pagination/pagination.styles.ts
grep -rn "0.75rem" packages/core/src/components/datepicker/datepicker.styles.ts
grep -rnE "border-radius\s*:\s*(0\.75rem|0\.125rem)" packages/core/src/components/stepper/stepper.styles.ts
grep -rn "stepper-horizontal\|stepper-edition" packages/core/src/components/stepper/stepper.styles.ts
grep -n "d-flex\|flex-row" packages/core/src/styles/utilities.styles.ts
```

Expected: aucune sortie sur les 8 commandes.

- [ ] **Step 4: Push et ouvrir la PR vers `dev`**

```bash
git push -u origin fix/style-audit-tokenisation
gh pr create --base dev --title "fix(core): tokenise les valeurs de design restantes et retire le CSS mort" --body "$(cat <<'EOF'
## Summary
- Retire le variant `.btn-tertiary.dark` (jamais utilisé) et le modificateur `.light` (redondant avec la règle de base) de `button.styles.ts` / `dialog.*`
- Tokenise les valeurs de couleur/radius/font-size codées en dur restantes (button, dialog, alert, pagination, datepicker, stepper)
- Retire le fallback cosmétique `1.25rem` de `--spacing` dans `dialog.styles.ts` (aligné sur le pattern déjà utilisé par `--width`)
- Retire le CSS mort restant : `.stepper-edition`, `:not(.stepper-horizontal)`, 4 classes flex inutilisées de `utilities.styles.ts`

Suite de l'audit style global du 2026-07-13. Aucun changement visuel attendu — parité stricte des valeurs, sauf suppression du CSS confirmé mort.

## Test plan
- [x] \`npm run test\` (658+ tests, vitest)
- [x] \`npm run test:all\` (WTR navigateur)
- [x] Sweep grep confirmant l'absence de chaque valeur ciblée
EOF
)"
```

Expected: PR créée, URL retournée.
