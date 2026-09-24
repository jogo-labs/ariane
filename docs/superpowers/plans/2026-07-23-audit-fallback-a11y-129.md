# Audit fallback CSS d'accessibilité #129 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Étendre le mécanisme de fallback CSS d'accessibilité (ADR-005 amendé, `docs/superpowers/specs/2026-07-22-css-fallback-accessibilite-design.md`) au-delà du système panel partagé/tooltip/datepicker déjà traités, en corrigeant les cas identifiés par l'audit du 2026-07-23 sur les 19 composants : anneaux de focus cassés (`ar-tab`, `ar-datepicker`, bouton partagé), `ar-progressbar` invisible, `ar-dialog` sans surface visible, indicateur d'onglet actif indiscernable, états du calendrier `ar-datepicker` (sélectionné/aujourd'hui/survol/hors-mois), et signal non-couleur pour `ar-charcounter`.

**Architecture:** Même mécanisme que la passe précédente — un token reçoit un fallback fonctionnel dans le composant (jamais dans `default.css`) si et seulement si son absence rend le composant confus, cassé ou inaccessible sans thème chargé. Deux mécanismes : (A) mot-clé couleur système CSS4 pour tout ce qui touche au contraste, (B) valeur littérale justifiée par un commentaire `/* a11y-fallback: <raison> */` sur la ligne précédente, pour les dimensions/graisses sans équivalent système. `ar-dialog` reçoit en plus deux nouveaux tokens scopés (`--ar-dialog-bg`/`--ar-dialog-color`) suivant le principe de scoping systématique acté sur #127 : le fallback reste local au composant plutôt que d'être posé sur les tokens globaux `--ar-color-bg`/`--ar-color-text` consommés par d'autres composants.

**Tech Stack:** Lit 3 + TypeScript, CSS custom properties (`@layer ariane.theme` dans `packages/core/src/styles/themes/default.css`), Vitest, garde-fou `packages/core/scripts/validate-no-hardcoded-tokens.js` (branché dans `cem.config.js`).

## Global Constraints

- Aucun fallback sur `border-radius`, `box-shadow` générique, ou padding générique (purement cosmétiques, hors périmètre par principe déjà acté).
- Fallback couleur système CSS4 (mécanisme A) préféré partout où c'est pertinent ; valeur littérale (mécanisme B) uniquement pour les dimensions/graisses sans équivalent système, avec commentaire `/* a11y-fallback: <raison> */` sur la ligne immédiatement précédente (format exact, vérifié par `validate-no-hardcoded-tokens.js`).
- Liste blanche des mots-clés couleur système étendue à `Highlight`/`HighlightText` (justifié : sémantique CSS4 dédiée à l'état sélectionné/actif, aucun équivalent dans la liste existante).
- **Exclusion délibérée** : le token `--ar-color-bg` consommé à `datepicker.styles.ts:178` (`border-color` de la cellule jour focusée, technique de "cutout" contre le fond du panel) n'est **pas** touché par ce plan. Deux raisons distinctes, à ne pas confondre : (a) la question de justesse du token référencé (`--ar-panel-bg` serait plus correct que `--ar-color-bg`), soulevée pendant la revue de #132, reste un point ouvert orthogonal aux fallbacks, non traité ici ; (b) même sans thème, cette ligne ne casse rien — c'est une longhand `border-color` isolée (pas le raccourci `border:`), qui retombe sur sa propre valeur initiale `currentcolor` si non résolue (bordure visible, juste moins "fondue" avec le panel), pas invisible. Différent du cas `ar-dialog` (Task 5) où `background` est la seule source de la surface entière — sa défaillance rend la modale totalement invisible, pas juste cosmétiquement imparfaite.
- **Exclusion délibérée** : la bordure de séparation `ar-tab-group` (`tab-group.styles.ts:27-29`, `--ar-tab-group-border-color`) reste sans fallback — cosmétique/borderline (un simple trait de séparation, pas load-bearing pour identifier l'onglet actif), ne remplit pas le critère "confus/cassé/inaccessible".
- Prettier : 100 caractères, 4 espaces, quotes simples.
- Conventional Commits — chaque tâche se termine par un commit séparé.
- Ne jamais committer `packages/core/dist/`.
- Branches `fix/<desc>` créées depuis `dev`. PR vers `dev`, jamais push direct sur `main`.

---

## Contexte technique découvert pendant l'audit

- **Mécanique des raccourcis CSS (`outline`, `box-shadow`, `border`)** : quand un `var()` à l'intérieur d'un raccourci échoue, **tout le raccourci** devient invalide et retombe à sa valeur initiale — pas seulement la sous-valeur concernée. C'est pourquoi `outline: 2px solid var(--ar-focus-ring-color)` sans thème produit `outline-style: none` (aucun anneau, pas un anneau non coloré). Une propriété _longhand_ seule (ex. `outline-color` sans raccourci, `border-color` seul) dégrade elle en `currentcolor`/valeur héritée — reste visible. Cette distinction explique pourquoi certains cas de l'audit ne sont pas retenus (ex. `stepper.styles.ts:128`, `table-sort.styles.ts:52-61` utilisent des longhands, pas de raccourci).
- `--ar-button-focus-ring-color` (`packages/core/src/styles/components/button.styles.ts:64-71`, pas `shared/button.styles.ts` — le chemin exact) est un token partagé non documenté par un `@cssprop` dédié dans un composant précis (consommé indirectement par plusieurs composants via `.btn`) — sa correction ne nécessite donc pas de mise à jour de JSDoc de composant.
- `docs/superpowers/specs/2026-07-22-css-fallback-accessibilite-design.md` ne couvre actuellement (section « Périmètre de cette passe », lignes 87-128) que le panel partagé, tooltip, et les deux exceptions datepicker déjà faites — ce plan étend explicitement cette section.
- `docs/decisions/ADR-005-tokens-pilotes-par-attribut.md` (lignes 67-96) contient l'amendement du 2026-07-22 qui renvoie explicitement à #129 pour la suite — ce plan referme cette référence.
- **Découvert en revue du plan (pas dans l'audit initial)** : `datepicker.styles.ts:150` (`[part='day']`, règle de base) utilise le raccourci `border: <width> solid <color>` avec deux `var()`. Sans thème, l'un des deux échoue (peu importe lequel) → tout le raccourci s'invalide → `border-style: none` sur **toutes** les cellules jour, ce qui rend inopérante la surcharge `border-color` de `.today` — une couleur de bordure ne s'affiche pas si le style est déjà `none`. Traité en Task 7 Step 0, avant le fallback "aujourd'hui" dont il est un prérequis silencieux.
- **Découvert en revue du plan** : ajouter un fallback de fond système sans fallback de texte pairé introduit une combinaison de contraste jamais validée (le fond system-color et le texte hérité ambiant n'ont jamais été conçus ensemble). Appliqué au cas `--ar-datepicker-day-hover-bg`/`-color` (Task 7 Step 3) — les deux sont fallback'és ensemble, pas seulement le fond.

---

### Task 1: Créer la branche de travail

**Files:** aucun fichier modifié — opération git uniquement.

- [ ] **Step 1: Créer la branche depuis `dev`**

```bash
cd /Users/jon/Code/Active_projects/ariane
git checkout dev
git pull
git checkout -b fix/audit-fallback-a11y-129
```

- [ ] **Step 2: Vérifier l'état propre**

Run: `git status`
Expected: `On branch fix/audit-fallback-a11y-129`, `nothing to commit, working tree clean`

---

### Task 2: Étendre la liste blanche CI avec `Highlight`/`HighlightText`

**Files:**

- Modify: `packages/core/scripts/validate-no-hardcoded-tokens.js:27-36`
- Modify: `packages/core/scripts/validate-no-hardcoded-tokens.test.js`

**Interfaces:** aucune — extension de constante.

- [ ] **Step 1: Étendre `SYSTEM_COLOR_KEYWORDS`**

Remplacer (lignes 27-36) :

```js
const SYSTEM_COLOR_KEYWORDS = new Set([
    'Canvas',
    'CanvasText',
    'ButtonBorder',
    'ButtonFace',
    'ButtonText',
    'Field',
    'FieldText',
    'GrayText',
]);
```

par :

```js
const SYSTEM_COLOR_KEYWORDS = new Set([
    'Canvas',
    'CanvasText',
    'ButtonBorder',
    'ButtonFace',
    'ButtonText',
    'Field',
    'FieldText',
    'GrayText',
    'Highlight',
    'HighlightText',
]);
```

- [ ] **Step 2: Ajouter un test confirmant l'acceptation de `Highlight`**

Trouver le test existant `it('accepte un mot-clé couleur système whitelisté', ...)` (ligne 85) dans `validate-no-hardcoded-tokens.test.js`, et ajouter juste après un test miroir avec `Highlight` :

```js
it('accepte le mot-clé Highlight (ajouté pour les états sélectionné/actif)', () => {
    const css = `
        :host {
            background: var(--ar-datepicker-day-selected-bg, Highlight);
        }
    `;
    expect(findUnjustifiedFallbacks(css)).toEqual([]);
});
```

(Adapter la signature exacte de `findUnjustifiedFallbacks`/la structure du test à celle du test voisin déjà présent dans le fichier — s'aligner sur son format d'appel exact plutôt que de deviner.)

- [ ] **Step 3: Lancer les tests du script**

Run: `npx vitest run packages/core/scripts/validate-no-hardcoded-tokens.test.js --root /Users/jon/Code/Active_projects/ariane`
Expected: tous les tests passent, y compris le nouveau.

- [ ] **Step 4: Commit**

```bash
git add packages/core/scripts/validate-no-hardcoded-tokens.js packages/core/scripts/validate-no-hardcoded-tokens.test.js
git commit -m "feat(core): etend la liste blanche couleur systeme avec Highlight/HighlightText"
```

---

### Task 3: Corriger l'anneau de focus cassé (bouton partagé, ar-tab, ar-datepicker)

**Files:**

- Modify: `packages/core/src/styles/components/button.styles.ts:68-70`
- Modify: `packages/core/src/components/tab/tab.styles.ts:45`
- Modify: `packages/core/src/components/tab/tab.ts:31`
- Modify: `packages/core/src/components/datepicker/datepicker.styles.ts:89,94,117,122,175-176,191`
- Modify: `packages/core/src/components/datepicker/datepicker.ts:92,98`

**Interfaces:** aucun nouveau token — ajout de fallbacks sur des tokens existants déjà documentés.

- [ ] **Step 1: Corriger `button.styles.ts`**

Remplacer (lignes 64-71) :

```css
.btn:focus {
    outline: 0;
    box-shadow: none;
    border-color: transparent;
    box-shadow:
        inset 0 0 0 0.125rem var(--ar-button-focus-ring-color),
        inset 0 0 0 0.25rem var(--ar-color-white);
}
```

par :

```css
.btn:focus {
    outline: 0;
    box-shadow: none;
    border-color: transparent;
    box-shadow:
        inset 0 0 0 0.125rem var(--ar-button-focus-ring-color, ButtonText),
        inset 0 0 0 0.25rem var(--ar-color-white, Canvas);
}
```

- [ ] **Step 2: Corriger `tab.styles.ts`**

Remplacer (ligne 45) :

```css
outline: 2px solid var(--ar-focus-ring-color);
```

par :

```css
outline: 2px solid var(--ar-focus-ring-color, ButtonText);
```

- [ ] **Step 3: Documenter le fallback dans `tab.ts`**

Remplacer (ligne 31) :

```
 * @cssprop --ar-focus-ring-color - Couleur de la bague de focus de l'onglet. Token sémantique global (non scopé à ar-tab).
```

par :

```
 * @cssprop --ar-focus-ring-color - Couleur de la bague de focus de l'onglet. Token sémantique global (non scopé à ar-tab). Repli `ButtonText` si aucun thème n'est chargé (WCAG 2.4.7).
```

- [ ] **Step 4: Corriger les 4 sites `datepicker.styles.ts`**

Remplacer (lignes 88-91, nav-btn) :

```css
[part~='nav-btn']:focus-visible {
    outline: 2px solid var(--ar-focus-ring-color);
    outline-offset: var(--ar-focus-ring-offset);
}
```

par :

```css
[part~='nav-btn']:focus-visible {
    outline: 2px solid var(--ar-focus-ring-color, ButtonText);
    outline-offset: var(--ar-focus-ring-offset);
}
```

Remplacer (lignes 116-119, footer-btn) :

```css
[part~='footer-btn']:focus-visible {
    outline: 2px solid var(--ar-focus-ring-color);
    outline-offset: var(--ar-focus-ring-offset);
}
```

par :

```css
[part~='footer-btn']:focus-visible {
    outline: 2px solid var(--ar-focus-ring-color, ButtonText);
    outline-offset: var(--ar-focus-ring-offset);
}
```

Remplacer (lignes 174-179, grille jour) :

```css
[part='grid']:focus-within [part='day'][tabindex='0'] {
    outline: solid var(--ar-datepicker-day-focus-ring-width)
        var(--ar-datepicker-day-focus-ring-color);
    outline-offset: var(--ar-datepicker-day-focus-ring-offset);
    border-color: var(--ar-color-bg);
}
```

par :

```css
[part='grid']:focus-within [part='day'][tabindex='0'] {
    outline: solid
        /* a11y-fallback: WCAG 2.4.7 (Focus Visible) — var() dans un raccourci outline invalide tout le raccourci si non résolu, y compris la largeur */
        var(--ar-datepicker-day-focus-ring-width, 2px)
        var(--ar-datepicker-day-focus-ring-color, ButtonText);
    outline-offset: var(--ar-datepicker-day-focus-ring-offset);
    border-color: var(--ar-color-bg);
}
```

Remplacer (lignes 190-193, curseur de navigation) :

```css
[part='day'][tabindex='0']:not(:focus-visible) {
    outline: 1px dashed var(--ar-datepicker-day-focus-ring-color);
    outline-offset: var(--ar-datepicker-day-focus-ring-offset);
}
```

par :

```css
[part='day'][tabindex='0']:not(:focus-visible) {
    outline: 1px dashed var(--ar-datepicker-day-focus-ring-color, ButtonText);
    outline-offset: var(--ar-datepicker-day-focus-ring-offset);
}
```

- [ ] **Step 5: Documenter les fallbacks dans `datepicker.ts`**

Remplacer (ligne 92) :

```
 * @cssprop --ar-datepicker-day-focus-ring-color - Couleur du focus ring des jours.
```

par :

```
 * @cssprop --ar-datepicker-day-focus-ring-color - Couleur du focus ring des jours. Repli `ButtonText` si aucun thème n'est chargé (WCAG 2.4.7).
```

Remplacer (ligne 98) :

```
 * @cssprop --ar-focus-ring-color - Couleur de l'anneau de focus des boutons de navigation et du footer. Token sémantique global (non scopé à ar-datepicker) — les cellules jour ont leur propre token scopé, --ar-datepicker-day-focus-ring-color.
```

par :

```
 * @cssprop --ar-focus-ring-color - Couleur de l'anneau de focus des boutons de navigation et du footer. Token sémantique global (non scopé à ar-datepicker) — les cellules jour ont leur propre token scopé, --ar-datepicker-day-focus-ring-color. Repli `ButtonText` si aucun thème n'est chargé (WCAG 2.4.7).
```

- [ ] **Step 6: Vérifier la génération du manifest et les tests**

Run: `npm run build:manifest --workspace=@ariane-ui/core`
Expected: succès, aucune erreur (le nouveau mot-clé `ButtonText` est déjà whitelisté avant même la Task 2 — vérifier que le garde-fou `validate-no-hardcoded-tokens.js` passe aussi, notamment le commentaire `a11y-fallback` sur `datepicker.styles.ts`).

Run: `npx vitest run packages/core/src/components/tab packages/core/src/components/datepicker --root /Users/jon/Code/Active_projects/ariane`
Expected: tous les tests passent (comportement themed inchangé, seul le comportement unthemed change).

- [ ] **Step 7: Vérification visuelle**

Playground docs, désactiver temporairement le chargement de `default.css` (devtools, désactiver la feuille de style) : `ar-tab`, `ar-datepicker` (boutons nav/footer, cellules jour) doivent tous afficher un anneau de focus visible au clavier (Tab).

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/styles/components/button.styles.ts packages/core/src/components/tab/tab.styles.ts packages/core/src/components/tab/tab.ts packages/core/src/components/datepicker/datepicker.styles.ts packages/core/src/components/datepicker/datepicker.ts
git commit -m "fix(core): corrige l'anneau de focus casse sans theme (bouton partage, ar-tab, ar-datepicker)"
```

---

### Task 4: Corriger `ar-progressbar` invisible sans thème

**Files:**

- Modify: `packages/core/src/components/progressbar/progressbar.styles.ts:21,26`
- Modify: `packages/core/src/components/progressbar/progressbar.ts:30-31`

**Interfaces:** aucun nouveau token.

- [ ] **Step 1: Ajouter les fallbacks dans `progressbar.styles.ts`**

Remplacer (ligne 21) :

```css
background-color: var(--ar-progressbar-track-color);
```

par :

```css
background-color: var(--ar-progressbar-track-color, ButtonFace);
```

Remplacer (ligne 26) :

```css
background-color: var(--ar-progressbar-fill-color);
```

par :

```css
background-color: var(--ar-progressbar-fill-color, ButtonText);
```

- [ ] **Step 2: Documenter les fallbacks dans `progressbar.ts`**

Remplacer (lignes 30-31) :

```
 * @cssprop --ar-progressbar-track-color - Couleur du rail (fond).
 * @cssprop --ar-progressbar-fill-color - Couleur de la progression.
```

par :

```
 * @cssprop --ar-progressbar-track-color - Couleur du rail (fond). Repli `ButtonFace` si aucun thème n'est chargé (WCAG 1.4.11).
 * @cssprop --ar-progressbar-fill-color - Couleur de la progression. Repli `ButtonText` si aucun thème n'est chargé (WCAG 1.4.11) — distinct de `ButtonFace` pour garder rail et remplissage contrastés entre eux.
```

- [ ] **Step 3: Vérifier la génération du manifest et les tests**

Run: `npm run build:manifest --workspace=@ariane-ui/core`
Expected: succès.

Run: `npx vitest run packages/core/src/components/progressbar --root /Users/jon/Code/Active_projects/ariane`
Expected: tous les tests passent.

- [ ] **Step 4: Vérification visuelle**

Playground docs, `default.css` désactivé : la barre de progression doit rester visible (rail + remplissage distincts).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/components/progressbar/progressbar.styles.ts packages/core/src/components/progressbar/progressbar.ts
git commit -m "fix(progressbar): corrige la barre invisible sans theme (WCAG 1.4.11)"
```

---

### Task 5: `ar-dialog` — nouveaux tokens scopés `--ar-dialog-bg`/`--ar-dialog-color` avec fallback

**Files:**

- Modify: `packages/core/src/styles/themes/default.css` (section dialog, après ligne `--ar-dialog-backdrop`)
- Modify: `packages/core/src/components/dialog/dialog.styles.ts:77-78`
- Modify: `packages/core/src/components/dialog/dialog.ts:83-84`

**Interfaces:** Produces `--ar-dialog-bg` (alias de `--ar-color-bg`, avec fallback `Canvas`), `--ar-dialog-color` (alias de `--ar-color-text`, avec fallback `CanvasText`).

- [ ] **Step 1: Ajouter les 2 alias dans la section dialog de `default.css`**

La section dialog contient :

```css
--ar-dialog-backdrop: rgba(0, 0, 0, 0.5);
```

Ajouter juste après :

```css
--ar-dialog-backdrop: rgba(0, 0, 0, 0.5);
--ar-dialog-bg: var(--ar-color-bg);
--ar-dialog-color: var(--ar-color-text);
```

- [ ] **Step 2: Consommer les alias avec fallback dans `dialog.styles.ts`**

Remplacer (lignes 77-78) :

```css
background: var(--ar-color-bg);
color: var(--ar-color-text);
```

par :

```css
background: var(--ar-dialog-bg, Canvas);
color: var(--ar-dialog-color, CanvasText);
```

- [ ] **Step 3: Mettre à jour le JSDoc de `dialog.ts`**

Remplacer (lignes 83-84) :

```
 * @cssprop --ar-color-bg - Fond du dialog. Token sémantique global (non scopé à ar-dialog).
 * @cssprop --ar-color-text - Couleur du texte du dialog. Token sémantique global (non scopé à ar-dialog).
```

par :

```
 * @cssprop --ar-dialog-bg - Fond du dialog (cascade vers --ar-color-bg). Repli `Canvas` si aucun thème n'est chargé — sans thème et sans bordure (le dialog natif perd son style UA par défaut), le contenu flotte sinon sans surface visible.
 * @cssprop --ar-dialog-color - Couleur du texte du dialog (cascade vers --ar-color-text). Repli `CanvasText` si aucun thème n'est chargé.
```

- [ ] **Step 4: Vérifier la couverture `@cssprop`, le garde-fou et les tests**

Run: `npm run build:manifest --workspace=@ariane-ui/core`
Expected: succès, aucune erreur de couverture (le nouveau token a son entrée JSDoc), aucune erreur du garde-fou fallback.

Run: `npx vitest run packages/core/src/components/dialog --root /Users/jon/Code/Active_projects/ariane`
Expected: tous les tests passent, aucune régression visuelle (valeurs héritées identiques : `--ar-dialog-bg` vaut `var(--ar-color-bg)` par défaut, exactement comme avant).

- [ ] **Step 5: Vérification visuelle**

Playground docs, `default.css` désactivé, ouvrir `ar-dialog` : la modale doit afficher une surface visible (fond clair, texte sombre) au lieu d'un contenu flottant sans fond.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/styles/themes/default.css packages/core/src/components/dialog/dialog.styles.ts packages/core/src/components/dialog/dialog.ts
git commit -m "fix(dialog): scope --ar-dialog-bg/--ar-dialog-color avec repli, corrige la modale invisible sans theme"
```

---

### Task 6: `ar-tab` — indicateur d'onglet actif indiscernable sans thème

**Files:**

- Modify: `packages/core/src/components/tab/tab.styles.ts:32`
- Modify: `packages/core/src/components/tab/tab.ts:26`

**Interfaces:** aucun nouveau token.

- [ ] **Step 1: Ajouter le fallback dans `tab.styles.ts`**

Remplacer (ligne 32) :

```css
box-shadow: var(--ar-tab-active-shadow);
```

par :

```css
box-shadow: var(--ar-tab-active-shadow, inset 0 -2px 0 Highlight);
```

- [ ] **Step 2: Documenter le fallback dans `tab.ts`**

Remplacer (ligne 26) :

```
 * @cssprop --ar-tab-active-shadow - box-shadow complet sur part="base" quand actif. Le thème par défaut le compose depuis --ar-tab-indicator-color et --ar-tab-indicator-width.
```

par :

```
 * @cssprop --ar-tab-active-shadow - box-shadow complet sur part="base" quand actif. Le thème par défaut le compose depuis --ar-tab-indicator-color et --ar-tab-indicator-width. Repli `inset 0 -2px 0 Highlight` si aucun thème n'est chargé — sans lui, l'onglet actif est visuellement indiscernable des autres.
```

- [ ] **Step 3: Vérifier la génération du manifest et les tests**

Run: `npm run build:manifest --workspace=@ariane-ui/core`
Expected: succès.

Run: `npx vitest run packages/core/src/components/tab --root /Users/jon/Code/Active_projects/ariane`
Expected: tous les tests passent (valeur themed inchangée : `--ar-tab-active-shadow` reste défini dans `default.css`, ce repli ne s'active que sans thème).

- [ ] **Step 4: Vérification visuelle**

Playground docs, `default.css` désactivé, `ar-tab-group` : l'onglet actif doit afficher un soulignement (indicateur `Highlight`) distinct des autres onglets.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/components/tab/tab.styles.ts packages/core/src/components/tab/tab.ts
git commit -m "fix(tab): repli Highlight sur l'indicateur d'onglet actif sans theme"
```

---

### Task 7: `ar-datepicker` — états du calendrier (sélectionné, aujourd'hui, survol, hors-mois)

**Files:**

- Modify: `packages/core/src/components/datepicker/datepicker.styles.ts:150,154-155,165-166,196-197,207`
- Modify: `packages/core/src/components/datepicker/datepicker.ts:85,87,89-91,95-96`

**Interfaces:** aucun nouveau token — ajout de fallbacks sur des tokens existants, par ordre de priorité (bordure de base > sélectionné > aujourd'hui > survol > hors-mois, cf. audit).

- [ ] **Step 0: Corriger la bordure de base — bug bloquant découvert en revue**

`[part='day']` (ligne 150) utilise le raccourci `border: ... solid ...` avec **deux** `var()` (largeur ET couleur). Si l'un des deux échoue, tout le raccourci s'invalide → `border-style` retombe à `none` → aucune bordure sur **aucune** cellule, thème ou pas — et ça rend inopérante la surcharge `border-color` de `.today` (Step 2 ci-dessous), puisqu'une couleur de bordure ne s'affiche pas si `border-style` est déjà `none`. Il faut scinder ce raccourci en longhands avant de traiter "aujourd'hui".

Remplacer (ligne 150 actuelle) :

```css
border: var(--ar-datepicker-day-border-width) solid var(--ar-datepicker-day-border-color);
```

par :

```css
border-style: solid;
border-width: var(--ar-datepicker-day-border-width);
border-color: var(--ar-datepicker-day-border-color, transparent);
```

(`border-style: solid` devient un littéral structurel hors raccourci — déjà le cas dans le raccourci d'origine, ce n'est pas une nouvelle valeur de design, juste sortie du raccourci qui la rendait fragile. Le fallback `transparent` sur `border-color` restaure le comportement par défaut voulu — aucune bordure visible sans thème — au lieu de la dégradation `currentcolor` qu'aurait donné le longhand seul.)

Documenter dans `datepicker.ts` (repérer l'entrée existante pour `--ar-datepicker-day-border-color`, actuellement ligne 85) :

```
 * @cssprop --ar-datepicker-day-border-color - Couleur de bordure par défaut des cellules jour. Repli `transparent` si aucun thème n'est chargé (préserve l'absence de bordure voulue par défaut ; sans ce repli, une propriété longhand `border-color` isolée dégraderait vers `currentcolor`, une bordure non désirée sur chaque cellule).
```

- [ ] **Step 1: Jour sélectionné (priorité 1)**

Remplacer (lignes 195-199 actuelles) :

```css
[part='day'].selected {
    background-color: var(--ar-datepicker-day-selected-bg);
    color: var(--ar-datepicker-day-selected-color);
    border-color: transparent;
}
```

par :

```css
[part='day'].selected {
    background-color: var(--ar-datepicker-day-selected-bg, Highlight);
    color: var(--ar-datepicker-day-selected-color, HighlightText);
    border-color: transparent;
}
```

- [ ] **Step 2: Bordure « aujourd'hui » (priorité 2)**

Remplacer (lignes 153-157 actuelles) :

```css
[part='day'].today {
    color: var(--ar-datepicker-day-today-color);
    border-color: var(--ar-datepicker-day-today-border);
    background: var(--ar-datepicker-day-today-bg);
}
```

par :

```css
[part='day'].today {
    color: var(--ar-datepicker-day-today-color);
    border-color: var(--ar-datepicker-day-today-border, GrayText);
    background: var(--ar-datepicker-day-today-bg);
}
```

- [ ] **Step 3: Survol (priorité 3)**

Remplacer (lignes 164-167 actuelles) :

```css
[part='day']:not([aria-disabled='true']):not(.disabled):hover {
    background-color: var(--ar-datepicker-day-hover-bg);
    color: var(--ar-datepicker-day-hover-color);
}
```

par :

```css
[part='day']:not([aria-disabled='true']):not(.disabled):hover {
    background-color: var(--ar-datepicker-day-hover-bg, ButtonFace);
    color: var(--ar-datepicker-day-hover-color, ButtonText);
}
```

Note : les deux fallbacks sont ajoutés ensemble, pas seulement le fond. Sans thème, avant ce correctif, fond et texte dégradaient tous les deux vers `transparent`/couleur héritée — aucun risque de contraste puisque rien n'était visible. En ajoutant un fallback de fond seul (`ButtonFace`), on introduirait une combinaison jamais validée (fond système + texte hérité ambiant, sans garantie de contraste) — d'où l'ajout systématique du `ButtonText` pairé. Ce raisonnement ne s'applique pas à "aujourd'hui" (Step 2) : son fond (`--ar-datepicker-day-today-bg`) n'est pas touché par ce plan, donc pas de nouvelle paire à risque.

- [ ] **Step 4: Jours hors-mois (priorité 4)**

Remplacer (lignes 206-208 actuelles) :

```css
[part='day'].other-month {
    color: var(--ar-datepicker-day-other-month-color);
}
```

par :

```css
[part='day'].other-month {
    color: var(--ar-datepicker-day-other-month-color, GrayText);
}
```

- [ ] **Step 5: Documenter les 4 fallbacks dans `datepicker.ts`**

Repérer les entrées existantes correspondantes et les remplacer par :

```
 * @cssprop --ar-datepicker-day-selected-bg - Fond du jour sélectionné. Repli `Highlight` si aucun thème n'est chargé (sinon indiscernable des jours non sélectionnés).
 * @cssprop --ar-datepicker-day-selected-color - Couleur texte du jour sélectionné. Repli `HighlightText` si aucun thème n'est chargé.
 * @cssprop --ar-datepicker-day-today-border - Couleur de bordure du jour actuel. Repli `GrayText` si aucun thème n'est chargé (garde une distinction visible du reste de la grille).
 * @cssprop --ar-datepicker-day-hover-bg - Fond au survol d'un jour. Repli `ButtonFace` si aucun thème n'est chargé.
 * @cssprop --ar-datepicker-day-hover-color - Couleur texte au survol d'un jour. Repli `ButtonText` si aucun thème n'est chargé (pairé avec le repli de --ar-datepicker-day-hover-bg pour garantir le contraste).
 * @cssprop --ar-datepicker-day-other-month-color - Couleur des jours hors du mois affiché. Repli `GrayText` si aucun thème n'est chargé.
```

(Chaque ligne remplace son équivalent actuel sans le repli — les 6 entrées existent déjà dans le fichier (dont `--ar-datepicker-day-border-color`, traitée au Step 0), cf. contexte technique de l'audit ; les retrouver par leur nom de token exact et ajouter uniquement la phrase de repli, sans toucher au reste du texte.)

- [ ] **Step 6: Vérifier la génération du manifest et les tests**

Run: `npm run build:manifest --workspace=@ariane-ui/core`
Expected: succès — le commentaire `a11y-fallback` du Step 0 doit être reconnu par `validate-no-hardcoded-tokens.js` (format exact, ligne immédiatement précédente).

Run: `npx vitest run packages/core/src/components/datepicker --root /Users/jon/Code/Active_projects/ariane`
Expected: tous les tests passent (valeurs themed inchangées — le rendu avec thème doit rester identique malgré le passage du raccourci `border:` aux longhands).

- [ ] **Step 7: Vérification visuelle**

Playground docs, `default.css` désactivé, ouvrir le calendrier : les cellules jour ne doivent avoir aucune bordure visible par défaut (Step 0 corrigé), le jour sélectionné doit être visuellement distinct (fond `Highlight`), aujourd'hui doit garder une bordure distincte (`GrayText` — vérifier qu'elle s'affiche bien, preuve que le Step 0 fonctionne), le survol doit donner un retour visuel avec un texte lisible, les jours hors-mois doivent apparaître atténués.

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/components/datepicker/datepicker.styles.ts packages/core/src/components/datepicker/datepicker.ts
git commit -m "fix(datepicker): replis d'accessibilite sur les etats de la grille + corrige le raccourci border defaillant"
```

---

### Task 8: `ar-charcounter` — signal non-couleur garanti (graisse) pour warning/error

**Files:**

- Modify: `packages/core/src/components/charcounter/charcounter.styles.ts:15,20`
- Modify: `packages/core/src/components/charcounter/charcounter.ts:34-35`

**Interfaces:** aucun nouveau token. Le mécanisme (graisse conditionnelle) existe déjà (`:host([state='warning'])`/`:host([state='error'])`) ; ce correctif garantit qu'il reste fonctionnel sans thème, en traitant la graisse comme une dimension/valeur numérique (mécanisme B), pas une couleur.

- [ ] **Step 1: Ajouter les fallbacks littéraux justifiés**

Remplacer (lignes 13-16 actuelles) :

```css
:host([state='warning']) [part='count'] {
    color: var(--ar-charcounter-warning-color);
    font-weight: var(--ar-charcounter-warning-weight);
}
```

par :

```css
:host([state='warning']) [part='count'] {
    color: var(--ar-charcounter-warning-color);
    /* a11y-fallback: sans thème, la couleur seule (warning/error identiques) ne suffit pas à distinguer les états — la graisse doit rester un signal garanti même sans thème chargé */
    font-weight: var(--ar-charcounter-warning-weight, 700);
}
```

Remplacer (lignes 18-21 actuelles) :

```css
:host([state='error']) [part='count'] {
    color: var(--ar-charcounter-error-color);
    font-weight: var(--ar-charcounter-error-weight);
}
```

par :

```css
:host([state='error']) [part='count'] {
    color: var(--ar-charcounter-error-color);
    /* a11y-fallback: sans thème, la couleur seule (warning/error identiques) ne suffit pas à distinguer les états — la graisse doit rester un signal garanti même sans thème chargé */
    font-weight: var(--ar-charcounter-error-weight, 700);
}
```

- [ ] **Step 2: Documenter les fallbacks dans `charcounter.ts`**

Remplacer (lignes 34-35 actuelles) :

```
 * @cssprop --ar-charcounter-warning-weight - Graisse du texte en état warning.
 * @cssprop --ar-charcounter-error-weight - Graisse du texte en état error.
```

par :

```
 * @cssprop --ar-charcounter-warning-weight - Graisse du texte en état warning. Repli `700` si aucun thème n'est chargé — seul signal garanti d'état si le consommateur n'utilise pas les slots d'icône.
 * @cssprop --ar-charcounter-error-weight - Graisse du texte en état error. Repli `700` si aucun thème n'est chargé.
```

- [ ] **Step 3: Vérifier la génération du manifest, le garde-fou et les tests**

Run: `npm run build:manifest --workspace=@ariane-ui/core`
Expected: succès — le commentaire `a11y-fallback` doit être reconnu par `validate-no-hardcoded-tokens.js` (format exact, ligne immédiatement précédente).

Run: `npx vitest run packages/core/src/components/charcounter --root /Users/jon/Code/Active_projects/ariane`
Expected: tous les tests passent.

- [ ] **Step 4: Vérification visuelle**

Playground docs, `default.css` désactivé, `ar-charcounter` en état warning puis error (sans slots d'icône fournis) : le texte doit apparaître en gras dans les deux cas, distinct de l'état normal.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/components/charcounter/charcounter.styles.ts packages/core/src/components/charcounter/charcounter.ts
git commit -m "fix(charcounter): garantit un repli de graisse pour les etats warning/error sans theme"
```

---

### Task 9: Documenter l'extension dans la spec et l'ADR-005

**Files:**

- Modify: `docs/superpowers/specs/2026-07-22-css-fallback-accessibilite-design.md` (section « Périmètre de cette passe », lignes 87-128)
- Modify: `docs/decisions/ADR-005-tokens-pilotes-par-attribut.md:83,91-93`

**Interfaces:** aucune — documentation uniquement.

- [ ] **Step 1: Ajouter une section « Extension #129 » dans la spec**

À la fin de la section « Périmètre de cette passe » (après la ligne 128, avant la section « Garde-fou CI »), ajouter :

```markdown
### Extension #129 (2026-07-23) — audit du reste des composants

Suite à l'audit dédié annoncé ci-dessus, complété par les décisions prises pendant la revue de #132 :

| Composant                           | Token(s)                                                                                                                                        | Fallback                      | Mécanisme             |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | --------------------- |
| Bouton partagé (`button.styles.ts`) | `--ar-button-focus-ring-color`, `--ar-color-white`                                                                                              | `ButtonText`, `Canvas`        | Couleur système (A)   |
| `ar-tab`                            | `--ar-focus-ring-color`                                                                                                                         | `ButtonText`                  | Couleur système (A)   |
| `ar-tab`                            | `--ar-tab-active-shadow`                                                                                                                        | `inset 0 -2px 0 Highlight`    | Couleur système (A)   |
| `ar-datepicker`                     | `--ar-focus-ring-color` (nav/footer), `--ar-datepicker-day-focus-ring-color` (jours)                                                            | `ButtonText`                  | Couleur système (A)   |
| `ar-datepicker`                     | `--ar-datepicker-day-focus-ring-width`                                                                                                          | `2px`                         | Littéral justifié (B) |
| `ar-datepicker`                     | `--ar-datepicker-day-border-color` (bordure de base, découvert en revue : bug de raccourci `border:` qui rendait aussi "aujourd'hui" inopérant) | `transparent`                 | Littéral justifié (B) |
| `ar-datepicker`                     | `--ar-datepicker-day-selected-bg` / `-color`                                                                                                    | `Highlight` / `HighlightText` | Couleur système (A)   |
| `ar-datepicker`                     | `--ar-datepicker-day-today-border`                                                                                                              | `GrayText`                    | Couleur système (A)   |
| `ar-datepicker`                     | `--ar-datepicker-day-hover-bg` / `-color`                                                                                                       | `ButtonFace` / `ButtonText`   | Couleur système (A)   |
| `ar-datepicker`                     | `--ar-datepicker-day-other-month-color`                                                                                                         | `GrayText`                    | Couleur système (A)   |
| `ar-progressbar`                    | `--ar-progressbar-track-color` / `-fill-color`                                                                                                  | `ButtonFace` / `ButtonText`   | Couleur système (A)   |
| `ar-dialog`                         | `--ar-dialog-bg` / `--ar-dialog-color` (nouveaux tokens scopés, cascade vers `--ar-color-bg`/`--ar-color-text`)                                 | `Canvas` / `CanvasText`       | Couleur système (A)   |
| `ar-charcounter`                    | `--ar-charcounter-warning-weight` / `-error-weight`                                                                                             | `700`                         | Littéral justifié (B) |

**Extension de la liste blanche** : `Highlight`/`HighlightText` ajoutés — aucun mot-clé existant n'a la sémantique exacte « élément sélectionné/actif » requise pour l'onglet actif et le jour sélectionné du datepicker.

**Exclusions délibérées** : la bordure `ar-tab-group` (cosmétique, pas load-bearing) et le token `--ar-color-bg` de `datepicker.styles.ts:178` (question de justesse de référence, pas de fallback — orthogonale, cf. #127) restent hors périmètre.

**Composants sans candidat** (rendu nu déjà correct, vérifié explicitement) : `alert`, `breadcrumb` (hors bouton partagé), `breadcrumb-item`, `charcounter` (hors warning/error), `collapse`, `dropdown` (déjà fait), `dropdown-item`, `pagination` (hors bouton partagé), `spinner`, `stepper` (hors bouton partagé), `stepper-item`, `table-sort`, `tab-group` (hors exclusion ci-dessus), `tab-panel`, `tooltip` (déjà fait).
```

- [ ] **Step 2: Mettre à jour l'ADR-005**

Remplacer (ligne 91-93 actuelles) :

```
`border-radius`, `box-shadow` et le padding générique restent hors exception (purement
cosmétiques). Ce critère devient la règle générale de la librairie ; son application immédiate se
limite aux surfaces flottantes déjà identifiées — l'audit du reste des composants est suivi par
l'issue #129.
```

par :

```
`border-radius`, `box-shadow` et le padding générique restent hors exception (purement
cosmétiques). Ce critère devient la règle générale de la librairie ; son application immédiate se
limite aux surfaces flottantes déjà identifiées. L'audit du reste des composants (issue #129,
2026-07-23) a étendu la liste blanche des mots-clés couleur système avec `Highlight`/
`HighlightText` (sémantique dédiée aux états sélectionné/actif) et corrigé des anneaux de focus
cassés, `ar-progressbar` invisible, `ar-dialog` sans surface visible, l'indicateur d'onglet actif
et les états de la grille `ar-datepicker`.
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-07-22-css-fallback-accessibilite-design.md docs/decisions/ADR-005-tokens-pilotes-par-attribut.md
git commit -m "docs(specs,adr): documente l'extension du fallback CSS d'accessibilite (audit #129)"
```

---

### Task 10: Ouvrir la Pull Request

**Files:** aucun fichier modifié — opération git/GitHub uniquement.

- [ ] **Step 1: Pousser la branche**

```bash
cd /Users/jon/Code/Active_projects/ariane
git push -u origin fix/audit-fallback-a11y-129
```

- [ ] **Step 2: Lancer la suite de tests complète et le build du manifest une dernière fois**

Run: `npm run build:manifest --workspace=@ariane-ui/core && npm run test`
Expected: build du manifest réussi, tous les tests passent.

- [ ] **Step 3: Créer la PR vers `dev`**

```bash
gh pr create --base dev --title "fix: corrige les fallbacks d'accessibilite manquants (audit #129)" --body "$(cat <<'EOF'
## Summary
- Corrige les anneaux de focus casses sans theme (bouton partage, ar-tab, ar-datepicker) — un var() invalide dans un raccourci outline/box-shadow invalide tout le raccourci, pas seulement la couleur (WCAG 2.4.7)
- Corrige ar-progressbar entierement invisible sans theme (WCAG 1.4.11)
- Scope --ar-dialog-bg/--ar-dialog-color (nouveaux tokens, cascade vers les tokens globaux) avec repli Canvas/CanvasText — la modale etait sans surface visible sans theme
- Ajoute un repli Highlight sur l'indicateur d'onglet actif d'ar-tab
- Ajoute des replis sur les etats de la grille ar-datepicker (selectionne priorite 1, aujourd'hui, survol, hors-mois)
- Garantit un signal de graisse pour ar-charcounter en etat warning/error, independant de la couleur
- Etend la liste blanche de mots-cles couleur systeme avec Highlight/HighlightText

Closes #129

## Test plan
- [ ] `npm run build:manifest` passe sans erreur (couverture @cssprop + garde-fou fallback)
- [ ] `npm run test` (suite Vitest complete) passe
- [ ] Verification visuelle manuelle, default.css desactive : ar-tab (focus + onglet actif), ar-datepicker (focus nav/footer/jours, jour selectionne/aujourd'hui/survol/hors-mois), ar-progressbar (rail + remplissage visibles), ar-dialog (surface visible), ar-charcounter (graisse warning/error sans slots d'icone)
EOF
)"
```

- [ ] **Step 4: Confirmer la création**

Run: `gh pr view --web` (ou noter l'URL retournée par `gh pr create`)
Expected: PR ouverte vers `dev`, CI déclenchée.

---

## Self-Review

**1. Couverture des constats de l'audit (2026-07-23) :**

- Anneau de focus cassé (bouton partagé, ar-tab, ar-datepicker×4 sites) → Task 3. ✓
- `ar-progressbar` invisible → Task 4. ✓
- `ar-dialog` sans surface → Task 5. ✓
- Indicateur d'onglet actif → Task 6. ✓
- États datepicker (5 cas, priorité décroissante) + correctif bordure de base (bug de raccourci `border:` découvert en revue, prérequis de "aujourd'hui") + fallback texte pairé au survol (découvert en revue) → Task 7. ✓
- `ar-charcounter` graisse garantie → Task 8. ✓
- Extension liste blanche `Highlight`/`HighlightText` → Task 2. ✓
- Documentation spec + ADR → Task 9. ✓
- Branche (Task 1) et PR (Task 10) encadrent le tout.

**2. Scan de placeholders :** aucun « TBD »/« TODO » — chaque step contient le diff exact.

**3. Cohérence des exclusions :** les deux exclusions délibérées (bordure `ar-tab-group`, `--ar-color-bg` de `datepicker.styles.ts:178`) sont documentées dans les Global Constraints ET reprises dans le tableau de synthèse (Task 9), pour qu'elles ne soient pas oubliées ni reproposées par erreur dans un futur audit.

**4. Cohérence des mécanismes :** chaque fallback est classé A (couleur système) ou B (littéral justifié + commentaire `a11y-fallback`) conformément au garde-fou existant ; aucune couleur littérale hors mécanisme B n'est introduite (le cas `ar-charcounter` traite la graisse, une valeur numérique, pas une couleur — cohérent avec la décision actée de ne pas mettre de fallback couleur sur les tokens warning/error).

**5. Corrections apportées après relecture par l'utilisateur (avant exécution) :** trois points soulevés en revue du plan, tous corrigés — (a) clarification de la distinction entre le cas `ar-dialog` (surface entière invisible, shorthand `background`) et le cas `datepicker.styles.ts:178` (longhand isolée, dégrade en `currentcolor`, pas invisible — exclusion confirmée mais mieux justifiée) ; (b) ajout du fallback `ButtonText` pairé sur `--ar-datepicker-day-hover-color`, manquant à côté du fallback de fond `ButtonFace` (risque de contraste non validé) ; (c) découverte d'un bug bloquant : le raccourci `border:` de la cellule jour de base aurait rendu le fallback "aujourd'hui" totalement inopérant sans le correctif du Step 0 de Task 7.
