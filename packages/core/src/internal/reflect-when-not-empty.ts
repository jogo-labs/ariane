/**
 * Convertisseur Lit pour une propriété texte réfléchie en attribut seulement quand elle a une
 * valeur. Sans lui, Lit écrit `name=""` (ou `active=""`) au premier rendu : l'attribut ne correspond
 * pas au HTML serveur et fait échouer l'hydratation (React, Next.js).
 */
export const reflectWhenNotEmpty = {
    fromAttribute: (value: string | null): string => value ?? '',
    toAttribute: (value: string): string | null => value || null,
};
