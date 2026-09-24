# Vocabulaire de rôles ::part()/slot transverses — Lot 1 (ar-charcounter, ar-pagination, ar-datepicker) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rétrofit du premier lot du chantier #181 — appliquer le vocabulaire de rôles `::part()`
transverses (`control`, `field` avec ses sous-rôles `input`/`select`, `action-button`, racine
nommée d'après le composant) sur `ar-pagination` et `ar-datepicker`, aligner tous les `-btn` sur la
convention `-button` en toutes lettres, corriger le nommage de slot `ar-charcounter`
(`icon-warning`/`icon-error` → `warning-icon`/`error-icon`) et sa racine (`container` →
`charcounter`), publier la nouvelle page de documentation des conventions, et ouvrir la PR vers
`dev`.

**Architecture:** Chaque rôle transverse est additif (`part="existant nouveau-role"`), sauf la
racine du composant qui remplace le part générique existant. Chaque endroit qui sélectionne un part
concerné par égalité stricte (`[part="x"]` en CSS/`@query`/tests) doit être converti en
sélection « contient » (`[part~="x"]`) avant que ce part ne devienne multi-jetons, sous peine de
casser silencieusement le style ou la logique interne.

**Tech Stack:** Lit 3, TypeScript, Vitest (unit + a11y jsdom), Web Test Runner (browser), Astro 6
(site de doc).

## Global Constraints

- Prettier : 100 caractères, 4 espaces, single quotes (déjà appliqué automatiquement par le hook
  `lint-staged` au commit — ne pas s'inquiéter d'un reformattage après `git commit`).
- `import type` pour tout import de type.
- Conventional Commits (commitlint + Husky).
- Aucun fallback cosmétique dans les composants — headless, tokens dans `themes/default.css`
  uniquement. Ce lot n'ajoute aucun nouveau token, donc non applicable directement, mais aucune
  étape de ce plan ne doit en introduire.
- Projet en alpha : le renommage du slot `ar-charcounter` est un renommage sec, pas de
  `warnDeprecated`/alias.
- Spec de référence : `docs/superpowers/specs/2026-08-13-role-parts-vocabulary-181-design.md`.

---

### Task 1: Setup — branche de travail

**Files:** aucun fichier modifié.

- [ ] **Step 1: Créer la branche**

```bash
cd /Users/jon/Code/Active_projects/ariane
git checkout dev
git pull origin dev
git checkout -b fix/parts-roles-vocabulary-181-lot1
```

- [ ] **Step 2: Vérifier l'état de départ (tests unitaires)**

Run: `npm test --workspace=packages/core`
Expected: PASS (baseline avant toute modification).

---

### Task 2: `ar-charcounter` — racine `container` → `charcounter`, slots `icon-warning`/`icon-error` → `warning-icon`/`error-icon`

**Files:**

- Modify: `packages/core/src/components/charcounter/charcounter.ts`
- Modify: `packages/core/src/components/charcounter/charcounter.styles.ts`
- Modify: `packages/core/src/components/charcounter/charcounter.test.ts`
- Modify: `apps/docs/src/content/components/ar-charcounter.mdx`

**Interfaces:**

- Produces: part `charcounter` (racine, remplace `container`) ; slots `warning-icon`/`error-icon`
  (remplacent `icon-warning`/`icon-error`).

- [ ] **Step 1: Mettre à jour les assertions de test (échec attendu)**

Dans `packages/core/src/components/charcounter/charcounter.test.ts`, ligne 57 :

```ts
// avant
it('contient part="container"', () => expect(getPart(el, 'container')).not.toBeNull());
// après
it('contient part="charcounter"', () => expect(getPart(el, 'charcounter')).not.toBeNull());
```

Ligne 82 :

```ts
// avant
expect(getPart(el, 'container')).toBeNull();
// après
expect(getPart(el, 'charcounter')).toBeNull();
```

- [ ] **Step 2: Run test pour vérifier l'échec**

Run: `npm test --workspace=packages/core -- charcounter.test.ts`
Expected: FAIL sur les 2 assertions modifiées (`getPart(el, 'charcounter')` retourne `null` tant
que le composant n'est pas mis à jour).

- [ ] **Step 3: Renommer le part racine et les slots dans le composant**

Dans `packages/core/src/components/charcounter/charcounter.ts`, JSDoc (lignes 22-25) :

```ts
// avant
 * @slot icon-warning - Icône affichée en état warning.
 * @slot icon-error   - Icône affichée en état error.
 *
 * @csspart container - L'élément racine.
// après
 * @slot warning-icon - Icône affichée en état warning.
 * @slot error-icon   - Icône affichée en état error.
 *
 * @csspart charcounter - L'élément racine.
```

Dans le même fichier, `render()` (lignes ~231-234) :

```ts
// avant
            <span part="container">
                <slot name="icon-warning"></slot>
                <slot name="icon-error"></slot>
// après
            <span part="charcounter">
                <slot name="warning-icon"></slot>
                <slot name="error-icon"></slot>
```

- [ ] **Step 4: Mettre à jour les sélecteurs de slot dans les styles**

Dans `packages/core/src/components/charcounter/charcounter.styles.ts` (lignes 18-28) :

```css
/* avant */
slot[name='icon-warning'],
slot[name='icon-error'] {
    display: none;
}

:host([state='warning']) slot[name='icon-warning'] {
    display: contents;
}

:host([state='error']) slot[name='icon-error'] {
    display: contents;
}

/* après */
slot[name='warning-icon'],
slot[name='error-icon'] {
    display: none;
}

:host([state='warning']) slot[name='warning-icon'] {
    display: contents;
}

:host([state='error']) slot[name='error-icon'] {
    display: contents;
}
```

- [ ] **Step 5: Run test pour vérifier le succès**

Run: `npm test --workspace=packages/core -- charcounter.test.ts`
Expected: PASS (toute la suite `charcounter.test.ts`, pas seulement les 2 assertions touchées —
vérifier qu'aucune autre régression n'a été introduite).

- [ ] **Step 6: Mettre à jour la démo de documentation**

Dans `apps/docs/src/content/components/ar-charcounter.mdx`, section variante `icon` (autour de la
ligne 43-44) :

```html
<!-- avant -->
<span slot="icon-warning" aria-hidden="true">⚠️</span>
<span slot="icon-error" aria-hidden="true">❌</span>
<!-- après -->
<span slot="warning-icon" aria-hidden="true">⚠️</span>
<span slot="error-icon" aria-hidden="true">❌</span>
```

Et dans la description de cette variante ainsi que dans le paragraphe d'accessibilité (recherche
`icon-warning`/`icon-error` dans tout le fichier — 2 autres occurrences en texte libre, section
description de variante et section accessibilité) : remplacer `icon-warning`/`icon-error` par
`warning-icon`/`error-icon` partout où ils apparaissent en tant que noms de slot.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/components/charcounter/charcounter.ts \
        packages/core/src/components/charcounter/charcounter.styles.ts \
        packages/core/src/components/charcounter/charcounter.test.ts \
        apps/docs/src/content/components/ar-charcounter.mdx
git commit -m "fix(charcounter): racine et slots suivent le vocabulaire transverse (#181)"
```

---

### Task 3: `ar-pagination` — racine + rôles `control`/`field`/`action-button` + `nav-btn`→`nav-button`

**Files:**

- Modify: `packages/core/src/components/pagination/pagination.ts`
- Modify: `packages/core/src/components/pagination/pagination.test.ts`
- Modify: `packages/core/src/components/pagination/pagination.browser.test.ts`
- Modify: `packages/core/src/styles/themes/default.css`

**Interfaces:**

- Produces: part racine `pagination` (additif sur `nav`) ; rôle `control` sur `link`/`current` ;
  rôle `field` sur `select` ; rôle `action-button` sur `prev`/`next` ; renommage `nav-btn`→
  `nav-button` (et `nav-btn--disabled`→`nav-button--disabled`), `--ar-pagination-btn-size`→
  `--ar-pagination-button-size` (convention `-button` en toutes lettres, cf. spec).

- [ ] **Step 1: Renommer `nav-btn` → `nav-button` (convention `-button` en toutes lettres)**

```bash
sed -i '' 's/nav-btn/nav-button/g' \
    packages/core/src/components/pagination/pagination.ts \
    packages/core/src/components/pagination/pagination.test.ts
sed -i '' 's/--ar-pagination-btn-size/--ar-pagination-button-size/g' \
    packages/core/src/components/pagination/pagination.ts \
    packages/core/src/components/pagination/pagination.styles.ts
sed -i '' 's/nav-btn/nav-button/g; s/--ar-pagination-btn-size/--ar-pagination-button-size/g' \
    packages/core/src/styles/themes/default.css
```

Vérifier qu'il ne reste plus aucune trace de l'ancien nom dans ces fichiers :

Run: `grep -rn "nav-btn\|pagination-btn-size" packages/core/src/components/pagination packages/core/src/styles/themes/default.css`
Expected: aucune sortie.

- [ ] **Step 2: Run tests pour vérifier qu'ils passent toujours (renommage pur, aucun comportement changé)**

Run: `npm test --workspace=packages/core -- pagination.test.ts`
Expected: PASS.

- [ ] **Step 3: Corriger les sélecteurs à correspondance exacte AVANT d'ajouter les rôles**

Ces parts vont devenir multi-jetons — toute sélection par égalité stricte doit passer en
« contient » (`~=`) pour continuer à matcher. Le composant lui-même (`pagination.styles.ts`)
utilise déjà `[part~=...]` partout (vérifié, aucun changement requis dans ce fichier), mais
`pagination.ts` et les tests utilisent encore `[part="nav"]`/`[part="link"]`/`[part="current"]`/
`[part="select"]` en dur à plusieurs endroits.

Dans `packages/core/src/components/pagination/pagination.ts`, lignes 150 et 178 :

```ts
// avant (les deux occurrences, identiques)
const nav = this.shadowRoot?.querySelector<HTMLElement>('[part="nav"]');
// après
const nav = this.shadowRoot?.querySelector<HTMLElement>('[part~="nav"]');
```

Commentaire ligne 126 (cohérence, pas fonctionnel) :

```ts
// avant
// encore, `_setupResizeObserver` ne trouverait pas `[part="nav"]`) — ce n'est donc PAS un
// après
// encore, `_setupResizeObserver` ne trouverait pas `[part~="nav"]`) — ce n'est donc PAS un
```

- [ ] **Step 4: Corriger les sélecteurs exacts dans les tests**

```bash
sed -i '' 's/\[part="link"\]/[part~="link"]/g; s/\[part="current"\]/[part~="current"]/g; s/\[part="select"\]/[part~="select"]/g' \
    packages/core/src/components/pagination/pagination.test.ts
sed -i '' 's/\[part="current"\]/[part~="current"]/g' \
    packages/core/src/components/pagination/pagination.browser.test.ts
```

Vérifier qu'il ne reste plus aucune correspondance exacte sur ces 4 parts :

Run: `grep -n '\[part="nav"\]\|\[part="link"\]\|\[part="current"\]\|\[part="select"\]' packages/core/src/components/pagination/pagination.ts packages/core/src/components/pagination/pagination.test.ts packages/core/src/components/pagination/pagination.browser.test.ts`
Expected: aucune sortie (0 correspondance).

- [ ] **Step 5: Run tests pour vérifier qu'ils passent toujours (pas de régression du seul fait du `~=`)**

Run: `npm test --workspace=packages/core -- pagination.test.ts`
Expected: PASS — ce step ne change aucun comportement, seulement la méthode de sélection.

- [ ] **Step 6: Ajouter les nouvelles assertions de rôle (échec attendu)**

Dans `packages/core/src/components/pagination/pagination.test.ts`, ajouter dans le describe
principal (à la suite des assertions `part="nav"`/`part="list"` existantes, lignes ~48-52) :

```ts
it('la racine <nav> porte aussi le part transverse "pagination"', () => {
    expect(partContains(requirePart(el, 'nav'), 'pagination')).toBe(true);
});
```

Ajouter à la suite des assertions `prev`/`next` (lignes ~64-67) :

```ts
it('prev/next portent aussi le rôle transverse "action-button"', () => {
    expect(partContains(requirePart(el, 'prev'), 'action-button')).toBe(true);
    expect(partContains(requirePart(el, 'next'), 'action-button')).toBe(true);
});
```

Ajouter un test avec `total > budget` pour avoir un `link` rendu (voir un test existant qui force
ce cas, ex. autour de la ligne 224) :

```ts
it('link/current portent le rôle transverse "control"', () => {
    const link = shadow.querySelector('[part~="link"]');
    expect(link && partContains(link, 'control')).toBe(true);
});
```

Et un test pour `select` (dans le describe dédié au mode select, à la suite d'une assertion
existante ligne ~430) :

```ts
it('select porte le rôle transverse "field"', () => {
    const select = shadow.querySelector('[part~="select"]');
    expect(select && partContains(select, 'field')).toBe(true);
});
```

- [ ] **Step 7: Run tests pour vérifier l'échec**

Run: `npm test --workspace=packages/core -- pagination.test.ts`
Expected: FAIL sur les 4 nouvelles assertions (rôles pas encore ajoutés au composant).

- [ ] **Step 8: Implémenter les rôles dans le composant**

Dans `packages/core/src/components/pagination/pagination.ts`, `render()` (ligne 319) :

```ts
// avant
return html` <nav part="nav" role="navigation" aria-labelledby="ar-pagination">
// après
return html` <nav part="nav pagination" role="navigation" aria-labelledby="ar-pagination">
```

Lignes 326 et 342 (prev/next — le part `nav-button` vient déjà du renommage du Step 1) :

```ts
// avant
part = "prev nav-button${isPreviousDisabled ? ' nav-button--disabled' : ''}";
// après
part = "prev nav-button action-button${isPreviousDisabled ? ' nav-button--disabled' : ''}";
```

```ts
// avant
part = "next nav-button${isNextDisabled ? ' nav-button--disabled' : ''}";
// après
part = "next nav-button action-button${isNextDisabled ? ' nav-button--disabled' : ''}";
```

`renderPageLink()`, part `link` (ligne 423) :

```ts
// avant
return html` <a part="link" data-ar-pagination-page="${page}" href="javascript:;">
// après
return html` <a part="link control" data-ar-pagination-page="${page}" href="javascript:;">
```

Part `current` dans le même bloc (ligne 414) :

```ts
// avant
return (
    html` <span
    part="current"
    tabindex="-1"
// après
return html` < span
);
part = 'current control';
tabindex = '-1';
```

`renderPageSelect()`, part `select` (ligne 452) :

```ts
// avant
<select
    part="select"
    aria-labelledby="ar-pagination-select-label"
// après
<select
    part="select field"
    aria-labelledby="ar-pagination-select-label"
```

- [ ] **Step 9: Run tests pour vérifier le succès**

Run: `npm test --workspace=packages/core -- pagination.test.ts`
Expected: PASS (suite complète).

- [ ] **Step 10: Mettre à jour le JSDoc `@csspart`**

Dans `packages/core/src/components/pagination/pagination.ts`, bloc JSDoc (lignes 33-54), ajouter
une ligne dédiée par rôle transverse introduit, à la suite du `@csspart` du part concerné. Noter
que `nav-btn`/`nav-btn--disabled` sont déjà devenus `nav-button`/`nav-button--disabled` dans le
JSDoc existant depuis le Step 1 :

```ts
// après @csspart nav (ligne 33)
 * @csspart pagination - Rôle transverse (voir /getting-started/naming-conventions) : racine du
 *   composant.
// après @csspart link (ligne 37)
 * @csspart control - Rôle transverse (voir /getting-started/naming-conventions), porté par `link`
 *   et `current` : élément interactif générique.
// après @csspart next (ligne 40)
 * @csspart action-button - Rôle transverse (voir /getting-started/naming-conventions), porté par
 *   `prev` et `next` : bouton qui déclenche une action ponctuelle.
// après @csspart select (ligne 48)
 * @csspart field - Rôle transverse (voir /getting-started/naming-conventions), porté par `select` :
 *   élément qui reçoit une saisie. Sous-rôle standard de `field` (avec `input`, cf.
 *   ar-datepicker), réutilisable par tout futur composant avec une liste déroulante.
```

(Le rôle `control` n'a besoin que d'une seule ligne `@csspart control`, pas d'une par part porteur
— même convention que les autres `@csspart` combinés déjà présents dans ce fichier, ex.
`nav-button`.)

- [ ] **Step 11: Run le build du manifeste pour valider le JSDoc**

Run: `npm run build:manifest --workspace=packages/core`
Expected: succès, sans erreur de garde-fou `validate-cssprop-defaults.js`.

- [ ] **Step 12: Commit**

```bash
git add packages/core/src/components/pagination/pagination.ts \
        packages/core/src/components/pagination/pagination.styles.ts \
        packages/core/src/components/pagination/pagination.test.ts \
        packages/core/src/components/pagination/pagination.browser.test.ts \
        packages/core/src/styles/themes/default.css
git commit -m "fix(pagination): rôles transverses control/field/action-button + racine + nav-button (#181)"
```

---

### Task 4: `ar-datepicker` — wrapper et part racine `datepicker`

**Files:**

- Modify: `packages/core/src/components/datepicker/datepicker.ts`
- Modify: `packages/core/src/components/datepicker/datepicker.styles.ts`

**Interfaces:**

- Produces: part racine `datepicker` sur un nouveau `<div part="datepicker">` enveloppant tout le
  template (le composant n'avait jusqu'ici aucun élément racine unique dans son shadow DOM — le
  layout flex vivait directement sur `:host`).

Contrairement aux deux tasks précédentes, ce changement est structurel : il n'y a aucun test
existant qui dépende de la structure DOM plate actuelle (vérifié par recherche —
`shadowRoot?.children`/`firstElementChild` absents des fichiers de test datepicker), donc pas
d'étape de correction de sélecteurs de test ici.

- [ ] **Step 1: Écrire le test qui vérifie la présence du wrapper (échec attendu)**

Dans `packages/core/src/components/datepicker/datepicker.test.ts`, ajouter à la suite des
assertions existantes de structure (après la ligne 22, `part="error"`) :

```ts
it('contient un div racine part="datepicker" enveloppant tout le contenu', () => {
    const root = getPart(el, 'datepicker');
    expect(root).not.toBeNull();
    expect(root?.contains(getPart(el, 'input'))).toBe(true);
    expect(root?.contains(getPart(el, 'panel'))).toBe(true);
});
```

- [ ] **Step 2: Run test pour vérifier l'échec**

Run: `npm test --workspace=packages/core -- datepicker.test.ts`
Expected: FAIL (`getPart(el, 'datepicker')` retourne `null`).

- [ ] **Step 3: Envelopper le template dans le wrapper**

Dans `packages/core/src/components/datepicker/datepicker.ts`, `render()` (lignes 227-297),
envelopper tout le contenu retourné dans un nouveau `<div part="datepicker">` :

```ts
// avant (début, ligne 227)
        return html`
            <label part="label" id="dp-label-${this._uid}" for="dp-input-${this._uid}">

// après
        return html`
            <div part="datepicker">
                <label part="label" id="dp-label-${this._uid}" for="dp-input-${this._uid}">
```

Et à la fin de la même méthode (ligne 296-297) :

```ts
// avant
                ${this.open ? this._renderCalendar(locale) : nothing}
            </div>
        `;

// après
                ${this.open ? this._renderCalendar(locale) : nothing}
            </div>
            </div>
        `;
```

Réindenter tout le contenu intermédiaire d'un niveau (4 espaces) pour rester cohérent avec le
reste du fichier — Prettier le fera automatiquement au commit (`lint-staged`), donc l'indentation
manuelle exacte n'est pas bloquante à cette étape.

- [ ] **Step 4: Déplacer le layout flex de `:host` vers le wrapper**

Dans `packages/core/src/components/datepicker/datepicker.styles.ts` (lignes 4-7) :

```css
/* avant */
:host {
    display: flex;
    flex-direction: column;
}

/* après */
:host {
    display: block;
}

[part='datepicker'] {
    display: flex;
    flex-direction: column;
}
```

- [ ] **Step 5: Run test pour vérifier le succès**

Run: `npm test --workspace=packages/core -- datepicker.test.ts`
Expected: PASS (suite complète — vérifier particulièrement qu'aucun test existant lié au focus, à
l'ouverture du panel ou à `AnchoredController.attach()` ne casse : ces derniers ciblent des
éléments par leur propre part, indépendamment de leur ancêtre).

- [ ] **Step 6: Vérification visuelle (Playwright, browser test existant)**

Run: `npm run test:browser --workspace=packages/core`
Expected: PASS — `datepicker.browser.test.ts` exerce l'ouverture/fermeture du popover et la
navigation clavier ; un layout cassé par le wrapper s'y manifesterait (positionnement du popover
piloté par `AnchoredController.attach(trigger, panel, inputWrapper)`, indépendant de l'ajout d'un
ancêtre commun, mais à vérifier empiriquement plutôt que supposé).

- [ ] **Step 7: Mettre à jour le JSDoc**

Dans `packages/core/src/components/datepicker/datepicker.ts`, JSDoc, ajouter après `@csspart input`
(ligne 27) :

```ts
 * @csspart datepicker - Rôle transverse (voir /getting-started/naming-conventions) : racine du
 *   composant.
```

- [ ] **Step 8: Run le build du manifeste**

Run: `npm run build:manifest --workspace=packages/core`
Expected: succès.

- [ ] **Step 9: Commit**

```bash
git add packages/core/src/components/datepicker/datepicker.ts \
        packages/core/src/components/datepicker/datepicker.styles.ts \
        packages/core/src/components/datepicker/datepicker.test.ts
git commit -m "fix(datepicker): ajoute un wrapper racine part=\"datepicker\" (#181)"
```

---

### Task 5: `ar-datepicker` — rôle `field` sur `input`

**Files:**

- Modify: `packages/core/src/components/datepicker/datepicker.ts`
- Modify: `packages/core/src/components/datepicker/datepicker.styles.ts`
- Modify: `packages/core/src/components/datepicker/datepicker.browser.test.ts`

**Interfaces:**

- Produces: part `input` devient `input field`.

- [ ] **Step 1: Corriger les sélecteurs à correspondance exacte AVANT d'ajouter le rôle**

Dans `packages/core/src/components/datepicker/datepicker.ts`, ligne 157 :

```ts
// avant
@query('[part="input"]') private _input!: HTMLInputElement;
// après
@query('[part~="input"]') private _input!: HTMLInputElement;
```

Dans `packages/core/src/components/datepicker/datepicker.styles.ts` :

```bash
sed -i '' "s/\[part='input'\]/[part~='input']/g" \
    packages/core/src/components/datepicker/datepicker.styles.ts
```

Dans `packages/core/src/components/datepicker/datepicker.browser.test.ts`, ligne 86 :

```ts
// avant
el.shadowRoot?.querySelector('[part="input"]'),
// après
el.shadowRoot?.querySelector('[part~="input"]'),
```

- [ ] **Step 2: Run tests pour vérifier qu'ils passent toujours (pas de régression du seul fait du `~=`)**

Run: `npm test --workspace=packages/core -- datepicker.test.ts`
Expected: PASS.

- [ ] **Step 3: Écrire l'assertion du nouveau rôle (échec attendu)**

Dans `packages/core/src/components/datepicker/datepicker.test.ts`, à la suite de l'assertion
`part="input"` existante (ligne 16) :

```ts
it('input porte le rôle transverse "field"', () => {
    expect(getPart(el, 'input')?.getAttribute('part')?.split(/\s+/)).toContain('field');
});
```

(`partContains` est un helper local à `pagination.test.ts`, absent de `datepicker.test.ts` — ne
pas le réutiliser ici, l'inline `split(/\s+/).toContain(...)` ci-dessus est autosuffisant, même
pattern que les Tasks 6 et 7.)

- [ ] **Step 4: Run test pour vérifier l'échec**

Run: `npm test --workspace=packages/core -- datepicker.test.ts`
Expected: FAIL.

- [ ] **Step 5: Ajouter le rôle dans le composant**

Dans `packages/core/src/components/datepicker/datepicker.ts`, `render()` (ligne 235) :

```ts
// avant
<input
    part="input"
    id="dp-input-${this._uid}"
// après
<input
    part="input field"
    id="dp-input-${this._uid}"
```

- [ ] **Step 6: Run test pour vérifier le succès**

Run: `npm test --workspace=packages/core -- datepicker.test.ts`
Expected: PASS.

- [ ] **Step 7: Mettre à jour le JSDoc**

Dans `packages/core/src/components/datepicker/datepicker.ts`, JSDoc, après `@csspart input`
(ligne 27) — attention, l'ordre dans le fichier place déjà `@csspart datepicker` ajouté à la Task 4
juste après ; ajouter celui-ci juste avant :

```ts
 * @csspart field - Rôle transverse (voir /getting-started/naming-conventions), porté par `input` :
 *   élément qui reçoit une saisie. Sous-rôle standard de `field` (avec `select`, cf.
 *   ar-pagination), réutilisable par tout futur composant avec un champ texte.
```

- [ ] **Step 8: Run le build du manifeste**

Run: `npm run build:manifest --workspace=packages/core`
Expected: succès.

- [ ] **Step 9: Commit**

```bash
git add packages/core/src/components/datepicker/datepicker.ts \
        packages/core/src/components/datepicker/datepicker.styles.ts \
        packages/core/src/components/datepicker/datepicker.test.ts \
        packages/core/src/components/datepicker/datepicker.browser.test.ts
git commit -m "fix(datepicker): rôle transverse field sur input (#181)"
```

---

### Task 6: `ar-datepicker` — rôle `control` sur `day`

**Files:**

- Modify: `packages/core/src/components/datepicker/datepicker.ts`
- Modify: `packages/core/src/components/datepicker/datepicker.styles.ts`
- Modify: `packages/core/src/components/datepicker/datepicker.test.ts`
- Modify: `packages/core/src/components/datepicker/datepicker.a11y.test.ts`
- Modify: `packages/core/src/components/datepicker/datepicker.browser.test.ts`

**Interfaces:**

- Produces: part `day` devient `day control`.

- [ ] **Step 1: Corriger tous les sélecteurs à correspondance exacte sur `day` AVANT d'ajouter le rôle**

```bash
sed -i '' "s/\[part='day'\]/[part~='day']/g" \
    packages/core/src/components/datepicker/datepicker.styles.ts

sed -i '' 's/\[part="day"\]/[part~="day"]/g' \
    packages/core/src/components/datepicker/datepicker.test.ts \
    packages/core/src/components/datepicker/datepicker.a11y.test.ts \
    packages/core/src/components/datepicker/datepicker.browser.test.ts
```

Vérifier qu'il ne reste plus aucune correspondance exacte :

Run: `grep -rn "\[part='day'\]\|\[part=\"day\"\]" packages/core/src/components/datepicker/`
Expected: aucune sortie.

- [ ] **Step 2: Run tests pour vérifier qu'ils passent toujours (pas de régression du seul fait du `~=`)**

Run: `npm test --workspace=packages/core -- datepicker` puis `npm run test:browser --workspace=packages/core`
Expected: PASS sur les deux.

- [ ] **Step 3: Écrire l'assertion du nouveau rôle (échec attendu)**

Dans `packages/core/src/components/datepicker/datepicker.test.ts`, ajouter un test qui ouvre le
calendrier et vérifie le rôle sur une cellule jour (s'inspirer d'un test existant qui ouvre déjà
`open = true` puis interroge `[part~="day"]`, probablement déjà présent autour de la logique de
grille) :

```ts
it('les cellules jour portent le rôle transverse "control"', async () => {
    el.open = true;
    await waitForUpdate(el);
    const day = el.shadowRoot?.querySelector('[part~="day"]');
    expect(day?.getAttribute('part')?.split(/\s+/)).toContain('control');
});
```

- [ ] **Step 4: Run test pour vérifier l'échec**

Run: `npm test --workspace=packages/core -- datepicker.test.ts`
Expected: FAIL.

- [ ] **Step 5: Ajouter le rôle dans `_renderDay`**

Dans `packages/core/src/components/datepicker/datepicker.ts`, `_renderDay()` (ligne 421) :

```ts
// avant
<button
    type="button"
    part="day"
    tabindex=${focused ? '0' : '-1'}
// après
<button
    type="button"
    part="day control"
    tabindex=${focused ? '0' : '-1'}
```

- [ ] **Step 6: Run test pour vérifier le succès**

Run: `npm test --workspace=packages/core -- datepicker.test.ts`
Expected: PASS.

- [ ] **Step 7: Mettre à jour le JSDoc**

Dans `packages/core/src/components/datepicker/datepicker.ts`, JSDoc, après `@csspart day` (ligne 41) :

```ts
 * @csspart control - Rôle transverse (voir /getting-started/naming-conventions), porté par `day` :
 *   élément interactif générique.
```

- [ ] **Step 8: Run le build du manifeste**

Run: `npm run build:manifest --workspace=packages/core`
Expected: succès.

- [ ] **Step 9: Commit**

```bash
git add packages/core/src/components/datepicker/datepicker.ts \
        packages/core/src/components/datepicker/datepicker.styles.ts \
        packages/core/src/components/datepicker/datepicker.test.ts \
        packages/core/src/components/datepicker/datepicker.a11y.test.ts \
        packages/core/src/components/datepicker/datepicker.browser.test.ts
git commit -m "fix(datepicker): rôle transverse control sur day (#181)"
```

---

### Task 7: `ar-datepicker` — `nav-btn`/`footer-btn`/`today-btn`/`close-btn` → `-button` + rôle `action-button`

**Files:**

- Modify: `packages/core/src/components/datepicker/datepicker.ts`
- Modify: `packages/core/src/components/datepicker/datepicker.styles.ts`
- Modify: `packages/core/src/components/datepicker/datepicker.test.ts`
- Modify: `packages/core/src/styles/themes/default.css`

**Interfaces:**

- Produces: renommage `nav-btn`→`nav-button`, `footer-btn`→`footer-button`, `today-btn`→
  `today-button`, `close-btn`→`close-button` (convention `-button` en toutes lettres, cf. spec) ;
  rôle `action-button` ajouté à `nav-button` (prev-year/prev-month/next-month/next-year) et
  `footer-button` (today-button/close-button).

- [ ] **Step 1: Renommer `-btn` → `-button` (convention en toutes lettres)**

```bash
sed -i '' 's/nav-btn/nav-button/g; s/footer-btn/footer-button/g; s/today-btn/today-button/g; s/close-btn/close-button/g' \
    packages/core/src/components/datepicker/datepicker.ts \
    packages/core/src/components/datepicker/datepicker.test.ts
sed -i '' "s/nav-btn/nav-button/g; s/footer-btn/footer-button/g" \
    packages/core/src/components/datepicker/datepicker.styles.ts
sed -i '' 's/--ar-datepicker-nav-btn-/--ar-datepicker-nav-button-/g; s/--ar-datepicker-footer-btn-/--ar-datepicker-footer-button-/g' \
    packages/core/src/components/datepicker/datepicker.ts \
    packages/core/src/components/datepicker/datepicker.styles.ts \
    packages/core/src/styles/themes/default.css
sed -i '' 's/nav-btn/nav-button/g; s/footer-btn/footer-button/g' \
    packages/core/src/styles/themes/default.css
```

Vérifier qu'il ne reste plus aucune trace de l'ancien nom :

Run: `grep -rn "nav-btn\|footer-btn\|today-btn\|close-btn" packages/core/src/components/datepicker packages/core/src/styles/themes/default.css`
Expected: aucune sortie.

- [ ] **Step 2: Run tests pour vérifier qu'ils passent toujours (renommage pur)**

Run: `npm test --workspace=packages/core -- datepicker.test.ts`
Expected: PASS.

- [ ] **Step 3: Écrire les assertions du nouveau rôle (échec attendu)**

Dans `packages/core/src/components/datepicker/datepicker.test.ts`, à la suite de l'assertion
existante sur `today-button`/`close-button` (ex-lignes 333-334, dans un test qui ouvre déjà le
panel) :

```ts
it('nav-button et footer-button portent le rôle transverse "action-button"', () => {
    el.open = true;
    // (réutiliser le pattern déjà présent dans ce describe pour attendre le rendu du calendrier)
    const navButton = el.shadowRoot?.querySelector('[part~="nav-button"]');
    const footerButton = el.shadowRoot?.querySelector('[part~="footer-button"]');
    expect(navButton?.getAttribute('part')?.split(/\s+/)).toContain('action-button');
    expect(footerButton?.getAttribute('part')?.split(/\s+/)).toContain('action-button');
});
```

Adapter l'attente asynchrone (`await waitForUpdate(el)` ou équivalent) au pattern déjà utilisé par
les tests voisins de ce describe, pour que la grille/le footer soient effectivement rendus avant
la requête `querySelector`.

- [ ] **Step 4: Run test pour vérifier l'échec**

Run: `npm test --workspace=packages/core -- datepicker.test.ts`
Expected: FAIL.

- [ ] **Step 5: Ajouter le rôle sur les 4 boutons de navigation**

Dans `_renderCalendar()` (parts déjà renommées en `nav-button` depuis le Step 1) :

```ts
// avant (×4, un par bouton nav)
part = 'nav-button prev-year';
part = 'nav-button prev-month';
part = 'nav-button next-month';
part = 'nav-button next-year';
// après
part = 'nav-button prev-year action-button';
part = 'nav-button prev-month action-button';
part = 'nav-button next-month action-button';
part = 'nav-button next-year action-button';
```

- [ ] **Step 6: Ajouter le rôle sur les 2 boutons du footer**

```ts
// avant
part = 'footer-button today-button';
// après
part = 'footer-button today-button action-button';
```

```ts
// avant
part = 'footer-button close-button';
// après
part = 'footer-button close-button action-button';
```

- [ ] **Step 7: Run test pour vérifier le succès**

Run: `npm test --workspace=packages/core -- datepicker.test.ts`
Expected: PASS.

- [ ] **Step 8: Mettre à jour le JSDoc**

Dans le bloc JSDoc, après `@csspart footer-button` (le rôle `action-button` a déjà été introduit
sur `ar-pagination` — Task 3 — mais chaque composant documente sa propre ligne `@csspart` pour ce
rôle, même convention que les autres `@csspart`, pas de renvoi inter-composants) :

```ts
 * @csspart action-button - Rôle transverse (voir /getting-started/naming-conventions), porté par
 *   les 4 boutons de navigation (`nav-button`) et les 2 boutons du footer (`footer-button`) :
 *   bouton qui déclenche une action ponctuelle.
```

- [ ] **Step 9: Run le build du manifeste**

Run: `npm run build:manifest --workspace=packages/core`
Expected: succès.

- [ ] **Step 10: Commit**

```bash
git add packages/core/src/components/datepicker/datepicker.ts \
        packages/core/src/components/datepicker/datepicker.styles.ts \
        packages/core/src/components/datepicker/datepicker.test.ts \
        packages/core/src/styles/themes/default.css
git commit -m "fix(datepicker): nav-button/footer-button/today-button/close-button + rôle action-button (#181)"
```

---

### Task 8: Nouvelle page de doc — conventions de nommage

**Files:**

- Create: `apps/docs/src/pages/getting-started/naming-conventions.astro`
- Modify: `apps/docs/src/components/SiteNav.astro`

**Interfaces:**

- Consumes: aucune dépendance sur les tasks précédentes autre que leur contenu textuel (les rôles
  documentés doivent correspondre exactement à ceux effectivement implémentés dans les Tasks 2-7).
- Produces: route `/getting-started/naming-conventions/`, découverte automatiquement par
  `apps/docs/tests/a11y/pages.spec.ts` (scan de `dist/` après build, aucune inscription manuelle
  requise pour ce test).

- [ ] **Step 1: Créer la page**

Créer `apps/docs/src/pages/getting-started/naming-conventions.astro`, sur le modèle de
`apps/docs/src/pages/getting-started/shadow-dom.astro` (import `Layout` + `TableOfContents`,
frontmatter avec `tocEntries`) :

```astro
---
import Layout from '../../layouts/Layout.astro';
import TableOfContents from '../../components/TableOfContents.astro';

const tocEntries = [
    { id: 'pourquoi',      label: 'Un vocabulaire partagé',        level: 1 as const },
    { id: 'roles-part',    label: 'Rôles ::part() transverses',    level: 1 as const },
    { id: 'roles-table',   label: 'Table des rôles',               level: 2 as const },
    { id: 'roles-usage',   label: 'Comment les utiliser',          level: 2 as const },
    { id: 'slots',         label: 'Conventions de slot',           level: 1 as const },
];
---

<Layout title="Conventions de nommage" description="Vocabulaire de rôles ::part() et conventions de slot partagés par tous les composants Ariane.">
    <article>
        <h1>Conventions de nommage</h1>

        <section id="pourquoi">
            <h2>Un vocabulaire partagé</h2>
            <p>
                Chaque composant Ariane expose ses propres <code>::part()</code> spécifiques
                (<code>close</code>, <code>panel</code>, <code>trigger</code>...). En complément,
                certains éléments portent aussi un <strong>rôle transverse</strong> — un second
                nom générique, partagé par tous les composants qui ont un élément de même nature.
                Un rôle transverse s'ajoute toujours au part spécifique existant, il ne le
                remplace jamais (sauf la racine du composant, cas particulier documenté
                ci-dessous) : <code>part="close action-button"</code>.
            </p>
            <p>
                Objectif : apprendre ce vocabulaire une seule fois, puis le reconnaître sur
                n'importe quel composant de la librairie, sans redécouvrir le nom de chaque part
                composant par composant — et surtout pouvoir écrire une seule règle CSS qui
                s'applique à tous les composants concernés d'un coup (<code>::part(action-button)
                { ... }</code> style tous les boutons d'action de la librairie, quel que soit le
                composant). C'est ce qui rend l'intégration d'Ariane dans un design system
                consommateur plus rapide : les décisions de style transverses (radius d'un
                bouton, apparence d'un champ) se prennent une fois, pas composant par composant.
            </p>
        </section>

        <section id="roles-part">
            <h2>Rôles <code>::part()</code> transverses</h2>

            <div id="roles-table">
                <h3>Table des rôles</h3>
                <table>
                    <thead>
                        <tr>
                            <th scope="col">Rôle</th>
                            <th scope="col">Signification</th>
                            <th scope="col">Exemples</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><code>(nom du composant)</code></td>
                            <td>Racine du composant. Remplace un éventuel part générique existant
                                (<code>base</code>, <code>container</code>) plutôt que s'y
                                ajouter — seule exception au principe additif, pour éviter une
                                collision de nom lors d'un chaînage <code>exportparts</code> si un
                                composant est un jour imbriqué dans un autre.</td>
                            <td><code>ar-charcounter::part(charcounter)</code>,
                                <code>ar-datepicker::part(datepicker)</code></td>
                        </tr>
                        <tr>
                            <td><code>panel</code></td>
                            <td>Conteneur flottant secondaire (popover, dropdown...).</td>
                            <td><code>ar-datepicker::part(panel)</code></td>
                        </tr>
                        <tr>
                            <td><code>body</code></td>
                            <td>Zone de contenu principal.</td>
                            <td><code>ar-dialog::part(body)</code>, <code>ar-alert::part(body)</code></td>
                        </tr>
                        <tr>
                            <td><code>trigger</code></td>
                            <td>Ouvre/ferme un panel ou une zone repliable.</td>
                            <td><code>ar-collapse::part(trigger)</code></td>
                        </tr>
                        <tr>
                            <td><code>header</code> / <code>footer</code></td>
                            <td>En-tête / pied de composant.</td>
                            <td><code>ar-datepicker::part(header)</code></td>
                        </tr>
                        <tr>
                            <td><code>control</code></td>
                            <td>Élément interactif générique (hors field/action-button/trigger).</td>
                            <td><code>ar-pagination::part(link)</code>, <code>ar-datepicker::part(day)</code></td>
                        </tr>
                        <tr>
                            <td><code>field</code></td>
                            <td>Élément qui reçoit une saisie. Deux sous-rôles standard,
                                réutilisables par tout futur composant : <code>input</code> (champ
                                texte/textarea) et <code>select</code> (liste déroulante).</td>
                            <td><code>ar-datepicker::part(input)</code>, <code>ar-pagination::part(select)</code></td>
                        </tr>
                        <tr>
                            <td><code>action-button</code></td>
                            <td>Bouton qui déclenche une action ponctuelle (pas un toggle de panel).</td>
                            <td><code>ar-pagination::part(prev)</code>, <code>ar-datepicker::part(today-button)</code></td>
                        </tr>
                        <tr>
                            <td><code>indicator</code></td>
                            <td>Marqueur/indicateur visuel.</td>
                            <td><code>ar-table-sort::part(indicator)</code></td>
                        </tr>
                        <tr>
                            <td><code>label</code></td>
                            <td>Texte descriptif.</td>
                            <td><code>ar-datepicker::part(label)</code></td>
                        </tr>
                        <tr>
                            <td><code>icon</code></td>
                            <td>Icône.</td>
                            <td><code>ar-alert::part(icon)</code></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div id="roles-usage">
                <h3>Comment les utiliser</h3>
                <p>
                    Un rôle transverse se cible exactement comme n'importe quel autre part, avec
                    <code>::part(nom-du-rôle)</code> — la seule différence est qu'il peut apparaître
                    sur plusieurs composants différents, avec le même nom. La liste complète des
                    part d'un composant, rôles transverses inclus, reste documentée sur sa propre
                    page (section « CSS Parts »).
                </p>
            </div>
        </section>

        <section id="slots">
            <h2>Conventions de slot</h2>
            <p>
                Les <code>&lt;slot&gt;</code> suivent des conventions déjà cohérentes sur toute la
                librairie, sans qu'un nouveau vocabulaire ait été nécessaire :
            </p>
            <ul>
                <li><strong>Slot par défaut (sans nom)</strong> — contenu principal du composant.</li>
                <li><strong><code>trigger</code></strong> — même sens que le rôle <code>trigger</code>
                    des part : élément qui ouvre/ferme le composant.</li>
                <li><strong>Suffixe <code>&lt;rôle&gt;-icon</code></strong> — icône remplaçable
                    associée à un élément précis (<code>close-icon</code>, <code>home-icon</code>,
                    <code>trigger-icon</code>, <code>prev-icon</code>/<code>next-icon</code>,
                    <code>warning-icon</code>/<code>error-icon</code>).</li>
                <li><strong><code>header-actions</code></strong>, <strong><code>footer</code></strong> —
                    reprennent le nom des rôles <code>::part()</code> homonymes.</li>
            </ul>
        </section>
    </article>
    <TableOfContents entries={tocEntries} />
</Layout>
```

Vérifier au préalable la signature exacte de `Layout.astro` (props `title`/`description`) et de
`TableOfContents.astro` (prop `entries`) en les lisant avant d'écrire ce fichier — reproduire
strictement le pattern déjà utilisé par `shadow-dom.astro`.

- [ ] **Step 2: Ajouter le lien de navigation**

Dans `apps/docs/src/components/SiteNav.astro`, tableau `gettingStartedLinks` (lignes 30-33) :

```ts
// avant
const gettingStartedLinks: NavLink[] = [
    { href: '/getting-started/quickstart', label: 'Démarrage rapide', ariaCurrent: undefined },
    { href: '/getting-started/utilisation', label: 'Utilisation', ariaCurrent: undefined },
    { href: '/getting-started/shadow-dom', label: 'Shadow DOM applicatif', ariaCurrent: undefined },
].map((link) => ({
// après
const gettingStartedLinks: NavLink[] = [
    { href: '/getting-started/quickstart', label: 'Démarrage rapide', ariaCurrent: undefined },
    { href: '/getting-started/utilisation', label: 'Utilisation', ariaCurrent: undefined },
    { href: '/getting-started/shadow-dom', label: 'Shadow DOM applicatif', ariaCurrent: undefined },
    { href: '/getting-started/naming-conventions', label: 'Conventions de nommage', ariaCurrent: undefined },
].map((link) => ({
```

- [ ] **Step 3: Build et vérification locale**

Run: `npm run build --workspace=apps/docs`
Expected: succès, génère `apps/docs/dist/getting-started/naming-conventions/index.html`.

- [ ] **Step 4: Vérification a11y automatique**

Run: `npm run test:a11y --workspace=apps/docs`
Expected: PASS pour la route `/getting-started/naming-conventions/`, découverte automatiquement
(le script `test:a11y` lance `playwright test`, qui exécute `apps/docs/tests/a11y/pages.spec.ts`
contre `dist/` généré au Step 3).

- [ ] **Step 5: Commit**

```bash
git add apps/docs/src/pages/getting-started/naming-conventions.astro \
        apps/docs/src/components/SiteNav.astro
git commit -m "docs: page conventions de nommage part/slot transverses (#181)"
```

---

### Task 9: Vérification finale de branche

**Files:** aucun fichier modifié (task de vérification uniquement).

- [ ] **Step 1: Suite de tests complète (core)**

Run: `npm test --workspace=packages/core`
Expected: PASS, 0 échec.

- [ ] **Step 2: Suite de tests browser (core)**

Run: `npm run test:browser --workspace=packages/core`
Expected: PASS, 0 échec.

- [ ] **Step 3: Build complet + manifeste**

Run: `npm run build:manifest --workspace=packages/core && npm run build`
Expected: succès, sans avertissement des garde-fous CI (`validate-cssprop-defaults.js`,
`validate-no-hardcoded-tokens.js`).

- [ ] **Step 4: Vérification manuelle de cohérence JSDoc vs spec**

Relire la table « Vocabulaire retenu » de
`docs/superpowers/specs/2026-08-13-role-parts-vocabulary-181-design.md` et confirmer que chaque
rôle introduit dans ce lot (`control`, `field`, `action-button`, racine nommée) est bien documenté
avec la mention « Rôle transverse (voir /getting-started/naming-conventions) » sur `ar-pagination`
et `ar-datepicker`, et que `ar-charcounter` a bien `charcounter`/`warning-icon`/`error-icon`.

- [ ] **Step 5: Grep final — aucune correspondance exacte résiduelle sur les parts multi-jetons de ce lot**

Run: `grep -rn '\[part="nav"\]\|\[part="link"\]\|\[part="current"\]\|\[part="select"\]\|\[part="day"\]\|\[part="input"\]\|\[part='"'"'day'"'"'\]\|\[part='"'"'input'"'"'\]' packages/core/src/components/pagination packages/core/src/components/datepicker`
Expected: aucune sortie.

- [ ] **Step 6: Lint/format**

Run: `npm run lint`
Expected: PASS.

---

### Task 10: Créer la Pull Request

**Files:** aucun fichier modifié.

- [ ] **Step 1: Pousser la branche**

```bash
git push -u origin fix/parts-roles-vocabulary-181-lot1
```

- [ ] **Step 2: Créer la PR vers `dev`**

```bash
gh pr create --base dev --title "fix(core): vocabulaire de rôles ::part()/slot transverses — lot 1 (#181)" --body "$(cat <<'EOF'
## Résumé

Premier lot du chantier #181 (vocabulaire de rôles `::part()`/`slot` transverses) :

- `ar-charcounter` : racine `container` → `charcounter`, slots `icon-warning`/`icon-error` →
  `warning-icon`/`error-icon` (cohérence avec le suffixe `<rôle>-icon` déjà établi ailleurs).
- `ar-pagination` : part racine `pagination` (additif sur `nav`), rôles transverses
  `control`(link/current)/`field`(select)/`action-button`(prev/next), `nav-btn` → `nav-button`.
- `ar-datepicker` : nouveau wrapper racine `part="datepicker"`, rôles transverses
  `field`(input)/`control`(day)/`action-button`(nav-button/footer-button), `nav-btn`/`footer-btn`/
  `today-btn`/`close-btn` → `-button` en toutes lettres.
- Nouvelle page de doc `/getting-started/naming-conventions` (rôles `::part()` transverses +
  conventions de `slot`).

Spec : `docs/superpowers/specs/2026-08-13-role-parts-vocabulary-181-design.md`
Plan : `docs/superpowers/plans/2026-08-13-role-parts-vocabulary-181-lot1.md`

## Test plan

- [ ] `npm test --workspace=packages/core` — PASS
- [ ] `npm run test:browser --workspace=packages/core` — PASS
- [ ] `npm run test:a11y --workspace=apps/docs` — PASS
- [ ] `npm run build:manifest --workspace=packages/core && npm run build` — succès

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Confirmer la création**

Run: `gh pr view --json url --jq .url`
Expected: affiche l'URL de la PR nouvellement créée, vers `dev`.
