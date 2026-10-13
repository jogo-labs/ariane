/**
 * Traductions intégrées d'Ariane. Importer ce module les enregistre (effet de bord limité au
 * registre de traductions).
 *
 * L'ordre compte : la première traduction enregistrée devient le repli de `@shoelace-style/localize`
 * pour les langues non reconnues et les termes absents. L'anglais est la langue de repli, donc
 * `en` vient avant `fr`.
 *
 * Point d'entrée unique : `LocalizeController` (donc tout composant localisé) et l'enrobage de
 * `registerTranslation` de `/utils` l'importent, aucun composant n'importe `en` ou `fr` lui-même.
 */
import './en.js';
import './fr.js';
