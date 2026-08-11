# `ar-stepper` : deux événements demande/confirmation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `ar-stepper-step-change` devient annulable et n'annonce plus rien immédiatement au clic ; un nouvel event `ar-stepper-step-changed` (non-cancelable) et l'annonce aria-live ne se déclenchent que quand `currentPath` a réellement transitionné — le mécanisme de focus existant (`_pendingFocusPath`) est conservé tel quel mais regroupé dans le même point d'entrée.

**Architecture:** Miroir du pattern livré sur `ar-pagination` (#161, PR #173), adapté à un composant déjà partiellement contrôlé : `currentPath` ne bougeait déjà jamais tout seul (sauf `follow-scroll`), et le focus était déjà gardé par confirmation. Seule l'annonce a11y était prématurée — elle rejoint le focus dans un unique bloc `updated()` guardé par confirmation réelle (`_hasRenderedOnce` + `changed.has('currentPath')` + `from !== to`).

**Tech Stack:** Lit 3, TypeScript, Vitest (happy-dom), @open-wc/testing + @web/test-runner (Chromium réel), Astro 6 + MDX (docs).

## Global Constraints

- Breaking change direct, sans dépréciation (package en `0.1.0-alpha.8`, règle CLAUDE.md).
- Prettier : 100 caractères, 4 espaces, quotes simples.
- `import type` pour tous les imports de types.
- Conventional Commits (commitlint + Husky) — un commit par étape complète.
- Branches `fix/<desc>` depuis `dev`, PR vers `dev`.
- Référence de design : `docs/superpowers/specs/2026-08-11-stepper-controlled-current-events-design.md`.
- Le marqueur `@cancelable` dans le JSDoc `@event` doit être le tout dernier token de la
  description (regex end-anchored côté doc, `apps/docs/src/utils/events.ts`) — piège déjà
  rencontré et corrigé sur #161, à ne pas reproduire.

---

### Task 1: Créer la branche de travail

**Files:** aucun.

- [ ] **Step 1: Créer la branche depuis `dev`**

```bash
cd /Users/jon/Code/Active_projects/ariane
git checkout dev
git pull origin dev
git checkout -b fix/174-stepper-step-events
```

---

### Task 2: `ar-stepper-step-change` cancelable, `ar-stepper-step-changed`, annonce/focus regroupés

**Files:**

- Modify: `packages/core/src/components/stepper/stepper.ts:84` (JSDoc `@event`), `:158` (champ
  privé), `:240-264` (`updated()`), `:458-491` (`onClickLink`)
- Test: `packages/core/src/components/stepper/stepper.test.ts` (describes `événements`,
  `annonces a11y`, nouveau describe `événement ar-stepper-step-changed`)

**Interfaces:**

- Consumes: `ArStepperStepChangeDetail` (déjà défini, `stepper.ts:26-29`, `{ path: string }`).
- Produces: `private _emitChanged(detail: ArStepperStepChangeDetail): void` — dispatch
  `ar-stepper-step-changed` (non-cancelable). Rien d'autre dans ce plan n'en dépend.

- [ ] **Step 1: Écrire les tests qui doivent échouer contre l'implémentation actuelle**

Dans `packages/core/src/components/stepper/stepper.test.ts` :

1. Ajouter `import type { ArStepperStepChangeDetail } from './stepper.js';` en haut du fichier,
   à côté de `import type { ArStepper } from './stepper.js';`.

2. Dans le describe `événements` (lignes 243-285), ajouter ces deux tests à la fin, avant
   l'accolade fermante du describe :

```typescript
it('ar-stepper-step-change est cancelable', async () => {
    const el = await fixtureWithItems(`
                <ar-stepper current-path="/b" mode="edit">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);
    const handler = vi.fn();
    el.addEventListener('ar-stepper-step-change', handler);

    const link = requireQuery<HTMLAnchorElement>(shadow(el), 'a[data-path="/a"]');
    link.click();

    expect(handler).toHaveBeenCalledOnce();
    const event = handler.mock.calls[0][0] as CustomEvent;
    expect(event.cancelable).toBe(true);
});

it('preventDefault() sur ar-stepper-step-change bloque toute suite : currentPath inchangé, focus reste sur le lien cliqué', async () => {
    const el = await fixtureWithItems(`
                <ar-stepper current-path="/b" mode="edit">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);
    el.addEventListener('ar-stepper-step-change', (e) => e.preventDefault());
    const changedHandler = vi.fn();
    el.addEventListener('ar-stepper-step-changed', changedHandler);

    const link = requireQuery<HTMLAnchorElement>(shadow(el), 'a[data-path="/a"]');
    link.focus();
    link.click();
    await waitForUpdate(el);

    expect(el.currentPath).toBe('/b');
    expect(changedHandler).not.toHaveBeenCalled();
    expect(shadow(el).activeElement).toBe(link);
});
```

3. Ajouter un nouveau describe juste après le describe `événements` (avant le describe
   `navigation — preventDefault sur les liens sans href réel`) :

```typescript
describe('événement ar-stepper-step-changed', () => {
    it("n'est pas émis tant que currentPath n'a pas réellement changé", async () => {
        const el = await fixtureWithItems(`
                <ar-stepper current-path="/b" mode="edit">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);
        const handler = vi.fn();
        el.addEventListener('ar-stepper-step-changed', handler);

        const link = requireQuery<HTMLAnchorElement>(shadow(el), 'a[data-path="/a"]');
        link.click();
        await waitForUpdate(el);

        expect(handler).not.toHaveBeenCalled();
    });

    it('est émis avec { path }, non cancelable, quand currentPath change (réassignation externe)', async () => {
        const el = await fixtureWithItems(`
                <ar-stepper current-path="/b" mode="edit">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);
        const handler = vi.fn();
        el.addEventListener('ar-stepper-step-changed', handler);

        el.currentPath = '/a';
        await waitForUpdate(el);

        expect(handler).toHaveBeenCalledOnce();
        const event = handler.mock.calls[0][0] as CustomEvent<ArStepperStepChangeDetail>;
        expect(event.cancelable).toBe(false);
        expect(event.detail).toEqual({ path: '/a' });
    });

    it("n'est pas émis au premier rendu", async () => {
        const handler = vi.fn();
        const el = await fixtureWithItems(`
                <ar-stepper current-path="/b" mode="edit">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);
        el.addEventListener('ar-stepper-step-changed', handler);
        await waitForUpdate(el);

        expect(handler).not.toHaveBeenCalled();
    });
});
```

4. Remplacer entièrement le describe `annonces a11y` (lignes 803-856) par :

```typescript
describe('annonces a11y', () => {
    afterEach(() => {
        document.querySelectorAll('[data-ar-live-region]').forEach((node) => node.remove());
    });

    it("n'annonce rien tant que currentPath n'est pas confirmé par le consommateur", async () => {
        vi.spyOn(window, 'matchMedia').mockReturnValue({
            matches: true,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        } as unknown as MediaQueryList);

        const el = await fixtureWithItems(`
                <ar-stepper current-path="/b" mode="edit">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);

        const link = shadow(el).querySelector<HTMLAnchorElement>('a[data-path="/a"]');
        if (!link) throw new Error('Lien vers /a introuvable');
        link.click();
        await new Promise((resolve) => setTimeout(resolve, 60));

        expect(document.getElementById('ar-live-region-polite')).toBeNull();
    });

    it('un clic confirmé sur une étape de premier niveau annonce son label', async () => {
        vi.spyOn(window, 'matchMedia').mockReturnValue({
            matches: true,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        } as unknown as MediaQueryList);

        const el = await fixtureWithItems(`
                <ar-stepper current-path="/b" mode="edit">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);
        el.addEventListener('ar-stepper-step-change', (e) => {
            el.currentPath = (e as CustomEvent<ArStepperStepChangeDetail>).detail.path;
        });

        const link = shadow(el).querySelector<HTMLAnchorElement>('a[data-path="/a"]');
        if (!link) throw new Error('Lien vers /a introuvable');
        link.click();
        await waitForUpdate(el);
        await new Promise((resolve) => setTimeout(resolve, 60));

        expect(document.getElementById('ar-live-region-polite')?.textContent).toBe('Étape A');
    });

    it('un clic confirmé sur une sous-étape annonce son label (branche flatMap)', async () => {
        vi.spyOn(window, 'matchMedia').mockReturnValue({
            matches: true,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        } as unknown as MediaQueryList);

        const el = await fixtureWithItems(`
                <ar-stepper current-path="/a" mode="edit">
                    <ar-stepper-item path="/a" label="Étape A">
                        <ar-stepper-item path="/a/1" label="Sous-étape 1"></ar-stepper-item>
                        <ar-stepper-item path="/a/2" label="Sous-étape 2"></ar-stepper-item>
                    </ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);
        el.addEventListener('ar-stepper-step-change', (e) => {
            el.currentPath = (e as CustomEvent<ArStepperStepChangeDetail>).detail.path;
        });

        const link = shadow(el).querySelector<HTMLAnchorElement>('a[data-path="/a/2"]');
        if (!link) throw new Error('Lien vers /a/2 introuvable');
        link.click();
        await waitForUpdate(el);
        await new Promise((resolve) => setTimeout(resolve, 60));

        expect(document.getElementById('ar-live-region-polite')?.textContent).toBe('Sous-étape 2');
    });
});
```

Ne pas toucher au describe `focus après activation d'un lien` (lignes 367-474) : ses 5 tests
confirment déjà `currentPath` explicitement avant d'asserter le focus (pattern déjà aligné sur le
nouveau modèle) — ils doivent continuer à passer sans modification une fois l'implémentation
faite (Step 4 vérifie ça).

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent contre le code actuel**

```bash
cd /Users/jon/Code/Active_projects/ariane
npx vitest run packages/core/src/components/stepper/stepper.test.ts
```

Expected : échecs sur `event.cancelable` (event actuel non cancelable), sur `preventDefault()`
sans effet, sur `ar-stepper-step-changed` jamais émis, sur les annonces qui se déclenchent
encore immédiatement au clic au lieu d'attendre confirmation.

- [ ] **Step 3: Implémenter dans `stepper.ts`**

3a. Ajouter le champ privé juste après `private _pendingFocusPath: string | undefined;`
(ligne 158) :

```typescript
    // Distingue le tout premier cycle updated() (où currentPath "change" par rapport à sa
    // valeur pré-upgrade non définie) des transitions réelles ultérieures — sans ce flag,
    // ar-stepper-step-changed/l'annonce/le focus se déclencheraient au montage initial.
    private _hasRenderedOnce = false;
```

3b. Remplacer le bloc de fin de `updated()` (lignes 258-263) :

```typescript
if (changed.has('currentPath') && this.currentPath === this._pendingFocusPath) {
    this.shadowRoot?.querySelector<HTMLElement>(`[data-path="${this._pendingFocusPath}"]`)?.focus();
}
this._pendingFocusPath = undefined;
```

par :

```typescript
if (this._hasRenderedOnce && changed.has('currentPath')) {
    const from = changed.get('currentPath') as string;
    const to = this.currentPath;
    if (from !== to) {
        this._emitChanged({ path: to });
        announceA11y(this.navigation.currentNode?.label ?? to, 'polite');
        if (to === this._pendingFocusPath) {
            this.shadowRoot?.querySelector<HTMLElement>(`[data-path="${to}"]`)?.focus();
        }
    }
}
this._pendingFocusPath = undefined;
this._hasRenderedOnce = true;
```

3c. Ajouter la méthode privée, par exemple juste après `getScrollTargets()` (avant la section
`// ── Events ──`, ligne 456) :

```typescript
    private _emitChanged(detail: ArStepperStepChangeDetail): void {
        this.dispatchEvent(
            new CustomEvent<ArStepperStepChangeDetail>('ar-stepper-step-changed', {
                bubbles: true,
                composed: true,
                detail,
            }),
        );
    }
```

3d. Dans `onClickLink` (lignes 458-491), remplacer :

```typescript
        const detail: ArStepperStepChangeDetail = { path };

        this.dispatchEvent(
            new CustomEvent('ar-stepper-step-change', { bubbles: true, composed: true, detail }),
        );

        // Force un cycle de rendu même si aucune propriété réactive ne change : c'est ce
        // cycle qui, dans updated(), valide (ou expire) l'intention de focus — garantit la
        // fenêtre "un seul cycle" même si le consommateur ignore l'event. Placé après le
        // dispatchEvent pour laisser une chance à une mutation synchrone/quasi-synchrone
        // (ex. Vue nextTick) du consommateur d'être planifiée dans le même cycle Lit.
        this.requestUpdate();

        announceA11y(node?.label ?? path, 'polite');
    };
```

par :

```typescript
        const detail: ArStepperStepChangeDetail = { path };

        const proceed = this.dispatchEvent(
            new CustomEvent('ar-stepper-step-change', {
                bubbles: true,
                composed: true,
                cancelable: true,
                detail,
            }),
        );
        if (!proceed) {
            this._pendingFocusPath = undefined;
        }

        // Force un cycle de rendu même si aucune propriété réactive ne change : c'est ce
        // cycle qui, dans updated(), valide (ou expire) l'intention de focus — garantit la
        // fenêtre "un seul cycle" même si le consommateur ignore l'event. Placé après le
        // dispatchEvent pour laisser une chance à une mutation synchrone/quasi-synchrone
        // (ex. Vue nextTick) du consommateur d'être planifiée dans le même cycle Lit.
        this.requestUpdate();
    };
```

3e. Mettre à jour le JSDoc `@event` (ligne 84) — remplacer :

```typescript
 * @event {CustomEvent<{ path: string }>} ar-stepper-step-change - Émis au clic sur une étape.
```

par :

```typescript
 * @event {CustomEvent<{ path: string }>} ar-stepper-step-change - Émis avant le changement
 *   d'étape, au clic. Annulable via `preventDefault()` : bloque la navigation, `currentPath`
 *   ne change pas. Contient `path`. @cancelable
 * @event {CustomEvent<{ path: string }>} ar-stepper-step-changed - Émis quand `currentPath` a
 *   réellement changé (réassignation externe suite à la confirmation du consommateur, ou via
 *   `follow-scroll`). Non annulable. Contient `path`.
```

- [ ] **Step 4: Lancer les tests, vérifier qu'ils passent**

```bash
npx vitest run packages/core/src/components/stepper/stepper.test.ts
```

Expected : PASS sur l'ensemble du fichier, y compris les 5 tests inchangés du describe `focus
après activation d'un lien` (Step 1 ne les a pas modifiés).

- [ ] **Step 5: Lancer la suite complète du package pour détecter une régression ailleurs**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run test --workspace=packages/core
```

Expected: PASS.

- [ ] **Step 6: Lancer les tests navigateur (le mécanisme de focus/#154 est touché)**

```bash
npm run test:browser --workspace=packages/core
```

Expected: PASS — `stepper.browser.test.ts` écoute déjà `ar-stepper-step-change` et confirme
`currentPath` avant d'asserter le focus (`stepper.browser.test.ts:128`), aucune modification de
ce fichier n'est nécessaire.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/components/stepper/stepper.ts packages/core/src/components/stepper/stepper.test.ts
git commit -m "fix(stepper): step-change annulable, ajoute step-changed, annonce apres confirmation (#174)"
```

---

### Task 3: Documentation (`ar-stepper.mdx`)

**Files:**

- Modify: `apps/docs/src/content/components/ar-stepper.mdx`

- [ ] **Step 1: Réécrire la sous-section "Écouter le changement d'étape"**

Remplacer les lignes 116-124 par :

````mdx
### Écouter le changement d'étape

Lorsque l'utilisateur souhaite changer d'étape, un événement `ar-stepper-step-change` est émis avec `{ path }` dans `event.detail`.
Mettez à jour la propriété `currentPath` du composant avec `event.detail.path` une fois le nouveau contenu chargé pour synchroniser l'étape active du stepper.

```js
document.addEventListener('ar-stepper-step-change', (e) => {
    /* Mettez à jour le contenu de l'étape, puis l'étape active du composant */
    e.target.currentPath = e.detail.path;
});
```
````

````

Les sous-sections suivantes ("Mode `create` vs `edit`", `follow-scroll`, "Navigation
programmatique", lignes 126-153) restent inchangées.

- [ ] **Step 2: Ajouter le champ `pageScript` au frontmatter**

Dans le frontmatter (avant la fermeture `---` de la ligne 68, juste après le dernier élément de
`variants`), ajouter au même niveau que `variants` :

```yaml
pageScript: |
    <script>
        document.addEventListener('ar-stepper-step-change', (e) => {
            /* Mettez à jour le contenu de l'étape, puis l'étape active du composant */
            e.target.currentPath = e.detail.path;
        });
    </script>
````

Aucune modification de schema/template nécessaire — le champ `pageScript` existe déjà
(`apps/docs/src/content.config.ts`, `apps/docs/src/pages/components/[slug].astro`), livré avec
#161.

- [ ] **Step 3: Vérifier**

```bash
cd /Users/jon/Code/Active_projects/ariane
npx prettier --check apps/docs/src/content/components/ar-stepper.mdx
npm run build --workspace=apps/docs
```

Expected : Prettier clean, build Astro réussi (toutes les pages, y compris `ar-stepper`).
Vérifier dans le HTML généré (`apps/docs/dist/components/stepper/index.html`) que le `<script>`
de `pageScript` est bien présent, une seule fois, hors de la boucle des variantes — même
vérification que celle faite manuellement pour `ar-pagination` (#161).

- [ ] **Step 4: Vérification visuelle**

```bash
npm run dev --workspace=apps/docs
```

Ouvrir la page `ar-stepper` de la doc, cliquer sur une étape cliquable dans chacune des 3
démos : l'étape active doit visuellement changer. Redémarrer le serveur si le changement de
frontmatter ne semble pas pris en compte (cf. #161 : le schema de contenu Astro peut nécessiter
un redémarrage complet, pas seulement un rafraîchissement navigateur).

- [ ] **Step 5: Commit**

```bash
git add apps/docs/src/content/components/ar-stepper.mdx
git commit -m "docs(stepper): documente step-changed, aligne le style Utilisation, ajoute pageScript (#174)"
```

---

### Task 4: Vérification finale et PR

**Files:** aucun nouveau.

- [ ] **Step 1: Suite complète (Vitest + WTR browser)**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run test:all
```

Expected: PASS sur l'ensemble du monorepo.

- [ ] **Step 2: Regénérer le manifest CEM (JSDoc `@event` modifié)**

```bash
npm run build:manifest --workspace=packages/core
git status --short
```

`dist/` est gitignoré (jamais commité) — cette étape ne fait que vérifier que la commande tourne
sans erreur et que le marqueur `@cancelable` est bien reconnu (cf. Global Constraints).

- [ ] **Step 3: Lint**

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 4: Push et création de la PR**

```bash
git push -u origin fix/174-stepper-step-events
gh pr create --base dev --title "fix(stepper): step-change annulable, ajoute step-changed (#174)" --body "$(cat <<'EOF'
## Résumé

- `ar-stepper-step-change` devient annulable (`preventDefault()` bloque la navigation).
- Nouvel event `ar-stepper-step-changed` (non-cancelable), émis quand `currentPath` a réellement transitionné (confirmation externe ou `follow-scroll`).
- L'annonce aria-live est déplacée du clic vers cette confirmation réelle — le stepper ne "ment" plus sur l'état affiché pendant un chargement async qui échouerait.
- Le mécanisme de focus (`_pendingFocusPath`) est inchangé fonctionnellement, juste regroupé au même point d'entrée.
- Doc alignée sur le style adopté pour `ar-pagination` ; démos live câblées via le champ `pageScript` existant (#161).
- Breaking change (package alpha, pas de dépréciation) — closes #174.

Design : `docs/superpowers/specs/2026-08-11-stepper-controlled-current-events-design.md`
Plan : `docs/superpowers/plans/2026-08-11-stepper-controlled-current-events-plan.md`

## Test plan

- [ ] `npm run test:all` passe
- [ ] Démos de la doc `ar-stepper` vérifiées manuellement (clic change bien l'étape dans les 3 variantes + playground)
- [ ] `npm run lint` passe

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

## Self-Review

**Couverture du spec** :

1. `ar-stepper-step-change` cancelable → Task 2.
2. `ar-stepper-step-changed`, annonce déplacée et résolue à la confirmation → Task 2.
3. `_pendingFocusPath` conservé, regroupé dans le même bloc → Task 2 (Step 3b).
4. `_pendingFocusPath` vidé si annulé → Task 2 (Step 3d).
5. `_hasRenderedOnce` → Task 2 (Step 3a).
6. Docs : style Utilisation aligné + `pageScript` → Task 3.

**Cohérence des types/signatures** : `ArStepperStepChangeDetail { path }` réutilisé identique
partout. `_emitChanged(detail: ArStepperStepChangeDetail): void` défini et utilisé uniquement en
Task 2. `_hasRenderedOnce` déclaré et lu dans la même task. Pas de référence à un nom non défini
dans une task antérieure.

**Pas de régression sur le describe `focus après activation d'un lien`** : vérifié
manuellement contre les 5 tests existants (lignes 367-474 du fichier avant modification) — tous
confirment déjà `currentPath` explicitement avant d'asserter le focus, donc aucune modification
requise et ils doivent continuer à passer tels quels (vérifié en Step 4 de la Task 2).
