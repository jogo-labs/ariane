# `ar-dropdown` token vs `::part()` (lot 5, #129) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrer 5 des 10 tokens `--ar-dropdown-*` (border-radius, shadow, padding, max-width,
min-width) de `dropdown.styles.ts` vers une règle `ar-dropdown::part(panel)` littérale dans
`default.css`, supprimer `--ar-dropdown-color` sans remplaçant (retombe sur `--ar-panel-text`
déjà posé par `panelBaseStyles`), en gardant les 4 tokens restants (bg/border-color pour
fallback a11y, distance/offset lus en JS) — conformément à
`docs/superpowers/specs/2026-07-31-dropdown-token-vs-part-129-design.md`. Aligne `ar-dropdown`
sur le pattern déjà établi par `ar-breadcrumb`/`ar-stepper` (lot 4), qui ne redéclarent que 2
propriétés (`bg`/`border-color`) sur `[part='panel']`.

**Architecture:** Aucun changement de structure DOM ni de nouveau `part` — le seul `part`
existant (`panel`) reçoit une règle de thème externe supplémentaire. Le composant garde une
règle `[part='panel']` réduite à 2 déclarations à fallback système ; `panelBaseStyles`
(déjà importé) gouverne désormais `color` sans concurrence.

**Tech Stack:** Lit 3, TypeScript, Vitest + WTR (browser), garde-fous CI
(`validate-no-hardcoded-tokens.js`, custom-elements-manifest via `cem.config.js`).

## Global Constraints

- Prettier : 100 char, 4 spaces, single quotes (CLAUDE.md).
- `--ar-*` cascade toujours via `var()` référençant `default.css`, jamais de valeur littérale
  codée en dur dans un `.styles.ts` sans commentaire `a11y-fallback`/`functional-default`
  justificatif (garde-fou `validate-no-hardcoded-tokens.js`).
- Tout nouveau/retiré token `--ar-*` doit avoir son entrée `@cssprop` tenue à jour dans le JSDoc
  du composant (feedback_cssprop_jsdoc).
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
git checkout -b fix/dropdown-token-vs-part-129
```

- [ ] **Step 2: Vérifier l'état propre**

Run: `git status`
Expected: `On branch fix/dropdown-token-vs-part-129`, `nothing to commit, working tree clean`.

---

## Task 2: Réduire `dropdown.styles.ts` aux 3 tokens à fallback a11y

**Files:**

- Modify: `packages/core/src/components/dropdown/dropdown.styles.ts`

**Interfaces:**

- Consumes: rien (fichier autonome). `panelBaseStyles` (importé dans `dropdown.ts`, chargé avant
  ce fichier dans `static override styles = [panelStyles, styles]`) continue de déclarer
  `color: var(--ar-panel-text, CanvasText)` sur `[part='panel']` — plus jamais concurrencé par ce
  fichier après ce changement.
- Produces: `[part='panel']` réduit à `background-color`/`border-color`, consommé visuellement
  par `default.css` (Task 3).

- [ ] **Step 1: Remplacer le contenu du fichier**

Contenu actuel :

```ts
import { css } from 'lit';

export default css`
    :host {
        display: contents;
    }

    [part='panel'] {
        /* Overrides composant — chaînent vers les tokens shared --ar-panel-* */
        background-color: var(--ar-dropdown-bg, Canvas);
        color: var(--ar-dropdown-color, CanvasText);
        border-color: var(--ar-dropdown-border-color, ButtonBorder);
        border-radius: var(--ar-dropdown-border-radius);
        box-shadow: var(--ar-dropdown-shadow);
        padding: var(--ar-dropdown-padding);
        min-width: var(--ar-dropdown-min-width);
        max-width: var(--ar-dropdown-max-width);
    }
`;
```

Nouveau contenu — retirer `color` (retombe sur `panelBaseStyles`, aucun remplaçant) et les 5
lignes `border-radius`/`box-shadow`/`padding`/`min-width`/`max-width` (migrées en Task 3) :

```ts
import { css } from 'lit';

export default css`
    :host {
        display: contents;
    }

    [part='panel'] {
        /* Overrides composant — chaînent vers les tokens shared --ar-panel-* */
        background-color: var(--ar-dropdown-bg, Canvas);
        border-color: var(--ar-dropdown-border-color, ButtonBorder);
    }
`;
```

- [ ] **Step 2: Vérifier le format**

Run: `npx prettier --check packages/core/src/components/dropdown/dropdown.styles.ts`
Expected: pas d'erreur (ou `npx prettier --write` si besoin, puis re-check).

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/components/dropdown/dropdown.styles.ts
git commit -m "refactor(dropdown): retire color/border-radius/shadow/padding/min-width/max-width du composant"
```

---

## Task 3: Ajouter `ar-dropdown { &::part(panel) {...} }` et retirer 6 tokens dans `default.css`

**Files:**

- Modify: `packages/core/src/styles/themes/default.css`

**Interfaces:**

- Consumes: `--ar-panel-radius`, `--ar-panel-shadow`, `--ar-panel-padding`,
  `--ar-panel-max-width` (déjà définis dans le bloc `:root`, section « Partagé — dropdown,
  breadcrumb, stepper »).
- Produces: règle externe `ar-dropdown::part(panel)` consommée visuellement par le composant
  (Task 2). Nouveau bloc `ar-dropdown { }` hors `:root`, miroir structurel de `ar-breadcrumb { }`
  (`default.css:1058`) et `ar-stepper { }` (`default.css:881`).

- [ ] **Step 1: Localiser le bloc `Dropdown` dans `:root`**

Bloc actuel (repérer via `grep -n "Dropdown" packages/core/src/styles/themes/default.css`) :

```css
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         * Dropdown
         * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
--ar-dropdown-distance: var(--ar-anchor-distance);
--ar-dropdown-offset: var(--ar-anchor-offset);
--ar-dropdown-bg: var(--ar-panel-bg);
--ar-dropdown-color: var(--ar-panel-text);
--ar-dropdown-border-color: var(--ar-panel-border-color);
--ar-dropdown-border-radius: var(--ar-panel-radius);
--ar-dropdown-shadow: var(--ar-panel-shadow);
--ar-dropdown-padding: var(--ar-panel-padding);
/* Valeur propre, volontairement non cascadée depuis --ar-panel-min-width : un menu
           dropdown reste lisible plus étroit qu'un panel de disclosure générique (breadcrumb,
           stepper). */
--ar-dropdown-min-width: 10rem;
--ar-dropdown-max-width: var(--ar-panel-max-width);
```

- [ ] **Step 2: Remplacer par la version réduite (4 tokens restants — retire aussi `color`)**

```css
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         * Dropdown
         * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
--ar-dropdown-distance: var(--ar-anchor-distance);
--ar-dropdown-offset: var(--ar-anchor-offset);
--ar-dropdown-bg: var(--ar-panel-bg);
--ar-dropdown-border-color: var(--ar-panel-border-color);
```

- [ ] **Step 3: Ajouter un bloc `ar-dropdown { }` hors du bloc `:root`**

Repérer l'emplacement en cherchant les blocs de composant existants hors `:root` :
`grep -n "^    ar-" packages/core/src/styles/themes/default.css` (ex. `ar-dialog { }`,
`ar-breadcrumb { }`, `ar-stepper { }`, tous à la même profondeur d'imbrication, à l'intérieur
d'un sélecteur englobant — lire 10 lignes de contexte autour d'un de ces blocs pour confirmer la
profondeur exacte d'indentation avant d'insérer). Ajouter un nouveau bloc `ar-dropdown { }` à la
suite du dernier bloc de composant du fichier, même niveau d'indentation :

```css
ar-dropdown {
    &::part(panel) {
        border-radius: var(--ar-panel-radius);
        box-shadow: var(--ar-panel-shadow);
        padding: var(--ar-panel-padding);
        /* Valeur propre, volontairement non cascadée depuis --ar-panel-min-width : un menu
               dropdown reste lisible plus étroit qu'un panel de disclosure générique
               (breadcrumb, stepper). */
        min-width: 10rem;
        max-width: var(--ar-panel-max-width);
    }
}
```

- [ ] **Step 4: Vérifier le format**

Run: `npx prettier --check packages/core/src/styles/themes/default.css`
Expected: pas d'erreur.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/styles/themes/default.css
git commit -m "refactor(dropdown): migre border-radius/shadow/padding/min-width/max-width vers ::part(panel), retire color"
```

---

## Task 4: Mettre à jour le JSDoc `@cssprop` de `dropdown.ts`

**Files:**

- Modify: `packages/core/src/components/dropdown/dropdown.ts:34-43`

**Interfaces:**

- Consumes: rien.
- Produces: JSDoc à jour, source du manifeste CEM (Task 5).

- [ ] **Step 1: Retirer les 6 entrées `@cssprop` des tokens migrés/supprimés**

Bloc JSDoc actuel (lignes 34-43) :

```ts
 * @cssprop --ar-dropdown-min-width - Largeur minimale du panel.
 * @cssprop --ar-dropdown-color - Couleur du texte (cascade vers --ar-panel-text, repli système `CanvasText` si aucun thème n'est chargé).
 * @cssprop --ar-dropdown-max-width - Largeur maximale (cascade vers --ar-panel-max-width).
 * @cssprop --ar-dropdown-padding - Marge interne (cascade vers --ar-panel-padding).
 * @cssprop --ar-dropdown-bg - Fond du panel (cascade vers --ar-panel-bg, repli système `Canvas` si aucun thème n'est chargé).
 * @cssprop --ar-dropdown-border-color - Bordure (cascade vers --ar-panel-border-color, repli système `ButtonBorder` si aucun thème n'est chargé).
 * @cssprop --ar-dropdown-border-radius - Arrondi (cascade vers --ar-panel-radius).
 * @cssprop --ar-dropdown-shadow - Ombre (cascade vers --ar-panel-shadow).
 * @cssprop --ar-dropdown-distance - Espacement entre le trigger et le panel (axe principal).
 * @cssprop --ar-dropdown-offset - Décalage latéral du panel (axe transversal).
```

Nouveau bloc — retirer `min-width`/`color`/`max-width`/`padding`/`border-radius`/`shadow`,
garder `bg`/`border-color`/`distance`/`offset` :

```ts
 * @cssprop --ar-dropdown-bg - Fond du panel (cascade vers --ar-panel-bg, repli système `Canvas` si aucun thème n'est chargé).
 * @cssprop --ar-dropdown-border-color - Bordure (cascade vers --ar-panel-border-color, repli système `ButtonBorder` si aucun thème n'est chargé).
 * @cssprop --ar-dropdown-distance - Espacement entre le trigger et le panel (axe principal).
 * @cssprop --ar-dropdown-offset - Décalage latéral du panel (axe transversal).
 * @csspart panel - Le panel flottant. Personnalisable via `::part(panel)` (color, border-radius, box-shadow, padding, min-width, max-width).
```

Le `@csspart panel` existant (ligne 32, juste avant les `@cssprop`) doit être remplacé par cette
version enrichie plutôt que dupliqué — vérifier qu'il n'en reste qu'une seule occurrence.

- [ ] **Step 2: Commit**

```bash
git add packages/core/src/components/dropdown/dropdown.ts
git commit -m "docs(dropdown): met à jour le JSDoc @cssprop/@csspart après migration ::part(panel)"
```

---

## Task 5: Vérifier les tests existants et rebuild le manifeste

**Files:**

- Read-only check: `packages/core/src/components/dropdown/dropdown.test.ts`
- Read-only check: `packages/core/src/components/dropdown/dropdown.browser.test.ts`
- Read-only check: `packages/core/src/components/dropdown/dropdown.a11y.test.ts`

**Interfaces:**

- Consumes: composant modifié (Tasks 2-4).
- Produces: confirmation verte, aucune modification de test attendue (voir Step 1).

- [ ] **Step 1: Vérifier qu'aucun test n'assume une valeur calculée pour les 5 propriétés migrées**

Run: `grep -n "border-radius\|boxShadow\|box-shadow\|padding\|min-width\|max-width\|minWidth\|maxWidth\|\.color\b\|getPropertyValue('color')" packages/core/src/components/dropdown/dropdown.test.ts packages/core/src/components/dropdown/dropdown.browser.test.ts packages/core/src/components/dropdown/dropdown.a11y.test.ts`

Expected : aucune occurrence pertinente (déjà confirmé en amont de ce plan — seul
`getComputedStyle(panel)` existe dans `dropdown.browser.test.ts:211`, pour une autre propriété
que celles migrées/supprimées ; lire son contexte pour confirmer, en particulier qu'aucune
assertion ne porte sur `color` calculé). Si une occurrence apparaît et assume une valeur par
défaut sans thème chargé, adapter le test pour charger `default.css` avant d'asserter — sinon ne
rien modifier.

- [ ] **Step 2: Lancer la suite Vitest du composant**

Run: `npm run test --workspace=packages/core -- dropdown`
Expected: tous les tests passent (aucune régression).

- [ ] **Step 3: Rebuild le manifeste CEM (déclenche les garde-fous CI)**

Run: `npm run build:manifest --workspace=packages/core`
Expected: succès, aucune erreur `validate-no-hardcoded-tokens.js` (les 2 fallbacks restants —
`bg`/`border-color` — sont des mots-clés système whitelistés, pas besoin de commentaire) ni
`validate-part-state-order.js` (aucun part d'état sur `panel`, non concerné).

- [ ] **Step 4: Lancer la suite browser (WTR)**

Run: `npm run test:all --workspace=packages/core -- dropdown` (ou la commande équivalente
`test:browser` si `test:all` n'existe pas en scope composant — vérifier `package.json` de
`packages/core` si la commande échoue).
Expected: tous les tests passent, y compris `dropdown.a11y.test.ts`.

- [ ] **Step 5: Commit (uniquement si le manifeste ou un test a été modifié)**

```bash
git add packages/core/custom-elements.json packages/core/src/components/dropdown/*.test.ts
git commit -m "chore(dropdown): régénère le manifeste après migration ::part(panel)"
```

Si rien n'a changé (manifeste déjà à jour via un hook de build antérieur, aucun test modifié),
passer directement à Task 6 sans commit.

---

## Task 6: Vérification visuelle manuelle (Playwright)

**Files:** aucun fichier modifié — vérification uniquement.

- [ ] **Step 1: Rebuild explicite de `packages/core` avant toute vérification Playwright**

Run: `npm run build:dev --workspace=packages/core`
Expected: build réussi. (Piège connu : `npm run dev --workspace=apps/docs` seul sert le CSS
depuis la source mais pas le JS de `packages/core/dist` — un rebuild explicite est nécessaire
pour que le renderer reflète les changements.)

- [ ] **Step 2: Lancer le serveur de doc**

Run: `npm run dev --workspace=apps/docs` (en arrière-plan ou dans un terminal dédié).

- [ ] **Step 3: Ouvrir la page `ar-dropdown` et capturer le panel ouvert, thème chargé**

Utiliser l'outillage Playwright déjà présent dans le repo
(`apps/docs/playwright.config.ts`, `@playwright/test`) pour naviguer vers la page de démo
`ar-dropdown`, ouvrir le panel (clic sur le trigger), capturer une screenshot. Vérifier
visuellement : `border-radius`, `box-shadow`, `padding`, `min-width`/`max-width`, **et la couleur
du texte** (`color`, désormais gouvernée par `panelBaseStyles` sans concurrence) du panel
identiques au rendu d'avant migration (aucune régression attendue, les valeurs `default.css`
sont inchangées, seul leur point de définition a changé — `color` avait déjà la même valeur
avant/après, cf. spec).

- [ ] **Step 4: Vérifier le rendu sans thème (fallback a11y)**

Charger une page sans `default.css` (ou commenter temporairement son import) et confirmer que le
panel reste utilisable : fond `Canvas`, texte `CanvasText` (toujours fourni par
`panelBaseStyles`, inchangé par ce lot), bordure `ButtonBorder` visibles ;
`border-radius`/`shadow`/`padding`/`min-width`/`max-width` retombent au rendu natif du navigateur
(0/aucun, comportement attendu — ces propriétés n'ont plus de fallback interne, c'est le
comportement voulu par la migration branche 4). Rétablir l'import après vérification.

- [ ] **Step 5: Consigner le résultat**

Si un écart visuel est trouvé, corriger `default.css` (Task 3) et refaire Steps 3-4. Si rien
trouvé, continuer.

---

## Task 7: Revue finale de branche

**Files:** aucun — revue uniquement.

- [ ] **Step 1: Dispatcher une revue de branche complète sur un agent capable**

Comparer l'intégralité du diff `dev...fix/dropdown-token-vs-part-129` (pas seulement les diffs
de tâche individuels) contre `docs/decisions/ADR-005-tokens-pilotes-par-attribut.md` et
`docs/superpowers/specs/2026-07-31-dropdown-token-vs-part-129-design.md`. Points d'attention
spécifiques à ce lot (petit périmètre, mais vérifier quand même — les lots précédents ont
systématiquement trouvé des bugs invisibles aux revues par tâche) :

- Cohérence exacte entre les 6 tokens retirés du composant (`color` inclus) et ceux retirés de
  `default.css` (aucun oubli, aucun résidu).
- `color` n'a **aucun** remplaçant dans `default.css` (ni token, ni règle `::part(panel)`) —
  confirmer qu'il retombe bien sur `panelBaseStyles` (`panel.styles.ts`) et que le rendu visuel
  du texte du panel dropdown reste identique (Task 6).
- Le nouveau bloc `ar-dropdown { &::part(panel) {...} }` a la même structure d'imbrication que
  `ar-breadcrumb { }`/`ar-stepper { }` existants (pas un sélecteur plat `ar-dropdown::part(panel)`
  isolé, incohérent avec le reste du fichier).
- JSDoc `@cssprop`/`@csspart` cohérent avec l'implémentation finale.
- Aucune référence résiduelle à `--ar-dropdown-color`/`-border-radius`/`-shadow`/`-padding`/
  `-min-width`/`-max-width` ailleurs dans le repo (`grep -rn` sur ces 6 noms de tokens hors
  `git log`).

- [ ] **Step 2: Corriger les findings en une vague unique**

Si des findings « Critical »/« Important » remontent, les corriger en un seul commit groupé
plutôt qu'un commit par finding, puis relancer Task 5 Steps 2-4 pour re-vérifier.

---

## Task 8: Créer la Pull Request

**Files:** aucun.

- [ ] **Step 1: Pousser la branche**

```bash
git push -u origin fix/dropdown-token-vs-part-129
```

- [ ] **Step 2: Créer la PR vers `dev`**

```bash
gh pr create --base dev --title "refactor(dropdown): migre token vs ::part(), lot 5 (#129)" --body "$(cat <<'EOF'
## Summary
- Migre 5 tokens `--ar-dropdown-*` (border-radius, shadow, padding, min-width, max-width) vers une règle littérale `ar-dropdown::part(panel)` dans `default.css`.
- Supprime `--ar-dropdown-color` sans remplaçant — retombe sur `--ar-panel-text` déjà posé par `panelBaseStyles` (partagé avec `ar-breadcrumb`/`ar-stepper`, qui n'ont jamais eu ce token).
- Conserve `bg`/`border-color` (fallback a11y système) et `distance`/`offset` (lus en JS par `AnchoredController`).
- Aligne `ar-dropdown` sur le pattern panel déjà établi par `ar-breadcrumb`/`ar-stepper` (lot 4) — les 3 composants consommant `panel.styles.ts` traitent désormais leur surcharge `[part='panel']` de façon identique.
- Aucun changement de structure DOM, aucun nouveau `part`, aucun changement visuel par défaut.

Spec : `docs/superpowers/specs/2026-07-31-dropdown-token-vs-part-129-design.md`
Plan : `docs/superpowers/plans/2026-07-31-dropdown-token-vs-part-129.md`

## Test plan
- [x] `npm run test --workspace=packages/core -- dropdown`
- [x] `npm run build:manifest --workspace=packages/core` (garde-fous CI verts)
- [x] Suite browser (WTR) dropdown
- [x] Vérification visuelle Playwright (avec et sans thème)
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

1. **Couverture de la spec** : les 3 sections de la spec (tableau des 10 tokens, changements
   `dropdown.styles.ts`/`default.css`/JSDoc, tests) sont couvertes par Tasks 2-5. Vérification
   visuelle (Task 6) et revue finale (Task 7) couvrent les exigences méthodologiques du chantier
   #129 (mémoire `project_token_vs_part_generalization_129`). Branche + PR couvertes par Tasks 1
   et 8.
2. **Scan placeholders** : aucun « TBD »/« gérer les cas limites » — chaque step contient le
   contenu exact à écrire ou la commande exacte à lancer.
3. **Cohérence des noms** : `ar-dropdown::part(panel)` (Task 3) correspond exactement au
   sélecteur `[part='panel']` déjà présent dans `dropdown.styles.ts` (Task 2) et au `@csspart
panel` du JSDoc (Task 4) — aucune divergence de nom.
