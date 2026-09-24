# Migration `ar-stepper` token scopé vs `::part()` (lot 1, #129) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exposer 5 nouveaux `part=` sur `ar-stepper` (`list`, `step`, `substep`, `step-link`, `bullet`), migrer 12 tokens `--ar-stepper-*` à usage unique vers des règles `::part()` de `default.css`, et documenter le nouveau garde-fou trouvé (hover posé sur un part ancêtre, cible un part descendant différent) dans ADR-005.

**Architecture:** Reprend le pattern déjà établi par `ar-datepicker` (PR #137) : `default.css` déclare un bloc `ar-stepper { &::part(x) { ... } }` en nesting CSS natif (comme `ar-datepicker` en fin de fichier), le composant retire les déclarations correspondantes de `stepper.styles.ts` et perd les entrées `@cssprop` associées dans `stepper.ts`. Les nouveaux `part=` sont posés dans `stepper.renderer.ts`, comblant au passage un écart JSDoc/code préexistant (`list`/`step`/`substep`/`step-link` étaient documentés sans jamais avoir été posés).

**Tech Stack:** Lit 3 + TypeScript, CSS custom properties + nesting natif (`@layer ariane.theme` dans `packages/core/src/styles/themes/default.css`), `packages/core/scripts/validate-cssprop-defaults.js` (exécuté via `npm run build:manifest`).

## Global Constraints

- Aucun changement visuel par défaut : chaque règle `::part()` reprend exactement la valeur du token qu'elle remplace.
- CSS de `default.css` : utiliser le nesting natif (`&::part(x) { }`, `&::part(x):hover { }`) à l'intérieur d'un seul bloc `ar-stepper { }`, comme le bloc `ar-datepicker` existant (`packages/core/src/styles/themes/default.css:709-865`) — pas de sélecteurs répétés `ar-stepper::part(x)` à plat.
- Prettier : 100 caractères, 4 espaces, quotes simples (appliqué automatiquement par `lint-staged` au commit).
- Conventional Commits — chaque tâche se termine par un commit séparé.
- Ne jamais committer `packages/core/dist/`.
- Vérification par tâche : `npx vitest run stepper` (depuis `packages/core/`) pour la non-régression comportementale, et `npm run build:manifest --workspace=packages/core` (depuis la racine) pour valider la couverture `@cssprop`/`default.css`.
- Breaking change assumé (alpha, cf. CLAUDE.md) : un consommateur qui surchargeait un des 12 tokens migrés doit passer à une règle `::part()` directe.

---

## Task 1: Créer la branche de travail

**Files:** aucun.

- [ ] **Step 1: Créer la branche depuis `dev`**

```bash
git checkout dev
git pull
git checkout -b fix/stepper-token-vs-part-129
```

---

## Task 2: Exposer les 5 nouveaux `part=` dans `stepper.renderer.ts`

**Contexte:** Préalable structurel identifié dans l'audit #129 : seuls `trigger` et `panel`
sont exposés aujourd'hui. Comble aussi l'écart JSDoc/code trouvé pendant le brainstorming
(`list`/`step`/`substep`/`step-link` documentés dans `stepper.ts` mais jamais posés). Tâche
purement additive — aucun token n'est encore migré, aucun test existant ne casse.

**Important :** `part="step-link"` est posé **uniquement sur la branche `<a>`** (lien réel),
jamais sur la branche `<div>` (étape non cliquable). Les deux branches partagent la classe
`stepper-item-inner` mais pas la sémantique couleur — poser le part sur les deux appliquerait
par erreur `--ar-stepper-link-color` (migré en `::part(step-link)` à la Task 5) aux étapes non
cliquables, qui doivent garder `--ar-stepper-label-color` (token conservé, cf. spec).

**Files:**

- Modify: `packages/core/src/components/stepper/stepper.renderer.ts`
- Test: `packages/core/src/components/stepper/stepper.test.ts`

**Interfaces:** Aucune signature de fonction ne change — uniquement des attributs `part=`
ajoutés au template HTML rendu par `renderStepText`, `renderSubStep`, `renderStep`,
`renderStepList`.

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter dans `packages/core/src/components/stepper/stepper.test.ts`, à la fin du bloc
`describe('rendu', ...)` (après le test existant `'rend un <nav> avec part="nav"...'`,
juste avant la fermeture `});` de ce `describe` à la ligne 62) :

```ts
it('rend part="list" sur la liste des étapes', async () => {
    const el = await fixtureWithItems(`
                <ar-stepper current-path="/a">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);
    expect(shadow(el).querySelector('ol.stepper-list[part="list"]')).not.toBeNull();
});

it('rend part="step" sur un item de premier niveau et part="substep" sur une sous-étape', async () => {
    const el = await fixtureWithItems(`
                <ar-stepper current-path="/a/1">
                    <ar-stepper-item path="/a" label="Étape A">
                        <ar-stepper-item path="/a/1" label="Sous-étape 1"></ar-stepper-item>
                        <ar-stepper-item path="/a/2" label="Sous-étape 2"></ar-stepper-item>
                    </ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);
    const topLevel = shadow(el).querySelectorAll('ol.stepper-list > li[part="step"]');
    expect(topLevel.length).toBeGreaterThan(0);
    const nested = shadow(el).querySelectorAll('ol.stepper-list li[part="substep"]');
    expect(nested.length).toBe(2);
});

it('rend part="step-link" sur le lien d\'une étape complétée, jamais sur une étape non cliquable', async () => {
    const el = await fixtureWithItems(`
                <ar-stepper current-path="/b" mode="edit">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);
    const link = shadow(el).querySelector('a.stepper-link');
    expect(link?.getAttribute('part')).toBe('step-link');
    const currentItemInner = shadow(el).querySelector('li.active > .stepper-item-inner');
    expect(currentItemInner?.hasAttribute('part')).toBe(false);
});

it('rend part="bullet" sur la puce de chaque étape', async () => {
    const el = await fixtureWithItems(`
                <ar-stepper current-path="/a">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                </ar-stepper>
            `);
    expect(shadow(el).querySelector('.stepper-item-bullet[part="bullet"]')).not.toBeNull();
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run (depuis `packages/core/`) : `npx vitest run stepper`
Expected: FAIL — les 4 nouveaux tests échouent (`part` absent), le reste passe.

- [ ] **Step 3: Poser les `part=` dans `stepper.renderer.ts`**

Remplacer `renderStepText` :

```ts
function renderStepText(label: string, order: number, isSubstep = false): TemplateResult {
    return html`
        <span class="stepper-item-bullet" aria-hidden="true"></span>
        <span class="sr-only">${isSubstep ? 'sous-' : ''}étape ${order}:</span>
        <span class="stepper-item-label">${label}</span>
    `;
}
```

par :

```ts
function renderStepText(label: string, order: number, isSubstep = false): TemplateResult {
    return html`
        <span class="stepper-item-bullet" part="bullet" aria-hidden="true"></span>
        <span class="sr-only">${isSubstep ? 'sous-' : ''}étape ${order}:</span>
        <span class="stepper-item-label">${label}</span>
    `;
}
```

Remplacer `renderSubStep` :

```ts
return html`
    <li
        class="stepper-item${isActive ? ' active' : ''}"
        aria-current=${isActive ? 'step' : nothing}
    >
        ${isCompleted || isEditMode
            ? html`
                  <a
                      class="stepper-item-inner stepper-link"
                      data-substep-order=${order}
                      data-path=${sub.path}
                      href=${sub.href ?? '#'}
                      @click=${onClickLink}
                  >
                      ${renderStepText(sub.label, order, true)}
                  </a>
              `
            : html`
                  <div class="stepper-item-inner">${renderStepText(sub.label, order, true)}</div>
              `}
    </li>
`;
```

par :

```ts
return html`
    <li
        class="stepper-item${isActive ? ' active' : ''}"
        part="substep"
        aria-current=${isActive ? 'step' : nothing}
    >
        ${isCompleted || isEditMode
            ? html`
                  <a
                      class="stepper-item-inner stepper-link"
                      part="step-link"
                      data-substep-order=${order}
                      data-path=${sub.path}
                      href=${sub.href ?? '#'}
                      @click=${onClickLink}
                  >
                      ${renderStepText(sub.label, order, true)}
                  </a>
              `
            : html`
                  <div class="stepper-item-inner">${renderStepText(sub.label, order, true)}</div>
              `}
    </li>
`;
```

Remplacer `renderStep` :

```ts
    return html`
        <li
            class="stepper-item${active ? ' active' : ''}"
            aria-current=${active ? 'step' : nothing}
        >
            ${isCompleted
                ? html`
                      <a
                          class="stepper-item-inner stepper-link"
                          data-path=${step.path}
                          href=${step.href ?? '#'}
                          @click=${onClickLink}
                      >
                          ${renderStepText(step.label, order)}
                      </a>
                  `
                : html`
                      <div class="stepper-item-inner">${renderStepText(step.label, order)}</div>
                  `}
```

par :

```ts
    return html`
        <li
            class="stepper-item${active ? ' active' : ''}"
            part="step"
            aria-current=${active ? 'step' : nothing}
        >
            ${isCompleted
                ? html`
                      <a
                          class="stepper-item-inner stepper-link"
                          part="step-link"
                          data-path=${step.path}
                          href=${step.href ?? '#'}
                          @click=${onClickLink}
                      >
                          ${renderStepText(step.label, order)}
                      </a>
                  `
                : html`
                      <div class="stepper-item-inner">${renderStepText(step.label, order)}</div>
                  `}
```

Remplacer `renderStepList` :

```ts
return html`
    <ol class="stepper-list list-unstyled ${cssClass}">
        ${repeat(
            steps,
            (step) => step.path,
            (step, index) => renderStep(step, index, mode, onClickLink),
        )}
    </ol>
`;
```

par :

```ts
return html`
    <ol class="stepper-list list-unstyled ${cssClass}" part="list">
        ${repeat(
            steps,
            (step) => step.path,
            (step, index) => renderStep(step, index, mode, onClickLink),
        )}
    </ol>
`;
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run (depuis `packages/core/`) : `npx vitest run stepper`
Expected: PASS — tous les tests passent, y compris les 4 nouveaux.

- [ ] **Step 5: Vérifier la génération du manifest**

Run (depuis la racine du repo) : `npm run build:manifest --workspace=packages/core`
Expected: aucune erreur `validate-cssprop-defaults` (les nouveaux `part=` n'introduisent
aucun token, seul `@csspart bullet` sera ajouté à la Task 6 avec le reste du JSDoc).

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/components/stepper/stepper.renderer.ts packages/core/src/components/stepper/stepper.test.ts
git commit -m "feat(stepper): expose list/step/substep/step-link/bullet comme parts (#129)"
```

---

## Task 3: Migrer les tokens `trigger` vers `::part(trigger)`

**Files:**

- Modify: `packages/core/src/styles/themes/default.css`
- Modify: `packages/core/src/components/stepper/stepper.styles.ts`
- Modify: `packages/core/src/components/stepper/stepper.ts`

**Interfaces:** Aucune. Migration pure de 3 tokens (`trigger-radius`, `trigger-bg`,
`trigger-bg-hover`) vers une règle `ar-stepper::part(trigger)` nichée dans `default.css`.

- [ ] **Step 1: Retirer les 3 tokens de `default.css` et créer le bloc `ar-stepper`**

Dans la section `/* stepper */` de `default.css` (`packages/core/src/styles/themes/default.css:367-401`),
supprimer les lignes :

```css
--ar-stepper-trigger-radius: 0.75rem;
```

et (plus bas dans le même bloc) :

```css
--ar-stepper-trigger-bg: var(--ar-button-secondary-bg);
--ar-stepper-trigger-bg-hover: var(--ar-button-secondary-bg-hover);
```

Juste après la fermeture du bloc `ar-datepicker` en fin de fichier (`packages/core/src/styles/themes/default.css:864`,
avant le `}` final qui ferme `@layer ariane.theme`), ajouter un nouveau bloc :

```css
ar-stepper {
    &::part(trigger) {
        border-radius: 0.75rem;
        background-color: var(--ar-button-secondary-bg);
    }

    &::part(trigger):hover {
        background-color: var(--ar-button-secondary-bg-hover);
    }
}
```

- [ ] **Step 2: Retirer les déclarations correspondantes de `stepper.styles.ts`**

Remplacer (`packages/core/src/components/stepper/stepper.styles.ts:26-42`) :

```ts
    [part='trigger'] {
        padding: 0.5rem 0.75rem;
        border-radius: var(--ar-stepper-trigger-radius);
        justify-content: space-between;
        line-height: normal;
        text-align: left;
    }

    /* Tokens scopés au composant — .btn + [part='trigger'] pour dépasser
     * .btn-secondary dans button.styles.ts, indépendamment de l'ordre des styles. */
    [part='trigger'].btn.btn-secondary {
        background-color: var(--ar-stepper-trigger-bg);
    }

    [part='trigger'].btn.btn-secondary:hover {
        background-color: var(--ar-stepper-trigger-bg-hover);
    }
```

par :

```ts
    [part='trigger'] {
        padding: 0.5rem 0.75rem;
        justify-content: space-between;
        line-height: normal;
        text-align: left;
    }
```

(Le bloc `.btn.btn-secondary` dédié disparaît entièrement — sans thème chargé, le bouton
retombe sur le style `.btn-secondary` par défaut de `button.styles.ts`, fonctionnel.)

- [ ] **Step 3: Mettre à jour le JSDoc `@cssprop` et `@csspart`**

Dans `packages/core/src/components/stepper/stepper.ts`, supprimer les 3 lignes :

```ts
 * @cssprop --ar-stepper-trigger-bg - Fond du bouton trigger mobile.
 * @cssprop --ar-stepper-trigger-bg-hover - Fond du bouton trigger mobile au survol.
 * @cssprop --ar-stepper-trigger-radius - Border-radius du bouton trigger mobile.
```

- [ ] **Step 4: Lancer les tests du composant**

Run (depuis `packages/core/`) : `npx vitest run stepper`
Expected: tous les tests passent (aucune assertion sur la couleur/le radius du trigger).

- [ ] **Step 5: Vérifier la génération du manifest**

Run (depuis la racine du repo) : `npm run build:manifest --workspace=packages/core`
Expected: aucune erreur `validate-cssprop-defaults`.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/styles/themes/default.css packages/core/src/components/stepper/stepper.styles.ts packages/core/src/components/stepper/stepper.ts
git commit -m "refactor(stepper): migre trigger-radius/bg/bg-hover vers ::part(trigger) (#129)"
```

---

## Task 4: Migrer les tokens `panel` vers `::part(panel)`

**Files:**

- Modify: `packages/core/src/styles/themes/default.css`
- Modify: `packages/core/src/components/stepper/stepper.styles.ts`
- Modify: `packages/core/src/components/stepper/stepper.ts`

**Interfaces:** Aucune. Migration de 5 tokens (`panel-padding`, `panel-min-width`,
`panel-max-width`, `panel-border-radius`, `panel-shadow`). `panel-bg` et
`panel-border-color` restent des tokens (fallback WCAG `Canvas`/`ButtonBorder`, branche 1).

- [ ] **Step 1: Retirer les 5 tokens de `default.css` et compléter le bloc `ar-stepper`**

Dans la section `/* stepper */` de `default.css`, supprimer :

```css
--ar-stepper-panel-min-width: var(--ar-panel-min-width);
--ar-stepper-panel-max-width: var(--ar-panel-max-width);
```

et :

```css
--ar-stepper-panel-border-radius: var(--ar-panel-radius);
--ar-stepper-panel-shadow: var(--ar-panel-shadow);
```

et le commentaire + la ligne padding :

```css
/* Valeur propre (0.75rem), volontairement non cascadée depuis --ar-panel-padding :
           le panel disclosure du stepper a toujours eu un padding plus généreux que le
           défaut partagé (0.25rem) — même logique que --ar-dropdown-min-width. */
--ar-stepper-panel-padding: 0.75rem;
```

Dans le bloc `ar-stepper { }` créé à la Task 3, ajouter après `&::part(trigger):hover { }` :

```css
&::part(panel) {
    padding: 0.75rem;
    min-width: var(--ar-panel-min-width);
    max-width: var(--ar-panel-max-width);
    border-radius: var(--ar-panel-radius);
    box-shadow: var(--ar-panel-shadow);
}
```

(Les valeurs cascadent vers les mêmes tokens globaux qu'avant — `--ar-panel-min-width` etc.
— seule la couche d'alias `--ar-stepper-panel-*` disparaît. Le commentaire sur le padding
propre n'a plus lieu d'être : la valeur littérale `0.75rem` est directement dans la règle
`::part()`, son origine reste traçable dans l'historique git de cette migration.)

- [ ] **Step 2: Retirer les déclarations correspondantes de `stepper.styles.ts`**

Remplacer (`packages/core/src/components/stepper/stepper.styles.ts`, bloc `[part='panel']`) :

```ts
    [part='panel'] {
        padding: var(--ar-stepper-panel-padding);
        min-width: var(--ar-stepper-panel-min-width);
        max-width: var(--ar-stepper-panel-max-width);
        background-color: var(--ar-stepper-panel-bg, Canvas);
        border-color: var(--ar-stepper-panel-border-color, ButtonBorder);
        border-radius: var(--ar-stepper-panel-border-radius);
        box-shadow: var(--ar-stepper-panel-shadow);
    }
```

par :

```ts
    [part='panel'] {
        background-color: var(--ar-stepper-panel-bg, Canvas);
        border-color: var(--ar-stepper-panel-border-color, ButtonBorder);
    }
```

- [ ] **Step 3: Mettre à jour le JSDoc `@cssprop`**

Dans `stepper.ts`, supprimer les 5 lignes :

```ts
 * @cssprop --ar-stepper-panel-min-width - Largeur min du panel mobile (cascade vers --ar-panel-min-width).
 * @cssprop --ar-stepper-panel-max-width - Largeur max du panel mobile (cascade vers --ar-panel-max-width).
 * @cssprop --ar-stepper-panel-border-radius - Border-radius du panel mobile (cascade vers --ar-panel-radius).
 * @cssprop --ar-stepper-panel-shadow - Ombre portée du panel mobile (cascade vers --ar-panel-shadow).
 * @cssprop --ar-stepper-panel-padding - Padding interne du panel mobile (valeur propre, non cascadée depuis --ar-panel-padding).
```

Conserver `--ar-stepper-panel-bg` et `--ar-stepper-panel-border-color` (inchangés).

- [ ] **Step 4: Lancer les tests du composant**

Run (depuis `packages/core/`) : `npx vitest run stepper`
Expected: tous les tests passent.

- [ ] **Step 5: Vérifier la génération du manifest**

Run (depuis la racine du repo) : `npm run build:manifest --workspace=packages/core`
Expected: aucune erreur `validate-cssprop-defaults`.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/styles/themes/default.css packages/core/src/components/stepper/stepper.styles.ts packages/core/src/components/stepper/stepper.ts
git commit -m "refactor(stepper): migre padding/min-width/max-width/border-radius/shadow du panel vers ::part(panel) (#129)"
```

---

## Task 5: Migrer les tokens `link` vers `::part(step-link)`

**Files:**

- Modify: `packages/core/src/styles/themes/default.css`
- Modify: `packages/core/src/components/stepper/stepper.styles.ts`
- Modify: `packages/core/src/components/stepper/stepper.ts`

**Interfaces:** Aucune. Migration de 3 tokens (`link-color`, `link-hover-color`,
`link-focus-radius`). `:hover`/`:focus` s'appliquent directement sur l'élément `step-link`
lui-même (pas un ancêtre) — pattern déjà validé (cf. `alert::part(close):hover`).

- [ ] **Step 1: Retirer les 3 tokens de `default.css` et compléter le bloc `ar-stepper`**

Dans la section `/* stepper */`, supprimer :

```css
--ar-stepper-link-focus-radius: 0.125rem;
```

et :

```css
--ar-stepper-link-color: var(--ar-color-interactive);
--ar-stepper-link-hover-color: var(--ar-color-text-muted);
```

Dans le bloc `ar-stepper { }`, ajouter après `&::part(panel) { }` :

```css
&::part(step-link) {
    color: var(--ar-color-interactive);
}

&::part(step-link):hover,
&::part(step-link):focus {
    color: var(--ar-color-text-muted);
}

&::part(step-link):focus {
    border-radius: 0.125rem;
}
```

- [ ] **Step 2: Retirer les déclarations correspondantes de `stepper.styles.ts`**

Remplacer :

```ts
    .stepper-item .stepper-link {
        color: var(--ar-stepper-link-color);
        text-decoration: none;
    }
```

par :

```ts
    .stepper-item .stepper-link {
        text-decoration: none;
    }
```

Supprimer entièrement le bloc (sa seule déclaration, `color`, migre vers `::part(step-link)` —
il ne resterait rien d'autre à l'intérieur) :

```ts
    .stepper-item .stepper-link:focus,
    .stepper-item .stepper-link:hover {
        color: var(--ar-stepper-link-hover-color);
    }
```

Le bloc suivant, `.stepper-item .stepper-link:focus:before, .stepper-item .stepper-link:hover:before { background-color: var(--ar-stepper-link-hover-bullet-color); }`,
reste inchangé (token conservé, cf. spec).

Remplacer (bloc `:focus` du lien) :

```ts
    .stepper-item .stepper-link:focus {
        outline-offset: 4px;
        outline-color: var(--ar-stepper-link-focus-outline-color);
        border-radius: var(--ar-stepper-link-focus-radius);
    }
```

par :

```ts
    .stepper-item .stepper-link:focus {
        outline-offset: 4px;
        outline-color: var(--ar-stepper-link-focus-outline-color);
    }
```

- [ ] **Step 3: Mettre à jour le JSDoc `@cssprop`**

Dans `stepper.ts`, supprimer les 3 lignes :

```ts
 * @cssprop --ar-stepper-link-color - Couleur du texte du lien.
 * @cssprop --ar-stepper-link-hover-color - Couleur du texte du lien au survol.
 * @cssprop --ar-stepper-link-focus-radius - Border-radius de l'anneau de focus du lien.
```

- [ ] **Step 4: Lancer les tests du composant**

Run (depuis `packages/core/`) : `npx vitest run stepper`
Expected: tous les tests passent.

- [ ] **Step 5: Vérifier la génération du manifest**

Run (depuis la racine du repo) : `npm run build:manifest --workspace=packages/core`
Expected: aucune erreur `validate-cssprop-defaults`.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/styles/themes/default.css packages/core/src/components/stepper/stepper.styles.ts packages/core/src/components/stepper/stepper.ts
git commit -m "refactor(stepper): migre link-color/link-hover-color/link-focus-radius vers ::part(step-link) (#129)"
```

---

## Task 6: Migrer `bullet-radius` vers `::part(bullet)` et finaliser le JSDoc `@csspart`

**Files:**

- Modify: `packages/core/src/styles/themes/default.css`
- Modify: `packages/core/src/components/stepper/stepper.styles.ts`
- Modify: `packages/core/src/components/stepper/stepper.ts`

**Interfaces:** Aucune. Dernier token migré (`bullet-radius`) + ajout de l'entrée
`@csspart bullet` (nouveau part sans équivalent JSDoc préalable, contrairement aux 4 autres).

- [ ] **Step 1: Retirer le token de `default.css` et compléter le bloc `ar-stepper`**

Dans la section `/* stepper */`, supprimer :

```css
--ar-stepper-bullet-radius: 0.75rem;
```

Dans le bloc `ar-stepper { }`, ajouter après le dernier `&::part(step-link):focus { }` :

```css
&::part(bullet) {
    border-radius: 0.75rem;
}
```

- [ ] **Step 2: Retirer la déclaration correspondante de `stepper.styles.ts`**

Remplacer (bloc `.stepper-item-bullet`) :

```ts
    .stepper-item-bullet {
        width: 2.25rem;
        height: 2.25rem;
        display: flex;
        flex-shrink: 0;
        justify-content: center;
        border-radius: var(--ar-stepper-bullet-radius);
        padding-bottom: 0.125rem;
        margin-right: 0.5rem;
        transform: translateY(1px);
        box-shadow: 0 0 0 1px var(--ar-stepper-bullet-border-color) inset;
        background-color: transparent;
    }
```

par :

```ts
    .stepper-item-bullet {
        width: 2.25rem;
        height: 2.25rem;
        display: flex;
        flex-shrink: 0;
        justify-content: center;
        padding-bottom: 0.125rem;
        margin-right: 0.5rem;
        transform: translateY(1px);
        box-shadow: 0 0 0 1px var(--ar-stepper-bullet-border-color) inset;
        background-color: transparent;
    }
```

- [ ] **Step 3: Mettre à jour le JSDoc `@cssprop` et `@csspart`**

Dans `stepper.ts`, supprimer la ligne :

```ts
 * @cssprop --ar-stepper-bullet-radius - Border-radius de la puce.
```

Dans le bloc `@csspart` (`stepper.ts:46-53`), ajouter une nouvelle entrée après `step-link` :

```ts
 * @csspart bullet       - La puce numérotée d'une étape.
```

- [ ] **Step 4: Lancer les tests du composant**

Run (depuis `packages/core/`) : `npx vitest run stepper`
Expected: tous les tests passent (81 tests + les 4 ajoutés en Task 2, aucun montant exact
requis — vérifier juste 0 échec).

- [ ] **Step 5: Vérifier la génération du manifest**

Run (depuis la racine du repo) : `npm run build:manifest --workspace=packages/core`
Expected: aucune erreur `validate-cssprop-defaults`, sortie se termine par
`Created new manifest.`

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/styles/themes/default.css packages/core/src/components/stepper/stepper.styles.ts packages/core/src/components/stepper/stepper.ts
git commit -m "refactor(stepper): migre bullet-radius vers ::part(bullet) (#129)"
```

---

## Task 7: Documenter le nouveau garde-fou dans ADR-005

**Contexte:** Le brainstorming a vérifié empiriquement (Playwright, Chromium réel) un
troisième pattern de cascade non couvert par les deux contraintes déjà documentées : un état
`:hover`/`:focus` posé sur un `part` **ancêtre** qui vise un `part` **descendant différent**
(`[part='step-link']:hover [part='bullet']`) est totalement neutralisé par une règle externe
`::part(bullet)`, au même titre qu'un état posé par une classe interne. Ce garde-fou explique
pourquoi `bullet-hover-bg`, `link-hover-bullet-color`, `link-hover-bullet-text-color` et
`link-hover-label-color` restent des tokens malgré un usage en apparence unique.

**Files:**

- Modify: `docs/decisions/ADR-005-tokens-pilotes-par-attribut.md`

**Interfaces:** aucune — documentation uniquement.

- [ ] **Step 1: Ajouter la contrainte 5 à la liste des contraintes techniques**

Dans `docs/decisions/ADR-005-tokens-pilotes-par-attribut.md`, après le point 4 de la liste
« **Contraintes techniques** qui limitent la branche 4 » (se terminant par
« … cas de réutilisation plus fort que le critère 3 (qui ne regarde que le même fichier). »,
juste avant la ligne `**\`:host\` n'est plus une exclusion en soi\*\*…`), ajouter :

```markdown
5. **État posé sur un `part` ancêtre, ciblant un `part` descendant différent** (ex.
   `[part='step-link']:hover [part='bullet']`) → doit rester un token consommé à
   l'intérieur du composant, même raisonnement que la contrainte 2 mais sur deux éléments
   distincts plutôt qu'un seul. Vérifié empiriquement (Chromium réel, Playwright) sur
   `ar-stepper` : une règle externe `::part(bullet)` neutralise totalement la règle interne
   ancêtre→descendant, y compris au survol — le descendant reste figé sur la valeur externe
   même quand l'ancêtre est survolé. Concrètement : `--ar-stepper-bullet-hover-bg`,
   `--ar-stepper-link-hover-bullet-color`, `--ar-stepper-link-hover-bullet-text-color` et
   `--ar-stepper-link-hover-label-color` restent des tokens pour cette raison.
```

- [ ] **Step 2: Ajouter la ligne de statut de migration `ar-stepper`**

À la fin du fichier, après le paragraphe se terminant par « … Migration en cours, par lots,
sur `dev`. », ajouter :

```markdown
**Lot 1 — `ar-stepper` (2026-07-25)** : 12 tokens sur ~30 migrés vers 4 règles `::part()`
groupées (`trigger`, `panel`, `step-link`, `bullet` — 4 nouveaux `part` créés, dont 3
comblaient un écart JSDoc/code préexistant). 18 tokens conservés (fallback WCAG, lecture JS,
pseudo-éléments non ciblables, état interne, et le nouveau garde-fou hover ancêtre→descendant
ci-dessus). Détail complet :
`docs/superpowers/specs/2026-07-25-stepper-token-vs-part-design.md`.
```

- [ ] **Step 3: Commit**

```bash
git add docs/decisions/ADR-005-tokens-pilotes-par-attribut.md
git commit -m "docs(adr): documente le garde-fou hover ancêtre/descendant, statut migration ar-stepper (#129)"
```

---

## Task 8: Revue finale de branche et ouverture de la PR

**Files:** aucun (vérification uniquement).

- [ ] **Step 1: Lancer la suite complète**

Run (depuis la racine du repo) :

```bash
npm run test
npm run build:manifest --workspace=packages/core
```

Expected: tout passe, aucune régression sur les autres composants (le manifest revalide
l'intégralité de `default.css`, pas seulement `stepper`).

- [ ] **Step 2: Vérification empirique Playwright du rendu réel (pas seulement les tests unitaires)**

Lancer le site de doc et vérifier visuellement `ar-stepper` (mobile + desktop, étape active,
survol du lien, focus clavier) avec `default.css` chargé — confirmer qu'aucune régression
visuelle n'est introduite par les 4 nouvelles règles `::part()`.

```bash
npm run dev
```

Naviguer vers la page de démo `ar-stepper`, vérifier : radius du trigger mobile, fond du
panel, couleur du lien au survol/focus, radius de la puce — tous identiques à avant la
migration.

- [ ] **Step 3: Ouvrir la Pull Request vers `dev`**

```bash
git push -u origin fix/stepper-token-vs-part-129
gh pr create --base dev --title "refactor(stepper): migre token vs ::part() (lot 1, #129)" --body "$(cat <<'EOF'
## Summary
- Expose 5 nouveaux parts (`list`, `step`, `substep`, `step-link`, `bullet`) sur ar-stepper, comblant un écart JSDoc/code préexistant.
- Migre 12 tokens à usage unique vers 4 règles `::part()` groupées dans default.css (trigger, panel, step-link, bullet).
- Documente un nouveau garde-fou ADR-005, vérifié empiriquement en Playwright : un état hover posé sur un part ancêtre ne peut pas piloter un part descendant différent via ::part() externe.

## Test plan
- [ ] `npx vitest run stepper` passe (tests existants + 4 nouveaux sur les parts)
- [ ] `npm run build:manifest --workspace=packages/core` sans erreur
- [ ] Vérification visuelle manuelle (trigger, panel, lien hover/focus, puce) inchangée avec default.css chargé

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Ne pas merger sans confirmation explicite de l'utilisateur** (cf. `feedback_merge_after_autonomous_fix`).
