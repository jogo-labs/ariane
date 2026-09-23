import { ArianeElement } from './ariane-element.js';

/**
 * Base pour un composant participant à un `<form>` natif (ex. `ar-datepicker`). Pose
 * `formAssociated = true` ; le composant utilise `this.internals` (hérité d'`ArianeElement`)
 * directement pour `setFormValue()`/`setValidity()`, sans wrapper dédié.
 *
 * @internal
 */
export class ArianeFormElement extends ArianeElement {
    static formAssociated = true;
}
