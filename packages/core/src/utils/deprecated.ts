/**
 * Utilitaire de dépréciation pour les composants mARIAnne.
 *
 * Usage dans un composant :
 *
 *   import { warnDeprecated } from '../../utils/deprecated.js';
 *
 *   // Dans updated() ou le setter de la propriété dépréciée :
 *   if (this.links !== undefined) {
 *       warnDeprecated('mr-breadcrumb', 'links', 'Utilisez des éléments <a> slottés à la place. Sera supprimé en v1.0.0.');
 *   }
 */

// Garde les paires "composant:prop" déjà affichées pour ne logguer qu'une fois par session.
const warned = new Set<string>();

/**
 * Affiche un avertissement de dépréciation dans la console (une seule fois par session).
 *
 * @param tag     Tag name du composant (ex: 'mr-breadcrumb')
 * @param member  Propriété ou attribut déprécié (ex: 'links')
 * @param message Message de migration (ex: 'Utilisez des éléments <a> slottés.')
 */
export function warnDeprecated(tag: string, member: string, message: string): void {
    const key = `${tag}:${member}`;
    if (warned.has(key)) return;
    warned.add(key);

    console.warn(
        `[${tag}] La propriété "${member}" est dépréciée et sera supprimée dans une prochaine version majeure. ${message}`,
    );
}
