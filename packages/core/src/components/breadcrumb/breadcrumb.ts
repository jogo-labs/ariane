import {
    LitElement,
    type TemplateResult,
    html,
    type CSSResultGroup,
    nothing,
    type PropertyValues,
} from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { ContextProvider } from '@lit/context';
import utilitiesStyles from '../../styles/utilities.styles.js';
import panelStyles from '../../styles/shared/panel.styles.js';
import buttonStyles from '../../styles/components/button.styles.js';
import styles from './breadcrumb.styles.js';

import { breadcrumbContext } from '../../context/breadcrumb.context.js';
import { type ArBreadcrumbItem } from '../breadcrumb-item/breadcrumb-item.js';
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
 * @cssprop [--ar-breadcrumb-separator-color=var(--ar-color-neutral-80)] - Couleur du séparateur entre les items (desktop).
 * @cssprop [--ar-breadcrumb-bullet-color=var(--ar-color-neutral-80)] - Couleur des puces de la liste mobile.
 * @cssprop [--ar-breadcrumb-panel-min-width=var(--ar-panel-min-width)] - Largeur min du panel mobile (cascade vers --ar-panel-min-width).
 * @cssprop [--ar-breadcrumb-panel-max-width=var(--ar-panel-max-width)] - Largeur max du panel mobile (cascade vers --ar-panel-max-width).
 * @cssprop [--ar-breadcrumb-distance=var(--ar-anchor-distance)] - Espacement entre le trigger et le panel mobile.
 * @cssprop [--ar-breadcrumb-offset=var(--ar-anchor-offset)] - Décalage latéral du panel mobile.
 *
 * @event {CustomEvent} ar-breadcrumb-open  - Émis à l'ouverture du dropdown mobile.
 * @event {CustomEvent} ar-breadcrumb-close - Émis à la fermeture du dropdown mobile.
 */
@customElement('ar-breadcrumb')
export class ArBreadcrumb extends LitElement {
    static override styles: CSSResultGroup = [utilitiesStyles, panelStyles, buttonStyles, styles];

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
        customElements.whenDefined('ar-breadcrumb-item').then(() => this._collectExistingItems());
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
            if (this.open) {
                void this._popover.show();
                this.dispatchEvent(
                    new CustomEvent('ar-breadcrumb-open', { bubbles: true, composed: true }),
                );
            } else {
                this._popover.hide();
                this.dispatchEvent(
                    new CustomEvent('ar-breadcrumb-close', { bubbles: true, composed: true }),
                );
            }
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
                              @click=${this.open ? this._hide : this._show}
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
        return [...this.querySelectorAll<ArBreadcrumbItem>('ar-breadcrumb-item')];
    }

    private _collectExistingItems(): void {
        const registry = this._provider.value;
        if (!registry) return;
        this.querySelectorAll<ArBreadcrumbItem>('ar-breadcrumb-item').forEach((item) =>
            item.setRegistry(registry),
        );
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

    private _show(): void {
        this.open = true;
    }

    private _hide(): void {
        this.open = false;
    }

    private _handleMediaChange = (): void => {
        this.isMobile = ArBreadcrumb.mobileQuery.matches;
    };
}

declare global {
    interface HTMLElementTagNameMap {
        'ar-breadcrumb': ArBreadcrumb;
    }
}
