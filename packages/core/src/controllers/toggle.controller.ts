import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { emitToggleEvent } from '../utils/toggle-events.js';

export interface ToggleControllerOptions {
    /** Préfixe des events, ex. 'ar-dropdown' → ar-dropdown-show, ar-dropdown-show-prevented, etc. */
    eventPrefix: string;
    /** Logique d'ouverture propre au composant, appelée si le show n'est pas annulé. */
    onShow: () => void;
    /** Logique de fermeture propre au composant, appelée si le hide n'est pas annulé. */
    onHide: () => void;
    /** Gate arbitraire évalué avant de programmer une transition. Défaut : toujours vrai. */
    shouldToggle?: () => boolean;
    /**
     * Si vrai, ignore la toute première transition détectée si elle survient dès le tout
     * premier cycle de mise à jour de l'hôte (élément créé avec `open` déjà à `true` avant
     * sa première connexion). Défaut : false.
     */
    skipInitialTransition?: boolean;
}

type ToggleHost = ReactiveControllerHost & HTMLElement & { open: boolean };

/**
 * Mutualise le pattern events annulables `show`/`hide` (+ `show-prevented`/`hide-prevented`
 * sur annulation, `shown`/`hidden` à la charge du composant) utilisé par ar-dropdown,
 * ar-breadcrumb et ar-collapse.
 *
 * Détecte les changements de `open` indépendamment du `updated()` du composant (comparaison
 * interne à chaque `hostUpdated()`), diffère l'action via `updateComplete.then()` pour éviter
 * l'avertissement dev Lit "change-in-update", et protège contre le cycle `updated()` redondant
 * qu'une annulation (revert de `open`) déclenche — sans jamais bloquer une fermeture/ouverture
 * externe légitime (ex. `onExternalClose` d'un popover), qui ne passe pas par cette annulation.
 */
export class ToggleController implements ReactiveController {
    private readonly _host: ToggleHost;
    private readonly _opts: ToggleControllerOptions;
    private _lastOpen: boolean;
    private _suppressNext = false;
    private _isFirstCycle = true;

    constructor(host: ToggleHost, opts: ToggleControllerOptions) {
        this._host = host;
        this._opts = opts;
        this._lastOpen = host.open;
        host.addController(this);
    }

    hostUpdated(): void {
        const wasFirstCycle = this._isFirstCycle;
        this._isFirstCycle = false;

        const host = this._host;
        const changed = host.open !== this._lastOpen;
        this._lastOpen = host.open;
        if (!changed) return;
        if (wasFirstCycle && this._opts.skipInitialTransition) return;
        if (this._opts.shouldToggle && !this._opts.shouldToggle()) return;

        // Différé après la fin du cycle courant : onShow()/onHide() déclenchent souvent
        // host.requestUpdate() (ex. Popover.show()/hide()) — un appel synchrone ici
        // déclencherait l'avertissement dev Lit "change-in-update".
        void host.updateComplete.then(() => {
            if (host.open) this._show();
            else this._hide();
        });
    }

    private _show(): void {
        if (this._suppressNext) {
            this._suppressNext = false;
            return;
        }
        const prefix = this._opts.eventPrefix;
        const ev = emitToggleEvent(this._host, `${prefix}-show`, { cancelable: true });
        if (ev.defaultPrevented) {
            this._suppressNext = true;
            this._host.open = false;
            emitToggleEvent(this._host, `${prefix}-show-prevented`, { cancelable: false });
            return;
        }
        this._opts.onShow();
    }

    private _hide(): void {
        if (this._suppressNext) {
            this._suppressNext = false;
            return;
        }
        const prefix = this._opts.eventPrefix;
        const ev = emitToggleEvent(this._host, `${prefix}-hide`, { cancelable: true });
        if (ev.defaultPrevented) {
            this._suppressNext = true;
            this._host.open = true;
            emitToggleEvent(this._host, `${prefix}-hide-prevented`, { cancelable: false });
            return;
        }
        this._opts.onHide();
    }
}
