# Vocabulaire de rôles ::part() transverses — Lot 3 (action-button) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Appliquer le rôle transverse `action-button` sur les 3 boutons de commande restants qui
ne le portent pas encore — `ar-alert` (`close`), `ar-dialog` (`close`), `ar-table-sort` (`button`)
— en renommant chacun en toutes lettres (`close-button`, `sort-button`) puis en ajoutant
`action-button` de façon additive, exactement comme au lot 1 (`nav-button`/`footer-button`/
`today-button`/`close-button` sur `ar-datepicker`).

**Architecture:** Renommage additif sur des parts déjà existants, aucun nouveau wrapper. Chaque
bouton reçoit `part="<nom-spécifique>-button action-button"`. `ar-table-sort` a en plus une
variante d'état `button--pending` à renommer en `sort-button--pending` (même préfixe que le part
qu'elle qualifie). `ar-table-sort.styles.ts` sélectionne déjà `button` via `[part~='button']`
(contains) — pas de conversion `~=` nécessaire là ; `ar-alert.styles.ts` et `ar-dialog.styles.ts`
sélectionnent `close` via `[part='close']` (égalité stricte) — **doit** être converti en
`[part~='close-button']` puisque le part devient multi-jetons.

**Tech Stack:** Lit 3, TypeScript, Vitest (unit + a11y jsdom), Web Test Runner (browser).

## Global Constraints

- Prettier : 100 caractères, 4 espaces, single quotes (déjà appliqué automatiquement par le hook
  `lint-staged` au commit — ne pas s'inquiéter d'un reformattage après `git commit`).
- `import type` pour tout import de type.
- Conventional Commits (commitlint + Husky).
- Aucun fallback cosmétique dans les composants — headless, tokens dans `themes/default.css`
  uniquement. Ce lot n'ajoute aucun nouveau token, aucune étape ne doit en introduire.
- Projet en alpha : tous les renommages de ce lot sont secs, pas de `warnDeprecated`/alias.
- **Aucun nouveau wrapper d'élément n'est ajouté dans ce lot** — uniquement des parts déjà existants
  qui reçoivent un rôle additif.
- `close` (alert, dialog) et `button` (table-sort) deviennent multi-jetons. Toute sélection par
  égalité stricte existante (`[part="close"]`, `[part="button"]` — sauf `ar-table-sort.styles.ts`
  qui utilise déjà `[part~='button']`) doit être convertie en sélecteur « contient »
  (`[part~="close-button"]`/`[part~="sort-button"]`) **avant** que le renommage ne prenne effet,
  sinon les sélecteurs cessent silencieusement de matcher — cf. le bug Critical trouvé sur
  `ar-tooltip` au lot 2 pour un exemple concret de cette régression.
- `packages/core/src/styles/themes/default.css` cible déjà `::part(close)` (2 blocs : `ar-alert`,
  `ar-dialog`) et `::part(button)`/`::part(button--pending)` (`ar-table-sort`) — **doivent être
  renommés dans le thème aussi**, sous peine de reproduire le bug Critical trouvé en revue finale
  du lot 2 (styles de thème orphelins après un renommage de part côté composant).
- Spec de référence : `docs/superpowers/specs/2026-08-13-role-parts-vocabulary-181-design.md`.

---

### Task 1: Setup — branche de travail

**Files:** aucun fichier modifié.

- [ ] **Step 1: Créer la branche**

```bash
cd /Users/jon/Code/Active_projects/ariane
git checkout dev
git pull origin dev
git checkout -b fix/parts-roles-vocabulary-181-lot3
```

- [ ] **Step 2: Vérifier l'état de départ (tests unitaires)**

Run: `npm test --workspace=packages/core`
Expected: PASS (baseline avant toute modification).

---

### Task 2: `ar-alert` — `close` → `close-button action-button`

**Files:**

- Modify: `packages/core/src/components/alert/alert.ts`
- Modify: `packages/core/src/components/alert/alert.styles.ts`
- Modify: `packages/core/src/components/alert/alert.test.ts`
- Modify: `packages/core/src/styles/themes/default.css`

**Interfaces:**

- Produces: `part="close-button action-button"` sur le bouton de fermeture d'`ar-alert`.

- [ ] **Step 1: Mettre à jour les assertions de test (échec attendu)**

Dans `packages/core/src/components/alert/alert.test.ts`, `getPart`/`requirePart`
(`packages/core/src/test-utils.ts`) matchent déjà via `[part~="…"]` — aucune correction du helper
n'est nécessaire, tous les appels `getPart(el, 'close')`/`requirePart(el, 'close')` déjà présents
dans ce fichier continueront de fonctionner sans changement puisque `close` reste un token réel
du nouveau `part="close-button action-button"`. Ajouter une seule assertion sur la valeur complète,
à côté du test existant sur `aria-label` (ligne 309) :

```ts
// à ajouter, juste après le test `requirePart(el, 'close').getAttribute('aria-label')` existant
it('porte le part combiné "close-button action-button"', () => {
    expect(requirePart(el, 'close').getAttribute('part')).toBe('close-button action-button');
});
```

- [ ] **Step 2: Run test — vérifier l'échec**

Run: `npm test --workspace=packages/core -- alert`
Expected: FAIL (le composant ne produit pas encore `part="close-button action-button"`).

- [ ] **Step 3: Modifier le composant**

Dans `packages/core/src/components/alert/alert.ts`, JSDoc (ligne 31) :

```ts
// avant
* @csspart close     - Le bouton de fermeture (présent uniquement si `next-focus` est défini).
// après
* @csspart close-button - Le bouton de fermeture (présent uniquement si `next-focus` est défini).
* @csspart action-button - Porté par `close-button` : bouton qui déclenche une action ponctuelle.
```

Render (ligne 201) :

```ts
// avant
                ? html` <button
                      part="close"
                      @click=${this._hide}
// après
                ? html` <button
                      part="close-button action-button"
                      @click=${this._hide}
```

- [ ] **Step 4: Convertir le sélecteur CSS en `[part~='close-button']`**

Dans `packages/core/src/components/alert/alert.styles.ts` (2 occurrences, lignes 23 et 28) :

```css
/* avant */
        [part='close'] {
    /* ... */
    [part='close'] {
/* après */
        [part~='close-button'] {
    /* ... */
    [part~='close-button'] {
```

- [ ] **Step 5: Mettre à jour le thème par défaut**

Dans `packages/core/src/styles/themes/default.css`, bloc `ar-alert` (3 occurrences) :

```css
/* avant */
        &::part(close) {
        &::part(close):hover {
        &::part(close):focus-visible {
/* après */
        &::part(close-button) {
        &::part(close-button):hover {
        &::part(close-button):focus-visible {
```

- [ ] **Step 6: Run test — vérifier le succès**

Run: `npm test --workspace=packages/core -- alert`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/components/alert packages/core/src/styles/themes/default.css
git commit -m "fix(alert): close→close-button + rôle action-button (#181)"
```

---

### Task 3: `ar-dialog` — `close` → `close-button action-button`

**Files:**

- Modify: `packages/core/src/components/dialog/dialog.ts`
- Modify: `packages/core/src/components/dialog/dialog.styles.ts`
- Modify: `packages/core/src/components/dialog/dialog.test.ts`
- Modify: `packages/core/src/components/dialog/dialog.browser.test.ts`
- Modify: `packages/core/src/styles/themes/default.css`

**Interfaces:**

- Produces: `part="close-button action-button"` sur le bouton de fermeture d'`ar-dialog`.

- [ ] **Step 1: Mettre à jour les assertions de test (échec attendu)**

Dans `packages/core/src/components/dialog/dialog.test.ts` (ligne 57-59) :

```ts
// avant
it('contient part="close"', () => {
    expect(getPart(el, 'close')).not.toBeNull();
});
// après
it('contient part="close-button action-button"', () => {
    expect(getPart(el, 'close')?.getAttribute('part')).toBe('close-button action-button');
});
```

Ligne 183 — `getPart(el, 'close')` reste inchangé (assertion négative `toBeNull()`, `close` reste
un token réel).

Dans `packages/core/src/components/dialog/dialog.browser.test.ts` (ligne 207) :

```ts
// avant
const closeEl = shadow.querySelector('[part="close"]') as HTMLElement;
// après
const closeEl = shadow.querySelector('[part~="close-button"]') as HTMLElement;
```

- [ ] **Step 2: Run tests — vérifier l'échec**

Run: `npm test --workspace=packages/core -- dialog`
Expected: FAIL.

- [ ] **Step 3: Modifier le composant**

Dans `packages/core/src/components/dialog/dialog.ts`, JSDoc (ligne 63) :

```ts
// avant
 * @csspart close - Le bouton de fermeture dans l'en-tête. Absent du DOM si `without-header` est actif.
// après
 * @csspart close-button - Le bouton de fermeture dans l'en-tête. Absent du DOM si `without-header` est actif.
 * @csspart action-button - Porté par `close-button` : bouton qui déclenche une action ponctuelle.
```

Render (ligne 312) :

```ts
// avant
                          <button part="close" type="button" data-ar-dismiss>
// après
                          <button part="close-button action-button" type="button" data-ar-dismiss>
```

- [ ] **Step 4: Convertir les sélecteurs CSS en `[part~='close-button']`**

Dans `packages/core/src/components/dialog/dialog.styles.ts` (3 occurrences, lignes 152, 167, 209) :

```css
/* avant */
        [part='close'] {
        [part='close']:focus-visible {
            [part='close'] {
/* après */
        [part~='close-button'] {
        [part~='close-button']:focus-visible {
            [part~='close-button'] {
```

- [ ] **Step 5: Mettre à jour le thème par défaut**

Dans `packages/core/src/styles/themes/default.css`, bloc `ar-dialog` (2 occurrences) :

```css
/* avant */
        &::part(close) {
        &::part(close):hover {
/* après */
        &::part(close-button) {
        &::part(close-button):hover {
```

- [ ] **Step 6: Run tests — vérifier le succès**

Run: `npm test --workspace=packages/core -- dialog`
Expected: PASS.

- [ ] **Step 7: Test navigateur**

Run: `cd packages/core && npx web-test-runner "src/components/dialog/*.{browser,a11y}.test.ts"`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/components/dialog packages/core/src/styles/themes/default.css
git commit -m "fix(dialog): close→close-button + rôle action-button (#181)"
```

---

### Task 4: `ar-table-sort` — `button` → `sort-button action-button`

**Files:**

- Modify: `packages/core/src/components/table-sort/table-sort.ts`
- Modify: `packages/core/src/components/table-sort/table-sort.styles.ts`
- Modify: `packages/core/src/components/table-sort/table-sort.test.ts`
- Modify: `packages/core/src/components/table-sort/table-sort.a11y.test.ts`
- Modify: `packages/core/src/components/table-sort/table-sort.browser.test.ts`
- Modify: `packages/core/src/styles/themes/default.css`

**Interfaces:**

- Produces: `part="sort-button action-button"` sur le bouton déclencheur d'`ar-table-sort` (plus
  `sort-button--pending` quand `pending` est actif, remplace `button--pending`).

- [ ] **Step 1: Mettre à jour les assertions de test (échec attendu)**

Dans `packages/core/src/components/table-sort/table-sort.test.ts` (ligne 46-48) :

```ts
// avant
it('contient part="button"', () => {
    expect(getPart(el, 'button')).not.toBeNull();
});
// après
it('contient part="sort-button action-button"', () => {
    expect(getPart(el, 'sort-button')?.getAttribute('part')).toBe('sort-button action-button');
});
```

Toutes les autres occurrences de ce fichier (`requirePart(el, 'button')`, lignes 118-316) utilisent
`button` pour retrouver l'élément, pas pour vérifier son nom exact — remplacer `'button'` par
`'sort-button'` dans chacun de ces appels `requirePart(el, 'button')` (12 occurrences).

Dans `packages/core/src/components/table-sort/table-sort.a11y.test.ts` (lignes 102, 105) :

```ts
// avant
el.shadowRoot!.querySelector<HTMLElement>('[part="button"]')!.click();
// ...
el.shadowRoot!.querySelector('[part~="button"]')!.getAttribute('aria-disabled'),
// après
el.shadowRoot!.querySelector<HTMLElement>('[part~="sort-button"]')!.click();
// ...
el.shadowRoot!.querySelector('[part~="sort-button"]')!.getAttribute('aria-disabled'),
```

Dans `packages/core/src/components/table-sort/table-sort.browser.test.ts` (lignes 7-8) :

```ts
// avant
const b = el.shadowRoot?.querySelector<HTMLButtonElement>('[part~="button"]');
if (!b) throw new Error('part="button" introuvable');
// après
const b = el.shadowRoot?.querySelector<HTMLButtonElement>('[part~="sort-button"]');
if (!b) throw new Error('part="sort-button" introuvable');
```

- [ ] **Step 2: Run tests — vérifier l'échec**

Run: `npm test --workspace=packages/core -- table-sort`
Expected: FAIL.

- [ ] **Step 3: Modifier le composant**

Dans `packages/core/src/components/table-sort/table-sort.ts`, JSDoc (lignes 57-58) :

```ts
// avant
 * @csspart button    - Le bouton déclencheur.
 * @csspart button--pending - Le bouton pendant l'attente de confirmation (variante d'état de `button`).
// après
 * @csspart sort-button    - Le bouton déclencheur.
 * @csspart sort-button--pending - Le bouton pendant l'attente de confirmation (variante d'état de `sort-button`).
 * @csspart action-button - Porté par `sort-button` : bouton qui déclenche une action ponctuelle.
```

Render (ligne 175) :

```ts
// avant
part = "button${this.pending ? ' button--pending' : ''}";
// après
part = "sort-button action-button${this.pending ? ' sort-button--pending' : ''}";
```

- [ ] **Step 4: Renommer les sélecteurs CSS**

Dans `packages/core/src/components/table-sort/table-sort.styles.ts` (déjà en `[part~=...]`, seule
la chaîne change — lignes 16, 28) :

```css
/* avant */
    [part~='button'] {
    [part~='button']:focus-visible {
/* après */
    [part~='sort-button'] {
    [part~='sort-button']:focus-visible {
```

- [ ] **Step 5: Mettre à jour le thème par défaut**

Dans `packages/core/src/styles/themes/default.css`, bloc `ar-table-sort` (2 occurrences) :

```css
/* avant */
&::part(button) {
    gap: 0.375rem;
}

&::part(button--pending) {
    cursor: wait;
}
/* après */
&::part(sort-button) {
    gap: 0.375rem;
}

&::part(sort-button--pending) {
    cursor: wait;
}
```

- [ ] **Step 6: Run tests — vérifier le succès**

Run: `npm test --workspace=packages/core -- table-sort`
Expected: PASS.

- [ ] **Step 7: Tests navigateur**

Run: `cd packages/core && npx web-test-runner "src/components/table-sort/*.{browser,a11y}.test.ts"`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/components/table-sort packages/core/src/styles/themes/default.css
git commit -m "fix(table-sort): button→sort-button + rôle action-button (#181)"
```

---

### Task 5: Vérification finale de branche

**Files:** aucun fichier modifié.

- [ ] **Step 1: Suite complète core**

Run: `npm test --workspace=packages/core`
Expected: PASS (tous les tests, pas seulement ceux touchés par ce lot).

- [ ] **Step 2: Tests navigateur core**

Run: `npm run test:browser --workspace=packages/core`
Expected: PASS. (Si un test échoue avec une erreur `Failed to fetch dynamically imported module`
sur `cdn/index.js`, le worktree a un `dist/` obsolète ou absent — lancer d'abord
`npm run build --workspace=packages/core`, puis relancer la suite.)

- [ ] **Step 3: Build manifeste + build docs**

Run: `npm run build:manifest --workspace=packages/core && npm run build --workspace=apps/docs`
Expected: succès.

- [ ] **Step 4: Tests a11y docs**

Run: `npm run test:a11y --workspace=apps/docs`
Expected: PASS.

- [ ] **Step 5: Grep final — aucune correspondance résiduelle sur les anciens noms**

Run: `grep -rn "part=\"close\"\|part='close'\|::part(close)\|part=\"button\"\|part='button'\|::part(button)" packages/core/src/components/alert packages/core/src/components/dialog packages/core/src/components/table-sort packages/core/src/styles/themes/default.css`
Expected: aucune sortie.

- [ ] **Step 6: Lint/format**

Run: `npm run lint`
Expected: PASS.

---

### Task 6: Créer la Pull Request

**Files:** aucun fichier modifié.

- [ ] **Step 1: Pousser la branche**

```bash
git push -u origin fix/parts-roles-vocabulary-181-lot3
```

- [ ] **Step 2: Créer la PR vers `dev`**

```bash
gh pr create --base dev --title "fix(core): vocabulaire de rôles ::part() transverses — lot 3, action-button (#181)" --body "$(cat <<'EOF'
## Résumé

Troisième lot du chantier #181 : rôle transverse `action-button` sur les boutons de commande
restants, additif sur un nom spécifique en toutes lettres (même schéma que le lot 1) :

- `ar-alert` : `close` → `part="close-button action-button"`
- `ar-dialog` : `close` → `part="close-button action-button"`
- `ar-table-sort` : `button` → `part="sort-button action-button"` (+ `button--pending` →
  `sort-button--pending`)

`ar-tooltip` et `ar-dropdown` ne sont pas concernés (cf. spec — la racine ne peut porter aucun
second rôle, et `ar-dropdown` est déjà conforme). Le thème par défaut (`themes/default.css`) est
mis à jour dans chaque commit correspondant, pour éviter la régression trouvée en revue finale du
lot 2 (sélecteurs `::part()` orphelins après un renommage de part).

Spec : `docs/superpowers/specs/2026-08-13-role-parts-vocabulary-181-design.md`
Plan : `docs/superpowers/plans/2026-08-14-role-parts-vocabulary-181-lot3.md`

## Test plan

- [ ] `npm test --workspace=packages/core` — PASS
- [ ] `npm run test:browser --workspace=packages/core` — PASS
- [ ] `npm run test:a11y --workspace=apps/docs` — PASS
- [ ] `npm run build:manifest --workspace=packages/core && npm run build --workspace=apps/docs` — succès

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Confirmer la création**

Run: `gh pr view --json url --jq .url`
Expected: affiche l'URL de la PR nouvellement créée, vers `dev`.
