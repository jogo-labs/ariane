import { LitElement, html, type TemplateResult, type CSSResultGroup } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ContextProvider } from '@lit/context';

import resetStyles from '../../styles/components/reset.styles.js';
import utilitiesStyles from '../../styles/utilities.styles.js';
import buttonStyles from '../../styles/components/button.styles.js';
import dropdownStyles from '../../styles/components/dropdown.styles.js';
import styles from './stepper.styles.js';

import { stepperContext, type StepperRegistry } from '../../context/stepper.context.js';
import { NavigationTreeController } from '../../controllers/navigation-tree.controller.js';
import { ScrollFollowController } from '../../controllers/scroll-follow.controller.js';
import { DropdownController } from '../../controllers/dropdown.controller.js';
import { renderDesktop, renderMobile } from './stepper.renderer.js';
import { type MrStepperItem } from '../stepper-item/stepper-item.js';

/** Détail de l'événement émis lors d'un changement d'étape */
export interface MrStepperStepChangeDetail {
    /** Chemin (`href`) de l'étape sélectionnée */
    path: string;
}

/**
 * @summary Stepper de navigation accessible, adaptatif desktop/mobile.
 * @display demo
 *
 * Les étapes sont déclarées via des éléments `<mr-stepper-item>` enfants.
 * Le composant les collecte automatiquement via `@lit/context` et construit
 * l'arbre de navigation. Un item peut avoir des sous-étapes (enfants imbriqués).
 *
 * En mode `mobile`, les étapes sont affichées dans un dropdown.
 * En mode `desktop`, elles sont affichées dans une liste verticale.
 *
 * @slot - Un ou plusieurs composant <mr-stepper-items>, potentiellement imbriqués pour créer des sous-étapes.
 *
 * @csspart nav          - L'élément `<nav>` englobant.
 * @csspart list         - La liste des étapes (desktop).
 * @csspart step         - Une étape de premier niveau.
 * @csspart substep      - Une sous-étape.
 * @csspart step-link    - Le lien d'une étape.
 * @csspart dropdown     - Le conteneur dropdown (mobile uniquement).
 * @csspart dropdown-btn - Le bouton d'ouverture du dropdown mobile.
 *
 * @cssprop --mr-stepper-gap              - Espacement entre les étapes.
 * @cssprop --mr-stepper-active-color     - Couleur de l'étape active.
 * @cssprop --mr-stepper-done-color       - Couleur des étapes complétées.
 * @cssprop --mr-stepper-inactive-color   - Couleur des étapes inactives.
 * @cssprop --mr-stepper-connector-color  - Couleur du connecteur entre étapes.
 *
 * @event {CustomEvent<{ path: string }>} mr-stepper-step-changed - Émis au clic sur une étape.
 */
@customElement('mr-stepper')
export class MrStepper extends LitElement {
    static override styles: CSSResultGroup = [
        resetStyles,
        utilitiesStyles,
        buttonStyles,
        dropdownStyles,
        styles,
    ];

    /**
     * Chemin de l'étape courante. Doit correspondre au `href` d'un `<mr-stepper-item>`.
     * Mettre à jour cette propriété pour naviguer programmatiquement entre les étapes.
     * @attr current-path
     */
    @property({ type: String, attribute: 'current-path' })
    currentPath = '';

    /**
     * Mode de navigation : `create` (formulaire de création) ou `edit` (modification).
     * Détermine quelles étapes sont accessibles au clic.
     * @attr mode
     */
    @property({ type: String, attribute: 'mode', useDefault: true })
    mode: 'create' | 'edit' = 'create';

    /**
     * Version d'affichage. Passer `mobile` pour activer le rendu dropdown.
     * En pratique, gérer ce changement via un `ResizeObserver` ou une media query externe.
     * @attr version
     */
    @property({ type: String })
    version: 'desktop' | 'mobile' = 'desktop';

    /**
     * Active le mode "scroll follow" : la propriété `current-path` se met à jour
     * automatiquement quand l'utilisateur scrolle vers une section de la page.
     * @attr follow-scroll
     */
    @property({ type: Boolean, attribute: 'follow-scroll' })
    followScroll = false;

    private _currentStepIndex = 0;

    // ── Controllers ──────────────────────────────────────────────────────────

    private readonly navigation = new NavigationTreeController(this);
    private readonly scrollFollow = new ScrollFollowController(this, () => this.getScrollTargets());
    private readonly dropdown = new DropdownController(this);
    private readonly _onDropdownToggle = () => this.dropdown.toggle();

    // ── Registry / Context ───────────────────────────────────────────────────

    private items = new Set<MrStepperItem>();

    private readonly _registry: StepperRegistry = {
        registerItem: (item) => {
            this.items.add(item);
            this.rebuildTree();
        },
        unregisterItem: (item) => {
            this.items.delete(item);
            this.rebuildTree();
        },
        notifyItemChanged: (_item, attribute) => {
            // label/href → simple re-render suffit, pas besoin de reconstruire l'arbre
            if (attribute === 'label' || attribute === 'href') {
                this.requestUpdate();
            } else {
                this.rebuildTree();
            }
        },
    };

    protected readonly _provider = new ContextProvider(this, {
        context: stepperContext,
        initialValue: this._registry,
    });

    // ── Lifecycle ────────────────────────────────────────────────────────────

    override connectedCallback() {
        super.connectedCallback();

        this.addEventListener('scroll-follow-change', this.handleScrollChange as EventListener);

        // Fallback pour les items déjà présents dans le DOM avant que le provider soit prêt
        customElements.whenDefined('mr-stepper-item').then(() => {
            if (!this.isConnected) return;
            this.collectExistingItems();
        });
    }

    override disconnectedCallback() {
        this.removeEventListener('scroll-follow-change', this.handleScrollChange as EventListener);
        super.disconnectedCallback();
    }

    // ── Reactivity ───────────────────────────────────────────────────────────

    // willUpdate() s'exécute AVANT le rendu : les requestUpdate() déclenchés ici
    // (via setCurrentPath, setEnabled) sont mergés dans le cycle courant → 0 update parasite.
    protected override willUpdate(changed: Map<PropertyKey, unknown>) {
        if (changed.has('currentPath') || this.navigation.tree.length) {
            this._currentStepIndex = this.computeCurrentStepIndex();
        }
        if (changed.has('currentPath')) {
            this.navigation.setCurrentPath(this.currentPath);
        }
        if (changed.has('followScroll')) {
            this.scrollFollow.setEnabled(this.followScroll);
        }
    }

    // ── Render ───────────────────────────────────────────────────────────────

    protected override render(): TemplateResult {
        const steps = this.navigation.tree;

        // Tant que les items ne se sont pas enregistrés, on rend le slot transparent
        if (!steps.length) {
            return html`<slot></slot>`;
        }

        const content =
            this.version === 'mobile'
                ? renderMobile(
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
                  )
                : renderDesktop(steps, this.mode, this.onClickLink);

        return html` <nav
            part="nav"
            class="stepper-nav"
            role="navigation"
            aria-labelledby="label-nav"
        >
            <p id="label-nav" class="sr-only">Étapes du formulaire</p>
            ${content}
            <slot></slot>
        </nav>`;
    }

    // ── Tree build ───────────────────────────────────────────────────────────

    private _rebuildPending = false;

    /**
     * Déclenche une reconstruction de l'arbre au prochain microtask.
     * Le debounce via `_rebuildPending` évite N rebuilds pour N items qui s'enregistrent
     * en même temps au premier rendu.
     */
    private rebuildTree(): void {
        if (this._rebuildPending) return;
        this._rebuildPending = true;

        queueMicrotask(() => {
            this._rebuildPending = false;
            this.navigation.buildFromItems(Array.from(this.items));
            this.scrollFollow.refresh();
        });
    }

    /** Collecte les items déjà présents dans le light DOM (cas du premier render) */
    private collectExistingItems(): void {
        this.querySelectorAll<MrStepperItem>('mr-stepper-item').forEach((item) =>
            item.setRegistry(this._registry),
        );
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private computeCurrentStepIndex(): number {
        const current = this.navigation.currentNode;
        if (!current) return 0;
        return this.navigation.tree.findIndex(
            (step) =>
                step.path === current.path ||
                step.children.some((child) => child.path === current.path),
        );
    }

    private getCurrentStepLabel(): string | undefined {
        return this.navigation.tree[this._currentStepIndex]?.label;
    }

    private getCurrentSubStepLabel(): string | undefined {
        const current = this.navigation.currentNode;
        if (!current?.parent) return undefined;
        return current.label;
    }

    private getScrollTargets(): string[] {
        return this.navigation.tree.flatMap((step) => step.children.map((sub) => sub.path));
    }

    // ── Events ───────────────────────────────────────────────────────────────

    private onClickLink = (event: MouseEvent): void => {
        const path = (event.target as HTMLElement).closest('a')?.dataset['path'];
        if (!path) return;

        const detail: MrStepperStepChangeDetail = { path };

        // Double dispatch : nom court pour usage interne, nom préfixé pour usage externe
        this.dispatchEvent(
            new CustomEvent('step-changed', { bubbles: true, composed: true, detail }),
        );
        this.dispatchEvent(
            new CustomEvent('mr-stepper-step-changed', { bubbles: true, composed: true, detail }),
        );
    };

    private handleScrollChange = (event: CustomEvent<string>): void => {
        this.currentPath = event.detail;
    };
}

declare global {
    interface HTMLElementTagNameMap {
        'mr-stepper': MrStepper;
    }
}
