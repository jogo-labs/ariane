import { LitElement, html, css, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';

const FOCUSABLE = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

/**
 * @summary Élément d'un menu dropdown. Sentinel qui active le mode menu sur
 * ar-dropdown.
 * @display none
 *
 * @slot - Contenu de l'item (bouton ou lien).
 */
@customElement('ar-dropdown-item')
export class ArDropdownItem extends LitElement {
    static override styles = [
        css`
            :host {
                display: contents;
            }
        `,
    ];

    override render(): TemplateResult {
        return html`<slot @slotchange=${this._handleSlotChange}></slot>`;
    }

    private _handleSlotChange(): void {
        const slot = this.shadowRoot?.querySelector('slot') as HTMLSlotElement | null;
        if (!slot) return;
        const assigned = slot.assignedElements({ flatten: true });
        const focusable = assigned.find((el) => el.matches(FOCUSABLE)) as HTMLElement | undefined;
        if (!focusable) return;
        focusable.setAttribute('role', 'menuitem');
        focusable.tabIndex = -1;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'ar-dropdown-item': ArDropdownItem;
    }
}
