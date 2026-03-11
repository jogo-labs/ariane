import { LitElement, type TemplateResult, html, type CSSResultGroup, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import utilitiesStyles from '../../styles/utilities.styles.js';
import dropdownStyles from '../../styles/components/dropdown.styles.js';
import buttonStyles from '../../styles/components/button.styles.js';
import styles from './breadcrumb.styles.js';

/** Un lien dans le fil d'ariane */
export interface MrBreadcrumbLink {
    /** Texte affiché du lien */
    label: string;
    /** URL du lien. Absent sur le dernier élément (page courante) */
    href?: string;
}

/** Objet de configuration d'un webcomposant MrBreadcrumb */
export class MrBreadcrumbConfig {
    /** Liens du fil d'ariane, du plus haut au plus profond */
    links: MrBreadcrumbLink[] = [];
}

/**
 * @summary Fil d'ariane accessible avec affichage adaptatif mobile/desktop.
 *
 * En dessous de 768px, les liens intermédiaires sont masqués derrière un dropdown.
 * Le premier lien reste toujours visible sous forme d'un bouton "Retour".
 *
 * @slot - Non utilisé. Les liens sont passés via la propriété `links`.
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
    static override styles: CSSResultGroup | undefined = [
        utilitiesStyles,
        dropdownStyles,
        buttonStyles,
        styles,
    ];

    /**
     * Liste des liens du fil d'ariane, dans l'ordre de la hiérarchie.
     * Le dernier élément représente la page courante et ne doit pas avoir de `href`.
     * @attr links
     */
    @property({ reflect: true, type: Array, useDefault: true })
    links: MrBreadcrumbLink[] = [];

    /**
     * Active le thème sombre du composant.
     * @attr dark
     */
    @property({ reflect: true, type: Boolean })
    dark: Boolean = false;

    // Media query partagée entre toutes les instances — évite N listeners pour N composants
    static mobileQuery: MediaQueryList = window.matchMedia('(max-width: 767px)');

    @state() private isMobile?: Boolean;
    @state() private dropdownOpen: Boolean = false;

    override connectedCallback(): void {
        super.connectedCallback();
        this.isMobile = MrBreadcrumb.mobileQuery.matches;
        MrBreadcrumb.mobileQuery.addEventListener('change', this._handleMediaChange);
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        MrBreadcrumb.mobileQuery.removeEventListener('change', this._handleMediaChange);
    }

    override render(): TemplateResult | void {
        if (this.links.length === 0) {
            console.warn('MrBreadcrumb - Le paramètre "links" n\'a pas été renseigné');
            return;
        }

        const themeClass = this.dark ? 'dark' : 'light';

        const listTemplates: Array<TemplateResult> = this.links.map((link, index) => {
            const isCurrent = index === this.links.length - 1;
            return html`
                <li
                    part="item"
                    class="breadcrumb-item${isCurrent ? ' active' : ''}"
                    .ariaCurrent="${isCurrent ? 'page' : nothing}"
                >
                    ${isCurrent
                    ? html`<span part="current" class="breadcrumb-text">${link?.label}</span>`
                    : html`<a part="link" class="breadcrumb-link" href="${link?.href}">${link?.label}</a>`}
                </li>`;
        });

        return html`
            <nav part="nav" class="breadcrumb-container" role="navigation" aria-labelledby="breadcrumb-label">
                <p id="breadcrumb-label" class="sr-only">Vous êtes ici</p>
                ${this.isMobile
                ? html`
                        <div part="dropdown" class="dropdown breadcrumb-dropdown${this.dropdownOpen ? ' show' : ''}">
                            <a
                                id="mobile-home-btn"
                                class="btn btn-tertiary ${themeClass}"
                                href="${this.links[0]?.href}"
                            >
                                <span aria-hidden="true" class="icon icon-chevron-sm-l"></span>
                                <span class="btn-content">< ${this.links[0]?.label}</span>
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
                                class="dropdown-menu dropdown-menu-left${this.dropdownOpen ? ' show' : ''}"
                                tabindex="-1"
                            >
                                <ol class="breadcrumb breadcrumb-mobile">${listTemplates.slice(1)}</ol>
                            </div>
                        </div>`
                : html`<ol part="list" class="breadcrumb breadcrumb-desktop">${listTemplates}</ol>`}
            </nav>`;
    }

    private _show(): void {
        this.dropdownOpen = true;
        this.addEventListener('blur', this._hide);
        this.dispatchEvent(new CustomEvent('mr-breadcrumb-open', { bubbles: true, composed: true }));
    }

    private _hide(): void {
        this.dropdownOpen = false;
        this.removeEventListener('blur', this._hide);
        this.dispatchEvent(new CustomEvent('mr-breadcrumb-close', { bubbles: true, composed: true }));
    }

    private _handleMediaChange = (event: MediaQueryListEvent): void => {
        this.isMobile = event.matches;
    };
}

declare global {
    interface HTMLElementTagNameMap {
        'mr-breadcrumb': MrBreadcrumb;
    }
}
