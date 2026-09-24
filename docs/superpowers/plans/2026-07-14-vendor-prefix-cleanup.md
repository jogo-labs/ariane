# Passe style v1 — PR (b) : Nettoyage des vendor-prefixes Bootstrap-era

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retirer les vendor-prefixes obsolètes (syntaxe flexbox 2009 `-webkit-box`/`-ms-flexbox`, `-webkit-box-shadow` dupliqué) identifiés par l'audit du 2026-07-13 sur `packages/core/src/**/*.styles.ts`, sans changer le rendu visuel d'aucun composant.

**Architecture:** Chaque tâche touche un seul fichier de style, retire les lignes vendor-prefixées redondantes en gardant systématiquement la déclaration standard (non préfixée) déjà présente juste à côté. Aucune valeur numérique ni propriété standard ne change — c'est une suppression pure de duplication.

**Tech Stack:** Lit 3 (`css` tagged template literals). Lit 2+ (et donc Lit 3) ne supporte plus IE11 — les préfixes `-ms-flex-*`/`-ms-flexbox`/`-ms-inline-flexbox` ciblent exclusivement IE10/11 et sont donc du code mort par construction, indépendamment de toute cible navigateur choisie par ce projet. Les préfixes `-webkit-box`/`-webkit-box-align`/`-webkit-box-pack`/`-webkit-box-orient`/`-webkit-box-direction` sont la même syntaxe flexbox pré-standard (2009), obsolète sur tous les navigateurs évergreens actuels (Safari supporte le flexbox standard sans préfixe depuis la version 9, 2015). `-webkit-box-shadow` et `-moz-column-gap`/`-webkit-column-gap` sont inutiles depuis longtemps sur toute cible évergreen (box-shadow non préfixé supporté partout depuis ~2013, column-gap en contexte flex depuis Safari 14.1/Chrome 84/Firefox 63).

## Global Constraints

- Ne retirer QUE les lignes vendor-prefixées qui ont une déclaration standard équivalente déjà présente dans la même règle (aucune perte de comportement).
- **Exclusions explicites, ne pas toucher** (vérifiées non-mortes pendant l'investigation de ce plan) :
    - `packages/core/src/styles/components/reset.styles.ts:18` (`-webkit-appearance: button;`) — pas d'équivalent standard présent dans le fichier, retrait risqué pour Safari, hors scope de ce nettoyage.
    - `packages/core/src/styles/components/reset.styles.ts:29-32` (`button::-moz-focus-inner`) — API Firefox toujours d'actualité pour retirer la bordure interne pointillée des `<button>`, aucun équivalent non préfixé n'existe.
    - `packages/core/src/components/progressbar/progressbar.styles.ts:52-60` et `:62-67` — le trio `display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2;` est un prérequis technique obligatoire pour que le troncage multi-lignes fonctionne sur Safari < 17 ; il coexiste déjà avec l'équivalent standard `line-clamp: 2;`. Ce n'est pas un doublon mort, c'est un fallback progressif toujours nécessaire — ne pas y toucher.
    - `packages/core/src/components/tab-group/tab-group.styles.ts:19` (`[part='nav']::-webkit-scrollbar`) — API moderne de style de scrollbar, sans rapport avec les préfixes flexbox obsolètes, hors scope.
- Prettier : 100 caractères, 4 espaces, guillemets simples (`npm run format` ou le hook `lint-staged` au commit s'en charge).
- Branche `fix/<desc>` créée depuis la pointe de `fix/style-audit-tokenisation` (PR (a) du même chantier, pas encore mergée sur `dev` — évite tout conflit/travail en double sur les fichiers déjà modifiés par PR (a) comme `button.styles.ts`, `pagination.styles.ts`, `utilities.styles.ts`). La PR GitHub ciblera `fix/style-audit-tokenisation` comme base (PR empilée), à retargeter vers `dev` une fois PR (a) mergée.

---

### Task 1: Créer la branche de travail

**Files:** aucun.

- [ ] **Step 1: Créer et checkout la branche depuis la pointe de `fix/style-audit-tokenisation`**

```bash
cd /Users/jon/Code/Active_projects/ariane
git checkout fix/style-audit-tokenisation
git pull
git checkout -b fix/vendor-prefix-cleanup
```

Expected: la branche `fix/vendor-prefix-cleanup` est active (`git branch --show-current`), basée sur le dernier commit de `fix/style-audit-tokenisation`.

---

### Task 2: `button.styles.ts` — retirer les vendor-prefixes flexbox/shadow obsolètes

**Files:**

- Modify: `packages/core/src/styles/components/button.styles.ts`

**Interfaces:**

- Consumes: rien
- Produces: rien

- [ ] **Step 1: Retirer les 2 lignes `display` préfixées de `.btn`**

Remplacer :

```css
    .btn {
        position: relative;
        display: -webkit-inline-box;
        display: -ms-inline-flexbox;
        display: inline-flex;
```

par :

```css
    .btn {
        position: relative;
        display: inline-flex;
```

- [ ] **Step 2: Retirer les préfixes `align-items`/`justify-content` de `.btn`**

Remplacer :

```css
-webkit-box-align: center;
-ms-flex-align: center;
align-items: center;
-webkit-box-pack: center;
-ms-flex-pack: center;
justify-content: center;
```

par :

```css
align-items: center;
justify-content: center;
```

- [ ] **Step 3: Retirer le préfixe `flex-shrink` de `.btn .icon`**

Remplacer :

```css
.btn .icon {
    -ms-flex-negative: 0;
    flex-shrink: 0;
}
```

par :

```css
.btn .icon {
    flex-shrink: 0;
}
```

- [ ] **Step 4: Retirer les 3 occurrences de `-webkit-box-shadow: none;`**

Il y a 2 occurrences isolées à retirer (garder `box-shadow: none;` juste après chacune) :

```css
.btn:not(:disabled):not(.disabled):not([aria-disabled='true']):active:focus {
    -webkit-box-shadow: none;
    box-shadow: none;
}
```

devient :

```css
.btn:not(:disabled):not(.disabled):not([aria-disabled='true']):active:focus {
    box-shadow: none;
}
```

et :

```css
        -webkit-box-shadow: none;
        box-shadow: none;
        cursor: not-allowed;
    }
```

devient :

```css
        box-shadow: none;
        cursor: not-allowed;
    }
```

(cette 2e occurrence est dans la règle `.btn[aria-disabled='true'], .btn[aria-disabled='true']:hover`.)

- [ ] **Step 5: Retirer le `-webkit-box-shadow` multi-valeurs de `.btn:focus`**

Remplacer :

```css
.btn:focus {
    outline: 0;
    -webkit-box-shadow: none;
    box-shadow: none;
    border-color: transparent;
    -webkit-box-shadow:
        0 0 0 0.125rem var(--ar-button-focus-ring-color) inset,
        0 0 0 0.25rem var(--ar-color-white) inset;
    box-shadow:
        inset 0 0 0 0.125rem var(--ar-button-focus-ring-color),
        inset 0 0 0 0.25rem var(--ar-color-white);
}
```

par :

```css
.btn:focus {
    outline: 0;
    box-shadow: none;
    border-color: transparent;
    box-shadow:
        inset 0 0 0 0.125rem var(--ar-button-focus-ring-color),
        inset 0 0 0 0.25rem var(--ar-color-white);
}
```

(on retire uniquement les 2 lignes `-webkit-box-shadow`, on garde les 2 lignes `box-shadow` telles quelles, y compris la redondance `box-shadow: none;` immédiatement suivie d'une autre valeur — ce n'est pas un vendor-prefix, donc hors scope de cette tâche.)

- [ ] **Step 6: Retirer le `-webkit-box-shadow` de `.btn-tertiary:active`**

Remplacer :

```css
-webkit-box-shadow: var(--ar-button-tertiary-active-shadow) inset;
box-shadow: inset var(--ar-button-tertiary-active-shadow);
```

par :

```css
box-shadow: inset var(--ar-button-tertiary-active-shadow);
```

- [ ] **Step 7: Retirer les préfixes `justify-content` de `.btn-ratio-square`**

Remplacer :

```css
    .btn-ratio-square {
        padding: 0;
        -webkit-box-pack: center;
        -ms-flex-pack: center;
        justify-content: center;
```

par :

```css
    .btn-ratio-square {
        padding: 0;
        justify-content: center;
```

- [ ] **Step 8: Retirer les 2 lignes `display` préfixées de `.btn-block`**

Remplacer :

```css
.btn-block {
    display: -webkit-box;
    display: -ms-flexbox;
    display: flex;
}
```

par :

```css
.btn-block {
    display: flex;
}
```

- [ ] **Step 9: Vérifier qu'aucun vendor-prefix flexbox/shadow ne reste**

```bash
grep -n "\-webkit-\|\-ms-" packages/core/src/styles/components/button.styles.ts
```

Expected: aucune sortie.

- [ ] **Step 10: Lancer la suite de tests core**

```bash
npm run test --workspace=@ariane-ui/core
```

Expected: tous les tests passent (ce fichier est partagé par plusieurs composants : pagination, stepper, dialog, breadcrumb).

- [ ] **Step 11: Commit**

```bash
git add packages/core/src/styles/components/button.styles.ts
git commit -m "fix(button): retire les vendor-prefixes flexbox/shadow obsolètes"
```

---

### Task 3: `reset.styles.ts` — retirer le préfixe `box-sizing`

**Contexte :** seule la ligne `-webkit-box-sizing` est concernée. `-webkit-appearance: button;` et `button::-moz-focus-inner` restent inchangés (cf. Global Constraints — exclusions explicites).

**Files:**

- Modify: `packages/core/src/styles/components/reset.styles.ts`

**Interfaces:**

- Consumes: rien
- Produces: rien

- [ ] **Step 1: Retirer `-webkit-box-sizing`**

Remplacer :

```css
*,
*::before,
*::after {
    -webkit-box-sizing: border-box;
    box-sizing: border-box;
}
```

par :

```css
*,
*::before,
*::after {
    box-sizing: border-box;
}
```

- [ ] **Step 2: Vérifier**

```bash
grep -n "\-webkit-box-sizing" packages/core/src/styles/components/reset.styles.ts
grep -n "\-webkit-appearance\|::-moz-focus-inner" packages/core/src/styles/components/reset.styles.ts
```

Expected : la 1ère commande ne retourne rien. La 2e doit toujours retourner les 2 lignes intactes (non touchées par cette tâche).

- [ ] **Step 3: Lancer la suite de tests core**

```bash
npm run test --workspace=@ariane-ui/core
```

Expected: tous les tests passent (fichier partagé par tous les composants).

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/styles/components/reset.styles.ts
git commit -m "fix(core): retire le vendor-prefix -webkit-box-sizing de reset.styles.ts"
```

---

### Task 4: `utilities.styles.ts` — retirer les préfixes flexbox de `.d-inline-flex`/`.flex-column`

**Files:**

- Modify: `packages/core/src/styles/utilities.styles.ts`

**Interfaces:**

- Consumes: rien
- Produces: rien

- [ ] **Step 1: Simplifier `.d-inline-flex`**

Remplacer :

```css
.d-inline-flex {
    display: -webkit-inline-box !important;
    display: -ms-inline-flexbox !important;
    display: inline-flex !important;
}
```

par :

```css
.d-inline-flex {
    display: inline-flex !important;
}
```

- [ ] **Step 2: Simplifier `.flex-column`**

Remplacer :

```css
.flex-column {
    -webkit-box-orient: vertical !important;
    -webkit-box-direction: normal !important;
    -ms-flex-direction: column !important;
    flex-direction: column !important;
}
```

par :

```css
.flex-column {
    flex-direction: column !important;
}
```

- [ ] **Step 3: Vérifier**

```bash
grep -n "\-webkit-\|\-ms-" packages/core/src/styles/utilities.styles.ts
```

Expected: aucune sortie.

- [ ] **Step 4: Lancer la suite de tests core**

```bash
npm run test --workspace=@ariane-ui/core
```

Expected: tous les tests passent (fichier partagé — `.flex-column` utilisée par `stepper.renderer.ts`, `.d-inline-flex` par `progressbar.ts`/`stepper.renderer.ts`).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/styles/utilities.styles.ts
git commit -m "fix(core): retire les vendor-prefixes flexbox de utilities.styles.ts"
```

---

### Task 5: `pagination.styles.ts` — retirer les vendor-prefixes flexbox/shadow

**Files:**

- Modify: `packages/core/src/components/pagination/pagination.styles.ts`

**Interfaces:**

- Consumes: rien
- Produces: rien

- [ ] **Step 1: Simplifier `.pagination`**

Remplacer :

```css
.pagination {
    padding-left: 0;
    list-style: none;
    border-radius: var(--ar-pagination-radius);
    display: -webkit-box;
    display: -ms-flexbox;
    display: flex;
    -webkit-box-pack: center;
    -ms-flex-pack: center;
    justify-content: center;
    -ms-flex-wrap: wrap;
    flex-wrap: wrap;
    margin-bottom: 0;
}
```

par :

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

- [ ] **Step 2: Simplifier `.pagination .btn-tertiary`**

Remplacer :

```css
.pagination .btn-tertiary {
    aspect-ratio: 1/1;
    padding: 0;
    display: -webkit-box;
    display: -ms-flexbox;
    display: flex;
    -webkit-box-align: center;
    -ms-flex-align: center;
    align-items: center;
    -webkit-box-pack: center;
    -ms-flex-pack: center;
    justify-content: center;
    margin: 0 0.125rem;
}
```

par :

```css
.pagination .btn-tertiary {
    aspect-ratio: 1/1;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 0.125rem;
}
```

- [ ] **Step 3: Retirer le `-webkit-box-shadow` de `.pagination-item[aria-hidden='true']`**

Remplacer :

```css
.pagination-item[aria-hidden='true'] .btn-tertiary:not([aria-disabled='true']) {
    background: none !important;
    -webkit-box-shadow: none !important;
    box-shadow: none !important;
    cursor: default !important;
    border-color: transparent !important;
    color: var(--ar-pagination-color) !important;
}
```

par :

```css
.pagination-item[aria-hidden='true'] .btn-tertiary:not([aria-disabled='true']) {
    background: none !important;
    box-shadow: none !important;
    cursor: default !important;
    border-color: transparent !important;
    color: var(--ar-pagination-color) !important;
}
```

- [ ] **Step 4: Vérifier**

```bash
grep -n "\-webkit-\|\-ms-" packages/core/src/components/pagination/pagination.styles.ts
```

Expected: aucune sortie.

- [ ] **Step 5: Lancer les tests du composant pagination**

```bash
npx vitest run packages/core/src/components/pagination --root packages/core
```

Expected: tous les tests passent.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/components/pagination/pagination.styles.ts
git commit -m "fix(pagination): retire les vendor-prefixes flexbox/shadow obsolètes"
```

---

### Task 6: `progressbar.styles.ts` — retirer les vendor-prefixes flexbox/column-gap (hors shim line-clamp)

**Contexte :** `.progress-label .content-label` (le trio `display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2;` + son pendant dans le `@media`) est un fallback Safari toujours nécessaire pour le troncage multi-lignes — **ne pas y toucher** (cf. Global Constraints).

**Files:**

- Modify: `packages/core/src/components/progressbar/progressbar.styles.ts`

**Interfaces:**

- Consumes: rien
- Produces: rien

- [ ] **Step 1: Simplifier `.progressbar-container`**

Remplacer :

```css
.progressbar-container {
    display: -webkit-box;
    display: -ms-flexbox;
    display: flex;
    -webkit-box-orient: vertical;
    -webkit-box-direction: normal;
    -ms-flex-direction: column;
    flex-direction: column;
    row-gap: 0.75rem;
}
```

par :

```css
.progressbar-container {
    display: flex;
    flex-direction: column;
    row-gap: 0.75rem;
}
```

- [ ] **Step 2: Simplifier `.progress`**

Remplacer :

```css
    .progress {
        display: -webkit-inline-box;
        display: -ms-inline-flexbox;
        display: inline-flex;
        position: relative;
```

par :

```css
    .progress {
        display: inline-flex;
        position: relative;
```

- [ ] **Step 3: Simplifier `.progress-label`**

Remplacer :

```css
.progress-label {
    display: -webkit-inline-box;
    display: -ms-inline-flexbox;
    display: inline-flex;
    -webkit-box-pack: justify;
    -ms-flex-pack: justify;
    justify-content: space-between;
    -ms-flex-wrap: nowrap;
    flex-wrap: nowrap;
    -webkit-column-gap: 2rem;
    -moz-column-gap: 2rem;
    column-gap: 2rem;
    margin: 0;
}
```

par :

```css
.progress-label {
    display: inline-flex;
    justify-content: space-between;
    flex-wrap: nowrap;
    column-gap: 2rem;
    margin: 0;
}
```

**NE PAS MODIFIER** la règle suivante (`.progress-label .content-label`) ni le bloc `@media (min-width: 576px) { .progress-label .content-label { ... } }` — ils contiennent le shim `-webkit-line-clamp` toujours nécessaire.

- [ ] **Step 4: Retirer le préfixe `flex-shrink` de `.progress-percent`**

Remplacer :

```css
.progress-label .progress-percent {
    color: var(--ar-progressbar-percent-color);
    -ms-flex-negative: 0;
    flex-shrink: 0;
}
```

par :

```css
.progress-label .progress-percent {
    color: var(--ar-progressbar-percent-color);
    flex-shrink: 0;
}
```

- [ ] **Step 5: Vérifier que le shim line-clamp est intact et que le reste est nettoyé**

```bash
grep -n "\-webkit-line-clamp\|line-clamp" packages/core/src/components/progressbar/progressbar.styles.ts
```

Expected: 4 lignes (2 dans `.content-label`, 2 dans le `@media`), toutes inchangées.

```bash
grep -n "\-webkit-\|\-ms-\|\-moz-" packages/core/src/components/progressbar/progressbar.styles.ts
```

Expected: uniquement les 3 lignes du shim line-clamp (`display: -webkit-box;`, `-webkit-box-orient: vertical;`, `-webkit-line-clamp: 2;`) + `-webkit-line-clamp: none;` dans le `@media` — rien d'autre.

- [ ] **Step 6: Lancer les tests du composant progressbar**

```bash
npx vitest run packages/core/src/components/progressbar --root packages/core
```

Expected: tous les tests passent.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/components/progressbar/progressbar.styles.ts
git commit -m "fix(progressbar): retire les vendor-prefixes flexbox/column-gap obsolètes"
```

---

### Task 7: Validation finale et ouverture de la PR

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

Expected: tous les tests passent (220+ tests).

- [ ] **Step 3: Sweep final**

```bash
grep -rn "\-webkit-\|\-ms-\|\-moz-" packages/core/src/styles/components/button.styles.ts packages/core/src/styles/utilities.styles.ts packages/core/src/components/pagination/pagination.styles.ts
grep -n "\-webkit-box-sizing" packages/core/src/styles/components/reset.styles.ts
grep -c "\-webkit-\|\-ms-\|\-moz-" packages/core/src/components/progressbar/progressbar.styles.ts
```

Expected: sortie vide pour les 2 premières commandes ; `4` pour la dernière (le shim line-clamp préservé : `display: -webkit-box;`, `-webkit-box-orient: vertical;`, `-webkit-line-clamp: 2;`, `-webkit-line-clamp: none;`).

- [ ] **Step 4: Push et ouvrir la PR vers `fix/style-audit-tokenisation` (PR empilée sur PR (a), à retargeter vers `dev` une fois (a) mergée)**

```bash
git push -u origin fix/vendor-prefix-cleanup
gh pr create --base fix/style-audit-tokenisation --title "fix(core): retire les vendor-prefixes flexbox obsolètes (Bootstrap-era)" --body "$(cat <<'EOF'
## Summary
- Retire la syntaxe flexbox pré-standard (2009) `-webkit-box`/`-ms-flexbox`/`-ms-flex-*` — morte par construction puisque Lit 2+ ne supporte plus IE11
- Retire les `-webkit-box-shadow`/`-webkit-column-gap`/`-moz-column-gap` dupliqués — inutiles sur toute cible évergreen actuelle
- Fichiers touchés : `button.styles.ts`, `reset.styles.ts` (uniquement `-webkit-box-sizing`), `utilities.styles.ts`, `pagination.styles.ts`, `progressbar.styles.ts`
- **Conservé volontairement** : `-webkit-appearance` et `::-moz-focus-inner` (reset.styles.ts), le shim `-webkit-line-clamp` (progressbar.styles.ts), `::-webkit-scrollbar` (tab-group.styles.ts) — pas du code mort, cf. Global Constraints du plan

⚠️ PR empilée sur #98 (PR (a) de la passe style v1, pas encore mergée) — base à retargeter vers `dev` une fois #98 mergée.

Suite de l'audit style global du 2026-07-13. Aucun changement visuel attendu.

## Test plan
- [x] \`npm run test\` (vitest)
- [x] \`npm run test:all\` (WTR navigateur)
- [x] Sweep grep confirmant l'absence de chaque préfixe ciblé + présence intacte du shim line-clamp
- [x] Chaque tâche relue par un subagent indépendant (spec + qualité)
EOF
)"
```

Expected: PR créée, URL retournée.
