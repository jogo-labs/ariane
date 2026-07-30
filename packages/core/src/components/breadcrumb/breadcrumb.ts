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
