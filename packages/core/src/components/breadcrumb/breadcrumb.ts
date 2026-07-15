import {
    LitElement,
    type TemplateResult,
    html,
    type CSSResultGroup,
    nothing,
    type PropertyValues,
} from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { ContextProvider } from '@lit/context';
import utilitiesStyles from '../../styles/utilities.styles.js';
import resetStyles from '../../styles/components/reset.styles.js';
import panelStyles from '../../styles/shared/panel.styles.js';
import buttonStyles from '../../styles/components/button.styles.js';
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
 * @csspart list       - L'élément `<ol>` de la liste des liens (desktop).
 * @csspart item       - Chaque `<li>` de la liste.
 * @csspart link       - Les `<a>` de navigation.
 * @csspart current    - Le `<span>` de la page courante (dernier élément, non cliquable).
 * @csspart trigger    - Le bouton d'ouverture du panel mobile.
 * @csspart panel      - Le panel mobile flottant.
 *
 * @cssprop [--ar-breadcrumb-color=var(--ar-color-text)] - Couleur du texte (labels et lien actif). À surcharger localement pour un fond sombre ponctuel, indépendamment du thème global.
 * @cssprop [--ar-breadcrumb-separator-color=var(--ar-color-neutral-80)] - Couleur du séparateur entre les items (desktop).
 * @cssprop [--ar-breadcrumb-bullet-color=var(--ar-color-neutral-80)] - Couleur des puces de la liste mobile.
 * @cssprop [--ar-breadcrumb-panel-min-width=var(--ar-panel-min-width)] - Largeur min du panel mobile (cascade vers --ar-panel-min-width).
 * @cssprop [--ar-breadcrumb-panel-max-width=var(--ar-panel-max-width)] - Largeur max du panel mobile (cascade vers --ar-panel-max-width).
 * @cssprop [--ar-breadcrumb-distance=var(--ar-anchor-distance)] - Espacement entre le trigger et le panel mobile.
 * @cssprop [--ar-breadcrumb-offset=var(--ar-anchor-offset)] - Décalage latéral du panel mobile.
 * @cssprop [--ar-breadcrumb-toggle-bg=var(--ar-button-tertiary-bg)] - Fond du bouton retour/trigger mobile.
 * @cssprop [--ar-breadcrumb-toggle-bg-hover=var(--ar-button-tertiary-bg-hover)] - Fond du bouton retour/trigger mobile au survol.
 * @cssprop [--ar-breadcrumb-toggle-bg-pressed=var(--ar-button-tertiary-bg-active)] - Fond du bouton retour/trigger mobile pressé.
 * @cssprop [--ar-breadcrumb-toggle-bg-focus=var(--ar-button-tertiary-bg-focus)] - Fond du bouton retour/trigger mobile au focus.
 *
 * @event {CustomEvent} ar-breadcrumb-show   - Émis avant l'ouverture du dropdown mobile. Annulable.
 * @event {CustomEvent} ar-breadcrumb-shown  - Émis après l'ouverture du dropdown mobile.
 * @event {CustomEvent} ar-breadcrumb-hide   - Émis avant la fermeture du dropdown mobile. Annulable.
 * @event {CustomEvent} ar-breadcrumb-hidden - Émis après la fermeture du dropdown mobile.
 */
export class ArBreadcrumb extends LitElement {
    static override styles: CSSResultGroup = [
        utilitiesStyles,
        resetStyles,
        panelStyles,
        buttonStyles,
        styles,
    ];

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
        if (changed.has('open') && changed.get('open') !== undefined && this.isMobile) {
            // Différé après la fin du cycle courant : _show()/_hide() déclenchent
            // Popover.show()/hide(), qui appelle host.requestUpdate() — un appel synchrone
            // ici déclencherait l'avertissement dev Lit "change-in-update".
            void this.updateComplete.then(() => {
                if (this.open) this._show();
                else this._hide();
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
            return html` <li
                part="item"
                class="breadcrumb-item${isCurrent ? ' active' : ''}"
                .ariaCurrent="${isCurrent ? 'page' : nothing}"
            >
                ${isCurrent
                    ? html`<span part="current" class="breadcrumb-text">${item.label}</span>`
                    : html`<a part="link" class="breadcrumb-link" href="${item.href}"
                          >${item.label}</a
                      >`}
            </li>`;
        });

        return html`
            <nav
                part="nav"
                class="breadcrumb-container"
                role="navigation"
                aria-labelledby="breadcrumb-label"
            >
                <p id="breadcrumb-label" class="sr-only">Vous êtes ici</p>
                ${this.isMobile
                    ? html`<div class="breadcrumb-dropdown">
                          <a id="mobile-home-btn" class="btn btn-tertiary" href="${items[0]?.href}">
                              <span aria-hidden="true" class="icon icon-chevron-sm-l"></span>
                              <span class="btn-content">${items[0]?.label}</span>
                          </a>
                          <button
                              @click=${this._handleTriggerClick}
                              type="button"
                              part="trigger"
                              class="btn btn-tertiary btn-ratio-square"
                              id="breadcrumb-dropdown"
                          >
                              <span aria-hidden="true" class="icon icon-more">v</span>
                              <span class="btn-content sr-only">Afficher le fil d'ariane</span>
                          </button>
                          <div part="panel" popover="auto" tabindex="-1">
                              <ol class="breadcrumb breadcrumb-mobile">
                                  ${listTemplates.slice(1)}
                              </ol>
                          </div>
                      </div>`
                    : html`<ol part="list" class="breadcrumb breadcrumb-desktop">
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

    private _show(): void {
        const showEv = this._emit('ar-breadcrumb-show');
        if (showEv.defaultPrevented) {
            this.open = false;
            return;
        }
        void this._popover.show().then(() => {
            this._emit('ar-breadcrumb-shown');
        });
    }

    private _hide(): void {
        const hideEv = this._emit('ar-breadcrumb-hide');
        if (hideEv.defaultPrevented) {
            this.open = true;
            return;
        }
        this._popover.hide();
        this._emit('ar-breadcrumb-hidden');
    }

    private _emit(name: string): CustomEvent {
        const e = new CustomEvent(name, {
            bubbles: true,
            composed: true,
            cancelable: true,
            detail: { id: this.id || undefined },
        });
        this.dispatchEvent(e);
        return e;
    }

    private _handleMediaChange = (): void => {
        this.isMobile = ArBreadcrumb.mobileQuery.matches;
    };
}
