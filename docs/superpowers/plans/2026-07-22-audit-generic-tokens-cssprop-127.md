# Audit tokens génériques consommés directement #127 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Documenter dans le JSDoc `@cssprop` de chaque composant concerné les tokens génériques/globaux (`--ar-color-*`, `--ar-focus-ring-*`, `--ar-border-radius-*`, `--ar-font-size-*`) que son `.styles.ts` consomme directement, pour que la doc générée (ComponentApi) liste la totalité des CSS Custom Properties réellement consommées par le composant — pas seulement celles sous son propre préfixe `--ar-<composant>-*`.

**Architecture:** Documentation pure, aucun changement de comportement ni de nom de token. Pour chaque composant listé, on ajoute une entrée `@cssprop` par token générique déjà consommé dans le `.styles.ts`, à la suite des entrées existantes dans le JSDoc du `.ts`. Aucune modification de `default.css` ni de `.styles.ts` : ces tokens sont déjà déclarés globalement (section « PALETTE BRUTE » ou tokens sémantiques `--ar-color-*`/`--ar-focus-ring-*`/etc.) et le script de validation `validate-cssprop-defaults.js` les ignore explicitement (un token dont aucun préfixe de tag ne matche est un token global, pas un trou de doc à combler côté script) — donc ce chantier est un ajout volontaire de documentation, pas une exigence du garde-fou CI.

**Tech Stack:** Lit 3 + TypeScript, JSDoc `@cssprop` parsé par `custom-elements-manifest` (cem.config.js), Vitest.

## Global Constraints

- Aucun changement de `.styles.ts` ni de `default.css` dans ce chantier — uniquement des ajouts de lignes `@cssprop` dans les fichiers `.ts` des composants.
- Prettier n'agit pas sur les commentaires JSDoc mais respecter le style existant : `* @cssprop --ar-xxx - Description.` (majuscule initiale, point final).
- Chaque nouvelle entrée précise que le token est un **token sémantique global (non scopé au composant)**, pour que l'auteur de thème comprenne que le surcharger a un effet transverse sur d'autres composants.
- Conventional Commits (commitlint + Husky) — chaque tâche se termine par un commit séparé, préfixe `docs(<composant>): ...`.
- Branches `docs/<desc>` créées depuis `dev`. PR vers `dev`, jamais push direct sur `main`.
- Ne jamais committer `packages/core/dist/`.

---

## Contexte technique découvert pendant l'audit

- `packages/core/scripts/validate-cssprop-defaults.js:75-77` : « Un token dont aucun tag ne matche le préfixe (tokens globaux du thème comme `--ar-color-*`, `--ar-spacing-*`) est ignoré : ces tokens n'appartiennent à aucun composant, ce n'est pas un trou de doc. » — confirme que `npm run build:manifest` ne validera ni n'exigera ces nouvelles entrées : c'est un ajout purement volontaire, sans risque de casser le garde-fou existant.
- Six composants ont été identifiés par audit (`grep -oE -- '--ar-[a-z0-9-]+'` sur chaque `.styles.ts`, puis filtrage des tokens hors préfixe propre et hors alias `--ar-panel-*` déjà traités par #125) : `alert`, `breadcrumb`, `datepicker`, `dialog`, `stepper`, `tab`.
- `dialog.styles.ts:230` consomme aussi `--ar-color-danger-text`, mais ce token a déjà été traité comme cas particulier lors de l'audit #125 (remplacement de `--ar-color-danger-50`) et jugé ne pas nécessiter d'entrée `@cssprop` dédiée à ce moment-là — non repris ici pour rester cohérent avec cette décision passée à moins que l'issue ne soit rouverte ; **inclus dans ce plan (Task 4) car le périmètre de #127 couvre explicitement tous les tokens génériques sans exception**.
- `pagination.styles.ts` et `dropdown.styles.ts` contiennent des faux positifs textuels (mentions de `--ar-breadcrumb-color` et `--ar-panel-*` uniquement dans des commentaires, pas de `var()` réel) — confirmés sans action requise.
- `--ar-tab-group-border-top-width`/`-bottom-width` consommés par `tab.styles.ts` sont déjà couverts par une note JSDoc prose ajoutée lors de #125 (Task 11) — pas des `@cssprop` à ajouter ici, ce sont des tokens qui appartiennent réellement à `ar-tab-group` (leur propre préfixe), pas des tokens génériques.

---

### Task 1: Créer la branche de travail

**Files:** aucun fichier modifié — opération git uniquement.

- [ ] **Step 1: Créer la branche depuis `dev`**

```bash
cd /Users/jon/Code/Active_projects/ariane
git checkout dev
git pull
git checkout -b docs/audit-generic-tokens-127
```

- [ ] **Step 2: Vérifier l'état propre**

Run: `git status`
Expected: `On branch docs/audit-generic-tokens-127`, `nothing to commit, working tree clean`

---

### Task 2: Documenter `--ar-color-text` pour `ar-alert`

**Files:**

- Modify: `packages/core/src/components/alert/alert.ts:52`

**Interfaces:** aucune — ajout de doc pure.

- [ ] **Step 1: Ajouter l'entrée `@cssprop`**

Le JSDoc se termine ligne 52 par :

```
 * @cssprop --ar-alert-close-transition-duration - Durée de la transition (opacity/background-color) du bouton de fermeture au survol/focus.
```

Ajouter juste après :

```
 * @cssprop --ar-alert-close-transition-duration - Durée de la transition (opacity/background-color) du bouton de fermeture au survol/focus.
 * @cssprop --ar-color-text - Couleur du texte de l'alerte. Token sémantique global (non scopé à ar-alert) : le surcharger affecte aussi tous les autres composants qui le consomment directement.
```

- [ ] **Step 2: Vérifier la génération du manifest**

Run: `npm run build:manifest --workspace=@ariane-ui/core`
Expected: succès, aucune erreur (le token est ignoré par `validate-cssprop-defaults.js`, cf. contexte technique ci-dessus).

- [ ] **Step 3: Vérifier les tests existants**

Run: `npx vitest run packages/core/src/components/alert --root /Users/jon/Code/Active_projects/ariane`
Expected: tous les tests alert passent (aucun changement de code).

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/components/alert/alert.ts
git commit -m "docs(alert): documente --ar-color-text comme token global consomme par ar-alert"
```

---

### Task 3: Documenter les tokens génériques de `ar-breadcrumb`

**Files:**

- Modify: `packages/core/src/components/breadcrumb/breadcrumb.ts:54`

**Interfaces:** aucune — ajout de doc pure. Tokens concernés : `--ar-color-bg` (breadcrumb.styles.ts:101), `--ar-color-interactive` (breadcrumb.styles.ts:112), `--ar-color-neutral-90` (breadcrumb.styles.ts:130).

- [ ] **Step 1: Ajouter les 3 entrées `@cssprop`**

Le JSDoc se termine ligne 54 par :

```
 * @cssprop --ar-breadcrumb-toggle-bg-focus - Fond du bouton retour/trigger mobile au focus.
```

Ajouter juste après :

```
 * @cssprop --ar-breadcrumb-toggle-bg-focus - Fond du bouton retour/trigger mobile au focus.
 * @cssprop --ar-color-bg - Couleur du liseré autour des puces de la liste mobile (`box-shadow`). Token sémantique global (non scopé à ar-breadcrumb).
 * @cssprop --ar-color-interactive - Couleur de la puce du dernier élément de la liste mobile (élément actif/courant). Token sémantique global (non scopé à ar-breadcrumb).
 * @cssprop --ar-color-neutral-90 - Couleur du séparateur pointillé vertical entre les items de la liste mobile. Token de palette brute globale (non scopé à ar-breadcrumb).
```

- [ ] **Step 2: Vérifier la génération du manifest**

Run: `npm run build:manifest --workspace=@ariane-ui/core`
Expected: succès, aucune erreur.

- [ ] **Step 3: Vérifier les tests existants**

Run: `npx vitest run packages/core/src/components/breadcrumb --root /Users/jon/Code/Active_projects/ariane`
Expected: tous les tests breadcrumb passent.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/components/breadcrumb/breadcrumb.ts
git commit -m "docs(breadcrumb): documente les tokens globaux consommes par ar-breadcrumb"
```

---

### Task 4: Documenter les tokens génériques de `ar-datepicker` et `ar-dialog`

**Files:**

- Modify: `packages/core/src/components/datepicker/datepicker.ts:97`
- Modify: `packages/core/src/components/dialog/dialog.ts:82`

**Interfaces:** aucune — ajout de doc pure.

Tokens datepicker : `--ar-focus-ring-color` (datepicker.styles.ts:89,117), `--ar-focus-ring-offset` (datepicker.styles.ts:90,118), `--ar-color-text` (datepicker.styles.ts:138), `--ar-color-bg` (datepicker.styles.ts:178).

Tokens dialog : `--ar-color-bg` (dialog.styles.ts:77), `--ar-color-text` (dialog.styles.ts:78), `--ar-border-radius-lg` (dialog.styles.ts:85), `--ar-font-size-md` (dialog.styles.ts:149), `--ar-color-danger-text` (dialog.styles.ts:230).

- [ ] **Step 1: Ajouter les 4 entrées `@cssprop` dans `datepicker.ts`**

Le JSDoc se termine ligne 97 par :

```
 * @cssprop --ar-datepicker-input-error-border-color - Bordure input en état d'erreur.
```

Ajouter juste après :

```
 * @cssprop --ar-datepicker-input-error-border-color - Bordure input en état d'erreur.
 * @cssprop --ar-focus-ring-color - Couleur de l'anneau de focus des boutons de navigation et du footer. Token sémantique global (non scopé à ar-datepicker) — les cellules jour ont leur propre token scopé, --ar-datepicker-day-focus-ring-color.
 * @cssprop --ar-focus-ring-offset - Décalage de l'anneau de focus des boutons de navigation et du footer. Token sémantique global (non scopé à ar-datepicker).
 * @cssprop --ar-color-text - Couleur du texte des cellules jour. Token sémantique global (non scopé à ar-datepicker).
 * @cssprop --ar-color-bg - Couleur de bordure de la cellule jour focusée dans la grille (contraste avec l'anneau de focus). Token sémantique global (non scopé à ar-datepicker).
```

- [ ] **Step 2: Ajouter les 5 entrées `@cssprop` dans `dialog.ts`**

Le JSDoc se termine ligne 82 par :

```
 * @cssprop --ar-dialog-close-bg-focus - Fond du bouton de fermeture au focus.
```

Ajouter juste après :

```
 * @cssprop --ar-dialog-close-bg-focus - Fond du bouton de fermeture au focus.
 * @cssprop --ar-color-bg - Fond du dialog. Token sémantique global (non scopé à ar-dialog).
 * @cssprop --ar-color-text - Couleur du texte du dialog. Token sémantique global (non scopé à ar-dialog).
 * @cssprop --ar-border-radius-lg - Border-radius du dialog en mode modal (non-drawer). Token sémantique global (non scopé à ar-dialog).
 * @cssprop --ar-font-size-md - Taille de police du titre (h1). Token sémantique global (non scopé à ar-dialog).
 * @cssprop --ar-color-danger-text - Couleur de l'anneau de mise en évidence (`outline`) affiché à la place du shake en `prefers-reduced-motion: reduce`. Token sémantique global (non scopé à ar-dialog).
```

- [ ] **Step 3: Vérifier la génération du manifest**

Run: `npm run build:manifest --workspace=@ariane-ui/core`
Expected: succès, aucune erreur.

- [ ] **Step 4: Vérifier les tests existants**

Run: `npx vitest run packages/core/src/components/datepicker packages/core/src/components/dialog --root /Users/jon/Code/Active_projects/ariane`
Expected: tous les tests datepicker et dialog passent.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/components/datepicker/datepicker.ts packages/core/src/components/dialog/dialog.ts
git commit -m "docs(datepicker,dialog): documente les tokens globaux consommes directement"
```

---

### Task 5: Documenter les tokens génériques de `ar-stepper` et `ar-tab`

**Files:**

- Modify: `packages/core/src/components/stepper/stepper.ts:81`
- Modify: `packages/core/src/components/tab/tab.ts:30`

**Interfaces:** aucune — ajout de doc pure.

Tokens stepper : `--ar-color-interactive` (stepper.styles.ts:110,128), `--ar-color-text` (stepper.styles.ts:116), `--ar-color-text-inverse` (stepper.styles.ts:121).

Tokens tab : `--ar-focus-ring-color` (tab.styles.ts:45).

- [ ] **Step 1: Ajouter les 3 entrées `@cssprop` dans `stepper.ts`**

Le JSDoc se termine ligne 81 par :

```
 * @cssprop --ar-stepper-trigger-radius - Border-radius du bouton trigger mobile.
```

Ajouter juste après :

```
 * @cssprop --ar-stepper-trigger-radius - Border-radius du bouton trigger mobile.
 * @cssprop --ar-color-interactive - Couleur de la puce et de l'anneau de focus du lien d'étape au survol/focus. Token sémantique global (non scopé à ar-stepper).
 * @cssprop --ar-color-text - Couleur du label de l'étape au survol/focus. Token sémantique global (non scopé à ar-stepper).
 * @cssprop --ar-color-text-inverse - Couleur du numéro affiché dans la puce au survol/focus. Token sémantique global (non scopé à ar-stepper).
```

- [ ] **Step 2: Ajouter l'entrée `@cssprop` dans `tab.ts`**

Le JSDoc contient ligne 30 :

```
 * @cssprop --ar-tab-focus-ring-offset - Décalage de la bague de focus. Valeur négative = inset (non coupée par le conteneur overflow du tab-group). Surcharge le token global --ar-focus-ring-offset pour ce composant.
```

Ajouter juste après (avant le bloc de prose « Note d'implémentation » existant) :

```
 * @cssprop --ar-tab-focus-ring-offset - Décalage de la bague de focus. Valeur négative = inset (non coupée par le conteneur overflow du tab-group). Surcharge le token global --ar-focus-ring-offset pour ce composant.
 * @cssprop --ar-focus-ring-color - Couleur de la bague de focus de l'onglet. Token sémantique global (non scopé à ar-tab).
```

- [ ] **Step 3: Vérifier la génération du manifest**

Run: `npm run build:manifest --workspace=@ariane-ui/core`
Expected: succès, aucune erreur.

- [ ] **Step 4: Vérifier les tests existants**

Run: `npx vitest run packages/core/src/components/stepper packages/core/src/components/tab --root /Users/jon/Code/Active_projects/ariane`
Expected: tous les tests stepper et tab passent.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/components/stepper/stepper.ts packages/core/src/components/tab/tab.ts
git commit -m "docs(stepper,tab): documente les tokens globaux consommes directement"
```

---

### Task 6: Ouvrir la Pull Request

**Files:** aucun fichier modifié — opération git/GitHub uniquement.

- [ ] **Step 1: Pousser la branche**

```bash
cd /Users/jon/Code/Active_projects/ariane
git push -u origin docs/audit-generic-tokens-127
```

- [ ] **Step 2: Lancer la suite de tests complète et le build du manifest une dernière fois**

Run: `npm run build:manifest --workspace=@ariane-ui/core && npm run test`
Expected: build du manifest réussi, tous les tests passent (racine, `turbo run test`).

- [ ] **Step 3: Créer la PR vers `dev`**

```bash
gh pr create --base dev --title "docs: documente les tokens generiques consommes directement par les composants (audit #127)" --body "$(cat <<'EOF'
## Summary
- Ajoute une entrée @cssprop pour chaque token générique/global (--ar-color-*, --ar-focus-ring-*, --ar-border-radius-*, --ar-font-size-*) consommé directement dans les .styles.ts de ar-alert, ar-breadcrumb, ar-datepicker, ar-dialog, ar-stepper et ar-tab
- Documentation pure : aucun changement de comportement, de nom de token ou de default.css — ces tokens sont ignorés par le garde-fou validate-cssprop-defaults.js (aucun préfixe de tag ne matche un token global), donc rien à corriger côté script
- Complète l'angle de #125 (qui documentait les tokens sous le préfixe propre de chaque composant) avec les tokens globaux invisibles depuis la doc générée (ComponentApi)

Closes #127

## Test plan
- [ ] `npm run build:manifest` passe sans erreur sur les 19 composants
- [ ] `npm run test` (suite Vitest complète) passe
- [ ] Vérifier dans le playground docs que chaque composant modifié affiche bien les nouvelles entrées @cssprop dans son tableau ComponentApi
EOF
)"
```

- [ ] **Step 4: Confirmer la création**

Run: `gh pr view --web` (ou noter l'URL retournée par `gh pr create`)
Expected: PR ouverte vers `dev`, CI déclenchée.

---

## Self-Review

**1. Couverture spec (6 composants + branche/PR) :**

- alert (--ar-color-text) → Task 2. ✓
- breadcrumb (--ar-color-bg, --ar-color-interactive, --ar-color-neutral-90) → Task 3. ✓
- datepicker (--ar-focus-ring-color, --ar-focus-ring-offset, --ar-color-text, --ar-color-bg) → Task 4. ✓
- dialog (--ar-color-bg, --ar-color-text, --ar-border-radius-lg, --ar-font-size-md, --ar-color-danger-text) → Task 4. ✓
- stepper (--ar-color-interactive, --ar-color-text, --ar-color-text-inverse) → Task 5. ✓
- tab (--ar-focus-ring-color) → Task 5. ✓
- Branche (Task 1) et PR (Task 6) encadrent le tout, conformément à la convention du projet (cf. plan #125).

**2. Scan de placeholders :** aucun « TBD »/« TODO » — chaque step contient le texte exact à insérer et sa position (ligne + contenu de la ligne précédente).

**3. Cohérence des noms :** vérifié que chaque token cité dans une tâche correspond exactement au nom trouvé par grep dans le `.styles.ts` correspondant (pas de faux positifs — `pagination.styles.ts`/`dropdown.styles.ts` exclus car mentions en commentaire uniquement, `--ar-tab-group-border-*-width` exclu de `tab.ts` car appartient réellement à `ar-tab-group`, déjà documenté via prose lors de #125).
