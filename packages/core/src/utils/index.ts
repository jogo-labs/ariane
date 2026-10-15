/**
 * Point d'entrée `@ariane-ui/core/utils` : uniquement du code pur, sans aucun effet de bord
 * d'enregistrement (`customElements.define`). Importer depuis ici plutôt que depuis le
 * barrel principal évite d'embarquer les composants, et d'enregistrer les `ar-*` en mode
 * headless. Il enregistre toutefois les traductions françaises et anglaises intégrées (effet de bord
 * limité au registre de traductions) : l'anglais sert de langue de repli complète.
 */
export { whenAllDefined } from './when-all-defined.js';
export type { WhenAllDefinedOptions } from './when-all-defined.js';
export { registerTranslation } from './register-translation.js';
export type { Translation, FullTranslation } from '../types/translation.js';
export type { ArEventDetail } from './emit-event.js';
