import type { ReactiveController, ReactiveControllerHost } from 'lit';

/** Reactive controller that detects slot presence, modelled after WebAwesome's HasSlotController. */
export class HasSlotController implements ReactiveController {
    private host: ReactiveControllerHost & Element;
    private slotNames: string[];

    constructor(host: ReactiveControllerHost & Element, ...slotNames: string[]) {
        (this.host = host).addController(this);
        this.slotNames = slotNames;
    }

    private hasDefaultSlot(): boolean {
        if (!this.host.childNodes) return false;

        return [...this.host.childNodes].some((node) => {
            if (node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '')
                return true;
            if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node as HTMLElement;
                if (!el.hasAttribute('slot')) return true;
            }
            return false;
        });
    }

    private hasNamedSlot(name: string): boolean {
        return this.host.querySelector?.(`:scope > [slot="${name}"]`) !== null;
    }

    /** Returns true if the given slot has assigned content. Use `'[default]'` for the default slot. */
    test(slotName: string): boolean {
        return slotName === '[default]' ? this.hasDefaultSlot() : this.hasNamedSlot(slotName);
    }

    hostConnected(): void {
        this.host.shadowRoot?.addEventListener('slotchange', this._handleSlotChange);
    }

    hostDisconnected(): void {
        this.host.shadowRoot?.removeEventListener('slotchange', this._handleSlotChange);
    }

    private _handleSlotChange = (event: Event): void => {
        const slot = event.target as HTMLSlotElement;
        if (
            (this.slotNames.includes('[default]') && !slot.name) ||
            (slot.name && this.slotNames.includes(slot.name))
        ) {
            this.host.requestUpdate();
        }
    };
}
