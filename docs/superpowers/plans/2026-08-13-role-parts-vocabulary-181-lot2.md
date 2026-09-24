# Vocabulaire de rôles ::part() transverses — Lot 2 (part racine) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Renommer le part racine (`base`/`container` → nom du composant) sur `ar-breadcrumb`,
`ar-tooltip`, `ar-progressbar`, `ar-tab`, `ar-tab-panel`, `ar-tab-group`, `ar-collapse`, et
appliquer 2 correctifs propres à `ar-collapse` (`content` → `body`, `panel` → `collapsible`),
puis ouvrir la PR vers `dev`.

**Architecture:** Deux traitements distincts selon que le nom existant est un filler générique ou
un nom déjà significatif. `base` (tab, tab-panel, tab-group, collapse) et `container` (progressbar)
sont des noms génériques sans autre valeur sémantique : ils sont **remplacés** intégralement par le
nom du composant — renommage 1:1, aucune conversion de sélecteur nécessaire. `nav` (breadcrumb) et
`bubble` (tooltip) restent des noms spécifiques significatifs (élément `<nav>`, forme de bulle) :
le nom du composant est **ajouté** à côté, comme `nav pagination` au lot 1 — ce qui rend le part
multi-jetons, donc tout endroit qui le sélectionne par égalité stricte (`[part="x"]` en CSS,
`@query`, tests) doit être converti en sélecteur « contient » (`[part~="x"]`) avant le changement,
sous peine de casser silencieusement le style ou la logique interne. `ar-collapse` reçoit en plus
deux renommages 1:1 (`content` → `body`, `panel` → `collapsible`), motivés par la spec, indépendants
du part racine.

**Tech Stack:** Lit 3, TypeScript, Vitest (unit + a11y jsdom), Web Test Runner (browser), Astro 6
(site de doc).

## Global Constraints

- Prettier : 100 caractères, 4 espaces, single quotes (déjà appliqué automatiquement par le hook
  `lint-staged` au commit — ne pas s'inquiéter d'un reformattage après `git commit`).
- `import type` pour tout import de type.
- Conventional Commits (commitlint + Husky).
- Aucun fallback cosmétique dans les composants — headless, tokens dans `themes/default.css`
  uniquement. Ce lot n'ajoute aucun nouveau token, aucune étape ne doit en introduire.
- Projet en alpha : tous les renommages de ce lot sont secs, pas de `warnDeprecated`/alias.
- **Aucun nouveau wrapper d'élément n'est ajouté dans ce lot** — seul un part racine déjà porté par
  un élément existant est renommé/complété. `ar-alert`, `ar-dropdown`, `ar-table-sort`,
  `ar-spinner` sont hors scope (pas de wrapper existant à renommer sans en créer un).
- Pour `nav` (breadcrumb) et `bubble` (tooltip) : le part devient multi-jetons. Toute sélection par
  égalité stricte existante (`[part="nav"]`, `[part="bubble"]`, `@query('[part="nav"]')`, etc.)
  doit être convertie en `[part~="nav"]`/`[part~="bubble"]` **avant** que le renommage ne prenne
  effet, sinon les sélecteurs cessent silencieusement de matcher.
- Spec de référence : `docs/superpowers/specs/2026-08-13-role-parts-vocabulary-181-design.md`.

---

### Task 1: Setup — branche de travail

**Files:** aucun fichier modifié.

- [ ] **Step 1: Créer la branche**

```bash
cd /Users/jon/Code/Active_projects/ariane
git checkout dev
git pull origin dev
git checkout -b fix/parts-roles-vocabulary-181-lot2
```

- [ ] **Step 2: Vérifier l'état de départ (tests unitaires)**

Run: `npm test --workspace=packages/core`
Expected: PASS (baseline avant toute modification).

---

### Task 2: `ar-breadcrumb` — part racine additif `nav breadcrumb`

**Files:**

- Modify: `packages/core/src/components/breadcrumb/breadcrumb.ts`
- Modify: `packages/core/src/components/breadcrumb/breadcrumb.styles.ts`
- Modify: `packages/core/src/components/breadcrumb/breadcrumb.test.ts`
- Modify: `packages/core/src/components/breadcrumb/breadcrumb.browser.test.ts`

**Interfaces:**

- Produces: part racine `breadcrumb` (additif sur `nav`, qui reste présent) — `part="nav
breadcrumb"` sur l'élément `<nav>` englobant.

- [ ] **Step 1: Mettre à jour les assertions de test (échec attendu)**

Dans `packages/core/src/components/breadcrumb/breadcrumb.test.ts` :

```ts
// ligne 183-190, avant
it('contient un part="nav"', async () => {
    // ...
    expect(getPart(el, 'nav')).not.toBeNull();
});
// après (getPart doit continuer de matcher un part multi-jetons — vérifier son implémentation
// dans test-helpers ; si elle utilise déjà `[part~="x"]` en interne, aucun changement requis ici)
it('contient un part="nav breadcrumb"', async () => {
    // ...
    const nav = getPart(el, 'nav');
    expect(nav).not.toBeNull();
    expect(nav?.getAttribute('part')).toBe('nav breadcrumb');
});
```

`getPart`/`requirePart` (`packages/core/src/test-utils.ts`) matchent déjà via `[part~="…"]` —
aucune correction du helper n'est nécessaire. Les deux autres usages de `getPart(el, 'nav')`
(lignes 605, 615) continuent donc de fonctionner sans changement après le renommage : `nav` reste
un token réel du nouveau `part="nav breadcrumb"`.

Dans `packages/core/src/components/breadcrumb/breadcrumb.browser.test.ts` (ligne 166) :

```ts
// avant
const nav = el.shadowRoot?.querySelector<HTMLElement>('[part="nav"]');
if (!nav) throw new Error('[part="nav"] introuvable');
// après
const nav = el.shadowRoot?.querySelector<HTMLElement>('[part~="nav"]');
if (!nav) throw new Error('[part~="nav"] introuvable');
```

- [ ] **Step 2: Run tests — vérifier l'échec**

Run: `npm test --workspace=packages/core -- breadcrumb`
Expected: FAIL (le composant ne produit pas encore `part="nav breadcrumb"`).

- [ ] **Step 3: Modifier le composant**

Dans `packages/core/src/components/breadcrumb/breadcrumb.ts`, JSDoc (ligne 30) :

```ts
// avant
* @csspart nav        - L'élément `<nav>` englobant.
// après
* @csspart nav        - L'élément `<nav>` englobant.
* @csspart breadcrumb - Porté par `nav` : racine du composant.
```

Render (chercher `part="nav"` dans le template, section desktop/mobile — un seul point d'usage) :

```ts
// avant
<nav part="nav" role="navigation" aria-labelledby="breadcrumb-label">
// après
<nav part="nav breadcrumb" role="navigation" aria-labelledby="breadcrumb-label">
```

- [ ] **Step 4: Convertir les sélecteurs CSS en `[part~='nav']`**

Dans `packages/core/src/components/breadcrumb/breadcrumb.styles.ts` (ligne 11, seule occurrence) :

```css
/* avant */
[part='nav'] {
/* après */
[part~='nav'] {
```

- [ ] **Step 5: Run tests — vérifier le succès**

Run: `npm test --workspace=packages/core -- breadcrumb`
Expected: PASS.

- [ ] **Step 6: Test navigateur**

Run: `npm run test:browser --workspace=packages/core -- breadcrumb`
Expected: PASS (le test RTL `padding-inline-end` doit toujours matcher `[part~="nav"]`).

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/components/breadcrumb
git commit -m "fix(breadcrumb): part racine additif nav breadcrumb (#181)"
```

---

### Task 3: `ar-tooltip` — part racine additif `bubble tooltip`

**Files:**

- Modify: `packages/core/src/components/tooltip/tooltip.ts`
- Modify: `packages/core/src/components/tooltip/tooltip.styles.ts`
- Modify: `packages/core/src/components/tooltip/tooltip.test.ts`
- Modify: `packages/core/src/components/tooltip/tooltip.a11y.test.ts`
- Modify: `packages/core/src/components/tooltip/tooltip.browser.test.ts`

**Interfaces:**

- Produces: part racine `tooltip` (additif sur `bubble`, qui reste présent) — `part="bubble
tooltip"` sur le panel flottant.

- [ ] **Step 1: Mettre à jour les assertions de test (échec attendu)**

Dans `packages/core/src/components/tooltip/tooltip.test.ts` (ligne 22-23) :

```ts
// avant
it('contient un bubble avec part="bubble"', () => {
    expect(getPart(el, 'bubble')).not.toBeNull();
});
// après
it('contient un bubble avec part="bubble tooltip"', () => {
    const bubble = getPart(el, 'bubble');
    expect(bubble).not.toBeNull();
    expect(bubble?.getAttribute('part')).toBe('bubble tooltip');
});
```

Les autres usages de `getPart(el, 'bubble')` dans ce fichier (lignes 27, 31, 120) continuent de
fonctionner sans changement : `getPart` matche déjà via `[part~="…"]`, et `bubble` reste un token
réel du nouveau `part="bubble tooltip"`.

Dans `packages/core/src/components/tooltip/tooltip.a11y.test.ts` (lignes 13-14) :

```ts
// avant
const bubble = el.shadowRoot?.querySelector('[part="bubble"]');
if (!(bubble instanceof HTMLElement)) throw new Error('[part="bubble"] introuvable');
// après
const bubble = el.shadowRoot?.querySelector('[part~="bubble"]');
if (!(bubble instanceof HTMLElement)) throw new Error('[part~="bubble"] introuvable');
```

Dans `packages/core/src/components/tooltip/tooltip.browser.test.ts` (lignes 17-18) : même
correction `[part="bubble"]` → `[part~="bubble"]`.

- [ ] **Step 2: Run tests — vérifier l'échec**

Run: `npm test --workspace=packages/core -- tooltip`
Expected: FAIL.

- [ ] **Step 3: Modifier le composant**

Dans `packages/core/src/components/tooltip/tooltip.ts`, JSDoc (ligne 32) :

```ts
// avant
* @csspart bubble - Le panel flottant (largeur maximale pilotable via `::part(bubble)`).
// après
* @csspart bubble  - Le panel flottant (largeur maximale pilotable via `::part(bubble)`).
* @csspart tooltip - Porté par `bubble` : racine du composant.
```

Render :

```ts
// avant
<div
    part="bubble"
    popover="manual"
// après
<div
    part="bubble tooltip"
    popover="manual"
```

`@query('[part="bubble"]')` (ligne 89) :

```ts
// avant
@query('[part="bubble"]') private _bubble!: HTMLElement;
// après
@query('[part~="bubble"]') private _bubble!: HTMLElement;
```

- [ ] **Step 4: Convertir les sélecteurs CSS en `[part~='bubble']`**

Dans `packages/core/src/components/tooltip/tooltip.styles.ts` (lignes 9, 39, 43, 48 — toutes les
occurrences de `[part='bubble']`) :

```css
/* avant */
[part='bubble'] {
[part='bubble']:not(:popover-open) {
[part='bubble']:popover-open {
/* après */
[part~='bubble'] {
[part~='bubble']:not(:popover-open) {
[part~='bubble']:popover-open {
```

- [ ] **Step 5: Run tests — vérifier le succès**

Run: `npm test --workspace=packages/core -- tooltip`
Expected: PASS.

- [ ] **Step 6: Tests navigateur et a11y**

Run: `npm run test:browser --workspace=packages/core -- tooltip`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/components/tooltip
git commit -m "fix(tooltip): part racine additif bubble tooltip (#181)"
```

---

### Task 4: `ar-progressbar` — part racine `container` → `progressbar`

**Files:**

- Modify: `packages/core/src/components/progressbar/progressbar.ts`
- Modify: `packages/core/src/components/progressbar/progressbar.styles.ts`
- Modify: `packages/core/src/components/progressbar/progressbar.test.ts`

**Interfaces:**

- Produces: part racine `progressbar` (remplace `container`, renommage 1:1, pas de conversion de
  sélecteur).

- [ ] **Step 1: Mettre à jour les assertions de test (échec attendu)**

Dans `packages/core/src/components/progressbar/progressbar.test.ts` (ligne 22-23) :

```ts
// avant
it('contient un part="container"', () => {
    expect(getPart(el, 'container')).not.toBeNull();
});
// après
it('contient un part="progressbar"', () => {
    expect(getPart(el, 'progressbar')).not.toBeNull();
});
```

`progressbar.a11y.test.ts` ne référence pas `container` — aucun changement nécessaire dans ce
fichier (listé ici pour mémoire, à ouvrir uniquement si le Step 2 échoue de façon inattendue).

- [ ] **Step 2: Run tests — vérifier l'échec**

Run: `npm test --workspace=packages/core -- progressbar`
Expected: FAIL.

- [ ] **Step 3: Modifier le composant**

Dans `packages/core/src/components/progressbar/progressbar.ts`, JSDoc (ligne 22) :

```ts
// avant
* @csspart container    - Le `<div>` englobant l'ensemble du composant.
// après
* @csspart progressbar  - Le `<div>` englobant l'ensemble du composant (racine).
```

Render :

```ts
// avant
return html` <div part="container">
// après
return html` <div part="progressbar">
```

- [ ] **Step 4: Renommer le sélecteur CSS**

Dans `packages/core/src/components/progressbar/progressbar.styles.ts` (ligne 11) :

```css
/* avant */
[part='container'] {
/* après */
[part='progressbar'] {
```

- [ ] **Step 5: Run tests — vérifier le succès**

Run: `npm test --workspace=packages/core -- progressbar`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/components/progressbar
git commit -m "fix(progressbar): part racine container→progressbar (#181)"
```

---

### Task 5: `ar-tab`/`ar-tab-panel`/`ar-tab-group` — part racine `base` → nom du composant

**Files:**

- Modify: `packages/core/src/components/tab/tab.ts`
- Modify: `packages/core/src/components/tab/tab.styles.ts`
- Modify: `packages/core/src/components/tab/tab.test.ts`
- Modify: `packages/core/src/components/tab-panel/tab-panel.ts`
- Modify: `packages/core/src/components/tab-group/tab-group.ts`
- Modify: `packages/core/src/components/tab-group/tab-group.styles.ts`
- Modify: `packages/core/src/components/tab-group/tab-group.test.ts`

**Interfaces:**

- Produces: part racine `tab` sur `ar-tab` (remplace `base`, avec son modificateur d'état
  `base--selected` → `tab--selected` en cohérence) ; `tab-panel` sur `ar-tab-panel` (remplace
  `base`) ; `tab-group` sur `ar-tab-group` (remplace `base`, les parts internes `nav`/`tabs` sont
  hors scope, non touchés).

- [ ] **Step 1: Mettre à jour les assertions de test (échec attendu)**

Dans `packages/core/src/components/tab/tab.test.ts` (lignes 43-52, les 2 tests de ce describe) :

```ts
// avant
it('émet part="base" quand active est false', async () => {
    el = await fixture('<ar-tab panel="a">Tab</ar-tab>');
    expect(getPart(el, 'base--selected')).toBeNull();
});

it('émet part="base base--selected" quand active est true', async () => {
    el = await fixture('<ar-tab panel="a">Tab</ar-tab>');
    el.active = true;
    await waitForUpdate(el);
    expect(getPart(el, 'base--selected')).not.toBeNull();
});
// après
it('émet part="tab" quand active est false', async () => {
    el = await fixture('<ar-tab panel="a">Tab</ar-tab>');
    expect(getPart(el, 'tab--selected')).toBeNull();
});

it('émet part="tab tab--selected" quand active est true', async () => {
    el = await fixture('<ar-tab panel="a">Tab</ar-tab>');
    el.active = true;
    await waitForUpdate(el);
    expect(getPart(el, 'tab--selected')).not.toBeNull();
});
```

Dans `packages/core/src/components/tab-group/tab-group.test.ts` (ligne 33-34) :

**Attention** : `tab-group` contient un tiret. `getPart`/`requirePart` (dans
`packages/core/src/test-utils.ts`) matchent via `[part~="…"]`, et happy-dom (l'environnement DOM de
Vitest) a une implémentation non conforme de `~=` qui scinde aussi sur les tirets — la valeur
stockée `part="tab-group"` serait alors segmentée en tokens `tab`/`group`, et la recherche du token
entier `tab-group` ne matcherait plus rien (faux négatif). Lot 1 a déjà rencontré ce piège avec le
rôle `action-button` (voir `pagination.test.ts`, helper local `partContains`, et
`datepicker.test.ts` qui lit l'attribut brut). Ne pas utiliser `getPart(el, 'tab-group')` : lire
l'attribut `part` du host directement.

```ts
// avant
it('contient part="base"', () => {
    expect(getPart(el, 'base')).not.toBeNull();
});
// après
it('contient part="tab-group"', () => {
    const host = el.shadowRoot?.firstElementChild;
    expect(host?.getAttribute('part')?.split(/\s+/)).toContain('tab-group');
});
```

- [ ] **Step 2: Run tests — vérifier l'échec**

Run: `npm test --workspace=packages/core -- tab-group tab-panel tab.test`
Expected: FAIL.

- [ ] **Step 3: Modifier `ar-tab`**

Dans `packages/core/src/components/tab/tab.ts`, JSDoc :

```ts
// avant
* @csspart base - Wrapper du slot — padding, box-shadow actif.
* @csspart base--selected - Wrapper du slot quand l'onglet est actif (variante d'état de `base`, propriété `active` pilotée par ar-tab-group).
//
// @cssprop --ar-tab-active-shadow - box-shadow complet sur part="base--selected" quand actif. ...
// après
* @csspart tab - Wrapper du slot — padding, box-shadow actif.
* @csspart tab--selected - Wrapper du slot quand l'onglet est actif (variante d'état de `tab`, propriété `active` pilotée par ar-tab-group).
//
// @cssprop --ar-tab-active-shadow - box-shadow complet sur part="tab--selected" quand actif. ...
```

Render :

```ts
// avant
return html`<div part="base${this.active ? ' base--selected' : ''}"><slot></slot></div>`;
// après
return html`<div part="tab${this.active ? ' tab--selected' : ''}"><slot></slot></div>`;
```

- [ ] **Step 4: Renommer les sélecteurs CSS de `ar-tab`**

Dans `packages/core/src/components/tab/tab.styles.ts` (lignes 11 et 25 — déjà en `[part~=...]`,
seule la chaîne change) :

```css
/* avant */
[part~='base'] {
[part~='base--selected'] {
/* après */
[part~='tab'] {
[part~='tab--selected'] {
```

- [ ] **Step 5: Modifier `ar-tab-panel`**

Dans `packages/core/src/components/tab-panel/tab-panel.ts` :

```ts
// avant
 * @csspart base - Wrapper du slot.
// après
 * @csspart tab-panel - Wrapper du slot (racine).
```

```ts
// avant
return html`<div part="base"><slot></slot></div>`;
// après
return html`<div part="tab-panel"><slot></slot></div>`;
```

`tab-panel.styles.ts` ne référence aucun sélecteur `[part=...]` — aucun changement nécessaire côté
styles.

- [ ] **Step 6: Modifier `ar-tab-group`**

Dans `packages/core/src/components/tab-group/tab-group.ts`, JSDoc :

```ts
// avant
* @csspart base - Conteneur racine.
* @csspart nav  - Zone scrollable (overflow-x: auto).
* @csspart tabs - div[role="tablist"].
// après
* @csspart tab-group - Conteneur racine.
* @csspart nav       - Zone scrollable (overflow-x: auto).
* @csspart tabs       - div[role="tablist"].
```

Render (l'élément englobant, `nav`/`tabs` internes non touchés) :

```ts
// avant
<div part="base">
// après
<div part="tab-group">
```

- [ ] **Step 7: Renommer le sélecteur CSS de `ar-tab-group`**

Dans `packages/core/src/components/tab-group/tab-group.styles.ts` (ligne 8) :

```css
/* avant */
[part='base'] {
/* après */
[part='tab-group'] {
```

- [ ] **Step 8: Run tests — vérifier le succès**

Run: `npm test --workspace=packages/core -- tab-group tab-panel tab.test`
Expected: PASS.

- [ ] **Step 9: Test navigateur (tab-group)**

Run: `npm run test:browser --workspace=packages/core -- tab-group`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add packages/core/src/components/tab packages/core/src/components/tab-panel packages/core/src/components/tab-group
git commit -m "fix(tab,tab-panel,tab-group): part racine base→nom du composant (#181)"
```

---

### Task 6: `ar-collapse` — part racine `base` → `collapse`, `content` → `body`, `panel` → `collapsible`

**Files:**

- Modify: `packages/core/src/components/collapse/collapse.ts`
- Modify: `packages/core/src/components/collapse/collapse.styles.ts`
- Modify: `packages/core/src/components/collapse/collapse.test.ts`
- Modify: `packages/core/src/components/collapse/collapse.browser.test.ts`
- Modify: `apps/docs/src/content/components/ar-collapse.mdx`

**Interfaces:**

- Produces: part racine `collapse` (remplace `base`) ; part `body` (remplace `content`, wrapper
  interne du contenu slotté) ; part `collapsible` (remplace `panel`, wrapper animé
  overflow-hidden/height — renommé pour lever la collision de sens avec le rôle transverse `panel`
  = conteneur flottant, non applicable ici puisque ce wrapper n'est jamais flottant).

- [ ] **Step 1: Mettre à jour les assertions de test (échec attendu)**

Dans `packages/core/src/components/collapse/collapse.test.ts` :

```ts
// ligne 85, avant
it('contient part="base"', () => expect(getPart(el, 'base')).not.toBeNull());
// après
it('contient part="collapse"', () => expect(getPart(el, 'collapse')).not.toBeNull());

// ligne 88, avant
it('contient part="panel"', () => expect(getPart(el, 'panel')).not.toBeNull());
// après
it('contient part="collapsible"', () => expect(getPart(el, 'collapsible')).not.toBeNull());

// ligne 89, avant
it('contient part="content"', () => expect(getPart(el, 'content')).not.toBeNull());
// après
it('contient part="body"', () => expect(getPart(el, 'body')).not.toBeNull());
```

Lignes 91, 125, 134 — `requirePart(el, 'panel')` → `requirePart(el, 'collapsible')` (3 occurrences,
toutes dans des assertions sur l'attribut `hidden`).

Lignes 542, 557 — `requirePart(el, 'base')` → `requirePart(el, 'collapse')` (2 occurrences, tests
`trigger-position`).

Lignes 547, 562 — `c.getAttribute('part') === 'panel'` → `c.getAttribute('part') === 'collapsible'`
(2 occurrences, recherche d'index dans les enfants).

Dans `packages/core/src/components/collapse/collapse.browser.test.ts` :

```ts
// ligne 12, avant
styleEl.textContent = 'ar-collapse::part(panel) { transition: height 100ms ease; }';
// après
styleEl.textContent = 'ar-collapse::part(collapsible) { transition: height 100ms ease; }';
```

```ts
// ligne 19, avant
const p = el.shadowRoot?.querySelector<HTMLElement>('[part="panel"]');
// après
const p = el.shadowRoot?.querySelector<HTMLElement>('[part="collapsible"]');
```

Ligne 181 (titre de test, cosmétique) : `'[part="panel"] s\'étire...'` →
`'[part="collapsible"] s\'étire...'`. Lignes 182-183 (commentaire) : `[part='base']`/`[part='panel']`
→ `[part='collapse']`/`[part='collapsible']`.

- [ ] **Step 2: Run tests — vérifier l'échec**

Run: `npm test --workspace=packages/core -- collapse`
Expected: FAIL.

- [ ] **Step 3: Modifier le composant**

Dans `packages/core/src/components/collapse/collapse.ts`, JSDoc (lignes 16-19) :

```ts
// avant
* @csspart base              - Conteneur racine.
* @csspart trigger-container - Wrapper du slot trigger.
* @csspart panel             - Zone animée (overflow hidden, height 0 → auto).
* @csspart content           - Wrapper interne du contenu.
// après
* @csspart collapse          - Conteneur racine.
* @csspart trigger-container - Wrapper du slot trigger.
* @csspart collapsible       - Zone animée (overflow hidden, height 0 → auto). Nom distinct de
*   `panel` (rôle transverse = conteneur flottant) : ce wrapper n'est jamais flottant.
* @csspart body               - Wrapper interne du contenu.
```

`@query` (ligne 65) :

```ts
// avant
@query('[part="panel"]') private _panel!: HTMLElement;
// après
@query('[part="collapsible"]') private _panel!: HTMLElement;
```

Render (lignes 141-153) :

```ts
// avant
const panel = html`
    <div part="panel" hidden>
        <div part="content">
            <slot></slot>
        </div>
    </div>
`;
return html`
    <div part="base">
        ${this.triggerPosition === 'after' ? html`${panel}${trigger}` : html`${trigger}${panel}`}
    </div>
`;
// après
const panel = html`
    <div part="collapsible" hidden>
        <div part="body">
            <slot></slot>
        </div>
    </div>
`;
return html`
    <div part="collapse">
        ${this.triggerPosition === 'after' ? html`${panel}${trigger}` : html`${trigger}${panel}`}
    </div>
`;
```

- [ ] **Step 4: Renommer les sélecteurs CSS**

Dans `packages/core/src/components/collapse/collapse.styles.ts` :

```css
/* avant */
[part='base'] {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}

[part='panel'] {
    /* [part='base'] utilise align-items: flex-start pour que le trigger (souvent un bouton
       compact) garde sa largeur naturelle plutôt que de s'étirer sur toute la largeur —
       mais ce même align-items rétrécit aussi le panel à la largeur de son contenu (fit-content)
       au lieu de la largeur du conteneur. align-self: stretch réaffirme l'étirement pour le
       panel seul, sans changer le comportement du trigger. */
    align-self: stretch;
    overflow: hidden;
    transition: height var(--ar-collapse-duration) var(--ar-collapse-easing);
}

[part='panel'][hidden] {
    display: none;
}
/* après */
[part='collapse'] {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}

[part='collapsible'] {
    /* [part='collapse'] utilise align-items: flex-start pour que le trigger (souvent un bouton
       compact) garde sa largeur naturelle plutôt que de s'étirer sur toute la largeur —
       mais ce même align-items rétrécit aussi la zone collapsible à la largeur de son contenu
       (fit-content) au lieu de la largeur du conteneur. align-self: stretch réaffirme
       l'étirement, sans changer le comportement du trigger. */
    align-self: stretch;
    overflow: hidden;
    transition: height var(--ar-collapse-duration) var(--ar-collapse-easing);
}

[part='collapsible'][hidden] {
    display: none;
}
```

- [ ] **Step 5: Mettre à jour la doc `ar-collapse.mdx`**

Dans `apps/docs/src/content/components/ar-collapse.mdx` (ligne 121) :

```css
/* avant */
ar-collapse::part(panel) {
    transition: height var(--ar-collapse-duration, 0s) var(--ar-collapse-easing, ease);
}
/* après */
ar-collapse::part(collapsible) {
    transition: height var(--ar-collapse-duration, 0s) var(--ar-collapse-easing, ease);
}
```

- [ ] **Step 6: Run tests — vérifier le succès**

Run: `npm test --workspace=packages/core -- collapse`
Expected: PASS.

- [ ] **Step 7: Test navigateur**

Run: `npm run test:browser --workspace=packages/core -- collapse`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/components/collapse apps/docs/src/content/components/ar-collapse.mdx
git commit -m "fix(collapse): part racine base→collapse, content→body, panel→collapsible (#181)"
```

---

### Task 7: Mise à jour de la page de doc — conventions de nommage

**Files:**

- Modify: `apps/docs/src/pages/getting-started/naming-conventions.astro`

**Interfaces:**

- Consumes: table des rôles existante (section `#roles-table`), ligne du part racine.

- [ ] **Step 1: Nuancer la ligne du part racine**

Dans `apps/docs/src/pages/getting-started/naming-conventions.astro`, la ligne du tableau pour
`(nom du composant)` dit actuellement que le nom générique est remplacé, sans mentionner le cas où
le nom existant est conservé. Mettre à jour la cellule « Signification » :

```astro
<!-- avant -->
<td>
    Racine du composant. <br>
    Utilisé à la place d'un nom sémantique tel que <code>base</code>
    de sorte à prévenir les collisions de nom lors d'un chaînage
    <code>exportparts</code> quand un composant est imbriqué
    dans un autre.
</td>
<!-- après -->
<td>
    Racine du composant. <br>
    Remplace un nom générique existant (<code>base</code>, <code>container</code>) sans valeur
    propre. Si le nom existant est déjà significatif (ex. <code>nav</code>, <code>bubble</code>),
    il est conservé et le nom du composant s'y ajoute plutôt que de le remplacer.
</td>
```

- [ ] **Step 2: Ajouter un exemple additif**

Dans la cellule « Exemples » de la même ligne :

```astro
<!-- avant -->
<td>
    <code>ar-charcounter::part(charcounter)</code>,
    <code>ar-datepicker::part(datepicker)</code>
</td>
<!-- après -->
<td>
    <code>ar-charcounter::part(charcounter)</code>,
    <code>ar-datepicker::part(datepicker)</code>,
    <code>ar-breadcrumb::part(breadcrumb)</code> (additif sur <code>nav</code>)
</td>
```

- [ ] **Step 3: Vérifier visuellement**

Run: `npm run dev --workspace=apps/docs`
Ouvrir `http://localhost:4321/getting-started/naming-conventions` et vérifier que la ligne
s'affiche correctement (pas de balise mal fermée, rendu cohérent avec le reste du tableau).

- [ ] **Step 4: Commit**

```bash
git add apps/docs/src/pages/getting-started/naming-conventions.astro
git commit -m "docs(naming-conventions): nuance le part racine (additif si nom déjà significatif) (#181)"
```

---

### Task 8: Vérification finale de branche

**Files:** aucun fichier modifié.

- [ ] **Step 1: Suite complète core**

Run: `npm test --workspace=packages/core`
Expected: PASS (tous les tests, pas seulement ceux touchés par ce lot).

- [ ] **Step 2: Tests navigateur core**

Run: `npm run test:browser --workspace=packages/core`
Expected: PASS.

- [ ] **Step 3: Build manifeste + build docs**

Run: `npm run build:manifest --workspace=packages/core && npm run build --workspace=apps/docs`
Expected: succès — le manifeste régénéré doit refléter les nouveaux `@csspart`, la doc doit se
générer sans page cassée (routes générées automatiquement depuis le manifeste + mdx).

- [ ] **Step 4: Tests a11y docs**

Run: `npm run test:a11y --workspace=apps/docs`
Expected: PASS (scanne toutes les routes générées, y compris les pages composants touchées).

- [ ] **Step 5: Grep final — aucune correspondance exacte résiduelle sur les parts multi-jetons**

Run: `grep -rn "\[part=\"nav\"\]\|\[part='nav'\]\|\[part=\"bubble\"\]\|\[part='bubble'\]" packages/core/src/components/breadcrumb packages/core/src/components/tooltip`
Expected: aucune sortie (tout doit être passé en `[part~=...]`).

- [ ] **Step 6: Grep final — aucun résidu des anciens noms remplacés**

Run: `grep -rn "part=\"base\"\|part='base'\|part=\"container\"\|part='container'\|part=\"content\"\|part='content'" packages/core/src/components/tab packages/core/src/components/tab-panel packages/core/src/components/tab-group packages/core/src/components/collapse packages/core/src/components/progressbar`
Expected: aucune sortie.

- [ ] **Step 7: Lint/format**

Run: `npm run lint`
Expected: PASS.

---

### Task 9: Créer la Pull Request

**Files:** aucun fichier modifié.

- [ ] **Step 1: Pousser la branche**

```bash
git push -u origin fix/parts-roles-vocabulary-181-lot2
```

- [ ] **Step 2: Créer la PR vers `dev`**

```bash
gh pr create --base dev --title "fix(core): vocabulaire de rôles ::part() transverses — lot 2, part racine (#181)" --body "$(cat <<'EOF'
## Résumé

Deuxième lot du chantier #181 : renommage du part racine sur les composants restants dont le
wrapper existe déjà (voir spec — plus de wrapper ajouté rien que pour ce rôle) :

- `ar-breadcrumb` : `part="nav breadcrumb"` (additif, `nav` conservé)
- `ar-tooltip` : `part="bubble tooltip"` (additif, `bubble` conservé)
- `ar-progressbar` : `container` → `progressbar` (remplace)
- `ar-tab` : `base`/`base--selected` → `tab`/`tab--selected` (remplace)
- `ar-tab-panel` : `base` → `tab-panel` (remplace)
- `ar-tab-group` : `base` → `tab-group` (remplace, `nav`/`tabs` internes non touchés)
- `ar-collapse` : `base` → `collapse` (remplace), `content` → `body`, `panel` → `collapsible`
  (lève la collision de sens avec le rôle transverse `panel` = conteneur flottant)

Doc `/getting-started/naming-conventions` mise à jour : la ligne du part racine précise
maintenant le cas additif (nom existant conservé) vs remplacement (filler générique).

`ar-alert`, `ar-dropdown`, `ar-table-sort`, `ar-spinner` restent hors scope — pas de wrapper
existant à renommer sans en créer un, exclu par la politique retenue dans la spec.

Spec : `docs/superpowers/specs/2026-08-13-role-parts-vocabulary-181-design.md`
Plan : `docs/superpowers/plans/2026-08-13-role-parts-vocabulary-181-lot2.md`

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
