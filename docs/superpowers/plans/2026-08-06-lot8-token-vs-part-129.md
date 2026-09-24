# Lot 8 token vs `::part()` (#129) — table-sort, charcounter, progressbar, tab-group, tab, collapse — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Appliquer le critère à 4 branches d'ADR-005 (+ pattern part d'état, + marqueurs
`a11y-fallback`/`functional-default`) aux 6 derniers composants candidats du chantier #129 :
`ar-table-sort`, `ar-charcounter`, `ar-progressbar`, `ar-tab-group`, `ar-tab`, `ar-collapse`.
Conforme à `docs/superpowers/specs/2026-08-05-lot8-token-vs-part-129-design.md`.

**Architecture:** Aucun changement de structure DOM majeur, sauf :

- `ar-table-sort` : `part="button"` devient dynamique (`button`/`button button--pending`).
- `ar-charcounter` : `part="count"` devient dynamique (`count`/`count count--warning`/`count
count--error`).
- `ar-tab` : nouvelle propriété Lit `active` (pilotée par `ar-tab-group._syncAll()`, en plus de
  `aria-selected` inchangé) pour piloter dynamiquement `part="base"`/`part="base base--selected"`.

Tous les autres composants gardent leurs `part` statiques existants, seules les règles CSS
(interne → externe) et les tokens `default.css` changent.

**Tech Stack:** Lit 3, TypeScript, Vitest + WTR (browser), garde-fous CI
(`validate-no-hardcoded-tokens.js`, `validate-part-state-order.js`, `validate-cssprop-defaults.js`
via `cem.config.js`).

## Global Constraints

- Prettier : 100 char, 4 spaces, single quotes (CLAUDE.md).
- `--ar-*` cascade toujours via `var()` référençant `default.css`, jamais de valeur littérale
  codée en dur dans un `.styles.ts` sans commentaire `a11y-fallback`/`functional-default`
  justificatif (garde-fou `validate-no-hardcoded-tokens.js`).
- Tout nouveau/retiré token `--ar-*` doit avoir son entrée `@cssprop` tenue à jour dans le JSDoc
  du composant (feedback_cssprop_jsdoc), et n'être documenté que s'il est réellement consommé via
  `var()` dans le `.styles.ts` du composant (feedback_cssprop_requires_internal_consumption).
- Toute règle de base `::part(x)` doit précéder sa variante d'état `::part(x--état)` dans
  `default.css` (garde-fou `validate-part-state-order.js`).
- Ne jamais merger sur `dev` sans confirmation explicite de l'utilisateur
  (feedback_merge_after_autonomous_fix).
- `npm run dev --workspace=apps/docs` seul ne reconstruit pas le JS de `packages/core/dist` —
  rebuild explicite (`npm run build:dev --workspace=packages/core`) requis avant toute
  vérification Playwright d'un changement de renderer (feedback_docs_dev_stale_dist).
- Diff empirique `getComputedStyle` (ancien commit vs nouveau, propriété par propriété), pas
  seulement une capture Playwright — méthode retenue depuis le nettoyage `ar-stepper` (PR #156),
  plus fiable pour des écarts fins (bordure, poids de police, interligne).

---

## Task 1: Créer la branche de travail

**Files:** aucun.

- [ ] **Step 1: Créer la branche depuis `dev`**

```bash
git checkout dev
git pull origin dev
git checkout -b fix/lot8-token-vs-part-129
```

- [ ] **Step 2: Vérifier l'état propre**

Run: `git status`
Expected: `On branch fix/lot8-token-vs-part-129`, `nothing to commit, working tree clean`.

---

## Task 2: `ar-table-sort` — migrer gap/indicator-gap, ajouter le part d'état `button--pending`

**Files:**

- Modify: `packages/core/src/components/table-sort/table-sort.styles.ts`
- Modify: `packages/core/src/components/table-sort/table-sort.ts`
- Modify: `packages/core/src/styles/themes/default.css`

**Interfaces:**

- Consumes: rien de nouveau.
- Produces: `ar-table-sort::part(button)`, `ar-table-sort::part(button--pending)`,
  `ar-table-sort::part(indicator)` dans `default.css`, consommés visuellement par le composant.

- [ ] **Step 1: Rendre `part="button"` dynamique dans `table-sort.ts`**

Dans `render()` (ligne ~177), remplacer :

```ts
<button
    part="button"
    type="button"
    aria-disabled=${this.pending ? 'true' : nothing}
    @click=${this._handleClick}
    id=${this._buttonId}
>
```

par :

```ts
<button
    part="button${this.pending ? ' button--pending' : ''}"
    type="button"
    aria-disabled=${this.pending ? 'true' : nothing}
    @click=${this._handleClick}
    id=${this._buttonId}
>
```

- [ ] **Step 2: Retirer `gap`/`indicator-gap` et la règle `cursor: wait` de `table-sort.styles.ts`**

Retirer `gap: var(--ar-table-sort-gap);` du bloc `[part='button']` et `gap:
var(--ar-table-sort-indicator-gap);` du bloc `[part='indicator']`. Retirer entièrement le bloc :

```css
[part='button'][aria-disabled='true'] {
    cursor: wait;
}
```

- [ ] **Step 3: Ajouter le bloc `ar-table-sort { }` dans `default.css`**

Repérer le bloc token `Tablesort` existant (`grep -n "Tablesort" default.css`, ~ligne 460) et le
réduire aux 4 tokens conservés :

```css
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Tablesort
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
--ar-table-sort-indicator-size: 0.65rem;
--ar-table-sort-indicator-color: var(--ar-color-text-muted, #9ca3af);
--ar-table-sort-indicator-active-color: var(--ar-color-interactive, #2563eb);
--ar-table-sort-indicator-pending-color: var(--ar-color-text-muted, #9ca3af);
```

Ajouter un nouveau bloc `ar-table-sort { }` après `ar-tooltip { }` (dernier bloc du fichier,
`grep -n "^    ar-tooltip" default.css`), même niveau d'indentation (4 espaces) :

```css
ar-table-sort {
    &::part(button) {
        gap: 0.375rem;
    }

    &::part(button--pending) {
        cursor: wait;
    }

    &::part(indicator) {
        gap: 3px;
    }
}
```

- [ ] **Step 4: Mettre à jour le JSDoc `@cssprop`/`@csspart` de `table-sort.ts`**

Bloc actuel (lignes ~62-67) :

```ts
 * @cssprop --ar-table-sort-gap - Espacement label / indicateur.
 * @cssprop --ar-table-sort-indicator-gap - Espacement entre les icônes indicateurs asc / desc.
 * @cssprop --ar-table-sort-indicator-size - Taille de l'icône indicateur asc / desc.
 * @cssprop --ar-table-sort-indicator-color - Couleur état neutre.
 * @cssprop --ar-table-sort-indicator-active-color - Couleur état actif (asc/desc).
 * @cssprop --ar-table-sort-indicator-pending-color - Couleur état pending.
```

Remplacer par (retirer `gap`/`indicator-gap`, ajouter `@csspart` explicite) :

```ts
 * @cssprop --ar-table-sort-indicator-size - Taille de l'icône indicateur asc / desc.
 * @cssprop --ar-table-sort-indicator-color - Couleur état neutre.
 * @cssprop --ar-table-sort-indicator-active-color - Couleur état actif (asc/desc).
 * @cssprop --ar-table-sort-indicator-pending-color - Couleur état pending.
```

Compléter les lignes `@csspart` existantes (juste au-dessus) :

```ts
 * @csspart button    - Le bouton déclencheur. `button--pending` pendant l'attente de confirmation.
 * @csspart indicator - L'icône de direction de tri.
```

- [ ] **Step 4bis: Reformuler le `@summary` en registre neutre (issue #166)**

Ligne actuelle (~ligne 55) :

```ts
 * le `<th>` ancêtre. Le consommateur appelle `confirm()` après un tri réussi ou `reject()` en
 * cas d'échec.
```

Remplacer par (registre impératif, cohérent avec le reste du bloc — « Placer... », « Utiliser... »
déjà en usage ailleurs dans le repo) :

```ts
 * le `<th>` ancêtre. Appeler `confirm()` après un tri réussi, ou `reject()` en cas d'échec.
```

- [ ] **Step 5: Vérifier le format et committer**

```bash
npx prettier --write packages/core/src/components/table-sort/table-sort.styles.ts packages/core/src/components/table-sort/table-sort.ts packages/core/src/styles/themes/default.css
git add packages/core/src/components/table-sort packages/core/src/styles/themes/default.css
git commit -m "refactor(table-sort): migre gap/indicator-gap vers ::part(), ajoute le part d'état button--pending"
```

---

## Task 3: `ar-charcounter` — migrer color/font-size, part d'état `count--warning`/`count--error`

**Files:**

- Modify: `packages/core/src/components/charcounter/charcounter.styles.ts`
- Modify: `packages/core/src/components/charcounter/charcounter.ts`
- Modify: `packages/core/src/styles/themes/default.css`

**Interfaces:**

- Consumes: `this.state` (getter existant, déjà calculé par `_computeState()`).
- Produces: `ar-charcounter::part(count)`, `::part(count--warning)`, `::part(count--error)`.

- [ ] **Step 1: Rendre `part="count"` dynamique dans `charcounter.ts`**

Dans `render()` (ligne ~237), remplacer :

```ts
<span part="count">
```

par :

```ts
<span part="count${this._state !== 'normal' ? ` count--${this._state}` : ''}">
```

- [ ] **Step 2: Réduire `charcounter.styles.ts` aux tokens de graisse (weight)**

Contenu actuel (bloc `[part='count']` + surcharges état) :

```css
[part='count'] {
    color: var(--ar-charcounter-color);
    font-size: var(--ar-charcounter-font-size);
}

:host([state='warning']) [part='count'] {
    color: var(--ar-charcounter-warning-color);
    /* a11y-fallback: ... */
    font-weight: var(--ar-charcounter-warning-weight, 700);
}

:host([state='error']) [part='count'] {
    color: var(--ar-charcounter-error-color);
    /* a11y-fallback: ... */
    font-weight: var(--ar-charcounter-error-weight, 700);
}
```

Remplacer par (retirer `color`/`font-size` du bloc de base et `color` des 2 blocs d'état, garder
uniquement `font-weight` avec son fallback déjà en place — **reciblé sur le part d'état lui-même**
plutôt que sur `:host([state='...'])`, puisque `count--warning`/`count--error` portent déjà
l'information d'état sur l'élément, Step 1 ; `~=` requis, la valeur de l'attribut `part` contient
plusieurs tokens espacés) :

```css
[part~='count--warning'] {
    /* a11y-fallback: sans thème, la couleur seule (warning/error identiques) ne suffit pas à distinguer les états — la graisse doit rester un signal garanti même sans thème chargé */
    font-weight: var(--ar-charcounter-warning-weight, 700);
}

[part~='count--error'] {
    /* a11y-fallback: sans thème, la couleur seule (warning/error identiques) ne suffit pas à distinguer les états — la graisse doit rester un signal garanti même sans thème chargé */
    font-weight: var(--ar-charcounter-error-weight, 700);
}
```

- [ ] **Step 3: Réduire le bloc token `Charcounter` et ajouter `ar-charcounter { }` dans `default.css`**

Bloc `:root` réduit à 2 tokens :

```css
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Charcounter
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
--ar-charcounter-warning-weight: 600;
--ar-charcounter-error-weight: 700;
```

Nouveau bloc après `ar-table-sort { }` (Task 2) :

```css
ar-charcounter {
    &::part(count) {
        color: var(--ar-color-text-muted);
        font-size: 0.875rem;
    }

    &::part(count--warning) {
        color: var(--ar-color-warning-text);
    }

    &::part(count--error) {
        color: var(--ar-color-danger-text);
    }
}
```

- [ ] **Step 4: Mettre à jour le JSDoc de `charcounter.ts`**

Bloc actuel (lignes ~30-35) :

```ts
 * @cssprop --ar-charcounter-color - Couleur état normal.
 * @cssprop --ar-charcounter-warning-color - Couleur état warning.
 * @cssprop --ar-charcounter-error-color - Couleur état error.
 * @cssprop --ar-charcounter-font-size - Taille de police.
 * @cssprop --ar-charcounter-warning-weight - Graisse du texte en état warning. Repli `700` si aucun thème n'est chargé — seul signal garanti d'état si le consommateur n'utilise pas les slots d'icône.
 * @cssprop --ar-charcounter-error-weight - Graisse du texte en état error. Repli `700` si aucun thème n'est chargé.
```

Remplacer par (reformulation registre neutre/impératif, en profite pour retirer la référence à
la 3ᵉ personne « le consommateur » — cf. issue #166) :

```ts
 * @cssprop --ar-charcounter-warning-weight - Graisse du texte en état warning. Repli `700` si aucun thème n'est chargé — seul signal garanti d'état en l'absence des slots d'icône.
 * @cssprop --ar-charcounter-error-weight - Graisse du texte en état error. Repli `700` si aucun thème n'est chargé.
```

Mettre à jour `@csspart count` (ligne ~26) :

```ts
 * @csspart count     - Le bloc chiffre + label. `count--warning`/`count--error` en état warning/error.
```

- [ ] **Step 5: Vérifier le format et committer**

```bash
npx prettier --write packages/core/src/components/charcounter/charcounter.styles.ts packages/core/src/components/charcounter/charcounter.ts packages/core/src/styles/themes/default.css
git add packages/core/src/components/charcounter packages/core/src/styles/themes/default.css
git commit -m "refactor(charcounter): migre color/font-size vers ::part(), ajoute les parts d'état count--warning/count--error"
```

---

## Task 4: `ar-progressbar` — nettoyage nomenclature, migration tokens, repli a11y sur `max-width`

**Files:**

- Modify: `packages/core/src/components/progressbar/progressbar.styles.ts`
- Modify: `packages/core/src/components/progressbar/progressbar.ts`
- Modify: `packages/core/src/styles/themes/default.css`

**Interfaces:**

- Consumes: rien de nouveau.
- Produces: `ar-progressbar::part(container)`, `::part(label)`, `::part(percent)`,
  `::part(track)`, `::part(bar)` dans `default.css`. `--ar-progressbar-max-width` défini
  normalement dans `default.css :root` (comme tous les autres tokens du lot), consommé avec un
  repli `a11y-fallback` dans le composant — pas de mécanisme `functional-default` ici (réservé au
  cas `--ar-dialog-width`, piloté par attribut, cf. spec).

- [ ] **Step 1: Remplacer les sélecteurs de classe par des sélecteurs `[part=...]` dans**
      **`progressbar.styles.ts`, retirer `min-width`, migrer `max-width` en token interne**

Contenu actuel :

```css
:host {
    display: block;
    max-width: 500px;
    min-width: 200px;
    box-sizing: border-box;
}

.progressbar-container {
    display: flex;
    flex-direction: column;
    row-gap: 0.75rem;
}

.progress {
    display: inline-flex;
    position: relative;
    height: 0.5rem;
    background-color: var(--ar-progressbar-track-color, ButtonFace);
    border-radius: 50rem;
}

.progress-bar {
    background-color: var(--ar-progressbar-fill-color, ButtonText);
    border-radius: 50rem;
}

.progress-label {
    display: inline-flex;
    justify-content: space-between;
    flex-wrap: nowrap;
    column-gap: 2rem;
    margin: 0;
}

.progress-label .content-label {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
    text-overflow: ellipsis;
    word-break: break-all;
}

@media (min-width: 576px) {
    .progress-label .content-label {
        -webkit-line-clamp: none;
        line-clamp: none;
    }
}

.progress-label .progress-percent {
    color: var(--ar-progressbar-percent-color);
    flex-shrink: 0;
}
```

Nouveau contenu (classes → `[part=...]`, `min-width` retiré, `max-width` gagne un repli
`a11y-fallback`, `row-gap`/`column-gap`/`border-radius`/`percent-color` retirés — migrés Task 4
Step 3) :

```css
:host {
    display: block;
    box-sizing: border-box;
    /* a11y-fallback: sans plafond, .progress-label peut s'étirer sur un conteneur très large et éloigner visuellement le pourcentage de son label (lien a11y label/valeur) */
    max-width: var(--ar-progressbar-max-width, 500px);
}

[part='container'] {
    display: flex;
    flex-direction: column;
}

[part='track'] {
    display: inline-flex;
    position: relative;
    height: 0.5rem;
    background-color: var(--ar-progressbar-track-color, ButtonFace);
}

[part='bar'] {
    background-color: var(--ar-progressbar-fill-color, ButtonText);
}

[part='label'] {
    display: inline-flex;
    justify-content: space-between;
    flex-wrap: nowrap;
    margin: 0;
}

[part='label-text'] {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
    text-overflow: ellipsis;
    word-break: break-all;
}

@media (min-width: 576px) {
    [part='label-text'] {
        -webkit-line-clamp: none;
        line-clamp: none;
    }
}

[part='percent'] {
    flex-shrink: 0;
}
```

- [ ] **Step 2: Retirer les classes désormais mortes dans `progressbar.ts`**

Dans `render()` (ligne ~61-80), retirer les attributs `class="..."` maintenant redondants avec
`part="..."` :

```ts
return html` <div part="container" class="progressbar-container">
    <p part="label" id="progressbar-label" class="progress-label">
        <span part="label-text" class="content-label">
            <slot></slot>
        </span>
        <strong part="percent" class="progress-percent">${percentValue}%</strong>
    </p>
    <div part="track" class="progress d-inline-flex">
        <div
            part="bar"
            class="progress-bar"
            style=${styleMap({ width: percentValue + '%' })}
            role="progressbar"
            aria-labelledby="progressbar-label"
            aria-valuenow="${percentValue}"
            aria-valuemin="0"
            aria-valuemax="100"
        ></div>
    </div>
</div>`;
```

Devient :

```ts
return html` <div part="container">
    <p part="label" id="progressbar-label">
        <span part="label-text">
            <slot></slot>
        </span>
        <strong part="percent">${percentValue}%</strong>
    </p>
    <div part="track">
        <div
            part="bar"
            style=${styleMap({ width: percentValue + '%' })}
            role="progressbar"
            aria-labelledby="progressbar-label"
            aria-valuenow="${percentValue}"
            aria-valuemin="0"
            aria-valuemax="100"
        ></div>
    </div>
</div>`;
```

Vérifier que `d-inline-flex` (classe utilitaire de `utilitiesStyles`, retirée ici de `.progress`)
n'était pas nécessaire indépendamment de `[part='track']` — `display: inline-flex` reste déclaré
directement dans `[part='track']` (Step 1), donc aucune perte fonctionnelle.

- [ ] **Step 3: Réduire le bloc token `Progressbar` et ajouter `ar-progressbar { }` dans `default.css`**

Bloc `:root` réduit à 3 tokens (`percent-color` migré, `max-width` ajouté — token normal, pas de
mécanisme `functional-default`) :

```css
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Progressbar
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
--ar-progressbar-track-color: var(--ar-color-bg-subtle);
--ar-progressbar-fill-color: var(--ar-color-interactive);
--ar-progressbar-max-width: 500px;
```

Nouveau bloc après `ar-charcounter { }` (Task 3) :

```css
ar-progressbar {
    &::part(container) {
        row-gap: 0.75rem;
    }

    &::part(label) {
        column-gap: 2rem;
    }

    &::part(percent) {
        color: var(--ar-color-text-muted);
    }

    &::part(track),
    &::part(bar) {
        border-radius: 50rem;
    }
}
```

- [ ] **Step 4: Mettre à jour le JSDoc de `progressbar.ts`**

Bloc actuel (lignes ~30-32) :

```ts
 * @cssprop --ar-progressbar-track-color - Couleur du rail (fond). Repli `ButtonFace` si aucun thème n'est chargé (WCAG 1.4.11).
 * @cssprop --ar-progressbar-fill-color - Couleur de la progression. Repli `ButtonText` si aucun thème n'est chargé (WCAG 1.4.11) — distinct de `ButtonFace` pour garder rail et remplissage contrastés entre eux.
 * @cssprop --ar-progressbar-percent-color - Couleur du texte du pourcentage.
```

Remplacer par (retirer `percent-color`, ajouter `max-width`) :

```ts
 * @cssprop --ar-progressbar-track-color - Couleur du rail (fond). Repli `ButtonFace` si aucun thème n'est chargé (WCAG 1.4.11).
 * @cssprop --ar-progressbar-fill-color - Couleur de la progression. Repli `ButtonText` si aucun thème n'est chargé (WCAG 1.4.11) — distinct de `ButtonFace` pour garder rail et remplissage contrastés entre eux.
 * @cssprop --ar-progressbar-max-width - Largeur maximale du composant. Repli `500px` si aucun thème n'est chargé — sans plafond, le pourcentage peut s'éloigner visuellement de son label sur un conteneur très large.
```

- [ ] **Step 5: Vérifier le format et committer**

```bash
npx prettier --write packages/core/src/components/progressbar packages/core/src/styles/themes/default.css
git add packages/core/src/components/progressbar packages/core/src/styles/themes/default.css
git commit -m "refactor(progressbar): nettoie la nomenclature classes/part, migre percent-color/row-gap/column-gap/border-radius, ajoute le repli a11y sur max-width"
```

---

## Task 5: `ar-tab-group` — migrer `gap`

**Files:**

- Modify: `packages/core/src/components/tab-group/tab-group.styles.ts`
- Modify: `packages/core/src/components/tab-group/tab-group.ts`
- Modify: `packages/core/src/styles/themes/default.css`

**Interfaces:**

- Consumes: rien de nouveau.
- Produces: `ar-tab-group::part(base)` dans `default.css`.

- [ ] **Step 1: Retirer `gap` de `tab-group.styles.ts`**

```css
[part='base'] {
    display: flex;
    flex-direction: column;
    gap: var(--ar-tab-group-gap);
}
```

Devient :

```css
[part='base'] {
    display: flex;
    flex-direction: column;
}
```

- [ ] **Step 2: Réduire le token `--ar-tab-group-gap` dans `default.css`, ajouter `ar-tab-group { }`**

Dans le bloc `Tab` de `:root` (repéré Task 6), retirer la ligne `--ar-tab-group-gap: 0;` (garder
`border-color`/`border-top-width`/`border-bottom-width`, traités Task 6 avec le reste du bloc
`Tab`).

Nouveau bloc après `ar-progressbar { }` (Task 4) — laissé vide pour l'instant si Task 6 n'a pas
encore de contenu propre à `tabs` ; **fusionner directement dans le bloc `ar-tab-group { }` créé
ici** :

```css
ar-tab-group {
    &::part(base) {
        gap: 0;
    }
}
```

- [ ] **Step 3: Mettre à jour le JSDoc de `tab-group.ts`**

Retirer la ligne `@cssprop --ar-tab-group-gap - Espacement entre tablist et panels.` (ligne ~23).

- [ ] **Step 4: Vérifier le format et committer**

```bash
npx prettier --write packages/core/src/components/tab-group packages/core/src/styles/themes/default.css
git add packages/core/src/components/tab-group packages/core/src/styles/themes/default.css
git commit -m "refactor(tab-group): migre gap vers ::part(base)"
```

---

## Task 6: `ar-tab` — migration complète, part d'état `base--selected`, fix a11y `focus-ring-offset`

**Files:**

- Modify: `packages/core/src/components/tab/tab.styles.ts`
- Modify: `packages/core/src/components/tab/tab.ts`
- Modify: `packages/core/src/components/tab-group/tab-group.ts`
- Modify: `packages/core/src/styles/themes/default.css`

**Interfaces:**

- Consumes: rien de nouveau.
- Produces: nouvelle `@property active` sur `ArTab`, pilotée par `ar-tab-group._syncAll()`.
  `ar-tab { }` (border-radius/font-weight), `ar-tab::part(base)`, `ar-tab::part(base--selected)`,
  `ar-tab:hover:not([disabled]):not([active])::part(base)`, `ar-tab[disabled]` dans `default.css`.

- [ ] **Step 1: Ajouter la propriété `active` dans `tab.ts`**

Après la propriété `disabled` existante (ligne ~46) :

```ts
/**
 * Vrai quand l'onglet est actif (sélectionné).
 * @readonly Piloté par ar-tab-group — ne pas modifier directement.
 */
@property({ reflect: true, type: Boolean }) active = false;
```

Modifier `render()` (ligne ~88-90) :

```ts
override render() {
    return html`<div part="base${this.active ? ' base--selected' : ''}"><slot></slot></div>`;
}
```

- [ ] **Step 1bis: Piloter `active` depuis `ar-tab-group._syncAll()` dans `tab-group.ts`**

Dans `_syncAll()` (ligne ~154-171), ajouter l'assignation de propriété juste après
`tab.setAttribute('aria-selected', String(isActive));` (la sémantique ARIA reste posée telle
quelle — seule la réactivité visuelle change) :

```ts
tab.setAttribute('aria-selected', String(isActive));
tab.active = isActive;
```

- [ ] **Step 2: Réécrire `tab.styles.ts`**

Contenu actuel complet (cf. spec pour l'analyse détaillée) remplacé par :

```css
:host {
    display: inline-flex;
    cursor: pointer;
    white-space: nowrap;
    user-select: none;
}

[part='base'] {
    display: flex;
    align-items: center;
    /* a11y-fallback: sans thème, --ar-tab-bg reste transparent même par défaut — le padding est le seul mécanisme séparant visuellement des onglets adjacents ; sans lui les libellés se collent les uns aux autres */
    padding: var(--ar-tab-padding-y, 1rem) var(--ar-tab-padding-x, 1.5rem);
    border-radius: inherit;
    margin-block-start: calc(-1 * var(--ar-tab-group-border-top-width, 0px));
    margin-block-end: calc(-1 * var(--ar-tab-group-border-bottom-width, 0px));
}

:host([active]:not([disabled])) {
    cursor: default;
}

:host(:focus-visible) {
    outline: 2px solid var(--ar-tab-focus-ring-color, ButtonText);
    outline-offset: var(--ar-tab-focus-ring-offset, -2px);
}
```

Changements par rapport à l'original :

- `border-radius`/`font-weight` du `:host` retirés (migrés Step 3).
- `color`/`background` du `[part='base']` de base retirés (migrés Step 3).
- Bloc `:hover` entier retiré (migré Step 3, composition externe).
- Bloc `[aria-selected='true']` devient `[active]` (nouvel attribut réfléchi, Step 1), réduit —
  `color`/`background`/`box-shadow` retirés (migrés Step 3 pour color/bg ; `box-shadow` reste
  séparément, voir ci-dessous), seul `cursor: default` reste (état purement comportemental, pas
  un choix de design).
- `:host([disabled])` (cursor/opacity) retiré entièrement — `cursor: not-allowed` déplacé sur
  `:host([disabled])` en interne (reste, pas un token) et `opacity` migré (Step 3).
- `outline-offset` gagne son repli `-2px` (fix a11y, cf. spec).

**`box-shadow` de l'indicateur actif** : reste une exception WCAG 2.4.7 (repli déjà en place) —
ajouter une règle dédiée distincte de la simplification `[active]` ci-dessus :

```css
:host([active]) [part='base'] {
    /* a11y-fallback: indicateur d'onglet actif indiscernable sans thème (WCAG 2.4.7) */
    box-shadow: var(--ar-tab-active-shadow, inset 0 -2px 0 Highlight);
}
```

(fusionner avec `cursor: default` dans le même bloc `:host([active]:not([disabled]))` si le
sélecteur est identique — sinon garder 2 blocs séparés, l'un conditionné par `:not([disabled])`
pour `cursor`, l'autre non conditionné pour `box-shadow`, comme dans l'original).

- [ ] **Step 3: Réduire le bloc token `Tab` et ajouter `ar-tab { }` dans `default.css`**

Bloc `:root` actuel (voir Task 5 Step 2 pour le retrait de `--ar-tab-group-gap`) réduit à :

```css
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Tab
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
--ar-tab-padding-x: 1.5rem;
--ar-tab-padding-y: 1rem;

--ar-tab-active-shadow: inset 0 -2px 0 var(--ar-color-interactive);

--ar-tab-disabled-opacity: 0.5;
--ar-tab-focus-ring-offset: -2px;
--ar-tab-focus-ring-color: var(--ar-focus-ring-color);

--ar-tab-group-border-color: var(--ar-color-border);
--ar-tab-group-border-top-width: 0;
--ar-tab-group-border-bottom-width: 1px;
```

Changements : `color`/`bg`/`border-radius`/`font-weight`/`hover-color`/`hover-bg`/`active-color`/
`active-bg` retirés (migrés en littéral ci-dessous) ; `indicator-color`/`indicator-width` retirés
(inlinés directement dans `active-shadow`, plus jamais déclarés séparément — cf. spec, nettoyage
« tokens de composition jamais consommés »).

Nouveau bloc `ar-tab { }` — fusionné avec `ar-tab-group { }` créé Task 5, ou juste après :

```css
ar-tab {
    border-radius: 0;
    font-weight: var(--ar-font-weight-normal);

    &::part(base) {
        color: var(--ar-color-text-muted);
        background: transparent;
    }

    &::part(base--selected) {
        color: var(--ar-color-interactive);
        background: transparent;
    }

    &:hover:not([disabled]):not([active])::part(base) {
        color: var(--ar-color-text);
        background: var(--ar-color-bg-subtle);
    }
}

ar-tab[disabled] {
    opacity: var(--ar-tab-disabled-opacity);
}
```

- [ ] **Step 4: Mettre à jour le JSDoc de `tab.ts`**

Bloc `@cssprop`/note d'implémentation actuel (lignes ~16-37) remplacé par :

```ts
 * @csspart base - Wrapper du slot — padding, box-shadow actif. `base--selected` quand l'onglet est actif (propriété `active`, pilotée par ar-tab-group).
 *
 * @cssprop --ar-tab-padding-x - Padding horizontal.
 * @cssprop --ar-tab-padding-y - Padding vertical.
 * @cssprop --ar-tab-active-shadow - box-shadow complet sur part="base--selected" quand actif. Repli `inset 0 -2px 0 Highlight` si aucun thème n'est chargé — sans lui, l'onglet actif est visuellement indiscernable des autres.
 * @cssprop --ar-tab-disabled-opacity - Opacité de l'onglet désactivé.
 * @cssprop --ar-tab-focus-ring-offset - Décalage de la bague de focus. Valeur négative = inset (non coupée par le conteneur overflow du tab-group). Repli `-2px` si aucun thème n'est chargé — sans lui, l'anneau de focus peut être rogné par le conteneur `overflow-x: auto` du tab-group. Surcharge le token global --ar-focus-ring-offset pour ce composant.
 * @cssprop --ar-tab-focus-ring-color - Couleur de la bague de focus de l'onglet (cascade vers --ar-focus-ring-color). Repli `ButtonText` si aucun thème n'est chargé (WCAG 2.4.7).
 *
 * Note d'implémentation : la mise en page de [part='base'] compense la bordure de son parent
 * ar-tab-group via les tokens --ar-tab-group-border-top-width / --ar-tab-group-border-bottom-width
 * (déclarés et documentés sur ar-tab-group, cf. tab-group.ts) — pas des tokens propres à ar-tab.
 * Le fallback 0px est structurel (évite un décalage visuel si ar-tab est utilisé hors d'un
 * ar-tab-group) et reste volontaire.
```

Retirer les entrées `border-radius`/`font-weight`/`color`/`bg`/`hover-color`/`hover-bg`/
`active-color`/`active-bg`/`indicator-color`/`indicator-width` (migrées ou supprimées).

- [ ] **Step 5: Vérifier le format et committer**

```bash
npx prettier --write packages/core/src/components/tab packages/core/src/components/tab-group/tab-group.ts packages/core/src/styles/themes/default.css
git add packages/core/src/components/tab packages/core/src/components/tab-group/tab-group.ts packages/core/src/styles/themes/default.css
git commit -m "refactor(tab): ajoute la propriété active, migre tokens vers ::part(base)/::part(base--selected), corrige le repli focus-ring-offset manquant"
```

---

## Task 7: `ar-collapse` — aucun changement de code, documenter l'audit dans ADR-005

**Files:** aucun changement de code (audit confirmé : 0 candidat).

- [ ] **Step 1: Confirmer qu'aucune régression n'est possible**

Aucun fichier de `ar-collapse` n'est modifié dans ce lot — étape purement documentaire, traitée
Task 9 (mise à jour ADR-005).

---

## Task 8: Vérifier les tests, rebuild le manifeste, garde-fous CI

**Files:**

- Read-only check: tous les `*.test.ts`/`*.browser.test.ts`/`*.a11y.test.ts` des 6 composants.

**Interfaces:**

- Consumes: composants modifiés (Tasks 2-7).
- Produces: confirmation verte.

- [ ] **Step 1: Grep les assertions sensibles aux propriétés migrées**

```bash
grep -rn "class=\|classList\|querySelector('\.\|getComputedStyle" \
  packages/core/src/components/table-sort/*.test.ts \
  packages/core/src/components/charcounter/*.test.ts \
  packages/core/src/components/progressbar/*.test.ts \
  packages/core/src/components/tab-group/*.test.ts \
  packages/core/src/components/tab/*.test.ts
```

Pour chaque occurrence touchant une classe CSS retirée (`progressbar-container`, `progress-label`,
`content-label`, `progress`, `progress-bar`, `progress-percent`) ou un `part` désormais
conditionnel (`button`/`count`/`base`), adapter le test au nouveau sélecteur `[part=...]` (ou
`[part~=...]` pour les valeurs multi-tokens, cf. piège `happy-dom` déjà rencontré lot 6 — vérifier
`getPart`/`requirePart` dans `test-utils.ts` gèrent bien ce cas, déjà passés en `[part~=...]`
depuis le lot pagination).

- [ ] **Step 2: Lancer la suite Vitest des 6 composants**

Run: `npm run test --workspace=packages/core -- table-sort charcounter progressbar tab-group tab collapse`
Expected: tous les tests passent.

- [ ] **Step 3: Rebuild le manifeste CEM**

Run: `npm run build:manifest --workspace=packages/core`
Expected: succès. Vérifier spécifiquement :

- `validate-no-hardcoded-tokens.js` : le repli `var(--ar-progressbar-max-width, 500px)` doit
  passer grâce au commentaire `a11y-fallback` immédiatement précédent (Task 4 Step 1).
- `validate-part-state-order.js` : `::part(button)` avant `::part(button--pending)`
  (table-sort), `::part(count)` avant `::part(count--warning)`/`::part(count--error)`
  (charcounter), `::part(base)` avant `::part(base--selected)` (tab).
- `validate-cssprop-defaults.js` : aucun token `--ar-<composant>-*` dans `default.css :root` sans
  entrée `@cssprop` correspondante, et vice versa.

- [ ] **Step 4: Lancer la suite browser (WTR)**

Run: `npm run test:all --workspace=packages/core -- table-sort charcounter progressbar tab-group tab collapse`
Expected: tous les tests passent, y compris les `*.a11y.test.ts`.

- [ ] **Step 5: Commit (uniquement si le manifeste ou un test a été modifié)**

```bash
git add packages/core/custom-elements.json packages/core/src/components/**/*.test.ts
git commit -m "chore: régénère le manifeste et adapte les tests après migration lot 8"
```

---

## Task 9: Vérification visuelle manuelle + diff `getComputedStyle`

**Files:** aucun fichier modifié — vérification uniquement.

- [ ] **Step 1: Rebuild explicite de `packages/core`**

Run: `npm run build:dev --workspace=packages/core`
(piège `feedback_docs_dev_stale_dist` — `npm run dev --workspace=apps/docs` seul ne suffit pas).

- [ ] **Step 2: Lancer le serveur de doc**

Run: `npm run dev --workspace=apps/docs`.

- [ ] **Step 3: Diff `getComputedStyle` par composant, thème chargé**

Pour chacun des 5 composants modifiés (`table-sort`, `charcounter`, `progressbar`, `tab-group`,
`tab`), avec Playwright (`apps/docs/playwright.config.ts`) : ouvrir la page de démo, capturer
`getComputedStyle` des éléments concernés sur le commit `dev` (avant ce lot) et sur la branche,
comparer propriété par propriété (pas seulement une capture visuelle) :

- `table-sort` : `gap` (button/indicator), `cursor` en état pending.
- `charcounter` : `color`/`font-size` (état normal), `color`/`font-weight` (warning/error).
- `progressbar` : `row-gap`/`column-gap`/`border-radius`/`color` du pourcentage, `max-width`.
- `tab-group` : `gap`.
- `tab` : `border-radius`/`font-weight`/`color`/`background` (repos/hover/sélectionné),
  `box-shadow` (sélectionné), `opacity` (disabled), `outline-offset` (focus-visible).

Aucun écart attendu — les valeurs `default.css` sont inchangées, seul leur point de définition a
changé (sauf `max-width` du progressbar, nouveau token, et le nettoyage nomenclature progressbar
qui ne doit rien changer visuellement).

- [ ] **Step 4: Vérifier le rendu sans thème (fallback a11y)**

Charger une page sans `default.css` et confirmer :

- `ar-tab` : anneau de focus visible et non rogné (`outline-offset: -2px` désormais garanti par
  repli), onglet actif visible via `box-shadow` Highlight, padding présent entre onglets.
- `ar-progressbar` : `max-width: 500px` appliqué (repli `a11y-fallback`), rail/remplissage
  visibles (`ButtonFace`/`ButtonText`, déjà en place, non concernés par ce lot).
- `ar-charcounter` : graisse distincte en warning/error même sans couleur (repli déjà en place,
  non concerné par ce lot).

- [ ] **Step 5: Consigner le résultat**

Si un écart est trouvé, corriger le fichier concerné et refaire Steps 3-4.

---

## Task 10: Revue finale de branche

**Files:** aucun — revue uniquement.

- [ ] **Step 1: Dispatcher une revue de branche complète sur un agent capable**

Comparer l'intégralité du diff `dev...fix/lot8-token-vs-part-129` contre
`docs/decisions/ADR-005-tokens-pilotes-par-attribut.md` et
`docs/superpowers/specs/2026-08-05-lot8-token-vs-part-129-design.md`. Points d'attention
spécifiques à ce lot :

- `ar-tab-group._syncAll()` : `tab.active = isActive;` doit être posé pour **tous** les tabs à
  chaque appel (pas seulement celui qui devient actif) — sinon un onglet qui perd le focus actif
  garderait `active=true` indéfiniment (même piège que `aria-selected`, déjà géré correctement
  par la boucle `forEach` existante, à revérifier après l'ajout de la ligne).
- `ar-tab` : `:host([active]:not([disabled])) { cursor: default; }` — vérifier que la
  simplification du bloc `[active]` (Task 6 Step 2) n'a pas fusionné par erreur deux sélecteurs de
  spécificité différente de l'original.
- `ar-progressbar` : `min-width: 200px` supprimé sans remplacement — confirmer qu'aucun test/doc
  n'assumait cette valeur plancher.
- `ar-charcounter`/`ar-table-sort` : `part="..."` dynamique — vérifier qu'aucun test n'utilise un
  sélecteur `[part='count']`/`[part='button']` strict (`=`) qui casserait quand un second token
  est ajouté (doivent utiliser `[part~=...]`, cf. `test-utils.ts`).
- Cohérence exacte entre tokens retirés des composants et tokens retirés de `default.css` (aucun
  oubli, aucun résidu) sur les 5 composants modifiés.
- `--ar-tab-indicator-color`/`-indicator-width` : confirmer disparition complète (recherche
  `grep -rn` sur ces 2 noms hors `git log`) et que `--ar-tab-active-shadow` produit exactement la
  même valeur calculée qu'avant (`inset 0 -2px 0 var(--ar-color-interactive)` vs l'ancienne
  composition `calc(-1 * 2px)` + `var(--ar-color-interactive)` — équivalent).
- JSDoc `@cssprop`/`@csspart` cohérent avec l'implémentation finale sur les 5 composants.
- `npm run build:manifest` reste vert après tout fix.

- [ ] **Step 2: Corriger les findings en une vague unique**

Si des findings « Critical »/« Important » remontent, les corriger en un seul commit groupé, puis
relancer Task 8 Steps 2-4 et Task 9 pour re-vérifier.

---

## Task 11: Documenter le lot dans ADR-005

**Files:**

- Modify: `docs/decisions/ADR-005-tokens-pilotes-par-attribut.md`

**Interfaces:**

- Consumes: résultat final de Tasks 2-10.
- Produces: section « Application — lot 8 » à la suite de la dernière section existante
  (tooltip/panel, 2026-08-05/06).

- [ ] **Step 1: Ajouter une section résumant le lot**

Reprendre la structure des sections précédentes (ex. « Application — `ar-dropdown` (lot 5) ») :
résultat par composant (tokens migrés/conservés/supprimés), le cas `ar-collapse` (0 candidat,
critère 2 + indivisibilité du shorthand `transition`), le fix a11y `focus-ring-offset`, et le
nettoyage `indicator-color`/`indicator-width` comme nouvel exemple de « token de composition
jamais consommé par le composant ».

- [ ] **Step 2: Commit**

```bash
git add docs/decisions/ADR-005-tokens-pilotes-par-attribut.md
git commit -m "docs(adr-005): documente le lot 8 (table-sort, charcounter, progressbar, tab-group, tab, collapse)"
```

---

## Task 12: Créer la Pull Request

**Files:** aucun.

- [ ] **Step 1: Pousser la branche**

```bash
git push -u origin fix/lot8-token-vs-part-129
```

- [ ] **Step 2: Créer la PR vers `dev`**

```bash
gh pr create --base dev --title "refactor(table-sort,charcounter,progressbar,tab-group,tab): migre token vs ::part(), lot 8 (#129)" --body "$(cat <<'EOF'
## Summary
- `ar-table-sort` : migre gap/indicator-gap, ajoute le part d'état `button--pending`.
- `ar-charcounter` : migre color/font-size, ajoute les parts d'état `count--warning`/`count--error`.
- `ar-progressbar` : nettoie la nomenclature classes/part héritée, migre percent-color/row-gap/column-gap/border-radius, ajoute un repli a11y sur `max-width` (min-width retiré, mobile-first).
- `ar-tab-group` : migre gap.
- `ar-tab` : migration complète (border-radius, font-weight, color/bg base+hover+sélectionné via le nouveau part d'état `base--selected`, disabled), nettoie 2 tokens de composition jamais consommés par le composant (`indicator-color`/`-width`), corrige un repli a11y manquant sur `focus-ring-offset`.
- `ar-collapse` : audité, 0 migration possible (duration lu en JS, easing indivisible du même shorthand `transition`) — documenté dans ADR-005 pour clore le composant.

Spec : \`docs/superpowers/specs/2026-08-05-lot8-token-vs-part-129-design.md\`
Plan : \`docs/superpowers/plans/2026-08-06-lot8-token-vs-part-129.md\`

## Test plan
- [x] \`npm run test --workspace=packages/core\` (6 composants)
- [x] \`npm run build:manifest --workspace=packages/core\` (garde-fous CI verts)
- [x] Suite browser (WTR)
- [x] Diff \`getComputedStyle\` avant/après + vérification visuelle Playwright (avec et sans thème)
- [x] Revue finale de branche

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Confirmer avec l'utilisateur avant tout merge**

Ne pas merger sur `dev` sans confirmation explicite — signaler la PR créée et attendre la revue de
l'utilisateur (feedback_merge_after_autonomous_fix).

---

## Self-Review (déjà appliqué en rédigeant ce plan)

1. **Couverture de la spec** : les 6 sections de la spec (table-sort, charcounter, progressbar,
   tab-group, tab, collapse) sont couvertes respectivement par Tasks 2-7. Vérification (Task 8-9)
   et revue finale (Task 10) couvrent les exigences méthodologiques du chantier #129. Branche/PR
   couvertes par Tasks 1 et 12. Documentation ADR-005 couverte par Task 11 (nouveau par rapport
   aux plans précédents — les lots récents documentaient l'ADR au fil de l'eau en session plutôt
   qu'en tâche dédiée ; explicité ici pour un lot à 6 composants).
2. **Scan placeholders** : chaque step contient le contenu exact à écrire ou la commande exacte à
   lancer — sauf Task 6 Step 2 (fusion des blocs `[active]`), qui laisse un choix mineur
   d'implémentation (2 blocs vs 1) explicitement signalé comme tel plutôt que tranché à l'aveugle,
   car dépendant du rendu exact de Step 1.
3. **Cohérence des noms** : `part="base--selected"` (Task 6 Step 1, JS) correspond exactement à
   `::part(base--selected)` (Task 6 Step 3, CSS) et au JSDoc `@csspart` (Task 6 Step 4) ; même
   vérification faite pour `button--pending` (Task 2) et `count--warning`/`count--error` (Task 3).
4. **Ordre des tâches** : Task 5 (tab-group) précède Task 6 (tab) car Task 6 Step 3 retire la
   dernière ligne du bloc `:root` « Tab » partagé — dépendance explicite documentée dans Task 5
   Step 2 plutôt que dupliquée dans les deux tâches.
