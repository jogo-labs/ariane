import { ArianeElement } from './ariane-element.js';

/**
 * Base pour un composant participant à un `<form>` natif (ex. `ar-datepicker`). Pose
 * `formAssociated = true` — le composant utilise directement `this.internals` (hérité
 * d'`ArianeElement`) pour `setFormValue()`/`setValidity()`, sans wrapper dédié ici : un
 * pass-through recréerait le problème de découvrabilité que cette base corrige (cf. #253).
 *
 * Pas d'interface de contrat form-associated pour l'instant (YAGNI) — un seul composant
 * concerné aujourd'hui ; à reconsidérer si un second apparaît.
 */
export class ArianeFormElement extends ArianeElement {
    static formAssociated = true;
}
