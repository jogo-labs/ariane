import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { Placement } from '@floating-ui/dom';
import { Popover } from '../utils/popover.js';
import { acquireScrollLock, isScrollLocked, releaseScrollLock } from '../utils/scroll-lock.js';

export interface AnchoredControllerOptions {
    popupMode?: 'menu' | 'dialog';
    placement?: Placement;
    /** Espacement perpendiculaire trigger→panel (mainAxis). Défaut : 4. */
    distance?: number;
    /** Décalage latéral (crossAxis). Défaut : 0. */
    offset?: number;
    /** Verrouille le scroll des ancêtres scrollables à l'ouverture. Défaut : true. */
    lockScroll?: boolean;
    /** Appelé lors d'un light-dismiss natif (popover auto). */
    onExternalClose?: () => void;
}

export class AnchoredController implements ReactiveController {
    private _trigger: HTMLElement | null = null;
    private _scrollLocks: HTMLElement[] = [];
    private _opts: Required<Omit<AnchoredControllerOptions, 'onExternalClose'>> & {
        onExternalClose?: () => void;
    };
    private readonly _popover: Popover;

    constructor(
        host: ReactiveControllerHost & HTMLElement,
        options: AnchoredControllerOptions = {},
    ) {
        this._opts = {
            popupMode: options.popupMode ?? 'menu',
            placement: options.placement ?? 'bottom-start',
            distance: options.distance ?? 4,
            offset: options.offset ?? 0,
            lockScroll: options.lockScroll ?? true,
            ...(options.onExternalClose !== undefined && {
                onExternalClose: options.onExternalClose,
            }),
        };
        this._popover = new Popover(host, {
            placement: this._opts.placement,
            distance: this._opts.distance,
            offset: this._opts.offset,
            popoverType: 'auto',
            onExternalClose: () => {
                this._releaseScrollLocks();
                this._trigger?.setAttribute('aria-expanded', 'false');
                this._opts.onExternalClose?.();
            },
        });
        host.addController(this);
    }

    get isOpen(): boolean {
        return this._popover.isOpen;
    }

    attach(trigger: HTMLElement, panel: HTMLElement, anchor?: HTMLElement): void {
        // Precondition: call hide() before re-attaching to avoid stale scroll-lock refs.
        this._trigger = trigger;
        this._popover.attach(trigger, panel, anchor);
        const haspopup = this._opts.popupMode === 'dialog' ? 'dialog' : 'true';
        trigger.setAttribute('aria-haspopup', haspopup);
        trigger.setAttribute('aria-expanded', 'false');
    }

    async show(): Promise<void> {
        if (this._popover.isOpen || !this._trigger) return;
        if (this._opts.lockScroll) this._acquireScrollLocks();
        await this._popover.show();
        // Guard: hide() may have run during the await
        if (this._popover.isOpen) {
            this._trigger.setAttribute('aria-expanded', 'true');
        }
    }

    hide(): void {
        if (!this._popover.isOpen) return;
        this._popover.hide();
        this._releaseScrollLocks();
        this._trigger?.setAttribute('aria-expanded', 'false');
    }

    toggle(): void {
        if (this._popover.isOpen) this.hide();
        else void this.show();
    }

    setPlacement(v: Placement): void {
        this._opts.placement = v;
        this._popover.setPlacement(v);
    }

    setDistance(v: number): void {
        this._opts.distance = v;
        this._popover.setDistance(v);
    }

    setOffset(v: number): void {
        this._opts.offset = v;
        this._popover.setOffset(v);
    }

    setLockScroll(v: boolean): void {
        this._opts.lockScroll = v;
    }

    hostConnected(): void {}

    hostDisconnected(): void {
        this._popover.destroy();
        this._releaseScrollLocks();
    }

    private _acquireScrollLocks(): void {
        let el: HTMLElement | null = this._trigger?.parentElement ?? null;
        while (el && el !== document.documentElement) {
            const { overflowY, overflowX } = getComputedStyle(el);
            if (
                isScrollLocked(el) ||
                ['auto', 'scroll'].includes(overflowY) ||
                ['auto', 'scroll'].includes(overflowX)
            ) {
                acquireScrollLock(el);
                this._scrollLocks.push(el);
            }
            el = el.parentElement;
        }
    }

    private _releaseScrollLocks(): void {
        for (const el of this._scrollLocks) releaseScrollLock(el);
        // Reset array after each call — makes double-call (hide + hostDisconnected) a safe no-op.
        this._scrollLocks = [];
    }
}
