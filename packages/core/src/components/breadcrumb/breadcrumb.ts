import { LitElement, type TemplateResult, html, type CSSResultGroup, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ContextProvider } from '@lit/context';
import utilitiesStyles from '../../styles/utilities.styles.js';
import dropdownStyles from '../../styles/components/dropdown.styles.js';
import buttonStyles from '../../styles/components/button.styles.js';
import styles from './breadcrumb.styles.js';

import { breadcrumbContext } from '../../context/breadcrumb.context.js';
import { type MrBreadcrumbItem } from '../breadcrumb-item/breadcrumb-item.js';

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
 * @csspart dropdown   - Le conteneur du dropdown mobile.
 *
 * @event {CustomEvent} mr-breadcrumb-open  - Émis à l'ouverture du dropdown mobile.
 * @event {CustomEvent} mr-breadcrumb-close - Émis à la fermeture du dropdown mobile.
 */
@customElement('mr-breadcrumb')
export class MrBreadcrumb extends LitElement {
    static override styles: CSSResultGroup = [
        utilitiesStyles,
        dropdownStyles,
        buttonStyles,
        styles,
    ];

    /**
     * Active le thème sombre du composant.
     */
    @property({ reflect: true, type: Boolean })
    dark: boolean = false;

    static mobileQuery: MediaQueryList = window.matchMedia('(max-width: 767px)');

    @state() private isMobile: boolean = MrBreadcrumb.mobileQuery.matches;
    @state() private dropdownOpen: boolean = false;

    private _items = new Set<MrBreadcrumbItem>();
    private _rebuildPending = false;

    private readonly _provider = new ContextProvider(this, {
        context: breadcrumbContext,
        initialValue: {
            registerItem: (item: MrBreadcrumbItem) => {
                this._items.add(item);
                this._scheduleRebuild();
            },
            unregisterItem: (item: MrBreadcrumbItem) => {
                this._items.delete(item);
                this._scheduleRebuild();
            },
            notifyItemChanged: (_item: MrBreadcrumbItem) => {
                this._scheduleRebuild();
            },
        },
    });

    // ---------------------------------------------------------------------------
    // Lifecycle
    // ---------------------------------------------------------------------------

    override connectedCallback(): void {
        super.connectedCallback();
        MrBreadcrumb.mobileQuery.addEventListener('change', this._handleMediaChange);
        customElements.whenDefined('mr-breadcrumb-item').then(() => this._collectExistingItems());
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        MrBreadcrumb.mobileQuery.removeEventListener('change', this._handleMediaChange);
    }

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------

    override render(): TemplateResult | void {
        const items = this._orderedItems;

        if (items.length === 0) return;

        const themeClass = this.dark ? 'dark' : 'light';

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
                    ? html`<div
                          part="dropdown"
                          class="dropdown breadcrumb-dropdown${this.dropdownOpen ? ' show' : ''}"
                      >
                          <a
                              id="mobile-home-btn"
                              class="btn btn-tertiary ${themeClass}"
                              href="${items[0]?.href}"
                          >
                              <span aria-hidden="true" class="icon icon-chevron-sm-l"></span>
                              <span class="btn-content">${items[0]?.label}</span>
                          </a>
                          <button
                              @click=${this.dropdownOpen ? this._hide : this._show}
                              .ariaExpanded=${this.dropdownOpen}
                              type="button"
                              class="btn btn-tertiary ${themeClass} btn-ratio-square"
                              id="breadcrumb-dropdown"
                          >
                              <span aria-hidden="true" class="icon icon-more">v</span>
                              <span class="btn-content sr-only">Afficher le fil d'ariane</span>
                          </button>
                          <div
                              class="dropdown-menu dropdown-menu-left${this.dropdownOpen
                                  ? ' show'
                                  : ''}"
                              tabindex="-1"
                          >
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

    private get _orderedItems(): MrBreadcrumbItem[] {
        return [...this.querySelectorAll<MrBreadcrumbItem>('mr-breadcrumb-item')];
    }

    private _collectExistingItems(): void {
        const registry = this._provider.value;
        if (!registry) return;
        this.querySelectorAll<MrBreadcrumbItem>('mr-breadcrumb-item').forEach((item) =>
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

    private _show(): void {
        this.dropdownOpen = true;
        this.addEventListener('blur', this._hide);
        this.dispatchEvent(
            new CustomEvent('mr-breadcrumb-open', { bubbles: true, composed: true }),
        );
    }

    private _hide(): void {
        this.dropdownOpen = false;
        this.removeEventListener('blur', this._hide);
        this.dispatchEvent(
            new CustomEvent('mr-breadcrumb-close', { bubbles: true, composed: true }),
        );
    }

    private _handleMediaChange = (): void => {
        this.isMobile = MrBreadcrumb.mobileQuery.matches;
    };
}

declare global {
    interface HTMLElementTagNameMap {
        'mr-breadcrumb': MrBreadcrumb;
    }
}
