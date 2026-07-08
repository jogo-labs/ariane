/**
 * Contrat de configuration globale exposé par les consommateurs CDN via
 * `window.ARIANE_CONFIG` avant le chargement du script Ariane.
 */
interface ArianeConfig {
    /** Préfixe des tags custom elements générés par l'autoloader CDN. Défaut : 'ar'. */
    prefix?: string;
    /**
     * Réservé pour l'infrastructure i18n (issue #80). Structure figée pour éviter un
     * breaking change de shape plus tard, mais non lu par le code tant que #80 n'est
     * pas implémenté.
     * Forme : { <composant camelCase sans "ar">: { <clé de label>: <valeur traduite> } }
     */
    i18n?: Record<string, Record<string, string>>;
}

declare global {
    interface Window {
        ARIANE_CONFIG?: ArianeConfig;
    }
}

export {};
