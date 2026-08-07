# Audit RTL — Propriétés physiques → logiques Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrer les propriétés CSS physiques (`margin-left/right`, `padding-left/right`, `left`, `text-align: left/right`) identifiées dans l'audit de #140 vers leurs équivalents logiques (`margin-inline-*`, `padding-inline-*`, `inset-inline-start`, `text-align: start/end`), pour que `breadcrumb`, `pagination` et `stepper` s'affichent correctement sous `dir="rtl"` sans configuration côté composant. Remplace en parallèle l'attribut `align` du stepper (mirroring physique gauche/droite) par un attribut booléen `reverse-align`, sémantiquement logique (inverse `start`/`end`) et donc composable avec `dir` — au lieu de rester couplé à des côtés physiques.

**Architecture:** Modifications ciblées de `*.styles.ts` (propriétés CSS uniquement, pas de changement de structure DOM/template) sur `breadcrumb`, `pagination`, `stepper`. Sur `stepper`, en plus : renommage d'un `@property` Lit existant (`align: 'left'|'right'` → `reverseAlign: boolean`, attribut `reverse-align`) et de son sélecteur CSS associé (`:host([align='right'])` → `:host([reverse-align])`, entièrement réécrit en propriétés logiques). `table-sort.styles.ts` (`border-left`/`border-right` symétriques formant un caret) est explicitement hors scope — faux positif de l'audit, aucune dépendance à la direction.

**Tech Stack:** Lit 3, TypeScript, `css` tagged template (`lit`), Vitest (tests unitaires `*.test.ts`), `@web/test-runner` + Chromium (tests navigateur `*.browser.test.ts`), Astro/MDX (doc `apps/docs/`).

## Global Constraints

- Prettier : 100 caractères, 4 espaces, quotes simples.
- `import type` obligatoire pour tout import de type.
- Conventional Commits (commitlint + Husky) — un commit par tâche, message au format `type(scope): description`.
- Aucune valeur de design en dur dans `packages/core` (`var(--token)` sans fallback cosmétique) — hors scope ici, aucune de ces tâches n'introduit de nouveau token.
- `reverse-align` est un breaking change de l'attribut `align` — acceptable en `0.1.0-alpha.8` (pas de deprecation shim requis en alpha, cf. CLAUDE.md).
- Toute nouvelle entrée `@attr`/`@cssprop` JSDoc doit rester synchronisée avec le composant (déjà le cas ici : renommage, pas d'ajout de token).
- Branche de travail : `fix/rtl-logical-properties-140`, créée depuis `dev`. PR vers `dev` en fin de plan.

---

## File Structure

- `packages/core/src/components/breadcrumb/breadcrumb.styles.ts` — 2 déclarations physiques → logiques.
- `packages/core/src/components/pagination/pagination.styles.ts` — 1 déclaration physique → logique.
- `packages/core/src/components/stepper/stepper.styles.ts` — migration du layout par défaut (hors bloc `align`) + réécriture complète du bloc `align` en `reverse-align` logique.
- `packages/core/src/components/stepper/stepper.ts` — renommage de la propriété `align` → `reverseAlign` (JSDoc + `@property`).
- `packages/core/src/components/stepper/stepper.test.ts` — adaptation du bloc de tests `describe('align', ...)`.
- `packages/core/src/components/stepper/stepper.browser.test.ts` — nouveaux tests de rendu (ordre visuel de la puce sous `reverse-align`, comportement sous `dir="rtl"`).
- `apps/docs/src/content/components/ar-stepper.mdx` — variante `align-right` renommée en `reverse-align`.

---

### Task 1: Créer la branche de travail

**Files:** aucun.

- [ ] **Step 1: Créer et basculer sur la branche**

```bash
cd /Users/jon/Code/Active_projects/ariane
git checkout dev
git pull origin dev
git checkout -b fix/rtl-logical-properties-140
```

---

### Task 2: `breadcrumb.styles.ts` — propriétés logiques

**Files:**

- Modify: `packages/core/src/components/breadcrumb/breadcrumb.styles.ts:12` et `:65`
- Test: `packages/core/src/components/breadcrumb/breadcrumb.browser.test.ts`

**Interfaces:** aucune — changement CSS pur, aucune API TS/attribut affectée.

- [ ] **Step 1: Écrire le test qui vérifie les propriétés logiques (doit échouer avant le fix)**

Ajouter dans `packages/core/src/components/breadcrumb/breadcrumb.browser.test.ts` (à la suite des `describe` existants, avant la fermeture du fichier) :

```ts
describe('propriétés logiques (RTL)', () => {
    it('[part="nav"] utilise padding-inline-end plutôt que padding-right', async () => {
        el = await fixture<ArBreadcrumb>(html`
            <ar-breadcrumb>
                <ar-breadcrumb-item href="/" label="Accueil"></ar-breadcrumb-item>
                <ar-breadcrumb-item current label="Page"></ar-breadcrumb-item>
            </ar-breadcrumb>
        `);
        const nav = el.shadowRoot?.querySelector<HTMLElement>('[part="nav"]');
        if (!nav) throw new Error('[part="nav"] introuvable');
        const style = getComputedStyle(nav);
        expect(style.paddingInlineEnd).to.equal('4px');
        expect(style.paddingRight).to.equal('0px');
    });
});
```

Vérifier en tête de fichier que `ArBreadcrumb` est bien importé (sinon ajouter `import type { ArBreadcrumb } from './breadcrumb.js';`), et que la fixture respecte la structure réelle du composant (items requis pour un rendu valide) — s'aligner sur les fixtures déjà utilisées plus haut dans le même fichier.

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run test:all -- --group breadcrumb`

(Si ce script n'existe pas tel quel, utiliser la commande WTR standard du projet : `npx wtr --group breadcrumb` depuis `packages/core`, ou consulter `package.json` racine pour le script exact `test:all`.)

Expected: FAIL — `paddingInlineEnd` est `'0px'` et `paddingRight` est `'4px'` (comportement actuel physique).

- [ ] **Step 3: Migrer les propriétés physiques vers logiques**

Dans `packages/core/src/components/breadcrumb/breadcrumb.styles.ts` :

```diff
     [part='nav'] {
-        padding-right: 0.25rem;
+        padding-inline-end: 0.25rem;
     }
```

```diff
     [part~='list--mobile']:before {
         content: '';
         display: block;
         position: absolute;
         width: 1.875rem;
         top: 1.5rem;
         bottom: 1.5rem;
-        left: 0;
+        inset-inline-start: 0;
         background-image: linear-gradient(
```

- [ ] **Step 4: Relancer le test et vérifier qu'il passe**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run test:all -- --group breadcrumb`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/components/breadcrumb/breadcrumb.styles.ts packages/core/src/components/breadcrumb/breadcrumb.browser.test.ts
git commit -m "fix(breadcrumb): migre padding-right/left vers propriétés logiques (RTL)"
```

---

### Task 3: `pagination.styles.ts` — propriété logique

**Files:**

- Modify: `packages/core/src/components/pagination/pagination.styles.ts:13`
- Test: `packages/core/src/components/pagination/pagination.browser.test.ts` (créer le describe s'il n'existe pas encore de fichier `.browser.test.ts` — vérifier d'abord avec `find packages/core/src/components/pagination -name "*.test.ts"`)

**Interfaces:** aucune — changement CSS pur.

- [ ] **Step 1: Vérifier l'existence du fichier de test navigateur**

```bash
find /Users/jon/Code/Active_projects/ariane/packages/core/src/components/pagination -name "*.test.ts"
```

Si `pagination.browser.test.ts` n'existe pas, le créer avec cet en-tête (calqué sur le pattern `stepper.browser.test.ts`) :

```ts
/// <reference types="mocha" />
/**
 * pagination.browser.test.ts
 *
 * Tests nécessitant un vrai browser (Chromium via @web/test-runner) :
 *   - Propriétés CSS logiques (RTL)
 */
import { fixture, html, expect } from '@open-wc/testing';
import type { ArPagination } from './pagination.js';
import './index.js';

describe('ar-pagination — browser', () => {
    let el: ArPagination;

    afterEach(() => el?.remove());

    describe('propriétés logiques (RTL)', () => {
        it('[part="list"] utilise padding-inline-start plutôt que padding-left', async () => {
            el = await fixture<ArPagination>(html`
                <ar-pagination total-pages="5" current-page="1"></ar-pagination>
            `);
            const list = el.shadowRoot?.querySelector<HTMLElement>('[part="list"]');
            if (!list) throw new Error('[part="list"] introuvable');
            const style = getComputedStyle(list);
            expect(style.paddingInlineStart).to.equal('0px');
        });
    });
});
```

Adapter les attributs de la fixture (`total-pages`, `current-page`) aux attributs réels du composant — vérifier dans `pagination.ts` si les noms diffèrent avant d'écrire ce test.

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue (ou passe déjà par coïncidence)**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run test:all -- --group pagination`

`padding-inline-start` et `padding-left` sont équivalents en LTR (0px de toute façon ici) donc ce test seul ne distingue pas physique/logique en LTR pur. Ajouter en complément une assertion directe sur la règle source (plus fiable que le computed style pour ce cas particulier) :

```ts
it('la règle CSS source déclare padding-inline-start, pas padding-left', () => {
    const sheet = [...(el.shadowRoot?.adoptedStyleSheets ?? [])];
    const cssText = sheet.flatMap((s) => [...s.cssRules]).map((r) => r.cssText);
    const listRule = cssText.find((rule) => rule.includes("[part='list']"));
    expect(listRule).to.include('padding-inline-start');
    expect(listRule).to.not.include('padding-left');
});
```

Expected: FAIL sur cette seconde assertion (la règle actuelle contient `padding-left`).

- [ ] **Step 3: Migrer la propriété physique vers logique**

Dans `packages/core/src/components/pagination/pagination.styles.ts` :

```diff
     [part='list'] {
         display: flex;
         flex-wrap: wrap;
         justify-content: center;
-        padding-left: 0;
+        padding-inline-start: 0;
         margin-bottom: 0;
         list-style: none;
     }
```

- [ ] **Step 4: Relancer les tests et vérifier qu'ils passent**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run test:all -- --group pagination`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/components/pagination/pagination.styles.ts packages/core/src/components/pagination/pagination.browser.test.ts
git commit -m "fix(pagination): migre padding-left vers padding-inline-start (RTL)"
```

---

### Task 4: `stepper.styles.ts` — layout par défaut en propriétés logiques

**Files:**

- Modify: `packages/core/src/components/stepper/stepper.styles.ts:55`, `:139-140`
- Test: `packages/core/src/components/stepper/stepper.browser.test.ts`

**Interfaces:** aucune — changement CSS pur, ne touche pas au bloc `align`/`reverse-align` (Task 5).

- [ ] **Step 1: Écrire le test qui vérifie les propriétés logiques par défaut**

Ajouter dans `packages/core/src/components/stepper/stepper.browser.test.ts` (nouveau describe, après ceux existants) :

```ts
describe('propriétés logiques par défaut (RTL)', () => {
    async function desktopStepper(): Promise<ArStepper> {
        const stepper = await fixture<ArStepper>(html`
            <ar-stepper current-path="/step2" desktop-from="0">
                <ar-stepper-item label="Étape 1" href="/step1">
                    <ar-stepper-item label="Sous-étape 1" href="/step1-1"></ar-stepper-item>
                </ar-stepper-item>
                <ar-stepper-item label="Étape 2" href="/step2"></ar-stepper-item>
            </ar-stepper>
        `);
        await aTimeout(50);
        return stepper;
    }

    it('la puce utilise margin-inline-end plutôt que margin-right', async () => {
        el = await desktopStepper();
        const bullet = el.shadowRoot?.querySelector<HTMLElement>('[part~="bullet"]');
        if (!bullet) throw new Error('[part~="bullet"] introuvable');
        const style = getComputedStyle(bullet);
        expect(style.marginInlineEnd).to.equal('8px');
        expect(style.marginRight).to.equal('0px');
    });

    it('la puce de sous-étape utilise margin-inline-start/end plutôt que margin-left/right', async () => {
        el = await desktopStepper();
        const subBullet = el.shadowRoot?.querySelector<HTMLElement>(
            "[part='substep'] [part~='bullet']",
        );
        if (!subBullet) throw new Error("[part='substep'] [part~='bullet'] introuvable");
        const style = getComputedStyle(subBullet);
        expect(style.marginInlineStart).to.equal('12px');
        expect(style.marginInlineEnd).to.equal('20px');
        expect(style.marginLeft).to.equal('0px');
        expect(style.marginRight).to.equal('0px');
    });
});
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run test:all -- --group stepper`

Expected: FAIL — actuellement `marginRight` vaut `8px`/`20px` et `marginInlineEnd` vaut `0px`.

- [ ] **Step 3: Migrer les propriétés physiques vers logiques**

Dans `packages/core/src/components/stepper/stepper.styles.ts` :

```diff
     [part~='bullet'] {
         width: 2.25rem;
         height: 2.25rem;
         display: flex;
         flex-shrink: 0;
         justify-content: center;
         padding-bottom: 0.125rem;
-        margin-right: 0.5rem;
+        margin-inline-end: 0.5rem;
         transform: translateY(1px);
```

```diff
     [part='substep'] [part~='bullet'] {
         width: 0.75rem;
         height: 0.75rem;
-        margin-left: 0.75rem;
-        margin-right: 1.25rem;
+        margin-inline-start: 0.75rem;
+        margin-inline-end: 1.25rem;
         display: block;
         padding-bottom: 0;
```

- [ ] **Step 4: Relancer le test et vérifier qu'il passe**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run test:all -- --group stepper`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/components/stepper/stepper.styles.ts packages/core/src/components/stepper/stepper.browser.test.ts
git commit -m "fix(stepper): migre les marges par défaut des puces vers margin-inline-* (RTL)"
```

---

### Task 5: `stepper` — renommage `align` → `reverse-align`

**Files:**

- Modify: `packages/core/src/components/stepper/stepper.ts:135-142`
- Modify: `packages/core/src/components/stepper/stepper.styles.ts:154-180`
- Modify: `packages/core/src/components/stepper/stepper.test.ts:607-619`

**Interfaces:**

- Consumes: rien de nouveau.
- Produces: `ArStepper.reverseAlign: boolean` (attribut HTML `reverse-align`, reflété), remplace `ArStepper.align: 'left' | 'right'`. Tâche 6 (doc) et toute tâche future s'appuyant sur le stepper doivent utiliser ce nom.

- [ ] **Step 1: Adapter le test existant au nouveau nom (rouge avant le fix)**

Dans `packages/core/src/components/stepper/stepper.test.ts`, remplacer le bloc `describe('align', ...)` (lignes 607-619) par :

```ts
// ── Alignement ────────────────────────────────────────────────────────────

describe('reverse-align', () => {
    it('vaut false par défaut', async () => {
        const el = await fixture<ArStepper>(`<ar-stepper></ar-stepper>`);
        expect(el.reverseAlign).toBe(false);
    });

    it('est réfléchi comme attribut HTML', async () => {
        const el = await fixture<ArStepper>(`<ar-stepper reverse-align></ar-stepper>`);
        expect(el.hasAttribute('reverse-align')).toBe(true);
        expect(el.reverseAlign).toBe(true);
    });
});
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run test -- stepper.test.ts`

Expected: FAIL — `el.reverseAlign` est `undefined` (la propriété n'existe pas encore).

- [ ] **Step 3: Renommer la propriété dans `stepper.ts`**

Dans `packages/core/src/components/stepper/stepper.ts`, remplacer (lignes 135-142) :

```diff
     /**
-     * Alignement de la liste d'étapes : `left` (défaut) ou `right`.
-     * **Note** — l'alignement `right` ne s'applique qu'en mode desktop (rendu liste verticale).
-     * En mode mobile (dropdown), les items restent alignés à gauche.
-     * @attr align
+     * Inverse l'alignement de la liste d'étapes en mode desktop. Sans effet en mode
+     * mobile (dropdown).
+     * @attr reverse-align
      */
-    @property({ type: String, attribute: 'align', reflect: true })
-    align: 'left' | 'right' = 'left';
+    @property({ attribute: 'reverse-align', reflect: true, type: Boolean })
+    reverseAlign = false;
```

- [ ] **Step 4: Réécrire le bloc CSS en propriétés logiques dans `stepper.styles.ts`**

Remplacer (lignes 154-180) :

```diff
-    :host([align='right']) .desktop {
+    :host([reverse-align]) .desktop {
         .item {
             align-items: flex-end;
-            text-align: right;
+            text-align: end;

             &::after {
-                margin-left: auto;
+                margin-inline-start: auto;
             }
         }

         .item-header {
             justify-content: flex-end;
-            margin-left: auto;
-            text-align: right;
+            margin-inline-start: auto;
+            text-align: end;
         }

         [part~='bullet'] {
             order: 2;
-            margin-right: 0;
-            margin-left: 0.5rem;
+            margin-inline-end: 0;
+            margin-inline-start: 0.5rem;
         }

         [part='substep'] [part~='bullet'] {
-            margin-left: 1.25rem;
-            margin-right: 0.75rem;
+            margin-inline-start: 1.25rem;
+            margin-inline-end: 0.75rem;
         }
     }
```

- [ ] **Step 5: Relancer les tests et vérifier qu'ils passent**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run test -- stepper.test.ts`

Expected: PASS.

- [ ] **Step 6: Ajouter un test navigateur vérifiant la composition avec `dir="rtl"`**

Dans `packages/core/src/components/stepper/stepper.browser.test.ts`, ajouter à la suite du describe de la Task 4 :

```ts
describe('reverse-align × dir', () => {
    async function desktopStepper(reverseAlign: boolean, dir?: 'rtl'): Promise<ArStepper> {
        const stepper = await fixture<ArStepper>(html`
            <ar-stepper
                current-path="/step2"
                desktop-from="0"
                ?reverse-align=${reverseAlign}
                dir=${dir ?? 'ltr'}
            >
                <ar-stepper-item label="Étape 1" href="/step1"></ar-stepper-item>
                <ar-stepper-item label="Étape 2" href="/step2"></ar-stepper-item>
            </ar-stepper>
        `);
        await aTimeout(50);
        return stepper;
    }

    it('sans reverse-align, en LTR : la puce garde order initial (0)', async () => {
        el = await desktopStepper(false);
        const bullet = el.shadowRoot?.querySelector<HTMLElement>('[part~="bullet"]');
        if (!bullet) throw new Error('[part~="bullet"] introuvable');
        expect(getComputedStyle(bullet).order).to.equal('0');
    });

    it('avec reverse-align, en LTR : la puce passe en fin de ligne (order 2)', async () => {
        el = await desktopStepper(true);
        const bullet = el.shadowRoot?.querySelector<HTMLElement>('[part~="bullet"]');
        if (!bullet) throw new Error('[part~="bullet"] introuvable');
        expect(getComputedStyle(bullet).order).to.equal('2');
    });

    it('avec reverse-align, en RTL : la puce passe aussi en fin de ligne (order 2) — effet composable avec dir', async () => {
        el = await desktopStepper(true, 'rtl');
        const bullet = el.shadowRoot?.querySelector<HTMLElement>('[part~="bullet"]');
        if (!bullet) throw new Error('[part~="bullet"] introuvable');
        expect(getComputedStyle(bullet).order).to.equal('2');
    });
});
```

- [ ] **Step 7: Lancer tous les tests stepper (unit + browser) et vérifier qu'ils passent**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run test -- stepper.test.ts && npm run test:all -- --group stepper`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/components/stepper/stepper.ts packages/core/src/components/stepper/stepper.styles.ts packages/core/src/components/stepper/stepper.test.ts packages/core/src/components/stepper/stepper.browser.test.ts
git commit -m "fix(stepper)!: remplace align (left/right) par reverse-align (booléen, logique)

BREAKING CHANGE: l'attribut align est supprimé. Utiliser reverse-align (booléen) —
sémantique start/end composable avec dir, au lieu de valeurs physiques left/right."
```

---

### Task 6: Documentation — `ar-stepper.mdx`

**Files:**

- Modify: `apps/docs/src/content/components/ar-stepper.mdx:49-67`

**Interfaces:** aucune — documentation uniquement, consomme `reverse-align` produit par Task 5.

- [ ] **Step 1: Renommer la variante `align-right`**

Dans `apps/docs/src/content/components/ar-stepper.mdx`, remplacer (lignes 49-67) :

```diff
-    - name: align-right
-      label: Alignement droite
-      description: Le stepper peut être aligné à droite en mode desktop via l'attribut align.
+    - name: reverse-align
+      label: Alignement inversé
+      description: Inverse l'alignement de la liste d'étapes en mode desktop.
       html: |
-          <ar-stepper current-path="etape-1-2" align="right">
+          <ar-stepper current-path="etape-1-2" reverse-align>
             <!-- Étape 1 -->
             <ar-stepper-item path="etape-1" label="Mes informations" href="#">
                 <ar-stepper-item path="etape-1-1" label="Mon état civil" href="#"></ar-stepper-item>
                 <ar-stepper-item path="etape-1-2" label="Mes coordonnées" href="#"></ar-stepper-item>
                 <ar-stepper-item path="etape-1-3" label="Mes identifiants" href="#"></ar-stepper-item>
             </ar-stepper-item>
             <!-- Étape 2 -->
             <ar-stepper-item path="etape-2" label="Mes préférences" href="#">
                 <ar-stepper-item path="etape-2-1" label="Mes notifications" href="#etape-2-1"></ar-stepper-item>
                 <ar-stepper-item path="etape-2-2" label="Mes langues" href="#etape-2-2"></ar-stepper-item>
             </ar-stepper-item>
             <!-- Étape 3 -->
             <ar-stepper-item path="etape-3" label="Récapitulatif"></ar-stepper-item>
           </ar-stepper>
```

- [ ] **Step 2: Lancer le dev server docs et vérifier visuellement**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run dev --workspace=apps/docs`

Ouvrir la page stepper, vérifier que la variante "Alignement inversé" s'affiche correctement. Arrêter le serveur (`Ctrl+C`) une fois vérifié.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/src/content/components/ar-stepper.mdx
git commit -m "docs(stepper): renomme la variante align-right en reverse-align"
```

---

### Task 7: `themes/default.css` — propriétés logiques

**Files:**

- Modify: `packages/core/src/styles/themes/default.css:757-800` (`ar-datepicker`), `:912-920` (`ar-alert`), `:1060-1067` (`ar-breadcrumb`)

**Interfaces:** aucune — changement CSS pur dans le thème de référence, aucune API composant affectée.

Portée élargie au-delà des 3 composants déjà corrigés (décision explicite) : `default.css` doit illustrer la bonne pratique pour l'ensemble du thème, y compris `ar-alert` et `ar-datepicker` qui n'ont pas de propriété physique dans leurs `*.styles.ts` respectifs (elles sont uniquement dans le thème).

- [ ] **Step 1: Migrer `ar-breadcrumb` (trigger, gap avec le bouton home)**

```diff
         &::part(trigger) {
-            margin-left: 0.5rem;
+            margin-inline-start: 0.5rem;
         }
```

- [ ] **Step 2: Migrer `ar-alert` (bouton de fermeture positionné en coin)**

```diff
         &::part(close) {
             border-radius: var(--ar-border-radius-md);
             color: currentColor;
             background-color: color-mix(in srgb, currentColor 8%, transparent);
             opacity: 0.75;
             position: relative;
             top: -0.2rem;
-            right: -0.2rem;
+            inset-inline-end: -0.2rem;
         }
```

- [ ] **Step 3: Migrer `ar-datepicker` (input + trigger fusionnés visuellement)**

```diff
         &::part(input) {
             height: var(--ar-button-height);
             box-sizing: border-box;
             padding: 0 0.75rem;
             border: 1px solid var(--ar-color-border);
-            border-right: none;
-            border-radius: var(--ar-border-radius-md) 0 0 var(--ar-border-radius-md);
+            border-inline-end: none;
+            border-start-start-radius: var(--ar-border-radius-md);
+            border-end-start-radius: var(--ar-border-radius-md);
             background: var(--ar-color-bg);
             color: var(--ar-color-text);
             font-size: var(--ar-font-size-md);
             font-family: inherit;
             outline: none;
             transition: border-color 0.15s ease;
         }
```

```diff
         &::part(trigger) {
             width: var(--ar-button-height);
             height: var(--ar-button-height);
             background: var(--ar-color-interactive);
             color: var(--ar-color-text-inverse);
             border: 1px solid var(--ar-color-interactive);
-            border-radius: 0 var(--ar-border-radius-md) var(--ar-border-radius-md) 0;
+            border-start-end-radius: var(--ar-border-radius-md);
+            border-end-end-radius: var(--ar-border-radius-md);
             cursor: pointer;
             transition:
                 background 0.15s ease,
                 border-color 0.15s ease;
         }
```

- [ ] **Step 4: Vérification visuelle**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run dev`

Ouvrir la doc, vérifier que `ar-alert` (bouton fermeture), `ar-datepicker` (input + bouton calendrier accolés, coins arrondis du bon côté) et `ar-breadcrumb` (bouton mobile) sont visuellement identiques à avant (ce sont des équivalences 1:1 en LTR, aucune régression visuelle attendue). Optionnel : poser `dir="rtl"` temporairement sur `<html>` via les devtools pour confirmer que les coins/bordures basculent correctement.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/styles/themes/default.css
git commit -m "fix(theme): migre les propriétés physiques du thème par défaut vers logiques (alert, datepicker, breadcrumb)"
```

---

### Task 8: Vérification finale, manifest, PR

**Files:**

- Modify: `packages/core/custom-elements.json` (régénéré, pas édité à la main)

- [ ] **Step 1: Régénérer le manifest CEM**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run build:manifest`

Expected: le fichier `packages/core/custom-elements.json` est mis à jour, `align` disparaît du manifest, `reverse-align` (type boolean) apparaît pour `ar-stepper`.

- [ ] **Step 2: Suite complète Vitest + WTR**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run test:all`

Expected: tous les tests passent, y compris ceux ajoutés dans les tâches 2, 3, 4, 5.

- [ ] **Step 3: Lint et typecheck**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run lint && npm run typecheck` (adapter aux scripts exacts du `package.json` racine si les noms diffèrent — vérifier avec `cat package.json | grep -A2 '"scripts"'` si besoin).

Expected: aucune erreur.

- [ ] **Step 4: Commit du manifest régénéré (si diff)**

```bash
git add packages/core/custom-elements.json
git commit -m "chore(stepper): régénère custom-elements.json (reverse-align)"
```

(Si aucun diff, passer cette étape — ne pas créer de commit vide.)

- [ ] **Step 5: Push et création de la PR vers `dev`**

```bash
git push -u origin fix/rtl-logical-properties-140
gh pr create --base dev --title "fix(rtl): migre les propriétés physiques vers logiques (breadcrumb, pagination, stepper)" --body "$(cat <<'EOF'
## Résumé

Corrige #140 (audit RTL) pour les composants où l'audit a confirmé un bug réel :

- `breadcrumb` : `padding-right` → `padding-inline-end`, `left: 0` → `inset-inline-start`
- `pagination` : `padding-left: 0` → `padding-inline-start: 0`
- `stepper` : marges par défaut des puces migrées en `margin-inline-*`
- `themes/default.css` : `ar-breadcrumb`, `ar-alert`, `ar-datepicker` — le thème de référence illustre maintenant la bonne pratique logique, y compris pour des composants hors du scope initial de l'audit

`table-sort` (border-left/right symétriques) est exclu — faux positif, aucune dépendance à la direction.

## Breaking change

L'attribut `align` (`left`/`right`) du stepper est remplacé par `reverse-align` (booléen).
Raison : `align` n'a jamais été un mécanisme RTL — c'est un mirroring de mise en page
volontaire, indépendant de la langue. La nouvelle sémantique (`start`/`end` inversés via
un booléen) reste physique dans son intention mais s'implémente entièrement en
propriétés logiques, ce qui la rend composable avec le support RTL natif du composant
(`dir`) au lieu d'y être étrangère.

Acceptable en `0.1.0-alpha.8` — pas de deprecation shim (non nécessaire en alpha, cf. CLAUDE.md).

## Test plan

- [ ] `npm run test:all` passe (unit Vitest + navigateur WTR)
- [ ] Vérification visuelle de la page doc stepper (variante "Alignement inversé" + section RTL)
- [ ] `npm run build:manifest` régénéré sans diff inattendu

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

**Couverture spec :**

- 4 propriétés physiques réelles identifiées dans l'audit → Tasks 2, 3, 4 (breadcrumb ×2, pagination ×1, stepper ×2).
- Faux positif `table-sort` → explicitement exclu (Global Constraints + résumé PR), aucune tâche dessus.
- Renommage `align` → `reverse-align`, décision verrouillée avec l'utilisateur (booléen, logique, composable avec `dir`) → Task 5.
- Doc stepper (renommage de la variante) → Task 6, conforme à `feedback_docs_in_component_plan`.
- `themes/default.css` élargi à tout le thème (alert, datepicker inclus), décision explicite de l'utilisateur → Task 7.
- Branche en Task 1, PR en dernière tâche → conforme à `feedback_plan_branch_and_pr`.
- Manifest CEM régénéré avant PR → Task 8.

**Placeholders :** aucun — chaque step contient le diff ou le code exact, pas de "TODO"/"gérer les cas".

**Cohérence des types/noms :** `reverseAlign: boolean` / attribut `reverse-align` utilisés identiquement dans `stepper.ts` (Task 5), `stepper.test.ts` (Task 5), `stepper.browser.test.ts` (Task 5), `ar-stepper.mdx` (Task 6).
