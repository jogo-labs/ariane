# Nettoyage `panel.styles.ts` — redondances thème (#129) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire de `packages/core/src/styles/shared/panel.styles.ts` la source canonique unique
pour les propriétés de `[part='panel']` qui ne divergent jamais du token générique
`--ar-panel-*`, et retirer les redéclarations redondantes des blocs de thème
`ar-stepper`/`ar-breadcrumb`/`ar-dropdown` dans `default.css` — conformément à
`docs/superpowers/specs/2026-07-31-panel-shared-cleanup-129-design.md`.

**Architecture:** Aucun changement de structure DOM, aucun nouveau `part`. Une seule propriété
ajoutée à la base partagée (`min-width`), quatorze déclarations redondantes retirées de 3 blocs
de thème (`ar-breadcrumb::part(panel)` disparaît entièrement). `ar-datepicker` (4ᵉ consommateur
de `panel.styles.ts`, déjà conforme) reste inchangé.

**Tech Stack:** Lit 3, TypeScript, CSS custom properties, Prettier, garde-fous CI
(`validate-no-hardcoded-tokens.js`).

## Global Constraints

- Prettier : 100 char, 4 spaces, single quotes (CLAUDE.md).
- Aucun changement visuel attendu par défaut — chaque valeur retirée d'un bloc de thème reste
  fournie ailleurs (base partagée ou override réellement divergent), avec une valeur strictement
  identique.
- Ne jamais merger sur `dev` sans confirmation explicite de l'utilisateur
  (feedback_merge_after_autonomous_fix).
- `npm run dev --workspace=apps/docs` seul ne reconstruit pas le JS de `packages/core/dist` —
  rebuild explicite (`npm run build:dev --workspace=packages/core`) requis avant toute
  vérification Playwright (feedback_docs_dev_stale_dist).

---

## Task 1: Créer la branche de travail

**Files:** aucun.

- [ ] **Step 1: Créer la branche depuis `dev`**

```bash
git checkout dev
git pull origin dev
git checkout -b chore/panel-shared-cleanup-129
```

- [ ] **Step 2: Vérifier l'état propre**

Run: `git status`
Expected: `On branch chore/panel-shared-cleanup-129`, `nothing to commit, working tree clean`.

- [ ] **Step 3: Commit de la spec et du plan**

```bash
git add docs/superpowers/specs/2026-07-31-panel-shared-cleanup-129-design.md docs/superpowers/plans/2026-07-31-panel-shared-cleanup-129.md
git commit -m "docs(panel): spec + plan nettoyage panel.styles.ts vs thème (#129)"
```

---

## Task 2: Ajouter `min-width` et documenter la règle dans `panel.styles.ts`

**Files:**

- Modify: `packages/core/src/styles/shared/panel.styles.ts`

**Interfaces:**

- Consumes: `--ar-panel-min-width` (déjà défini dans `default.css:root`, section « Partagé —
  dropdown, breadcrumb, stepper »).
- Produces: `[part='panel']` fournit désormais `min-width` par défaut à tout consommateur
  (`ar-stepper`, `ar-breadcrumb`, `ar-dropdown`, `ar-datepicker`), consommé par les Tasks 3-5.

- [ ] **Step 1: Ajouter le commentaire de règle générale et `min-width`**

Contenu actuel :

```ts
import { css } from 'lit';
import type { CSSResultGroup } from 'lit';
import animationsStyles from '../animations.styles.js';

const panelBaseStyles = css`
    [part='panel'] {
        /* Popover positioning reset */
        position: absolute;
        inset: 0 auto auto 0;
        margin: 0;

        /* Box model */
        box-sizing: border-box;
        overflow-y: auto;

        /* Tokens visuels */
        background-color: var(--ar-panel-bg, Canvas);
        color: var(--ar-panel-text, CanvasText);
        border: 1px solid var(--ar-panel-border-color, ButtonBorder);
        border-radius: var(--ar-panel-radius);
        box-shadow: var(--ar-panel-shadow);
        padding: var(--ar-panel-padding);
        max-width: var(--ar-panel-max-width);
    }
```

Nouveau contenu — ajouter `min-width` après `max-width`, et le commentaire de règle générale
juste avant le bloc `[part='panel']` :

```ts
import { css } from 'lit';
import type { CSSResultGroup } from 'lit';
import animationsStyles from '../animations.styles.js';

const panelBaseStyles = css`
    /* Cette règle est la source canonique pour toute propriété qui ne fait que consommer un
       token --ar-panel-* générique sans jamais diverger d'un composant à l'autre. Un
       composant consommateur (voir static override styles) ne doit ajouter sa propre règle
       ::part(panel) dans default.css QUE pour une propriété dont la valeur diverge réellement
       du générique — jamais pour redéclarer la même valeur. */
    [part='panel'] {
        /* Popover positioning reset */
        position: absolute;
        inset: 0 auto auto 0;
        margin: 0;

        /* Box model */
        box-sizing: border-box;
        overflow-y: auto;

        /* Tokens visuels */
        background-color: var(--ar-panel-bg, Canvas);
        color: var(--ar-panel-text, CanvasText);
        border: 1px solid var(--ar-panel-border-color, ButtonBorder);
        border-radius: var(--ar-panel-radius);
        box-shadow: var(--ar-panel-shadow);
        padding: var(--ar-panel-padding);
        min-width: var(--ar-panel-min-width);
        max-width: var(--ar-panel-max-width);
    }
```

Le reste du fichier (`[part='panel']:not(:popover-open)`, `:popover-open`, media query
`prefers-reduced-motion`, export) reste inchangé.

- [ ] **Step 2: Vérifier le format**

Run: `npx prettier --check packages/core/src/styles/shared/panel.styles.ts`
Expected: pas d'erreur.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/styles/shared/panel.styles.ts
git commit -m "feat(panel): ajoute min-width à la base partagée, documente la règle de non-redondance"
```

---

## Task 3: Réduire `ar-stepper::part(panel)` au strict divergent

**Files:**

- Modify: `packages/core/src/styles/themes/default.css` (bloc `ar-stepper { }`, actuellement
  autour de la ligne 893-899 — relocaliser via
  `grep -n "^    ar-stepper {" packages/core/src/styles/themes/default.css`, le numéro de ligne a
  pu changer suite à la Task 2 qui ne touche pas ce fichier — devrait rester identique).

**Interfaces:**

- Consumes: `min-width`/`max-width`/`border-radius`/`box-shadow` désormais fournis par
  `panel.styles.ts` (Task 2).
- Produces: aucun changement visuel — `ar-stepper` garde le même rendu, seule la source de
  vérité change pour 4 propriétés sur 5.

- [ ] **Step 1: Localiser et réduire la règle `&::part(panel)`**

Contenu actuel (à l'intérieur du bloc `ar-stepper { }`) :

```css
&::part(panel) {
    padding: 0.75rem;
    min-width: var(--ar-panel-min-width);
    max-width: var(--ar-panel-max-width);
    border-radius: var(--ar-panel-radius);
    box-shadow: var(--ar-panel-shadow);
}
```

Nouveau contenu — ne garde que `padding` (seule divergence réelle, `0.75rem` vs
`var(--ar-panel-padding)` par défaut) :

```css
&::part(panel) {
    padding: 0.75rem;
}
```

- [ ] **Step 2: Vérifier le format**

Run: `npx prettier --check packages/core/src/styles/themes/default.css`
Expected: pas d'erreur.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/styles/themes/default.css
git commit -m "refactor(stepper): retire les redéclarations panel non divergentes (redondantes avec panel.styles.ts)"
```

---

## Task 4: Supprimer entièrement `ar-breadcrumb::part(panel)`

**Files:**

- Modify: `packages/core/src/styles/themes/default.css` (bloc `ar-breadcrumb { }`, chercher
  `&::part(panel)` à l'intérieur de ce bloc via
  `grep -n "^    ar-breadcrumb {" packages/core/src/styles/themes/default.css` puis lire les ~60
  lignes suivantes pour repérer précisément la sous-règle).

**Interfaces:**

- Consumes: `min-width`/`max-width`/`padding`/`border-radius`/`box-shadow` désormais tous fournis
  par `panel.styles.ts` (Task 2) — aucune propriété d'`ar-breadcrumb::part(panel)` ne divergeait
  du générique.
- Produces: aucun changement visuel. Les autres règles `&::part(...)` du bloc `ar-breadcrumb { }`
  (list, current, separator, bullet, home, trigger) restent inchangées — seule la sous-règle
  `&::part(panel)` disparaît, pas le bloc `ar-breadcrumb { }` dans son ensemble.

- [ ] **Step 1: Localiser et retirer uniquement la sous-règle `&::part(panel)`**

Contenu actuel de la sous-règle (à l'intérieur du bloc `ar-breadcrumb { }`, entre les autres
règles `&::part(...)`) :

```css
&::part(panel) {
    min-width: var(--ar-panel-min-width);
    max-width: var(--ar-panel-max-width);
    border-radius: var(--ar-panel-radius);
    box-shadow: var(--ar-panel-shadow);
    padding: var(--ar-panel-padding);
}
```

Retirer ces 7 lignes (accolade ouvrante/fermante incluses) entièrement, en conservant toutes les
autres règles `&::part(...)` du bloc `ar-breadcrumb { }` avant et après, avec une seule ligne
vide entre les règles restantes (pas deux lignes vides consécutives après suppression).

- [ ] **Step 2: Vérifier le format**

Run: `npx prettier --check packages/core/src/styles/themes/default.css`
Expected: pas d'erreur.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/styles/themes/default.css
git commit -m "refactor(breadcrumb): retire la règle panel entière, aucune propriété ne divergeait du générique"
```

---

## Task 5: Réduire `ar-dropdown::part(panel)` au strict divergent

**Files:**

- Modify: `packages/core/src/styles/themes/default.css` (bloc `ar-dropdown { }`, chercher via
  `grep -n "^    ar-dropdown {" packages/core/src/styles/themes/default.css`).

**Interfaces:**

- Consumes: `border-radius`/`box-shadow`/`padding`/`max-width` désormais fournis par
  `panel.styles.ts` (Task 2).
- Produces: aucun changement visuel — `ar-dropdown` garde le même rendu, seule la source de
  vérité change pour 4 propriétés sur 5.

- [ ] **Step 1: Localiser et réduire la règle `&::part(panel)`**

Contenu actuel (à l'intérieur du bloc `ar-dropdown { }`) :

```css
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
```

Nouveau contenu — ne garde que `min-width` (seule divergence réelle) avec son commentaire :

```css
&::part(panel) {
    /* Valeur propre, volontairement non cascadée depuis --ar-panel-min-width : un menu
               dropdown reste lisible plus étroit qu'un panel de disclosure générique
               (breadcrumb, stepper). */
    min-width: 10rem;
}
```

- [ ] **Step 2: Vérifier le format**

Run: `npx prettier --check packages/core/src/styles/themes/default.css`
Expected: pas d'erreur.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/styles/themes/default.css
git commit -m "refactor(dropdown): retire les redéclarations panel non divergentes (redondantes avec panel.styles.ts)"
```

---

## Task 6: Documenter la règle générale dans ADR-005

**Files:**

- Modify: `docs/decisions/ADR-005-tokens-pilotes-par-attribut.md`

**Interfaces:**

- Consumes: rien.
- Produces: section ADR de référence pour tout futur composant consommant une feuille de style
  partagée similaire à `panel.styles.ts`.

- [ ] **Step 1: Ajouter une section en fin de fichier**

Repérer le style des sections `## Application — ...` existantes (chercher `^## Application` dans
le fichier) comme modèle de ton et de structure. Ajouter à la fin du fichier :

```markdown
## Nettoyage transverse — non-redondance thème vs feuille de style partagée (2026-07-31)

Trouvé en clôturant le lot 5 (`ar-dropdown`, #129) : 3 des 4 composants consommant la feuille de
style partagée `panel.styles.ts` (`ar-stepper`, `ar-breadcrumb`, `ar-dropdown` — le 4ᵉ,
`ar-datepicker`, était déjà conforme sans décision consciente) redéclaraient dans leur bloc de
thème `default.css` des propriétés dont la valeur ne divergeait jamais du token générique
`--ar-panel-*` déjà fourni par la base partagée. Une règle externe `ar-<composant>::part(panel)`
l'emporte toujours sur la règle interne du shadow DOM indépendamment de la spécificité comparée —
si elle redéclare exactement la même valeur, la retirer ne change rien au résultat calculé.

**Règle générale retenue** : une feuille de style partagée entre plusieurs composants (consommée
via `static override styles`) est la source canonique pour toute propriété qui ne fait que
consommer un token générique sans jamais diverger. Un bloc de thème `::part(...)` par composant
ne doit redéclarer une propriété que si sa valeur diverge réellement du générique pour ce
composant précis (ex. `ar-stepper::part(panel) { padding: 0.75rem; }`, `ar-dropdown::part(panel)
{ min-width: 10rem; }` — les deux seules divergences réelles retrouvées) — jamais pour répéter la
même valeur. Applicable à toute future feuille de style partagée entre composants du projet
(`button.styles.ts`, `resetStyles`, `utilitiesStyles` — non audités à cette occasion, hors
scope).
```

- [ ] **Step 2: Vérifier le format**

Run: `npx prettier --check docs/decisions/ADR-005-tokens-pilotes-par-attribut.md`
Expected: pas d'erreur.

- [ ] **Step 3: Commit**

```bash
git add docs/decisions/ADR-005-tokens-pilotes-par-attribut.md
git commit -m "docs(adr-005): documente la règle de non-redondance thème vs feuille de style partagée"
```

---

## Task 7: Vérifier les tests existants et rebuild le manifeste

**Files:**

- Read-only check: fichiers de test des 3 composants touchés (`stepper.test.ts`,
  `stepper.browser.test.ts`, `breadcrumb.test.ts`, `breadcrumb.browser.test.ts`,
  `dropdown.test.ts`, `dropdown.browser.test.ts`, `dropdown.a11y.test.ts`, et tout fichier de
  test `.a11y.test.ts`/`.browser.test.ts` équivalent pour stepper/breadcrumb).

**Interfaces:**

- Consumes: composants modifiés (Tasks 2-5).
- Produces: confirmation verte, aucune régression.

- [ ] **Step 1: Grep des propriétés concernées dans les tests des 3 composants**

Run: `grep -rn "border-radius\|boxShadow\|box-shadow\|\bpadding\b\|min-width\|max-width\|minWidth\|maxWidth" packages/core/src/components/stepper/*.test.ts packages/core/src/components/breadcrumb/*.test.ts packages/core/src/components/dropdown/*.test.ts`

Expected : toute occurrence trouvée doit être lue en contexte pour confirmer qu'elle ne teste pas
une valeur calculée sans thème chargé pour une des propriétés retirées des blocs de thème
(peu probable — ces propriétés n'avaient de toute façon aucun fallback critique). Si une
assertion en dépend, adapter le test pour charger `default.css` avant d'asserter.

- [ ] **Step 2: Lancer la suite Vitest des 3 composants**

Run: `npm run test --workspace=packages/core -- stepper breadcrumb dropdown`
Expected: tous les tests passent, aucune régression.

- [ ] **Step 3: Rebuild le manifeste CEM (déclenche les garde-fous CI)**

Run: `npm run build:manifest --workspace=packages/core`
Expected: succès, aucune erreur `validate-no-hardcoded-tokens.js`/`validate-part-state-order.js`.

- [ ] **Step 4: Lancer la suite browser (WTR) des 3 composants**

Run (depuis `packages/core`) :
`npx web-test-runner "src/components/{stepper,breadcrumb,dropdown}/*.{browser,a11y}.test.ts"`
Expected: tous les tests passent.

- [ ] **Step 5: Commit (uniquement si un test a été modifié)**

```bash
git add packages/core/src/components/stepper/*.test.ts packages/core/src/components/breadcrumb/*.test.ts packages/core/src/components/dropdown/*.test.ts
git commit -m "test: adapte les tests panel après nettoyage des redondances thème"
```

Si rien n'a changé, passer directement à Task 8 sans commit.

---

## Task 8: Vérification visuelle manuelle (Playwright) sur les 4 composants

**Files:** aucun fichier modifié — vérification uniquement.

- [ ] **Step 1: Rebuild explicite de `packages/core` avant toute vérification Playwright**

Run: `npm run build:dev --workspace=packages/core`
Expected: build réussi (piège connu, cf. Global Constraints).

- [ ] **Step 2: Lancer le serveur de doc**

Run: `npm run dev --workspace=apps/docs` (arrière-plan ou terminal dédié).

- [ ] **Step 3: Capturer chaque composant avec thème chargé**

Utiliser l'outillage Playwright déjà présent (`apps/docs/playwright.config.ts`,
`@playwright/test`) pour naviguer vers les pages de démo `ar-stepper` (panel dropdown mobile
ouvert), `ar-breadcrumb` (panel dropdown mobile ouvert), `ar-dropdown` (panel ouvert),
`ar-datepicker` (calendrier ouvert). Capturer une screenshot de chaque panel/calendrier. Vérifier
visuellement pour chacun : coins arrondis, ombre, padding interne, largeur — identiques au rendu
d'avant ce nettoyage (aucune régression attendue, valeurs strictement identiques, seule la source
de la déclaration a changé).

- [ ] **Step 4: Vérifier le rendu sans thème pour `ar-stepper`/`ar-dropdown`**

Charger une page sans `default.css` (interception réseau ou variante de layout temporaire, ne pas
committer de changement). Confirmer que le comportement sans thème est inchangé par rapport à
avant ce nettoyage — `border-radius`/`box-shadow`/`min-width`/`max-width` n'avaient déjà aucun
fallback critique dans `panel.styles.ts` avant ce lot (pas de second paramètre `var()`), donc
leur absence de rendu sans thème est déjà le comportement actuel, pas une régression introduite
ici. Seuls `background-color`/`color`/`border-color` doivent rester visibles (fallback système
`Canvas`/`CanvasText`/`ButtonBorder`, inchangés par ce lot).

- [ ] **Step 5: Consigner le résultat**

Si un écart visuel est trouvé, corriger la Task concernée (2-5) et refaire Steps 3-4. Si rien
trouvé, continuer.

---

## Task 9: Revue finale de branche

**Files:** aucun — revue uniquement.

- [ ] **Step 1: Dispatcher une revue de branche complète sur un agent capable**

Comparer l'intégralité du diff `dev...chore/panel-shared-cleanup-129` contre
`docs/decisions/ADR-005-tokens-pilotes-par-attribut.md` et
`docs/superpowers/specs/2026-07-31-panel-shared-cleanup-129-design.md`. Points d'attention
spécifiques :

- `panel.styles.ts` : `min-width` ajouté correctement, commentaire de règle générale présent et
  clair.
- `ar-breadcrumb { }` : bloc `&::part(panel)` entièrement absent, mais toutes les autres règles
  `&::part(...)` du bloc `ar-breadcrumb { }` (list, current, separator, bullet, home, trigger)
  toujours présentes et inchangées — aucune suppression accidentelle au-delà du panel.
- `ar-stepper`/`ar-dropdown` : seule la propriété réellement divergente conservée dans chaque
  bloc, commentaire justificatif de `ar-dropdown` toujours présent.
- `ar-datepicker` : totalement inchangé (vérifier qu'aucun commit de cette branche ne le touche).
- Aucune référence résiduelle dans le repo à une valeur qui supposerait encore la présence des
  propriétés retirées des blocs de thème (docs, tests, commentaires).
- Format `git diff --stat` cohérent avec le périmètre attendu (5 fichiers : `panel.styles.ts`,
  `default.css`, `ADR-005...md`, spec, plan — plus tests si Task 7 en a modifié).

- [ ] **Step 2: Corriger les findings en une vague unique**

Si des findings « Critical »/« Important » remontent, les corriger en un seul commit groupé,
puis relancer Task 7 Steps 2-4 pour re-vérifier.

---

## Task 10: Créer la Pull Request

**Files:** aucun.

- [ ] **Step 1: Pousser la branche**

```bash
git push -u origin chore/panel-shared-cleanup-129
```

- [ ] **Step 2: Créer la PR vers `dev`**

```bash
gh pr create --base dev --title "refactor(panel): retire les redondances thème vs panel.styles.ts (#129)" --body "$(cat <<'EOF'
## Summary
- `panel.styles.ts` devient la source canonique documentée pour `border-radius`/`box-shadow`/`padding`/`max-width`/`min-width` génériques (ajout de `min-width`, absent jusqu'ici par asymétrie avec `max-width`).
- Retire 14 déclarations redondantes dans `default.css` (`ar-stepper`, `ar-breadcrumb`, `ar-dropdown`) qui redéclaraient une valeur identique au générique déjà fourni par la feuille de style partagée — `ar-breadcrumb::part(panel)` disparaît entièrement (aucune propriété n'y divergeait jamais).
- `ar-datepicker` (4ᵉ consommateur de `panel.styles.ts`) inchangé — déjà conforme à la règle sans qu'aucune décision consciente ne l'ait établi jusqu'ici.
- Nouvelle section ADR-005 documentant la règle générale (ne redéclarer dans un bloc de thème `::part(...)` que ce qui diverge réellement d'une feuille de style partagée).
- Aucun changement de structure DOM, aucun changement visuel.

Spec : `docs/superpowers/specs/2026-07-31-panel-shared-cleanup-129-design.md`
Plan : `docs/superpowers/plans/2026-07-31-panel-shared-cleanup-129.md`

## Test plan
- [x] `npm run test --workspace=packages/core -- stepper breadcrumb dropdown`
- [x] `npm run build:manifest --workspace=packages/core` (garde-fous CI verts)
- [x] Suite browser (WTR) stepper/breadcrumb/dropdown
- [x] Vérification visuelle Playwright sur les 4 composants (avec et sans thème)
- [x] Revue finale de branche

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Confirmer avec l'utilisateur avant tout merge**

Ne pas merger sur `dev` sans confirmation explicite (feedback_merge_after_autonomous_fix).

---

## Self-Review (déjà appliqué en rédigeant ce plan)

1. **Couverture de la spec** : les 3 sections de la spec (audit par propriété, changements
   `panel.styles.ts`/`default.css`/ADR-005, vérification) sont couvertes par Tasks 2-9. Branche +
   PR couvertes par Tasks 1 et 10.
2. **Scan placeholders** : aucun « TBD »/« gérer les cas limites » — chaque step contient le
   contenu exact à écrire.
3. **Cohérence des noms** : `min-width: var(--ar-panel-min-width)` (Task 2) correspond exactement
   au token déjà défini dans `default.css:root` et consommé jusqu'ici individuellement par
   `ar-stepper`/`ar-breadcrumb` (Tasks 3-4). Aucune divergence de nom entre les tâches.
