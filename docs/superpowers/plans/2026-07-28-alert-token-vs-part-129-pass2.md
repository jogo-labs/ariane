# Migration token vs ::part() — ar-alert, 2ᵉ passe (issue #129, lot 3a bis) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compléter la migration token-vs-`::part()` d'`ar-alert` (déjà partiellement faite sur la branche `fix/alert-token-vs-part-129`, PR #142) avec les valeurs de design jamais tokenisées trouvées lors d'un second audit : `column-gap` du `:host`, l'intégralité du design de `[part='close']` (fond/survol/opacité/position), `font-size` de `[part='icon']`, la durée d'animation de sortie (`:host([hiding])`), et un nettoyage de code mort + un trou de documentation JSDoc.

**Architecture:** Continue sur la même branche `fix/alert-token-vs-part-129` (déjà poussée, PR #142 ouverte, pas mergée). Ajoute de nouveaux commits par-dessus. `alert.styles.ts` perd encore plusieurs propriétés qui deviennent des règles externes littérales dans le bloc `ar-alert { }` de `default.css` déjà créé au premier passage : `column-gap` (propriété `:host`), tout le design de `[part='close']` (`background-color`/`:hover`/`:focus-visible` opacity/`position`+`top`+`right`, sous `&::part(close)` + `&::part(close):hover` + `&::part(close):focus-visible`), `font-size` de `[part='icon']` (`&::part(icon)`), et les valeurs finales de l'état `[hiding]` (`opacity: 0`/`transform: scale(0.75)`, via une nouvelle règle `ar-alert[hiding] { }` — vérifié empiriquement, cf. Global Constraints). La durée de transition de sortie (`0.33s`, codée en dur aujourd'hui) devient un token interne `--ar-alert-hide-transition-duration` (comme `--ar-alert-close-transition-duration`, bloquée en interne par la contrainte 6 d'ADR-005 — reduced-motion). `position: relative` mort sur `:host` est retiré. `@csspart icon-svg` manquant est ajouté au JSDoc.

**Tech Stack:** Lit 3, TypeScript, CSS natif avec nesting (`&::part()`, sélecteurs d'attribut), Vitest, `@web/test-runner`, garde-fous CEM.

## Global Constraints

- Prettier : 100 caractères, 4 espaces, quotes simples.
- Aucune valeur de design en dur dans `*.styles.ts` sauf token consommé via `var()` — `validate-no-hardcoded-tokens.js` (`npm run build:manifest`) ne détecte que les assignations `--ar-*: littéral;`, pas les propriétés CSS ordinaires : cette passe est un audit manuel, pas automatisé.
- Tout token `:root` de `default.css` appartenant à un composant doit avoir une entrée `@cssprop` (`validate-cssprop-defaults.js`).
- **Vérifié empiriquement (Chromium/Playwright, avant ce plan)** : une règle externe conditionnée par un sélecteur d'attribut sur le tag (`ar-alert[hiding] { ... }`) suit le cascade CSS normal face à une règle `:host` interne inconditionnelle — contrairement au mécanisme `::part()`/tag non conditionné, elle ne l'emporte PAS automatiquement, elle se comporte comme n'importe quelle règle CSS standard. Testé avec la garde `@media (prefers-reduced-motion: reduce)` active sur la propriété `transition` (restée interne) : la garde reste effective (`transitionDuration: 0s` sous reduced-motion), et les valeurs finales externes s'appliquent correctement dans les deux cas. C'est ce qui rend cette migration sûre.
- Ne jamais merger sur `dev` sans confirmation explicite de l'utilisateur — la PR #142 reste ouverte, pas de merge dans ce plan.

---

### Task 1 : Vérifier l'état de la branche existante

**Files:** aucun fichier modifié.

- [ ] **Step 1 : Confirmer qu'on est sur la bonne branche, à jour**

```bash
cd /Users/jon/Code/Active_projects/ariane
git status
git branch --show-current
```

Expected : branche `fix/alert-token-vs-part-129`, aucun fichier modifié non commité.

- [ ] **Step 2 : Baseline de tests avant modification**

```bash
npm run test --workspace=packages/core
```

Expected : tous les tests passent (774/774 attendus, éventuellement plus si des tests ont été ajoutés depuis).

---

### Task 2 : Migrer `column-gap` et retirer `position: relative` mort du `:host`

**Files:**

- Modify: `packages/core/src/components/alert/alert.styles.ts` (bloc `:host`)
- Modify: `packages/core/src/styles/themes/default.css` (bloc `ar-alert { }`, actuellement lignes 917-926)

**Interfaces:**

- Consumes: bloc `ar-alert { }` existant (créé au premier passage de ce lot).
- Produces: bloc `ar-alert { }` enrichi de `column-gap`, réutilisé tel quel par les tâches suivantes qui y ajoutent d'autres propriétés/règles imbriquées.

- [ ] **Step 1 : Vérifier qu'aucun descendant n'utilise `position: absolute`, pour confirmer que `position: relative` du `:host` est bien mort**

```bash
grep -n "position: absolute" packages/core/src/components/alert/alert.styles.ts
```

Expected : aucune occurrence (confirme que rien ne dépend d'un contexte de positionnement posé par `:host`).

- [ ] **Step 2 : Modifier le bloc `:host` de `alert.styles.ts`**

Bloc actuel :

```css
:host {
    display: flex;
    box-sizing: border-box;
    column-gap: 0.75rem;
    position: relative;
    align-items: center;
    opacity: 1;
    transform: scale(1);
    color: var(--ar-alert-color);
}
```

Remplacer par (retire `column-gap` et `position: relative` — la propriété `column-gap` n'est plus déclarée par le composant du tout, `position: relative` est retiré car mort, aucun descendant n'en dépend) :

```css
:host {
    display: flex;
    box-sizing: border-box;
    align-items: center;
    opacity: 1;
    transform: scale(1);
    color: var(--ar-alert-color);
}
```

- [ ] **Step 3 : Ajouter `column-gap` au bloc `ar-alert { }` de `default.css`**

Bloc actuel (`default.css:917-926`) :

```css
ar-alert {
    padding: 1rem;
    border-radius: 0.75rem;
    border-width: 1px;
    border-style: solid;

    &::part(close) {
        border-radius: 7px;
    }
}
```

Remplacer par :

```css
ar-alert {
    padding: 1rem;
    border-radius: 0.75rem;
    border-width: 1px;
    border-style: solid;
    column-gap: 0.75rem;

    &::part(close) {
        border-radius: 7px;
    }
}
```

- [ ] **Step 4 : Régénérer le manifest**

```bash
npm run build:manifest --workspace=packages/core
```

Expected : succès, aucune erreur de garde-fou (aucun token n'est touché ici, juste une propriété CSS ordinaire déplacée).

- [ ] **Step 5 : Tests**

```bash
npm run test --workspace=packages/core
```

Expected : tous les tests passent, aucune régression (aucun test n'asserte sur `column-gap` ou `position`).

- [ ] **Step 6 : Commit**

```bash
git add packages/core/src/components/alert/alert.styles.ts packages/core/src/styles/themes/default.css
git commit -m "refactor(alert): migre column-gap, retire position:relative mort (#129)"
```

---

### Task 3 : Migrer le design de `[part='close']` (fond, survol, opacité, position)

**Files:**

- Modify: `packages/core/src/components/alert/alert.styles.ts` (bloc `[part='close']`)
- Modify: `packages/core/src/components/alert/alert.ts` (retrait des entrées `@cssprop --ar-alert-close-bg` et `--ar-alert-close-hover-bg`)
- Modify: `packages/core/src/styles/themes/default.css` (retrait des 2 tokens `:root`, ajout de règles imbriquées dans `ar-alert { }`)

**Interfaces:**

- Consumes: bloc `ar-alert { }` de la Task 2 (avec `&::part(close) { border-radius: 7px; }` déjà présent).
- Produces: bloc `ar-alert { }` avec `&::part(close)` enrichi de `background-color`/`opacity`/`position`/`top`/`right`, plus deux nouvelles règles imbriquées `&::part(close):hover` et `&::part(close):focus-visible`.

Contexte : `--ar-alert-close-bg`/`--ar-alert-close-hover-bg` avaient été laissés tokens au premier passage par erreur de catégorisation (supposés « sémantiques » comme les couleurs de variant). Vérifié : aucune calibration dark-mode, aucune réutilisation, aucune lecture JS — ils suivent exactement le même critère que `padding`/`border-radius`/etc, et le même pattern déjà utilisé pour `nav-btn`/`footer-btn` de `ar-datepicker` (design entièrement externalisé, sans token). `:focus-visible` (outline `currentColor`) reste interne — probable exigence de contraste du focus ring contre les 4 fonds de variant (WCAG 2.4.7), pas un choix esthétique arbitraire, donc hors périmètre de cette migration.

- [ ] **Step 1 : Modifier le bloc `[part='close']` de `alert.styles.ts`**

Bloc actuel :

```css
[part='close'] {
    order: 1;
    align-self: flex-start;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    /* a11y-fallback: WCAG 2.5.8 (Target Size Minimum) — sans thème chargé, le bouton perdrait sa taille de cible tactile */
    width: var(--ar-alert-close-size, 2rem);
    /* a11y-fallback: WCAG 2.5.8 (Target Size Minimum) — sans thème chargé, le bouton perdrait sa taille de cible tactile */
    height: var(--ar-alert-close-size, 2rem);
    padding: 0;
    border: none;
    background-color: var(--ar-alert-close-bg);
    color: currentColor;
    cursor: pointer;
    opacity: 0.75;
    transition:
        opacity var(--ar-alert-close-transition-duration),
        background-color var(--ar-alert-close-transition-duration);
    position: relative;
    top: -0.2rem;
    right: -0.2rem;

    &:hover {
        opacity: 1;
        background-color: var(--ar-alert-close-hover-bg);
    }

    &:focus-visible {
        opacity: 1;
        outline: 2px solid currentColor;
        outline-offset: 2px;
    }
}
```

Remplacer par (retire `background-color`, `opacity` de base, `position`/`top`/`right`, et le `background-color` de `&:hover` — ces propriétés ne sont plus déclarées par le composant du tout ; `&:hover`/`&:focus-visible` gardent uniquement `opacity: 1` car cette valeur reste correcte par défaut sans thème (bouton pleinement visible au survol/focus, un bon défaut structurel, alors que l'opacité 0.75 au repos est un choix esthétique) :

```css
[part='close'] {
    order: 1;
    align-self: flex-start;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    /* a11y-fallback: WCAG 2.5.8 (Target Size Minimum) — sans thème chargé, le bouton perdrait sa taille de cible tactile */
    width: var(--ar-alert-close-size, 2rem);
    /* a11y-fallback: WCAG 2.5.8 (Target Size Minimum) — sans thème chargé, le bouton perdrait sa taille de cible tactile */
    height: var(--ar-alert-close-size, 2rem);
    padding: 0;
    border: none;
    color: currentColor;
    cursor: pointer;
    transition:
        opacity var(--ar-alert-close-transition-duration),
        background-color var(--ar-alert-close-transition-duration);

    &:hover {
        opacity: 1;
    }

    &:focus-visible {
        opacity: 1;
        outline: 2px solid currentColor;
        outline-offset: 2px;
    }
}
```

- [ ] **Step 2 : Retirer les 2 tokens de `default.css` (`:root`)**

Dans le bloc `/* alert */` de `:root` (`default.css:294-311` actuelles), supprimer ces 2 lignes :

```css
--ar-alert-close-bg: color-mix(in srgb, currentColor 8%, transparent);
--ar-alert-close-hover-bg: color-mix(in srgb, currentColor 20%, transparent);
```

- [ ] **Step 3 : Ajouter le design externalisé dans le bloc `ar-alert { }`**

Le bloc `&::part(close)` (créé Task 2, contenant déjà `border-radius: 7px;`) devient, avec deux nouvelles règles imbriquées juste après :

```css
&::part(close) {
    border-radius: 7px;
    background-color: color-mix(in srgb, currentColor 8%, transparent);
    opacity: 0.75;
    position: relative;
    top: -0.2rem;
    right: -0.2rem;
}

&::part(close):hover {
    background-color: color-mix(in srgb, currentColor 20%, transparent);
}
```

(Placer ces deux règles au même niveau que `&::part(close)` dans `ar-alert { }`, juste après elle.)

- [ ] **Step 4 : Retirer les 2 entrées `@cssprop` du JSDoc de `alert.ts`**

Supprimer :

```
 * @cssprop --ar-alert-close-bg - Fond du bouton de fermeture au repos.
 * @cssprop --ar-alert-close-hover-bg - Fond du bouton de fermeture au survol.
```

- [ ] **Step 5 : Régénérer le manifest**

```bash
npm run build:manifest --workspace=packages/core
```

Expected : succès.

- [ ] **Step 6 : Tests**

```bash
npm run test --workspace=packages/core
```

Expected : tous les tests passent.

- [ ] **Step 7 : Commit**

```bash
git add packages/core/src/components/alert/alert.styles.ts \
        packages/core/src/components/alert/alert.ts \
        packages/core/src/styles/themes/default.css
git commit -m "refactor(alert): migre le design de close (fond/opacite/position) vers le theme (#129)"
```

---

### Task 4 : Migrer `font-size` de `[part='icon']`

**Files:**

- Modify: `packages/core/src/components/alert/alert.styles.ts` (bloc `[part='icon']`)
- Modify: `packages/core/src/styles/themes/default.css` (ajout de `&::part(icon)` dans `ar-alert { }`)

**Interfaces:**

- Consumes: bloc `ar-alert { }` de la Task 3.
- Produces: nouvelle règle imbriquée `&::part(icon)` dans `ar-alert { }`.

- [ ] **Step 1 : Retirer `font-size: 1.5em` du bloc `[part='icon']` de `alert.styles.ts`**

Bloc actuel :

```css
[part='icon'] {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    font-size: 1.5em;
}
```

Remplacer par :

```css
[part='icon'] {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
}
```

- [ ] **Step 2 : Ajouter `&::part(icon)` au bloc `ar-alert { }` de `default.css`**

Ajouter, au même niveau que `&::part(close)` (par exemple juste après le bloc `&::part(close):hover` ajouté en Task 3) :

```css
&::part(icon) {
    font-size: 1.5em;
}
```

- [ ] **Step 3 : Régénérer le manifest**

```bash
npm run build:manifest --workspace=packages/core
```

Expected : succès.

- [ ] **Step 4 : Tests**

```bash
npm run test --workspace=packages/core
```

Expected : tous les tests passent.

- [ ] **Step 5 : Commit**

```bash
git add packages/core/src/components/alert/alert.styles.ts packages/core/src/styles/themes/default.css
git commit -m "refactor(alert): migre font-size de icon vers ::part(icon) (#129)"
```

---

### Task 5 : Tokeniser la durée de transition de sortie (`:host([hiding])`)

**Files:**

- Modify: `packages/core/src/components/alert/alert.styles.ts` (bloc `:host([hiding])`)
- Modify: `packages/core/src/components/alert/alert.ts` (ajout d'une entrée `@cssprop --ar-alert-hide-transition-duration`)
- Modify: `packages/core/src/styles/themes/default.css` (ajout du token `:root`)

**Interfaces:**

- Consumes: rien des tâches précédentes.
- Produces: token `--ar-alert-hide-transition-duration`, consommé uniquement en interne (jamais externalisé — cf. contrainte 6 ADR-005, la garde `@media (prefers-reduced-motion: reduce)` porte sur cette transition).

Contexte : la durée `0.33s` est codée en dur deux fois dans `:host([hiding])` (`opacity`/`transform`), jamais tokenisée — violation du principe de base d'ADR-005 (toute valeur de design vient de `default.css`). Contrairement à `--ar-alert-close-transition-duration`, elle n'a même pas de token aujourd'hui. Elle doit en devenir un, mais rester consommée en interne : la garde reduced-motion (`alert.styles.ts:59-64`) porte sur cette même transition, et l'externaliser la neutraliserait (même mécanisme que `close-transition-duration`, déjà vérifié empiriquement dans le premier passage de ce lot).

- [ ] **Step 1 : Ajouter le token dans `default.css`**

Dans le bloc `/* alert */` de `:root`, ajouter une ligne (par exemple juste après `--ar-alert-close-transition-duration`) :

```css
--ar-alert-hide-transition-duration: 0.33s;
```

- [ ] **Step 2 : Consommer le token dans `alert.styles.ts`**

Bloc actuel :

```css
:host([hiding]) {
    opacity: 0;
    transform: scale(0.75);
    transition:
        opacity 0.33s,
        transform 0.33s;
}
```

Remplacer par :

```css
:host([hiding]) {
    opacity: 0;
    transform: scale(0.75);
    transition:
        opacity var(--ar-alert-hide-transition-duration),
        transform var(--ar-alert-hide-transition-duration);
}
```

(Les valeurs `opacity: 0`/`transform: scale(0.75)` restent ici pour l'instant — elles seront retirées dans la Task 6, qui les externalise séparément. Ne pas les toucher dans cette tâche.)

- [ ] **Step 3 : Ajouter l'entrée `@cssprop` dans le JSDoc de `alert.ts`**

Ajouter, dans la liste `@cssprop` existante (par exemple juste après `--ar-alert-close-transition-duration`) :

```
 * @cssprop --ar-alert-hide-transition-duration - Durée de la transition de sortie (opacity/transform) à la fermeture.
```

- [ ] **Step 4 : Régénérer le manifest**

```bash
npm run build:manifest --workspace=packages/core
```

Expected : succès (nouveau token avec son entrée `@cssprop` correspondante).

- [ ] **Step 5 : Tests**

```bash
npm run test --workspace=packages/core
```

Expected : tous les tests passent (aucun test n'asserte sur la valeur exacte de la durée de transition).

- [ ] **Step 6 : Commit**

```bash
git add packages/core/src/components/alert/alert.styles.ts \
        packages/core/src/components/alert/alert.ts \
        packages/core/src/styles/themes/default.css
git commit -m "refactor(alert): tokenise la duree de transition de sortie (#129)"
```

---

### Task 6 : Externaliser les valeurs finales de l'état `[hiding]`

**Files:**

- Modify: `packages/core/src/components/alert/alert.styles.ts` (bloc `:host([hiding])`)
- Modify: `packages/core/src/styles/themes/default.css` (nouvelle règle `ar-alert[hiding] { }`)

**Interfaces:**

- Consumes: bloc `:host([hiding])` de la Task 5 (avec la transition déjà tokenisée).
- Produces: nouvelle règle top-level `ar-alert[hiding] { }` dans `default.css`, indépendante du bloc `ar-alert { }` existant (elle ne peut pas être nichée dedans — `ar-alert[hiding]` est un sélecteur distinct de `ar-alert`, pas une règle imbriquée valide avec `&`).

Contexte : vérifié empiriquement (Chromium/Playwright, cf. Global Constraints du plan) qu'une règle externe conditionnée par attribut suit le cascade normal et ne casse pas la garde reduced-motion (qui porte sur la `transition`, restée interne depuis la Task 5, pas sur ces valeurs finales).

- [ ] **Step 1 : Retirer `opacity: 0`/`transform: scale(0.75)` du bloc `:host([hiding])`**

Bloc actuel (après Task 5) :

```css
:host([hiding]) {
    opacity: 0;
    transform: scale(0.75);
    transition:
        opacity var(--ar-alert-hide-transition-duration),
        transform var(--ar-alert-hide-transition-duration);
}
```

Remplacer par :

```css
:host([hiding]) {
    transition:
        opacity var(--ar-alert-hide-transition-duration),
        transform var(--ar-alert-hide-transition-duration);
}
```

- [ ] **Step 2 : Ajouter la règle externe dans `default.css`**

Ajouter une nouvelle règle top-level, au même niveau que le bloc `ar-alert { }` existant (donc à l'intérieur de `@layer ariane.theme { }`, comme sibling du bloc `ar-alert { }`, pas imbriquée dedans) :

```css
ar-alert[hiding] {
    opacity: 0;
    transform: scale(0.75);
}
```

- [ ] **Step 3 : Régénérer le manifest**

```bash
npm run build:manifest --workspace=packages/core
```

Expected : succès.

- [ ] **Step 4 : Tests**

```bash
npm run test --workspace=packages/core
```

Expected : tous les tests passent — en particulier les tests qui vérifient le cycle de fermeture d'`ar-alert` (`alert.test.ts`, recherche de `hiding`/`ar-alert-close`) doivent continuer de passer, car le comportement (attribut posé, event émis, focus reporté) n'est pas affecté par où vivent les valeurs CSS.

- [ ] **Step 5 : Commit**

```bash
git add packages/core/src/components/alert/alert.styles.ts packages/core/src/styles/themes/default.css
git commit -m "refactor(alert): externalise les valeurs finales de l'etat hiding (#129)"
```

---

### Task 7 : Documenter `@csspart icon-svg`

**Files:**

- Modify: `packages/core/src/components/alert/alert.ts` (ajout d'une entrée `@csspart`)

**Interfaces:**

- Consumes: rien.
- Produces: rien consommé par une tâche suivante.

Contexte : `_defaultIcon()` (dans `alert.ts`) rend un `<svg part="icon-svg" ...>` — ce `part` existe dans le code depuis l'origine du composant mais n'a jamais été documenté dans le JSDoc (trou préexistant, indépendant de ce lot). Décision : documenter seulement, ne pas ajouter de `part` symétrique sur le SVG de `_defaultCloseIcon()` (resté un détail d'implémentation non exposé, correct ainsi).

- [ ] **Step 1 : Ajouter l'entrée `@csspart` manquante**

Dans le JSDoc de `alert.ts`, la liste `@csspart` actuelle est :

```
 * @csspart icon      - Le conteneur de l'icône de variant.
 * @csspart body      - Le conteneur du titre et du contenu.
 * @csspart close     - Le bouton de fermeture (présent uniquement si `next-focus` est défini).
```

Remplacer par :

```
 * @csspart icon      - Le conteneur de l'icône de variant.
 * @csspart icon-svg  - Le SVG de l'icône de variant par défaut (absent si le slot `icon` est utilisé).
 * @csspart body      - Le conteneur du titre et du contenu.
 * @csspart close     - Le bouton de fermeture (présent uniquement si `next-focus` est défini).
```

- [ ] **Step 2 : Régénérer le manifest**

```bash
npm run build:manifest --workspace=packages/core
```

Expected : succès.

- [ ] **Step 3 : Commit**

```bash
git add packages/core/src/components/alert/alert.ts
git commit -m "docs(alert): documente le csspart icon-svg manquant (#129)"
```

---

### Task 8 : Vérification visuelle et suite de tests complète

**Files:** aucun fichier de code modifié — vérification uniquement.

**Interfaces:**

- Consumes: l'ensemble des changements des Tasks 2-7.

- [ ] **Step 1 : Rebuild explicite du JS de `packages/core`**

```bash
npm run build:dev --workspace=packages/core
```

Expected : build réussi. (Rappel : `npm run dev --workspace=apps/docs` seul ne reconstruit pas ce JS.)

- [ ] **Step 2 : Vérification des valeurs calculées sur le site de doc**

```bash
npm run dev --workspace=apps/docs
```

Sur `http://localhost:4321/components/ar-alert` (ou le port affiché), vérifier via DevTools (`getComputedStyle`) sur les 3 variants :

- Hôte `ar-alert` : `columnGap` résout à `12px` (0.75rem).
- `[part='close']` (variant dismissible) : `backgroundColor` résout à `color-mix(in srgb, currentColor 8%, transparent)` évalué (une couleur teintée, pas transparent pur) au repos, plus foncé au survol ; `opacity` résout à `0.75` au repos, `1` au survol/focus ; `position: relative`, `top: -3.2px` (-0.2rem), `right: -3.2px`.
- `[part='icon']` : `fontSize` résout à ~`24px` (1.5em, dépend du `font-size` hérité).
- Déclencher la fermeture (bouton close sur le variant dismissible) : l'alerte doit toujours s'animer en fondu/réduction puis disparaître du DOM et reporter le focus, comme avant.

Expected : aucune régression visuelle ni comportementale.

- [ ] **Step 3 : Suite de tests complète**

```bash
npm run test --workspace=packages/core
npm run test:all
```

Expected : tous les tests passent (Vitest + WTR navigateur).

- [ ] **Step 4 : Vérifier qu'aucune référence morte ne subsiste**

```bash
grep -rn -- "--ar-alert-close-bg\|--ar-alert-close-hover-bg" packages/core/src apps/docs/src packages/core/README.md docs/onboarding.md
```

Expected : aucune occurrence (élargi cette fois à `README.md`/`onboarding.md`, la revue finale du premier passage ayant montré que le grep initial les manquait).

---

### Task 9 : Mise à jour d'ADR-005 et push sur la PR existante

**Files:**

- Modify: `docs/decisions/ADR-005-tokens-pilotes-par-attribut.md` (complète la section "Application — `ar-alert`" ajoutée au premier passage)

**Interfaces:**

- Consumes: la section "**Application — `ar-alert` (2026-07-28)**" existante (ajoutée lors de la revue finale du premier passage de ce lot).

- [ ] **Step 1 : Compléter la section existante**

Chercher la section `**Application — `ar-alert` (2026-07-28)**` dans `docs/decisions/ADR-005-tokens-pilotes-par-attribut.md` (fin de fichier) et ajouter un paragraphe à la suite, sur le modèle des autres sections "Application" :

```

**Deuxième passe (même jour)** : audit élargi aux valeurs jamais tokenisées et à une
recatégorisation. `column-gap` du `:host` (jamais tokenisé) migré en littéral dans
`ar-alert { }`. `--ar-alert-close-bg`/`--ar-alert-close-hover-bg` — laissés tokens par erreur
de catégorisation lors de la première passe (supposés sémantiques comme les couleurs de
variant, sans revérifier les critères) — migrés en littéral dans `ar-alert::part(close)`/
`::part(close):hover`, même pattern que `nav-btn`/`footer-btn` de `ar-datepicker`. `opacity`/
`position`/`top`/`right` de `[part='close']` migrés de la même façon ; `:focus-visible`
(`outline: currentColor`) reste interne (contraste du focus ring contre les 4 fonds de
variant, probable exigence WCAG 2.4.7). `font-size` de `[part='icon']` migré vers
`::part(icon)`. La durée d'animation de sortie (`0.33s`, jamais tokenisée) devient
`--ar-alert-hide-transition-duration`, consommée en interne uniquement (bloquée en externe
par la contrainte 6 — même garde `prefers-reduced-motion` que `close-transition-duration`).
Les valeurs finales de l'état `[hiding]` (`opacity: 0`/`transform: scale(0.75)`) migrées vers
`ar-alert[hiding] { }` — **nouveau cas vérifié empiriquement** : un sélecteur d'attribut
externe sur le tag suit le cascade CSS normal face à une règle `:host` interne
inconditionnelle (contrairement à `::part()`/tag non conditionné, qui l'emporte toujours),
et n'interfère pas avec la garde reduced-motion tant que la propriété `transition`
elle-même reste interne. `position: relative` mort sur `:host` retiré (aucun descendant n'en
dépendait). Trou de documentation préexistant comblé : `@csspart icon-svg` (SVG de l'icône de
variant, jamais documenté depuis l'origine du composant).
```

- [ ] **Step 2 : Tests**

```bash
npm run test --workspace=packages/core
```

Expected : tous les tests passent (changement doc-only).

- [ ] **Step 3 : Commit et push sur la branche existante**

```bash
git add docs/decisions/ADR-005-tokens-pilotes-par-attribut.md
git commit -m "docs(adr): complete la section ar-alert avec la 2e passe (#129)"
git push
```

Expected : push réussi sur `fix/alert-token-vs-part-129`, la PR #142 se met à jour automatiquement avec les nouveaux commits.

- [ ] **Step 4 : Attendre la confirmation explicite de l'utilisateur avant tout merge**

Ne pas merger sur `dev` sans confirmation explicite — règle permanente depuis l'incident PR #137.

---

## Self-Review

**Spec coverage** :

- `column-gap` + `position:relative` mort → Task 2. ✅
- Design de `[part='close']` (bg/hover-bg/opacity/position) → Task 3. ✅
- `font-size` de `[part='icon']` → Task 4. ✅
- Durée de transition `hiding` tokenisée → Task 5. ✅
- Valeurs finales `hiding` externalisées → Task 6. ✅
- `@csspart icon-svg` → Task 7. ✅
- Vérification élargie (README/onboarding inclus) → Task 8. ✅
- Doc ADR-005 + push (pas de merge) → Task 9. ✅

**Placeholder scan** : aucun "TBD" — chaque step contient le code exact avant/après.

**Type consistency** : les noms de tokens (`--ar-alert-hide-transition-duration`) et de règles (`ar-alert[hiding]`, `&::part(close)`, `&::part(close):hover`, `&::part(icon)`) sont utilisés de façon cohérente entre les tâches qui les créent et celles qui les consomment (Task 5 crée le token consommé par Task 6's contexte ; Task 2/3/4 enrichissent successivement le même bloc `ar-alert { }`).
