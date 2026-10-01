/**
 * Contrat de configuration globale exposé par les consommateurs CDN via
 * `window.ARIANE_CONFIG` avant le chargement du script Ariane.
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
}

export {};
