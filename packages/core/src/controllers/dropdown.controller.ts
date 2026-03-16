import { type ReactiveController, type ReactiveControllerHost } from 'lit';

export class DropdownController implements ReactiveController {
    private host: ReactiveControllerHost & HTMLElement;

    private _isOpen = false;

    constructor(host: ReactiveControllerHost & HTMLElement) {
        this.host = host;
        host.addController(this);
    }

    /* ------------------------------------------------ */
    /* STATE                                            */
    /* ------------------------------------------------ */

    get isOpen(): boolean {
        return this._isOpen;
    }

    /* ------------------------------------------------ */
    /* PUBLIC API                                       */
    /* ------------------------------------------------ */

    show(): void {
        if (this._isOpen) return;
        this._isOpen = true;
        // Écoute globale : ferme le dropdown si le clic est en dehors du host.
        // Ajouté après le cycle courant pour ne pas capturer le clic d'ouverture.
        requestAnimationFrame(() => {
            document.addEventListener('click', this._onOutsideClick);
        });
        this.host.requestUpdate();
    }

    hide(): void {
        if (!this._isOpen) return;
        this._isOpen = false;
        document.removeEventListener('click', this._onOutsideClick);
        this.host.requestUpdate();
    }

    toggle(): void {
        if (this._isOpen) {
            this.hide();
        } else this.show();
    }

    /* ------------------------------------------------ */
    /* LIFECYCLE                                        */
    /* ------------------------------------------------ */

    hostConnected(): void {}

    hostDisconnected(): void {
        // Nettoyage garanti même si hide() n'a pas été appelé
        // (ex: composant retiré du DOM dropdown ouvert)
        document.removeEventListener('click', this._onOutsideClick);
    }

    /* ------------------------------------------------ */
    /* PRIVATE                                          */
    /* ------------------------------------------------ */

    private _onOutsideClick = (e: MouseEvent): void => {
        if (!this.host.contains(e.target as Node)) {
            this.hide();
        }
    };
}
