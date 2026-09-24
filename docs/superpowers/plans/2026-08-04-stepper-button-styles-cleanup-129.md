# Nettoyage `ar-stepper` — découplage de `button.styles.ts` (#129) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retirer la dépendance de `ar-stepper` à `packages/core/src/styles/components/button.styles.ts`
(dernier composant de la librairie à le consommer, cf. mémoire projet
`token-vs-part-generalization-129`), en suivant le même pattern que `ar-breadcrumb` (lot 4, PR #147) :
bouton `trigger` bespoke, structurel en interne (`stepper.styles.ts`), cosmétique dans le thème
(`default.css`), tokens `--ar-stepper-toggle-*` totalement indépendants de `--ar-button-*`.

**Architecture:** Aucun changement de structure DOM ni de `part` existant. Le bouton `part="trigger"`
perd ses classes `btn btn-secondary btn-block` ; ses propriétés structurelles (layout, taille de
cible WCAG) migrent en interne dans `stepper.styles.ts` ; ses propriétés cosmétiques (fond, texte,
hover, active) migrent en `ar-stepper::part(trigger)` dans `default.css`, pilotées par 5 nouveaux
tokens dédiés qui préservent exactement les valeurs résolues actuelles (aucun changement visuel).

**Tech Stack:** Lit 3, TypeScript, CSS custom properties, Prettier, garde-fous CI
(`validate-no-hardcoded-tokens.js`, `build:manifest`).

## Global Constraints

- Prettier : 100 char, 4 spaces, single quotes (CLAUDE.md).
- Headless : aucun fallback cosmétique dans le composant (`var(--token)` sans valeur par défaut
  pour tout ce qui est purement visuel) — seul un fallback structurel/WCAG peut avoir une valeur
  de repli littérale, marqué `/* a11y-fallback: ... */`.
- Aucun changement visuel attendu par défaut (thème chargé) — chaque valeur retirée de
  `button.styles.ts` est reproduite à l'identique via un nouveau token indépendant.
- Nouveaux tokens `--ar-stepper-toggle-*` totalement indépendants des tokens `--ar-button-*` (même
  exigence explicite du mainteneur que pour `ar-breadcrumb`, lot 4) — dupliquer la valeur littérale
  plutôt que référencer `var(--ar-button-*)`.
- Tout nouveau token `--ar-*` réellement consommé par `stepper.styles.ts` (via `var()`) doit avoir
  son entrée `@cssprop` dans le JSDoc de `stepper.ts`. Un token seulement posé par `default.css`
  sur `::part(trigger)` (jamais lu par `stepper.styles.ts`) n'est PAS un `@cssprop`.
- Ne jamais merger sur `dev` sans confirmation explicite de l'utilisateur
  (feedback_merge_after_autonomous_fix).
- `npm run dev --workspace=apps/docs` seul ne reconstruit pas le JS de `packages/core/dist` —
  rebuild explicite (`npm run build:dev --workspace=packages/core`) requis avant toute vérification
  Playwright (feedback_docs_dev_stale_dist).

---

## Task 1: Retirer `button.styles.ts` du composant et rendre le trigger bespoke

**Files:**

- Modify: `packages/core/src/components/stepper/stepper.renderer.ts`
- Modify: `packages/core/src/components/stepper/stepper.ts`
- Modify: `packages/core/src/components/stepper/stepper.styles.ts`
- Modify: `packages/core/src/styles/themes/default.css`

**Interfaces:**

- Consumes (nouveaux tokens, à déclarer en Step 3) : `--ar-stepper-toggle-bg`,
  `--ar-stepper-toggle-transition-duration`, `--ar-stepper-toggle-min-size`.
- Produces : 5 nouveaux tokens publics `--ar-stepper-toggle-*`, documentés en `@cssprop` uniquement
  pour ceux réellement lus par `stepper.styles.ts` (voir Step 4).

### Step 1: Retirer les classes `.btn` du bouton trigger

Dans `stepper.renderer.ts`, fonction `renderMobile` (autour de la ligne 186), remplacer :

```ts
<button
    type="button"
    part="trigger"
    class="btn btn-secondary btn-block"
    aria-controls="stepper-dropdown-menu"
    @click=${ctx.onToggle}
>
```

par :

```ts
<button
    type="button"
    part="trigger"
    aria-controls="stepper-dropdown-menu"
    @click=${ctx.onToggle}
>
```

(Le contenu interne du bouton — `<span class="btn-content d-inline-flex flex-column">...` — ne
change pas : `.btn-content` est une classe locale à `stepper.styles.ts`, pas `button.styles.ts` ;
`d-inline-flex`/`flex-column` viennent de `utilitiesStyles`, conservé.)

### Step 2: Retirer l'import et l'usage de `buttonStyles`

Dans `stepper.ts` :

- Retirer la ligne `import buttonStyles from '../../styles/components/button.styles.js';` (ligne 13).
- Dans `static override styles: CSSResultGroup = [...]` (autour de la ligne 86-92), retirer la ligne
  `buttonStyles,` du tableau. Le tableau devient :

```ts
static override styles: CSSResultGroup = [resetStyles, utilitiesStyles, panelStyles, styles];
```

### Step 3: Ajouter les règles structurelles internes sur `[part='trigger']`

Dans `stepper.styles.ts`, remplacer le bloc actuel :

```css
[part='trigger'] {
    padding: 0.5rem 0.75rem;
    justify-content: space-between;
    line-height: normal;
    text-align: left;
}
```

par :

```css
[part='trigger'] {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    line-height: normal;
    text-align: left;
    border: none;
    cursor: pointer;
    font: inherit;
    background-color: var(--ar-stepper-toggle-bg);
    transition: background-color var(--ar-stepper-toggle-transition-duration);
    /* a11y-fallback: WCAG 2.5.8 (Target Size Minimum) — sans thème chargé, le bouton perdrait sa
       taille de cible tactile */
    min-height: var(--ar-stepper-toggle-min-size, 2.5rem);
}
```

Rien d'autre ne change dans ce fichier.

### Step 4: Tokens dans `default.css`

**4a. Déclarer les 5 nouveaux tokens dans le bloc `:root` « Stepper »** (autour de la ligne 388,
juste après `--ar-stepper-connector-color: var(--ar-color-neutral-80);`) :

```css
--ar-stepper-connector-color: var(--ar-color-neutral-80);
--ar-stepper-toggle-bg: var(--ar-color-white);
--ar-stepper-toggle-bg-hover: var(--ar-color-neutral-40);
--ar-stepper-toggle-bg-pressed: var(--ar-color-neutral-30);
--ar-stepper-toggle-color: var(--ar-color-text);
--ar-stepper-toggle-color-pressed: var(--ar-color-white);
--ar-stepper-toggle-transition-duration: 0.15s;
--ar-stepper-toggle-min-size: 2.5rem;
```

Ces valeurs reproduisent exactement l'état actuel : `--ar-stepper-toggle-bg` = valeur actuelle de
`--ar-button-secondary-bg` en light (`var(--ar-color-white)`), `--ar-stepper-toggle-bg-hover` =
valeur actuelle de `--ar-button-secondary-bg-hover` (`var(--ar-color-neutral-40)`, identique en
light et dark, pas besoin d'override dark), `--ar-stepper-toggle-bg-pressed` = valeur déjà en dur
dans le bloc `ar-stepper::part(trigger):active` actuel (`var(--ar-color-neutral-30)`, déjà
indépendante de `--ar-button-*`, identique en light et dark), `--ar-stepper-toggle-color` = valeur
actuelle apportée par `.btn-secondary` (`var(--ar-color-text)`, déjà theme-aware en light/dark),
`--ar-stepper-toggle-color-pressed` = valeur actuelle de `.btn-secondary:active` (`var(--ar-color-white)`,
littéral, identique en light et dark).

**4b. Ajouter l'override dark pour `--ar-stepper-toggle-bg` uniquement** (seul token dont la valeur
résolue diverge entre light et dark, à l'image de `--ar-button-secondary-bg`) — deux endroits :

Dans `:root[data-theme='dark']`, section « Button — surfaces adaptées au fond sombre » (autour de
la ligne 585), ajouter juste après le bloc `--ar-button-*` existant, une nouvelle sous-section :

```css
/* Stepper — surface adaptée au fond sombre */
--ar-stepper-toggle-bg: var(--ar-color-neutral-30);
```

Répliquer exactement la même déclaration dans `@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) { ... } }`
(autour de la ligne 650), au même emplacement relatif (juste après le bloc `--ar-button-*`).

**4c. Remplacer le contenu du bloc `ar-stepper { &::part(trigger) { ... } }`** (autour de la ligne
861-880). Contenu actuel :

```css
ar-stepper {
    &::part(trigger) {
        border-radius: var(--ar-border-radius-xl);
        background-color: var(--ar-button-secondary-bg);
    }

    &::part(trigger):hover {
        background-color: var(--ar-button-secondary-bg-hover);
    }

    &::part(trigger):active:not(:disabled) {
        background-color: var(--ar-color-neutral-30);
        color: var(--ar-color-white);
    }

    &::part(trigger):focus-visible {
        background-color: var(--ar-button-secondary-bg-hover);
        outline: 2px solid var(--ar-focus-ring-color);
        outline-offset: var(--ar-focus-ring-offset);
    }
```

Nouveau contenu (même sélecteurs, tokens dédiés) :

```css
ar-stepper {
    &::part(trigger) {
        border-radius: var(--ar-border-radius-xl);
        color: var(--ar-stepper-toggle-color);
    }

    &::part(trigger):hover {
        background-color: var(--ar-stepper-toggle-bg-hover);
    }

    &::part(trigger):active:not(:disabled) {
        background-color: var(--ar-stepper-toggle-bg-pressed);
        color: var(--ar-stepper-toggle-color-pressed);
    }

    &::part(trigger):focus-visible {
        background-color: var(--ar-stepper-toggle-bg-hover);
        outline: 2px solid var(--ar-focus-ring-color);
        outline-offset: var(--ar-focus-ring-offset);
    }
```

(`background-color` de base disparaît de ce bloc : elle est désormais posée en interne dans
`stepper.styles.ts` via `--ar-stepper-toggle-bg`, Step 3 — éviter la double déclaration.)

Le reste du bloc `ar-stepper { }` (`&::part(panel)`, `&::part(step-link)`, etc., lignes ~883
et suivantes) reste inchangé.

**4d. Garde `prefers-reduced-motion`** : vérifier si une règle générale
`@media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition-duration: ... } }`
existe déjà globalement dans `default.css` ou dans les styles partagés (`animations.styles.ts`,
`utilitiesStyles`) et s'applique à `[part='trigger']` de `ar-stepper`. Si oui, ne rien ajouter. Si
non, ajouter dans `stepper.styles.ts` (pas `default.css`, cf. contrainte 6 ADR-005 : la garde doit
rester interne pour ne pas être défaite par la transition externe du thème) :

```css
@media (prefers-reduced-motion: reduce) {
    [part='trigger'] {
        transition: none;
    }
}
```

### Step 5: `@cssprop` JSDoc

Dans `stepper.ts`, ajouter dans le bloc JSDoc du composant (à la suite des `@cssprop` existants,
avant `@event`) les entrées pour les tokens réellement consommés en interne par `stepper.styles.ts`
(Step 3) uniquement :

```
 * @cssprop --ar-stepper-toggle-bg - Fond du bouton d'ouverture du panel mobile.
 * @cssprop --ar-stepper-toggle-transition-duration - Durée de la transition de fond du bouton d'ouverture (respecte `prefers-reduced-motion`).
 * @cssprop --ar-stepper-toggle-min-size - Taille de cible minimale du bouton d'ouverture (WCAG 2.5.8).
```

Ne PAS documenter `--ar-stepper-toggle-bg-hover`, `--ar-stepper-toggle-bg-pressed`,
`--ar-stepper-toggle-color`, `--ar-stepper-toggle-color-pressed` en `@cssprop` : ces 4 tokens ne
sont posés que dans `default.css` sur `::part(trigger)`, jamais lus par `stepper.styles.ts`
lui-même (cf. contrainte projet `feedback_cssprop_requires_internal_consumption` — vérifier ce
point précisément par grep avant de conclure, ne pas documenter par réflexe).

### Step 6: Vérifier le format

Run: `npx prettier --check packages/core/src/components/stepper/stepper.ts packages/core/src/components/stepper/stepper.renderer.ts packages/core/src/components/stepper/stepper.styles.ts packages/core/src/styles/themes/default.css`
Expected: pas d'erreur (sinon `npx prettier --write` sur les fichiers listés).

### Step 7: Commit

```bash
git add packages/core/src/components/stepper/stepper.ts packages/core/src/components/stepper/stepper.renderer.ts packages/core/src/components/stepper/stepper.styles.ts packages/core/src/styles/themes/default.css
git commit -m "refactor(stepper): découple button.styles.ts, migre token vs ::part() (#129)"
```

---

## Task 2: Tests et garde-fous CI

**Files:** Read-only check : `packages/core/src/components/stepper/*.test.ts`.

- [ ] **Step 1: Grep les tests existants pour toute dépendance à `.btn`/`.btn-secondary`/`.btn-block`
      sur le trigger**

Run: `grep -rn "btn-secondary\|btn-block\|classList\|\.btn\b" packages/core/src/components/stepper/*.test.ts`

Si une assertion dépend d'une de ces classes sur le bouton `part="trigger"`, l'adapter pour cibler
`[part="trigger"]` directement plutôt qu'une classe retirée.

- [ ] **Step 2: Lancer la suite Vitest du composant**

Run: `npm run test --workspace=packages/core -- stepper`
Expected: tous les tests passent.

- [ ] **Step 3: Lancer la suite browser (WTR) du composant**

Run (depuis `packages/core`): `npx web-test-runner "src/components/stepper/*.{browser,a11y}.test.ts"`
Expected: tous les tests passent.

- [ ] **Step 4: Rebuild le manifeste CEM**

Run: `npm run build:manifest --workspace=packages/core`
Expected: succès, aucune erreur `validate-no-hardcoded-tokens.js`/garde-fou `@cssprop`.

- [ ] **Step 5: Commit (uniquement si un test a été modifié)**

```bash
git add packages/core/src/components/stepper/*.test.ts
git commit -m "test(stepper): adapte les assertions après retrait des classes .btn du trigger"
```

Si rien n'a changé, passer directement à Task 3 sans commit.

---

## Task 3: Vérification visuelle manuelle (Playwright)

**Files:** aucun fichier modifié — vérification uniquement.

- [ ] **Step 1: Rebuild explicite de `packages/core`**

Run: `npm run build:dev --workspace=packages/core`
Expected: build réussi (piège connu, cf. Global Constraints).

- [ ] **Step 2: Lancer le serveur de doc**

Run: `npm run dev --workspace=apps/docs` (arrière-plan).

- [ ] **Step 3: Capturer le bouton trigger `ar-stepper` en mode mobile, thème chargé**

Utiliser l'outillage Playwright déjà présent (`apps/docs/playwright.config.ts`) pour naviguer vers
la page de démo `ar-stepper`, réduire le viewport pour déclencher le rendu mobile (dropdown),
capturer l'état par défaut, `:hover`, `:active` (simulable via `page.hover`/`page.mouse.down` ou
`:focus-visible` via tabulation clavier). Comparer visuellement à l'état sur `dev` avant ce
nettoyage (fond blanc/clair au repos, gris au survol, gris foncé + texte blanc actif, anneau de
focus visible) — aucune différence attendue.

- [ ] **Step 4: Vérifier en dark mode**

Basculer `data-theme="dark"` (ou `prefers-color-scheme: dark` via `page.emulateMedia`), reprendre
les mêmes captures. Comparer au rendu actuel sur `dev` (fond gris foncé, cohérent avec
`--ar-button-secondary-bg` en dark).

- [ ] **Step 5: Vérifier le rendu sans thème**

Charger la page sans `default.css` (interception réseau ou variante de layout temporaire, ne pas
committer de changement). Le bouton doit perdre son fond (transparent, `--ar-stepper-toggle-bg`
sans fallback = headless correct) mais garder sa taille de cible WCAG (`min-height: 2.5rem` via le
fallback `a11y-fallback`) et rester utilisable (texte lisible, cliquable).

- [ ] **Step 6: Consigner le résultat**

Si un écart visuel est trouvé, corriger Task 1 et refaire Steps 3-5. Si rien trouvé, continuer.

---

## Task 4: Revue finale de branche et Pull Request

**Files:** aucun — revue et PR uniquement.

- [ ] **Step 1: Dispatcher une revue de branche complète sur un agent capable**

Comparer l'intégralité du diff `dev...chore/stepper-button-styles-cleanup-129` à ce plan. Points
d'attention spécifiques :

- `stepper.ts` : import et usage de `buttonStyles` bien retirés, aucune autre référence résiduelle
  à `button.styles.ts` dans le composant (`grep -rn "button.styles\|btn-secondary\|btn-block" packages/core/src/components/stepper/`
  ne doit plus rien trouver hors tests déjà adaptés).
- `stepper.renderer.ts` : bouton trigger sans classe, `part="trigger"` conservé, contenu interne
  inchangé.
- `stepper.styles.ts` : aucune valeur cosmétique en dur sans token (headless), fallback
  `min-height` bien marqué `a11y-fallback`.
- `default.css` : les 5 nouveaux tokens `--ar-stepper-toggle-*` bien déclarés dans `:root`
  (section Stepper), override dark de `--ar-stepper-toggle-bg` présent aux 2 emplacements
  (`:root[data-theme='dark']` et `@media (prefers-color-scheme: dark)`), aucune référence
  résiduelle à `--ar-button-*` dans le bloc `ar-stepper { }`.
- `@cssprop` JSDoc : seuls les 3 tokens réellement consommés en interne documentés (pas les 4
  tokens purement thème).
- Aucun autre composant touché par erreur (`git diff --stat` limité aux fichiers stepper +
  `default.css`, plus tests si Task 2 en a modifié).
- Comparaison explicite au diff `button.styles.ts` (jamais modifié par cette branche) pour
  vérifier qu'aucune propriété structurelle qu'il apportait n'a été oubliée (leçon lots précédents
  #129).

- [ ] **Step 2: Corriger les findings en une vague unique**

Si des findings « Critical »/« Important » remontent, les corriger en un seul commit groupé, puis
relancer Task 2 Steps 2-4 et Task 3 pour re-vérifier.

- [ ] **Step 3: Pousser la branche**

```bash
git push -u origin chore/stepper-button-styles-cleanup-129
```

(La branche est déjà créée et un premier push vide a peut-être déjà eu lieu — `git push` suffit.)

- [ ] **Step 4: Créer la PR vers `dev`**

```bash
gh pr create --base dev --title "refactor(stepper): découple button.styles.ts, migre token vs ::part() (#129)" --body "$(cat <<'EOF'
## Summary
- `ar-stepper` n'importe plus `button.styles.ts` — dernier composant de la librairie à en dépendre, chantier #129 clos sur ce point.
- Bouton `part="trigger"` (dropdown mobile) devenu bespoke : structure/taille de cible WCAG en interne (`stepper.styles.ts`), fond/couleur/hover/active dans le thème (`default.css`), pilotés par 5 nouveaux tokens `--ar-stepper-toggle-*` totalement indépendants de `--ar-button-*`.
- Aucun changement visuel par défaut — les nouveaux tokens reproduisent exactement les valeurs résolues actuelles (light + dark).

Plan : `docs/superpowers/plans/2026-08-04-stepper-button-styles-cleanup-129.md`

## Test plan
- [x] `npm run test --workspace=packages/core -- stepper`
- [x] Suite browser (WTR) stepper
- [x] `npm run build:manifest --workspace=packages/core` (garde-fous CI verts)
- [x] Vérification visuelle Playwright (mobile, hover/active/focus, dark mode, sans thème)
- [x] Revue finale de branche

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Confirmer avec l'utilisateur avant tout merge**

Ne pas merger sur `dev` sans confirmation explicite (feedback_merge_after_autonomous_fix).

---

## Self-Review (déjà appliqué en rédigeant ce plan)

1. **Couverture** : décision de conception (Task 1) + vérification (Tasks 2-3) + revue/PR (Task 4)
   couvrent l'intégralité du scope annoncé au mainteneur.
2. **Zéro régression visuelle garantie par construction** : chaque nouveau token reproduit une
   valeur déjà résolue aujourd'hui (vérifié dans `default.css` avant rédaction), pas de nouvelle
   valeur de design inventée.
3. **Cohérence des noms** : `--ar-stepper-toggle-*` suit exactement la convention
   `--ar-breadcrumb-toggle-*` (lot 4) pour le même rôle fonctionnel (bouton d'ouverture d'un panel
   mobile).
4. **Règle `@cssprop`** appliquée strictement (Step 5 de Task 1) : seuls les tokens consommés dans
   `stepper.styles.ts` documentés, pas ceux qui ne vivent que dans `default.css`.
