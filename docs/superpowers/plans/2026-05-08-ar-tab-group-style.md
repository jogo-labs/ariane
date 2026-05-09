# ar-tab-group Style Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Appliquer l'ADR-004 sur ar-tab / ar-tab-group / ar-tab-panel — styles internes fixes, tokens CSS `--ar-tab-*`, thème par défaut.

**Architecture:** Trois couches par composant : (1) styles structurels/a11y non-surchargeables dans le Shadow DOM, (2) tokens `--ar-tab-*` déclarés avec fallback no-op dans les styles du composant, composés par le thème pour produire un rendu underline par défaut, (3) `::part()` déjà en place, aucun ajout. Le thème `default.css` expose les tokens ergonomiques (`--ar-tab-indicator-color`, `--ar-tab-indicator-width`) et compose `--ar-tab-active-shadow` à partir de ceux-ci.

**Tech Stack:** Lit 3, TypeScript, CSS custom properties, `default.css` sous `@layer ariane.theme`

**Spec de référence :** `docs/superpowers/specs/2026-05-08-ar-tab-group-style-design.md`
**ADR :** `docs/decisions/ADR-004-philosophie-style-composants.md`

---

## Fichiers concernés

| Fichier                                                      | Action                               |
| ------------------------------------------------------------ | ------------------------------------ |
| `packages/core/src/components/tab/tab.styles.ts`             | Modifier — appliquer tous les tokens |
| `packages/core/src/components/tab-group/tab-group.styles.ts` | Modifier — ajouter séparateur        |
| `packages/core/src/components/tab/tab.ts`                    | Modifier — ajouter `@cssprop` JSDoc  |
| `packages/core/src/components/tab-group/tab-group.ts`        | Modifier — ajouter `@cssprop` JSDoc  |
| `packages/core/src/styles/themes/default.css`                | Modifier — section `/* tab */`       |
| `apps/docs/src/content/components/ar-tab-group.mdx`          | Modifier — variante démo styling     |

---

## Task 1 : Styles `ar-tab` — tab.styles.ts

**Files:**

- Modify: `packages/core/src/components/tab/tab.styles.ts`

- [ ] **Remplacer le contenu de `tab.styles.ts` par les styles complets**

```typescript
import { css } from 'lit';

export default css`
    :host {
        display: inline-flex;
        cursor: pointer;
        white-space: nowrap;
        user-select: none;
        border-radius: var(--ar-tab-border-radius, 0);
        font-weight: var(--ar-tab-font-weight, inherit);
    }

    [part='base'] {
        display: flex;
        align-items: center;
        color: var(--ar-tab-color, inherit);
        background: var(--ar-tab-bg, transparent);
        padding: var(--ar-tab-padding-y, 0.5rem) var(--ar-tab-padding-x, 1rem);
        border-radius: inherit;
    }

    :host(:hover:not([disabled])) [part='base'] {
        color: var(--ar-tab-hover-color, inherit);
        background: var(--ar-tab-hover-bg, transparent);
    }

    :host([aria-selected='true']) [part='base'] {
        color: var(--ar-tab-active-color, inherit);
        background: var(--ar-tab-active-bg, transparent);
        box-shadow: var(--ar-tab-active-shadow, none);
    }

    :host([disabled]) {
        cursor: not-allowed;
        opacity: var(--ar-tab-disabled-opacity, 0.5);
    }

    :host(:focus-visible) {
        outline: 2px solid var(--ar-focus-ring-color, currentColor);
        outline-offset: var(--ar-focus-ring-offset, 2px);
    }
`;
```

Note : `color`, `background` et `box-shadow` sont sur `[part="base"]` et non sur `:host` pour qu'ils soient accessibles et surchargeables via `ar-tab::part(base)`. `border-radius` est sur `:host` et hérité par `[part="base"]` via `border-radius: inherit`.

- [ ] **Vérifier que les tests passent**

```bash
npm run test
```

Résultat attendu : `438 passed` (ou plus si des tests ont été ajoutés).

- [ ] **Commit**

```bash
git add packages/core/src/components/tab/tab.styles.ts
git commit -m "feat(tab): styles tokens — default, hover, actif, disabled, focus"
```

---

## Task 2 : Styles `ar-tab-group` — séparateur tablist/panels

**Files:**

- Modify: `packages/core/src/components/tab-group/tab-group.styles.ts`

- [ ] **Ajouter le séparateur sur `[part='nav']` dans `tab-group.styles.ts`**

Contenu complet du fichier après modification :

```typescript
import { css } from 'lit';

export default css`
    :host {
        display: block;
    }

    [part='base'] {
        display: flex;
        flex-direction: column;
        gap: var(--ar-tab-group-gap, 0);
    }

    [part='nav'] {
        overflow-x: auto;
        scrollbar-width: none;
        border-bottom: var(--ar-tab-group-border-width, 0) solid
            var(--ar-tab-group-border-color, transparent);
    }

    [part='nav']::-webkit-scrollbar {
        display: none;
    }

    [part='tabs'] {
        display: flex;
        flex-direction: row;
    }
`;
```

- [ ] **Vérifier que les tests passent**

```bash
npm run test
```

Résultat attendu : même nombre de tests passants qu'à la Task 1.

- [ ] **Commit**

```bash
git add packages/core/src/components/tab-group/tab-group.styles.ts
git commit -m "feat(tab-group): token séparateur --ar-tab-group-border-*"
```

---

## Task 3 : JSDoc `@cssprop` — tab.ts et tab-group.ts

**Files:**

- Modify: `packages/core/src/components/tab/tab.ts`
- Modify: `packages/core/src/components/tab-group/tab-group.ts`

- [ ] **Ajouter les `@cssprop` dans le JSDoc de `ArTab` (tab.ts)**

Remplacer le bloc JSDoc du composant (lignes 8–15 environ) par :

```typescript
/**
 * @summary Onglet déclencheur pour ar-tab-group.
 * @parent ar-tab-group
 * @display docs
 *
 * @slot - Libellé de l'onglet.
 *
 * @csspart base - Wrapper du slot — couleur, fond, padding, box-shadow actif.
 *
 * @cssprop [--ar-tab-color=inherit] - Couleur du texte (état par défaut).
 * @cssprop [--ar-tab-bg=transparent] - Fond (état par défaut).
 * @cssprop [--ar-tab-padding-x=1rem] - Padding horizontal.
 * @cssprop [--ar-tab-padding-y=0.5rem] - Padding vertical.
 * @cssprop [--ar-tab-border-radius=0] - Rayon de bordure (utile pour le style pill).
 * @cssprop [--ar-tab-font-weight=inherit] - Graisse du texte.
 * @cssprop [--ar-tab-hover-color=inherit] - Couleur du texte au survol.
 * @cssprop [--ar-tab-hover-bg=transparent] - Fond au survol.
 * @cssprop [--ar-tab-active-color=inherit] - Couleur du texte quand l'onglet est actif.
 * @cssprop [--ar-tab-active-bg=transparent] - Fond quand l'onglet est actif.
 * @cssprop [--ar-tab-active-shadow=none] - box-shadow complet sur part="base" quand actif. Le thème par défaut le compose depuis --ar-tab-indicator-color et --ar-tab-indicator-width.
 * @cssprop [--ar-tab-indicator-color=currentColor] - Couleur de l'indicateur actif (utilisé par le thème pour composer --ar-tab-active-shadow).
 * @cssprop [--ar-tab-indicator-width=2px] - Épaisseur de l'indicateur actif (utilisé par le thème pour composer --ar-tab-active-shadow).
 * @cssprop [--ar-tab-disabled-opacity=0.5] - Opacité de l'onglet désactivé.
 */
```

- [ ] **Ajouter les `@cssprop` dans le JSDoc de `ArTabGroup` (tab-group.ts)**

Remplacer le bloc JSDoc du composant (lignes 11–23 environ) par :

```typescript
/**
 * @summary Groupe d'onglets accessibles — pattern WAI-ARIA Tabs complet.
 * @display demo
 *
 * @slot - ar-tab et ar-tab-panel enfants.
 *
 * @csspart base - Conteneur racine.
 * @csspart nav  - Zone scrollable (overflow-x: auto).
 * @csspart tabs - div[role="tablist"].
 *
 * @cssprop [--ar-tab-group-gap=0] - Espacement entre tablist et panels.
 * @cssprop [--ar-tab-group-border-width=0] - Épaisseur du trait séparateur sous la tablist. Mettre à 1px pour l'activer.
 * @cssprop [--ar-tab-group-border-color=transparent] - Couleur du trait séparateur sous la tablist.
 *
 * @event {CustomEvent<{ active: string }>} ar-tab-group-change - Émis quand l'onglet actif change.
 */
```

- [ ] **Régénérer le Custom Elements Manifest**

```bash
npm run build:manifest
```

Résultat attendu : `custom-elements.json` mis à jour sans erreur.

- [ ] **Vérifier que les tests passent**

```bash
npm run test
```

- [ ] **Commit**

```bash
git add packages/core/src/components/tab/tab.ts packages/core/src/components/tab-group/tab-group.ts
git commit -m "docs(tab,tab-group): @cssprop JSDoc pour tous les tokens"
```

---

## Task 4 : Thème — section `ar-tab` dans `default.css`

**Files:**

- Modify: `packages/core/src/styles/themes/default.css`

- [ ] **Ajouter la section tab à la fin de la section `6. TOKENS COMPOSANTS`**

Juste avant la ligne `}` fermant `:root {` (après la dernière entrée, `--ar-table-padding-x: 1rem;`), ajouter :

```css
/* tab */
--ar-tab-color: var(--ar-color-text-muted);
--ar-tab-bg: transparent;
--ar-tab-padding-x: 1rem;
--ar-tab-padding-y: 0.5rem;
--ar-tab-border-radius: 0;
--ar-tab-font-weight: var(--ar-font-weight-normal);

--ar-tab-hover-color: var(--ar-color-text);
--ar-tab-hover-bg: transparent;

--ar-tab-active-color: var(--ar-color-interactive);
--ar-tab-active-bg: transparent;
--ar-tab-indicator-color: var(--ar-color-interactive);
--ar-tab-indicator-width: 2px;
--ar-tab-active-shadow: inset 0 calc(-1 * var(--ar-tab-indicator-width)) 0
    var(--ar-tab-indicator-color);

--ar-tab-disabled-opacity: 0.5;

--ar-tab-group-border-color: var(--ar-color-border);
--ar-tab-group-border-width: 0;
```

Aucune surcharge dark mode nécessaire : tous ces tokens référencent des tokens sémantiques (`--ar-color-interactive`, `--ar-color-text-muted`, `--ar-color-border`) qui sont déjà surchargés dans `:root[data-theme='dark']` et `@media (prefers-color-scheme: dark)`.

- [ ] **Vérifier que les tests passent**

```bash
npm run test
```

- [ ] **Commit**

```bash
git add packages/core/src/styles/themes/default.css
git commit -m "feat(theme): tokens ar-tab — underline par défaut via --ar-tab-active-shadow"
```

---

## Task 5 : Documentation MDX — variante styling

**Files:**

- Modify: `apps/docs/src/content/components/ar-tab-group.mdx`

- [ ] **Ajouter une variante `styled` dans le frontmatter**

Dans la liste `variants:`, après la variante `scroll-hints` existante, ajouter :

```yaml
- name: styled
  label: Avec thème personnalisé
  description: Les tokens `--ar-tab-*` permettent de changer le style de l'indicateur actif sans modifier le composant. Exemple — indicateur en haut (top border) et style pill.
  html: |
      <style>
          .demo-top ar-tab {
              --ar-tab-active-shadow: inset 0 3px 0 var(--ar-tab-indicator-color);
          }
          .demo-pill ar-tab {
              --ar-tab-active-shadow: none;
              --ar-tab-active-bg: var(--ar-color-interactive-subtle, #eaecfb);
              --ar-tab-border-radius: 9999px;
          }
      </style>
      <p style="margin-bottom: 0.5rem; font-weight: 500;">Top border</p>
      <div class="demo-top" style="margin-bottom: 1.5rem;">
          <ar-tab-group>
              <ar-tab panel="a">Premier</ar-tab>
              <ar-tab panel="b">Deuxième</ar-tab>
              <ar-tab panel="c">Troisième</ar-tab>
              <ar-tab-panel name="a">Panel A.</ar-tab-panel>
              <ar-tab-panel name="b">Panel B.</ar-tab-panel>
              <ar-tab-panel name="c">Panel C.</ar-tab-panel>
          </ar-tab-group>
      </div>
      <p style="margin-bottom: 0.5rem; font-weight: 500;">Pill</p>
      <div class="demo-pill">
          <ar-tab-group>
              <ar-tab panel="a">Premier</ar-tab>
              <ar-tab panel="b">Deuxième</ar-tab>
              <ar-tab panel="c">Troisième</ar-tab>
              <ar-tab-panel name="a">Panel A.</ar-tab-panel>
              <ar-tab-panel name="b">Panel B.</ar-tab-panel>
              <ar-tab-panel name="c">Panel C.</ar-tab-panel>
          </ar-tab-group>
      </div>
```

- [ ] **Vérifier que le build docs ne produit pas d'erreur**

```bash
npm run build --workspace=apps/docs 2>&1 | tail -20
```

Résultat attendu : build terminé sans erreur.

- [ ] **Commit**

```bash
git add apps/docs/src/content/components/ar-tab-group.mdx
git commit -m "docs(tab-group): variante styling — top border et pill via tokens"
```

---

## Task 6 : Vérification finale et push

- [ ] **Lancer la suite de tests complète**

```bash
npm run test:all
```

Résultat attendu : tous les tests Vitest + WTR passent, aucune régression.

- [ ] **Vérifier les tokens dans le Custom Elements Manifest**

```bash
npm run build:manifest && grep -A 5 '"--ar-tab-color"' packages/core/custom-elements.json
```

Résultat attendu : le token apparaît avec sa description dans le JSON généré.

- [ ] **Push**

```bash
git push
```
