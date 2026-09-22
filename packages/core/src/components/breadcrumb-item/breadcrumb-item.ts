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
    /**
     * Un item visible précède celui-ci (en mobile, le premier item est remplacé par « home »).
     * Conditionne le séparateur desktop et le connecteur mobile : en desktop il vaut `!isFirst`,
     * en mobile `isFirst` ne pilote que le cas « ne rend rien + masqué ».
     */
    hasPrevious: boolean;
    /** Nœud modèle du slot `separator` d'ar-breadcrumb, cloné dans l'item (desktop). */
    separator: Node | undefined;
    /** Incrémenté par ar-breadcrumb quand le contenu du nœud modèle change. */
    separatorVersion: number;
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
 *
 * @slot indicator - Remplace le contenu par défaut (aplat de couleur posé par le thème) de la
 *   puce mobile par une icône. Purement décoratif (`aria-hidden`).
 */
export class ArBreadcrumbItem extends LitElement {
    static override styles: CSSResultGroup = [resetStyles, styles];

    @property({ type: String }) label = '';
    /**
     * Destination du lien. Un item intermédiaire sans `href` est rendu comme un `<a>` inerte :
     * pas de rôle link, non focusable.
     */
    @property({ type: String }) href?: string;

    @state() private _renderState: BreadcrumbItemRenderState | undefined = undefined;

    private _registry: BreadcrumbRegistry | undefined = undefined;
    private _hasRendered = false;
    private _hiddenByComponent = false;

    private _separatorClone: { source: Node; version: number; node: Node } | undefined = undefined;

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
            previous.isMobile === state.isMobile &&
            previous.hasPrevious === state.hasPrevious &&
            previous.separator === state.separator &&
            previous.separatorVersion === state.separatorVersion
        ) {
            return;
        }
        this._renderState = state;
    }

    override connectedCallback() {
        super.connectedCallback();
        if (!this.hasAttribute('role')) this.setAttribute('role', 'listitem');
    }

    override disconnectedCallback() {
        this._registry?.unregisterItem(this);
        this._registry = undefined;
        super.disconnectedCallback();
    }

    override updated(changed: Map<string, unknown>) {
        if (this._hasRendered) {
            changed.forEach((_, prop) => {
                if (prop === 'label' || prop === 'href') this._registry?.notifyItemChanged(this);
            });
        }
        this._hasRendered = true;

        const state = this._renderState;
        const shouldHide = state !== undefined && state.isMobile && state.isFirst;
        if (shouldHide !== this._hiddenByComponent) {
            if (shouldHide) this.setAttribute('hidden', '');
            else this.removeAttribute('hidden');
            this._hiddenByComponent = shouldHide;
        }
        if (state?.isCurrent) {
            this.setAttribute('aria-current', 'page');
        } else {
            this.removeAttribute('aria-current');
        }
    }

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

    private _renderSeparator(state: BreadcrumbItemRenderState): TemplateResult {
        const content = this._separatorContent(state);
        return html`<span part="separator" aria-hidden="true">${content}</span>`;
    }

    override render(): TemplateResult | typeof nothing {
        const state = this._renderState;
        if (!state || (state.isMobile && state.isFirst)) return nothing;

        const decoration = state.isMobile
            ? html`<span
                  aria-hidden="true"
                  part=${state.isCurrent ? 'indicator indicator--current' : 'indicator'}
              >
                  <slot name="indicator"></slot>
              </span>`
            : nothing;

        const separator =
            state.hasPrevious && !state.isMobile ? this._renderSeparator(state) : nothing;

        const control = state.isCurrent
            ? html`<span part="control current"
                  >${decoration}<span class="item-label" part="label">${this.label}</span></span
              >`
            : html`<a part="control link" href=${this.href ?? nothing}
                  >${decoration}<span class="item-label" part="label">${this.label}</span></a
              >`;

        return html`<div class=${state.isMobile ? 'item item--mobile' : 'item'}>
            ${separator} ${control}
        </div>`;
    }
}
