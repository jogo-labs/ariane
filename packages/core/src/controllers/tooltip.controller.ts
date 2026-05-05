import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { Placement } from '@floating-ui/dom';
import { Popover } from '../utils/popover.js';

export interface TooltipControllerOptions {
    placement?: Placement;
    /** Espacement perpendiculaire trigger→tooltip. Défaut : 6. */
    distance?: number;
    /** Décalage latéral. Défaut : 0. */
    offset?: number;
}

export class TooltipController implements ReactiveController {
    private readonly _popover: Popover;

    constructor(
        host: ReactiveControllerHost & HTMLElement,
        options: TooltipControllerOptions = {},
    ) {
        this._popover = new Popover(host, {
            placement: options.placement ?? 'top',
            distance: options.distance ?? 6,
            offset: options.offset ?? 0,
            popoverType: 'manual',
        });
        host.addController(this);
    }

    get isOpen(): boolean {
        return this._popover.isOpen;
    }

    attach(trigger: HTMLElement, panel: HTMLElement): void {
        this._popover.attach(trigger, panel);
        panel.setAttribute('role', 'tooltip');
        trigger.setAttribute('aria-describedby', panel.id);
    }

    show(): Promise<void> {
        return this._popover.show();
    }

    hide(): void {
        this._popover.hide();
    }

    setPlacement(v: Placement): void {
        this._popover.setPlacement(v);
    }

    setDistance(v: number): void {
        this._popover.setDistance(v);
    }

    setOffset(v: number): void {
        this._popover.setOffset(v);
    }

    setArrow(el: HTMLElement | null): void {
        this._popover.setArrow(el);
    }

    hostConnected(): void {}

    hostDisconnected(): void {
        this._popover.destroy();
    }
}
