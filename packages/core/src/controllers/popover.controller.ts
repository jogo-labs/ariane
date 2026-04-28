import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { computePosition, flip, hide, offset, shift, autoUpdate } from '@floating-ui/dom';
import type { Placement } from '@floating-ui/dom';

type PopoverPanel = HTMLElement & { showPopover(): void; hidePopover(): void };

export interface PopoverControllerOptions {
    placement?: Placement;
    /** Espacement perpendiculaire entre le trigger et le panel (mainAxis). Défaut : 4. */
    distance?: number;
    /** Décalage latéral du panel par rapport au trigger (crossAxis). Défaut : 0. */
    offset?: number;
    lockScroll?: boolean;
    onExternalClose?: () => void;
}

interface _ScrollLock {
    el: HTMLElement;
    overflowY: string;
    overflowX: string;
}

export class PopoverController implements ReactiveController {
    private host: ReactiveControllerHost & HTMLElement;
    private _trigger: HTMLElement | null = null;
    private _panel: PopoverPanel | null = null;
    private _isOpen = false;
    private _cleanupAutoUpdate: (() => void) | null = null;
    private _scrollLocks: _ScrollLock[] = [];
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
            distance: options.distance ?? 4,
            offset: options.offset ?? 0,
            lockScroll: options.lockScroll ?? true,
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

    setLockScroll(value: boolean): void {
        this._options.lockScroll = value;
    }

    setDistance(value: number): void {
        this._options.distance = value;
    }

    setOffset(value: number): void {
        this._options.offset = value;
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

    show(): Promise<void> {
        if (this._isOpen || !this._panel || !this._trigger) return Promise.resolve();
        if (this._options.lockScroll) this._lockScrollContainers();
        this._panel.style.visibility = 'hidden';
        this._panel.showPopover();
        this._isOpen = true;
        this._syncTriggerAria();
        this._cleanupAutoUpdate = autoUpdate(
            this._trigger,
            this._panel,
            async () => await this._position(),
        );
        this.host.requestUpdate();
        // Return a promise that resolves once the panel is positioned and visible.
        // autoUpdate also calls _position() immediately (idempotent), but we need
        // our own promise so callers know when it's safe to move focus.
        return this._position();
    }

    hide(): void {
        if (!this._isOpen || !this._panel) return;
        this._cleanupAutoUpdate?.();
        this._cleanupAutoUpdate = null;
        this._unlockScrollContainers();
        this._panel.hidePopover();
        this._isOpen = false;
        this._syncTriggerAria();
        this.host.requestUpdate();
    }

    toggle(): void {
        if (this._isOpen) this.hide();
        else void this.show();
    }

    hostConnected(): void {}

    hostDisconnected(): void {
        this._cleanupAutoUpdate?.();
        this._cleanupAutoUpdate = null;
        this._unlockScrollContainers();
        this._panel?.removeEventListener('toggle', this._onPanelToggle);
    }

    private _onPanelToggle = (e: Event): void => {
        const newState = (e as ToggleEvent).newState;
        if (newState === 'closed' && this._isOpen) {
            this._cleanupAutoUpdate?.();
            this._cleanupAutoUpdate = null;
            this._unlockScrollContainers();
            this._isOpen = false;
            this._syncTriggerAria();
            this._options.onExternalClose?.();
            this.host.requestUpdate();
        }
    };

    private _lockScrollContainers(): void {
        let el: HTMLElement | null = this._trigger?.parentElement ?? null;
        while (el && el !== document.documentElement) {
            const { overflowY, overflowX } = getComputedStyle(el);
            if (['auto', 'scroll'].includes(overflowY) || ['auto', 'scroll'].includes(overflowX)) {
                this._scrollLocks.push({
                    el,
                    overflowY: el.style.overflowY,
                    overflowX: el.style.overflowX,
                });
                el.style.overflowY = 'hidden';
                el.style.overflowX = 'hidden';
            }
            el = el.parentElement;
        }
    }

    private _unlockScrollContainers(): void {
        for (const { el, overflowY, overflowX } of this._scrollLocks) {
            el.style.overflowY = overflowY;
            el.style.overflowX = overflowX;
        }
        this._scrollLocks = [];
    }

    private async _position(): Promise<void> {
        if (!this._trigger || !this._panel) return;
        const { x, y, middlewareData } = await computePosition(this._trigger, this._panel, {
            placement: this._options.placement,
            strategy: 'absolute',
            middleware: [
                offset({ mainAxis: this._options.distance, crossAxis: this._options.offset }),
                flip(),
                shift({ padding: 4 }),
                hide(),
            ],
        });
        this._panel.style.visibility = middlewareData.hide?.referenceHidden ? 'hidden' : '';
        if (middlewareData.hide?.referenceHidden) return;
        this._panel.style.transform = `translate(${this._roundByDPR(x)}px, ${this._roundByDPR(y)}px)`;
    }

    private _roundByDPR(value: number): number {
        const dpr = window.devicePixelRatio || 1;
        return Math.round(value * dpr) / dpr;
    }

    private _syncTriggerAria(): void {
        this._trigger?.setAttribute('aria-expanded', String(this._isOpen));
    }
}
