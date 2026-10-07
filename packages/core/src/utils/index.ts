/**
 * Point d'entrée `@ariane-ui/core/utils` : uniquement du code pur, sans aucun effet de bord
 * d'enregistrement (`customElements.define`). Importer depuis ici plutôt que depuis le
 * barrel principal évite d'embarquer les composants, et d'enregistrer les `ar-*` en mode
 * headless.
 */
export { whenAllDefined } from './when-all-defined.js';
export type { WhenAllDefinedOptions } from './when-all-defined.js';
export { registerTranslation } from '@shoelace-style/localize';
export type { Translation } from '../types/translation.js';
export type { ArEventDetail } from './emit-event.js';
