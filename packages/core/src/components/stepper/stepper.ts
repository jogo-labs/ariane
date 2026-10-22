import { html, nothing, type TemplateResult, type CSSResultGroup, type PropertyValues } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { ContextProvider } from '@lit/context';

import resetStyles from '../../styles/components/reset.styles.js';
import utilitiesStyles from '../../styles/utilities.styles.js';
import panelStyles from '../../styles/shared/panel.styles.js';
import styles from './stepper.styles.js';

import { stepperContext, type StepperRegistry } from '../../context/stepper.context.js';
import { announceA11y } from '../../a11y/announce-a11y.js';
import { NavigationTreeController } from '../../controllers/navigation-tree.controller.js';
import { ScrollFollowController } from '../../controllers/scroll-follow.controller.js';
import { AnchoredController } from '../../controllers/anchored.controller.js';
import { renderDesktop, renderMobile, pushItemRenderState } from './stepper.renderer.js';
import { ArStepperItem } from '../stepper-item/stepper-item.js';
import { warn } from '../../utils/warn.js';
import { LocalizeController } from '../../controllers/localize.controller.js';
import { ArianeElement } from '../../base/ariane-element.js';
import { emitEvent, type ArEventDetail } from '../../utils/emit-event.js';

/** Détail de l'événement émis lors d'une demande ou d'une confirmation de changement d'étape */
export interface ArStepperStepChangeDetail extends ArEventDetail {
    /**
     * Chemin de l'étape courante avant la transition. Peut être `''` si le stepper
     * est monté sans `current-path` initial et que `currentPath` est assigné pour la
     * première fois.
     */
    from: string;
    /** Chemin de l'étape cible (demandée sur `-change`, confirmée sur `-changed`) */
    to: string;
}

/**
 * @summary Affiche la progression de l'utilisateur à travers une séquence d'étapes, avec prise en charge des sous-étapes. À utiliser pour des parcours de création ou de modification en plusieurs étapes.
 * @display demo
 * @localized
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
 * @slot trigger-icon - Icône du bouton d'ouverture du panel (mobile). Remplace le chevron SVG par défaut.
 *
 * @csspart stepper - Racine du composant.
 * @csspart list    - Le conteneur `role="list"` des étapes.
 * @csspart trigger - Le bouton d'ouverture du panel mobile.
 * @csspart trigger-status - Le statut d'avancement affiché dans le bouton d'ouverture (ex. « Étape 2 / 5 (en cours) »).
 * @csspart trigger-label - Le libellé de l'étape (et sous-étape) courante affiché dans le bouton d'ouverture.
 * @csspart trigger-icon - Le conteneur de l'icône du bouton d'ouverture (chevron par défaut, ou contenu du slot `trigger-icon`) — cible d'une éventuelle rotation à l'ouverture.
 * @csspart panel   - Le panel mobile flottant.
 *
 * @cssprop --ar-stepper-distance - Espacement entre le trigger et le panel mobile.
 * @cssprop --ar-stepper-offset - Décalage latéral du panel mobile.
 * @cssprop --ar-stepper-toggle-transition-duration - Durée de la transition de fond du bouton d'ouverture (respecte `prefers-reduced-motion`).
 * @cssprop --ar-stepper-toggle-min-size - Taille de cible minimale du bouton d'ouverture (WCAG 2.5.8).
 * @cssprop --ar-panel-bg - Fond du panel partagé. Repli système `Canvas` si aucun thème n'est chargé.
 * @cssprop --ar-panel-text - Couleur du texte du panel partagé. Repli système `CanvasText` si aucun thème n'est chargé.
 * @cssprop --ar-panel-border-color - Couleur de bordure du panel partagé. Repli système `ButtonBorder` si aucun thème n'est chargé.
 * @cssprop --ar-panel-radius - Rayon de bordure du panel partagé.
 * @cssprop --ar-panel-shadow - Ombre portée du panel partagé.
 * @cssprop --ar-panel-padding - Espacement interne du panel partagé.
 * @cssprop --ar-panel-min-width - Largeur minimale du panel partagé.
 * @cssprop --ar-panel-max-width - Largeur maximale du panel partagé.
 * @cssprop --ar-panel-show-duration - Durée de l'animation d'ouverture du panel partagé (respecte `prefers-reduced-motion`).
 *
 * @cssState open - Le panel mobile est ouvert.
 * @cssState pending - Une réponse est attendue : un utilisateur a demandé à changer d'étape ou l'application a posé manuellement l'attribut `pending`.
 *
 * @event {CustomEvent<{ id: string | undefined, from: string, to: string }>} ar-stepper-step-change - Émis avant le
 *   changement d'étape, au clic. Annulable via `preventDefault()` : bloque la navigation,
 *   `currentPath` ne change pas. Contient `from` et `to`. @cancelable
 * @event {CustomEvent<{ id: string | undefined, from: string, to: string }>} ar-stepper-step-changed - Émis quand
 *   `currentPath` a réellement changé (réassignation externe en réponse à
 *   `ar-stepper-step-change`, ou via `follow-scroll`). Non annulable. Contient `from` et `to`.
 *
 * @tagname ar-stepper
 */
export class ArStepper extends ArianeElement {
    static override styles: CSSResultGroup = [resetStyles, utilitiesStyles, panelStyles, styles];

    private readonly localize = new LocalizeController(this);

    /**
     * Chemin de l'étape courante. Doit correspondre au `path` d'un `<ar-stepper-item>`.
     * Mettre à jour cette propriété pour naviguer programmatiquement entre les étapes.
     *
     * Toute affectation compte, même vers la même valeur (`hasChanged` toujours vrai) : réassigner
     * `currentPath` est la réponse de l'application à `ar-stepper-step-change`, y compris pour
     * signaler un échec (même étape), et met fin à l'attente automatique.
     */
    @property({ type: String, attribute: 'current-path', reflect: true, hasChanged: () => true })
    currentPath = '';

    /**
     * Attente d'une réponse, pilotée par l'application. Le composant attend déjà seul la réponse
     * à chaque `ar-stepper-step-change` non annulé, jusqu'à la prochaine affectation de
     * `currentPath` : cet attribut sert à exprimer une attente qui ne passe pas par l'événement et
     * reste à la charge de l'application. Le composant ne le pose ni ne le retire jamais. Non
     * bloquant. L'attente, manuelle ou automatique, pose `aria-busy="true"` sur la navigation,
     * l'état `:state(pending)`, et annonce l'attente au passage `false → true`.
     */
    @property({ type: Boolean, reflect: true })
    pending = false;

    /**
     * Mode de navigation : `create` (formulaire de création) ou `edit` (modification).
     * Détermine quelles étapes sont accessibles au clic.
     */
    @property({ type: String, attribute: 'mode', reflect: true, useDefault: true })
    mode: 'create' | 'edit' = 'create';

    /**
     * Active le mode "scroll follow" : la propriété `current-path` se met à jour
     * automatiquement quand l'utilisateur scrolle vers une section de la page.
     */
    @property({ type: Boolean, attribute: 'follow-scroll', reflect: true })
    followScroll = false;

    /**
     * ID de l'élément cible qui accueille le stepper en mode desktop.
     */
    @property({ type: String, attribute: 'desktop-target', reflect: true })
    desktopTarget?: string;

    /**
     * Breakpoint desktop à partir duquel la téléportation est activée.
     */
    @property({ type: Number, attribute: 'desktop-from', reflect: true })
    desktopFrom = 992;

    /**
     * Contrôle programmatique du panel mobile. Reflété comme attribut HTML.
     * Sans effet en mode desktop.
     */
    @property({ reflect: true, type: Boolean }) open: boolean = false;

    /**
     * Inverse l'alignement de la liste d'étapes en mode desktop. Sans effet en mode
     * mobile (dropdown).
     *
     * S'appuie sur des règles posées sur les parts `control` et `indicator` d'ar-stepper-item —
     * un thème qui les redéfinit peut désactiver l'inversion.
     */
    @property({ attribute: 'reverse-align', reflect: true, type: Boolean })
    reverseAlign: boolean = false;

    @state()
    private _currentStepIndex = 0;

    @state()
    private _isDesktop = false;

    // Attente automatique d'une réponse : posée à chaque demande de changement d'étape, levée à
    // la prochaine affectation de `currentPath` ou si la demande est annulée.
    @state()
    private _awaiting = false;
    private _wasPending = false;
    // Faux tant que `currentPath` n'a été fourni ni avant le premier rendu ni par une demande de
    // changement d'étape : le premier `currentPath` posé après coup est alors la valeur initiale
    // d'un framework qui lie ses propriétés après le premier rendu, pas une transition.
    private _currentSettled = false;

    @query('[part="trigger"]') private _dropdownTrigger?: HTMLElement;
    @query('[part="panel"]') private _dropdownPanel?: HTMLElement;

    private _originalParent: ParentNode | null = null;
    private _originalNextSibling: ChildNode | null = null;
    private _mediaQueryList: MediaQueryList | undefined;
    private _responsiveQuery: string | undefined;
    private _dropdownAttached = false;
    // Distingue le tout premier cycle updated() (où `currentPath` "change" par rapport à sa
    // valeur pré-upgrade non définie) des transitions réelles ultérieures. `this.hasUpdated`
    // (natif Lit) ne convient pas ici : Lit le passe à `true` AVANT d'invoquer updated() sur
    // ce tout premier cycle, donc il vaut déjà `true` pendant son exécution — vérifié
    // empiriquement contre @lit/reactive-element (hasUpdated est assigné dans _$didUpdate()
    // avant l'appel à updated()). Même pattern que ArPagination._hasRenderedOnce.
    private _hasRenderedOnce = false;
    // Cible du transfert de focus : posée au clic, conservée jusqu'au prochain `currentPath`
    // égal à cette cible (confirmation éventuellement asynchrone). Effacée si la demande est
    // annulée, remplacée par un nouveau clic, ou si le focus quitte le stepper.
    private _pendingFocusPath: string | undefined;
    private readonly _onFocusOut = (event: FocusEvent) => {
        const next = event.relatedTarget;
        if (next instanceof Node && !this.contains(next)) this._pendingFocusPath = undefined;
    };
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
        notifyItemActivated: (item, event) => {
            this.onItemActivated(item, event);
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
        this.addEventListener('focusout', this._onFocusOut);
        this.setupResponsiveMode();

        // Fallback pour les items déjà présents dans le DOM avant que le provider soit prêt.
        // On attend la définition des tags réellement utilisés (pas un préfixe supposé) pour
        // fonctionner aussi bien avec des tags renommés indépendamment (import headless).
        const tags = new Set(
            [...this.querySelectorAll('*')]
                .map((el) => el.localName)
                .filter((tag) => tag.includes('-')),
        );
        Promise.all([...tags].map((tag) => customElements.whenDefined(tag))).then(() => {
            if (!this.isConnected) return;
            this.collectExistingItems();
        });
    }

    override disconnectedCallback() {
        this.removeEventListener('scroll-follow-change', this.handleScrollChange as EventListener);
        this.removeEventListener('focusout', this._onFocusOut);
        this.teardownResponsiveMode();
        super.disconnectedCallback();
    }

    override updated(changed: PropertyValues<this>): void {
        if (changed.has('open')) {
            this.toggleState('open', this.open);
        }
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
        if (this._isPending !== this._wasPending) {
            this._wasPending = this._isPending;
            this.toggleState('pending', this._isPending);
            if (this._hasRenderedOnce && this._isPending) {
                announceA11y(this.localize.term('stepperPending'), 'polite');
            }
        }
        if (this._hasRenderedOnce && changed.has('currentPath')) {
            const from = changed.get('currentPath') as string;
            const to = this.currentPath;
            if (!this._currentSettled) {
                this._currentSettled = true;
            } else if (from !== to) {
                this._emitChanged({ from, to });
                announceA11y(this.navigation.currentNode?.label ?? to, 'polite');
                if (to === this._pendingFocusPath) {
                    this._pendingFocusPath = undefined;
                    // L'item cible vient de recevoir son nouveau render-state (indicatorState,
                    // isLink…) via pushItemRenderState() dans willUpdate(), mais son propre
                    // cycle de rendu (LitElement séparé, Task 2) n'a pas encore tourné : son
                    // shadow DOM reflète encore l'ancien contrôle (ex. <a> avant un swap vers
                    // <div>). Attendre son updateComplete évite de focaliser un noeud sur le
                    // point d'être remplacé (ce qui perdrait le focus).
                    const item = this.navigation.currentNode?.item;
                    if (item) {
                        void item.updateComplete.then(() => {
                            item.focusControl();
                            // Mobile, panneau fermé : l'étape n'est pas focalisable, le trigger
                            // (qui affiche l'étape courante) reprend le focus.
                            if (!item.shadowRoot?.activeElement) this._dropdownTrigger?.focus();
                        });
                    }
                }
            }
        }
        this._hasRenderedOnce = true;
    }

    private get _isPending(): boolean {
        return this.pending || this._awaiting;
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
        if (!this._hasRenderedOnce) {
            this._currentSettled = this.currentPath !== '' || this.hasAttribute('current-path');
        }
        // L'arbre doit connaître le nouveau chemin avant d'en déduire l'index affiché (trigger
        // mobile), sinon libellé et statut ont un changement de retard.
        if (changed.has('currentPath')) {
            this.navigation.setCurrentPath(this.currentPath);
            this._awaiting = false;
        }
        if (changed.has('currentPath') || this.navigation.tree.length) {
            this._currentStepIndex = this.computeCurrentStepIndex();
        }
        if (changed.has('followScroll')) {
            this.scrollFollow.setEnabled(this.followScroll);
        }
        if (changed.has('desktopTarget') || changed.has('desktopFrom')) {
            this.setupResponsiveMode();
        }
        if (this.navigation.tree.length) {
            const stepLabel = (order: number, isSubstep: boolean): string =>
                this.localize.term('stepLabel', order, isSubstep);
            pushItemRenderState(this.navigation.tree, this.mode, stepLabel);
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
            ? renderDesktop()
            : renderMobile({
                  currentStepLabel: this.getCurrentStepLabel(),
                  currentSubStepLabel: this.getCurrentSubStepLabel(),
                  currentStepStatus: this.localize.term(
                      'currentStepStatus',
                      this._currentStepIndex + 1,
                      steps.length,
                  ),
                  onToggle: this._onDropdownToggle,
              });

        return html` <nav
            part="stepper"
            role="navigation"
            aria-labelledby="label-nav"
            aria-busy=${this._isPending ? 'true' : nothing}
        >
            <p id="label-nav" class="sr-only">${this.localize.term('stepperNavLabel')}</p>
            ${content}
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

    private _emitChanged(detail: Omit<ArStepperStepChangeDetail, 'id'>): void {
        emitEvent(this, 'ar-stepper-step-changed', { detail });
    }

    // ── Events ───────────────────────────────────────────────────────────────

    private onItemActivated(item: ArStepperItem, event: MouseEvent): void {
        this._pendingFocusPath = item.path;
        this._currentSettled = true;
        this._awaiting = true;

        const proceed = !emitEvent(this, 'ar-stepper-step-change', {
            cancelable: true,
            detail: { from: this.currentPath, to: item.path },
        }).defaultPrevented;
        if (!proceed) {
            this._pendingFocusPath = undefined;
            this._awaiting = false;
            event.preventDefault();
        }
    }

    private handleScrollChange = (event: CustomEvent<string>): void => {
        this._currentSettled = true;
        this.currentPath = event.detail;
    };
}
