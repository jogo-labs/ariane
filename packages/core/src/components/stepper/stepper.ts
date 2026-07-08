import {
    LitElement,
    html,
    type TemplateResult,
    type CSSResultGroup,
    type PropertyValues,
} from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { ContextProvider } from '@lit/context';

import resetStyles from '../../styles/components/reset.styles.js';
import utilitiesStyles from '../../styles/utilities.styles.js';
import buttonStyles from '../../styles/components/button.styles.js';
import panelStyles from '../../styles/shared/panel.styles.js';
import styles from './stepper.styles.js';

import { stepperContext, type StepperRegistry } from '../../context/stepper.context.js';
import { announceA11y } from '../../a11y/announce-a11y.js';
import { NavigationTreeController } from '../../controllers/navigation-tree.controller.js';
import { ScrollFollowController } from '../../controllers/scroll-follow.controller.js';
import { AnchoredController } from '../../controllers/anchored.controller.js';
import { renderDesktop, renderMobile } from './stepper.renderer.js';
import { ArStepperItem } from '../stepper-item/stepper-item.js';
import { warn } from '../../utils/warn.js';
import { getRuntimePrefix } from '../../utils/runtime-prefix.js';

/** Détail de l'événement émis lors d'un changement d'étape */
export interface ArStepperStepChangeDetail {
    /** Chemin (`href`) de l'étape sélectionnée */
    path: string;
}

/**
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
 *
 * @slot - Un ou plusieurs composant <ar-stepper-items>, potentiellement imbriqués pour créer des sous-étapes.
 *
 * @csspart nav          - L'élément `<nav>` englobant.
 * @csspart list         - La liste des étapes (desktop).
 * @csspart step         - Une étape de premier niveau.
 * @csspart substep      - Une sous-étape.
 * @csspart step-link    - Le lien d'une étape.
 * @csspart dropdown     - Le conteneur dropdown.
 * @csspart trigger      - Le bouton d'ouverture du panel mobile.
 * @csspart panel        - Le panel mobile flottant.
 *
 * @cssprop [--ar-stepper-panel-min-width=var(--ar-panel-min-width)]                         - Largeur min du panel mobile (cascade vers --ar-panel-min-width).
 * @cssprop [--ar-stepper-panel-max-width=var(--ar-panel-max-width)]                         - Largeur max du panel mobile (cascade vers --ar-panel-max-width).
 * @cssprop [--ar-stepper-gap=1.5rem]                                                         - Hauteur du connecteur entre les étapes principales.
 * @cssprop [--ar-stepper-substep-gap=1rem]                                                   - Hauteur du connecteur entre les sous-étapes.
 * @cssprop [--ar-stepper-connector-color=var(--ar-color-neutral-80)]                         - Couleur du connecteur pointillé entre les étapes.
 * @cssprop [--ar-stepper-active-bullet-bg=var(--ar-color-interactive)]                       - Fond de la puce de l'étape active.
 * @cssprop [--ar-stepper-active-bullet-color=var(--ar-color-text-inverse)]                   - Couleur du numéro dans la puce active.
 * @cssprop [--ar-stepper-bullet-bg=var(--ar-color-primary-80)]                               - Fond des puces des étapes visitables.
 * @cssprop [--ar-stepper-bullet-color=var(--ar-color-interactive)]                           - Couleur du numéro dans les puces visitables.
 * @cssprop [--ar-stepper-bullet-border-color=var(--ar-color-neutral-80)]                     - Bordure des puces des étapes suivantes.
 * @cssprop [--ar-stepper-bullet-hover-bg=var(--ar-color-text-muted)]                         - Fond de la puce au survol.
 * @cssprop [--ar-stepper-link-hover-color=var(--ar-color-text-muted)]                       - Couleur du texte du lien au survol.
 * @cssprop [--ar-stepper-bullet-radius=0.75rem]                                              - Border-radius de la puce.
 * @cssprop [--ar-stepper-label-color=var(--ar-color-text-muted)]                             - Couleur des labels des étapes inactives.
 * @cssprop [--ar-stepper-active-label-color=var(--ar-color-interactive)]                     - Couleur du label de l'étape active.
 * @cssprop [--ar-stepper-distance=var(--ar-anchor-distance)]                                 - Espacement entre le trigger et le panel mobile.
 * @cssprop [--ar-stepper-offset=var(--ar-anchor-offset)]                                     - Décalage latéral du panel mobile.
 *
 * @event {CustomEvent<{ path: string }>} ar-stepper-step-changed - Émis au clic sur une étape.
 */
export class ArStepper extends LitElement {
    static override styles: CSSResultGroup = [
        resetStyles,
        utilitiesStyles,
        buttonStyles,
        panelStyles,
        styles,
    ];

    /**
     * Chemin de l'étape courante. Doit correspondre au `href` d'un `<ar-stepper-item>`.
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
     * Active le mode "scroll follow" : la propriété `current-path` se met à jour
     * automatiquement quand l'utilisateur scrolle vers une section de la page.
     * @attr follow-scroll
     */
    @property({ type: Boolean, attribute: 'follow-scroll' })
    followScroll = false;

    /**
     * ID de l'élément cible qui accueille le stepper en mode desktop.
     * @attr desktop-target
     */
    @property({ type: String, attribute: 'desktop-target', reflect: true })
    desktopTarget?: string;

    /**
     * Breakpoint desktop à partir duquel la téléportation est activée.
     * @attr desktop-from
     */
    @property({ type: Number, attribute: 'desktop-from', reflect: true })
    desktopFrom = 992;

    /**
     * Contrôle programmatique du panel mobile. Reflété comme attribut HTML.
     * Sans effet en mode desktop.
     * @attr open
     * @default false
     */
    @property({ reflect: true, type: Boolean }) open: boolean = false;

    /**
     * Alignement de la liste d'étapes : `left` (défaut) ou `right`.
     * **Note** — l'alignement `right` ne s'applique qu'en mode desktop (rendu liste verticale).
     * En mode mobile (dropdown), les items restent alignés à gauche.
     * @attr align
     */
    @property({ type: String, attribute: 'align', reflect: true })
    align: 'left' | 'right' = 'left';

    @state()
    private _currentStepIndex = 0;

    @state()
    private _isDesktop = false;

    @query('[part="trigger"]') private _dropdownTrigger?: HTMLElement;
    @query('[part="panel"]') private _dropdownPanel?: HTMLElement;

    private _originalParent: ParentNode | null = null;
    private _originalNextSibling: ChildNode | null = null;
    private _mediaQueryList: MediaQueryList | undefined;
    private _responsiveQuery: string | undefined;
    private _dropdownAttached = false;
    private readonly _onMediaQueryChange = (event: MediaQueryListEvent) => {
        this.applyResponsiveMode(event.matches);
    };

    // ── Controllers ──────────────────────────────────────────────────────────

    private readonly navigation = new NavigationTreeController(this);
    private readonly scrollFollow = new ScrollFollowController(this, () => this.getScrollTargets());
    private readonly _popover = new AnchoredController(this, {
        lockScroll: false,
        popupMode: 'menu',
        cssVarPrefix: 'stepper',
        onExternalClose: () => {
            this.open = false;
        },
    });
    private readonly _onDropdownToggle = () => {
        this.open = !this.open;
    };

    // ── Registry / Context ───────────────────────────────────────────────────

    private items = new Set<ArStepperItem>();

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

        if (!this._originalParent && this.parentNode) {
            this._originalParent = this.parentNode;
            this._originalNextSibling = this.nextSibling;
        }

        this.addEventListener('scroll-follow-change', this.handleScrollChange as EventListener);
        this.setupResponsiveMode();

        // Fallback pour les items déjà présents dans le DOM avant que le provider soit prêt
        const prefix = getRuntimePrefix(this.tagName, 'stepper');
        customElements.whenDefined(`${prefix}-stepper-item`).then(() => {
            if (!this.isConnected) return;
            this.collectExistingItems();
        });
    }

    override disconnectedCallback() {
        this.removeEventListener('scroll-follow-change', this.handleScrollChange as EventListener);
        this.teardownResponsiveMode();
        super.disconnectedCallback();
    }

    override updated(changed: PropertyValues<this>): void {
        if (!this._isDesktop && !this._dropdownAttached) {
            void this.updateComplete.then(() => {
                this._dropdownAttached = this._attachDropdown();
            });
        }
        if (changed.has('open') && !this._isDesktop && this._dropdownAttached) {
            // Différer évite que Popover.requestUpdate() déclenche le warning Lit "change-in-update".
            if (this.open) {
                void this.updateComplete.then(() => {
                    if (this.isConnected) void this._popover.show();
                });
            } else {
                void this.updateComplete.then(() => {
                    if (this.isConnected) this._popover.hide();
                });
            }
        }
    }

    private _attachDropdown(): boolean {
        if (!this.isConnected) return false;
        if (this._dropdownTrigger && this._dropdownPanel) {
            this._popover.hide(); // flush stale scroll-lock refs before re-attach
            this._popover.attach(this._dropdownTrigger, this._dropdownPanel);
            if (this.open) void this._popover.show();
            return true;
        }
        return false;
    }

    // ── Reactivity ───────────────────────────────────────────────────────────

    // willUpdate() s'exécute AVANT le rendu : les requestUpdate() déclenchés ici
    // (via setCurrentPath, setEnabled) sont mergés dans le cycle courant → 0 update parasite.
    protected override willUpdate(changed: PropertyValues<this>) {
        if (changed.has('currentPath') || this.navigation.tree.length) {
            this._currentStepIndex = this.computeCurrentStepIndex();
        }
        if (changed.has('currentPath')) {
            this.navigation.setCurrentPath(this.currentPath);
        }
        if (changed.has('followScroll')) {
            this.scrollFollow.setEnabled(this.followScroll);
        }
        if (changed.has('desktopTarget') || changed.has('desktopFrom')) {
            this.setupResponsiveMode();
        }
    }

    // ── Render ───────────────────────────────────────────────────────────────

    protected override render(): TemplateResult {
        const steps = this.navigation.tree;

        // Tant que les items ne se sont pas enregistrés, on rend le slot transparent
        if (!steps.length) {
            return html`<slot></slot>`;
        }

        const content = this._isDesktop
            ? renderDesktop(steps, this.mode, this.onClickLink)
            : renderMobile(
                  steps,
                  {
                      currentStepIndex: this._currentStepIndex,
                      currentStepLabel: this.getCurrentStepLabel(),
                      currentSubStepLabel: this.getCurrentSubStepLabel(),
                      onToggle: this._onDropdownToggle,
                  },
                  this.mode,
                  this.onClickLink,
              );

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
     * Déclenche une reconstruction de l'arbre après le cycle de rendu courant.
     * Le debounce via `_rebuildPending` évite N rebuilds pour N items simultanés.
     * `updateComplete.then` garantit que le rebuild est hors du cycle Lit actif.
     */
    private rebuildTree(): void {
        if (this._rebuildPending) return;
        this._rebuildPending = true;

        void this.updateComplete.then(() => {
            this._rebuildPending = false;
            this.navigation.buildFromItems(Array.from(this.items));
            this.scrollFollow.refresh();
            this.requestUpdate();
        });
    }

    /** Collecte les items déjà présents dans le light DOM (cas du premier render) */
    private collectExistingItems(): void {
        [...this.querySelectorAll('*')]
            .filter((el): el is ArStepperItem => el instanceof ArStepperItem)
            .forEach((item) => item.setRegistry(this._registry));
    }

    private setupResponsiveMode(): void {
        if (!this.isConnected) {
            this.teardownResponsiveMode();
            return;
        }

        // Si desktopTarget a été retiré, on restaure la position d'origine
        if (!this.desktopTarget) {
            this._restoreToOriginalContainer();
        }

        const query = `(min-width: ${this.desktopFrom}px)`;
        if (this._mediaQueryList && this._responsiveQuery === query) {
            this.applyResponsiveMode(this._mediaQueryList.matches);
            return;
        }

        this.teardownResponsiveMode();

        this._responsiveQuery = query;
        this._mediaQueryList = window.matchMedia(query);
        this._mediaQueryList.addEventListener('change', this._onMediaQueryChange);
        this.applyResponsiveMode(this._mediaQueryList.matches);
    }

    private teardownResponsiveMode(): void {
        this._mediaQueryList?.removeEventListener('change', this._onMediaQueryChange);
        this._mediaQueryList = undefined;
        this._responsiveQuery = undefined;
    }

    private applyResponsiveMode(matches: boolean): void {
        const wasDesktop = this._isDesktop;
        // Le mode de rendu suit le breakpoint, indépendamment de la téléportation
        this._isDesktop = matches;

        if (this.desktopTarget) {
            if (matches) {
                this._teleportToTarget();
            } else {
                this._restoreToOriginalContainer();
            }
        }
        // Retour en mode mobile : updated() re-attachera dès que les éléments sont dans le DOM
        if (wasDesktop && !matches) {
            this._dropdownAttached = false;
        }
    }

    private _teleportToTarget(): void {
        if (!this.desktopTarget) return;
        const target = document.getElementById(this.desktopTarget);
        if (!target) {
            warn('ar-stepper', `desktop-target "${this.desktopTarget}" introuvable.`);
            return;
        }
        if (this.parentNode !== target) {
            target.appendChild(this);
        }
    }

    private _restoreToOriginalContainer(): void {
        if (!this._originalParent || this.parentNode === this._originalParent) return;

        if (
            this._originalNextSibling &&
            this._originalNextSibling.parentNode === this._originalParent
        ) {
            this._originalParent.insertBefore(this, this._originalNextSibling);
            return;
        }

        this._originalParent.appendChild(this);
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

        const detail: ArStepperStepChangeDetail = { path };

        // Double dispatch : nom court pour usage interne, nom préfixé pour usage externe
        this.dispatchEvent(
            new CustomEvent('step-changed', { bubbles: true, composed: true, detail }),
        );
        this.dispatchEvent(
            new CustomEvent('ar-stepper-step-changed', { bubbles: true, composed: true, detail }),
        );

        const stepLabel =
            this.navigation.tree.flatMap((s) => [s, ...s.children]).find((s) => s.path === path)
                ?.label ?? path;
        announceA11y(stepLabel, 'polite');
    };

    private handleScrollChange = (event: CustomEvent<string>): void => {
        this.currentPath = event.detail;
    };
}
