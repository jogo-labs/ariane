# Stepper Teleport Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer la prop `version="mobile"` par une téléportation DOM automatique (`desktop-target` + `desktop-from`) pilotée par `matchMedia`, éliminant le besoin de dupliquer le composant dans la page.

**Architecture:** `connectedCallback` mémorise la position d'origine (parent + nextSibling) et installe un listener `matchMedia`. Quand le breakpoint est franchi, le composant se déplace via `appendChild`/`insertBefore` natifs. Le state interne `_isDesktop` pilote le choix de rendu (`renderDesktop` / `renderMobile`). Aucune modification de `stepper.renderer.ts` ni `stepper.styles.ts`.

**Tech Stack:** Lit 3, TypeScript strict, Vitest + happy-dom, `window.matchMedia`

---

## Fichiers modifiés

| Fichier                                                | Action                                                                                        |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `packages/core/src/components/stepper/stepper.ts`      | Supprimer `version`, ajouter `desktopTarget`/`desktopFrom`, state téléportation, cycle de vie |
| `packages/core/src/components/stepper/stepper.test.ts` | Supprimer tests `version`, ajouter suite téléportation                                        |
| `apps/docs/src/content/components/ar-stepper.mdx`      | Supprimer variante `mobile`, maj variante `default`, ajouter section responsive               |

`stepper.renderer.ts` et `stepper.styles.ts` : non modifiés.

---

### Task 1 : Supprimer `version` et nettoyer les tests associés

**Files:**

- Modify: `packages/core/src/components/stepper/stepper.ts:79-85`
- Modify: `packages/core/src/components/stepper/stepper.ts:177-191`
- Modify: `packages/core/src/components/stepper/stepper.test.ts`

- [ ] **Step 1 : Écrire les tests qui valident l'absence de `version`**

Dans `stepper.test.ts`, remplacer le bloc `describe('propriétés')` existant par :

```typescript
describe('propriétés', () => {
    it('currentPath par défaut vaut ""', async () => {
        const el = await fixture<ArStepper>('<ar-stepper></ar-stepper>');
        expect(el.currentPath).toBe('');
    });

    it('mode par défaut vaut "create"', async () => {
        const el = await fixture<ArStepper>('<ar-stepper></ar-stepper>');
        expect(el.mode).toBe('create');
    });

    it('followScroll par défaut vaut false', async () => {
        const el = await fixture<ArStepper>('<ar-stepper></ar-stepper>');
        expect(el.followScroll).toBe(false);
    });

    it("version n'est plus une propriété du composant", async () => {
        const el = await fixture<ArStepper>('<ar-stepper></ar-stepper>');
        expect('version' in el).toBe(false);
    });

    it('lit les attributs depuis le HTML', async () => {
        const el = await fixture<ArStepper>(
            '<ar-stepper current-path="/b" mode="edit" follow-scroll></ar-stepper>',
        );
        expect(el.currentPath).toBe('/b');
        expect(el.mode).toBe('edit');
        expect(el.followScroll).toBe(true);
    });
});
```

Supprimer aussi intégralement les deux `describe` suivants qui testent `version` :

- `describe('rendu desktop', ...)` — les tests utilisant `version="desktop"` seront réécrits en Task 3
- `describe('rendu mobile', ...)` — les tests utilisant `version="mobile"` seront réécrits en Task 3

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
cd /path/to/ariane && npm run test --workspace=packages/core -- --reporter=verbose 2>&1 | grep -E "FAIL|PASS|✓|×|version"
```

Expected : certains tests échouent car `version` existe encore.

- [ ] **Step 3 : Supprimer la prop `version` dans `stepper.ts`**

Supprimer ces lignes (79-85) :

```typescript
/**
 * Version d'affichage. Passer `mobile` pour activer le rendu dropdown.
 * En pratique, gérer ce changement via un `ResizeObserver` ou une media query externe.
 * @attr version
 */
@property({ type: String })
version: 'desktop' | 'mobile' = 'desktop';
```

- [ ] **Step 4 : Remplacer la condition `version` dans `render()` par `false` temporaire**

Dans `render()` (lignes 177-191), remplacer :

```typescript
const content =
    this.version === 'mobile'
        ? renderMobile(...)
        : renderDesktop(...);
```

Par (temporaire — sera remplacé en Task 2) :

```typescript
const content = renderDesktop(steps, this.mode, this.onClickLink);
```

- [ ] **Step 5 : Mettre à jour le JSDoc `@summary`**

Remplacer :

```typescript
 * @summary Stepper de navigation accessible, adaptatif desktop/mobile.
 * @display demo
 *
 * Les étapes sont déclarées via des éléments `<ar-stepper-item>` enfants.
 * Le composant les collecte automatiquement via `@lit/context` et construit
 * l'arbre de navigation. Un item peut avoir des sous-étapes (enfants imbriqués).
 *
 * En mode `mobile`, les étapes sont affichées dans un dropdown.
 * En mode `desktop`, elles sont affichées dans une liste verticale.
```

Par :

```typescript
 * @summary Stepper de navigation accessible avec téléportation DOM adaptive.
 * @display demo
 *
 * Les étapes sont déclarées via des éléments `<ar-stepper-item>` enfants.
 * Le composant les collecte automatiquement via `@lit/context` et construit
 * l'arbre de navigation. Un item peut avoir des sous-étapes (enfants imbriqués).
 *
 * Fournir `desktop-target` (ID d'un élément) pour activer la téléportation automatique :
 * en dessous de `desktop-from` px le composant affiche le rendu dropdown à sa position
 * d'origine ; au-dessus il se déplace dans l'élément cible et affiche la liste verticale.
```

Mettre aussi à jour les `@csspart` — supprimer la mention "(mobile uniquement)" :

```typescript
 * @csspart dropdown     - Le conteneur dropdown.
 * @csspart dropdown-btn - Le bouton d'ouverture du dropdown.
```

- [ ] **Step 6 : Lancer les tests**

```bash
npm run test --workspace=packages/core -- --reporter=verbose 2>&1 | grep -E "FAIL|PASS|✓|×"
```

Expected : les tests `version n'est plus une propriété` passent, les autres tests de rendu peuvent échouer.

- [ ] **Step 7 : Commit**

```bash
git add packages/core/src/components/stepper/stepper.ts \
        packages/core/src/components/stepper/stepper.test.ts
git commit -m "refactor(stepper): suppression prop version"
```

---

### Task 2 : Ajouter props `desktopTarget`/`desktopFrom` + mécanisme de téléportation

**Files:**

- Modify: `packages/core/src/components/stepper/stepper.ts`

- [ ] **Step 1 : Écrire les tests de téléportation (ils échouent)**

Dans `stepper.test.ts`, ajouter un nouveau `describe('téléportation')` après les tests existants :

```typescript
describe('téléportation', () => {
    // Helper : crée un matchMedia mock qui retourne `matches`
    function mockMatchMedia(matches: boolean) {
        return vi.spyOn(window, 'matchMedia').mockReturnValue({
            matches,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        } as unknown as MediaQueryList);
    }

    it('desktopTarget vaut undefined par défaut', async () => {
        const el = await fixture<ArStepper>('<ar-stepper></ar-stepper>');
        expect(el.desktopTarget).toBeUndefined();
    });

    it('desktopFrom vaut 992 par défaut', async () => {
        const el = await fixture<ArStepper>('<ar-stepper></ar-stepper>');
        expect(el.desktopFrom).toBe(992);
    });

    it('sans desktop-target : pas de matchMedia, composant reste en place', async () => {
        const spy = vi.spyOn(window, 'matchMedia');
        await fixture<ArStepper>('<ar-stepper></ar-stepper>');
        expect(spy).not.toHaveBeenCalled();
    });

    it('avec desktop-target valide + viewport desktop : téléporte dans la cible', async () => {
        mockMatchMedia(true);

        const target = document.createElement('div');
        target.id = 'sidebar';
        document.body.appendChild(target);

        const el = await fixtureWithItems(`
            <ar-stepper desktop-target="sidebar" current-path="/a">
                <ar-stepper-item path="/a" label="A"></ar-stepper-item>
            </ar-stepper>
        `);

        expect(el.parentElement).toBe(target);
        expect((el as unknown as { _isDesktop: boolean })._isDesktop).toBe(true);
    });

    it('avec desktop-target valide + viewport mobile : reste à sa position', async () => {
        mockMatchMedia(false);

        const target = document.createElement('div');
        target.id = 'sidebar2';
        document.body.appendChild(target);

        const container = document.createElement('div');
        document.body.appendChild(container);
        container.innerHTML = `
            <ar-stepper desktop-target="sidebar2" current-path="/a">
                <ar-stepper-item path="/a" label="A"></ar-stepper-item>
            </ar-stepper>
        `;
        const el = container.querySelector('ar-stepper')!;
        await waitForUpdate(el as ArStepper);

        expect(el.parentElement).toBe(container);
        expect((el as unknown as { _isDesktop: boolean })._isDesktop).toBe(false);
    });

    it('desktop-target avec ID inexistant : console.warn, composant non déplacé', async () => {
        mockMatchMedia(true);
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const container = document.createElement('div');
        document.body.appendChild(container);
        container.innerHTML = `
            <ar-stepper desktop-target="inexistant" current-path="/a">
                <ar-stepper-item path="/a" label="A"></ar-stepper-item>
            </ar-stepper>
        `;
        const el = container.querySelector('ar-stepper')!;
        await waitForUpdate(el as ArStepper);

        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('inexistant'));
        expect(el.parentElement).toBe(container);
    });

    it('disconnectedCallback débranche le listener matchMedia', async () => {
        const removeListenerSpy = vi.fn();
        vi.spyOn(window, 'matchMedia').mockReturnValue({
            matches: false,
            addEventListener: vi.fn(),
            removeEventListener: removeListenerSpy,
        } as unknown as MediaQueryList);

        const target = document.createElement('div');
        target.id = 'sidebar3';
        document.body.appendChild(target);

        const el = await fixture<ArStepper>('<ar-stepper desktop-target="sidebar3"></ar-stepper>');
        el.remove();

        expect(removeListenerSpy).toHaveBeenCalledTimes(1);
    });
});
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
npm run test --workspace=packages/core -- --reporter=verbose 2>&1 | grep -E "téléportation|FAIL|×"
```

Expected : tous les tests `téléportation` échouent.

- [ ] **Step 3 : Ajouter les props publiques dans `stepper.ts`**

Après la prop `followScroll` (ligne ~93), ajouter :

```typescript
/**
 * ID de l'élément vers lequel le composant se téléporte en mode desktop.
 * Sans cet attribut, le composant reste à sa position d'origine et affiche toujours le rendu mobile.
 * @attr desktop-target
 */
@property({ type: String, attribute: 'desktop-target', reflect: true })
desktopTarget: string | undefined = undefined;

/**
 * Largeur de viewport en px à partir de laquelle le mode desktop est activé.
 * @attr desktop-from
 */
@property({ type: Number, attribute: 'desktop-from', reflect: true })
desktopFrom = 992;
```

- [ ] **Step 4 : Ajouter le state interne et les champs privés**

Après `private _currentStepIndex = 0;` (ligne ~95), ajouter :

```typescript
/** Position d'origine mémorisée au premier connectedCallback. */
private _originalParent: Element | null = null;
private _originalNextSibling: Node | null = null;
/** true dès que la position d'origine est mémorisée — évite de la re-mémoriser après téléportation. */
private _positioned = false;

/** État courant : true = téléporté dans la cible desktop. Pilote le choix de rendu. */
@state()
private _isDesktop = false;

/** Instance matchMedia + listener, pour pouvoir les déconnecter. */
private _mq: MediaQueryList | null = null;
private _mqListener: ((e: MediaQueryListEvent) => void) | null = null;
```

Ajouter l'import manquant en haut du fichier :

```typescript
import { LitElement, html, type TemplateResult, type CSSResultGroup } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
```

- [ ] **Step 5 : Mettre à jour `connectedCallback`**

Remplacer le `connectedCallback` existant par :

```typescript
override connectedCallback() {
    super.connectedCallback();

    // Mémoriser la position d'origine une seule fois (pas après téléportation)
    if (!this._positioned) {
        this._originalParent = this.parentElement;
        this._originalNextSibling = this.nextSibling;
        this._positioned = true;
    }

    // Installer matchMedia si desktop-target est fourni
    if (this.desktopTarget && typeof window !== 'undefined') {
        this._setupMatchMedia();
    }

    this.addEventListener('scroll-follow-change', this.handleScrollChange as EventListener);

    customElements.whenDefined('ar-stepper-item').then(() => {
        if (!this.isConnected) return;
        this.collectExistingItems();
    });
}
```

- [ ] **Step 6 : Ajouter la méthode `_setupMatchMedia`**

Après `connectedCallback`, ajouter :

```typescript
private _setupMatchMedia(): void {
    // Nettoyer un éventuel listener précédent
    if (this._mq && this._mqListener) {
        this._mq.removeEventListener('change', this._mqListener);
    }

    this._mq = window.matchMedia(`(min-width: ${this.desktopFrom}px)`);
    this._mqListener = (e: MediaQueryListEvent) => this._onBreakpointChange(e.matches);
    this._mq.addEventListener('change', this._mqListener);

    // État initial
    this._onBreakpointChange(this._mq.matches);
}

private _onBreakpointChange(matches: boolean): void {
    if (matches && !this._isDesktop) {
        const target = document.getElementById(this.desktopTarget!);
        if (!target) {
            console.warn(`[ar-stepper] desktop-target: aucun élément trouvé avec l'id "${this.desktopTarget}"`);
            return;
        }
        target.appendChild(this);
        this._isDesktop = true;
    } else if (!matches && this._isDesktop) {
        if (this._originalNextSibling && this._originalNextSibling.isConnected) {
            this._originalParent?.insertBefore(this, this._originalNextSibling);
        } else {
            this._originalParent?.appendChild(this);
        }
        this._isDesktop = false;
    }
}
```

- [ ] **Step 7 : Mettre à jour `disconnectedCallback`**

Remplacer le `disconnectedCallback` existant par :

```typescript
override disconnectedCallback() {
    if (this._mq && this._mqListener) {
        this._mq.removeEventListener('change', this._mqListener);
    }
    this.removeEventListener('scroll-follow-change', this.handleScrollChange as EventListener);
    super.disconnectedCallback();
}
```

- [ ] **Step 8 : Mettre à jour `updated()` pour réagir aux changements de props**

Après `willUpdate()`, ajouter :

```typescript
protected override updated(changed: Map<PropertyKey, unknown>): void {
    super.updated(changed);
    if (
        (changed.has('desktopTarget') || changed.has('desktopFrom')) &&
        this.desktopTarget &&
        typeof window !== 'undefined'
    ) {
        this._setupMatchMedia();
    }
}
```

- [ ] **Step 9 : Mettre à jour `render()` pour utiliser `_isDesktop`**

Remplacer le rendu temporaire de Task 1 par :

```typescript
const content = this._isDesktop
    ? renderDesktop(steps, this.mode, this.onClickLink)
    : renderMobile(
          steps,
          {
              isOpen: this.dropdown.isOpen,
              currentStepIndex: this._currentStepIndex,
              currentStepLabel: this.getCurrentStepLabel(),
              currentSubStepLabel: this.getCurrentSubStepLabel(),
              onToggle: this._onDropdownToggle,
          },
          this.mode,
          this.onClickLink,
      );
```

- [ ] **Step 10 : Lancer les tests**

```bash
npm run test --workspace=packages/core -- --reporter=verbose 2>&1 | grep -E "téléportation|FAIL|PASS|✓|×"
```

Expected : tous les tests `téléportation` passent.

- [ ] **Step 11 : Commit**

```bash
git add packages/core/src/components/stepper/stepper.ts \
        packages/core/src/components/stepper/stepper.test.ts
git commit -m "feat(stepper): téléportation DOM adaptive via desktop-target + desktop-from"
```

---

### Task 3 : Réécrire les tests de rendu desktop/mobile sans `version`

**Files:**

- Modify: `packages/core/src/components/stepper/stepper.test.ts`

- [ ] **Step 1 : Écrire les tests de rendu conditionnels (ils échouent)**

Ajouter un `describe('rendu conditionnel')` dans `stepper.test.ts` :

```typescript
describe('rendu conditionnel', () => {
    function mockMatchMedia(matches: boolean) {
        return vi.spyOn(window, 'matchMedia').mockReturnValue({
            matches,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        } as unknown as MediaQueryList);
    }

    it('sans desktop-target : rendu mobile par défaut (dropdown)', async () => {
        const el = await fixtureWithItems(`
            <ar-stepper current-path="/a">
                <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
            </ar-stepper>
        `);
        expect(el.shadowRoot!.querySelector('.dropdown')).not.toBeNull();
        expect(el.shadowRoot!.querySelector('ol.stepper-desktop')).toBeNull();
    });

    it('_isDesktop = true : rendu desktop (ol.stepper-desktop)', async () => {
        mockMatchMedia(true);

        const target = document.createElement('div');
        target.id = 'sidebar-render';
        document.body.appendChild(target);

        const el = await fixtureWithItems(`
            <ar-stepper desktop-target="sidebar-render" current-path="/a">
                <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
            </ar-stepper>
        `);

        expect(el.shadowRoot!.querySelector('ol.stepper-desktop')).not.toBeNull();
        expect(el.shadowRoot!.querySelector('.dropdown')).toBeNull();
    });

    it("l'étape courante a la classe active (rendu desktop)", async () => {
        mockMatchMedia(true);

        const target = document.createElement('div');
        target.id = 'sidebar-active';
        document.body.appendChild(target);

        const el = await fixtureWithItems(`
            <ar-stepper desktop-target="sidebar-active" current-path="/b">
                <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
            </ar-stepper>
        `);
        const items = el.shadowRoot!.querySelectorAll('li.stepper-item');
        expect(items[0]?.classList.contains('active')).toBe(false);
        expect(items[1]?.classList.contains('active')).toBe(true);
    });

    it('le dropdown est fermé par défaut (rendu mobile)', async () => {
        const el = await fixtureWithItems(`
            <ar-stepper current-path="/a">
                <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
            </ar-stepper>
        `);
        expect(el.shadowRoot!.querySelector('.dropdown')?.classList.contains('show')).toBe(false);
    });

    it('cliquer sur le bouton toggle ouvre le dropdown (rendu mobile)', async () => {
        const el = await fixtureWithItems(`
            <ar-stepper current-path="/a">
                <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
            </ar-stepper>
        `);
        const btn = el.shadowRoot!.querySelector<HTMLButtonElement>('button.dropdown-toggle');
        btn?.click();
        await waitForUpdate(el);
        expect(el.shadowRoot!.querySelector('.dropdown')?.classList.contains('show')).toBe(true);
    });

    it('en mode edit les étapes complétées sont des liens (rendu desktop)', async () => {
        mockMatchMedia(true);

        const target = document.createElement('div');
        target.id = 'sidebar-edit';
        document.body.appendChild(target);

        const el = await fixtureWithItems(`
            <ar-stepper desktop-target="sidebar-edit" current-path="/b" mode="edit">
                <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
            </ar-stepper>
        `);
        expect(el.shadowRoot!.querySelectorAll('a.stepper-link').length).toBeGreaterThan(0);
    });
});
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
npm run test --workspace=packages/core -- --reporter=verbose 2>&1 | grep -E "rendu conditionnel|FAIL|×"
```

Expected : les nouveaux tests `rendu conditionnel` échouent (l'implémentation est déjà là, mais les IDs DOM n'existent pas encore — ils sont créés dans les tests eux-mêmes, donc ils doivent passer).

> Note : si les tests passent immédiatement, c'est normal — l'implémentation de Task 2 est déjà en place. Vérifier que les tests existants ne régressent pas.

- [ ] **Step 3 : Lancer la suite complète**

```bash
npm run test --workspace=packages/core -- --reporter=verbose 2>&1 | tail -20
```

Expected : toutes les suites passent.

- [ ] **Step 4 : Commit**

```bash
git add packages/core/src/components/stepper/stepper.test.ts
git commit -m "test(stepper): réécriture tests rendu sans prop version"
```

---

### Task 4 : Mettre à jour `ar-stepper.mdx`

**Files:**

- Modify: `apps/docs/src/content/components/ar-stepper.mdx`

Le fichier actuel contient 3 variantes : `default`, `mobile`, `edit`. La variante `mobile` est supprimée. La variante `default` est mise à jour pour démontrer `desktop-target`. La section `## Comportement responsive` est ajoutée.

- [ ] **Step 1 : Mettre à jour le fichier MDX**

Remplacer l'intégralité de `apps/docs/src/content/components/ar-stepper.mdx` par :

```mdx
---
tagName: ar-stepper
title: Stepper
description: Stepper de navigation accessible avec affichage adaptatif mobile/desktop.
playgroundTemplate: default
variants:
    - name: default
      label: Par défaut
      description: Le composant est placé à sa position mobile. Fournir desktop-target pour activer la téléportation.
      html: |
          <div style="display: flex; gap: 2rem; align-items: flex-start;">
            <div id="stepper-sidebar" style="min-width: 200px; border: 1px dashed #ccc; padding: 1rem; border-radius: 4px;">
              <p style="font-size: 0.75rem; color: #999; margin: 0 0 0.5rem;">Cible desktop (id="stepper-sidebar")</p>
            </div>
            <div>
              <p style="font-size: 0.75rem; color: #999; margin: 0 0 0.5rem;">Position mobile (origine)</p>
              <ar-stepper desktop-target="stepper-sidebar" current-path="etape-1-2">
                <ar-stepper-item path="etape-1" label="Mes informations" href="#">
                    <ar-stepper-item path="etape-1-1" label="Mon état civil" href="#"></ar-stepper-item>
                    <ar-stepper-item path="etape-1-2" label="Mes coordonnées" href="#"></ar-stepper-item>
                    <ar-stepper-item path="etape-1-3" label="Mes identifiants" href="#"></ar-stepper-item>
                </ar-stepper-item>
                <ar-stepper-item path="etape-2" label="Mes préférences" href="#">
                    <ar-stepper-item path="etape-2-1" label="Mes notifications" href="#etape-2-1"></ar-stepper-item>
                    <ar-stepper-item path="etape-2-2" label="Mes langues" href="#etape-2-2"></ar-stepper-item>
                </ar-stepper-item>
                <ar-stepper-item path="etape-3" label="Récapitulatif"></ar-stepper-item>
              </ar-stepper>
            </div>
          </div>
    - name: edit
      label: Mode édition
      description: En mode édition, toutes les étapes sont accessibles au clic.
      html: |
          <ar-stepper class="align-left" current-path="etape-1-2" mode="edit">
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
---

## Accessibilité

### Pris en charge automatiquement

- `role="navigation"` et `aria-labelledby` posés sur le conteneur — la région est annoncée
  et identifiable par les lecteurs d'écran.
- L'état courant (`current-path`) est reflété visuellement et structurellement — les items
  actifs, complétés et désactivés sont distingués.

### À la charge de l'auteur

- **Labels descriptifs sur chaque `ar-stepper-item`.** Le `label` est le seul texte vocalisé
  pour chaque étape — évitez les labels génériques (\"Étape 1\") au profit de libellés métier
  (\"Mes informations\", \"Récapitulatif\").
- **`current-path` doit correspondre au `path` d'un item existant.** Une valeur incorrecte
  n'active aucun item — aucun feedback visuel ni vocal ne signale l'étape courante.
- **Les items sans `href` ne sont pas des liens.** Un item sans destination est rendu comme
  un élément non interactif — ne pas en faire la cible de `current-path` si l'utilisateur
  doit pouvoir y naviguer.

## Comportement responsive

En dessous de **992px** (configurable via `desktop-from`), le composant affiche un dropdown
condensé — l'étape courante et son numéro sont visibles sans déployer la liste.

Au-dessus du breakpoint, le composant se **téléporte automatiquement** dans l'élément
identifié par `desktop-target` et affiche la liste verticale complète.

### À la charge de l'auteur

- **Fournir `desktop-target`** pour activer la téléportation. Sans cet attribut, le composant
  reste à sa position d'origine et affiche toujours le rendu mobile.
- **Placer le composant à l'emplacement mobile** dans le HTML (mobile-first). C'est depuis
  cette position qu'il se téléporte vers le desktop.
- **S'assurer que l'élément `desktop-target` existe dans le DOM** au moment où le composant
  se connecte. Un ID manquant laisse le composant à sa position mobile sans erreur visible
  pour l'utilisateur (seul un `console.warn` est émis).
```

- [ ] **Step 2 : Vérifier visuellement**

```bash
npm run dev
```

Ouvrir `http://localhost:4321/components/stepper` et vérifier :

- La variante `mobile` n'apparaît plus dans les onglets
- La variante `default` affiche deux zones côte à côte (cible desktop + position mobile)
- Les sections `## Accessibilité` et `## Comportement responsive` apparaissent dans le contenu narratif et la TOC

- [ ] **Step 3 : Commit**

```bash
git add apps/docs/src/content/components/ar-stepper.mdx
git commit -m "docs(stepper): mise à jour MDX — desktop-target, suppression variante mobile, section responsive"
```

---

### Task 5 : Nettoyage `stepper.styles.ts` + vérification finale

**Files:**

- Modify: `packages/core/src/components/stepper/stepper.styles.ts`

La prop `version='mobile'` est référencée dans un sélecteur CSS de `stepper.styles.ts` (ligne 7). Ce sélecteur doit être nettoyé.

- [ ] **Step 1 : Nettoyer le sélecteur `[version='mobile']` dans les styles**

Ligne 7 de `stepper.styles.ts` :

```css
:host(:not(.align-left, [version='mobile'])) {
```

Remplacer par :

```css
:host(:not(.align-left)) {
```

- [ ] **Step 2 : Supprimer les commentaires CSS obsolètes**

Supprimer les blocs commentés (lignes 57-59 et 291-295) :

```css
/* .stepper-desktop {
    display: none;
} */
```

et

```css
/* .stepper-dropdown {
    display:none!important
} */
```

- [ ] **Step 3 : Lancer la suite de tests complète**

```bash
npm run test --workspace=packages/core -- --reporter=verbose 2>&1 | tail -30
```

Expected : toutes les suites passent, 0 échec.

- [ ] **Step 4 : Lancer le build complet**

```bash
npm run build --workspace=packages/core 2>&1 | tail -10
```

Expected : `✓ Build complete`

- [ ] **Step 5 : Commit**

```bash
git add packages/core/src/components/stepper/stepper.styles.ts
git commit -m "style(stepper): nettoyage sélecteur version + commentaires obsolètes"
```
