/**
 * Contrat de configuration globale exposé par les consommateurs CDN via
 * `window.ARIANE_CONFIG` avant le chargement du script Ariane.
 */
interface ArianeConfig {
    /** Préfixe des tags custom elements générés par l'autoloader CDN. Défaut : 'ar'. */
    prefix?: string;
}

declare global {
    interface Window {
        ARIANE_CONFIG?: ArianeConfig;
    }
}

export {};
