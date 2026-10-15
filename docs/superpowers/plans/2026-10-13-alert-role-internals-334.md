# ar-alert : rôle par défaut via `ElementInternals`, suppression d'`urgent` (#334) — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `ar-alert` pose son rôle ARIA par défaut dans `ElementInternals.role` au lieu d'écrire l'attribut `role`; un attribut `role` écrit par l'auteur le remplace; `urgent` disparaît.

**Architecture:** `_updateRole()` assigne `this.internals.role` (`alert` pour `error`/`warning`, `status` sinon, `null` avec `without-notification`) dès `connectedCallback` puis à chaque changement de `variant` ou `withoutNotification`. Aucune écriture de l'attribut `role`. Un plugin Web Test Runner lit l'arbre d'accessibilité réel de Chromium par CDP pour prouver que l'attribut l'emporte sur le défaut des internals.

**Tech Stack:** Lit 3, TypeScript strict, Vitest (happy-dom, faux `ElementInternals`), Web Test Runner + Playwright (Chromium, WebKit), `@web/test-runner-commands`.

**Spec:** `docs/superpowers/specs/2026-10-13-alert-role-internals-334-design.md`

## Global Constraints

- Prettier : 100 caractères, 4 espaces, guillemets simples. `import type` pour tout import de type.
- Commits Conventional Commits sur la branche existante `feat/alert-role-internals-334` (spec et page de test déjà commités). **Ne jamais pousser ni ouvrir de PR sans confirmation du mainteneur.**
- Node 24 : préfixer chaque commande npm par `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null &&`, chemins absolus (racine : `/Users/jon/Code/Active_projects/ariane`).
- Pas de `warnDeprecated` (alpha, CLAUDE.md). Changement incompatible : footer `BREAKING CHANGE` dans le message du commit d'implémentation et dans le message de squash.
- API publique modifiée : mettre à jour le skill (`packages/core/scripts/skill/content/`) ; `npm run check:skill` doit passer.
- Aucune dépendance nouvelle à installer, sauf `@web/test-runner-commands` déclaré en `devDependencies` (déjà présent dans l'arbre installé, transitif de `@web/test-runner`).
- Tests navigateur locaux sans Firefox : `ARIANE_BROWSERS=chromium,webkit` (Firefox ne démarre pas sur macOS 27).

## Review Focus

1. Un attribut `role` écrit par l'auteur remplace le défaut dans l'arbre d'accessibilité réel, dans les deux sens (`error` + `status`, `info` + `alert`) (Tâche 1, 2).
2. Retirer l'attribut `role` restaure le défaut de la variante (Tâche 1, 2).
3. Le rôle par défaut existe dès l'insertion dans le DOM, avant le premier rendu : une alerte insérée dynamiquement n'est pas muette (Tâche 2).
4. `without-notification` basculé à chaud, dans les deux sens, retire puis rétablit le rôle (Tâche 2).
5. Sans `ElementInternals` (happy-dom, anciens navigateurs) : aucune exception, aucun attribut `role` écrit, un `role="banner"` d'auteur n'est ni modifié ni signalé par un avertissement (Tâche 2).

---

### Task 1: Test navigateur sur l'arbre d'accessibilité réel (rouge)

**Files:**

- Modify: `packages/core/package.json` (devDependency)
- Modify: `packages/core/web-test-runner.config.js` (plugin `ax-role`)
- Create: `packages/core/src/components/alert/alert.role.browser.test.ts`

**Interfaces:**

- Produces: commande WTR `ax-role` (`{ selector: string }` → `{ role: string | null; ignored: boolean } | null`, `null` hors Chromium), consommée par ce fichier de test et réutilisable ailleurs.

- [ ] **Step 1: Déclarer la dépendance de test**

Run: `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && cd /Users/jon/Code/Active_projects/ariane && npm view @web/test-runner-commands version && grep -n '"version"' node_modules/@web/test-runner-commands/package.json`
Expected: la version installée (1.x). Ajouter dans `packages/core/package.json`, dans `devDependencies`, après `@web/dev-server-esbuild` : `"@web/test-runner-commands": "^1.0.0",` (même plage que le lockfile). Puis `npm install --package-lock-only` ne doit modifier le lockfile que pour déclarer la dépendance directe.

- [ ] **Step 2: Ajouter le plugin CDP à la configuration WTR**

Dans `web-test-runner.config.js`, avant `export default`, ajouter :

```js
/**
 * Commande `ax-role` : rôle calculé de l'arbre d'accessibilité réel (CDP, Chromium seulement).
 * `ariaSnapshot` de Playwright est calculé depuis le DOM et ne voit pas `ElementInternals.role` ;
 * `page.accessibility` n'existe plus. Renvoie `null` hors Chromium.
 */
function axRolePlugin() {
    return {
        name: 'ax-role',
        async executeCommand({ command, payload, session }) {
            if (command !== 'ax-role') return undefined;
            const page = session.browser.getPage(session.id);
            if (page.context().browser()?.browserType().name() !== 'chromium') return null;
            const cdp = await page.context().newCDPSession(page);
            try {
                const { root } = await cdp.send('DOM.getDocument');
                const { nodeId } = await cdp.send('DOM.querySelector', {
                    nodeId: root.nodeId,
                    selector: payload.selector,
                });
                const { nodes } = await cdp.send('Accessibility.getPartialAXTree', {
                    nodeId,
                    fetchRelatives: false,
                });
                const node = nodes[0];
                return { role: node?.role?.value ?? null, ignored: Boolean(node?.ignored) };
            } finally {
                await cdp.detach();
            }
        },
    };
}
```

et ajouter `axRolePlugin()` au tableau `plugins` (après `esbuildPlugin(...)`).

- [ ] **Step 3: Écrire le test navigateur**

Créer `packages/core/src/components/alert/alert.role.browser.test.ts` :

```ts
/// <reference types="mocha" />
/**
 * Rôle d'ar-alert dans l'arbre d'accessibilité réel (Chromium, par CDP) : le défaut vient de
 * `ElementInternals.role`, l'attribut `role` de l'auteur le remplace, et le composant n'écrit
 * jamais l'attribut `role` lui-même. WebKit : seuls les tests sans arbre d'accessibilité tournent.
 */
import { executeServerCommand } from '@web/test-runner-commands';
import { expect, fixture, html } from '@open-wc/testing';
import type { ArAlert } from './alert.js';
import './index.js';

document.documentElement.lang = 'fr';

interface AxNode {
    role: string | null;
    ignored: boolean;
}

let counter = 0;

/** Rôle calculé de l'élément dans l'arbre d'accessibilité, `null` si le moteur ne le permet pas. */
async function axRole(el: Element): Promise<AxNode | null> {
    el.id ||= `ax-target-${counter++}`;
    return (await executeServerCommand('ax-role', { selector: `#${el.id}` })) as AxNode | null;
}

describe('ar-alert — rôle dans l’arbre d’accessibilité', () => {
    let el: ArAlert;
    afterEach(() => el?.remove());

    const cases: Array<[string, string]> = [
        ['error', 'alert'],
        ['warning', 'alert'],
        ['success', 'status'],
        ['info', 'status'],
        ['custom', 'status'],
    ];

    for (const [variant, expected] of cases) {
        it(`variant="${variant}" expose le rôle ${expected} sans attribut role`, async function () {
            el = await fixture(html`<ar-alert variant=${variant}>Message</ar-alert>`);
            expect(el.hasAttribute('role')).to.equal(false);
            const node = await axRole(el);
            if (node === null) return this.skip();
            expect(node.role).to.equal(expected);
        });
    }

    it('role="status" écrit sur une error remplace le défaut', async function () {
        el = await fixture(html`<ar-alert variant="error" role="status">Message</ar-alert>`);
        const node = await axRole(el);
        if (node === null) return this.skip();
        expect(node.role).to.equal('status');
    });

    it('role="alert" écrit sur une info remplace le défaut', async function () {
        el = await fixture(html`<ar-alert variant="info" role="alert">Message</ar-alert>`);
        const node = await axRole(el);
        if (node === null) return this.skip();
        expect(node.role).to.equal('alert');
    });

    it("retirer l'attribut role restaure le défaut de la variante", async function () {
        el = await fixture(html`<ar-alert variant="error" role="status">Message</ar-alert>`);
        el.removeAttribute('role');
        await el.updateComplete;
        const node = await axRole(el);
        if (node === null) return this.skip();
        expect(node.role).to.equal('alert');
    });

    it('changer variant à chaud met à jour le rôle', async function () {
        el = await fixture(html`<ar-alert variant="info">Message</ar-alert>`);
        el.setAttribute('variant', 'error');
        await el.updateComplete;
        const node = await axRole(el);
        if (node === null) return this.skip();
        expect(node.role).to.equal('alert');
    });

    it('without-notification retire le rôle, et le rétablit une fois retiré', async function () {
        el = await fixture(html`<ar-alert variant="error" without-notification>Message</ar-alert>`);
        const silent = await axRole(el);
        if (silent === null) return this.skip();
        expect(silent.role).to.not.equal('alert');

        el.removeAttribute('without-notification');
        await el.updateComplete;
        expect((await axRole(el))?.role).to.equal('alert');
    });

    it("n'écrit jamais l'attribut role, même quand le rôle change", async () => {
        const seen: string[] = [];
        const host = document.createElement('div');
        document.body.append(host);
        const observer = new MutationObserver((records) => {
            for (const r of records) if (r.attributeName === 'role') seen.push('role');
        });
        el = document.createElement('ar-alert') as ArAlert;
        observer.observe(el, { attributes: true, attributeFilter: ['role'] });
        el.setAttribute('variant', 'error');
        host.append(el);
        await el.updateComplete;
        el.setAttribute('variant', 'info');
        await el.updateComplete;
        observer.disconnect();
        host.remove();
        expect(seen).to.deep.equal([]);
    });
});
```

- [ ] **Step 4: Lancer pour voir l'échec**

Run: `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && cd /Users/jon/Code/Active_projects/ariane/packages/core && ARIANE_BROWSERS=chromium npx web-test-runner --files "src/components/alert/alert.role.browser.test.ts" 2>&1 | grep -E "passed|failed|AssertionError|expected" | head -12`
Expected: échecs de « sans attribut role » (l'attribut est posé), du remplacement par un `role` d'auteur (écrasé par le composant) et de « n'écrit jamais l'attribut role ». Si la commande `ax-role` est inconnue ou si tous les tests sont ignorés (`skip`), corriger le plugin avant de continuer.

- [ ] **Step 5: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add packages/core/package.json package-lock.json packages/core/web-test-runner.config.js packages/core/src/components/alert/alert.role.browser.test.ts && git commit -m "test(core): arbre d'accessibilité réel d'ar-alert par CDP, commande ax-role (#334)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Implémentation et tests unitaires

**Files:**

- Modify: `packages/core/src/components/alert/alert.ts`
- Modify: `packages/core/src/components/alert/alert.test.ts` (blocs « Accessibilité ARIA », « Prop urgent », « Avertissement role manuel »)

**Interfaces:**

- Consumes: commande `ax-role` et tests de la Tâche 1.
- Produces: `ArAlert` sans `urgent`; le rôle vit dans `internals.role`.

- [ ] **Step 1: Remplacer les tests unitaires de rôle (rouge)**

Dans `alert.test.ts`, remplacer tout ce qui se trouve entre le commentaire `    // ── Accessibilité ARIA` et le commentaire `    // ── Icône` (trois `describe` : accessibilité ARIA, prop urgent, avertissement role manuel) par :

```ts
// ── Accessibilité ARIA : rôle par défaut via ElementInternals ──────────────
//
// happy-dom n'implémente pas attachInternals() : on injecte un faux ElementInternals sur le
// prototype pour observer `role`. L'arbre d'accessibilité réel est couvert par
// alert.role.browser.test.ts.

describe('rôle par défaut (ElementInternals)', () => {
    interface FakeInternals {
        role: string | null;
    }
    let fake: FakeInternals;

    beforeEach(() => {
        fake = { role: null };
        (HTMLElement.prototype as unknown as Record<string, unknown>).attachInternals = () => fake;
    });
    afterEach(() => {
        delete (HTMLElement.prototype as unknown as Record<string, unknown>).attachInternals;
    });

    it.each([
        ['error', 'alert'],
        ['warning', 'alert'],
        ['success', 'status'],
        ['info', 'status'],
        ['custom', 'status'],
    ])('variant="%s" donne internals.role = %s', async (variant, expected) => {
        el = await fixture(`<ar-alert variant="${variant}"></ar-alert>`);
        expect(fake.role).toBe(expected);
    });

    it("le rôle existe dès l'insertion, avant le premier rendu", () => {
        el = document.createElement('ar-alert') as ArAlert;
        el.setAttribute('variant', 'error');
        document.body.append(el);
        expect(fake.role).toBe('alert');
    });

    it("n'écrit jamais l'attribut role", async () => {
        el = await fixture('<ar-alert variant="error"></ar-alert>');
        expect(el.hasAttribute('role')).toBe(false);
        el.setAttribute('variant', 'info');
        await waitForUpdate(el);
        expect(el.hasAttribute('role')).toBe(false);
    });

    it('changer variant met à jour le rôle', async () => {
        el = await fixture('<ar-alert variant="info"></ar-alert>');
        expect(fake.role).toBe('status');
        el.setAttribute('variant', 'error');
        await waitForUpdate(el);
        expect(fake.role).toBe('alert');
    });

    it('without-notification retire le rôle par défaut, et le retirer le rétablit', async () => {
        el = await fixture('<ar-alert variant="error" without-notification></ar-alert>');
        expect(fake.role).toBeNull();
        el.removeAttribute('without-notification');
        await waitForUpdate(el);
        expect(fake.role).toBe('alert');
        el.setAttribute('without-notification', '');
        await waitForUpdate(el);
        expect(fake.role).toBeNull();
    });

    it("un role d'auteur n'est ni modifié ni signalé par un avertissement", async () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        try {
            el = await fixture('<ar-alert role="banner" variant="error"></ar-alert>');
            expect(el.getAttribute('role')).toBe('banner');
            expect(spy).not.toHaveBeenCalled();
        } finally {
            spy.mockRestore();
        }
    });

    it("urgent n'existe plus : ni propriété, ni effet de l'attribut", async () => {
        el = await fixture('<ar-alert variant="info" urgent></ar-alert>');
        expect('urgent' in el).toBe(false);
        expect(fake.role).toBe('status');
    });
});

describe('sans ElementInternals (happy-dom, anciens navigateurs)', () => {
    it('ne lève pas et ne pose aucun attribut role', async () => {
        el = await fixture('<ar-alert variant="error"></ar-alert>');
        expect(el.hasAttribute('role')).toBe(false);
    });
});
```

- [ ] **Step 2: Lancer pour voir l'échec**

Run: `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run src/components/alert/alert.test.ts 2>&1 | grep -E "Tests |×|FAIL" | head -12`
Expected: échecs sur le rôle par défaut (`fake.role` reste `null`), « n'écrit jamais l'attribut role », « urgent n'existe plus », et l'avertissement du `role="banner"`.

- [ ] **Step 3: Implémenter dans `alert.ts`**

1. Supprimer la propriété `urgent` (JSDoc, `@property` avec converter, déclaration) et le champ `_hadAuthoredRole` avec son JSDoc.
2. Supprimer la méthode `firstUpdated()` (elle ne sert qu'à `_hadAuthoredRole`).
3. Ajouter, avant `updated` :

```ts
    override connectedCallback(): void {
        super.connectedCallback();
        // Le rôle doit exister dès l'insertion : une alerte ajoutée dynamiquement est annoncée
        // d'après le rôle présent à ce moment-là, pas après le premier rendu.
        this._updateRole();
    }
```

4. Dans `updated`, remplacer le bloc `if (changed.has('variant') || changed.has('withoutNotification') || changed.has('urgent')) { … }` par :

```ts
if (changed.has('variant') || changed.has('withoutNotification')) {
    this._updateRole();
}
```

5. Remplacer `_updateRole()` par :

```ts
    /**
     * Rôle ARIA par défaut, posé dans `ElementInternals` : l'attribut `role` n'est jamais écrit
     * par le composant, un `role` écrit par l'auteur le remplace (règle de la plateforme).
     * Tolère `internals` absent (happy-dom, anciens navigateurs).
     */
    private _updateRole(): void {
        if (!this.internals) return;
        this.internals.role = this.withoutNotification
            ? null
            : (ArAlert._ROLE_BY_VARIANT[this.variant] ?? 'status');
    }
```

6. Mettre à jour le JSDoc de la classe : documenter le rôle par défaut selon `variant`, la surcharge par l'attribut `role` (`alert` ou `status`) et `without-notification`. Supprimer toute mention d'`urgent` (`grep -n urgent src/components/alert/alert.ts` ne doit rien renvoyer).

Si `import { warn }` n'est plus utilisé dans ce fichier, le retirer (il l'est encore pour l'icône manquante : vérifier avec `grep -n "warn(" alert.ts`).

- [ ] **Step 4: Relancer unitaires, types, lint**

Run: `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run src/components/alert 2>&1 | grep -E "Test Files|Tests |×|FAIL"; npx tsc --noEmit -p tsconfig.json && npx eslint src/components/alert`
Expected: tout PASS, `tsc` et `eslint` sans erreur.

- [ ] **Step 5: Relancer le test navigateur (vert)**

Run: `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && cd /Users/jon/Code/Active_projects/ariane/packages/core && ARIANE_BROWSERS=chromium,webkit npx web-test-runner --files "src/components/alert/*.browser.test.ts" 2>&1 | grep -E "passed|failed|AssertionError" | tail -5`
Expected: tous PASS (WebKit ignore les tests d'arbre d'accessibilité via `skip`). Aucun test `alert.browser.test.ts` existant ne doit casser.

- [ ] **Step 6: Commit (changement incompatible)**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add packages/core/src/components/alert && git commit -m "feat(core)!: ar-alert pose son rôle par défaut via ElementInternals, urgent supprimé (#334)

BREAKING CHANGE: l'attribut et la propriété urgent d'ar-alert sont supprimés ; utiliser l'attribut role standard (role=\"alert\" ou role=\"status\") pour remplacer le rôle par défaut. Le composant n'écrit plus l'attribut role sur l'hôte (getAttribute('role') renvoie null par défaut).

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Documentation, skill, vérification d'ensemble

**Files:**

- Modify: `apps/docs/src/content/components/ar-alert.mdx`
- Modify: `packages/core/scripts/skill/content/ariane/references/choosing-components.md`

- [ ] **Step 1: Réécrire la documentation du composant**

Dans `ar-alert.mdx`, remplacer les deux puces sur `urgent` et sur `role` calculé (lignes 47 à 53 environ) par :

```md
- Le rôle ARIA par défaut dépend de `variant` : `error` et `warning` donnent `alert`
  (interruption immédiate), `success`, `info` et tout variant personnalisé donnent `status`
  (annonce polie). Il est exposé par le navigateur sans écrire d'attribut `role` sur l'élément.
- Pour remplacer ce rôle, écrire l'attribut `role` standard : `<ar-alert variant="error" role="status">`
  rend une erreur annoncée poliment (par exemple une erreur déjà visible, présente au chargement de la page),
  `<ar-alert variant="info" role="alert">` rend une information annoncée immédiatement. Retirer l'attribut
  rétablit le rôle de la variante.
- `without-notification` supprime le rôle par défaut : aucune annonce.
- Une alerte ajoutée dynamiquement à la page n'est annoncée de façon fiable que si son rôle est
  `alert` ; pour un `status`, le conteneur doit exister avant son contenu.
```

(La dernière puce reprend le constat de #346 : la garder courte, sans promesse.) Vérifier ensuite : `grep -n "urgent" apps/docs/src/content/components/ar-alert.mdx` ne renvoie rien, et qu'aucun exemple ou contrôle du playground ne cite `urgent`.

- [ ] **Step 2: Mettre à jour le skill**

Dans `choosing-components.md`, ligne « Message à lire sans interrompre la tâche → `<ar-alert>` … `<ar-alert urgent>` force `role="alert"` … » : remplacer la mention d'`urgent` par « un attribut `role` écrit sur l'élément (`role="alert"` ou `role="status"`) remplace le rôle déduit de `variant` ». Conserver le reste de la phrase telle quelle.

Run: `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && cd /Users/jon/Code/Active_projects/ariane/packages/core && npm run build:skill && npm run check:skill && grep -rn "urgent" skills llms scripts/skill/content | head`
Expected: `check:skill` PASS, plus aucune occurrence d'`urgent` dans le skill généré ni dans `llms/`.

- [ ] **Step 3: Vérification d'ensemble**

Run: `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && cd /Users/jon/Code/Active_projects/ariane && npm run test 2>&1 | grep -E "Tests " && cd packages/core && ARIANE_BROWSERS=chromium,webkit npx web-test-runner 2>&1 | grep -E "passed|failed" | tail -3; npx eslint src 2>&1 | tail -2; npx prettier --check src 2>&1 | tail -1; npm run build 2>&1 | grep -E "✓|✗|rror" | tail -6; cd ../.. && npm run build --workspace=apps/docs 2>&1 | tail -3`
Expected: tout PASS, build du paquet et du site OK, `urgent` absent de `custom-elements.json` : `grep -c urgent packages/core/dist/custom-elements.json` renvoie 0.

- [ ] **Step 4: Contrôle de la page de test manuel**

Reconstruire les bundles (`npm run build:bundles --workspace=packages/core`), charger `apps/docs/public/manual-tests/alert-role.html` avec un petit serveur (modèle du script de contrôle : racine `apps/docs/public` et `/cdn/` vers `packages/core/cdn`) et vérifier par CDP que A1 à A7 exposent `alert`, `alert`, `status`, `status`, `status` (A5, `role="status"` d'auteur), `alert` (A6, `role="alert"` d'auteur) et un rôle générique (A7), sans attribut `role` sur A1 à A4 et A7. Consigner le résultat.

- [ ] **Step 5: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add apps/docs packages/core/scripts && git commit -m "docs(core): rôle d'ar-alert par défaut via ElementInternals, surcharge par l'attribut role (#334)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Rapport au mainteneur, sans pousser**

Résumer commits, résultats, écarts. Rappeler : (1) la page de test manuel reste dans la branche pour l'aperçu Vercel de la PR et doit être retirée dans un dernier commit avant la fusion (critère 5 du spec); (2) la vérification VoiceOver et NVDA reste à faire (critère 4), la PR restant en brouillon tant qu'elle n'est pas faite; (3) **demander confirmation avant `git push` et avant d'ouvrir la PR** (brouillon, `Closes #334` + label `status:en-attente-release` sur l'issue au moment de la fusion, footer `BREAKING CHANGE` dans la description pour le squash).
