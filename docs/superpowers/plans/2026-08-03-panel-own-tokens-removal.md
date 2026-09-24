# Retrait des tokens panel redondants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retirer les 6 tokens publics redondants (`--ar-dropdown-bg`, `--ar-dropdown-border-color`,
`--ar-breadcrumb-panel-bg`, `--ar-breadcrumb-panel-border-color`, `--ar-stepper-panel-bg`,
`--ar-stepper-panel-border-color`) qui ne divergent jamais du générique `--ar-panel-*` et court-
circuitaient silencieusement la technique de personnalisation documentée en PR #151 —
conformément à `docs/superpowers/specs/2026-08-03-panel-own-tokens-removal-design.md`.

**Architecture:** Aucun changement de structure DOM, aucun nouveau `part`. `ar-dropdown`,
`ar-breadcrumb`, `ar-stepper` héritent désormais directement de `background-color`/`border-color`
posés par `panel.styles.ts` (déjà le cas pour `ar-datepicker`) au lieu de passer par un token
intermédiaire propre. Continuation de la même branche/PR que le chantier de documentation
publique des tokens panel (`docs/panel-tokens-public-doc`, PR #151) — pas de nouvelle branche.

**Tech Stack:** Lit 3, TypeScript, CSS custom properties, Astro, Prettier, garde-fous CI
(`validate-cssprop-defaults.js`).

## Global Constraints

- Prettier : 100 char, 4 spaces, single quotes (CLAUDE.md).
- Retrait direct sans dépréciation — projet en alpha (`0.1.0-alpha.8`), conforme à CLAUDE.md.
- Aucune mention de `default.css`/du thème par défaut dans les descriptions `@cssprop` restantes
  ou modifiées (cf. `feedback_jsdoc_no_default_theme_mention` — règle vérifiée applicable ici :
  aucune nouvelle description n'est ajoutée dans ce plan, seulement des suppressions).
- Ne jamais merger sur `dev` sans confirmation explicite de l'utilisateur
  (feedback_merge_after_autonomous_fix).
- `npm run dev --workspace=apps/docs` seul ne reconstruit pas le JS de `packages/core/dist` —
  rebuild explicite (`npm run build:dev --workspace=packages/core`) requis avant toute
  vérification Playwright (feedback_docs_dev_stale_dist).
- On continue sur la branche `docs/panel-tokens-public-doc` (déjà poussée, PR #151 ouverte) — pas
  de nouvelle branche à créer.

---

## Task 1: Retirer le bloc `[part='panel']` — `ar-dropdown`

**Files:**

- Modify: `packages/core/src/components/dropdown/dropdown.styles.ts`

**Interfaces:**

- Consumes: `panel.styles.ts` fournit désormais directement `background-color`/`border-color` du
  panel via `var(--ar-panel-bg, Canvas)`/`var(--ar-panel-border-color, ButtonBorder)`, sans
  interception par ce composant.
- Produces: aucun changement de rendu — les valeurs de repli (`Canvas`/`ButtonBorder`) et le token
  générique (`--ar-panel-bg`/`--ar-panel-border-color`) sont strictement identiques à avant.

- [ ] **Step 1: Retirer le bloc entier**

Contenu actuel (`dropdown.styles.ts:8-12`) :

```ts
    [part='panel'] {
        /* Overrides composant — chaînent vers les tokens shared --ar-panel-* */
        background-color: var(--ar-dropdown-bg, Canvas);
        border-color: var(--ar-dropdown-border-color, ButtonBorder);
    }
```

Retirer ces 5 lignes entièrement (accolades incluses), en gardant une seule ligne vide entre les
règles `:host { }` et `` ` `` de fermeture du template (pas deux lignes vides consécutives).

- [ ] **Step 2: Vérifier le format**

Run: `npx prettier --check packages/core/src/components/dropdown/dropdown.styles.ts`
Expected: pas d'erreur.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/components/dropdown/dropdown.styles.ts
git commit -m "refactor(dropdown): retire l'override panel non divergent, hérite directement de panel.styles.ts"
```

---

## Task 2: Retirer le bloc `[part='panel']` — `ar-breadcrumb`

**Files:**

- Modify: `packages/core/src/components/breadcrumb/breadcrumb.styles.ts`

**Interfaces:**

- Consumes: idem Task 1, pour `ar-breadcrumb`.
- Produces: aucun changement de rendu.

- [ ] **Step 1: Retirer le bloc entier**

Contenu actuel (`breadcrumb.styles.ts:101-106`) :

```ts
    /* ── Panel flottant mobile ───────────────────────────────── */

    [part='panel'] {
        background-color: var(--ar-breadcrumb-panel-bg, Canvas);
        border-color: var(--ar-breadcrumb-panel-border-color, ButtonBorder);
    }
```

Retirer le bloc `[part='panel'] { ... }` (4 lignes, accolades incluses). Conserver le commentaire
de section `/* ── Panel flottant mobile ── */` seulement s'il précède encore une autre règle liée
au panel juste après (vérifier le fichier réel avant de trancher — s'il ne précède plus rien,
retirer aussi le commentaire pour éviter un titre de section vide).

- [ ] **Step 2: Vérifier le format**

Run: `npx prettier --check packages/core/src/components/breadcrumb/breadcrumb.styles.ts`
Expected: pas d'erreur.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/components/breadcrumb/breadcrumb.styles.ts
git commit -m "refactor(breadcrumb): retire l'override panel non divergent, hérite directement de panel.styles.ts"
```

---

## Task 3: Retirer le bloc `[part='panel']` — `ar-stepper`

**Files:**

- Modify: `packages/core/src/components/stepper/stepper.styles.ts`

**Interfaces:**

- Consumes: idem Task 1, pour `ar-stepper`.
- Produces: aucun changement de rendu.

- [ ] **Step 1: Retirer le bloc entier**

Contenu actuel (`stepper.styles.ts:25-28`) :

```ts
    [part='panel'] {
        background-color: var(--ar-stepper-panel-bg, Canvas);
        border-color: var(--ar-stepper-panel-border-color, ButtonBorder);
    }
```

Retirer ces 4 lignes entièrement (accolades incluses), garder une seule ligne vide entre la règle
précédente et la règle suivante (`[part='list']`).

- [ ] **Step 2: Vérifier le format**

Run: `npx prettier --check packages/core/src/components/stepper/stepper.styles.ts`
Expected: pas d'erreur.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/components/stepper/stepper.styles.ts
git commit -m "refactor(stepper): retire l'override panel non divergent, hérite directement de panel.styles.ts"
```

---

## Task 4: Retirer les `@cssprop` correspondants du JSDoc

**Files:**

- Modify: `packages/core/src/components/dropdown/dropdown.ts`
- Modify: `packages/core/src/components/breadcrumb/breadcrumb.ts`
- Modify: `packages/core/src/components/stepper/stepper.ts`

**Interfaces:**

- Consumes: rien.
- Produces: le CEM manifest n'expose plus ces 6 entrées `cssProperties` — la table « CSS Custom
  Properties propres » de `ComponentApi.astro` (PR #151, déjà mergée sur cette branche) les fait
  disparaître automatiquement, sans changement de code côté `apps/docs`.

- [ ] **Step 1: `dropdown.ts` — retirer 2 lignes**

Contenu actuel (`dropdown.ts:34-35`) :

```
 * @cssprop --ar-dropdown-bg - Fond du panel (cascade vers --ar-panel-bg, repli système `Canvas` si aucun thème n'est chargé).
 * @cssprop --ar-dropdown-border-color - Bordure (cascade vers --ar-panel-border-color, repli système `ButtonBorder` si aucun thème n'est chargé).
```

Retirer ces 2 lignes. Les lignes voisines (`--ar-dropdown-distance`, `--ar-dropdown-offset`, et les
9 lignes `--ar-panel-*` ajoutées en PR #151) restent inchangées.

- [ ] **Step 2: `breadcrumb.ts` — retirer 2 lignes**

Contenu actuel (`breadcrumb.ts:50-51`) :

```
 * @cssprop --ar-breadcrumb-panel-bg - Fond du panel mobile (cascade vers --ar-panel-bg, repli système `Canvas` si aucun thème n'est chargé).
 * @cssprop --ar-breadcrumb-panel-border-color - Couleur de bordure du panel mobile (cascade vers --ar-panel-border-color, repli système `ButtonBorder` si aucun thème n'est chargé).
```

Retirer ces 2 lignes. Les autres `@cssprop` du bloc restent inchangés.

- [ ] **Step 3: `stepper.ts` — retirer 2 lignes**

Contenu actuel (`stepper.ts:58-59`) :

```
 * @cssprop --ar-stepper-panel-bg - Fond du panel mobile (cascade vers --ar-panel-bg, repli système `Canvas` si aucun thème n'est chargé).
 * @cssprop --ar-stepper-panel-border-color - Couleur de bordure du panel mobile (cascade vers --ar-panel-border-color, repli système `ButtonBorder` si aucun thème n'est chargé).
```

Retirer ces 2 lignes. Les autres `@cssprop` du bloc restent inchangés.

- [ ] **Step 4: Vérifier le format des 3 fichiers**

Run: `npx prettier --check packages/core/src/components/dropdown/dropdown.ts packages/core/src/components/breadcrumb/breadcrumb.ts packages/core/src/components/stepper/stepper.ts`
Expected: pas d'erreur.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/components/dropdown/dropdown.ts packages/core/src/components/breadcrumb/breadcrumb.ts packages/core/src/components/stepper/stepper.ts
git commit -m "docs: retire les @cssprop des 6 tokens panel redondants supprimés"
```

---

## Task 5: Retirer les déclarations dans `default.css`

**Files:**

- Modify: `packages/core/src/styles/themes/default.css`

**Interfaces:**

- Consumes: rien.
- Produces: le thème par défaut ne redéfinit plus ces 6 tokens — `ar-dropdown`/`ar-breadcrumb`/
  `ar-stepper` reçoivent leur fond/bordure directement de `--ar-panel-bg`/`--ar-panel-border-color`
  (déjà définis à la racine, `default.css:302-303`), valeur strictement identique.

- [ ] **Step 1: Retirer les 3 paires de déclarations**

Repérer et retirer (les numéros de ligne exacts peuvent avoir légèrement bougé depuis l'audit —
localiser par grep avant de couper) :

```css
--ar-breadcrumb-panel-bg: var(--ar-panel-bg);
--ar-breadcrumb-panel-border-color: var(--ar-panel-border-color);
```

```css
--ar-stepper-panel-bg: var(--ar-panel-bg);
--ar-stepper-panel-border-color: var(--ar-panel-border-color);
```

```css
--ar-dropdown-bg: var(--ar-panel-bg);
--ar-dropdown-border-color: var(--ar-panel-border-color);
```

Run avant de trancher : `grep -n "ar-dropdown-bg\|ar-dropdown-border-color\|ar-breadcrumb-panel-bg\|ar-breadcrumb-panel-border-color\|ar-stepper-panel-bg\|ar-stepper-panel-border-color" packages/core/src/styles/themes/default.css`
— confirmer qu'il n'y a bien que ces 6 lignes (3 paires) à retirer, aucune autre référence
résiduelle (ex. dans un `calc()` ou un bloc dark-mode).

- [ ] **Step 2: Vérifier le format**

Run: `npx prettier --check packages/core/src/styles/themes/default.css`
Expected: pas d'erreur.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/styles/themes/default.css
git commit -m "refactor(theme): retire les alias panel non divergents pour dropdown/breadcrumb/stepper"
```

---

## Task 6: Corriger les commentaires des tests de fallback

**Files:**

- Modify: `packages/core/src/components/dropdown/dropdown.browser.test.ts`
- Modify: `packages/core/src/components/breadcrumb/breadcrumb.browser.test.ts`
- Modify: `packages/core/src/components/stepper/stepper.browser.test.ts`

**Interfaces:**

- Consumes: rien — aucune assertion ne change, ces tests vérifient que `background-color`/
  `border-top-color` du panel ne sont ni vides ni transparents sans thème chargé. Le résultat
  calculé est identique avant/après ce chantier (même repli `Canvas`/`ButtonBorder`, posé
  maintenant par `panel.styles.ts` au lieu de transiter par le token du composant).
- Produces: commentaires exacts sur l'origine réelle du repli.

- [ ] **Step 1: `dropdown.browser.test.ts` — corriger le commentaire**

Contenu actuel (`dropdown.browser.test.ts:211-213` environ, à localiser par le texte) :

```ts
// default.css n'est jamais chargé dans les tests (Vitest ni WTR) : ces
// valeurs viennent uniquement du fallback système CSS4 posé dans
// panel.styles.ts, pas d'un thème.
```

Si le commentaire mentionne déjà `panel.styles.ts`, ne rien changer (il est possible qu'il soit
déjà correct — vérifier le texte réel avant d'éditer, ne pas éditer à l'aveugle). S'il mentionne
`dropdown.styles.ts`, corriger en `panel.styles.ts`.

- [ ] **Step 2: `breadcrumb.browser.test.ts` — corriger le commentaire**

Même vérification : si le commentaire mentionne `breadcrumb.styles.ts` comme source du repli,
corriger en `panel.styles.ts`. Sinon laisser inchangé.

- [ ] **Step 3: `stepper.browser.test.ts` — corriger le commentaire**

Même vérification : si le commentaire mentionne `stepper.styles.ts` comme source du repli,
corriger en `panel.styles.ts`. Sinon laisser inchangé.

- [ ] **Step 4: Vérifier le format**

Run: `npx prettier --check packages/core/src/components/dropdown/dropdown.browser.test.ts packages/core/src/components/breadcrumb/breadcrumb.browser.test.ts packages/core/src/components/stepper/stepper.browser.test.ts`
Expected: pas d'erreur.

- [ ] **Step 5: Commit (uniquement si au moins un commentaire a changé)**

```bash
git add packages/core/src/components/dropdown/dropdown.browser.test.ts packages/core/src/components/breadcrumb/breadcrumb.browser.test.ts packages/core/src/components/stepper/stepper.browser.test.ts
git commit -m "test: corrige les commentaires attribuant le repli panel au bon fichier source"
```

Si aucun commentaire n'a changé, passer directement à Task 7 sans commit.

---

## Task 7: Vérification — build manifest, tests, build Astro

**Files:** aucun — vérification uniquement.

- [ ] **Step 1: Rebuild le manifeste CEM (déclenche les garde-fous CI)**

Run: `npm run build:manifest --workspace=packages/core`
Expected: succès, aucune erreur `validate-cssprop-defaults.js` (les 6 tokens retirés ne doivent
plus apparaître dans le manifeste).

- [ ] **Step 2: Suite de tests complète**

Run: `npm run test`
Expected: tous les tests passent, en particulier les 3 tests de fallback panel (Task 6) — même
résultat calculé qu'avant, aucune régression.

- [ ] **Step 3: Suite browser (WTR) des 3 composants**

Run (depuis `packages/core`) :
`npx web-test-runner "src/components/{dropdown,breadcrumb,stepper}/*.{browser,a11y}.test.ts"`
Expected: tous les tests passent.

- [ ] **Step 4: Build Astro complet**

Run: `npm run build --workspace=apps/docs`
Expected: succès, 22 pages. Vérifier que les pages `ar-dropdown`/`ar-breadcrumb`/`ar-stepper`
affichent toujours une table « CSS Custom Properties propres » non vide (ex. `grep -A3
"ar-dropdown-distance" apps/docs/dist/components/dropdown/index.html`) et que les 6 tokens
retirés n'y apparaissent plus (`grep -c "ar-dropdown-bg\|ar-dropdown-border-color"
apps/docs/dist/components/dropdown/index.html` doit retourner `0`, idem pour les 2 autres
composants).

- [ ] **Step 5: Grep final — zéro référence résiduelle**

Run: `grep -rn "ar-dropdown-bg\b\|ar-dropdown-border-color\b\|ar-breadcrumb-panel-bg\b\|ar-breadcrumb-panel-border-color\b\|ar-stepper-panel-bg\b\|ar-stepper-panel-border-color\b" packages/core/src apps/docs/src`
Expected: aucune occurrence (le flag `\b` évite un faux positif sur un préfixe partagé avec un
autre token). Si une occurrence apparaît, l'investiguer avant de continuer — ne pas supposer
qu'elle est bénigne.

- [ ] **Step 6: Commit (uniquement si un fix a été nécessaire)**

Si les Steps 1-5 ont révélé un problème nécessitant une correction, committer séparément avec un
message décrivant le problème trouvé. Sinon, passer directement à Task 8.

---

## Task 8: Vérification visuelle manuelle (Playwright)

**Files:** aucun fichier modifié — vérification uniquement.

- [ ] **Step 1: Rebuild explicite de `packages/core` avant toute vérification Playwright**

Run: `npm run build:dev --workspace=packages/core`
Expected: build réussi (piège connu, cf. Global Constraints).

- [ ] **Step 2: Lancer le serveur de doc**

Run: `npm run dev --workspace=apps/docs` (arrière-plan ou terminal dédié).

- [ ] **Step 3: Capturer le panel des 3 composants, avec thème chargé**

Utiliser l'outillage Playwright déjà présent (`apps/docs/playwright.config.ts`,
`@playwright/test`) pour ouvrir le panel/menu mobile de `ar-dropdown`, `ar-breadcrumb`,
`ar-stepper` (démo). Capturer une screenshot de chaque panel. Vérifier visuellement : fond,
bordure — identiques au rendu d'avant ce chantier (aucune régression attendue, la valeur calculée
est strictement identique, seule la source de la déclaration CSS a changé).

- [ ] **Step 4: Consigner le résultat**

Si un écart visuel est trouvé, corriger la Task concernée (1-3) et refaire Steps 3-4 de la Task 7
et ce Step 3. Si rien trouvé, continuer.

---

## Task 9: Revue finale de branche

**Files:** aucun — revue uniquement.

- [ ] **Step 1: Dispatcher une revue de branche complète sur un agent capable**

Le champ de revue est **l'ensemble de la branche `docs/panel-tokens-public-doc`** depuis `dev`
(cette branche contient déjà le chantier de documentation publique des tokens panel, PR #151 —
la revue doit couvrir aussi les commits de ce second chantier, pas seulement les nouveaux). Comparer
le diff complet contre les deux specs (`docs/superpowers/specs/2026-08-03-panel-tokens-public-doc-design.md`
et `docs/superpowers/specs/2026-08-03-panel-own-tokens-removal-design.md`). Points d'attention
spécifiques à ce second chantier :

- Les 3 blocs `[part='panel']` sont bien intégralement retirés (pas de résidu partiel, pas de
  propriété autre que `background-color`/`border-color` supprimée par erreur — vérifier qu'aucun
  bloc ne contenait une 3ᵉ propriété passée inaperçue).
- Les 6 `@cssprop` retirés du JSDoc correspondent exactement aux 6 tokens retirés du CSS — pas un
  de plus (ex. `--ar-dropdown-distance` ne doit surtout pas avoir été retiré par erreur).
- `default.css` : les 6 lignes retirées, aucune autre référence résiduelle ailleurs dans le
  fichier (calc(), bloc dark-mode, etc.).
- Aucune mention de `default.css`/du thème par défaut n'a été ajoutée dans un `@cssprop` restant
  (cf. `feedback_jsdoc_no_default_theme_mention` — ce chantier ne fait que des suppressions, donc
  ce risque est faible, mais à vérifier explicitement puisque c'est une règle nouvellement actée).
- `ComponentApi.astro` (déjà mergé sur cette branche par le chantier précédent) n'a besoin
  d'aucune modification — confirmer qu'aucun commit de ce second chantier n'y touche à tort.
- Aucun changement dans `ar-datepicker` (déjà conforme, jamais concerné par ce chantier).

- [ ] **Step 2: Corriger les findings en une vague unique**

Si des findings « Critical »/« Important » remontent, les corriger en un seul commit groupé, puis
relancer Task 7 (Steps 2-5) et Task 8 Step 3 pour re-vérifier.

---

## Task 10: Mettre à jour la PR existante

**Files:** aucun.

- [ ] **Step 1: Pousser les nouveaux commits**

```bash
git push
```

(la branche `docs/panel-tokens-public-doc` est déjà suivie et associée à la PR #151 — pas de
nouvelle PR à créer, `git push` suffit à la mettre à jour).

- [ ] **Step 2: Mettre à jour la description de la PR #151**

Ajouter une section décrivant ce second chantier à la description existante de la PR (via `gh pr
edit 151 --body "..."`, en reprenant le corps existant + une nouvelle section « Retrait des tokens
panel redondants » résumant les 6 tokens retirés et pourquoi).

- [ ] **Step 3: Confirmer avec l'utilisateur avant tout merge**

Ne pas merger sur `dev` sans confirmation explicite (feedback_merge_after_autonomous_fix).

---

## Self-Review (déjà appliqué en rédigeant ce plan)

1. **Couverture de la spec** : les 5 changements de la spec (composants, JSDoc, `default.css`,
   tests, doc générée) sont couverts par Tasks 1-6. Vérification par Tasks 7-8. Revue et mise à
   jour de PR par Tasks 9-10. Pas de Task « créer la branche » — continuation explicite de la
   branche/PR existante (cf. Global Constraints).
2. **Scan placeholders** : aucun « TBD » — chaque step contient soit le contenu exact à retirer,
   soit une commande de vérification précise avec le résultat attendu.
3. **Cohérence des noms** : les 6 noms de tokens (Tasks 1-3, 4, 5) sont identiques partout, et
   correspondent exactement à ceux audités dans la spec.
4. **Point de vigilance signalé explicitement** : Task 6 ne force pas une édition si le
   commentaire est déjà correct — évite un commit vide ou une modification inutile sur un texte
   qui s'avérerait déjà exact à la lecture réelle du fichier.
5. **Risque de duplication de revue** : Task 9 précise explicitement que le champ de revue couvre
   toute la branche (pas seulement ce second chantier), pour éviter qu'un reviewer scope trop
   étroitement et manque une interaction entre les deux chantiers (ex. `ComponentApi.astro` déjà
   mergé qui doit rester intact).
