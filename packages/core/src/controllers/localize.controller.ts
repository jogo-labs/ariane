import { LocalizeController as BaseLocalizeController } from '@shoelace-style/localize';
import type { FullTranslation } from '../types/translation.js';

/**
 * LocalizeController d'Ariane, typé sur le contrat strict FullTranslation du projet : les appels
 * `term()` des composants gardent des clés vérifiées.
 * Wrapper de @shoelace-style/localize — cf. https://github.com/shoelace-style/localize.
 */
export class LocalizeController extends BaseLocalizeController<FullTranslation> {}
