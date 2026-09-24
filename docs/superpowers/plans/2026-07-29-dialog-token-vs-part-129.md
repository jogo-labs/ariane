# Migration token vs ::part() — ar-dialog (issue #129, lot 3b) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Appliquer à `ar-dialog` le critère token-vs-`::part()` déjà appliqué à `ar-stepper`/`ar-datepicker`/`ar-alert` (#129), en poussant l'audit au-delà du seul axe token-vs-part : chaque déclaration cosmétique est aussi testée contre le rendu natif du navigateur (supprimer purement si redondant), et deux bugs réels découverts pendant l'audit sont corrigés dans la foulée (backdrop invisible sans thème, largeur non mobile-first). Le bouton de fermeture est entièrement repensé sur le modèle du bouton close d'`ar-alert` (bien plus simple que le `.btn.btn-tertiary` actuel), et la taxonomie `size` suit le même chemin que le `variant` d'`ar-alert` (PR #143) : seule une taille par défaut reste dans le composant, les paliers nommés deviennent une opinion du thème.

**Architecture:**

- **Bug fix a11y** : `--ar-dialog-backdrop` n'a aujourd'hui aucun fallback — sans thème, le voile derrière la modale est invisible (`::backdrop` natif = transparent par défaut). Ajout d'un fallback `rgba(0, 0, 0, 0.5)` justifié `a11y-fallback`.
- **Bug fix mobile-first** : la largeur du dialog (modal et drawer) n'atteint jamais 100% du viewport sur mobile aujourd'hui (marge artificielle de 2rem en modal, tokens de taille drawer parfois inférieurs au viewport). Conformément à CLAUDE.md (« toute décision... part du cas mobile »), le comportement par défaut (sans media query) devient plein écran, et le palier `@media (min-width: 576px)` (convention déjà utilisée par `progressbar.styles.ts:48`) réintroduit le comportement actuel (largeur contrainte par palier/marge).
- **Refonte du bouton close** : `buttonStyles`/`.btn.btn-tertiary.btn-ratio-square` retirés (n'étaient utilisés que par ce bouton) au profit d'un `[part='close']` bespoke, sur le modèle exact d'`ar-alert::part(close)` — taille tokenisée avec fallback WCAG 2.5.8 (`--ar-dialog-close-size, 2.5rem`), `outline` focus-visible autonome (pas de dépendance à `--ar-button-focus-ring-color`), fond en `color-mix(currentColor)` migré dans le thème. Les 4 tokens `--ar-dialog-close-bg*` (alias directs des tokens globaux `--ar-button-tertiary-*`, sans customisation propre) disparaissent — remplacés par 2 règles `::part(close)`/`::part(close):hover` dans `default.css`. Les gardes `:not(:disabled):not(.disabled):not([aria-disabled='true'])` disparaissent (le bouton n'est jamais désactivable, code mort confirmé par grep). Le commentaire `@EvolutionDesign` (résidu isolé, un seul hit dans tout le repo) disparaît. Ajout d'un `<slot name="close-icon">` (SVG par défaut en fallback), sur le modèle exact d'`ar-alert`, pour permettre le remplacement de l'icône — jusqu'ici impossible sur `ar-dialog`.
- **Migrations token → `::part()`** (candidats de l'audit initial, inchangés) : `shadow` → `::part(dialog)` ; `border-radius` → `::part(dialog)` en mode modal uniquement (`:not([mode='drawer'])`) ; `title-font-size` → `::part(title)`.
- **Suppression pure (pas de migration, ni composant ni thème)** : `font-weight`/`line-height`/`color` du `h1` — redondants avec le rendu natif (UA applique déjà `font-weight: bold`, aucune couleur explicite donc héritage déjà natif). Seul `margin: 0` reste (nécessaire, la marge UA du `h1` casserait l'alignement flex du header).
- **Étape 0 (valeurs littérales jamais tokenisées)** : `gap`/`padding` de `header` et `footer` → `::part(header)`/`::part(footer)`.
- **Externalisation de la taxonomie `size`** (nouveau, aligné sur `ar-alert` PR #143 découplage variant/role) : le composant ne garde qu'**une valeur littérale de repli par mode** (`500px` modal, `720px` drawer — pas de référence aux tokens `--ar-dialog-width-md`/`--ar-dialog-drawer-width-md` supprimés). Les 8 tokens `--ar-dialog-width-sm/md/lg/xl` et `--ar-dialog-drawer-width-sm/md/lg/xl` et les 8 règles `:host([size=...])`/`:host([mode='drawer'][size=...])` du composant disparaissent, remplacés par 6 règles `&[size='sm'/'lg'/'xl']`/`&[mode='drawer'][size='sm'/'lg'/'xl']` dans le thème (aucune règle `md` nécessaire, déjà la valeur de repli du composant). Sans thème, `size="sm"` n'a plus d'effet visible — symétrique avec `variant="warning"` sur `ar-alert` aujourd'hui, plus une exception isolée. Met à jour ADR-005 (section « Exception assumée : l'attribut `size` », désormais dépassée par un amendement).
- **Hors périmètre, tracé séparément** : les durées d'animation (ouverture/fermeture modal+drawer, shake) ne peuvent pas être externalisées par un simple split de shorthand — `::part()` ne peut pas être suivi d'un sélecteur de classe (`::part(dialog).opening` invalide), ce qui nécessiterait le pattern « part d'état » et des changements JS dans `_show()`/`_close()`/`_shake()`. Tracé dans [issue #144](https://github.com/jogo-labs/ariane/issues/144), pas dans ce lot.

**Tech Stack:** Lit 3, TypeScript, CSS natif avec nesting (`&::part()`, `&[attr]`), Vitest, `@web/test-runner` (navigateur réel), garde-fous CEM (`packages/core/scripts/validate-cssprop-defaults.js`, `validate-no-hardcoded-tokens.js`).

## Global Constraints

- Prettier : 100 caractères, 4 espaces, quotes simples (CLAUDE.md).
- Aucune valeur de design en dur dans `*.styles.ts` (`validate-no-hardcoded-tokens.js` fait échouer `npm run build:manifest` sinon) — toute valeur migrée doit disparaître entièrement de `dialog.styles.ts`, pas juste être renommée. Les fallbacks structurels/a11y littéraux (`500px`, `720px`, `2.5rem`, `rgba(0, 0, 0, 0.5)`) nécessitent le commentaire `a11y-fallback` immédiatement au-dessus **uniquement** quand ils accompagnent un `var(--ar-*, fallback)` — les valeurs de repli posées directement sur `--ar-dialog-width` (pas dans un `var()`) ne sont pas concernées par ce garde-fou (il cible les fallbacks de consommation `var(--x, y)`, pas les valeurs initiales de custom properties).
- Tout token `:root` de `default.css` appartenant à un composant doit avoir une entrée `@cssprop` dans son JSDoc (`validate-cssprop-defaults.js`) — mettre à jour `dialog.ts` en conséquence à chaque token ajouté/retiré.
- `npm run test --workspace=packages/core` et `npm run test:all` doivent passer avant toute revue finale.
- Ne jamais merger sur `dev` sans confirmation explicite de l'utilisateur (cf. `[[feedback_merge_after_autonomous_fix]]`, incident PR #137).
- Rebuild explicite (`npm run build:dev --workspace=packages/core`) obligatoire avant toute vérification Playwright d'un changement de renderer/thème (cf. `[[feedback_docs_dev_stale_dist]]`).

---

### Task 1 : Créer la branche et vérifier l'état de départ

**Files:** aucun fichier modifié dans cette tâche.

- [ ] **Step 1: Vérifier que `dev` est à jour et propre**

```bash
cd /Users/jon/Code/Active_projects/ariane
git status
git checkout dev
git pull origin dev
```

Expected: `git status` ne montre aucun fichier modifié avant le checkout ; `dev` à jour après le pull.

- [ ] **Step 2: Créer la branche de travail**

```bash
git checkout -b fix/dialog-token-vs-part-129
```

Expected: bascule sur la nouvelle branche, confirmé par `git branch --show-current`.

- [ ] **Step 3: Faire tourner la suite de tests existante comme référence avant modification**

```bash
npm run test --workspace=packages/core
```

Expected: tous les tests passent (baseline verte avant toute modification).

---

### Task 2 : Corriger le bug d'accessibilité — backdrop invisible sans thème

**Files:**

- Modify: `packages/core/src/components/dialog/dialog.styles.ts:49-53` (bloc `dialog::backdrop`)

**Interfaces:** aucune, tâche isolée.

Contexte : `background: var(--ar-dialog-backdrop);` n'a aujourd'hui aucun fallback. Sans thème chargé, `::backdrop` reste transparent (comportement UA par défaut) — la modale n'a alors aucune indication visuelle de voile derrière elle, ce qui est un vrai trou a11y/UX (perte de l'indication de modalité), pas juste un défaut esthétique.

- [ ] **Step 1 : Ajouter le fallback**

Bloc actuel (`dialog.styles.ts:49-53`) :

```css
dialog::backdrop {
    background: var(--ar-dialog-backdrop);
    opacity: 0;
    transition: opacity 0.25s ease;
}
```

Remplacer par :

```css
dialog::backdrop {
    /* a11y-fallback: sans thème chargé, le backdrop serait transparent (défaut UA de ::backdrop) — perte de l'indication visuelle de modalité */
    background: var(--ar-dialog-backdrop, rgba(0, 0, 0, 0.5));
    opacity: 0;
    transition: opacity 0.25s ease;
}
```

- [ ] **Step 2 : Régénérer le manifest**

```bash
npm run build:manifest --workspace=packages/core
```

Expected: succès — le commentaire `a11y-fallback` est détecté par le garde-fou `validate-no-hardcoded-tokens`, pas d'échec.

- [ ] **Step 3 : Commit**

```bash
git add packages/core/src/components/dialog/dialog.styles.ts packages/core/dist/custom-elements.json
git commit -m "fix(dialog): ajoute le fallback a11y manquant sur le backdrop (#129)"
```

---

### Task 3 : Corriger le bug mobile-first — largeur non pleine sur petit écran

**Files:**

- Modify: `packages/core/src/components/dialog/dialog.styles.ts:71-80` (bloc de base `dialog`)
- Modify: `packages/core/src/components/dialog/dialog.styles.ts:82-89` (bloc modal `:host(:not([mode='drawer'])) dialog`)
- Modify: `packages/core/src/components/dialog/dialog.styles.ts:99-108` (bloc drawer `:host([mode='drawer']) dialog`)

**Interfaces:** aucune interface consommée par une tâche suivante — indépendant du reste du plan.

Contexte : actuellement, le modal ne dépasse jamais `calc(100vw - 2rem)` (marge artificielle même sur mobile) et le drawer utilise `min(var(--ar-dialog-width), 100vw)` qui n'atteint pas 100% si le palier de taille (ex. `sm` = 360px) est inférieur au viewport (ex. 375px). Conformément au mobile-first de CLAUDE.md, le comportement par défaut (sans media query) doit être plein écran ; la marge/le plafond de taille devient une amélioration progressive au-delà de 576px (même convention que `progressbar.styles.ts:48`). `width: 100vw` étant identique pour les deux modes en dessous de 576px, cette portion commune est mutualisée dans la règle de base `dialog { }` plutôt que dupliquée dans les deux blocs spécifiques au mode.

- [ ] **Step 1 : Mutualiser `width: 100vw` dans la règle de base `dialog`**

Bloc actuel (`dialog.styles.ts:71-80`) :

```css
dialog {
    display: flex;
    flex-direction: column;
    border: none;
    padding: 0;
    overflow: hidden;
    background: var(--ar-dialog-bg, Canvas);
    color: var(--ar-dialog-color, CanvasText);
    box-shadow: var(--ar-dialog-shadow);
}
```

Remplacer par (ajout de `width: 100vw`, commun aux deux modes en dessous de 576px — `box-shadow` est toujours présent à ce stade, il sera retiré en Task 6, ne pas y toucher ici) :

```css
dialog {
    display: flex;
    flex-direction: column;
    border: none;
    padding: 0;
    overflow: hidden;
    background: var(--ar-dialog-bg, Canvas);
    color: var(--ar-dialog-color, CanvasText);
    box-shadow: var(--ar-dialog-shadow);
    /* Mobile-first : plein écran par défaut, commun aux deux modes. */
    width: 100vw;
}
```

- [ ] **Step 2 : Retirer la largeur dupliquée du bloc modal, garder ce qui est spécifique au mode**

Bloc actuel (`dialog.styles.ts:84-89`, après la Task précédente ce sera `82-89` sans le radius, cf. Task 5) :

```css
:host(:not([mode='drawer'])) dialog {
    border-radius: var(--ar-dialog-border-radius);
    /* max-width artificiel : la modale ne prend jamais toute la largeur même sur mobile */
    width: min(var(--ar-dialog-width), calc(100vw - 2rem));
    max-height: min(90vh, calc(100dvh - 2rem));
}
```

Remplacer (à ce stade `border-radius` est toujours présent — il sera retiré en Task 5, ne pas y toucher ici) par :

```css
:host(:not([mode='drawer'])) dialog {
    border-radius: var(--ar-dialog-border-radius);
    max-height: 100dvh;
}

@media (min-width: 576px) {
    :host(:not([mode='drawer'])) dialog {
        /* max-width artificiel : au-delà du mobile, la modale ne prend jamais toute la
           largeur — utile pour les paliers lg/xl sur les viewports moyens (tablette
           portrait, fenêtre desktop réduite) où le token de taille dépasse le viewport ;
           sans effet pratique sur sm/md, déjà plus étroits que calc(100vw - 2rem) à 576px. */
        width: min(var(--ar-dialog-width), calc(100vw - 2rem));
        max-height: min(90vh, calc(100dvh - 2rem));
    }
}
```

- [ ] **Step 3 : Retirer la largeur dupliquée du bloc drawer, garder ce qui est spécifique au mode**

Bloc actuel (`dialog.styles.ts:101-108`) :

```css
:host([mode='drawer']) dialog {
    /* Sur petit écran, le drawer peut occuper 100% de la largeur */
    width: min(var(--ar-dialog-width), 100vw);
    height: 100dvh;
    /* max-height: override le défaut UA qui plafonne à calc(100% - 6px - 2em) */
    max-height: 100dvh;
    margin: 0;
}
```

Remplacer par :

```css
:host([mode='drawer']) dialog {
    height: 100dvh;
    /* max-height: override le défaut UA qui plafonne à calc(100% - 6px - 2em) */
    max-height: 100dvh;
    margin: 0;
}

@media (min-width: 576px) {
    :host([mode='drawer']) dialog {
        width: min(var(--ar-dialog-width), 100vw);
    }
}
```

- [ ] **Step 4 : Régénérer le manifest**

```bash
npm run build:manifest --workspace=packages/core
```

Expected: succès, aucune erreur de garde-fou CEM.

- [ ] **Step 5 : Commit**

```bash
git add packages/core/src/components/dialog/dialog.styles.ts packages/core/dist/custom-elements.json
git commit -m "fix(dialog): rend modal et drawer réellement plein écran sur mobile (#129)"
```

---

### Task 4 : Refondre le bouton de fermeture (retrait de `.btn`, slot d'icône, simplification)

**Files:**

- Modify: `packages/core/src/components/dialog/dialog.ts:12` (retrait de l'import `buttonStyles`)
- Modify: `packages/core/src/components/dialog/dialog.ts:101` (retrait de `buttonStyles` du tableau `styles`)
- Modify: `packages/core/src/components/dialog/dialog.ts:51-87` (JSDoc classe — nouveau `@slot`, nouveaux/retirés `@cssprop`)
- Modify: `packages/core/src/components/dialog/dialog.ts:266-286` (template du bouton close)
- Modify: `packages/core/src/components/dialog/dialog.styles.ts:136-166` (header/button/svg) et `:190-211` (bloc close actuel, supprimé)
- Modify: `packages/core/src/components/dialog/dialog.styles.ts` (bloc `@media (prefers-reduced-motion: reduce)`, ajout de `[part='close']`)
- Modify: `packages/core/src/styles/themes/default.css` (retrait de 4 tokens `close-bg*`, ajout de 2 tokens `close-size`/`close-transition-duration`, création du bloc `ar-dialog { }` avec les règles `::part(close)`)

**Interfaces:**

- Consumes: rien d'une tâche précédente.
- Produces: bloc `ar-dialog { }` dans `default.css`, réutilisé par les Tasks 5-6-7-9.

- [ ] **Step 1 : Retirer l'import et l'usage de `buttonStyles`**

Dans `dialog.ts`, ligne 12, supprimer :

```ts
import buttonStyles from '../../styles/components/button.styles.js';
```

Ligne 101, remplacer :

```ts
static override styles: CSSResultGroup = [utilitiesStyles, resetStyles, buttonStyles, styles];
```

par :

```ts
static override styles: CSSResultGroup = [utilitiesStyles, resetStyles, styles];
```

- [ ] **Step 2 : Simplifier le template du bouton close et ajouter le slot d'icône**

Bloc actuel (`dialog.ts:266-286`) :

```html
<button part="close" type="button" class="btn btn-tertiary btn-ratio-square" data-ar-dismiss>
    <svg
        aria-hidden="true"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
    >
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"></path>
    </svg>
    <span class="btn-content sr-only">${this.closeLabel}</span>
</button>
```

Remplacer par (sur le modèle exact d'`ar-alert` — `<slot name="close-icon">` avec le SVG par défaut en fallback) :

```html
<button part="close" type="button" data-ar-dismiss>
    <slot name="close-icon">
        <svg
            aria-hidden="true"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
        >
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"></path>
        </svg>
    </slot>
    <span class="sr-only">${this.closeLabel}</span>
</button>
```

- [ ] **Step 3 : Documenter le nouveau slot et les tokens dans le JSDoc de la classe**

Dans `dialog.ts`, ajouter après la ligne `* @slot footer - ...` (ligne 56) :

```
 * @slot close-icon - Icône du bouton de fermeture. Remplace le SVG "×" par défaut.
```

Retirer les 4 lignes (fond du bouton close, remplacées par le nouveau design) :

```
 * @cssprop --ar-dialog-close-bg - Fond du bouton de fermeture.
 * @cssprop --ar-dialog-close-bg-hover - Fond du bouton de fermeture au survol.
 * @cssprop --ar-dialog-close-bg-pressed - Fond du bouton de fermeture pressé.
 * @cssprop --ar-dialog-close-bg-focus - Fond du bouton de fermeture au focus.
```

Ajouter à leur place :

```
 * @cssprop --ar-dialog-close-size - Taille (width/height) du bouton de fermeture.
 * @cssprop --ar-dialog-close-transition-duration - Durée de la transition (background-color) du bouton de fermeture au survol.
```

- [ ] **Step 4 : Remplacer le CSS du bouton et du SVG dans `dialog.styles.ts`**

Bloc actuel (`dialog.styles.ts:155-166`, à l'intérieur de la section header) :

```css
button {
    flex-shrink: 0;
    align-self: flex-start;
    /* @EvolutionDesign: taille forcée à 40×40 en attendant la migration vers la nouvelle charte */
    min-height: 2.5rem;
}

svg {
    width: 1.25rem;
    height: 1.25rem;
    flex-shrink: 0;
}
```

Remplacer par :

```css
[part='close'] {
    display: flex;
    align-items: center;
    justify-content: center;
    align-self: flex-start;
    flex-shrink: 0;
    /* a11y-fallback: WCAG 2.5.8 (Target Size Minimum) — sans thème chargé, le bouton perdrait sa taille de cible tactile */
    width: var(--ar-dialog-close-size, 2.5rem);
    /* a11y-fallback: WCAG 2.5.8 (Target Size Minimum) — sans thème chargé, le bouton perdrait sa taille de cible tactile */
    height: var(--ar-dialog-close-size, 2.5rem);
    padding: 0;
    border: none;
    cursor: pointer;
    transition: background-color var(--ar-dialog-close-transition-duration);
}

[part='close']:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
}

svg {
    width: 1.25rem;
    height: 1.25rem;
    flex-shrink: 0;
}
```

- [ ] **Step 5 : Retirer entièrement l'ancien bloc `[part='close'].btn.btn-tertiary`**

Bloc actuel (`dialog.styles.ts:190-211`) :

```css
/* ── Bouton de fermeture (tokens scopés au composant) ────────────────────
 * Sélecteurs volontairement plus spécifiques que .btn-tertiary dans
 * button.styles.ts (ajout de [part='close'].btn) pour gagner la cascade
 * indépendamment de l'ordre des styles. */

[part='close'].btn.btn-tertiary {
    background-color: var(--ar-dialog-close-bg);
}

[part='close'].btn.btn-tertiary:hover {
    background-color: var(--ar-dialog-close-bg-hover);
}

[part='close'].btn.btn-tertiary:not(:disabled):not(.disabled):not([aria-disabled='true']):active {
    background-color: var(--ar-dialog-close-bg-pressed);
}

[part='close'].btn.btn-tertiary:focus {
    background-color: var(--ar-dialog-close-bg-focus);
}
```

Supprimer ce bloc entièrement.

- [ ] **Step 6 : Ajouter `[part='close']` à la garde `prefers-reduced-motion`**

Bloc actuel (`dialog.styles.ts`, section `@media (prefers-reduced-motion: reduce)`) :

```css
@media (prefers-reduced-motion: reduce) {
    dialog,
    dialog::backdrop {
        animation: none !important;
        transition: none !important;
    }

    dialog.shake {
        animation: none;
        outline: 3px solid var(--ar-dialog-shake-outline-color);
        outline-offset: 2px;
    }
}
```

Remplacer par (ajout de `[part='close']` à la liste qui neutralise les transitions) :

```css
@media (prefers-reduced-motion: reduce) {
    dialog,
    dialog::backdrop,
    [part='close'] {
        animation: none !important;
        transition: none !important;
    }

    dialog.shake {
        animation: none;
        outline: 3px solid var(--ar-dialog-shake-outline-color);
        outline-offset: 2px;
    }
}
```

- [ ] **Step 7 : Retirer les 4 tokens `close-bg*` et ajouter les 2 nouveaux tokens dans `default.css`**

Dans le bloc `/* Dialog */` de `:root`, supprimer :

```css
--ar-dialog-close-bg: var(--ar-button-tertiary-bg);
--ar-dialog-close-bg-hover: var(--ar-button-tertiary-bg-hover);
--ar-dialog-close-bg-pressed: var(--ar-button-tertiary-bg-active);
--ar-dialog-close-bg-focus: var(--ar-button-tertiary-bg-focus);
```

Ajouter à leur place :

```css
--ar-dialog-close-size: 2.5rem;
--ar-dialog-close-transition-duration: var(--ar-button-transition-duration);
```

- [ ] **Step 8 : Créer le bloc `ar-dialog { }` en fin de `default.css` avec le design du bouton close**

Le fichier se termine actuellement par le bloc `ar-alert { ... }` puis la dernière accolade fermante de `@layer ariane.theme { :root { ... } ... }`. Insérer un nouveau bloc `ar-dialog { }` juste après la fermeture du bloc `ar-alert` (avant la dernière accolade fermante du `@layer`), sur le modèle exact d'`ar-alert::part(close)` :

```css
    ar-dialog {
        &::part(close) {
            color: currentColor;
            background-color: color-mix(in srgb, currentColor 8%, transparent);
        }

        &::part(close):hover {
            background-color: color-mix(in srgb, currentColor 20%, transparent);
        }
    }
}
```

(la dernière accolade `}` ci-dessus est celle, déjà existante, qui ferme `@layer ariane.theme`.)

- [ ] **Step 9 : Régénérer le manifest**

```bash
npm run build:manifest --workspace=packages/core
```

Expected: succès, aucune erreur de garde-fou CEM.

- [ ] **Step 10 : Commit**

```bash
git add packages/core/src/components/dialog/dialog.ts \
        packages/core/src/components/dialog/dialog.styles.ts \
        packages/core/src/styles/themes/default.css \
        packages/core/dist/custom-elements.json
git commit -m "refactor(dialog): simplifie le bouton close (retrait .btn, slot close-icon) (#129)"
```

---

### Task 5 : Migrer `--ar-dialog-border-radius` vers `::part(dialog)` (modal uniquement)

**Files:**

- Modify: `packages/core/src/components/dialog/dialog.styles.ts` (bloc `:host(:not([mode='drawer'])) dialog`, cf. Task 3)
- Modify: `packages/core/src/components/dialog/dialog.ts` (retrait de l'entrée `@cssprop --ar-dialog-border-radius`)
- Modify: `packages/core/src/styles/themes/default.css` (retrait du token `:root`, ajout de `&:not([mode='drawer'])::part(dialog) { border-radius: ...; }` dans le bloc `ar-dialog { }` créé en Task 4)

**Interfaces:**

- Consumes: bloc `ar-dialog { }` créé en Task 4 (Step 8).
- Produces: aucune interface consommée par une tâche suivante.

Contexte : après la Task 3, le bloc modal est désormais (le `width: 100vw` mobile-first a été mutualisé dans la règle de base `dialog { }`, ce bloc ne garde que ce qui est spécifique au mode modal) :

```css
:host(:not([mode='drawer'])) dialog {
    border-radius: var(--ar-dialog-border-radius);
    max-height: 100dvh;
}
```

- [ ] **Step 1 : Retirer `border-radius` de ce bloc**

```css
:host(:not([mode='drawer'])) dialog {
    max-height: 100dvh;
}
```

- [ ] **Step 2 : Retirer le token de `default.css`**

Supprimer la ligne `--ar-dialog-border-radius: var(--ar-border-radius-lg);` du bloc `/* Dialog */` de `:root`.

- [ ] **Step 3 : Ajouter la règle `::part(dialog)` conditionnelle dans le bloc `ar-dialog { }`**

Le bloc créé en Task 4 devient (ajout en tête, avant `&::part(close)`) :

```css
ar-dialog {
    &:not([mode='drawer'])::part(dialog) {
        border-radius: var(--ar-border-radius-lg);
    }

    &::part(close) {
        color: currentColor;
        background-color: color-mix(in srgb, currentColor 8%, transparent);
    }

    /* ... reste du bloc de la Task 4 inchangé ... */
}
```

- [ ] **Step 4 : Retirer l'entrée `@cssprop --ar-dialog-border-radius` du JSDoc de `dialog.ts`**

Supprimer la ligne :

```
 * @cssprop --ar-dialog-border-radius - Border-radius du dialog en mode modal (non-drawer) (cascade vers --ar-border-radius-lg).
```

- [ ] **Step 5 : Régénérer le manifest**

```bash
npm run build:manifest --workspace=packages/core
```

Expected: succès, aucune erreur de garde-fou CEM.

- [ ] **Step 6 : Commit**

```bash
git add packages/core/src/components/dialog/dialog.styles.ts \
        packages/core/src/components/dialog/dialog.ts \
        packages/core/src/styles/themes/default.css \
        packages/core/dist/custom-elements.json
git commit -m "refactor(dialog): migre border-radius vers ::part(dialog), mode modal uniquement (#129)"
```

---

### Task 6 : Migrer `--ar-dialog-shadow` vers `::part(dialog)`

**Files:**

- Modify: `packages/core/src/components/dialog/dialog.styles.ts:71-80` (bloc `dialog`)
- Modify: `packages/core/src/components/dialog/dialog.ts` (retrait de l'entrée `@cssprop --ar-dialog-shadow`)
- Modify: `packages/core/src/styles/themes/default.css` (retrait du token `:root`, ajout de `&::part(dialog) { box-shadow: ...; }` dans le bloc `ar-dialog { }`)

**Interfaces:**

- Consumes: bloc `ar-dialog { }` créé en Task 4.
- Produces: aucune interface consommée par une tâche suivante.

- [ ] **Step 1 : Retirer `box-shadow` du bloc `dialog` de `dialog.styles.ts`**

Bloc actuel (`dialog.styles.ts:71-80`) :

```css
dialog {
    display: flex;
    flex-direction: column;
    border: none;
    padding: 0;
    overflow: hidden;
    background: var(--ar-dialog-bg, Canvas);
    color: var(--ar-dialog-color, CanvasText);
    box-shadow: var(--ar-dialog-shadow);
}
```

Remplacer par :

```css
dialog {
    display: flex;
    flex-direction: column;
    border: none;
    padding: 0;
    overflow: hidden;
    background: var(--ar-dialog-bg, Canvas);
    color: var(--ar-dialog-color, CanvasText);
}
```

- [ ] **Step 2 : Retirer le token de `default.css`**

Supprimer la ligne `--ar-dialog-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 20px 50px -8px rgba(0, 0, 0, 0.2);` du bloc `/* Dialog */` de `:root`.

- [ ] **Step 3 : Ajouter la règle `::part(dialog)` dans le bloc `ar-dialog { }`**

Ajouter, après `&:not([mode='drawer'])::part(dialog) { border-radius: ... }` (Task 5) et avant `&::part(close)` (Task 4) :

```css
&::part(dialog) {
    box-shadow:
        0 4px 6px -1px rgba(0, 0, 0, 0.1),
        0 20px 50px -8px rgba(0, 0, 0, 0.2);
}
```

- [ ] **Step 4 : Retirer l'entrée `@cssprop --ar-dialog-shadow` du JSDoc de `dialog.ts`**

Supprimer la ligne :

```
 * @cssprop --ar-dialog-shadow - Ombre portée du dialog.
```

- [ ] **Step 5 : Régénérer le manifest**

```bash
npm run build:manifest --workspace=packages/core
```

Expected: succès, aucune erreur de garde-fou CEM.

- [ ] **Step 6 : Commit**

```bash
git add packages/core/src/components/dialog/dialog.styles.ts \
        packages/core/src/components/dialog/dialog.ts \
        packages/core/src/styles/themes/default.css \
        packages/core/dist/custom-elements.json
git commit -m "refactor(dialog): migre shadow vers ::part(dialog) (#129)"
```

---

### Task 7 : Migrer `title-font-size` vers `::part(title)` et supprimer le style cosmétique redondant du `h1`

**Files:**

- Modify: `packages/core/src/components/dialog/dialog.styles.ts:147-153` (bloc `h1`)
- Modify: `packages/core/src/components/dialog/dialog.ts` (retrait de l'entrée `@cssprop --ar-dialog-title-font-size`)
- Modify: `packages/core/src/styles/themes/default.css` (retrait du token `:root`, ajout de `&::part(title) { font-size: ...; }` dans le bloc `ar-dialog { }`)

**Interfaces:**

- Consumes: bloc `ar-dialog { }` créé en Task 4.
- Produces: aucune interface consommée par une tâche suivante.

Contexte : `font-weight: 600`, `line-height: 1.4` et `color: inherit` sont supprimés **purement** (ni composant, ni thème) — redondants avec le rendu natif (`h1` est `bold` par défaut dans tous les navigateurs ; aucune règle UA ne fixe de couleur sur `h1`, l'héritage est déjà natif). Seuls `margin: 0` (nécessaire à l'alignement flex du header) et `font-size` (migré vers `::part(title)`) sont conservés/migrés.

- [ ] **Step 1 : Simplifier le bloc `h1`**

Bloc actuel (`dialog.styles.ts:147-153`) :

```css
h1 {
    margin: 0;
    font-size: var(--ar-dialog-title-font-size);
    font-weight: 600;
    line-height: 1.4;
    color: inherit;
}
```

Remplacer par :

```css
h1 {
    margin: 0;
}
```

- [ ] **Step 2 : Retirer le token de `default.css`**

Supprimer la ligne `--ar-dialog-title-font-size: var(--ar-font-size-md);` du bloc `/* Dialog */` de `:root`.

- [ ] **Step 3 : Ajouter la règle `::part(title)` dans le bloc `ar-dialog { }`**

Ajouter, dans le bloc `ar-dialog { }` :

```css
&::part(title) {
    font-size: var(--ar-font-size-md);
}
```

- [ ] **Step 4 : Retirer l'entrée `@cssprop --ar-dialog-title-font-size` du JSDoc de `dialog.ts`**

Supprimer la ligne :

```
 * @cssprop --ar-dialog-title-font-size - Taille de police du titre (h1) (cascade vers --ar-font-size-md).
```

- [ ] **Step 5 : Régénérer le manifest**

```bash
npm run build:manifest --workspace=packages/core
```

Expected: succès, aucune erreur de garde-fou CEM.

- [ ] **Step 6 : Commit**

```bash
git add packages/core/src/components/dialog/dialog.styles.ts \
        packages/core/src/components/dialog/dialog.ts \
        packages/core/src/styles/themes/default.css \
        packages/core/dist/custom-elements.json
git commit -m "refactor(dialog): migre title-font-size vers ::part(title), retire le style h1 redondant avec le natif (#129)"
```

---

### Task 8 : Étape 0 — migrer les valeurs littérales jamais tokenisées de `header`/`footer`

**Files:**

- Modify: `packages/core/src/components/dialog/dialog.styles.ts:138-145` (bloc `header`)
- Modify: `packages/core/src/components/dialog/dialog.styles.ts:180-188` (bloc `footer`)
- Modify: `packages/core/src/styles/themes/default.css` (ajout de `&::part(header) { gap; padding; }` et `&::part(footer) { gap; padding; }` dans le bloc `ar-dialog { }`)

**Interfaces:**

- Consumes: bloc `ar-dialog { }` créé en Task 4.
- Produces: aucune interface consommée par une tâche suivante.

Contexte : `gap`/`padding` de `header` et `footer` n'ont jamais été des tokens `--ar-*` (valeurs littérales), mais l'étape 0 du critère ADR-005 impose de les relire au même titre que les tokens déjà nommés — cf. le précédent `ar-datepicker` (gap/weekday migrés en lot 2 alors qu'ils n'étaient pas dans l'audit initial). Ni réutilisées ≥2×, ni lues en JS, ni calibrées différemment en dark mode : candidates à la migration.

- [ ] **Step 1 : Retirer `gap`/`padding` du bloc `header` de `dialog.styles.ts`**

Bloc actuel (`dialog.styles.ts:138-145`) :

```css
header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 1.25rem 1.25rem 0;
    flex-shrink: 0;
}
```

Remplacer par :

```css
header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
}
```

- [ ] **Step 2 : Retirer `gap`/`padding` du bloc `footer` de `dialog.styles.ts`**

Bloc actuel (`dialog.styles.ts:180-188`) :

```css
footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 0.75rem;
    padding: 0 1.25rem 1.25rem;
    flex-shrink: 0;
}
```

Remplacer par :

```css
footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    flex-shrink: 0;
}
```

- [ ] **Step 3 : Ajouter les règles `::part(header)`/`::part(footer)` dans le bloc `ar-dialog { }`**

Ajouter, dans le bloc `ar-dialog { }` :

```css
&::part(header) {
    gap: 0.75rem;
    padding: 1.25rem 1.25rem 0;
}

&::part(footer) {
    gap: 0.75rem;
    padding: 0 1.25rem 1.25rem;
}
```

- [ ] **Step 4 : Régénérer le manifest**

```bash
npm run build:manifest --workspace=packages/core
```

Expected: succès, aucune erreur de garde-fou CEM (aucun `@cssprop` à retirer ici — ces valeurs n'ont jamais été des tokens documentés).

- [ ] **Step 5 : Commit**

```bash
git add packages/core/src/components/dialog/dialog.styles.ts \
        packages/core/src/styles/themes/default.css \
        packages/core/dist/custom-elements.json
git commit -m "refactor(dialog): migre gap/padding de header et footer vers ::part() (#129)"
```

---

### Task 9 : Externaliser la taxonomie `size` vers le thème (aligné sur `variant` d'`ar-alert`, PR #143)

**Files:**

- Modify: `packages/core/src/components/dialog/dialog.styles.ts:7-45` (bloc `:host` et tailles)
- Modify: `packages/core/src/components/dialog/dialog.ts:148-156` (JSDoc de la propriété `size`)
- Modify: `packages/core/src/components/dialog/dialog.ts` (JSDoc classe — retrait de 8 `@cssprop`)
- Modify: `packages/core/src/styles/themes/default.css` (retrait de 8 tokens `:root`, ajout de 6 règles `&[size=...]`/`&[mode='drawer'][size=...]` dans le bloc `ar-dialog { }`)
- Modify: `docs/decisions/ADR-005-tokens-pilotes-par-attribut.md` (amendement de la section « Exception assumée : l'attribut `size` »)

**Interfaces:**

- Consumes: bloc `ar-dialog { }` créé en Task 4.
- Produces: aucune interface consommée par une tâche suivante.

Contexte : comme le `variant` d'`ar-alert` (PR #143), la taxonomie de tailles nommées (`sm`/`lg`/`xl`) devient une opinion du thème — le composant ne garde qu'**une seule valeur de repli littérale par mode** (fonctionnelle, pas cosmétique : contrairement au `variant` d'alert qui est purement une couleur, une largeur de dialog non contrainte casserait le layout, d'où la nécessité de garder un repli, contrairement à une suppression pure).

- [ ] **Step 1 : Simplifier le bloc `:host` de `dialog.styles.ts`**

Bloc actuel (`dialog.styles.ts:7-45`) :

```css
:host {
    display: block;

    /* Taille modale par défaut (md). Surchargeable par --ar-dialog-width sur l'instance. */
    --ar-dialog-width: var(--ar-dialog-width-md);
}

/* Tailles modal */
:host([size='sm']) {
    --ar-dialog-width: var(--ar-dialog-width-sm);
}
:host([size='md']) {
    --ar-dialog-width: var(--ar-dialog-width-md);
}
:host([size='lg']) {
    --ar-dialog-width: var(--ar-dialog-width-lg);
}
:host([size='xl']) {
    --ar-dialog-width: var(--ar-dialog-width-xl);
}

/* Tailles drawer — ont priorité sur les valeurs modal via la spécificité */
:host([mode='drawer']) {
    --ar-dialog-width: var(--ar-dialog-drawer-width-md);
}
:host([mode='drawer'][size='sm']) {
    --ar-dialog-width: var(--ar-dialog-drawer-width-sm);
}
:host([mode='drawer'][size='md']) {
    --ar-dialog-width: var(--ar-dialog-drawer-width-md);
}
:host([mode='drawer'][size='lg']) {
    --ar-dialog-width: var(--ar-dialog-drawer-width-lg);
}
:host([mode='drawer'][size='xl']) {
    --ar-dialog-width: var(--ar-dialog-drawer-width-xl);
}
```

Remplacer par :

```css
:host {
    display: block;

    /* Taille par défaut (repli fonctionnel sans thème) — les paliers sm/lg/xl sont
       une taxonomie fournie par default.css, pas une exigence du composant. */
    --ar-dialog-width: 500px;
}

/* Taille par défaut du drawer — a priorité sur la valeur modal via la spécificité */
:host([mode='drawer']) {
    --ar-dialog-width: 720px;
}
```

- [ ] **Step 2 : Retirer les 8 tokens de taille de `default.css` (`:root`)**

Supprimer ces 8 lignes du bloc `/* Dialog */` :

```css
--ar-dialog-width-sm: 360px;
--ar-dialog-width-md: 500px;
--ar-dialog-width-lg: 800px;
--ar-dialog-width-xl: 1140px;
--ar-dialog-drawer-width-sm: 360px;
--ar-dialog-drawer-width-md: 720px;
--ar-dialog-drawer-width-lg: 960px;
--ar-dialog-drawer-width-xl: 1440px;
```

- [ ] **Step 3 : Ajouter les 6 règles de taxonomie dans le bloc `ar-dialog { }`**

Ajouter, dans le bloc `ar-dialog { }` (aucune règle `md` nécessaire — déjà la valeur de repli du composant) :

```css
&[size='sm'] {
    --ar-dialog-width: 360px;
}
&[size='lg'] {
    --ar-dialog-width: 800px;
}
&[size='xl'] {
    --ar-dialog-width: 1140px;
}

&[mode='drawer'][size='sm'] {
    --ar-dialog-width: 360px;
}
&[mode='drawer'][size='lg'] {
    --ar-dialog-width: 960px;
}
&[mode='drawer'][size='xl'] {
    --ar-dialog-width: 1440px;
}
```

- [ ] **Step 4 : Retirer les 8 entrées `@cssprop` correspondantes du JSDoc de `dialog.ts`**

Supprimer :

```
 * @cssprop --ar-dialog-width-sm - Largeur du dialog modal, taille `sm`.
 * @cssprop --ar-dialog-width-md - Largeur du dialog modal, taille `md`.
 * @cssprop --ar-dialog-width-lg - Largeur du dialog modal, taille `lg`.
 * @cssprop --ar-dialog-width-xl - Largeur du dialog modal, taille `xl`.
 * @cssprop --ar-dialog-drawer-width-sm - Largeur du drawer, taille `sm`.
 * @cssprop --ar-dialog-drawer-width-md - Largeur du drawer, taille `md`.
 * @cssprop --ar-dialog-drawer-width-lg - Largeur du drawer, taille `lg`.
 * @cssprop --ar-dialog-drawer-width-xl - Largeur du drawer, taille `xl`.
```

(`--ar-dialog-width` reste documenté, inchangé — c'est toujours le point de surcharge direct.)

- [ ] **Step 5 : Mettre à jour le JSDoc de la propriété `size`**

Bloc actuel (`dialog.ts:148-156`) :

```ts
/**
 * Taille du dialog. Les valeurs correspondent à des largeurs CSS prédéfinies.
 * Utilisez `--ar-dialog-width` pour une valeur personnalisée.
 *
 * @attr size
 * @default 'md'
 */
@property({ reflect: true, type: String })
size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
```

Remplacer le commentaire par :

```ts
/**
 * Taille du dialog. Les paliers `sm`/`lg`/`xl` sont définis par le thème —
 * sans thème chargé, seule la taille par défaut du composant s'applique.
 * Utilisez `--ar-dialog-width` pour une valeur personnalisée, indépendamment du thème.
 *
 * @attr size
 * @default 'md'
 */
@property({ reflect: true, type: String })
size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
```

- [ ] **Step 6 : Amender ADR-005 — la section « Exception assumée » est dépassée**

Dans `docs/decisions/ADR-005-tokens-pilotes-par-attribut.md`, ajouter en toute fin de fichier (après le dernier amendement existant) :

```markdown
## Amendement (2026-07-29) : externalisation de la taxonomie `size` (lot 3b, #129)

La section « Exception assumée : l'attribut `size` » ci-dessus est dépassée. À la lumière du
découplage variant/role d'`ar-alert` (PR #143) et de l'application stricte du critère
crucial-vs-cosmétique sur `ar-dialog` (lot 3b, #129), la même incohérence a été relevée :
il n'y a pas de raison de traiter la taxonomie de tailles d'`ar-dialog` différemment de la
taxonomie de couleurs d'`ar-alert`.

Nuance par rapport à `variant` (qui est purement cosmétique) : la largeur d'un dialog est
fonctionnelle — un dialog sans aucune contrainte de largeur peut casser le layout. Le composant
garde donc **une seule valeur littérale de repli par mode** (`500px` modal, `720px` drawer,
directement sur `--ar-dialog-width`, sans intermédiaire de token), tandis que les paliers nommés
(`sm`/`lg`/`xl`) et leurs variantes drawer deviennent une opinion du thème (`default.css`),
exactement comme les 4 presets de `variant` sur `ar-alert`. Sans thème, `size="sm"` n'a plus
d'effet visible — symétrique avec `variant="warning"` sur `ar-alert` aujourd'hui, ce n'est plus
un cas isolé.
```

- [ ] **Step 7 : Régénérer le manifest**

```bash
npm run build:manifest --workspace=packages/core
```

Expected: succès, aucune erreur de garde-fou CEM.

- [ ] **Step 8 : Commit**

```bash
git add packages/core/src/components/dialog/dialog.styles.ts \
        packages/core/src/components/dialog/dialog.ts \
        packages/core/src/styles/themes/default.css \
        docs/decisions/ADR-005-tokens-pilotes-par-attribut.md \
        packages/core/dist/custom-elements.json
git commit -m "refactor(dialog): externalise la taxonomie size vers le theme, aligne sur variant d'alert (#129)"
```

---

### Task 10 : Vérification visuelle Playwright et suite de tests complète

**Files:** aucun fichier de code modifié — vérification uniquement (des tests existants peuvent nécessiter des ajustements si `dialog.test.ts` référence les classes `.btn`/`.btn-tertiary` retirées en Task 4).

**Interfaces:**

- Consumes: l'ensemble des changements des Tasks 2-9.

- [ ] **Step 1 : Rebuild explicite du JS de `packages/core` avant toute vérification navigateur**

```bash
npm run build:dev --workspace=packages/core
```

Expected: build réussi.

- [ ] **Step 2 : Lancer le site de doc et vérifier visuellement `ar-dialog` (modal ET drawer, mobile ET desktop)**

```bash
npm run dev --workspace=apps/docs
```

Ouvrir `http://localhost:4321/components/ar-dialog` (ou le port affiché) et vérifier à l'œil, en réduisant la fenêtre sous 576px de large ET au-dessus :

- **Mobile (< 576px)** : modal et drawer occupent 100% de la largeur (édge-to-edge), aucune marge résiduelle.
- **Desktop (≥ 576px)** : modal et drawer retrouvent leur comportement actuel (marge de 2rem en modal, paliers de taille en drawer).
- **Backdrop** : voile semi-transparent visible même en désactivant `default.css` (DevTools → désactiver la feuille de style) — vérifier que le fallback fonctionne.
- **Bouton de fermeture** : taille, fond au repos/survol, focus-visible (anneau `outline`) identiques visuellement à avant ; tester la personnalisation via `slot="close-icon"` sur une instance de test.
- **Titre** : taille de police identique à avant ; poids de police désormais celui du navigateur (`bold` natif au lieu de `600` — différence subtile attendue, pas une régression).
- **Tailles (`size="sm"/"lg"/"xl"`)** : identiques visuellement à avant (valeurs reprises telles quelles dans le thème) ; désactiver `default.css` et vérifier que `size="sm"` n'a alors plus d'effet (comportement attendu, symétrique à `variant` sur `ar-alert`).
- Vérifier dans les DevTools (`getComputedStyle`) que `::part(dialog)`, `::part(header)`, `::part(footer)`, `::part(title)`, `::part(close)` résolvent bien aux valeurs attendues.

Expected: aucune régression visuelle en desktop ; comportement plein écran correct en mobile ; dégradation gracieuse cohérente sans thème.

- [ ] **Step 3 : Faire tourner la suite de tests complète, ajuster les tests cassés par le retrait des classes `.btn`**

```bash
npm run test --workspace=packages/core
npm run test:all
```

Si `dialog.test.ts`/`dialog.browser.test.ts`/`dialog.a11y.test.ts` contiennent des assertions sur `class="btn btn-tertiary btn-ratio-square"` ou `class="btn-content sr-only"` sur le bouton close, les mettre à jour pour refléter le nouveau template (`<span class="sr-only">`, plus de classes `.btn*`).

Expected: tous les tests passent (Vitest + WTR navigateur) après ajustement éventuel.

- [ ] **Step 4 : Vérifier qu'aucune référence morte aux tokens/classes retirés ne subsiste**

```bash
grep -rn -- "--ar-dialog-shadow\|--ar-dialog-border-radius\|--ar-dialog-title-font-size\|--ar-dialog-close-bg\|--ar-dialog-width-sm\|--ar-dialog-width-md\|--ar-dialog-width-lg\|--ar-dialog-width-xl\|--ar-dialog-drawer-width" packages/core/src apps/docs/src
grep -rn "btn-tertiary\|btn-ratio-square\|btn-content" packages/core/src/components/dialog
```

Expected: aucune occurrence.

---

### Task 11 : Revue finale de branche et ouverture de la PR

**Files:** aucun nouveau fichier — revue + PR.

- [ ] **Step 1 : Diff complet de la branche pour auto-revue**

```bash
git diff dev...fix/dialog-token-vs-part-129
```

Vérifier : tous les tokens supprimés du `:root` de `default.css` correspondent aux entrées `@cssprop` supprimées de `dialog.ts` ; le bloc `ar-dialog { }` reproduit exactement les valeurs d'origine ; les deux media queries `@media (min-width: 576px)` (modal + drawer) restaurent bien le comportement pré-existant au-delà du mobile ; `--ar-dialog-spacing`, `--ar-dialog-backdrop` (avec son nouveau fallback), `--ar-dialog-bg`, `--ar-dialog-color`, `--ar-dialog-shake-outline-color` sont inchangés hormis le fallback backdrop.

- [ ] **Step 2 : Pousser la branche et ouvrir la PR vers `dev`**

```bash
git push -u origin fix/dialog-token-vs-part-129
gh pr create --base dev --title "refactor(dialog): migre token vs ::part(), simplifie close, corrige 2 bugs (lot 3b, #129)" --body "$(cat <<'EOF'
## Résumé

- **2 bugs corrigés** : backdrop invisible sans thème (fallback a11y manquant), largeur non mobile-first (modal/drawer n'atteignaient jamais 100% sur petit écran — comportement par défaut désormais plein écran, contraint à partir de 576px).
- **Bouton de fermeture entièrement repensé** : retrait de `.btn.btn-tertiary.btn-ratio-square`/`buttonStyles` (n'étaient utilisés que par ce bouton, dette confirmée — gardes `disabled`/`aria-disabled` jamais atteignables), remplacé par un `[part='close']` bespoke sur le modèle exact d'`ar-alert::part(close)` (taille tokenisée + fallback WCAG 2.5.8, focus-visible autonome). Ajout d'un `slot="close-icon"` (absent jusqu'ici, incohérent avec `ar-alert`).
- **Migrations token → `::part()`** : `shadow`, `border-radius` (mode modal), `title-font-size`, `gap`/`padding` de `header`/`footer` (jamais tokenisés, étape 0 de l'audit).
- **Suppression pure** (ni composant ni thème) : `font-weight`/`line-height`/`color` du `h1`, redondants avec le rendu natif du navigateur.
- **Taxonomie `size` externalisée vers le thème**, alignée sur le découplage `variant`/`role` d'`ar-alert` (PR #143) : le composant garde une seule taille de repli par mode (500px modal/720px drawer), les paliers `sm`/`lg`/`xl` sont désormais une opinion de `default.css`. ADR-005 amendé en conséquence.
- **Hors périmètre** (tracé séparément) : durées d'animation, cf. [issue #144](https://github.com/jogo-labs/ariane/issues/144) — nécessite le pattern « part d'état » et touche la logique JS de `_show`/`_close`/`_shake`.

## Test plan

- [ ] `npm run test --workspace=packages/core` vert
- [ ] `npm run test:all` vert
- [ ] `npm run build:manifest --workspace=packages/core` sans erreur de garde-fou
- [ ] Vérification visuelle mobile + desktop, modal + drawer, thémé + non-thémé (aucune régression, comportement plein écran mobile correct)
EOF
)"
```

Expected: PR créée, lien affiché.

- [ ] **Step 3 : Attendre la confirmation explicite de l'utilisateur avant tout merge**

Ne pas merger sur `dev` sans confirmation explicite — règle permanente depuis l'incident PR #137.

---

## Self-Review

**Spec coverage** :

- Bug backdrop → Task 2. ✅
- Bug mobile-first (modal + drawer) → Task 3. ✅
- Refonte bouton close (retrait `.btn`, slot icône, simplification) → Task 4. ✅
- Migration `border-radius` → Task 5. ✅
- Migration `shadow` → Task 6. ✅
- Migration `title-font-size` + suppression pure `font-weight`/`line-height`/`color` → Task 7. ✅
- Étape 0 (gap/padding header/footer) → Task 8. ✅
- Externalisation `size` + amendement ADR-005 → Task 9. ✅
- Durées d'animation explicitement hors périmètre, tracées en issue #144 → mentionné dans le header du plan et le corps de PR (Task 11), aucune tâche de code. ✅
- Vérification visuelle (mobile/desktop, thémé/non-thémé) + tests + ajustement des tests cassés par le retrait de `.btn` → Task 10. ✅
- Branche en Task 1, PR en dernière tâche → conforme à la convention du projet. ✅

**Placeholder scan** : aucun "TBD"/"implement later" — chaque step contient le code exact à écrire/retirer.

**Type consistency** : les noms de tokens (`--ar-dialog-close-size`, `--ar-dialog-close-transition-duration`, `--ar-dialog-border-radius`, `--ar-dialog-shadow`, `--ar-dialog-title-font-size`, `--ar-dialog-width*`, `--ar-dialog-drawer-width*`) et le nouveau slot `close-icon` sont utilisés de façon cohérente entre toutes les tâches ; le bloc `ar-dialog { }` de `default.css` est introduit en Task 4 et complété en Tasks 5/6/7/8/9 sans redéfinition contradictoire.
