# ar-breadcrumb : rendu porté par ar-breadcrumb-item — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `ar-breadcrumb-item` rend son propre shadow DOM, le CSS interne de `ar-breadcrumb` est réduit au structurel (le visuel passe dans `default.css`), et le séparateur devient personnalisable via un slot `separator`.

**Architecture:** `ar-breadcrumb` calcule un état de rendu par item (`isFirst`, `isCurrent`, `isMobile`, puis `separator`) et le pousse via `setRenderState()` (même patron que `ArStepperItem`). L'item rend son `<a>` / `<span>`, son séparateur (desktop) ou son connecteur + indicateur (mobile). `ar-breadcrumb` ne rend plus que le `<nav>`, le bouton `home`, le `trigger`, le panel et un `<ol><slot></slot></ol>`.

**Tech Stack:** Lit 3, TypeScript, Vitest (happy-dom) pour les tests unitaires, @web/test-runner (Chromium) pour les tests navigateur/a11y, Playwright pour la vérification visuelle.

**Spec:** `docs/superpowers/specs/2026-09-21-breadcrumb-item-rendu-design.md` (issue #239). Le plan raisonne à partir de la spec ; en cas de conflit, la spec fait foi.

## Global Constraints

- Prettier : 100 caractères, 4 espaces, guillemets simples. Toujours `import type` pour les imports de types.
- Conventional Commits, en français. Chaque commit se termine par ces deux lignes :
  `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` puis
  `Claude-Session: https://claude.ai/code/session_01DBWvASBNGXKCie9vdzdJYf`
- Branche : `refactor/breadcrumb-item-rendu-239` (déjà créée depuis `dev`). **Ne rien pousser** sans demande explicite.
- Headless : aucun fallback cosmétique dans les `*.styles.ts` (`var(--token)` sans valeur par défaut). Les valeurs de design vont dans `packages/core/src/styles/themes/default.css`. Sont acceptés : les repli structurels / d'accessibilité, marqués par un commentaire `functional-default:` ou `a11y-fallback:`.
- Un `${expr}` seul contenu d'un élément texte dans un template Lit : si la ligne dépasse 100 caractères, Prettier peut insérer des espaces dans le DOM rendu. Extraire la valeur dans une `const` avant le template.
- Tests headless uniquement : aucun test ne charge le thème, et ils ne vérifient que ce qui relève du composant.
- Après `::part()`, seules les pseudo-classes sont valides (jamais `[attr]` ni `::before`).
- **Ne pas lancer `npm run test`** (turbo restaure un `dist/` périmé). Lancer directement, depuis `packages/core` : `npx vitest run` et `npx web-test-runner`. Reconstruire (`npm run build --workspace=packages/core`, depuis la racine) juste avant toute vérification visuelle.
- Le part `item` disparaît (l'hôte est en `display: contents`, le thème cible la balise `ar-breadcrumb-item`).
- `bullet` / `bullet--current` deviennent `indicator` / `indicator--current` ; un item avant son premier état de rendu ne rend rien ; le premier item en mobile ne rend rien et porte `hidden`.

## Rulings (écarts assumés par rapport à la spec, déjà reportés dans la spec)

- Le padding vertical des liens de la liste mobile (`0.5rem 0.25rem`) reste **interne** (cible tactile WCAG 2.5.8, commenté `a11y-fallback:`) : le thème ne peut pas distinguer desktop et mobile sur les parts `link` / `current`.
- Le séparateur par défaut « / » arrive à la tâche 2 (il remplace le trait CSS supprimé), et la tâche 3 ajoute uniquement le slot et le clonage.
- Aucune modification de `ar-breadcrumb-item.mdx` ni de `personnalisation-avancee.astro`.

## File Structure

| Fichier                                                                                        | Rôle                                                                                                          |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `packages/core/src/components/breadcrumb-item/breadcrumb-item.ts`                              | Item : shadow DOM, état de rendu, attributs d'hôte (`role`, `aria-current`, `hidden`)                         |
| `packages/core/src/components/breadcrumb-item/breadcrumb-item.styles.ts`                       | **Nouveau.** CSS structurel de l'item                                                                         |
| `packages/core/src/components/breadcrumb/breadcrumb.ts`                                        | Parent : `<nav>`, `home`, `trigger`, panel, `<ol><slot>`, calcul et push de l'état de rendu, slot `separator` |
| `packages/core/src/components/breadcrumb/breadcrumb.styles.ts`                                 | CSS structurel du parent                                                                                      |
| `packages/core/src/styles/themes/default.css`                                                  | Visuel : parts de l'item, boutons `home` / `trigger`, tokens                                                  |
| `packages/core/src/components/breadcrumb/*.test.ts`, `breadcrumb-item/breadcrumb-item.test.ts` | Tests                                                                                                         |
| `apps/docs/src/content/components/ar-breadcrumb.mdx`                                           | Doc : variante et section « séparateur personnalisé »                                                         |

---

### Task 1: `ar-breadcrumb-item` rend son propre shadow DOM (sans changement visuel)

**Files:**

- Modify: `packages/core/src/components/breadcrumb-item/breadcrumb-item.ts`
- Create: `packages/core/src/components/breadcrumb-item/breadcrumb-item.styles.ts`
- Modify: `packages/core/src/components/breadcrumb/breadcrumb.ts`
- Modify: `packages/core/src/components/breadcrumb/breadcrumb.styles.ts`
- Modify: `packages/core/src/styles/themes/default.css` (section `ar-breadcrumb`, ~ligne 1138)
- Test: `packages/core/src/components/breadcrumb-item/breadcrumb-item.test.ts`, `packages/core/src/components/breadcrumb/breadcrumb.test.ts`

**Interfaces:**

- Produces (utilisé par les tâches 2 et 3) :

    ```ts
    // breadcrumb-item.ts
    export interface BreadcrumbItemRenderState {
        isFirst: boolean;
        isCurrent: boolean; // dernier item
        isMobile: boolean;
    }
    // ArBreadcrumbItem
    setRenderState(state: BreadcrumbItemRenderState): void;
    ```

    Parts de l'item : `link`, `current`, `separator` (desktop, non premier), `indicator` / `indicator--current` (mobile). Classes internes : `.item`, `.item--mobile`.

- [ ] **Step 0: Capturer une référence visuelle « avant »**

Reconstruire, puis écrire ce script à la **racine du dépôt** (le `import` de `playwright` s'y résout) sous le nom `visual.tmp.mjs`, et le lancer avec le libellé `before` :

```js
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { extname, join } from 'path';

const label = process.argv[2] ?? 'shot';
const root = 'packages/core';
const out =
    '/private/tmp/claude-501/-Users-jon-Code-Active-projects-ariane/7ffabb35-42e9-44e7-95f9-8e385205c83c/scratchpad';
const page = `<link rel=stylesheet href=/dist/styles/themes/default.css><script type=module src=/cdn/index.js></script>
<div style="padding:24px;font-family:sans-serif">
<ar-breadcrumb>
  <ar-breadcrumb-item label="Accueil Espace Personnel" href="/accueil"></ar-breadcrumb-item>
  <ar-breadcrumb-item label="Mon journal de recherche d'emploi" href="/journal"></ar-breadcrumb-item>
  <ar-breadcrumb-item label="Publiez vos offres d'emploi"></ar-breadcrumb-item>
</ar-breadcrumb></div>`;
const srv = createServer((q, r) => {
    const f = join(root, q.url.split('?')[0]);
    if (q.url === '/') {
        r.setHeader('content-type', 'text/html');
        return r.end(page);
    }
    if (existsSync(f)) {
        r.setHeader(
            'content-type',
            { '.js': 'text/javascript', '.css': 'text/css' }[extname(f)] || 'text/plain',
        );
        r.end(readFileSync(f));
    } else {
        r.statusCode = 404;
        r.end();
    }
}).listen(0);
const url = `http://localhost:${srv.address().port}/`;
const b = await chromium.launch();

const desktop = await b.newPage({ viewport: { width: 900, height: 140 } });
await desktop.goto(url);
await desktop.waitForTimeout(900);
await desktop.screenshot({ path: `${out}/bc-desktop-${label}.png` });

const mobile = await b.newPage({ viewport: { width: 400, height: 320 } });
await mobile.goto(url);
await mobile.waitForTimeout(900);
await mobile.locator('ar-breadcrumb >> [part=trigger]').click();
await mobile.waitForTimeout(500);
await mobile.screenshot({ path: `${out}/bc-mobile-open-${label}.png` });

await b.close();
srv.close();
```

Run: `npm run build --workspace=packages/core && node visual.tmp.mjs before`
Expected: deux fichiers `bc-desktop-before.png` et `bc-mobile-open-before.png` dans le scratchpad. Les ouvrir avec Read pour connaître le rendu de référence. Laisser `visual.tmp.mjs` en place (à supprimer avant le commit final de la tâche 3 : **ne jamais le committer**).

- [ ] **Step 1: Écrire les tests de l'item (échouent)**

Dans `breadcrumb-item.test.ts`, remplacer le bloc `describe('rendu', …)` (le test « n'a pas de shadow DOM ») par :

```ts
describe('rendu', () => {
    it('a un shadow DOM', async () => {
        el = await fixture('<ar-breadcrumb-item label="Accueil"></ar-breadcrumb-item>');
        expect(el.shadowRoot).not.toBeNull();
    });

    it("ne rend rien tant qu'il n'a pas reçu d'état de rendu", async () => {
        el = await fixture('<ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>');
        expect(el.shadowRoot?.querySelector('.item')).toBeNull();
        expect(getPart(el, 'link')).toBeNull();
    });

    it('rend un lien part="link" avec le bon href quand il est intermédiaire', async () => {
        el = await fixture(
            '<ar-breadcrumb-item label="Catégorie" href="/cat"></ar-breadcrumb-item>',
        );
        el.setRenderState({ isFirst: false, isCurrent: false, isMobile: false });
        await waitForUpdate(el);
        const link = getPart(el, 'link');
        expect(link?.tagName.toLowerCase()).toBe('a');
        expect(link?.getAttribute('href')).toBe('/cat');
        expect(link?.textContent?.trim()).toBe('Catégorie');
    });

    it('rend un span part="current" (pas un lien) quand il est le dernier', async () => {
        el = await fixture(
            '<ar-breadcrumb-item label="Page courante" href="/x"></ar-breadcrumb-item>',
        );
        el.setRenderState({ isFirst: false, isCurrent: true, isMobile: false });
        await waitForUpdate(el);
        const current = getPart(el, 'current');
        expect(current?.tagName.toLowerCase()).toBe('span');
        expect(current?.textContent?.trim()).toBe('Page courante');
        expect(getPart(el, 'link')).toBeNull();
    });

    it('desktop : rend un séparateur part="separator" sauf sur le premier item', async () => {
        el = await fixture('<ar-breadcrumb-item label="A" href="/a"></ar-breadcrumb-item>');
        el.setRenderState({ isFirst: true, isCurrent: false, isMobile: false });
        await waitForUpdate(el);
        expect(getPart(el, 'separator')).toBeNull();

        el.setRenderState({ isFirst: false, isCurrent: false, isMobile: false });
        await waitForUpdate(el);
        expect(getPart(el, 'separator')).not.toBeNull();
        expect(getPart(el, 'separator')?.getAttribute('aria-hidden')).toBe('true');
    });

    it("mobile : rend un indicateur à la place du séparateur, avec la variante d'état sur le dernier", async () => {
        el = await fixture('<ar-breadcrumb-item label="A" href="/a"></ar-breadcrumb-item>');
        el.setRenderState({ isFirst: false, isCurrent: false, isMobile: true });
        await waitForUpdate(el);
        expect(getPart(el, 'separator')).toBeNull();
        expect(getPart(el, 'indicator')?.getAttribute('part')).toBe('indicator');
        expect(getPart(el, 'indicator')?.getAttribute('aria-hidden')).toBe('true');

        el.setRenderState({ isFirst: false, isCurrent: true, isMobile: true });
        await waitForUpdate(el);
        expect(getPart(el, 'indicator')?.getAttribute('part')).toBe('indicator indicator--current');
    });

    it('mobile : le premier item ne rend rien et porte hidden', async () => {
        el = await fixture('<ar-breadcrumb-item label="A" href="/a"></ar-breadcrumb-item>');
        el.setRenderState({ isFirst: true, isCurrent: false, isMobile: true });
        await waitForUpdate(el);
        expect(el.shadowRoot?.querySelector('.item')).toBeNull();
        expect(el.hasAttribute('hidden')).toBe(true);
    });

    it('desktop : le premier item ne porte pas hidden', async () => {
        el = await fixture('<ar-breadcrumb-item label="A" href="/a"></ar-breadcrumb-item>');
        el.setRenderState({ isFirst: true, isCurrent: false, isMobile: false });
        await waitForUpdate(el);
        expect(el.hasAttribute('hidden')).toBe(false);
    });
});

// ── Attributs d'hôte ──────────────────────────────────────────────────────

describe("attributs d'hôte", () => {
    it('pose role="listitem"', async () => {
        el = await fixture('<ar-breadcrumb-item label="A" href="/a"></ar-breadcrumb-item>');
        el.setRenderState({ isFirst: true, isCurrent: false, isMobile: false });
        await waitForUpdate(el);
        expect(el.getAttribute('role')).toBe('listitem');
    });

    it('pose aria-current="page" sur le dernier item seulement', async () => {
        el = await fixture('<ar-breadcrumb-item label="A"></ar-breadcrumb-item>');
        el.setRenderState({ isFirst: false, isCurrent: true, isMobile: false });
        await waitForUpdate(el);
        expect(el.getAttribute('aria-current')).toBe('page');

        el.setRenderState({ isFirst: false, isCurrent: false, isMobile: false });
        await waitForUpdate(el);
        expect(el.hasAttribute('aria-current')).toBe(false);
    });
});
```

Et remplacer la ligne d'import `import { fixture, waitForUpdate } from '../../test-utils.js';` par :

```ts
import { fixture, getPart, waitForUpdate } from '../../test-utils.js';
```

- [ ] **Step 2: Lancer les tests de l'item, vérifier qu'ils échouent**

Run (depuis `packages/core`) : `npx vitest run src/components/breadcrumb-item`
Expected: FAIL (`setRenderState is not a function`, pas de shadow DOM).

- [ ] **Step 3: Créer `breadcrumb-item.styles.ts`**

```ts
import { css } from 'lit';

export default css`
    :host {
        display: contents;
    }

    /* Le premier item est rendu par le bouton "home" d'ar-breadcrumb en mobile : masqué pour ne
       pas exposer un listitem vide. :host { display: contents } l'emporterait sinon sur le style
       navigateur de [hidden]. */
    :host([hidden]) {
        display: none;
    }

    .item {
        display: flex;
        align-items: center;
    }

    [part='link'],
    [part='current'] {
        display: inline-flex;
        align-items: center;
        color: inherit;
        background-color: inherit;
    }

    [part='separator'] {
        display: inline-block;
        flex-shrink: 0;
        margin: 0.125rem 0.5rem 0;
        height: 65%;
        width: 1px;
        transform: rotate(15deg);
        transform-origin: center;
    }

    [part~='indicator'] {
        flex-shrink: 0;
        width: 0.375rem;
        height: 0.375rem;
        margin: 0 0.75rem;
    }

    [part~='indicator--current'] {
        width: 0.625rem;
        height: 0.625rem;
        margin: 0 0.625rem;
    }

    .item--mobile [part='link'],
    .item--mobile [part='current'] {
        flex-grow: 1;
        padding: 0.5rem 0.25rem;
    }
`;
```

- [ ] **Step 4: Réécrire `breadcrumb-item.ts`**

```ts
import { LitElement, html, nothing, type CSSResultGroup, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { ContextConsumer } from '@lit/context';

import resetStyles from '../../styles/components/reset.styles.js';
import styles from './breadcrumb-item.styles.js';

import { breadcrumbContext, type BreadcrumbRegistry } from '../../context/breadcrumb.context.js';

export interface BreadcrumbItemRenderState {
    isFirst: boolean;
    /** Dernier item du fil : rendu comme texte, non cliquable. */
    isCurrent: boolean;
    isMobile: boolean;
}

/**
 * @summary Représente un lien individuel dans un fil d'ariane, typiquement un par niveau de la hiérarchie du site.
 * @parent ar-breadcrumb
 * @display docs
 *
 * @csspart link - Le lien de navigation (items intermédiaires).
 * @csspart current - Le texte de la page courante (dernier item, non cliquable).
 * @csspart separator - Le séparateur avant l'item (desktop uniquement, absent avant le premier item).
 * @csspart indicator - La puce de l'item (mobile uniquement).
 * @csspart indicator--current - La puce de l'élément courant (variante d'état de `indicator`).
 */
export class ArBreadcrumbItem extends LitElement {
    static override styles: CSSResultGroup = [resetStyles, styles];

    @property({ type: String }) label = '';
    @property({ type: String }) href?: string;

    @state() private _renderState: BreadcrumbItemRenderState | undefined = undefined;

    private _registry: BreadcrumbRegistry | undefined = undefined;

    protected readonly _consumer = new ContextConsumer(this, {
        context: breadcrumbContext,
        subscribe: true,
        callback: (registry) => this.setRegistry(registry),
    });

    setRegistry(registry: BreadcrumbRegistry) {
        if (this._registry) this._registry.unregisterItem(this);
        this._registry = registry;
        registry.registerItem(this);
    }

    /** Poussé par `ar-breadcrumb` à chaque recalcul (position, mode mobile). */
    setRenderState(state: BreadcrumbItemRenderState): void {
        const previous = this._renderState;
        if (
            previous &&
            previous.isFirst === state.isFirst &&
            previous.isCurrent === state.isCurrent &&
            previous.isMobile === state.isMobile
        ) {
            return;
        }
        this._renderState = state;
    }

    override disconnectedCallback() {
        this._registry?.unregisterItem(this);
        this._registry = undefined;
        super.disconnectedCallback();
    }

    override updated(changed: Map<string, unknown>) {
        changed.forEach((oldValue, prop) => {
            if (oldValue === undefined) return;
            if (prop === 'label' || prop === 'href') {
                this._registry?.notifyItemChanged(this);
            }
        });

        const state = this._renderState;
        this.setAttribute('role', 'listitem');
        this.toggleAttribute('hidden', state !== undefined && state.isMobile && state.isFirst);
        if (state?.isCurrent) {
            this.setAttribute('aria-current', 'page');
        } else {
            this.removeAttribute('aria-current');
        }
    }

    override render(): TemplateResult | typeof nothing {
        const state = this._renderState;
        if (!state || (state.isMobile && state.isFirst)) return nothing;

        const decoration = state.isMobile
            ? html`<span
                  part="indicator${state.isCurrent ? ' indicator--current' : ''}"
                  aria-hidden="true"
              ></span>`
            : state.isFirst
              ? nothing
              : html`<span part="separator" aria-hidden="true"></span>`;

        const control = state.isCurrent
            ? html`<span part="current">${this.label}</span>`
            : html`<a part="link" href=${this.href ?? ''}>${this.label}</a>`;

        return html`<div class=${state.isMobile ? 'item item--mobile' : 'item'}>
            ${decoration}${control}
        </div>`;
    }
}
```

- [ ] **Step 5: Lancer les tests de l'item, vérifier qu'ils passent**

Run (depuis `packages/core`) : `npx vitest run src/components/breadcrumb-item`
Expected: PASS (les anciens tests `setRegistry`, `disconnectedCallback`, `notification` passent toujours).

- [ ] **Step 6: Adapter `breadcrumb.ts`**

Dans `breadcrumb.ts` :

1. Mettre à jour le JSDoc de classe : **retirer** les lignes `@csspart item`, `link`, `current`, `separator`, `bullet`, `bullet--current` (elles sont maintenant documentées sur l'item). Les lignes `breadcrumb`, `list`, `list--desktop`, `list--mobile`, `home`, `trigger`, `panel` restent.
2. Ajouter, juste avant `override firstUpdated()`, l'état de rendu :

```ts
    override willUpdate(): void {
        this._pushRenderState();
    }
```

3. Ajouter, dans la section `// Private`, après `_collectExistingItems` :

```ts
    private _pushRenderState(): void {
        const items = this._orderedItems;
        items.forEach((item, index) => {
            item.setRenderState({
                isFirst: index === 0,
                isCurrent: index === items.length - 1,
                isMobile: this.isMobile,
            });
        });
    }
```

4. Remplacer entièrement la méthode `render()` par :

```ts
    override render(): TemplateResult | void {
        const items = this._orderedItems;

        if (items.length === 0) return;

        const navLabel = this.localize.term('breadcrumbNavLabel');

        return html`
            <nav part="breadcrumb" role="navigation" aria-labelledby="breadcrumb-label">
                <p id="breadcrumb-label" class="sr-only">${navLabel}</p>
                ${this.isMobile
                    ? html`<div class="dropdown">
                          <a part="home" href="${items[0]?.href}">
                              <slot name="home-icon">${this._defaultHomeIcon()}</slot>
                              <span>${items[0]?.label}</span>
                          </a>
                          <button @click=${this._handleTriggerClick} type="button" part="trigger">
                              <slot name="trigger-icon">${this._defaultTriggerIcon()}</slot>
                              <span class="sr-only">${this.localize.term('showBreadcrumb')}</span>
                          </button>
                          <div part="panel" popover="auto" tabindex="-1">
                              <ol part="list list--mobile"><slot></slot></ol>
                          </div>
                      </div>`
                    : html`<ol part="list list--desktop"><slot></slot></ol>`}
            </nav>
        `;
    }
```

5. Retirer `nothing` de l'import `lit` en tête de fichier s'il n'est plus utilisé (ESLint le signalera).

- [ ] **Step 7: Adapter `breadcrumb.styles.ts`**

Supprimer les blocs suivants (ils vivent maintenant dans `breadcrumb-item.styles.ts`) : `[part='item']`, `[part='link'], [part='current']`, `[part='separator']`, `[part~='bullet']`, `[part~='bullet--current']`, et `[part~='list--mobile'] [part='link'], [part~='list--mobile'] [part='current']`. **Conserver** tout le reste (`:host`, `[part='breadcrumb']`, `[part~='list']`, `list--desktop`, `list--mobile` avec son `:before`, `.dropdown`, `home` / `trigger`, `svg`, états, `prefers-reduced-motion`).

- [ ] **Step 8: Adapter le thème `default.css`**

Dans le bloc `ar-breadcrumb { … }` (~ligne 1138), **supprimer** les règles `&::part(current)`, `&::part(separator)`, `&::part(bullet)`, `&::part(bullet--current)`, et ajouter, immédiatement **après** ce bloc `ar-breadcrumb { … }` :

```css
ar-breadcrumb-item {
    &::part(current) {
        font-weight: 700;
    }

    &::part(separator) {
        background-color: var(--ar-color-neutral-80);
    }

    &::part(indicator) {
        border-radius: var(--ar-border-radius-full);
        background-color: var(--ar-color-neutral-80);
        box-shadow: 0 0 0 2px var(--ar-color-bg);
    }

    &::part(indicator--current) {
        background-color: var(--ar-color-interactive);
    }
}
```

- [ ] **Step 9: Réécrire les tests du parent (`breadcrumb.test.ts`)**

1. Remplacer les helpers `fixture` et `waitForUpdate` (et ajouter `settleItems`) par :

```ts
/** Attend le rendu des items enfants : leur état de rendu est poussé par le parent, ils sont des éléments Lit à part entière. */
async function settleItems(el: ArBreadcrumb): Promise<void> {
    await Promise.all(
        [...el.querySelectorAll('ar-breadcrumb-item')].map(
            (item) => (item as unknown as LitEl).updateComplete,
        ),
    );
}

/**
 * Double await nécessaire : le premier cycle initialise le composant, le second
 * absorbe le queueMicrotask de _scheduleRebuild déclenché par l'enregistrement
 * des ar-breadcrumb-item enfants ; puis on attend le rendu de chaque item.
 */
async function fixture(html: string): Promise<ArBreadcrumb> {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    const el = template.content.firstElementChild as ArBreadcrumb;
    document.body.appendChild(el);
    await (el as unknown as LitEl).updateComplete;
    await (el as unknown as LitEl).updateComplete;
    await settleItems(el);
    return el;
}

async function waitForUpdate(el: ArBreadcrumb): Promise<void> {
    await (el as unknown as LitEl).updateComplete;
    await (el as unknown as LitEl).updateComplete;
    await settleItems(el);
}

function itemsOf(el: ArBreadcrumb): HTMLElement[] {
    return [...el.querySelectorAll<HTMLElement>('ar-breadcrumb-item')];
}
```

2. Dans `describe('layout desktop (isMobile = false)')`, **supprimer** les tests : « n'affiche pas de séparateur avant le premier item », « affiche un séparateur avant chaque item sauf le premier », « affiche le bon nombre d'items », « le dernier item a part="current" et est un span », « le dernier item a ariaCurrent="page" », « les items intermédiaires ont part="link" avec le bon href », « le premier item n'a pas aria-current » (leur contenu est couvert par les tests de l'item). **Les remplacer** par :

```ts
it('la liste desktop contient un slot pour les items', async () => {
    el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
    const list = getShadow(el).querySelector('[part~="list--desktop"]');
    expect(list?.querySelector('slot')).not.toBeNull();
});

it('ne rend plus d\'élément part="item" (les items rendent eux-mêmes)', async () => {
    el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
    expect(getShadow(el).querySelector('[part="item"]')).toBeNull();
    expect(getShadow(el).querySelector('[part="link"]')).toBeNull();
});

it('pousse un rôle listitem à chaque item', async () => {
    el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Catégorie" href="/cat"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
    itemsOf(el).forEach((item) => expect(item.getAttribute('role')).toBe('listitem'));
});

it('seul le dernier item porte aria-current="page"', async () => {
    el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Catégorie" href="/cat"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
    const items = itemsOf(el);
    expect(items[0]?.hasAttribute('aria-current')).toBe(false);
    expect(items[1]?.hasAttribute('aria-current')).toBe(false);
    expect(items[2]?.getAttribute('aria-current')).toBe('page');
});

it('chaque item rend son contenu dans son propre shadow DOM', async () => {
    el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/accueil"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Catégorie" href="/cat"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
    const items = itemsOf(el);
    expect(getPart(items[0]!, 'link')?.getAttribute('href')).toBe('/accueil');
    expect(getPart(items[1]!, 'link')?.getAttribute('href')).toBe('/cat');
    expect(getPart(items[2]!, 'current')?.textContent?.trim()).toBe('Page courante');
});
```

3. Dans `describe('layout mobile (isMobile = true)')`, **supprimer** « chaque item mobile a un part='bullet' » et « seul l'item courant a le part d'état 'bullet--current' », et ajouter :

```ts
it('la liste mobile contient un slot pour les items', async () => {
    el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
    const list = getShadow(el).querySelector('[part~="list--mobile"]');
    expect(list?.querySelector('slot')).not.toBeNull();
});

it('le premier item est masqué (le bouton home le remplace), les autres non', async () => {
    el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Catégorie" href="/cat"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
    const items = itemsOf(el);
    expect(items[0]?.hasAttribute('hidden')).toBe(true);
    expect(items[0]?.shadowRoot?.querySelector('.item')).toBeNull();
    expect(items[1]?.hasAttribute('hidden')).toBe(false);
    expect(getPart(items[1]!, 'indicator')).not.toBeNull();
    expect(getPart(items[2]!, 'indicator')?.getAttribute('part')).toBe(
        'indicator indicator--current',
    );
});
```

4. Dans `describe('mise à jour réactive')`, remplacer le test par :

```ts
it('met à jour le rendu quand le label du dernier item change', async () => {
    el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page A"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
    const last = itemsOf(el)[1]!;
    (last as unknown as { label: string }).label = 'Page B';
    await waitForUpdate(el);
    expect(getPart(last, 'current')?.textContent?.trim()).toBe('Page B');
});
```

5. Vérifier que l'import `getPart` est toujours utilisé (oui) ; les tests `dropdown mobile`, `accessibilité`, `traduction` restent inchangés.

- [ ] **Step 10: Lancer les tests unitaires, vérifier qu'ils passent**

Run (depuis `packages/core`) : `npx vitest run src/components/breadcrumb src/components/breadcrumb-item`
Expected: PASS. Si `Prettier` a réécrit un template avec `${this.label}` (espaces insérés), extraire dans une `const` comme indiqué dans les contraintes.

- [ ] **Step 11: Formater, lint, typecheck, build, suite complète**

Run (depuis `packages/core`) :

```bash
npx prettier --write src/components/breadcrumb/*.ts src/components/breadcrumb-item/*.ts src/styles/themes/default.css
npx eslint --max-warnings=0 src/components/breadcrumb src/components/breadcrumb-item
npx tsc --noEmit -p .
npm run build
npx vitest run
npx web-test-runner
```

Expected: tout passe, y compris `breadcrumb.a11y.test.ts` (axe sur `role="listitem"` d'un hôte `display: contents` dans un `<ol>` avec slot) et `breadcrumb.browser.test.ts`. **Si le test a11y échoue sur la règle `list` / `listitem`, s'arrêter et remonter le problème** (ne pas contourner sans validation).

- [ ] **Step 12: Vérification visuelle « après »**

Run (depuis la racine) : `npm run build --workspace=packages/core && node visual.tmp.mjs after`
Ouvrir `bc-desktop-after.png` et `bc-mobile-open-after.png` avec Read et les comparer à `-before`. Attendu : **identiques** (séparateurs inclinés, puces, connecteur pointillé, boutons). Toute différence est une régression à corriger avant de continuer.

- [ ] **Step 13: Commit**

```bash
git add packages/core/src/components/breadcrumb packages/core/src/components/breadcrumb-item packages/core/src/styles/themes/default.css
git commit -F - <<'EOF'
refactor(core): breadcrumb — ar-breadcrumb-item rend son propre shadow DOM (#239)

ar-breadcrumb ne construit plus les items : il pousse un état de rendu (isFirst, isCurrent,
isMobile) à chaque ar-breadcrumb-item et rend <ol><slot></slot></ol>. Les parts link, current,
separator et indicator (ex-bullet) migrent vers l'item ; le part item disparaît. Sans changement
de rendu visible.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DBWvASBNGXKCie9vdzdJYf
EOF
```

---

### Task 2: CSS interne réduit au structurel, visuels dans le thème

**Files:**

- Modify: `packages/core/src/components/breadcrumb-item/breadcrumb-item.ts`, `breadcrumb-item.styles.ts`
- Modify: `packages/core/src/components/breadcrumb/breadcrumb.ts` (JSDoc `@cssprop`), `breadcrumb.styles.ts`
- Modify: `packages/core/src/styles/themes/default.css` (section `ar-breadcrumb`, `ar-breadcrumb-item`, tokens de `:root`)
- Test: `breadcrumb-item.test.ts`, `breadcrumb.browser.test.ts`

**Interfaces:**

- Consumes (tâche 1) : `BreadcrumbItemRenderState`, `setRenderState`, classes `.item` / `.item--mobile`, parts `link`, `current`, `separator`, `indicator`, `indicator--current`.
- Produces (tâche 3) : le séparateur rend son contenu dans `<span part="separator" aria-hidden="true">…</span>` ; nouveau part `connector` (mobile).

- [ ] **Step 1: Écrire les tests de l'item (échouent)**

Dans `breadcrumb-item.test.ts`, dans `describe('rendu')`, ajouter :

```ts
it('desktop : le séparateur par défaut est un « / » visible', async () => {
    el = await fixture('<ar-breadcrumb-item label="A" href="/a"></ar-breadcrumb-item>');
    el.setRenderState({ isFirst: false, isCurrent: false, isMobile: false });
    await waitForUpdate(el);
    expect(getPart(el, 'separator')?.textContent?.trim()).toBe('/');
});

it("mobile : rend un connecteur décoratif avant l'indicateur", async () => {
    el = await fixture('<ar-breadcrumb-item label="A" href="/a"></ar-breadcrumb-item>');
    el.setRenderState({ isFirst: false, isCurrent: false, isMobile: true });
    await waitForUpdate(el);
    const connector = getPart(el, 'connector');
    expect(connector).not.toBeNull();
    expect(connector?.getAttribute('aria-hidden')).toBe('true');
    const indicator = getPart(el, 'indicator');
    expect(
        connector!.compareDocumentPosition(indicator!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
});

it('desktop : ne rend pas de connecteur', async () => {
    el = await fixture('<ar-breadcrumb-item label="A" href="/a"></ar-breadcrumb-item>');
    el.setRenderState({ isFirst: false, isCurrent: false, isMobile: false });
    await waitForUpdate(el);
    expect(getPart(el, 'connector')).toBeNull();
});
```

Run (depuis `packages/core`) : `npx vitest run src/components/breadcrumb-item`
Expected: FAIL (séparateur vide, pas de connecteur).

- [ ] **Step 2: Mettre à jour le rendu de l'item**

Dans `breadcrumb-item.ts`, remplacer la constante `decoration` de `render()` par :

```ts
const decoration = state.isMobile
    ? html`<span part="connector" aria-hidden="true"></span
          ><span
              part="indicator${state.isCurrent ? ' indicator--current' : ''}"
              aria-hidden="true"
          ></span>`
    : state.isFirst
      ? nothing
      : html`<span part="separator" aria-hidden="true">/</span>`;
```

Ajouter dans le JSDoc de classe, après `@csspart separator` :

```ts
 * @csspart connector - Le trait décoratif reliant l'indicateur de l'item à celui de l'item précédent (mobile uniquement).
```

- [ ] **Step 3: Réécrire `breadcrumb-item.styles.ts` (structurel uniquement)**

```ts
import { css } from 'lit';

export default css`
    :host {
        display: contents;
    }

    /* Le premier item est rendu par le bouton "home" d'ar-breadcrumb en mobile : masqué pour ne
       pas exposer un listitem vide. :host { display: contents } l'emporterait sinon sur le style
       navigateur de [hidden]. */
    :host([hidden]) {
        display: none;
    }

    /* position: relative ancre le connecteur mobile, positionné par le thème. */
    .item {
        position: relative;
        display: flex;
        align-items: center;
    }

    [part='link'],
    [part='current'] {
        display: inline-flex;
        align-items: center;
    }

    /* functional-default: sans thème, item et séparateur ne doivent jamais être collés. */
    [part='separator'] {
        flex-shrink: 0;
        margin-inline: 0.5em;
    }

    [part~='indicator'] {
        flex-shrink: 0;
    }

    .item--mobile [part='link'],
    .item--mobile [part='current'] {
        flex-grow: 1;
        /* a11y-fallback: WCAG 2.5.8 (Target Size Minimum) — cible tactile des lignes de la liste mobile */
        padding: 0.5rem 0.25rem;
    }
`;
```

- [ ] **Step 4: Réécrire `breadcrumb.styles.ts` (structurel uniquement)**

```ts
import { css } from 'lit';

export default css`
    :host {
        display: block;
        box-sizing: border-box;
    }

    [part~='list'] {
        margin: 0;
        padding: 0;
    }

    [part~='list--desktop'] {
        display: flex;
        flex-flow: row wrap;
    }

    [part~='list--mobile'] {
        display: flex;
        flex-direction: column;
    }

    /* ── Wrapper dropdown mobile ────────────────────────────── */

    .dropdown {
        display: inline-flex;
        position: relative;
    }

    /* ── Boutons home/trigger mobile ──────────────────────────────────── */

    [part='home'],
    [part='trigger'] {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        /* a11y-fallback: WCAG 2.5.8 (Target Size Minimum) — sans thème chargé, le bouton perdrait sa taille de cible tactile */
        min-height: var(--ar-breadcrumb-toggle-min-size, 2.5rem);
    }

    [part='trigger'] {
        padding: 0;
        aspect-ratio: 1 / 1;
        /* a11y-fallback: WCAG 2.5.8 (Target Size Minimum) — sans thème chargé, le bouton perdrait sa taille de cible tactile */
        min-width: var(--ar-breadcrumb-toggle-min-size, 2.5rem);
    }

    svg {
        height: 1.25em;
        overflow: visible;
        width: auto;
    }
`;
```

- [ ] **Step 5: Retirer les tokens supprimés du JSDoc de `breadcrumb.ts`**

Supprimer ces 6 lignes `@cssprop` du JSDoc de classe : `--ar-breadcrumb-mobile-separator-color`, `--ar-breadcrumb-toggle-bg`, `--ar-breadcrumb-toggle-bg-hover`, `--ar-breadcrumb-toggle-bg-pressed`, `--ar-breadcrumb-toggle-bg-focus`, `--ar-breadcrumb-toggle-transition-duration`. Conserver `--ar-breadcrumb-distance`, `--ar-breadcrumb-offset`, `--ar-breadcrumb-toggle-min-size` et les `--ar-panel-*`.

- [ ] **Step 6: Mettre à jour le thème `default.css`**

1. Dans `:root`, section Breadcrumb (~lignes 400-417), **supprimer** les tokens `--ar-breadcrumb-mobile-separator-color`, `--ar-breadcrumb-toggle-bg`, `-toggle-bg-hover`, `-toggle-bg-pressed`, `-toggle-bg-focus` et `-toggle-transition-duration` (garder `distance`, `offset` et `toggle-min-size`).
2. Remplacer les blocs `ar-breadcrumb { … }` **et** `ar-breadcrumb-item { … }` par :

```css
ar-breadcrumb {
    &::part(breadcrumb) {
        padding-inline-end: 0.25rem;
    }

    &::part(list) {
        color: var(--ar-color-text);
    }

    &::part(home),
    &::part(trigger) {
        gap: 0.375rem;
        border: none;
        border-radius: var(--ar-border-radius-xl);
        cursor: pointer;
        font-size: var(--ar-font-size-md);
        line-height: 1;
        font-weight: 500;
        color: var(--ar-color-text);
        background-color: light-dark(rgba(26, 26, 26, 0.05), rgba(255, 255, 255, 0.1));
        transition: background-color 0.15s;
    }

    /* Ordre volontaire : :focus-visible avant :hover avant :active, à spécificité égale, pour
           qu'un état combiné (ex. clic : hover + focus simultanés) retienne le fond de l'état le
           plus fort (cf. #157). */
    &::part(home):focus-visible,
    &::part(trigger):focus-visible {
        background-color: light-dark(rgba(26, 26, 26, 0.05), rgba(255, 255, 255, 0.08));
        outline: 2px solid currentColor;
        outline-offset: 2px;
    }

    &::part(home):hover,
    &::part(trigger):hover {
        background-color: light-dark(rgba(26, 26, 26, 0.7), rgba(255, 255, 255, 0.15));
        color: var(--ar-color-white);
    }

    &::part(home):active,
    &::part(trigger):active {
        background-color: light-dark(rgba(26, 26, 26, 0.8), rgba(255, 255, 255, 0.2));
        color: var(--ar-color-white);
    }

    &::part(home) {
        padding: 0 1rem;
        text-decoration: none;
    }

    &::part(trigger) {
        margin-inline-start: 0.5rem;
    }

    @media (prefers-reduced-motion: reduce) {
        &::part(home),
        &::part(trigger) {
            transition: none;
        }
    }
}

ar-breadcrumb-item {
    &::part(link) {
        color: inherit;
    }

    &::part(current) {
        font-weight: 700;
    }

    &::part(separator) {
        color: var(--ar-color-neutral-80);
    }

    &::part(indicator) {
        width: 0.375rem;
        height: 0.375rem;
        margin: 0 0.75rem;
        border-radius: var(--ar-border-radius-full);
        background-color: var(--ar-color-neutral-80);
        box-shadow: 0 0 0 2px var(--ar-color-bg);
    }

    &::part(indicator--current) {
        width: 0.625rem;
        height: 0.625rem;
        margin: 0 0.625rem;
        background-color: var(--ar-color-interactive);
    }

    /* Segment pointillé entre l'indicateur de l'item précédent et le sien (centres alignés
           sur la colonne des indicateurs). */
    &::part(connector) {
        position: absolute;
        inset-inline-start: 0;
        top: -50%;
        bottom: 50%;
        width: 1.875rem;
        background-image: linear-gradient(var(--ar-color-neutral-90) 25%, transparent 0);
        background-size: 2px 8px;
        background-position: center 4px;
        background-repeat: repeat-y;
    }
}
```

- [ ] **Step 7: Adapter `breadcrumb.browser.test.ts`**

1. **Supprimer** le bloc `describe('collision hover/focus (#157)', …)` en entier (le token `bg-focus` n'existe plus).
2. **Supprimer** le bloc `describe('propriétés logiques (RTL)', …)` en entier (le padding du nav est désormais porté par le thème, qui n'est jamais chargé dans les tests).
3. Retirer `elementUpdated` de la ligne d'import de `@open-wc/testing` (devenu inutilisé). **Conserver** le reste (ouverture / fermeture, light-dismiss, `structure`, `fallback CSS sans thème chargé`).

- [ ] **Step 8: Lancer tests, lint, build, suite complète**

Run (depuis `packages/core`) :

```bash
npx prettier --write src/components/breadcrumb/*.ts src/components/breadcrumb-item/*.ts src/styles/themes/default.css
npx eslint --max-warnings=0 src/components/breadcrumb src/components/breadcrumb-item
npx tsc --noEmit -p .
npm run build
npx vitest run
npx web-test-runner
```

Expected: tout passe. Le build exécute `validate-cssprop-defaults` (tokens supprimés absents du JSDoc et de `:root`) et `validate-part-state-order` (`indicator` avant `indicator--current`).

- [ ] **Step 9: Vérification visuelle**

Run (depuis la racine) : `npm run build --workspace=packages/core && node visual.tmp.mjs after2`
Comparer `bc-desktop-after2.png` et `bc-mobile-open-after2.png` à `-before`. Attendu : séparateur « / » (au lieu du trait incliné, différence voulue), puces, connecteur pointillé (un segment par item, aligné sur les centres des puces), boutons `home` / `trigger` avec leur fond. **Tolérance** : si le connecteur déborde ou est décalé (segments dont les hauteurs diffèrent), ajuster `top` / `bottom` / `height` de `::part(connector)` dans le thème jusqu'à obtenir un tracé continu comme avant ; ne pas modifier le composant.

- [ ] **Step 10: Commit**

```bash
git add packages/core/src/components/breadcrumb packages/core/src/components/breadcrumb-item packages/core/src/styles/themes/default.css
git commit -F - <<'EOF'
refactor(core): breadcrumb — CSS interne réduit au structurel, visuels dans le thème (#239)

Séparateur « / » par défaut (remplace le trait incliné dessiné en CSS), nouveau part connector
(mobile) à la place du ::before de la liste, styles des boutons home/trigger et des parts de
l'item déplacés dans default.css. Tokens supprimés : mobile-separator-color et toggle-bg,
-bg-hover, -bg-pressed, -bg-focus, -transition-duration.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DBWvASBNGXKCie9vdzdJYf
EOF
```

---

### Task 3: Slot `separator` cloné dans chaque item, et documentation

**Files:**

- Modify: `packages/core/src/components/breadcrumb-item/breadcrumb-item.ts`
- Modify: `packages/core/src/components/breadcrumb/breadcrumb.ts`
- Modify: `apps/docs/src/content/components/ar-breadcrumb.mdx`
- Test: `breadcrumb-item.test.ts`, `breadcrumb.test.ts`

**Interfaces:**

- Consumes (tâches 1-2) : `BreadcrumbItemRenderState`, `setRenderState`, `_pushRenderState`, `_scheduleRebuild`, `<span part="separator" aria-hidden="true">/</span>`.
- Produces : `BreadcrumbItemRenderState` étendu avec `separator: Node | undefined` et `separatorVersion: number`.

- [ ] **Step 1: Mettre à jour les appels existants de `setRenderState` dans les tests**

Le type gagne deux champs obligatoires. Dans `breadcrumb-item.test.ts`, chaque littéral `{ isFirst: …, isCurrent: …, isMobile: … }` passé à `setRenderState` devient `{ isFirst: …, isCurrent: …, isMobile: …, separator: undefined, separatorVersion: 0 }`. (Recherche : `setRenderState({`.)

- [ ] **Step 2: Écrire les tests de l'item (échouent)**

Dans `breadcrumb-item.test.ts`, dans `describe('rendu')`, ajouter :

```ts
it('desktop : clone le nœud séparateur fourni, sans le déplacer ni garder son attribut slot', async () => {
    el = await fixture('<ar-breadcrumb-item label="A" href="/a"></ar-breadcrumb-item>');
    const source = document.createElement('span');
    source.setAttribute('slot', 'separator');
    source.textContent = '›';
    el.setRenderState({
        isFirst: false,
        isCurrent: false,
        isMobile: false,
        separator: source,
        separatorVersion: 1,
    });
    await waitForUpdate(el);

    const rendered = getPart(el, 'separator');
    expect(rendered?.textContent?.trim()).toBe('›');
    const clone = rendered?.firstElementChild as HTMLElement;
    expect(clone).not.toBe(source);
    expect(clone.hasAttribute('slot')).toBe(false);
    expect(source.getAttribute('slot')).toBe('separator');
});

it('re-clone quand la version du séparateur change', async () => {
    el = await fixture('<ar-breadcrumb-item label="A" href="/a"></ar-breadcrumb-item>');
    const source = document.createElement('span');
    source.textContent = '›';
    const base = { isFirst: false, isCurrent: false, isMobile: false, separator: source };
    el.setRenderState({ ...base, separatorVersion: 1 });
    await waitForUpdate(el);
    expect(getPart(el, 'separator')?.textContent?.trim()).toBe('›');

    source.textContent = '»';
    el.setRenderState({ ...base, separatorVersion: 2 });
    await waitForUpdate(el);
    expect(getPart(el, 'separator')?.textContent?.trim()).toBe('»');
});

it('retombe sur « / » quand le nœud séparateur disparaît', async () => {
    el = await fixture('<ar-breadcrumb-item label="A" href="/a"></ar-breadcrumb-item>');
    const source = document.createElement('span');
    source.textContent = '›';
    el.setRenderState({
        isFirst: false,
        isCurrent: false,
        isMobile: false,
        separator: source,
        separatorVersion: 1,
    });
    await waitForUpdate(el);
    el.setRenderState({
        isFirst: false,
        isCurrent: false,
        isMobile: false,
        separator: undefined,
        separatorVersion: 2,
    });
    await waitForUpdate(el);
    expect(getPart(el, 'separator')?.textContent?.trim()).toBe('/');
});
```

Run (depuis `packages/core`) : `npx vitest run src/components/breadcrumb-item`
Expected: FAIL (type et comportement).

- [ ] **Step 3: Étendre l'item**

Dans `breadcrumb-item.ts` :

1. Étendre l'interface :

```ts
export interface BreadcrumbItemRenderState {
    isFirst: boolean;
    /** Dernier item du fil : rendu comme texte, non cliquable. */
    isCurrent: boolean;
    isMobile: boolean;
    /** Nœud modèle du slot `separator` d'ar-breadcrumb, cloné dans l'item (desktop). */
    separator: Node | undefined;
    /** Incrémenté par ar-breadcrumb quand le contenu du nœud modèle change. */
    separatorVersion: number;
}
```

2. Étendre le test d'égalité de `setRenderState` :

```ts
if (
    previous &&
    previous.isFirst === state.isFirst &&
    previous.isCurrent === state.isCurrent &&
    previous.isMobile === state.isMobile &&
    previous.separator === state.separator &&
    previous.separatorVersion === state.separatorVersion
) {
    return;
}
```

3. Ajouter, sous le champ `_registry` :

```ts
    private _separatorClone: { source: Node; version: number; node: Node } | undefined = undefined;
```

4. Ajouter la méthode (avant `render()`) :

```ts
    /** Un nœud ne peut être assigné qu'à un slot : chaque item rend son propre clone du modèle. */
    private _separatorContent(state: BreadcrumbItemRenderState): Node | string {
        const source = state.separator;
        if (!source) return '/';
        const cached = this._separatorClone;
        if (cached && cached.source === source && cached.version === state.separatorVersion) {
            return cached.node;
        }
        const node = source.cloneNode(true);
        if (node instanceof Element) node.removeAttribute('slot');
        this._separatorClone = { source, version: state.separatorVersion, node };
        return node;
    }
```

5. Ajouter le rendu du séparateur dans une méthode dédiée (la valeur est extraite dans une `const`,
   pour que Prettier n'insère pas d'espaces autour de `${…}` dans le DOM rendu) :

```ts
    private _renderSeparator(state: BreadcrumbItemRenderState): TemplateResult {
        const content = this._separatorContent(state);
        return html`<span part="separator" aria-hidden="true">${content}</span>`;
    }
```

6. Dans `render()`, remplacer la branche `: html\`<span part="separator" aria-hidden="true">/</span>\``par`: this._renderSeparator(state)`. Le bloc `decoration` devient :

```ts
const decoration = state.isMobile
    ? html`<span part="connector" aria-hidden="true"></span
          ><span
              part="indicator${state.isCurrent ? ' indicator--current' : ''}"
              aria-hidden="true"
          ></span>`
    : state.isFirst
      ? nothing
      : this._renderSeparator(state);
```

- [ ] **Step 4: Lancer les tests de l'item**

Run (depuis `packages/core`) : `npx vitest run src/components/breadcrumb-item`
Expected: PASS.

- [ ] **Step 5: Écrire les tests du parent (échouent)**

Dans `breadcrumb.test.ts`, ajouter un bloc avant `describe('accessibilité')` :

```ts
// ── Slot separator ────────────────────────────────────────────────────────

describe('slot separator', () => {
    beforeEach(() => {
        ArBreadcrumb.mobileQuery = mockMediaQuery(false);
    });

    const withSeparator = `
            <ar-breadcrumb>
                <span slot="separator">›</span>
                <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                <ar-breadcrumb-item label="Catégorie" href="/cat"></ar-breadcrumb-item>
                <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
            </ar-breadcrumb>
        `;

    it('affiche « / » par défaut entre les items', async () => {
        el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
        expect(getPart(itemsOf(el)[1]!, 'separator')?.textContent?.trim()).toBe('/');
    });

    it('clone le contenu du slot dans chaque item sauf le premier', async () => {
        el = await fixture(withSeparator);
        const items = itemsOf(el);
        expect(getPart(items[0]!, 'separator')).toBeNull();
        expect(getPart(items[1]!, 'separator')?.textContent?.trim()).toBe('›');
        expect(getPart(items[2]!, 'separator')?.textContent?.trim()).toBe('›');
    });

    it("laisse le nœud modèle dans le light DOM d'ar-breadcrumb", async () => {
        el = await fixture(withSeparator);
        const source = el.querySelector(':scope > [slot="separator"]');
        expect(source?.parentElement).toBe(el);
        expect(source?.textContent).toBe('›');
    });

    it('suit une mutation du contenu du séparateur', async () => {
        el = await fixture(withSeparator);
        const source = el.querySelector(':scope > [slot="separator"]') as HTMLElement;
        source.textContent = '»';
        await new Promise((resolve) => setTimeout(resolve, 0));
        await waitForUpdate(el);
        expect(getPart(itemsOf(el)[1]!, 'separator')?.textContent?.trim()).toBe('»');
    });

    it('retombe sur « / » quand le nœud séparateur est retiré', async () => {
        el = await fixture(withSeparator);
        el.querySelector(':scope > [slot="separator"]')?.remove();
        await new Promise((resolve) => setTimeout(resolve, 0));
        await waitForUpdate(el);
        expect(getPart(itemsOf(el)[1]!, 'separator')?.textContent?.trim()).toBe('/');
    });

    it("n'affiche pas le séparateur en mobile (indicateur à la place)", async () => {
        ArBreadcrumb.mobileQuery = mockMediaQuery(true);
        el = await fixture(withSeparator);
        const items = itemsOf(el);
        expect(getPart(items[1]!, 'separator')).toBeNull();
        expect(getPart(items[1]!, 'indicator')).not.toBeNull();
    });
});
```

Run (depuis `packages/core`) : `npx vitest run src/components/breadcrumb/breadcrumb.test.ts`
Expected: FAIL (le parent ne pousse pas de `separator`).

- [ ] **Step 6: Implémenter le slot dans `breadcrumb.ts`**

1. Ajouter dans le JSDoc de classe, avec les autres `@slot` :

```ts
 * @slot separator - Séparateur entre les items (desktop). Cloné dans chaque item ; remplace le « / » par défaut. Sans `id`, ni contenu interactif (le séparateur est masqué aux lecteurs d'écran).
```

2. Ajouter les champs, sous `_rebuildPending` :

```ts
    private _separatorVersion = 0;

    private readonly _separatorObserver = new MutationObserver(() => {
        this._separatorVersion += 1;
        this._scheduleRebuild();
    });
```

3. Dans `connectedCallback()`, juste après `super.connectedCallback();` :

```ts
this._separatorObserver.observe(this, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['slot'],
});
```

4. Dans `disconnectedCallback()`, après `super.disconnectedCallback();` :

```ts
this._separatorObserver.disconnect();
```

5. Remplacer `_pushRenderState()` par :

```ts
    private _pushRenderState(): void {
        const items = this._orderedItems;
        const separator = this.querySelector(':scope > [slot="separator"]') ?? undefined;
        items.forEach((item, index) => {
            item.setRenderState({
                isFirst: index === 0,
                isCurrent: index === items.length - 1,
                isMobile: this.isMobile,
                separator,
                separatorVersion: this._separatorVersion,
            });
        });
    }
```

- [ ] **Step 7: Lancer les tests, lint, build, suite complète**

Run (depuis `packages/core`) :

```bash
npx prettier --write src/components/breadcrumb/*.ts src/components/breadcrumb-item/*.ts
npx eslint --max-warnings=0 src/components/breadcrumb src/components/breadcrumb-item
npx tsc --noEmit -p .
npm run build
npx vitest run
npx web-test-runner
```

Expected: tout passe.

- [ ] **Step 8: Documentation**

Dans `apps/docs/src/content/components/ar-breadcrumb.mdx` :

1. Ajouter une variante à la fin de la liste `variants` du frontmatter (indentation identique aux variantes existantes) :

```yaml
- name: custom-separator
  label: Séparateur personnalisé
  description: Un contenu posé dans le slot separator remplace le « / » par défaut ; il est cloné entre chaque item.
  html: |
      <ar-breadcrumb>
        <span slot="separator">›</span>
        <ar-breadcrumb-item label="Accueil Espace Personnel" href="/accueil"></ar-breadcrumb-item>
        <ar-breadcrumb-item label="Mon journal de recherche d'emploi" href="/journal"></ar-breadcrumb-item>
        <ar-breadcrumb-item label="Publiez vos offres d'emploi"></ar-breadcrumb-item>
      </ar-breadcrumb>
```

2. Ajouter, après la section `## Accessibilité` (fin de fichier), cette section :

````mdx
## Utilisation

### Personnaliser le séparateur

Par défaut, un « / » s'affiche entre les items (desktop). Le slot `separator` permet de le
remplacer par un caractère ou une icône : le contenu est cloné dans chaque item, le nœud posé sur
`ar-breadcrumb` n'est jamais affiché lui-même.

```html
<ar-breadcrumb>
    <span slot="separator">›</span>
    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
    <ar-breadcrumb-item label="Produits" href="/produits"></ar-breadcrumb-item>
    <ar-breadcrumb-item label="Chaussures"></ar-breadcrumb-item>
</ar-breadcrumb>
```

Le séparateur est décoratif (`aria-hidden`) : évitez les éléments interactifs, et ne mettez pas
d'`id` dans son contenu (il serait dupliqué dans chaque clone). En mobile, il n'est pas affiché.
La couleur et la taille se règlent depuis le thème via `ar-breadcrumb-item::part(separator)`.
````

- [ ] **Step 9: Tests et formatage de la doc**

Run (depuis la racine) :

```bash
npx prettier --check apps/docs/src/content/components/ar-breadcrumb.mdx
npm run test --workspace=apps/docs
```

Expected: PASS.

- [ ] **Step 10: Vérification visuelle finale et nettoyage**

Run (depuis la racine) : `npm run build --workspace=packages/core && node visual.tmp.mjs after3`
Ouvrir les captures, vérifier le rendu desktop et mobile. Puis **supprimer le script et vérifier qu'il ne sera pas committé** : `rm visual.tmp.mjs && git status --short` (aucun `visual.tmp.mjs`).

- [ ] **Step 11: Commit**

```bash
git add packages/core/src/components/breadcrumb packages/core/src/components/breadcrumb-item apps/docs/src/content/components/ar-breadcrumb.mdx
git commit -F - <<'EOF'
feat(core): breadcrumb — slot separator cloné dans chaque item (#239)

Un contenu posé dans le slot separator d'ar-breadcrumb remplace le « / » par défaut. Il est
cloné dans le shadow de chaque item (sans modifier le light DOM) et suivi par un
MutationObserver pour les frameworks réactifs. Doc : variante et section d'usage.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DBWvASBNGXKCie9vdzdJYf
EOF
```

---

## Self-Review

**1. Spec coverage**

| Exigence de la spec                                                                            | Tâche                                            |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Item avec shadow DOM, hôte `display: contents`, `role="listitem"`, `aria-current`              | 1 (étapes 3-4)                                   |
| `ar-breadcrumb` : `<nav>`, `home`, `trigger`, panel, `<ol><slot>`                              | 1 (étape 6)                                      |
| État de rendu poussé (`isFirst`, `isCurrent`, `isMobile`) via `setRenderState`                 | 1 (étapes 4, 6)                                  |
| Aucun rendu avant le premier état ; premier item mobile sans rendu + `hidden`                  | 1 (tests étape 1, rendu étape 4, styles étape 3) |
| Parts migrés, `bullet` → `indicator`, part `item` supprimé                                     | 1                                                |
| Part `connector` (mobile)                                                                      | 2 (étape 2)                                      |
| Séparateur « / » par défaut, marge minimale en `em`                                            | 2 (étapes 2-3)                                   |
| CSS interne structurel / visuel au thème / boutons `home` `trigger` / `prefers-reduced-motion` | 2 (étapes 4, 6)                                  |
| Tokens supprimés (6)                                                                           | 2 (étapes 5-6)                                   |
| Slot `separator` cloné, `MutationObserver`, `aria-hidden`, pas de séparateur en mobile         | 3                                                |
| Tests headless uniquement ; tests dépendant du thème supprimés                                 | 1, 2 (étape 7), 3                                |
| Test a11y `listitem` sur hôte `display: contents`                                              | 1 (étape 11, suite `web-test-runner`)            |
| Doc (`ar-breadcrumb.mdx`)                                                                      | 3 (étape 8)                                      |
| Découpage en 3 commits                                                                         | Étapes de commit des tâches 1, 2, 3              |

Écart connu : le padding vertical des liens mobiles reste interne (Rulings en tête de plan, reporté dans la spec).

**2. Placeholder scan** : aucun « TBD », « TODO », « à compléter » ; chaque étape de code donne le code.

**3. Cohérence des types** : `BreadcrumbItemRenderState` (tâche 1 : 3 champs) est étendu en tâche 3 avec `separator` et `separatorVersion` — la tâche 3 étape 1 met à jour les appels existants des tâches 1-2. `setRenderState`, `_pushRenderState`, `_scheduleRebuild`, `.item` / `.item--mobile`, et les noms de parts (`link`, `current`, `separator`, `indicator`, `indicator--current`, `connector`) sont identiques d'une tâche à l'autre. Les helpers `itemsOf` / `settleItems` sont définis en tâche 1 et réutilisés en tâche 3.
