/**
 * Contrat de configuration globale exposé par les consommateurs CDN via
 * `window.ARIANE_CONFIG` (ou `globalThis.ARIANE_CONFIG`) avant le chargement du script Ariane.
 *
 * Module (et non `.d.ts`) pour être émis dans `dist/` et inclus par l'import du paquet : un
 * fichier `.d.ts` n'est pas copié par `tsc`, la déclaration n'atteignait donc pas les consommateurs.
 */
interface ArianeConfig {
    /**
     * Préfixe des tags custom elements enregistrés par la librairie : autoloader, bundle complet,
     * barrel npm et imports par composant. Défaut : 'ar'. À poser avant l'import de la librairie ;
     * l'entrée `/headless` n'enregistre rien et n'est pas concernée.
     */
    prefix?: string;
}

declare global {
    interface Window {
        ARIANE_CONFIG?: ArianeConfig;
    }
    // `globalThis.ARIANE_CONFIG` : lu sur `globalThis` pour rester valide sans `window` (serveur).
    var ARIANE_CONFIG: ArianeConfig | undefined;
}

export {};
