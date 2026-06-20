import { arrow, computePosition, flip, hide, offset, shift, autoUpdate } from '@floating-ui/dom';
import type { Placement } from '@floating-ui/dom';
import type { ReactiveControllerHost } from 'lit';

type PopoverPanel = HTMLElement & { showPopover(): void; hidePopover(): void };

export interface PopoverOptions {
    placement?: Placement;
    /** Espacement perpendiculaire trigger→panel (mainAxis). Défaut : 4. */
    distance?: number;
    /** Décalage latéral (crossAxis). Défaut : 0. */
    offset?: number;
    popoverType?: 'auto' | 'manual';
    /** Appelé lors du light-dismiss natif (popoverType 'auto' uniquement). */
    onExternalClose?: () => void;
    /** Élément caret positionné par Floating UI arrow(). Optionnel. */
    arrowEl?: HTMLElement;
}

export class Popover {
    private _host: ReactiveControllerHost & HTMLElement;
    private _trigger: HTMLElement | null = null;
    private _panel: HTMLElement | null = null;
    private _isOpen = false;
    private _cleanupAutoUpdate: (() => void) | null = null;
    private _opts: Required<Omit<PopoverOptions, 'onExternalClose' | 'arrowEl'>> & {
        onExternalClose?: () => void;
        arrowEl?: HTMLElement;
    };

    constructor(host: ReactiveControllerHost & HTMLElement, options: PopoverOptions = {}) {
        this._host = host;
        this._opts = {
            placement: options.placement ?? 'bottom-start',
            distance: options.distance ?? 4,
            offset: options.offset ?? 0,
            popoverType: options.popoverType ?? 'auto',
            ...(options.onExternalClose !== undefined && {
                onExternalClose: options.onExternalClose,
            }),
            ...(options.arrowEl !== undefined && { arrowEl: options.arrowEl }),
        };
    }

    get isOpen(): boolean {
        return this._isOpen;
    }

    setPlacement(v: Placement): void {
        this._opts.placement = v;
    }

    setDistance(v: number): void {
        this._opts.distance = v;
    }

    setOffset(v: number): void {
        this._opts.offset = v;
    }

    setArrow(el: HTMLElement | null): void {
        if (el) {
            this._opts.arrowEl = el;
        } else {
            delete this._opts.arrowEl;
        }
    }

    attach(trigger: HTMLElement, panel: HTMLElement, anchor?: HTMLElement): void {
        if (this._panel && this._opts.popoverType === 'auto') {
            this._panel.removeEventListener('toggle', this._onToggle);
        }
        this._trigger = anchor ?? trigger;
        this._panel = panel;
        if (!panel.id) panel.id = `ar-popover-${crypto.randomUUID().slice(0, 8)}`;
        panel.setAttribute('popover', this._opts.popoverType);
        if (this._opts.popoverType === 'auto') {
            panel.addEventListener('toggle', this._onToggle);
        }
    }

    show(): Promise<void> {
        if (!this._panel || !this._trigger) {
            console.warn('[Popover] show() called before attach()');
            return Promise.resolve();
        }
        if (this._isOpen) return Promise.resolve();
        const panel = this._panel as PopoverPanel;
        if (typeof panel.showPopover !== 'function') return Promise.resolve();
        this._panel.style.visibility = 'hidden';
        panel.showPopover();
        this._isOpen = true;
        this._host.requestUpdate();
        this._cleanupAutoUpdate = autoUpdate(this._trigger, this._panel, async () => {
            await this._position();
        });
        return this._position();
    }

    hide(): void {
        if (!this._isOpen || !this._panel) return;
        this._cleanupAutoUpdate?.();
        this._cleanupAutoUpdate = null;
        const panel = this._panel as PopoverPanel;
        if (typeof panel.hidePopover === 'function') panel.hidePopover();
        this._isOpen = false;
        this._host.requestUpdate();
    }

    destroy(): void {
        this._cleanupAutoUpdate?.();
        this._cleanupAutoUpdate = null;
        if (this._isOpen && this._panel) {
            const panel = this._panel as PopoverPanel;
            if (typeof panel.hidePopover === 'function') panel.hidePopover();
            this._isOpen = false;
        }
        this._panel?.removeEventListener('toggle', this._onToggle);
        this._panel = null;
        this._trigger = null;
    }

    private _onToggle = (e: Event): void => {
        const newState = (e as ToggleEvent).newState;
        if (newState === 'closed' && this._isOpen) {
            this._cleanupAutoUpdate?.();
            this._cleanupAutoUpdate = null;
            this._isOpen = false;
            this._opts.onExternalClose?.();
            this._host.requestUpdate();
        }
    };

    private async _position(): Promise<void> {
        if (!this._isOpen || !this._trigger || !this._panel) return;
        const arrowEl = this._opts.arrowEl ?? null;
        const { x, y, middlewareData, placement } = await computePosition(
            this._trigger,
            this._panel,
            {
                placement: this._opts.placement,
                strategy: 'absolute',
                middleware: [
                    offset({ mainAxis: this._opts.distance, crossAxis: this._opts.offset }),
                    flip(),
                    ...(arrowEl ? [arrow({ element: arrowEl })] : []),
                    shift({ padding: 4 }),
                    hide(),
                ],
            },
        );
        // Guard: panel may have been destroyed during the async computePosition call.
        if (!this._panel) return;
        const hidden = middlewareData.hide?.referenceHidden ?? false;
        this._panel.style.visibility = hidden ? 'hidden' : '';
        this._panel.style.transform = `translate(${this._roundByDPR(x)}px, ${this._roundByDPR(y)}px)`;

        if (arrowEl && middlewareData.arrow) {
            const { x: ax, y: ay } = middlewareData.arrow;
            const side = placement.split('-')[0] as 'top' | 'bottom' | 'left' | 'right';
            const staticSide = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }[side];
            const halfSize =
                side === 'left' || side === 'right'
                    ? arrowEl.offsetHeight / 2
                    : arrowEl.offsetWidth / 2;
            Object.assign(arrowEl.style, {
                left: ax != null ? `${this._roundByDPR(ax)}px` : '',
                top: ay != null ? `${this._roundByDPR(ay)}px` : '',
                right: '',
                bottom: '',
                [staticSide]: `-${halfSize}px`,
            });
        }
    }

    private _roundByDPR(value: number): number {
        const dpr = window.devicePixelRatio || 1;
        return Math.round(value * dpr) / dpr;
    }
}
