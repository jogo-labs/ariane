# ar-breadcrumb — audit CSS hérité + token vs `::part()` (lot 4, #129) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Appliquer le critère token-vs-part (ADR-005) à `ar-breadcrumb` — audit et nettoyage du CSS hérité, découplage des boutons mobile de `button.styles.ts`, conversion de deux pseudo-éléments décoratifs en vrais `part`, correction d'un bug de cascade réel (font-weight jamais appliqué).

**Architecture:** Un seul composant modifié (`ar-breadcrumb`, pas `ar-breadcrumb-item`). Le template (`breadcrumb.ts`) gagne de nouveaux `part` (`list`/`list--desktop`/`list--mobile`, `bullet`/`bullet--current`, `separator`, `home`) et perd toutes ses classes `.breadcrumb-*` redondantes. `breadcrumb.styles.ts` perd sa dépendance à `button.styles.ts` (boutons mobile réimplémentés en propre). `default.css` perd 10 tokens `--ar-breadcrumb-*` (migrés vers des règles `::part()` littérales) et en gagne 2 nouveaux (fallback WCAG 2.5.8 + garde `prefers-reduced-motion`).

**Tech Stack:** Lit 3, TypeScript, Vitest (tests unitaires), `@web/test-runner` + Playwright + axe-core (tests navigateur/a11y), Custom Elements Manifest (génération de `custom-elements.json` depuis le JSDoc).

## Global Constraints

- Spec de référence : `docs/superpowers/specs/2026-07-30-breadcrumb-token-vs-part-129-design.md` — toute divergence avec ce plan doit être résolue en faveur de la spec, sauf erreur manifeste signalée en review.
- Prettier : 100 caractères, 4 espaces, quotes simples (`npm run lint-staged` s'en charge au commit).
- `import type` obligatoire pour tout import de type uniquement.
- Aucun fallback cosmétique dans les composants — seuls `a11y-fallback` (WCAG/fonctionnel critique) et `functional-default` (déjà utilisés ailleurs, pas dans ce lot) autorisent une valeur littérale, toujours avec le commentaire exact `/* a11y-fallback: <raison> */` sur la ligne précédente.
- `npm run build:manifest` doit passer sans erreur avant tout commit touchant `default.css` ou le JSDoc de `breadcrumb.ts` (garde-fous : couverture `@cssprop`, tokens codés en dur, fallbacks non justifiés, ordre des parts d'état).
- Ne jamais merger sur `dev` sans confirmation explicite de l'utilisateur.
- Commit et push depuis `dev` de manière exceptionnelle > toujours demander confirmation avant push/PR.

---

### Task 1: Créer la branche de travail

**Files:** aucun fichier modifié.

- [ ] **Step 1: Créer et basculer sur la branche**

```bash
cd /Users/jon/Code/Active_projects/ariane
git checkout dev
git pull
git checkout -b fix/breadcrumb-token-vs-part-129
```

- [ ] **Step 2: Vérifier l'état propre**

Run: `git status`
Expected: `On branch fix/breadcrumb-token-vs-part-129`, working tree clean.

---

### Task 2: Restructurer le template `breadcrumb.ts` (parts, suppression des classes/ID redondants, JSDoc)

**Files:**

- Modify: `packages/core/src/components/breadcrumb/breadcrumb.ts`

**Interfaces:**

- Consumes: `ArBreadcrumbItem` (`item.label`, `item.href`) — inchangé, aucune modification de `breadcrumb-item.ts` dans ce lot.
- Produces: nouveau contrat de `part` que `breadcrumb.styles.ts` (Task 3) et `default.css` (Task 4) doivent cibler : `nav`, `list`/`list--desktop`/`list--mobile`, `item`, `link`, `current`, `separator`, `bullet`/`bullet--current`, `home`, `trigger`, `panel`. Les ID `#mobile-home-btn`/`#breadcrumb-dropdown` et toutes les classes `.breadcrumb-*`/`.btn*` disparaissent du template.

- [ ] **Step 1: Remplacer le contenu de `render()` et retirer l'import de `buttonStyles`**

Remplacer l'intégralité du fichier `packages/core/src/components/breadcrumb/breadcrumb.ts` par :

```ts
import {
    LitElement,
    type TemplateResult,
    html,
    type CSSResultGroup,
    nothing,
    type PropertyValues,
} from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { ToggleController } from '../../controllers/toggle.controller.js';
import { emitToggleEvent } from '../../utils/toggle-events.js';
import { ContextProvider } from '@lit/context';
import utilitiesStyles from '../../styles/utilities.styles.js';
import resetStyles from '../../styles/components/reset.styles.js';
import panelStyles from '../../styles/shared/panel.styles.js';
import styles from './breadcrumb.styles.js';

import { breadcrumbContext } from '../../context/breadcrumb.context.js';
import { ArBreadcrumbItem } from '../breadcrumb-item/breadcrumb-item.js';
import { AnchoredController } from '../../controllers/anchored.controller.js';

/**
 * @summary Fil d'ariane accessible avec affichage adaptatif mobile/desktop.
 * @display demo
 *
 * En dessous de 768px de largeur de viewport, les liens intermédiaires sont masqués
 * derrière un dropdown. Le premier lien reste toujours visible sous forme d'un bouton
 * "Retour".
 *
 * @csspart nav        - L'élément `<nav>` englobant.
 * @csspart list       - L'élément `<ol>` de la liste des liens (desktop ou mobile).
 * @csspart list--desktop - La liste desktop (variante d'état de `list`).
 * @csspart list--mobile  - La liste mobile, affichée dans le panel (variante d'état de `list`).
 * @csspart item       - Chaque `<li>` de la liste.
 * @csspart link       - Les `<a>` de navigation.
 * @csspart current    - Le `<span>` de la page courante (dernier élément, non cliquable).
 * @csspart separator  - Le séparateur entre deux items (desktop uniquement, absent avant le premier item).
 * @csspart bullet     - La puce d'un item (mobile uniquement).
 * @csspart bullet--current - La puce de l'élément courant (variante d'état de `bullet`).
 * @csspart home       - Le lien "Retour" vers le premier item (mobile uniquement).
 * @csspart trigger    - Le bouton d'ouverture du panel mobile.
 * @csspart panel      - Le panel mobile flottant.
 *
 * @cssprop --ar-breadcrumb-distance - Espacement entre le trigger et le panel mobile.
 * @cssprop --ar-breadcrumb-offset - Décalage latéral du panel mobile.
 * @cssprop --ar-breadcrumb-mobile-separator-color - Couleur du connecteur pointillé vertical entre les items de la liste mobile (cascade vers --ar-color-neutral-90).
 * @cssprop --ar-breadcrumb-panel-bg - Fond du panel mobile (cascade vers --ar-panel-bg, repli système `Canvas` si aucun thème n'est chargé).
 * @cssprop --ar-breadcrumb-panel-border-color - Couleur de bordure du panel mobile (cascade vers --ar-panel-border-color, repli système `ButtonBorder` si aucun thème n'est chargé).
 * @cssprop --ar-breadcrumb-toggle-bg - Fond du bouton retour/trigger mobile.
 * @cssprop --ar-breadcrumb-toggle-bg-hover - Fond du bouton retour/trigger mobile au survol.
 * @cssprop --ar-breadcrumb-toggle-bg-pressed - Fond du bouton retour/trigger mobile pressé.
 * @cssprop --ar-breadcrumb-toggle-bg-focus - Fond du bouton retour/trigger mobile au focus.
 * @cssprop --ar-breadcrumb-toggle-min-size - Taille minimale (largeur/hauteur) du bouton retour/trigger mobile, repli WCAG 2.5.8 si aucun thème n'est chargé.
 * @cssprop --ar-breadcrumb-toggle-transition-duration - Durée de la transition (background-color) des boutons retour/trigger mobile.
 *
 * @event {CustomEvent} ar-breadcrumb-show           - Émis avant l'ouverture du dropdown mobile. @cancelable
 * @event {CustomEvent} ar-breadcrumb-show-prevented - Émis si ar-breadcrumb-show est annulé.
 * @event {CustomEvent} ar-breadcrumb-shown          - Émis après l'ouverture du dropdown mobile.
 * @event {CustomEvent} ar-breadcrumb-hide           - Émis avant la fermeture du dropdown mobile. @cancelable
 * @event {CustomEvent} ar-breadcrumb-hide-prevented - Émis si ar-breadcrumb-hide est annulé.
 * @event {CustomEvent} ar-breadcrumb-hidden         - Émis après la fermeture du dropdown mobile.
 */
export class ArBreadcrumb extends LitElement {
    static override styles: CSSResultGroup = [utilitiesStyles, resetStyles, panelStyles, styles];

    static mobileQuery: MediaQueryList = window.matchMedia('(max-width: 767px)');

    @state() private isMobile: boolean = ArBreadcrumb.mobileQuery.matches;

    /**
     * Contrôle programmatique du panel mobile. Reflété comme attribut HTML.
     * Sans effet en mode desktop.
     * @attr open
     */
    @property({ reflect: true, type: Boolean }) open: boolean = false;

    @query('[part="trigger"]') private _dropdownTrigger?: HTMLButtonElement;
    @query('[part="panel"]') private _dropdownPanel?: HTMLElement;

    private _items = new Set<ArBreadcrumbItem>();
    private _rebuildPending = false;

    private readonly _provider = new ContextProvider(this, {
        context: breadcrumbContext,
        initialValue: {
            registerItem: (item: ArBreadcrumbItem) => {
                this._items.add(item);
                this._scheduleRebuild();
            },
            unregisterItem: (item: ArBreadcrumbItem) => {
                this._items.delete(item);
                this._scheduleRebuild();
            },
            notifyItemChanged: (_item: ArBreadcrumbItem) => {
                this._scheduleRebuild();
            },
        },
    });

    private readonly _popover = new AnchoredController(this, {
        lockScroll: false,
        popupMode: 'menu',
        placement: 'bottom-end',
        cssVarPrefix: 'breadcrumb',
        onExternalClose: () => {
            this.open = false;
        },
    });

    constructor() {
        super();
        // s'enregistre lui-même via host.addController(), pas besoin de conserver la référence
        new ToggleController(this, {
            eventPrefix: 'ar-breadcrumb',
            shouldToggle: () => this.isMobile,
            skipInitialTransition: true,
            onShow: () => this._onShow(),
            onHide: () => this._onHide(),
        });
    }

    // ---------------------------------------------------------------------------
    // Lifecycle
    // ---------------------------------------------------------------------------

    override connectedCallback(): void {
        super.connectedCallback();
        ArBreadcrumb.mobileQuery.addEventListener('change', this._handleMediaChange);
        // Fallback pour les items déjà présents dans le DOM avant que le provider soit prêt.
        // On attend la définition des tags réellement utilisés (pas un préfixe supposé) pour
        // fonctionner aussi bien avec des tags renommés indépendamment (import headless).
        const tags = new Set(
            [...this.querySelectorAll('*')]
                .map((el) => el.localName)
                .filter((tag) => tag.includes('-')),
        );
        Promise.all([...tags].map((tag) => customElements.whenDefined(tag))).then(() =>
            this._collectExistingItems(),
        );
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        ArBreadcrumb.mobileQuery.removeEventListener('change', this._handleMediaChange);
    }

    override firstUpdated(): void {
        if (this.isMobile) this._attachDropdown();
    }

    override updated(changed: PropertyValues<this>): void {
        if ((changed as Map<PropertyKey, unknown>).has('isMobile') && this.isMobile) {
            void this.updateComplete.then(() => {
                if (this.isConnected) this._attachDropdown();
            });
        }
    }

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------

    override render(): TemplateResult | void {
        const items = this._orderedItems;

        if (items.length === 0) return;

        const listTemplates: TemplateResult[] = items.map((item, index) => {
            const isCurrent = index === items.length - 1;
            const decoration = this.isMobile
                ? html`<span
                      part="bullet${isCurrent ? ' bullet--current' : ''}"
                      aria-hidden="true"
                  ></span>`
                : index > 0
                  ? html`<span part="separator" aria-hidden="true"></span>`
                  : nothing;

            return html` <li part="item" .ariaCurrent="${isCurrent ? 'page' : nothing}">
                ${decoration}
                ${isCurrent
                    ? html`<span part="current">${item.label}</span>`
                    : html`<a part="link" href="${item.href}">${item.label}</a>`}
            </li>`;
        });

        return html`
            <nav part="nav" role="navigation" aria-labelledby="breadcrumb-label">
                <p id="breadcrumb-label" class="sr-only">Vous êtes ici</p>
                ${this.isMobile
                    ? html`<div class="dropdown">
                          <a part="home" href="${items[0]?.href}">
                              <span aria-hidden="true" class="icon icon-chevron-sm-l"></span>
                              <span class="btn-content">${items[0]?.label}</span>
                          </a>
                          <button @click=${this._handleTriggerClick} type="button" part="trigger">
                              <span aria-hidden="true" class="icon icon-more">v</span>
                              <span class="btn-content sr-only">Afficher le fil d'ariane</span>
                          </button>
                          <div part="panel" popover="auto" tabindex="-1">
                              <ol part="list list--mobile">
                                  ${listTemplates.slice(1)}
                              </ol>
                          </div>
                      </div>`
                    : html`<ol part="list list--desktop">
                          ${listTemplates}
                      </ol>`}
            </nav>
        `;
    }

    // ---------------------------------------------------------------------------
    // Private
    // ---------------------------------------------------------------------------

    private get _orderedItems(): ArBreadcrumbItem[] {
        return [...this.querySelectorAll('*')].filter(
            (el): el is ArBreadcrumbItem => el instanceof ArBreadcrumbItem,
        );
    }

    private _collectExistingItems(): void {
        const registry = this._provider.value;
        if (!registry) return;
        [...this.querySelectorAll('*')]
            .filter((el): el is ArBreadcrumbItem => el instanceof ArBreadcrumbItem)
            .forEach((item) => item.setRegistry(registry));
    }

    private _scheduleRebuild(): void {
        if (this._rebuildPending) return;
        this._rebuildPending = true;
        queueMicrotask(() => {
            this._rebuildPending = false;
            this.requestUpdate();
        });
    }

    private _attachDropdown(): void {
        if (this._dropdownTrigger && this._dropdownPanel) {
            this._popover.attach(this._dropdownTrigger, this._dropdownPanel);
        }
    }

    private _handleTriggerClick = (): void => {
        this.open = !this.open;
    };

    private _onShow(): void {
        void this._popover.show().then(() => {
            emitToggleEvent(this, 'ar-breadcrumb-shown', { cancelable: false });
        });
    }

    private _onHide(): void {
        this._popover.hide();
        emitToggleEvent(this, 'ar-breadcrumb-hidden', { cancelable: false });
    }

    private _handleMediaChange = (): void => {
        this.isMobile = ArBreadcrumb.mobileQuery.matches;
    };
}
```

Points clés du diff par rapport à l'original :

- Import de `buttonStyles` retiré (Task 3 le confirme côté styles).
- `part="home"` remplace `id="mobile-home-btn"` ; `id="breadcrumb-dropdown"` retiré de `[part="trigger"]` (le `@query('[part="trigger"]')` existant suffit déjà, `aria-expanded` est posé par `AnchoredController` sur l'élément trouvé via ce `part`, pas via l'ID).
- Toutes les classes `.breadcrumb-*`/`.btn`/`.btn-tertiary`/`.btn-ratio-square` retirées du template.
- `<ol>` desktop et mobile portent désormais `part="list list--desktop"`/`part="list list--mobile"`.
- Chaque `<li>` reçoit un `<span aria-hidden="true">` décoratif : `part="bullet"`/`part="bullet bullet--current"` en mobile, `part="separator"` en desktop pour `index > 0` uniquement.
- `class="dropdown"` remplace `class="breadcrumb-dropdown"`.

- [ ] **Step 2: Vérifier la compilation TypeScript**

Run: `cd /Users/jon/Code/Active_projects/ariane && npx tsc --noEmit -p packages/core/tsconfig.json`
Expected: aucune erreur (le fichier ne fait que retirer des imports/attributs, pas de changement de types).

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/components/breadcrumb/breadcrumb.ts
git commit -m "refactor(breadcrumb): restructure le template — nouveaux part, retrait des classes/ID redondants"
```

---

### Task 3: Réécrire `breadcrumb.styles.ts` (nettoyage, découplage de `button.styles.ts`)

**Files:**

- Modify: `packages/core/src/components/breadcrumb/breadcrumb.styles.ts`

**Interfaces:**

- Consumes: les `part` produits par Task 2.
- Produces: tokens consommés en interne (`--ar-breadcrumb-mobile-separator-color`, `--ar-breadcrumb-panel-bg`, `--ar-breadcrumb-panel-border-color`, `--ar-breadcrumb-toggle-bg*`, `--ar-breadcrumb-toggle-min-size`, `--ar-breadcrumb-toggle-transition-duration`) que Task 4 doit déclarer dans `default.css`.

- [ ] **Step 1: Remplacer le contenu du fichier**

```ts
import { css } from 'lit';

export default css`
    :host {
        display: block;
        box-sizing: border-box;
    }

    /* ── Nav / item ──────────────────────────────────────────── */

    [part='nav'] {
        padding-right: 0.25rem;
    }

    [part='item'] {
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

    /* ── Layout desktop ──────────────────────────────────────── */

    [part~='list--desktop'] {
        display: flex;
        flex-flow: row wrap;
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

    /* ── Layout mobile ───────────────────────────────────────── */

    [part~='list--mobile'] {
        display: flex;
        flex-direction: column;
        position: relative;
    }

    [part~='list--mobile']:before {
        content: '';
        display: block;
        position: absolute;
        width: 1.875rem;
        top: 1.5rem;
        bottom: 1.5rem;
        left: 0;
        background-image: linear-gradient(
            var(--ar-breadcrumb-mobile-separator-color) 25%,
            transparent 0
        );
        background-size: 2px 8px;
        background-position: center 4px;
        background-repeat: repeat-y;
    }

    [part~='bullet'] {
        flex-shrink: 0;
        width: 0.375rem;
        height: 0.375rem;
        margin: 0 0.75rem;
    }

    [part~='bullet--current'] {
        width: 0.625rem;
        height: 0.625rem;
        margin: 0 0.625rem;
    }

    [part~='list--mobile'] [part='link'],
    [part~='list--mobile'] [part='current'] {
        flex-grow: 1;
        padding: 0.5rem 0.25rem;
    }

    /* ── Wrapper dropdown mobile ────────────────────────────── */

    .dropdown {
        display: inline-flex;
        position: relative;
    }

    /* ── Panel flottant mobile ───────────────────────────────── */

    [part='panel'] {
        background-color: var(--ar-breadcrumb-panel-bg, Canvas);
        border-color: var(--ar-breadcrumb-panel-border-color, ButtonBorder);
    }

    /* ── Boutons home/trigger mobile (découplés de button.styles.ts) ────── */

    [part='home'],
    [part='trigger'] {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: none;
        cursor: pointer;
        background-color: var(--ar-breadcrumb-toggle-bg);
        transition: background-color var(--ar-breadcrumb-toggle-transition-duration);
        /* a11y-fallback: WCAG 2.5.8 (Target Size Minimum) — sans thème chargé, le bouton perdrait sa taille de cible tactile */
        min-height: var(--ar-breadcrumb-toggle-min-size, 2.5rem);
    }

    [part='home']:hover,
    [part='trigger']:hover {
        background-color: var(--ar-breadcrumb-toggle-bg-hover);
    }

    [part='home']:active,
    [part='trigger']:active {
        background-color: var(--ar-breadcrumb-toggle-bg-pressed);
    }

    [part='home']:focus,
    [part='trigger']:focus {
        background-color: var(--ar-breadcrumb-toggle-bg-focus);
    }

    [part='home']:focus-visible,
    [part='trigger']:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: 2px;
    }

    @media (prefers-reduced-motion: reduce) {
        [part='home'],
        [part='trigger'] {
            transition: none;
        }
    }

    [part='trigger'] {
        padding: 0;
        aspect-ratio: 1 / 1;
        /* a11y-fallback: WCAG 2.5.8 (Target Size Minimum) — sans thème chargé, le bouton perdrait sa taille de cible tactile */
        min-width: var(--ar-breadcrumb-toggle-min-size, 2.5rem);
    }

    [part='home'] .icon,
    [part='trigger'] .icon {
        flex-shrink: 0;
    }

    [part='home'] .icon:first-child {
        margin-right: 0.375rem;
    }
`;
```

Ce qui disparaît par rapport à l'original : `.breadcrumb-container`, `.breadcrumb`, `.breadcrumb-link`/`:hover`, `.breadcrumb-text`/`.breadcrumb-link`/`:visited` (règle icône morte incluse), `.breadcrumb-item`/`.active`, `.breadcrumb-desktop`/`.breadcrumb-mobile` (remplacées par les sélecteurs `[part~=...]`), toute la règle `#mobile-home-btn`/`[part='trigger'].btn.btn-tertiary` (remplacée par les règles `[part='home']`/`[part='trigger']` ci-dessus), et les 5 propriétés du panel migrées vers le thème (Task 4).

- [ ] **Step 2: Vérifier qu'aucun garde-fou de build ne casse (hors default.css, traité Task 4)**

Run: `cd /Users/jon/Code/Active_projects/ariane && npx tsc --noEmit -p packages/core/tsconfig.json`
Expected: aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/components/breadcrumb/breadcrumb.styles.ts
git commit -m "refactor(breadcrumb): réécrit les styles — nettoyage, découplage de button.styles.ts"
```

---

### Task 4: Mettre à jour `default.css` (tokens + nouvelle règle `ar-breadcrumb`)

**Files:**

- Modify: `packages/core/src/styles/themes/default.css`

**Interfaces:**

- Consumes: les `part` de Task 2, les tokens internes de Task 3.
- Produces: 11 tokens `--ar-breadcrumb-*` dans `:root` (couverts par le JSDoc `@cssprop` de Task 2), une nouvelle règle `ar-breadcrumb { ... }` avec les `::part()` littéraux.

- [ ] **Step 1: Remplacer le bloc `:root` "Breadcrumb" (lignes ~359-380)**

Remplacer :

```css
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         * Breadcrumb
         * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
--ar-breadcrumb-distance: var(--ar-anchor-distance);
--ar-breadcrumb-offset: var(--ar-anchor-offset);
--ar-breadcrumb-color: var(--ar-color-text);
--ar-breadcrumb-separator-color: var(--ar-color-neutral-80);
--ar-breadcrumb-bullet-color: var(--ar-color-neutral-80);
--ar-breadcrumb-mobile-separator-color: var(--ar-color-neutral-90);
--ar-breadcrumb-bullet-ring-color: var(--ar-color-bg);
--ar-breadcrumb-active-bullet-color: var(--ar-color-interactive);
--ar-breadcrumb-panel-min-width: var(--ar-panel-min-width);
--ar-breadcrumb-panel-max-width: var(--ar-panel-max-width);
--ar-breadcrumb-panel-bg: var(--ar-panel-bg);
--ar-breadcrumb-panel-border-color: var(--ar-panel-border-color);
--ar-breadcrumb-panel-border-radius: var(--ar-panel-radius);
--ar-breadcrumb-panel-shadow: var(--ar-panel-shadow);
--ar-breadcrumb-panel-padding: var(--ar-panel-padding);
--ar-breadcrumb-toggle-bg: var(--ar-button-tertiary-bg);
--ar-breadcrumb-toggle-bg-hover: var(--ar-button-tertiary-bg-hover);
--ar-breadcrumb-toggle-bg-pressed: var(--ar-button-tertiary-bg-active);
--ar-breadcrumb-toggle-bg-focus: var(--ar-button-tertiary-bg-focus);
```

Par :

```css
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         * Breadcrumb
         * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
--ar-breadcrumb-distance: var(--ar-anchor-distance);
--ar-breadcrumb-offset: var(--ar-anchor-offset);
--ar-breadcrumb-mobile-separator-color: var(--ar-color-neutral-90);
--ar-breadcrumb-panel-bg: var(--ar-panel-bg);
--ar-breadcrumb-panel-border-color: var(--ar-panel-border-color);
--ar-breadcrumb-toggle-bg: rgba(26, 26, 26, 0.05);
--ar-breadcrumb-toggle-bg-hover: rgba(18, 20, 55, 0.7);
--ar-breadcrumb-toggle-bg-pressed: rgba(18, 20, 55, 0.8);
--ar-breadcrumb-toggle-bg-focus: rgba(26, 26, 26, 0.05);
--ar-breadcrumb-toggle-min-size: 2.5rem;
--ar-breadcrumb-toggle-transition-duration: 0.15s;
```

Les 4 valeurs `toggle-bg*` sont recopiées littéralement depuis les anciennes valeurs de
`--ar-button-tertiary-bg*` (rendu visuel identique), mais ne sont plus des alias — elles peuvent
être ajustées indépendamment de `button.styles.ts` désormais.

- [ ] **Step 2: Ajouter la nouvelle règle `ar-breadcrumb { ... }` après le bloc `ar-dialog { ... }`**

Repérer la fin du bloc `ar-dialog { ... }` (juste avant le `}` final qui ferme `@layer ariane.theme`) et insérer, entre les deux :

```css
ar-breadcrumb {
    &::part(list) {
        color: var(--ar-color-text);
    }

    &::part(current) {
        font-weight: 700;
    }

    &::part(separator) {
        background-color: var(--ar-color-neutral-80);
    }

    &::part(bullet) {
        border-radius: 50%;
        background-color: var(--ar-color-neutral-80);
        box-shadow: 0 0 0 2px var(--ar-color-bg);
    }

    &::part(bullet--current) {
        background-color: var(--ar-color-interactive);
    }

    &::part(home),
    &::part(trigger) {
        border-radius: 0.75rem;
        font-size: var(--ar-font-size-md);
        line-height: 1;
        font-weight: 500;
    }

    &::part(home) {
        padding: 0 1rem;
        text-decoration: none;
    }

    &::part(panel) {
        min-width: var(--ar-panel-min-width);
        max-width: var(--ar-panel-max-width);
        border-radius: var(--ar-panel-radius);
        box-shadow: var(--ar-panel-shadow);
        padding: var(--ar-panel-padding);
    }
}
```

`::part(bullet)` est déclarée avant `::part(bullet--current)` dans le même bloc — ordre requis
par `validate-part-state-order.js`.

- [ ] **Step 3: Générer le manifest et vérifier les garde-fous CI**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run build:manifest --workspace=packages/core`
Expected: succès, sans erreur `[CEM]` (couverture `@cssprop`, tokens codés en dur, fallback non justifié, ordre part d'état). Si une erreur de couverture `@cssprop` apparaît, vérifier que le JSDoc de `breadcrumb.ts` (Task 2) liste exactement les 11 tokens restants — pas plus, pas moins.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/styles/themes/default.css
git commit -m "refactor(breadcrumb): migre 10 tokens vers des règles ::part() littérales, ajoute 2 tokens a11y"
```

---

### Task 5: Mettre à jour les tests unitaires (`breadcrumb.test.ts`)

**Files:**

- Modify: `packages/core/src/components/breadcrumb/breadcrumb.test.ts`

- [ ] **Step 1: Remplacer les sélecteurs `.breadcrumb-desktop`/ID par les nouveaux `part`**

Dans le describe `layout desktop`, remplacer :

```ts
it('affiche une liste desktop (ol.breadcrumb-desktop)', async () => {
    el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
    expect(getShadow(el).querySelector('ol.breadcrumb-desktop')).not.toBeNull();
});
```

par :

```ts
it("affiche une liste desktop (part='list list--desktop')", async () => {
    el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
    const list = getShadow(el).querySelector('[part~="list--desktop"]');
    expect(list).not.toBeNull();
    expect(list?.tagName.toLowerCase()).toBe('ol');
});

it("n'affiche pas de séparateur avant le premier item", async () => {
    el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Catégorie" href="/cat"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
    const items = getShadow(el).querySelectorAll('[part="item"]');
    expect(items[0]?.querySelector('[part="separator"]')).toBeNull();
});

it('affiche un séparateur avant chaque item sauf le premier', async () => {
    el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Catégorie" href="/cat"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
    const items = getShadow(el).querySelectorAll('[part="item"]');
    expect(items[1]?.querySelector('[part="separator"]')).not.toBeNull();
    expect(items[2]?.querySelector('[part="separator"]')).not.toBeNull();
});
```

- [ ] **Step 2: Mettre à jour le describe `layout mobile`**

Remplacer :

```ts
it('ne rend pas de ol.breadcrumb-desktop en mode mobile', async () => {
    el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
    expect(getShadow(el).querySelector('ol.breadcrumb-desktop')).toBeNull();
});

it('affiche le bouton dropdown avec id="breadcrumb-dropdown"', async () => {
    el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
    expect(getShadow(el).querySelector('#breadcrumb-dropdown')).not.toBeNull();
});

it('affiche le lien "retour" pointant vers le premier item', async () => {
    el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/accueil"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
    const homeBtn = getShadow(el).querySelector('#mobile-home-btn');
    expect(homeBtn?.getAttribute('href')).toBe('/accueil');
});
```

par :

```ts
it("ne rend pas de part='list--desktop' en mode mobile", async () => {
    el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
    expect(getShadow(el).querySelector('[part~="list--desktop"]')).toBeNull();
});

it("affiche la liste mobile (part='list list--mobile')", async () => {
    el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
    expect(getShadow(el).querySelector('[part~="list--mobile"]')).not.toBeNull();
});

it("affiche le bouton dropdown avec part='trigger'", async () => {
    el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
    expect(getPart(el, 'trigger')).not.toBeNull();
});

it('affiche le lien "retour" (part="home") pointant vers le premier item', async () => {
    el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/accueil"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
    const homeBtn = getPart(el, 'home');
    expect(homeBtn?.getAttribute('href')).toBe('/accueil');
});

it("chaque item mobile a un part='bullet'", async () => {
    el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Catégorie" href="/cat"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
    // listTemplates.slice(1) : "Accueil" n'est pas dans la liste mobile, il reste 2 puces
    const bullets = getShadow(el).querySelectorAll('[part~="bullet"]');
    expect(bullets.length).toBe(2);
});

it("seul l'item courant a le part d'état 'bullet--current'", async () => {
    el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Catégorie" href="/cat"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
    const bullets = getShadow(el).querySelectorAll('[part~="bullet"]');
    expect(bullets[0]?.getAttribute('part')).toBe('bullet');
    expect(bullets[1]?.getAttribute('part')).toBe('bullet bullet--current');
});
```

Note : ces nouveaux tests s'ajoutent au `beforeEach` existant du describe `layout mobile` (`ArBreadcrumb.mobileQuery = mockMediaQuery(true)`), à placer dans ce même bloc.

- [ ] **Step 3: Remplacer les 10 occurrences de `#breadcrumb-dropdown` dans le describe `dropdown mobile`**

Chercher-remplacer littéral dans tout le fichier (describe `dropdown mobile`, lignes ~218-481) :

```ts
getShadow(el).querySelector('#breadcrumb-dropdown') as HTMLButtonElement;
```

par :

```ts
getShadow(el).querySelector('[part="trigger"]') as HTMLButtonElement;
```

- [ ] **Step 4: Lancer les tests unitaires**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run test --workspace=packages/core -- breadcrumb.test.ts`
Expected: tous les tests passent (les nouveaux + les existants adaptés). Si un test échoue sur `getPart(el, 'trigger')`/`getPart(el, 'home')` retournant `null`, vérifier que Task 2 a bien été committée avant de lancer ce test.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/components/breadcrumb/breadcrumb.test.ts
git commit -m "test(breadcrumb): adapte les tests unitaires aux nouveaux part, ajoute la couverture bullet/separator/home"
```

---

### Task 6: Mettre à jour les tests navigateur (`breadcrumb.browser.test.ts`)

**Files:**

- Modify: `packages/core/src/components/breadcrumb/breadcrumb.browser.test.ts`

- [ ] **Step 1: Remplacer le helper `getBtn`**

Remplacer :

```ts
function getBtn(el: ArBreadcrumb): HTMLButtonElement {
    const btn = el.shadowRoot?.querySelector<HTMLButtonElement>('#breadcrumb-dropdown');
    if (!btn) throw new Error('#breadcrumb-dropdown introuvable');
    return btn;
}
```

par :

```ts
function getBtn(el: ArBreadcrumb): HTMLButtonElement {
    const btn = el.shadowRoot?.querySelector<HTMLButtonElement>('[part="trigger"]');
    if (!btn) throw new Error('[part="trigger"] introuvable');
    return btn;
}
```

Le reste du fichier utilise déjà exclusivement `getBtn(el)` — aucun autre changement nécessaire dans les describes `ouverture / fermeture`, `structure`, `light-dismiss`.

- [ ] **Step 2: Ajouter la vérification du fallback WCAG 2.5.8 sur home/trigger**

Dans le describe `fallback CSS sans thème chargé`, après le test existant sur le panel, ajouter :

```ts
it('le bouton home a une taille de cible tactile même sans default.css', async () => {
    el = await mobileBreadcrumb();
    const home = el.shadowRoot?.querySelector<HTMLElement>('[part="home"]');
    if (!home) throw new Error('[part="home"] introuvable');
    const computed = getComputedStyle(home);
    expect(parseFloat(computed.minHeight)).to.be.greaterThan(0);
});

it('le bouton trigger a une taille de cible tactile même sans default.css', async () => {
    el = await mobileBreadcrumb();
    const trigger = getBtn(el);
    const computed = getComputedStyle(trigger);
    expect(parseFloat(computed.minHeight)).to.be.greaterThan(0);
    expect(parseFloat(computed.minWidth)).to.be.greaterThan(0);
});
```

- [ ] **Step 3: Lancer les tests navigateur**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run test:browser --workspace=packages/core -- --group breadcrumb`

Si la commande `--group` n'existe pas dans ce projet, lancer la suite complète : `npm run test:browser --workspace=packages/core`.

Expected: tous les tests `ar-breadcrumb — browser` passent, y compris les 2 nouveaux.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/components/breadcrumb/breadcrumb.browser.test.ts
git commit -m "test(breadcrumb): adapte les tests navigateur au part 'trigger', ajoute le fallback WCAG home/trigger"
```

---

### Task 7: Vérification complète (build, tests, a11y, visuel)

**Files:** aucun fichier modifié (sauf correctifs si un problème est trouvé).

- [ ] **Step 1: Build complet du package core**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run build --workspace=packages/core`
Expected: succès (inclut `build:manifest`, `build:css`, `build:types`, `build:dev`).

- [ ] **Step 2: Suite de tests complète (Vitest)**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run test`
Expected: 100% des tests passent, y compris `breadcrumb-item.test.ts` (non modifié mais dépend du contexte partagé) et tout autre composant potentiellement affecté par un changement partagé (aucun changement partagé ici — `button.styles.ts`/`panel.styles.ts` ne sont pas modifiés, seulement retirés de la liste d'imports de `breadcrumb.ts`).

- [ ] **Step 3: Suite de tests navigateur complète (WTR + Playwright + axe-core)**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run test:browser --workspace=packages/core`
Expected: 100% des tests passent, y compris `breadcrumb.a11y.test.ts` (axe-core — les nouveaux `<span aria-hidden="true">` décoratifs ne doivent introduire aucune violation).

- [ ] **Step 4: Rebuild explicite du JS de dev avant vérification visuelle**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run build:dev --workspace=packages/core`

`npm run dev --workspace=apps/docs` seul ne reconstruit pas le JS de `packages/core/dist` — rebuild explicite requis (cf. mémoire de session, piège déjà rencontré sur les lots précédents).

- [ ] **Step 5: Vérification visuelle Playwright — desktop et mobile**

```bash
cd /Users/jon/Code/Active_projects/ariane/apps/docs
(npm run dev > /tmp/docs-dev.log 2>&1 &) ; sleep 5
node -e "
import('@playwright/test').then(async ({ chromium }) => {
    const browser = await chromium.launch();

    // Desktop : séparateur visible entre items, pas avant le premier
    const desktopPage = await browser.newPage({ viewport: { width: 1200, height: 800 } });
    await desktopPage.goto('http://localhost:4322/components/breadcrumb/', { waitUntil: 'networkidle' });
    await desktopPage.locator('ar-breadcrumb').first().scrollIntoViewIfNeeded();
    await desktopPage.screenshot({ path: '/tmp/breadcrumb-desktop.png', fullPage: false });

    // Mobile : puce agrandie sur le dernier item uniquement, boutons home/trigger stylés
    const mobilePage = await browser.newPage({ viewport: { width: 375, height: 900 } });
    await mobilePage.goto('http://localhost:4322/components/breadcrumb/', { waitUntil: 'networkidle' });
    const demo = mobilePage.locator('ar-breadcrumb').first();
    await demo.scrollIntoViewIfNeeded();
    await demo.locator('[part=\"trigger\"]').click();
    await mobilePage.waitForTimeout(300);
    await mobilePage.screenshot({ path: '/tmp/breadcrumb-mobile-panel.png', fullPage: false });

    await browser.close();
});
"
```

Vérifier dans les 2 captures :

- Desktop : le libellé courant (dernier item) apparaît en gras (fix du bug `font-weight`).
- Mobile : dans le panel ouvert, seule la puce du dernier item (courant) est agrandie/colorée — plus de grosse puce sur le premier item visible (bug d'origine corrigé).
- Boutons "Retour" et trigger : fond/hover/radius identiques au rendu d'avant la migration (couleurs recopiées à l'identique dans Task 4).

Si le port diffère de 4322 (déjà occupé), ajuster l'URL en fonction du port réellement annoncé par `npm run dev`.

- [ ] **Step 6: Nettoyage**

```bash
pkill -f "astro dev" 2>/dev/null || true
```

---

### Task 8: Mettre à jour la documentation (`ar-breadcrumb.mdx`)

**Files:**

- Modify: `apps/docs/src/content/components/ar-breadcrumb.mdx`

- [ ] **Step 1: Remplacer l'exemple "Sur un fond sombre ponctuel"**

Remplacer :

````mdx
### Sur un fond sombre ponctuel

`--ar-breadcrumb-color` hérite du token sémantique `--ar-color-text`, qui s'inverse déjà
automatiquement avec `[data-theme="dark"]`. Si le breadcrumb est posé sur un fond sombre
**indépendamment du thème global** (bannière, section à fond coloré...), surchargez le token
localement pour garantir la lisibilité :

```css
.hero ar-breadcrumb {
    --ar-breadcrumb-color: white;
}
```
````

````

par :

```mdx
### Sur un fond sombre ponctuel

La couleur du texte du fil d'ariane suit `--ar-color-text` par défaut (le thème s'inverse déjà
automatiquement avec `[data-theme="dark"]`). Si le breadcrumb est posé sur un fond sombre
**indépendamment du thème global** (bannière, section à fond coloré...), surchargez
`::part(list)` localement pour garantir la lisibilité :

```css
.hero ar-breadcrumb::part(list) {
    color: white;
}
````

````

- [ ] **Step 2: Vérifier que le build de doc régénère la page sans erreur**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run build --workspace=apps/docs`
Expected: succès, aucune erreur de build MDX/Astro.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/src/content/components/ar-breadcrumb.mdx
git commit -m "docs(breadcrumb): met à jour l'exemple fond sombre — ::part(list) remplace --ar-breadcrumb-color"
````

---

### Task 9: Documenter le lot dans ADR-005

**Files:**

- Modify: `docs/decisions/ADR-005-tokens-pilotes-par-attribut.md`

- [ ] **Step 1: Ajouter une section en fin de fichier**

Ajouter, après la dernière section existante (« Amendement (2026-07-29) : externalisation de la taxonomie `size` (lot 3b, #129) ») :

```markdown
## Application — `ar-breadcrumb` (lot 4, 2026-07-30)

Premier des 4 composants du lot 4 (`breadcrumb`, `dropdown`, `pagination`, `tooltip`). Précédé
d'un audit du CSS hérité (import d'un autre projet) : icône morte jamais rendue, plusieurs
redondances (`margin`/`padding` dupliqués entre `.breadcrumb`/`.breadcrumb-mobile`), et un vrai
bug de cascade trouvé — `font-weight: 700` sur l'élément courant n'avait jamais été appliqué
(l'enfant `.breadcrumb-text` déclarait sa propre valeur littérale `font-weight: 400`, qui bloque
l'héritage indépendamment de la spécificité comparée entre les deux règles). Corrigé en migrant
directement sur `::part(current)`, plutôt que documenté comme CSS mort — premier changement de
rendu visuel réel de ce lot.

**Nouveau principe appliqué à ce lot** : un blocage structurel (pas de `part` disponible, ou
propriété portée par un pseudo-élément) n'est pas une fin de non-recevoir définitive — ajouter le
`part` manquant, ou remplacer un pseudo-élément purement décoratif par un vrai élément
`aria-hidden`, est envisageable au cas par cas. Nuance retenue : la conversion pseudo-élément →
élément réel n'est justifiée que si le gain dépasse la seule réduction du nombre de tokens
(typiquement, un thème pourrait vouloir aller au-delà de la couleur — forme, bordure, contenu).
Appliqué à la puce mobile et au séparateur desktop (gain réel : forme personnalisable) ; **pas**
au connecteur pointillé mobile (seule sa couleur est un point de personnalisation plausible, un
token suffit — converti aurait exigé de le sortir de l'`<ol>`, la plus grosse surface de
régression visuelle du lot pour un bénéfice quasi nul).

`part="list"` commun aux deux `<ol>` (desktop/mobile, jamais coexistants dans le DOM) + variantes
`list--desktop`/`list--mobile` (même convention BEM `--` que les parts d'état) débloque
`--ar-breadcrumb-color`, auparavant bloqué car seul le desktop exposait un `part` dédié.

Boutons mobile (`home`/`trigger`) entièrement découplés de `button.styles.ts` : les 4 tokens
`--ar-breadcrumb-toggle-bg*` étaient de purs alias 1:1 vers `--ar-button-tertiary-*`, réappliqués
par une règle interne dédiée — redondance garantie par construction. Plutôt que de les supprimer
pour laisser `.btn-tertiary` gouverner seul, `ar-breadcrumb` s'affranchit de `button.styles.ts`
(jugé peu compatible avec l'esprit headless à terme, réflexion séparée) : mêmes 4 tokens
conservés mais redéfinis en valeurs littérales indépendantes, structure et focus (`outline:
2px solid currentColor`, sans token) réimplémentés en propre sur le modèle du bouton close
d'`ar-alert`/`ar-dialog`. `border-radius` et toute la typographie migrés en littéral dans le
thème (branche 4, aucune référence à un token `--ar-button-*`, indépendance totale demandée par
le mainteneur). Nouveau fallback WCAG 2.5.8 ajouté (`--ar-breadcrumb-toggle-min-size`, absent de
`button.styles.ts` lui-même) — trou d'accessibilité préexistant, corrigé localement à l'occasion
du découplage plutôt que reproduit. Nouveau token `--ar-breadcrumb-toggle-transition-duration`
gardé interne (contrainte 6 : garde `prefers-reduced-motion` défaite par une règle externe).

**Résultat** : 19 tokens `default.css` initiaux → 11 restants (distance/offset lus en JS, panel
bg/border-color pour le fallback a11y, 4 tokens toggle-bg redéfinis, mobile-separator-color
bloqué par la contrainte 3 — pseudo-élément non converti —, 2 nouveaux tokens a11y/motion) ; 10
supprimés (5 panel cosmétiques + color + bullet-color + bullet-ring-color + active-bullet-color +
separator-color), remplacés par des règles `::part()` littérales dans le thème.
```

- [ ] **Step 2: Commit**

```bash
git add docs/decisions/ADR-005-tokens-pilotes-par-attribut.md
git commit -m "docs(adr-005): documente le lot 4 (ar-breadcrumb) — bug de cascade, part--variant, découplage button.styles.ts"
```

---

### Task 10: Pousser la branche et ouvrir la Pull Request

**Files:** aucun fichier modifié.

- [ ] **Step 1: Vérifier l'état final de la branche**

Run: `cd /Users/jon/Code/Active_projects/ariane && git log --oneline dev..HEAD && git status`
Expected: 9 commits (Task 2 à 9 ci-dessus, Task 1 et 7 ne committent rien), working tree clean.

- [ ] **Step 2: Demander confirmation avant de pousser**

Ne pas pousser ni ouvrir de PR sans confirmation explicite de l'utilisateur (cf. `feedback_merge_after_autonomous_fix` — règle permanente du projet).

- [ ] **Step 3: Pousser et ouvrir la PR (après confirmation)**

```bash
git push -u origin fix/breadcrumb-token-vs-part-129
gh pr create --base dev --title "refactor(breadcrumb): migre token vs ::part(), corrige un bug de cascade (lot 4, #129)" --body "$(cat <<'EOF'
## Résumé

- Audit du CSS hérité (import d'un autre projet) : CSS mort/redondant retiré, classes internes `.breadcrumb-*` remplacées par des sélecteurs `[part=...]`.
- Bug de cascade trouvé et corrigé : `font-weight: 700` de l'élément courant n'avait jamais été appliqué (bloqué par une déclaration littérale sur l'enfant) — migré sur `::part(current)`.
- Puce mobile et séparateur desktop convertis en vrais éléments `part` (`bullet`/`bullet--current`, `separator`), débloquant 4 tokens couleur. Le connecteur pointillé mobile reste un token (pas de gain identifié à le convertir).
- `part="list"` commun aux deux `<ol>` + variantes `list--desktop`/`list--mobile` débloque `--ar-breadcrumb-color`.
- Boutons mobile (`home`/`trigger`) entièrement découplés de `button.styles.ts`, avec un nouveau fallback WCAG 2.5.8 (absent du bouton partagé lui-même).
- 19 tokens `default.css` → 11 restants.

Spec : `docs/superpowers/specs/2026-07-30-breadcrumb-token-vs-part-129-design.md`
Plan : `docs/superpowers/plans/2026-07-30-breadcrumb-token-vs-part-129.md`
ADR : `docs/decisions/ADR-005-tokens-pilotes-par-attribut.md` (section « Application — ar-breadcrumb »)

## Test plan

- [x] `npm run test` — Vitest, 100%
- [x] `npm run test:browser --workspace=packages/core` — WTR + Playwright + axe-core, 100%
- [x] `npm run build --workspace=packages/core` — build:manifest passe tous les garde-fous CI (couverture @cssprop, tokens codés en dur, fallback justifié, ordre part d'état)
- [x] Vérification visuelle Playwright manuelle (desktop + mobile, panel ouvert)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: Retourner l'URL de la PR à l'utilisateur**

---

## Self-Review Notes

- **Couverture de la spec** : sections 1 (Task 2/3), 2 (Task 2/3/4), 3.1/3.2 (Task 2/3/4), 3.3 (inchangé, vérifié Task 3), 4 (Task 3/4), 5 (Task 4). Le fix `font-weight` (découvert après la spec) est couvert par Task 2 (template)/Task 4 (`::part(current)`)/Task 9 (ADR).
- **Aucun placeholder** : chaque step contient soit du code complet, soit une commande exacte avec résultat attendu explicite.
- **Cohérence des noms** : `part="home"`/`part="trigger"`/`part="bullet"`/`part="bullet--current"`/`part="separator"`/`part="list"`/`part="list--desktop"`/`part="list--mobile"` utilisés identiquement dans Task 2 (template), Task 3 (styles internes), Task 4 (default.css), Task 5/6 (tests) — vérifié par relecture croisée.
- **11 tokens finaux** vérifiés cohérents entre Task 2 (JSDoc @cssprop, 11 entrées), Task 4 (:root, 11 déclarations) — comptage recoupé deux fois.
