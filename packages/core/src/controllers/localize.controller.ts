import { LocalizeController as BaseLocalizeController } from '@shoelace-style/localize';
import type { Translation } from '../types/translation.js';

/**
 * LocalizeController d'Ariane, typé sur le contrat Translation du projet.
 * Wrapper de @shoelace-style/localize — cf. https://github.com/shoelace-style/localize.
 */
export class LocalizeController extends BaseLocalizeController<Translation> {}
