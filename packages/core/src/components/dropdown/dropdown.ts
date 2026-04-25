import { LitElement, html, type TemplateResult, type PropertyValues } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import type { Placement } from '@floating-ui/dom';
import { PopoverController } from '../../controllers/popover.controller.js';
import type { ArDropdownItem } from '../dropdown-item/dropdown-item.js';
import styles from './dropdown.styles.js';

export type ArDropdownPlacement = Placement;

/**
 * @summary Mécanisme de disclosure accessible basé sur l'API popover native.
 * @display demo
 *
 * @slot trigger  - Le bouton déclencheur.
 * @slot          - Contenu du panel (libre ou ar-dropdown-item pour le mode menu).
 *
 * @csspart panel - Le conteneur du panel.
 *
 * @cssprop [--ar-dropdown-min-width=10rem]          - Largeur minimale du panel.
 * @cssprop [--ar-dropdown-max-width=none]           - Largeur maximale du panel.
 * @cssprop [--ar-dropdown-padding=0.25rem]          - Marge interne du panel.
 * @cssprop [--ar-dropdown-bg=var(--ar-color-bg)]    - Fond du panel.
 * @cssprop [--ar-dropdown-border-color=var(--ar-color-border)] - Bordure du panel.
 * @cssprop [--ar-dropdown-border-radius=0.375rem]   - Arrondi du panel.
 * @cssprop [--ar-dropdown-shadow=…]                 - Ombre du panel.
 *
 * @event {CustomEvent} ar-dropdown-show    - Émis avant l'ouverture (annulable).
 * @event {CustomEvent} ar-dropdown-shown   - Émis après l'ouverture.
 * @event {CustomEvent} ar-dropdown-hide    - Émis avant la fermeture (annulable).
 * @event {CustomEvent} ar-dropdown-hidden  - Émis après la fermeture.
 */
@customElement('ar-dropdown')
export class ArDropdown extends LitElement {
    static override styles = [styles];

    /** Ouvre ou ferme le panel. */
    @property({ reflect: true, type: Boolean }) open = false;

    /** Placement du panel par rapport au trigger (Floating UI). */
    @property({ reflect: true }) placement: Placement = 'bottom-start';

    /** Désactive le composant — le trigger ne répond plus aux clics. */
    @property({ reflect: true, type: Boolean }) disabled = false;

    @query('[part="panel"]') private _panel!: HTMLElement;

    private readonly _popover = new PopoverController(this, {
        onExternalClose: () => {
            this.open = false;
        },
    });

    private _menuItems: ArDropdownItem[] = [];
    private _menuMode = false;
    private _activeIndex = -1;
    private readonly _uniqueId = Math.random().toString(36).slice(2, 9);

    override firstUpdated(): void {
        const trigger = this._resolvedTrigger;
        if (trigger && this._panel) {
            this._popover.attach(
                trigger,
                this._panel as HTMLElement & { showPopover(): void; hidePopover(): void },
            );
        }
        if (this.open) this._show();
    }

    override updated(changed: PropertyValues<this>): void {
        if (changed.has('placement')) {
            this._popover.setPlacement(this.placement);
        }
        if (changed.has('open')) {
            if (this.open) this._show();
            else this._hide();
        }
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        this._removeMenuListeners();
    }

    override render(): TemplateResult {
        return html`
            <slot name="trigger" @slotchange=${this._handleTriggerSlotChange}></slot>
            <div part="panel" popover="auto" id="ar-dp-panel-${this._uniqueId}">
                <slot @slotchange=${this._handleDefaultSlotChange}></slot>
            </div>
        `;
    }

    private get _resolvedTrigger(): HTMLElement | null {
        const slot = this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]');
        return (slot?.assignedElements({ flatten: true })[0] as HTMLElement | undefined) ?? null;
    }

    private _handleTriggerSlotChange(): void {
        const trigger = this._resolvedTrigger;
        if (!trigger || !this._panel) return;
        this._popover.attach(
            trigger,
            this._panel as HTMLElement & { showPopover(): void; hidePopover(): void },
        );
        trigger.addEventListener('click', this._handleTriggerClick);
    }

    private _handleDefaultSlotChange(): void {
        this._detectMenuMode();
    }

    private _detectMenuMode(): void {
        this._menuItems = [...this.querySelectorAll<ArDropdownItem>('ar-dropdown-item')];
        this._menuMode = this._menuItems.length > 0;
        if (this._panel) {
            if (this._menuMode) {
                this._panel.setAttribute('role', 'menu');
            } else {
                this._panel.removeAttribute('role');
            }
        }
    }

    private _handleTriggerClick = (): void => {
        if (this.disabled) return;
        this.open = !this.open;
    };

    private _show(): void {
        const showEv = this._emit('ar-dropdown-show');
        if (showEv.defaultPrevented) {
            this.open = false;
            return;
        }
        this._detectMenuMode();
        this._popover.show();
        if (this._menuMode) this._activateMenuListeners();
        void this.updateComplete.then(() => {
            if (this._menuMode) this._focusMenuItem(0);
            this._emit('ar-dropdown-shown');
        });
    }

    private _hide(): void {
        const hideEv = this._emit('ar-dropdown-hide');
        if (hideEv.defaultPrevented) {
            this.open = true;
            return;
        }
        this._removeMenuListeners();
        this._activeIndex = -1;
        this._popover.hide();
        this._resolvedTrigger?.focus();
        this._emit('ar-dropdown-hidden');
    }

    private _emit(name: string): CustomEvent {
        const e = new CustomEvent(name, { bubbles: true, composed: true, cancelable: true });
        this.dispatchEvent(e);
        return e;
    }

    private _activateMenuListeners(): void {
        this._panel?.addEventListener('keydown', this._handleMenuKeyDown);
    }

    private _removeMenuListeners(): void {
        this._panel?.removeEventListener('keydown', this._handleMenuKeyDown);
    }

    private _handleMenuKeyDown = (e: KeyboardEvent): void => {
        const items = this._focusableMenuItems();
        if (!items.length) return;
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this._focusMenuItem(Math.min(this._activeIndex + 1, items.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                this._focusMenuItem(Math.max(this._activeIndex - 1, 0));
                break;
            case 'Home':
                e.preventDefault();
                this._focusMenuItem(0);
                break;
            case 'End':
                e.preventDefault();
                this._focusMenuItem(items.length - 1);
                break;
            case 'Escape':
                this.open = false;
                break;
            case 'Tab':
                this.open = false;
                break;
        }
    };

    private _focusableMenuItems(): HTMLElement[] {
        return this._menuItems
            .map((item) => {
                const slot = item.shadowRoot?.querySelector('slot') as HTMLSlotElement | null;
                return slot?.assignedElements({ flatten: true })[0] as HTMLElement | undefined;
            })
            .filter((el): el is HTMLElement => el != null);
    }

    private _focusMenuItem(index: number): void {
        const items = this._focusableMenuItems();
        if (!items.length) return;
        const clamped = Math.max(0, Math.min(index, items.length - 1));
        items.forEach((el, i) => {
            el.tabIndex = i === clamped ? 0 : -1;
        });
        this._activeIndex = clamped;
        items[clamped].focus();
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'ar-dropdown': ArDropdown;
    }
}
