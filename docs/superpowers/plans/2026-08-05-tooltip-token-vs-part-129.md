# `ar-tooltip` token vs `::part()` (dernier composant du périmètre initial, #129) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrer 4 des 10 tokens `--ar-tooltip-*` (`border-radius`, `font-size`, `padding`,
`max-width`) plus une valeur jamais tokenisée (`line-height: 1.4`) vers une nouvelle règle
littérale `ar-tooltip::part(bubble)` dans `default.css`, en gardant les 6 tokens restants
(`bg`/`color` — fallback a11y + calibration dark, `arrow-size` — réutilisé en interne,
`show-duration` — garde `prefers-reduced-motion`, `distance`/`offset` — lus en JS), conformément à
`docs/superpowers/specs/2026-08-05-tooltip-token-vs-part-129-design.md`. Dernier composant du
périmètre initial de l'audit #129 (2026-07-25).

**Architecture:** Aucun changement de structure DOM ni de `part` (les 2 `part` existants,
`bubble`/`arrow`, sont inchangés). Simplification de `tooltip.styles.ts` (retrait de 5
déclarations sur `[part='bubble']`), nouveau bloc `ar-tooltip { &::part(bubble) {...} }` créé en
fin de `default.css` (à la suite du dernier bloc, `ar-pagination { }`), JSDoc mis à jour.

**Tech Stack:** Lit 3, TypeScript, Vitest + WTR (browser), garde-fous CI
(`validate-no-hardcoded-tokens.js`, custom-elements-manifest via `cem.config.js`).

## Global Constraints

- Prettier : 100 char, 4 spaces, single quotes (CLAUDE.md).
- `--ar-*` cascade toujours via `var()` référençant `default.css`, jamais de valeur littérale
  codée en dur dans un `.styles.ts` sans commentaire `a11y-fallback`/`functional-default`
  justificatif (garde-fou `validate-no-hardcoded-tokens.js`) — non applicable ici, aucun token ne
  reste avec fallback à ajouter/modifier.
- Tout token `--ar-*` retiré doit avoir son entrée `@cssprop` retirée du JSDoc du composant
  (feedback_cssprop_jsdoc / feedback_cssprop_requires_internal_consumption).
- Ne jamais merger sur `dev` sans confirmation explicite de l'utilisateur
  (feedback_merge_after_autonomous_fix).
- `npm run dev --workspace=apps/docs` seul ne reconstruit pas le JS de `packages/core/dist` —
  rebuild explicite (`npm run build:dev --workspace=packages/core`) requis avant toute
  vérification Playwright d'un changement de renderer (feedback_docs_dev_stale_dist).

---

## Task 1: Créer la branche de travail

**Files:** aucun.

- [ ] **Step 1: Créer la branche depuis `dev`**

```bash
git checkout dev
git pull origin dev
git checkout -b fix/tooltip-token-vs-part-129
```

- [ ] **Step 2: Vérifier l'état propre**

Run: `git status`
Expected: `On branch fix/tooltip-token-vs-part-129`, `nothing to commit, working tree clean`.

---

## Task 2: Simplifier `tooltip.styles.ts`

**Files:**

- Modify: `packages/core/src/components/tooltip/tooltip.styles.ts`

**Interfaces:**

- Consumes: rien de nouveau.
- Produces: `[part='bubble']` ne déclare plus `border-radius`/`font-size`/`padding`/`max-width`/
  `line-height` — ces 5 propriétés deviennent une opinion pure du thème (Task 3). Comportement
  visuel inchangé une fois `default.css` mis à jour (Task 3) puisque les valeurs migrées sont
  identiques.

- [ ] **Step 1: Retirer les 5 déclarations cosmétiques de `[part='bubble']`**

Retirer `border-radius: var(--ar-tooltip-border-radius);`, `font-size: var(--ar-tooltip-font-size);`,
`padding: var(--ar-tooltip-padding);`, `max-width: var(--ar-tooltip-max-width);`,
`line-height: 1.4;`. La règle ne garde que le reset de positionnement, le box model
(`box-sizing`/`overflow`), et `background-color`/`color`/`border: none`/`word-break`.

Résultat attendu :

```css
[part='bubble'] {
    /* Popover positioning reset */
    position: absolute;
    inset: 0 auto auto 0;
    margin: 0;

    /* Box model */
    box-sizing: border-box;

    /* overflow: visible requis pour que le caret (position: absolute) dépasse de la bulle */
    overflow: visible;

    /* Visual */
    background-color: var(--ar-tooltip-bg, Canvas);
    color: var(--ar-tooltip-color, CanvasText);
    border: none;
    word-break: break-word;
}
```

`[part='bubble']:not(:popover-open)`, `[part='bubble']:popover-open`, la garde
`prefers-reduced-motion`, et `[part='arrow']` restent inchangés.

- [ ] **Step 2: Vérifier qu'aucune autre règle du fichier ne référence les 4 tokens retirés**

Run: `grep -n "ar-tooltip-border-radius\|ar-tooltip-font-size\|ar-tooltip-padding\|ar-tooltip-max-width" packages/core/src/components/tooltip/tooltip.styles.ts`
Expected: aucune occurrence.

---

## Task 3: Mettre à jour `default.css` (retrait des tokens + nouveau bloc `ar-tooltip { }`)

**Files:**

- Modify: `packages/core/src/styles/themes/default.css`

**Interfaces:**

- Consumes: `--ar-border-radius-sm` (token générique déjà existant, réutilisé tel quel).
- Produces: bloc `Tooltip` du `:root` réduit à 6 tokens ; nouveau bloc `ar-tooltip { }` (parité
  structurelle avec `ar-dropdown { }`/`ar-breadcrumb { }`).

- [ ] **Step 1: Retirer les 4 tokens migrés du bloc `Tooltip` (`:root`, ~ligne 413)**

Avant :

```css
--ar-tooltip-distance: 10px;
--ar-tooltip-offset: var(--ar-anchor-offset);
--ar-tooltip-bg: var(--ar-color-neutral-20);
--ar-tooltip-color: var(--ar-color-white);
--ar-tooltip-border-radius: var(--ar-border-radius-sm);
--ar-tooltip-font-size: 0.8125rem;
--ar-tooltip-padding: 0.375rem 0.625rem;
--ar-tooltip-max-width: 18rem;
--ar-tooltip-arrow-size: 6px;
--ar-tooltip-show-duration: var(--ar-panel-show-duration);
```

Après :

```css
--ar-tooltip-distance: 10px;
--ar-tooltip-offset: var(--ar-anchor-offset);
--ar-tooltip-bg: var(--ar-color-neutral-20);
--ar-tooltip-color: var(--ar-color-white);
--ar-tooltip-arrow-size: 6px;
--ar-tooltip-show-duration: var(--ar-panel-show-duration);
```

- [ ] **Step 2: Vérifier les 2 blocs dark-mode (~lignes 602 et 667)**

Confirmer qu'ils ne redéfinissent que `--ar-tooltip-bg`/`--ar-tooltip-color` (déjà le cas) — ne
rien changer, ces 2 tokens restent des tokens.

- [ ] **Step 3: Ajouter le bloc `ar-tooltip { }` en fin de fichier, après `ar-pagination { }`**

```css
ar-tooltip {
    &::part(bubble) {
        border-radius: var(--ar-border-radius-sm);
        font-size: 0.8125rem;
        padding: 0.375rem 0.625rem;
        max-width: 18rem;
        line-height: 1.4;
    }
}
```

- [ ] **Step 4: Vérifier le format Prettier**

Run: `npx prettier --check packages/core/src/styles/themes/default.css`
Expected: pas de diff signalé (sinon `npx prettier --write` puis re-vérifier le rendu).

---

## Task 4: Mettre à jour le JSDoc de `tooltip.ts`

**Files:**

- Modify: `packages/core/src/components/tooltip/tooltip.ts`

**Interfaces:**

- Consumes: rien.
- Produces: `@cssprop`/`@csspart` reflètent l'implémentation finale (garde-fou
  `validate-cssprop-defaults.js`).

- [ ] **Step 1: Retirer les 4 entrées `@cssprop` des tokens migrés**

Retirer les lignes `@cssprop --ar-tooltip-border-radius`, `@cssprop --ar-tooltip-padding`,
`@cssprop --ar-tooltip-font-size`, `@cssprop --ar-tooltip-max-width`. Les 6 entrées restantes
(`bg`, `color`, `arrow-size`, `show-duration`, `distance`, `offset`) inchangées.

- [ ] **Step 2: Enrichir `@csspart bubble`**

```
@csspart bubble - Le panel flottant (radius, padding, taille de police, largeur maximale et
interligne pilotables via `::part(bubble)`).
```

---

## Task 5: Vérifier les tests existants

**Files:** aucune modification attendue — vérification uniquement.

- [ ] **Step 1: Grep les 3 fichiers de test du composant pour une assertion sur les valeurs migrées**

Run: `grep -n "border-radius\|font-size\|padding\|max-width\|line-height" packages/core/src/components/tooltip/tooltip*.test.ts`
Expected: aucune occurrence (les tests ciblent comportement/attributs/ARIA, pas des valeurs
calculées de style cosmétique) — confirmé par un premier passage lors de la préparation de ce
plan. Si une occurrence apparaît, l'adapter pour charger `default.css` ou cibler `::part(bubble)`
plutôt que d'asserter une valeur calculée sans thème.

---

## Task 6: Lancer les suites de tests et régénérer le manifeste

**Files:** aucun.

- [ ] **Step 1: Suite Vitest complète**

Run: `npm run test --workspace=packages/core`
Expected: tous les tests passent, y compris `tooltip.test.ts`/`tooltip.a11y.test.ts`.

- [ ] **Step 2: Régénérer le manifeste (garde-fous CI)**

Run: `npm run build:manifest --workspace=packages/core`
Expected: succès — `validate-cssprop-defaults.js` confirme que les 6 `@cssprop` restants
correspondent exactement aux 6 tokens `:root`, `validate-no-hardcoded-tokens.js` ne signale rien
de nouveau.

- [ ] **Step 3: Suite browser (WTR)**

Run: `npm run test:all --workspace=packages/core` (ou la commande WTR dédiée si distincte)
Expected: `tooltip.browser.test.ts` passe.

---

## Task 7: Vérification visuelle manuelle (Playwright)

**Files:** aucun fichier modifié — vérification uniquement.

- [ ] **Step 1: Rebuild explicite de `packages/core`**

Run: `npm run build:dev --workspace=packages/core`
Expected: build réussi.

- [ ] **Step 2: Lancer le serveur de doc**

Run: `npm run dev --workspace=apps/docs` (arrière-plan ou terminal dédié).

- [ ] **Step 3: Capturer la page `ar-tooltip` (thème chargé)**

Naviguer vers `http://localhost:<port>/components/tooltip`, capturer :

- L'affichage par défaut au hover/focus d'un trigger (`placement="top"`) — comparer visuellement
  à une capture prise avant ce lot : aucune différence attendue (radius/padding/font-size/
  max-width/line-height reproduits à l'identique).
- Un tooltip avec texte long (retour à la ligne, `max-width` en jeu) — vérifier `word-break`/
  `line-height` du texte multi-lignes.
- Un placement différent (`bottom-start` ou équivalent) — vérifier le caret (`[part='arrow']`,
  inchangé).

- [ ] **Step 4: Vérifier le rendu sans thème (fallback a11y)**

Commenter temporairement l'import de `default.css`, recharger, confirmer que : le fond/texte
restent lisibles (`Canvas`/`CanvasText`), le tooltip reste positionné correctement (`distance`/
`offset` à 0, comportement déjà attendu sans thème), radius/padding/font-size/max-width/
line-height retombent au rendu nu du navigateur (attendu, plus aucun repli interne). Rétablir
l'import après vérification.

- [ ] **Step 5: Diff empirique `getComputedStyle` (radius/padding/font-size/max-width/line-height)**

Sur la page thémée, comparer par script Playwright les valeurs `getComputedStyle` de
`[part='bubble']` avant/après ce lot (commit `dev` vs branche) pour ces 5 propriétés
spécifiquement — méthode retenue sur les lots précédents pour débusquer des régressions fines
invisibles à l'œil (cf. lot `ar-stepper`, PR #156).

- [ ] **Step 6: Consigner le résultat**

Si un écart est trouvé, corriger `tooltip.styles.ts`/`default.css` (Tasks 2-3) et refaire les
Steps 3-5. Si rien trouvé, continuer.

---

## Task 8: Revue finale de branche

**Files:** aucun — revue uniquement.

- [ ] **Step 1: Dispatcher une revue de branche complète sur un agent capable**

Comparer l'intégralité du diff `dev...fix/tooltip-token-vs-part-129` contre
`docs/decisions/ADR-005-tokens-pilotes-par-attribut.md` et
`docs/superpowers/specs/2026-08-05-tooltip-token-vs-part-129-design.md`. Points d'attention :

- Les 6 tokens conservés (`bg`, `color`, `arrow-size`, `show-duration`, `distance`, `offset`)
  correspondent exactement entre `default.css` (`:root` + 2 blocs dark), `tooltip.styles.ts`
  (consommation `var()`) et `tooltip.ts` (`@cssprop`) — aucun écart.
- Le nouveau bloc `ar-tooltip { &::part(bubble) {...} }` respecte la structure d'imbrication déjà
  utilisée par `ar-dropdown { }`/`ar-breadcrumb { }`/`ar-pagination { }`.
- `--ar-tooltip-border-radius` référence toujours `var(--ar-border-radius-sm)` dans son nouvel
  emplacement (pas recodé en dur), cohérent avec le token générique déjà utilisé auparavant.
- Le trade-off `!important` documenté dans l'amendement ADR-005 du 2026-08-05 (resets
  structurels de `[part='bubble']` non verrouillés) reste hors scope de ce lot — confirmer que la
  PR ne tente pas de le corriger accessoirement.
- JSDoc `@cssprop`/`@csspart` cohérent avec l'implémentation finale.

- [ ] **Step 2: Corriger les findings en une vague unique**

Si des findings « Critical »/« Important » remontent, les corriger en un seul commit groupé, puis
relancer Task 6 pour re-vérifier.

---

## Task 9: Créer la Pull Request

**Files:** aucun.

- [ ] **Step 1: Pousser la branche**

```bash
git push -u origin fix/tooltip-token-vs-part-129
```

- [ ] **Step 2: Créer la PR vers `dev`**

```bash
gh pr create --base dev --title "refactor(tooltip): migre token vs ::part(), dernier lot du périmètre initial (#129)" --body "$(cat <<'EOF'
## Summary
- Migre 4 des 10 tokens `--ar-tooltip-*` (`border-radius`, `font-size`, `padding`, `max-width`) plus une valeur jamais tokenisée (`line-height`) vers une règle littérale `ar-tooltip::part(bubble)` dans `default.css`.
- Conserve 6 tokens : `bg`/`color` (fallback a11y + calibration dark-mode), `arrow-size` (réutilisé en interne), `show-duration` (garde `prefers-reduced-motion`), `distance`/`offset` (lus en JS par `TooltipController`).
- Aucun changement de structure DOM ni de `part` (`bubble`/`arrow` inchangés), aucun changement visuel par défaut.
- Dernier composant du périmètre initial de l'audit #129 (2026-07-25) — reste ensuite un lot groupé (`table-sort`/`charcounter`/`progressbar`/`tab-group`/`collapse`) puis `tab` séparément.
- En marge : amendement ADR-005 consignant la réflexion sur `!important` comme verrou technique contre la surcharge `::part()` (non appliqué à ce lot, trade-off assumé).

Spec : \`docs/superpowers/specs/2026-08-05-tooltip-token-vs-part-129-design.md\`
Plan : \`docs/superpowers/plans/2026-08-05-tooltip-token-vs-part-129.md\`

## Test plan
- [x] \`npm run test --workspace=packages/core\`
- [x] \`npm run build:manifest --workspace=packages/core\` (garde-fous CI verts)
- [x] Suite browser (WTR) tooltip
- [x] Vérification visuelle Playwright (thème chargé, sans thème, diff `getComputedStyle`)
- [x] Revue finale de branche

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Confirmer avec l'utilisateur avant tout merge**

Ne pas merger sur `dev` sans confirmation explicite — signaler la PR créée et attendre la revue
de l'utilisateur (feedback_merge_after_autonomous_fix).

---

## Self-Review (déjà appliqué en rédigeant ce plan)

1. **Couverture de la spec** : les 4 tokens migrés, la valeur `line-height` jamais tokenisée, les
   6 tokens conservés et leurs justifications respectives sont tous repris dans les tasks
   d'implémentation (2-4) — aucune section de la spec laissée de côté.
2. **Scan placeholders** : aucun « TBD » — les 5 valeurs littérales migrées vers `::part(bubble)`
   sont fixées explicitement (reprises telles quelles depuis les tokens actuels), pas de décision
   reportée à l'implémentation.
3. **Cohérence des noms** : `border-radius: var(--ar-border-radius-sm)` (Task 3) correspond à la
   valeur exacte de l'ancien `--ar-tooltip-border-radius` (Task 3, avant/après) ; les 6 tokens
   conservés sont nommés identiquement entre `default.css`, `tooltip.styles.ts` et `tooltip.ts`
   dans les 3 tasks concernées.
4. **Risque le plus élevé identifié** : contrairement aux lots précédents, ce lot ne touche ni
   DOM ni structure de `part` — le risque principal est une régression visuelle fine
   (radius/padding/font-size/max-width/line-height) invisible à une simple capture d'écran, d'où
   l'ajout explicite d'un diff empirique `getComputedStyle` en Task 7 Step 5 (méthode qui a
   débusqué 3 régressions similaires sur `ar-stepper`, PR #156) plutôt que de se reposer sur la
   seule vérification visuelle.
