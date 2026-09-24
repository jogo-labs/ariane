# Migration token vs ::part() — ar-alert (issue #129, lot 3a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Appliquer à `ar-alert` le même critère token-vs-`::part()` déjà appliqué à `ar-stepper` (PR #138) et `ar-datepicker` (PR #141) — migrer les tokens structurels non réutilisés vers des règles externes de `default.css`, ajouter un fallback WCAG 2.5.8 manquant sur `--ar-alert-close-size`, et nettoyer la documentation JSDoc en conséquence.

**Architecture:** `alert.styles.ts` perd 5 déclarations `var(--ar-alert-*)` qui deviennent des valeurs littérales dans deux nouvelles règles de `packages/core/src/styles/themes/default.css` : `ar-alert { padding; border-radius; border-width; border-style; }` (propriétés sur `:host`, ciblage direct du tag) et `ar-alert::part(close) { border-radius; }`. Les 5 tokens `:root` correspondants sont supprimés de `default.css`, ainsi que leurs entrées `@cssprop` dans `alert.ts`. `--ar-alert-close-size` reste un token (réutilisé 2× dans `alert.styles.ts` pour `width`/`height` — critère 3 ADR-005) mais gagne un fallback `var(--ar-alert-close-size, 2rem)` avec commentaire `a11y-fallback` (WCAG 2.5.8), sur le modèle de `--ar-datepicker-day-size`. `--ar-alert-close-transition-duration` reste inchangé — vérifié empiriquement (Playwright/Chromium) qu'une règle externe `::part(close)` portant la transition annulerait la garde interne `prefers-reduced-motion: reduce`, ce qui casserait l'accessibilité motion.

**Tech Stack:** Lit 3, TypeScript, CSS natif avec nesting (`&::part()`), Vitest, `@web/test-runner` (navigateur réel), garde-fous CEM (`packages/core/scripts/validate-cssprop-defaults.js`, `validate-no-hardcoded-tokens.js`).

## Global Constraints

- Prettier : 100 caractères, 4 espaces, quotes simples (CLAUDE.md).
- Aucune valeur de design en dur dans `*.styles.ts` (`validate-no-hardcoded-tokens.js` fait échouer `npm run build:manifest` sinon) — les 5 tokens migrés doivent disparaître entièrement de `alert.styles.ts`, pas juste être renommés.
- Tout token `:root` de `default.css` appartenant à un composant doit avoir une entrée `@cssprop` dans son JSDoc (`validate-cssprop-defaults.js`) — supprimer les 5 entrées correspondantes dans `alert.ts` en même temps que les tokens.
- `npm run test` (Vitest, racine) et `npm run test:all` (Vitest + WTR navigateur) doivent passer avant toute revue finale.
- Ne jamais merger sur `dev` sans confirmation explicite de l'utilisateur.

---

### Task 1 : Créer la branche et vérifier l'état de départ

**Files:** aucun fichier modifié dans cette tâche.

- [ ] **Step 1: Vérifier que `dev` est à jour et propre**

```bash
cd /Users/jon/Code/Active_projects/ariane
git status
git checkout dev
git pull origin dev
```

Expected: `git status` ne montre aucun fichier modifié avant le checkout ; `dev` à jour après le pull.

- [ ] **Step 2: Créer la branche de travail**

```bash
git checkout -b fix/alert-token-vs-part-129
```

Expected: bascule sur la nouvelle branche, confirmé par `git branch --show-current`.

- [ ] **Step 3: Faire tourner la suite de tests existante comme référence avant modification**

```bash
npm run test --workspace=packages/core
```

Expected: tous les tests passent (baseline verte avant toute modification).

---

### Task 2 : Migrer les 4 tokens `:host` (padding, border-radius, border-width, border-style)

**Files:**

- Modify: `packages/core/src/components/alert/alert.styles.ts:4-17`
- Modify: `packages/core/src/components/alert/alert.ts:32-35` (retrait des 4 entrées `@cssprop`)
- Modify: `packages/core/src/styles/themes/default.css:294-299` (retrait des 4 tokens `:root`)
- Modify: `packages/core/src/styles/themes/default.css:921` (ajout du nouveau bloc `ar-alert { }` en fin de fichier)

**Interfaces:**

- Consumes: rien d'une tâche précédente.
- Produces: bloc `ar-alert { padding: 1rem; border-radius: 0.75rem; border-width: 1px; border-style: solid; }` dans `default.css`, réutilisé par la Task 3 qui y ajoute `&::part(close) { ... }` dans le même bloc.

- [ ] **Step 1 : Retirer les 4 `var()` de `alert.styles.ts` et les remplacer par rien (propriété retirée du composant)**

Dans `packages/core/src/components/alert/alert.styles.ts`, le bloc `:host` actuel (lignes 4-17) est :

```css
:host {
    display: flex;
    box-sizing: border-box;
    column-gap: 0.75rem;
    position: relative;
    align-items: center;
    opacity: 1;
    transform: scale(1);
    color: var(--ar-alert-color);
    padding: var(--ar-alert-padding);
    border-radius: var(--ar-alert-border-radius);
    border-width: var(--ar-alert-border-width);
    border-style: var(--ar-alert-border-style);
}
```

Remplacer par (retire `padding`, `border-radius`, `border-width`, `border-style` — ces propriétés ne sont plus déclarées par le composant du tout, elles viendront de la règle externe `ar-alert { }` de `default.css`) :

```css
:host {
    display: flex;
    box-sizing: border-box;
    column-gap: 0.75rem;
    position: relative;
    align-items: center;
    opacity: 1;
    transform: scale(1);
    color: var(--ar-alert-color);
}
```

- [ ] **Step 2 : Retirer les 4 tokens de `default.css` (`:root`)**

Dans `packages/core/src/styles/themes/default.css`, supprimer ces 4 lignes du bloc `/* alert */` (lignes 296-299 actuelles) :

```css
--ar-alert-padding: 1rem;
--ar-alert-border-radius: 0.75rem;
--ar-alert-border-width: 1px;
--ar-alert-border-style: solid;
```

Le bloc `/* alert */` restant commence directement par `--ar-alert-color` puis enchaîne sur `--ar-alert-close-size`.

- [ ] **Step 3 : Ajouter le nouveau bloc `ar-alert { }` en fin de `default.css`**

Le fichier se termine actuellement par le bloc `ar-stepper { ... }` puis les deux accolades fermantes du `@layer ariane.theme { :root { ... } ... }`. Insérer un nouveau bloc `ar-alert { }` juste après la fermeture du bloc `ar-stepper` (avant la dernière accolade fermante du `@layer`) :

```css
    ar-alert {
        padding: 1rem;
        border-radius: 0.75rem;
        border-width: 1px;
        border-style: solid;
    }
}
```

(la dernière accolade `}` ci-dessus est celle, déjà existante, qui ferme `@layer ariane.theme`).

- [ ] **Step 4 : Retirer les 4 entrées `@cssprop` correspondantes du JSDoc de `alert.ts`**

Dans `packages/core/src/components/alert/alert.ts`, dans le bloc JSDoc de la classe (lignes 32-35 actuelles), supprimer :

```
 * @cssprop --ar-alert-border-radius - Arrondi des alertes.
 * @cssprop --ar-alert-padding - Marge interne des alertes.
 * @cssprop --ar-alert-border-width - Epaisseur des bordures.
 * @cssprop --ar-alert-border-style - Style des bordures.
```

- [ ] **Step 5 : Régénérer le manifest et vérifier les garde-fous CEM**

```bash
npm run build:manifest --workspace=packages/core
```

Expected: la commande réussit sans erreur `validate-cssprop-defaults`/`validate-no-hardcoded-tokens` (ces 4 tokens ne sont plus dans `default.css` ni référencés dans `alert.styles.ts`, donc plus aucune incohérence à détecter pour eux).

- [ ] **Step 6 : Commit**

```bash
git add packages/core/src/components/alert/alert.styles.ts \
        packages/core/src/components/alert/alert.ts \
        packages/core/src/styles/themes/default.css \
        packages/core/dist/custom-elements.json
git commit -m "refactor(alert): migre padding/border-radius/border-width/border-style vers règle externe ar-alert (#129)"
```

---

### Task 3 : Migrer `--ar-alert-close-radius` vers `::part(close)`

**Files:**

- Modify: `packages/core/src/components/alert/alert.styles.ts:70-103` (bloc `[part='close']`)
- Modify: `packages/core/src/components/alert/alert.ts` (retrait de l'entrée `@cssprop --ar-alert-close-radius`)
- Modify: `packages/core/src/styles/themes/default.css` (retrait du token `:root`, ajout de `&::part(close) { border-radius: 7px; }` dans le bloc `ar-alert { }` créé en Task 2)

**Interfaces:**

- Consumes: bloc `ar-alert { }` créé en Task 2 (Step 3).
- Produces: aucune interface consommée par une tâche suivante — cette migration est indépendante des Tasks 4/5.

- [ ] **Step 1 : Retirer `border-radius: var(--ar-alert-close-radius)` du bloc `[part='close']` de `alert.styles.ts`**

Ligne actuelle (dans le bloc `[part='close']`, `packages/core/src/components/alert/alert.styles.ts:81`) :

```css
border-radius: var(--ar-alert-close-radius);
```

Supprimer cette ligne entièrement (le reste du bloc `[part='close']` — `order`, `align-self`, `flex-shrink`, `display`, `align-items`, `justify-content`, `width`, `height`, `padding`, `border`, `background-color`, `color`, `cursor`, `opacity`, `transition`, `position`, `top`, `right`, et les sous-règles `&:hover`/`&:focus-visible` — reste inchangé).

- [ ] **Step 2 : Retirer le token de `default.css`**

Supprimer la ligne `--ar-alert-close-radius: 7px;` du bloc `/* alert */` de `:root`.

- [ ] **Step 3 : Ajouter la règle `::part(close)` dans le bloc `ar-alert { }`**

Le bloc créé en Task 2 devient :

```css
    ar-alert {
        padding: 1rem;
        border-radius: 0.75rem;
        border-width: 1px;
        border-style: solid;

        &::part(close) {
            border-radius: 7px;
        }
    }
}
```

- [ ] **Step 4 : Retirer l'entrée `@cssprop --ar-alert-close-radius` du JSDoc de `alert.ts`**

Supprimer la ligne :

```
 * @cssprop --ar-alert-close-radius - Arrondi du bouton de fermeture.
```

- [ ] **Step 5 : Régénérer le manifest**

```bash
npm run build:manifest --workspace=packages/core
```

Expected: succès, aucune erreur de garde-fou CEM.

- [ ] **Step 6 : Commit**

```bash
git add packages/core/src/components/alert/alert.styles.ts \
        packages/core/src/components/alert/alert.ts \
        packages/core/src/styles/themes/default.css \
        packages/core/dist/custom-elements.json
git commit -m "refactor(alert): migre close-radius vers ::part(close) (#129)"
```

---

### Task 4 : Ajouter le fallback WCAG 2.5.8 manquant sur `--ar-alert-close-size`

**Files:**

- Modify: `packages/core/src/components/alert/alert.styles.ts:77-78`

**Interfaces:**

- Consumes: rien des tâches précédentes.
- Produces: rien consommé par une tâche suivante.

Contexte : `--ar-alert-close-size` reste un token (réutilisé 2× dans le fichier pour `width`/`height`), mais contrairement à `--ar-datepicker-day-size` (qui a un fallback `var(--ar-datepicker-day-size, 2.5rem)` avec commentaire `a11y-fallback` documentant WCAG 2.5.8), `--ar-alert-close-size` n'a aujourd'hui aucun fallback — sans thème chargé, le bouton de fermeture perdrait sa taille de cible tactile.

- [ ] **Step 1 : Ajouter le fallback et le commentaire, sur le modèle de `datepicker.styles.ts:94-97`**

Lignes actuelles (`alert.styles.ts:77-78`) :

```css
width: var(--ar-alert-close-size);
height: var(--ar-alert-close-size);
```

Remplacer par :

```css
/* a11y-fallback: WCAG 2.5.8 (Target Size Minimum) — sans thème chargé, le bouton perdrait sa taille de cible tactile */
width: var(--ar-alert-close-size, 2rem);
/* a11y-fallback: WCAG 2.5.8 (Target Size Minimum) — sans thème chargé, le bouton perdrait sa taille de cible tactile */
height: var(--ar-alert-close-size, 2rem);
```

- [ ] **Step 2 : Régénérer le manifest et vérifier le garde-fou `validate-no-hardcoded-tokens` (justification de fallback)**

```bash
npm run build:manifest --workspace=packages/core
```

Expected: succès — le commentaire `a11y-fallback` précédant chaque ligne est détecté par `findUnjustifiedFallbacks` (cf. `validate-no-hardcoded-tokens.js`), pas d'échec de garde-fou.

- [ ] **Step 3 : Commit**

```bash
git add packages/core/src/components/alert/alert.styles.ts packages/core/dist/custom-elements.json
git commit -m "fix(alert): ajoute le fallback WCAG 2.5.8 manquant sur close-size (#129)"
```

---

### Task 5 : Vérification visuelle Playwright et suite de tests complète

**Files:** aucun fichier de code modifié — vérification uniquement.

**Interfaces:**

- Consumes: l'ensemble des changements des Tasks 2-4.

- [ ] **Step 1 : Rebuild explicite du JS de `packages/core` avant toute vérification navigateur**

```bash
npm run build:dev --workspace=packages/core
```

Expected: build réussi. (Rappel : `npm run dev --workspace=apps/docs` seul ne reconstruit pas ce JS — rebuild explicite obligatoire avant toute vérification Playwright d'un changement de renderer/thème.)

- [ ] **Step 2 : Lancer le site de doc et vérifier visuellement les 3 variants d'`ar-alert` (default, success, dismissible)**

```bash
npm run dev --workspace=apps/docs
```

Ouvrir `http://localhost:4321/components/ar-alert` (ou le port affiché) et vérifier à l'œil :

- Les 4 variants (`info`/`warning`/`error`/`success`) gardent leur padding, arrondi et bordure identiques à avant (aucun changement visuel attendu, seulement un changement de source de la valeur).
- Le bouton de fermeture (variant "dismissible") garde son arrondi (7px) et sa taille (2rem).
- Vérifier dans les DevTools (`getComputedStyle` sur l'hôte `ar-alert` et sur le bouton `[part='close']`) que `padding`, `border-radius`, `border-width`, `border-style` résolvent bien aux mêmes valeurs qu'avant (1rem / 0.75rem / 1px / solid), et que `[part='close']` résout `border-radius: 7px`.

Expected: aucune régression visuelle.

- [ ] **Step 3 : Faire tourner la suite de tests complète**

```bash
npm run test --workspace=packages/core
npm run test:all
```

Expected: tous les tests passent (Vitest + WTR navigateur), y compris `alert.test.ts` et `alert.a11y.test.ts` sans modification requise (aucune assertion existante ne porte sur ces tokens).

- [ ] **Step 4 : Vérifier qu'aucune référence morte aux 5 tokens migrés ne subsiste**

```bash
grep -rn -- "--ar-alert-padding\|--ar-alert-border-radius\|--ar-alert-border-width\|--ar-alert-border-style\|--ar-alert-close-radius" packages/core/src apps/docs/src
```

Expected: aucune occurrence (les 5 tokens ont été entièrement retirés du composant, du thème et du JSDoc).

---

### Task 6 : Revue finale de branche et ouverture de la PR

**Files:** aucun nouveau fichier — revue + PR.

- [ ] **Step 1 : Diff complet de la branche pour auto-revue**

```bash
git diff dev...fix/alert-token-vs-part-129
```

Vérifier : les 5 tokens supprimés du `:root` de `default.css` correspondent exactement aux 5 entrées `@cssprop` supprimées de `alert.ts` ; le nouveau bloc `ar-alert { }` reproduit exactement les valeurs d'origine (`1rem`/`0.75rem`/`1px`/`solid`/`7px`) ; `--ar-alert-close-size` et `--ar-alert-close-transition-duration` sont inchangés à l'exception du fallback ajouté sur le premier.

- [ ] **Step 2 : Pousser la branche et ouvrir la PR vers `dev`**

```bash
git push -u origin fix/alert-token-vs-part-129
gh pr create --base dev --title "refactor(alert): migre token vs ::part() (lot 3a, #129)" --body "$(cat <<'EOF'
## Résumé

- Migre 5 tokens structurels d'`ar-alert` vers des règles externes de `default.css` (critère ADR-005) : `padding`/`border-radius`/`border-width`/`border-style` (règle `ar-alert { }` sur l'hôte) et `close-radius` (`ar-alert::part(close)`).
- Ajoute le fallback WCAG 2.5.8 manquant sur `--ar-alert-close-size` (sur le modèle de `--ar-datepicker-day-size`), qui reste un token (réutilisé 2× dans le composant).
- `--ar-alert-close-transition-duration` reste inchangé : vérifié empiriquement (Chromium/Playwright) qu'externaliser la transition casserait la garde `prefers-reduced-motion: reduce`.
- Les 12 tokens sémantiques (bg/border/icon des 4 variants) restent tokens (fallback WCAG + calibration dark-mode sur les bordures) — hors périmètre de cette migration.

## Test plan

- [ ] `npm run test --workspace=packages/core` vert
- [ ] `npm run test:all` vert
- [ ] `npm run build:manifest --workspace=packages/core` sans erreur de garde-fou
- [ ] Vérification visuelle des 4 variants + bouton fermer sur le site de doc (aucune régression)
EOF
)"
```

Expected: PR créée, lien affiché.

- [ ] **Step 3 : Attendre la confirmation explicite de l'utilisateur avant tout merge**

Ne pas merger sur `dev` sans confirmation explicite — règle permanente depuis l'incident PR #137.

---

## Self-Review

**Spec coverage** :

- Migration des 4 tokens `:host` → Task 2. ✅
- Migration de `close-radius` → Task 3. ✅
- Fallback WCAG manquant sur `close-size` → Task 4. ✅
- `close-transition-duration` explicitement laissé inchangé (justifié) → mentionné dans le header du plan et le corps de PR (Task 6), aucune tâche de code nécessaire. ✅
- Vérification visuelle + tests → Task 5. ✅
- Branche en Task 1, PR en dernière tâche → conforme à la convention du projet. ✅

**Placeholder scan** : aucun "TBD"/"implement later" — chaque step contient le code exact à écrire/retirer.

**Type consistency** : les noms de tokens (`--ar-alert-padding`, `--ar-alert-border-radius`, `--ar-alert-border-width`, `--ar-alert-border-style`, `--ar-alert-close-radius`, `--ar-alert-close-size`) sont utilisés de façon cohérente entre toutes les tâches ; le bloc `ar-alert { }` de `default.css` est introduit en Task 2 et complété en Task 3 sans redéfinition contradictoire.
