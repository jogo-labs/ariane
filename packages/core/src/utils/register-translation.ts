import '../translations/fr.js';
import '../translations/en.js';
import { registerTranslation as register } from '@shoelace-style/localize';
import type { Translation } from '../types/translation.js';

/**
 * Enregistre une ou plusieurs traductions. Importer ce module enregistre d'abord les traductions
 * intégrées, le français en premier : il est donc toujours la langue de repli, complète, quel que
 * soit l'ordre dans lequel l'application enregistre les siennes. L'anglais est enregistré aussi,
 * pour qu'une surcharge de `en` ne soit pas écrasée par les composants chargés ensuite. Enregistrer un code déjà connu (`fr`, `en`)
 * fusionne ses termes par-dessus les termes existants : une surcharge partielle suffit, et elle
 * n'est plus écrasée par les composants chargés ensuite (leur module `fr` n'est évalué qu'une fois).
 */
export function registerTranslation(...translations: Translation[]): void {
    register(...translations);
}
