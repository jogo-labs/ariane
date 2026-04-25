import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { computePosition, flip, offset, shift } from '@floating-ui/dom';
import type { Placement } from '@floating-ui/dom';

type PopoverPanel = HTMLElement & { showPopover(): void; hidePopover(): void };

export interface PopoverControllerOptions {
    placement?: Placement;
    offsetPx?: number;
    onExternalClose?: () => void;
}

export class PopoverController implements ReactiveController {
    private host: ReactiveControllerHost & HTMLElement;
    private _trigger: HTMLElement | null = null;
    private _panel: PopoverPanel | null = null;
    private _isOpen = false;
    private _options: Required<Omit<PopoverControllerOptions, 'onExternalClose'>> & {
        onExternalClose?: () => void;
    };

    constructor(
        host: ReactiveControllerHost & HTMLElement,
        options: PopoverControllerOptions = {},
    ) {
        (this.host = host).addController(this);
        this._options = {
            placement: options.placement ?? 'bottom-start',
            offsetPx: options.offsetPx ?? 4,
            ...(options.onExternalClose !== undefined && {
                onExternalClose: options.onExternalClose,
            }),
        };
    }

    get isOpen(): boolean {
        return this._isOpen;
    }

    setPlacement(placement: Placement): void {
        this._options.placement = placement;
    }

    /** Called from host firstUpdated() once DOM refs are available. */
    attach(trigger: HTMLElement, panel: PopoverPanel): void {
        this._trigger = trigger;
        this._panel = panel;
        // Generate a stable id if panel has none
        if (!panel.id) panel.id = `ar-popover-${crypto.randomUUID().slice(0, 8)}`;
        trigger.setAttribute('aria-controls', panel.id);
        trigger.setAttribute('aria-haspopup', 'true');
        trigger.setAttribute('aria-expanded', 'false');
        panel.addEventListener('toggle', this._onPanelToggle);
    }

    show(): void {
        if (this._isOpen || !this._panel) return;
        this._panel.showPopover();
        this._isOpen = true;
        this._syncTriggerAria();
        void this._position();
        this.host.requestUpdate();
    }

    hide(): void {
        if (!this._isOpen || !this._panel) return;
        this._panel.hidePopover();
        this._isOpen = false;
        this._syncTriggerAria();
        this.host.requestUpdate();
    }

    toggle(): void {
        if (this._isOpen) this.hide();
        else this.show();
    }

    hostConnected(): void {}

    hostDisconnected(): void {
        this._panel?.removeEventListener('toggle', this._onPanelToggle);
    }

    private _onPanelToggle = (e: Event): void => {
        const newState = (e as ToggleEvent).newState;
        if (newState === 'closed' && this._isOpen) {
            this._isOpen = false;
            this._syncTriggerAria();
            this._options.onExternalClose?.();
            this.host.requestUpdate();
        }
    };

    private async _position(): Promise<void> {
        if (!this._trigger || !this._panel) return;
        const { x, y } = await computePosition(this._trigger, this._panel, {
            placement: this._options.placement,
            middleware: [offset(this._options.offsetPx), flip(), shift({ padding: 8 })],
        });
        this._panel.style.position = 'fixed';
        this._panel.style.top = `${y}px`;
        this._panel.style.left = `${x}px`;
    }

    private _syncTriggerAria(): void {
        this._trigger?.setAttribute('aria-expanded', String(this._isOpen));
    }
}
