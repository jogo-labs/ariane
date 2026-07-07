import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { Placement } from '@floating-ui/dom';
import { Popover } from '../utils/popover.js';

export interface TooltipControllerOptions {
    placement?: Placement;
    /**
     * Slug utilisé pour lire les custom properties CSS `--ar-<cssVarPrefix>-distance`
     * et `--ar-<cssVarPrefix>-offset` sur l'hôte. Si omis, distance/offset valent 0.
     */
    cssVarPrefix?: string;
}

export class TooltipController implements ReactiveController {
    private readonly _host: ReactiveControllerHost & HTMLElement;
    private readonly _popover: Popover;
    private readonly _cssVarPrefix: string | undefined;

    constructor(
        host: ReactiveControllerHost & HTMLElement,
        options: TooltipControllerOptions = {},
    ) {
        this._host = host;
        this._cssVarPrefix = options.cssVarPrefix;
        this._popover = new Popover(host, {
            placement: options.placement ?? 'top',
            distance: () => this._readCssVar('distance'),
            offset: () => this._readCssVar('offset'),
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
        if (!this._host.id) this._host.id = `ar-tooltip-${crypto.randomUUID().slice(0, 8)}`;
        trigger.setAttribute('aria-describedby', this._host.id);
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

    setArrow(el: HTMLElement | null): void {
        this._popover.setArrow(el);
    }

    hostConnected(): void {}

    hostDisconnected(): void {
        this._popover.destroy();
    }

    private _readCssVar(kind: 'distance' | 'offset'): number {
        if (!this._cssVarPrefix) return 0;
        const raw = getComputedStyle(this._host)
            .getPropertyValue(`--ar-${this._cssVarPrefix}-${kind}`)
            .trim();
        const parsed = parseFloat(raw);
        return Number.isFinite(parsed) ? parsed : 0;
    }
}
