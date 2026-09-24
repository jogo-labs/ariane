# Audit tokens génériques #127 — Addendum (scoping + découvrabilité default.css)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Suite à la revue de la PR #132, scoper les tokens génériques qui ne devraient pas être consommés tels quels par un composant (palette brute, échelle de tailles, ou token sémantique utilisé hors de son objet déclaré), et ajouter dans `default.css` une trace de découvrabilité pour les tokens sémantiques restés en consommation directe.

**Architecture:** Reprend le pattern d'alias déjà établi par #125 (ADR-005, cf. `ar-dropdown`) : le composant déclare son propre token `--ar-<composant>-<propriété>`, `default.css` l'aliase par défaut vers le token global, et le `.styles.ts` du composant consomme uniquement son propre token. Cela protège le composant si un consommateur remplace la palette (`--ar-color-neutral-90`) ou l'échelle (`--ar-font-size-md`, `--ar-border-radius-lg`) par son propre design system, et corrige un cas où un token sémantique était utilisé hors de son objet déclaré (`--ar-color-danger-text`, un token de couleur de _texte_, pilotant un `outline` de bordure).

Les tokens sémantiques génériques déjà documentés dans la PR précédente et utilisés conformément à leur objet (`--ar-color-bg`, `--ar-color-text`, `--ar-color-text-inverse`, `--ar-color-interactive`, `--ar-focus-ring-color`, `--ar-focus-ring-offset`) restent en consommation directe : ce sont la couche sémantique déjà conçue comme point d'extension public (cf. `default.css:224-227` : « Ce sont ces tokens que les composants et les thèmes surchargent »). Pour ceux-ci, on ajoute uniquement un commentaire de découvrabilité dans `default.css`, sans créer d'alias.

**Tech Stack:** Lit 3 + TypeScript, CSS custom properties (`@layer ariane.theme` dans `packages/core/src/styles/themes/default.css`), Vitest, `packages/core/scripts/validate-cssprop-defaults.js`.

## Global Constraints

- Aucun changement visuel : chaque nouvel alias pointe par défaut vers exactement le token qu'il remplace, même valeur héritée.
- Nommage des tokens scopés confirmé avec le mainteneur :
    - `--ar-breadcrumb-mobile-separator-color` (⚠️ pas `--ar-breadcrumb-separator-color`, déjà pris par le séparateur desktop, `breadcrumb.ts:40`, qui pointe vers `--ar-color-neutral-80` — un token différent).
    - `--ar-dialog-border-radius`
    - `--ar-dialog-title-font-size`
    - `--ar-dialog-shake-outline-color`
- Commentaires de découvrabilité `default.css` : uniquement sur les 6 déclarations de tokens sémantiques restés en consommation directe (pas sur les 4 tokens nouvellement scopés — l'alias documente déjà la relation). Pas de référence au numéro d'issue dans les commentaires (rotent avec le temps) — décrire uniquement la relation technique (quels composants consomment directement ce token).
- Prettier : 100 caractères, 4 espaces, quotes simples.
- Conventional Commits — chaque tâche se termine par un commit séparé.
- Ne jamais committer `packages/core/dist/`.
- Travail sur la branche existante `docs/audit-generic-tokens-127` (PR #132 déjà ouverte vers `dev`) — pas de nouvelle branche, pousser les commits supplémentaires sur la même branche.

---

## Contexte technique découvert pendant l'audit de revue

- `--ar-breadcrumb-separator-color` existe déjà dans `default.css:349` (`var(--ar-color-neutral-80)`) et dans le JSDoc `breadcrumb.ts:40` — c'est le séparateur **desktop** (chevron entre les items), consommé par `breadcrumb.styles.ts:72`. Le connecteur pointillé **mobile** (`breadcrumb.styles.ts:130`, `--ar-color-neutral-90`) est un token différent : nommer son alias `--ar-breadcrumb-mobile-separator-color` pour éviter toute collision.
- Le token `--ar-color-danger-text` a une valeur différente selon le thème (light : `default.css:258`, `var(--ar-color-danger-40)` ; dark : `default.css:638` et `698`, `var(--ar-color-danger-70)`) — l'alias `--ar-dialog-shake-outline-color` hérite de cette adaptation automatiquement puisqu'il pointe vers le même token, sans dupliquer les surcharges dark.
- Section 3 de `default.css` (« TOKENS SÉMANTIQUES », commentaire `default.css:224-227`) déclare explicitement que ces tokens sont le point d'extension prévu pour les composants et les thèmes — confirme que `--ar-color-bg`/`--ar-color-text`/`--ar-color-text-inverse`/`--ar-color-interactive`/`--ar-focus-ring-color`/`--ar-focus-ring-offset` n'ont pas besoin d'alias scopé, juste d'un commentaire de découvrabilité.

---

### Task 6: Scoper `--ar-color-neutral-90` pour `ar-breadcrumb`

**Files:**

- Modify: `packages/core/src/styles/themes/default.css:349` (section breadcrumb)
- Modify: `packages/core/src/components/breadcrumb/breadcrumb.styles.ts:130`
- Modify: `packages/core/src/components/breadcrumb/breadcrumb.ts:41,57`

**Interfaces:** Produces `--ar-breadcrumb-mobile-separator-color` (alias de `--ar-color-neutral-90`), consommé uniquement par `breadcrumb.styles.ts`.

- [ ] **Step 1: Ajouter l'alias dans `default.css`**

La section breadcrumb contient ligne 349 :

```css
--ar-breadcrumb-bullet-color: var(--ar-color-neutral-80);
```

Remplacer par :

```css
--ar-breadcrumb-bullet-color: var(--ar-color-neutral-80);
--ar-breadcrumb-mobile-separator-color: var(--ar-color-neutral-90);
```

- [ ] **Step 2: Utiliser l'alias dans `breadcrumb.styles.ts`**

Ligne 130 :

```css
background-image: linear-gradient(var(--ar-color-neutral-90) 25%, transparent 0);
```

Remplacer par :

```css
background-image: linear-gradient(var(--ar-breadcrumb-mobile-separator-color) 25%, transparent 0);
```

- [ ] **Step 3: Mettre à jour le JSDoc de `breadcrumb.ts`**

Supprimer la ligne (actuellement en fin de bloc, juste avant `@event`) :

```
 * @cssprop --ar-color-neutral-90 - Couleur du séparateur pointillé vertical entre les items de la liste mobile. Token de palette brute globale (non scopé à ar-breadcrumb).
```

Et ajouter, juste après la ligne `--ar-breadcrumb-bullet-color` (actuellement) :

```
 * @cssprop --ar-breadcrumb-bullet-color - Couleur des puces de la liste mobile.
 * @cssprop --ar-breadcrumb-mobile-separator-color - Couleur du connecteur pointillé vertical entre les items de la liste mobile (cascade vers --ar-color-neutral-90).
```

- [ ] **Step 4: Vérifier la couverture `@cssprop` et les tests**

Run: `npm run build:manifest --workspace=@ariane-ui/core`
Expected: succès, le nouveau token a son entrée JSDoc, aucune régression de couverture.

Run: `npx vitest run packages/core/src/components/breadcrumb --root /Users/jon/Code/Active_projects/ariane`
Expected: tous les tests passent, aucune régression visuelle (même valeur `--ar-color-neutral-90` héritée par défaut).

- [ ] **Step 5: Vérification visuelle**

Playground docs, page `ar-breadcrumb`, mode mobile : le connecteur pointillé vertical entre les items doit garder exactement le même rendu qu'avant (couleur héritée à l'identique via l'alias).

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/styles/themes/default.css packages/core/src/components/breadcrumb/breadcrumb.styles.ts packages/core/src/components/breadcrumb/breadcrumb.ts
git commit -m "refactor(breadcrumb): scope --ar-breadcrumb-mobile-separator-color au lieu de consommer la palette brute --ar-color-neutral-90"
```

---

### Task 7: Scoper 3 tokens pour `ar-dialog`

**Files:**

- Modify: `packages/core/src/styles/themes/default.css` (section dialog, après ligne `--ar-dialog-close-bg-focus`)
- Modify: `packages/core/src/components/dialog/dialog.styles.ts:85,149,230`
- Modify: `packages/core/src/components/dialog/dialog.ts:85-87`

**Interfaces:** Produces `--ar-dialog-border-radius` (alias de `--ar-border-radius-lg`), `--ar-dialog-title-font-size` (alias de `--ar-font-size-md`), `--ar-dialog-shake-outline-color` (alias de `--ar-color-danger-text`).

- [ ] **Step 1: Ajouter les 3 alias dans la section dialog de `default.css`**

La section dialog se termine par :

```css
--ar-dialog-close-bg-focus: var(--ar-button-tertiary-bg-focus);
```

Remplacer par :

```css
--ar-dialog-close-bg-focus: var(--ar-button-tertiary-bg-focus);
--ar-dialog-border-radius: var(--ar-border-radius-lg);
--ar-dialog-title-font-size: var(--ar-font-size-md);
--ar-dialog-shake-outline-color: var(--ar-color-danger-text);
```

- [ ] **Step 2: Utiliser les 3 alias dans `dialog.styles.ts`**

Remplacer (ligne 85) :

```css
border-radius: var(--ar-border-radius-lg);
```

par :

```css
border-radius: var(--ar-dialog-border-radius);
```

Remplacer (ligne 149) :

```css
font-size: var(--ar-font-size-md);
```

par :

```css
font-size: var(--ar-dialog-title-font-size);
```

Remplacer (ligne 230) :

```css
outline: 3px solid var(--ar-color-danger-text);
```

par :

```css
outline: 3px solid var(--ar-dialog-shake-outline-color);
```

- [ ] **Step 3: Mettre à jour le JSDoc de `dialog.ts`**

Remplacer les 3 lignes actuelles (85-87) :

```
 * @cssprop --ar-border-radius-lg - Border-radius du dialog en mode modal (non-drawer). Token sémantique global (non scopé à ar-dialog).
 * @cssprop --ar-font-size-md - Taille de police du titre (h1). Token sémantique global (non scopé à ar-dialog).
 * @cssprop --ar-color-danger-text - Couleur de l'anneau de mise en évidence (`outline`) affiché à la place du shake en `prefers-reduced-motion: reduce`. Token sémantique global (non scopé à ar-dialog).
```

par :

```
 * @cssprop --ar-dialog-border-radius - Border-radius du dialog en mode modal (non-drawer) (cascade vers --ar-border-radius-lg).
 * @cssprop --ar-dialog-title-font-size - Taille de police du titre (h1) (cascade vers --ar-font-size-md).
 * @cssprop --ar-dialog-shake-outline-color - Couleur de l'anneau de mise en évidence (`outline`) affiché à la place du shake en `prefers-reduced-motion: reduce` (cascade vers --ar-color-danger-text).
```

- [ ] **Step 4: Vérifier la couverture `@cssprop` et les tests**

Run: `npm run build:manifest --workspace=@ariane-ui/core`
Expected: succès, les 3 nouveaux tokens ont leur entrée JSDoc, aucune régression de couverture.

Run: `npx vitest run packages/core/src/components/dialog --root /Users/jon/Code/Active_projects/ariane`
Expected: tous les tests passent, aucune régression visuelle (mêmes valeurs héritées par défaut).

- [ ] **Step 5: Vérification visuelle**

Playground docs, page `ar-dialog` : le border-radius de la modale et la taille de police du titre doivent rester identiques. Activer "reduce motion" (devtools → Rendering → Emulate CSS media feature `prefers-reduced-motion`), déclencher une fermeture bloquée : l'anneau `outline` doit garder la même couleur rouge/danger qu'avant, en light et en dark.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/styles/themes/default.css packages/core/src/components/dialog/dialog.styles.ts packages/core/src/components/dialog/dialog.ts
git commit -m "refactor(dialog): scope --ar-dialog-border-radius, --ar-dialog-title-font-size et --ar-dialog-shake-outline-color au lieu de consommer les tokens globaux directement"
```

---

### Task 8: Ajouter les commentaires de découvrabilité `default.css` pour les tokens sémantiques restés en direct

**Files:**

- Modify: `packages/core/src/styles/themes/default.css:231,237,239,242,249,250`

**Interfaces:** aucune — commentaires uniquement, aucun nouveau token.

- [ ] **Step 1: Ajouter les 6 commentaires**

Remplacer (lignes 230-250, bloc actuel) :

```css
/* Interaction */
--ar-color-interactive: var(--ar-color-primary-40);
--ar-color-interactive-hover: var(--ar-color-primary-30);
--ar-color-interactive-active: var(--ar-color-primary-20);
--ar-color-interactive-subtle: var(--ar-color-primary-95);

/* Texte */
--ar-color-text: #2e2e31;
--ar-color-text-muted: var(--ar-color-neutral-40);
--ar-color-text-inverse: var(--ar-color-white);

/* Surface */
--ar-color-bg: var(--ar-color-white);
--ar-color-bg-subtle: var(--ar-color-neutral-95);

/* Bordure */
--ar-color-border: var(--ar-color-neutral-90);

/* Focus */
--ar-focus-ring-color: var(--ar-color-interactive);
--ar-focus-ring-offset: 2px;
```

par :

```css
/* Interaction */
--ar-color-interactive: var(
    --ar-color-primary-40
); /* Consommé directement par ar-breadcrumb, ar-stepper */
--ar-color-interactive-hover: var(--ar-color-primary-30);
--ar-color-interactive-active: var(--ar-color-primary-20);
--ar-color-interactive-subtle: var(--ar-color-primary-95);

/* Texte */
--ar-color-text: #2e2e31; /* Consommé directement par ar-alert, ar-datepicker, ar-dialog, ar-stepper */
--ar-color-text-muted: var(--ar-color-neutral-40);
--ar-color-text-inverse: var(--ar-color-white); /* Consommé directement par ar-stepper */

/* Surface */
--ar-color-bg: var(
    --ar-color-white
); /* Consommé directement par ar-breadcrumb, ar-datepicker, ar-dialog */
--ar-color-bg-subtle: var(--ar-color-neutral-95);

/* Bordure */
--ar-color-border: var(--ar-color-neutral-90);

/* Focus */
--ar-focus-ring-color: var(
    --ar-color-interactive
); /* Consommé directement par ar-datepicker, ar-tab */
--ar-focus-ring-offset: 2px; /* Consommé directement par ar-datepicker */
```

- [ ] **Step 2: Vérifier la couverture `@cssprop` et les tests**

Run: `npm run build:manifest --workspace=@ariane-ui/core`
Expected: succès. Le commentaire est placé après le `;` de chaque déclaration, donc hors de la valeur capturée par `TOKEN_RE` dans `validate-cssprop-defaults.js` (`/(--ar[\w-]+)\s*:\s*([^;]+)/g` s'arrête au premier `;`) — aucun impact sur le parsing.

Run: `npm run test`
Expected: suite complète verte (commentaires CSS purs, aucun changement de comportement).

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/styles/themes/default.css
git commit -m "docs(theme): documente les composants qui consomment directement les tokens semantiques globaux"
```

---

### Task 9: Pousser les commits supplémentaires sur la PR existante

**Files:** aucun fichier modifié — opération git uniquement.

- [ ] **Step 1: Pousser sur la branche existante**

```bash
cd /Users/jon/Code/Active_projects/ariane
git push origin docs/audit-generic-tokens-127
```

Expected: la PR #132 (déjà ouverte vers `dev`) se met à jour automatiquement avec les nouveaux commits, CI redéclenchée.

- [ ] **Step 2: Lancer la suite de tests complète et le build du manifest une dernière fois**

Run: `npm run build:manifest --workspace=@ariane-ui/core && npm run test`
Expected: build du manifest réussi, tous les tests passent.

---

## Self-Review

**1. Couverture des 4 retours utilisateur :**

- breadcrumb `--ar-color-neutral-90` → Task 6. ✓
- dialog `--ar-font-size-md` → Task 7. ✓
- dialog `--ar-color-danger-text` → Task 7. ✓
- dialog `--ar-border-radius-lg` → Task 7. ✓
- « autres cas similaires » → audit complet des 17 tokens documentés dans la PR initiale, reclassés en 4 « à scoper » (ci-dessus) et 13 « corrects en direct » (utilisation conforme à l'objet sémantique déclaré du token — cf. section Contexte technique). Aucun autre cas de token de palette brute ou d'échelle trouvé parmi les 13 restants.
- Commentaires `default.css` sur les tokens restés en direct → Task 8. ✓

**2. Scan de placeholders :** aucun « TBD »/« TODO » — chaque step contient le diff exact avec numéros de ligne réels lus dans le code source actuel (post-merge des tâches 2-5 de la PR #132).

**3. Cohérence des noms :** `--ar-breadcrumb-mobile-separator-color` vérifié non conflictuel avec `--ar-breadcrumb-separator-color` (existant, différent token/usage). Les 3 noms dialog confirmés avec le mainteneur avant rédaction du plan.
