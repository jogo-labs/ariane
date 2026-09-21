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
 */
export class ArBreadcrumbItem extends LitElement {
    static override styles: CSSResultGroup = [resetStyles, styles];

    @property({ type: String }) label = '';
    @property({ type: String }) href?: string;

    @state() private _renderState: BreadcrumbItemRenderState | undefined = undefined;

    private _registry: BreadcrumbRegistry | undefined = undefined;

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
            previous.isMobile === state.isMobile
        ) {
            return;
        }
        this._renderState = state;
    }

    override disconnectedCallback() {
        this._registry?.unregisterItem(this);
        this._registry = undefined;
        super.disconnectedCallback();
    }

    override updated(changed: Map<string, unknown>) {
        changed.forEach((oldValue, prop) => {
            if (oldValue === undefined) return;
            if (prop === 'label' || prop === 'href') {
                this._registry?.notifyItemChanged(this);
            }
        });

        const state = this._renderState;
        this.setAttribute('role', 'listitem');
        this.toggleAttribute('hidden', state !== undefined && state.isMobile && state.isFirst);
        if (state?.isCurrent) {
            this.setAttribute('aria-current', 'page');
        } else {
            this.removeAttribute('aria-current');
        }
    }

    override render(): TemplateResult | typeof nothing {
        const state = this._renderState;
        if (!state || (state.isMobile && state.isFirst)) return nothing;

        const decoration = state.isMobile
            ? html`<span
                  part="indicator${state.isCurrent ? ' indicator--current' : ''}"
                  aria-hidden="true"
              ></span>`
            : state.isFirst
              ? nothing
              : html`<span part="separator" aria-hidden="true"></span>`;

        const control = state.isCurrent
            ? html`<span part="current">${this.label}</span>`
            : html`<a part="link" href=${this.href ?? ''}>${this.label}</a>`;

        return html`<div class=${state.isMobile ? 'item item--mobile' : 'item'}>
            ${decoration}${control}
        </div>`;
    }
}
